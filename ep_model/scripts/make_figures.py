"""README figures from the evaluation report and the benchmark results.

Reads ep_model/models/ep_eval_report.json (written by ep_model.training.evaluate) and docs/benchmark.md
(written by ep_model.benchmark.run score), and writes light and dark PNGs to docs/images/.

    python -m ep_model.scripts.make_figures
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import matplotlib.ticker  # noqa: E402

REPO = Path(__file__).resolve().parents[2]

THEMES = {
    "light": {"bg": "#ffffff", "fg": "#1f2328", "muted": "#656d76", "grid": "#d8dee4"},
    "dark": {"bg": "#0d1117", "fg": "#e6edf3", "muted": "#8d96a0", "grid": "#30363d"},
}
OURS = "#2f81f7"
BASE = "#8d96a0"
WEAK = "#d29922"

MODEL_NAMES = {
    "ep_finetuned": "EP model (shipped)",
    "ep_model": "EP model, clean data only",
    "eval_lgbm": "Eval-only LightGBM",
    "lichess_formula": "Lichess win% curve",
    "constant": "Constant (always 50%)",
}


def _style(theme: dict) -> None:
    plt.rcParams.update({
        "figure.facecolor": theme["bg"], "axes.facecolor": theme["bg"], "savefig.facecolor": theme["bg"],
        "text.color": theme["fg"], "axes.labelcolor": theme["muted"], "axes.edgecolor": theme["grid"],
        "xtick.color": theme["muted"], "ytick.color": theme["fg"], "grid.color": theme["grid"],
        "font.size": 11, "axes.titlesize": 13, "axes.titleweight": "bold", "axes.titlelocation": "left",
        "axes.spines.top": False, "axes.spines.right": False, "font.family": ["Helvetica", "Arial", "DejaVu Sans"],
    })


def results(report: dict, theme: dict, out: Path) -> None:
    fig, (a, b) = plt.subplots(1, 2, figsize=(12, 4.2), gridspec_kw={"width_ratios": [1.15, 1]})
    names = list(MODEL_NAMES)[::-1]
    vals = [report["overall"][n]["log_loss"] for n in names]
    bars = a.barh([MODEL_NAMES[n] for n in names], vals, color=[OURS if n == "ep_finetuned" else BASE for n in names], height=0.6)
    for bar, v in zip(bars, vals):
        a.text(v + 0.002, bar.get_y() + bar.get_height() / 2, f"{v:.3f}", va="center", fontsize=10, color=theme["fg"])
    a.set_xlim(0.55, 0.71)
    a.set_xlabel("log loss on 31,961 held-out positions (lower is better)")
    a.set_title("Predicting game outcomes")
    a.grid(axis="x", alpha=0.6)
    a.set_axisbelow(True)

    classes = [tc for tc in ("bullet", "blitz", "rapid", "classical") if tc in report["by_time_class"]]
    series = [("ep_finetuned", OURS), ("eval_lgbm", WEAK), ("lichess_formula", BASE)]
    w = 0.26
    for i, (name, color) in enumerate(series):
        xs = [j + (i - 1) * w for j in range(len(classes))]
        ys = [report["by_time_class"][tc][name]["log_loss"] for tc in classes]
        b.bar(xs, ys, w, color=color, label=MODEL_NAMES[name])
    for j, tc in enumerate(classes):
        ours, lichess = (report["by_time_class"][tc][n]["log_loss"] for n in ("ep_finetuned", "lichess_formula"))
        b.text(j, max(ours, lichess) + 0.006, f"−{(1 - ours / lichess) * 100:.0f}%", ha="center", fontsize=10, color=OURS, weight="bold")
    b.set_xticks(range(len(classes)), [f"{tc}\n{report['by_time_class'][tc]['n']:,} positions" for tc in classes])
    b.tick_params(axis="x", colors=theme["fg"])
    b.set_ylim(0.5, 0.74)
    b.set_ylabel("log loss")
    b.set_title("By time control: the clock matters most in bullet")
    b.legend(frameon=False, fontsize=9, loc="upper right")
    b.grid(axis="y", alpha=0.6)
    b.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(out, dpi=200)
    plt.close(fig)


def calibration(report: dict, theme: dict, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(5.4, 5))
    ax.plot([0, 1], [0, 1], ls="--", color=theme["muted"], lw=1, label="perfect calibration")
    for name, color, marker in (("lichess_formula", BASE, "s"), ("ep_finetuned", OURS, "o")):
        bins = report["calibration"][name]
        ax.plot([r["mean_pred"] for r in bins], [r["mean_actual"] for r in bins], marker=marker, color=color, lw=2, ms=6,
                label=MODEL_NAMES[name])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_xlabel("predicted score")
    ax.set_ylabel("actual score")
    ax.tick_params(axis="y", colors=theme["muted"])
    ax.set_title("Calibration (10 bins, held-out games)")
    ax.legend(frameon=False, fontsize=9, loc="upper left")
    ax.grid(alpha=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(out, dpi=200)
    plt.close(fig)


BENCH_ROWS = [
    ("Known cases with the right label", "all", "Known test cases\nlabelled correctly"),
    ("Lichess blunders we call mistake or worse", "bullet", "Lichess's blunders caught\n(bullet)"),
    ("Lichess blunders we call mistake or worse", "all", "Lichess's blunders caught\n(all games)"),
    ("Our blunders that Lichess also flags", "all", "Our blunders confirmed\nby Lichess"),
]


def _benchmark_table(md: str) -> dict[tuple[str, str], dict[str, float]]:
    targets = md.split("## Targets", 1)[1].split("\n## ", 1)[0]
    lines = [ln for ln in targets.splitlines() if ln.startswith("|")]
    header = [c.strip() for c in lines[0].strip("|").split("|")]
    rows = {}
    for ln in lines[2:]:
        cells = [c.strip() for c in ln.strip("|").split("|")]
        if len(cells) != len(header) or cells[0] == "Metric":
            continue
        vals = {}
        for h, c in zip(header[3:], cells[3:]):
            m = re.match(r"\d+(\.\d+)?", c)
            if m:
                vals[h] = float(m.group())
        rows.setdefault((cells[0], cells[2]), vals)
    return rows


def benchmark(md: str, theme: dict, out: Path) -> None:
    table = _benchmark_table(md)
    fig, ax = plt.subplots(figsize=(8.5, 4.4))
    labels = [label for *_, label in BENCH_ROWS][::-1]
    old = [table[(m, s)]["old_clock"] for m, s, _ in BENCH_ROWS][::-1]
    new = [table[(m, s)]["shipped"] for m, s, _ in BENCH_ROWS][::-1]
    ys = range(len(labels))
    ax.barh([y + 0.18 for y in ys], new, 0.36, color=OURS, label="Board-only move judge (shipped)")
    ax.barh([y - 0.18 for y in ys], old, 0.36, color=BASE, label="Clock-aware model (before)")
    for y, o, n in zip(ys, old, new):
        ax.text(n + 1, y + 0.18, f"{n:.0f}%", va="center", fontsize=10, color=theme["fg"], weight="bold")
        ax.text(o + 1, y - 0.18, f"{o:.0f}%", va="center", fontsize=10, color=theme["muted"])
    ax.set_yticks(list(ys), labels)
    ax.set_xlim(0, 112)
    ax.set_xlabel("% (fixed benchmark: 150 Lichess + 300 Chess.com games, 300 puzzles, 64 known cases)")
    ax.set_title("Benchmark: splitting out a board-only model fixed the bullet failure")
    ax.legend(frameon=False, fontsize=9, loc="upper center", bbox_to_anchor=(0.4, -0.2), ncol=2)
    ax.grid(axis="x", alpha=0.6)
    ax.set_axisbelow(True)
    fig.tight_layout()
    fig.savefig(out, dpi=200)
    plt.close(fig)


# Morphy's Opera Game before 13.Rxd7 (Stockfish +5.2), 10-minute game, from the shipped Chances model
# (see docs/engineering-log.md, "Numbers on the page are real").
SAME_POSITION = [("Two 800-rated players", 69), ("Two 1600-rated players", 84), ("Two 2400-rated players", 93)]


def same_position(theme: dict, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(8.5, 2.9))
    labels = [label for label, _ in SAME_POSITION]
    vals = [v for _, v in SAME_POSITION]
    ax.barh(labels, [100] * len(vals), 0.56, color=theme["grid"], alpha=0.5)
    ax.barh(labels, vals, 0.56, color=[BASE, WEAK, OURS])
    for y, v in enumerate(vals):
        ax.text(v - 1.5, y, f"{v}%", va="center", ha="right", fontsize=12, color="#ffffff", weight="bold")
    ax.set_xlim(0, 100)
    ax.set_xticks([])
    ax.spines["bottom"].set_visible(False)
    ax.spines["left"].set_visible(False)
    ax.tick_params(axis="y", length=0)
    ax.set_title("Same position, same engine score (+5.2), different players")
    fig.text(0.01, 0.02, "White's chances from elo101's Chances model, 10-minute game. A plain engine score is the same for all three.",
             fontsize=9, color=theme["muted"])
    fig.tight_layout(rect=(0, 0.06, 1, 1))
    fig.savefig(out, dpi=200)
    plt.close(fig)


# Sizes from docs/methodology.md ("Data") and the evaluation report.
FUNNEL = [
    ("Lichess games in one monthly dump", 84.6e6, "84.6M games"),
    ("Positions Lichess had already analysed", 46.1e6, "46.1M positions"),
    ("Used to pre-train the model", 12e6, "12M positions"),
    ("Scored with our own Stockfish (clean set)", 213e3, "213k positions"),
    ("Held-out test set (unseen games)", 31_961, "31,961 positions"),
]


def data_funnel(theme: dict, out: Path) -> None:
    fig, ax = plt.subplots(figsize=(8.5, 3.6))
    labels = [label for label, *_ in FUNNEL][::-1]
    vals = [v for _, v, _ in FUNNEL][::-1]
    tags = [t for *_, t in FUNNEL][::-1]
    colors = [OURS if i == 0 else BASE for i in range(len(vals))]
    ax.barh(labels, vals, 0.6, color=colors)
    ax.set_xscale("log")
    ax.xaxis.set_minor_locator(matplotlib.ticker.NullLocator())
    for y, (v, t) in enumerate(zip(vals, tags)):
        ax.text(v * 1.15, y, t, va="center", fontsize=10, color=theme["fg"], weight="bold")
    ax.set_xlim(1e4, 1e9)
    ax.set_xticks([])
    ax.spines["bottom"].set_visible(False)
    ax.tick_params(axis="y", length=0)
    ax.set_title("From one Lichess dump to a test set (log scale)")
    fig.tight_layout()
    fig.savefig(out, dpi=200)
    plt.close(fig)


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--report", type=Path, default=REPO / "ep_model" / "models" / "ep_eval_report.json")
    p.add_argument("--benchmark", type=Path, default=REPO / "docs" / "benchmark.md")
    p.add_argument("--out-dir", type=Path, default=REPO / "docs" / "images")
    args = p.parse_args()
    report = json.loads(args.report.read_text(encoding="utf-8"))
    md = args.benchmark.read_text(encoding="utf-8")
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for name, theme in THEMES.items():
        _style(theme)
        results(report, theme, args.out_dir / f"results-{name}.png")
        calibration(report, theme, args.out_dir / f"calibration-{name}.png")
        benchmark(md, theme, args.out_dir / f"benchmark-{name}.png")
        same_position(theme, args.out_dir / f"same-position-{name}.png")
        data_funnel(theme, args.out_dir / f"data-funnel-{name}.png")
    print(f"wrote figures to {args.out_dir}")


if __name__ == "__main__":
    main()

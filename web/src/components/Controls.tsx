interface Props {
  onFirst: () => void
  onPrev: () => void
  onNext: () => void
  onLast: () => void
  onTogglePlay: () => void
  playing: boolean
  atStart: boolean
  atEnd: boolean
  retrying: boolean
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>{children}</svg>
)

export function Controls({ onFirst, onPrev, onNext, onLast, onTogglePlay, playing, atStart, atEnd, retrying }: Props) {
  return (
    <div className="controls">
      <button type="button" data-testid="ctl-first" disabled={atStart} onClick={onFirst} aria-label="First move" title="First (↑ or Home)">
        <Icon><path d="M4 3v10M12 3 6 8l6 5" {...stroke} strokeWidth={2} /></Icon>
      </button>
      <button type="button" data-testid="ctl-prev" disabled={atStart} onClick={onPrev} aria-label="Previous move" title="Previous (←)">
        <Icon><path d="M10 3 5 8l5 5" {...stroke} strokeWidth={2.2} /></Icon>
      </button>
      <button type="button" data-testid="ctl-play" className="ctl-play" disabled={atEnd || retrying} aria-pressed={playing} onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (Space)">
        {playing
          ? <Icon><path d="M4.5 3h2.6v10H4.5zM8.9 3h2.6v10H8.9z" fill="currentColor" /></Icon>
          : <Icon><path d="M5 3l8 5-8 5z" fill="currentColor" /></Icon>}
      </button>
      <button type="button" data-testid="ctl-next" disabled={atEnd} onClick={onNext} aria-label="Next move" title="Next (→)">
        <Icon><path d="m6 3 5 5-5 5" {...stroke} strokeWidth={2.2} /></Icon>
      </button>
      <button type="button" data-testid="ctl-last" disabled={atEnd} onClick={onLast} aria-label="Last move" title="Last (↓ or End)">
        <Icon><path d="M12 3v10M4 3l6 5-6 5" {...stroke} strokeWidth={2} /></Icon>
      </button>
    </div>
  )
}

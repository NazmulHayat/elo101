import { useEffect, useRef, useState } from 'react'
import { BOARD_THEMES, type Appearance, type BoardTheme, type Settings } from '../lib/settings'

export function SettingsMenu({ settings, onChange }: { settings: Settings; onChange: (patch: Partial<Settings>) => void }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', close)
    }
  }, [open])

  return (
    <div className="settings" ref={box}>
      <button type="button" className="icon-btn" data-testid="settings-button" aria-label="Settings" aria-expanded={open} title="Settings" onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 16 16" width="17" height="17" aria-hidden>
          <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div className="settings-pop" role="dialog" aria-label="Settings">
          <label className="settings-label">Appearance
            <select className="field" data-testid="appearance-select" value={settings.appearance} onChange={(e) => onChange({ appearance: e.target.value as Appearance })}>
              <option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option>
            </select>
          </label>
          <div className="section-title">Board</div>
          <div className="theme-list">
            {(Object.keys(BOARD_THEMES) as BoardTheme[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`theme-swatch ${settings.theme === t ? 'on' : ''}`}
                onClick={() => onChange({ theme: t })}
                aria-pressed={settings.theme === t}
                data-testid={`board-theme-${t}`}
              >
                <span className="swatch" style={{ background: BOARD_THEMES[t].image ? `url(${import.meta.env.BASE_URL}${BOARD_THEMES[t].image}) 0 0 / 200% 200%` : `conic-gradient(${BOARD_THEMES[t].light} 0 25%, ${BOARD_THEMES[t].dark} 0 50%, ${BOARD_THEMES[t].light} 0 75%, ${BOARD_THEMES[t].dark} 0)` }} />
                {BOARD_THEMES[t].name}
              </button>
            ))}
          </div>
          <label className="toggle-row">
            <span>Move sounds</span>
            <input type="checkbox" checked={settings.sounds} onChange={(e) => onChange({ sounds: e.target.checked })} />
            <span className="toggle" aria-hidden />
          </label>
          <label className="volume-row">
            <span>Volume <output>{settings.volume}%</output></span>
            <input type="range" min="0" max="100" step="1" value={settings.volume} disabled={!settings.sounds} onChange={(e) => onChange({ volume: Number(e.target.value) })} />
          </label>
        </div>
      )}
    </div>
  )
}

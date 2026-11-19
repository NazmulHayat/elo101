// Per-browser preferences (board theme, sounds), kept in localStorage when available.
import { useCallback, useState } from 'react'

export type BoardTheme = 'ice' | 'green' | 'walnut' | 'slate' | 'frost'

export interface BoardThemeSpec {
  name: string
  light: string // light square (flat themes) or the swatch's light half
  dark: string
  image?: string // one picture for the whole board; squares are then transparent
  coordLight: string // coordinate colour printed on light squares
  coordDark: string // ... and on dark squares
  highlight: string // last-move tint, laid over the square
}

export const BOARD_THEMES: Record<BoardTheme, BoardThemeSpec> = {
  // Derived from Lichess's blue-marble board (AGPLv3+), recoloured.
  ice: { name: 'Ice marble', light: '#dfe8f0', dark: '#8ea8c3', image: 'boards/ice.jpg', coordLight: '#6e8fae', coordDark: '#eef3f7', highlight: 'rgba(98, 200, 255, .5)' },
  green: { name: 'Green', light: '#eeeed2', dark: '#769656', coordLight: '#769656', coordDark: '#eeeed2', highlight: 'rgba(255, 236, 80, .5)' },
  walnut: { name: 'Walnut', light: '#f0d9b5', dark: '#b58863', coordLight: '#b58863', coordDark: '#f0d9b5', highlight: 'rgba(255, 226, 80, .5)' },
  slate: { name: 'Slate', light: '#dee3e6', dark: '#8ca2ad', coordLight: '#788f9b', coordDark: '#eef1f3', highlight: 'rgba(98, 200, 255, .45)' },
  frost: { name: 'Frost', light: '#e8eef5', dark: '#7d93b2', coordLight: '#6d84a3', coordDark: '#eef3f7', highlight: 'rgba(98, 200, 255, .45)' },
}

/** Themes saved by earlier versions map onto today's list. */
const LEGACY_THEMES: Record<string, BoardTheme> = { club: 'ice' }

export interface Settings {
  theme: BoardTheme
  sounds: boolean
  volume: number
}

const KEY = 'cc.settings'
const DEFAULTS: Settings = { theme: 'ice', sounds: true, volume: 70 }

/** Saved settings JSON → valid settings; unknown or old values fall back safely. */
export function parseSettings(raw: string | null): Settings {
  try {
    const s = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
    return {
      theme: Object.prototype.hasOwnProperty.call(BOARD_THEMES, s.theme) ? s.theme
        : Object.prototype.hasOwnProperty.call(LEGACY_THEMES, s.theme) ? LEGACY_THEMES[s.theme] : DEFAULTS.theme,
      sounds: typeof s.sounds === 'boolean' ? s.sounds : DEFAULTS.sounds,
      volume: typeof s.volume === 'number' && Number.isFinite(s.volume) ? Math.min(100, Math.max(0, s.volume)) : DEFAULTS.volume,
    }
  } catch {
    return DEFAULTS
  }
}

function load(): Settings {
  try {
    return parseSettings(localStorage.getItem(KEY))
  } catch {
    return DEFAULTS
  }
}

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(load)
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((cur) => {
      const next = { ...cur, ...patch }
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable: setting lasts for this visit */
      }
      return next
    })
  }, [])
  return [settings, update]
}

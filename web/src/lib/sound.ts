import type { Side } from '../types'

export type SoundKind = 'start' | 'end' | 'move-self' | 'move-opponent' | 'capture' | 'check' | 'castle' | 'promote' | 'notify' | 'illegal'

const FILES: Record<SoundKind, string> = {
  start: 'game-start.mp3',
  end: 'game-end.mp3',
  'move-self': 'move-self.mp3',
  'move-opponent': 'move-opponent.mp3',
  capture: 'capture.mp3',
  check: 'move-check.mp3',
  castle: 'castle.mp3',
  promote: 'promote.mp3',
  notify: 'notify.mp3',
  illegal: 'illegal.mp3',
}

const sources = new Map<SoundKind, HTMLAudioElement>()

export function play(kind: SoundKind, volume = 70) {
  if (typeof Audio === 'undefined' || !Number.isFinite(volume) || volume <= 0) return
  try {
    let source = sources.get(kind)
    if (!source) {
      source = new Audio(`${import.meta.env.BASE_URL}sounds/${FILES[kind]}`)
      source.preload = 'auto'
      sources.set(kind, source)
    }
    // A fresh element lets quick successive moves finish independently.
    const clip = source.cloneNode(true) as HTMLAudioElement
    clip.volume = Math.min(100, volume) / 100
    void clip.play().catch(() => { /* Browser may block autoplay until the first interaction. */ })
  } catch {
    // Audio is optional; a playback failure must not interrupt review navigation.
  }
}

export function soundForSan(san: string, mover?: Side, playerSide?: Side): SoundKind {
  if (san.includes('=')) return 'promote'
  if (san.startsWith('O-O')) return 'castle'
  if (san.includes('+') || san.includes('#')) return 'check'
  if (san.includes('x')) return 'capture'
  return mover && playerSide && mover !== playerSide ? 'move-opponent' : 'move-self'
}

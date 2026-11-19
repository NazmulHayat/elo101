import { describe, expect, it } from 'vitest'
import { soundForSan } from './sound'

describe('review sound selection', () => {
  it('distinguishes the two players on quiet moves', () => {
    expect(soundForSan('Nf3', 'white', 'white')).toBe('move-self')
    expect(soundForSan('Nf6', 'black', 'white')).toBe('move-opponent')
  })

  it('uses the move event even when a move also checks or captures', () => {
    expect(soundForSan('Nxe5')).toBe('capture')
    expect(soundForSan('Nxe5+')).toBe('check')
    expect(soundForSan('O-O+')).toBe('castle')
    expect(soundForSan('exd8=Q+')).toBe('promote')
  })
})

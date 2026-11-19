import { describe, expect, it } from 'vitest'
import { parseSettings } from './settings'

describe('parseSettings', () => {
  it('defaults new visitors to the Ice marble board', () => {
    expect(parseSettings(null).theme).toBe('ice')
  })

  it('moves the retired Club board onto Ice marble', () => {
    expect(parseSettings(JSON.stringify({ theme: 'club', sounds: false })).theme).toBe('ice')
    expect(parseSettings(JSON.stringify({ theme: 'club', sounds: false })).sounds).toBe(false)
  })

  it('keeps other saved boards and ignores unknown ones', () => {
    expect(parseSettings(JSON.stringify({ theme: 'walnut' })).theme).toBe('walnut')
    expect(parseSettings(JSON.stringify({ theme: 'nope' })).theme).toBe('ice')
    expect(parseSettings('not json').theme).toBe('ice')
  })
})

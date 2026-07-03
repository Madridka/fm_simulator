import { describe, expect, it } from 'vitest'
import {
  seasonsUntilPlayerRetirement,
  willPlayerRetireAfterSeason,
} from '@/data/gameConfig/career'

describe('player retirement', () => {
  it('reports the same retirement horizon used by season progression', () => {
    expect(seasonsUntilPlayerRetirement(38)).toBe(1)
    expect(seasonsUntilPlayerRetirement(37)).toBe(2)
    expect(willPlayerRetireAfterSeason(37)).toBe(false)
    expect(willPlayerRetireAfterSeason(38)).toBe(true)
  })
})

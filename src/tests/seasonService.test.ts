import { describe, expect, it } from 'vitest'
import {
  createInitialGameState,
  finishSeason,
  getNextDivisionId,
} from '@/domain/season/seasonService'

describe('seasonService', () => {
  it('promotes top two and relegates bottom two with top and bottom division limits', () => {
    expect(getNextDivisionId(2, 1)).toBe(1)
    expect(getNextDivisionId(2, 2)).toBe(1)
    expect(getNextDivisionId(1, 1)).toBe(1)
    expect(getNextDivisionId(1, 9)).toBe(2)
    expect(getNextDivisionId(3, 10)).toBe(4)
    expect(getNextDivisionId(4, 10)).toBe(4)
  })

  it.each([
    ['russia', 'zenit', 108],
    ['spain', 'barcelona', 42],
  ] as const)('starts and rolls over a season in %s', (championshipId, clubId, clubsCount) => {
    const initial = createInitialGameState(championshipId, clubId)
    const nextSeason = finishSeason({
      ...initial,
      matches: initial.matches.map((match) => ({ ...match, status: 'played' as const })),
      cup: { ...initial.cup, championClubId: clubId },
    })

    expect(initial.championshipId).toBe(championshipId)
    expect(initial.clubs).toHaveLength(clubsCount)
    expect(nextSeason.championshipId).toBe(championshipId)
    expect(nextSeason.season).toBe(2)
    expect(nextSeason.clubs).toHaveLength(clubsCount)
    expect(nextSeason.matches.length).toBeGreaterThan(0)
  })
})

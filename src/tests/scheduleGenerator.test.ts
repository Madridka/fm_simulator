import { describe, expect, it } from 'vitest'
import { generateDivisionPairings, getSeasonMatchDate } from '@/domain/season/scheduleGenerator'

describe('scheduleGenerator', () => {
  it('generates 18 rounds for 10 teams and each team plays 18 matches', () => {
    const clubIds = Array.from({ length: 10 }, (_, index) => `club-${index + 1}`)
    const rounds = generateDivisionPairings(clubIds)
    const matchCounts = new Map(clubIds.map((clubId) => [clubId, 0]))

    expect(rounds).toHaveLength(18)

    for (const round of rounds) {
      expect(round).toHaveLength(5)
      for (const match of round) {
        expect(match.homeClubId).not.toBe(match.awayClubId)
        matchCounts.set(match.homeClubId, (matchCounts.get(match.homeClubId) ?? 0) + 1)
        matchCounts.set(match.awayClubId, (matchCounts.get(match.awayClubId) ?? 0) + 1)
      }
    }

    expect([...matchCounts.values()]).toEqual(Array(10).fill(18))
  })

  it('starts seasons in September and schedules every order on Saturday', () => {
    expect(getSeasonMatchDate(1, 1)).toBe('2026-09-05')
    expect(getSeasonMatchDate(1, 2)).toBe('2026-09-12')
    expect(getSeasonMatchDate(2, 1)).toBe('2027-09-04')

    for (let order = 1; order <= 24; order += 1) {
      expect(new Date(`${getSeasonMatchDate(1, order)}T12:00:00Z`).getUTCDay()).toBe(6)
    }
  })
})

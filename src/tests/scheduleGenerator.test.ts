import { describe, expect, it } from 'vitest'
import { getCountryCompetitionConfig } from '@/data/gameConfig'
import { assignLeagueRoundDates, resolveScheduleConflicts } from '@/domain/schedule/calendarSlotResolver'
import { generateLeagueRoundPairings } from '@/domain/schedule/leagueScheduleGenerator'
import type { Match } from '@/types/football'

describe('league schedule generation', () => {
  it('creates a balanced double round robin for even participants', () => {
    const clubIds = Array.from({ length: 10 }, (_, index) => `club-${index + 1}`)
    const rounds = generateLeagueRoundPairings(clubIds)
    const fixtures = rounds.flat()
    const uniqueFixtures = new Set(fixtures.map((match) => `${match.homeClubId}:${match.awayClubId}`))

    expect(rounds).toHaveLength(18)
    expect(uniqueFixtures.size).toBe(fixtures.length)
    for (const clubId of clubIds) {
      expect(fixtures.filter((match) => match.homeClubId === clubId)).toHaveLength(9)
      expect(fixtures.filter((match) => match.awayClubId === clubId)).toHaveLength(9)
    }
  })

  it('creates one bye per round for an odd participant count', () => {
    const clubIds = Array.from({ length: 9 }, (_, index) => `club-${index + 1}`)
    const rounds = generateLeagueRoundPairings(clubIds)
    expect(rounds).toHaveLength(18)
    expect(rounds.every((round) => round.length === 4)).toBe(true)
    expect(rounds.flat().every((match) => !match.homeClubId.includes('bye'))).toBe(true)
  })

  it('spans September through May and adds evenly distributed midweeks for 24 clubs', () => {
    const calendar = getCountryCompetitionConfig('england').calendar
    const dates = assignLeagueRoundDates(46, 1, calendar)
    const weekdays = new Set(dates.map((date) => new Date(`${date}T12:00:00Z`).getUTCDay()))

    expect(dates).toHaveLength(46)
    expect(dates[0]?.slice(5, 7)).toBe('09')
    expect(dates.at(-1)?.slice(5, 7)).toBe('05')
    expect(dates[0]?.slice(0, 4)).not.toBe(dates.at(-1)?.slice(0, 4))
    expect(weekdays.size).toBeGreaterThan(1)
  })

  it('keeps dates out of the Russian winter break', () => {
    const calendar = getCountryCompetitionConfig('russia').calendar
    const dates = assignLeagueRoundDates(30, 1, calendar)
    expect(dates.some((date) => date >= '2026-12-15' && date <= '2027-02-20')).toBe(false)
  })

  it('moves lower-priority fixtures when a club would play twice without enough rest', () => {
    const calendar = getCountryCompetitionConfig('england').calendar
    const base = (id: string, type: Match['type'], date: string, awayClubId: string): Match => ({
      id, season: 1, type, date, order: 1, round: 1,
      homeClubId: 'shared-club', awayClubId, neutralVenue: false, status: 'scheduled',
    })
    const cup = base('cup', 'cup', '2026-10-07', 'cup-opponent')
    const league = base('league', 'league', '2026-10-07', 'league-opponent')
    const resolved = resolveScheduleConflicts([league, cup], 1, calendar)
    const cupDate = resolved.matches.find((match) => match.id === 'cup')?.date
    const leagueDate = resolved.matches.find((match) => match.id === 'league')?.date

    expect(cupDate).toBe('2026-10-07')
    expect(leagueDate).not.toBe(cupDate)
    expect(resolved.resolutions.some((item) => item.matchId === 'league')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import type { Club, Match } from '@/types/football'

const createClub = (id: string): Club => ({
  id,
  name: id,
  shortName: id.toUpperCase(),
  city: 'Test',
  divisionId: 1,
  rating: 50,
  attackRating: 50,
  midfieldRating: 50,
  defenseRating: 50,
  budget: 0,
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  squad: [],
})

const createMatch = (
  id: string,
  homeClubId: string,
  awayClubId: string,
  homeGoals: number,
  awayGoals: number,
): Match => ({
  id,
  season: 1,
  type: 'league',
  date: '2026-09-05',
  order: 1,
  round: 1,
  divisionId: 1,
  homeClubId,
  awayClubId,
  neutralVenue: false,
  status: 'played',
  result: {
    homeGoals,
    awayGoals,
    winnerClubId:
      homeGoals > awayGoals ? homeClubId : awayGoals > homeGoals ? awayClubId : undefined,
    goals: [],
    stats: {
      home: { possession: 50, shots: 1, shotsOnTarget: 1, yellowCards: 0 },
      away: { possession: 50, shots: 1, shotsOnTarget: 1, yellowCards: 0 },
    },
    bestPlayerId: 'p1',
  },
})

describe('leagueTableService', () => {
  it('counts points and sorts by points, goal difference, goals and wins', () => {
    const clubs = [createClub('alpha'), createClub('beta'), createClub('gamma')]
    const matches = [
      createMatch('m1', 'alpha', 'beta', 2, 0),
      createMatch('m2', 'gamma', 'alpha', 1, 1),
      createMatch('m3', 'beta', 'gamma', 0, 3),
    ]

    const table = calculateLeagueTables(clubs, matches)[1]

    expect(table?.[0]?.clubId).toBe('gamma')
    expect(table?.[0]?.points).toBe(4)
    expect(table?.[1]?.clubId).toBe('alpha')
    expect(table?.[1]?.points).toBe(4)
    expect(table?.[2]?.clubId).toBe('beta')
    expect(table?.[2]?.points).toBe(0)
  })
})

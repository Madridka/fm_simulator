import { describe, expect, it } from 'vitest'
import { advanceCupIfPossible, initializeCup } from '@/domain/competition/cupService'
import { clubs } from '@/data/clubs'
import type { Match, MatchResult } from '@/types/football'

const resultFor = (match: Match): MatchResult => ({
  homeGoals: 1,
  awayGoals: 0,
  winnerClubId: match.homeClubId,
  goals: [],
  stats: {
    home: { possession: 50, shots: 5, shotsOnTarget: 2, yellowCards: 0 },
    away: { possession: 50, shots: 5, shotsOnTarget: 2, yellowCards: 0 },
  },
  bestPlayerId: 'p1',
})

describe('cupService', () => {
  it('starts from round of 128 and advances winners to round of 64 with byes', () => {
    const initial = initializeCup(clubs, 1)

    expect(initial.matches).toHaveLength(44)
    expect(initial.cup.rounds[0]?.id).toBe('round_of_128')
    expect(initial.cup.rounds[0]?.byes).toHaveLength(20)

    const playedMatches = initial.matches.map((match) => ({
      ...match,
      status: 'played' as const,
      result: resultFor(match),
    }))

    const advanced = advanceCupIfPossible(initial.cup, playedMatches)
    const roundOf64 = advanced.cup.rounds.find((round) => round.id === 'round_of_64')

    expect(advanced.completedRoundId).toBe('round_of_128')
    expect(advanced.newMatches).toHaveLength(32)
    expect(roundOf64?.ties).toHaveLength(32)
  })
})

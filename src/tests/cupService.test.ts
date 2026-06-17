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
  it('creates preliminary round and advances winners to round of 32 with byes', () => {
    const initial = initializeCup(clubs, 1)

    expect(initial.matches).toHaveLength(8)
    expect(initial.cup.rounds[0]?.byes).toHaveLength(24)

    const playedMatches = initial.matches.map((match) => ({
      ...match,
      status: 'played' as const,
      result: resultFor(match),
    }))

    const advanced = advanceCupIfPossible(initial.cup, playedMatches)
    const roundOf32 = advanced.cup.rounds.find((round) => round.id === 'round_of_32')

    expect(advanced.completedRoundId).toBe('preliminary')
    expect(advanced.newMatches).toHaveLength(16)
    expect(roundOf32?.ties).toHaveLength(16)
  })
})

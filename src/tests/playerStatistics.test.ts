import { describe, expect, it } from 'vitest'
import {
  completePreparedUserMatchDay,
  createInitialGameState,
  getNextUserMatch,
  getUserStarterIds,
  prepareUserMatchDay,
} from '@/domain/season/seasonService'
import type { MatchResult } from '@/types/football'

describe('player statistics', () => {
  it('accumulates goals, assists, cards and goalkeeper clean sheets', () => {
    const initial = createInitialGameState('spain', 'barcelona', 12345)
    const match = getNextUserMatch(initial)!
    const prepared = prepareUserMatchDay(initial, match.id)
    const starterIds = getUserStarterIds(prepared)
    const club = prepared.clubs.find((candidate) => candidate.id === prepared.selectedClubId)!
    const goalkeeper = club.squad.find(
      (player) => player.position === 'GK' && starterIds.includes(player.id),
    )!
    const scorer = club.squad.find(
      (player) => player.position !== 'GK' && starterIds.includes(player.id),
    )!
    const assister = club.squad.find(
      (player) => player.id !== scorer.id && player.position !== 'GK' && starterIds.includes(player.id),
    )!
    const userIsHome = match.homeClubId === prepared.selectedClubId
    const result: MatchResult = {
      detail: 'full',
      homeGoals: userIsHome ? 1 : 0,
      awayGoals: userIsHome ? 0 : 1,
      winnerClubId: prepared.selectedClubId,
      goals: [
        {
          minute: 42,
          clubId: prepared.selectedClubId,
          playerId: scorer.id,
          playerName: scorer.lastName,
          assistPlayerId: assister.id,
          assistPlayerName: assister.lastName,
        },
      ],
      stats: {
        home: { possession: 55, shots: 10, shotsOnTarget: 4, yellowCards: userIsHome ? 1 : 0, xG: 1.4 },
        away: { possession: 45, shots: 6, shotsOnTarget: 2, yellowCards: userIsHome ? 0 : 1, xG: 0.6 },
      },
      bestPlayerId: scorer.id,
      cards: [
        {
          minute: 70,
          clubId: prepared.selectedClubId,
          playerId: assister.id,
          card: 'red',
          dismissalReason: 'direct-red',
        },
      ],
    }

    const completed = completePreparedUserMatchDay(prepared, match.id, result)

    expect(completed.playerStats[scorer.id]?.goals).toBe(1)
    expect(completed.playerStats[assister.id]?.assists).toBe(1)
    expect(completed.playerStats[assister.id]?.redCards).toBe(1)
    expect(completed.playerStats[goalkeeper.id]?.cleanSheets).toBe(1)
    expect(completed.worldPlayerStats?.spain?.[scorer.id]?.goals).toBe(1)
  })
})

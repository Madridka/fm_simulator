import { describe, expect, it } from 'vitest'
import {
  completePreparedUserMatchDay,
  createInitialGameState,
  finishSeason,
  getNextUserMatch,
  getNextDivisionId,
  getUserStarterIds,
  prepareUserMatchDay,
  recoverInjuredPlayersBeforeOrder,
  settleAiOnlyDaysUntilNextUserMatch,
} from '@/domain/season/seasonService'
import { gameConfig } from '@/config/gameConfig'
import type { MatchResult } from '@/types/football'

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

  it('keeps an injured player out for the configured matchdays and then recovers him', () => {
    const initial = createInitialGameState('russia', 'zenit')
    const match = getNextUserMatch(initial)
    expect(match).toBeDefined()

    const prepared = prepareUserMatchDay(initial, match!.id)
    const playerId = getUserStarterIds(prepared)[0]
    expect(playerId).toBeDefined()

    const result: MatchResult = {
      detail: 'full',
      homeGoals: 0,
      awayGoals: 0,
      goals: [],
      stats: {
        home: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
        away: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
      },
      bestPlayerId: playerId!,
      injuries: [
        {
          clubId: initial.selectedClubId,
          playerId: playerId!,
          durationMatchdays: 2,
        },
      ],
    }
    const completed = completePreparedUserMatchDay(prepared, match!.id, result)
    const injuredPlayer = completed.clubs
      .flatMap((club) => club.squad)
      .find((player) => player.id === playerId)

    expect(injuredPlayer?.isInjured).toBe(true)
    expect(injuredPlayer?.injuryUntilOrder).toBe(match!.order + 2)

    const stillInjured = recoverInjuredPlayersBeforeOrder(
      completed.clubs,
      match!.order + 2,
    )
      .flatMap((club) => club.squad)
      .find((player) => player.id === playerId)
    const recovered = recoverInjuredPlayersBeforeOrder(
      completed.clubs,
      match!.order + 3,
    )
      .flatMap((club) => club.squad)
      .find((player) => player.id === playerId)

    expect(stillInjured?.isInjured).toBe(true)
    expect(recovered?.isInjured).toBe(false)
    expect(recovered?.injuryUntilOrder).toBeUndefined()
  })

  it('recovers fitness for players who did not play the match', () => {
    const initial = createInitialGameState('russia', 'zenit')
    const match = getNextUserMatch(initial)
    expect(match).toBeDefined()

    const prepared = prepareUserMatchDay(initial, match!.id)
    const starterIds = new Set(getUserStarterIds(prepared))
    const userClub = prepared.clubs.find((club) => club.id === prepared.selectedClubId)
    const reserve = userClub?.squad.find((player) => !starterIds.has(player.id))
    const starter = userClub?.squad.find((player) => starterIds.has(player.id))
    expect(reserve).toBeDefined()
    expect(starter).toBeDefined()

    const stateWithKnownFitness = {
      ...prepared,
      clubs: prepared.clubs.map((club) => ({
        ...club,
        squad: club.squad.map((player) =>
          player.id === reserve!.id || player.id === starter!.id
            ? { ...player, fitness: 50 }
            : player,
        ),
      })),
    }
    const result: MatchResult = {
      detail: 'full',
      homeGoals: 0,
      awayGoals: 0,
      goals: [],
      stats: {
        home: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
        away: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
      },
      bestPlayerId: starter!.id,
    }

    const completed = completePreparedUserMatchDay(stateWithKnownFitness, match!.id, result)
    const completedPlayers = completed.clubs
      .find((club) => club.id === completed.selectedClubId)!
      .squad
    const reserveFitness = completedPlayers.find((player) => player.id === reserve!.id)!.fitness
    const starterFitness = completedPlayers.find((player) => player.id === starter!.id)!.fitness

    expect(reserveFitness).toBeGreaterThanOrEqual(60)
    expect(reserveFitness).toBeLessThanOrEqual(75)
    expect(starterFitness).toBeGreaterThanOrEqual(36)
    expect(starterFitness).toBeLessThanOrEqual(44)
  })

  it('does not create a season beyond the configured career limit', () => {
    const state = createInitialGameState('russia', 'zenit')
    const finalSeasonState = {
      ...state,
      season: gameConfig.maximumSeasons,
      matches: state.matches.map((match) => ({ ...match, status: 'played' as const })),
      cup: { ...state.cup, championClubId: state.selectedClubId },
    }

    const result = finishSeason(finalSeasonState)

    expect(result).toBe(finalSeasonState)
    expect(result.season).toBe(gameConfig.maximumSeasons)
  })

  it('finishes AI-only matchdays when the user has no matches left', () => {
    const initial = createInitialGameState('spain', 'barcelona')
    const stateWithoutUserMatches = {
      ...initial,
      matches: initial.matches.map((match) => {
        const userIsHome = match.homeClubId === initial.selectedClubId
        const userIsAway = match.awayClubId === initial.selectedClubId
        if (!userIsHome && !userIsAway) {
          return match
        }

        return {
          ...match,
          status: 'played' as const,
          result: {
            detail: 'fast' as const,
            homeGoals: userIsHome ? 0 : 1,
            awayGoals: userIsHome ? 1 : 0,
            winnerClubId: userIsHome ? match.awayClubId : match.homeClubId,
            goals: [],
            stats: {
              home: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
              away: { possession: 50, shots: 0, shotsOnTarget: 0, yellowCards: 0 },
            },
            bestPlayerId: '',
          },
        }
      }),
    }

    const settled = settleAiOnlyDaysUntilNextUserMatch(stateWithoutUserMatches)

    expect(settled.matches.some((match) => match.status === 'scheduled')).toBe(false)
    expect(settled.cup.championClubId).toBeDefined()
  })
})

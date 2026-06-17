import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import { completeUserMatchDay, createInitialGameState, finishSeason, getNextUserMatch, isSeasonReadyToFinish, refreshLineupsAfterSquadChange } from '@/domain/season/seasonService'
import { gameSaveRepository } from '@/repositories/gameSaveRepository'
import type { Club, ClubLineup, GameState, Match, MatchResult } from '@/types/football'

export const useGameStore = defineStore('game', () => {
  const game = ref<GameState | null>(gameSaveRepository.load())

  const selectedClub = computed<Club | undefined>(() => {
    if (!game.value) {
      return undefined
    }
    return game.value.clubs.find((club) => club.id === game.value?.selectedClubId)
  })

  const nextMatch = computed<Match | undefined>(() => (game.value ? getNextUserMatch(game.value) : undefined))

  const seasonCanFinish = computed<boolean>(() => (game.value ? isSeasonReadyToFinish(game.value) : false))

  const save = (): void => {
    if (game.value) {
      gameSaveRepository.save(game.value)
    }
  }

  const startNewGame = (clubId: string): void => {
    game.value = createInitialGameState(clubId)
    save()
  }

  const resetGame = (): void => {
    game.value = null
    gameSaveRepository.clear()
  }

  const updateGame = (nextState: GameState): void => {
    game.value = nextState
    save()
  }

  const updateLineup = (clubId: string, lineup: ClubLineup): void => {
    if (!game.value) {
      return
    }

    updateGame({
      ...game.value,
      lineups: {
        ...game.value.lineups,
        [clubId]: lineup,
      },
    })
  }

  const replaceClubs = (clubs: Club[]): void => {
    if (!game.value) {
      return
    }

    const nextState: GameState = {
      ...game.value,
      clubs,
      lineups: refreshLineupsAfterSquadChange({
        ...game.value,
        clubs,
      }),
    }
    updateGame({
      ...nextState,
      leagueTables: calculateLeagueTables(nextState.clubs, nextState.matches),
    })
  }

  const completeMatch = (matchId: string, result: MatchResult): void => {
    if (!game.value) {
      return
    }
    updateGame(completeUserMatchDay(game.value, matchId, result))
  }

  const finishCurrentSeason = (): void => {
    if (!game.value || !isSeasonReadyToFinish(game.value)) {
      return
    }
    updateGame(finishSeason(game.value))
  }

  return {
    game,
    selectedClub,
    nextMatch,
    seasonCanFinish,
    startNewGame,
    resetGame,
    updateGame,
    updateLineup,
    replaceClubs,
    completeMatch,
    finishCurrentSeason,
  }
})

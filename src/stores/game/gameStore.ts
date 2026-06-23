import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { calculateLeagueTables } from '@/domain/competition/leagueTableService'
import { getChampionship } from '@/data/clubs'
import {
  completeUserMatchDay,
  createInitialGameState,
  finishSeason,
  getNextUserMatch,
  isSeasonReadyToFinish,
  refreshLineupsAfterSquadChange,
} from '@/domain/season/seasonService'
import { gameSaveRepository } from '@/repositories/gameSaveRepository'
import type { ChampionshipId, Club, ClubLineup, GameState, Match, MatchResult } from '@/types/football'

export const useGameStore = defineStore('game', () => {
  const game = ref<GameState | null>(gameSaveRepository.load())
  const activeMatchId = ref<string | null>(null)

  const selectedClub = computed<Club | undefined>(() => {
    if (!game.value) {
      return undefined
    }
    return game.value.clubs.find((club) => club.id === game.value?.selectedClubId)
  })

  const nextMatch = computed<Match | undefined>(() =>
    game.value ? getNextUserMatch(game.value) : undefined,
  )

  const canOpenMatch = (match: Match): boolean => {
    const state = game.value
    if (!state) {
      return false
    }

    const isUserMatch = match.homeClubId === state.selectedClubId || match.awayClubId === state.selectedClubId
    return isUserMatch && (match.status === 'played' || nextMatch.value?.id === match.id)
  }

  const activeMatch = computed<Match | undefined>(() => {
    const state = game.value
    if (!state) {
      return undefined
    }

    const selected = activeMatchId.value
      ? state.matches.find((match) => match.id === activeMatchId.value)
      : undefined

    if (selected && canOpenMatch(selected)) {
      return selected
    }

    return nextMatch.value
  })

  const championship = computed(() =>
    game.value ? getChampionship(game.value.championshipId) : undefined,
  )

  const seasonCanFinish = computed<boolean>(() =>
    game.value ? isSeasonReadyToFinish(game.value) : false,
  )

  const save = (): void => {
    if (game.value) {
      gameSaveRepository.save(game.value)
    }
  }

  const startNewGame = (championshipId: ChampionshipId, clubId: string): void => {
    activeMatchId.value = null
    game.value = createInitialGameState(championshipId, clubId)
    save()
  }

  const resetGame = (): void => {
    activeMatchId.value = null
    game.value = null
    gameSaveRepository.clear()
  }

  const openMatch = (matchId: string): boolean => {
    const match = game.value?.matches.find((candidate) => candidate.id === matchId)
    if (!match || !canOpenMatch(match)) {
      return false
    }

    activeMatchId.value = match.id
    return true
  }

  const clearActiveMatch = (): void => {
    activeMatchId.value = null
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
    const nextUserMatch = getNextUserMatch(game.value)
    if (!nextUserMatch || nextUserMatch.id !== matchId) {
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
    championship,
    selectedClub,
    nextMatch,
    activeMatch,
    seasonCanFinish,
    startNewGame,
    resetGame,
    openMatch,
    clearActiveMatch,
    updateGame,
    updateLineup,
    replaceClubs,
    completeMatch,
    finishCurrentSeason,
  }
})

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { autoSelectLineup, getFormationSlots } from '@/domain/season/squadSelectionService'
import { createInitialWorldCup2026State } from '@/services/worldCup2026/initializeTournament'
import { matchResultToWorldCupResult } from '@/services/worldCup2026/matchResultAdapter'
import {
  canPlayUserMatch,
  canSimulateMatchDay,
  completeUserMatchAndRound,
  getUserNextMatch,
  prepareUntilUserMatch,
  simulateAllRemainingMatches,
  simulateWorldCupMatchDay,
} from '@/services/worldCup2026/simulateWorldCupRound'
import { worldCup2026SaveRepository } from '@/repositories/worldCup2026SaveRepository'
import type { WorldCup2026State } from '@/stores/worldCup2026/types'
import type { NationalTeam } from '@/data/wc26/nationalTeam'
import { resolveTeamFlagEmoji } from '@/data/wc26/nationalTeam'
import type { ClubLineup, MatchResult, PlayedLineup, PreparedMatchContext } from '@/types/football'
import { matchTeamToClub, nationalTeamToMatchTeam } from '@/types/matchTeam'

const buildPlayedLineup = (club: ReturnType<typeof matchTeamToClub>, lineup: ClubLineup): PlayedLineup => {
  const starters = getFormationSlots(lineup.formation)
    .map((slot) => lineup.starters[slot.id])
    .filter((playerId): playerId is string => typeof playerId === 'string')

  return {
    formation: lineup.formation,
    tacticalStyle: lineup.tacticalStyle,
    starters,
    substitutes: [...new Set(lineup.substitutes)].filter((id) => !starters.includes(id)),
  }
}

const hydrateLoadedState = (loaded: WorldCup2026State | null): WorldCup2026State | null => {
  if (!loaded) {
    return null
  }

  const selectedTeam = loaded.teams.find((team) => team.id === loaded.selectedTeamId)
  if (selectedTeam && !loaded.lineups[loaded.selectedTeamId]) {
    const club = matchTeamToClub(nationalTeamToMatchTeam(selectedTeam))
    return {
      ...loaded,
      lineups: {
        ...loaded.lineups,
        [loaded.selectedTeamId]: autoSelectLineup(club),
      },
    }
  }

  return loaded
}

export const useWorldCup2026Store = defineStore('worldCup2026', () => {
  const state = ref<WorldCup2026State | null>(hydrateLoadedState(worldCup2026SaveRepository.load()))
  const activeMatchId = ref<string | null>(null)
  const preparedMatchContext = ref<PreparedMatchContext | null>(null)

  const selectedTeam = computed<NationalTeam | undefined>(() =>
    state.value?.teams.find((team) => team.id === state.value?.selectedTeamId),
  )

  const nextMatch = computed(() => (state.value ? getUserNextMatch(state.value) : undefined))

  const activeMatch = computed(() =>
    state.value?.matches.find((match) => match.id === activeMatchId.value),
  )

  const canPlay = computed(() => (state.value ? canPlayUserMatch(state.value) : false))

  const canSimulate = computed(() => (state.value ? canSimulateMatchDay(state.value) : false))

  const isFinished = computed(() => state.value?.status === 'finished')

  const isUserEliminated = computed(() => Boolean(state.value?.userEliminatedAt))

  const isChampion = computed(
    () => state.value?.championTeamId === state.value?.selectedTeamId,
  )

  const save = (): void => {
    if (state.value) {
      worldCup2026SaveRepository.save(state.value)
    }
  }

  const updateLineup = (teamId: string, lineup: ClubLineup): void => {
    if (!state.value) {
      return
    }
    state.value = {
      ...state.value,
      lineups: {
        ...state.value.lineups,
        [teamId]: lineup,
      },
    }
    save()
  }

  const startTournament = (teamId: string): void => {
    state.value = createInitialWorldCup2026State(teamId)
    save()
  }

  const resetTournament = (): void => {
    activeMatchId.value = null
    preparedMatchContext.value = null
    state.value = null
    worldCup2026SaveRepository.clear()
  }

  const buildMatchContext = (matchId: string): PreparedMatchContext | null => {
    if (!state.value) {
      return null
    }

    const match = state.value.matches.find((candidate) => candidate.id === matchId)
    if (!match) {
      return null
    }

    const homeTeam = state.value.teams.find((team) => team.id === match.homeTeamId)
    const awayTeam = state.value.teams.find((team) => team.id === match.awayTeamId)
    if (!homeTeam || !awayTeam) {
      return null
    }

    const homeClub = matchTeamToClub(nationalTeamToMatchTeam(homeTeam))
    const awayClub = matchTeamToClub(nationalTeamToMatchTeam(awayTeam))
    const isUserHome = match.homeTeamId === state.value.selectedTeamId
    const isUserAway = match.awayTeamId === state.value.selectedTeamId

    const homeLineup = isUserHome
      ? state.value.lineups[homeTeam.id] ?? autoSelectLineup(homeClub)
      : autoSelectLineup(homeClub)
    const awayLineup = isUserAway
      ? state.value.lineups[awayTeam.id] ?? autoSelectLineup(awayClub)
      : autoSelectLineup(awayClub)

    return {
      matchId: match.id,
      homeClub,
      awayClub,
      lineups: {
        home: buildPlayedLineup(homeClub, homeLineup),
        away: buildPlayedLineup(awayClub, awayLineup),
      },
    }
  }

  const prepareUserMatch = (): boolean => {
    if (!state.value || !canPlayUserMatch(state.value)) {
      return false
    }

    state.value = prepareUntilUserMatch(state.value)
    const userMatch = getUserNextMatch(state.value)
    if (!userMatch) {
      save()
      return false
    }

    const context = buildMatchContext(userMatch.id)
    if (!context) {
      save()
      return false
    }

    activeMatchId.value = userMatch.id
    preparedMatchContext.value = context
    save()
    return true
  }

  const completeUserMatch = (matchId: string, result: MatchResult): void => {
    if (!state.value) {
      return
    }

    const match = state.value.matches.find((candidate) => candidate.id === matchId)
    if (!match || match.status === 'played') {
      return
    }

    const wcResult = matchResultToWorldCupResult(match, result)
    state.value = completeUserMatchAndRound(state.value, matchId, wcResult)
    save()
  }

  const clearActiveMatch = (): void => {
    activeMatchId.value = null
    preparedMatchContext.value = null
  }

  const simulateNextMatchDay = (): void => {
    if (!state.value) {
      return
    }
    state.value = simulateWorldCupMatchDay(state.value)
    save()
  }

  const simulateRest = (): void => {
    if (!state.value) {
      return
    }
    state.value = simulateAllRemainingMatches(state.value)
    save()
  }

  const getTeamFlag = (teamId: string): string => {
    const team = state.value?.teams.find((candidate) => candidate.id === teamId)
    return team ? resolveTeamFlagEmoji(team.flagCode) : '⚽'
  }

  const getTeamName = (teamId: string): string => {
    return state.value?.teams.find((candidate) => candidate.id === teamId)?.name ?? teamId
  }

  return {
    state,
    selectedTeam,
    nextMatch,
    activeMatch,
    activeMatchId,
    preparedMatchContext,
    canPlay,
    canSimulate,
    isFinished,
    isUserEliminated,
    isChampion,
    startTournament,
    resetTournament,
    prepareUserMatch,
    completeUserMatch,
    clearActiveMatch,
    simulateNextMatchDay,
    simulateRest,
    getTeamFlag,
    getTeamName,
    save,
    updateLineup,
  }
})

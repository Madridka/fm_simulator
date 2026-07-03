import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { createInitialWorldCup2026State } from '@/services/worldCup2026/initializeTournament'
import {
  canSimulateMatchDay,
  getUserNextMatch,
  simulateWorldCupMatchDay,
} from '@/services/worldCup2026/simulateWorldCupRound'
import { worldCup2026SaveRepository } from '@/repositories/worldCup2026SaveRepository'
import type { NationalTeam } from '@/data/nationalTeams/worldCup2026/teams'
import type { WorldCup2026State } from '@/stores/worldCup2026/types'
import { flagEmoji } from '@/data/nationalTeams/worldCup2026/teams'

export const useWorldCup2026Store = defineStore('worldCup2026', () => {
  const state = ref<WorldCup2026State | null>(worldCup2026SaveRepository.load())

  const selectedTeam = computed<NationalTeam | undefined>(() =>
    state.value?.teams.find((team) => team.id === state.value?.selectedTeamId),
  )

  const nextMatch = computed(() => (state.value ? getUserNextMatch(state.value) : undefined))

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

  const startTournament = (teamId: string): void => {
    state.value = createInitialWorldCup2026State(teamId)
    save()
  }

  const resetTournament = (): void => {
    state.value = null
    worldCup2026SaveRepository.clear()
  }

  const simulateNextMatchDay = (): void => {
    if (!state.value || !canSimulateMatchDay(state.value)) {
      return
    }
    state.value = simulateWorldCupMatchDay(state.value)
    save()
  }

  const getTeamFlag = (teamId: string): string => {
    const team = state.value?.teams.find((candidate) => candidate.id === teamId)
    return team ? flagEmoji(team.flagCode) : '⚽'
  }

  const getTeamName = (teamId: string): string => {
    return state.value?.teams.find((candidate) => candidate.id === teamId)?.name ?? teamId
  }

  return {
    state,
    selectedTeam,
    nextMatch,
    canSimulate,
    isFinished,
    isUserEliminated,
    isChampion,
    startTournament,
    resetTournament,
    simulateNextMatchDay,
    getTeamFlag,
    getTeamName,
    save,
  }
})

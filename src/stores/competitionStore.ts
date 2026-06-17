import { defineStore } from 'pinia'
import { computed } from 'vue'
import { getClubCupProgress } from '@/domain/competition/cupService'
import { getClubPosition } from '@/domain/competition/leagueTableService'
import { useGameStore } from '@/stores/gameStore'
import type { CupState, LeagueTableRow } from '@/types/football'

export const useCompetitionStore = defineStore('competitions', () => {
  const gameStore = useGameStore()

  const leagueTables = computed<Record<number, LeagueTableRow[]>>(() => gameStore.game?.leagueTables ?? {})

  const cup = computed<CupState | undefined>(() => gameStore.game?.cup)

  const selectedClubRow = computed<LeagueTableRow | undefined>(() => {
    const game = gameStore.game
    return game ? getClubPosition(game.leagueTables, game.selectedClubId) : undefined
  })

  const cupProgress = computed<string>(() => {
    const game = gameStore.game
    return game ? getClubCupProgress(game.cup, game.selectedClubId) : 'Нет сохранения'
  })

  return {
    leagueTables,
    cup,
    selectedClubRow,
    cupProgress,
  }
})

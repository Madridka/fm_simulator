import { defineStore } from 'pinia'
import { computed } from 'vue'
import { getClubCupProgress } from '@/domain/competition/cupService'
import { getClubPosition } from '@/domain/competition/leagueTableService'
import { t } from '@/plugins/i18n/i18n'
import { useGameStore } from '@/stores/game/gameStore'
import type { CupState, LeagueTableRow } from '@/types/football'

// ПРЕДОСТАВЛЯЕТ ТАБЛИЦЫ И КУБКОВЫЙ ПРОГРЕСС ДЛЯ ИНТЕРФЕЙСА
export const useCompetitionStore = defineStore('competitions', () => {
  const gameStore = useGameStore()

  // ВОЗВРАЩАЕТ ВСЕ ТУРНИРНЫЕ ТАБЛИЦЫ ТЕКУЩЕГО ЧЕМПИОНАТА
  const leagueTables = computed<Record<string, LeagueTableRow[]>>(
    () => gameStore.game?.leagueTables ?? {},
  )

  // ВОЗВРАЩАЕТ ТЕКУЩЕЕ СОСТОЯНИЕ КУБКОВОЙ СЕТКИ
  const cup = computed<CupState | undefined>(() => gameStore.game?.cup)

  // НАХОДИТ СТРОКУ УПРАВЛЯЕМОГО КЛУБА В ТАБЛИЦЕ
  const selectedClubRow = computed<LeagueTableRow | undefined>(() => {
    const game = gameStore.game
    return game ? getClubPosition(game.leagueTables, game.selectedClubId) : undefined
  })

  // ФОРМИРУЕТ ТЕКСТОВОЕ ОПИСАНИЕ РЕЗУЛЬТАТА КЛУБА В КУБКЕ
  const cupProgress = computed<string>(() => {
    const game = gameStore.game
    return game ? getClubCupProgress(game.cup, game.selectedClubId) : t('cup.progress.noSave')
  })

  return {
    leagueTables,
    cup,
    selectedClubRow,
    cupProgress,
  }
})

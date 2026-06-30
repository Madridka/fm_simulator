import { defineStore } from 'pinia'
import { computed } from 'vue'
import {
  autoSelectLineup,
  createEmptyLineup,
  formations,
  getFormationSlots,
  tacticalStyles,
  validateLineup,
} from '@/domain/season/squadSelectionService'
import { useGameStore } from '@/stores/game/gameStore'
import type { Club, ClubLineup, Formation, FormationSlot, TacticalStyle } from '@/types/football'
import type { PlayerMoveSource } from '@/stores/squad/types'

// УПРАВЛЯЕТ СХЕМОЙ, ТАКТИКОЙ И ПЕРЕМЕЩЕНИЕМ ИГРОКОВ МЕЖДУ ГРУППАМИ СОСТАВА
export const useSquadStore = defineStore('squad', () => {
  const gameStore = useGameStore()

  // ВОЗВРАЩАЕТ УПРАВЛЯЕМЫЙ КЛУБ
  const club = computed((): Club | undefined => gameStore.selectedClub)

  // ВОЗВРАЩАЕТ СОХРАНЁННЫЙ СОСТАВ УПРАВЛЯЕМОГО КЛУБА
  const lineup = computed<ClubLineup | undefined>(() => {
    const game = gameStore.game
    if (!game) {
      return undefined
    }
    return game.lineups[game.selectedClubId]
  })

  // ВОЗВРАЩАЕТ ТАКТИЧЕСКИЕ СЛОТЫ ТЕКУЩЕЙ СХЕМЫ
  const slots = computed<FormationSlot[]>(() =>
    lineup.value ? getFormationSlots(lineup.value.formation) : [],
  )

  // ПРОВЕРЯЕТ ГОТОВНОСТЬ СОСТАВА К МАТЧУ
  const validation = computed(() => {
    if (!club.value || !lineup.value) {
      return { valid: false, errors: ['Клуб не выбран.'] }
    }
    return validateLineup(club.value, lineup.value)
  })

  // СОХРАНЯЕТ ОБНОВЛЁННЫЙ СОСТАВ В ОСНОВНОМ ХРАНИЛИЩЕ ИГРЫ
  const saveLineup = (nextLineup: ClubLineup): void => {
    const game = gameStore.game
    if (!game) {
      return
    }
    gameStore.updateLineup(game.selectedClubId, nextLineup)
  }

  // МЕНЯЕТ СХЕМУ И АВТОМАТИЧЕСКИ ПЕРЕРАСПРЕДЕЛЯЕТ ИГРОКОВ
  const setFormation = (formation: Formation): void => {
    if (!club.value || !lineup.value) {
      return
    }
    saveLineup(autoSelectLineup(club.value, formation, lineup.value.tacticalStyle))
  }

  // МЕНЯЕТ ТАКТИЧЕСКИЙ СТИЛЬ БЕЗ ПЕРЕСТРОЕНИЯ СОСТАВА
  const setTacticalStyle = (tacticalStyle: TacticalStyle): void => {
    if (!lineup.value) {
      return
    }
    saveLineup({
      ...lineup.value,
      tacticalStyle,
    })
  }

  // НАЗНАЧАЕТ ИГРОКА В СЛОТ И УДАЛЯЕТ ЕГО ИЗ ПРЕЖНЕГО МЕСТА
  const assignPlayerToSlot = (slotId: string, playerId: string | null): void => {
    if (!lineup.value) {
      return
    }

    const starters = Object.fromEntries(
      Object.entries(lineup.value.starters).map(([currentSlotId, currentPlayerId]) => [
        currentSlotId,
        currentPlayerId === playerId ? null : currentPlayerId,
      ]),
    ) as Record<string, string | null>

    starters[slotId] = playerId
    saveLineup({
      ...lineup.value,
      starters,
      substitutes: lineup.value.substitutes.filter((substituteId) => substituteId !== playerId),
    })
  }

  // ДОБАВЛЯЕТ ИЛИ УДАЛЯЕТ ИГРОКА ИЗ СПИСКА ЗАПАСНЫХ
  const toggleSubstitute = (playerId: string): void => {
    if (!lineup.value) {
      return
    }

    const starters = new Set(
      Object.values(lineup.value.starters).filter((id): id is string => typeof id === 'string'),
    )
    if (starters.has(playerId)) {
      return
    }

    const exists = lineup.value.substitutes.includes(playerId)
    const substitutes = exists
      ? lineup.value.substitutes.filter((id) => id !== playerId)
      : [...lineup.value.substitutes, playerId].slice(0, 7)

    saveLineup({
      ...lineup.value,
      substitutes,
    })
  }

  // ВСТАВЛЯЕТ ЗАПАСНОГО В НУЖНУЮ ПОЗИЦИЮ С УЧЁТОМ ЛИМИТА СКАМЕЙКИ
  const insertSubstitute = (substitutes: string[], playerId: string, index?: number): string[] => {
    const result = substitutes.filter((id) => id !== playerId)
    result.splice(index ?? result.length, 0, playerId)
    return result.slice(0, 7)
  }

  // ПЕРЕМЕЩАЕТ ИГРОКА В ОСНОВУ И КОРРЕКТНО ОБРАБАТЫВАЕТ ЗАНЯТЫЙ СЛОТ
  const movePlayerToSlot = (
    slotId: string,
    playerId: string,
    source: PlayerMoveSource,
    sourceSlotId?: string,
  ): void => {
    if (!lineup.value) {
      return
    }

    const starters = { ...lineup.value.starters }
    const targetPlayerId = starters[slotId] ?? null
    const currentStarterSlot =
      sourceSlotId ??
      Object.entries(starters).find(([, currentPlayerId]) => currentPlayerId === playerId)?.[0]
    const substituteIndex = lineup.value.substitutes.indexOf(playerId)
    let substitutes = lineup.value.substitutes.filter((id) => id !== playerId)

    if (currentStarterSlot) {
      starters[currentStarterSlot] = null
    }

    starters[slotId] = playerId

    if (targetPlayerId && targetPlayerId !== playerId) {
      if (currentStarterSlot) {
        starters[currentStarterSlot] = targetPlayerId
      } else if (source === 'substitute') {
        substitutes = insertSubstitute(
          substitutes,
          targetPlayerId,
          substituteIndex === -1 ? undefined : substituteIndex,
        )
      }
    }

    saveLineup({
      ...lineup.value,
      starters,
      substitutes,
    })
  }

  // МЕНЯЕТ МЕСТАМИ ИГРОКА СКАМЕЙКИ И РЕЗЕРВИСТА
  const swapSubstituteWithReserve = (substituteId: string, reserveId: string): void => {
    if (!lineup.value) {
      return
    }

    const substituteIndex = lineup.value.substitutes.indexOf(substituteId)
    if (substituteIndex === -1) {
      return
    }

    const substitutes = [...lineup.value.substitutes]
    substitutes[substituteIndex] = reserveId

    saveLineup({
      ...lineup.value,
      substitutes,
    })
  }

  // ПЕРЕМЕЩАЕТ ИГРОКА ИЗ ОСНОВЫ ИЛИ РЕЗЕРВА НА СКАМЕЙКУ
  const movePlayerToSubstitutes = (playerId: string): void => {
    if (!lineup.value) {
      return
    }

    const starters = Object.fromEntries(
      Object.entries(lineup.value.starters).map(([slotId, currentPlayerId]) => [
        slotId,
        currentPlayerId === playerId ? null : currentPlayerId,
      ]),
    ) as Record<string, string | null>

    const substitutes = lineup.value.substitutes.includes(playerId)
      ? lineup.value.substitutes
      : [...lineup.value.substitutes, playerId].slice(0, 7)

    saveLineup({
      ...lineup.value,
      starters,
      substitutes,
    })
  }

  // УБИРАЕТ ИГРОКА ИЗ ОСНОВЫ И СКАМЕЙКИ В РЕЗЕРВ
  const movePlayerToReserve = (playerId: string): void => {
    if (!lineup.value) {
      return
    }

    const starters = Object.fromEntries(
      Object.entries(lineup.value.starters).map(([slotId, currentPlayerId]) => [
        slotId,
        currentPlayerId === playerId ? null : currentPlayerId,
      ]),
    ) as Record<string, string | null>

    saveLineup({
      ...lineup.value,
      starters,
      substitutes: lineup.value.substitutes.filter((id) => id !== playerId),
    })
  }

  // ВОССТАНАВЛИВАЕТ ОПТИМАЛЬНЫЙ АВТОМАТИЧЕСКИЙ СОСТАВ
  const resetLineup = (): void => {
    if (!club.value) {
      return
    }
    const current = lineup.value ?? createEmptyLineup()
    saveLineup(autoSelectLineup(club.value, current.formation, current.tacticalStyle))
  }

  return {
    club,
    lineup,
    slots,
    validation,
    formations,
    tacticalStyles,

    setFormation,
    setTacticalStyle,
    assignPlayerToSlot,
    movePlayerToSlot,
    toggleSubstitute,
    swapSubstituteWithReserve,
    movePlayerToSubstitutes,
    movePlayerToReserve,
    resetLineup,
  }
})

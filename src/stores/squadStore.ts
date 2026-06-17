import { defineStore } from 'pinia'
import { computed } from 'vue'
import { autoSelectLineup, createEmptyLineup, formations, getFormationSlots, tacticalStyles, validateLineup } from '@/domain/season/squadSelectionService'
import { useGameStore } from '@/stores/gameStore'
import type { ClubLineup, Formation, FormationSlot, TacticalStyle } from '@/types/football'

export const useSquadStore = defineStore('squad', () => {
  const gameStore = useGameStore()

  const club = computed(() => gameStore.selectedClub)

  const lineup = computed<ClubLineup | undefined>(() => {
    const game = gameStore.game
    if (!game) {
      return undefined
    }
    return game.lineups[game.selectedClubId]
  })

  const slots = computed<FormationSlot[]>(() => (lineup.value ? getFormationSlots(lineup.value.formation) : []))

  const validation = computed(() => {
    if (!club.value || !lineup.value) {
      return { valid: false, errors: ['Клуб не выбран.'] }
    }
    return validateLineup(club.value, lineup.value)
  })

  const saveLineup = (nextLineup: ClubLineup): void => {
    const game = gameStore.game
    if (!game) {
      return
    }
    gameStore.updateLineup(game.selectedClubId, nextLineup)
  }

  const setFormation = (formation: Formation): void => {
    if (!club.value || !lineup.value) {
      return
    }
    saveLineup(autoSelectLineup(club.value, formation, lineup.value.tacticalStyle))
  }

  const setTacticalStyle = (tacticalStyle: TacticalStyle): void => {
    if (!lineup.value) {
      return
    }
    saveLineup({
      ...lineup.value,
      tacticalStyle,
    })
  }

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

  const toggleSubstitute = (playerId: string): void => {
    if (!lineup.value) {
      return
    }

    const starters = new Set(Object.values(lineup.value.starters).filter((id): id is string => typeof id === 'string'))
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
    toggleSubstitute,
    resetLineup,
  }
})

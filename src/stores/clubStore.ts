import { defineStore } from 'pinia'
import { computed } from 'vue'
import { divisionNames } from '@/config/gameConfig'
import { useGameStore } from '@/stores/gameStore'
import type { Club } from '@/types/football'

export const useClubStore = defineStore('clubs', () => {
  const gameStore = useGameStore()

  const clubs = computed<Club[]>(() => gameStore.game?.clubs ?? [])

  const divisions = computed<Record<number, Club[]>>(() => {
    return clubs.value.reduce<Record<number, Club[]>>((result, club) => {
      result[club.divisionId] = [...(result[club.divisionId] ?? []), club]
      return result
    }, {})
  })

  const getClubById = (clubId: string): Club | undefined => clubs.value.find((club) => club.id === clubId)

  const getDivisionName = (divisionId: number): string => divisionNames[divisionId] ?? `Дивизион ${divisionId}`

  return {
    clubs,
    divisions,
    getClubById,
    getDivisionName,
  }
})

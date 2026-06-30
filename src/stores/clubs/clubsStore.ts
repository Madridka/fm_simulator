import { defineStore } from 'pinia'
import { computed } from 'vue'
import { getClubCompetitionId, getCompetitionName } from '@/domain/competition/competitionIdentity'
import { useGameStore } from '@/stores/game/gameStore'
import type { Club } from '@/types/football'

// ПРЕДОСТАВЛЯЕТ ПОИСК И ГРУППИРОВКУ КЛУБОВ ТЕКУЩЕЙ КАРЬЕРЫ
export const useClubStore = defineStore('clubs', () => {
  const gameStore = useGameStore()

  // ВОЗВРАЩАЕТ КЛУБЫ АКТИВНОГО ЧЕМПИОНАТА
  const clubs = computed<Club[]>(() => gameStore.game?.clubs ?? [])

  // ГРУППИРУЕТ КЛУБЫ ПО УРОВНЮ ДИВИЗИОНА
  const divisions = computed<Record<number, Club[]>>(() => {
    return clubs.value.reduce<Record<number, Club[]>>((result, club) => {
      result[club.divisionId] = [...(result[club.divisionId] ?? []), club]
      return result
    }, {})
  })

  // ГРУППИРУЕТ КЛУБЫ ПО КОНКРЕТНОЙ ЛИГЕ ИЛИ ГРУППЕ
  const competitions = computed<Record<string, Club[]>>(() => {
    return clubs.value.reduce<Record<string, Club[]>>((result, club) => {
      const competitionId = getClubCompetitionId(club)
      result[competitionId] = [...(result[competitionId] ?? []), club]
      return result
    }, {})
  })

  // НАХОДИТ КЛУБ ПО ИДЕНТИФИКАТОРУ
  const getClubById = (clubId: string): Club | undefined =>
    clubs.value.find((club) => club.id === clubId)

  // ВОЗВРАЩАЕТ ЛОКАЛИЗОВАННОЕ НАЗВАНИЕ ДИВИЗИОНА
  const getDivisionName = (divisionId: number): string =>
    gameStore.championship?.divisionNames[divisionId] ?? `Дивизион ${divisionId}`

  // ВОЗВРАЩАЕТ НАЗВАНИЕ ЛИГИ ИЛИ ГРУППЫ КЛУБА
  const getClubCompetitionName = (club: Club): string =>
    getCompetitionName(gameStore.championship, getClubCompetitionId(club))

  return {
    clubs,
    divisions,
    competitions,
    getClubById,
    getDivisionName,
    getClubCompetitionName,
  }
})

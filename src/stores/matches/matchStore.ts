import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useGameStore } from '@/stores/game/gameStore'
import type { Club, Match } from '@/types/football'

export const useMatchStore = defineStore('matches', () => {
  const gameStore = useGameStore()
  const clubStore = useClubStore()

  const nextMatch = computed<Match | undefined>(() => gameStore.nextMatch)

  const userMatches = computed<Match[]>(() => {
    const game = gameStore.game
    if (!game) {
      return []
    }

    return game.matches.filter(
      (match) =>
        match.homeClubId === game.selectedClubId || match.awayClubId === game.selectedClubId,
    )
  })

  const upcomingMatches = computed<Match[]>(() =>
    userMatches.value
      .filter((match) => match.status === 'scheduled')
      .sort((left, right) => left.order - right.order)
      .slice(0, 6),
  )

  const recentResults = computed<Match[]>(() =>
    userMatches.value
      .filter((match) => match.status === 'played')
      .sort((left, right) => right.order - left.order)
      .slice(0, 6),
  )

  const getOpponent = (match: Match): Club | undefined => {
    const game = gameStore.game
    if (!game) {
      return undefined
    }

    const opponentId = match.homeClubId === game.selectedClubId ? match.awayClubId : match.homeClubId
    return clubStore.getClubById(opponentId)
  }

  const nextOpponent = computed<Club | undefined>(() =>
    nextMatch.value ? getOpponent(nextMatch.value) : undefined,
  )

  const openMatch = (match: Match): void => {
    gameStore.openMatch(match.id)
  }

  return {
    nextMatch,
    nextOpponent,
    userMatches,
    upcomingMatches,
    recentResults,
    getOpponent,
    openMatch,
  }
})

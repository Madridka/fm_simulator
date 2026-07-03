import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCareerContext } from '@/composables/useCareerContext'
import { adaptWorldCupMatch } from '@/services/worldCup2026/matchAdapter'
import { useGameStore } from '@/stores/game/gameStore'
import { useClubStore } from '@/stores/clubs/clubsStore'
import type { Club, Match } from '@/types/football'
import { matchTeamToClub, nationalTeamToMatchTeam } from '@/types/matchTeam'

export const useMatchStore = defineStore('matches', () => {
  const gameStore = useGameStore()
  const clubStore = useClubStore()
  const router = useRouter()
  const { isWorldCupMode, selectedTeamId, worldCupStore, paths } = useCareerContext()

  const nextMatch = computed<Match | undefined>(() => {
    if (isWorldCupMode.value) {
      const match = worldCupStore.nextMatch
      return match ? adaptWorldCupMatch(match) : undefined
    }
    return gameStore.nextMatch
  })

  const userMatches = computed<Match[]>(() => {
    if (isWorldCupMode.value) {
      const state = worldCupStore.state
      const teamId = selectedTeamId.value
      if (!state || !teamId) {
        return []
      }
      return state.matches
        .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
        .map(adaptWorldCupMatch)
    }

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
    const teamId = selectedTeamId.value
    if (!teamId) {
      return undefined
    }

    if (isWorldCupMode.value) {
      const opponentId = match.homeClubId === teamId ? match.awayClubId : match.homeClubId
      const team = worldCupStore.state?.teams.find((candidate) => candidate.id === opponentId)
      return team ? matchTeamToClub(nationalTeamToMatchTeam(team)) : undefined
    }

    const opponentId = match.homeClubId === teamId ? match.awayClubId : match.homeClubId
    return clubStore.getClubById(opponentId)
  }

  const nextOpponent = computed<Club | undefined>(() =>
    nextMatch.value ? getOpponent(nextMatch.value) : undefined,
  )

  const openMatch = (match: Match): void => {
    if (isWorldCupMode.value) {
      if (worldCupStore.prepareUserMatch()) {
        void router.push({ name: 'world-cup-match' })
      }
      return
    }
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
    matchPath: computed(() => paths.value.match),
    calendarPath: computed(() => paths.value.calendar),
  }
})

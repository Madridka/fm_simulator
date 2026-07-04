import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { flagEmoji } from '@/data/wc26/nationalTeam'
import { useGameStore } from '@/stores/game/gameStore'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'
import type { Club, ClubLineup, PlayerStats } from '@/types/football'
import { matchTeamToClub, nationalTeamToMatchTeam } from '@/types/matchTeam'

export interface CareerPaths {
  dashboard: string
  squad: string
  squadRegistration: string
  calendar: string
  fixtures: string
  groups: string
  bracket: string
  match: string
}

const clubPaths: CareerPaths = {
  dashboard: '/dashboard',
  squad: '/squad',
  squadRegistration: '/academy',
  calendar: '/calendar',
  fixtures: '/calendar',
  groups: '/league',
  bracket: '/cup',
  match: '/match',
}

const worldCupPaths: CareerPaths = {
  dashboard: '/world-cup-2026/dashboard',
  squad: '/world-cup-2026/squad',
  squadRegistration: '/world-cup-2026/squad-registration',
  calendar: '/world-cup-2026/calendar',
  fixtures: '/world-cup-2026/fixtures',
  groups: '/world-cup-2026/groups',
  bracket: '/world-cup-2026/bracket',
  match: '/world-cup-2026/match',
}

const preGameRouteNames = new Set([
  'home',
  'select-mode',
  'select-club',
  'world-cup-select-team',
  'not-found',
])

export const useCareerContext = () => {
  const route = useRoute()
  const gameStore = useGameStore()
  const worldCupStore = useWorldCup2026Store()

  const isWorldCupMode = computed(() => {
    const routeName = String(route.name ?? '')
    return (
      !preGameRouteNames.has(routeName) &&
      routeName.startsWith('world-cup-') &&
      Boolean(worldCupStore.state)
    )
  })

  const isActiveSession = computed(() => {
    const routeName = String(route.name ?? '')
    if (preGameRouteNames.has(routeName)) {
      return false
    }
    return routeName.startsWith('world-cup-')
      ? Boolean(worldCupStore.state)
      : Boolean(gameStore.game)
  })

  const paths = computed(() => (isWorldCupMode.value ? worldCupPaths : clubPaths))

  const selectedTeamId = computed(() => {
    if (isWorldCupMode.value) {
      return worldCupStore.state?.selectedTeamId
    }
    return gameStore.game?.selectedClubId
  })

  const selectedClub = computed<Club | undefined>(() => {
    if (isWorldCupMode.value && worldCupStore.selectedTeam) {
      return matchTeamToClub(nationalTeamToMatchTeam(worldCupStore.selectedTeam))
    }
    return gameStore.selectedClub
  })

  const teamFlag = computed(() => {
    if (!isWorldCupMode.value || !worldCupStore.selectedTeam) {
      return undefined
    }
    if (worldCupStore.selectedTeam.flagCode) {
      return flagEmoji(worldCupStore.selectedTeam.flagCode)
    }
    return undefined
  })

  const teamFlagUrl = computed(() =>
    isWorldCupMode.value ? worldCupStore.selectedTeam?.flag : undefined,
  )

  const lineup = computed<ClubLineup | undefined>(() => {
    if (isWorldCupMode.value && worldCupStore.state && selectedTeamId.value) {
      return worldCupStore.state.lineups[selectedTeamId.value]
    }
    const game = gameStore.game
    if (!game) {
      return undefined
    }
    return game.lineups[game.selectedClubId]
  })

  const playerStats = computed<Record<string, PlayerStats>>(() => {
    if (isWorldCupMode.value) {
      return worldCupStore.state?.playerStats ?? {}
    }
    return gameStore.game?.playerStats ?? {}
  })

  const updateLineup = (teamId: string, nextLineup: ClubLineup): void => {
    if (isWorldCupMode.value) {
      worldCupStore.updateLineup(teamId, nextLineup)
      return
    }
    gameStore.updateLineup(teamId, nextLineup)
  }

  const topBarSeasonLabel = computed(() => {
    if (!isWorldCupMode.value) {
      return gameStore.game?.season
    }
    const wcState = worldCupStore.state
    if (!wcState) {
      return undefined
    }
    if (wcState.status === 'group-stage') {
      return wcState.currentMatchday
    }
    return undefined
  })

  return {
    isWorldCupMode,
    isActiveSession,
    paths,
    selectedTeamId,
    selectedClub,
    teamFlag,
    teamFlagUrl,
    lineup,
    playerStats,
    updateLineup,
    topBarSeasonLabel,
    gameStore,
    worldCupStore,
  }
}

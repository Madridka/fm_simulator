import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useGameStore } from '@/stores/game/gameStore'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    beforeEnter: () => {
      const gameStore = useGameStore()
      const worldCupStore = useWorldCup2026Store()

      if (gameStore.game) {
        return { name: 'dashboard' }
      }
      if (worldCupStore.state) {
        return { name: 'world-cup-overview' }
      }
      return { name: 'select-mode' }
    },
    component: () => import('@/views/MainLayout.vue'),
    children: [
      {
        path: 'select-mode',
        name: 'select-mode',
        component: () => import('@/views/gameMode/SelectGameModeView.vue'),
      },
      {
        path: 'game-mode',
        redirect: { name: 'select-mode' },
      },
      {
        path: 'select-club',
        name: 'select-club',
        component: () => import('@/views/SelectClubView.vue'),
      },
      {
        path: 'world-cup-2026/select-team',
        name: 'world-cup-select-team',
        component: () => import('@/views/worldCup2026/WorldCupTeamSelectionView.vue'),
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
      },
      {
        path: 'squad',
        name: 'squad',
        component: () => import('@/views/SquadView.vue'),
      },
      {
        path: 'academy',
        name: 'academy',
        component: () => import('@/views/AcademyView.vue'),
      },
      {
        path: 'competitions',
        redirect: { name: 'league' },
      },
      {
        path: 'league',
        name: 'league',
        component: () => import('@/views/LeagueView.vue'),
      },
      {
        path: 'cup',
        name: 'cup',
        component: () => import('@/views/CupView.vue'),
      },
      {
        path: 'calendar',
        name: 'calendar',
        component: () => import('@/views/CalendarView.vue'),
      },
      {
        path: 'match',
        name: 'match',
        component: () => import('@/views/MatchView.vue'),
      },
      {
        path: 'transfers',
        name: 'transfers',
        component: () => import('@/views/TransfersView.vue'),
      },
    ],
  },
  {
    path: '/world-cup-2026',
    component: () => import('@/views/worldCup2026/WorldCupLayout.vue'),
    beforeEnter: () => {
      const worldCupStore = useWorldCup2026Store()
      if (!worldCupStore.state) {
        return { name: 'world-cup-select-team' }
      }
      return true
    },
    children: [
      {
        path: '',
        name: 'world-cup-overview',
        component: () => import('@/views/worldCup2026/WorldCupOverviewView.vue'),
      },
      {
        path: 'groups',
        name: 'world-cup-groups',
        component: () => import('@/views/worldCup2026/WorldCupGroupsView.vue'),
      },
      {
        path: 'fixtures',
        name: 'world-cup-fixtures',
        component: () => import('@/views/worldCup2026/WorldCupFixturesView.vue'),
      },
      {
        path: 'bracket',
        name: 'world-cup-bracket',
        component: () => import('@/views/worldCup2026/WorldCupBracketView.vue'),
      },
    ],
  },
  {
    path: '/world-cup-26',
    redirect: '/world-cup-2026/select-team',
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const preGameRoutes = new Set([
  'home',
  'select-mode',
  'select-club',
  'world-cup-select-team',
  'not-found',
])

const worldCupRoutes = new Set([
  'world-cup-overview',
  'world-cup-groups',
  'world-cup-fixtures',
  'world-cup-bracket',
])

router.beforeEach((to) => {
  const gameStore = useGameStore()
  const worldCupStore = useWorldCup2026Store()

  if (worldCupRoutes.has(String(to.name))) {
    return worldCupStore.state ? true : { name: 'world-cup-select-team' }
  }

  if (!gameStore.game && !preGameRoutes.has(String(to.name))) {
    if (worldCupStore.state) {
      return { name: 'world-cup-overview' }
    }
    return { name: 'select-mode' }
  }

  return true
})

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useGameStore } from '@/stores/game/gameStore'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    beforeEnter: (to) => {
      if (to.path !== '/') {
        return true
      }

      const gameStore = useGameStore()
      return gameStore.game ? { name: 'dashboard' } : { name: 'select-club' }
    },
    component: () => import('@/views/MainLayout.vue'),
    children: [
      {
        path: 'select-club',
        name: 'select-club',
        component: () => import('@/views/SelectClubView.vue'),
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
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  const gameStore = useGameStore()
  if (
    !gameStore.game &&
    to.name !== 'home' &&
    to.name !== 'select-club' &&
    to.name !== 'not-found'
  ) {
    return { name: 'select-club' }
  }

  return true
})

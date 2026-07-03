import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import { useGameStore } from '@/stores/game/gameStore'

import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'



const routes: RouteRecordRaw[] = [

  {

    path: '/',

    name: 'home',

    beforeEnter: (to) => {

      if (to.name !== 'home') {

        return true

      }



      const gameStore = useGameStore()

      const worldCupStore = useWorldCup2026Store()



      if (gameStore.game) {

        return { name: 'dashboard' }

      }

      if (worldCupStore.state) {

        return { name: 'world-cup-dashboard' }

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

        path: 'world-cup-2026/dashboard',

        name: 'world-cup-dashboard',

        component: () => import('@/views/DashboardView.vue'),

      },

      {

        path: 'world-cup-2026',

        redirect: { name: 'world-cup-dashboard' },

      },

      {

        path: 'world-cup-2026/squad',

        name: 'world-cup-squad',

        component: () => import('@/views/SquadView.vue'),

      },

      {

        path: 'world-cup-2026/squad-registration',

        name: 'world-cup-squad-registration',

        component: () => import('@/views/worldCup2026/WorldCupSquadRegistrationView.vue'),

      },

      {

        path: 'world-cup-2026/calendar',

        name: 'world-cup-calendar',

        component: () => import('@/views/CalendarView.vue'),

      },

      {

        path: 'world-cup-2026/groups',

        name: 'world-cup-groups',

        component: () => import('@/views/worldCup2026/WorldCupGroupsView.vue'),

      },

      {

        path: 'world-cup-2026/fixtures',

        name: 'world-cup-fixtures',

        component: () => import('@/views/worldCup2026/WorldCupFixturesView.vue'),

      },

      {

        path: 'world-cup-2026/bracket',

        name: 'world-cup-bracket',

        component: () => import('@/views/worldCup2026/WorldCupBracketView.vue'),

      },

      {

        path: 'world-cup-2026/match',

        name: 'world-cup-match',

        component: () => import('@/views/MatchView.vue'),

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

  'world-cup-dashboard',

  'world-cup-squad',

  'world-cup-squad-registration',

  'world-cup-calendar',

  'world-cup-groups',

  'world-cup-fixtures',

  'world-cup-bracket',

  'world-cup-match',

])



router.beforeEach((to) => {

  const gameStore = useGameStore()

  const worldCupStore = useWorldCup2026Store()



  if (worldCupRoutes.has(String(to.name))) {

    if (!worldCupStore.state) {

      return { name: 'world-cup-select-team' }

    }

    if (to.name === 'world-cup-match' && !worldCupStore.preparedMatchContext) {

      return { name: 'world-cup-dashboard' }

    }

    return true

  }



  if (!gameStore.game && !preGameRoutes.has(String(to.name))) {

    if (worldCupStore.state) {

      return { name: 'world-cup-dashboard' }

    }

    return { name: 'select-mode' }

  }



  return true

})


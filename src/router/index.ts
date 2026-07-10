import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { isAdminAuthenticated } from '@/domain/admin/adminAuth'
import { useGameStore } from '@/stores/game/gameStore'

// ОПИСЫВАЕТ ОСНОВНОЙ МАКЕТ, ЭКРАНЫ КАРЬЕРЫ И СТРАНИЦУ 404
const routes: RouteRecordRaw[] = [
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/views/admin/AdminLoginView.vue'),
    beforeEnter: () => (isAdminAuthenticated() ? { name: 'admin-simulation' } : true),
  },
  {
    path: '/admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    beforeEnter: (to) =>
      isAdminAuthenticated() ? true : { name: 'admin-login', query: { redirect: to.fullPath } },
    children: [
      {
        path: '',
        redirect: { name: 'admin-simulation' },
      },
      {
        path: 'simulation',
        name: 'admin-simulation',
        component: () => import('@/views/admin/AdminSimulationView.vue'),
      },
    ],
  },
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
        path: 'tasks',
        name: 'tasks',
        component: () => import('@/views/TasksView.vue'),
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

// СОЗДАЁТ HTML5-МАРШРУТИЗАТОР С УЧЁТОМ БАЗОВОГО ПУТИ СБОРКИ
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// НЕ ДОПУСКАЕТ НА ЭКРАНЫ КАРЬЕРЫ ДО ВЫБОРА КЛУБА
router.beforeEach((to) => {
  if (to.path.startsWith('/admin')) return true

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

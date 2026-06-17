import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { gameSaveRepository } from '@/repositories/gameSaveRepository'
import CalendarView from '@/views/CalendarView.vue'
import CompetitionsView from '@/views/CompetitionsView.vue'
import DashboardView from '@/views/DashboardView.vue'
import MatchView from '@/views/MatchView.vue'
import SelectClubView from '@/views/SelectClubView.vue'
import SquadView from '@/views/SquadView.vue'
import TransfersView from '@/views/TransfersView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => (gameSaveRepository.load() ? '/dashboard' : '/select-club'),
  },
  {
    path: '/select-club',
    name: 'select-club',
    component: SelectClubView,
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
  },
  {
    path: '/squad',
    name: 'squad',
    component: SquadView,
  },
  {
    path: '/competitions',
    name: 'competitions',
    component: CompetitionsView,
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: CalendarView,
  },
  {
    path: '/match',
    name: 'match',
    component: MatchView,
  },
  {
    path: '/transfers',
    name: 'transfers',
    component: TransfersView,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: () => (gameSaveRepository.load() ? '/dashboard' : '/select-club'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const hasSave = Boolean(gameSaveRepository.load())
  if (!hasSave && to.name !== 'select-club') {
    return { name: 'select-club' }
  }
  return true
})

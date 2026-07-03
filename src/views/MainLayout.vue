<script setup lang="ts">
import { computed } from 'vue'
import Drawer from 'primevue/drawer'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { flagEmoji } from '@/data/nationalTeams/worldCup2026/teams'
import { useAppStore } from '@/stores/app/app'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import { useToastStore } from '@/stores/ui/toastStore'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'

import MenuNav from '@/components/layout/MenuNav.vue'
import TopBar from '@/components/layout/TopBar.vue'

// ГЛОБАЛЬНЫЕ ХРАНИЛИЩА И МАРШРУТИЗАЦИЯ ОСНОВНОЙ ОБОЛОЧКИ
const appStore = useAppStore()
const gameStore = useGameStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()
const worldCupStore = useWorldCup2026Store()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const worldCupRouteNames = new Set([
  'world-cup-overview',
  'world-cup-groups',
  'world-cup-fixtures',
  'world-cup-bracket',
  'world-cup-match',
])
const isWorldCupSection = computed(() => worldCupRouteNames.has(String(route.name)))
const selectedWorldCupTeam = computed(() => worldCupStore.selectedTeam)
const worldCupNavItems = [
  { name: 'world-cup-overview', labelKey: 'worldCup2026.nav.overview' },
  { name: 'world-cup-groups', labelKey: 'worldCup2026.nav.groups' },
  { name: 'world-cup-fixtures', labelKey: 'worldCup2026.nav.fixtures' },
  { name: 'world-cup-bracket', labelKey: 'worldCup2026.nav.bracket' },
]

// ОПРЕДЕЛЯЕТ ЦВЕТОВОЕ ОФОРМЛЕНИЕ УВЕДОМЛЕНИЯ
const toastClass = computed((): string => {
  if (toastStore.severity === 'success') {
    return 'bg-emerald-950 text-emerald-50'
  }
  if (toastStore.severity === 'warning') {
    return 'bg-amber-500 text-amber-950'
  }
  return 'bg-slate-950 text-white'
})

// ОТКРЫВАЕТ СЛЕДУЮЩИЙ ДОСТУПНЫЙ МАТЧ
const openNextMatch = (): void => {
  if (!matchStore.nextMatch) {
    return
  }

  gameStore.openMatch(matchStore.nextMatch.id)
  void router.push('/match')
}

// СБРАСЫВАЕТ ТЕКУЩУЮ ИГРУ И ВОЗВРАЩАЕТ К ВЫБОРУ КЛУБА
const resetGame = (): void => {
  appStore.closeNavigation()
  gameStore.resetGame()
  void router.push('/select-mode')
}

const resetWorldCup = (): void => {
  worldCupStore.resetTournament()
  void router.push({ name: 'select-mode' })
}
</script>

<template>
  <!-- ОСНОВНАЯ ОБОЛОЧКА ПРИЛОЖЕНИЯ -->
  <div
    class="min-h-screen min-w-[320px] bg-[#eef2f0] font-sans text-slate-900 xl:h-screen xl:overflow-hidden"
  >
    <template v-if="isWorldCupSection">
      <div class="flex min-h-screen flex-col xl:h-screen xl:min-h-0">
        <header class="shrink-0 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-md">
          <div
            class="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6"
          >
            <div class="flex items-center gap-3">
              <span v-if="selectedWorldCupTeam" class="text-3xl">
                {{ flagEmoji(selectedWorldCupTeam.flagCode) }}
              </span>
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700">
                  {{ t('worldCup2026.overview.title') }}
                </p>
                <h1 class="text-lg font-black uppercase text-slate-950 sm:text-xl">
                  {{ selectedWorldCupTeam?.name }}
                </h1>
              </div>
            </div>
            <button
              type="button"
              class="text-sm font-bold text-slate-500 transition hover:text-slate-950"
              @click="resetWorldCup"
            >
              {{ t('worldCup2026.overview.mainMenu') }}
            </button>
          </div>

          <nav class="mx-auto flex w-full max-w-[1600px] gap-1 overflow-x-auto px-4 pb-3 sm:px-6">
            <RouterLink
              v-for="item in worldCupNavItems"
              :key="item.name"
              :to="{ name: item.name }"
              class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition"
              :class="
                route.name === item.name
                  ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
              "
            >
              {{ t(item.labelKey) }}
            </RouterLink>
          </nav>
        </header>

        <main class="mx-auto w-full max-w-[1600px] flex-1 overflow-auto p-4 sm:p-6">
          <RouterView />
        </main>
      </div>
    </template>

    <template v-else-if="gameStore.game">
      <!-- ДЕСКТОПНАЯ БОКОВАЯ НАВИГАЦИЯ -->
      <aside
        class="fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-white/10 shadow-[14px_0_40px_rgba(4,18,14,0.18)] md:block"
      >
        <MenuNav
          :active-path="route.path"
          :items="appStore.navItems"
          :selected-club="gameStore.selectedClub"
          :settings-open="appStore.settingsOpen"
          @close-settings="appStore.closeSettings"
          @toggle-settings="appStore.toggleSettings"
          @reset-game="resetGame"
          @navigate="appStore.closeNavigation"
        />
      </aside>

      <!-- МОБИЛЬНАЯ ВЫДВИЖНАЯ НАВИГАЦИЯ -->
      <Drawer
        v-model:visible="appStore.drawerVisible"
        position="left"
        class="!w-[280px] md:!hidden"
      >
        <template #container>
          <MenuNav
            :active-path="route.path"
            :items="appStore.navItems"
            :selected-club="gameStore.selectedClub"
            :settings-open="appStore.settingsOpen"
            mode="drawer"
            @close-settings="appStore.closeSettings"
            @toggle-settings="appStore.toggleSettings"
            @reset-game="resetGame"
            @navigate="appStore.closeNavigation"
          />
        </template>
      </Drawer>

      <!-- РАБОЧАЯ ОБЛАСТЬ ПРИЛОЖЕНИЯ -->
      <div class="flex min-h-screen flex-col md:pl-[228px] xl:h-screen xl:min-h-0">
        <TopBar
          :next-match="route.name === 'match' ? undefined : matchStore.nextMatch"
          :next-opponent="route.name === 'match' ? undefined : matchStore.nextOpponent"
          :season="gameStore.game.season"
          :selected-club="gameStore.selectedClub"
          @open-menu="appStore.openDrawer"
          @open-next-match="openNextMatch"
        />

        <!-- СОДЕРЖИМОЕ ТЕКУЩЕГО РАЗДЕЛА -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8 xl:min-h-0 xl:overflow-hidden">
          <RouterView />
        </main>
      </div>

      <!-- ГЛОБАЛЬНОЕ УВЕДОМЛЕНИЕ -->
      <div
        v-if="toastStore.message"
        class="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(15,23,42,0.28)]"
        :class="toastClass"
        role="status"
      >
        {{ toastStore.message }}
      </div>
    </template>

    <!-- ЭКРАН ДО НАЧАЛА ИГРЫ -->
    <main
      v-else
      class="h-screen overflow-auto bg-[#0a0e14] p-4 sm:p-6 xl:overflow-hidden"
    >
      <RouterView />
    </main>
  </div>
</template>

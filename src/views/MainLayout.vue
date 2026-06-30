<script setup lang="ts">
import { computed } from 'vue'
import Drawer from 'primevue/drawer'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app/app'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import { useToastStore } from '@/stores/ui/toastStore'

import MenuNav from '@/components/layout/MenuNav.vue'
import TopBar from '@/components/layout/TopBar.vue'

// ГЛОБАЛЬНЫЕ ХРАНИЛИЩА И МАРШРУТИЗАЦИЯ ОСНОВНОЙ ОБОЛОЧКИ
const appStore = useAppStore()
const gameStore = useGameStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()
const route = useRoute()
const router = useRouter()

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
  void router.push('/select-club')
}
</script>

<template>
  <!-- ОСНОВНАЯ ОБОЛОЧКА ПРИЛОЖЕНИЯ -->
  <div
    class="min-h-screen min-w-[320px] bg-[#eef2f0] font-sans text-slate-900 xl:h-screen xl:overflow-hidden"
  >
    <template v-if="gameStore.game">
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
    <main v-else class="h-screen xl:overflow-hidden p-4 sm:p-6">
      <RouterView />
    </main>
  </div>
</template>

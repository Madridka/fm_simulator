<script setup lang="ts">
import { computed, ref, type Ref } from 'vue'
import Drawer from 'primevue/drawer'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import { useToastStore } from '@/stores/ui/toastStore'

import MenuNav from '@/components/layout/MenuNav.vue'
import TopBar from '@/components/layout/TopBar.vue'
import type { AppNavItem } from '@/components/layout/types'

const gameStore = useGameStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const settingsOpen: Ref<boolean> = ref(false)
const drawerVisible: Ref<boolean> = ref(false)

const navItems = computed<AppNavItem[]>(() => [
  { to: '/dashboard', label: t('nav.overview'), icon: 'home' },
  { divider: true },
  { to: '/squad', label: t('nav.squad'), icon: 'users' },
  { to: '/transfers', label: t('nav.transfers'), icon: 'swap' },
  { divider: true },
  { to: '/calendar', label: t('nav.calendar'), icon: 'calendar' },
  { divider: true },
  { to: '/league', label: t('nav.league'), icon: 'table' },
  { to: '/cup', label: t('nav.cup'), icon: 'trophy' },
])

const toastClass = computed((): string => {
  if (toastStore.severity === 'success') {
    return 'bg-emerald-950 text-emerald-50'
  }
  if (toastStore.severity === 'warning') {
    return 'bg-amber-500 text-amber-950'
  }
  return 'bg-slate-950 text-white'
})

const openNextMatch = (): void => {
  if (!matchStore.nextMatch) {
    return
  }

  gameStore.openMatch(matchStore.nextMatch.id)
  void router.push('/match')
}

const closeNavigation = (): void => {
  settingsOpen.value = false
  drawerVisible.value = false
}

const resetGame = (): void => {
  closeNavigation()
  gameStore.resetGame()
  void router.push('/select-club')
}
</script>

<template>
  <div class="h-screen min-w-[320px] overflow-hidden bg-[#eef2f0] font-sans text-slate-900">
    <template v-if="gameStore.game">
      <aside
        class="fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-white/10 shadow-[14px_0_40px_rgba(4,18,14,0.18)] md:block"
      >
        <MenuNav
          :active-path="route.path"
          :items="navItems"
          :selected-club="gameStore.selectedClub"
          :settings-open="settingsOpen"
          @close-settings="settingsOpen = false"
          @toggle-settings="settingsOpen = !settingsOpen"
          @reset-game="resetGame"
          @navigate="closeNavigation"
        />
      </aside>

      <Drawer v-model:visible="drawerVisible" position="left" class="!w-[280px] md:!hidden">
        <template #container>
          <MenuNav
            :active-path="route.path"
            :items="navItems"
            :selected-club="gameStore.selectedClub"
            :settings-open="settingsOpen"
            mode="drawer"
            @close-settings="settingsOpen = false"
            @toggle-settings="settingsOpen = !settingsOpen"
            @reset-game="resetGame"
            @navigate="closeNavigation"
          />
        </template>
      </Drawer>

      <div class="flex h-screen flex-col md:pl-[228px]">
        <TopBar
          :next-match="matchStore.nextMatch"
          :next-opponent="matchStore.nextOpponent"
          :season="gameStore.game.season"
          :selected-club="gameStore.selectedClub"
          @open-menu="drawerVisible = true"
          @open-next-match="openNextMatch"
        />

        <main class="min-h-0 flex-1 overflow-hidden p-4 sm:p-6 lg:p-8">
          <RouterView />
        </main>
      </div>

      <div
        v-if="toastStore.message"
        class="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(15,23,42,0.28)]"
        :class="toastClass"
        role="status"
      >
        {{ toastStore.message }}
      </div>
    </template>

    <main v-else class="h-screen overflow-hidden p-4 sm:p-6">
      <RouterView />
    </main>
  </div>
</template>

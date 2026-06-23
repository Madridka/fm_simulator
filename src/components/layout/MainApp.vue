<script setup lang="ts">
import { computed, Ref, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'

import SideBar from '@/components/layout/SideBar.vue'
import TopBar from '@/components/layout/TopBar.vue'
import type { AppNavItem } from '@/components/layout/types'

const gameStore = useGameStore()
const matchStore = useMatchStore()
const route = useRoute()
const router = useRouter()
const settingsOpen: Ref<boolean> = ref(false)
const { t } = useI18n()

const navItems = computed<AppNavItem[]>(() => [
  { to: '/dashboard', label: t('nav.overview'), icon: 'home' },
  { divider: true },
  { to: '/squad', label: t('nav.squad'), icon: 'users' },
  { to: '/transfers', label: t('nav.transfers'), icon: 'swap' },
  { divider: true },
  { to: '/calendar', label: t('nav.calendar'), icon: 'table' },
  { divider: true },
  { to: '/league', label: t('nav.league'), icon: 'table' },
  { to: '/cup', label: t('nav.cup'), icon: 'trophy' },
])

const openNextMatch = (): void => {
  if (!matchStore.nextMatch) {
    return
  }

  gameStore.openMatch(matchStore.nextMatch.id)
  void router.push('/match')
}

const resetGame = (): void => {
  settingsOpen.value = false
  gameStore.resetGame()
  void router.push('/select-club')
}
</script>

<template>
  <template v-if="gameStore.game">
    <SideBar
      :active-path="route.path"
      :items="navItems"
      :selected-club="gameStore.selectedClub"
      :settings-open="settingsOpen"
      @close-settings="settingsOpen = false"
      @toggle-settings="settingsOpen = !settingsOpen"
      @reset-game="resetGame"
    />

    <div class="min-h-screen md:pl-[228px]">
      <TopBar
        :active-path="route.path"
        :items="navItems"
        :next-match="matchStore.nextMatch"
        :next-opponent="matchStore.nextOpponent"
        :season="gameStore.game.season"
        :selected-club="gameStore.selectedClub"
        @open-next-match="openNextMatch"
        @reset-game="resetGame"
      />

      <main class="min-h-[calc(100dvh-86px)] p-4 sm:p-6 lg:p-8">
        <slot />
      </main>
    </div>
  </template>
</template>

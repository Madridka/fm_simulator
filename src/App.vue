<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import ClubBadge from '@/components/ClubBadge.vue'
import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()
const router = useRouter()
const settingsOpen = ref(false)

const navItems = [
  { to: '/dashboard', label: 'Обзор' },
  { to: '/squad', label: 'Состав' },
  { to: '/competitions', label: 'Турниры' },
  { to: '/calendar', label: 'Календарь' },
  { to: '/transfers', label: 'Трансферы' },
]

const hasGame = computed(() => Boolean(gameStore.game))

const reset = (): void => {
  settingsOpen.value = false
  gameStore.resetGame()
  void router.push('/select-club')
}
</script>

<template>
  <div class="app-shell min-h-screen">
    <header v-if="hasGame" class="app-header">
      <div
        class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <RouterLink
          to="/dashboard"
          class="club-home-link flex w-fit items-center gap-3 rounded-lg px-2 py-1"
          @click="settingsOpen = false"
        >
          <ClubBadge v-if="gameStore.selectedClub" :club="gameStore.selectedClub" />
          <div>
            <div class="text-sm text-white/70">Сезон {{ gameStore.game?.season }}</div>
            <div class="font-semibold text-white">{{ gameStore.selectedClub?.name }}</div>
          </div>
        </RouterLink>

        <div class="flex flex-wrap items-center gap-2">
          <nav class="flex flex-wrap items-center gap-2">
            <RouterLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="nav-link rounded-md px-3 py-2 text-sm font-medium"
              active-class="nav-link-active"
              @click="settingsOpen = false"
            >
              {{ item.label }}
            </RouterLink>
          </nav>

          <div class="relative">
            <button
              type="button"
              class="settings-button"
              aria-label="Настройки"
              :aria-expanded="settingsOpen"
              @click="settingsOpen = !settingsOpen"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
            <div v-if="settingsOpen" class="settings-menu">
              <div class="px-3 py-2 text-xs font-semibold uppercase text-slate-500">Настройки</div>
              <button type="button" class="settings-menu-item" @click="reset">Новая игра</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>

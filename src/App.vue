<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import ClubBadge from '@/components/ClubBadge.vue'
import { useGameStore } from '@/stores/gameStore'

const gameStore = useGameStore()
const router = useRouter()

const navItems = [
  { to: '/dashboard', label: 'Обзор' },
  { to: '/squad', label: 'Состав' },
  { to: '/competitions', label: 'Турниры' },
  { to: '/calendar', label: 'Календарь' },
  { to: '/transfers', label: 'Трансферы' },
]

const hasGame = computed(() => Boolean(gameStore.game))

const reset = (): void => {
  gameStore.resetGame()
  void router.push('/select-club')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header v-if="hasGame" class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex items-center gap-3">
          <ClubBadge v-if="gameStore.selectedClub" :club="gameStore.selectedClub" />
          <div>
            <div class="text-sm text-slate-500">Сезон {{ gameStore.game?.season }}</div>
            <div class="font-semibold text-slate-950">{{ gameStore.selectedClub?.name }}</div>
          </div>
        </div>
        <nav class="flex flex-wrap items-center gap-2">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            active-class="bg-slate-950 text-white hover:bg-slate-950"
          >
            {{ item.label }}
          </RouterLink>
          <Button severity="secondary" size="small" label="Новая игра" @click="reset" />
        </nav>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <RouterView />
    </main>
  </div>
</template>

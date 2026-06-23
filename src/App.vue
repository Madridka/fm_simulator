<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import AppShell from '@/components/layout/AppShell.vue'
import { useGameStore } from '@/stores/game/gameStore'

const gameStore = useGameStore()
const hasGame = computed(() => Boolean(gameStore.game))
</script>

<template>
  <div class="min-h-screen min-w-[320px] bg-[#eef2f0] font-sans text-slate-900">
    <AppShell v-if="hasGame">
      <RouterView />
    </AppShell>

    <main v-else class="min-h-screen p-4 sm:p-6">
      <RouterView />
    </main>
  </div>
</template>
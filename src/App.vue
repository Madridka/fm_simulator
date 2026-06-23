<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useGameStore } from '@/stores/game/gameStore'

import MainApp from '@/components/layout/MainApp.vue'

const gameStore = useGameStore()
const hasGame = computed((): boolean => Boolean(gameStore.game))
</script>

<template>
  <div class="min-h-screen min-w-[320px] bg-[#eef2f0] font-sans text-slate-900">
    <MainApp v-if="hasGame">
      <RouterView />
    </MainApp>

    <main v-else class="min-h-screen p-4 sm:p-6">
      <RouterView />
    </main>
  </div>
</template>

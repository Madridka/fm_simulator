<script setup lang="ts">
import { computed } from 'vue'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'
import WorldCupMatchCard from '@/components/worldCup2026/WorldCupMatchCard.vue'

const worldCupStore = useWorldCup2026Store()

const matches = computed(
  () =>
    worldCupStore.state?.matches.slice().sort((a, b) => a.order - b.order) ?? [],
)
</script>

<template>
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <WorldCupMatchCard
      v-for="match in matches"
      :key="match.id"
      :match="match"
      :get-team-name="worldCupStore.getTeamName"
      :get-team-flag="worldCupStore.getTeamFlag"
    />
  </div>
</template>

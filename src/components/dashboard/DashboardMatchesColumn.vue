<script setup lang="ts">
import DashboardResultsPanel from '@/components/dashboard/DashboardResultsPanel.vue'
import DashboardSchedulePanel from '@/components/dashboard/DashboardSchedulePanel.vue'
import type { Match } from '@/types/football'

defineProps<{
  recentResults: Match[]
  upcomingMatches: Match[]
}>()
</script>

<template>
  <div class="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
    <DashboardSchedulePanel :matches="upcomingMatches" />
    <DashboardResultsPanel :matches="recentResults" />
  </div>
</template>

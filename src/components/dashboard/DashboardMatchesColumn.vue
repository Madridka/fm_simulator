<script setup lang="ts">
import type { Match } from '@/types/football'

import DashboardResultsPanel from '@/components/dashboard/DashboardResultsPanel.vue'
import DashboardSchedulePanel from '@/components/dashboard/DashboardSchedulePanel.vue'

defineProps<{
  recentResults: Match[]
  upcomingMatches: Match[]
}>()
</script>

<template>
  <div
    class="grid h-[720px] min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-5 xl:h-auto"
  >
    <DashboardSchedulePanel :matches="upcomingMatches" />
    <DashboardResultsPanel :matches="recentResults" />
  </div>
</template>

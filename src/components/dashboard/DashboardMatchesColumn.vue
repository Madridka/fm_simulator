<script setup lang="ts">
import type { Match } from '@/types/football'

import DashboardScoutPanel from '@/components/dashboard/DashboardScoutPanel.vue'
import DashboardResultsPanel from '@/components/dashboard/DashboardResultsPanel.vue'
import DashboardSchedulePanel from '@/components/dashboard/DashboardSchedulePanel.vue'

defineProps<{
  recentResults: Match[]
  upcomingMatches: Match[]
}>()
</script>

<template>
  <!-- КОЛОНКА БЛИЖАЙШИХ И ЗАВЕРШЁННЫХ МАТЧЕЙ -->
  <div
    class="grid h-[820px] min-h-0 grid-rows-[auto_minmax(0,1fr)_minmax(0,0.72fr)] gap-3 xl:h-full xl:grid-rows-[auto_minmax(0,1fr)_minmax(170px,0.58fr)]"
  >
    <DashboardScoutPanel />
    <DashboardSchedulePanel :matches="upcomingMatches" />
    <DashboardResultsPanel :matches="recentResults" />
  </div>
</template>

<script setup lang="ts">
import type { Match } from '@/types/football'

import DashboardResultsPanel from '@/components/dashboard/DashboardResultsPanel.vue'
import DashboardSchedulePanel from '@/components/dashboard/DashboardSchedulePanel.vue'

defineProps<{
  recentResults: Match[]
  upcomingMatches: Match[]
  calendarPath?: string
  matchPath?: string
}>()
</script>

<template>
  <!-- КОЛОНКА БЛИЖАЙШИХ И ЗАВЕРШЁННЫХ МАТЧЕЙ -->
  <div
    class="grid h-[720px] min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-5 xl:h-auto"
  >
    <DashboardSchedulePanel
      :matches="upcomingMatches"
      :calendar-path="calendarPath"
      :match-path="matchPath"
    />
    <DashboardResultsPanel
      :matches="recentResults"
      :match-path="matchPath"
    />
  </div>
</template>

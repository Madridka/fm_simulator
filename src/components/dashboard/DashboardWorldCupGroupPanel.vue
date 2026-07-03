<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { WorldCupStanding } from '@/stores/worldCup2026/types'
import WorldCupStandingTable from '@/components/worldCup2026/WorldCupStandingTable.vue'

defineProps<{
  divisionName: string
  rows: WorldCupStanding[]
  selectedTeamId: string
  groupsPath: string
}>()

const { t } = useI18n()
</script>

<template>
  <article
    class="flex h-auto min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)] sm:h-[420px] xl:h-auto"
  >
    <header
      class="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:px-5 sm:py-4"
    >
      <div class="min-w-0">
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          {{ divisionName }}
        </div>
        <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">
          {{ t('dashboard.leagueTable') }}
        </h2>
      </div>
      <RouterLink
        :to="groupsPath"
        class="shrink-0 rounded-lg bg-slate-100 px-2 py-2 text-[10px] font-black text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-800 sm:px-3 sm:text-xs"
      >
        {{ t('dashboard.fullTable') }}
      </RouterLink>
    </header>

    <div class="min-h-0 flex-1 overflow-auto p-3 sm:p-4">
      <WorldCupStandingTable
        :rows="rows"
        :highlight-team-id="selectedTeamId"
        :title="divisionName"
      />
    </div>
  </article>
</template>

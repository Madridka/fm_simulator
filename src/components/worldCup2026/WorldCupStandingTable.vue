<script setup lang="ts">
import { computed } from 'vue'
import { resolveTeamFlagEmoji } from '@/data/wc26/nationalTeam'
import { worldCup2026ProfilesById } from '@/data/wc26/teams/index'
import type { WorldCupStanding } from '@/stores/worldCup2026/types'

const props = defineProps<{
  rows: WorldCupStanding[]
  title: string
  highlightTeamId?: string
}>()

const sortedRows = computed(() => [...props.rows].sort((a, b) => a.position - b.position))

const teamName = (teamId: string): string => worldCup2026ProfilesById[teamId]?.name ?? teamId
const teamFlagUrl = (teamId: string): string | undefined => worldCup2026ProfilesById[teamId]?.flag
const teamFlagEmoji = (teamId: string): string =>
  resolveTeamFlagEmoji(worldCup2026ProfilesById[teamId]?.flagCode)

const rowClass = (row: WorldCupStanding): string => {
  if (row.teamId === props.highlightTeamId) return 'bg-emerald-100 ring-1 ring-inset ring-emerald-400'
  if (row.qualificationStatus === 'qualified-directly') return 'bg-emerald-50'
  if (row.qualificationStatus === 'qualified-third-place') return 'bg-cyan-50'
  if (row.qualificationStatus === 'eliminated') return 'bg-slate-50 text-slate-400'
  if (row.position === 3) return 'bg-amber-50'
  return ''
}
</script>

<template>
  <article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div class="border-b border-slate-200 px-4 py-2.5">
      <h3 class="text-sm font-black uppercase tracking-[0.15em] text-emerald-700">{{ title }}</h3>
    </div>
    <div class="overflow-x-auto">
    <table class="w-full min-w-[570px] text-left text-xs">
      <thead class="text-[10px] uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-3 py-2">#</th>
          <th class="px-3 py-2">Команда</th>
          <th class="px-3 py-2 text-center">И</th>
          <th class="px-2 py-2 text-center">В</th>
          <th class="px-2 py-2 text-center">Н</th>
          <th class="px-2 py-2 text-center">П</th>
          <th class="px-2 py-2 text-center">М</th>
          <th class="px-3 py-2 text-center">РМ</th>
          <th class="px-3 py-2 text-center">О</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in sortedRows"
          :key="row.teamId"
          class="border-t border-slate-100"
          :class="rowClass(row)"
        >
          <td class="px-3 py-2 font-bold text-slate-400">{{ row.position }}</td>
          <td class="px-3 py-2 font-semibold text-slate-800">
            <img
              v-if="teamFlagUrl(row.teamId)"
              :src="teamFlagUrl(row.teamId)"
              :alt="teamName(row.teamId)"
              class="mr-1.5 inline-block h-5 w-5 rounded object-cover align-middle"
            />
            <span v-else class="mr-1">{{ teamFlagEmoji(row.teamId) }}</span>
            {{ teamName(row.teamId) }}
          </td>
          <td class="px-3 py-2 text-center text-slate-600">{{ row.played }}</td>
          <td class="px-2 py-2 text-center">{{ row.wins }}</td>
          <td class="px-2 py-2 text-center">{{ row.draws }}</td>
          <td class="px-2 py-2 text-center">{{ row.losses }}</td>
          <td class="px-2 py-2 text-center">{{ row.goalsFor }}:{{ row.goalsAgainst }}</td>
          <td class="px-3 py-2 text-center text-slate-600">{{ row.goalDifference }}</td>
          <td class="px-3 py-2 text-center font-bold text-slate-950">{{ row.points }}</td>
        </tr>
      </tbody>
    </table>
    </div>
  </article>
</template>

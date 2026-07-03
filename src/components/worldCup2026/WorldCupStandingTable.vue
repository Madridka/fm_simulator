<script setup lang="ts">
import { computed } from 'vue'
import { flagEmoji } from '@/data/nationalTeams/worldCup2026/teams'
import { worldCup2026ProfilesById } from '@/data/nationalTeams/worldCup2026/ratings'
import type { WorldCupStanding } from '@/stores/worldCup2026/types'

const props = defineProps<{
  rows: WorldCupStanding[]
  title: string
  highlightTeamId?: string
}>()

const sortedRows = computed(() => [...props.rows].sort((a, b) => a.position - b.position))

const teamName = (teamId: string): string => worldCup2026ProfilesById[teamId]?.name ?? teamId
const teamFlag = (teamId: string): string =>
  flagEmoji(worldCup2026ProfilesById[teamId]?.flagCode ?? '')
</script>

<template>
  <article class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div class="border-b border-slate-200 px-4 py-2.5">
      <h3 class="text-sm font-black uppercase tracking-[0.15em] text-emerald-700">{{ title }}</h3>
    </div>
    <table class="w-full text-left text-sm">
      <thead class="text-[10px] uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-3 py-2">#</th>
          <th class="px-3 py-2">Команда</th>
          <th class="px-3 py-2 text-center">И</th>
          <th class="px-3 py-2 text-center">О</th>
          <th class="px-3 py-2 text-center">РМ</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in sortedRows"
          :key="row.teamId"
          class="border-t border-slate-100"
          :class="row.teamId === highlightTeamId ? 'bg-emerald-50' : ''"
        >
          <td class="px-3 py-2 font-bold text-slate-400">{{ row.position }}</td>
          <td class="px-3 py-2 font-semibold text-slate-800">
            <span class="mr-1">{{ teamFlag(row.teamId) }}</span>
            {{ teamName(row.teamId) }}
          </td>
          <td class="px-3 py-2 text-center text-slate-600">{{ row.played }}</td>
          <td class="px-3 py-2 text-center font-bold text-slate-950">{{ row.points }}</td>
          <td class="px-3 py-2 text-center text-slate-600">{{ row.goalDifference }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

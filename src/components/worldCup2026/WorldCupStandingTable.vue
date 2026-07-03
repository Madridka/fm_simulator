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
  <article class="overflow-hidden rounded-xl border border-white/10 bg-[#0d1524]/90">
    <div class="border-b border-white/10 px-4 py-2.5">
      <h3 class="text-sm font-black uppercase tracking-[0.15em] text-amber-200">{{ title }}</h3>
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
          class="border-t border-white/5"
          :class="row.teamId === highlightTeamId ? 'bg-amber-500/10' : ''"
        >
          <td class="px-3 py-2 font-bold text-slate-400">{{ row.position }}</td>
          <td class="px-3 py-2 font-semibold text-slate-100">
            <span class="mr-1">{{ teamFlag(row.teamId) }}</span>
            {{ teamName(row.teamId) }}
          </td>
          <td class="px-3 py-2 text-center text-slate-300">{{ row.played }}</td>
          <td class="px-3 py-2 text-center font-bold text-white">{{ row.points }}</td>
          <td class="px-3 py-2 text-center text-slate-300">{{ row.goalDifference }}</td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

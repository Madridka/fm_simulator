<script setup lang="ts">
import { worldCup2026ProfilesById } from '@/data/wc26/teams/index'
import type { WorldCupThirdPlaceStanding } from '@/stores/worldCup2026/types'

defineProps<{
  rows: WorldCupThirdPlaceStanding[]
  highlightTeamId?: string
}>()

const teamName = (teamId: string): string => worldCup2026ProfilesById[teamId]?.name ?? 'Неизвестная сборная'
const teamFlag = (teamId: string): string | undefined => worldCup2026ProfilesById[teamId]?.flag
</script>

<template>
  <article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header class="border-b border-slate-200 px-5 py-4">
      <h2 class="text-lg font-black text-slate-950">Лучшие третьи команды</h2>
      <p class="mt-1 text-xs text-slate-500">В 1/16 финала выходят восемь лучших сборных.</p>
    </header>
    <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] text-left text-xs">
        <thead class="bg-slate-50 uppercase tracking-wider text-slate-500">
          <tr>
            <th class="px-3 py-3">#</th><th class="px-3 py-3">Сборная</th><th class="px-3 py-3">Группа</th>
            <th class="px-2 py-3">И</th><th class="px-2 py-3">В</th><th class="px-2 py-3">Н</th><th class="px-2 py-3">П</th>
            <th class="px-2 py-3">МЗ</th><th class="px-2 py-3">МП</th><th class="px-2 py-3">РМ</th><th class="px-2 py-3">О</th><th class="px-3 py-3">Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.teamId"
            class="border-t border-slate-100"
            :class="[
              row.qualificationStatus === 'qualified-third-place' ? 'bg-emerald-50' : '',
              row.qualificationStatus === 'eliminated' ? 'bg-slate-50 text-slate-400' : '',
              row.teamId === highlightTeamId ? 'ring-2 ring-inset ring-emerald-500' : '',
            ]"
          >
            <td class="px-3 py-3 font-black">{{ row.thirdPlaceRank }}</td>
            <td class="px-3 py-3 font-bold">
              <img v-if="teamFlag(row.teamId)" :src="teamFlag(row.teamId)" :alt="teamName(row.teamId)" class="mr-2 inline-block h-5 w-7 rounded-sm object-cover" />
              {{ teamName(row.teamId) }}
            </td>
            <td class="px-3 py-3 font-black">{{ row.groupId }}</td>
            <td class="px-2 py-3">{{ row.played }}</td><td class="px-2 py-3">{{ row.wins }}</td><td class="px-2 py-3">{{ row.draws }}</td><td class="px-2 py-3">{{ row.losses }}</td>
            <td class="px-2 py-3">{{ row.goalsFor }}</td><td class="px-2 py-3">{{ row.goalsAgainst }}</td><td class="px-2 py-3">{{ row.goalDifference }}</td><td class="px-2 py-3 font-black">{{ row.points }}</td>
            <td class="px-3 py-3">
              <span v-if="row.qualificationStatus === 'qualified-third-place'" class="rounded-full bg-emerald-600 px-2 py-1 font-bold text-white">выходит</span>
              <span v-else-if="row.qualificationStatus === 'eliminated'" class="rounded-full bg-slate-300 px-2 py-1 font-bold text-slate-600">вылет</span>
              <span v-else class="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-700">ожидание</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

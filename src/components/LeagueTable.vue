<script setup lang="ts">
import type { Club, LeagueTableRow } from '@/types/football'

const props = defineProps<{
  rows: LeagueTableRow[]
  clubs: Club[]
  selectedClubId?: string
}>()

const clubName = (clubId: string): string => props.clubs.find((club) => club.id === clubId)?.name ?? clubId
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-full border-collapse text-left">
      <thead>
        <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
          <th class="table-cell">#</th>
          <th class="table-cell">Клуб</th>
          <th class="table-cell text-right">И</th>
          <th class="table-cell text-right">В</th>
          <th class="table-cell text-right">Н</th>
          <th class="table-cell text-right">П</th>
          <th class="table-cell text-right">М</th>
          <th class="table-cell text-right">О</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.clubId"
          class="border-b border-slate-100"
          :class="row.clubId === selectedClubId ? 'bg-emerald-50 font-semibold text-emerald-900' : 'text-slate-700'"
        >
          <td class="table-cell">{{ row.position }}</td>
          <td class="table-cell">{{ clubName(row.clubId) }}</td>
          <td class="table-cell text-right">{{ row.played }}</td>
          <td class="table-cell text-right">{{ row.wins }}</td>
          <td class="table-cell text-right">{{ row.draws }}</td>
          <td class="table-cell text-right">{{ row.losses }}</td>
          <td class="table-cell text-right">{{ row.goalsFor }}:{{ row.goalsAgainst }}</td>
          <td class="table-cell text-right font-semibold">{{ row.points }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

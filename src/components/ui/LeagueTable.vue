<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Club, LeagueTableRow } from '@/types/football'

const props = defineProps<{
  rows: LeagueTableRow[]
  clubs: Club[]
  selectedClubId?: string
}>()

const { t } = useI18n()

// ВОЗВРАЩАЕТ НАЗВАНИЕ КЛУБА ПО ИДЕНТИФИКАТОРУ
const clubName = (clubId: string): string =>
  props.clubs.find((club) => club.id === clubId)?.name ?? clubId
</script>

<template>
  <!-- ТУРНИРНАЯ ТАБЛИЦА ЛИГИ -->
  <div class="overflow-auto">
    <table class="min-w-full border-collapse text-left">
      <thead>
        <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
          <th class="whitespace-nowrap px-3 py-2 text-sm">#</th>
          <th class="whitespace-nowrap px-3 py-2 text-sm">{{ t('leagueTable.club') }}</th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.played') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.wins') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.draws') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.losses') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.goals') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.points') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.clubId"
          class="border-b border-slate-100"
          :class="
            row.clubId === selectedClubId
              ? 'bg-emerald-50 font-semibold text-emerald-900'
              : 'text-slate-700'
          "
        >
          <td class="whitespace-nowrap px-3 py-2 text-sm">{{ row.position }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-sm">{{ clubName(row.clubId) }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">{{ row.played }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">{{ row.wins }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">{{ row.draws }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">{{ row.losses }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ row.goalsFor }}:{{ row.goalsAgainst }}
          </td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold">
            {{ row.points }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

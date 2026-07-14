<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useClubStore } from '@/stores/clubs/clubsStore'
import type { LeagueTableRow } from '@/types/football'

import ClubBadge from '@/components/ui/ClubBadge.vue'

const props = defineProps<{
  divisionName: string
  rows: LeagueTableRow[]
  selectedClubId: string
}>()

const clubStore = useClubStore()
const { t } = useI18n()
</script>

<template>
  <!-- КРАТКАЯ ТУРНИРНАЯ ТАБЛИЦА -->
  <article
    class="flex h-auto min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)] sm:h-[420px] xl:h-full"
  >
    <!-- ЗАГОЛОВОК ТУРНИРНОЙ ТАБЛИЦЫ -->
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
        to="/league"
        class="shrink-0 rounded-lg bg-slate-100 px-2 py-2 text-[10px] font-black text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-800 sm:px-3 sm:text-xs"
      >
        {{ t('dashboard.fullTable') }}
      </RouterLink>
    </header>

    <!-- СТРОКИ ТУРНИРНОЙ ТАБЛИЦЫ -->
    <div
      class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1 pb-3 sm:px-3"
    >
      <table class="w-full table-fixed border-collapse text-left sm:table-auto">
        <thead>
          <tr
            class="text-[8px] font-black uppercase tracking-wide text-slate-400 sm:text-[10px] sm:tracking-wider"
          >
            <th class="w-6 px-1 py-2.5 sm:w-auto sm:px-2 sm:py-3">#</th>
            <th class="px-1 py-2.5 sm:px-2 sm:py-3">{{ t('dashboard.tableClub') }}</th>
            <th class="w-7 px-0.5 py-2.5 text-center sm:w-auto sm:px-2 sm:py-3">
              {{ t('dashboard.games') }}
            </th>
            <th class="w-9 px-0.5 py-2.5 text-center sm:w-auto sm:px-2 sm:py-3">
              {{ t('dashboard.goals') }}
            </th>
            <th class="w-7 px-0.5 py-2.5 text-right sm:w-auto sm:px-2 sm:py-3">
              {{ t('dashboard.points') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in props.rows"
            :key="row.clubId"
            class="border-t border-slate-100 text-[11px] sm:text-sm"
            :class="
              row.clubId === selectedClubId ? 'bg-emerald-50 text-emerald-950' : 'text-slate-600'
            "
          >
            <td class="w-6 px-1 py-2 font-black sm:w-9 sm:px-2 sm:py-2.5">
              {{ row.position }}
            </td>
            <td class="min-w-0 px-1 py-2 sm:px-2 sm:py-2.5">
              <div class="flex min-w-0 items-center gap-1 sm:gap-2">
                <ClubBadge
                  v-if="clubStore.getClubById(row.clubId)"
                  :club="clubStore.getClubById(row.clubId)!"
                  size="sm"
                  class="!h-5 !w-5 shrink-0 !rounded text-[6px] sm:!h-6 sm:!w-6 sm:text-[7px]"
                />
                <span class="min-w-0 flex-1 truncate font-bold">{{
                  clubStore.getClubById(row.clubId)?.name
                }}</span>
              </div>
            </td>
            <td class="w-7 px-0.5 py-2 text-center font-semibold sm:w-auto sm:px-2 sm:py-2.5">
              {{ row.played }}
            </td>
            <td
              class="w-9 px-0.5 py-2 text-center text-[10px] font-semibold sm:w-auto sm:px-2 sm:py-2.5 sm:text-xs"
            >
              {{ row.goalsFor }}-{{ row.goalsAgainst }}
            </td>
            <td
              class="w-7 px-0.5 py-2 text-right font-black text-slate-950 sm:w-auto sm:px-2 sm:py-2.5"
            >
              {{ row.points }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

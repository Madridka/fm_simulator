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
    class="flex h-[420px] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)] xl:h-auto"
  >
    <!-- ЗАГОЛОВОК ТУРНИРНОЙ ТАБЛИЦЫ -->
    <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          {{ divisionName }}
        </div>
        <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">
          {{ t('dashboard.leagueTable') }}
        </h2>
      </div>
      <RouterLink
        to="/league"
        class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-800"
      >
        {{ t('dashboard.fullTable') }}
      </RouterLink>
    </header>

    <!-- СТРОКИ ТУРНИРНОЙ ТАБЛИЦЫ -->
    <div class="min-h-0 flex-1 overflow-auto px-3 pb-3">
      <table class="w-full min-w-[390px] border-collapse text-left">
        <thead>
          <tr class="text-[10px] font-black uppercase tracking-wider text-slate-400">
            <th class="px-2 py-3">#</th>
            <th class="px-2 py-3">{{ t('dashboard.tableClub') }}</th>
            <th class="px-2 py-3 text-center">{{ t('dashboard.games') }}</th>
            <th class="px-2 py-3 text-center">{{ t('dashboard.goals') }}</th>
            <th class="px-2 py-3 text-right">{{ t('dashboard.points') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in props.rows"
            :key="row.clubId"
            class="border-t border-slate-100 text-sm"
            :class="
              row.clubId === selectedClubId ? 'bg-emerald-50 text-emerald-950' : 'text-slate-600'
            "
          >
            <td class="w-9 px-2 py-2.5 font-black">{{ row.position }}</td>
            <td class="px-2 py-2.5">
              <div class="flex items-center gap-2">
                <ClubBadge
                  v-if="clubStore.getClubById(row.clubId)"
                  :club="clubStore.getClubById(row.clubId)!"
                  size="sm"
                  class="!h-6 !w-6 !rounded text-[7px]"
                />
                <span class="max-w-36 truncate font-bold">{{
                  clubStore.getClubById(row.clubId)?.shortName
                }}</span>
              </div>
            </td>
            <td class="px-2 py-2.5 text-center font-semibold">{{ row.played }}</td>
            <td class="px-2 py-2.5 text-center text-xs font-semibold">
              {{ row.goalsFor }}-{{ row.goalsAgainst }}
            </td>
            <td class="px-2 py-2.5 text-right font-black text-slate-950">{{ row.points }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
</template>

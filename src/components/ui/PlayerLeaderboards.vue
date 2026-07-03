<script setup lang="ts">
import type { Club, CompetitionPlayerLeaderboards, PlayerLeaderboardEntry } from '@/types/football'

const props = defineProps<{ leaderboards: CompetitionPlayerLeaderboards; clubs: Club[] }>()
const clubName = (clubId: string): string =>
  props.clubs.find((club) => club.id === clubId)?.shortName ?? clubId
const sections: Array<{ key: keyof CompetitionPlayerLeaderboards; title: string; unit: string }> = [
  { key: 'goals', title: 'Лучшие бомбардиры', unit: 'Г' },
  { key: 'assists', title: 'Голевые передачи', unit: 'ГП' },
  { key: 'cleanSheets', title: 'Сухие матчи', unit: 'СМ' },
  { key: 'yellowCards', title: 'Жёлтые карточки', unit: 'ЖК' },
  { key: 'redCards', title: 'Красные карточки', unit: 'КК' },
]
</script>

<template>
  <div class="grid gap-4 overflow-auto p-4 md:grid-cols-2 xl:grid-cols-3">
    <section v-for="section in sections" :key="section.key" class="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <h3 class="mb-3 font-black text-slate-950">{{ section.title }}</h3>
      <div v-if="leaderboards[section.key].length" class="grid gap-1.5">
        <div
          v-for="(entry, index) in (leaderboards[section.key] as PlayerLeaderboardEntry[])"
          :key="entry.playerId"
          class="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-white px-2.5 py-2 text-sm"
        >
          <span class="text-xs font-black text-slate-400">{{ index + 1 }}</span>
          <span class="min-w-0">
            <span class="block truncate font-bold text-slate-800">{{ entry.playerName }}</span>
            <span class="block truncate text-[11px] text-slate-400">{{ clubName(entry.clubId) }}</span>
          </span>
          <span class="font-black text-emerald-700">{{ entry.value }} {{ section.unit }}</span>
        </div>
      </div>
      <p v-else class="py-6 text-center text-sm text-slate-400">Пока нет данных</p>
    </section>
  </div>
</template>

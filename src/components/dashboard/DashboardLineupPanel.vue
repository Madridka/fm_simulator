<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useSquadStore } from '@/stores/squad/squadStore'
import type { Player } from '@/types/football'

interface StarterView {
  key: string
  label: string
  player?: Player
  x: number
  y: number
}

const squadStore = useSquadStore()
const { t } = useI18n()

const playersById = computed(() => {
  const club = squadStore.club
  return new Map((club?.squad ?? []).map((player) => [player.id, player]))
})

const starters = computed<StarterView[]>(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return []
  }

  return squadStore.slots.map((slot) => {
    const playerId = lineup.starters[slot.id]
    return {
      key: slot.id,
      label: slot.label,
      player: playerId ? playersById.value.get(playerId) : undefined,
      x: slot.x,
      y: slot.y,
    }
  })
})

const ratingClass = (rating?: number): string => {
  if (!rating) {
    return 'bg-slate-600'
  }
  if (rating >= 75) {
    return 'bg-emerald-700'
  }
  if (rating >= 64) {
    return 'bg-amber-600'
  }
  return 'bg-orange-700'
}
</script>

<template>
  <RouterLink
    to="/squad"
    class="group flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_50px_rgba(24,51,43,0.12)]"
  >
    <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          {{ squadStore.lineup?.formation }}
        </div>
        <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">
          {{ t('dashboard.startingLineup') }}
        </h2>
      </div>
      <span
        class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition group-hover:bg-emerald-100 group-hover:text-emerald-800"
      >
        {{ t('dashboard.openSquad') }}
      </span>
    </header>

    <div
      class="relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,#142033,#0e1726)]"
    >
      <div class="pointer-events-none absolute inset-5 rounded-xl border-2 border-white/25"></div>
      <div class="pointer-events-none absolute inset-x-5 top-1/2 border-t-2 border-white/20"></div>
      <div
        class="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20"
      ></div>

      <div
        v-for="starter in starters"
        :key="starter.key"
        class="absolute grid w-[92px] -translate-x-1/2 -translate-y-1/2 justify-items-center gap-1 rounded-lg border border-white/15 bg-slate-950/80 px-2 py-1.5 text-center text-white shadow-[0_10px_22px_rgba(2,6,23,0.24)]"
        :style="{ left: `${starter.x}%`, top: `${starter.y}%` }"
      >
        <span
          class="grid h-7 min-w-7 place-items-center rounded-full border-2 border-white/75 text-[0.68rem] font-black"
          :class="ratingClass(starter.player?.rating)"
        >
          {{ starter.player?.rating ?? '?' }}
        </span>
        <span class="max-w-full truncate text-[0.68rem] font-black uppercase">
          {{ starter.player?.lastName ?? starter.label }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

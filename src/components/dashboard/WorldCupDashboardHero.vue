<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import type { Club } from '@/types/football'
import { formatMoney } from '@/utils/format'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'

const props = defineProps<{
  club: Club
  teamFlag: string
  teamRating: number
  divisionName: string
  position?: number
  groupSize: number
  canPlay: boolean
  isFinished: boolean
  isUserEliminated: boolean
  isChampion: boolean
}>()

const emit = defineEmits<{
  playNextMatch: []
  simulateRest: []
}>()

const router = useRouter()
const worldCupStore = useWorldCup2026Store()
const { t } = useI18n()

const stageLabel = computed(() => {
  if (props.isChampion && props.isFinished) {
    return t('worldCup2026.overview.champion')
  }
  if (props.isUserEliminated) {
    return t('worldCup2026.overview.eliminated')
  }
  return props.divisionName
})

const newTournament = (): void => {
  worldCupStore.resetTournament()
  void router.push({ name: 'world-cup-select-team' })
}
</script>

<template>
  <article
    class="relative isolate shrink-0 overflow-hidden rounded-2xl bg-[#14241f] text-white shadow-[0_22px_55px_rgba(15,42,32,0.18)]"
  >
    <div
      class="absolute inset-0 -z-10 opacity-80"
      :style="{
        background: `radial-gradient(circle at 88% 20%, ${club.primaryColor}66, transparent 38%), linear-gradient(120deg, #14241f 20%, #203a31 100%)`,
      }"
    ></div>

    <div
      class="grid gap-4 p-3 sm:gap-6 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8"
    >
      <div class="flex items-center gap-3 sm:gap-5">
        <span
          class="grid h-16 w-16 shrink-0 place-items-center rounded-md border-4 border-white/10 bg-white/10 text-3xl shadow-[0_14px_35px_rgba(0,0,0,0.25)]"
        >
          {{ teamFlag }}
        </span>
        <div>
          <div
            class="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/70"
          >
            <span>{{ stageLabel }}</span>
          </div>
          <h1 class="text-2xl font-black tracking-tight sm:text-3xl">{{ club.name }}</h1>
        </div>
      </div>

      <div class="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-3">
        <div
          class="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-2.5 backdrop-blur sm:min-w-28 sm:rounded-xl sm:px-4 sm:py-3"
        >
          <div class="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-400 sm:text-[9px]">
            {{ t('dashboard.place') }}
          </div>
          <div class="mt-1 truncate text-base font-black sm:text-xl">
            {{ position ?? t('common.dash') }}
            <span class="text-[9px] text-slate-400 sm:text-xs"> / {{ groupSize }}</span>
          </div>
        </div>
        <div
          class="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-2.5 backdrop-blur sm:min-w-28 sm:rounded-xl sm:px-4 sm:py-3"
        >
          <div class="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-400 sm:text-[9px]">
            {{ t('dashboard.rating') }}
          </div>
          <div class="mt-1 truncate text-base font-black sm:text-xl">{{ teamRating }}</div>
        </div>
        <div
          class="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-2.5 backdrop-blur sm:min-w-28 sm:rounded-xl sm:px-4 sm:py-3"
        >
          <div class="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-400 sm:text-[9px]">
            {{ t('dashboard.budget') }}
          </div>
          <div class="mt-1 truncate text-base font-black sm:text-xl">{{ formatMoney(0) }}</div>
        </div>
      </div>
    </div>

    <div
      v-if="canPlay"
      class="border-t border-white/10 bg-black/10 px-4 py-3 sm:px-8 sm:py-4"
    >
      <button
        type="button"
        class="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-400"
        @click="emit('playNextMatch')"
      >
        {{ t('worldCup2026.overview.playNextMatch') }}
      </button>
    </div>

    <div
      v-else-if="isUserEliminated || isFinished"
      class="border-t border-white/10 bg-black/10 px-4 py-3 sm:px-8 sm:py-4"
    >
      <button
        type="button"
        class="rounded-xl bg-white/10 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/20"
        @click="newTournament"
      >
        {{ t('worldCup2026.overview.newTournament') }}
      </button>
    </div>
  </article>
</template>

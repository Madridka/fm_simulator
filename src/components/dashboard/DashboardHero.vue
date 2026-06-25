<script setup lang="ts">
import { useI18n } from '@/composables/useI18n'
import type { Club } from '@/types/football'
import { formatMoney } from '@/utils/format'

import ClubBadge from '@/components/ui/ClubBadge.vue'

const props = defineProps<{
  club: Club
  cupProgress: string
  divisionName: string
  leagueRowsCount: number
  position?: number
  season: number
  seasonCanFinish: boolean
}>()

const emit = defineEmits<{
  finishSeason: []
}>()

const { t } = useI18n()
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
      class="absolute -right-16 -top-32 -z-10 h-80 w-80 rounded-full border-[52px] border-white/[0.035]"
    ></div>

    <div class="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
      <div class="flex items-center gap-5">
        <ClubBadge
          :club="club"
          size="lg"
          class="shadow-[0_14px_35px_rgba(0,0,0,0.25)] ring-4 ring-white/10"
        />
        <div>
          <div
            class="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/70"
          >
            <span>{{ divisionName }}</span>
            <span class="h-1 w-1 rounded-full bg-emerald-300/50"></span>
            <span>{{ club.city }}</span>
          </div>
          <h1 class="text-2xl font-black tracking-tight sm:text-3xl">{{ club.name }}</h1>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 sm:gap-3">
        <div
          class="min-w-24 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur sm:min-w-28 sm:px-4"
        >
          <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {{ t('dashboard.place') }}
          </div>
          <div class="mt-1 text-xl font-black">
            {{ position ?? t('common.dash')
            }}<span class="text-xs text-slate-400"> / {{ leagueRowsCount }}</span>
          </div>
        </div>
        <div
          class="min-w-24 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur sm:min-w-28 sm:px-4"
        >
          <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {{ t('dashboard.budget') }}
          </div>
          <div class="mt-1 truncate text-lg font-black text-emerald-300">
            {{ formatMoney(club.budget) }}
          </div>
        </div>
        <div
          class="min-w-24 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur sm:min-w-28 sm:px-4"
        >
          <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">
            {{ t('dashboard.rating') }}
          </div>
          <div class="mt-1 flex items-baseline gap-1 text-xl font-black">
            {{ club.rating }}<span class="text-xs text-slate-400">/ 100</span>
          </div>
        </div>
      </div>
    </div>

    <div
      class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 bg-black/10 px-5 py-3 text-xs font-semibold text-slate-300 sm:px-7 lg:px-8"
    >
      <span
        >{{ t('dashboard.cup') }}: <strong class="text-white">{{ cupProgress }}</strong></span
      >
      <span
        >{{ t('dashboard.season') }}: <strong class="text-white">{{ season }}</strong></span
      >
      <button
        v-if="seasonCanFinish"
        type="button"
        class="ml-auto rounded-lg bg-emerald-400 px-3 py-1.5 font-black text-emerald-950"
        @click="emit('finishSeason')"
      >
        {{ t('dashboard.finishSeason') }}
      </button>
    </div>
  </article>
</template>

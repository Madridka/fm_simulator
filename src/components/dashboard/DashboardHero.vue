<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { Club } from '@/types/football'
import { formatMoney } from '@/utils/format'

import ClubBadge from '@/components/ui/ClubBadge.vue'

const props = defineProps<{
  club: Club
  teamRating: number
  cupProgress: string
  divisionName: string
  leagueRowsCount: number
  position?: number
  season: number
  seasonCanFinish: boolean
  isFinalSeason: boolean
}>()

const emit = defineEmits<{
  finishSeason: []
}>()

const { t } = useI18n()
</script>

<template>
  <!-- ГЛАВНАЯ КАРТОЧКА КЛУБА -->
  <article
    class="relative isolate shrink-0 overflow-hidden rounded-xl bg-[#14241f] text-white shadow-[0_16px_38px_rgba(15,42,32,0.16)]"
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

    <!-- ОСНОВНАЯ ИНФОРМАЦИЯ И ПОКАЗАТЕЛИ КЛУБА -->
    <div
      class="grid gap-3 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-5 lg:py-4"
    >
      <div class="flex items-center gap-3 sm:gap-4">
        <ClubBadge
          :club="club"
          size="md"
          class="shadow-[0_14px_35px_rgba(0,0,0,0.25)] ring-4 ring-white/10"
        />
        <div>
          <div
            class="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200/70"
          >
            <span>{{ divisionName }}</span>
            <span class="h-1 w-1 rounded-full bg-emerald-300/50"></span>
            <span>{{ club.city }}</span>
          </div>
          <h1 class="text-xl font-black tracking-tight sm:text-2xl">{{ club.name }}</h1>
        </div>
      </div>

      <div class="grid min-w-0 grid-cols-3 gap-1.5 sm:gap-3">
        <div
          class="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-2 backdrop-blur sm:min-w-28 sm:px-3"
        >
          <div
            class="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-400 sm:text-[9px] sm:tracking-widest"
          >
            {{ t('dashboard.place') }}
          </div>
          <div class="mt-0.5 truncate text-base font-black sm:text-lg">
            {{ position ?? t('common.dash')
            }}<span class="text-[9px] text-slate-400 sm:text-xs"> / {{ leagueRowsCount }}</span>
          </div>
        </div>
        <div
          class="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-2 backdrop-blur sm:min-w-28 sm:px-3"
        >
          <div
            class="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-400 sm:text-[9px] sm:tracking-widest"
          >
            {{ t('dashboard.budget') }}
          </div>
          <div class="mt-0.5 truncate text-sm font-black text-emerald-300 sm:text-base">
            {{ formatMoney(club.budget) }}
          </div>
        </div>
        <div
          class="min-w-0 rounded-lg border border-white/10 bg-white/[0.07] px-2 py-2 backdrop-blur sm:min-w-28 sm:px-3"
        >
          <div
            class="truncate text-[8px] font-black uppercase tracking-[0.08em] text-slate-400 sm:text-[9px] sm:tracking-widest"
          >
            {{ t('dashboard.rating') }}
          </div>
          <div class="mt-0.5 flex items-baseline gap-0.5 truncate text-base font-black sm:gap-1 sm:text-lg">
            {{ teamRating }}<span class="text-[9px] text-slate-400 sm:text-xs">/ 100</span>
          </div>
        </div>
      </div>
    </div>

    <!-- СТАТУС КУБКА И СЕЗОНА -->
    <div
      class="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-white/10 bg-black/10 px-5 py-1.5 text-xs font-semibold text-slate-300"
    >
      <span
        >{{ t('dashboard.cup') }}: <strong class="text-white">{{ cupProgress }}</strong></span
      >
      <span
        >{{ t('dashboard.season') }}: <strong class="text-white">{{ season }}</strong></span
      >
      <span v-if="isFinalSeason" class="font-black text-amber-300">
        {{ t('dashboard.finalSeason') }}
      </span>
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

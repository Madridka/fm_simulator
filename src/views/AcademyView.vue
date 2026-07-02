<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAcademyStore } from '@/stores/academy/academyStore'
import { formatMoney } from '@/utils/format'
import type { AcademyEvent, PlayerPosition } from '@/types/football'

const academyStore = useAcademyStore()
const { t } = useI18n()

const averagePotential = computed(() => {
  const players = academyStore.reservePlayers
  if (!players.length) return 0
  return Math.round(players.reduce((sum, player) => sum + player.potential, 0) / players.length)
})

const positionLabel = (position: PlayerPosition): string => t(`common.positionShort.${position}`)
const eventLabel = (event: AcademyEvent): string => t(`academy.event.${event.type}`)
const nationalityLabel = (nationality?: string): string =>
  nationality ? t(`common.nationalities.${nationality}`) : t('common.dash')
</script>

<template>
  <section v-if="academyStore.academy" class="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
    <article class="flex h-[104px] shrink-0 overflow-x-auto rounded-xl bg-emerald-950 px-4 py-3 text-white shadow-sm">
      <div class="flex min-w-[260px] flex-col justify-center border-r border-white/15 pr-5">
        <h1 class="text-lg font-black leading-tight">{{ t('academy.title') }}</h1>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{{ t('academy.reserveTeam') }}</span>
          <span class="text-base font-black">{{ academyStore.academy.reserveTeam.name }}</span>
        </div>
        <p class="mt-0.5 truncate text-xs text-emerald-100/65">
          {{ academyStore.academy.reserveTeam.mode === 'competition' ? t('academy.competitionStatus') : t('academy.virtualStatus') }}
        </p>
      </div>

      <div class="grid min-w-[930px] flex-1 grid-cols-6 divide-x divide-white/10">
        <div v-for="item in [
          { label: t('academy.level'), value: academyStore.academy.level + '/20' },
          { label: t('academy.recruitment'), value: academyStore.academy.recruitment + '/20' },
          { label: t('academy.coaching'), value: academyStore.academy.coaching + '/20' },
          { label: t('academy.facilities'), value: academyStore.academy.facilities + '/20' },
          { label: t('academy.annualBudget'), value: formatMoney(academyStore.academy.annualBudget) },
        ]" :key="item.label" class="flex flex-col justify-center px-4">
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-200/65">{{ item.label }}</div>
          <div class="mt-1 text-lg font-black leading-none">{{ item.value }}</div>
        </div>
        <div class="flex flex-col justify-center gap-2 px-4">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-200/65">{{ t('academy.nextIntake') }}</div>
            <div class="text-sm font-black">{{ t('academy.season', { season: academyStore.academy.nextIntakeSeason }) }}</div>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-[10px] font-bold uppercase text-emerald-200/65">{{ t('academy.potential') }}</span>
            <span class="font-black">{{ averagePotential }}</span>
          </div>
        </div>
      </div>
    </article>

    <div class="grid min-h-0 flex-1 grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)] gap-5 overflow-hidden 2xl:grid-cols-[1.4fr_0.8fr] 2xl:grid-rows-1">
      <article class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/70 bg-white/90 p-5 shadow-sm">
        <h2 class="text-lg font-bold text-slate-950">{{ t('academy.players') }}</h2>
        <div class="mt-4 min-h-0 flex-1 overflow-auto">
          <table v-if="academyStore.reservePlayers.length" class="w-full min-w-[720px] text-sm">
            <thead class="sticky top-0 z-10 bg-white text-left text-xs uppercase text-slate-500"><tr><th class="pb-3">{{ t('academy.players') }}</th><th class="pb-3">{{ t('academy.nationality') }}</th><th class="pb-3">{{ t('transfers.position') }}</th><th class="pb-3">{{ t('selectClub.rating') }}</th><th class="pb-3">{{ t('academy.potential') }}</th><th class="pb-3">{{ t('academy.value') }}</th><th></th></tr></thead>
            <tbody>
              <tr v-for="player in academyStore.reservePlayers" :key="player.id" class="border-t border-slate-100">
                <td class="py-3"><div class="font-bold text-slate-950">{{ player.firstName }} {{ player.lastName }}</div><div class="text-xs text-slate-500">{{ t('common.age', { age: player.age }) }}</div></td>
                <td>{{ nationalityLabel(player.nationality) }}</td><td>{{ positionLabel(player.position) }}</td><td class="font-black">{{ player.rating }}</td><td class="font-black text-emerald-700">{{ player.potential }}</td><td>{{ formatMoney(player.value) }}</td>
                <td class="py-2 text-right"><div class="flex justify-end gap-2"><Button size="small" :label="t('academy.promote')" @click="academyStore.promote(player.id)" /><Button size="small" severity="secondary" :label="t('transfers.sell')" @click="academyStore.sell(player.id)" /><Button size="small" severity="secondary" :label="t('academy.release')" @click="academyStore.release(player.id)" /></div></td>
              </tr>
            </tbody>
          </table>
          <p v-else class="py-8 text-center text-sm text-slate-500">{{ t('academy.noPlayers') }}</p>
        </div>
      </article>

      <div class="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,0.72fr)] gap-5 overflow-hidden">
        <article class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/70 bg-white/90 p-5 shadow-sm">
          <h2 class="text-lg font-bold text-slate-950">{{ t('academy.firstTeamYouth') }}</h2>
          <div class="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-auto pr-1">
            <div v-for="player in academyStore.firstTeamPlayers" :key="player.id" class="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
              <span class="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-black text-white">{{ positionLabel(player.position) }}</span>
              <div class="min-w-0 flex-1"><div class="truncate font-bold">{{ player.firstName }} {{ player.lastName }}</div><div class="text-xs text-slate-500">{{ t('common.age', { age: player.age }) }} · {{ player.rating }}/{{ player.potential }}</div></div>
              <Button size="small" severity="secondary" :label="t('academy.demote')" @click="academyStore.demote(player.id)" />
            </div>
            <p v-if="!academyStore.firstTeamPlayers.length" class="py-4 text-sm text-slate-500">{{ t('academy.noFirstTeamYouth') }}</p>
          </div>
        </article>

        <article class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/70 bg-white/90 p-5 shadow-sm">
          <h2 class="text-lg font-bold text-slate-950">{{ t('academy.history') }}</h2>
          <div class="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
            <div v-for="event in academyStore.academy.history" :key="event.id" class="border-l-2 border-emerald-400 pl-3 text-sm"><div class="font-bold">{{ event.playerName }}</div><div class="text-xs text-slate-500">{{ eventLabel(event) }} · {{ t('academy.season', { season: event.season }) }}</div></div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAcademyStore } from '@/stores/academy/academyStore'
import { formatMoney } from '@/utils/format'
import type { PlayerPosition } from '@/types/football'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

interface AcademyPlayerRow {
  id: string
  name: string
  age: number
  position: string
  rating: number
  potential: number
  value: number
}

const academyStore = useAcademyStore()
const { t } = useI18n()

const averagePotential = computed(() => {
  const players = academyStore.reservePlayers
  if (!players.length) return 0
  return Math.round(players.reduce((sum, player) => sum + player.potential, 0) / players.length)
})

const positionLabel = (position: PlayerPosition): string => t(`common.positionShort.${position}`)

const reservePlayerRows = computed<AcademyPlayerRow[]>(() =>
  academyStore.reservePlayers.map((player) => ({
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    age: player.age,
    position: positionLabel(player.position),
    rating: player.rating,
    potential: player.potential,
    value: player.value,
  })),
)
</script>

<template>
  <section v-if="academyStore.academy" class="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
    <article
      class="flex h-[104px] shrink-0 overflow-x-auto rounded-xl bg-emerald-950 px-4 py-3 text-white shadow-sm"
    >
      <div class="flex min-w-[260px] flex-col justify-center border-r border-white/15 pr-5">
        <h1 class="text-lg font-black leading-tight">{{ t('academy.title') }}</h1>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{{
            t('academy.reserveTeam')
          }}</span>
          <span class="text-base font-black">{{ academyStore.academy.reserveTeam.name }}</span>
        </div>
        <p class="mt-0.5 truncate text-xs text-emerald-100/65">
          {{
            academyStore.academy.reserveTeam.mode === 'competition'
              ? t('academy.competitionStatus')
              : t('academy.virtualStatus')
          }}
        </p>
      </div>

      <div class="grid min-w-[930px] flex-1 grid-cols-6 divide-x divide-white/10">
        <div
          v-for="item in [
            { label: t('academy.level'), value: academyStore.academy.level + '/20' },
            { label: t('academy.recruitment'), value: academyStore.academy.recruitment + '/20' },
            { label: t('academy.coaching'), value: academyStore.academy.coaching + '/20' },
            { label: t('academy.facilities'), value: academyStore.academy.facilities + '/20' },
            {
              label: t('academy.annualBudget'),
              value: formatMoney(academyStore.academy.annualBudget),
            },
          ]"
          :key="item.label"
          class="flex flex-col justify-center px-4"
        >
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-200/65">
            {{ item.label }}
          </div>
          <div class="mt-1 text-lg font-black leading-none">{{ item.value }}</div>
        </div>
        <div class="flex flex-col justify-center gap-2 px-4">
          <div>
            <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-200/65">
              {{ t('academy.nextIntake') }}
            </div>
            <div class="text-sm font-black">
              {{ t('academy.season', { season: academyStore.academy.nextIntakeSeason }) }}
            </div>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-[10px] font-bold uppercase text-emerald-200/65">{{
              t('academy.potential')
            }}</span>
            <span class="font-black">{{ averagePotential }}</span>
          </div>
        </div>
      </div>
    </article>

    <div
      class="grid min-h-0 flex-1 grid-rows-[minmax(0,1.2fr)_minmax(0,1fr)] gap-5 overflow-hidden 2xl:grid-cols-[1.4fr_0.8fr] 2xl:grid-rows-1"
    >
      <article
        class="flex min-h-0 flex-col overflow-hidden rounded-xl border border-white/70 bg-white/90 p-5 shadow-sm"
      >
        <h2 class="text-lg font-bold text-slate-950">{{ t('academy.players') }}</h2>
        <div class="mt-4 grid min-h-0 flex-1 content-start gap-3 overflow-auto pr-1 md:hidden">
          <article
            v-for="player in reservePlayerRows"
            :key="player.id"
            class="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <div class="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div class="min-w-0">
                <h3 class="truncate text-sm font-black text-slate-950">{{ player.name }}</h3>
                <p class="mt-0.5 text-xs font-semibold text-slate-500">
                  {{ t('common.age', { age: player.age }) }}
                </p>
              </div>
              <span
                class="grid h-9 min-w-9 place-items-center rounded-full bg-slate-900 px-2 text-xs font-black text-white"
              >
                {{ player.position }}
              </span>
            </div>

            <div class="mt-3 grid grid-cols-3 gap-2">
              <div class="rounded-md bg-slate-50 px-2 py-2 text-center">
                <div class="text-[10px] font-black uppercase text-slate-400">
                  {{ t('selectClub.rating') }}
                </div>
                <div class="mt-0.5 text-lg font-black leading-none text-slate-950">
                  {{ player.rating }}
                </div>
              </div>
              <div class="rounded-md bg-emerald-50 px-2 py-2 text-center">
                <div class="text-[10px] font-black uppercase text-emerald-600">
                  {{ t('academy.potential') }}
                </div>
                <div class="mt-0.5 text-lg font-black leading-none text-emerald-700">
                  {{ player.potential }}
                </div>
              </div>
              <div class="rounded-md bg-slate-50 px-2 py-2 text-center">
                <div class="text-[10px] font-black uppercase text-slate-400">
                  {{ t('academy.value') }}
                </div>
                <div class="mt-0.5 truncate text-xs font-black leading-5 text-slate-950">
                  {{ formatMoney(player.value) }}
                </div>
              </div>
            </div>

            <div class="mt-3 grid grid-cols-3 gap-2">
              <Button
                size="small"
                class="!px-2"
                :label="t('academy.promote')"
                @click="academyStore.promote(player.id)"
              />
              <Button
                size="small"
                severity="secondary"
                class="!px-2"
                :label="t('transfers.sell')"
                @click="academyStore.sell(player.id)"
              />
              <Button
                size="small"
                severity="secondary"
                class="!px-2"
                :label="t('academy.release')"
                @click="academyStore.release(player.id)"
              />
            </div>
          </article>
          <p v-if="!reservePlayerRows.length" class="py-4 text-sm text-slate-500">
            {{ t('academy.noPlayers') }}
          </p>
        </div>

        <div class="mt-4 hidden min-h-0 flex-1 overflow-hidden md:block">
          <DataTable
            :value="reservePlayerRows"
            data-key="id"
            sort-field="rating"
            :sort-order="-1"
            removable-sort
            striped-rows
            size="small"
            scrollable
            scroll-height="flex"
            class="h-full text-sm"
            table-style="min-width: 720px"
          >
            <template #empty>{{ t('academy.noPlayers') }}</template>
            <Column field="name" :header="t('academy.players')" sortable frozen>
              <template #body="{ data }">
                <div class="whitespace-nowrap font-bold text-slate-950">{{ data.name }}</div>
                <div class="text-xs text-slate-500">{{ t('common.age', { age: data.age }) }}</div>
              </template>
            </Column>
            <Column field="position" :header="t('transfers.position')" sortable />
            <Column field="rating" :header="t('selectClub.rating')" sortable class="font-black" />
            <Column field="potential" :header="t('academy.potential')" sortable>
              <template #body="{ data }">
                <span class="font-black text-emerald-700">{{ data.potential }}</span>
              </template>
            </Column>
            <Column field="value" :header="t('academy.value')" sortable>
              <template #body="{ data }">{{ formatMoney(data.value) }}</template>
            </Column>
            <Column header="">
              <template #body="{ data }">
                <div class="flex justify-end gap-2">
                  <Button
                    size="small"
                    :label="t('academy.promote')"
                    @click="academyStore.promote(data.id)"
                  />
                  <Button
                    size="small"
                    severity="secondary"
                    :label="t('transfers.sell')"
                    @click="academyStore.sell(data.id)"
                  />
                  <Button
                    size="small"
                    severity="secondary"
                    :label="t('academy.release')"
                    @click="academyStore.release(data.id)"
                  />
                </div>
              </template>
            </Column>
          </DataTable>
        </div>
      </article>

      <div class="min-h-0 overflow-hidden">
        <article
          class="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-white/70 bg-white/90 p-5 shadow-sm"
        >
          <h2 class="text-lg font-bold text-slate-950">{{ t('academy.firstTeamYouth') }}</h2>
          <div class="mt-3 grid min-h-0 flex-1 content-start gap-2 overflow-auto pr-1">
            <div
              v-for="player in academyStore.firstTeamPlayers"
              :key="player.id"
              class="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
            >
              <span
                class="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-xs font-black text-white"
                >{{ positionLabel(player.position) }}</span
              >
              <div class="min-w-0 flex-1">
                <div class="truncate font-bold">{{ player.firstName }} {{ player.lastName }}</div>
                <div class="text-xs text-slate-500">
                  {{ t('common.age', { age: player.age }) }} · {{ player.rating }}/{{
                    player.potential
                  }}
                </div>
              </div>
              <Button
                size="small"
                severity="secondary"
                :label="t('academy.demote')"
                @click="academyStore.demote(player.id)"
              />
            </div>
            <p v-if="!academyStore.firstTeamPlayers.length" class="py-4 text-sm text-slate-500">
              {{ t('academy.noFirstTeamYouth') }}
            </p>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

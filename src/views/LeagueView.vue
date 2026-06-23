<script setup lang="ts">
import { computed, ref } from 'vue'
import LeagueTable from '@/components/ui/LeagueTable.vue'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useCompetitionStore } from '@/stores/competitions/competitionStore'
import { useGameStore } from '@/stores/game/gameStore'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()

const playerDivisionId = computed(() => gameStore.selectedClub?.divisionId ?? 1)
const selectedDivisionId = ref(playerDivisionId.value)
const divisions = computed(() => Object.keys(competitionStore.leagueTables).map(Number))
const divisionName = (divisionId: number): string => clubStore.getDivisionName(divisionId)

const selectedRows = computed(() => competitionStore.leagueTables[selectedDivisionId.value] ?? [])

const isPlayerDivision = computed(() => selectedDivisionId.value === playerDivisionId.value)
</script>

<template>
  <section v-if="gameStore.game" class="mx-auto max-w-6xl space-y-5">
    <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          Чемпионат: {{ gameStore.championship?.name }}
        </div>
        <h1 class="mt-1 text-2xl font-black tracking-tight text-slate-950">Таблица лиги</h1>
        <p class="mt-1 text-sm text-slate-600">По умолчанию открыт дивизион вашей команды.</p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <div class="mb-1 px-2 pt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">
          Другие дивизионы
        </div>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="divisionId in divisions"
            :key="divisionId"
            type="button"
            class="rounded-lg px-3 py-2 text-xs font-bold transition"
            :class="
              selectedDivisionId === divisionId
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
            "
            @click="selectedDivisionId = divisionId"
          >
            {{ divisionName(divisionId) }}
            <span
              v-if="divisionId === playerDivisionId"
              class="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"
              title="Дивизион вашей команды"
            ></span>
          </button>
        </div>
      </div>
    </header>

    <article
      class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_18px_50px_rgba(20,46,38,0.08)]"
    >
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"
      >
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-black text-slate-950">
              {{ divisionName(selectedDivisionId) }}
            </h2>
            <span
              v-if="isPlayerDivision"
              class="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-800"
            >
              Ваш дивизион
            </span>
          </div>
          <p class="mt-1 text-xs font-semibold text-slate-400">
            {{ selectedRows.length }} команд · сезон {{ gameStore.game.season }}
          </p>
        </div>
        <button
          v-if="!isPlayerDivision"
          type="button"
          class="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
          @click="selectedDivisionId = playerDivisionId"
        >
          Вернуться к своей лиге
        </button>
      </div>

      <LeagueTable
        class="p-3 sm:p-5"
        :rows="selectedRows"
        :clubs="clubStore.clubs"
        :selected-club-id="gameStore.game.selectedClubId"
      />
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { championships, getChampionshipClubs, type ChampionshipId } from '@/data/clubs'
import { useGameStore } from '@/stores/gameStore'
import type { Club } from '@/types/football'
import { formatMoney } from '@/utils/format'

import ClubBadge from '@/components/ClubBadge.vue'

const gameStore = useGameStore()
const router = useRouter()

const selectedChampionship = ref<ChampionshipId>('russia')
const divisionFilter = ref<number | 'all'>('all')

const championship = computed(() => championships[selectedChampionship.value])

const clubs = computed(() => getChampionshipClubs(selectedChampionship.value))

const championshipOptions: {
  label: string
  value: ChampionshipId
}[] = [
  {
    label: 'Россия',
    value: 'russia',
  },
  {
    label: 'Испания',
    value: 'spain',
  },
]

const divisions = computed(() => {
  const divisionOptions = Object.entries(championship.value.divisionNames).map(
    ([divisionId, name]) => ({
      label: name,
      value: Number(divisionId),
    }),
  )

  return [
    {
      label: 'Все дивизионы',
      value: 'all' as const,
    },
    ...divisionOptions,
  ]
})

const filteredClubs = computed(() => {
  return clubs.value.filter(
    (club) => divisionFilter.value === 'all' || club.divisionId === divisionFilter.value,
  )
})

watch(selectedChampionship, () => {
  divisionFilter.value = 'all'
})

const difficulty = (club: Club): { label: string; className: string } => {
  const budgetScore = club.budget / 2_000_000
  const strengthScore = club.rating + budgetScore - club.divisionId * 8

  if (strengthScore >= 115) {
    return {
      label: 'Легко',
      className: 'bg-emerald-100 text-emerald-800',
    }
  }

  if (strengthScore >= 82) {
    return {
      label: 'Нормально',
      className: 'bg-amber-100 text-amber-800',
    }
  }

  return {
    label: 'Сложно',
    className: 'bg-rose-100 text-rose-800',
  }
}

const selectClub = (clubId: string): void => {
  gameStore.startNewGame(selectedChampionship.value, clubId)
  void router.push('/dashboard')
}
</script>

<template>
  <section class="space-y-5">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-950">Выбор клуба</h1>

        <p class="mt-1 text-sm text-slate-600">
          {{ championship.description }}
        </p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row">
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Чемпионат

          <select
            v-model="selectedChampionship"
            class="h-10 rounded-md border border-slate-300 bg-white px-3"
          >
            <option v-for="option in championshipOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Дивизион

          <select
            v-model="divisionFilter"
            class="h-10 rounded-md border border-slate-300 bg-white px-3"
          >
            <option
              v-for="division in divisions"
              :key="String(division.value)"
              :value="division.value"
            >
              {{ division.label }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="club in filteredClubs"
        :key="club.id"
        class="rounded-lg border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <ClubBadge :club="club" size="lg" />

            <div>
              <h2 class="font-semibold text-slate-950">
                {{ club.name }}
              </h2>

              <div class="text-sm text-slate-500">
                {{ club.city }}
              </div>
            </div>
          </div>

          <span
            class="rounded-full px-2 py-1 text-xs font-semibold"
            :class="difficulty(club).className"
          >
            {{ difficulty(club).label }}
          </span>
        </div>

        <dl class="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div class="rounded-md bg-slate-50 p-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Дивизион</dt>

            <dd class="mt-1 font-semibold text-slate-800">
              {{ championship.divisionNames[club.divisionId] }}
            </dd>
          </div>

          <div class="rounded-md bg-slate-50 p-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Рейтинг</dt>

            <dd class="mt-1 font-semibold text-slate-800">
              {{ club.rating }}
            </dd>
          </div>

          <div class="rounded-md bg-slate-50 p-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">Бюджет</dt>

            <dd class="mt-1 font-semibold text-slate-800">
              {{ formatMoney(club.budget) }}
            </dd>
          </div>
        </dl>

        <Button class="mt-4 w-full" label="Выбрать клуб" @click="selectClub(club.id)" />
      </article>
    </div>
  </section>
</template>

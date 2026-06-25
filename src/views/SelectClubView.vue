<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { championships, getChampionshipClubs, type ChampionshipId } from '@/data/clubs'
import { clubProfilesById } from '@/data/clubDatabase'
import { useGameStore } from '@/stores/game/gameStore'
import type { Club } from '@/types/football'
import { formatMoney } from '@/utils/format'

import ClubBadge from '@/components/ui/ClubBadge.vue'
import IconSymbol from '@/components/ui/IconSymbol.vue'

interface ChampionshipOption {
  label: string
  value: ChampionshipId
}

interface DivisionOption {
  label: string
  value: number
}

interface BoardExpectation {
  title: string
  description: string
  tone: string
}

const gameStore = useGameStore()
const router = useRouter()

const selectedChampionship = ref<ChampionshipId>('russia')
const selectedDivisionId = ref<number>(1)
const selectedClubId = ref<string>('')

const championshipOptions: ChampionshipOption[] = [
  { label: 'Россия', value: 'russia' },
  { label: 'Испания', value: 'spain' },
  { label: 'Англия', value: 'england' },
  { label: 'Германия', value: 'germany' },
  { label: 'Франция', value: 'france' },
  { label: 'Италия', value: 'italy' },
]

const championship = computed(() => championships[selectedChampionship.value])
const clubs = computed(() => getChampionshipClubs(selectedChampionship.value))

const divisions = computed<DivisionOption[]>(() =>
  Object.entries(championship.value.divisionNames).map(([divisionId, name]) => ({
    label: name,
    value: Number(divisionId),
  })),
)

const divisionClubs = computed<Club[]>(() =>
  clubs.value.filter((club) => club.divisionId === selectedDivisionId.value),
)

const selectedClub = computed<Club>(() => {
  const club =
    divisionClubs.value.find((candidate) => candidate.id === selectedClubId.value) ??
    divisionClubs.value[0] ??
    clubs.value[0]

  return club as Club
})

const selectedClubProfile = computed(() => clubProfilesById[selectedClub.value.id])

const selectedClubIndex = computed(() =>
  Math.max(
    0,
    divisionClubs.value.findIndex((club) => club.id === selectedClub.value.id),
  ),
)

const selectedDivisionName = computed(
  () => championship.value.divisionNames[selectedClub.value.divisionId] ?? '',
)

const clubWorth = computed(() =>
  selectedClub.value.squad.reduce((sum, player) => sum + player.value, 0),
)

const stars = computed(() => Math.max(1, Math.min(5, Math.round(selectedClub.value.rating / 20))))

const stadiumName = computed(() => selectedClubProfile.value?.stadium?.name ?? 'Домашняя арена')

const stadiumDetails = computed(() => {
  const stadium = selectedClubProfile.value?.stadium
  if (!stadium?.capacity) {
    return selectedClub.value.city
  }

  return `${stadium.city}, ${stadium.capacity.toLocaleString('ru-RU')} мест`
})

const boardExpectation = (club: Club): BoardExpectation => {
  const budgetScore = club.budget / 2_000_000
  const strengthScore = club.rating + budgetScore - club.divisionId * 8

  if (club.divisionId === 1) {
    if (strengthScore >= 135) {
      return {
        title: 'Победа в чемпионате',
        description: 'Совет директоров ждет титул и доминирование в лиге.',
        tone: 'from-emerald-500/30 to-sky-500/20',
      }
    }

    if (strengthScore >= 112) {
      return {
        title: 'Борьба за верх таблицы',
        description: 'Нужно финишировать среди лидеров и держать высокий темп.',
        tone: 'from-cyan-500/30 to-emerald-500/15',
      }
    }

    if (strengthScore >= 92) {
      return {
        title: 'Крепкая середина',
        description: 'Ожидается стабильный сезон без затяжных спадов.',
        tone: 'from-amber-500/30 to-slate-500/20',
      }
    }

    return {
      title: 'Сохранить прописку',
      description: 'Главная задача - остаться в высшем дивизионе.',
      tone: 'from-rose-500/35 to-orange-500/20',
    }
  }

  if (strengthScore >= 108) {
    return {
      title: 'Выход в дивизион выше',
      description: 'Руководство ждет повышения в классе уже в этом сезоне.',
      tone: 'from-emerald-500/30 to-lime-500/20',
    }
  }

  if (strengthScore >= 82) {
    return {
      title: 'Борьба за повышение',
      description: 'Команда должна быть рядом с зоной продвижения.',
      tone: 'from-sky-500/30 to-cyan-500/15',
    }
  }

  return {
    title: 'Закрепиться в дивизионе',
    description: 'Приоритет - стабильность, развитие состава и безопасное место.',
    tone: 'from-slate-500/30 to-blue-500/20',
  }
}

const expectation = computed(() => boardExpectation(selectedClub.value))

const selectFirstClubInDivision = (): void => {
  selectedClubId.value = divisionClubs.value[0]?.id ?? clubs.value[0]?.id ?? ''
}

watch(
  selectedChampionship,
  () => {
    selectedDivisionId.value = divisions.value[0]?.value ?? 1
    selectFirstClubInDivision()
  },
  { immediate: true },
)

watch(selectedDivisionId, () => {
  selectFirstClubInDivision()
})

const selectClub = (clubId: string): void => {
  selectedClubId.value = clubId
}

const moveClub = (direction: -1 | 1): void => {
  if (!divisionClubs.value.length) {
    return
  }

  const nextIndex =
    (selectedClubIndex.value + direction + divisionClubs.value.length) % divisionClubs.value.length
  selectedClubId.value = divisionClubs.value[nextIndex]?.id ?? selectedClubId.value
}

const startGame = (): void => {
  gameStore.startNewGame(selectedChampionship.value, selectedClub.value.id)
  void router.push('/dashboard')
}
</script>

<template>
  <section class="mx-auto flex h-full max-w-[1500px] items-center overflow-auto">
    <div class="grid w-full gap-4 xl:grid-cols-[minmax(360px,0.86fr)_1.34fr]">
      <aside
        class="overflow-hidden rounded-2xl border border-cyan-300/25 bg-[#121820] text-white shadow-[0_24px_70px_rgba(8,19,29,0.22)]"
      >
        <div class="border-b border-white/10 p-5">
          <label class="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">
            Страна
          </label>
          <select
            v-model="selectedChampionship"
            class="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.08] px-3 text-sm font-black text-white outline-none transition focus:border-cyan-300"
          >
            <option
              v-for="option in championshipOptions"
              :key="option.value"
              class="bg-slate-950"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="p-5">
          <div
            class="mb-3 text-center text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200/70"
          >
            Клуб
          </div>

          <div
            class="relative rounded-2xl border border-cyan-300/50 bg-[#0f1420] px-4 py-5 shadow-[inset_0_0_35px_rgba(34,211,238,0.08)]"
          >
            <button
              type="button"
              class="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-cyan-400/20"
              @click="moveClub(-1)"
            >
              <IconSymbol name="chevronRight" class="h-4 w-4 rotate-180" />
            </button>

            <button
              type="button"
              class="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-cyan-400/20"
              @click="moveClub(1)"
            >
              <IconSymbol name="chevronRight" class="h-4 w-4" />
            </button>

            <div
              class="mx-auto flex min-h-[360px] max-w-[320px] flex-col items-center justify-center text-center"
            >
              <h1 class="text-2xl font-black uppercase tracking-wide">{{ selectedClub.name }}</h1>
              <ClubBadge
                :club="selectedClub"
                size="lg"
                class="mt-12 !h-36 !w-36 !rounded-xl text-4xl shadow-2xl"
              />
              <div class="mt-9 flex items-center gap-1 text-xl">
                <span
                  v-for="star in 5"
                  :key="star"
                  :class="star <= stars ? 'text-amber-300' : 'text-slate-600'"
                >
                  ★
                </span>
              </div>
            </div>
          </div>

          <select
            :value="selectedClub.id"
            class="mt-4 h-11 w-full rounded-lg border border-white/10 bg-white/[0.08] px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-300"
            @change="selectClub(($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="club in divisionClubs"
              :key="club.id"
              class="bg-slate-950"
              :value="club.id"
            >
              {{ club.name }}
            </option>
          </select>
        </div>

        <div class="border-t border-white/10 p-5">
          <label class="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">
            Дивизион
          </label>
          <select
            v-model="selectedDivisionId"
            class="mt-2 h-12 w-full rounded-lg border border-white/10 bg-white/[0.08] px-3 text-sm font-black text-white outline-none transition focus:border-cyan-300"
          >
            <option
              v-for="division in divisions"
              :key="division.value"
              class="bg-slate-950"
              :value="division.value"
            >
              {{ division.label }}
            </option>
          </select>
        </div>
      </aside>

      <div class="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <div class="grid gap-4">
          <article
            class="rounded-2xl bg-[#191825] p-6 text-white shadow-[0_18px_45px_rgba(10,18,30,0.18)]"
          >
            <div class="text-sm font-semibold text-slate-300">Город</div>
            <div class="mt-2 text-2xl font-black uppercase">{{ selectedClub.city }}</div>

            <div class="mt-7 border-t border-white/10 pt-5">
              <div class="text-sm font-semibold text-slate-300">Цвета клуба</div>
              <div class="mt-4 flex items-center gap-3">
                <span
                  class="h-14 w-14 rounded-xl border border-white/20 shadow-lg"
                  :style="{ backgroundColor: selectedClub.primaryColor }"
                ></span>
                <span
                  class="h-14 w-14 rounded-xl border border-white/20 shadow-lg"
                  :style="{ backgroundColor: selectedClub.secondaryColor }"
                ></span>
              </div>
            </div>
          </article>

          <article
            class="rounded-2xl bg-[#191825] p-6 text-white shadow-[0_18px_45px_rgba(10,18,30,0.18)]"
          >
            <div class="text-sm font-semibold text-slate-300">Стадион</div>
            <div class="mt-2 text-2xl font-black uppercase">{{ stadiumName }}</div>
            <div class="mt-1 text-sm font-semibold text-slate-400">{{ stadiumDetails }}</div>
          </article>
        </div>

        <div class="grid gap-4">
          <article
            class="rounded-2xl bg-[#191825] p-6 text-white shadow-[0_18px_45px_rgba(10,18,30,0.18)]"
          >
            <div class="grid gap-6 md:grid-cols-3">
              <div>
                <div class="text-sm font-semibold text-slate-300">Основан</div>
                <div class="mt-2 text-4xl font-black">
                  {{ selectedClubProfile?.historicalStats?.foundedYear ?? '—' }}
                </div>
              </div>
              <div>
                <div class="text-sm font-semibold text-slate-300">Рейтинг</div>
                <div class="mt-2 text-4xl font-black">{{ selectedClub.rating }}</div>
              </div>
              <div>
                <div class="text-sm font-semibold text-slate-300">Дивизион</div>
                <div class="mt-2 text-base font-black uppercase">{{ selectedDivisionName }}</div>
              </div>
            </div>

            <div class="my-6 h-px bg-white/10"></div>

            <div class="grid gap-5 md:grid-cols-3">
              <div>
                <div class="text-sm font-semibold text-slate-300">Стоимость клуба</div>
                <div class="mt-2 text-xl font-black">{{ formatMoney(clubWorth) }}</div>
              </div>
              <div>
                <div class="text-sm font-semibold text-slate-300">Трансферный бюджет</div>
                <div class="mt-2 text-xl font-black">{{ formatMoney(selectedClub.budget) }}</div>
              </div>
              <div>
                <div class="text-sm font-semibold text-slate-300">Состав</div>
                <div class="mt-2 text-xl font-black">{{ selectedClub.squad.length }} игроков</div>
              </div>
            </div>
          </article>

          <article
            class="rounded-2xl border border-white/10 bg-gradient-to-br p-6 text-white shadow-[0_18px_45px_rgba(10,18,30,0.18)]"
            :class="expectation.tone"
          >
            <div class="rounded-xl bg-slate-950/55 px-5 py-4 text-center backdrop-blur-sm">
              <div class="text-sm font-semibold text-slate-200">Ожидания руководства</div>
              <div class="mt-3 text-2xl font-black uppercase text-white">
                {{ expectation.title }}
              </div>
              <p class="mx-auto mt-3 max-w-xl text-sm font-semibold text-slate-200">
                {{ expectation.description }}
              </p>
            </div>
          </article>

          <Button class="h-12 w-full !font-black" label="Начать карьеру" @click="startGame" />
        </div>
      </div>
    </div>
  </section>
</template>

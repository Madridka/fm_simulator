<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { championships, getChampionshipClubs, type ChampionshipId } from '@/data/clubs'
import { clubProfilesById } from '@/data/clubDatabase'
import {
  getClubCompetitionId,
  getCompetitionNames,
  getCompetitionName,
} from '@/domain/competition/competitionIdentity'
import { useGameStore } from '@/stores/game/gameStore'
import type { ClubProfile } from '@/data/clubs/types'
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
  value: string
}

interface BoardExpectation {
  title: string
  description: string
  tone: string
}

// ЗАВИСИМОСТИ, НЕОБХОДИМЫЕ ДЛЯ СОЗДАНИЯ И ПЕРЕХОДА В НОВУЮ КАРЬЕРУ
const gameStore = useGameStore()
const router = useRouter()

// ТЕКУЩИЙ ВЫБОР ЧЕМПИОНАТА, ДИВИЗИОНА И КЛУБА
const selectedChampionship = ref<ChampionshipId>('russia')
const selectedCompetitionId = ref<string>('1')
const selectedClubId = ref<string>('')

// ФОРМИРУЕТ СПИСОК ДОСТУПНЫХ ЧЕМПИОНАТОВ
const championshipOptions = computed<ChampionshipOption[]>(() =>
  Object.values(championships).map((championship) => ({
    label: championship.name,
    value: championship.id,
  })),
)

// ВОЗВРАЩАЕТ ВЫБРАННЫЙ ЧЕМПИОНАТ
const championship = computed(() => championships[selectedChampionship.value])

// ВОЗВРАЩАЕТ КЛУБЫ ВЫБРАННОГО ЧЕМПИОНАТА
const clubs = computed(() => getChampionshipClubs(selectedChampionship.value))

// ФОРМИРУЕТ СПИСОК ДИВИЗИОНОВ
const divisions = computed<DivisionOption[]>(() =>
  Object.entries(getCompetitionNames(championship.value)).map(([divisionId, name]) => ({
    label: name,
    value: divisionId,
  })),
)

// ВОЗВРАЩАЕТ КЛУБЫ ВЫБРАННОГО ДИВИЗИОНА
const divisionClubs = computed<Club[]>(() =>
  clubs.value.filter((club) => getClubCompetitionId(club) === selectedCompetitionId.value),
)

// ВОЗВРАЩАЕТ ВЫБРАННЫЙ КЛУБ
const selectedClub = computed<Club>(() => {
  const club =
    divisionClubs.value.find((candidate) => candidate.id === selectedClubId.value) ??
    divisionClubs.value[0] ??
    clubs.value[0]

  return club as Club
})

// ОБЪЕДИНЯЕТ БАЗОВЫЙ И РАСШИРЕННЫЙ ПРОФИЛИ КЛУБА
const mergeProfile = (baseProfile: ClubProfile, overrideProfile?: ClubProfile): ClubProfile => ({
  ...baseProfile,
  ...overrideProfile,
  config: {
    ...baseProfile.config,
    ...overrideProfile?.config,
  },
})

// ВОЗВРАЩАЕТ ПРОФИЛЬ ВЫБРАННОГО КЛУБА
const selectedClubProfile = computed<ClubProfile | undefined>(() => {
  const championshipProfile = championship.value.clubProfiles.find(
    (profile) => profile.config.id === selectedClub.value.id,
  )
  const databaseProfile = clubProfilesById[selectedClub.value.id]

  if (championshipProfile) {
    return mergeProfile(championshipProfile, databaseProfile)
  }

  return databaseProfile
})

// ВОЗВРАЩАЕТ ИНДЕКС ВЫБРАННОГО КЛУБА
const selectedClubIndex = computed(() =>
  Math.max(
    0,
    divisionClubs.value.findIndex((club) => club.id === selectedClub.value.id),
  ),
)

// ВОЗВРАЩАЕТ НАЗВАНИЕ ВЫБРАННОГО ДИВИЗИОНА
const selectedDivisionName = computed(() =>
  getCompetitionName(championship.value, getClubCompetitionId(selectedClub.value)),
)

// РАССЧИТЫВАЕТ СТОИМОСТЬ СОСТАВА КЛУБА
const clubWorth = computed(() =>
  selectedClub.value.squad.reduce((sum, player) => sum + player.value, 0),
)

// РАССЧИТЫВАЕТ ЗВЁЗДНЫЙ РЕЙТИНГ КЛУБА
const stars = computed(() => Math.max(1, Math.min(5, Math.round(selectedClub.value.rating / 20))))

// ВОЗВРАЩАЕТ НАЗВАНИЕ СТАДИОНА
const stadiumName = computed(() => selectedClubProfile.value?.stadium?.name ?? '-')

// ФОРМИРУЕТ ОПИСАНИЕ СТАДИОНА
const stadiumDetails = computed(() => {
  const stadium = selectedClubProfile.value?.stadium
  if (!stadium) {
    return `Город: ${selectedClub.value.city}`
  }

  if (!stadium?.capacity) {
    return `${stadium.city}, вместимость уточняется`
  }

  return `${stadium.city}, ${stadium.capacity.toLocaleString('ru-RU')} мест`
})

// ВОЗВРАЩАЕТ ГОД ОСНОВАНИЯ КЛУБА
const foundedYear = computed(
  () => selectedClubProfile.value?.historicalStats?.foundedYear?.toString() ?? '-',
)

// ФОРМИРУЕТ КРАТКУЮ ИСТОРИЧЕСКУЮ СПРАВКУ
const historicalSummary = computed(() => {
  const stats = selectedClubProfile.value?.historicalStats
  if (!stats) {
    return 'История клуба уточняется'
  }

  const achievements = [
    typeof stats.domesticTitles === 'number' ? `чемпионств: ${stats.domesticTitles}` : undefined,
    typeof stats.domesticCups === 'number' ? `кубков: ${stats.domesticCups}` : undefined,
  ].filter((item): item is string => Boolean(item))

  return achievements.length ? achievements.join(', ') : 'Трофеи уточняются'
})

// ОПРЕДЕЛЯЕТ ОЖИДАНИЯ РУКОВОДСТВА ОТ КЛУБА
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

// ВОЗВРАЩАЕТ ОЖИДАНИЕ ДЛЯ ВЫБРАННОГО КЛУБА
const expectation = computed(() => boardExpectation(selectedClub.value))

// ВЫБИРАЕТ ПЕРВЫЙ КЛУБ В ДИВИЗИОНЕ
const selectFirstClubInDivision = (): void => {
  selectedClubId.value = divisionClubs.value[0]?.id ?? clubs.value[0]?.id ?? ''
}

// ОБНОВЛЯЕТ ДИВИЗИОН И КЛУБ ПРИ СМЕНЕ ЧЕМПИОНАТА
watch(
  selectedChampionship,
  () => {
    selectedCompetitionId.value = divisions.value[0]?.value ?? '1'
    selectFirstClubInDivision()
  },
  { immediate: true },
)

// ОБНОВЛЯЕТ КЛУБ ПРИ СМЕНЕ ДИВИЗИОНА
watch(selectedCompetitionId, () => {
  selectFirstClubInDivision()
})

// ВЫБИРАЕТ КЛУБ ПО ИДЕНТИФИКАТОРУ
const selectClub = (clubId: string): void => {
  selectedClubId.value = clubId
}

// ПЕРЕКЛЮЧАЕТ КЛУБ В КАРУСЕЛИ
const moveClub = (direction: -1 | 1): void => {
  if (!divisionClubs.value.length) {
    return
  }

  const nextIndex =
    (selectedClubIndex.value + direction + divisionClubs.value.length) % divisionClubs.value.length
  selectedClubId.value = divisionClubs.value[nextIndex]?.id ?? selectedClubId.value
}

// ЗАПУСКАЕТ НОВУЮ ИГРУ С ВЫБРАННЫМ КЛУБОМ
const startGame = (): void => {
  gameStore.startNewGame(selectedChampionship.value, selectedClub.value.id)
  void router.push('/dashboard')
}
</script>

<template>
  <!-- СТРАНИЦА ВЫБОРА КЛУБА -->
  <section class="mx-auto flex h-full w-full max-w-[1500px] items-start overflow-auto pb-4">
    <!-- ОСНОВНАЯ СЕТКА ВЫБОРА И ИНФОРМАЦИИ -->
    <div
      class="grid w-full gap-3 md:grid-cols-[minmax(300px,0.82fr)_1.18fr] lg:gap-4 xl:grid-cols-[minmax(360px,0.86fr)_1.34fr]"
    >
      <!-- ПАНЕЛЬ ВЫБОРА ЧЕМПИОНАТА ДИВИЗИОНА И КЛУБА -->
      <aside
        class="overflow-hidden rounded-xl border border-cyan-300/25 bg-[#121820] text-white shadow-[0_24px_70px_rgba(8,19,29,0.22)] sm:rounded-2xl"
      >
        <div class="border-b border-white/10 p-4 sm:p-5">
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

        <div class="p-4 sm:p-5">
          <div
            class="mb-3 text-center text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200/70"
          >
            Клуб
          </div>

          <div
            class="relative rounded-xl border border-cyan-300/50 bg-[#0f1420] px-3 py-4 shadow-[inset_0_0_35px_rgba(34,211,238,0.08)] sm:rounded-2xl sm:px-4 sm:py-5"
          >
            <button
              type="button"
              class="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-cyan-400/20 sm:left-3 sm:h-9 sm:w-9"
              @click="moveClub(-1)"
            >
              <IconSymbol name="chevronRight" class="h-4 w-4 rotate-180" />
            </button>

            <button
              type="button"
              class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-cyan-400/20 sm:right-3 sm:h-9 sm:w-9"
              @click="moveClub(1)"
            >
              <IconSymbol name="chevronRight" class="h-4 w-4" />
            </button>

            <div
              class="mx-auto flex min-h-[210px] max-w-[280px] flex-col items-center justify-center text-center sm:min-h-[280px] sm:max-w-[320px] lg:min-h-[330px] xl:min-h-[360px]"
            >
              <h1 class="max-w-full text-xl font-black uppercase tracking-wide sm:text-2xl">
                {{ selectedClub.name }}
              </h1>
              <ClubBadge
                :club="selectedClub"
                size="lg"
                class="mt-6 !h-24 !w-24 !rounded-xl text-3xl shadow-2xl sm:mt-9 sm:!h-32 sm:!w-32 sm:text-4xl xl:mt-12 xl:!h-36 xl:!w-36"
              />
              <div class="mt-5 flex items-center gap-1 text-lg sm:mt-8 sm:text-xl xl:mt-9">
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

        <div class="border-t border-white/10 p-4 sm:p-5">
          <label class="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200/70">
            Дивизион
          </label>
          <select
            v-model="selectedCompetitionId"
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

      <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ КЛУБЕ -->
      <div class="grid gap-3 lg:grid-cols-[0.82fr_1.18fr] lg:gap-4">
        <div class="grid gap-3 lg:gap-4">
          <!-- ГОРОД И ЦВЕТА КЛУБА -->
          <article
            class="rounded-xl bg-[#191825] p-4 text-white shadow-[0_18px_45px_rgba(10,18,30,0.18)] sm:p-6 lg:rounded-2xl"
          >
            <div class="text-sm font-semibold text-slate-300">Город</div>
            <div class="mt-2 text-xl font-black uppercase sm:text-2xl">{{ selectedClub.city }}</div>

            <div class="mt-5 border-t border-white/10 pt-4 sm:mt-7 sm:pt-5">
              <div class="text-sm font-semibold text-slate-300">Цвета клуба</div>
              <div class="mt-4 flex items-center gap-3">
                <span
                  class="h-12 w-12 rounded-xl border border-white/20 shadow-lg sm:h-14 sm:w-14"
                  :style="{ backgroundColor: selectedClub.primaryColor }"
                ></span>
                <span
                  class="h-12 w-12 rounded-xl border border-white/20 shadow-lg sm:h-14 sm:w-14"
                  :style="{ backgroundColor: selectedClub.secondaryColor }"
                ></span>
              </div>
            </div>
          </article>

          <!-- ИНФОРМАЦИЯ О СТАДИОНЕ -->
          <article
            class="rounded-xl bg-[#191825] p-4 text-white shadow-[0_18px_45px_rgba(10,18,30,0.18)] sm:p-6 lg:rounded-2xl"
          >
            <div class="text-sm font-semibold text-slate-300">Стадион</div>
            <div class="mt-2 text-xl font-black uppercase sm:text-2xl">{{ stadiumName }}</div>
            <div class="mt-1 text-sm font-semibold text-slate-400">{{ stadiumDetails }}</div>
          </article>
        </div>

        <div class="grid gap-3 lg:gap-4">
          <!-- ИСТОРИЯ И ФИНАНСОВЫЕ ПОКАЗАТЕЛИ -->
          <article
            class="rounded-xl bg-[#191825] p-4 text-white shadow-[0_18px_45px_rgba(10,18,30,0.18)] sm:p-6 lg:rounded-2xl"
          >
            <div class="grid gap-5 xl:grid-cols-3">
              <div>
                <div class="text-sm font-semibold text-slate-300">Основан</div>
                <div class="mt-2 text-3xl font-black sm:text-4xl">
                  {{ foundedYear }}
                </div>
                <div class="mt-1 text-sm font-semibold text-slate-400">
                  {{ historicalSummary }}
                </div>
              </div>
              <div>
                <div class="text-sm font-semibold text-slate-300">Рейтинг</div>
                <div class="mt-2 text-3xl font-black sm:text-4xl">{{ selectedClub.rating }}</div>
              </div>
              <div>
                <div class="text-sm font-semibold text-slate-300">Дивизион</div>
                <div class="mt-2 text-base font-black uppercase">{{ selectedDivisionName }}</div>
              </div>
            </div>

            <div class="my-6 h-px bg-white/10"></div>

            <div class="grid gap-5 xl:grid-cols-3">
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

          <!-- ОЖИДАНИЯ РУКОВОДСТВА -->
          <article
            class="rounded-xl border border-white/10 bg-gradient-to-br p-4 text-white shadow-[0_18px_45px_rgba(10,18,30,0.18)] sm:p-6 lg:rounded-2xl"
            :class="expectation.tone"
          >
            <div class="rounded-xl bg-slate-950/55 px-4 py-4 text-center backdrop-blur-sm sm:px-5">
              <div class="text-sm font-semibold text-slate-200">Ожидания руководства</div>
              <div class="mt-3 text-2xl font-black uppercase text-white">
                {{ expectation.title }}
              </div>
              <p class="mx-auto mt-3 max-w-xl text-sm font-semibold text-slate-200">
                {{ expectation.description }}
              </p>
            </div>
          </article>

          <!-- КНОПКА ЗАПУСКА КАРЬЕРЫ -->
          <Button class="h-12 w-full !font-black" label="Начать карьеру" @click="startGame" />
        </div>
      </div>
    </div>
  </section>
</template>

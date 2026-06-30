<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getSeasonMatchDate } from '@/domain/season/scheduleGenerator'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useGameStore } from '@/stores/game/gameStore'
import type { Club, Match } from '@/types/football'
import { formatDate } from '@/utils/format'

import ClubBadge from '@/components/ui/ClubBadge.vue'

interface CalendarCell {
  key: string
  dayNumber?: number
  isoDate?: string
  matches: Match[]
}

interface CalendarMonth {
  key: string
  title: string
  cells: CalendarCell[]
}

// ИСТОЧНИКИ МАТЧЕЙ И ДАННЫХ КЛУБОВ ДЛЯ КАЛЕНДАРЯ
const gameStore = useGameStore()
const clubStore = useClubStore()
// ТЕКУЩИЙ МЕСЯЦ, ОТКРЫТЫЙ В СЕЗОННОМ КАЛЕНДАРЕ
const activeMonthIndex = ref(0)

// ЛОКАЛИЗОВАННЫЕ ПОДПИСИ КАЛЕНДАРНОЙ СЕТКИ
const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const monthNames = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
]

// ФОРМИРУЕТ СПИСОК МАТЧЕЙ ВЫБРАННОГО КЛУБА
const userMatches = computed<Match[]>(() => {
  const game = gameStore.game
  if (!game) {
    return []
  }
  return game.matches
    .filter(
      (match) =>
        match.homeClubId === game.selectedClubId || match.awayClubId === game.selectedClubId,
    )
    .sort(
      (left, right) =>
        matchDate(left).localeCompare(matchDate(right)) || left.id.localeCompare(right.id),
    )
})

// ДОБАВЛЯЕТ ВЕДУЩИЙ НОЛЬ К ЧИСЛУ
const pad = (value: number): string => String(value).padStart(2, '0')

// СОБИРАЕТ ДАТУ В ФОРМАТЕ ISO ИЗ ОТДЕЛЬНЫХ ЧАСТЕЙ
const isoFromParts = (year: number, monthIndex: number, day: number): string => {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

// ПРЕОБРАЗУЕТ ISO-ДАТУ В ОБЪЕКТ DATE
const dateFromIso = (isoDate: string): Date => new Date(`${isoDate}T12:00:00`)

// ВОЗВРАЩАЕТ ДАТУ ПРОВЕДЕНИЯ МАТЧА
const matchDate = (match: Match): string =>
  match.date ?? getSeasonMatchDate(match.season, match.order)

// ОПРЕДЕЛЯЕТ ТЕКУЩУЮ ДАТУ ДЛЯ КАЛЕНДАРЯ
const currentCalendarDate = computed<string | undefined>(() => {
  const nextMatch = gameStore.nextMatch
  if (nextMatch) {
    return matchDate(nextMatch)
  }

  const lastMatch = userMatches.value[userMatches.value.length - 1]
  return lastMatch ? matchDate(lastMatch) : undefined
})

// ФОРМИРУЕТ ДИАПАЗОН МЕСЯЦЕВ МЕЖДУ ДВУМЯ ДАТАМИ
const monthsBetween = (firstDate: Date, lastDate: Date): Date[] => {
  const months: Date[] = []
  const cursor = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1, 12)
  const end = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1, 12)

  while (cursor <= end) {
    months.push(new Date(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

// СТРОИТ КАЛЕНДАРНЫЕ СЕТКИ ДЛЯ ВСЕХ МЕСЯЦЕВ СЕЗОНА
const calendarMonths = computed<CalendarMonth[]>(() => {
  if (!userMatches.value.length) {
    return []
  }

  const matchesByDate = userMatches.value.reduce<Record<string, Match[]>>((result, match) => {
    const date = matchDate(match)
    result[date] = [...(result[date] ?? []), match]
    return result
  }, {})

  const firstMatch = userMatches.value[0]
  const lastMatch = userMatches.value[userMatches.value.length - 1]
  if (!firstMatch || !lastMatch) {
    return []
  }

  const firstDate = dateFromIso(matchDate(firstMatch))
  const lastDate = dateFromIso(matchDate(lastMatch))

  return monthsBetween(firstDate, lastDate).map((monthDate) => {
    const year = monthDate.getFullYear()
    const monthIndex = monthDate.getMonth()
    const firstDay = new Date(year, monthIndex, 1, 12)
    const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate()
    const offset = (firstDay.getDay() + 6) % 7
    const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7
    const cells: CalendarCell[] = Array.from({ length: cellCount }, (_, index) => {
      const dayNumber = index - offset + 1
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return { key: `${year}-${monthIndex}-empty-${index}`, matches: [] }
      }

      const isoDate = isoFromParts(year, monthIndex, dayNumber)
      return {
        key: isoDate,
        dayNumber,
        isoDate,
        matches: matchesByDate[isoDate] ?? [],
      }
    })

    return {
      key: `${year}-${monthIndex}`,
      title: `${monthNames[monthIndex]} ${year}`,
      cells,
    }
  })
})

// ВОЗВРАЩАЕТ АКТИВНЫЙ МЕСЯЦ КАЛЕНДАРЯ
const activeMonth = computed<CalendarMonth | undefined>(
  () => calendarMonths.value[activeMonthIndex.value],
)

// ВОЗВРАЩАЕТ ДНИ АКТИВНОГО МЕСЯЦА С МАТЧАМИ
const activeMonthMatchCells = computed<CalendarCell[]>(() =>
  (activeMonth.value?.cells ?? []).filter((cell) => cell.matches.length > 0),
)

// ФОРМАТИРУЕТ ДАТУ ДЛЯ МОБИЛЬНОГО СПИСКА МАТЧЕЙ
const mobileDateLabel = (cell: CalendarCell): string =>
  cell.isoDate ? formatDate(cell.isoDate) : ''

// СИНХРОНИЗИРУЕТ АКТИВНЫЙ МЕСЯЦ С ТЕКУЩИМ МАТЧЕМ
watch(
  calendarMonths,
  (months) => {
    if (!months.length) {
      activeMonthIndex.value = 0
      return
    }

    const currentDate = currentCalendarDate.value
    const currentIndex = currentDate
      ? months.findIndex((month) =>
          month.cells.some((cell) => cell.isoDate?.slice(0, 7) === currentDate.slice(0, 7)),
        )
      : 0

    activeMonthIndex.value = Math.max(0, currentIndex === -1 ? 0 : currentIndex)
  },
  { immediate: true },
)

// ПЕРЕКЛЮЧАЕТ КАЛЕНДАРЬ НА СОСЕДНИЙ МЕСЯЦ
const moveMonth = (direction: -1 | 1): void => {
  activeMonthIndex.value = Math.min(
    Math.max(activeMonthIndex.value + direction, 0),
    Math.max(calendarMonths.value.length - 1, 0),
  )
}

// ОПРЕДЕЛЯЕТ ИДЕНТИФИКАТОР СОПЕРНИКА В МАТЧЕ
const opponentId = (match: Match): string => {
  const game = gameStore.game
  if (!game) {
    return match.awayClubId
  }
  return match.homeClubId === game.selectedClubId ? match.awayClubId : match.homeClubId
}

// ВОЗВРАЩАЕТ КЛУБ СОПЕРНИКА
const opponentClub = (match: Match): Club => {
  const club = clubStore.getClubById(opponentId(match))
  if (!club) {
    throw new Error(`Opponent club not found for match ${match.id}`)
  }
  return club
}

// ФОРМАТИРУЕТ СЧЁТ МАТЧА
const score = (match: Match): string => {
  if (!match.result) {
    return '-'
  }
  return `${match.result.homeGoals}:${match.result.awayGoals}`
}

// ПРОВЕРЯЕТ, ЯВЛЯЕТСЯ ЛИ МАТЧ СЛЕДУЮЩИМ
const isNextMatch = (match: Match): boolean => gameStore.nextMatch?.id === match.id

// ПРОВЕРЯЕТ, МОЖНО ЛИ ОТКРЫТЬ МАТЧ
const canOpenMatch = (match: Match): boolean => match.status === 'played' || isNextMatch(match)

// ОТКРЫВАЕТ ДОСТУПНЫЙ МАТЧ
const openMatch = (match: Match): void => {
  if (canOpenMatch(match)) {
    gameStore.openMatch(match.id)
  }
}

// ПРОВЕРЯЕТ, ОТНОСИТСЯ ЛИ ДЕНЬ К ПРОШЕДШЕМУ ПЕРИОДУ
const isPastDay = (cell: CalendarCell): boolean => {
  if (!cell.isoDate || !currentCalendarDate.value) {
    return false
  }

  return gameStore.nextMatch
    ? cell.isoDate < currentCalendarDate.value
    : cell.isoDate <= currentCalendarDate.value
}

// ФОРМИРУЕТ КЛАССЫ ОФОРМЛЕНИЯ КАЛЕНДАРНОЙ ЯЧЕЙКИ
const calendarCellClasses = (cell: CalendarCell): Record<string, boolean> => ({
  'bg-[#e2ece5]/45': !cell.dayNumber,
  'bg-slate-200/75 text-slate-500': isPastDay(cell),
  'bg-[#fbfdf9]': Boolean(cell.dayNumber && cell.matches.length && !isPastDay(cell)),
  'bg-white/70': Boolean(cell.dayNumber && !cell.matches.length && !isPastDay(cell)),
})

// ВОЗВРАЩАЕТ НАЗВАНИЕ ТИПА МАТЧА
const matchTypeLabel = (match: Match): string =>
  match.type === 'league' ? `Тур ${match.round}` : 'Кубок'

// ВОЗВРАЩАЕТ ПРИЗНАК ДОМАШНЕГО ИЛИ ВЫЕЗДНОГО МАТЧА
const homeAwayLabel = (match: Match): string => {
  const game = gameStore.game
  if (!game) {
    return ''
  }
  return match.homeClubId === game.selectedClubId ? 'дом' : 'выезд'
}
</script>

<template>
  <!-- СТРАНИЦА КАЛЕНДАРЯ МАТЧЕЙ -->
  <section v-if="gameStore.game" class="flex flex-col gap-5 xl:h-full xl:overflow-hidden">
    <!-- ЗАГОЛОВОК И НАВИГАЦИЯ ПО МЕСЯЦАМ -->
    <div
      class="flex shrink-0 flex-col gap-3 border-l-4 border-l-emerald-700 pl-3.5 md:flex-row md:items-end md:justify-between"
    >
      <div>
        <h1 class="text-2xl font-bold text-slate-950">Календарь</h1>
        <p class="mt-1 text-sm text-slate-600">
          Сезон начинается в сентябре. Матчи идут по субботам, следующий доступный матч подсвечен.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="activeMonthIndex === 0"
          @click="moveMonth(-1)"
        >
          <i class="pi pi-angle-left" />
        </button>
        <div
          class="min-w-40 rounded-lg bg-slate-950 px-4 py-2 text-center text-sm font-black text-white"
        >
          {{ activeMonth?.title ?? 'Сезон' }}
        </div>
        <button
          type="button"
          class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="activeMonthIndex >= calendarMonths.length - 1"
          @click="moveMonth(1)"
        >
          <i class="pi pi-angle-right" />
        </button>
      </div>
    </div>

    <!-- КАЛЕНДАРЬ АКТИВНОГО МЕСЯЦА -->
    <div class="xl:min-h-0 xl:flex-1 xl:overflow-hidden">
      <article
        v-if="activeMonth"
        class="flex flex-col overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:h-full xl:min-h-0"
      >
        <!-- ЗАГОЛОВОК АКТИВНОГО МЕСЯЦА -->
        <div
          class="shrink-0 bg-[linear-gradient(135deg,#14532d,#20342e)] px-4 py-3.5 font-extrabold text-slate-50"
        >
          {{ activeMonth.title }}
        </div>
        <!-- МОБИЛЬНЫЙ СПИСОК МАТЧЕЙ -->
        <div v-if="activeMonthMatchCells.length" class="grid gap-2.5 bg-[#f5f8f6] p-3 md:hidden">
          <section
            v-for="cell in activeMonthMatchCells"
            :key="`mobile-${cell.key}`"
            class="overflow-hidden rounded-lg border border-[#dce8dd] bg-white"
          >
            <div
              class="border-b border-[#e2ebe5] bg-[#eef6ef] px-3 py-2 text-xs font-extrabold capitalize text-[#3f5f51]"
            >
              {{ mobileDateLabel(cell) }}
            </div>
            <component
              :is="canOpenMatch(match) ? RouterLink : 'div'"
              v-for="match in cell.matches"
              :key="match.id"
              :to="canOpenMatch(match) ? '/match' : undefined"
              class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 text-[#18312b] transition [&+&]:border-t [&+&]:border-[#e2ebe5]"
              :class="{
                'bg-slate-50 text-slate-600': match.status === 'played',
                'bg-emerald-50 ring-1 ring-inset ring-emerald-500': isNextMatch(match),
                'cursor-not-allowed bg-slate-100 text-slate-400': !canOpenMatch(match),
              }"
              @click="openMatch(match)"
            >
              <ClubBadge :club="opponentClub(match)" size="sm" />
              <div class="min-w-0">
                <div class="truncate text-sm font-bold">
                  {{ opponentClub(match).name }}
                </div>
                <div class="mt-0.5 text-xs opacity-70">
                  {{ matchTypeLabel(match) }} · {{ homeAwayLabel(match) }}
                </div>
              </div>
              <div class="text-base font-black">{{ score(match) }}</div>
            </component>
          </section>
        </div>
        <!-- МОБИЛЬНОЕ СОСТОЯНИЕ БЕЗ МАТЧЕЙ -->
        <div v-else class="p-6 text-center text-sm text-slate-500 md:hidden">
          В этом месяце матчей нет.
        </div>

        <!-- ЗАГОЛОВКИ ДНЕЙ НЕДЕЛИ -->
        <div class="hidden shrink-0 grid-cols-7 border-b border-[#d9e4dc] bg-[#eef6ef] md:grid">
          <div
            v-for="day in weekDays"
            :key="day"
            class="px-2 py-2 text-center text-xs font-extrabold uppercase text-[#3f5f51]"
          >
            {{ day }}
          </div>
        </div>
        <!-- ДЕСКТОПНАЯ СЕТКА КАЛЕНДАРЯ -->
        <div
          class="hidden grid-cols-7 md:grid md:auto-rows-[140px] xl:min-h-0 xl:flex-1 xl:auto-rows-fr"
        >
          <div
            v-for="cell in activeMonth.cells"
            :key="cell.key"
            class="min-h-0 overflow-hidden border-b border-r border-[#e2ebe5] p-2 [&:nth-child(7n)]:border-r-0"
            :class="calendarCellClasses(cell)"
          >
            <div v-if="cell.dayNumber" class="mb-1.5 text-xs font-extrabold text-slate-700">
              {{ cell.dayNumber }}
            </div>

            <div class="max-h-[calc(100%-22px)] overflow-auto pr-1">
              <div v-for="match in cell.matches" :key="match.id" class="min-w-0 [&+&]:mt-1.5">
                <component
                  :is="canOpenMatch(match) ? RouterLink : 'div'"
                  :to="canOpenMatch(match) ? '/match' : undefined"
                  class="flex min-w-0 items-center gap-2 rounded-lg border border-[#dce8dd] bg-white p-[7px] text-[#18312b] transition hover:-translate-y-px hover:border-emerald-300 hover:shadow-[0_10px_22px_rgba(22,101,52,0.12)]"
                  :class="{
                    'bg-slate-50 text-slate-600': match.status === 'played',
                    'border-emerald-500 bg-emerald-50': isNextMatch(match),
                    'cursor-not-allowed bg-slate-100 text-slate-400 hover:translate-y-0 hover:border-[#dce8dd] hover:shadow-none':
                      !canOpenMatch(match),
                  }"
                  @click="openMatch(match)"
                >
                  <ClubBadge :club="opponentClub(match)" size="sm" />
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold">
                      {{ opponentClub(match).shortName }}
                    </div>
                    <div class="text-xs opacity-75">
                      {{ matchTypeLabel(match) }} · {{ homeAwayLabel(match) }}
                    </div>
                  </div>
                  <div class="ml-auto text-sm font-black">{{ score(match) }}</div>
                </component>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

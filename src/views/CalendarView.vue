<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ClubBadge from '@/components/ui/ClubBadge.vue'
import { getSeasonMatchDate } from '@/domain/season/scheduleGenerator'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useGameStore } from '@/stores/game/gameStore'
import type { Club, Match } from '@/types/football'

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

const gameStore = useGameStore()
const clubStore = useClubStore()

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

const pad = (value: number): string => String(value).padStart(2, '0')

const isoFromParts = (year: number, monthIndex: number, day: number): string => {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

const dateFromIso = (isoDate: string): Date => new Date(`${isoDate}T12:00:00`)

const matchDate = (match: Match): string =>
  match.date ?? getSeasonMatchDate(match.season, match.order)

const currentCalendarDate = computed<string | undefined>(() => {
  const nextMatch = gameStore.nextMatch
  if (nextMatch) {
    return matchDate(nextMatch)
  }

  const lastMatch = userMatches.value[userMatches.value.length - 1]
  return lastMatch ? matchDate(lastMatch) : undefined
})

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

const opponentId = (match: Match): string => {
  const game = gameStore.game
  if (!game) {
    return match.awayClubId
  }
  return match.homeClubId === game.selectedClubId ? match.awayClubId : match.homeClubId
}

const opponentClub = (match: Match): Club => {
  const club = clubStore.getClubById(opponentId(match))
  if (!club) {
    throw new Error(`Opponent club not found for match ${match.id}`)
  }
  return club
}

const score = (match: Match): string => {
  if (!match.result) {
    return '-'
  }
  return `${match.result.homeGoals}:${match.result.awayGoals}`
}

const isNextMatch = (match: Match): boolean => gameStore.nextMatch?.id === match.id

const canOpenMatch = (match: Match): boolean => match.status === 'played' || isNextMatch(match)

const openMatch = (match: Match): void => {
  if (canOpenMatch(match)) {
    gameStore.openMatch(match.id)
  }
}

const isPastDay = (cell: CalendarCell): boolean => {
  if (!cell.isoDate || !currentCalendarDate.value) {
    return false
  }

  return gameStore.nextMatch
    ? cell.isoDate < currentCalendarDate.value
    : cell.isoDate <= currentCalendarDate.value
}

const calendarCellClasses = (cell: CalendarCell): Record<string, boolean> => ({
  'bg-[#e2ece5]/45': !cell.dayNumber,
  'bg-slate-200/75 text-slate-500': isPastDay(cell),
  'bg-[#fbfdf9]': Boolean(cell.dayNumber && cell.matches.length && !isPastDay(cell)),
  'bg-white/70': Boolean(cell.dayNumber && !cell.matches.length && !isPastDay(cell)),
})

const matchTypeLabel = (match: Match): string =>
  match.type === 'league' ? `Тур ${match.round}` : 'Кубок'

const homeAwayLabel = (match: Match): string => {
  const game = gameStore.game
  if (!game) {
    return ''
  }
  return match.homeClubId === game.selectedClubId ? 'дом' : 'выезд'
}
</script>

<template>
  <section v-if="gameStore.game" class="space-y-5">
    <div class="border-l-4 border-l-emerald-700 pl-3.5">
      <h1 class="text-2xl font-bold text-slate-950">Календарь</h1>
      <p class="mt-1 text-sm text-slate-600">
        Сезон начинается в сентябре. Матчи идут по субботам, следующий доступный матч подсвечен.
      </p>
    </div>

    <div class="grid gap-5 xl:grid-cols-2">
      <article
        v-for="month in calendarMonths"
        :key="month.key"
        class="overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
      >
        <div
          class="bg-[linear-gradient(135deg,#14532d,#20342e)] px-4 py-3.5 font-extrabold text-slate-50"
        >
          {{ month.title }}
        </div>
        <div class="grid grid-cols-7 border-b border-[#d9e4dc] bg-[#eef6ef]">
          <div
            v-for="day in weekDays"
            :key="day"
            class="px-2 py-2 text-center text-xs font-extrabold uppercase text-[#3f5f51]"
          >
            {{ day }}
          </div>
        </div>
        <div class="grid grid-cols-7">
          <div
            v-for="cell in month.cells"
            :key="cell.key"
            class="min-h-28 border-b border-r border-[#e2ebe5] p-2 [&:nth-child(7n)]:border-r-0"
            :class="calendarCellClasses(cell)"
          >
            <div v-if="cell.dayNumber" class="mb-1.5 text-xs font-extrabold text-slate-700">
              {{ cell.dayNumber }}
            </div>

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
      </article>
    </div>
  </section>
</template>

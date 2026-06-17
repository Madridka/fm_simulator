<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ClubBadge from '@/components/ClubBadge.vue'
import { getSeasonMatchDate } from '@/domain/season/scheduleGenerator'
import { useClubStore } from '@/stores/clubStore'
import { useGameStore } from '@/stores/gameStore'
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
    <div class="page-heading">
      <h1 class="text-2xl font-bold text-slate-950">Календарь</h1>
      <p class="mt-1 text-sm text-slate-600">
        Сезон начинается в сентябре. Матчи идут по субботам, следующий доступный матч подсвечен.
      </p>
    </div>

    <div class="grid gap-5 xl:grid-cols-2">
      <article
        v-for="month in calendarMonths"
        :key="month.key"
        class="calendar-month surface overflow-hidden"
      >
        <div class="calendar-month-title">
          {{ month.title }}
        </div>
        <div class="calendar-weekdays">
          <div v-for="day in weekDays" :key="day">{{ day }}</div>
        </div>
        <div class="calendar-grid">
          <div
            v-for="cell in month.cells"
            :key="cell.key"
            class="calendar-cell"
            :class="{
              'calendar-cell-empty': !cell.dayNumber,
              'calendar-cell-match': cell.matches.length,
            }"
          >
            <div v-if="cell.dayNumber" class="calendar-day-number">{{ cell.dayNumber }}</div>

            <div v-for="match in cell.matches" :key="match.id" class="calendar-match">
              <component
                :is="canOpenMatch(match) ? RouterLink : 'div'"
                :to="canOpenMatch(match) ? `/match/${match.id}` : undefined"
                class="calendar-match-link"
                :class="{
                  'calendar-match-played': match.status === 'played',
                  'calendar-match-next': isNextMatch(match),
                  'calendar-match-locked': !canOpenMatch(match),
                }"
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

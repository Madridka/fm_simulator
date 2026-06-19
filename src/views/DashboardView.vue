<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ClubBadge from '@/components/ClubBadge.vue'
import { useClubStore } from '@/stores/clubs/clubsStore'
import { useCompetitionStore } from '@/stores/competitionStore'
import { useGameStore } from '@/stores/gameStore'
import type { Club, Match } from '@/types/football'
import { formatMoney } from '@/utils/format'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()

const club = computed(() => gameStore.selectedClub)
const divisionName = computed(() =>
  club.value ? clubStore.getDivisionName(club.value.divisionId) : '',
)
const leagueRows = computed(() =>
  club.value ? (competitionStore.leagueTables[club.value.divisionId] ?? []) : [],
)

const userMatches = computed(() => {
  const game = gameStore.game
  if (!game) return []
  return game.matches.filter(
    (match) => match.homeClubId === game.selectedClubId || match.awayClubId === game.selectedClubId,
  )
})

const upcomingMatches = computed(() =>
  userMatches.value
    .filter((match) => match.status === 'scheduled')
    .sort((left, right) => left.order - right.order)
    .slice(0, 6),
)

const recentResults = computed(() =>
  userMatches.value
    .filter((match) => match.status === 'played')
    .sort((left, right) => right.order - left.order)
    .slice(0, 6),
)

const clubById = (clubId: string): Club | undefined => clubStore.getClubById(clubId)

const opponent = (match: Match): Club | undefined => {
  const game = gameStore.game
  if (!game) return undefined
  return clubById(match.homeClubId === game.selectedClubId ? match.awayClubId : match.homeClubId)
}

const matchDate = (match: Match): string => {
  const date = new Date(`${match.date}T12:00:00`)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
    .format(date)
    .replace('.', '')
}

const matchCompetition = (match: Match): string =>
  match.type === 'league' ? `${match.round} тур` : 'Кубок'

const venue = (match: Match): string =>
  match.homeClubId === gameStore.game?.selectedClubId ? 'Дома' : 'В гостях'

const resultData = (match: Match): { letter: string; score: string; tone: string } => {
  const game = gameStore.game
  if (!game || !match.result) return { letter: '—', score: '—', tone: 'slate' }
  const isHome = match.homeClubId === game.selectedClubId
  const own = isHome ? match.result.homeGoals : match.result.awayGoals
  const rival = isHome ? match.result.awayGoals : match.result.homeGoals
  if (own > rival || match.result.winnerClubId === game.selectedClubId) {
    return { letter: 'В', score: `${own}:${rival}`, tone: 'emerald' }
  }
  if (own === rival) return { letter: 'Н', score: `${own}:${rival}`, tone: 'amber' }
  return { letter: 'П', score: `${own}:${rival}`, tone: 'rose' }
}

const openMatch = (match: Match): void => {
  gameStore.openMatch(match.id)
}
</script>

<template>
  <section v-if="club && gameStore.game" class="mx-auto max-w-[1600px] space-y-5">
    <article
      class="relative isolate overflow-hidden rounded-2xl bg-[#14241f] text-white shadow-[0_22px_55px_rgba(15,42,32,0.18)]"
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
      <div class="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:p-8">
        <div class="flex items-center gap-5">
          <ClubBadge
            :club="club"
            size="lg"
            class="shadow-[0_14px_35px_rgba(0,0,0,0.25)] ring-4 ring-white/10"
          />
          <div>
            <div
              class="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200/70"
            >
              <span>{{ divisionName }}</span
              ><span class="h-1 w-1 rounded-full bg-emerald-300/50"></span
              ><span>{{ club.city }}</span>
            </div>
            <h1 class="text-2xl font-black tracking-tight sm:text-3xl">{{ club.name }}</h1>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-2 sm:gap-3">
          <div
            class="min-w-24 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur sm:min-w-28 sm:px-4"
          >
            <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">Место</div>
            <div class="mt-1 text-xl font-black">
              {{ competitionStore.selectedClubRow?.position ?? '—'
              }}<span class="text-xs text-slate-400"> / {{ leagueRows.length }}</span>
            </div>
          </div>
          <div
            class="min-w-24 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur sm:min-w-28 sm:px-4"
          >
            <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">Бюджет</div>
            <div class="mt-1 truncate text-lg font-black text-emerald-300">
              {{ formatMoney(club.budget) }}
            </div>
          </div>
          <div
            class="min-w-24 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur sm:min-w-28 sm:px-4"
          >
            <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Рейтинг
            </div>
            <div class="mt-1 flex items-baseline gap-1 text-xl font-black">
              {{ club.rating }}<span class="text-xs text-slate-400">/ 100</span>
            </div>
          </div>
        </div>
      </div>
      <div
        class="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 bg-black/10 px-5 py-3 text-xs font-semibold text-slate-300 sm:px-7 lg:px-8"
      >
        <span
          >Кубок: <strong class="text-white">{{ competitionStore.cupProgress }}</strong></span
        >
        <span
          >Сезон: <strong class="text-white">{{ gameStore.game.season }}</strong></span
        >
        <button
          v-if="gameStore.seasonCanFinish"
          type="button"
          class="ml-auto rounded-lg bg-emerald-400 px-3 py-1.5 font-black text-emerald-950"
          @click="gameStore.finishCurrentSeason()"
        >
          Завершить сезон
        </button>
      </div>
    </article>

    <div class="grid gap-5 xl:grid-cols-[1.08fr_0.92fr_0.92fr]">
      <article
        class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)]"
      >
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
              {{ divisionName }}
            </div>
            <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">Таблица лиги</h2>
          </div>
          <RouterLink
            to="/league"
            class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-emerald-100 hover:text-emerald-800"
            >Вся таблица</RouterLink
          >
        </header>
        <div class="overflow-x-auto px-3 pb-3">
          <table class="w-full min-w-[390px] border-collapse text-left">
            <thead>
              <tr class="text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th class="px-2 py-3">#</th>
                <th class="px-2 py-3">Клуб</th>
                <th class="px-2 py-3 text-center">И</th>
                <th class="px-2 py-3 text-center">М</th>
                <th class="px-2 py-3 text-right">О</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in leagueRows"
                :key="row.clubId"
                class="border-t border-slate-100 text-sm"
                :class="
                  row.clubId === club.id ? 'bg-emerald-50 text-emerald-950' : 'text-slate-600'
                "
              >
                <td class="w-9 px-2 py-2.5 font-black">{{ row.position }}</td>
                <td class="px-2 py-2.5">
                  <div class="flex items-center gap-2">
                    <ClubBadge
                      v-if="clubById(row.clubId)"
                      :club="clubById(row.clubId)!"
                      size="sm"
                      class="!h-6 !w-6 !rounded text-[7px]"
                    /><span class="max-w-36 truncate font-bold">{{
                      clubById(row.clubId)?.shortName
                    }}</span>
                  </div>
                </td>
                <td class="px-2 py-2.5 text-center font-semibold">{{ row.played }}</td>
                <td class="px-2 py-2.5 text-center text-xs font-semibold">
                  {{ row.goalsFor }}–{{ row.goalsAgainst }}
                </td>
                <td class="px-2 py-2.5 text-right font-black text-slate-950">{{ row.points }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article
        class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)]"
      >
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">Расписание</h2>
          </div>
          <RouterLink
            to="/calendar"
            class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-amber-100 hover:text-amber-800"
            >Календарь</RouterLink
          >
        </header>
        <div v-if="upcomingMatches.length" class="divide-y divide-slate-100 px-4">
          <component
            :is="index === 0 ? RouterLink : 'div'"
            v-for="(match, index) in upcomingMatches"
            :key="match.id"
            :to="index === 0 ? '/match' : undefined"
            class="group flex items-center gap-3 px-1 py-3.5"
            @click="index === 0 && openMatch(match)"
          >
            <div class="w-10 shrink-0 text-center">
              <div class="text-sm font-black text-slate-900">
                {{ matchDate(match).split(' ')[0] }}
              </div>
              <div class="text-[9px] font-black uppercase text-slate-400">
                {{ matchDate(match).split(' ')[1] }}
              </div>
            </div>
            <ClubBadge v-if="opponent(match)" :club="opponent(match)!" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-extrabold text-slate-900">
                {{ opponent(match)?.name }}
              </div>
              <div class="mt-0.5 text-[11px] font-semibold text-slate-400">
                {{ matchCompetition(match) }} · {{ venue(match) }}
              </div>
            </div>
            <span
              v-if="index === 0"
              class="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700 transition group-hover:translate-x-0.5"
              ><svg
                class="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="m9 18 6-6-6-6" /></svg
            ></span>
          </component>
        </div>
        <div v-else class="p-8 text-center text-sm font-semibold text-slate-400">
          Матчей не осталось.
        </div>
      </article>

      <article
        class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)]"
      >
        <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div class="text-[10px] font-black uppercase tracking-[0.14em] text-sky-600">
              Форма команды
            </div>
            <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">
              Последние результаты
            </h2>
          </div>
          <span class="text-xs font-bold text-slate-400">{{ recentResults.length }} матчей</span>
        </header>
        <div v-if="recentResults.length" class="divide-y divide-slate-100 px-4">
          <RouterLink
            v-for="match in recentResults"
            :key="match.id"
            to="/match"
            class="group flex items-center gap-3 px-1 py-3.5"
            @click="openMatch(match)"
          >
            <span
              class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black"
              :class="{
                'bg-emerald-100 text-emerald-700': resultData(match).tone === 'emerald',
                'bg-amber-100 text-amber-700': resultData(match).tone === 'amber',
                'bg-rose-100 text-rose-700': resultData(match).tone === 'rose',
              }"
              >{{ resultData(match).letter }}</span
            >
            <ClubBadge v-if="opponent(match)" :club="opponent(match)!" size="sm" />
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-extrabold text-slate-900">
                {{ opponent(match)?.shortName }}
              </div>
              <div class="mt-0.5 text-[11px] font-semibold text-slate-400">
                {{ matchCompetition(match) }} · {{ venue(match) }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-base font-black text-slate-950">{{ resultData(match).score }}</div>
              <div class="text-[9px] font-bold uppercase text-slate-400">
                {{ matchDate(match) }}
              </div>
            </div>
          </RouterLink>
        </div>
        <div v-else class="flex min-h-64 flex-col items-center justify-center p-8 text-center">
          <span class="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-xl"
            >⚽</span
          >
          <p class="mt-3 text-sm font-bold text-slate-500">Сезон только начинается</p>
          <p class="mt-1 text-xs text-slate-400">Здесь появятся сыгранные матчи.</p>
        </div>
      </article>
    </div>
  </section>
</template>

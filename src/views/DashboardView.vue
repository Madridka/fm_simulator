<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ClubBadge from '@/components/ClubBadge.vue'
import { divisionNames } from '@/config/gameConfig'
import { useClubStore } from '@/stores/clubStore'
import { useCompetitionStore } from '@/stores/competitionStore'
import { useGameStore } from '@/stores/gameStore'
import type { Match } from '@/types/football'
import { formatMoney } from '@/utils/format'

const gameStore = useGameStore()
const clubStore = useClubStore()
const competitionStore = useCompetitionStore()

const club = computed(() => gameStore.selectedClub)
const nextMatch = computed(() => gameStore.nextMatch)

const opponent = computed(() => {
  const game = gameStore.game
  const match = nextMatch.value
  if (!game || !match) {
    return undefined
  }
  const opponentId = match.homeClubId === game.selectedClubId ? match.awayClubId : match.homeClubId
  return clubStore.getClubById(opponentId)
})

const recentResults = computed<Match[]>(() => {
  const game = gameStore.game
  if (!game) {
    return []
  }

  return game.matches
    .filter(
      (match) =>
        match.status === 'played' &&
        (match.homeClubId === game.selectedClubId || match.awayClubId === game.selectedClubId),
    )
    .sort((left, right) => right.order - left.order)
    .slice(0, 5)
})

const resultBadge = (match: Match): string => {
  const game = gameStore.game
  if (!game || !match.result) {
    return ''
  }
  const isHome = match.homeClubId === game.selectedClubId
  const ownGoals = isHome ? match.result.homeGoals : match.result.awayGoals
  const opponentGoals = isHome ? match.result.awayGoals : match.result.homeGoals

  if (ownGoals > opponentGoals || match.result.winnerClubId === game.selectedClubId) {
    return 'В'
  }
  if (ownGoals === opponentGoals) {
    return 'Н'
  }
  return 'П'
}

const matchTitle = (match: Match): string => {
  const home = clubStore.getClubById(match.homeClubId)?.shortName ?? match.homeClubId
  const away = clubStore.getClubById(match.awayClubId)?.shortName ?? match.awayClubId
  return `${home} ${match.result?.homeGoals ?? 0}:${match.result?.awayGoals ?? 0} ${away}`
}

const finishSeason = (): void => {
  gameStore.finishCurrentSeason()
}
</script>

<template>
  <section v-if="club && gameStore.game" class="space-y-5">
    <div class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="surface p-5">
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-4">
            <ClubBadge :club="club" size="lg" />
            <div>
              <div class="text-sm text-slate-500">Сезон {{ gameStore.game.season }}</div>
              <h1 class="text-2xl font-bold text-slate-950">{{ club.name }}</h1>
              <div class="text-sm text-slate-600">
                {{ club.city }} · {{ divisionNames[club.divisionId] }}
              </div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-md bg-slate-50 px-3 py-2">
              <div class="meta-label">Место</div>
              <div class="mt-1 text-lg font-bold text-slate-950">
                {{ competitionStore.selectedClubRow?.position ?? '-' }}
              </div>
            </div>
            <div class="rounded-md bg-slate-50 px-3 py-2">
              <div class="meta-label">Бюджет</div>
              <div class="mt-1 text-lg font-bold text-slate-950">
                {{ formatMoney(club.budget) }}
              </div>
            </div>
            <div class="rounded-md bg-slate-50 px-3 py-2">
              <div class="meta-label">Кубок</div>
              <div class="mt-1 text-sm font-semibold text-slate-950">
                {{ competitionStore.cupProgress }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="surface p-5">
        <h2 class="section-title">Следующий матч</h2>
        <div v-if="nextMatch && opponent" class="mt-4 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <ClubBadge :club="opponent" />
            <div>
              <div class="font-semibold text-slate-950">{{ opponent.name }}</div>
              <div class="text-sm text-slate-500">
                {{ nextMatch.type === 'league' ? `Тур ${nextMatch.round}` : 'Кубок' }}
                · {{ nextMatch.homeClubId === club.id ? 'дома' : 'в гостях' }}
              </div>
            </div>
          </div>
          <RouterLink :to="`/match/${nextMatch.id}`">
            <Button label="Матч" />
          </RouterLink>
        </div>
        <div v-else class="mt-4 text-sm text-slate-600">Матчей не осталось.</div>
        <Button
          v-if="gameStore.seasonCanFinish"
          class="mt-4 w-full"
          severity="success"
          label="Завершить сезон"
          @click="finishSeason"
        />
      </div>
    </div>

    <div class="surface p-5">
      <h2 class="section-title">Последние результаты</h2>
      <div v-if="recentResults.length" class="mt-4 grid gap-2 md:grid-cols-5">
        <div
          v-for="match in recentResults"
          :key="match.id"
          class="rounded-md border border-slate-200 p-3"
        >
          <div
            class="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold"
            :class="{
              'bg-emerald-100 text-emerald-800': resultBadge(match) === 'В',
              'bg-amber-100 text-amber-800': resultBadge(match) === 'Н',
              'bg-rose-100 text-rose-800': resultBadge(match) === 'П',
            }"
          >
            {{ resultBadge(match) }}
          </div>
          <div class="font-semibold text-slate-950">{{ matchTitle(match) }}</div>
          <div class="text-sm text-slate-500">
            {{ match.type === 'league' ? `Тур ${match.round}` : 'Кубок' }}
          </div>
        </div>
      </div>
      <div v-else class="mt-3 text-sm text-slate-600">Сезон только начинается.</div>
    </div>
  </section>
</template>

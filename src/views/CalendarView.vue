<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ClubBadge from '@/components/ClubBadge.vue'
import { useClubStore } from '@/stores/clubStore'
import { useGameStore } from '@/stores/gameStore'
import type { Club, Match } from '@/types/football'

const gameStore = useGameStore()
const clubStore = useClubStore()

const userMatches = computed<Match[]>(() => {
  const game = gameStore.game
  if (!game) {
    return []
  }
  return game.matches
    .filter((match) => match.homeClubId === game.selectedClubId || match.awayClubId === game.selectedClubId)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
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
</script>

<template>
  <section v-if="gameStore.game" class="space-y-5">
    <div>
      <h1 class="text-2xl font-bold text-slate-950">Календарь</h1>
      <p class="mt-1 text-sm text-slate-600">Все матчи клуба в текущем сезоне.</p>
    </div>

    <div class="surface overflow-hidden">
      <div v-for="match in userMatches" :key="match.id" class="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-[120px_1fr_auto_auto] md:items-center">
        <div>
          <div class="text-sm font-semibold text-slate-950">День {{ match.order }}</div>
          <div class="text-xs text-slate-500">{{ match.type === 'league' ? `Тур ${match.round}` : 'Кубок' }}</div>
        </div>
        <div class="flex items-center gap-3">
          <ClubBadge :club="opponentClub(match)" size="sm" />
          <div>
            <div class="font-semibold text-slate-950">{{ clubStore.getClubById(opponentId(match))?.name ?? opponentId(match) }}</div>
            <div class="text-sm text-slate-500">{{ match.homeClubId === gameStore.game.selectedClubId ? 'Домашний матч' : 'Выездной матч' }}</div>
          </div>
        </div>
        <div class="text-lg font-bold text-slate-950">{{ score(match) }}</div>
        <RouterLink :to="`/match/${match.id}`">
          <Button :severity="match.status === 'played' ? 'secondary' : 'primary'" :label="match.status === 'played' ? 'Протокол' : 'Играть'" />
        </RouterLink>
      </div>
    </div>
  </section>
</template>

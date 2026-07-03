<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { worldCup2026Groups } from '@/data/nationalTeams/worldCup2026/groups'
import { worldCup2026ProfilesById } from '@/data/nationalTeams/worldCup2026/ratings'
import { flagEmoji } from '@/data/nationalTeams/worldCup2026/teams'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'

const router = useRouter()
const { t } = useI18n()
const worldCupStore = useWorldCup2026Store()

const selectedTeamId = ref<string | null>(null)

const groups = computed(() =>
  worldCup2026Groups.map((group) => ({
    ...group,
    teams: group.teams
      .map((teamId) => worldCup2026ProfilesById[teamId])
      .filter((team): team is NonNullable<typeof team> => Boolean(team)),
  })),
)

const selectedProfile = computed(() =>
  selectedTeamId.value ? worldCup2026ProfilesById[selectedTeamId.value] : null,
)

const selectTeam = (teamId: string): void => {
  selectedTeamId.value = teamId
}

const goBack = (): void => {
  void router.push({ name: 'select-mode' })
}

const startTournament = (): void => {
  if (!selectedTeamId.value) {
    return
  }
  worldCupStore.startTournament(selectedTeamId.value)
  void router.push({ name: 'world-cup-overview' })
}
</script>

<template>
  <section class="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col pb-28">
    <header class="mb-5 sm:mb-6">
      <button
        type="button"
        class="mb-3 text-sm font-bold text-slate-400 transition hover:text-white"
        @click="goBack"
      >
        ← {{ t('worldCup2026.back') }}
      </button>
      <h1 class="text-2xl font-black uppercase text-white sm:text-3xl">
        {{ t('worldCup2026.title') }}
      </h1>
      <p class="mt-2 text-sm font-semibold text-slate-300">
        {{ t('worldCup2026.subtitle') }}
      </p>
    </header>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
      <article
        v-for="group in groups"
        :key="group.id"
        class="animate-[fadeIn_0.4s_ease-out] overflow-hidden rounded-xl border border-white/10 bg-[#121820]/90 shadow-lg backdrop-blur-sm"
      >
        <div class="border-b border-white/10 bg-gradient-to-r from-amber-500/20 to-blue-500/10 px-4 py-2.5">
          <h2 class="text-sm font-black uppercase tracking-[0.2em] text-white">
            {{ t('worldCup2026.group', { letter: group.id }) }}
          </h2>
        </div>
        <ul class="divide-y divide-white/5 p-2">
          <li v-for="team in group.teams" :key="team.id">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition"
              :class="
                selectedTeamId === team.id
                  ? 'bg-amber-400/20 ring-1 ring-amber-300/60'
                  : 'hover:bg-white/5'
              "
              @click="selectTeam(team.id)"
            >
              <span class="text-2xl">{{ flagEmoji(team.flagCode) }}</span>
              <div>
                <div class="text-sm font-bold text-slate-100">{{ team.name }}</div>
                <div class="text-xs text-slate-400">{{ team.rating }}</div>
              </div>
            </button>
          </li>
        </ul>
      </article>
    </div>

    <div
      v-if="selectedProfile"
      class="fixed bottom-0 left-0 right-0 z-20 border-t border-amber-300/30 bg-[#0a1220]/95 px-4 py-4 backdrop-blur-md sm:px-6"
    >
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <span class="text-3xl">{{ flagEmoji(selectedProfile.flagCode) }}</span>
          <div>
            <div class="text-lg font-black text-white">{{ selectedProfile.name }}</div>
            <div class="text-sm text-amber-200">
              {{ t('worldCup2026.group', { letter: selectedProfile.groupId }) }} ·
              {{ t('worldCup2026.rating', { rating: selectedProfile.rating }) }}
            </div>
          </div>
        </div>
        <Button
          class="!font-black"
          :label="t('worldCup2026.startTournament')"
          @click="startTournament"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>

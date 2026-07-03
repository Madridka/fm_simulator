<script setup lang="ts">

import { computed } from 'vue'

import Drawer from 'primevue/drawer'

import { RouterView, useRoute, useRouter } from 'vue-router'

import { useAppStore } from '@/stores/app/app'

import { useCareerContext } from '@/composables/useCareerContext'

import { useCareerNavigation } from '@/composables/useCareerNavigation'

import { useGameStore } from '@/stores/game/gameStore'

import { useMatchStore } from '@/stores/matches/matchStore'

import { useToastStore } from '@/stores/ui/toastStore'

import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'



import MenuNav from '@/components/layout/MenuNav.vue'

import TopBar from '@/components/layout/TopBar.vue'



const appStore = useAppStore()

const gameStore = useGameStore()

const matchStore = useMatchStore()

const toastStore = useToastStore()

const worldCupStore = useWorldCup2026Store()

const route = useRoute()

const router = useRouter()

const { isWorldCupMode, isActiveSession, selectedClub, teamFlag, teamFlagUrl, paths, topBarSeasonLabel } =

  useCareerContext()

const { navItems } = useCareerNavigation()



const isMatchRoute = computed(() => route.name === 'match' || route.name === 'world-cup-match')



const toastClass = computed((): string => {

  if (toastStore.severity === 'success') {

    return 'bg-emerald-950 text-emerald-50'

  }

  if (toastStore.severity === 'warning') {

    return 'bg-amber-500 text-amber-950'

  }

  return 'bg-slate-950 text-white'

})



const openNextMatch = (): void => {

  if (!matchStore.nextMatch) {

    return

  }

  matchStore.openMatch(matchStore.nextMatch)

}



const resetGame = (): void => {

  appStore.closeNavigation()

  if (isWorldCupMode.value) {

    worldCupStore.resetTournament()

    void router.push({ name: 'select-mode' })

    return

  }

  gameStore.resetGame()

  void router.push('/select-club')

}

</script>



<template>

  <div

    class="min-h-screen min-w-[320px] bg-[#eef2f0] font-sans text-slate-900 xl:h-screen xl:overflow-hidden"

  >

    <template v-if="isActiveSession">

      <aside

        class="fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-white/10 shadow-[14px_0_40px_rgba(4,18,14,0.18)] md:block"

      >

        <MenuNav

          :active-path="route.path"

          :items="navItems"

          :selected-club="selectedClub"

          :team-flag="teamFlag"
          :team-flag-url="teamFlagUrl"

          :dashboard-path="paths.dashboard"

          :settings-open="appStore.settingsOpen"

          @close-settings="appStore.closeSettings"

          @toggle-settings="appStore.toggleSettings"

          @reset-game="resetGame"

          @navigate="appStore.closeNavigation"

        />

      </aside>



      <Drawer

        v-model:visible="appStore.drawerVisible"

        position="left"

        class="!w-[280px] md:!hidden"

      >

        <template #container>

          <MenuNav

            :active-path="route.path"

            :items="navItems"

            :selected-club="selectedClub"

            :team-flag="teamFlag"
          :team-flag-url="teamFlagUrl"

            :dashboard-path="paths.dashboard"

            :settings-open="appStore.settingsOpen"

            mode="drawer"

            @close-settings="appStore.closeSettings"

            @toggle-settings="appStore.toggleSettings"

            @reset-game="resetGame"

            @navigate="appStore.closeNavigation"

          />

        </template>

      </Drawer>



      <div class="flex min-h-screen flex-col md:pl-[228px] xl:h-screen xl:min-h-0">

        <TopBar

          :next-match="isMatchRoute ? undefined : matchStore.nextMatch"

          :next-opponent="isMatchRoute ? undefined : matchStore.nextOpponent"

          :season="topBarSeasonLabel"

          :selected-club="selectedClub"

          :team-flag="teamFlag"
          :team-flag-url="teamFlagUrl"

          :is-world-cup-mode="isWorldCupMode"

          :dashboard-path="paths.dashboard"

          @open-menu="appStore.openDrawer"

          @open-next-match="openNextMatch"

        />



        <main class="flex-1 p-4 sm:p-6 lg:p-8 xl:min-h-0 xl:overflow-hidden">

          <RouterView />

        </main>

      </div>



      <div

        v-if="toastStore.message"

        class="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(15,23,42,0.28)]"

        :class="toastClass"

        role="status"

      >

        {{ toastStore.message }}

      </div>

    </template>



    <main v-else class="h-screen overflow-auto bg-[#eef2f0] p-4 sm:p-6 xl:overflow-hidden">

      <RouterView />

    </main>

  </div>

</template>



<script setup lang="ts">
import { computed } from 'vue'
import Dialog from 'primevue/dialog'
import Drawer from 'primevue/drawer'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { getSeasonTaskProgressList } from '@/domain/tasks/seasonTaskService'
import { useAppStore } from '@/stores/app/app'
import { useGameStore } from '@/stores/game/gameStore'
import { useMatchStore } from '@/stores/matches/matchStore'
import { useToastStore } from '@/stores/ui/toastStore'
import type { SeasonTaskCategory } from '@/types/football'

import MenuNav from '@/components/layout/MenuNav.vue'
import TopBar from '@/components/layout/TopBar.vue'

// ГЛОБАЛЬНЫЕ ХРАНИЛИЩА И МАРШРУТИЗАЦИЯ ОСНОВНОЙ ОБОЛОЧКИ
const appStore = useAppStore()
const gameStore = useGameStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()
const route = useRoute()
const router = useRouter()

const taskCategoryLabels: Record<SeasonTaskCategory, string> = {
  important: 'Основные',
  secondary: 'Второстепенные',
  optional: 'Неважные',
}

const taskCategoryClass: Record<SeasonTaskCategory, string> = {
  important: 'bg-rose-50 text-rose-700',
  secondary: 'bg-amber-50 text-amber-700',
  optional: 'bg-sky-50 text-sky-700',
}

const seasonTasksDialogVisible = computed({
  get: () => gameStore.seasonTasksDialogVisible,
  set: (visible: boolean) => {
    if (!visible) {
      gameStore.closeSeasonTasksDialog()
    }
  },
})

const seasonTaskList = computed(() =>
  gameStore.game ? getSeasonTaskProgressList(gameStore.game) : [],
)

const taskProgressText = (task: (typeof seasonTaskList.value)[number]): string =>
  task.task.kind === 'league_position' ? task.detailLabel : `${task.current}/${task.target}`

// ОПРЕДЕЛЯЕТ ЦВЕТОВОЕ ОФОРМЛЕНИЕ УВЕДОМЛЕНИЯ
const toastClass = computed((): string => {
  if (toastStore.severity === 'success') {
    return 'bg-emerald-950 text-emerald-50'
  }
  if (toastStore.severity === 'warning') {
    return 'bg-amber-500 text-amber-950'
  }
  return 'bg-slate-950 text-white'
})

// ОТКРЫВАЕТ СЛЕДУЮЩИЙ ДОСТУПНЫЙ МАТЧ
const openNextMatch = (): void => {
  if (!matchStore.nextMatch) {
    return
  }

  gameStore.openMatch(matchStore.nextMatch.id)
  void router.push('/match')
}

// СБРАСЫВАЕТ ТЕКУЩУЮ ИГРУ И ВОЗВРАЩАЕТ К ВЫБОРУ КЛУБА
const resetGame = (): void => {
  appStore.closeNavigation()
  gameStore.resetGame()
  void router.push('/select-club')
}
</script>

<template>
  <!-- ОСНОВНАЯ ОБОЛОЧКА ПРИЛОЖЕНИЯ -->
  <div
    class="min-h-screen min-w-[320px] bg-[#eef2f0] font-sans text-slate-900 xl:h-screen xl:overflow-hidden"
  >
    <template v-if="gameStore.game">
      <!-- ДЕСКТОПНАЯ БОКОВАЯ НАВИГАЦИЯ -->
      <aside
        class="fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-white/10 shadow-[14px_0_40px_rgba(4,18,14,0.18)] md:block"
      >
        <MenuNav
          :active-path="route.path"
          :items="appStore.navItems"
          :selected-club="gameStore.selectedClub"
          :settings-open="appStore.settingsOpen"
          @close-settings="appStore.closeSettings"
          @toggle-settings="appStore.toggleSettings"
          @reset-game="resetGame"
          @navigate="appStore.closeNavigation"
        />
      </aside>

      <!-- МОБИЛЬНАЯ ВЫДВИЖНАЯ НАВИГАЦИЯ -->
      <Drawer
        v-model:visible="appStore.drawerVisible"
        position="left"
        class="!w-[280px] md:!hidden"
      >
        <template #container>
          <MenuNav
            :active-path="route.path"
            :items="appStore.navItems"
            :selected-club="gameStore.selectedClub"
            :settings-open="appStore.settingsOpen"
            mode="drawer"
            @close-settings="appStore.closeSettings"
            @toggle-settings="appStore.toggleSettings"
            @reset-game="resetGame"
            @navigate="appStore.closeNavigation"
          />
        </template>
      </Drawer>

      <!-- РАБОЧАЯ ОБЛАСТЬ ПРИЛОЖЕНИЯ -->
      <div class="flex min-h-screen flex-col md:pl-[228px] xl:h-screen xl:min-h-0">
        <TopBar
          :next-match="route.name === 'match' ? undefined : matchStore.nextMatch"
          :next-opponent="route.name === 'match' ? undefined : matchStore.nextOpponent"
          :season="gameStore.game.season"
          :selected-club="gameStore.selectedClub"
          @open-menu="appStore.openDrawer"
          @open-next-match="openNextMatch"
        />

        <!-- СОДЕРЖИМОЕ ТЕКУЩЕГО РАЗДЕЛА -->
        <main class="flex-1 p-4 sm:p-6 lg:p-8 xl:min-h-0 xl:overflow-hidden">
          <RouterView />
        </main>
      </div>

      <!-- ГЛОБАЛЬНОЕ УВЕДОМЛЕНИЕ -->
      <div
        v-if="toastStore.message"
        class="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-[0_18px_45px_rgba(15,23,42,0.28)]"
        :class="toastClass"
        role="status"
      >
        {{ toastStore.message }}
      </div>

      <Dialog
        v-model:visible="seasonTasksDialogVisible"
        modal
        :draggable="false"
        :closable="false"
        class="mx-3 w-[min(720px,calc(100vw-24px))]"
      >
        <template #header>
          <div>
            <div class="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Сезон {{ gameStore.game.season }}
            </div>
            <div class="mt-1 text-xl font-black text-slate-950">Задачи на сезон</div>
          </div>
        </template>

        <div class="max-h-[62vh] overflow-auto pr-1">
          <div class="grid gap-3">
            <article
              v-for="item in seasonTaskList"
              :key="item.task.id"
              class="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <span
                    class="inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase"
                    :class="taskCategoryClass[item.task.category]"
                  >
                    {{ taskCategoryLabels[item.task.category] }}
                  </span>
                  <h3 class="mt-2 text-sm font-black leading-snug text-slate-950 sm:text-base">
                    {{ item.task.title }}
                  </h3>
                  <p class="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    {{ item.task.description }}
                  </p>
                </div>
                <div class="shrink-0 text-right text-sm font-black text-slate-900">
                  {{ taskProgressText(item) }}
                </div>
              </div>
            </article>
          </div>
        </div>

        <template #footer>
          <Button
            label="Начать сезон"
            class="w-full !font-black sm:w-auto"
            @click="gameStore.closeSeasonTasksDialog"
          />
        </template>
      </Dialog>
    </template>

    <!-- ЭКРАН ДО НАЧАЛА ИГРЫ -->
    <main v-else class="h-screen xl:overflow-hidden p-4 sm:p-6">
      <RouterView />
    </main>
  </div>
</template>

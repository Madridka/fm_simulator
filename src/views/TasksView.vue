<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getSeasonTaskProgressList,
  type SeasonTaskProgress,
} from '@/domain/tasks/seasonTaskService'
import { useGameStore } from '@/stores/game/gameStore'
import type { SeasonTaskCategory } from '@/types/football'

interface TaskTab {
  key: SeasonTaskCategory
  label: string
}

const gameStore = useGameStore()
const activeTab = ref<SeasonTaskCategory>('important')

const tabs: TaskTab[] = [
  { key: 'important', label: 'Основные' },
  { key: 'secondary', label: 'Второстепенные' },
  { key: 'optional', label: 'Неважные' },
]

const progressList = computed<SeasonTaskProgress[]>(() =>
  gameStore.game ? getSeasonTaskProgressList(gameStore.game) : [],
)

const visibleTasks = computed(() =>
  progressList.value.filter((item) => item.task.category === activeTab.value),
)

const completedCount = computed(() => progressList.value.filter((item) => item.completed).length)

const taskCountByCategory = (category: SeasonTaskCategory): number =>
  progressList.value.filter((item) => item.task.category === category).length

const completedCountByCategory = (category: SeasonTaskCategory): number =>
  progressList.value.filter((item) => item.task.category === category && item.completed).length

const progressLabel = (item: SeasonTaskProgress): string =>
  item.task.kind === 'league_position' ? item.detailLabel : `${item.current}/${item.target}`
</script>

<template>
  <section v-if="gameStore.game" class="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-black uppercase tracking-[0.18em] text-emerald-800">
          Сезон {{ gameStore.game.season }}
        </p>
        <h1 class="mt-1 text-2xl font-black text-slate-950">Задачи сезона</h1>
      </div>

      <div class="rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm">
        Выполнено {{ completedCount }}/{{ progressList.length }}
      </div>
    </header>

    <nav class="grid gap-2 rounded-lg bg-white p-2 shadow-sm sm:grid-cols-3">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="flex h-12 items-center justify-between rounded-md px-4 text-sm font-black transition"
        :class="
          activeTab === tab.key
            ? 'bg-slate-950 text-white'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        "
        @click="activeTab = tab.key"
      >
        <span>{{ tab.label }}</span>
        <span
          class="rounded-full px-2 py-0.5 text-xs"
          :class="activeTab === tab.key ? 'bg-white/15 text-white' : 'bg-white text-slate-500'"
        >
          {{ completedCountByCategory(tab.key) }}/{{ taskCountByCategory(tab.key) }}
        </span>
      </button>
    </nav>

    <div class="min-h-0 flex-1 overflow-auto">
      <div class="grid gap-3 pb-2">
        <article
          v-for="item in visibleTasks"
          :key="item.task.id"
          class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h2 class="text-base font-black leading-snug text-slate-950">
                {{ item.task.title }}
              </h2>
              <p class="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {{ item.task.description }}
              </p>
            </div>

            <div class="shrink-0 text-right">
              <div
                class="text-sm font-black"
                :class="item.completed ? 'text-emerald-700' : 'text-slate-950'"
              >
                {{ progressLabel(item) }}
              </div>
              <div class="mt-1 text-xs font-bold text-slate-400">
                {{ item.statusLabel }}
              </div>
            </div>
          </div>

          <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              class="h-full rounded-full transition-all"
              :class="item.completed ? 'bg-emerald-600' : 'bg-slate-900'"
              :style="{ width: `${item.progress * 100}%` }"
            ></div>
          </div>
        </article>

        <div
          v-if="!visibleTasks.length"
          class="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-500"
        >
          В этой категории пока нет задач.
        </div>
      </div>
    </div>
  </section>
</template>

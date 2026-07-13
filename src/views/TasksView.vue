<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  getSeasonTaskProgressList,
  type SeasonTaskProgress,
} from '@/domain/tasks/seasonTaskService'
import { useGameStore } from '@/stores/game/gameStore'
import type { SeasonTaskCategory } from '@/types/football'
import { formatMoney } from '@/utils/format'

import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

interface TaskTab {
  key: SeasonTaskCategory
  label: string
  description: string
}

const gameStore = useGameStore()
const activeTab = ref<SeasonTaskCategory>('important')

const tabs: TaskTab[] = [
  {
    key: 'important',
    label: 'Основные',
    description: 'Ключевые задачи руководства на сезон',
  },
  {
    key: 'secondary',
    label: 'Второстепенные',
    description: 'Дополнительные ожидания от команды',
  },
  {
    key: 'optional',
    label: 'Неважные',
    description: 'Необязательные задачи и дополнительные цели',
  },
]

const progressList = computed<SeasonTaskProgress[]>(() =>
  gameStore.game ? getSeasonTaskProgressList(gameStore.game) : [],
)

const completedCount = computed(() => progressList.value.filter((item) => item.completed).length)

const taskCountByCategory = (category: SeasonTaskCategory): number =>
  progressList.value.filter((item) => item.task.category === category).length

const completedCountByCategory = (category: SeasonTaskCategory): number =>
  progressList.value.filter((item) => item.task.category === category && item.completed).length

const progressLabel = (item: SeasonTaskProgress): string =>
  item.task.kind === 'league_position' ? item.detailLabel : `${item.current}/${item.target}`

const categoryIcon = (category: SeasonTaskCategory): string => {
  const icons: Record<SeasonTaskCategory, string> = {
    important: 'pi pi-flag-fill',
    secondary: 'pi pi-chart-line',
    optional: 'pi pi-star-fill',
  }

  return icons[category]
}

const categoryIconClass = (category: SeasonTaskCategory): string => {
  const classes: Record<SeasonTaskCategory, string> = {
    important: 'bg-rose-50 text-rose-700 ring-rose-100',
    secondary: 'bg-amber-50 text-amber-700 ring-amber-100',
    optional: 'bg-sky-50 text-sky-700 ring-sky-100',
  }

  return classes[category]
}

const progressPercent = (item: SeasonTaskProgress): number => {
  if (item.completed) return 100

  if (item.task.kind === 'league_position' || item.target <= 0) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round((item.current / item.target) * 100)))
}

const tasksByCategory = computed<Record<SeasonTaskCategory, SeasonTaskProgress[]>>(() => ({
  important: progressList.value.filter((item) => item.task.category === 'important'),
  secondary: progressList.value.filter((item) => item.task.category === 'secondary'),
  optional: progressList.value.filter((item) => item.task.category === 'optional'),
}))

const categoryAccentClass = (category: SeasonTaskCategory): string => {
  const classes: Record<SeasonTaskCategory, string> = {
    important: 'border-l-rose-500',
    secondary: 'border-l-amber-500',
    optional: 'border-l-sky-500',
  }

  return classes[category]
}
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

    <Tabs v-model:value="activeTab">
      <TabList>
        <Tab v-for="tab in tabs" :key="tab.key" :value="tab.key">
          <div class="flex items-center gap-2">
            <span>{{ tab.label }}</span>

            <span
              class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500"
            >
              {{ completedCountByCategory(tab.key) }}/{{ taskCountByCategory(tab.key) }}
            </span>
          </div>
        </Tab>
      </TabList>
      <TabPanels class="min-h-0 flex-1 overflow-hidden bg-transparent p-0">
        <TabPanel
          v-for="tab in tabs"
          :key="tab.key"
          :value="tab.key"
          class="h-full overflow-auto bg-transparent px-0 py-4"
        >
          <div class="mb-3">
            <h2 class="text-sm font-black text-slate-800">
              {{ tab.label }}
            </h2>

            <p class="mt-0.5 text-xs font-semibold text-slate-400">
              {{ tab.description }}
            </p>
          </div>

          <div class="grid gap-3 pb-2">
            <article
              v-for="item in tasksByCategory[tab.key]"
              :key="item.task.id"
              class="group relative overflow-hidden rounded-xl border border-l-4 border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
              :class="[
                categoryAccentClass(item.task.category),
                {
                  'border-emerald-200 bg-emerald-50/20': item.completed,
                },
              ]"
            >
              <div class="flex items-start gap-4 p-4">
                <div
                  class="flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
                  :class="
                    item.completed
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                      : categoryIconClass(item.task.category)
                  "
                >
                  <i
                    :class="item.completed ? 'pi pi-check' : categoryIcon(item.task.category)"
                    class="text-sm font-black"
                  />
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-4">
                    <div class="min-w-0">
                      <h3 class="text-sm font-black leading-snug text-slate-950 sm:text-base">
                        {{ item.task.title }}
                      </h3>

                      <p class="mt-1 text-sm font-medium leading-6 text-slate-500">
                        {{ item.task.description }}
                      </p>
                    </div>

                    <div class="shrink-0 text-right">
                      <div
                        class="text-sm font-black"
                        :class="item.completed ? 'text-emerald-700' : 'text-slate-900'"
                      >
                        {{ progressLabel(item) }}
                      </div>

                      <div
                        class="mt-1 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide"
                        :class="
                          item.completed
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        "
                      >
                        {{ item.statusLabel }}
                      </div>

                      <div class="mt-2 text-xs font-black text-amber-700">
                        <i class="pi pi-wallet mr-1" />
                        {{
                          item.rewarded
                            ? 'Премия руководства получена'
                            : `Премия: ${formatMoney(item.task.reward ?? 0)}`
                        }}
                      </div>
                    </div>
                  </div>

                  <div v-if="item.task.kind !== 'league_position'" class="mt-4">
                    <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        class="h-full rounded-full transition-[width] duration-500"
                        :class="item.completed ? 'bg-emerald-500' : 'bg-slate-700'"
                        :style="{ width: `${progressPercent(item)}%` }"
                      />
                    </div>

                    <div
                      class="mt-1.5 flex items-center justify-between text-[10px] font-bold text-slate-400"
                    >
                      <span>Прогресс выполнения</span>
                      <span>{{ progressPercent(item) }}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <div
              v-if="!tasksByCategory[tab.key].length"
              class="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"
            >
              <div
                class="mx-auto flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"
              >
                <i class="pi pi-inbox" />
              </div>

              <div class="mt-3 text-sm font-black text-slate-600">
                В этой категории пока нет задач
              </div>

              <div class="mt-1 text-xs font-semibold text-slate-400">
                Новые задачи могут появиться по ходу сезона
              </div>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </section>
</template>

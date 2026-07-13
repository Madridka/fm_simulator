<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  achievementCategoryLabels,
  type AchievementCategory,
} from '@/domain/achievements/achievementCatalog'
import { useAchievementStore } from '@/stores/achievements/achievementStore'

interface AchievementTab {
  key: AchievementCategory | 'all'
  label: string
}

const router = useRouter()
const achievementStore = useAchievementStore()
const activeTab = ref<AchievementTab['key']>('all')

const tabs = computed<AchievementTab[]>(() => [
  { key: 'all', label: 'Все' },
  ...Object.entries(achievementCategoryLabels).map(([key, label]) => ({
    key: key as AchievementCategory,
    label,
  })),
])

const filteredAchievements = computed(() =>
  activeTab.value === 'all'
    ? achievementStore.achievements
    : achievementStore.achievements.filter((achievement) => achievement.category === activeTab.value),
)

const unlockedPercent = computed(() =>
  achievementStore.totalCount
    ? Math.round((achievementStore.unlockedCount / achievementStore.totalCount) * 100)
    : 0,
)

const unlockedCountByCategory = (category: AchievementCategory | 'all'): number =>
  achievementStore.achievements.filter(
    (achievement) =>
      (category === 'all' || achievement.category === category) &&
      achievementStore.unlockedSet.has(achievement.id),
  ).length

const totalCountByCategory = (category: AchievementCategory | 'all'): number =>
  category === 'all'
    ? achievementStore.achievements.length
    : achievementStore.achievements.filter((achievement) => achievement.category === category).length

const progressPercent = (achievementId: string): number => {
  if (achievementStore.unlockedSet.has(achievementId)) return 100

  const progress = achievementStore.progressFor(achievementId)
  return progress.target > 0
    ? Math.min(100, Math.round((progress.current / progress.target) * 100))
    : 0
}

const backToMenu = async (): Promise<void> => {
  await router.push('/menu')
}
</script>

<template>
  <section
    class="min-h-screen bg-[linear-gradient(135deg,#071611,#10251f_48%,#18213a)] px-4 py-6 text-white sm:px-6 lg:px-10"
  >
    <div class="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col gap-5">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p class="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
            Локальный профиль
          </p>
          <h1 class="mt-2 text-3xl font-black tracking-wide sm:text-5xl">Достижения</h1>
          <p class="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
            Общая коллекция для всех пяти карьер в этом браузере. Прогресс хранится отдельно от
            сохранений и не привязан к конкретному сезону.
          </p>
        </div>

        <Button
          severity="secondary"
          outlined
          icon="pi pi-arrow-left"
          label="В меню"
          @click="backToMenu"
        />
      </header>

      <div class="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="rounded-lg px-3 py-2 text-sm font-black transition"
            :class="
              activeTab === tab.key
                ? 'bg-emerald-300 text-emerald-950'
                : 'bg-white/[0.08] text-slate-200 hover:bg-white/[0.14] hover:text-white'
            "
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
            <span class="ml-1 text-xs opacity-75">
              {{ unlockedCountByCategory(tab.key) }}/{{ totalCountByCategory(tab.key) }}
            </span>
          </button>
        </div>

        <div class="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] p-4 shadow-2xl">
          <div class="flex items-center justify-between gap-3">
            <div>
              <div class="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                Очки
              </div>
              <div class="mt-1 text-2xl font-black">{{ achievementStore.totalPoints }}</div>
            </div>

            <div class="text-right">
              <div class="text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                Открыто
              </div>
              <div class="mt-1 text-2xl font-black">
                {{ achievementStore.unlockedCount }}/{{ achievementStore.totalCount }}
              </div>
            </div>
          </div>

          <div class="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              class="h-full rounded-full bg-emerald-300 transition-[width] duration-500"
              :style="{ width: `${unlockedPercent}%` }"
            />
          </div>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-auto pr-1">
        <div class="grid gap-3 pb-2 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="achievement in filteredAchievements"
            :key="achievement.id"
            class="overflow-hidden rounded-lg border bg-white text-slate-950 shadow-[0_16px_42px_rgba(0,0,0,0.2)] transition"
            :class="
              achievementStore.unlockedSet.has(achievement.id)
                ? 'border-emerald-200'
                : 'border-slate-200 opacity-75'
            "
          >
            <div class="flex min-h-[190px] flex-col p-4">
              <div class="flex items-start justify-between gap-3">
                <div
                  class="flex size-11 shrink-0 items-center justify-center rounded-lg"
                  :class="
                    achievementStore.unlockedSet.has(achievement.id)
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-400'
                  "
                >
                  <i
                    :class="
                      achievementStore.unlockedSet.has(achievement.id)
                        ? 'pi pi-trophy'
                        : 'pi pi-lock'
                    "
                  />
                </div>

                <div class="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">
                  {{ achievement.points }} оч.
                </div>
              </div>

              <div class="mt-4 min-w-0 flex-1">
                <div class="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                  {{ achievementCategoryLabels[achievement.category] }}
                </div>
                <h2 class="mt-1 text-base font-black leading-snug text-slate-950">
                  {{ achievement.title }}
                </h2>
                <p class="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {{ achievement.description }}
                </p>
              </div>

              <div class="mt-4">
                <div class="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    class="h-full rounded-full transition-[width] duration-500"
                    :class="
                      achievementStore.unlockedSet.has(achievement.id)
                        ? 'bg-emerald-500'
                        : 'bg-slate-400'
                    "
                    :style="{ width: `${progressPercent(achievement.id)}%` }"
                  />
                </div>

                <div class="mt-2 flex items-center justify-between text-xs font-black">
                  <span
                    :class="
                      achievementStore.unlockedSet.has(achievement.id)
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    "
                  >
                    {{ achievementStore.unlockedSet.has(achievement.id) ? 'Открыто' : 'В процессе' }}
                  </span>
                  <span class="text-slate-400">{{ progressPercent(achievement.id) }}%</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

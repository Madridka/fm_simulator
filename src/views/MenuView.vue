<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { championships } from '@/data/clubs'
import { useAchievementStore } from '@/stores/achievements/achievementStore'
import { useGameStore } from '@/stores/game/gameStore'
import type { SaveSlotSummary } from '@/repositories/gameSaveRepository'

const router = useRouter()
const achievementStore = useAchievementStore()
const gameStore = useGameStore()

const occupiedSlots = computed(() => gameStore.saveSlots.filter((slot) => slot.occupied))
const unlockedPercent = computed(() =>
  achievementStore.totalCount
    ? Math.round((achievementStore.unlockedCount / achievementStore.totalCount) * 100)
    : 0,
)

const slotTitle = (slot: SaveSlotSummary): string =>
  slot.occupied ? (slot.selectedClubName ?? slot.selectedClubId ?? 'Карьера') : 'Пустой слот'

const slotMeta = (slot: SaveSlotSummary): string => {
  if (!slot.occupied) return 'Можно начать новую карьеру'
  const country = slot.championshipId ? championships[slot.championshipId]?.name : undefined
  return [country, `сезон ${slot.season ?? 1}`, `тур ${slot.currentRound ?? 1}`]
    .filter(Boolean)
    .join(' · ')
}

const startNewCareer = async (slotId: number): Promise<void> => {
  gameStore.prepareNewCareerSlot(slotId)
  await router.push('/select-club')
}

const loadCareer = async (slotId: number): Promise<void> => {
  if (gameStore.loadSaveSlot(slotId)) {
    await router.push('/dashboard')
  }
}

const continueCareer = async (): Promise<void> => {
  if (gameStore.game) {
    await router.push('/dashboard')
    return
  }
  const active = gameStore.saveSlots.find((slot) => slot.id === gameStore.activeSlotId)
  if (active?.occupied) {
    await loadCareer(active.id)
  }
}

const openAchievements = async (): Promise<void> => {
  await router.push('/achievements')
}

const deleteCareer = (slotId: number): void => {
  gameStore.deleteSaveSlot(slotId)
}
</script>

<template>
  <section
    class="min-h-screen bg-[linear-gradient(135deg,#071611,#10251f_48%,#18213a)] px-4 py-6 text-white sm:px-6 lg:px-10"
  >
    <div class="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col">
      <header class="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div class="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
            FM Simulator
          </div>
          <h1 class="mt-2 text-3xl font-black tracking-wide sm:text-5xl">Главное меню</h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button
            severity="secondary"
            outlined
            icon="pi pi-trophy"
            label="Достижения"
            @click="openAchievements"
          />
          <Button
            v-if="gameStore.game || occupiedSlots.length"
            class="!h-11"
            icon="pi pi-play"
            label="Продолжить"
            @click="continueCareer"
          />
        </div>
      </header>

      <main class="grid flex-1 gap-5 py-6 lg:grid-cols-[0.78fr_1.22fr]">
        <aside class="grid content-start gap-4">
          <section class="rounded-lg border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
            <h2 class="text-lg font-black">Карьера</h2>
            <p class="mt-2 text-sm font-semibold leading-6 text-slate-300">
              Можно хранить до 5 карьер одновременно: разные клубы, страны и сезоны не будут
              перезаписывать друг друга.
            </p>
            <div class="mt-5 grid gap-2">
              <Button
                class="w-full"
                icon="pi pi-plus"
                label="Новая карьера"
                @click="startNewCareer(gameStore.saveSlots.find((slot) => !slot.occupied)?.id ?? 1)"
              />
              <Button
                class="w-full"
                severity="secondary"
                outlined
                icon="pi pi-folder-open"
                label="Загрузить карьеру"
                :disabled="!occupiedSlots.length"
                @click="continueCareer"
              />
            </div>
          </section>

          <section class="rounded-lg border border-emerald-300/20 bg-emerald-300/[0.08] p-5 shadow-2xl">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Локальный профиль
                </p>
                <h2 class="mt-1 text-lg font-black">Достижения</h2>
              </div>
              <div class="rounded-lg bg-emerald-300 px-3 py-2 text-right text-emerald-950">
                <div class="text-lg font-black">{{ achievementStore.totalPoints }}</div>
                <div class="text-[10px] font-black uppercase">очков</div>
              </div>
            </div>

            <div class="mt-4 grid grid-cols-2 gap-2">
              <div class="rounded-lg bg-white/[0.08] p-3">
                <div class="text-xl font-black">
                  {{ achievementStore.unlockedCount }}/{{ achievementStore.totalCount }}
                </div>
                <div class="mt-1 text-xs font-bold text-slate-300">открыто</div>
              </div>
              <div class="rounded-lg bg-white/[0.08] p-3">
                <div class="text-xl font-black">{{ unlockedPercent }}%</div>
                <div class="mt-1 text-xs font-bold text-slate-300">прогресс</div>
              </div>
            </div>

            <div class="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                class="h-full rounded-full bg-emerald-300 transition-[width] duration-500"
                :style="{ width: `${unlockedPercent}%` }"
              />
            </div>

            <Button
              class="mt-5 w-full"
              severity="secondary"
              icon="pi pi-trophy"
              label="Открыть достижения"
              @click="openAchievements"
            />
          </section>
        </aside>

        <div class="grid gap-3">
          <article
            v-for="slot in gameStore.saveSlots"
            :key="slot.id"
            class="grid gap-3 rounded-lg border border-white/10 bg-white/[0.08] p-4 shadow-[0_16px_42px_rgba(0,0,0,0.22)] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
            :class="slot.id === gameStore.activeSlotId ? 'ring-2 ring-emerald-300/70' : ''"
          >
            <div
              class="grid h-12 w-12 place-items-center rounded-lg bg-emerald-400 text-lg font-black text-emerald-950"
            >
              {{ slot.id }}
            </div>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="truncate text-xl font-black">{{ slotTitle(slot) }}</h2>
                <span
                  v-if="slot.id === gameStore.activeSlotId"
                  class="rounded-full bg-emerald-300 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-950"
                >
                  активный
                </span>
              </div>
              <p class="mt-1 text-sm font-semibold text-slate-300">{{ slotMeta(slot) }}</p>
            </div>
            <div class="flex flex-wrap gap-2 sm:justify-end">
              <Button
                v-if="slot.occupied"
                size="small"
                icon="pi pi-play"
                label="Загрузить"
                @click="loadCareer(slot.id)"
              />
              <Button
                size="small"
                severity="secondary"
                outlined
                icon="pi pi-plus"
                :label="slot.occupied ? 'Новая' : 'Создать'"
                @click="startNewCareer(slot.id)"
              />
              <Button
                v-if="slot.occupied"
                size="small"
                severity="danger"
                outlined
                icon="pi pi-trash"
                aria-label="Удалить сохранение"
                @click="deleteCareer(slot.id)"
              />
            </div>
          </article>
        </div>
      </main>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, Ref, ref, watch } from 'vue'
import { gameConfig } from '@/config/gameConfig'
import { useGameStore } from '@/stores/game/gameStore'
import { useTransferStore, type TransferSortKey } from '@/stores/transfers/transferStore'
import type { PlayerPosition } from '@/types/football'
import { formatMoney } from '@/utils/format'

const gameStore = useGameStore()
const transferStore = useTransferStore()

const toastMessage: Ref<string> = ref('')
let toastTimer: number | undefined

const positions: Array<PlayerPosition | 'all'> = [
  'all',
  'GK',
  'LB',
  'CB',
  'RB',
  'CDM',
  'CM',
  'CAM',
  'LW',
  'RW',
  'ST',
]
const sortOptions: TransferSortKey[] = ['rating', 'age', 'value']

const positionLabel = (position: PlayerPosition | 'all'): string => {
  const labels: Record<PlayerPosition | 'all', string> = {
    all: 'Все позиции',
    GK: 'Вратарь',
    LB: 'Левый защитник',
    CB: 'Центральный защитник',
    RB: 'Правый защитник',
    CDM: 'Опорник',
    CM: 'Центр поля',
    CAM: 'Атакующий полузащитник',
    LW: 'Левый вингер',
    RW: 'Правый вингер',
    ST: 'Нападающий',
  }
  return labels[position]
}

const sortLabel = (sort: TransferSortKey): string => {
  const labels: Record<TransferSortKey, string> = {
    rating: 'Рейтинг',
    age: 'Возраст',
    value: 'Стоимость',
  }
  return labels[sort]
}

watch(
  () => transferStore.messageId,
  () => {
    if (!transferStore.message) {
      return
    }

    toastMessage.value = transferStore.message
    window.clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toastMessage.value = ''
    }, 3200)
  },
)

onBeforeUnmount(() => window.clearTimeout(toastTimer))
</script>

<template>
  <section
    v-if="gameStore.selectedClub"
    class="flex h-[calc(100dvh-120px)] min-h-[640px] flex-col gap-5"
  >
    <div class="flex shrink-0 flex-col gap-1">
      <div>
        <h1 class="text-2xl font-bold text-slate-950">Трансферы</h1>
        <p class="mt-1 text-sm text-slate-600">
          Бюджет: {{ formatMoney(gameStore.selectedClub.budget) }}
        </p>
      </div>
    </div>

    <div
      v-if="toastMessage"
      class="fixed bottom-5 left-5 z-50 max-w-sm rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.28)]"
      role="status"
    >
      {{ toastMessage }}
    </div>

    <div
      class="grid min-h-0 flex-1 auto-rows-fr gap-5 xl:auto-rows-auto xl:grid-cols-[1.1fr_0.9fr]"
    >
      <div
        class="flex min-h-0 flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
      >
        <div class="flex shrink-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 class="text-lg font-semibold text-slate-950">Рынок игроков</h2>
          <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto">
            <label class="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
              Позиция
              <select
                v-model="transferStore.marketPositionFilter"
                class="h-10 w-full min-w-[11rem] rounded-md border border-slate-300 bg-white px-3"
              >
                <option v-for="position in positions" :key="position" :value="position">
                  {{ positionLabel(position) }}
                </option>
              </select>
            </label>
            <label class="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
              Сортировка
              <select
                v-model="transferStore.marketSortKey"
                class="h-10 w-full min-w-[11rem] rounded-md border border-slate-300 bg-white px-3"
              >
                <option v-for="sort in sortOptions" :key="sort" :value="sort">
                  {{ sortLabel(sort) }}
                </option>
              </select>
            </label>
          </div>
        </div>
        <div class="mt-4 min-h-0 flex-1 overflow-auto rounded-md border border-slate-200">
          <div
            v-for="item in transferStore.marketPlayers"
            :key="item.player.id"
            class="grid gap-3 border-b border-slate-100 p-3 md:grid-cols-[1fr_80px_90px_110px_auto] md:items-center"
          >
            <div>
              <div class="font-semibold text-slate-950">
                {{ item.player.firstName }} {{ item.player.lastName }}
              </div>
              <div class="text-sm text-slate-500">
                {{ item.clubName }} · {{ positionLabel(item.player.position) }}
              </div>
            </div>
            <div class="text-sm text-slate-700">Р{{ item.player.rating }}</div>
            <div class="text-sm text-slate-700">{{ item.player.age }} лет</div>
            <div class="font-semibold text-slate-950">{{ formatMoney(item.player.value) }}</div>
            <Button
              size="small"
              label="Купить"
              :disabled="
                gameStore.selectedClub.budget < item.player.value ||
                gameStore.selectedClub.squad.length >= gameConfig.maximumSquadSize
              "
              @click="transferStore.buy(item.player.id)"
            />
          </div>
        </div>
      </div>

      <div
        class="flex min-h-0 flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
      >
        <div class="flex shrink-0 flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <h2 class="text-lg font-semibold text-slate-950">Продажа игроков</h2>
          <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 2xl:w-auto">
            <label class="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
              Позиция
              <select
                v-model="transferStore.squadPositionFilter"
                class="h-10 w-full min-w-[11rem] rounded-md border border-slate-300 bg-white px-3"
              >
                <option v-for="position in positions" :key="position" :value="position">
                  {{ positionLabel(position) }}
                </option>
              </select>
            </label>
            <label class="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
              Сортировка
              <select
                v-model="transferStore.squadSortKey"
                class="h-10 w-full min-w-[11rem] rounded-md border border-slate-300 bg-white px-3"
              >
                <option v-for="sort in sortOptions" :key="sort" :value="sort">
                  {{ sortLabel(sort) }}
                </option>
              </select>
            </label>
          </div>
        </div>
        <div class="mt-4 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
          <div
            v-for="player in transferStore.squadPlayers"
            :key="player.id"
            class="rounded-md border border-slate-200 p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-semibold text-slate-950">
                  {{ player.firstName }} {{ player.lastName }}
                </div>
                <div class="text-sm text-slate-500">
                  {{ positionLabel(player.position) }} · Р{{ player.rating }} · {{ player.age }} лет
                </div>
              </div>
              <Button
                size="small"
                severity="secondary"
                label="Продать"
                @click="transferStore.sell(player.id)"
              />
            </div>
            <div class="mt-2 text-sm text-slate-600">
              Цена продажи: {{ formatMoney(Math.round(player.value * 0.8)) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

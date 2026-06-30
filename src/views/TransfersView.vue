<script setup lang="ts">
import { onBeforeUnmount, Ref, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { gameConfig } from '@/config/gameConfig'
import { useGameStore } from '@/stores/game/gameStore'
import { useTransferStore, type TransferSortKey } from '@/stores/transfers/transferStore'
import type { PlayerPosition } from '@/types/football'
import { formatMoney } from '@/utils/format'

// ИСТОЧНИКИ ДАННЫХ КАРЬЕРЫ И ОПЕРАЦИЙ ТРАНСФЕРНОГО РЫНКА
const gameStore = useGameStore()
const transferStore = useTransferStore()
const { t } = useI18n()

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

// ВОЗВРАЩАЕТ НАЗВАНИЕ ПОЗИЦИИ ИГРОКА
const positionLabel = (position: PlayerPosition | 'all'): string => {
  return t(`common.positions.${position}`)
}

// ВОЗВРАЩАЕТ НАЗВАНИЕ ВАРИАНТА СОРТИРОВКИ
const sortLabel = (sort: TransferSortKey): string => {
  return t(`transfers.sort.${sort}`)
}

// ОТСЛЕЖИВАЕТ НОВЫЕ СООБЩЕНИЯ О ТРАНСФЕРАХ
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

// ОЧИЩАЕТ ТАЙМЕР УВЕДОМЛЕНИЯ ПЕРЕД УДАЛЕНИЕМ КОМПОНЕНТА
onBeforeUnmount(() => window.clearTimeout(toastTimer))
</script>

<template>
  <!-- СТРАНИЦА ТРАНСФЕРОВ -->
  <section
    v-if="gameStore.selectedClub"
    class="flex flex-col gap-5 xl:h-full xl:min-h-0 xl:overflow-hidden"
  >
    <!-- ЗАГОЛОВОК И ТЕКУЩИЙ БЮДЖЕТ -->
    <div class="flex shrink-0 flex-col gap-1">
      <div>
        <h1 class="text-2xl font-bold text-slate-950">{{ t('transfers.title') }}</h1>
        <p class="mt-1 text-sm text-slate-600">
          {{ t('transfers.budget', { budget: formatMoney(gameStore.selectedClub.budget) }) }}
        </p>
      </div>
    </div>

    <!-- УВЕДОМЛЕНИЕ О РЕЗУЛЬТАТЕ ТРАНСФЕРА -->
    <div
      v-if="toastMessage"
      class="fixed bottom-5 left-5 z-50 max-w-sm rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.28)]"
      role="status"
    >
      {{ toastMessage }}
    </div>

    <!-- ПАНЕЛИ ПОКУПКИ И ПРОДАЖИ ИГРОКОВ -->
    <div
      class="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.1fr_0.9fr]"
    >
      <!-- РЫНОК ИГРОКОВ ДЛЯ ПОКУПКИ -->
      <div
        class="order-2 flex min-h-0 flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:order-1"
      >
        <div class="flex shrink-0 flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 class="text-lg font-semibold text-slate-950">{{ t('transfers.market') }}</h2>
          <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto">
            <label class="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
              {{ t('transfers.position') }}
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
              {{ t('transfers.sorting') }}
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
            <div class="text-sm text-slate-700">
              {{ t('common.ratingValue', { rating: item.player.rating }) }}
            </div>
            <div class="text-sm text-slate-700">
              {{ t('common.age', { age: item.player.age }) }}
            </div>
            <div class="font-semibold text-slate-950">{{ formatMoney(item.player.value) }}</div>
            <Button
              size="small"
              :label="t('transfers.buy')"
              :disabled="
                gameStore.selectedClub.budget < item.player.value ||
                gameStore.selectedClub.squad.length >= gameConfig.maximumSquadSize
              "
              @click="transferStore.buy(item.player.id)"
            />
          </div>
        </div>
      </div>

      <!-- СОСТАВ КЛУБА ДЛЯ ПРОДАЖИ -->
      <div
        class="order-1 flex min-h-0 flex-col rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:order-2"
      >
        <div class="flex shrink-0 flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <h2 class="text-lg font-semibold text-slate-950">{{ t('transfers.sales') }}</h2>
          <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 2xl:w-auto">
            <label class="flex min-w-0 flex-col gap-1 text-sm font-medium text-slate-700">
              {{ t('transfers.position') }}
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
              {{ t('transfers.sorting') }}
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
                  {{ positionLabel(player.position) }} {{ t('common.separator') }}
                  {{ t('common.ratingValue', { rating: player.rating }) }}
                  {{ t('common.separator') }} {{ t('common.age', { age: player.age }) }}
                </div>
              </div>
              <Button
                size="small"
                severity="secondary"
                :label="t('transfers.sell')"
                @click="transferStore.sell(player.id)"
              />
            </div>
            <div class="mt-2 text-sm text-slate-600">
              {{
                t('transfers.salePrice', {
                  price: formatMoney(Math.round(player.value * 0.8)),
                })
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

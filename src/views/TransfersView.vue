<script setup lang="ts">
import { computed } from 'vue'
import { gameConfig } from '@/config/gameConfig'
import { useGameStore } from '@/stores/gameStore'
import { useTransferStore, type TransferSortKey } from '@/stores/transferStore'
import type { PlayerPosition } from '@/types/football'
import { formatMoney } from '@/utils/format'

const gameStore = useGameStore()
const transferStore = useTransferStore()

const positions: Array<PlayerPosition | 'all'> = ['all', 'GK', 'LB', 'CB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST']
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

const userSquad = computed(() => gameStore.selectedClub?.squad ?? [])
</script>

<template>
  <section v-if="gameStore.selectedClub" class="space-y-5">
    <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-950">Трансферы</h1>
        <p class="mt-1 text-sm text-slate-600">Бюджет: {{ formatMoney(gameStore.selectedClub.budget) }}</p>
      </div>
      <div class="flex flex-wrap gap-2">
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Позиция
          <select v-model="transferStore.positionFilter" class="h-10 rounded-md border border-slate-300 bg-white px-3">
            <option v-for="position in positions" :key="position" :value="position">
              {{ positionLabel(position) }}
            </option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Сортировка
          <select v-model="transferStore.sortKey" class="h-10 rounded-md border border-slate-300 bg-white px-3">
            <option v-for="sort in sortOptions" :key="sort" :value="sort">
              {{ sortLabel(sort) }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div v-if="transferStore.message" class="rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white">
      {{ transferStore.message }}
    </div>

    <div class="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
      <div class="surface p-5">
        <h2 class="section-title">Рынок игроков</h2>
        <div class="mt-4 max-h-[680px] overflow-auto rounded-md border border-slate-200">
          <div
            v-for="item in transferStore.marketPlayers"
            :key="item.player.id"
            class="grid gap-3 border-b border-slate-100 p-3 md:grid-cols-[1fr_80px_90px_110px_auto] md:items-center"
          >
            <div>
              <div class="font-semibold text-slate-950">{{ item.player.firstName }} {{ item.player.lastName }}</div>
              <div class="text-sm text-slate-500">{{ item.clubName }} · {{ positionLabel(item.player.position) }}</div>
            </div>
            <div class="text-sm text-slate-700">Р{{ item.player.rating }}</div>
            <div class="text-sm text-slate-700">{{ item.player.age }} лет</div>
            <div class="font-semibold text-slate-950">{{ formatMoney(item.player.value) }}</div>
            <Button
              size="small"
              label="Купить"
              :disabled="gameStore.selectedClub.budget < item.player.value || gameStore.selectedClub.squad.length >= gameConfig.maximumSquadSize"
              @click="transferStore.buy(item.player.id)"
            />
          </div>
        </div>
      </div>

      <div class="surface p-5">
        <h2 class="section-title">Продажа игроков</h2>
        <div class="mt-4 space-y-2">
          <div v-for="player in userSquad" :key="player.id" class="rounded-md border border-slate-200 p-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="font-semibold text-slate-950">{{ player.firstName }} {{ player.lastName }}</div>
                <div class="text-sm text-slate-500">{{ positionLabel(player.position) }} · Р{{ player.rating }} · {{ player.age }} лет</div>
              </div>
              <Button size="small" severity="secondary" label="Продать" @click="transferStore.sell(player.id)" />
            </div>
            <div class="mt-2 text-sm text-slate-600">Цена продажи: {{ formatMoney(Math.round(player.value * 0.8)) }}</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

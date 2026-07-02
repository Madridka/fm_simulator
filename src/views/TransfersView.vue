<script setup lang="ts">
import { computed, onBeforeUnmount, Ref, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { careerConfig } from '@/data/gameConfig/career'
import { useGameStore } from '@/stores/game/gameStore'
import { useTransferStore, type TransferSortKey } from '@/stores/transfers/transferStore'
import type { PlayerPosition } from '@/types/football'
import { formatMoney } from '@/utils/format'
import { academyLimits, getReservePlayers } from '@/domain/academy/academyService'
import SectionHero from '@/components/ui/SectionHero.vue'

// ИСТОЧНИКИ ДАННЫХ КАРЬЕРЫ И ОПЕРАЦИЙ ТРАНСФЕРНОГО РЫНКА
const gameStore = useGameStore()
const transferStore = useTransferStore()
const { t } = useI18n()

const toastMessage: Ref<string> = ref('')
let toastTimer: number | undefined

const academyPlayersCount = computed(() => {
  const game = gameStore.game
  const academy = game?.academies[game.selectedClubId]
  return game && academy ? getReservePlayers(academy, game.clubs).length : 0
})

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
    class="flex flex-col gap-3 xl:h-full xl:min-h-0 xl:overflow-hidden"
  >
    <!-- ЗАГОЛОВОК И ТЕКУЩИЙ БЮДЖЕТ -->
    <SectionHero :title="t('transfers.title')" :subtitle="gameStore.selectedClub.name">
      <template #actions>
        <div
          v-for="item in [
            {
              label: t('transfers.availableBudget'),
              value: formatMoney(gameStore.selectedClub.budget),
            },
          { label: t('transfers.clubPlayers'), value: `${gameStore.selectedClub.squad.length}/${careerConfig.maximumSquadSize}` },
          { label: t('transfers.academyPlayers'), value: `${academyPlayersCount}/${academyLimits.reserveMaximumSquadSize}` },
          ]"
          :key="item.label"
          class="min-w-28 border-l border-white/15 px-3"
        >
          <div class="text-[9px] font-bold uppercase tracking-wider text-emerald-200/65">
            {{ item.label }}
          </div>
          <div class="mt-1 text-lg font-black leading-none">{{ item.value }}</div>
        </div>
      </template>
    </SectionHero>

    <!-- УВЕДОМЛЕНИЕ О РЕЗУЛЬТАТЕ ТРАНСФЕРА -->
    <div
      v-if="toastMessage"
      class="fixed bottom-5 left-5 z-50 max-w-sm rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(15,23,42,0.28)]"
      role="status"
    >
      {{ toastMessage }}
    </div>

    <!-- ПАНЕЛИ ПОКУПКИ И ПРОДАЖИ ИГРОКОВ -->
    <div class="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[1.1fr_0.9fr]">
      <!-- РЫНОК ИГРОКОВ ДЛЯ ПОКУПКИ -->
      <div
        class="order-2 flex min-h-0 flex-col rounded-lg border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:order-1"
      >
        <div class="grid shrink-0 gap-2 2xl:grid-cols-[auto_minmax(0,1fr)] 2xl:items-end">
          <div class="grid w-full grid-cols-2 gap-2 2xl:grid-cols-[1fr_1.15fr_1.15fr_0.8fr_0.8fr]">
            <label class="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
              {{ t('transfers.search') }}
              <input
                v-model.trim="transferStore.marketSearchQuery"
                type="search"
                :placeholder="t('transfers.searchPlaceholder')"
                class="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 text-sm"
              />
            </label>

            <label class="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
              {{ t('transfers.league') }}
              <select
                v-model="transferStore.marketLeagueFilter"
                class="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="all">{{ t('transfers.allLeagues') }}</option>
                <option
                  v-for="league in transferStore.marketLeagueOptions"
                  :key="league.value"
                  :value="league.value"
                >
                  {{ league.label }}
                </option>
              </select>
            </label>
            <label class="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
              {{ t('transfers.club') }}
              <select
                v-model="transferStore.marketClubFilter"
                class="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm"
              >
                <option value="all">{{ t('transfers.allClubs') }}</option>
                <option
                  v-for="club in transferStore.marketClubOptions"
                  :key="club.value"
                  :value="club.value"
                >
                  {{ club.label }}
                </option>
              </select>
            </label>
            <label class="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
              {{ t('transfers.position') }}
              <select
                v-model="transferStore.marketPositionFilter"
                class="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm"
              >
                <option v-for="position in positions" :key="position" :value="position">
                  {{ positionLabel(position) }}
                </option>
              </select>
            </label>
            <label class="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
              {{ t('transfers.sorting') }}
              <select
                v-model="transferStore.marketSortKey"
                class="h-9 w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm"
              >
                <option v-for="sort in sortOptions" :key="sort" :value="sort">
                  {{ sortLabel(sort) }}
                </option>
              </select>
            </label>
          </div>
        </div>
        <div class="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-slate-200">
          <div
            v-for="item in transferStore.marketPlayers"
            :key="`${item.championshipId}:${item.player.id}`"
            class="grid gap-3 border-b border-slate-100 p-3 md:grid-cols-[1fr_80px_90px_110px_170px] md:items-center"
          >
            <div class="min-w-0">
              <div class="truncate font-semibold text-slate-950">
                {{ item.player.firstName }} {{ item.player.lastName }}
              </div>
              <div
                class="truncate text-sm text-slate-500"
                :title="`${item.clubName} · ${item.leagueName}`"
              >
                {{ item.clubName }} · {{ item.leagueName }} ·
                {{ positionLabel(item.player.position) }}
              </div>
            </div>
            <div class="text-sm text-slate-700">
              {{ t('common.ratingValue', { rating: item.player.rating }) }}
            </div>
            <div class="text-sm text-slate-700">
              {{ t('common.age', { age: item.player.age }) }}
            </div>
            <div class="font-semibold text-slate-950">{{ formatMoney(item.player.value) }}</div>
            <div class="grid gap-1">
              <Button
                size="small"
                :label="t('transfers.buyFirst')"
                :disabled="
                  gameStore.selectedClub.budget < item.player.value ||
                  gameStore.selectedClub.squad.length >= careerConfig.maximumSquadSize
                "
                @click="transferStore.buy(item.player.id, 'first')"
              />
              <Button
                size="small"
                severity="secondary"
                :label="t('transfers.buyReserve')"
                :disabled="
                  item.player.age > 23 ||
                  gameStore.selectedClub.budget < item.player.value ||
                  gameStore.selectedClub.squad.length >= careerConfig.maximumSquadSize
                "
                @click="transferStore.buy(item.player.id, 'reserve')"
              />
            </div>
          </div>
          <div
            v-if="!transferStore.marketPlayers.length"
            class="grid h-full min-h-40 place-items-center px-6 text-center text-sm text-slate-500"
          >
            {{
              !transferStore.marketSearchQuery &&
              transferStore.marketLeagueFilter === 'all' &&
              transferStore.marketClubFilter === 'all'
                ? t('transfers.startSearch')
                : t('transfers.noResults')
            }}
          </div>
        </div>
      </div>

      <!-- СОСТАВ КЛУБА ДЛЯ ПРОДАЖИ -->
      <div
        class="order-1 flex min-h-0 flex-col rounded-lg border border-white/70 bg-white/90 p-4 shadow-[0_18px_50px_rgba(20,46,38,0.1)] xl:order-2"
      >
        <div class="flex shrink-0 items-end justify-between gap-3">
          <h2 class="text-lg font-semibold text-slate-950">{{ t('transfers.sales') }}</h2>
          <div class="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 2xl:w-auto">
            <label class="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
              {{ t('transfers.position') }}
              <select
                v-model="transferStore.squadPositionFilter"
                class="h-9 w-full min-w-[9rem] rounded-md border border-slate-300 bg-white px-2 text-sm"
              >
                <option v-for="position in positions" :key="position" :value="position">
                  {{ positionLabel(position) }}
                </option>
              </select>
            </label>
            <label class="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-700">
              {{ t('transfers.sorting') }}
              <select
                v-model="transferStore.squadSortKey"
                class="h-9 w-full min-w-[9rem] rounded-md border border-slate-300 bg-white px-2 text-sm"
              >
                <option v-for="sort in sortOptions" :key="sort" :value="sort">
                  {{ sortLabel(sort) }}
                </option>
              </select>
            </label>
          </div>
        </div>
        <div class="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
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
                  price: formatMoney(
                    Math.round(player.value * careerConfig.transferSaleCoefficient),
                  ),
                })
              }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

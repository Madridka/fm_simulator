<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSquadStore } from '@/stores/squad/squadStore'
import { isPlayerSuspended, isPlayerUnavailable } from '@/domain/season/playerAvailability'
import type { Player } from '@/types/football'

interface StarterView {
  key: string
  label: string
  player?: Player
  x: number
  y: number
  mobileX: number
  mobileY: number
  mobileLineSize: number
}

const props = defineProps<{
  squadPath?: string
}>()

const squadStore = useSquadStore()
const { t } = useI18n()

const squadLink = computed(() => props.squadPath ?? '/squad')

const mobileLineY = [15, 32, 50, 70, 92]

// ВОЗВРАЩАЕТ ЛИНИЮ ИГРОКА НА МОБИЛЬНОМ ПОЛЕ
const getMobileLine = (y: number): number => {
  if (y <= 28) return 0
  if (y <= 43) return 1
  if (y <= 65) return 2
  if (y <= 85) return 3
  return 4
}

// СОЗДАЁТ КАРТУ ИГРОКОВ ПО ИДЕНТИФИКАТОРАМ
const playersById = computed(() => {
  const club = squadStore.club
  return new Map((club?.squad ?? []).map((player) => [player.id, player]))
})

// ФОРМИРУЕТ ДАННЫЕ СТАРТОВОГО СОСТАВА ДЛЯ ПОЛЯ
const starters = computed<StarterView[]>(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return []
  }

  const slots = squadStore.slots
  const lines = slots.reduce<Map<number, typeof slots>>((result, slot) => {
    const line = getMobileLine(slot.y)
    result.set(line, [...(result.get(line) ?? []), slot])
    return result
  }, new Map())

  return slots.map((slot) => {
    const playerId = lineup.starters[slot.id]
    const line = getMobileLine(slot.y)
    const lineSlots = [...(lines.get(line) ?? [])].sort((first, second) => first.x - second.x)
    const lineIndex = lineSlots.findIndex((lineSlot) => lineSlot.id === slot.id)
    const mobilePadding = lineSlots.length <= 2 ? 35 : lineSlots.length === 3 ? 20 : 15
    const mobileX =
      lineSlots.length === 1
        ? 50
        : mobilePadding +
          lineIndex * ((100 - mobilePadding * 2) / Math.max(1, lineSlots.length - 1))

    return {
      key: slot.id,
      label: slot.label,
      player: playerId ? playersById.value.get(playerId) : undefined,
      x: slot.x,
      y: slot.y,
      mobileX,
      mobileY: mobileLineY[line] ?? slot.y,
      mobileLineSize: lineSlots.length,
    }
  })
})

// ВОЗВРАЩАЕТ ШИРИНУ КАРТОЧКИ ИГРОКА
const mobileCardClass = (lineSize: number): string => {
  if (lineSize >= 5) return 'w-[60px] sm:w-[78px]'
  if (lineSize === 4) return 'w-[65px] sm:w-[92px]'
  return 'w-[80px] sm:w-[92px]'
}

// ВОЗВРАЩАЕТ ЦВЕТОВОЙ КЛАСС РЕЙТИНГА
const ratingClass = (rating?: number): string => {
  if (!rating) {
    return 'bg-slate-600'
  }
  if (rating >= 75) {
    return 'bg-emerald-700'
  }
  if (rating >= 64) {
    return 'bg-amber-600'
  }
  return 'bg-orange-700'
}

const availabilityLabel = (player?: Player): string => {
  if (!player) {
    return ''
  }

  const labels: string[] = []
  if (player.isInjured) {
    labels.push(t('squad.injury'))
  }
  if (isPlayerSuspended(player)) {
    labels.push(
      player.suspensionReason === 'second-yellow'
        ? t('squad.secondYellowSuspension')
        : t('squad.suspension'),
    )
  }
  return labels.join(' · ')
}
</script>

<template>
  <!-- КАРТОЧКА СТАРТОВОГО СОСТАВА -->
  <RouterLink
    :to="squadLink"
    class="group flex h-[560px] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_14px_40px_rgba(24,51,43,0.07)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_50px_rgba(24,51,43,0.12)] xl:h-auto"
  >
    <!-- ЗАГОЛОВОК ПАНЕЛИ СОСТАВА -->
    <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
      <div>
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          {{ squadStore.lineup?.formation }}
        </div>
        <h2 class="mt-0.5 text-lg font-black tracking-tight text-slate-950">
          {{ t('dashboard.startingLineup') }}
        </h2>
      </div>
      <span
        class="rounded-lg bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 transition group-hover:bg-emerald-100 group-hover:text-emerald-800"
      >
        {{ t('dashboard.openSquad') }}
      </span>
    </header>

    <!-- ТАКТИЧЕСКОЕ ПОЛЕ С ИГРОКАМИ -->
    <div
      class="relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,#142033,#0e1726)]"
    >
      <div class="pointer-events-none absolute inset-5 rounded-xl border-2 border-white/25"></div>
      <div class="pointer-events-none absolute inset-x-5 top-1/2 border-t-2 border-white/20"></div>
      <div
        class="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/20"
      ></div>

      <div
        v-for="starter in starters"
        :key="starter.key"
        class="absolute left-[var(--mobile-x)] top-[var(--mobile-y)] grid -translate-x-1/2 -translate-y-1/2 justify-items-center gap-0.5 rounded-md border border-white/15 bg-slate-950/80 px-1 py-1.5 text-center text-white shadow-[0_10px_22px_rgba(2,6,23,0.24)] sm:gap-1 sm:rounded-lg sm:px-2 sm:py-1.5"
        :class="[
          mobileCardClass(starter.mobileLineSize),
          {
            'border-rose-400 ring-2 ring-rose-500/60':
              starter.player && isPlayerUnavailable(starter.player),
          },
        ]"
        :style="{
          '--mobile-x': `${starter.mobileX}%`,
          '--mobile-y': `${starter.mobileY}%`,
        }"
      >
        <span
          v-if="starter.player && isPlayerUnavailable(starter.player)"
          class="absolute -right-1.5 -top-2 flex items-center gap-0.5 rounded bg-slate-950/95 px-1 py-0.5 text-[10px] leading-none shadow"
          :title="availabilityLabel(starter.player)"
          :aria-label="availabilityLabel(starter.player)"
        >
          <span v-if="starter.player.isInjured" aria-hidden="true">✚</span>
          <span v-if="isPlayerSuspended(starter.player)" aria-hidden="true">🟥</span>
        </span>
        <span
          class="grid h-6 min-w-6 place-items-center rounded-full border border-white/75 text-[9px] font-black sm:h-7 sm:min-w-7 sm:border-2 sm:text-[0.68rem]"
          :class="ratingClass(starter.player?.rating)"
        >
          {{ starter.player?.rating ?? '?' }}
        </span>
        <span
          class="max-w-full truncate text-[8px] font-black leading-none sm:text-[0.68rem] sm:leading-normal"
        >
          {{
            starter.player
              ? starter.player.lastName.toLocaleUpperCase('ru-RU')
              : starter.label
          }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

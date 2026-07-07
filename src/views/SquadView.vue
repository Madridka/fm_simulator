<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave } from 'vue-router'
import { useSquadStore } from '@/stores/squad/squadStore'
import { useToastStore } from '@/stores/ui/toastStore'
import type {
  Formation,
  Player,
  PlayerPosition,
  PlayerStats,
  TeamTacticsSettings,
} from '@/types/football'
import { defaultTeamTactics } from '@/domain/season/squadSelectionService'
import { formatMoney } from '@/utils/format'
import { isPlayerSuspended, isPlayerUnavailable } from '@/domain/season/playerAvailability'
import SectionHero from '@/components/ui/SectionHero.vue'
import TacticsPanel from '@/components/tactics/TacticsPanel.vue'
import { seasonsUntilPlayerRetirement } from '@/data/gameConfig/career'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

type DragSource = 'starter' | 'substitute' | 'reserve'

interface DragPayload {
  playerId: string
  source: DragSource
  slotId?: string
}

interface PointerDragState {
  active: boolean
  payload: DragPayload
  pointerId: number
  startX: number
  startY: number
}

interface PlayerStatisticsRow {
  id: string
  name: string
  position: string
  appearances: number
  goals: number
  assists: number
  cleanSheets: number
  yellowCards: number
  redCards: number
  averageRating: number
  matchesRated: number
}

interface PlayerContractRow {
  id: string
  name: string
  position: string
  age: number
  retirementSeasons: number
}

// ХРАНИЛИЩА СОСТАВА И ПОЛЬЗОВАТЕЛЬСКИХ УВЕДОМЛЕНИЙ
const squadStore = useSquadStore()
const toastStore = useToastStore()
const { t } = useI18n()
// СОСТОЯНИЕ МЫШИ, КАСАНИЯ И ЦЕЛИ ПЕРЕТАСКИВАНИЯ ИГРОКА
const draggingPlayerId = ref<string | null>(null)
const dragOverSlotId = ref<string | null>(null)
const dragOverGroup = ref<'substitutes' | 'reserve' | null>(null)
const selectedTouchPayload = ref<DragPayload | null>(null)
const activeSection = ref<'lineup' | 'tactics' | 'stats' | 'contracts'>('lineup')
let pointerDragState: PointerDragState | null = null
let suppressNextSlotClick = false

// СОЗДАЁТ КАРТУ ИГРОКОВ ПО ИДЕНТИФИКАТОРАМ
const playersById = computed(() => {
  const club = squadStore.club
  return new Map((club?.squad ?? []).map((player) => [player.id, player]))
})

// СОПОСТАВЛЯЕТ ПОЗИЦИИ С НАЗНАЧЕННЫМИ ИГРОКАМИ
const assignedPlayerBySlot = computed<Record<string, Player | undefined>>(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return {}
  }

  return Object.fromEntries(
    squadStore.slots.map((slot) => {
      const playerId = lineup.starters[slot.id]
      return [slot.id, playerId ? playersById.value.get(playerId) : undefined]
    }),
  )
})

// ФОРМИРУЕТ НАБОР ИДЕНТИФИКАТОРОВ СТАРТОВЫХ ИГРОКОВ
const starterIds = computed(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return new Set<string>()
  }
  return new Set(
    Object.values(lineup.starters).filter(
      (playerId): playerId is string => typeof playerId === 'string',
    ),
  )
})

// ВОЗВРАЩАЕТ СПИСОК ЗАПАСНЫХ ИГРОКОВ
const substitutePlayers = computed(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return []
  }

  return lineup.substitutes
    .map((playerId) => playersById.value.get(playerId))
    .filter((player): player is Player => Boolean(player))
})

// ВОЗВРАЩАЕТ ОТСОРТИРОВАННЫЙ СПИСОК РЕЗЕРВИСТОВ
const reservePlayers = computed(() => {
  const club = squadStore.club
  const lineup = squadStore.lineup
  if (!club || !lineup) {
    return []
  }

  const substituteIds = new Set(lineup.substitutes)
  return [...club.squad]
    .filter((player) => !starterIds.value.has(player.id) && !substituteIds.has(player.id))
    .sort((left, right) => right.rating - left.rating || right.form - left.form)
})

// РАССЧИТЫВАЕТ ОБЩУЮ СТОИМОСТЬ СОСТАВА
const totalValue = computed(
  () => squadStore.club?.squad.reduce((sum, player) => sum + player.value, 0) ?? 0,
)

const playerStats = (playerId: string): PlayerStats =>
  squadStore.gameStats[playerId] ?? {
    appearances: 0,
    goals: 0,
    assists: 0,
    yellowCards: 0,
    redCards: 0,
    cleanSheets: 0,
    averageRating: 0,
    matchesRated: 0,
  }

const statisticsRows = computed<PlayerStatisticsRow[]>(() =>
  (squadStore.club?.squad ?? []).map((player) => {
    const stats = playerStats(player.id)
    return {
      id: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: positionLabels[player.position],
      appearances: stats.appearances,
      goals: stats.goals,
      assists: stats.assists,
      cleanSheets: stats.cleanSheets,
      yellowCards: stats.yellowCards,
      redCards: stats.redCards,
      averageRating: stats.averageRating,
      matchesRated: stats.matchesRated,
    }
  }),
)

const contractRows = computed<PlayerContractRow[]>(() =>
  (squadStore.club?.squad ?? []).map((player) => ({
    id: player.id,
    name: `${player.firstName} ${player.lastName}`,
    position: positionLabels[player.position],
    age: player.age,
    retirementSeasons: seasonsUntilPlayerRetirement(player.age),
  })),
)

const retirementLabel = (seasons: number): string => {
  return seasons === 1
    ? t('squad.retirement.currentSeason')
    : t('squad.retirement.inSeasons', { count: seasons })
}

// ВОЗВРАЩАЕТ ПЕРВОЕ СООБЩЕНИЕ ОБ ОШИБКЕ СОСТАВА
const validationMessage = computed(() => squadStore.validation.errors[0] ?? '')

const positionLabels: Record<PlayerPosition, string> = {
  GK: t('common.positionShort.GK'),
  LB: t('common.positionShort.LB'),
  CB: t('common.positionShort.CB'),
  RB: t('common.positionShort.RB'),
  CDM: t('common.positionShort.CDM'),
  CM: t('common.positionShort.CM'),
  CAM: t('common.positionShort.CAM'),
  LW: t('common.positionShort.LW'),
  RW: t('common.positionShort.RW'),
  ST: t('common.positionShort.ST'),
}

const currentTactics = computed<TeamTacticsSettings>(() => ({
  ...defaultTeamTactics(squadStore.lineup?.tacticalStyle ?? 'balanced'),
  ...squadStore.lineup?.tactics,
}))

// ВОЗВРАЩАЕТ ЦВЕТОВОЙ КЛАСС РЕЙТИНГА
const ratingClass = (rating: number): string => {
  if (rating >= 75) {
    return 'bg-emerald-700'
  }
  if (rating >= 64) {
    return 'bg-amber-600'
  }
  return 'bg-orange-700'
}

// ВОЗВРАЩАЕТ ИГРОКА НА УКАЗАННОЙ ПОЗИЦИИ
const slotPlayer = (slotId: string): Player | undefined => assignedPlayerBySlot.value[slotId]

// ПОКАЗЫВАЕТ СРОК ВОЗВРАЩЕНИЯ ТРАВМИРОВАННОГО ИГРОКА
const injuryLabel = (player: Player | undefined): string => {
  if (!player?.isInjured) {
    return ''
  }
  return player.injuryUntilOrder
    ? t('squad.injuryReturn', { round: player.injuryUntilOrder })
    : t('squad.injury')
}

const suspensionLabel = (player: Player | undefined): string => {
  if (!player || !isPlayerSuspended(player)) return ''
  return player.suspensionReason === 'second-yellow'
    ? t('squad.secondYellowSuspension')
    : t('squad.suspension')
}

const availabilityLabel = (player: Player | undefined): string => {
  if (!player) return ''
  return [injuryLabel(player), suspensionLabel(player)].filter(Boolean).join(' · ')
}

// ФОРМИРУЕТ ПОДПИСЬ ТЕКУЩЕЙ ФОРМЫ И ГОТОВНОСТИ ИГРОКА
const conditionLabel = (player: Player): string =>
  t('squad.formFitness', { form: player.form, fitness: player.fitness.toFixed(0) })

// ДОБАВЛЯЕТ ВОЗРАСТ К ПОДПИСИ СОСТОЯНИЯ ИГРОКА
const conditionWithAgeLabel = (player: Player): string =>
  t('squad.formFitnessAge', {
    form: player.form,
    fitness: player.fitness,
    age: t('common.age', { age: player.age }),
  })

// ИЗМЕНЯЕТ ТАКТИЧЕСКУЮ СХЕМУ
const setFormation = (event: Event): void => {
  squadStore.setFormation((event.target as HTMLSelectElement).value as Formation)
}

// ИЗВЛЕКАЕТ ДАННЫЕ ИГРОКА ИЗ СОБЫТИЯ ПЕРЕТАСКИВАНИЯ
const dragPayload = (event: DragEvent): DragPayload | undefined => {
  const raw = event.dataTransfer?.getData('application/json')
  if (!raw) {
    return undefined
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DragPayload>
    if (!parsed.playerId || !parsed.source) {
      return undefined
    }
    return parsed as DragPayload
  } catch {
    return undefined
  }
}

// ЗАПУСКАЕТ ДЕСКТОПНОЕ ПЕРЕТАСКИВАНИЕ ИГРОКА
const startPlayerDrag = (
  event: DragEvent,
  player: Player,
  source: DragSource,
  slotId?: string,
): void => {
  const payload: DragPayload = { playerId: player.id, source, slotId }
  draggingPlayerId.value = player.id
  event.dataTransfer?.setData('application/json', JSON.stringify(payload))
  event.dataTransfer?.setData('text/plain', player.id)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

// ЗАВЕРШАЕТ ПЕРЕТАСКИВАНИЕ И СБРАСЫВАЕТ ПОДСВЕТКУ
const endPlayerDrag = (): void => {
  draggingPlayerId.value = null
  dragOverSlotId.value = null
  dragOverGroup.value = null
}

// ПЕРЕМЕЩАЕТ ИГРОКА НА ПОЗИЦИЮ
const movePayloadToSlot = (payload: DragPayload, slotId: string): void => {
  squadStore.movePlayerToSlot(slotId, payload.playerId, payload.source, payload.slotId)
}

// МЕНЯЕТ ПЕРЕТАСКИВАЕМОГО ИГРОКА С ЗАПАСНЫМ
const movePayloadToSubstitutePlayer = (payload: DragPayload, targetPlayer: Player): void => {
  if (payload.playerId === targetPlayer.id) {
    return
  }

  if (payload.source === 'starter' && payload.slotId) {
    squadStore.movePlayerToSlot(payload.slotId, targetPlayer.id, 'substitute')
  } else if (payload.source === 'reserve') {
    squadStore.swapSubstituteWithReserve(targetPlayer.id, payload.playerId)
  }
}

// МЕНЯЕТ ПЕРЕТАСКИВАЕМОГО ИГРОКА С РЕЗЕРВИСТОМ
const movePayloadToReservePlayer = (payload: DragPayload, targetPlayer: Player): void => {
  if (payload.playerId === targetPlayer.id) {
    return
  }

  if (payload.source === 'starter' && payload.slotId) {
    squadStore.movePlayerToSlot(payload.slotId, targetPlayer.id, 'reserve')
  } else if (payload.source === 'substitute') {
    squadStore.swapSubstituteWithReserve(payload.playerId, targetPlayer.id)
  }
}

// ОБРАБАТЫВАЕТ СБРОС ИГРОКА НА ПОЗИЦИЮ
const dropOnSlot = (event: DragEvent, slotId: string): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  movePayloadToSlot(payload, slotId)
  endPlayerDrag()
}

// ОБРАБАТЫВАЕТ СБРОС НА ЗАПАСНОГО ИГРОКА
const dropOnSubstitutePlayer = (event: DragEvent, targetPlayer: Player): void => {
  const payload = dragPayload(event)
  if (!payload) {
    endPlayerDrag()
    return
  }
  movePayloadToSubstitutePlayer(payload, targetPlayer)
  endPlayerDrag()
}

// ОБРАБАТЫВАЕТ СБРОС НА ИГРОКА РЕЗЕРВА
const dropOnReservePlayer = (event: DragEvent, targetPlayer: Player): void => {
  const payload = dragPayload(event)
  if (!payload) {
    endPlayerDrag()
    return
  }
  movePayloadToReservePlayer(payload, targetPlayer)
  endPlayerDrag()
}

// ОБРАБАТЫВАЕТ СБРОС В ОБЛАСТЬ ЗАПАСНЫХ
const dropOnSubstitutes = (event: DragEvent): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  squadStore.movePlayerToSubstitutes(payload.playerId)
  endPlayerDrag()
}

// ОБРАБАТЫВАЕТ СБРОС В ОБЛАСТЬ РЕЗЕРВА
const dropOnReserve = (event: DragEvent): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  squadStore.movePlayerToReserve(payload.playerId)
  endPlayerDrag()
}

// СРАВНИВАЕТ ДВА ОПИСАНИЯ ПЕРЕМЕЩЕНИЯ
const samePayload = (left: DragPayload, right: DragPayload): boolean =>
  left.playerId === right.playerId && left.source === right.source && left.slotId === right.slotId

// ВОЗВРАЩАЕТ ИГРОКА ИЗ МОБИЛЬНОЙ ЦЕЛИ КАСАНИЯ
const playerFromTouchTarget = (element: HTMLElement): Player | undefined => {
  const playerId = element.dataset.substitutePlayerId ?? element.dataset.reservePlayerId
  return playerId ? playersById.value.get(playerId) : undefined
}

// ПРИМЕНЯЕТ МОБИЛЬНОЕ ПЕРЕМЕЩЕНИЕ К ВЫБРАННОЙ ЦЕЛИ
const applyTouchDrop = (payload: DragPayload, element: HTMLElement): void => {
  const slotId = element.dataset.slotId
  if (slotId) {
    movePayloadToSlot(payload, slotId)
    return
  }

  const targetPlayer = playerFromTouchTarget(element)
  if (targetPlayer && element.dataset.substitutePlayerId) {
    movePayloadToSubstitutePlayer(payload, targetPlayer)
    return
  }
  if (targetPlayer && element.dataset.reservePlayerId) {
    movePayloadToReservePlayer(payload, targetPlayer)
    return
  }

  if (element.dataset.dropGroup === 'substitutes') {
    squadStore.movePlayerToSubstitutes(payload.playerId)
  } else if (element.dataset.dropGroup === 'reserve') {
    squadStore.movePlayerToReserve(payload.playerId)
  }
}

// НАХОДИТ ЦЕЛЬ ПЕРЕМЕЩЕНИЯ ПОД УКАЗАННОЙ ТОЧКОЙ
const touchDropTargetAt = (x: number, y: number): HTMLElement | null =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-touch-drop]') ?? null

// ОБНОВЛЯЕТ ПОДСВЕТКУ МОБИЛЬНОЙ ЦЕЛИ
const updateTouchDropHighlight = (element: HTMLElement | null): void => {
  dragOverSlotId.value = element?.dataset.slotId ?? null
  const group = element?.dataset.dropGroup
  dragOverGroup.value = group === 'substitutes' || group === 'reserve' ? group : null
}

// ОБРАБАТЫВАЕТ МОБИЛЬНУЮ ЗАМЕНУ ЧЕРЕЗ ДВА КАСАНИЯ
const handleTouchTap = (payload: DragPayload, targetElement: HTMLElement): void => {
  const selected = selectedTouchPayload.value
  if (!selected) {
    selectedTouchPayload.value = payload
    return
  }
  if (samePayload(selected, payload)) {
    selectedTouchPayload.value = null
    return
  }

  applyTouchDrop(selected, targetElement)
  selectedTouchPayload.value = null
}

// ЗАПУСКАЕТ МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ УКАЗАТЕЛЕМ
const startPointerDrag = (
  event: PointerEvent,
  player: Player,
  source: DragSource,
  slotId?: string,
): void => {
  if (event.pointerType === 'mouse') {
    return
  }

  pointerDragState = {
    active: false,
    payload: { playerId: player.id, source, slotId },
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

// ОБНОВЛЯЕТ МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ
const movePointerDrag = (event: PointerEvent): void => {
  const state = pointerDragState
  if (!state || state.pointerId !== event.pointerId) {
    return
  }

  if (!state.active && Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < 8) {
    return
  }

  state.active = true
  draggingPlayerId.value = state.payload.playerId
  event.preventDefault()
  updateTouchDropHighlight(touchDropTargetAt(event.clientX, event.clientY))
}

// ЗАВЕРШАЕТ МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ
const finishPointerDrag = (event: PointerEvent): void => {
  const state = pointerDragState
  if (!state || state.pointerId !== event.pointerId) {
    return
  }

  const target = touchDropTargetAt(event.clientX, event.clientY)
  if (state.active) {
    event.preventDefault()
    if (target) {
      applyTouchDrop(state.payload, target)
    }
    selectedTouchPayload.value = null
  } else {
    handleTouchTap(state.payload, target ?? (event.currentTarget as HTMLElement))
  }

  suppressNextSlotClick = true
  window.setTimeout(() => {
    suppressNextSlotClick = false
  })
  pointerDragState = null
  endPlayerDrag()
}

// ОТМЕНЯЕТ МОБИЛЬНОЕ ПЕРЕТАСКИВАНИЕ
const cancelPointerDrag = (): void => {
  pointerDragState = null
  endPlayerDrag()
}

// ПЕРЕМЕЩАЕТ ВЫБРАННОГО КАСАНИЕМ ИГРОКА НА ПОЗИЦИЮ
const selectTouchSlot = (slotId: string): void => {
  if (suppressNextSlotClick || !selectedTouchPayload.value) {
    return
  }
  movePayloadToSlot(selectedTouchPayload.value, slotId)
  selectedTouchPayload.value = null
}

// ПРОВЕРЯЕТ ВЫБОР ИГРОКА НА МОБИЛЬНОМ УСТРОЙСТВЕ
const isTouchSelected = (playerId: string): boolean =>
  selectedTouchPayload.value?.playerId === playerId

// ПОКАЗЫВАЕТ ПРЕДУПРЕЖДЕНИЕ ПРИ ОШИБКЕ СОСТАВА
watch(
  validationMessage,
  (message, previousMessage) => {
    if (!message || message === previousMessage) {
      return
    }
    toastStore.show(message, 'warning')
  },
  { immediate: true },
)

// ИСПРАВЛЯЕТ НЕКОРРЕКТНЫЙ СОСТАВ ПЕРЕД УХОДОМ СО СТРАНИЦЫ
onBeforeRouteLeave(() => {
  if (squadStore.club && squadStore.lineup && !squadStore.validation.valid) {
    squadStore.resetLineup()
    toastStore.show(t('squad.lineupFixed'), 'warning')
  }
})
</script>

<template>
  <!-- СТРАНИЦА УПРАВЛЕНИЯ СОСТАВОМ -->
  <section
    v-if="squadStore.club && squadStore.lineup"
    class="flex flex-col gap-3 xl:h-full xl:min-h-0 xl:overflow-hidden"
  >
    <!-- НАСТРОЙКИ ФОРМАЦИИ И ТАКТИКИ -->
    <SectionHero
      :title="t('squad.title')"
      :subtitle="`${squadStore.club.name} ${t('common.separator')} ${t('common.playersCount', { count: squadStore.club.squad.length })} ${t('common.separator')} ${formatMoney(totalValue)}`"
    >
      <template #actions>
        <div class="flex flex-wrap items-end gap-2">
          <div class="flex h-9 rounded-lg bg-emerald-950/60 p-1 text-xs font-black">
            <button
              type="button"
              class="rounded-md px-3"
              :class="activeSection === 'lineup' ? 'bg-white text-emerald-900' : 'text-emerald-100'"
              @click="activeSection = 'lineup'"
            >
              Состав
            </button>
            <button
              type="button"
              class="rounded-md px-3"
              :class="activeSection === 'stats' ? 'bg-white text-emerald-900' : 'text-emerald-100'"
              @click="activeSection = 'stats'"
            >
              Статистика
            </button>
            <button
              type="button"
              class="rounded-md px-3"
              :class="
                activeSection === 'tactics' ? 'bg-white text-emerald-900' : 'text-emerald-100'
              "
              @click="activeSection = 'tactics'"
            >
              РўР°РєС‚РёРєР°
            </button>
            <button
              type="button"
              class="rounded-md px-3"
              :class="
                activeSection === 'contracts' ? 'bg-white text-emerald-900' : 'text-emerald-100'
              "
              @click="activeSection = 'contracts'"
            >
              {{ t('squad.contracts') }}
            </button>
          </div>
          <div
            class="flex h-9 items-center gap-1 self-end rounded-lg border border-emerald-700 bg-emerald-900 px-3 text-sm font-black text-white"
          >
            <span class="text-xs font-bold text-emerald-100/70">
              {{ t('dashboard.rating') }}
            </span>
            <span>{{ squadStore.teamRating }}</span>
            <span class="text-[10px] text-emerald-100/50">/ 100</span>
          </div>
          <label class="flex flex-col gap-1 text-xs font-bold text-emerald-100/70">
            {{ t('squad.formation') }}
            <select
              class="h-9 rounded-lg border border-emerald-700 bg-emerald-900 px-3 text-sm text-white outline-none focus:border-emerald-400"
              :value="squadStore.lineup.formation"
              @change="setFormation"
            >
              <option
                v-for="formation in squadStore.formations"
                :key="formation"
                :value="formation"
                class="bg-emerald-950 text-white"
              >
                {{ formation }}
              </option>
            </select>
          </label>
          <Button
            class="!h-9 self-end"
            severity="secondary"
            :label="t('squad.autoLineup')"
            @click="squadStore.resetLineup"
          />
        </div>
      </template>
    </SectionHero>

    <!-- ТАКТИЧЕСКАЯ СХЕМА И СПИСОК КОМАНДЫ -->
    <div
      v-if="activeSection === 'lineup'"
      class="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]"
    >
      <!-- СТАРТОВЫЙ СОСТАВ И ЗАПАСНЫЕ -->
      <div
        class="grid grid-rows-[520px_112px] gap-3 overflow-hidden xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_112px]"
      >
        <!-- ТАКТИЧЕСКОЕ ПОЛЕ -->
        <div
          class="relative min-h-0 overflow-hidden rounded-lg border border-white/15 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_16%,transparent_16%_100%),linear-gradient(90deg,rgba(255,255,255,0.04)_50%,transparent_50%),linear-gradient(180deg,#152233,#101928)] shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
        >
          <div
            class="pointer-events-none absolute inset-[26px] rounded-lg border-2 border-white/30"
          ></div>
          <div
            class="pointer-events-none absolute inset-x-[26px] top-1/2 border-t-2 border-white/30"
          ></div>
          <div
            class="pointer-events-none absolute left-1/2 top-1/2 h-[132px] w-[132px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30"
          ></div>
          <div
            class="pointer-events-none absolute left-1/2 top-[26px] h-[104px] w-[260px] -translate-x-1/2 rounded-b-lg border-2 border-t-0 border-white/30"
          ></div>
          <div
            class="pointer-events-none absolute bottom-[26px] left-1/2 h-[104px] w-[260px] -translate-x-1/2 rounded-t-lg border-2 border-b-0 border-white/30"
          ></div>

          <button
            v-for="slot in squadStore.slots"
            :key="slot.id"
            type="button"
            data-touch-drop
            :data-slot-id="slot.id"
            class="absolute grid min-h-[58px] w-[62px] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_auto_auto_auto] justify-items-start gap-0.5 rounded-lg border border-slate-400/30 bg-slate-950/85 p-1 text-left text-slate-50 shadow-[0_12px_26px_rgba(2,6,23,0.22)] transition hover:-translate-y-[52%] hover:border-lime-200 sm:min-h-[68px] sm:w-[88px] sm:p-1.5 xl:min-h-[74px] xl:w-[126px] xl:gap-1 xl:p-[6px_7px]"
            :class="{
              'border-dashed bg-slate-950/60': !slotPlayer(slot.id),
              'border-lime-400 shadow-[0_0_0_2px_rgba(163,230,53,0.24),0_12px_26px_rgba(2,6,23,0.22)]':
                slot.id === dragOverSlotId,
              'ring-2 ring-cyan-300':
                Boolean(slotPlayer(slot.id)) && isTouchSelected(slotPlayer(slot.id)!.id),
              'opacity-45': slotPlayer(slot.id)?.id === draggingPlayerId,
              'border-rose-400 ring-2 ring-rose-500/50':
                Boolean(slotPlayer(slot.id)) && isPlayerUnavailable(slotPlayer(slot.id)!),
            }"
            :style="{ left: `${slot.x}%`, top: `${slot.y}%` }"
            :draggable="Boolean(slotPlayer(slot.id))"
            @dragstart="
              slotPlayer(slot.id) &&
              startPlayerDrag($event, slotPlayer(slot.id)!, 'starter', slot.id)
            "
            @dragend="endPlayerDrag"
            @pointerdown="
              slotPlayer(slot.id) &&
              startPointerDrag($event, slotPlayer(slot.id)!, 'starter', slot.id)
            "
            @pointermove="movePointerDrag"
            @pointerup="finishPointerDrag"
            @pointercancel="cancelPointerDrag"
            @click="selectTouchSlot(slot.id)"
            @dragenter.prevent="dragOverSlotId = slot.id"
            @dragover.prevent="dragOverSlotId = slot.id"
            @dragleave="dragOverSlotId === slot.id && (dragOverSlotId = null)"
            @drop.prevent="dropOnSlot($event, slot.id)"
          >
            <template v-if="slotPlayer(slot.id)">
              <span
                v-if="isPlayerUnavailable(slotPlayer(slot.id)!)"
                class="absolute -right-2 -top-2 z-10 flex items-center gap-0.5"
              >
                <span
                  v-if="slotPlayer(slot.id)?.isInjured"
                  :title="injuryLabel(slotPlayer(slot.id))"
                  :aria-label="injuryLabel(slotPlayer(slot.id))"
                  class="inline-grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-orange-500 text-xs font-black text-white shadow-lg"
                  >✚</span
                >
                <span
                  v-if="isPlayerSuspended(slotPlayer(slot.id)!)"
                  :title="suspensionLabel(slotPlayer(slot.id))"
                  :aria-label="suspensionLabel(slotPlayer(slot.id))"
                  class="inline-grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-rose-600 text-[11px] shadow-lg"
                  >🟥</span
                >
              </span>
              <span class="flex items-center gap-1.5">
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.52rem] font-black leading-none text-white sm:h-[26px] sm:min-w-[26px] sm:text-xs xl:h-[30px] xl:min-w-[30px] xl:text-[0.7rem]"
                >
                  {{ positionLabels[slotPlayer(slot.id)?.position ?? slot.position] }}
                </span>
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-white/80 text-[0.52rem] font-black leading-none text-white sm:h-[26px] sm:min-w-[26px] sm:text-xs xl:h-[30px] xl:min-w-[30px] xl:text-[0.7rem]"
                  :class="ratingClass(slotPlayer(slot.id)?.rating ?? 0)"
                >
                  {{ slotPlayer(slot.id)?.rating }}
                </span>
              </span>
              <span
                class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.55rem] font-black uppercase sm:text-[0.68rem] xl:text-[0.78rem]"
              >
                {{ slotPlayer(slot.id)?.lastName }}
              </span>
              <span
                class="hidden w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-bold text-slate-200/75 sm:block"
              >
                <template v-if="isPlayerUnavailable(slotPlayer(slot.id)!)">
                  {{ availabilityLabel(slotPlayer(slot.id)) }}
                </template>
                <template v-else>
                  {{ conditionLabel(slotPlayer(slot.id)!) }}
                </template>
              </span>
              <span
                class="hidden h-1.5 w-full overflow-hidden rounded-full bg-slate-400/35 sm:block"
              >
                <span
                  class="block h-full rounded-full bg-lime-400"
                  :style="{ width: `${slotPlayer(slot.id)?.fitness ?? 0}%` }"
                ></span>
              </span>
            </template>
            <template v-else>
              <span class="flex items-center gap-1.5">
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.52rem] font-black leading-none text-white sm:h-[26px] sm:min-w-[26px] sm:text-xs xl:h-[30px] xl:min-w-[30px] xl:text-[0.7rem]"
                >
                  {{ positionLabels[slot.position] }}
                </span>
                <span
                  class="inline-grid h-[22px] min-w-[22px] place-items-center rounded-full border-2 border-white/80 bg-orange-700 text-[0.52rem] font-black leading-none text-white sm:h-[26px] sm:min-w-[26px] sm:text-xs xl:h-[30px] xl:min-w-[30px] xl:text-[0.7rem]"
                  >?</span
                >
              </span>
              <span
                class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.55rem] font-black uppercase sm:text-[0.68rem] xl:text-[0.78rem]"
                >{{ t('squad.empty') }}</span
              >
              <span
                class="hidden w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-bold text-slate-200/75 sm:block"
                >{{ t('squad.dragPlayer') }}</span
              >
            </template>
          </button>
        </div>

        <!-- ЛЕНТА ЗАПАСНЫХ ИГРОКОВ -->
        <div
          data-touch-drop
          data-drop-group="substitutes"
          class="grid min-h-0 grid-cols-[repeat(7,minmax(92px,1fr))] gap-2 overflow-x-auto rounded-lg border border-white/70 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_18%,transparent_18%_100%),#121d2e] p-2.5 shadow-[0_12px_32px_rgba(20,46,38,0.08)]"
          :class="{
            'shadow-[0_0_0_2px_rgba(163,230,53,0.34),0_12px_32px_rgba(20,46,38,0.08)]':
              dragOverGroup === 'substitutes',
          }"
          @dragenter.prevent="dragOverGroup = 'substitutes'"
          @dragover.prevent="dragOverGroup = 'substitutes'"
          @dragleave="dragOverGroup === 'substitutes' && (dragOverGroup = null)"
          @drop.prevent="dropOnSubstitutes"
        >
          <button
            v-for="player in substitutePlayers"
            :key="player.id"
            type="button"
            data-touch-drop
            :data-substitute-player-id="player.id"
            class="relative grid min-w-[92px] grid-rows-[auto_auto_auto_auto] justify-items-start gap-0.5 rounded-lg border border-slate-400/30 bg-slate-950/80 p-1.5 text-left text-slate-50 hover:border-lime-200"
            :class="{
              'border-rose-400/80 ring-1 ring-rose-500/40': isPlayerUnavailable(player),
              'opacity-45': player.id === draggingPlayerId,
              'ring-2 ring-cyan-300': isTouchSelected(player.id),
            }"
            draggable="true"
            @dragstart="startPlayerDrag($event, player, 'substitute')"
            @dragend="endPlayerDrag"
            @pointerdown="startPointerDrag($event, player, 'substitute')"
            @pointermove="movePointerDrag"
            @pointerup="finishPointerDrag"
            @pointercancel="cancelPointerDrag"
            @dragenter.stop.prevent
            @dragover.stop.prevent
            @drop.stop.prevent="dropOnSubstitutePlayer($event, player)"
          >
            <span
              v-if="isPlayerUnavailable(player)"
              class="absolute -right-1.5 -top-1.5 z-10 flex items-center gap-0.5"
            >
              <span
                v-if="player.isInjured"
                :title="injuryLabel(player)"
                class="inline-grid h-5 w-5 place-items-center rounded-full border border-white bg-orange-500 text-[10px] font-black text-white"
                >✚</span
              >
              <span
                v-if="isPlayerSuspended(player)"
                :title="suspensionLabel(player)"
                class="inline-grid h-5 w-5 place-items-center rounded-full border border-white bg-rose-600 text-[9px]"
                >🟥</span
              >
            </span>
            <span class="flex items-center gap-1.5">
              <span
                class="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.62rem] font-black leading-none text-white"
                >{{ positionLabels[player.position] }}</span
              >
              <span
                class="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-white/80 text-[0.62rem] font-black leading-none text-white"
                :class="ratingClass(player.rating)"
                >{{ player.rating }}</span
              >
            </span>
            <span
              class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-black uppercase"
              >{{ player.lastName }}</span
            >
            <span
              class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.58rem] font-bold text-slate-200/75"
              >{{
                isPlayerUnavailable(player) ? availabilityLabel(player) : conditionLabel(player)
              }}</span
            >
            <span class="h-1.5 w-full overflow-hidden rounded-full bg-slate-400/35"
              ><span
                class="block h-full rounded-full bg-lime-400"
                :style="{ width: `${player.fitness}%` }"
              ></span
            ></span>
          </button>
          <div v-if="!substitutePlayers.length" class="px-4 py-6 text-sm text-slate-500">
            {{ t('squad.dragSubstitutes') }}
          </div>
        </div>
      </div>

      <!-- РЕЗЕРВНЫЕ ИГРОКИ -->
      <aside
        class="flex h-[420px] min-h-0 flex-col overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-[0_12px_32px_rgba(20,46,38,0.08)] xl:h-auto"
      >
        <div class="flex items-start justify-between gap-3 px-4 pb-2.5 pt-4">
          <div>
            <h2 class="text-base font-semibold text-slate-950">{{ t('squad.team') }}</h2>
            <p class="mt-0.5 text-xs text-slate-500">{{ t('squad.outsideLineup') }}</p>
          </div>
        </div>

        <div
          data-touch-drop
          data-drop-group="reserve"
          class="min-h-0 flex-1 overflow-hidden px-4 pb-4"
          :class="{ 'bg-emerald-50': dragOverGroup === 'reserve' }"
          @dragenter.prevent="dragOverGroup = 'reserve'"
          @dragover.prevent="dragOverGroup = 'reserve'"
          @dragleave="dragOverGroup === 'reserve' && (dragOverGroup = null)"
          @drop.prevent="dropOnReserve"
        >
          <h3 class="mb-2 text-xs font-black uppercase text-slate-700">
            {{ t('squad.reserve') }}
          </h3>
          <div class="grid max-h-full gap-1.5 overflow-y-auto pr-0.5">
            <button
              v-for="player in reservePlayers"
              :key="player.id"
              type="button"
              data-touch-drop
              :data-reserve-player-id="player.id"
              class="relative grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[#dbe7de] bg-white px-2 py-1.5 text-left transition hover:-translate-y-px hover:border-emerald-300 hover:bg-[#f7fdf8]"
              :class="{
                'border-rose-300 bg-rose-50': isPlayerUnavailable(player),
                'opacity-45': player.id === draggingPlayerId,
                'ring-2 ring-cyan-400': isTouchSelected(player.id),
              }"
              draggable="true"
              @dragstart="startPlayerDrag($event, player, 'reserve')"
              @dragend="endPlayerDrag"
              @pointerdown="startPointerDrag($event, player, 'reserve')"
              @pointermove="movePointerDrag"
              @pointerup="finishPointerDrag"
              @pointercancel="cancelPointerDrag"
              @dragenter.stop.prevent
              @dragover.stop.prevent
              @drop.stop.prevent="dropOnReservePlayer($event, player)"
            >
              <span
                v-if="isPlayerUnavailable(player)"
                class="absolute right-1 top-1 flex items-center gap-0.5"
              >
                <span
                  v-if="player.isInjured"
                  :title="injuryLabel(player)"
                  class="text-sm leading-none text-orange-600"
                  >✚</span
                >
                <span
                  v-if="isPlayerSuspended(player)"
                  :title="suspensionLabel(player)"
                  class="text-[10px] leading-none"
                  >🟥</span
                >
              </span>
              <span
                class="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.62rem] font-black leading-none text-white"
                >{{ positionLabels[player.position] }}</span
              >
              <span class="grid min-w-0">
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-bold text-slate-950"
                  >{{ player.firstName }} {{ player.lastName }}</span
                >
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] text-slate-500"
                  >{{
                    isPlayerUnavailable(player)
                      ? availabilityLabel(player)
                      : conditionWithAgeLabel(player)
                  }}</span
                >
              </span>
              <span
                class="inline-grid h-[26px] min-w-[26px] place-items-center rounded-full border-2 border-white/80 text-[0.62rem] font-black leading-none text-white"
                :class="ratingClass(player.rating)"
                >{{ player.rating }}</span
              >
            </button>
          </div>
        </div>
      </aside>
    </div>
    <article
      v-else-if="activeSection === 'tactics'"
      class="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(20,46,38,0.08)] sm:p-5"
    >
      <div class="mb-4">
        <h2 class="text-lg font-black text-slate-950">РўР°РєС‚РёРєР°</h2>
        <p class="mt-1 text-sm text-slate-500">
          РљРѕРјР°РЅРґС‹ Рё СЂР°Р·РіРѕРІРѕСЂС‹ РґРѕСЃС‚СѓРїРЅС‹ С‚РѕР»СЊРєРѕ РІРѕ РІСЂРµРјСЏ РјР°С‚С‡Р°.
        </p>
      </div>
      <TacticsPanel
        :model-value="currentTactics"
        :exclude-keys="['matchCommand', 'teamTalk']"
        @change="squadStore.setTactics"
      />
    </article>
    <article
      v-else-if="activeSection === 'stats'"
      class="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(20,46,38,0.08)] sm:p-5"
    >
      <DataTable
        :value="statisticsRows"
        data-key="id"
        sort-field="appearances"
        :sort-order="-1"
        removable-sort
        striped-rows
        size="small"
        scrollable
        scroll-height="flex"
        class="h-full text-sm"
        table-style="min-width: 760px"
      >
        <Column field="name" header="Игрок" sortable frozen>
          <template #body="{ data }">
            <span class="whitespace-nowrap font-bold text-slate-900">{{ data.name }}</span>
          </template>
        </Column>
        <Column field="position" header="Поз." sortable />
        <Column field="appearances" header="Матчи" sortable class="text-right" />
        <Column field="goals" header="Голы" sortable class="text-right font-semibold" />
        <Column field="assists" header="ГП" sortable class="text-right" />
        <Column field="cleanSheets" header="Сух." sortable class="text-right" />
        <Column field="yellowCards" header="ЖК" sortable class="text-right" />
        <Column field="redCards" header="КК" sortable class="text-right" />
        <Column field="averageRating" header="Оценка" sortable class="text-right">
          <template #body="{ data }">
            <span class="font-black text-emerald-700">
              {{ data.matchesRated ? data.averageRating.toFixed(2) : '—' }}
            </span>
          </template>
        </Column>
      </DataTable>
    </article>
    <article
      v-else
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-[0_12px_32px_rgba(20,46,38,0.08)] sm:p-5"
    >
      <div class="mb-4">
        <h2 class="text-lg font-black text-slate-950">{{ t('squad.contracts') }}</h2>
        <p class="mt-1 text-sm text-slate-500">{{ t('squad.retirement.description') }}</p>
      </div>
      <DataTable
        :value="contractRows"
        data-key="id"
        sort-field="retirementSeasons"
        :sort-order="1"
        removable-sort
        striped-rows
        size="small"
        scrollable
        scroll-height="flex"
        class="min-h-0 flex-1 text-sm"
        table-style="min-width: 640px"
      >
        <Column field="name" :header="t('squad.retirement.player')" sortable frozen>
          <template #body="{ data }">
            <span class="whitespace-nowrap font-bold text-slate-900">{{ data.name }}</span>
          </template>
        </Column>
        <Column field="position" :header="t('squad.retirement.position')" sortable />
        <Column field="age" :header="t('squad.retirement.age')" sortable class="text-right" />
        <Column field="retirementSeasons" :header="t('squad.retirement.departure')" sortable>
          <template #body="{ data }">
            <span
              class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold"
              :class="
                data.retirementSeasons === 1
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-100 text-slate-600'
              "
              >{{ retirementLabel(data.retirementSeasons) }}</span
            >
          </template>
        </Column>
      </DataTable>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useSquadStore } from '@/stores/squad/squadStore'
import { useToastStore } from '@/stores/ui/toastStore'
import type { Formation, Player, PlayerPosition, TacticalStyle } from '@/types/football'
import { formatMoney } from '@/utils/format'

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

const squadStore = useSquadStore()
const toastStore = useToastStore()
const draggingPlayerId = ref<string | null>(null)
const dragOverSlotId = ref<string | null>(null)
const dragOverGroup = ref<'substitutes' | 'reserve' | null>(null)
const selectedTouchPayload = ref<DragPayload | null>(null)
let pointerDragState: PointerDragState | null = null
let suppressNextSlotClick = false

const playersById = computed(() => {
  const club = squadStore.club
  return new Map((club?.squad ?? []).map((player) => [player.id, player]))
})

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

const substitutePlayers = computed(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return []
  }

  return lineup.substitutes
    .map((playerId) => playersById.value.get(playerId))
    .filter((player): player is Player => Boolean(player))
})

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

const totalValue = computed(
  () => squadStore.club?.squad.reduce((sum, player) => sum + player.value, 0) ?? 0,
)

const validationMessage = computed(() => squadStore.validation.errors[0] ?? '')

const positionLabels: Record<PlayerPosition, string> = {
  GK: 'ВР',
  LB: 'ЛЗ',
  CB: 'ЦЗ',
  RB: 'ПЗ',
  CDM: 'ЦОП',
  CM: 'ЦП',
  CAM: 'ЦАП',
  LW: 'ЛФА',
  RW: 'ПФА',
  ST: 'ФРВ',
}

const tacticLabels: Record<TacticalStyle, string> = {
  defensive: 'Оборона',
  balanced: 'Баланс',
  attacking: 'Атака',
}

const ratingClass = (rating: number): string => {
  if (rating >= 75) {
    return 'bg-emerald-700'
  }
  if (rating >= 64) {
    return 'bg-amber-600'
  }
  return 'bg-orange-700'
}

const slotPlayer = (slotId: string): Player | undefined => assignedPlayerBySlot.value[slotId]

const setFormation = (event: Event): void => {
  squadStore.setFormation((event.target as HTMLSelectElement).value as Formation)
}

const setTactic = (event: Event): void => {
  squadStore.setTacticalStyle((event.target as HTMLSelectElement).value as TacticalStyle)
}

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

const endPlayerDrag = (): void => {
  draggingPlayerId.value = null
  dragOverSlotId.value = null
  dragOverGroup.value = null
}

const movePayloadToSlot = (payload: DragPayload, slotId: string): void => {
  squadStore.movePlayerToSlot(slotId, payload.playerId, payload.source, payload.slotId)
}

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

const dropOnSlot = (event: DragEvent, slotId: string): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  movePayloadToSlot(payload, slotId)
  endPlayerDrag()
}

const dropOnSubstitutePlayer = (event: DragEvent, targetPlayer: Player): void => {
  const payload = dragPayload(event)
  if (!payload) {
    endPlayerDrag()
    return
  }
  movePayloadToSubstitutePlayer(payload, targetPlayer)
  endPlayerDrag()
}

const dropOnReservePlayer = (event: DragEvent, targetPlayer: Player): void => {
  const payload = dragPayload(event)
  if (!payload) {
    endPlayerDrag()
    return
  }
  movePayloadToReservePlayer(payload, targetPlayer)
  endPlayerDrag()
}

const dropOnSubstitutes = (event: DragEvent): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  squadStore.movePlayerToSubstitutes(payload.playerId)
  endPlayerDrag()
}

const dropOnReserve = (event: DragEvent): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  squadStore.movePlayerToReserve(payload.playerId)
  endPlayerDrag()
}

const samePayload = (left: DragPayload, right: DragPayload): boolean =>
  left.playerId === right.playerId && left.source === right.source && left.slotId === right.slotId

const playerFromTouchTarget = (element: HTMLElement): Player | undefined => {
  const playerId = element.dataset.substitutePlayerId ?? element.dataset.reservePlayerId
  return playerId ? playersById.value.get(playerId) : undefined
}

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

const touchDropTargetAt = (x: number, y: number): HTMLElement | null =>
  document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-touch-drop]') ?? null

const updateTouchDropHighlight = (element: HTMLElement | null): void => {
  dragOverSlotId.value = element?.dataset.slotId ?? null
  const group = element?.dataset.dropGroup
  dragOverGroup.value = group === 'substitutes' || group === 'reserve' ? group : null
}

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

const cancelPointerDrag = (): void => {
  pointerDragState = null
  endPlayerDrag()
}

const selectTouchSlot = (slotId: string): void => {
  if (suppressNextSlotClick || !selectedTouchPayload.value) {
    return
  }
  movePayloadToSlot(selectedTouchPayload.value, slotId)
  selectedTouchPayload.value = null
}

const isTouchSelected = (playerId: string): boolean =>
  selectedTouchPayload.value?.playerId === playerId

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

onBeforeRouteLeave(() => {
  if (squadStore.club && squadStore.lineup && !squadStore.validation.valid) {
    squadStore.resetLineup()
    toastStore.show('Состав был исправлен автоматически.', 'warning')
  }
})
</script>

<template>
  <section
    v-if="squadStore.club && squadStore.lineup"
    class="flex flex-col gap-3 xl:h-full xl:min-h-0 xl:overflow-hidden"
  >
    <div
      class="shrink-0 rounded-lg border border-white/70 bg-white/90 px-4 py-3 shadow-[0_12px_32px_rgba(20,46,38,0.08)]"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 class="text-xl font-bold leading-tight text-slate-950">Состав</h1>
          <p class="mt-0.5 text-xs text-slate-600">
            {{ squadStore.club.name }} · {{ squadStore.club.squad.length }} игроков ·
            {{ formatMoney(totalValue) }}
          </p>
        </div>

        <div class="flex flex-wrap items-end gap-2">
          <label class="flex flex-col gap-1 text-xs font-bold text-slate-700">
            Формация
            <select
              class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              :value="squadStore.lineup.formation"
              @change="setFormation"
            >
              <option
                v-for="formation in squadStore.formations"
                :key="formation"
                :value="formation"
              >
                {{ formation }}
              </option>
            </select>
          </label>
          <label class="flex flex-col gap-1 text-xs font-bold text-slate-700">
            Тактика
            <select
              class="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm"
              :value="squadStore.lineup.tacticalStyle"
              @change="setTactic"
            >
              <option v-for="style in squadStore.tacticalStyles" :key="style" :value="style">
                {{ tacticLabels[style] }}
              </option>
            </select>
          </label>
          <Button
            class="!h-9 self-end"
            severity="secondary"
            label="Автосостав"
            @click="squadStore.resetLineup"
          />
        </div>
      </div>
      <p class="mt-3 text-xs font-medium text-slate-500 xl:hidden">
        {{
          selectedTouchPayload
            ? 'Теперь коснитесь позиции или другого игрока для замены.'
            : 'Перетащите игрока или коснитесь его, а затем нужной позиции.'
        }}
      </p>
    </div>

    <div
      class="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(260px,340px)]"
    >
      <!-- СОСТАВ -->
      <div
        class="grid grid-rows-[520px_112px] gap-3 overflow-hidden xl:min-h-0 xl:grid-rows-[minmax(0,1fr)_112px]"
      >
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
                Форма {{ slotPlayer(slot.id)?.form }} · Готовность
                {{ slotPlayer(slot.id)?.fitness }}
              </span>
              <span class="hidden h-1.5 w-full overflow-hidden rounded-full bg-slate-400/35 sm:block">
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
                >Пусто</span
              >
              <span
                class="hidden w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-bold text-slate-200/75 sm:block"
                >Перетащите игрока</span
              >
            </template>
          </button>
        </div>

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
            class="grid min-w-[92px] grid-rows-[auto_auto_auto_auto] justify-items-start gap-0.5 rounded-lg border border-slate-400/30 bg-slate-950/80 p-1.5 text-left text-slate-50 hover:border-lime-200"
            :class="{
              'opacity-50': player.isInjured,
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
              >Форма {{ player.form }} · Готовность {{ player.fitness }}</span
            >
            <span class="h-1.5 w-full overflow-hidden rounded-full bg-slate-400/35"
              ><span
                class="block h-full rounded-full bg-lime-400"
                :style="{ width: `${player.fitness}%` }"
              ></span
            ></span>
          </button>
          <div v-if="!substitutePlayers.length" class="px-4 py-6 text-sm text-slate-500">
            Перетащите сюда игроков замены.
          </div>
        </div>
      </div>

      <!-- ЗАМЕНЫ -->
      <aside
        class="flex h-[420px] min-h-0 flex-col overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-[0_12px_32px_rgba(20,46,38,0.08)] xl:h-auto"
      >
        <div class="flex items-start justify-between gap-3 px-4 pb-2.5 pt-4">
          <div>
            <h2 class="text-base font-semibold text-slate-950">Команда</h2>
            <p class="mt-0.5 text-xs text-slate-500">Игроки вне заявки</p>
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
          <h3 class="mb-2 text-xs font-black uppercase text-slate-700">Резерв</h3>
          <div class="grid max-h-full gap-1.5 overflow-y-auto pr-0.5">
            <button
              v-for="player in reservePlayers"
              :key="player.id"
              type="button"
              data-touch-drop
              :data-reserve-player-id="player.id"
              class="grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[#dbe7de] bg-white px-2 py-1.5 text-left transition hover:-translate-y-px hover:border-emerald-300 hover:bg-[#f7fdf8]"
              :class="{
                'opacity-50': player.isInjured,
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
                  >Форма {{ player.form }} · Готовность {{ player.fitness }} ·
                  {{ player.age }} лет</span
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
  </section>
</template>

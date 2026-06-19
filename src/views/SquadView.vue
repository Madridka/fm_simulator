<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSquadStore } from '@/stores/squadStore'
import type { Formation, Player, PlayerPosition, TacticalStyle } from '@/types/football'
import { formatMoney } from '@/utils/format'

type DragSource = 'starter' | 'substitute' | 'reserve'

interface DragPayload {
  playerId: string
  source: DragSource
  slotId?: string
}

const squadStore = useSquadStore()
const draggingPlayerId = ref<string | null>(null)
const dragOverSlotId = ref<string | null>(null)
const dragOverGroup = ref<'substitutes' | 'reserve' | null>(null)

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

const dropOnSlot = (event: DragEvent, slotId: string): void => {
  const payload = dragPayload(event)
  if (!payload) {
    return
  }
  squadStore.movePlayerToSlot(slotId, payload.playerId, payload.source, payload.slotId)
  endPlayerDrag()
}

const dropOnSubstitutePlayer = (event: DragEvent, targetPlayer: Player): void => {
  const payload = dragPayload(event)
  if (!payload || payload.playerId === targetPlayer.id) {
    endPlayerDrag()
    return
  }

  if (payload.source === 'starter' && payload.slotId) {
    squadStore.movePlayerToSlot(payload.slotId, targetPlayer.id, 'substitute')
  } else if (payload.source === 'reserve') {
    squadStore.swapSubstituteWithReserve(targetPlayer.id, payload.playerId)
  }
  endPlayerDrag()
}

const dropOnReservePlayer = (event: DragEvent, targetPlayer: Player): void => {
  const payload = dragPayload(event)
  if (!payload || payload.playerId === targetPlayer.id) {
    endPlayerDrag()
    return
  }

  if (payload.source === 'starter' && payload.slotId) {
    squadStore.movePlayerToSlot(payload.slotId, targetPlayer.id, 'reserve')
  } else if (payload.source === 'substitute') {
    squadStore.swapSubstituteWithReserve(payload.playerId, targetPlayer.id)
  }
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
</script>

<template>
  <section v-if="squadStore.club && squadStore.lineup" class="space-y-5">
    <div
      class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
    >
      <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-950">Состав</h1>
          <p class="mt-1 text-sm text-slate-600">
            {{ squadStore.club.name }} · {{ squadStore.club.squad.length }} игроков ·
            {{ formatMoney(totalValue) }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Формация
            <select
              class="h-10 rounded-lg border border-slate-300 bg-white px-3"
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
          <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Тактика
            <select
              class="h-10 rounded-lg border border-slate-300 bg-white px-3"
              :value="squadStore.lineup.tacticalStyle"
              @change="setTactic"
            >
              <option v-for="style in squadStore.tacticalStyles" :key="style" :value="style">
                {{ tacticLabels[style] }}
              </option>
            </select>
          </label>
          <Button
            class="self-end"
            severity="secondary"
            label="Автосостав"
            @click="squadStore.resetLineup"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-5">
      <!-- СОСТАВ -->
      <div class="space-y-5">
        <div
          class="relative min-h-[740px] overflow-hidden rounded-lg border border-white/15 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_16%,transparent_16%_100%),linear-gradient(90deg,rgba(255,255,255,0.04)_50%,transparent_50%),linear-gradient(180deg,#152233,#101928)] shadow-[0_22px_60px_rgba(15,23,42,0.18)] max-[860px]:min-h-[640px]"
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
            class="absolute grid min-h-[74px] w-[126px] -translate-x-1/2 -translate-y-1/2 grid-rows-[auto_auto_auto_auto] justify-items-start gap-1 rounded-lg border border-slate-400/30 bg-slate-950/85 p-[6px_7px] text-left text-slate-50 shadow-[0_12px_26px_rgba(2,6,23,0.22)] transition hover:-translate-y-[52%] hover:border-lime-200 max-[860px]:w-[106px] max-[860px]:gap-0.5 max-[860px]:p-1.5"
            :class="{
              'border-dashed bg-slate-950/60': !slotPlayer(slot.id),
              'border-lime-400 shadow-[0_0_0_2px_rgba(163,230,53,0.24),0_12px_26px_rgba(2,6,23,0.22)]':
                slot.id === dragOverSlotId,
              'opacity-45': slotPlayer(slot.id)?.id === draggingPlayerId,
            }"
            :style="{ left: `${slot.x}%`, top: `${slot.y}%` }"
            :draggable="Boolean(slotPlayer(slot.id))"
            @dragstart="
              slotPlayer(slot.id) &&
              startPlayerDrag($event, slotPlayer(slot.id)!, 'starter', slot.id)
            "
            @dragend="endPlayerDrag"
            @dragenter.prevent="dragOverSlotId = slot.id"
            @dragover.prevent="dragOverSlotId = slot.id"
            @dragleave="dragOverSlotId === slot.id && (dragOverSlotId = null)"
            @drop.prevent="dropOnSlot($event, slot.id)"
          >
            <template v-if="slotPlayer(slot.id)">
              <span class="flex items-center gap-1.5">
                <span
                  class="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.7rem] font-black leading-none text-white max-[860px]:h-[26px] max-[860px]:min-w-[26px] max-[860px]:text-xs"
                >
                  {{ positionLabels[slotPlayer(slot.id)?.position ?? slot.position] }}
                </span>
                <span
                  class="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-white/80 text-[0.7rem] font-black leading-none text-white max-[860px]:h-[26px] max-[860px]:min-w-[26px] max-[860px]:text-xs"
                  :class="ratingClass(slotPlayer(slot.id)?.rating ?? 0)"
                >
                  {{ slotPlayer(slot.id)?.rating }}
                </span>
              </span>
              <span
                class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] font-black uppercase"
              >
                {{ slotPlayer(slot.id)?.lastName }}
              </span>
              <span
                class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-bold text-slate-200/75"
              >
                Форма {{ slotPlayer(slot.id)?.form }} · Готовность
                {{ slotPlayer(slot.id)?.fitness }}
              </span>
              <span class="h-1.5 w-full overflow-hidden rounded-full bg-slate-400/35">
                <span
                  class="block h-full rounded-full bg-lime-400"
                  :style="{ width: `${slotPlayer(slot.id)?.fitness ?? 0}%` }"
                ></span>
              </span>
            </template>
            <template v-else>
              <span class="flex items-center gap-1.5">
                <span
                  class="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.7rem] font-black leading-none text-white"
                >
                  {{ positionLabels[slot.position] }}
                </span>
                <span
                  class="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-white/80 bg-orange-700 text-[0.7rem] font-black leading-none text-white"
                  >?</span
                >
              </span>
              <span
                class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] font-black uppercase"
                >Пусто</span
              >
              <span
                class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-bold text-slate-200/75"
                >Перетащите игрока</span
              >
            </template>
          </button>
        </div>

        <div
          class="grid grid-cols-[repeat(7,minmax(104px,1fr))] gap-2.5 overflow-x-auto rounded-lg border border-white/70 bg-[linear-gradient(115deg,rgba(255,255,255,0.06)_0_18%,transparent_18%_100%),#121d2e] p-3.5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
          :class="{
            'shadow-[0_0_0_2px_rgba(163,230,53,0.34),0_18px_50px_rgba(20,46,38,0.1)]':
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
            class="grid min-w-[104px] grid-rows-[auto_auto_auto_auto] justify-items-start gap-1 rounded-lg border border-slate-400/30 bg-slate-950/80 p-2 text-left text-slate-50 hover:border-lime-200"
            :class="{
              'opacity-50': player.isInjured,
              'opacity-45': player.id === draggingPlayerId,
            }"
            draggable="true"
            @dragstart="startPlayerDrag($event, player, 'substitute')"
            @dragend="endPlayerDrag"
            @dragenter.stop.prevent
            @dragover.stop.prevent
            @drop.stop.prevent="dropOnSubstitutePlayer($event, player)"
          >
            <span class="flex items-center gap-1.5">
              <span
                class="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.7rem] font-black leading-none text-white"
                >{{ positionLabels[player.position] }}</span
              >
              <span
                class="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-white/80 text-[0.7rem] font-black leading-none text-white"
                :class="ratingClass(player.rating)"
                >{{ player.rating }}</span
              >
            </span>
            <span
              class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.78rem] font-black uppercase"
              >{{ player.lastName }}</span
            >
            <span
              class="w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[0.68rem] font-bold text-slate-200/75"
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
        class="flex max-h-[920px] flex-col overflow-hidden rounded-lg border border-white/70 bg-white/90 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
      >
        <div class="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
          <div>
            <h2 class="text-lg font-semibold text-slate-950">Команда</h2>
            <p class="mt-1 text-sm text-slate-500">Игроки вне заявки</p>
          </div>
        </div>

        <div
          class="min-h-0 flex-1 overflow-hidden px-5 pb-4"
          :class="{ 'bg-emerald-50': dragOverGroup === 'reserve' }"
          @dragenter.prevent="dragOverGroup = 'reserve'"
          @dragover.prevent="dragOverGroup = 'reserve'"
          @dragleave="dragOverGroup === 'reserve' && (dragOverGroup = null)"
          @drop.prevent="dropOnReserve"
        >
          <h3 class="mb-2.5 text-sm font-black uppercase text-slate-700">Резерв</h3>
          <div class="grid max-h-full gap-2 overflow-y-auto pr-0.5">
            <button
              v-for="player in reservePlayers"
              :key="player.id"
              type="button"
              class="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-[#dbe7de] bg-white p-2 text-left transition hover:-translate-y-px hover:border-emerald-300 hover:bg-[#f7fdf8]"
              :class="{
                'opacity-50': player.isInjured,
                'opacity-45': player.id === draggingPlayerId,
              }"
              draggable="true"
              @dragstart="startPlayerDrag($event, player, 'reserve')"
              @dragend="endPlayerDrag"
              @dragenter.stop.prevent
              @dragover.stop.prevent
              @drop.stop.prevent="dropOnReservePlayer($event, player)"
            >
              <span
                class="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-slate-400/50 bg-slate-800 text-[0.7rem] font-black leading-none text-white"
                >{{ positionLabels[player.position] }}</span
              >
              <span class="grid min-w-0">
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-bold text-slate-950"
                  >{{ player.firstName }} {{ player.lastName }}</span
                >
                <span
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500"
                  >Форма {{ player.form }} · Готовность {{ player.fitness }} ·
                  {{ player.age }} лет</span
                >
              </span>
              <span
                class="inline-grid h-[30px] min-w-[30px] place-items-center rounded-full border-2 border-white/80 text-[0.7rem] font-black leading-none text-white"
                :class="ratingClass(player.rating)"
                >{{ player.rating }}</span
              >
            </button>
          </div>
        </div>
      </aside>
    </div>

    <div
      class="rounded-lg border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(20,46,38,0.1)]"
    >
      <h2 class="text-lg font-semibold text-slate-950">Готовность к матчу</h2>
      <div
        v-if="squadStore.validation.valid"
        class="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
      >
        Стартовый состав готов.
      </div>
      <ul v-else class="mt-3 space-y-2">
        <li
          v-for="error in squadStore.validation.errors"
          :key="error"
          class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          {{ error }}
        </li>
      </ul>
    </div>
  </section>
</template>

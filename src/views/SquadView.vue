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

const totalValue = computed(() => {
  return squadStore.club?.squad.reduce((sum, player) => sum + player.value, 0) ?? 0
})

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
    return 'player-rating-strong'
  }
  if (rating >= 64) {
    return 'player-rating-good'
  }
  return 'player-rating-low'
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
    <div class="surface p-5">
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
              class="squad-select"
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
              class="squad-select"
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

    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div class="space-y-5">
        <div class="squad-pitch">
          <div class="pitch-mark pitch-border"></div>
          <div class="pitch-mark pitch-halfway"></div>
          <div class="pitch-mark pitch-center-circle"></div>
          <div class="pitch-mark pitch-box pitch-box-top"></div>
          <div class="pitch-mark pitch-box pitch-box-bottom"></div>

          <button
            v-for="slot in squadStore.slots"
            :key="slot.id"
            type="button"
            class="lineup-card"
            :class="{
              'lineup-card-empty': !slotPlayer(slot.id),
              'lineup-card-drop': slot.id === dragOverSlotId,
              'lineup-card-dragging': slotPlayer(slot.id)?.id === draggingPlayerId,
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
              <span class="lineup-card-badges">
                <span class="lineup-position">{{
                  positionLabels[slotPlayer(slot.id)?.position ?? slot.position]
                }}</span>
                <span class="lineup-rating" :class="ratingClass(slotPlayer(slot.id)?.rating ?? 0)">
                  {{ slotPlayer(slot.id)?.rating }}
                </span>
              </span>
              <span class="lineup-name">{{ slotPlayer(slot.id)?.lastName }}</span>
              <span class="lineup-meta"
                >Форма {{ slotPlayer(slot.id)?.form }} · Готовность
                {{ slotPlayer(slot.id)?.fitness }}</span
              >
              <span class="fitness-bar">
                <span :style="{ width: `${slotPlayer(slot.id)?.fitness ?? 0}%` }"></span>
              </span>
            </template>
            <template v-else>
              <span class="lineup-card-badges">
                <span class="lineup-position">{{ positionLabels[slot.position] }}</span>
                <span class="lineup-rating player-rating-low">?</span>
              </span>
              <span class="lineup-name">Пусто</span>
              <span class="lineup-meta">Перетащите игрока</span>
            </template>
          </button>
        </div>

        <div
          class="bench-strip surface"
          :class="{ 'drop-zone-active': dragOverGroup === 'substitutes' }"
          @dragenter.prevent="dragOverGroup = 'substitutes'"
          @dragover.prevent="dragOverGroup = 'substitutes'"
          @dragleave="dragOverGroup === 'substitutes' && (dragOverGroup = null)"
          @drop.prevent="dropOnSubstitutes"
        >
          <button
            v-for="player in substitutePlayers"
            :key="player.id"
            type="button"
            class="bench-card"
            :class="{
              'opacity-50': player.isInjured,
              'lineup-card-dragging': player.id === draggingPlayerId,
            }"
            draggable="true"
            @dragstart="startPlayerDrag($event, player, 'substitute')"
            @dragend="endPlayerDrag"
            @dragenter.stop.prevent
            @dragover.stop.prevent
            @drop.stop.prevent="dropOnSubstitutePlayer($event, player)"
          >
            <span class="lineup-card-badges">
              <span class="lineup-position">{{ positionLabels[player.position] }}</span>
              <span class="lineup-rating" :class="ratingClass(player.rating)">{{
                player.rating
              }}</span>
            </span>
            <span class="lineup-name">{{ player.lastName }}</span>
            <span class="lineup-meta"
              >Форма {{ player.form }} · Готовность {{ player.fitness }}</span
            >
            <span class="fitness-bar"><span :style="{ width: `${player.fitness}%` }"></span></span>
          </button>
          <div v-if="!substitutePlayers.length" class="px-4 py-6 text-sm text-slate-500">
            Перетащите сюда игроков замены.
          </div>
        </div>
      </div>

      <aside class="team-panel surface">
        <div class="team-panel-header">
          <div>
            <h2 class="section-title">Команда</h2>
            <p class="hidden">Перетащите игрока на поле, в замену или резерв</p>
          </div>
        </div>

        <div
          class="hidden"
          :class="{ 'drop-zone-active-light': dragOverGroup === 'substitutes' }"
          @dragenter.prevent="dragOverGroup = 'substitutes'"
          @dragover.prevent="dragOverGroup = 'substitutes'"
          @dragleave="dragOverGroup === 'substitutes' && (dragOverGroup = null)"
          @drop.prevent="dropOnSubstitutes"
        >
          <h3 class="team-list-title">Замена</h3>
          <div class="team-list">
            <button
              v-for="player in substitutePlayers"
              :key="player.id"
              type="button"
              class="team-player-card"
              :class="{
                'opacity-50': player.isInjured,
                'team-player-card-dragging': player.id === draggingPlayerId,
              }"
              draggable="true"
              @dragstart="startPlayerDrag($event, player, 'substitute')"
              @dragend="endPlayerDrag"
            >
              <span class="lineup-position">{{ positionLabels[player.position] }}</span>
              <span class="team-player-main">
                <span class="font-bold text-slate-950"
                  >{{ player.firstName }} {{ player.lastName }}</span
                >
                <span class="text-xs text-slate-500"
                  >Форма {{ player.form }} · Готовность {{ player.fitness }} ·
                  {{ player.age }} лет</span
                >
              </span>
              <span class="team-player-rating" :class="ratingClass(player.rating)">{{
                player.rating
              }}</span>
            </button>
            <div
              v-if="!substitutePlayers.length"
              class="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500"
            >
              Перетащите сюда игрока.
            </div>
          </div>
        </div>

        <div
          class="team-list-section team-list-section-reserve team-list-section-reserve-only"
          :class="{ 'drop-zone-active-light': dragOverGroup === 'reserve' }"
          @dragenter.prevent="dragOverGroup = 'reserve'"
          @dragover.prevent="dragOverGroup = 'reserve'"
          @dragleave="dragOverGroup === 'reserve' && (dragOverGroup = null)"
          @drop.prevent="dropOnReserve"
        >
          <h3 class="team-list-title">Резерв</h3>
          <div class="team-list">
            <button
              v-for="player in reservePlayers"
              :key="player.id"
              type="button"
              class="team-player-card"
              :class="{
                'opacity-50': player.isInjured,
                'team-player-card-dragging': player.id === draggingPlayerId,
              }"
              draggable="true"
              @dragstart="startPlayerDrag($event, player, 'reserve')"
              @dragend="endPlayerDrag"
              @dragenter.stop.prevent
              @dragover.stop.prevent
              @drop.stop.prevent="dropOnReservePlayer($event, player)"
            >
              <span class="lineup-position">{{ positionLabels[player.position] }}</span>
              <span class="team-player-main">
                <span class="font-bold text-slate-950"
                  >{{ player.firstName }} {{ player.lastName }}</span
                >
                <span class="text-xs text-slate-500"
                  >Форма {{ player.form }} · Готовность {{ player.fitness }} ·
                  {{ player.age }} лет</span
                >
              </span>
              <span class="team-player-rating" :class="ratingClass(player.rating)">{{
                player.rating
              }}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <div class="surface p-5">
      <h2 class="section-title">Готовность к матчу</h2>
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

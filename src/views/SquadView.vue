<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSquadStore } from '@/stores/squadStore'
import type { Formation, Player, PlayerPosition, TacticalStyle } from '@/types/football'
import { formatMoney } from '@/utils/format'

const squadStore = useSquadStore()
const selectedSlotId = ref<string | null>(null)

watch(
  () => squadStore.slots,
  (slots) => {
    if (!selectedSlotId.value && slots[0]) {
      selectedSlotId.value = slots[0].id
    }
  },
  { immediate: true },
)

const selectedSlot = computed(() => squadStore.slots.find((slot) => slot.id === selectedSlotId.value))

const assignedPlayerBySlot = computed<Record<string, Player | undefined>>(() => {
  const club = squadStore.club
  const lineup = squadStore.lineup
  if (!club || !lineup) {
    return {}
  }
  const playersById = new Map(club.squad.map((player) => [player.id, player]))
  return Object.fromEntries(
    squadStore.slots.map((slot) => [slot.id, lineup.starters[slot.id] ? playersById.get(lineup.starters[slot.id] as string) : undefined]),
  )
})

const sortedPlayers = computed(() => {
  const club = squadStore.club
  const slot = selectedSlot.value
  if (!club) {
    return []
  }

  return [...club.squad].sort((left, right) => {
    const leftMatch = slot && left.position === slot.position ? 1 : 0
    const rightMatch = slot && right.position === slot.position ? 1 : 0
    if (leftMatch !== rightMatch) {
      return rightMatch - leftMatch
    }
    return right.rating - left.rating
  })
})

const starterIds = computed(() => {
  const lineup = squadStore.lineup
  if (!lineup) {
    return new Set<string>()
  }
  return new Set(Object.values(lineup.starters).filter((playerId): playerId is string => typeof playerId === 'string'))
})

const positionLabels: Record<PlayerPosition, string> = {
  GK: 'ВР',
  LB: 'ЛЗ',
  CB: 'ЦЗ',
  RB: 'ПЗ',
  CDM: 'ОП',
  CM: 'ЦП',
  CAM: 'АП',
  LW: 'ЛФ',
  RW: 'ПФ',
  ST: 'НП',
}

const tacticLabels: Record<TacticalStyle, string> = {
  defensive: 'Оборона',
  balanced: 'Баланс',
  attacking: 'Атака',
}

const setFormation = (event: Event): void => {
  squadStore.setFormation((event.target as HTMLSelectElement).value as Formation)
}

const setTactic = (event: Event): void => {
  squadStore.setTacticalStyle((event.target as HTMLSelectElement).value as TacticalStyle)
}
</script>

<template>
  <section v-if="squadStore.club && squadStore.lineup" class="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
    <div class="space-y-5">
      <div class="surface p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 class="text-2xl font-bold text-slate-950">Состав</h1>
            <p class="mt-1 text-sm text-slate-600">{{ squadStore.club.name }} · {{ squadStore.club.squad.length }} игроков</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Формация
              <select class="h-10 rounded-md border border-slate-300 bg-white px-3" :value="squadStore.lineup.formation" @change="setFormation">
                <option v-for="formation in squadStore.formations" :key="formation" :value="formation">
                  {{ formation }}
                </option>
              </select>
            </label>
            <label class="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Тактика
              <select class="h-10 rounded-md border border-slate-300 bg-white px-3" :value="squadStore.lineup.tacticalStyle" @change="setTactic">
                <option v-for="style in squadStore.tacticalStyles" :key="style" :value="style">
                  {{ tacticLabels[style] }}
                </option>
              </select>
            </label>
            <Button class="self-end" severity="secondary" label="Автосостав" @click="squadStore.resetLineup" />
          </div>
        </div>
      </div>

      <div class="surface p-5">
        <div class="relative mx-auto aspect-[7/10] max-h-[680px] overflow-hidden rounded-lg bg-pitch field-line">
          <div class="absolute inset-x-[8%] top-[8%] h-[84%] rounded-md border-2 border-white/50"></div>
          <div class="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/40"></div>
          <button
            v-for="slot in squadStore.slots"
            :key="slot.id"
            type="button"
            class="absolute w-24 -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-2 text-center text-xs shadow-sm transition"
            :class="slot.id === selectedSlotId ? 'border-white bg-white text-slate-950' : 'border-white/50 bg-slate-950/70 text-white hover:bg-slate-900'"
            :style="{ left: `${slot.x}%`, top: `${slot.y}%` }"
            @click="selectedSlotId = slot.id"
          >
            <span class="block font-bold">{{ slot.label }}</span>
            <span class="block truncate">
              {{ assignedPlayerBySlot[slot.id]?.lastName ?? 'Выбрать' }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <div class="space-y-5">
      <div class="surface p-5">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="section-title">
              {{ selectedSlot ? `Позиция ${selectedSlot.label}` : 'Выбор игрока' }}
            </h2>
            <p v-if="selectedSlot" class="mt-1 text-sm text-slate-600">Нужная роль: {{ positionLabels[selectedSlot.position] }}</p>
          </div>
          <Button
            v-if="selectedSlot"
            severity="secondary"
            size="small"
            label="Очистить"
            @click="squadStore.assignPlayerToSlot(selectedSlot.id, null)"
          />
        </div>

        <div class="mt-4 max-h-[520px] overflow-auto rounded-md border border-slate-200">
          <button
            v-for="player in sortedPlayers"
            :key="player.id"
            type="button"
            class="grid w-full grid-cols-[1fr_auto] gap-2 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
            :class="{
              'bg-emerald-50': starterIds.has(player.id),
              'opacity-50': player.isInjured,
            }"
            @click="selectedSlot && squadStore.assignPlayerToSlot(selectedSlot.id, player.id)"
          >
            <span>
              <span class="font-semibold text-slate-950">{{ player.firstName }} {{ player.lastName }}</span>
              <span class="ml-2 text-xs text-slate-500">{{ positionLabels[player.position] }} · {{ player.age }} лет</span>
              <span v-if="player.isInjured" class="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs font-semibold text-rose-800">травма</span>
            </span>
            <span class="text-right text-sm text-slate-700">
              Р{{ player.rating }} · Ф{{ player.form }} · Г{{ player.fitness }}
            </span>
          </button>
        </div>
      </div>

      <div class="surface p-5">
        <h2 class="section-title">Запасные</h2>
        <div class="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            v-for="player in squadStore.club.squad"
            :key="player.id"
            type="button"
            class="rounded-md border px-3 py-2 text-left text-sm"
            :class="squadStore.lineup.substitutes.includes(player.id) ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'"
            :disabled="starterIds.has(player.id)"
            @click="squadStore.toggleSubstitute(player.id)"
          >
            {{ player.lastName }} · {{ positionLabels[player.position] }} · {{ player.rating }}
          </button>
        </div>
      </div>

      <div class="surface p-5">
        <h2 class="section-title">Готовность к матчу</h2>
        <div v-if="squadStore.validation.valid" class="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          Стартовый состав готов.
        </div>
        <ul v-else class="mt-3 space-y-2">
          <li v-for="error in squadStore.validation.errors" :key="error" class="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {{ error }}
          </li>
        </ul>
        <div class="mt-4 text-sm text-slate-500">Суммарная стоимость состава: {{ formatMoney(squadStore.club.squad.reduce((sum, player) => sum + player.value, 0)) }}</div>
      </div>
    </div>
  </section>
</template>

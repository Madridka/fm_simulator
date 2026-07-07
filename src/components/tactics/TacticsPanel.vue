<script setup lang="ts">
import type { TeamTacticsSettings } from '@/types/football'

type TacticsOption<K extends keyof TeamTacticsSettings> = {
  key: K
  label: string
  values: Array<{ label: string; value: TeamTacticsSettings[K] }>
}

const props = withDefaults(
  defineProps<{
    modelValue: TeamTacticsSettings
    variant?: 'dark' | 'light'
    compact?: boolean
    excludeKeys?: Array<keyof TeamTacticsSettings>
  }>(),
  {
    variant: 'light',
    compact: false,
    excludeKeys: () => [],
  },
)

const emit = defineEmits<{
  change: [changes: Partial<TeamTacticsSettings>]
}>()

const options: TacticsOption<keyof TeamTacticsSettings>[] = [
  {
    key: 'mentality',
    label: 'Менталитет',
    values: [
      { label: 'Автобус', value: 'parkTheBus' },
      { label: 'Оборона', value: 'defensive' },
      { label: 'Баланс', value: 'balanced' },
      { label: 'Атака', value: 'attacking' },
      { label: 'Все в атаку', value: 'allOutAttack' },
    ],
  },
  {
    key: 'attackPlan',
    label: 'С мячом',
    values: [
      { label: 'Короткий пас', value: 'shortPassing' },
      { label: 'Прямой пас', value: 'directPassing' },
      { label: 'Через фланги', value: 'widePlay' },
      { label: 'Через центр', value: 'centralPlay' },
      { label: 'Ранние навесы', value: 'earlyCrosses' },
      { label: 'За спину', value: 'throughBalls' },
    ],
  },
  {
    key: 'pressing',
    label: 'Прессинг',
    values: [
      { label: 'Низкий', value: 'low' },
      { label: 'Баланс', value: 'balanced' },
      { label: 'Высокий', value: 'high' },
    ],
  },
  {
    key: 'defensiveLine',
    label: 'Линия',
    values: [
      { label: 'Низкая', value: 'low' },
      { label: 'Средняя', value: 'medium' },
      { label: 'Высокая', value: 'high' },
    ],
  },
  {
    key: 'defensiveShape',
    label: 'Без мяча',
    values: [
      { label: 'Компактно', value: 'compact' },
      { label: 'Баланс', value: 'balanced' },
      { label: 'Широко', value: 'wide' },
    ],
  },
  {
    key: 'tackling',
    label: 'Отбор',
    values: [
      { label: 'Осторожно', value: 'cautious' },
      { label: 'Нормально', value: 'normal' },
      { label: 'Жестко', value: 'hard' },
    ],
  },
  {
    key: 'tempo',
    label: 'Темп',
    values: [
      { label: 'Медленно', value: 'slow' },
      { label: 'Баланс', value: 'balanced' },
      { label: 'Быстро', value: 'fast' },
    ],
  },
  {
    key: 'width',
    label: 'Ширина',
    values: [
      { label: 'Узко', value: 'narrow' },
      { label: 'Баланс', value: 'balanced' },
      { label: 'Широко', value: 'wide' },
    ],
  },
  {
    key: 'matchCommand',
    label: 'Команда',
    values: [
      { label: 'Без команды', value: 'none' },
      { label: 'Успокоить', value: 'calm' },
      { label: 'Добавить темп', value: 'raiseTempo' },
      { label: 'Удержать', value: 'holdLead' },
      { label: 'Грузить в штрафную', value: 'loadBox' },
      { label: 'Тянуть время', value: 'timeWasting' },
    ],
  },
  {
    key: 'teamTalk',
    label: 'Разговор',
    values: [
      { label: 'Нейтрально', value: 'balanced' },
      { label: 'Мотивировать', value: 'encourage' },
      { label: 'Успокоить', value: 'calm' },
      { label: 'Потребовать', value: 'demandMore' },
      { label: 'Похвалить', value: 'praise' },
    ],
  },
]

const onChange = <K extends keyof TeamTacticsSettings>(key: K, value: string): void => {
  emit('change', { [key]: value } as Partial<TeamTacticsSettings>)
}

const visibleOptions = options.filter((option) => !props.excludeKeys.includes(option.key))

const labelClass = props.variant === 'dark' ? 'text-emerald-100/70' : 'text-slate-500'
const selectClass =
  props.variant === 'dark'
    ? 'border-emerald-700 bg-emerald-900 text-white focus:border-emerald-400'
    : 'border-slate-200 bg-white text-slate-900 focus:border-emerald-500'
</script>

<template>
  <div
    class="grid gap-2"
    :class="compact ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'"
  >
    <label
      v-for="option in visibleOptions"
      :key="option.key"
      class="flex min-w-0 flex-col gap-1 text-xs font-bold"
      :class="labelClass"
    >
      {{ option.label }}
      <select
        class="h-9 min-w-0 rounded-lg border px-2 text-sm outline-none"
        :class="selectClass"
        :value="modelValue[option.key]"
        @change="onChange(option.key, ($event.target as HTMLSelectElement).value)"
      >
        <option
          v-for="item in option.values"
          :key="`${option.key}-${item.value}`"
          :value="item.value"
          :class="variant === 'dark' ? 'bg-emerald-950 text-white' : 'bg-white text-slate-900'"
        >
          {{ item.label }}
        </option>
      </select>
    </label>
  </div>
</template>

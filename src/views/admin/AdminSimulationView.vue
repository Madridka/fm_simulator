<script setup lang="ts">
import { computed, ref } from 'vue'
import InputNumber from 'primevue/inputnumber'
import SectionHero from '@/components/ui/SectionHero.vue'
import {
  defaultSimulationSettings,
  getSimulationSettings,
  resetSimulationSettings,
  saveSimulationSettings,
} from '@/domain/admin/simulationSettings'

const initial = getSimulationSettings()
const goalkeeperGoalChancePercent = ref<number | null>(initial.goalkeeperGoalChancePercent)
const liveBaseShotChancePercent = ref<number | null>(initial.liveBaseShotChancePercent)
const saved = ref(false)

const isValid = computed(() =>
  goalkeeperGoalChancePercent.value !== null &&
  goalkeeperGoalChancePercent.value >= 0 &&
  goalkeeperGoalChancePercent.value <= 100 &&
  liveBaseShotChancePercent.value !== null &&
  liveBaseShotChancePercent.value >= 0 &&
  liveBaseShotChancePercent.value <= 100,
)

const save = (): void => {
  if (!isValid.value) return
  const settings = saveSimulationSettings({
    goalkeeperGoalChancePercent: goalkeeperGoalChancePercent.value!,
    liveBaseShotChancePercent: liveBaseShotChancePercent.value!,
  })
  goalkeeperGoalChancePercent.value = settings.goalkeeperGoalChancePercent
  liveBaseShotChancePercent.value = settings.liveBaseShotChancePercent
  saved.value = true
}

const reset = (): void => {
  const settings = resetSimulationSettings()
  goalkeeperGoalChancePercent.value = settings.goalkeeperGoalChancePercent
  liveBaseShotChancePercent.value = settings.liveBaseShotChancePercent
  saved.value = true
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-4">
    <SectionHero
      eyebrow="Баланс игры"
      title="Параметры симуляции"
      subtitle="Изменения сохраняются в этом браузере и применяются к новым матчам"
    />

    <form class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" @submit.prevent="save">
      <div class="border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 class="text-lg font-black text-slate-950">Голы и моменты</h2>
        <p class="mt-1 text-sm font-medium text-slate-500">Значения вводятся в процентах от 0 до 100.</p>
      </div>

      <div class="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
        <label class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span class="block text-sm font-black text-slate-900">Вероятность гола вратаря</span>
          <span class="mt-1 block min-h-10 text-xs font-medium leading-relaxed text-slate-500">Проверяется отдельно при каждом голе во всех режимах симуляции.</span>
          <InputNumber
            v-model="goalkeeperGoalChancePercent"
            input-id="goalkeeper-goal-chance"
            class="mt-3 w-full"
            input-class="w-full"
            suffix=" %"
            :min="0"
            :max="100"
            :min-fraction-digits="0"
            :max-fraction-digits="3"
            fluid
          />
        </label>

        <label class="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <span class="block text-sm font-black text-slate-900">Базовая вероятность удара</span>
          <span class="mt-1 block min-h-10 text-xs font-medium leading-relaxed text-slate-500">Шанс удара команды за минуту live-матча до силы состава и тактики.</span>
          <InputNumber
            v-model="liveBaseShotChancePercent"
            input-id="live-base-shot-chance"
            class="mt-3 w-full"
            input-class="w-full"
            suffix=" %"
            :min="0"
            :max="100"
            :min-fraction-digits="0"
            :max-fraction-digits="3"
            fluid
          />
        </label>
      </div>

      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
        <div class="text-sm font-bold" :class="saved ? 'text-emerald-700' : 'text-slate-400'">
          {{ saved ? 'Настройки сохранены' : `Значения по умолчанию: ${defaultSimulationSettings.goalkeeperGoalChancePercent}% и ${defaultSimulationSettings.liveBaseShotChancePercent}%` }}
        </div>
        <div class="flex gap-2">
          <Button type="button" label="Сбросить" severity="secondary" outlined @click="reset" />
          <Button type="submit" label="Сохранить" icon="pi pi-save" :disabled="!isValid" />
        </div>
      </footer>
    </form>
  </div>
</template>

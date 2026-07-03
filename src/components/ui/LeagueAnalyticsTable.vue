<script setup lang="ts">
import { computed, ref } from 'vue'
import { FilterMatchMode } from '@primevue/core/api'
import Column from 'primevue/column'
import DataTable, { type DataTableFilterMeta } from 'primevue/datatable'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import type { Club, LeagueTableRow } from '@/types/football'

interface AnalyticsRow {
  clubId: string
  position: number
  clubName: string
  played: number
  xG: number
  xGA: number
  shots: number
  attack: number
  defense: number
  recentForm: Array<'W' | 'D' | 'L'>
  form: string
}

const props = defineProps<{ rows: LeagueTableRow[]; clubs: Club[]; selectedClubId?: string }>()

const filters = ref<DataTableFilterMeta>({
  position: { value: null, matchMode: FilterMatchMode.EQUALS },
  clubName: { value: null, matchMode: FilterMatchMode.CONTAINS },
  played: { value: null, matchMode: FilterMatchMode.EQUALS },
  xG: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
  xGA: { value: null, matchMode: FilterMatchMode.LESS_THAN_OR_EQUAL_TO },
  shots: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
  attack: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
  defense: { value: null, matchMode: FilterMatchMode.GREATER_THAN_OR_EQUAL_TO },
  form: { value: null, matchMode: FilterMatchMode.CONTAINS },
})

const clubName = (clubId: string): string =>
  props.clubs.find((club) => club.id === clubId)?.name ?? clubId

const averages = computed(() => {
  const played = props.rows.reduce((sum, row) => sum + row.played, 0) || 1
  return {
    goals: props.rows.reduce((sum, row) => sum + row.goalsFor, 0) / played,
    conceded: props.rows.reduce((sum, row) => sum + row.goalsAgainst, 0) / played,
    xG: props.rows.reduce((sum, row) => sum + (row.xGFor ?? 0), 0) / played,
    xGA: props.rows.reduce((sum, row) => sum + (row.xGAgainst ?? 0), 0) / played,
  }
})

const perGame = (value: number, played: number): number => (played ? value / played : 0)
const index = (value: number): number => Math.max(1, Math.min(99, Math.round(value)))
const attackIndex = (row: LeagueTableRow): number =>
  row.played
    ? index(
        50 +
          ((row.xGFor ?? 0) / row.played - averages.value.xG) * 18 +
          (row.goalsFor / row.played - averages.value.goals) * 12,
      )
    : 50
const defenseIndex = (row: LeagueTableRow): number =>
  row.played
    ? index(
        50 +
          (averages.value.xGA - (row.xGAgainst ?? 0) / row.played) * 18 +
          (averages.value.conceded - row.goalsAgainst / row.played) * 12,
      )
    : 50

const analyticsRows = computed<AnalyticsRow[]>(() =>
  props.rows.map((row) => {
    const recentForm = row.recentForm ?? []
    return {
      clubId: row.clubId,
      position: row.position,
      clubName: clubName(row.clubId),
      played: row.played,
      xG: perGame(row.xGFor ?? 0, row.played),
      xGA: perGame(row.xGAgainst ?? 0, row.played),
      shots: perGame(row.shotsFor ?? 0, row.played),
      attack: attackIndex(row),
      defense: defenseIndex(row),
      recentForm,
      form: recentForm.join(''),
    }
  }),
)

const rowClass = (row: AnalyticsRow): string =>
  row.clubId === props.selectedClubId ? 'analytics-selected-row' : ''

const formClass = (result: 'W' | 'D' | 'L'): string =>
  result === 'W' ? 'bg-emerald-600' : result === 'D' ? 'bg-slate-400' : 'bg-rose-600'
</script>

<template>
  <div class="overflow-hidden p-3 sm:p-5">
    <DataTable
      v-model:filters="filters"
      :value="analyticsRows"
      :row-class="rowClass"
      data-key="clubId"
      removable-sort
      scrollable
      scroll-height="flex"
      size="small"
      class="h-full text-sm"
      table-style="min-width: 1040px"
    >
      <Column
        field="position"
        header="#"
        sortable
        data-type="numeric"
        header-class="w-20"
        body-class="text-slate-700"
        :show-filter-menu="false"
      >
      </Column>

      <Column
        field="clubName"
        header="Клуб"
        sortable
        header-class="min-w-52"
        body-class="whitespace-nowrap font-semibold"
        :show-filter-menu="false"
      >
      </Column>

      <Column field="played" header="И" sortable data-type="numeric" :show-filter-menu="false">
      </Column>

      <Column field="xG" header="xG" sortable data-type="numeric" :show-filter-menu="false">
        <template #body="{ data }">{{ data.xG.toFixed(2) }}</template>
      </Column>

      <Column field="xGA" header="xGA" sortable data-type="numeric" :show-filter-menu="false">
        <template #body="{ data }">{{ data.xGA.toFixed(2) }}</template>
      </Column>

      <Column field="shots" header="Удары" sortable data-type="numeric" :show-filter-menu="false">
        <template #body="{ data }">{{ data.shots.toFixed(2) }}</template>
      </Column>

      <Column
        field="attack"
        header="Атака"
        sortable
        data-type="numeric"
        body-class="font-black text-emerald-700"
        :show-filter-menu="false"
      >
      </Column>

      <Column
        field="defense"
        header="Защита"
        sortable
        data-type="numeric"
        body-class="font-black text-sky-700"
        :show-filter-menu="false"
      >
      </Column>

      <Column
        field="form"
        header="Форма"
        sortable
        header-class="min-w-44"
        :show-filter-menu="false"
      >
        <template #body="{ data }">
          <div class="flex gap-1">
            <span
              v-for="(result, resultIndex) in data.recentForm"
              :key="resultIndex"
              class="inline-grid h-5 w-5 place-items-center rounded text-[10px] font-black text-white"
              :class="formClass(result)"
              >{{ result }}</span
            >
            <span v-if="!data.recentForm.length" class="text-slate-400">—</span>
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<style scoped>
:deep(.p-datatable-filter-element-container) {
  min-width: 0;
}

:deep(.p-datatable-filter-row .p-inputtext) {
  min-width: 0;
  font-size: 0.75rem;
}

:deep(.p-datatable-tbody > tr.analytics-selected-row) {
  background: rgb(236 253 245);
  color: rgb(6 78 59);
  font-weight: 600;
}
</style>

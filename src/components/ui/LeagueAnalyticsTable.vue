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
  <div class="h-full overflow-hidden p-3 sm:p-5">
    <div class="grid h-full content-start gap-3 overflow-auto pr-1 md:hidden">
      <article
        v-for="row in analyticsRows"
        :key="row.clubId"
        class="rounded-lg border bg-white p-3 shadow-sm"
        :class="
          row.clubId === props.selectedClubId
            ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
            : 'border-slate-200 text-slate-900'
        "
      >
        <div class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
          <span
            class="grid h-8 min-w-8 place-items-center rounded-md bg-slate-900 px-2 text-xs font-black text-white"
          >
            {{ row.position }}
          </span>
          <div class="min-w-0">
            <h3 class="truncate text-sm font-black">{{ row.clubName }}</h3>
            <p class="mt-0.5 text-xs font-semibold text-slate-500">Игр: {{ row.played }}</p>
          </div>
          <div class="flex gap-1">
            <span
              v-for="(result, resultIndex) in row.recentForm"
              :key="resultIndex"
              class="inline-grid h-5 w-5 place-items-center rounded text-[10px] font-black text-white"
              :class="formClass(result)"
              >{{ result }}</span
            >
            <span v-if="!row.recentForm.length" class="text-slate-400">—</span>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-3 gap-2">
          <div class="rounded-md bg-slate-50 px-2 py-2 text-center">
            <div class="text-[10px] font-black uppercase text-slate-400">xG</div>
            <div class="mt-0.5 text-base font-black leading-none text-slate-950">
              {{ row.xG.toFixed(2) }}
            </div>
          </div>
          <div class="rounded-md bg-slate-50 px-2 py-2 text-center">
            <div class="text-[10px] font-black uppercase text-slate-400">xGA</div>
            <div class="mt-0.5 text-base font-black leading-none text-slate-950">
              {{ row.xGA.toFixed(2) }}
            </div>
          </div>
          <div class="rounded-md bg-slate-50 px-2 py-2 text-center">
            <div class="text-[10px] font-black uppercase text-slate-400">Удары</div>
            <div class="mt-0.5 text-base font-black leading-none text-slate-950">
              {{ row.shots.toFixed(2) }}
            </div>
          </div>
        </div>

        <div class="mt-2 grid grid-cols-2 gap-2">
          <div class="rounded-md bg-emerald-50 px-2 py-2 text-center">
            <div class="text-[10px] font-black uppercase text-emerald-600">Атака</div>
            <div class="mt-0.5 text-lg font-black leading-none text-emerald-700">
              {{ row.attack }}
            </div>
          </div>
          <div class="rounded-md bg-sky-50 px-2 py-2 text-center">
            <div class="text-[10px] font-black uppercase text-sky-600">Защита</div>
            <div class="mt-0.5 text-lg font-black leading-none text-sky-700">
              {{ row.defense }}
            </div>
          </div>
        </div>
      </article>
    </div>

    <div class="hidden h-full md:block">
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

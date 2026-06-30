<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'
import { getCompetitionConfig } from '@/data/gameConfig'
import type { CountryId, TableZoneType } from '@/data/gameConfig/types'
import { getTableZoneType } from '@/domain/competitions/selectors'
import type { Club, LeagueTableRow } from '@/types/football'

const props = defineProps<{
  rows: LeagueTableRow[]
  clubs: Club[]
  selectedClubId?: string
  countryId: CountryId
  competitionId: string
}>()

const { t } = useI18n()

// ВОЗВРАЩАЕТ НАЗВАНИЕ КЛУБА ПО ИДЕНТИФИКАТОРУ
const clubName = (clubId: string): string =>
  props.clubs.find((club) => club.id === clubId)?.name ?? clubId

const competition = computed(() => getCompetitionConfig(props.countryId, props.competitionId))

const zoneFor = (position: number): TableZoneType | undefined =>
  getTableZoneType(position, props.rows.length, competition.value.tableZones)

const zoneBorderClasses: Partial<Record<TableZoneType, string>> = {
  champion: 'border-l-4 border-l-amber-400',
  'direct-promotion': 'border-l-4 border-l-emerald-500',
  'promotion-playoff': 'border-l-4 border-l-sky-500',
  'relegation-playoff': 'border-l-4 border-l-orange-500',
  'direct-relegation': 'border-l-4 border-l-rose-500',
}

const zoneMarkerClasses: Partial<Record<TableZoneType, string>> = {
  champion: 'bg-amber-400',
  'direct-promotion': 'bg-emerald-500',
  'promotion-playoff': 'bg-sky-500',
  'relegation-playoff': 'bg-orange-500',
  'direct-relegation': 'bg-rose-500',
}

const zoneClass = (position: number): string => {
  const zone = zoneFor(position)
  return zone ? (zoneBorderClasses[zone] ?? '') : ''
}

const zoneLabel = (position: number): string | undefined => {
  const type = zoneFor(position)
  const zone = type
    ? competition.value.tableZones.find((candidate) => candidate.type === type)
    : undefined
  return zone ? t(zone.labelKey) : undefined
}

const legendItems = computed(() => {
  const visibleZoneTypes = new Set(
    props.rows
      .map((row) => zoneFor(row.position))
      .filter((type): type is TableZoneType => type !== undefined),
  )
  const addedTypes = new Set<TableZoneType>()

  return competition.value.tableZones.flatMap((zone) => {
    if (!visibleZoneTypes.has(zone.type) || addedTypes.has(zone.type)) {
      return []
    }
    addedTypes.add(zone.type)
    return [
      {
        type: zone.type,
        label: t(zone.labelKey),
        markerClass: zoneMarkerClasses[zone.type] ?? 'bg-slate-400',
      },
    ]
  })
})
</script>

<template>
  <!-- ТУРНИРНАЯ ТАБЛИЦА ЛИГИ -->
  <div class="overflow-auto">
    <table class="min-w-full border-collapse text-left">
      <thead>
        <tr class="border-b border-slate-200 text-xs uppercase text-slate-500">
          <th class="whitespace-nowrap px-3 py-2 text-sm">#</th>
          <th class="whitespace-nowrap px-3 py-2 text-sm">{{ t('leagueTable.club') }}</th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.played') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.wins') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.draws') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.losses') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.goals') }}
          </th>
          <th class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ t('leagueTable.points') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in rows"
          :key="row.clubId"
          class="border-b border-slate-100"
          :class="[
            row.clubId === selectedClubId
              ? 'bg-emerald-50 font-semibold text-emerald-900'
              : 'text-slate-700',
            zoneClass(row.position),
          ]"
          :title="zoneLabel(row.position)"
        >
          <td class="whitespace-nowrap px-3 py-2 text-sm">{{ row.position }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-sm">{{ clubName(row.clubId) }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">{{ row.played }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">{{ row.wins }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">{{ row.draws }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">{{ row.losses }}</td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm">
            {{ row.goalsFor }}:{{ row.goalsAgainst }}
          </td>
          <td class="whitespace-nowrap px-3 py-2 text-right text-sm font-semibold">
            {{ row.points }}
          </td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="legendItems.length"
      class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-200 bg-white/95 px-3 py-3 text-xs text-slate-600 shadow-[0_-8px_20px_rgba(15,23,42,0.04)] backdrop-blur"
    >
      <span class="font-semibold text-slate-700">{{ t('leagueTable.legend') }}:</span>
      <div
        v-for="item in legendItems"
        :key="item.type"
        class="flex items-center gap-2 whitespace-nowrap"
      >
        <span class="h-4 w-1 rounded-full" :class="item.markerClass"></span>
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

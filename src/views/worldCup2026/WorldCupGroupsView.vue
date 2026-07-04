<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { WORLD_CUP_GROUP_IDS } from '@/stores/worldCup2026/enums'
import { useWorldCup2026Store } from '@/stores/worldCup2026/worldCup2026'
import WorldCupStandingTable from '@/components/worldCup2026/WorldCupStandingTable.vue'
import WorldCupThirdPlaceTable from '@/components/worldCup2026/WorldCupThirdPlaceTable.vue'

const { t } = useI18n()
const worldCupStore = useWorldCup2026Store()

const groups = computed(() => {
  const state = worldCupStore.state
  if (!state) {
    return []
  }
  return WORLD_CUP_GROUP_IDS.map((groupId) => ({
    id: groupId,
    rows: state.standings[groupId] ?? [],
  }))
})
</script>

<template>
  <div class="space-y-6">
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-4">
    <WorldCupStandingTable
      v-for="group in groups"
      :key="group.id"
      :rows="group.rows"
      :highlight-team-id="worldCupStore.state?.selectedTeamId"
      :title="t('worldCup2026.group', { letter: group.id })"
    />
  </div>
  <WorldCupThirdPlaceTable
    :rows="worldCupStore.thirdPlaceStandings"
    :highlight-team-id="worldCupStore.state?.selectedTeamId"
  />
  </div>
</template>

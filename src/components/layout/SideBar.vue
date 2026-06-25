<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import type { Club } from '@/types/football'

import type { AppNavItem } from '@/components/layout/types'
import ClubBadge from '@/components/ui/ClubBadge.vue'
import IconSymbol from '@/components/ui/IconSymbol.vue'

const props = defineProps<{
  activePath: string
  items: AppNavItem[]
  selectedClub?: Club
  settingsOpen: boolean
}>()

const emit = defineEmits<{
  toggleSettings: []
  closeSettings: []
  resetGame: []
}>()

const { t } = useI18n()

const isActive = (item: AppNavItem): boolean => {
  if (!item.to) {
    return false
  }

  return props.activePath === item.to
}
</script>

<template>
  <aside
    class="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col border-r border-white/10 bg-[#101c19] text-white shadow-[14px_0_40px_rgba(4,18,14,0.18)] md:flex"
  >
    <RouterLink
      to="/dashboard"
      class="flex h-[86px] items-center gap-3 border-b border-white/10 px-5"
    >
      <ClubBadge v-if="selectedClub" :club="selectedClub" />
      <div class="min-w-0">
        <div class="truncate text-sm font-black tracking-tight">
          {{ selectedClub?.shortName }}
        </div>
        <div
          class="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-emerald-200/60"
        >
          {{ t('app.brand') }}
        </div>
      </div>
    </RouterLink>

    <nav class="flex-1 px-3 py-5">
      <template v-for="(item, index) in items" :key="item.to ?? `divider-${index}`">
        <div v-if="item.divider" class="mx-3 my-3 h-px bg-white/10"></div>
        <RouterLink
          v-else-if="item.to"
          :to="item.to"
          class="group mb-1 flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-slate-300 transition hover:bg-white/7 hover:text-white"
          :class="
            isActive(item)
              ? 'bg-emerald-400/15 text-emerald-300 shadow-[inset_3px_0_0_#34d399]'
              : ''
          "
          @click="emit('closeSettings')"
        >
          <IconSymbol :name="item.icon" class="h-[18px] w-[18px]" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div class="relative border-t border-white/10 p-3">
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
        :aria-expanded="settingsOpen"
        @click="emit('toggleSettings')"
      >
        <IconSymbol name="settings" class="h-[18px] w-[18px]" />
        <span>{{ t('app.menu') }}</span>
        <IconSymbol name="chevronRight" class="ml-auto h-4 w-4" />
      </button>

      <div
        v-if="settingsOpen"
        class="absolute bottom-3 left-[calc(100%+10px)] w-48 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl"
      >
        <div class="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          {{ t('app.game') }}
        </div>
        <button
          type="button"
          class="w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold text-rose-700 hover:bg-rose-50"
          @click="emit('resetGame')"
        >
          {{ t('app.newGame') }}
        </button>
      </div>
    </div>
  </aside>
</template>

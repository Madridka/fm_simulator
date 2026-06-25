<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { Club } from '@/types/football'

import type { AppNavItem } from '@/stores/app/types'
import ClubBadge from '@/components/ui/ClubBadge.vue'
import IconSymbol from '@/components/ui/IconSymbol.vue'

const props = withDefaults(
  defineProps<{
    activePath: string
    items: AppNavItem[]
    selectedClub?: Club
    settingsOpen: boolean
    mode?: 'sidebar' | 'drawer'
  }>(),
  {
    mode: 'sidebar',
  },
)

const emit = defineEmits<{
  toggleSettings: []
  closeSettings: []
  resetGame: []
  navigate: []
}>()

const { t } = useI18n()

const isActive = (item: AppNavItem): boolean => {
  if (!item.to) {
    return false
  }

  return props.activePath === item.to
}

const handleNavigate = (): void => {
  emit('closeSettings')
  emit('navigate')
}
</script>

<template>
  <div
    class="flex h-full flex-col"
    :class="mode === 'sidebar' ? 'bg-[#101c19] text-white' : 'bg-white text-slate-950'"
  >
    <RouterLink
      to="/dashboard"
      class="flex h-[86px] items-center gap-3 px-5"
      :class="mode === 'sidebar' ? 'border-b border-white/10' : 'border-b border-slate-100'"
      @click="handleNavigate"
    >
      <ClubBadge v-if="selectedClub" :club="selectedClub" />
      <div class="min-w-0">
        <div class="truncate text-sm font-black tracking-tight">
          {{ selectedClub?.shortName }}
        </div>
        <div
          class="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.13em]"
          :class="mode === 'sidebar' ? 'text-emerald-200/60' : 'text-emerald-700'"
        >
          {{ t('app.brand') }}
        </div>
      </div>
    </RouterLink>

    <nav class="flex-1 px-3 py-5">
      <template v-for="(item, index) in items" :key="item.to ?? `divider-${index}`">
        <div
          v-if="item.divider"
          class="mx-3 my-3 h-px"
          :class="mode === 'sidebar' ? 'bg-white/10' : 'bg-slate-100'"
        ></div>
        <RouterLink
          v-else-if="item.to"
          :to="item.to"
          class="group mb-1 flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition"
          :class="[
            mode === 'sidebar'
              ? 'text-slate-300 hover:bg-white/7 hover:text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
            isActive(item)
              ? mode === 'sidebar'
                ? 'bg-emerald-400/15 text-emerald-300 shadow-[inset_3px_0_0_#34d399]'
                : 'bg-emerald-100 text-emerald-800'
              : '',
          ]"
          @click="handleNavigate"
        >
          <IconSymbol :name="item.icon" class="h-[18px] w-[18px]" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </template>
    </nav>

    <div
      class="relative p-3"
      :class="mode === 'sidebar' ? 'border-t border-white/10' : 'border-t border-slate-100'"
    >
      <button
        type="button"
        class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition"
        :class="
          mode === 'sidebar'
            ? 'text-slate-300 hover:bg-white/10 hover:text-white'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
        "
        :aria-expanded="settingsOpen"
        @click="emit('toggleSettings')"
      >
        <IconSymbol name="settings" class="h-[18px] w-[18px]" />
        <span>{{ t('app.menu') }}</span>
        <IconSymbol name="chevronRight" class="ml-auto h-4 w-4" />
      </button>

      <div
        v-if="settingsOpen"
        class="z-50 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl"
        :class="
          mode === 'sidebar' ? 'absolute bottom-3 left-[calc(100%+10px)] w-48' : 'mt-2 w-full'
        "
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
  </div>
</template>

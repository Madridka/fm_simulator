<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useScoutReport } from '@/composables/useScoutReport'

import ClubBadge from '@/components/ui/ClubBadge.vue'

const { items, nextMatchVenue, nextOpponent, nextOpponentRating } = useScoutReport()
</script>

<template>
  <RouterLink
    :to="{ name: 'squad', query: { tab: 'tactics' } }"
    class="block rounded-xl border border-emerald-200/80 bg-white p-3 shadow-[0_12px_30px_rgba(24,51,43,0.06)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_16px_40px_rgba(24,51,43,0.1)]"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600">
          Скаутский отчёт
        </div>
        <h2 class="mt-0.5 truncate text-base font-black tracking-tight text-slate-950">
          <template v-if="nextOpponent">{{ nextOpponent.name }}</template>
          <template v-else>Следующий соперник</template>
        </h2>
        <p class="mt-0.5 text-[11px] font-semibold text-slate-400">
          <template v-if="nextOpponent">
            {{ nextMatchVenue }} · рейтинг {{ nextOpponentRating }}
          </template>
          <template v-else>Матч пока не выбран</template>
        </p>
      </div>
      <ClubBadge v-if="nextOpponent" :club="nextOpponent" size="sm" />
    </header>

    <ul class="mt-2 grid gap-2 xl:grid-cols-2">
      <li
        v-for="item in items.slice(0, 2)"
        :key="item"
        class="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold leading-snug text-slate-700 xl:min-h-[46px]"
      >
        {{ item }}
      </li>
    </ul>
  </RouterLink>
</template>

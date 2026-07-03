<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import SectionHero from '@/components/ui/SectionHero.vue'

const { t } = useI18n()
</script>

<template>
  <section class="mx-auto flex max-w-[1600px] flex-col gap-5">
    <SectionHero
      :title="t('worldCup2026.squadRegistration.title')"
      :subtitle="t('worldCup2026.squadRegistration.subtitle')"
    />
    <article class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p class="text-lg font-bold text-slate-700">
        {{ t('worldCup2026.squadRegistration.comingSoon') }}
      </p>
    </article>
  </section>
</template>

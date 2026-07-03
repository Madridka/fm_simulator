<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import bgImage from '@/assets/images/game-mode-selection-bg.webp'

const router = useRouter()
const { t } = useI18n()

const goToCareer = (): void => {
  void router.push({ name: 'select-club' })
}

const goToWorldCup = (): void => {
  void router.push({ name: 'world-cup-select-team' })
}
</script>

<template>
  <section class="relative flex min-h-screen items-center justify-center overflow-hidden">
    <img
      :src="bgImage"
      alt=""
      class="absolute inset-0 h-full w-full object-cover transition duration-700"
      aria-hidden="true"
    />
    <div class="absolute inset-0 bg-[#050a12]/72"></div>

    <div class="relative z-10 w-full max-w-6xl px-4 py-8 sm:px-6">
      <header class="mb-8 text-center sm:mb-10">
        <p class="text-[11px] font-black uppercase tracking-[0.35em] text-cyan-200/70">
          FM Simulator
        </p>
        <h1 class="mt-3 text-3xl font-black uppercase tracking-wide text-white sm:text-4xl">
          {{ t('gameMode.title') }}
        </h1>
        <p class="mx-auto mt-3 max-w-xl text-sm font-semibold text-slate-300 sm:text-base">
          {{ t('gameMode.subtitle') }}
        </p>
      </header>

      <div class="grid gap-5 md:grid-cols-2 md:gap-6">
        <button
          type="button"
          class="group relative min-h-[320px] overflow-hidden rounded-2xl border border-cyan-300/25 text-left shadow-2xl outline-none transition duration-300 hover:-translate-y-1 hover:border-cyan-200/50 focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a12] sm:min-h-[380px]"
          @click="goToCareer"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-[#0a1f2e]/95 via-[#0d2840]/90 to-[#061018]/95"
          ></div>
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,211,238,0.2),transparent_55%)] transition duration-500 group-hover:scale-105"
          ></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

          <div class="relative flex h-full flex-col justify-end p-7 sm:p-8">
            <h2 class="text-2xl font-black uppercase text-white sm:text-3xl">
              {{ t('gameMode.career.title') }}
            </h2>
            <p class="mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-300">
              {{ t('gameMode.career.description') }}
            </p>
            <span
              class="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-500/15 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-cyan-200 transition group-hover:bg-cyan-500/25"
            >
              {{ t('gameMode.career.cta') }}
            </span>
          </div>
        </button>

        <button
          type="button"
          class="group relative min-h-[320px] overflow-hidden rounded-2xl border border-amber-300/25 text-left shadow-2xl outline-none transition duration-300 hover:-translate-y-1 hover:border-amber-200/50 focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a12] sm:min-h-[380px]"
          @click="goToWorldCup"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br from-[#1a1030]/95 via-[#1e1640]/90 to-[#0c1024]/95"
          ></div>
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.22),transparent_55%)] transition duration-500 group-hover:scale-105"
          ></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

          <div class="relative flex h-full flex-col justify-end p-7 sm:p-8">
            <h2 class="text-2xl font-black uppercase text-white sm:text-3xl">
              {{ t('gameMode.worldCup.title') }}
            </h2>
            <p class="mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-300">
              {{ t('gameMode.worldCup.description') }}
            </p>
            <span
              class="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-amber-300/40 bg-amber-500/15 px-5 py-2.5 text-sm font-black uppercase tracking-wide text-amber-200 transition group-hover:bg-amber-500/25"
            >
              {{ t('gameMode.worldCup.cta') }}
            </span>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

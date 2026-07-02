<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  subtitle?: string
  eyebrow?: string
}>(), {
  subtitle: '',
  eyebrow: '',
})
</script>

<template>
  <article class="flex min-h-[76px] shrink-0 flex-col gap-3 overflow-hidden rounded-xl bg-emerald-950 px-4 py-2.5 text-white shadow-sm md:flex-row md:items-center md:justify-between">
    <div class="min-w-0">
      <div v-if="eyebrow" class="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300">
        {{ eyebrow }}
      </div>
      <h1 class="truncate text-xl font-black leading-tight">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1 truncate text-xs font-semibold text-emerald-100/65">
        {{ subtitle }}
      </p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-end justify-end gap-2">
      <slot name="actions" />
    </div>
  </article>
</template>

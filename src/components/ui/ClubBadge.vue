<script setup lang="ts">
import type { Club } from '@/types/football'

defineProps<{
  club: Club
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <div
    class="grid shrink-0 place-items-center overflow-hidden rounded-md border font-bold"
    :class="{
      'h-8 w-8 text-xs': size === 'sm',
      'h-11 w-11 text-sm': !size || size === 'md',
      'h-16 w-16 text-lg': size === 'lg',
    }"
    :style="{
      backgroundColor: club.primaryColor,
      color: club.secondaryColor,
      borderColor: club.secondaryColor,
    }"
  >
    <img
      v-if="club.logoUrl"
      :src="club.logoUrl"
      :alt="club.name"
      class="h-full w-full object-contain p-1"
    />
    <span v-else>{{ club.shortName }}</span>
  </div>
</template>

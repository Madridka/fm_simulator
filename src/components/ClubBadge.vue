<script setup lang="ts">
import type { Club } from '@/types/football'

defineProps<{
  club: Club
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <div
    class="grid shrink-0 place-items-center rounded-md border font-bold"
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
    {{ club.shortName }}
  </div>
</template>

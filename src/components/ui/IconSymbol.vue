<script setup lang="ts">
type IconName =
  | 'home'
  | 'users'
  | 'academy'
  | 'swap'
  | 'table'
  | 'tasks'
  | 'calendar'
  | 'trophy'
  | 'medal'
  | 'settings'
  | 'menu'
  | 'chevronRight'

defineProps<{
  name: IconName
}>()
</script>

<template>
  <!-- ГРАФИЧЕСКИЙ СИМВОЛ ИНТЕРФЕЙСА -->
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <path v-if="name === 'home'" d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" />
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20v-2a5 5 0 0 1 10 0v2M16 4a3 3 0 0 1 0 6M15 14a5 5 0 0 1 6 4v2" />
    </template>
    <template v-else-if="name === 'academy'">
      <path d="M4 20c3-1 5-3 6-6 1-3 1-6 0-10 4 1 7 4 8 8 1 4-1 7-5 8" />
      <path d="M8 16c2 0 5-2 7-5M12 20v-5" />
    </template>
    <path v-else-if="name === 'swap'" d="M7 7h13m-4-4 4 4-4 4M17 17H4m4 4-4-4 4-4" />
    <template v-else-if="name === 'table'">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 9v11M16 9v11" />
    </template>
    <path
      v-else-if="name === 'trophy'"
      d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v4m-4 3h8"
    />
    <template v-else-if="name === 'medal'">
      <path d="M8 3h8l-2 6h-4z" />
      <circle cx="12" cy="15" r="5" />
      <path d="m10.5 15 1 1 2-2" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3h4v.08A1.7 1.7 0 0 0 15.04 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.26.62.86 1.03 1.56 1.03H21v4h-.08A1.7 1.7 0 0 0 19.4 15z"
      />
    </template>

    <template v-else-if="name === 'calendar'">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
      <path d="M7 14h.01M12 14h.01M17 14h.01M7 18h.01M12 18h.01M17 18h.01" />
    </template>

    <template v-else-if="name === 'tasks'">
      <path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="m7.5 12 1.5 1.5 2.5-3" />
      <path d="M13.5 12h3" />

      <path d="m7.5 17 1.5 1.5 2.5-3" />
      <path d="M13.5 17h3" />
    </template>

    <path v-else-if="name === 'menu'" d="M4 7h16M4 12h16M4 17h16" stroke-width="2" />

    <path v-else d="m9 18 6-6-6-6" stroke-width="2" />
  </svg>
</template>

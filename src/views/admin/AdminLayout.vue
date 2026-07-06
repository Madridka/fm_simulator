<script setup lang="ts">
import { ref } from 'vue'
import Drawer from 'primevue/drawer'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import IconSymbol from '@/components/ui/IconSymbol.vue'
import { logoutAdmin } from '@/domain/admin/adminAuth'

const route = useRoute()
const router = useRouter()
const drawerVisible = ref(false)

const logout = async (): Promise<void> => {
  logoutAdmin()
  await router.replace('/admin/login')
}
</script>

<template>
  <div class="min-h-screen min-w-[320px] bg-[#eef2f0] font-sans text-slate-900">
    <aside class="fixed inset-y-0 left-0 z-40 hidden w-[228px] border-r border-white/10 bg-[#101c19] text-white shadow-[14px_0_40px_rgba(4,18,14,0.18)] md:flex md:flex-col">
      <RouterLink to="/admin/simulation" class="flex h-[86px] items-center gap-3 border-b border-white/10 px-5">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
          <IconSymbol name="settings" class="h-5 w-5" />
        </span>
        <div>
          <div class="text-sm font-black">FM ADMIN</div>
          <div class="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/60">Управление игрой</div>
        </div>
      </RouterLink>

      <nav class="flex-1 px-3 py-5">
        <RouterLink
          to="/admin/simulation"
          class="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold transition"
          :class="route.path === '/admin/simulation' ? 'bg-emerald-400/15 text-emerald-300 shadow-[inset_3px_0_0_#34d399]' : 'text-slate-300 hover:bg-white/10 hover:text-white'"
        >
          <IconSymbol name="settings" class="h-[18px] w-[18px]" />
          <span>Симуляция</span>
        </RouterLink>
      </nav>

      <div class="space-y-1 border-t border-white/10 p-3">
        <RouterLink to="/" class="flex h-10 items-center rounded-lg px-3 text-sm font-bold text-slate-300 hover:bg-white/10 hover:text-white">
          Вернуться в игру
        </RouterLink>
        <button type="button" class="flex h-10 w-full items-center rounded-lg px-3 text-left text-sm font-bold text-rose-300 hover:bg-rose-400/10" @click="logout">
          Выйти из панели
        </button>
      </div>
    </aside>

    <Drawer v-model:visible="drawerVisible" position="left" class="!w-[280px] md:!hidden">
      <template #container>
        <div class="flex h-full flex-col bg-white p-4">
          <div class="mb-5 text-lg font-black text-emerald-950">FM ADMIN</div>
          <RouterLink to="/admin/simulation" class="rounded-lg bg-emerald-100 px-3 py-3 text-sm font-bold text-emerald-900" @click="drawerVisible = false">Симуляция</RouterLink>
          <div class="mt-auto space-y-2">
            <RouterLink to="/" class="block rounded-lg px-3 py-2 text-sm font-bold text-slate-700">Вернуться в игру</RouterLink>
            <button type="button" class="w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-rose-700" @click="logout">Выйти</button>
          </div>
        </div>
      </template>
    </Drawer>

    <div class="flex min-h-screen flex-col md:pl-[228px]">
      <header class="sticky top-0 z-30 border-b border-slate-200/90 bg-white/90 backdrop-blur-xl">
        <div class="flex min-h-[86px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div class="flex items-center gap-3">
            <button type="button" class="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 md:hidden" aria-label="Открыть меню" @click="drawerVisible = true">
              <IconSymbol name="menu" class="h-5 w-5" />
            </button>
            <div>
              <div class="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Администрирование</div>
              <div class="text-xl font-black tracking-tight text-slate-950">Настройки Football Manager</div>
            </div>
          </div>
          <span class="hidden rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-800 sm:block">Локальная панель</span>
        </div>
      </header>

      <main class="flex-1 p-4 sm:p-6 lg:p-8">
        <RouterView />
      </main>
    </div>
  </div>
</template>

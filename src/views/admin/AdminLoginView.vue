<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import { authenticateAdmin, isAdminConfigured } from '@/domain/admin/adminAuth'

const route = useRoute()
const router = useRouter()
const login = ref('')
const password = ref('')
const error = ref('')
const submitting = ref(false)
const configured = computed(isAdminConfigured)

const submit = async (): Promise<void> => {
  error.value = ''
  if (!configured.value) {
    error.value = 'Укажите VITE_ADMIN_LOGIN и VITE_ADMIN_PASSWORD в файле .env.'
    return
  }
  submitting.value = true
  try {
    if (!authenticateAdmin(login.value, password.value)) {
      error.value = 'Неверный логин или пароль.'
      return
    }
    const requestedRedirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    const redirect = requestedRedirect.startsWith('/admin') && requestedRedirect !== '/admin/login'
      ? requestedRedirect
      : '/admin/simulation'
    await router.replace(redirect)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="grid min-h-screen min-w-[320px] place-items-center bg-[#eef2f0] p-4 text-slate-900">
    <section class="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
      <header class="bg-emerald-950 px-7 py-7 text-white">
        <div class="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">FM Simulator</div>
        <h1 class="mt-1 text-2xl font-black">Вход в админ-панель</h1>
        <p class="mt-2 text-sm font-semibold text-emerald-100/65">Закрытая зона управления симуляцией</p>
      </header>

      <form class="space-y-5 p-7" @submit.prevent="submit">
        <label class="block">
          <span class="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Логин</span>
          <InputText v-model="login" autocomplete="username" class="w-full" autofocus />
        </label>
        <label class="block">
          <span class="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Пароль</span>
          <Password
            v-model="password"
            autocomplete="current-password"
            :feedback="false"
            toggle-mask
            fluid
          />
        </label>

        <div v-if="error" class="rounded-lg bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700" role="alert">
          {{ error }}
        </div>

        <Button
          type="submit"
          label="Войти"
          icon="pi pi-sign-in"
          class="w-full"
          :loading="submitting"
        />
        <RouterLink to="/" class="block text-center text-sm font-bold text-emerald-700 hover:text-emerald-900">
          Вернуться в игру
        </RouterLink>
      </form>
    </section>
  </main>
</template>

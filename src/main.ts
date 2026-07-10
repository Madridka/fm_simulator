import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'
import Button from 'primevue/button'
import Select from 'primevue/select'
import 'primeicons/primeicons.css'
import App from './App.vue'
import i18n from './plugins/i18n/i18n'
import { router } from './router'
import { gameSaveRepository } from '@/repositories/gameSaveRepository'
import './styles/main.css'

const bootstrap = async (): Promise<void> => {
  await gameSaveRepository.init()

  const app = createApp(App)

  app.use(createPinia())
  app.use(router)
  app.use(i18n)
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
    },
  })

  app.component('Button', Button)
  app.component('Select', Select)

  app.mount('#app')
}

void bootstrap()

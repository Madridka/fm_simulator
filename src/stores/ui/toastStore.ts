import { defineStore } from 'pinia'
import { ref } from 'vue'

type ToastSeverity = 'info' | 'success' | 'warning'

export const useToastStore = defineStore('toast', () => {
  const message = ref('')
  const severity = ref<ToastSeverity>('info')
  let timer: number | undefined

  const show = (nextMessage: string, nextSeverity: ToastSeverity = 'info'): void => {
    message.value = nextMessage
    severity.value = nextSeverity
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      message.value = ''
    }, 3600)
  }

  const clear = (): void => {
    window.clearTimeout(timer)
    message.value = ''
  }

  return {
    message,
    severity,
    show,
    clear,
  }
})

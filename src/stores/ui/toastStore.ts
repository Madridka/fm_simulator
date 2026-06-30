import { defineStore } from 'pinia'
import { ref } from 'vue'

type ToastSeverity = 'info' | 'success' | 'warning'

// УПРАВЛЯЕТ ЕДИНСТВЕННЫМ ВРЕМЕННЫМ УВЕДОМЛЕНИЕМ ПРИЛОЖЕНИЯ
export const useToastStore = defineStore('toast', () => {
  const message = ref('')
  const severity = ref<ToastSeverity>('info')
  let timer: number | undefined

  // ПОКАЗЫВАЕТ УВЕДОМЛЕНИЕ И АВТОМАТИЧЕСКИ СКРЫВАЕТ ЕГО ПО ТАЙМЕРУ
  const show = (nextMessage: string, nextSeverity: ToastSeverity = 'info'): void => {
    message.value = nextMessage
    severity.value = nextSeverity
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      message.value = ''
    }, 3600)
  }

  // НЕМЕДЛЕННО СКРЫВАЕТ УВЕДОМЛЕНИЕ И СБРАСЫВАЕТ ТАЙМЕР
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

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import vueDevTools from 'vite-plugin-vue-devtools'

export default defineConfig(({ command, mode }) => ({
  plugins: [
    vue(),
    mode === 'test'
      ? undefined
      : vueDevTools({ launchEditor: 'code' }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: true,
    cors: {
      preflightContinue: true,
    },
    port: 5173,
  },

  base: command === 'build' ? '/fm_simulator/' : '/',
}))

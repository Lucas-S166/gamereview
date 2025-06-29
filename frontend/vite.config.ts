import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/~lusullivan/gamereview/',
  server: {
    port: 31873,
    host: '0.0.0.0',
  },
})

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Deployed to https://yexu7.github.io/Myweb/ , so we need base = '/Myweb/'.
// In dev (npm run dev) Vite ignores `base` and serves from '/'.
export default defineConfig({
  base: '/Myweb/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

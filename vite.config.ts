import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Deployed to https://yexu7.github.io/Myweb/ , so we need base = '/Myweb/'.
// In dev (npm run dev) Vite ignores `base` and serves from '/'.
export default defineConfig({
  base: '/Myweb/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: { main: 'index.html', lingji: 'projects/lingji/index.html', ott: 'projects/ott/index.html', ruying: 'projects/ruying/index.html', jixing: 'projects/jixing/index.html' },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
})

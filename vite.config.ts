import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/mesheditor/',
  build: {
    outDir: 'dist/mesheditor',
    emptyOutDir: true,
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

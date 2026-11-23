import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the API runs on :3000; in production Express serves both.
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})

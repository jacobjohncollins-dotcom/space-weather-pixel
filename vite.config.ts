import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site at /space-weather-pixel/,
  // not the domain root, so the production build needs that base prefix on
  // every asset URL. `npm run dev` keeps serving from `/`.
  base: command === 'build' ? '/space-weather-pixel/' : '/',
  plugins: [react(), tailwindcss()],
}))

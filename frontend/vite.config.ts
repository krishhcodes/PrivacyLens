import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Fixed port so the extension's "Open full audit" link (extension/config.js WEBSITE_URL) always reaches
// PrivacyLens, never another Vite app that happens to run on the default 5173.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
})

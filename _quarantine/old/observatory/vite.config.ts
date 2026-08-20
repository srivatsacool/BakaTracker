import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    includeAssets: ['logo.png', 'avatar.png'],
    manifest: {
      name: 'BakaTracker',
      short_name: 'BakaTracker',
      description: 'ADHD-friendly minimalist life RPG planner — your life as a coin-op arcade',
      theme_color: '#0d0b16',
      background_color: '#0d0b16',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: 'logo.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'logo.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  }), cloudflare()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
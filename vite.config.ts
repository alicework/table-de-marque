import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Chemin de publication : `/` en local, `/table-de-marque/` sur GitHub Pages (fourni par la CI).
  base: process.env.BASE_PATH ?? '/',
  build: {
    // pdf-lib (~500 Ko) vit dans son propre morceau, chargé seulement à la génération de la feuille.
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    react(),
    VitePWA({
      // « prompt » : jamais de rechargement automatique, l'utilisateur décide (et jamais pendant un match).
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icone.svg'],
      manifest: {
        name: 'Table de marque — Basket UFOLEP 33',
        short_name: 'Table de marque',
        description: 'Feuille de match numérique du basket loisir UFOLEP 33',
        lang: 'fr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5f4f0',
        theme_color: '#f5f4f0',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/test/stub-pwa-register.ts', import.meta.url)),
    },
  },
})

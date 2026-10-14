import { defineConfig, devices } from '@playwright/test'

// Même variable que vite.config.ts : `BASE_PATH=/table-de-marque/ npm run e2e` rejoue la suite sous le chemin de publication.
const adresse = `http://localhost:4173${process.env.BASE_PATH ?? '/'}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: adresse,
  },
  projects: [
    { name: 'telephone', use: { ...devices['Pixel 7'] } },
    { name: 'tablette', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: adresse,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})

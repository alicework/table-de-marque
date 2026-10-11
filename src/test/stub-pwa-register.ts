// Remplace le module virtuel de vite-plugin-pwa, qui n'existe pas sous Vitest.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }
}

import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { db } from '../storage/db'
import { GARDE_DOUBLE_TAP } from '../ui/commun/gardeDoubleTap'

const gardeParDefaut = { ...GARDE_DOUBLE_TAP }

// Garde anti-double-tap neutralisée : les tests ordinaires ne dépendent pas du temps.
beforeEach(() => {
  GARDE_DOUBLE_TAP.delaiMs = 0
  GARDE_DOUBLE_TAP.maintenant = () => Date.now()
})

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  Object.assign(GARDE_DOUBLE_TAP, gardeParDefaut)
  await Promise.all(db.tables.map((table) => table.clear()))
})

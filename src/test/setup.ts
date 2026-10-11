import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { db } from '../storage/db'

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await Promise.all(db.tables.map((table) => table.clear()))
})

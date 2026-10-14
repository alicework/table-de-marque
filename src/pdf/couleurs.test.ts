// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { JETONS_PDF, versRvb } from './couleurs'

const css = readFileSync(resolve(import.meta.dirname, '../styles/jetons.css'), 'utf8')
const JETONS_CSS = Object.fromEntries(
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, nom, valeur]) => [nom, valeur.toLowerCase()]),
)

describe('couleurs du PDF', () => {
  it.each(Object.keys(JETONS_PDF))('« %s » est la valeur du jeton CSS', (nom) => {
    expect(JETONS_PDF[nom as keyof typeof JETONS_PDF]).toBe(JETONS_CSS[`--${nom}`])
  })

  it('convertit en composantes de 0 à 1', () => {
    expect(versRvb('#ffffff')).toEqual([1, 1, 1])
    expect(versRvb('#000000')).toEqual([0, 0, 0])
    expect(versRvb('#ff8000').map((c) => Math.round(c * 255))).toEqual([255, 128, 0])
  })
})

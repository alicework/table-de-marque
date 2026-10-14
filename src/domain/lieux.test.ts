import { describe, expect, it } from 'vitest'
import { LIEUX, libelleLieu } from './lieux'

describe('libelleLieu', () => {
  it('compose « Club — Salle, Ville »', () => {
    expect(
      libelleLieu({ club: 'St Delphin', salle: 'Complexe sportif Elisabeth Riffiod', ville: 'Villenave-d’Ornon' }),
    ).toBe('St Delphin — Complexe sportif Elisabeth Riffiod, Villenave-d’Ornon')
  })
})

describe('LIEUX', () => {
  it('recense les 15 clubs du règlement, sans le baby basket', () => {
    expect(LIEUX).toHaveLength(15)
    expect(LIEUX.map((lieu) => lieu.club)).not.toContainEqual(expect.stringMatching(/Bordeaux Maritime/))
  })

  it('est trié par nom de club', () => {
    const clubs = LIEUX.map((lieu) => lieu.club)
    expect(clubs).toEqual([...clubs].sort((a, b) => a.localeCompare(b, 'fr')))
  })

  it('ne contient que le club, la salle et la ville', () => {
    for (const lieu of LIEUX) {
      expect(Object.keys(lieu).sort()).toEqual(['club', 'salle', 'ville'])
      expect(lieu.club && lieu.salle && lieu.ville).toBeTruthy()
    }
  })

  it('connaît la salle de Villenave-d’Ornon', () => {
    expect(LIEUX).toContainEqual({
      club: 'St Delphin',
      salle: 'Complexe sportif Elisabeth Riffiod',
      ville: 'Villenave-d’Ornon',
    })
  })
})

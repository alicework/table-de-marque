import { describe, expect, it } from 'vitest'
import { formaterDateCourte, formaterDateLongue, formaterHeure, saison, slug } from './texte'

describe('texte — dates', () => {
  it('écrit la date en toutes lettres sans décalage de jour', () => {
    expect(formaterDateLongue('2026-10-16')).toBe('vendredi 16 octobre 2026')
    expect(formaterDateLongue('2026-01-01')).toBe('jeudi 1 janvier 2026')
  })

  it('ignore une date absente ou mal formée', () => {
    expect(formaterDateLongue('')).toBe('')
    expect(formaterDateLongue('16/10/2026')).toBe('')
    expect(formaterDateLongue('2026-02-30')).toBe('')
    expect(formaterDateCourte('')).toBe('')
    expect(saison('')).toBe('')
  })

  it('écrit la date courte et l’heure', () => {
    expect(formaterDateCourte('2026-10-16')).toBe('16/10/2026')
    expect(formaterDateCourte(new Date(2026, 9, 16, 21, 5))).toBe('16/10/2026')
    expect(formaterHeure(new Date(2026, 9, 16, 21, 5))).toBe('21:05')
    expect(formaterHeure(new Date(2026, 9, 16, 9, 7))).toBe('09:07')
  })

  it('calcule la saison de septembre à août', () => {
    expect(saison('2026-09-01')).toBe('2026-2027')
    expect(saison('2027-03-01')).toBe('2026-2027')
    expect(saison('2027-08-31')).toBe('2026-2027')
    expect(saison('2027-09-01')).toBe('2027-2028')
  })
})

describe('texte — slug', () => {
  it('retire accents, espaces et ponctuation', () => {
    expect(slug('Villenave-d’Ornon')).toBe('Villenave-d-Ornon')
    expect(slug('  ST DELPHIN ')).toBe('ST-DELPHIN')
    expect(slug('Équipe Élite / Été')).toBe('Equipe-Elite-Ete')
  })

  it('renvoie une chaîne vide quand rien ne reste', () => {
    expect(slug('')).toBe('')
    expect(slug('🏀')).toBe('')
  })
})

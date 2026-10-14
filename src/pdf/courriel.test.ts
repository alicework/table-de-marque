import { describe, expect, it } from 'vitest'
import { calculerEtat } from '../domain/etat'
import { debut, EQUIPE_A, EQUIPE_B, matchDeTest, panier } from '../test/fixtures'
import { courrielFeuille, nomFichierFeuille } from './courriel'

describe('nomFichierFeuille', () => {
  it('date puis équipes sans accent ni espace', () => {
    expect(nomFichierFeuille(matchDeTest())).toBe('2026-10-16_ST-DELPHIN-GRADIGNAN.pdf')
  })

  it('« sans-date » et « equipe » quand il manque la date ou un nom', () => {
    const match = {
      ...matchDeTest(),
      date: '',
      equipes: { A: { ...EQUIPE_A, nom: 'Équipe Élite' }, B: { ...EQUIPE_B, nom: '' } },
    }
    expect(nomFichierFeuille(match)).toBe('sans-date_Equipe-Elite-equipe.pdf')
  })
})

describe('courrielFeuille', () => {
  it('prépare destinataires, objet, corps et lien', () => {
    const match = matchDeTest(panier('A', 'a7', 2), debut('MT2'), panier('B', 'b8', 3), { type: 'finMatch' })
    const courriel = courrielFeuille(match, calculerEtat(match), 'coach@exemple.fr')
    expect(courriel.a).toBe('cd.33@ufolep.org')
    expect(courriel.cc).toBe('coach@exemple.fr')
    expect(courriel.objet).toBe('Feuille de match UFOLEP 33 — 16/10/2026 — ST DELPHIN 2–3 GRADIGNAN')
    expect(courriel.corps).toBe(
      [
        'Bonjour,',
        '',
        'Veuillez trouver ci-joint la feuille du match du vendredi 16 octobre 2026 à Villenave-d’Ornon :',
        'ST DELPHIN 2 – 3 GRADIGNAN.',
        '',
        'Cordialement,',
        'La table de marque',
      ].join('\r\n'),
    )
    const url = new URL(courriel.lien)
    expect(url.protocol).toBe('mailto:')
    expect(url.pathname).toBe('cd.33@ufolep.org')
    expect(url.searchParams.get('cc')).toBe('coach@exemple.fr')
    expect(url.searchParams.get('subject')).toBe(courriel.objet)
    expect(url.searchParams.get('body')).toBe(courriel.corps)
    expect(courriel.lien).toContain('%0D%0A')
    expect(courriel.lien).not.toContain('+')
  })

  it('sans coach ni lieu, avec prolongation', () => {
    const base = matchDeTest(debut('MT2'), debut('P1'), panier('A', 'a7', 2), { type: 'finMatch' })
    const match = { ...base, lieu: '' }
    const courriel = courrielFeuille(match, calculerEtat(match), null)
    expect(courriel.cc).toBeNull()
    expect(courriel.lien).not.toContain('cc=')
    expect(courriel.corps).toContain('du match du vendredi 16 octobre 2026 :')
    expect(courriel.corps).toContain('ST DELPHIN 2 – 0 GRADIGNAN (après prolongation).')
  })

  it('sans date valide, ni « Invalid Date » ni date vide', () => {
    const match = { ...matchDeTest(), date: '' }
    const courriel = courrielFeuille(match, calculerEtat(match), null)
    expect(courriel.objet).toBe('Feuille de match UFOLEP 33 — ST DELPHIN 0–0 GRADIGNAN')
    expect(courriel.corps).toContain('la feuille du match à Villenave-d’Ornon :')
    expect(courriel.corps).not.toContain('Invalid')
  })
})

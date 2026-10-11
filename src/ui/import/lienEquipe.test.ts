import { describe, expect, it } from 'vitest'
import { lireEtEffacerCodeEquipe } from './lienEquipe'

describe('lireEtEffacerCodeEquipe', () => {
  it("lit le code du fragment puis l'efface de l'adresse", () => {
    window.history.replaceState(null, '', '/table/?x=1#equipe=AbC_12-z')
    expect(lireEtEffacerCodeEquipe()).toBe('AbC_12-z')
    expect(window.location.hash).toBe('')
    expect(window.location.pathname + window.location.search).toBe('/table/?x=1')
  })

  it('renvoie le fragment brut quand le code est illisible, pour afficher une erreur', () => {
    window.history.replaceState(null, '', '/#equipe=%%%')
    expect(lireEtEffacerCodeEquipe()).toBe('#equipe=%%%')
  })

  it("ne fait rien sans lien d'équipe", () => {
    window.history.replaceState(null, '', '/#autre')
    expect(lireEtEffacerCodeEquipe()).toBeNull()
    expect(window.location.hash).toBe('#autre')
  })
})

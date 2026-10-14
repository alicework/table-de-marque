import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { definirPossession } from '../../domain/commandes'
import type { NouvelEvenement } from '../../domain/types'
import { db } from '../../storage/db'
import { enregistrerMatch, lireMatch } from '../../storage/matchs'
import { debut, faute, matchDeTest, panier } from '../../test/fixtures'
import { GARDE_DOUBLE_TAP } from '../commun/gardeDoubleTap'
import { EcranMatch } from './EcranMatch'

async function afficher(...evenements: NouvelEvenement[]) {
  const match = await enregistrerMatch(matchDeTest(...evenements))
  const user = userEvent.setup()
  render(<EcranMatch matchId={match.id} onAccueil={vi.fn()} />)
  await screen.findByLabelText('Score')
  return { user, id: match.id }
}

const actions = (nom: string) => within(screen.getByRole('group', { name: `Actions ${nom}` }))
const attendreScore = (texte: string) =>
  waitFor(() => expect(screen.getByLabelText('Score')).toHaveTextContent(texte))

describe('EcranMatch — saisie', () => {
  it('enregistre un panier : action puis joueur', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    expect(screen.getByRole('heading', { name: '+2 — ST DELPHIN' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^n°7,/ }))
    await attendreScore('2 – 0')
    expect(screen.getByText(/^Dernière action/).closest('p')).toHaveTextContent(
      'Dernière action : 2 – 0 · +2 n°7 ST DELPHIN',
    )
    expect((await lireMatch(id))?.evenements).toHaveLength(1)
  })

  it('montre n°, fautes et points sur des tuiles triées par n°', async () => {
    const { user } = await afficher(panier('A', 'a7', 2), faute('A', 'a7'))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Faute' }))
    const tuiles = screen.getAllByRole('button', { name: /^n°/ }).map((t) => t.getAttribute('aria-label'))
    expect(tuiles.slice(0, 2)).toEqual(['n°4, 0 faute, 0 point', 'n°7, 1 faute, 2 points'])
    expect(tuiles).toHaveLength(5)
  })

  it('propose la tuile Coach uniquement pour une faute', async () => {
    const { user, id } = await afficher()
    await user.click(actions('GRADIGNAN').getByRole('button', { name: '+1' }))
    expect(screen.queryByRole('button', { name: /^Coach/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Annuler' }))

    await user.click(actions('GRADIGNAN').getByRole('button', { name: 'Faute' }))
    await user.click(screen.getByRole('button', { name: /^Coach/ }))
    await waitFor(async () => {
      expect((await lireMatch(id))?.evenements).toMatchObject([{ type: 'faute', equipe: 'B', joueurId: null }])
    })
  })

  it('grise un joueur à 5 fautes pour un panier mais pas pour une faute', async () => {
    const { user } = await afficher(...Array.from({ length: 5 }, () => faute('A', 'a11')))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    expect(screen.getByRole('button', { name: /^n°11,/ })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Faute' }))
    expect(screen.getByRole('button', { name: /^n°11,/ })).toBeEnabled()
  })

  it('Annuler revient à l’écran d’action sans rien enregistrer', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+3' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.getByLabelText('Score')).toHaveTextContent('0 – 0')
    expect((await lireMatch(id))?.evenements).toHaveLength(0)
  })

  it('un double tap sur une tuile n’enregistre qu’une action', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    await user.dblClick(screen.getByRole('button', { name: /^n°7,/ }))
    await attendreScore('2 – 0')
    expect((await lireMatch(id))?.evenements).toHaveLength(1)
  })

  it('compte un temps mort et annule la dernière action', async () => {
    const { user } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Temps mort' }))
    await waitFor(() => expect(screen.getByLabelText('Temps morts ST DELPHIN')).toHaveTextContent('TM 1'))
    await user.click(screen.getByRole('button', { name: 'Annuler la dernière action' }))
    await waitFor(() => expect(screen.getByLabelText('Temps morts ST DELPHIN')).toHaveTextContent('TM 0'))
  })

  it('affiche les fautes d’équipe de la période', async () => {
    await afficher(faute('B', 'b8'), faute('B', 'b5'))
    expect(screen.getByLabelText("Fautes d'équipe GRADIGNAN")).toHaveTextContent('Fautes éq. 2/8')
  })
})

describe('EcranMatch — périodes et alertes', () => {
  it('passe à la 2ème mi-temps après confirmation', async () => {
    const { user } = await afficher(panier('A', 'a7', 2))
    await user.click(screen.getByRole('button', { name: 'Fin de période' }))
    const dialogue = screen.getByRole('dialog', { name: 'Fin de la 1ère mi-temps ?' })
    await user.click(within(dialogue).getByRole('button', { name: 'Passer à la 2ème mi-temps' }))
    expect(await screen.findByText('2ème mi-temps')).toBeInTheDocument()
  })

  it('annuler la fin de période ne change rien', async () => {
    const { user, id } = await afficher()
    await user.click(screen.getByRole('button', { name: 'Fin de période' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await lireMatch(id))?.evenements).toHaveLength(0)
  })

  it('propose une prolongation en cas d’égalité', async () => {
    const { user } = await afficher({ type: 'debutPeriode', periode: 'MT2' }, panier('A', 'a7', 2), panier('B', 'b8', 2))
    await user.click(screen.getByRole('button', { name: 'Fin de période' }))
    expect(screen.getByRole('button', { name: 'Terminer le match' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Jouer une prolongation' }))
    expect(await screen.findByText('Prolongation')).toBeInTheDocument()
  })

  it('termine le match puis permet de le rouvrir', async () => {
    const { user } = await afficher({ type: 'debutPeriode', periode: 'MT2' }, panier('A', 'a7', 3))
    await user.click(screen.getByRole('button', { name: 'Fin de période' }))
    expect(screen.queryByRole('button', { name: 'Jouer une prolongation' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Terminer le match' }))
    expect(await screen.findByRole('heading', { name: 'Match terminé' })).toBeInTheDocument()
    expect(screen.getByLabelText('Score final')).toHaveTextContent('ST DELPHIN 3 – 0 GRADIGNAN')
    await user.click(screen.getByRole('button', { name: 'Rouvrir pour corriger' }))
    await attendreScore('3 – 0')
  })

  it('alerte à 8 fautes d’équipe et colore le compteur', async () => {
    await afficher(...Array.from({ length: 8 }, (_, i) => faute('A', ['a4', 'a7', 'a9', 'a11'][i % 4])))
    expect(screen.getByText("ST DELPHIN : 8 fautes d'équipe — au-delà de 8, 2 lancers francs")).toBeInTheDocument()
    expect(screen.getByLabelText("Fautes d'équipe ST DELPHIN")).toHaveClass('niveau-limite')
  })

  it('alerte quand un joueur a 5 fautes', async () => {
    await afficher(...Array.from({ length: 5 }, () => faute('B', 'b8')))
    expect(screen.getByText('GRADIGNAN : n°8 a 5 fautes, doit sortir')).toBeInTheDocument()
  })
})

describe('EcranMatch — flèche de possession', () => {
  const cote = (nom: string) => screen.getByRole('button', { name: `Possession ${nom}` })

  it('se règle d’un tap et se retrouve dans le match enregistré', async () => {
    const { user, id } = await afficher()
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
    expect(cote('GRADIGNAN')).toHaveAttribute('aria-pressed', 'false')
    await user.click(cote('GRADIGNAN'))
    await waitFor(() => expect(cote('GRADIGNAN')).toHaveAttribute('aria-pressed', 'true'))
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
    const match = await lireMatch(id)
    expect(match?.possession).toBe('B')
    expect(match?.evenements).toHaveLength(0)
  })

  it('n’est pas touchée par « Annuler la dernière action »', async () => {
    const { user, id } = await afficher(panier('A', 'a7', 2))
    await user.click(cote('ST DELPHIN'))
    await waitFor(() => expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'true'))
    await user.click(screen.getByRole('button', { name: 'Annuler la dernière action' }))
    await attendreScore('0 – 0')
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'true')
    expect((await lireMatch(id))?.possession).toBe('A')
  })

  it('un tap sur le côté déjà actif n’écrit rien', async () => {
    const match = await enregistrerMatch(definirPossession(matchDeTest(), 'A'))
    const user = userEvent.setup()
    render(<EcranMatch matchId={match.id} onAccueil={vi.fn()} />)
    await screen.findByLabelText('Score')
    const ecriture = vi.spyOn(db.matchs, 'put')
    await user.click(cote('ST DELPHIN'))
    expect(ecriture).not.toHaveBeenCalled()
  })
})

describe('EcranMatch — minuteurs', () => {
  const minuteur = (titre: string) => within(screen.getByRole('dialog', { name: titre }))

  it('ouvre 1 min de temps mort et se ferme sur « Fermer »', async () => {
    const { user } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Temps mort' }))
    expect(minuteur('Temps mort — ST DELPHIN').getByRole('timer')).toHaveTextContent('1:00')
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Temps morts ST DELPHIN')).toHaveTextContent('TM 1'))
  })

  it('ouvre 10 min de mi-temps au passage à la 2ème mi-temps', async () => {
    const { user } = await afficher(panier('A', 'a7', 2))
    await user.click(screen.getByRole('button', { name: 'Fin de période' }))
    await user.click(screen.getByRole('button', { name: 'Passer à la 2ème mi-temps' }))
    expect(minuteur('Mi-temps').getByRole('timer')).toHaveTextContent('10:00')
    expect(await screen.findByText('2ème mi-temps')).toBeInTheDocument()
  })

  it('ouvre 2 min avant une prolongation', async () => {
    const { user } = await afficher(debut('MT2'), panier('A', 'a7', 2), panier('B', 'b8', 2))
    await user.click(screen.getByRole('button', { name: 'Fin de période' }))
    await user.click(screen.getByRole('button', { name: 'Jouer une prolongation' }))
    expect(minuteur('Avant la prolongation').getByRole('timer')).toHaveTextContent('2:00')
  })

  it('n’ouvre rien en fin de match', async () => {
    const { user } = await afficher(debut('MT2'), panier('A', 'a7', 3))
    await user.click(screen.getByRole('button', { name: 'Fin de période' }))
    await user.click(screen.getByRole('button', { name: 'Terminer le match' }))
    expect(await screen.findByRole('heading', { name: 'Match terminé' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('« Annuler » après la popup retire le temps mort sans la rouvrir', async () => {
    const { user, id } = await afficher()
    await user.click(actions('GRADIGNAN').getByRole('button', { name: 'Temps mort' }))
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    await waitFor(() => expect(screen.getByLabelText('Temps morts GRADIGNAN')).toHaveTextContent('TM 1'))
    await user.click(screen.getByRole('button', { name: 'Annuler la dernière action' }))
    await waitFor(() => expect(screen.getByLabelText('Temps morts GRADIGNAN')).toHaveTextContent('TM 0'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect((await lireMatch(id))?.evenements).toHaveLength(0)
  })
})

describe('garde anti-double-tap', () => {
  // Horloge figée : seul un avancement explicite rouvre la garde.
  let horloge = 1000
  const avancer = (ms: number) => {
    horloge += ms
  }

  beforeEach(() => {
    horloge = 1000
    GARDE_DOUBLE_TAP.delaiMs = 300
    GARDE_DOUBLE_TAP.maintenant = () => horloge
  })

  // Une action acceptée plus tard passe par la même file que les précédentes : une fois affichée,
  // tout ce qui a été accepté avant est enregistré.
  async function synchroniser(user: ReturnType<typeof userEvent.setup>) {
    avancer(301)
    await user.click(actions('GRADIGNAN').getByRole('button', { name: 'Temps mort' }))
    await waitFor(() => expect(screen.getByLabelText('Temps morts GRADIGNAN')).toHaveTextContent('TM 1'))
  }

  it('un tap sur la flèche de possession pendant la garde est ignoré', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Temps mort' }))
    await user.click(screen.getByRole('button', { name: 'Possession GRADIGNAN' }))
    await synchroniser(user)
    expect(screen.getByRole('button', { name: 'Possession GRADIGNAN' })).toHaveAttribute('aria-pressed', 'false')
    expect((await lireMatch(id))?.possession).toBeNull()
  })

  it('un double tap sur « Annuler la dernière action » ne supprime qu’une action', async () => {
    const { user, id } = await afficher(panier('A', 'a7', 2), panier('B', 'b8', 3))
    await user.dblClick(screen.getByRole('button', { name: 'Annuler la dernière action' }))
    await synchroniser(user)
    expect(screen.getByLabelText('Score')).toHaveTextContent('2 – 0')
    expect((await lireMatch(id))?.evenements).toMatchObject([{ type: 'panier' }, { type: 'tempsMort' }])
  })

  it('un double tap sur « Temps mort » n’en compte qu’un', async () => {
    const { user, id } = await afficher()
    await user.dblClick(actions('ST DELPHIN').getByRole('button', { name: 'Temps mort' }))
    await synchroniser(user)
    expect(screen.getByLabelText('Temps morts ST DELPHIN')).toHaveTextContent('TM 1')
    expect((await lireMatch(id))?.evenements).toHaveLength(2)
  })

  it('un tap sur « Fermer » pendant la garde est ignoré', async () => {
    const { user } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Temps mort' }))
    const fermer = within(screen.getByRole('dialog', { name: 'Temps mort — ST DELPHIN' })).getByRole('button', {
      name: 'Fermer',
    })
    await user.click(fermer)
    expect(screen.getByRole('dialog', { name: 'Temps mort — ST DELPHIN' })).toBeInTheDocument()
    avancer(301)
    await user.click(fermer)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('le second tap d’un double tap sur « +2 » ne choisit pas la tuile apparue sous le doigt', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    await user.click(screen.getByRole('button', { name: /^n°7,/ }))
    expect(screen.getByRole('heading', { name: '+2 — ST DELPHIN' })).toBeInTheDocument()

    avancer(301)
    await user.click(screen.getByRole('button', { name: /^n°7,/ }))
    await attendreScore('2 – 0')
    expect((await lireMatch(id))?.evenements).toHaveLength(1)
  })

  it('un tap fantôme sur l’écran d’action juste après un choix est ignoré', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+2' }))
    avancer(301)
    await user.click(screen.getByRole('button', { name: /^n°7,/ }))
    await user.click(screen.getByRole('button', { name: 'Annuler la dernière action' }))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+3' }))
    expect(screen.queryByRole('heading', { name: '+3 — ST DELPHIN' })).not.toBeInTheDocument()
    await synchroniser(user)
    expect(screen.getByLabelText('Score')).toHaveTextContent('2 – 0')
    expect((await lireMatch(id))?.evenements).toMatchObject([{ type: 'panier' }, { type: 'tempsMort' }])
  })

  it('« Terminer le match » puis un tap immédiat sur « Rouvrir pour corriger » laisse le match terminé', async () => {
    const { user, id } = await afficher({ type: 'debutPeriode', periode: 'MT2' }, panier('A', 'a7', 3))
    await user.click(screen.getByRole('button', { name: 'Fin de période' }))
    avancer(301)
    await user.click(screen.getByRole('button', { name: 'Terminer le match' }))
    expect(await screen.findByRole('heading', { name: 'Match terminé' })).toBeInTheDocument()

    // Rouvrir commencerait par relire le match : aucune lecture ne doit partir.
    const lecture = vi.spyOn(db.matchs, 'get')
    await user.click(screen.getByRole('button', { name: 'Rouvrir pour corriger' }))
    expect(lecture).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Match terminé' })).toBeInTheDocument()
    expect((await lireMatch(id))?.statut).toBe('termine')
  })
})

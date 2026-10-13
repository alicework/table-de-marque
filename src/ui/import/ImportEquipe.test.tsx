import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { encoderEquipe, lienEquipe, type EquipePartagee } from '../../roster-share/format'
import { PreparationMatch } from '../preparation/PreparationMatch'
import { ImportEquipe, MESSAGE_EXPORT_WEBAFFILIGUE } from './ImportEquipe'
import { demarrerScanner } from './scanner'
import { MESSAGE_CAMERA } from './ScannerQr'

vi.mock('./scanner', () => ({ demarrerScanner: vi.fn() }))

const EQUIPE: EquipePartagee = {
  nom: 'GRADIGNAN',
  couleur: 'Noir',
  joueurs: [
    { licence: '033_5', nom: 'Bernard', prenom: 'Jade', civilite: 'Mme', numero: 5 },
    { licence: '033_8', nom: 'Moreau', prenom: 'Sam', civilite: 'M', numero: null },
  ],
  coach: { type: 'libre', nom: 'Morgan F.' },
}
const LIEN = lienEquipe(encoderEquipe(EQUIPE), 'https://exemple.org/')

function afficher() {
  const user = userEvent.setup()
  const onImporter = vi.fn()
  render(<ImportEquipe onImporter={onImporter} onFermer={vi.fn()} />)
  return { user, onImporter }
}

describe('ImportEquipe', () => {
  it('lit un lien collé, montre l’équipe, puis l’importe', async () => {
    const { user, onImporter } = afficher()
    await user.type(screen.getByLabelText('Coller le lien ou le code'), `  ${LIEN}\n`)
    await user.click(screen.getByRole('button', { name: 'Lire le code' }))
    const apercu = within(screen.getByRole('dialog', { name: 'Équipe reçue' }))
    expect(apercu.getByRole('list', { name: 'Joueurs de GRADIGNAN' })).toHaveTextContent('n°5 Jade Bernard')
    expect(apercu.getByText('Coach : Morgan F.')).toBeInTheDocument()
    await user.click(apercu.getByRole('button', { name: 'Utiliser cette équipe' }))
    expect(onImporter).toHaveBeenCalledWith(EQUIPE)
  })

  it('explique un code non reconnu', async () => {
    const { user, onImporter } = afficher()
    await user.type(screen.getByLabelText('Coller le lien ou le code'), 'Voici notre équipe')
    await user.click(screen.getByRole('button', { name: 'Lire le code' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Code non reconnu')
    expect(onImporter).not.toHaveBeenCalled()
  })

  it('lit un fichier contenant le lien', async () => {
    const { user } = afficher()
    await user.upload(screen.getByLabelText('Choisir un fichier'), new File([`${LIEN}\n`], 'equipe.txt', { type: 'text/plain' }))
    expect(await screen.findByRole('dialog', { name: 'Équipe reçue' })).toBeInTheDocument()
  })

  it("explique où importer un export Webaffiligue donné par erreur", async () => {
    const { user, onImporter } = afficher()
    const csv = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../Sortie_simple_Ufolep.csv'))
    await user.upload(
      screen.getByLabelText('Choisir un fichier'),
      new File([new Uint8Array(csv)], 'Sortie_simple_Ufolep.csv', { type: 'text/csv' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGE_EXPORT_WEBAFFILIGUE)
    expect(onImporter).not.toHaveBeenCalled()
  })

  it('lit le QR code scanné par la caméra', async () => {
    const arreter = vi.fn()
    vi.mocked(demarrerScanner).mockImplementation(async (_video, surCode) => {
      surCode(LIEN)
      return { arreter }
    })
    const { user } = afficher()
    await user.click(screen.getByRole('button', { name: 'Scanner le QR code' }))
    expect(await screen.findByRole('dialog', { name: 'Équipe reçue' })).toBeInTheDocument()
    await waitFor(() => expect(arreter).toHaveBeenCalled())
  })

  it('propose les autres moyens si la caméra est refusée', async () => {
    vi.mocked(demarrerScanner).mockRejectedValue(new Error('NotAllowedError'))
    const { user } = afficher()
    await user.click(screen.getByRole('button', { name: 'Scanner le QR code' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGE_CAMERA)
    expect(screen.getByRole('button', { name: 'Scanner le QR code' })).toBeInTheDocument()
  })
})

describe('Import dans la préparation du match', () => {
  it("remplit l'équipe B avec l'équipe reçue", async () => {
    const user = userEvent.setup()
    render(<PreparationMatch onDemarre={vi.fn()} onRetour={vi.fn()} />)
    const groupeB = within(screen.getByRole('group', { name: 'Équipe B' }))
    await user.type(groupeB.getByLabelText("Nom de l'équipe"), 'Brouillon')
    await user.click(groupeB.getByRole('button', { name: 'Importer une équipe (QR / code)' }))
    await user.type(screen.getByLabelText('Coller le lien ou le code'), LIEN)
    await user.click(screen.getByRole('button', { name: 'Lire le code' }))
    expect(screen.getByText("L'équipe déjà saisie sera remplacée.")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Utiliser cette équipe' }))
    expect(groupeB.getByLabelText("Nom de l'équipe")).toHaveValue('GRADIGNAN')
    expect(groupeB.getByLabelText('N° joueur 1')).toHaveValue('5')
    expect(groupeB.getByLabelText('N° joueur 2')).toHaveValue('')
    expect(groupeB.getByLabelText('Nom du coach')).toHaveValue('Morgan F.')
  })
})

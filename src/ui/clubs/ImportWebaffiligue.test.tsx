import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EcranClubs } from './EcranClubs'

// new URL(…, import.meta.url) échoue sous jsdom (qui remplace la classe URL globale) : chemin explicite.
const EXPORT = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../Sortie_simple_Ufolep.csv'))
// new Uint8Array(…) : un Buffer Node n'est pas accepté tel quel comme BlobPart par les types DOM récents.
const fichier = (contenu: Uint8Array | string, nom = 'export.csv') =>
  new File([typeof contenu === 'string' ? contenu : new Uint8Array(contenu)], nom, { type: 'text/csv' })

async function afficher() {
  const user = userEvent.setup()
  render(<EcranClubs onRetour={vi.fn()} />)
  await screen.findByRole('heading', { name: 'Clubs et licenciés' })
  return user
}

describe('Import LigueAsso', () => {
  it("prévisualise puis importe l'export, et le club apparaît", async () => {
    const user = await afficher()
    await user.upload(screen.getByLabelText('Importer un export LigueAsso'), fichier(EXPORT))
    const apercu = within(await screen.findByRole('dialog', { name: 'Import LigueAsso' }))
    expect(apercu.getByText('SAINT DELPHIN BASKET (nouveau club) : 22 nouveaux, 0 mis à jour, 0 inchangé')).toBeInTheDocument()
    await user.click(apercu.getByRole('button', { name: 'Importer' }))
    const fin = within(await screen.findByRole('dialog', { name: 'Import terminé' }))
    await user.click(fin.getByRole('button', { name: 'OK' }))
    expect(await screen.findByRole('button', { name: /SAINT DELPHIN BASKET.*22 licenciés/ })).toBeInTheDocument()
  })

  it('un réimport ne crée aucun doublon', async () => {
    const user = await afficher()
    await user.upload(screen.getByLabelText('Importer un export LigueAsso'), fichier(EXPORT))
    await user.click(within(await screen.findByRole('dialog', { name: 'Import LigueAsso' })).getByRole('button', { name: 'Importer' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Import terminé' })).getByRole('button', { name: 'OK' }))

    await user.upload(screen.getByLabelText('Importer un export LigueAsso'), fichier(EXPORT))
    const apercu = within(await screen.findByRole('dialog', { name: 'Import LigueAsso' }))
    expect(apercu.getByText('SAINT DELPHIN BASKET : 0 nouveau, 0 mis à jour, 22 inchangés')).toBeInTheDocument()
  })

  it('annuler ne crée rien', async () => {
    const user = await afficher()
    await user.upload(screen.getByLabelText('Importer un export LigueAsso'), fichier(EXPORT))
    await user.click(within(await screen.findByRole('dialog', { name: 'Import LigueAsso' })).getByRole('button', { name: 'Annuler' }))
    expect(screen.getByText(/Aucun club pour l'instant/)).toBeInTheDocument()
  })

  it('explique pourquoi un fichier est refusé', async () => {
    const user = await afficher()
    await user.upload(screen.getByLabelText('Importer un export LigueAsso'), fichier('Nom;Prénom\nMartin;Hugo\n'))
    const dialogue = within(await screen.findByRole('dialog', { name: 'Import impossible' }))
    expect(dialogue.getByRole('alert')).toHaveTextContent('colonnes absentes')
    await user.click(dialogue.getByRole('button', { name: 'OK' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('liste deux associations de même nom sans clé React en double', async () => {
    const erreurs = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = await afficher()
    const csv = [
      'N° Association;Nom association;Type licence;N° Adherent;Civilite;Nom;Prénom',
      '033550002;MEME NOM;Loisirs;033_1;M;Martin;Hugo',
      '033550003;MEME NOM;Loisirs;033_2;Mme;Durand;Léa',
    ].join('\n')
    await user.upload(screen.getByLabelText('Importer un export LigueAsso'), fichier(csv))
    const apercu = within(await screen.findByRole('dialog', { name: 'Import LigueAsso' }))
    expect(apercu.getAllByText(/MEME NOM \(nouveau club\)/)).toHaveLength(2)
    expect(erreurs).not.toHaveBeenCalled()
    erreurs.mockRestore()
  })

  it('signale les lignes sans licence ignorées', async () => {
    const user = await afficher()
    const texte = `${EXPORT.toString('latin1').trimEnd()}\n"=""Basket ball""";"=""033550002""";"=""SAINT DELPHIN BASKET""";Oui;"=""Loisirs""";"=""""";"=""M""";;;;;;;;;;;;\n`
    await user.upload(screen.getByLabelText('Importer un export LigueAsso'), fichier(Buffer.from(texte, 'latin1')))
    const apercu = within(await screen.findByRole('dialog', { name: 'Import LigueAsso' }))
    expect(apercu.getByText('1 ligne sans n° de licence ignorée.')).toBeInTheDocument()
  })
})

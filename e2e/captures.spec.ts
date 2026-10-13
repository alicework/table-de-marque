import { expect, test, type Page } from '@playwright/test'

// Captures de contrôle visuel, à la demande (jamais en CI) :
//   CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone
// Les images vont dans captures/<projet>/ (dossier ignoré par git).
test.skip(!process.env.CAPTURES, 'captures visuelles à la demande')
// Une cinquantaine d'actions avec la garde de 350 ms : bien plus que les 30 s par défaut.
test.setTimeout(240_000)

const NOM_LONG = 'AS SAINT-MÉDARD-EN-JALLES BASKET'

async function remplirEquipe(page: Page, legende: string, nom: string, joueurs: [string, string, 'M' | 'Mme'][]) {
  const groupe = page.getByRole('group', { name: legende })
  await groupe.getByLabel("Nom de l'équipe").fill(nom)
  for (const [index, [numero, nomJoueur, civilite]] of joueurs.entries()) {
    if (index > 0) await groupe.getByRole('button', { name: 'Ajouter un joueur' }).click()
    await groupe.getByLabel(`N° joueur ${index + 1}`).fill(numero)
    await groupe.getByLabel(`Nom joueur ${index + 1}`, { exact: true }).fill(nomJoueur)
    await groupe.getByLabel(`Civilité joueur ${index + 1}`).selectOption(civilite)
  }
}

async function attendreGarde(page: Page) {
  await page.waitForTimeout(350)
}

async function marquer(page: Page, equipe: string, bouton: string, numero: number) {
  await page.getByRole('group', { name: `Actions ${equipe}` }).getByRole('button', { name: bouton, exact: true }).click()
  await attendreGarde(page)
  await page.getByRole('button', { name: new RegExp(`^n°${numero},`) }).click()
  await attendreGarde(page)
}

test('captures des écrans principaux', async ({ page }, infos) => {
  const dossier = `captures/${infos.project.name}`
  // animations: 'disabled' termine les fondus d'entrée avant la capture.
  const capturer = (nom: string) =>
    page.screenshot({ path: `${dossier}/${nom}.png`, fullPage: true, animations: 'disabled' })

  await page.goto('/')
  await capturer('01-accueil-vide')

  await page.getByRole('button', { name: 'Nouveau match' }).click()
  await remplirEquipe(page, 'Équipe A', 'ST DELPHIN', [
    ['4', 'Martin', 'Mme'],
    ['7', 'Durand', 'M'],
    ['9', 'Petit', 'Mme'],
    ['11', 'Lopez', 'Mme'],
    ['13', 'Roux', 'M'],
  ])
  await remplirEquipe(page, 'Équipe B', NOM_LONG, [
    ['5', 'Bernard', 'Mme'],
    ['8', 'Moreau', 'M'],
    ['10', 'Simon', 'Mme'],
  ])
  await capturer('02-preparation')

  await page.getByRole('button', { name: 'Commencer le match' }).click()
  await expect(page.getByLabel('Score', { exact: true })).toHaveText('0 – 0')
  await capturer('03-saisie-vide')

  // 34 × 3 points : score à trois chiffres, et 4 fautes sur la n°4 (tuile en attention).
  for (let i = 0; i < 34; i++) await marquer(page, 'ST DELPHIN', '+3', 7)
  await marquer(page, NOM_LONG, '+2', 8)
  for (let i = 0; i < 4; i++) await marquer(page, 'ST DELPHIN', 'Faute', 4)
  for (let i = 0; i < 9; i++) await marquer(page, NOM_LONG, 'Faute', [5, 8, 10][i % 3])
  await page.getByRole('group', { name: `Actions ${NOM_LONG}` }).getByRole('button', { name: 'Temps mort' }).click()
  await attendreGarde(page)
  await capturer('04-saisie-102-2-penalite')

  await page.getByRole('group', { name: 'Actions ST DELPHIN' }).getByRole('button', { name: '+2', exact: true }).click()
  await attendreGarde(page)
  await capturer('05-choix-joueur')
  await page.getByRole('button', { name: /Annuler$/ }).click()
  await attendreGarde(page)

  await page.getByRole('button', { name: 'Journal' }).click()
  await attendreGarde(page)
  await capturer('06-journal')
  await page.getByRole('button', { name: 'Retour au match' }).click()
  await attendreGarde(page)

  await page.getByRole('button', { name: 'Fin de période' }).click()
  await attendreGarde(page)
  await capturer('07-dialogue-fin-periode')
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await attendreGarde(page)

  await page.getByRole('button', { name: 'Accueil' }).click()
  await capturer('08-accueil-match-en-cours')

  await page.getByRole('button', { name: 'Clubs et licenciés' }).click()
  await capturer('09-clubs')
})

test('captures des clubs, de la fiche et des dialogues', async ({ page }, infos) => {
  const dossier = `captures/${infos.project.name}`
  const capturer = (nom: string) =>
    page.screenshot({ path: `${dossier}/${nom}.png`, fullPage: true, animations: 'disabled' })

  await page.goto('/')
  await page.getByRole('button', { name: 'Clubs et licenciés' }).click()
  await page.getByLabel('Importer un export Webaffiligue').setInputFiles('Sortie_simple_Ufolep.csv')
  await expect(page.getByRole('dialog', { name: 'Import Webaffiligue' })).toBeVisible()
  await capturer('10-import-apercu')
  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.getByRole('button', { name: 'OK' }).click()
  await capturer('11-clubs-liste')

  await page.getByRole('button', { name: /SAINT DELPHIN BASKET/ }).click()
  await expect(page.getByRole('heading', { name: 'SAINT DELPHIN BASKET' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Licenciés' })).toBeVisible()
  await capturer('12-fiche-club')
  await page.getByRole('button', { name: 'Ajouter un licencié' }).click()
  await capturer('13-dialogue-licencie')
  await page.getByRole('button', { name: 'Annuler' }).click()
  await page.getByRole('button', { name: 'Retour' }).click()
  await page.getByRole('button', { name: 'Retour' }).click()

  await page.getByRole('button', { name: 'Partager une équipe' }).click()
  const equipe = page.getByRole('group', { name: 'Équipe à partager' })
  await equipe.getByRole('combobox', { name: 'Club', exact: true }).selectOption({ label: 'SAINT DELPHIN BASKET' })
  await equipe.getByRole('button', { name: 'Choisir les joueurs du club' }).click()
  await capturer('14-dialogue-selection')
  const selection = page.getByRole('dialog', { name: 'Choisir les joueurs' })
  const cases = selection.getByRole('checkbox')
  for (let i = 0; i < 5; i++) await cases.nth(i).check()
  await selection.getByRole('button', { name: 'Valider' }).click()
  await capturer('15-partage-equipe')
  await equipe.getByRole('button', { name: 'Partager cette équipe' }).click()
  await expect(page.getByRole('img', { name: "QR code de l'équipe" })).toBeVisible()
  await capturer('16-dialogue-qr')
})

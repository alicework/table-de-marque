import { devices, expect, test, type Page } from '@playwright/test'

// Captures de présentation (équipes fictives, score réaliste), à la demande :
//   CAPTURES=1 npx playwright test e2e/presentation.spec.ts --project=telephone
// Les images vont dans captures/presentation-<projet>/ (dossier ignoré par git).
// PAYSAGE=1 avec --project=tablette : tablette à l'horizontale, dans captures/presentation-tablette-paysage/.
test.skip(!process.env.CAPTURES, 'captures de présentation à la demande')
if (process.env.PAYSAGE) test.use({ ...devices['Galaxy Tab S4 landscape'] })
test.setTimeout(240_000)

const DOMICILE = 'LES PINS BASKET'
const VISITEUR = 'ENTENTE DES VIGNES'

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

async function action(page: Page, equipe: string, bouton: string, numero: number) {
  await page.getByRole('group', { name: `Actions ${equipe}` }).getByRole('button', { name: bouton, exact: true }).click()
  await attendreGarde(page)
  await page.getByRole('button', { name: new RegExp(`^n°${numero},`) }).click()
  await attendreGarde(page)
}

test('captures de présentation', async ({ page }, infos) => {
  const dossier = `captures/presentation-${infos.project.name}${process.env.PAYSAGE ? '-paysage' : ''}`
  const capturer = (nom: string, pleinePage = false) =>
    page.screenshot({ path: `${dossier}/${nom}.png`, fullPage: pleinePage, animations: 'disabled' })

  await page.goto('./')
  await page.getByRole('button', { name: 'Nouveau match' }).click()
  await remplirEquipe(page, 'Équipe A', DOMICILE, [
    ['4', 'Lefebvre', 'M'],
    ['6', 'Garcia', 'M'],
    ['7', 'Fournier', 'M'],
    ['9', 'Mercier', 'M'],
    ['10', 'Blanc', 'M'],
    ['12', 'Chevalier', 'M'],
    ['14', 'Robin', 'M'],
  ])
  await remplirEquipe(page, 'Équipe B', VISITEUR, [
    ['5', 'Gauthier', 'M'],
    ['8', 'Perrin', 'M'],
    ['11', 'Morel', 'M'],
    ['13', 'Girard', 'M'],
    ['15', 'André', 'M'],
    ['21', 'Lambert', 'M'],
  ])
  await page.getByRole('button', { name: 'Commencer le match' }).click()

  // 1re mi-temps : 20 – 17.
  const premiere: [string, string, number][] = [
    [DOMICILE, '+2', 7], [VISITEUR, '+2', 11], [DOMICILE, '+3', 4], [VISITEUR, '+2', 8],
    [DOMICILE, 'Faute', 9], [VISITEUR, '+1', 8], [DOMICILE, '+2', 10], [VISITEUR, '+3', 13],
    [DOMICILE, '+2', 7], [VISITEUR, 'Faute', 5], [DOMICILE, '+1', 6], [DOMICILE, '+1', 6],
    [VISITEUR, '+2', 11], [DOMICILE, '+3', 12], [VISITEUR, '+2', 15], [DOMICILE, '+2', 9],
    [VISITEUR, 'Faute', 11], [DOMICILE, '+2', 7], [VISITEUR, '+3', 21], [DOMICILE, '+2', 14],
    [VISITEUR, '+2', 8], [DOMICILE, 'Faute', 7],
  ]
  for (const [equipe, bouton, numero] of premiere) await action(page, equipe, bouton, numero)
  await expect(page.getByLabel('Score', { exact: true })).toHaveText('20 – 17')

  await page.getByRole('button', { name: 'Fin de période' }).click()
  await attendreGarde(page)
  await page.getByRole('button', { name: 'Passer à la 2ème mi-temps' }).click()
  await attendreGarde(page)
  await page.getByRole('dialog', { name: 'Mi-temps' }).getByRole('button', { name: 'Fermer' }).click()
  await attendreGarde(page)

  // 2e mi-temps : 32 – 30.
  const seconde: [string, string, number][] = [
    [VISITEUR, '+2', 13], [DOMICILE, '+2', 10], [VISITEUR, '+3', 8], [DOMICILE, 'Faute', 4],
    [VISITEUR, '+1', 11], [DOMICILE, '+3', 7], [VISITEUR, '+2', 5], [DOMICILE, '+2', 12],
    [VISITEUR, 'Faute', 13], [DOMICILE, '+1', 9], [VISITEUR, '+2', 11], [DOMICILE, '+2', 7],
    [VISITEUR, 'Faute', 8], [DOMICILE, '+2', 6], [VISITEUR, '+3', 21], [VISITEUR, 'Faute', 21],
  ]
  for (const [equipe, bouton, numero] of seconde) await action(page, equipe, bouton, numero)
  await expect(page.getByLabel('Score', { exact: true })).toHaveText('32 – 30')

  await page.getByRole('button', { name: `Possession ${DOMICILE}` }).click()
  await attendreGarde(page)
  await capturer('02-match')
  await capturer('02-match-pleine-page', true)

  await page.getByRole('group', { name: `Actions ${DOMICILE}` }).getByRole('button', { name: '+2', exact: true }).click()
  await attendreGarde(page)
  await capturer('03-choix-marqueur')
  await page.getByRole('button', { name: /Annuler$/ }).click()
  await attendreGarde(page)

  await page.getByRole('group', { name: `Actions ${VISITEUR}` }).getByRole('button', { name: 'Temps mort' }).click()
  await attendreGarde(page)
  await capturer('04-temps-mort')
  await page.getByRole('button', { name: 'Fermer' }).click()
  await attendreGarde(page)

  await page.getByRole('button', { name: 'Accueil' }).click()
  await capturer('01-accueil')
})

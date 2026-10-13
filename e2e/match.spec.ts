import { expect, test, type Page } from '@playwright/test'

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

// Garde anti-double-tap de l'écran de match : tout tap accepté rend l'écran sourd pendant 300 ms.
async function attendreGarde(page: Page) {
  await page.waitForTimeout(350)
}

async function marquer(page: Page, equipe: string, bouton: string, numero: number) {
  await page.getByRole('group', { name: `Actions ${equipe}` }).getByRole('button', { name: bouton, exact: true }).click()
  await attendreGarde(page)
  await page.getByRole('button', { name: new RegExp(`^n°${numero},`) }).click()
  await attendreGarde(page)
}

test('un match se saisit, se corrige, survit à un rechargement et se termine', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Nouveau match' }).click()
  await remplirEquipe(page, 'Équipe A', 'ST DELPHIN', [
    ['4', 'Martin', 'Mme'],
    ['7', 'Durand', 'M'],
    ['9', 'Petit', 'Mme'],
  ])
  await remplirEquipe(page, 'Équipe B', 'GRADIGNAN', [
    ['5', 'Bernard', 'Mme'],
    ['8', 'Moreau', 'M'],
    ['10', 'Simon', 'Mme'],
  ])
  await page.getByRole('button', { name: 'Commencer le match' }).click()

  const score = page.getByLabel('Score', { exact: true })
  await marquer(page, 'ST DELPHIN', '+2', 7)
  await expect(score).toHaveText('2 – 0')
  await marquer(page, 'GRADIGNAN', '+3', 8)
  await expect(score).toHaveText('2 – 3')
  await page.getByRole('button', { name: 'Annuler la dernière action' }).click()
  await expect(score).toHaveText('2 – 0')
  await attendreGarde(page)
  await marquer(page, 'GRADIGNAN', '+2', 5)
  await expect(score).toHaveText('2 – 2')

  await page.reload()
  await expect(score).toHaveText('2 – 2')

  await page.getByRole('button', { name: 'Fin de période' }).click()
  await attendreGarde(page)
  await page.getByRole('button', { name: 'Passer à la 2ème mi-temps' }).click()
  await expect(page.getByText('2ème mi-temps', { exact: true })).toBeVisible()
  await attendreGarde(page)
  await marquer(page, 'ST DELPHIN', '+1', 4)
  await page.getByRole('button', { name: 'Fin de période' }).click()
  await attendreGarde(page)
  await page.getByRole('button', { name: 'Terminer le match' }).click()
  await expect(page.getByRole('heading', { name: 'Match terminé' })).toBeVisible()
  await expect(page.getByLabel('Score final')).toContainText('3 – 2')
})

test('fonctionne hors ligne après le premier chargement', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'ordinateur', 'un seul format suffit pour le service worker')
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Nouveau match' })).toBeVisible()
})

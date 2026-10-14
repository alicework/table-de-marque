import { expect, test } from '@playwright/test'
import { encoderEquipe } from '../src/roster-share/format'

const ENTETE =
  '"=""N° Association""";"=""Nom association""";"=""Type licence""";"=""N° Adherent""";"=""Civilite""";"=""Nom""";"=""Prénom"""'
const ligne = (licence: string, civilite: string, nom: string, prenom: string) =>
  `"=""033550002""";"=""SAINT DELPHIN BASKET""";"=""Loisirs""";"=""${licence}""";"=""${civilite}""";"=""${nom}""";"=""${prenom}"""`
const EXPORT = Buffer.from(
  [
    ENTETE,
    ligne('033_1', 'Mme', 'Martin', 'Chloé'),
    ligne('033_2', 'Mme', 'Durand', 'Léa'),
    ligne('033_3', 'M', 'Petit', 'Hugo'),
  ].join('\r\n'),
  'latin1',
)

const CODE_GRADIGNAN = encoderEquipe({
  nom: 'GRADIGNAN',
  couleur: 'Noir',
  joueurs: [
    { licence: '033_5', nom: 'Bernard', prenom: 'Jade', civilite: 'Mme', numero: 5 },
    { licence: '033_8', nom: 'Moreau', prenom: 'Sam', civilite: 'Mme', numero: 8 },
  ],
  coach: null,
})

test('import Webaffiligue, équipe A depuis le pool, équipe B par code, puis match', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: 'Clubs et licenciés' }).click()
  await page.getByLabel('Importer un export Webaffiligue').setInputFiles({
    name: 'export.csv',
    mimeType: 'text/csv',
    buffer: EXPORT,
  })
  await expect(page.getByText('SAINT DELPHIN BASKET (nouveau club) : 3 nouveaux, 0 mis à jour, 0 inchangé')).toBeVisible()
  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.getByRole('button', { name: 'OK' }).click()
  await expect(page.getByRole('button', { name: /SAINT DELPHIN BASKET.*3 licenciés/ })).toBeVisible()
  await page.getByRole('button', { name: 'Retour' }).click()

  await page.getByRole('button', { name: 'Nouveau match' }).click()
  const equipeA = page.getByRole('group', { name: 'Équipe A' })
  await equipeA.getByRole('combobox', { name: 'Club', exact: true }).selectOption({ label: 'SAINT DELPHIN BASKET' })
  await equipeA.getByRole('button', { name: 'Choisir les joueurs du club' }).click()
  const selection = page.getByRole('dialog', { name: 'Choisir les joueurs' })
  await selection.getByRole('checkbox', { name: /Chloé Martin/ }).check()
  await selection.getByRole('checkbox', { name: /Léa Durand/ }).check()
  await selection.getByRole('button', { name: 'Valider' }).click()
  await equipeA.getByLabel('N° joueur 1', { exact: true }).fill('4')
  await equipeA.getByLabel('N° joueur 2', { exact: true }).fill('7')

  const equipeB = page.getByRole('group', { name: 'Équipe B' })
  await equipeB.getByRole('button', { name: 'Importer une équipe (QR / code)' }).click()
  await page.getByLabel('Coller le lien ou le code').fill(CODE_GRADIGNAN)
  await page.getByRole('button', { name: 'Lire le code' }).click()
  await page.getByRole('button', { name: 'Utiliser cette équipe' }).click()
  await expect(equipeB.getByLabel("Nom de l'équipe")).toHaveValue('GRADIGNAN')

  await page.getByRole('button', { name: 'Commencer le match' }).click()
  await expect(page.getByLabel('Score', { exact: true })).toHaveText('0 – 0')
  await expect(page.getByRole('group', { name: 'Actions SAINT DELPHIN BASKET' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Actions GRADIGNAN' })).toBeVisible()
})

test("un lien d'équipe ouvre l'écran Équipe reçue et prépare le match", async ({ page }) => {
  await page.goto(`./#equipe=${CODE_GRADIGNAN}`)
  await expect(page.getByRole('heading', { name: 'Équipe reçue' })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('button', { name: 'Nouveau match : en équipe B' }).click()
  await expect(page.getByRole('group', { name: 'Équipe B' }).getByLabel("Nom de l'équipe")).toHaveValue('GRADIGNAN')
})

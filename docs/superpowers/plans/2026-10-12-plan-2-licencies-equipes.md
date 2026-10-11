# Plan 2 — Licenciés et équipes : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chaque club gère son pool de licenciés (import de l'export Webaffiligue ou saisie), compose l'équipe d'un match en choisissant dans ce pool, et partage une équipe d'un appareil à l'autre par QR code, lien, code ou fichier.

**Architecture:** Deux nouvelles tables Dexie (`clubs`, `licencies`, schéma v2) et un domaine pur pour la fusion des licenciés. Un module `webaffiligue/` lit l'export CSV (ISO-8859-1, `;`, valeurs `="…"`). Un module `roster-share/` encode une équipe de match en JSON compact compressé (fflate) puis base64url, placé dans le fragment `#equipe=` d'un lien, lui-même affiché en QR (qrcode). La lecture caméra passe par @zxing/browser. L'écran de préparation existant (brouillon d'équipe) devient le point de convergence : saisie libre, sélection dans un pool, import d'une équipe reçue.

**Tech Stack:** existant (TypeScript ~6.0, React 19, Vite 8, Dexie 4, Vitest 5, Playwright) + qrcode 1.5, fflate 0.8, @zxing/browser 0.2.

**Spec:** `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md` (§6 Licenciés et équipes, §7 écrans 1-3, §11 erreurs, §12 tests).

**Point de départ :** branche `dev` (plan 1 fusionné, 101 tests unitaires, E2E vert). Travailler sur une branche `feat/licencies-equipes` créée depuis `dev`.

## Global Constraints

- Node `^22.22.2 || ^24.15.0 || >=26` (champ `engines` de package.json). Sous Node 22.14, npm affiche EBADENGINE : connu et accepté.
- Nouvelles dépendances, versions exactes : qrcode `^1.5.4`, @types/qrcode `^1.5.6` (dev), fflate `^0.8.3`, @zxing/browser `^0.2.1`, @zxing/library `^0.23.0`. Aucune autre dépendance.
- Interface **en français uniquement**. Identifiants du code en français.
- **Aucun serveur, aucun appel réseau à l'exécution.** Une équipe ne quitte l'appareil que par une action explicite (QR affiché, lien/code copié, fichier partagé).
- Les seuils réglementaires (14 joueurs, n° 0 à 99, 2 joueuses…) n'existent **que** dans `src/domain/config.ts` (`REGLES`).
- Le domaine (`src/domain/`) n'importe ni React, ni Dexie, ni rien de `src/ui/`, `src/storage/`, `src/webaffiligue/`, `src/roster-share/`. `src/webaffiligue/` et `src/roster-share/` n'importent que `src/domain/` et leurs bibliothèques.
- Style : guillemets simples, **pas de points-virgules**, indentation 2 espaces, jamais `if (a) b() else c()` sur une seule ligne. Chaînes contenant une apostrophe : guillemets doubles.
- Le schéma Dexie est versionné : ne jamais modifier une version publiée (`version(1)`), en ajouter une.
- Format de partage versionné : champ `v` ; un code d'une version supérieure donne le message « mettez à jour », jamais une équipe corrompue.
- Garde anti-double-tap : `src/ui/commun/gardeDoubleTap.ts` ne concerne que l'écran de match ; ne pas l'utiliser ailleurs.
- Commits autorisés : Conventional Commits en français, titre en forme nominale, `git add` par chemins explicites (jamais `-A` / `.`), aucun trailer `Co-authored-by`, aucun lien de session.

## Review Focus

1. **Réimport d'un export aux noms vides** (comme l'export anonymisé, ou un export partiel) : les noms et prénoms déjà connus ne doivent pas être effacés. → test dans la Task 1.
2. **Fichier Webaffiligue ré-enregistré par Excel** (UTF-8 avec BOM, séparateur virgule, champ contenant un `;` entre guillemets) : lu correctement, pas de « Ã© ». → tests dans la Task 3.
3. **Code collé de travers** (espaces, retours à la ligne, lien complet ou code seul, code tronqué, texte quelconque) : lecture tolérante ou message clair « Code non reconnu », jamais d'équipe partielle. → tests dans la Task 7.
4. **Lien d'équipe ouvert pendant un match en cours** : l'écran « Équipe reçue » s'affiche, et le match en cours reste repris ensuite depuis l'accueil. → test dans la Task 10.
5. **Décocher un joueur du pool après lui avoir donné un n° ou l'avoir désigné coach** : la ligne disparaît, le coach redevient « aucun », les autres n° saisis sont conservés, aucune erreur incompréhensible. → tests dans la Task 6.

---

## Structure des fichiers

```
tsconfig.json                       + référence tsconfig.test.json
tsconfig.app.json                   exclut les tests
tsconfig.test.json                  (nouveau) tests avec types Node (lecture de fichiers)
src/domain/club.ts                  Club, Licencie, LicencieLu, ImportClub, fusion, tri, libellé
src/storage/db.ts                   declarerSchema (v1 + v2 : clubs, licencies)
src/storage/clubs.ts                dépôt clubs / licenciés, aperçu et application d'un import
src/webaffiligue/lireExport.ts      lecture de l'export CSV Webaffiligue
src/roster-share/format.ts          encodage / décodage d'une équipe partagée, lien, extraction de code
src/roster-share/qr.ts              QR en SVG, version de QR
src/ui/commun/fichiers.ts           lecture d'un fichier (octets / texte) via FileReader
src/ui/clubs/EcranClubs.tsx         liste des clubs, création, import Webaffiligue
src/ui/clubs/FicheClub.tsx          un club : licenciés, ajout / modification / suppression
src/ui/clubs/DialogueClub.tsx       création / modification d'un club
src/ui/clubs/DialogueLicencie.tsx   création / modification d'un licencié
src/ui/clubs/ImportWebaffiligue.tsx bouton fichier + aperçu + import
src/ui/preparation/brouillon.ts     + clubId, licencieId, sélection, conversions partage
src/ui/preparation/DialogueSelection.tsx  choix des joueurs dans le pool
src/ui/preparation/EditeurEquipe.tsx      + club, sélection, partage, import
src/ui/preparation/PreparationMatch.tsx   + équipes initiales
src/ui/partage/adresse.ts           adresse de l'app (base des liens)
src/ui/partage/DialoguePartage.tsx  QR + copier lien / code + partage natif
src/ui/partage/EcranPartage.tsx     « Partager une équipe » depuis l'accueil
src/ui/import/scanner.ts            adaptateur caméra (@zxing/browser)
src/ui/import/ScannerQr.tsx         aperçu caméra
src/ui/import/ApercuEquipe.tsx      résumé d'une équipe reçue
src/ui/import/ImportEquipe.tsx      dialogue : scanner / coller / fichier → aperçu
src/ui/import/lienEquipe.ts         lecture et effacement de #equipe= au démarrage
src/ui/import/EcranEquipeRecue.tsx  « Équipe reçue » → nouveau match en équipe A ou B
src/App.tsx, src/main.tsx, src/ui/Accueil.tsx   navigation
src/test/fixturesClubs.ts           club et licenciés de test
e2e/licencies-equipes.spec.ts       parcours import → pool → partage → match
```

---

### Task 1 : Domaine — clubs, licenciés et fusion d'un import

**Files:**
- Create: `src/domain/club.ts`
- Test: `src/domain/club.test.ts`

**Interfaces:**
- Consumes : `nouvelId` (`src/domain/match.ts`), `Civilite` (`src/domain/types.ts`).
- Produces :
  - `interface Club { id: string; numeroAssociation: string | null; nom: string; couleurParDefaut: string }`
  - `interface Licencie { id: string; clubId: string; licence: string; civilite: Civilite; nom: string; prenom: string; typeLicence: string }`
  - `type LicencieLu = Omit<Licencie, 'id' | 'clubId'>`
  - `interface ImportClub { numeroAssociation: string; nom: string; licencies: LicencieLu[] }`
  - `interface BilanFusion { aAjouter: Licencie[]; aMettreAJour: Licencie[]; inchanges: number }`
  - `fusionnerLicencies(clubId: string, existants: Licencie[], lus: LicencieLu[]): BilanFusion`
  - `trierLicencies(licencies: Licencie[]): Licencie[]` (nom, prénom, licence, ordre français, sans muter l'entrée)
  - `libelleLicencie(licencie: Pick<Licencie, 'nom' | 'prenom' | 'licence'>): string` (« Prénom Nom », sinon la licence)

- [ ] **Step 1 : Créer la branche de travail**

```bash
git checkout dev
git checkout -b feat/licencies-equipes
```

- [ ] **Step 2 : Écrire les tests (ils doivent échouer)**

`src/domain/club.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { fusionnerLicencies, libelleLicencie, trierLicencies, type Licencie, type LicencieLu } from './club'

const existant = (licence: string, nom: string, prenom: string): Licencie => ({
  id: `id-${licence}`,
  clubId: 'c1',
  licence,
  nom,
  prenom,
  civilite: 'Mme',
  typeLicence: 'Competition',
})
const lu = (licence: string, nom: string, prenom: string, civilite: LicencieLu['civilite'] = 'Mme'): LicencieLu => ({
  licence,
  nom,
  prenom,
  civilite,
  typeLicence: 'Competition',
})

describe('fusionnerLicencies', () => {
  it('ajoute les licences inconnues au club', () => {
    const bilan = fusionnerLicencies('c1', [], [lu('033_1', 'Martin', 'Chloé')])
    expect(bilan.aAjouter).toHaveLength(1)
    expect(bilan.aAjouter[0]).toMatchObject({ clubId: 'c1', licence: '033_1', nom: 'Martin', prenom: 'Chloé' })
    expect(bilan.aAjouter[0].id).toBeTruthy()
    expect(bilan.aMettreAJour).toEqual([])
    expect(bilan.inchanges).toBe(0)
  })

  it('met à jour un licencié connu en gardant son id', () => {
    const bilan = fusionnerLicencies('c1', [existant('033_1', 'Martin', 'Chloé')], [lu('033_1', 'Martin-Roux', 'Chloé')])
    expect(bilan.aAjouter).toEqual([])
    expect(bilan.aMettreAJour).toEqual([{ ...existant('033_1', 'Martin', 'Chloé'), nom: 'Martin-Roux' }])
  })

  it('compte les licenciés inchangés', () => {
    const bilan = fusionnerLicencies('c1', [existant('033_1', 'Martin', 'Chloé')], [lu('033_1', 'Martin', 'Chloé')])
    expect(bilan).toEqual({ aAjouter: [], aMettreAJour: [], inchanges: 1 })
  })

  it("n'efface jamais un nom ou un prénom connu avec une valeur vide", () => {
    const bilan = fusionnerLicencies('c1', [existant('033_1', 'Martin', 'Chloé')], [lu('033_1', '', '', null)])
    expect(bilan).toEqual({ aAjouter: [], aMettreAJour: [], inchanges: 1 })
  })

  it('ignore les doublons de licence dans le fichier (première occurrence)', () => {
    const bilan = fusionnerLicencies('c1', [], [lu('033_1', 'Martin', 'Chloé'), lu('033_1', 'Autre', 'Nom')])
    expect(bilan.aAjouter.map((l) => l.nom)).toEqual(['Martin'])
  })
})

describe('trierLicencies et libelleLicencie', () => {
  it('trie par nom puis prénom, accents compris, sans modifier la liste reçue', () => {
    const liste = [existant('3', 'Émond', 'Zoé'), existant('1', 'Durand', 'Léa'), existant('2', 'Durand', 'Anaïs')]
    expect(trierLicencies(liste).map((l) => l.prenom)).toEqual(['Anaïs', 'Léa', 'Zoé'])
    expect(liste[0].nom).toBe('Émond')
  })

  it('affiche « Prénom Nom », ou la licence quand le nom est inconnu', () => {
    expect(libelleLicencie({ nom: 'Martin', prenom: 'Chloé', licence: '033_1' })).toBe('Chloé Martin')
    expect(libelleLicencie({ nom: '', prenom: '', licence: '033_1' })).toBe('033_1')
  })
})
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/domain/club.test.ts`
Expected : FAIL (« Failed to resolve import "./club" »).

- [ ] **Step 4 : Implémenter**

`src/domain/club.ts` :

```ts
import { nouvelId } from './match'
import type { Civilite } from './types'

export interface Club {
  id: string
  /** Identifiant Webaffiligue, sert à retrouver le club lors d'un réimport. */
  numeroAssociation: string | null
  nom: string
  couleurParDefaut: string
}

export interface Licencie {
  id: string
  clubId: string
  /** Vide pour un essai ou une licence en cours. */
  licence: string
  civilite: Civilite
  nom: string
  prenom: string
  typeLicence: string
}

/** Licencié tel que lu dans un export, avant rattachement à un club. */
export type LicencieLu = Omit<Licencie, 'id' | 'clubId'>

export interface ImportClub {
  numeroAssociation: string
  nom: string
  licencies: LicencieLu[]
}

export interface BilanFusion {
  aAjouter: Licencie[]
  aMettreAJour: Licencie[]
  inchanges: number
}

function identiques(a: Licencie, b: Licencie): boolean {
  return a.nom === b.nom && a.prenom === b.prenom && a.civilite === b.civilite && a.typeLicence === b.typeLicence
}

export function fusionnerLicencies(clubId: string, existants: Licencie[], lus: LicencieLu[]): BilanFusion {
  const parLicence = new Map(existants.map((licencie) => [licencie.licence, licencie]))
  const vus = new Set<string>()
  const aAjouter: Licencie[] = []
  const aMettreAJour: Licencie[] = []
  let inchanges = 0

  for (const lu of lus) {
    if (vus.has(lu.licence)) continue
    vus.add(lu.licence)
    const connu = parLicence.get(lu.licence)
    if (!connu) {
      aAjouter.push({ ...lu, id: nouvelId(), clubId })
      continue
    }
    // Un export partiel ou anonymisé ne doit pas effacer ce qu'on sait déjà.
    const fusionne: Licencie = {
      ...connu,
      nom: lu.nom || connu.nom,
      prenom: lu.prenom || connu.prenom,
      civilite: lu.civilite ?? connu.civilite,
      typeLicence: lu.typeLicence || connu.typeLicence,
    }
    if (identiques(connu, fusionne)) {
      inchanges++
    } else {
      aMettreAJour.push(fusionne)
    }
  }

  return { aAjouter, aMettreAJour, inchanges }
}

export function trierLicencies(licencies: Licencie[]): Licencie[] {
  return [...licencies].sort(
    (a, b) =>
      a.nom.localeCompare(b.nom, 'fr') || a.prenom.localeCompare(b.prenom, 'fr') || a.licence.localeCompare(b.licence),
  )
}

export function libelleLicencie(licencie: Pick<Licencie, 'nom' | 'prenom' | 'licence'>): string {
  return [licencie.prenom, licencie.nom].filter(Boolean).join(' ') || licencie.licence
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

Run : `npx vitest run src/domain/club.test.ts && npm run typecheck`
Expected : 7 tests PASS, aucune erreur de type.

- [ ] **Step 6 : Commit**

```bash
git add src/domain/club.ts src/domain/club.test.ts
git commit -m "feat(domaine): Ajout des clubs, des licenciés et de la fusion d'un import"
```

---

### Task 2 : Stockage — schéma v2, dépôt des clubs et des licenciés

**Files:**
- Modify: `src/storage/db.ts` (remplacé en entier)
- Create: `src/storage/clubs.ts`, `src/test/fixturesClubs.ts`
- Test: `src/storage/db.test.ts`, `src/storage/clubs.test.ts`

**Interfaces:**
- Consumes : `Club`, `Licencie`, `ImportClub`, `BilanFusion`, `fusionnerLicencies`, `trierLicencies` (Task 1) ; `nouvelId` ; `matchDeTest` (`src/test/fixtures.ts`).
- Produces :
  - `db.ts` : `type BaseTableDeMarque`, `declarerSchema(base: Dexie): void`, `db` (tables `matchs`, `clubs`, `licencies`).
  - `clubs.ts` :
    - `class ErreurLicenceEnDouble extends Error` (message « Ce n° de licence existe déjà dans ce club. »)
    - `listerClubs(): Promise<Club[]>` (triés par nom)
    - `listerClubsAvecEffectif(): Promise<{ club: Club; effectif: number }[]>`
    - `lireClub(id: string): Promise<Club | undefined>`
    - `enregistrerClub(club: Club): Promise<void>`
    - `supprimerClub(id: string): Promise<void>` (supprime aussi ses licenciés)
    - `listerLicencies(clubId: string): Promise<Licencie[]>` (triés)
    - `enregistrerLicencie(licencie: Licencie): Promise<void>` (lève `ErreurLicenceEnDouble` si une autre fiche du club a la même licence non vide)
    - `supprimerLicencie(id: string): Promise<void>`
    - `interface BilanImportClub { nom: string; nouveauClub: boolean; ajoutes: number; misAJour: number; inchanges: number }`
    - `previsualiserImport(clubsLus: ImportClub[]): Promise<BilanImportClub[]>` (n'écrit rien)
    - `appliquerImport(clubsLus: ImportClub[]): Promise<BilanImportClub[]>` (une transaction)
  - `test/fixturesClubs.ts` : `CLUB_TEST`, `LICENCIES_TEST` (Martin Chloé F, Durand Léa F, Petit Hugo H), `creerClubDeTest(): Promise<void>`.

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/storage/db.test.ts` :

```ts
import { Dexie } from 'dexie'
import { describe, expect, it } from 'vitest'
import { matchDeTest } from '../test/fixtures'
import { declarerSchema, type BaseTableDeMarque } from './db'

describe('schéma de la base', () => {
  it('conserve les matchs existants en passant au schéma 2', async () => {
    const nom = `migration-${Math.random()}`
    const ancienne = new Dexie(nom)
    ancienne.version(1).stores({ matchs: 'id, statut, modifieLe' })
    await ancienne.open()
    await ancienne.table('matchs').put(matchDeTest())
    ancienne.close()

    const nouvelle = new Dexie(nom) as BaseTableDeMarque
    declarerSchema(nouvelle)
    await nouvelle.open()
    expect(await nouvelle.matchs.count()).toBe(1)
    expect(await nouvelle.clubs.count()).toBe(0)
    expect(await nouvelle.licencies.count()).toBe(0)
    nouvelle.close()
    await Dexie.delete(nom)
  })
})
```

`src/test/fixturesClubs.ts` :

```ts
import type { Club, Licencie } from '../domain/club'
import { enregistrerClub, enregistrerLicencie } from '../storage/clubs'

export const CLUB_TEST: Club = {
  id: 'club-sd',
  numeroAssociation: '033550002',
  nom: 'SAINT DELPHIN BASKET',
  couleurParDefaut: 'Vert',
}

export const LICENCIES_TEST: Licencie[] = [
  {
    id: 'lic-martin',
    clubId: 'club-sd',
    licence: '033_00000101',
    nom: 'Martin',
    prenom: 'Chloé',
    civilite: 'Mme',
    typeLicence: 'Competition',
  },
  {
    id: 'lic-durand',
    clubId: 'club-sd',
    licence: '033_00000102',
    nom: 'Durand',
    prenom: 'Léa',
    civilite: 'Mme',
    typeLicence: 'Loisirs',
  },
  {
    id: 'lic-petit',
    clubId: 'club-sd',
    licence: '033_00000103',
    nom: 'Petit',
    prenom: 'Hugo',
    civilite: 'M',
    typeLicence: 'Competition',
  },
]

export async function creerClubDeTest(): Promise<void> {
  await enregistrerClub(CLUB_TEST)
  for (const licencie of LICENCIES_TEST) await enregistrerLicencie(licencie)
}
```

`src/storage/clubs.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import type { ImportClub } from '../domain/club'
import { CLUB_TEST, creerClubDeTest, LICENCIES_TEST } from '../test/fixturesClubs'
import {
  appliquerImport,
  enregistrerClub,
  enregistrerLicencie,
  ErreurLicenceEnDouble,
  listerClubs,
  listerClubsAvecEffectif,
  listerLicencies,
  previsualiserImport,
  supprimerClub,
} from './clubs'
import { db } from './db'

const IMPORT: ImportClub[] = [
  {
    numeroAssociation: '033550002',
    nom: 'SAINT DELPHIN BASKET',
    licencies: [
      { licence: '033_00000101', nom: 'Martin', prenom: 'Chloé', civilite: 'Mme', typeLicence: 'Competition' },
      { licence: '033_1', nom: 'Roux', prenom: 'Inès', civilite: 'Mme', typeLicence: 'Loisirs' },
    ],
  },
]

describe('clubs et licenciés', () => {
  it('liste les clubs par nom avec leur effectif', async () => {
    await creerClubDeTest()
    await enregistrerClub({ id: 'club-a', numeroAssociation: null, nom: 'AUDENGE', couleurParDefaut: '' })
    expect((await listerClubs()).map((c) => c.nom)).toEqual(['AUDENGE', 'SAINT DELPHIN BASKET'])
    expect((await listerClubsAvecEffectif()).map((e) => e.effectif)).toEqual([0, 3])
  })

  it('liste les licenciés triés par nom', async () => {
    await creerClubDeTest()
    expect((await listerLicencies(CLUB_TEST.id)).map((l) => l.nom)).toEqual(['Durand', 'Martin', 'Petit'])
  })

  it('refuse un n° de licence déjà présent dans le club', async () => {
    await creerClubDeTest()
    const doublon = { ...LICENCIES_TEST[0], id: 'autre' }
    await expect(enregistrerLicencie(doublon)).rejects.toThrow(ErreurLicenceEnDouble)
    await expect(enregistrerLicencie(doublon)).rejects.toThrow('Ce n° de licence existe déjà dans ce club.')
  })

  it('accepte la même licence dans un autre club, une mise à jour, et plusieurs licences vides', async () => {
    await creerClubDeTest()
    await enregistrerLicencie({ ...LICENCIES_TEST[0], id: 'ailleurs', clubId: 'autre-club' })
    await enregistrerLicencie({ ...LICENCIES_TEST[0], nom: 'Martin-Roux' })
    await enregistrerLicencie({ ...LICENCIES_TEST[1], id: 'essai-1', licence: '' })
    await enregistrerLicencie({ ...LICENCIES_TEST[1], id: 'essai-2', licence: '' })
    expect(await listerLicencies(CLUB_TEST.id)).toHaveLength(5)
  })

  it('supprime un club avec ses licenciés', async () => {
    await creerClubDeTest()
    await supprimerClub(CLUB_TEST.id)
    expect(await db.clubs.count()).toBe(0)
    expect(await db.licencies.count()).toBe(0)
  })

  it("prévisualise un import sans rien écrire", async () => {
    expect(await previsualiserImport(IMPORT)).toEqual([
      { nom: 'SAINT DELPHIN BASKET', nouveauClub: true, ajoutes: 2, misAJour: 0, inchanges: 0 },
    ])
    expect(await db.clubs.count()).toBe(0)
  })

  it('applique un import : crée le club, puis un réimport ne crée aucun doublon', async () => {
    expect(await appliquerImport(IMPORT)).toEqual([
      { nom: 'SAINT DELPHIN BASKET', nouveauClub: true, ajoutes: 2, misAJour: 0, inchanges: 0 },
    ])
    expect(await appliquerImport(IMPORT)).toEqual([
      { nom: 'SAINT DELPHIN BASKET', nouveauClub: false, ajoutes: 0, misAJour: 0, inchanges: 2 },
    ])
    expect(await db.clubs.count()).toBe(1)
    expect(await db.licencies.count()).toBe(2)
  })

  it("rattache l'import au club existant par son n° d'association", async () => {
    await creerClubDeTest()
    const bilans = await appliquerImport(IMPORT)
    expect(bilans).toEqual([{ nom: 'SAINT DELPHIN BASKET', nouveauClub: false, ajoutes: 1, misAJour: 0, inchanges: 1 }])
    expect(await listerLicencies(CLUB_TEST.id)).toHaveLength(4)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/storage`
Expected : FAIL (`declarerSchema` non exporté, « Failed to resolve import "./clubs" »).

- [ ] **Step 3 : Déclarer le schéma v2**

Remplacer `src/storage/db.ts` par :

```ts
import { Dexie, type EntityTable } from 'dexie'
import type { Club, Licencie } from '../domain/club'
import type { Match } from '../domain/types'

export type BaseTableDeMarque = Dexie & {
  matchs: EntityTable<Match, 'id'>
  clubs: EntityTable<Club, 'id'>
  licencies: EntityTable<Licencie, 'id'>
}

/** Historique complet du schéma : ne jamais modifier une version publiée, en ajouter une. */
export function declarerSchema(base: Dexie): void {
  base.version(1).stores({
    matchs: 'id, statut, modifieLe',
  })
  base.version(2).stores({
    clubs: 'id, numeroAssociation',
    licencies: 'id, clubId, [clubId+licence]',
  })
}

export const db = new Dexie('table-de-marque') as BaseTableDeMarque
declarerSchema(db)
```

- [ ] **Step 4 : Implémenter le dépôt**

`src/storage/clubs.ts` :

```ts
import {
  fusionnerLicencies,
  trierLicencies,
  type BilanFusion,
  type Club,
  type ImportClub,
  type Licencie,
} from '../domain/club'
import { nouvelId } from '../domain/match'
import { db } from './db'

export class ErreurLicenceEnDouble extends Error {
  constructor() {
    super('Ce n° de licence existe déjà dans ce club.')
    this.name = 'ErreurLicenceEnDouble'
  }
}

const parNom = (a: Club, b: Club) => a.nom.localeCompare(b.nom, 'fr')

export async function listerClubs(): Promise<Club[]> {
  return (await db.clubs.toArray()).sort(parNom)
}

export async function listerClubsAvecEffectif(): Promise<{ club: Club; effectif: number }[]> {
  const clubs = await listerClubs()
  return Promise.all(
    clubs.map(async (club) => ({ club, effectif: await db.licencies.where('clubId').equals(club.id).count() })),
  )
}

export function lireClub(id: string): Promise<Club | undefined> {
  return db.clubs.get(id)
}

export async function enregistrerClub(club: Club): Promise<void> {
  await db.clubs.put(club)
}

export async function supprimerClub(id: string): Promise<void> {
  await db.transaction('rw', db.clubs, db.licencies, async () => {
    await db.licencies.where('clubId').equals(id).delete()
    await db.clubs.delete(id)
  })
}

export async function listerLicencies(clubId: string): Promise<Licencie[]> {
  return trierLicencies(await db.licencies.where('clubId').equals(clubId).toArray())
}

export async function enregistrerLicencie(licencie: Licencie): Promise<void> {
  await db.transaction('rw', db.licencies, async () => {
    if (licencie.licence) {
      const meme = await db.licencies.where('[clubId+licence]').equals([licencie.clubId, licencie.licence]).first()
      if (meme && meme.id !== licencie.id) throw new ErreurLicenceEnDouble()
    }
    await db.licencies.put(licencie)
  })
}

export async function supprimerLicencie(id: string): Promise<void> {
  await db.licencies.delete(id)
}

export interface BilanImportClub {
  nom: string
  nouveauClub: boolean
  ajoutes: number
  misAJour: number
  inchanges: number
}

interface PlanImport {
  club: Club
  nouveauClub: boolean
  fusion: BilanFusion
}

async function planifier(clubsLus: ImportClub[]): Promise<PlanImport[]> {
  const plans: PlanImport[] = []
  for (const lu of clubsLus) {
    const numero = lu.numeroAssociation || null
    const existant = numero ? await db.clubs.where('numeroAssociation').equals(numero).first() : undefined
    const club: Club = existant ?? {
      id: nouvelId(),
      numeroAssociation: numero,
      nom: lu.nom || 'Club sans nom',
      couleurParDefaut: '',
    }
    const licencies = existant ? await db.licencies.where('clubId').equals(club.id).toArray() : []
    plans.push({ club, nouveauClub: !existant, fusion: fusionnerLicencies(club.id, licencies, lu.licencies) })
  }
  return plans
}

const versBilan = ({ club, nouveauClub, fusion }: PlanImport): BilanImportClub => ({
  nom: club.nom,
  nouveauClub,
  ajoutes: fusion.aAjouter.length,
  misAJour: fusion.aMettreAJour.length,
  inchanges: fusion.inchanges,
})

export async function previsualiserImport(clubsLus: ImportClub[]): Promise<BilanImportClub[]> {
  return (await planifier(clubsLus)).map(versBilan)
}

export async function appliquerImport(clubsLus: ImportClub[]): Promise<BilanImportClub[]> {
  return db.transaction('rw', db.clubs, db.licencies, async () => {
    const plans = await planifier(clubsLus)
    for (const plan of plans) {
      if (plan.nouveauClub) await db.clubs.add(plan.club)
      await db.licencies.bulkAdd(plan.fusion.aAjouter)
      await db.licencies.bulkPut(plan.fusion.aMettreAJour)
    }
    return plans.map(versBilan)
  })
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck`
Expected : tous les tests PASS (dont 1 + 8 nouveaux), aucune erreur de type. Le setup de test vide déjà toutes les tables (`db.tables`), y compris les nouvelles.

- [ ] **Step 6 : Commit**

```bash
git add src/storage/db.ts src/storage/db.test.ts src/storage/clubs.ts src/storage/clubs.test.ts src/test/fixturesClubs.ts
git commit -m "feat(stockage): Ajout des clubs et licenciés (schéma v2) et de l'import par fusion"
```

---

### Task 3 : Lecture de l'export Webaffiligue

**Files:**
- Create: `src/webaffiligue/lireExport.ts`, `tsconfig.test.json`
- Modify: `tsconfig.json`, `tsconfig.app.json`
- Test: `src/webaffiligue/lireExport.test.ts`

**Interfaces:**
- Consumes : `ImportClub`, `LicencieLu` (Task 1), `Civilite`.
- Produces :
  - `class ErreurExport extends Error`
  - `interface ResultatLecture { clubs: ImportClub[]; lignesIgnorees: number }`
  - `lireExportWebaffiligue(octets: Uint8Array): ResultatLecture` (lève `ErreurExport` : fichier vide, colonnes absentes, aucun licencié)
  - utilitaires exportés et testés : `decoderOctets(octets: Uint8Array): string`, `decouperCsv(texte: string, separateur: string): string[][]`, `nettoyerValeur(brute: string): string`, `normaliserEntete(entete: string): string`
- Projet TypeScript de test : les fichiers `*.test.ts(x)` et `src/test/` sont vérifiés par `tsconfig.test.json` (types Node disponibles pour lire les fichiers d'exemple), et exclus de `tsconfig.app.json`.

Format constaté sur `Sortie_simple_Ufolep.csv` (racine du dépôt) : ISO-8859-1, séparateur `;`, valeurs `"=""…"""` (donc `="…"` après décodage CSV), 22 licenciés du club `033550002` « SAINT DELPHIN BASKET », 16 `M` et 6 `Mme`, 21 `Competition` et 1 `Loisirs`, noms et prénoms vides (export anonymisé). Première licence `033_00000101` (M), deuxième `033_00000102` (Mme), dernière `ZZ00000005`.

- [ ] **Step 1 : Séparer le projet TypeScript des tests**

Dans `tsconfig.app.json`, après la ligne `"include": ["src"]`, ajouter (avec la virgule sur la ligne précédente) :

```json
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx", "src/test"]
```

Créer `tsconfig.test.json` :

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.test.tsbuildinfo",
    "types": ["vite/client", "node"]
  },
  "include": ["src"],
  "exclude": []
}
```

Dans `tsconfig.json`, ajouter la référence :

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.test.json" }
  ]
}
```

Run : `npm run typecheck`
Expected : aucune erreur (rien n'a changé dans le code).

- [ ] **Step 2 : Écrire les tests (ils doivent échouer)**

`src/webaffiligue/lireExport.test.ts` :

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  decouperCsv,
  ErreurExport,
  lireExportWebaffiligue,
  nettoyerValeur,
  normaliserEntete,
} from './lireExport'

/** Encode en ISO-8859-1 (tous les caractères utilisés ici sont ≤ U+00FF). */
const latin1 = (texte: string) => Uint8Array.from(texte, (c) => c.charCodeAt(0))
const utf8AvecBom = (texte: string) => new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode(texte)])

const ENTETE =
  '"=""N° Association""";"=""Nom association""";"=""Type licence""";"=""N° Adherent""";"=""Civilite""";"=""Nom""";"=""Prénom"""'
const ligne = (licence: string, civilite: string, nom: string, prenom: string, association = '033550002') =>
  `"=""${association}""";"=""SAINT DELPHIN BASKET""";"=""Loisirs""";"=""${licence}""";"=""${civilite}""";"=""${nom}""";"=""${prenom}"""`

describe('utilitaires CSV', () => {
  it('découpe en respectant les guillemets, les guillemets doublés et les fins de ligne', () => {
    expect(decouperCsv('a;"b;c";"d""e"\r\nf;g;h\n\n', ';')).toEqual([
      ['a', 'b;c', 'd"e'],
      ['f', 'g', 'h'],
    ])
  })

  it('retire l’encapsulation de formule Excel', () => {
    expect(nettoyerValeur('="033_1"')).toBe('033_1')
    expect(nettoyerValeur(' Oui ')).toBe('Oui')
  })

  it('normalise les intitulés de colonnes', () => {
    expect(normaliserEntete('N° Adherent')).toBe('n adherent')
    expect(normaliserEntete('Prénom')).toBe('prenom')
  })
})

describe('lireExportWebaffiligue', () => {
  it("lit l'export anonymisé réel", () => {
    const octets = readFileSync(new URL('../../Sortie_simple_Ufolep.csv', import.meta.url))
    const { clubs, lignesIgnorees } = lireExportWebaffiligue(octets)
    expect(lignesIgnorees).toBe(0)
    expect(clubs).toHaveLength(1)
    expect(clubs[0].numeroAssociation).toBe('033550002')
    expect(clubs[0].nom).toBe('SAINT DELPHIN BASKET')
    expect(clubs[0].licencies).toHaveLength(22)
    expect(clubs[0].licencies[0]).toEqual({
      licence: '033_00000101',
      nom: '',
      prenom: '',
      civilite: 'M',
      typeLicence: 'Competition',
    })
    expect(clubs[0].licencies[1].civilite).toBe('Mme')
    expect(clubs[0].licencies.at(-1)?.licence).toBe('ZZ00000005')
    expect(clubs[0].licencies.filter((l) => l.civilite === 'Mme')).toHaveLength(6)
    expect(clubs[0].licencies.filter((l) => l.typeLicence === 'Loisirs')).toHaveLength(1)
  })

  it('lit les noms accentués en ISO-8859-1', () => {
    const { clubs } = lireExportWebaffiligue(latin1(`${ENTETE}\n${ligne('033_1', 'Mme', 'Lefèvre', 'Bérénice')}\n`))
    expect(clubs[0].licencies[0]).toMatchObject({ nom: 'Lefèvre', prenom: 'Bérénice', civilite: 'Mme' })
  })

  it('lit un fichier ré-enregistré en UTF-8 avec BOM', () => {
    const { clubs } = lireExportWebaffiligue(utf8AvecBom(`${ENTETE}\n${ligne('033_1', 'M', 'Noël', 'Raphaël')}\n`))
    expect(clubs[0].licencies[0]).toMatchObject({ nom: 'Noël', prenom: 'Raphaël', civilite: 'M' })
  })

  it('accepte le séparateur virgule', () => {
    const texte = `${ENTETE}\n${ligne('033_1', 'M', 'Martin', 'Hugo')}`.replaceAll(';', ',')
    expect(lireExportWebaffiligue(latin1(texte)).clubs[0].licencies[0].nom).toBe('Martin')
  })

  it('ignore les lignes sans n° de licence et les compte', () => {
    const texte = `${ENTETE}\n${ligne('033_1', 'M', 'Martin', 'Hugo')}\n${ligne('', 'Mme', 'Sans', 'Licence')}\n`
    const resultat = lireExportWebaffiligue(latin1(texte))
    expect(resultat.clubs[0].licencies).toHaveLength(1)
    expect(resultat.lignesIgnorees).toBe(1)
  })

  it('regroupe par association', () => {
    const texte = `${ENTETE}\n${ligne('1', 'M', 'A', 'a')}\n${ligne('2', 'M', 'B', 'b', '033999999')}\n`
    expect(lireExportWebaffiligue(latin1(texte)).clubs.map((c) => c.numeroAssociation)).toEqual([
      '033550002',
      '033999999',
    ])
  })

  it('refuse un fichier dont des colonnes manquent, sans rien lire', () => {
    const lecture = () => lireExportWebaffiligue(latin1('Nom;Prénom\nMartin;Hugo\n'))
    expect(lecture).toThrow(ErreurExport)
    expect(lecture).toThrow(
      "Ce fichier n'est pas un export Webaffiligue reconnu : colonnes absentes (N° Adherent, Civilite, N° Association, Nom association).",
    )
  })

  it('refuse un fichier vide ou sans licencié', () => {
    expect(() => lireExportWebaffiligue(new Uint8Array())).toThrow('Fichier vide.')
    expect(() => lireExportWebaffiligue(latin1(`${ENTETE}\n`))).toThrow('Aucun licencié trouvé dans ce fichier.')
  })
})
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/webaffiligue`
Expected : FAIL (« Failed to resolve import "./lireExport" »).

- [ ] **Step 4 : Implémenter**

`src/webaffiligue/lireExport.ts` :

```ts
import type { ImportClub } from '../domain/club'
import type { Civilite } from '../domain/types'

export class ErreurExport extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErreurExport'
  }
}

export interface ResultatLecture {
  clubs: ImportClub[]
  lignesIgnorees: number
}

const COLONNES = {
  licence: 'n adherent',
  nom: 'nom',
  prenom: 'prenom',
  civilite: 'civilite',
  numeroAssociation: 'n association',
  nomAssociation: 'nom association',
  typeLicence: 'type licence',
} as const

type Colonne = keyof typeof COLONNES

const LIBELLES: Record<Colonne, string> = {
  licence: 'N° Adherent',
  nom: 'Nom',
  prenom: 'Prénom',
  civilite: 'Civilite',
  numeroAssociation: 'N° Association',
  nomAssociation: 'Nom association',
  typeLicence: 'Type licence',
}

const OBLIGATOIRES: Colonne[] = ['licence', 'nom', 'prenom', 'civilite', 'numeroAssociation', 'nomAssociation']

/** Webaffiligue exporte en ISO-8859-1 (windows-1252 en est un sur-ensemble) ; Excel peut ré-enregistrer en UTF-8. */
export function decoderOctets(octets: Uint8Array): string {
  if (octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf) {
    return new TextDecoder('utf-8').decode(octets.subarray(3))
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(octets)
  } catch {
    return new TextDecoder('windows-1252').decode(octets)
  }
}

export function decouperCsv(texte: string, separateur: string): string[][] {
  const lignes: string[][] = []
  let ligne: string[] = []
  let champ = ''
  let entreGuillemets = false

  for (let i = 0; i < texte.length; i++) {
    const caractere = texte[i]
    if (entreGuillemets) {
      if (caractere !== '"') {
        champ += caractere
      } else if (texte[i + 1] === '"') {
        champ += '"'
        i++
      } else {
        entreGuillemets = false
      }
    } else if (caractere === '"') {
      entreGuillemets = true
    } else if (caractere === separateur) {
      ligne.push(champ)
      champ = ''
    } else if (caractere === '\n' || caractere === '\r') {
      if (caractere === '\r' && texte[i + 1] === '\n') i++
      ligne.push(champ)
      lignes.push(ligne)
      ligne = []
      champ = ''
    } else {
      champ += caractere
    }
  }
  if (champ !== '' || ligne.length > 0) {
    ligne.push(champ)
    lignes.push(ligne)
  }
  return lignes.filter((cellules) => cellules.some((cellule) => cellule.trim() !== ''))
}

export function nettoyerValeur(brute: string): string {
  const valeur = brute.trim()
  const formule = /^="(.*)"$/s.exec(valeur)
  return (formule ? formule[1] : valeur).trim()
}

export function normaliserEntete(entete: string): string {
  return entete
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[°º]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function lireCivilite(valeur: string): Civilite {
  const normalisee = valeur.toLowerCase()
  if (normalisee === 'm' || normalisee === 'mr' || normalisee === 'monsieur') return 'M'
  if (normalisee === 'mme' || normalisee === 'mlle' || normalisee === 'madame') return 'Mme'
  return null
}

export function lireExportWebaffiligue(octets: Uint8Array): ResultatLecture {
  const texte = decoderOctets(octets)
  const premiereLigne = texte.split(/\r?\n/, 1)[0] ?? ''
  const separateur = premiereLigne.split(';').length >= premiereLigne.split(',').length ? ';' : ','
  const lignes = decouperCsv(texte, separateur)
  if (lignes.length === 0) throw new ErreurExport('Fichier vide.')

  const entetes = lignes[0].map((entete) => normaliserEntete(nettoyerValeur(entete)))
  const index = {} as Record<Colonne, number>
  const manquantes: string[] = []
  for (const colonne of Object.keys(COLONNES) as Colonne[]) {
    index[colonne] = entetes.indexOf(COLONNES[colonne])
    if (index[colonne] === -1 && OBLIGATOIRES.includes(colonne)) manquantes.push(LIBELLES[colonne])
  }
  if (manquantes.length > 0) {
    throw new ErreurExport(
      `Ce fichier n'est pas un export Webaffiligue reconnu : colonnes absentes (${manquantes.join(', ')}).`,
    )
  }

  const parAssociation = new Map<string, ImportClub>()
  let lignesIgnorees = 0
  for (const cellules of lignes.slice(1)) {
    const valeur = (colonne: Colonne) => (index[colonne] === -1 ? '' : nettoyerValeur(cellules[index[colonne]] ?? ''))
    const licence = valeur('licence')
    if (!licence) {
      lignesIgnorees++
      continue
    }
    const numeroAssociation = valeur('numeroAssociation')
    let club = parAssociation.get(numeroAssociation)
    if (!club) {
      club = { numeroAssociation, nom: valeur('nomAssociation'), licencies: [] }
      parAssociation.set(numeroAssociation, club)
    }
    club.licencies.push({
      licence,
      nom: valeur('nom'),
      prenom: valeur('prenom'),
      civilite: lireCivilite(valeur('civilite')),
      typeLicence: valeur('typeLicence'),
    })
  }
  if (parAssociation.size === 0) throw new ErreurExport('Aucun licencié trouvé dans ce fichier.')

  return { clubs: [...parAssociation.values()], lignesIgnorees }
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

Run : `npx vitest run src/webaffiligue && npm run typecheck`
Expected : 11 tests PASS, aucune erreur de type (les trois projets).

- [ ] **Step 6 : Commit**

```bash
git add src/webaffiligue tsconfig.json tsconfig.app.json tsconfig.test.json
git commit -m "feat(webaffiligue): Ajout de la lecture de l'export des licenciés"
```

---

### Task 4 : Écrans « Clubs et licenciés »

**Files:**
- Create: `src/ui/clubs/EcranClubs.tsx`, `src/ui/clubs/FicheClub.tsx`, `src/ui/clubs/DialogueClub.tsx`, `src/ui/clubs/DialogueLicencie.tsx`
- Modify: `src/ui/Accueil.tsx`, `src/App.tsx`, `src/styles.css`
- Test: `src/ui/clubs/EcranClubs.test.tsx`

**Interfaces:**
- Consumes : dépôt de la Task 2 (`listerClubsAvecEffectif`, `lireClub`, `enregistrerClub`, `supprimerClub`, `listerLicencies`, `enregistrerLicencie`, `supprimerLicencie`, `ErreurLicenceEnDouble`), `Club`, `Licencie`, `libelleLicencie` (Task 1), `nouvelId`, `Dialogue`, `pluriel` (`src/ui/format.ts`), `MESSAGE_ERREUR_STOCKAGE` (`src/ui/useMatch.ts`), `creerClubDeTest`, `CLUB_TEST` (Task 2).
- Produces :
  - `EcranClubs({ onRetour: () => void })` ; titre « Clubs et licenciés » ; boutons « Nouveau club », un bouton par club (nom + « N licenciés »).
  - `FicheClub({ clubId, onRetour })` ; boutons « Modifier le club », « Supprimer le club », « Ajouter un licencié », « Modifier {libellé} », « Supprimer {libellé} » ; liste `aria-label="Licenciés"`.
  - `DialogueClub({ club: Club | null; onFermer })` : champs « Nom du club », « Couleur par défaut », bouton « Enregistrer ».
  - `DialogueLicencie({ clubId, licencie: Licencie | null, onFermer })` : champs « Licence », « Nom », « Prénom », « Civilité », bouton « Enregistrer ».
  - Accueil : nouvelle prop `onClubs: () => void`, bouton « Clubs et licenciés ». App : écran `{ nom: 'clubs' }`.

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/ui/clubs/EcranClubs.test.tsx` :

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { db } from '../../storage/db'
import { creerClubDeTest } from '../../test/fixturesClubs'
import { EcranClubs } from './EcranClubs'

async function afficher() {
  const user = userEvent.setup()
  render(<EcranClubs onRetour={vi.fn()} />)
  await screen.findByRole('heading', { name: 'Clubs et licenciés' })
  return user
}

async function ouvrirClubDeTest(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: /SAINT DELPHIN BASKET/ }))
  await screen.findByRole('heading', { name: 'SAINT DELPHIN BASKET' })
}

describe('EcranClubs', () => {
  it('crée un club', async () => {
    const user = await afficher()
    expect(screen.getByText(/Aucun club pour l'instant/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nouveau club' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Nouveau club' }))
    await user.type(dialogue.getByLabelText('Nom du club'), 'ST DELPHIN')
    await user.type(dialogue.getByLabelText('Couleur par défaut'), 'Vert')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByRole('button', { name: /ST DELPHIN.*0 licencié/ })).toBeInTheDocument()
  })

  it('refuse un club sans nom', async () => {
    const user = await afficher()
    await user.click(screen.getByRole('button', { name: 'Nouveau club' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Le nom du club est obligatoire.')
  })

  it('affiche les licenciés d’un club, triés par nom', async () => {
    await creerClubDeTest()
    const user = await afficher()
    expect(await screen.findByRole('button', { name: /SAINT DELPHIN BASKET.*3 licenciés/ })).toBeInTheDocument()
    await ouvrirClubDeTest(user)
    const lignes = within(await screen.findByRole('list', { name: 'Licenciés' })).getAllByRole('listitem')
    expect(lignes.map((l) => l.textContent)).toEqual([
      expect.stringContaining('Léa Durand'),
      expect.stringContaining('Chloé Martin'),
      expect.stringContaining('Hugo Petit'),
    ])
  })

  it('ajoute, modifie puis supprime un licencié', async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)

    await user.click(screen.getByRole('button', { name: 'Ajouter un licencié' }))
    let dialogue = within(screen.getByRole('dialog', { name: 'Nouveau licencié' }))
    await user.type(dialogue.getByLabelText('Licence'), '033_9')
    await user.type(dialogue.getByLabelText('Nom'), 'Roux')
    await user.type(dialogue.getByLabelText('Prénom'), 'Inès')
    await user.selectOptions(dialogue.getByLabelText('Civilité'), 'Mme')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Inès Roux')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Modifier Inès Roux' }))
    dialogue = within(screen.getByRole('dialog', { name: 'Modifier le licencié' }))
    await user.clear(dialogue.getByLabelText('Nom'))
    await user.type(dialogue.getByLabelText('Nom'), 'Roux-Martin')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('Inès Roux-Martin')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Supprimer Inès Roux-Martin' }))
    await user.click(within(screen.getByRole('dialog', { name: 'Supprimer ce licencié ?' })).getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(screen.queryByText('Inès Roux-Martin')).not.toBeInTheDocument())
  })

  it('signale un n° de licence déjà présent', async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Ajouter un licencié' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Nouveau licencié' }))
    await user.type(dialogue.getByLabelText('Licence'), '033_00000101')
    await user.type(dialogue.getByLabelText('Nom'), 'Doublon')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await dialogue.findByRole('alert')).toHaveTextContent('Ce n° de licence existe déjà dans ce club.')
  })

  it('exige un nom pour un licencié', async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Ajouter un licencié' }))
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Le nom est obligatoire.')
  })

  it('supprime un club et ses licenciés après confirmation', async () => {
    await creerClubDeTest()
    const user = await afficher()
    await ouvrirClubDeTest(user)
    await user.click(screen.getByRole('button', { name: 'Supprimer le club' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Supprimer le club ?' }))
    expect(dialogue.getByText(/Ses 3 licenciés seront aussi supprimés/)).toBeInTheDocument()
    await user.click(dialogue.getByRole('button', { name: 'Supprimer' }))
    expect(await screen.findByText(/Aucun club pour l'instant/)).toBeInTheDocument()
    expect(await db.licencies.count()).toBe(0)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/clubs`
Expected : FAIL (« Failed to resolve import "./EcranClubs" »).

- [ ] **Step 3 : Implémenter les dialogues**

`src/ui/clubs/DialogueClub.tsx` :

```tsx
import { useState } from 'react'
import type { Club } from '../../domain/club'
import { nouvelId } from '../../domain/match'
import { enregistrerClub } from '../../storage/clubs'
import { Dialogue } from '../commun/Dialogue'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'

interface Props {
  club: Club | null
  onFermer: () => void
}

export function DialogueClub({ club, onFermer }: Props) {
  const [nom, setNom] = useState(club?.nom ?? '')
  const [couleur, setCouleur] = useState(club?.couleurParDefaut ?? '')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function valider() {
    if (!nom.trim()) {
      setErreur('Le nom du club est obligatoire.')
      return
    }
    setEnCours(true)
    try {
      await enregistrerClub({
        id: club?.id ?? nouvelId(),
        numeroAssociation: club?.numeroAssociation ?? null,
        nom: nom.trim(),
        couleurParDefaut: couleur.trim(),
      })
      onFermer()
    } catch {
      setErreur(MESSAGE_ERREUR_STOCKAGE)
      setEnCours(false)
    }
  }

  return (
    <Dialogue
      titre={club ? 'Modifier le club' : 'Nouveau club'}
      actions={
        <>
          <button className="btn btn-principal" disabled={enCours} onClick={() => void valider()}>
            Enregistrer
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Nom du club
        <input value={nom} onChange={(e) => setNom(e.target.value)} />
      </label>
      <label>
        Couleur par défaut
        <input value={couleur} onChange={(e) => setCouleur(e.target.value)} />
      </label>
      {erreur && (
        <p role="alert" className="erreurs">
          {erreur}
        </p>
      )}
    </Dialogue>
  )
}
```

`src/ui/clubs/DialogueLicencie.tsx` :

```tsx
import { useState } from 'react'
import type { Licencie } from '../../domain/club'
import { nouvelId } from '../../domain/match'
import type { Civilite } from '../../domain/types'
import { enregistrerLicencie, ErreurLicenceEnDouble } from '../../storage/clubs'
import { Dialogue } from '../commun/Dialogue'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'

interface Props {
  clubId: string
  licencie: Licencie | null
  onFermer: () => void
}

export function DialogueLicencie({ clubId, licencie, onFermer }: Props) {
  const [licence, setLicence] = useState(licencie?.licence ?? '')
  const [nom, setNom] = useState(licencie?.nom ?? '')
  const [prenom, setPrenom] = useState(licencie?.prenom ?? '')
  const [civilite, setCivilite] = useState<Civilite>(licencie?.civilite ?? null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function valider() {
    if (!nom.trim()) {
      setErreur('Le nom est obligatoire.')
      return
    }
    setEnCours(true)
    try {
      await enregistrerLicencie({
        id: licencie?.id ?? nouvelId(),
        clubId,
        licence: licence.trim(),
        nom: nom.trim(),
        prenom: prenom.trim(),
        civilite,
        typeLicence: licencie?.typeLicence ?? '',
      })
      onFermer()
    } catch (e) {
      setErreur(e instanceof ErreurLicenceEnDouble ? e.message : MESSAGE_ERREUR_STOCKAGE)
      setEnCours(false)
    }
  }

  return (
    <Dialogue
      titre={licencie ? 'Modifier le licencié' : 'Nouveau licencié'}
      actions={
        <>
          <button className="btn btn-principal" disabled={enCours} onClick={() => void valider()}>
            Enregistrer
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Licence
        <input value={licence} onChange={(e) => setLicence(e.target.value)} />
      </label>
      <label>
        Nom
        <input value={nom} onChange={(e) => setNom(e.target.value)} />
      </label>
      <label>
        Prénom
        <input value={prenom} onChange={(e) => setPrenom(e.target.value)} />
      </label>
      <label>
        Civilité
        <select
          value={civilite ?? ''}
          onChange={(e) => setCivilite(e.target.value === '' ? null : (e.target.value as Civilite))}
        >
          <option value="">?</option>
          <option value="Mme">F</option>
          <option value="M">H</option>
        </select>
      </label>
      {erreur && (
        <p role="alert" className="erreurs">
          {erreur}
        </p>
      )}
    </Dialogue>
  )
}
```

- [ ] **Step 4 : Implémenter la fiche d'un club**

`src/ui/clubs/FicheClub.tsx` :

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { libelleLicencie, type Licencie } from '../../domain/club'
import { listerLicencies, lireClub, supprimerClub, supprimerLicencie } from '../../storage/clubs'
import { Dialogue } from '../commun/Dialogue'
import { pluriel } from '../format'
import { DialogueClub } from './DialogueClub'
import { DialogueLicencie } from './DialogueLicencie'

type Edition =
  | { type: 'club' }
  | { type: 'licencie'; licencie: Licencie | null }
  | { type: 'suppressionLicencie'; licencie: Licencie }
  | { type: 'suppressionClub' }
  | null

interface Props {
  clubId: string
  onRetour: () => void
}

const CIVILITES = { Mme: 'F', M: 'H' } as const

export function FicheClub({ clubId, onRetour }: Props) {
  const club = useLiveQuery(() => lireClub(clubId), [clubId])
  const licencies = useLiveQuery(() => listerLicencies(clubId), [clubId])
  const [edition, setEdition] = useState<Edition>(null)
  const fermer = () => setEdition(null)

  if (!club || !licencies) return <p className="chargement">Chargement…</p>

  return (
    <section className="ecran fiche-club">
      <header className="entete">
        <h1>{club.nom}</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      <p className="sous-titre">
        {club.numeroAssociation ? `N° d'association ${club.numeroAssociation} · ` : ''}
        Couleur : {club.couleurParDefaut || '—'}
      </p>
      <div className="actions-equipe">
        <button className="btn" onClick={() => setEdition({ type: 'club' })}>
          Modifier le club
        </button>
        <button className="btn btn-danger" onClick={() => setEdition({ type: 'suppressionClub' })}>
          Supprimer le club
        </button>
      </div>

      <h2>Licenciés ({licencies.length})</h2>
      <button className="btn btn-principal" onClick={() => setEdition({ type: 'licencie', licencie: null })}>
        Ajouter un licencié
      </button>
      <ul className="liste-joueurs" aria-label="Licenciés">
        {licencies.map((licencie) => {
          const libelle = libelleLicencie(licencie)
          return (
            <li key={licencie.id}>
              <span>{libelle}</span>
              <span className="journal-score">
                {licencie.licence || 'sans licence'} · {licencie.civilite ? CIVILITES[licencie.civilite] : '?'}
              </span>
              <span className="journal-actions">
                <button
                  className="btn btn-discret"
                  aria-label={`Modifier ${libelle}`}
                  onClick={() => setEdition({ type: 'licencie', licencie })}
                >
                  Modifier
                </button>
                <button
                  className="btn btn-discret"
                  aria-label={`Supprimer ${libelle}`}
                  onClick={() => setEdition({ type: 'suppressionLicencie', licencie })}
                >
                  Supprimer
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      {edition?.type === 'club' && <DialogueClub club={club} onFermer={fermer} />}
      {edition?.type === 'licencie' && (
        <DialogueLicencie clubId={clubId} licencie={edition.licencie} onFermer={fermer} />
      )}
      {edition?.type === 'suppressionLicencie' && (
        <Dialogue
          titre="Supprimer ce licencié ?"
          actions={
            <>
              <button
                className="btn btn-danger"
                onClick={() => {
                  void supprimerLicencie(edition.licencie.id)
                  fermer()
                }}
              >
                Supprimer
              </button>
              <button className="btn" onClick={fermer}>
                Annuler
              </button>
            </>
          }
        >
          <p>{libelleLicencie(edition.licencie)}</p>
        </Dialogue>
      )}
      {edition?.type === 'suppressionClub' && (
        <Dialogue
          titre="Supprimer le club ?"
          actions={
            <>
              <button
                className="btn btn-danger"
                onClick={() => {
                  void supprimerClub(clubId).then(onRetour)
                }}
              >
                Supprimer
              </button>
              <button className="btn" onClick={fermer}>
                Annuler
              </button>
            </>
          }
        >
          <p>
            Ses {pluriel(licencies.length, 'licencié')} seront aussi supprimés. Les matchs déjà joués ne changent pas.
          </p>
        </Dialogue>
      )}
    </section>
  )
}
```

- [ ] **Step 5 : Implémenter la liste des clubs**

`src/ui/clubs/EcranClubs.tsx` :

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { listerClubsAvecEffectif } from '../../storage/clubs'
import { pluriel } from '../format'
import { DialogueClub } from './DialogueClub'
import { FicheClub } from './FicheClub'

export function EcranClubs({ onRetour }: { onRetour: () => void }) {
  const clubs = useLiveQuery(() => listerClubsAvecEffectif(), [])
  const [clubOuvert, setClubOuvert] = useState<string | null>(null)
  const [creation, setCreation] = useState(false)

  if (clubOuvert) return <FicheClub clubId={clubOuvert} onRetour={() => setClubOuvert(null)} />

  return (
    <section className="ecran clubs">
      <header className="entete">
        <h1>Clubs et licenciés</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      {clubs?.length === 0 && (
        <p className="sous-titre">Aucun club pour l'instant. Importez un export Webaffiligue ou créez un club.</p>
      )}
      <ul className="liste-clubs">
        {clubs?.map(({ club, effectif }) => (
          <li key={club.id}>
            <button className="btn btn-discret" onClick={() => setClubOuvert(club.id)}>
              {club.nom} <small>{pluriel(effectif, 'licencié')}</small>
            </button>
          </li>
        ))}
      </ul>
      <div className="actions-equipe">
        <button className="btn" onClick={() => setCreation(true)}>
          Nouveau club
        </button>
      </div>
      {creation && <DialogueClub club={null} onFermer={() => setCreation(false)} />}
    </section>
  )
}
```

- [ ] **Step 6 : Ajouter les styles**

À la fin de `src/styles.css` :

```css
/* Clubs et équipes (plan 2) */
.actions-equipe {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.liste-clubs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.liste-clubs .btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  text-align: left;
}

.dialogue {
  max-height: 90dvh;
  overflow-y: auto;
}

.dialogue textarea {
  background: var(--surface-2);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
  padding: 10px;
  color: inherit;
  font: inherit;
}
```

- [ ] **Step 7 : Brancher l'écran dans l'accueil et l'app**

Dans `src/ui/Accueil.tsx` :

1. Dans `interface Props`, après `onReprendre: (matchId: string) => void`, ajouter :

```tsx
  onClubs: () => void
```

2. Remplacer `export function Accueil({ onNouveauMatch, onReprendre }: Props) {` par :

```tsx
export function Accueil({ onNouveauMatch, onReprendre, onClubs }: Props) {
```

3. Juste après le bouton « Nouveau match » (`</button>` qui suit `Nouveau match`), ajouter :

```tsx
      <button className="btn" onClick={onClubs}>
        Clubs et licenciés
      </button>
```

Dans `src/App.tsx` :

1. Ajouter l'import `import { EcranClubs } from './ui/clubs/EcranClubs'`.
2. Remplacer la déclaration du type `Ecran` par :

```tsx
type Ecran =
  | { nom: 'chargement' }
  | { nom: 'accueil' }
  | { nom: 'preparation' }
  | { nom: 'match'; matchId: string }
  | { nom: 'clubs' }
```

3. Remplacer le rendu de `<Accueil … />` par :

```tsx
        <Accueil
          onNouveauMatch={() => setEcran({ nom: 'preparation' })}
          onReprendre={ouvrirMatch}
          onClubs={() => setEcran({ nom: 'clubs' })}
        />
```

4. Juste avant `<MiseAJour …/>`, ajouter :

```tsx
      {ecran.nom === 'clubs' && <EcranClubs onRetour={allerAccueil} />}
```

- [ ] **Step 8 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck && npm run lint`
Expected : tous les tests PASS (dont 7 nouveaux), aucune erreur, sortie propre.

- [ ] **Step 9 : Commit**

```bash
git add src/ui/clubs src/ui/Accueil.tsx src/App.tsx src/styles.css
git commit -m "feat(clubs): Ajout des écrans de gestion des clubs et des licenciés"
```

---

### Task 5 : Import de l'export Webaffiligue depuis l'écran des clubs

**Files:**
- Create: `src/ui/commun/fichiers.ts`, `src/ui/clubs/ImportWebaffiligue.tsx`
- Modify: `src/ui/clubs/EcranClubs.tsx`, `src/styles.css`
- Test: `src/ui/clubs/ImportWebaffiligue.test.tsx`

**Interfaces:**
- Consumes : `lireExportWebaffiligue`, `ErreurExport`, `ResultatLecture` (Task 3) ; `previsualiserImport`, `appliquerImport`, `BilanImportClub` (Task 2) ; `Dialogue`, `MESSAGE_ERREUR_STOCKAGE`.
- Produces :
  - `fichiers.ts` : `lireOctets(fichier: Blob): Promise<Uint8Array>`, `lireTexte(fichier: Blob): Promise<string>` (FileReader, UTF-8).
  - `ImportWebaffiligue()` : champ fichier libellé « Importer un export Webaffiligue » ; dialogues « Import Webaffiligue » (aperçu, boutons « Importer » / « Annuler »), « Import terminé » (bouton « OK »), « Import impossible » (message `role="alert"`).
  - `decrireBilan(bilan: BilanImportClub): string`, ex. « SAINT DELPHIN BASKET (nouveau club) : 22 nouveaux, 0 mis à jour, 0 inchangé ».
  - Classe CSS `.masque` (champ fichier caché visuellement, toujours accessible).

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/ui/clubs/ImportWebaffiligue.test.tsx` :

```tsx
import { readFileSync } from 'node:fs'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EcranClubs } from './EcranClubs'

const EXPORT = readFileSync(new URL('../../../Sortie_simple_Ufolep.csv', import.meta.url))
// new Uint8Array(…) : un Buffer Node n'est pas accepté tel quel comme BlobPart par les types DOM récents.
const fichier = (contenu: Uint8Array | string, nom = 'export.csv') =>
  new File([typeof contenu === 'string' ? contenu : new Uint8Array(contenu)], nom, { type: 'text/csv' })

async function afficher() {
  const user = userEvent.setup()
  render(<EcranClubs onRetour={vi.fn()} />)
  await screen.findByRole('heading', { name: 'Clubs et licenciés' })
  return user
}

describe('Import Webaffiligue', () => {
  it("prévisualise puis importe l'export, et le club apparaît", async () => {
    const user = await afficher()
    await user.upload(screen.getByLabelText('Importer un export Webaffiligue'), fichier(EXPORT))
    const apercu = within(await screen.findByRole('dialog', { name: 'Import Webaffiligue' }))
    expect(apercu.getByText('SAINT DELPHIN BASKET (nouveau club) : 22 nouveaux, 0 mis à jour, 0 inchangé')).toBeInTheDocument()
    await user.click(apercu.getByRole('button', { name: 'Importer' }))
    const fin = within(await screen.findByRole('dialog', { name: 'Import terminé' }))
    await user.click(fin.getByRole('button', { name: 'OK' }))
    expect(await screen.findByRole('button', { name: /SAINT DELPHIN BASKET.*22 licenciés/ })).toBeInTheDocument()
  })

  it('un réimport ne crée aucun doublon', async () => {
    const user = await afficher()
    await user.upload(screen.getByLabelText('Importer un export Webaffiligue'), fichier(EXPORT))
    await user.click(within(await screen.findByRole('dialog', { name: 'Import Webaffiligue' })).getByRole('button', { name: 'Importer' }))
    await user.click(within(await screen.findByRole('dialog', { name: 'Import terminé' })).getByRole('button', { name: 'OK' }))

    await user.upload(screen.getByLabelText('Importer un export Webaffiligue'), fichier(EXPORT))
    const apercu = within(await screen.findByRole('dialog', { name: 'Import Webaffiligue' }))
    expect(apercu.getByText('SAINT DELPHIN BASKET : 0 nouveau, 0 mis à jour, 22 inchangés')).toBeInTheDocument()
  })

  it('annuler ne crée rien', async () => {
    const user = await afficher()
    await user.upload(screen.getByLabelText('Importer un export Webaffiligue'), fichier(EXPORT))
    await user.click(within(await screen.findByRole('dialog', { name: 'Import Webaffiligue' })).getByRole('button', { name: 'Annuler' }))
    expect(screen.getByText(/Aucun club pour l'instant/)).toBeInTheDocument()
  })

  it('explique pourquoi un fichier est refusé', async () => {
    const user = await afficher()
    await user.upload(screen.getByLabelText('Importer un export Webaffiligue'), fichier('Nom;Prénom\nMartin;Hugo\n'))
    const dialogue = within(await screen.findByRole('dialog', { name: 'Import impossible' }))
    expect(dialogue.getByRole('alert')).toHaveTextContent('colonnes absentes')
    await user.click(dialogue.getByRole('button', { name: 'OK' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('signale les lignes sans licence ignorées', async () => {
    const user = await afficher()
    const texte = `${EXPORT.toString('latin1').trimEnd()}\n"=""Basket ball""";"=""033550002""";"=""SAINT DELPHIN BASKET""";Oui;"=""Loisirs""";"=""""";"=""M""";;;;;;;;;;;;\n`
    await user.upload(screen.getByLabelText('Importer un export Webaffiligue'), fichier(Buffer.from(texte, 'latin1')))
    const apercu = within(await screen.findByRole('dialog', { name: 'Import Webaffiligue' }))
    expect(apercu.getByText('1 ligne sans n° de licence ignorée.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/clubs/ImportWebaffiligue.test.tsx`
Expected : FAIL (champ « Importer un export Webaffiligue » introuvable).

- [ ] **Step 3 : Implémenter la lecture de fichiers**

`src/ui/commun/fichiers.ts` :

```ts
export function lireOctets(fichier: Blob): Promise<Uint8Array> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader()
    lecteur.onload = () => resoudre(new Uint8Array(lecteur.result as ArrayBuffer))
    lecteur.onerror = () => rejeter(lecteur.error)
    lecteur.readAsArrayBuffer(fichier)
  })
}

export function lireTexte(fichier: Blob): Promise<string> {
  return new Promise((resoudre, rejeter) => {
    const lecteur = new FileReader()
    lecteur.onload = () => resoudre(String(lecteur.result))
    lecteur.onerror = () => rejeter(lecteur.error)
    lecteur.readAsText(fichier)
  })
}
```

- [ ] **Step 4 : Implémenter l'import**

`src/ui/clubs/ImportWebaffiligue.tsx` :

```tsx
import { useState } from 'react'
import { appliquerImport, previsualiserImport, type BilanImportClub } from '../../storage/clubs'
import { ErreurExport, lireExportWebaffiligue, type ResultatLecture } from '../../webaffiligue/lireExport'
import { Dialogue } from '../commun/Dialogue'
import { lireOctets } from '../commun/fichiers'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'

type Etat =
  | { etape: 'repos' }
  | { etape: 'apercu'; lecture: ResultatLecture; bilans: BilanImportClub[] }
  | { etape: 'termine'; bilans: BilanImportClub[] }
  | { etape: 'erreur'; message: string }

export function decrireBilan(bilan: BilanImportClub): string {
  const s = (n: number, marque: string) => (n > 1 ? marque : '')
  return (
    `${bilan.nom}${bilan.nouveauClub ? ' (nouveau club)' : ''} : ` +
    `${bilan.ajoutes} nouveau${s(bilan.ajoutes, 'x')}, ${bilan.misAJour} mis à jour, ` +
    `${bilan.inchanges} inchangé${s(bilan.inchanges, 's')}`
  )
}

function ListeBilans({ bilans }: { bilans: BilanImportClub[] }) {
  return (
    <ul className="liste-joueurs">
      {bilans.map((bilan) => (
        <li key={bilan.nom}>{decrireBilan(bilan)}</li>
      ))}
    </ul>
  )
}

export function ImportWebaffiligue() {
  const [etat, setEtat] = useState<Etat>({ etape: 'repos' })
  const [enCours, setEnCours] = useState(false)
  const fermer = () => setEtat({ etape: 'repos' })

  async function lire(fichier: File | undefined) {
    if (!fichier) return
    try {
      const lecture = lireExportWebaffiligue(await lireOctets(fichier))
      setEtat({ etape: 'apercu', lecture, bilans: await previsualiserImport(lecture.clubs) })
    } catch (e) {
      setEtat({ etape: 'erreur', message: e instanceof ErreurExport ? e.message : 'Lecture du fichier impossible.' })
    }
  }

  async function importer(lecture: ResultatLecture) {
    setEnCours(true)
    try {
      setEtat({ etape: 'termine', bilans: await appliquerImport(lecture.clubs) })
    } catch {
      setEtat({ etape: 'erreur', message: MESSAGE_ERREUR_STOCKAGE })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <>
      <label className="btn">
        Importer un export Webaffiligue
        <input
          type="file"
          accept=".csv,text/csv"
          className="masque"
          onChange={(e) => {
            void lire(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
      {etat.etape === 'apercu' && (
        <Dialogue
          titre="Import Webaffiligue"
          actions={
            <>
              <button className="btn btn-principal" disabled={enCours} onClick={() => void importer(etat.lecture)}>
                Importer
              </button>
              <button className="btn" onClick={fermer}>
                Annuler
              </button>
            </>
          }
        >
          <ListeBilans bilans={etat.bilans} />
          {etat.lecture.lignesIgnorees > 0 && (
            <p className="avertissements">
              {etat.lecture.lignesIgnorees} ligne{etat.lecture.lignesIgnorees > 1 ? 's' : ''} sans n° de licence
              ignorée{etat.lecture.lignesIgnorees > 1 ? 's' : ''}.
            </p>
          )}
        </Dialogue>
      )}
      {etat.etape === 'termine' && (
        <Dialogue
          titre="Import terminé"
          actions={
            <button className="btn btn-principal" onClick={fermer}>
              OK
            </button>
          }
        >
          <ListeBilans bilans={etat.bilans} />
        </Dialogue>
      )}
      {etat.etape === 'erreur' && (
        <Dialogue
          titre="Import impossible"
          actions={
            <button className="btn" onClick={fermer}>
              OK
            </button>
          }
        >
          <p role="alert">{etat.message}</p>
        </Dialogue>
      )}
    </>
  )
}
```

Note : le texte « 1 ligne sans n° de licence ignorée. » est rendu en plusieurs nœuds de texte dans un seul `<p>` ; `getByText` compare le texte complet de l'élément, ce qui fonctionne.

- [ ] **Step 5 : Ajouter l'import à l'écran et le style du champ caché**

Dans `src/ui/clubs/EcranClubs.tsx` : ajouter l'import `import { ImportWebaffiligue } from './ImportWebaffiligue'`, et dans `<div className="actions-equipe">`, après le bouton « Nouveau club », ajouter :

```tsx
        <ImportWebaffiligue />
```

À la fin de `src/styles.css` :

```css
.masque {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
```

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck && npm run lint`
Expected : tous les tests PASS (dont 5 nouveaux), sortie propre.

- [ ] **Step 7 : Commit**

```bash
git add src/ui/commun/fichiers.ts src/ui/clubs src/styles.css
git commit -m "feat(clubs): Ajout de l'import de l'export Webaffiligue avec aperçu"
```

---

### Task 6 : Composer l'équipe du match depuis le pool d'un club

**Files:**
- Modify: `src/ui/preparation/brouillon.ts`, `src/ui/preparation/EditeurEquipe.tsx` (remplacé en entier), `src/styles.css`
- Create: `src/ui/preparation/DialogueSelection.tsx`
- Test: `src/ui/preparation/brouillon.test.ts` (ajouts), `src/ui/preparation/PreparationMatch.test.tsx` (ajouts)

**Interfaces:**
- Consumes : `Club`, `Licencie`, `libelleLicencie` (Task 1) ; `listerClubs`, `listerLicencies` (Task 2) ; `REGLES` ; `Dialogue` ; fixtures `CLUB_TEST`, `LICENCIES_TEST`, `creerClubDeTest`.
- Produces :
  - `JoueurBrouillon` gagne `licencieId: string | null` ; `BrouillonEquipe` gagne `clubId: string | null`.
  - `estVide(joueur: JoueurBrouillon): boolean` (désormais exporté).
  - `choisirClub(brouillon: BrouillonEquipe, club: Club | null): BrouillonEquipe` (pré-remplit nom et couleur s'ils sont vides).
  - `appliquerSelection(brouillon: BrouillonEquipe, licencies: Licencie[], idsChoisis: ReadonlySet<string>): BrouillonEquipe`.
  - `DialogueSelection({ clubId, brouillon, onValider: (licencies: Licencie[], ids: Set<string>) => void, onFermer })` : titre « Choisir les joueurs », champ « Rechercher », une case à cocher par licencié (nom accessible : « Prénom Nom licence »), compteur « n / 14 joueurs », boutons « Valider » / « Annuler ».
  - `EditeurEquipe` : sélecteur « Club » (option « Saisie libre »), bouton « Choisir les joueurs du club », conteneur `<div className="actions-equipe">` où les Tasks 8 et 9 ajoutent leurs boutons, et le rendu des dialogues juste avant `</fieldset>`.

- [ ] **Step 1 : Écrire les tests du brouillon (ils doivent échouer)**

Ajouter à la fin de `src/ui/preparation/brouillon.test.ts` (et compléter l'import du haut : `appliquerSelection, choisirClub` depuis `./brouillon` ; `CLUB_TEST, LICENCIES_TEST` depuis `../../test/fixturesClubs`) :

```ts
describe('sélection dans le pool', () => {
  const [martin, durand, petit] = LICENCIES_TEST

  it('pré-remplit le nom et la couleur depuis le club sans écraser une saisie', () => {
    expect(choisirClub(brouillonVide(), CLUB_TEST)).toMatchObject({
      clubId: 'club-sd',
      nom: 'SAINT DELPHIN BASKET',
      couleur: 'Vert',
    })
    expect(choisirClub({ ...brouillonVide(), nom: 'SD 2' }, CLUB_TEST).nom).toBe('SD 2')
    expect(choisirClub(choisirClub(brouillonVide(), CLUB_TEST), null).clubId).toBeNull()
  })

  it('ajoute une ligne par licencié choisi et retire la ligne vide de départ', () => {
    const b = appliquerSelection(brouillonVide(), LICENCIES_TEST, new Set([martin.id, petit.id]))
    expect(b.joueurs.map((j) => [j.licencieId, j.nom, j.prenom, j.licence, j.civilite, j.numero])).toEqual([
      ['lic-martin', 'Martin', 'Chloé', '033_00000101', 'Mme', ''],
      ['lic-petit', 'Petit', 'Hugo', '033_00000103', 'M', ''],
    ])
  })

  it('garde les n° déjà saisis et les lignes saisies à la main', () => {
    let b = appliquerSelection(brouillonVide(), LICENCIES_TEST, new Set([martin.id]))
    b = { ...b, joueurs: [...b.joueurs.map((j) => ({ ...j, numero: '7' })), { ...joueurBrouillonVide(), nom: 'Essai', numero: '30' }] }
    b = appliquerSelection(b, LICENCIES_TEST, new Set([martin.id, durand.id]))
    expect(b.joueurs.map((j) => [j.nom, j.numero])).toEqual([
      ['Martin', '7'],
      ['Essai', '30'],
      ['Durand', ''],
    ])
  })

  it('décocher retire la ligne, garde les autres n° et remet le coach à « aucun »', () => {
    let b = appliquerSelection(brouillonVide(), LICENCIES_TEST, new Set([martin.id, durand.id]))
    b = { ...b, joueurs: b.joueurs.map((j, i) => ({ ...j, numero: String(4 + i) })) }
    const idLigneDurand = b.joueurs.find((j) => j.licencieId === durand.id)!.id
    b = { ...b, modeCoach: 'joueur', coachJoueurId: idLigneDurand }
    b = appliquerSelection(b, LICENCIES_TEST, new Set([martin.id]))
    expect(b.joueurs.map((j) => [j.nom, j.numero])).toEqual([['Martin', '4']])
    expect(brouillonVersEquipe({ ...b, nom: 'SD' }).coach).toBeNull()
  })
})
```

Ajuster aussi le test existant « nettoie les champs et ignore les lignes vides » : ses objets `JoueurBrouillon` littéraux doivent porter `licencieId: null` (le type l'exige désormais), et l'objet attendu de `brouillonVersEquipe` ne change pas.

- [ ] **Step 2 : Écrire le test d'écran (il doit échouer)**

Ajouter dans `src/ui/preparation/PreparationMatch.test.tsx` (imports : `creerClubDeTest` depuis `../../test/fixturesClubs`) :

```tsx
  it("compose une équipe en choisissant dans le pool d'un club", async () => {
    await creerClubDeTest()
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    const groupeA = within(screen.getByRole('group', { name: 'Équipe A' }))
    await user.selectOptions(await groupeA.findByLabelText('Club'), await groupeA.findByRole('option', { name: 'SAINT DELPHIN BASKET' }))
    expect(groupeA.getByLabelText("Nom de l'équipe")).toHaveValue('SAINT DELPHIN BASKET')
    expect(groupeA.getByLabelText('Couleur')).toHaveValue('Vert')

    await user.click(groupeA.getByRole('button', { name: 'Choisir les joueurs du club' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Choisir les joueurs' }))
    await user.type(dialogue.getByLabelText('Rechercher'), 'dur')
    expect(dialogue.queryByRole('checkbox', { name: /Martin/ })).not.toBeInTheDocument()
    await user.click(await dialogue.findByRole('checkbox', { name: /Léa Durand/ }))
    await user.clear(dialogue.getByLabelText('Rechercher'))
    await user.click(dialogue.getByRole('checkbox', { name: /Chloé Martin/ }))
    expect(dialogue.getByText('2 / 14 joueurs')).toBeInTheDocument()
    await user.click(dialogue.getByRole('button', { name: 'Valider' }))

    expect(groupeA.getByLabelText('Nom joueur 1')).toHaveValue('Durand')
    expect(groupeA.getByLabelText('Nom joueur 2')).toHaveValue('Martin')
    await user.type(groupeA.getByLabelText('N° joueur 1'), '4')
    await user.type(groupeA.getByLabelText('N° joueur 2'), '7')
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    await waitFor(() => expect(onDemarre).toHaveBeenCalledTimes(1))
    const match = await lireMatch(onDemarre.mock.calls[0][0])
    expect(match?.equipes.A.joueurs.map((j) => [j.numero, j.licence])).toEqual([
      [4, '033_00000102'],
      [7, '033_00000101'],
    ])
  })
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/preparation`
Expected : FAIL (`choisirClub` / `appliquerSelection` non exportés, sélecteur « Club » introuvable).

- [ ] **Step 4 : Étendre le brouillon**

Dans `src/ui/preparation/brouillon.ts` :

1. Ajouter l'import `import type { Club, Licencie } from '../../domain/club'`.
2. Dans `interface JoueurBrouillon`, après `id: string`, ajouter :

```ts
  /** Licencié du pool d'origine ; null pour une ligne saisie à la main. */
  licencieId: string | null
```

3. Dans `interface BrouillonEquipe`, après `couleur: string`, ajouter :

```ts
  clubId: string | null
```

4. Remplacer `joueurBrouillonVide` et `brouillonVide` par :

```ts
export function joueurBrouillonVide(): JoueurBrouillon {
  return { id: nouvelId(), licencieId: null, numero: '', nom: '', prenom: '', licence: '', civilite: null }
}

export function brouillonVide(): BrouillonEquipe {
  return {
    nom: '',
    couleur: '',
    clubId: null,
    joueurs: [joueurBrouillonVide()],
    modeCoach: 'aucun',
    coachJoueurId: '',
    coachNomLibre: '',
  }
}
```

5. Remplacer `function estVide(` par `export function estVide(` (corps inchangé).

6. Ajouter à la fin du fichier :

```ts
export function choisirClub(brouillon: BrouillonEquipe, club: Club | null): BrouillonEquipe {
  if (!club) return { ...brouillon, clubId: null }
  return {
    ...brouillon,
    clubId: club.id,
    nom: brouillon.nom.trim() ? brouillon.nom : club.nom,
    couleur: brouillon.couleur.trim() ? brouillon.couleur : club.couleurParDefaut,
  }
}

/** Les lignes venues du pool suivent les cases cochées ; les lignes saisies à la main restent. */
export function appliquerSelection(
  brouillon: BrouillonEquipe,
  licencies: Licencie[],
  idsChoisis: ReadonlySet<string>,
): BrouillonEquipe {
  const gardees = brouillon.joueurs.filter(
    (joueur) => !estVide(joueur) && (joueur.licencieId === null || idsChoisis.has(joueur.licencieId)),
  )
  const presents = new Set(gardees.map((joueur) => joueur.licencieId))
  const ajoutees = licencies
    .filter((licencie) => idsChoisis.has(licencie.id) && !presents.has(licencie.id))
    .map((licencie) => ({
      id: nouvelId(),
      licencieId: licencie.id,
      numero: '',
      nom: licencie.nom,
      prenom: licencie.prenom,
      licence: licencie.licence,
      civilite: licencie.civilite,
    }))
  return { ...brouillon, joueurs: [...gardees, ...ajoutees] }
}
```

- [ ] **Step 5 : Implémenter le dialogue de sélection**

`src/ui/preparation/DialogueSelection.tsx` :

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { libelleLicencie, type Licencie } from '../../domain/club'
import { REGLES } from '../../domain/config'
import { listerLicencies } from '../../storage/clubs'
import { Dialogue } from '../commun/Dialogue'
import { estVide, type BrouillonEquipe } from './brouillon'

interface Props {
  clubId: string
  brouillon: BrouillonEquipe
  onValider: (licencies: Licencie[], ids: Set<string>) => void
  onFermer: () => void
}

const normaliser = (texte: string) =>
  texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export function DialogueSelection({ clubId, brouillon, onValider, onFermer }: Props) {
  const licencies = useLiveQuery(() => listerLicencies(clubId), [clubId])
  const [ids, setIds] = useState(
    () => new Set(brouillon.joueurs.flatMap((joueur) => (joueur.licencieId ? [joueur.licencieId] : []))),
  )
  const [recherche, setRecherche] = useState('')

  const manuels = brouillon.joueurs.filter((joueur) => joueur.licencieId === null && !estVide(joueur)).length
  const total = manuels + ids.size
  const plein = total >= REGLES.joueursMax
  const filtre = normaliser(recherche.trim())
  const visibles = (licencies ?? []).filter(
    (licencie) => !filtre || normaliser(`${licencie.prenom} ${licencie.nom} ${licencie.licence}`).includes(filtre),
  )

  const basculer = (id: string) =>
    setIds((avant) => {
      const suivant = new Set(avant)
      if (suivant.has(id)) {
        suivant.delete(id)
      } else {
        suivant.add(id)
      }
      return suivant
    })

  return (
    <Dialogue
      titre="Choisir les joueurs"
      actions={
        <>
          <button className="btn btn-principal" onClick={() => onValider(licencies ?? [], ids)}>
            Valider
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Rechercher
        <input value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </label>
      <p className="sous-titre">
        {total} / {REGLES.joueursMax} joueurs
      </p>
      {licencies?.length === 0 && <p>Aucun licencié dans ce club.</p>}
      <ul className="liste-selection">
        {visibles.map((licencie) => (
          <li key={licencie.id}>
            <label className="case">
              <input
                type="checkbox"
                checked={ids.has(licencie.id)}
                disabled={!ids.has(licencie.id) && plein}
                onChange={() => basculer(licencie.id)}
              />
              {libelleLicencie(licencie)}
              {licencie.licence && <small> {licencie.licence}</small>}
            </label>
          </li>
        ))}
      </ul>
    </Dialogue>
  )
}
```

- [ ] **Step 6 : Ajouter le club et la sélection à l'éditeur d'équipe**

Remplacer `src/ui/preparation/EditeurEquipe.tsx` par :

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { REGLES } from '../../domain/config'
import { verifierEquipe } from '../../domain/equipe'
import type { Civilite } from '../../domain/types'
import { listerClubs } from '../../storage/clubs'
import {
  appliquerSelection,
  brouillonVersEquipe,
  choisirClub,
  joueurBrouillonVide,
  type BrouillonEquipe,
  type JoueurBrouillon,
} from './brouillon'
import { DialogueSelection } from './DialogueSelection'

interface Props {
  titre: string
  valeur: BrouillonEquipe
  onChange: (brouillon: BrouillonEquipe) => void
  afficherErreurs: boolean
}

function libelleJoueur(joueur: JoueurBrouillon, index: number): string {
  const morceaux = [joueur.numero.trim() ? `n°${joueur.numero.trim()}` : '', joueur.prenom.trim(), joueur.nom.trim()]
  return morceaux.filter(Boolean).join(' ') || `Joueur ${index + 1}`
}

export function EditeurEquipe({ titre, valeur, onChange, afficherErreurs }: Props) {
  const clubs = useLiveQuery(() => listerClubs(), [])
  const [selection, setSelection] = useState(false)
  const maj = (modification: Partial<BrouillonEquipe>) => onChange({ ...valeur, ...modification })
  const majJoueur = (id: string, modification: Partial<JoueurBrouillon>) =>
    maj({ joueurs: valeur.joueurs.map((j) => (j.id === id ? { ...j, ...modification } : j)) })

  const equipe = brouillonVersEquipe(valeur)
  const verification = verifierEquipe(equipe)
  const valeurCoach = valeur.modeCoach === 'joueur' ? valeur.coachJoueurId : valeur.modeCoach

  return (
    <fieldset className="editeur-equipe">
      <legend>{titre}</legend>
      <label>
        Club
        <select
          value={valeur.clubId ?? ''}
          onChange={(e) => onChange(choisirClub(valeur, clubs?.find((club) => club.id === e.target.value) ?? null))}
        >
          <option value="">Saisie libre</option>
          {clubs?.map((club) => (
            <option key={club.id} value={club.id}>
              {club.nom}
            </option>
          ))}
        </select>
      </label>
      <div className="actions-equipe">
        <button type="button" className="btn" disabled={!valeur.clubId} onClick={() => setSelection(true)}>
          Choisir les joueurs du club
        </button>
      </div>
      <label>
        Nom de l'équipe
        <input value={valeur.nom} onChange={(e) => maj({ nom: e.target.value })} />
      </label>
      <label>
        Couleur
        <input value={valeur.couleur} onChange={(e) => maj({ couleur: e.target.value })} />
      </label>

      <table className="table-joueurs">
        <thead>
          <tr>
            <th>N°</th>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Licence</th>
            <th>F/H</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {valeur.joueurs.map((joueur, index) => (
            <tr key={joueur.id}>
              <td>
                <input
                  className="champ-numero"
                  aria-label={`N° joueur ${index + 1}`}
                  inputMode="numeric"
                  value={joueur.numero}
                  onChange={(e) => majJoueur(joueur.id, { numero: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Nom joueur ${index + 1}`}
                  value={joueur.nom}
                  onChange={(e) => majJoueur(joueur.id, { nom: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Prénom joueur ${index + 1}`}
                  value={joueur.prenom}
                  onChange={(e) => majJoueur(joueur.id, { prenom: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`Licence joueur ${index + 1}`}
                  value={joueur.licence}
                  onChange={(e) => majJoueur(joueur.id, { licence: e.target.value })}
                />
              </td>
              <td>
                <select
                  aria-label={`Civilité joueur ${index + 1}`}
                  value={joueur.civilite ?? ''}
                  onChange={(e) =>
                    majJoueur(joueur.id, { civilite: e.target.value === '' ? null : (e.target.value as Civilite) })
                  }
                >
                  <option value="">?</option>
                  <option value="Mme">F</option>
                  <option value="M">H</option>
                </select>
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn-discret"
                  aria-label={`Retirer joueur ${index + 1}`}
                  onClick={() => maj({ joueurs: valeur.joueurs.filter((j) => j.id !== joueur.id) })}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        className="btn"
        disabled={valeur.joueurs.length >= REGLES.joueursMax}
        onClick={() => maj({ joueurs: [...valeur.joueurs, joueurBrouillonVide()] })}
      >
        Ajouter un joueur
      </button>

      <label>
        Coach
        <select
          value={valeurCoach}
          onChange={(e) => {
            const choix = e.target.value
            if (choix === 'aucun' || choix === 'libre') maj({ modeCoach: choix })
            else maj({ modeCoach: 'joueur', coachJoueurId: choix })
          }}
        >
          <option value="aucun">Aucun</option>
          {valeur.joueurs.map((joueur, index) => (
            <option key={joueur.id} value={joueur.id}>
              {libelleJoueur(joueur, index)}
            </option>
          ))}
          <option value="libre">Autre personne…</option>
        </select>
      </label>
      {valeur.modeCoach === 'libre' && (
        <label>
          Nom du coach
          <input value={valeur.coachNomLibre} onChange={(e) => maj({ coachNomLibre: e.target.value })} />
        </label>
      )}

      {equipe.joueurs.length > 0 && verification.avertissements.length > 0 && (
        <ul className="avertissements">
          {verification.avertissements.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {afficherErreurs && verification.erreurs.length > 0 && (
        <ul className="erreurs">
          {verification.erreurs.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {selection && valeur.clubId && (
        <DialogueSelection
          clubId={valeur.clubId}
          brouillon={valeur}
          onValider={(licencies, ids) => {
            onChange(appliquerSelection(valeur, licencies, ids))
            setSelection(false)
          }}
          onFermer={() => setSelection(false)}
        />
      )}
    </fieldset>
  )
}
```

Note : la ligne `else maj({ modeCoach: 'joueur', coachJoueurId: choix })` existait déjà (instruction `if … else` sur deux lignes, conforme).

- [ ] **Step 7 : Ajouter les styles**

À la fin de `src/styles.css` :

```css
.liste-selection {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 50dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.case {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  color: var(--texte);
  min-height: 44px;
}

.case input {
  width: 22px;
  height: 22px;
  min-height: 0;
}
```

- [ ] **Step 8 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck && npm run lint`
Expected : tous les tests PASS (dont 4 + 1 nouveaux ; les tests existants de préparation, d'App et l'aide `remplirEquipe` passent sans modification), sortie propre.

- [ ] **Step 9 : Commit**

```bash
git add src/ui/preparation src/styles.css
git commit -m "feat(preparation): Ajout de la composition de l'équipe depuis le pool d'un club"
```

---

### Task 7 : Format de partage d'une équipe (code, lien, QR)

**Files:**
- Create: `src/roster-share/format.ts`, `src/roster-share/qr.ts`
- Modify: `src/ui/preparation/brouillon.ts`, `package.json`, `package-lock.json`
- Test: `src/roster-share/format.test.ts`, `src/roster-share/qr.test.ts`, `src/ui/preparation/brouillon.test.ts` (ajouts)

**Interfaces:**
- Consumes : `Civilite`, `REGLES` ; `BrouillonEquipe`, `lireNumero`, `estVide`, `nouvelId` (brouillon / domaine).
- Produces :
  - `format.ts` : `VERSION_FORMAT_EQUIPE = 1`, `PARAMETRE_LIEN = 'equipe'`, `CODE_NON_RECONNU`, `CODE_TROP_RECENT`, `interface JoueurPartage { licence; nom; prenom; civilite: Civilite; numero: number | null }`, `type CoachPartage = { type: 'joueur'; index: number } | { type: 'libre'; nom: string } | null`, `interface EquipePartagee { nom; couleur; joueurs: JoueurPartage[]; coach: CoachPartage }`, `class ErreurCodeEquipe extends Error`, `encoderEquipe(equipe): string`, `decoderEquipe(code): EquipePartagee`, `lienEquipe(code: string, adresseApp: string): string`, `extraireCode(saisie: string): string | null`, `lireCodeEquipe(saisie: string): EquipePartagee`.
  - `qr.ts` : `NIVEAU_CORRECTION_QR = 'L'`, `qrSvg(texte: string): Promise<string>`, `versionQr(texte: string): number`.
  - `brouillon.ts` : `brouillonVersPartage(brouillon: BrouillonEquipe): EquipePartagee`, `partageVersBrouillon(equipe: EquipePartagee): BrouillonEquipe`.

Choix (mesuré) : 14 joueurs aux noms distincts et accentués donnent un lien d'environ 640 caractères une fois compressé, soit un QR de version 17 au niveau de correction L (20 en M). Un QR affiché sur écran ne s'abîme pas : le niveau L suffit et garde des modules plus gros, donc plus faciles à scanner.

- [ ] **Step 1 : Installer les dépendances**

```bash
npm install qrcode@^1.5.4 fflate@^0.8.3
npm install -D @types/qrcode@^1.5.6
```

- [ ] **Step 2 : Écrire les tests (ils doivent échouer)**

`src/roster-share/format.test.ts` :

```ts
import { deflateSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import {
  CODE_NON_RECONNU,
  CODE_TROP_RECENT,
  decoderEquipe,
  encoderEquipe,
  ErreurCodeEquipe,
  extraireCode,
  lienEquipe,
  lireCodeEquipe,
  type EquipePartagee,
} from './format'

const EQUIPE: EquipePartagee = {
  nom: 'SAINT DELPHIN BASKET',
  couleur: 'Vert',
  joueurs: [
    { licence: '033_1', nom: 'Lefèvre', prenom: 'Bérénice', civilite: 'Mme', numero: 4 },
    { licence: '', nom: 'Noël', prenom: 'Raphaël', civilite: 'M', numero: null },
    { licence: '033_3', nom: 'Petit', prenom: '', civilite: null, numero: 0 },
  ],
  coach: { type: 'joueur', index: 1 },
}

const base64Url = (octets: Uint8Array) =>
  btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('encodage d’une équipe', () => {
  it('fait un aller-retour sans perte (accents, n° absent, coach)', () => {
    expect(decoderEquipe(encoderEquipe(EQUIPE))).toEqual(EQUIPE)
    expect(decoderEquipe(encoderEquipe({ ...EQUIPE, coach: { type: 'libre', nom: 'Morgan F.' } })).coach).toEqual({
      type: 'libre',
      nom: 'Morgan F.',
    })
    expect(decoderEquipe(encoderEquipe({ ...EQUIPE, coach: null })).coach).toBeNull()
  })

  it('produit un code utilisable dans une URL', () => {
    expect(encoderEquipe(EQUIPE)).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('refuse un code tronqué ou quelconque', () => {
    const code = encoderEquipe(EQUIPE)
    expect(() => decoderEquipe(code.slice(0, -6))).toThrow(ErreurCodeEquipe)
    expect(() => decoderEquipe('bonjour')).toThrow(CODE_NON_RECONNU)
  })

  it('refuse un contenu valide en apparence mais mal formé', () => {
    const forge = (objet: unknown) => base64Url(deflateSync(strToU8(JSON.stringify(objet))))
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: 5, j: [] }))).toThrow(CODE_NON_RECONNU)
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: null, j: [['', 'A', 'B', 'Z', 4]] }))).toThrow(
      CODE_NON_RECONNU,
    )
    expect(() => decoderEquipe(forge({ v: 1, n: 'X', c: '', k: null, j: [['', 'A', 'B', 'F', 100]] }))).toThrow(
      CODE_NON_RECONNU,
    )
  })

  it("demande une mise à jour pour un code d'une version plus récente", () => {
    const code = base64Url(deflateSync(strToU8(JSON.stringify({ v: 2, n: 'X', c: '', k: null, j: [] }))))
    expect(() => decoderEquipe(code)).toThrow(CODE_TROP_RECENT)
  })
})

describe('liens et saisie tolérante', () => {
  const code = encoderEquipe(EQUIPE)
  const lien = lienEquipe(code, 'https://exemple.org/table/')

  it('place le code dans le fragment du lien', () => {
    expect(lien).toBe(`https://exemple.org/table/#equipe=${code}`)
  })

  it('extrait le code d’un lien, d’un code seul, ou d’un texte coupé par des retours à la ligne', () => {
    expect(extraireCode(lien)).toBe(code)
    expect(extraireCode(`  ${code}\n`)).toBe(code)
    expect(extraireCode(`${code.slice(0, 20)}\n${code.slice(20)}`)).toBe(code)
    expect(extraireCode('Voici notre équipe !')).toBeNull()
    expect(extraireCode('   ')).toBeNull()
  })

  it('lit directement un lien collé, et explique un échec', () => {
    expect(lireCodeEquipe(lien)).toEqual(EQUIPE)
    expect(() => lireCodeEquipe('Voici notre équipe !')).toThrow(CODE_NON_RECONNU)
  })
})
```

`src/roster-share/qr.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { encoderEquipe, lienEquipe, type EquipePartagee } from './format'
import { qrSvg, versionQr } from './qr'

const NOMS = [
  ['Delahaye', 'Bérénice'],
  ['Lefèvre', 'Anne-Sophie'],
  ['Nguyen', 'Thi Hoa'],
  ['Martin-Gauthier', 'Maëlle'],
  ['Rousseau', 'Noël'],
  ['Benali', 'Yanis'],
  ['Fontaine', 'Clément'],
  ['Garcia', 'Inès'],
  ['Dubois-Lacroix', 'Jean-François'],
  ['Moreau', 'Léonie'],
  ['Lambert', 'Théo'],
  ['Chevalier', 'Zoé'],
  ['Girard', 'Raphaël'],
  ['Bonnet', 'Océane'],
]

describe('QR code', () => {
  it('tient dans un QR facile à scanner (version ≤ 18) pour 14 joueurs aux noms accentués', () => {
    const equipe: EquipePartagee = {
      nom: 'SAINT DELPHIN BASKET',
      couleur: 'Vert et blanc',
      coach: { type: 'libre', nom: 'Camille Lefebvre-Ducasse' },
      joueurs: NOMS.map(([nom, prenom], i) => ({
        licence: `033_${10000101 + i * 7919}`,
        nom,
        prenom,
        civilite: i % 3 === 0 ? 'Mme' : 'M',
        numero: (i * 7) % 100,
      })),
    }
    const lien = lienEquipe(encoderEquipe(equipe), 'https://basket-ufolep33.example.org/table-de-marque/')
    expect(versionQr(lien)).toBeLessThanOrEqual(18)
  })

  it('produit un SVG', async () => {
    expect(await qrSvg('https://exemple.org/#equipe=abc')).toContain('<svg')
  })
})
```

Ajouter à la fin de `src/ui/preparation/brouillon.test.ts` (imports : `brouillonVersPartage, partageVersBrouillon` depuis `./brouillon`) :

```ts
describe('conversion pour le partage', () => {
  it('convertit un brouillon : n° vides ou invalides → null, coach par position, lignes vides ignorées', () => {
    const b: BrouillonEquipe = {
      ...brouillonVide(),
      nom: ' SD ',
      couleur: 'Vert',
      joueurs: [
        { id: 'x', licencieId: null, numero: '07', nom: 'Martin', prenom: 'Chloé', licence: '033_1', civilite: 'Mme' },
        { id: 'vide', licencieId: null, numero: '', nom: '', prenom: '', licence: '', civilite: null },
        { id: 'y', licencieId: 'lic', numero: 'abc', nom: 'Petit', prenom: 'Hugo', licence: '', civilite: 'M' },
      ],
      modeCoach: 'joueur',
      coachJoueurId: 'y',
    }
    expect(brouillonVersPartage(b)).toEqual({
      nom: 'SD',
      couleur: 'Vert',
      joueurs: [
        { licence: '033_1', nom: 'Martin', prenom: 'Chloé', civilite: 'Mme', numero: 7 },
        { licence: '', nom: 'Petit', prenom: 'Hugo', civilite: 'M', numero: null },
      ],
      coach: { type: 'joueur', index: 1 },
    })
  })

  it('reconstruit un brouillon prêt à compléter', () => {
    const b = partageVersBrouillon({
      nom: 'GRADIGNAN',
      couleur: 'Noir',
      joueurs: [
        { licence: '033_5', nom: 'Bernard', prenom: 'Jade', civilite: 'Mme', numero: 5 },
        { licence: '033_8', nom: 'Moreau', prenom: 'Sam', civilite: 'M', numero: null },
      ],
      coach: { type: 'joueur', index: 0 },
    })
    expect(b.clubId).toBeNull()
    expect(b.joueurs.map((j) => [j.numero, j.nom, j.licencieId])).toEqual([
      ['5', 'Bernard', null],
      ['', 'Moreau', null],
    ])
    expect(b.modeCoach).toBe('joueur')
    expect(b.coachJoueurId).toBe(b.joueurs[0].id)
    expect(partageVersBrouillon({ nom: 'X', couleur: '', joueurs: [], coach: { type: 'libre', nom: 'Max' } })).toMatchObject({
      modeCoach: 'libre',
      coachNomLibre: 'Max',
    })
  })
})
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/roster-share src/ui/preparation/brouillon.test.ts`
Expected : FAIL (« Failed to resolve import "./format" », conversions non exportées).

- [ ] **Step 4 : Implémenter le format**

`src/roster-share/format.ts` :

```ts
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import { REGLES } from '../domain/config'
import type { Civilite } from '../domain/types'

export const VERSION_FORMAT_EQUIPE = 1
export const PARAMETRE_LIEN = 'equipe'
export const CODE_NON_RECONNU = "Code non reconnu : vérifiez qu'il a été copié en entier."
export const CODE_TROP_RECENT = "Ce code vient d'une version plus récente de l'application : mettez-la à jour."

export interface JoueurPartage {
  licence: string
  nom: string
  prenom: string
  civilite: Civilite
  numero: number | null
}

/** Le coach joueur est désigné par sa position dans `joueurs` (les ids ne voyagent pas). */
export type CoachPartage = { type: 'joueur'; index: number } | { type: 'libre'; nom: string } | null

export interface EquipePartagee {
  nom: string
  couleur: string
  joueurs: JoueurPartage[]
  coach: CoachPartage
}

export class ErreurCodeEquipe extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErreurCodeEquipe'
  }
}

type CiviliteCompacte = 'F' | 'H' | ''
/** [licence, nom, prénom, civilité, n° (-1 = non attribué)] */
type JoueurCompact = [string, string, string, CiviliteCompacte, number]

interface EquipeCompacte {
  v: number
  n: string
  c: string
  k: number | string | null
  j: JoueurCompact[]
}

const versCompacte = (civilite: Civilite): CiviliteCompacte => {
  if (civilite === 'Mme') return 'F'
  if (civilite === 'M') return 'H'
  return ''
}

const depuisCompacte = (civilite: CiviliteCompacte): Civilite => {
  if (civilite === 'F') return 'Mme'
  if (civilite === 'H') return 'M'
  return null
}

function versBase64Url(octets: Uint8Array): string {
  let binaire = ''
  for (const octet of octets) binaire += String.fromCharCode(octet)
  return btoa(binaire).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function depuisBase64Url(texte: string): Uint8Array {
  const base64 = texte.replace(/-/g, '+').replace(/_/g, '/')
  const binaire = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return Uint8Array.from(binaire, (c) => c.charCodeAt(0))
}

export function encoderEquipe(equipe: EquipePartagee): string {
  let coach: EquipeCompacte['k'] = null
  if (equipe.coach?.type === 'joueur') coach = equipe.coach.index
  if (equipe.coach?.type === 'libre') coach = equipe.coach.nom
  const compacte: EquipeCompacte = {
    v: VERSION_FORMAT_EQUIPE,
    n: equipe.nom,
    c: equipe.couleur,
    k: coach,
    j: equipe.joueurs.map((j) => [j.licence, j.nom, j.prenom, versCompacte(j.civilite), j.numero ?? -1]),
  }
  return versBase64Url(deflateSync(strToU8(JSON.stringify(compacte)), { level: 9 }))
}

function estJoueurCompact(valeur: unknown): valeur is JoueurCompact {
  if (!Array.isArray(valeur) || valeur.length !== 5) return false
  const [licence, nom, prenom, civilite, numero] = valeur
  return (
    typeof licence === 'string' &&
    typeof nom === 'string' &&
    typeof prenom === 'string' &&
    (civilite === 'F' || civilite === 'H' || civilite === '') &&
    Number.isInteger(numero) &&
    (numero === -1 || (numero >= REGLES.numeroMin && numero <= REGLES.numeroMax))
  )
}

function estEquipeCompacte(valeur: unknown): valeur is EquipeCompacte {
  if (typeof valeur !== 'object' || valeur === null) return false
  const e = valeur as Partial<EquipeCompacte>
  if (e.v !== VERSION_FORMAT_EQUIPE || typeof e.n !== 'string' || typeof e.c !== 'string') return false
  if (!Array.isArray(e.j) || !e.j.every(estJoueurCompact)) return false
  if (e.k === null || typeof e.k === 'string') return true
  return typeof e.k === 'number' && Number.isInteger(e.k) && e.k >= 0 && e.k < e.j.length
}

export function decoderEquipe(code: string): EquipePartagee {
  let brut: unknown
  try {
    brut = JSON.parse(strFromU8(inflateSync(depuisBase64Url(code))))
  } catch {
    throw new ErreurCodeEquipe(CODE_NON_RECONNU)
  }
  const version = typeof brut === 'object' && brut !== null ? (brut as { v?: unknown }).v : undefined
  if (typeof version === 'number' && version > VERSION_FORMAT_EQUIPE) throw new ErreurCodeEquipe(CODE_TROP_RECENT)
  if (!estEquipeCompacte(brut)) throw new ErreurCodeEquipe(CODE_NON_RECONNU)

  let coach: CoachPartage = null
  if (typeof brut.k === 'number') coach = { type: 'joueur', index: brut.k }
  if (typeof brut.k === 'string') coach = { type: 'libre', nom: brut.k }
  return {
    nom: brut.n,
    couleur: brut.c,
    joueurs: brut.j.map(([licence, nom, prenom, civilite, numero]) => ({
      licence,
      nom,
      prenom,
      civilite: depuisCompacte(civilite),
      numero: numero === -1 ? null : numero,
    })),
    coach,
  }
}

export function lienEquipe(code: string, adresseApp: string): string {
  return `${adresseApp}#${PARAMETRE_LIEN}=${code}`
}

/** Accepte un lien complet ou le code seul, même coupé par des espaces ou des retours à la ligne. */
export function extraireCode(saisie: string): string | null {
  const texte = saisie.replace(/\s+/g, '')
  if (!texte) return null
  const dansLien = new RegExp(`[#?&]${PARAMETRE_LIEN}=([A-Za-z0-9_-]+)`).exec(texte)
  if (dansLien) return dansLien[1]
  return /^[A-Za-z0-9_-]+$/.test(texte) ? texte : null
}

export function lireCodeEquipe(saisie: string): EquipePartagee {
  const code = extraireCode(saisie)
  if (code === null) throw new ErreurCodeEquipe(CODE_NON_RECONNU)
  return decoderEquipe(code)
}
```

`src/roster-share/qr.ts` :

```ts
import QRCode from 'qrcode'

/** Un QR affiché sur un écran ne s'abîme pas : le niveau L garde des modules plus gros, plus faciles à scanner. */
export const NIVEAU_CORRECTION_QR = 'L'

export function qrSvg(texte: string): Promise<string> {
  return QRCode.toString(texte, { type: 'svg', errorCorrectionLevel: NIVEAU_CORRECTION_QR, margin: 2 })
}

export function versionQr(texte: string): number {
  return QRCode.create(texte, { errorCorrectionLevel: NIVEAU_CORRECTION_QR }).version
}
```

Note : import par défaut (`import QRCode from 'qrcode'`), car `qrcode` est un module CommonJS ; un import nommé peut échouer sous Vitest. Si `tsc` refuse l'import par défaut, ajouter `"allowSyntheticDefaultImports": true` dans `compilerOptions` de `tsconfig.app.json` et le signaler comme écart.

- [ ] **Step 5 : Implémenter les conversions du brouillon**

Dans `src/ui/preparation/brouillon.ts`, ajouter l'import `import type { EquipePartagee } from '../../roster-share/format'` puis, à la fin du fichier :

```ts
export function brouillonVersPartage(brouillon: BrouillonEquipe): EquipePartagee {
  const lignes = brouillon.joueurs.filter((joueur) => !estVide(joueur))
  let coach: EquipePartagee['coach'] = null
  const indexCoach = lignes.findIndex((joueur) => joueur.id === brouillon.coachJoueurId)
  if (brouillon.modeCoach === 'joueur' && indexCoach !== -1) coach = { type: 'joueur', index: indexCoach }
  if (brouillon.modeCoach === 'libre' && brouillon.coachNomLibre.trim()) {
    coach = { type: 'libre', nom: brouillon.coachNomLibre.trim() }
  }
  return {
    nom: brouillon.nom.trim(),
    couleur: brouillon.couleur.trim(),
    joueurs: lignes.map((joueur) => {
      const numero = lireNumero(joueur.numero)
      return {
        licence: joueur.licence.trim(),
        nom: joueur.nom.trim(),
        prenom: joueur.prenom.trim(),
        civilite: joueur.civilite,
        numero: Number.isNaN(numero) ? null : numero,
      }
    }),
    coach,
  }
}

export function partageVersBrouillon(equipe: EquipePartagee): BrouillonEquipe {
  const joueurs: JoueurBrouillon[] = equipe.joueurs.map((joueur) => ({
    id: nouvelId(),
    licencieId: null,
    numero: joueur.numero === null ? '' : String(joueur.numero),
    nom: joueur.nom,
    prenom: joueur.prenom,
    licence: joueur.licence,
    civilite: joueur.civilite,
  }))
  const brouillon: BrouillonEquipe = {
    nom: equipe.nom,
    couleur: equipe.couleur,
    clubId: null,
    joueurs: joueurs.length > 0 ? joueurs : [joueurBrouillonVide()],
    modeCoach: 'aucun',
    coachJoueurId: '',
    coachNomLibre: '',
  }
  if (equipe.coach?.type === 'joueur' && joueurs[equipe.coach.index]) {
    return { ...brouillon, modeCoach: 'joueur', coachJoueurId: joueurs[equipe.coach.index].id }
  }
  if (equipe.coach?.type === 'libre') return { ...brouillon, modeCoach: 'libre', coachNomLibre: equipe.coach.nom }
  return brouillon
}
```

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck && npm run lint && npm run build`
Expected : tous les tests PASS (dont 8 + 2 + 2 nouveaux), build OK.

- [ ] **Step 7 : Commit**

```bash
git add src/roster-share src/ui/preparation/brouillon.ts src/ui/preparation/brouillon.test.ts package.json package-lock.json
git commit -m "feat(partage): Ajout du format compact d'équipe partagée (code, lien, QR)"
```

---

### Task 8 : Partager une équipe (QR, lien, code)

**Files:**
- Create: `src/ui/partage/adresse.ts`, `src/ui/partage/DialoguePartage.tsx`, `src/ui/partage/EcranPartage.tsx`
- Modify: `src/ui/preparation/EditeurEquipe.tsx`, `src/ui/Accueil.tsx`, `src/App.tsx`, `src/styles.css`
- Test: `src/ui/partage/DialoguePartage.test.tsx`

**Interfaces:**
- Consumes : `encoderEquipe`, `decoderEquipe`, `lienEquipe`, `EquipePartagee` (Task 7), `qrSvg`, `brouillonVersPartage`, `brouillonVide` ; `Dialogue`, `pluriel`.
- Produces :
  - `adresseApp(): string` (`origin + pathname` courant).
  - `DialoguePartage({ equipe: EquipePartagee; onFermer })` : titre « Partager l'équipe », image `role="img"` nommée « QR code de l'équipe », boutons « Copier le lien », « Copier le code », « Partager… » (si partage natif), zone « Code de l'équipe » en lecture seule, message `role="status"`.
  - `EditeurEquipe` : bouton « Partager cette équipe » (actif quand l'équipe a un nom et au moins un joueur).
  - `EcranPartage({ onRetour })` : titre « Partager une équipe », un `EditeurEquipe` « Équipe à partager ».
  - Accueil : prop `onPartager: () => void`, bouton « Partager une équipe ». App : écran `{ nom: 'partage' }`.

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/ui/partage/DialoguePartage.test.tsx` :

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { decoderEquipe, type EquipePartagee } from '../../roster-share/format'
import { remplirEquipe } from '../../test/remplirEquipe'
import { DialoguePartage } from './DialoguePartage'

const EQUIPE: EquipePartagee = {
  nom: 'GRADIGNAN',
  couleur: 'Noir',
  joueurs: [
    { licence: '033_5', nom: 'Bernard', prenom: 'Jade', civilite: 'Mme', numero: 5 },
    { licence: '033_8', nom: 'Moreau', prenom: 'Sam', civilite: 'M', numero: null },
  ],
  coach: null,
}

describe('DialoguePartage', () => {
  it('affiche le QR code et un code qui redonne l’équipe', async () => {
    render(<DialoguePartage equipe={EQUIPE} onFermer={vi.fn()} />)
    expect(screen.getByText('GRADIGNAN — 2 joueurs')).toBeInTheDocument()
    const qr = await screen.findByRole('img', { name: "QR code de l'équipe" })
    expect(qr.innerHTML).toContain('<svg')
    const code = (screen.getByLabelText("Code de l'équipe") as HTMLTextAreaElement).value
    expect(decoderEquipe(code)).toEqual(EQUIPE)
  })

  it('copie le lien de l’équipe', async () => {
    const user = userEvent.setup()
    render(<DialoguePartage equipe={EQUIPE} onFermer={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Copier le lien' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Lien copié.')
    expect(await navigator.clipboard.readText()).toMatch(/#equipe=[A-Za-z0-9_-]+$/)
  })

  it('propose de copier le code à la main si le presse-papiers est refusé', async () => {
    const user = userEvent.setup()
    render(<DialoguePartage equipe={EQUIPE} onFermer={vi.fn()} />)
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('refus'))
    await user.click(screen.getByRole('button', { name: 'Copier le code' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Copie impossible : sélectionnez le code ci-dessous.')
  })
})

describe('Partager une équipe depuis l’accueil', () => {
  it('compose une équipe sans démarrer de match puis la partage', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Partager une équipe' }))
    const groupe = within(screen.getByRole('group', { name: 'Équipe à partager' }))
    expect(groupe.getByRole('button', { name: 'Partager cette équipe' })).toBeDisabled()
    await remplirEquipe(user, 'Équipe à partager', 'GRADIGNAN', [
      { numero: '5', nom: 'Bernard', civilite: 'Mme' },
      { numero: '8', nom: 'Moreau', civilite: 'M' },
    ])
    await user.click(groupe.getByRole('button', { name: 'Partager cette équipe' }))
    const dialogue = within(screen.getByRole('dialog', { name: "Partager l'équipe" }))
    expect(dialogue.getByText('GRADIGNAN — 2 joueurs')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/partage`
Expected : FAIL (« Failed to resolve import "./DialoguePartage" »).

- [ ] **Step 3 : Implémenter le dialogue de partage**

`src/ui/partage/adresse.ts` :

```ts
/** Base des liens d'équipe : l'adresse de l'app, sans fragment. */
export function adresseApp(): string {
  return `${window.location.origin}${window.location.pathname}`
}
```

`src/ui/partage/DialoguePartage.tsx` :

```tsx
import { useEffect, useState } from 'react'
import { encoderEquipe, lienEquipe, type EquipePartagee } from '../../roster-share/format'
import { qrSvg } from '../../roster-share/qr'
import { Dialogue } from '../commun/Dialogue'
import { pluriel } from '../format'
import { adresseApp } from './adresse'

interface Props {
  equipe: EquipePartagee
  onFermer: () => void
}

export function DialoguePartage({ equipe, onFermer }: Props) {
  const [code] = useState(() => encoderEquipe(equipe))
  const lien = lienEquipe(code, adresseApp())
  const [svg, setSvg] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let actif = true
    qrSvg(lien)
      .then((resultat) => {
        if (actif) setSvg(resultat)
      })
      .catch(() => {
        if (actif) setMessage('QR code impossible à générer : utilisez le lien ou le code.')
      })
    return () => {
      actif = false
    }
  }, [lien])

  async function copier(texte: string, confirmation: string) {
    try {
      await navigator.clipboard.writeText(texte)
      setMessage(confirmation)
    } catch {
      setMessage('Copie impossible : sélectionnez le code ci-dessous.')
    }
  }

  const partageNatif = typeof navigator.share === 'function'

  return (
    <Dialogue
      titre="Partager l'équipe"
      actions={
        <button className="btn" onClick={onFermer}>
          Fermer
        </button>
      }
    >
      <p>
        {equipe.nom} — {pluriel(equipe.joueurs.length, 'joueur')}
      </p>
      {svg ? (
        <div className="qr" role="img" aria-label="QR code de l'équipe" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="chargement">Préparation du QR code…</p>
      )}
      <div className="actions-equipe">
        <button className="btn" onClick={() => void copier(lien, 'Lien copié.')}>
          Copier le lien
        </button>
        <button className="btn" onClick={() => void copier(code, 'Code copié.')}>
          Copier le code
        </button>
        {partageNatif && (
          <button
            className="btn"
            onClick={() => void navigator.share({ title: `Équipe ${equipe.nom}`, url: lien }).catch(() => undefined)}
          >
            Partager…
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      <label>
        Code de l'équipe
        <textarea readOnly rows={3} value={code} onFocus={(e) => e.target.select()} />
      </label>
    </Dialogue>
  )
}
```

`src/ui/partage/EcranPartage.tsx` :

```tsx
import { useState } from 'react'
import { brouillonVide } from '../preparation/brouillon'
import { EditeurEquipe } from '../preparation/EditeurEquipe'

export function EcranPartage({ onRetour }: { onRetour: () => void }) {
  const [equipe, setEquipe] = useState(brouillonVide)
  return (
    <section className="ecran partage">
      <header className="entete">
        <h1>Partager une équipe</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      <p className="sous-titre">
        Composez l'équipe du match, attribuez les n° si vous les connaissez, puis partagez-la avec la table de marque.
      </p>
      <EditeurEquipe titre="Équipe à partager" valeur={equipe} onChange={setEquipe} afficherErreurs={false} />
    </section>
  )
}
```

- [ ] **Step 4 : Ajouter le bouton à l'éditeur d'équipe**

Dans `src/ui/preparation/EditeurEquipe.tsx` :

1. Ajouter les imports `import { DialoguePartage } from '../partage/DialoguePartage'` et compléter l'import de `./brouillon` avec `brouillonVersPartage`.
2. Après `const [selection, setSelection] = useState(false)`, ajouter :

```tsx
  const [partage, setPartage] = useState(false)
```

3. Après la ligne `const valeurCoach = …`, ajouter :

```tsx
  const peutPartager = valeur.nom.trim() !== '' && equipe.joueurs.length > 0
```

4. Dans `<div className="actions-equipe">`, après le bouton « Choisir les joueurs du club », ajouter :

```tsx
        <button type="button" className="btn" disabled={!peutPartager} onClick={() => setPartage(true)}>
          Partager cette équipe
        </button>
```

5. Juste avant `</fieldset>`, ajouter :

```tsx
      {partage && <DialoguePartage equipe={brouillonVersPartage(valeur)} onFermer={() => setPartage(false)} />}
```

- [ ] **Step 5 : Brancher l'écran dans l'accueil et l'app, et styler le QR**

Dans `src/ui/Accueil.tsx` :
1. Dans `interface Props`, après `onClubs: () => void`, ajouter `onPartager: () => void`.
2. Remplacer `export function Accueil({ onNouveauMatch, onReprendre, onClubs }: Props) {` par `export function Accueil({ onNouveauMatch, onReprendre, onClubs, onPartager }: Props) {`.
3. Après le bouton « Clubs et licenciés », ajouter :

```tsx
      <button className="btn" onClick={onPartager}>
        Partager une équipe
      </button>
```

Dans `src/App.tsx` :
1. Ajouter l'import `import { EcranPartage } from './ui/partage/EcranPartage'`.
2. Dans le type `Ecran`, après `| { nom: 'clubs' }`, ajouter `| { nom: 'partage' }`.
3. Dans `<Accueil … />`, après `onClubs={() => setEcran({ nom: 'clubs' })}`, ajouter `onPartager={() => setEcran({ nom: 'partage' })}`.
4. Après la ligne de rendu de `EcranClubs`, ajouter :

```tsx
      {ecran.nom === 'partage' && <EcranPartage onRetour={allerAccueil} />}
```

À la fin de `src/styles.css` :

```css
.qr {
  display: grid;
  place-items: center;
}

.qr svg {
  width: min(80vw, 340px);
  height: auto;
  background: #fff;
  border-radius: 8px;
}
```

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck && npm run lint`
Expected : tous les tests PASS (dont 4 nouveaux), sortie propre.

- [ ] **Step 7 : Commit**

```bash
git add src/ui/partage src/ui/preparation/EditeurEquipe.tsx src/ui/Accueil.tsx src/App.tsx src/styles.css
git commit -m "feat(partage): Ajout du partage d'une équipe par QR code, lien ou code"
```

---

### Task 9 : Importer une équipe (scan, code collé, fichier)

**Files:**
- Create: `src/ui/import/scanner.ts`, `src/ui/import/ScannerQr.tsx`, `src/ui/import/ApercuEquipe.tsx`, `src/ui/import/ImportEquipe.tsx`
- Modify: `src/ui/preparation/EditeurEquipe.tsx`, `src/styles.css`, `package.json`, `package-lock.json`
- Test: `src/ui/import/ImportEquipe.test.tsx`

**Interfaces:**
- Consumes : `lireCodeEquipe`, `encoderEquipe`, `lienEquipe`, `EquipePartagee`, `CODE_NON_RECONNU` (Task 7) ; `partageVersBrouillon`, `estVide` ; `lireTexte` (Task 5) ; `Dialogue`, `pluriel`.
- Produces :
  - `scanner.ts` : `interface ControleScanner { arreter: () => void }`, `demarrerScanner(video: HTMLVideoElement, surCode: (texte: string) => void): Promise<ControleScanner>` (caméra arrière, @zxing/browser).
  - `ScannerQr({ onCode, onErreur })` ; `MESSAGE_CAMERA`.
  - `ApercuEquipe({ equipe })` : nom, couleur, liste `aria-label="Joueurs de {nom}"`, coach.
  - `ImportEquipe({ onImporter: (equipe: EquipePartagee) => void; onFermer: () => void; remplacement?: boolean })` : dialogue « Importer une équipe » (bouton « Scanner le QR code », zone « Coller le lien ou le code », bouton « Lire le code », champ fichier « Choisir un fichier »), puis dialogue « Équipe reçue » (boutons « Utiliser cette équipe » / « Retour », avertissement « L'équipe déjà saisie sera remplacée. » si `remplacement`).
  - `EditeurEquipe` : bouton « Importer une équipe (QR / code) » qui remplace le brouillon.

- [ ] **Step 1 : Installer la lecture de QR**

```bash
npm install @zxing/browser@^0.2.1 @zxing/library@^0.23.0
```

- [ ] **Step 2 : Écrire les tests (ils doivent échouer)**

`src/ui/import/ImportEquipe.test.tsx` :

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { encoderEquipe, lienEquipe, type EquipePartagee } from '../../roster-share/format'
import { PreparationMatch } from '../preparation/PreparationMatch'
import { ImportEquipe } from './ImportEquipe'
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
```

Note : l'avertissement de remplacement n'apparaît que s'il y a quelque chose à perdre (nom d'équipe ou ligne de joueur remplie) ; c'est pourquoi le test saisit d'abord un nom pour l'équipe B.

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/import`
Expected : FAIL (« Failed to resolve import "./ImportEquipe" »).

- [ ] **Step 4 : Implémenter l'adaptateur caméra et l'aperçu caméra**

`src/ui/import/scanner.ts` :

```ts
import { BrowserQRCodeReader } from '@zxing/browser'

export interface ControleScanner {
  arreter: () => void
}

/** Caméra arrière (deviceId absent → facingMode « environment »), décodage continu jusqu'à l'arrêt. */
export async function demarrerScanner(
  video: HTMLVideoElement,
  surCode: (texte: string) => void,
): Promise<ControleScanner> {
  const lecteur = new BrowserQRCodeReader()
  const controles = await lecteur.decodeFromVideoDevice(undefined, video, (resultat) => {
    if (resultat) surCode(resultat.getText())
  })
  return { arreter: () => controles.stop() }
}
```

`src/ui/import/ScannerQr.tsx` :

```tsx
import { useEffect, useRef } from 'react'
import { demarrerScanner } from './scanner'

export const MESSAGE_CAMERA =
  'Caméra indisponible ou refusée : collez le lien ou le code, ou choisissez un fichier.'

interface Props {
  onCode: (texte: string) => void
  onErreur: (message: string) => void
}

export function ScannerQr({ onCode, onErreur }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const rappels = useRef({ onCode, onErreur })

  useEffect(() => {
    rappels.current = { onCode, onErreur }
  })

  useEffect(() => {
    const element = video.current
    if (!element) return
    let actif = true
    let arreter: (() => void) | null = null
    demarrerScanner(element, (texte) => {
      if (actif) rappels.current.onCode(texte)
    })
      .then((controle) => {
        if (actif) {
          arreter = controle.arreter
        } else {
          controle.arreter()
        }
      })
      .catch(() => {
        if (actif) rappels.current.onErreur(MESSAGE_CAMERA)
      })
    return () => {
      actif = false
      arreter?.()
    }
  }, [])

  return <video ref={video} className="video-scanner" aria-label="Aperçu de la caméra" muted playsInline />
}
```

Note : le cas « code reçu pendant le démarrage » (le test simule un `surCode` synchrone avant la résolution) arrête la caméra via la branche `controle.arreter()` quand le composant est déjà démonté.

- [ ] **Step 5 : Implémenter l'aperçu et le dialogue d'import**

`src/ui/import/ApercuEquipe.tsx` :

```tsx
import type { EquipePartagee, JoueurPartage } from '../../roster-share/format'

const nomJoueur = (joueur: JoueurPartage) => [joueur.prenom, joueur.nom].filter(Boolean).join(' ') || joueur.licence

export function ApercuEquipe({ equipe }: { equipe: EquipePartagee }) {
  let coach: string | null = null
  if (equipe.coach?.type === 'libre') coach = equipe.coach.nom
  if (equipe.coach?.type === 'joueur') coach = nomJoueur(equipe.joueurs[equipe.coach.index])
  return (
    <div className="apercu-equipe">
      <p>
        <strong>{equipe.nom}</strong>
        {equipe.couleur && ` — ${equipe.couleur}`}
      </p>
      <ul className="liste-joueurs" aria-label={`Joueurs de ${equipe.nom}`}>
        {equipe.joueurs.map((joueur, index) => (
          <li key={index}>
            {joueur.numero === null ? 'n° à attribuer' : `n°${joueur.numero}`} {nomJoueur(joueur)}
          </li>
        ))}
      </ul>
      {coach && <p>Coach : {coach}</p>}
    </div>
  )
}
```

`src/ui/import/ImportEquipe.tsx` :

```tsx
import { useState } from 'react'
import { lireCodeEquipe, type EquipePartagee } from '../../roster-share/format'
import { Dialogue } from '../commun/Dialogue'
import { lireTexte } from '../commun/fichiers'
import { ApercuEquipe } from './ApercuEquipe'
import { ScannerQr } from './ScannerQr'

interface Props {
  onImporter: (equipe: EquipePartagee) => void
  onFermer: () => void
  /** Vrai quand une équipe déjà saisie sera remplacée. */
  remplacement?: boolean
}

export function ImportEquipe({ onImporter, onFermer, remplacement = false }: Props) {
  const [saisie, setSaisie] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [scan, setScan] = useState(false)
  const [equipe, setEquipe] = useState<EquipePartagee | null>(null)

  function lire(texte: string) {
    try {
      setEquipe(lireCodeEquipe(texte))
      setErreur(null)
      setScan(false)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    }
  }

  async function lireFichier(fichier: File | undefined) {
    if (!fichier) return
    try {
      lire(await lireTexte(fichier))
    } catch {
      setErreur('Lecture du fichier impossible.')
    }
  }

  if (equipe) {
    return (
      <Dialogue
        titre="Équipe reçue"
        actions={
          <>
            <button className="btn btn-principal" onClick={() => onImporter(equipe)}>
              Utiliser cette équipe
            </button>
            <button className="btn" onClick={() => setEquipe(null)}>
              Retour
            </button>
          </>
        }
      >
        <ApercuEquipe equipe={equipe} />
        {remplacement && <p className="avertissements">L'équipe déjà saisie sera remplacée.</p>}
      </Dialogue>
    )
  }

  return (
    <Dialogue
      titre="Importer une équipe"
      actions={
        <button className="btn" onClick={onFermer}>
          Annuler
        </button>
      }
    >
      {scan ? (
        <ScannerQr
          onCode={lire}
          onErreur={(message) => {
            setScan(false)
            setErreur(message)
          }}
        />
      ) : (
        <button
          className="btn btn-principal"
          onClick={() => {
            setErreur(null)
            setScan(true)
          }}
        >
          Scanner le QR code
        </button>
      )}
      <label>
        Coller le lien ou le code
        <textarea rows={3} value={saisie} onChange={(e) => setSaisie(e.target.value)} />
      </label>
      <button className="btn" disabled={!saisie.trim()} onClick={() => lire(saisie)}>
        Lire le code
      </button>
      <label className="btn">
        Choisir un fichier
        <input
          type="file"
          accept=".txt,text/plain"
          className="masque"
          onChange={(e) => {
            void lireFichier(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>
      {erreur && (
        <p role="alert" className="erreurs">
          {erreur}
        </p>
      )}
    </Dialogue>
  )
}
```

- [ ] **Step 6 : Ajouter l'import à l'éditeur d'équipe**

Dans `src/ui/preparation/EditeurEquipe.tsx` :

1. Ajouter l'import `import { ImportEquipe } from '../import/ImportEquipe'` et compléter l'import de `./brouillon` avec `estVide` et `partageVersBrouillon`.
2. Après `const [partage, setPartage] = useState(false)`, ajouter :

```tsx
  const [importation, setImportation] = useState(false)
  const dejaSaisie = valeur.nom.trim() !== '' || valeur.joueurs.some((joueur) => !estVide(joueur))
```

3. Dans `<div className="actions-equipe">`, après le bouton « Partager cette équipe », ajouter :

```tsx
        <button type="button" className="btn" onClick={() => setImportation(true)}>
          Importer une équipe (QR / code)
        </button>
```

4. Juste avant `</fieldset>`, ajouter :

```tsx
      {importation && (
        <ImportEquipe
          remplacement={dejaSaisie}
          onImporter={(equipeRecue) => {
            onChange(partageVersBrouillon(equipeRecue))
            setImportation(false)
          }}
          onFermer={() => setImportation(false)}
        />
      )}
```

À la fin de `src/styles.css` :

```css
.video-scanner {
  width: 100%;
  max-height: 50dvh;
  background: #000;
  border-radius: 8px;
}
```

- [ ] **Step 7 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck && npm run lint && npm run build`
Expected : tous les tests PASS (dont 6 nouveaux), build OK (le chunk @zxing est précaché par le service worker).

- [ ] **Step 8 : Commit**

```bash
git add src/ui/import src/ui/preparation/EditeurEquipe.tsx src/styles.css package.json package-lock.json
git commit -m "feat(partage): Ajout de l'import d'une équipe par scan, code collé ou fichier"
```

---

### Task 10 : Équipe reçue par lien, accueil et préparation pré-remplie

**Files:**
- Create: `src/ui/import/lienEquipe.ts`, `src/ui/import/EcranEquipeRecue.tsx`
- Modify: `src/main.tsx`, `src/App.tsx` (remplacé en entier), `src/ui/Accueil.tsx`, `src/ui/preparation/PreparationMatch.tsx`
- Test: `src/ui/import/lienEquipe.test.ts`, `src/App.test.tsx` (ajouts)

**Interfaces:**
- Consumes : `PARAMETRE_LIEN`, `extraireCode`, `lireCodeEquipe`, `encoderEquipe`, `EquipePartagee` (Task 7) ; `ApercuEquipe`, `ImportEquipe` (Task 9) ; `partageVersBrouillon`, `BrouillonEquipe` ; `EquipeId`.
- Produces :
  - `lireEtEffacerCodeEquipe(adresse?: Location, historique?: History): string | null` — renvoie le code (ou le fragment brut s'il est illisible) et retire le fragment de l'adresse.
  - `EcranEquipeRecue({ codeInitial: string | null; onUtiliser: (cote: EquipeId, equipe: EquipePartagee) => void; onRetour })` : titre « Équipe reçue », boutons « Nouveau match : en équipe A » / « … en équipe B », « Copier le code » (si ouverte par un lien).
  - `PreparationMatch` : prop facultative `equipesInitiales?: Partial<Record<EquipeId, BrouillonEquipe>>`.
  - `App({ codeEquipe?: string | null })` ; Accueil : prop `onImporter`, bouton « Importer une équipe ».

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/ui/import/lienEquipe.test.ts` :

```ts
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
```

Ajouter dans `src/App.test.tsx` (imports : `encoderEquipe` depuis `./roster-share/format`) :

```tsx
const CODE_GRADIGNAN = encoderEquipe({
  nom: 'GRADIGNAN',
  couleur: 'Noir',
  joueurs: [
    { licence: '033_5', nom: 'Bernard', prenom: 'Jade', civilite: 'Mme', numero: 5 },
    { licence: '033_8', nom: 'Moreau', prenom: 'Sam', civilite: 'M', numero: 8 },
  ],
  coach: null,
})

describe('équipe reçue par lien', () => {
  it("ouvre l'écran Équipe reçue même pendant un match, puis prépare un match avec l'équipe en B", async () => {
    await enregistrerMatch(matchDeTest(panier('A', 'a7', 2)))
    const user = userEvent.setup()
    render(<App codeEquipe={CODE_GRADIGNAN} />)
    expect(await screen.findByRole('heading', { name: 'Équipe reçue' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Joueurs de GRADIGNAN' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Nouveau match : en équipe B' }))
    const groupeB = within(await screen.findByRole('group', { name: 'Équipe B' }))
    expect(groupeB.getByLabelText("Nom de l'équipe")).toHaveValue('GRADIGNAN')
    expect(groupeB.getByLabelText('N° joueur 2')).toHaveValue('8')
    await user.click(screen.getByRole('button', { name: 'Retour' }))
    expect(await screen.findByRole('button', { name: /Reprendre le match en cours/ })).toBeInTheDocument()
  })

  it('explique un lien illisible et propose les autres moyens', async () => {
    render(<App codeEquipe="#equipe=%%%" />)
    expect(await screen.findByRole('heading', { name: 'Équipe reçue' })).toBeInTheDocument()
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Code non reconnu')
    expect(screen.getByRole('dialog', { name: 'Importer une équipe' })).toBeInTheDocument()
  })

  it("propose de copier le code quand le lien s'est ouvert dans le navigateur", async () => {
    const user = userEvent.setup()
    render(<App codeEquipe={CODE_GRADIGNAN} />)
    await user.click(await screen.findByRole('button', { name: 'Copier le code' }))
    expect(await navigator.clipboard.readText()).toBe(CODE_GRADIGNAN)
  })

  it("importe une équipe depuis l'accueil", async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Importer une équipe' }))
    await user.type(screen.getByLabelText('Coller le lien ou le code'), CODE_GRADIGNAN)
    await user.click(screen.getByRole('button', { name: 'Lire le code' }))
    await user.click(screen.getByRole('button', { name: 'Utiliser cette équipe' }))
    await user.click(await screen.findByRole('button', { name: 'Nouveau match : en équipe A' }))
    const groupeA = within(await screen.findByRole('group', { name: 'Équipe A' }))
    expect(groupeA.getByLabelText("Nom de l'équipe")).toHaveValue('GRADIGNAN')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/import/lienEquipe.test.ts src/App.test.tsx`
Expected : FAIL (module `./lienEquipe` introuvable ; prop `codeEquipe` ignorée).

- [ ] **Step 3 : Implémenter la lecture du lien et l'écran « Équipe reçue »**

`src/ui/import/lienEquipe.ts` :

```ts
import { extraireCode, PARAMETRE_LIEN } from '../../roster-share/format'

/** Lu une seule fois au démarrage (main.tsx), puis retiré de l'adresse pour qu'un rechargement ne le rejoue pas. */
export function lireEtEffacerCodeEquipe(
  adresse: Location = window.location,
  historique: History = window.history,
): string | null {
  const fragment = adresse.hash
  if (!fragment.includes(`${PARAMETRE_LIEN}=`)) return null
  historique.replaceState(null, '', adresse.pathname + adresse.search)
  return extraireCode(fragment) ?? fragment
}
```

`src/ui/import/EcranEquipeRecue.tsx` :

```tsx
import { useState } from 'react'
import { lireCodeEquipe, type EquipePartagee } from '../../roster-share/format'
import type { EquipeId } from '../../domain/types'
import { ApercuEquipe } from './ApercuEquipe'
import { ImportEquipe } from './ImportEquipe'

interface Props {
  codeInitial: string | null
  onUtiliser: (cote: EquipeId, equipe: EquipePartagee) => void
  onRetour: () => void
}

function lectureInitiale(code: string | null): { equipe: EquipePartagee | null; erreur: string | null } {
  if (code === null) return { equipe: null, erreur: null }
  try {
    return { equipe: lireCodeEquipe(code), erreur: null }
  } catch (e) {
    return { equipe: null, erreur: e instanceof Error ? e.message : String(e) }
  }
}

export function EcranEquipeRecue({ codeInitial, onUtiliser, onRetour }: Props) {
  const [initiale] = useState(() => lectureInitiale(codeInitial))
  const [equipe, setEquipe] = useState<EquipePartagee | null>(initiale.equipe)
  const [message, setMessage] = useState<string | null>(null)

  async function copierCode() {
    if (codeInitial === null) return
    try {
      await navigator.clipboard.writeText(codeInitial)
      setMessage('Code copié.')
    } catch {
      setMessage(`Copie impossible. Code : ${codeInitial}`)
    }
  }

  return (
    <section className="ecran equipe-recue">
      <header className="entete">
        <h1>Équipe reçue</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      {initiale.erreur && !equipe && (
        <p role="alert" className="erreurs">
          {initiale.erreur}
        </p>
      )}
      {equipe ? (
        <>
          <ApercuEquipe equipe={equipe} />
          <div className="actions-equipe">
            <button className="btn btn-principal" onClick={() => onUtiliser('A', equipe)}>
              Nouveau match : en équipe A
            </button>
            <button className="btn btn-principal" onClick={() => onUtiliser('B', equipe)}>
              Nouveau match : en équipe B
            </button>
          </div>
          {initiale.equipe && (
            <div className="note-lien">
              <p className="sous-titre">
                Ce lien s'est peut-être ouvert dans le navigateur plutôt que dans l'application installée. Dans ce cas,
                copiez le code puis, dans l'application, choisissez « Importer une équipe ».
              </p>
              <button className="btn" onClick={() => void copierCode()}>
                Copier le code
              </button>
              {message && <p role="status">{message}</p>}
            </div>
          )}
        </>
      ) : (
        <ImportEquipe onImporter={setEquipe} onFermer={onRetour} />
      )}
    </section>
  )
}
```

- [ ] **Step 4 : Pré-remplir la préparation**

Dans `src/ui/preparation/PreparationMatch.tsx` :

1. Ajouter les imports `import type { EquipeId } from '../../domain/types'` et compléter l'import de `./brouillon` avec `type BrouillonEquipe`.
2. Dans `interface Props`, ajouter :

```tsx
  equipesInitiales?: Partial<Record<EquipeId, BrouillonEquipe>>
```

3. Remplacer `export function PreparationMatch({ onDemarre, onRetour }: Props) {` par :

```tsx
export function PreparationMatch({ onDemarre, onRetour, equipesInitiales }: Props) {
```

4. Remplacer les deux lignes `useState(brouillonVide)` des équipes par :

```tsx
  const [equipeA, setEquipeA] = useState(() => equipesInitiales?.A ?? brouillonVide())
  const [equipeB, setEquipeB] = useState(() => equipesInitiales?.B ?? brouillonVide())
```

- [ ] **Step 5 : Accueil, App et main**

Dans `src/ui/Accueil.tsx` :
1. Dans `interface Props`, après `onPartager: () => void`, ajouter `onImporter: () => void`.
2. Remplacer la ligne de déclaration par `export function Accueil({ onNouveauMatch, onReprendre, onClubs, onPartager, onImporter }: Props) {`.
3. Après le bouton « Partager une équipe », ajouter :

```tsx
      <button className="btn" onClick={onImporter}>
        Importer une équipe
      </button>
```

Remplacer `src/App.tsx` par :

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { EquipeId } from './domain/types'
import { matchEnCours } from './storage/matchs'
import { Accueil } from './ui/Accueil'
import { EcranClubs } from './ui/clubs/EcranClubs'
import { EcranEquipeRecue } from './ui/import/EcranEquipeRecue'
import { MiseAJour } from './ui/MiseAJour'
import { EcranPartage } from './ui/partage/EcranPartage'
import { partageVersBrouillon, type BrouillonEquipe } from './ui/preparation/brouillon'
import { PreparationMatch } from './ui/preparation/PreparationMatch'
import { EcranMatch } from './ui/saisie/EcranMatch'

type Ecran =
  | { nom: 'chargement' }
  | { nom: 'accueil' }
  | { nom: 'preparation'; initiales?: Partial<Record<EquipeId, BrouillonEquipe>> }
  | { nom: 'match'; matchId: string }
  | { nom: 'clubs' }
  | { nom: 'partage' }
  | { nom: 'equipeRecue'; code: string | null }

interface Props {
  /** Code d'équipe lu dans l'adresse au démarrage (lien partagé). */
  codeEquipe?: string | null
}

export default function App({ codeEquipe = null }: Props) {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'chargement' })
  const enCours = useLiveQuery(() => matchEnCours(), [])
  // Recharger ne doit jamais interrompre un match ni perdre le formulaire de préparation.
  const miseAJourAutorisee = ecran.nom === 'accueil' && !enCours

  useEffect(() => {
    if (codeEquipe !== null) {
      setEcran({ nom: 'equipeRecue', code: codeEquipe })
      return
    }
    let actif = true
    matchEnCours()
      .then((match) => {
        if (actif) setEcran(match ? { nom: 'match', matchId: match.id } : { nom: 'accueil' })
      })
      .catch(() => {
        if (actif) setEcran({ nom: 'accueil' })
      })
    return () => {
      actif = false
    }
  }, [codeEquipe])

  const allerAccueil = () => setEcran({ nom: 'accueil' })
  const ouvrirMatch = (matchId: string) => setEcran({ nom: 'match', matchId })

  return (
    <main className="app">
      {ecran.nom === 'chargement' && <p className="chargement">Chargement…</p>}
      {ecran.nom === 'accueil' && (
        <Accueil
          onNouveauMatch={() => setEcran({ nom: 'preparation' })}
          onReprendre={ouvrirMatch}
          onClubs={() => setEcran({ nom: 'clubs' })}
          onPartager={() => setEcran({ nom: 'partage' })}
          onImporter={() => setEcran({ nom: 'equipeRecue', code: null })}
        />
      )}
      {ecran.nom === 'preparation' && (
        <PreparationMatch onDemarre={ouvrirMatch} onRetour={allerAccueil} equipesInitiales={ecran.initiales} />
      )}
      {ecran.nom === 'match' && <EcranMatch key={ecran.matchId} matchId={ecran.matchId} onAccueil={allerAccueil} />}
      {ecran.nom === 'clubs' && <EcranClubs onRetour={allerAccueil} />}
      {ecran.nom === 'partage' && <EcranPartage onRetour={allerAccueil} />}
      {ecran.nom === 'equipeRecue' && (
        <EcranEquipeRecue
          codeInitial={ecran.code}
          onRetour={allerAccueil}
          onUtiliser={(cote, equipe) =>
            setEcran({ nom: 'preparation', initiales: { [cote]: partageVersBrouillon(equipe) } })
          }
        />
      )}
      <MiseAJour autorisee={miseAJourAutorisee} />
    </main>
  )
}
```

Dans `src/main.tsx` :
1. Ajouter l'import `import { lireEtEffacerCodeEquipe } from './ui/import/lienEquipe'`.
2. Remplacer `<App />` par `<App codeEquipe={lireEtEffacerCodeEquipe()} />`.

Note : le code est lu dans `main.tsx`, une seule fois, et pas dans un effet ni un initialiseur d'état : en mode strict, React rejoue ces derniers en développement et le second passage trouverait une adresse déjà nettoyée.

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck && npm run lint && npm run build`
Expected : tous les tests PASS (dont 3 + 4 nouveaux ; les tests existants d'App passent), build OK.

- [ ] **Step 7 : Commit**

```bash
git add src/ui/import src/ui/Accueil.tsx src/ui/preparation/PreparationMatch.tsx src/App.tsx src/App.test.tsx src/main.tsx
git commit -m "feat(partage): Ajout de l'écran Équipe reçue, du lien direct et de la préparation pré-remplie"
```

---

### Task 11 : Tests de bout en bout du plan 2

**Files:**
- Create: `e2e/licencies-equipes.spec.ts`
- Modify: `e2e/match.spec.ts` (uniquement si un libellé du plan 1 a changé — normalement aucun)

**Interfaces:**
- Consumes : libellés des Tasks 4 à 10 ; `encoderEquipe`, `lienEquipe` (importés depuis `../src/roster-share/format` par le test Playwright).
- Produces : 2 parcours de bout en bout sur les 3 formats d'écran.

- [ ] **Step 1 : Écrire les parcours**

`e2e/licencies-equipes.spec.ts` :

```ts
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
  await page.goto('/')
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
  await equipeA.getByLabel('Club', { exact: true }).selectOption({ label: 'SAINT DELPHIN BASKET' })
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
  await page.goto(`/#equipe=${CODE_GRADIGNAN}`)
  await expect(page.getByRole('heading', { name: 'Équipe reçue' })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('button', { name: 'Nouveau match : en équipe B' }).click()
  await expect(page.getByRole('group', { name: 'Équipe B' }).getByLabel("Nom de l'équipe")).toHaveValue('GRADIGNAN')
})
```

- [ ] **Step 2 : Lancer les tests de bout en bout**

Run : `npm run e2e`
Expected : les 2 nouveaux parcours PASS sur les 3 formats (6), plus les tests du plan 1 (4 PASS, 2 SKIP).

Si un sélecteur échoue pour une raison de test (libellé partiel, élément hors écran sur téléphone), corriger le test au plus juste et le signaler. Si c'est un défaut de l'app, ne pas le masquer : le signaler.

- [ ] **Step 3 : Vérification finale complète**

Run : `npm run test:run && npm run typecheck && npm run lint && npm run build && npm run e2e`
Expected : tout PASS.

- [ ] **Step 4 : Recette manuelle (à faire par l'utilisateur)**

1. `npm run build && npm run preview -- --host`, ouvrir sur deux téléphones/tablettes du même Wi-Fi.
2. Sur l'appareil « visiteur » : Partager une équipe → afficher le QR.
3. Sur l'appareil « table » : Nouveau match → Équipe B → Importer une équipe (QR / code) → Scanner le QR code. Vérifier que la caméra s'ouvre (HTTPS requis hors localhost : la caméra peut être refusée en `http://` sur le réseau local ; dans ce cas utiliser « Copier le lien » + coller, et noter que le scan sera recetté au plan 4 avec l'hébergement HTTPS).
4. Importer le vrai export Webaffiligue du club (non anonymisé) et vérifier noms et accents.

- [ ] **Step 5 : Commit**

```bash
git add e2e/licencies-equipes.spec.ts
git commit -m "test(e2e): Ajout des parcours licenciés, pool et partage d'équipe"
```

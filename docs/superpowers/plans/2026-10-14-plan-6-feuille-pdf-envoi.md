# Plan 6 — Feuille de match PDF et envoi par e-mail : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En fin de match, produire la feuille de match en PDF (une page, aux couleurs de l'app) et préparer l'e-mail au comité (`cd.33@ufolep.org`) et au coach adverse, avec saisie facultative des officiels.

**Architecture:** Un nouveau module pur `src/pdf/` compose d'abord un **modèle** de feuille (données, testables sans PDF) puis le **dessine** avec pdf-lib et la police Manrope embarquée. L'interface (`src/ui/saisie/`) charge pdf-lib et les polices à la demande, partage ou télécharge le fichier, et ouvre un lien `mailto:` pré-rempli ; le PDF est joint à la main. Le domaine gagne une commande `definirOfficiels` et la constante `ADRESSE_COMITE`.

**Tech Stack:** existant (TypeScript ~6.0, React 19, Vite 8, Dexie 4, Vitest 5 + Testing Library, Playwright, oxlint) + `pdf-lib` ^1.17.1 et `@pdf-lib/fontkit` ^1.1.1 (nouvelles dépendances).

**Spec:** `docs/superpowers/specs/2026-10-14-feuille-pdf-envoi-design.md` (spec parente : `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`).

**Point de départ :** créer la branche `feat/feuille-pdf-envoi` depuis `dev` (qui contient la spec) : `git switch -c feat/feuille-pdf-envoi dev`.

## Global Constraints

- Node `^22.22.2 || ^24.15.0 || >=26` (champ `engines`). Sous Node 22.14, npm affiche EBADENGINE : connu et accepté.
- Nouvelles dépendances **uniquement** `pdf-lib` et `@pdf-lib/fontkit`. Elles sont chargées à la demande (`import()` dynamique) : jamais importées statiquement depuis `src/ui/`.
- Aucun nouveau champ dans `Match` (`officiels: Officiels` existe déjà). `versionFormat` reste à `1`. Aucune nouvelle version du schéma Dexie.
- Le domaine (`src/domain/`) n'importe ni React, ni Dexie, ni rien de `src/ui/` ni de `src/pdf/`. `src/pdf/` n'importe que `src/domain/` et pdf-lib : aucun React, aucun `fetch`, aucun accès au DOM.
- L'adresse du comité n'existe que dans `src/domain/config.ts` : `ADRESSE_COMITE = 'cd.33@ufolep.org'`.
- L'e-mail du coach adverse n'est **jamais** enregistré (état local de l'écran).
- Feuille A4 portrait, une page (seconde page tolérée dans le cas extrême 14 joueurs × 2 et prolongations), police Manrope, couleurs de `src/styles/jetons.css` recopiées dans `src/pdf/couleurs.ts` (seule exception autorisée, vérifiée par test).
- Nom de fichier `AAAA-MM-JJ_EquipeA-EquipeB.pdf` (slug sans accent ni espace ; « equipe » si vide ; « sans-date » si la date manque).
- Libellés exacts de l'interface : « Officiels et capitaines », « E-mail du coach adverse (facultatif) », « Adresse e-mail invalide », « Enregistrer le PDF », « Préparation… », « Préparer l'e-mail », « Feuille impossible à générer », « Fermer ».
- Aucune couleur littérale hors de `src/styles/jetons.css` dans le CSS. Contraste texte / fond ≥ 4,5:1 (vérifié par `src/styles/styles.test.ts`).
- Interface en français. Identifiants du code en français. Style : guillemets simples, pas de points-virgules, indentation 2 espaces ; chaînes contenant une apostrophe en guillemets doubles.
- Commits : Conventional Commits en français, titre en forme nominale, `git add` par chemins explicites (jamais `-A` / `.`), aucun trailer `Co-authored-by`, aucun lien de session. Commiter librement sur `feat/feuille-pdf-envoi` ; jamais de push ni de merge sans demande.
- Avant chaque commit : `npm run typecheck && npm run lint && npm run test:run` verts.

## Review Focus

1. **Nom d'équipe ou de joueur avec un caractère hors police** (emoji, symbole) : la feuille se génère quand même, le caractère devient « ? ». → test « remplace les caractères hors police » dans la Task 6.
2. **Nom d'équipe très long** (« ESAL – Entente Sportive Audenge Lanton ») : coupé avec « … », jamais de texte qui déborde sur la colonne voisine ni de plantage. → test « tronque les textes trop longs sans lever » dans la Task 6.
3. **14 joueurs par équipe et deux prolongations** : lignes réduites, tout reste lisible, au pire une seconde page propre avec pied de page « Page 2/2 ». → test « tient sur une ou deux pages avec 14 joueurs et deux prolongations » dans la Task 6.
4. **Date de match absente ou mal formée** : ni « Invalid Date » sur la feuille ni dans l'e-mail ; fichier `sans-date_…`. → tests « ignore une date absente ou mal formée » (Task 3) et « nomme le fichier » (Task 5).
5. **Partage natif annoncé puis refusé** (`canShare` vrai, `share` rejette autre chose qu'`AbortError`) : repli silencieux sur le téléchargement. → test « se replie sur le téléchargement si le partage échoue » dans la Task 7.

---

### Task 1: Domaine — adresse du comité et commande `definirOfficiels`

**Files:**
- Modify: `src/domain/config.ts`
- Modify: `src/domain/commandes.ts`
- Test: `src/domain/commandes.test.ts`

**Interfaces:**
- Consumes: `Officiels`, `OFFICIELS_VIDES` (`src/domain/match.ts`).
- Produces :
  - `ADRESSE_COMITE: 'cd.33@ufolep.org'` exporté par `src/domain/config.ts` ;
  - `definirOfficiels(match: Match, officiels: Officiels): Match` exporté par `src/domain/commandes.ts`.

- [ ] **Step 1: Write the failing test**

Dans `src/domain/commandes.test.ts`, compléter les imports (ajouter `definirOfficiels` à l'import de `./commandes`, et `OFFICIELS_VIDES` depuis `./match`), puis ajouter en fin de fichier :

```ts
describe('definirOfficiels', () => {
  it('enregistre les officiels rognés sans toucher aux événements', () => {
    const match = matchDeTest(panier('A', 'a7', 2))
    const suivant = definirOfficiels(match, { ...OFFICIELS_VIDES, arbitre: '  Camille R. ', capitaineA: 'Dominique' })
    expect(suivant.officiels).toEqual({ ...OFFICIELS_VIDES, arbitre: 'Camille R.', capitaineA: 'Dominique' })
    expect(suivant.evenements).toBe(match.evenements)
    expect(match.officiels).toEqual(OFFICIELS_VIDES)
  })

  it('renvoie le même objet si rien ne change', () => {
    const match = definirOfficiels(matchDeTest(), { ...OFFICIELS_VIDES, arbitre: 'Camille R.' })
    expect(definirOfficiels(match, { ...OFFICIELS_VIDES, arbitre: ' Camille R.' })).toBe(match)
  })
})
```

Si `panier` ou `matchDeTest` ne sont pas encore importés depuis `../test/fixtures`, les ajouter.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/commandes.test.ts`
Expected: FAIL — `definirOfficiels` n'est pas exporté.

- [ ] **Step 3: Write minimal implementation**

Dans `src/domain/config.ts`, ajouter à la fin :

```ts
/** Adresse à laquelle la feuille de match est retournée, imprimée sur la feuille officielle. */
export const ADRESSE_COMITE = 'cd.33@ufolep.org'
```

Dans `src/domain/commandes.ts`, remplacer les imports de `./match` et `./types` par :

```ts
import { nouvelId, OFFICIELS_VIDES } from './match'
import { choixFinPeriode, periodeSuivante, type ChoixFinPeriode } from './periodes'
import type { EquipeId, Evenement, Match, NouvelEvenement, Officiels } from './types'
```

et ajouter en fin de fichier :

```ts
/** Les officiels ne sont pas des événements : le journal, « Annuler » et les corrections les ignorent. */
export function definirOfficiels(match: Match, officiels: Officiels): Match {
  const cles = Object.keys(OFFICIELS_VIDES) as (keyof Officiels)[]
  const rognes = Object.fromEntries(cles.map((cle) => [cle, officiels[cle].trim()])) as Officiels
  if (cles.every((cle) => rognes[cle] === match.officiels[cle])) return match
  return { ...match, officiels: rognes }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/commandes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/domain/config.ts src/domain/commandes.ts src/domain/commandes.test.ts
git commit -m "feat(domaine): Commande de saisie des officiels et adresse du comité"
```

---

### Task 2: Dépendances pdf-lib, polices partagées et build

**Files:**
- Move: `scripts/guide/polices/` → `src/pdf/polices/` (4 fichiers : `Manrope-Regular.ttf`, `Manrope-Bold.ttf`, `Manrope-ExtraBold.ttf`, `OFL.txt`)
- Modify: `scripts/guide/generer-docx.cjs:5` et `:282`
- Modify: `package.json`, `package-lock.json`
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: rien.
- Produces : les polices à `src/pdf/polices/Manrope-Regular.ttf` et `src/pdf/polices/Manrope-Bold.ttf` (lues par `fs` dans les tests, importées en `?url` par l'interface) ; `pdf-lib` et `@pdf-lib/fontkit` installés.

- [ ] **Step 1: Déplacer les polices**

```bash
mkdir -p src/pdf
git mv scripts/guide/polices src/pdf/polices
```

- [ ] **Step 2: Mettre à jour le script du guide**

Dans `scripts/guide/generer-docx.cjs`, ligne 5, remplacer la mention `voir polices/OFL.txt` par `voir src/pdf/polices/OFL.txt`, et ligne 282 remplacer :

```js
const police = (f) => fs.readFileSync(path.join(__dirname, 'polices', f))
```

par :

```js
const police = (f) => fs.readFileSync(path.join(__dirname, '../../src/pdf/polices', f))
```

- [ ] **Step 3: Vérifier que le guide se génère encore**

Run: `npm run guide && git status --short docs`
Expected: aucune erreur ; `docs/guide-utilisation.docx` (et éventuellement `docs/images/qrcode-application.png`) apparaissent modifiés car regénérés. Les remettre à l'état du dépôt, ils ne font pas partie de cette tâche :

```bash
git checkout -- docs/guide-utilisation.docx docs/images/qrcode-application.png
```

- [ ] **Step 4: Installer pdf-lib et fontkit**

```bash
npm install pdf-lib@^1.17.1 @pdf-lib/fontkit@^1.1.1
```

Expected: `package.json` gagne les deux entrées dans `dependencies` (pas `devDependencies`).

- [ ] **Step 5: Précacher les polices et relever la limite d'avertissement de taille**

Dans `vite.config.ts` :

```ts
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,ttf}'],
      },
```

et, au même niveau que `base` et `plugins`, ajouter :

```ts
  build: {
    // pdf-lib (~500 Ko) vit dans son propre morceau, chargé seulement à la génération de la feuille.
    chunkSizeWarningLimit: 1000,
  },
```

- [ ] **Step 6: Vérifier le build**

Run: `npm run build`
Expected: build vert, sans avertissement de taille de morceau.

- [ ] **Step 7: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/pdf/polices scripts/guide/generer-docx.cjs package.json package-lock.json vite.config.ts
git commit -m "chore(pdf): Dépendances pdf-lib et polices Manrope partagées avec le guide"
```

(`git add src/pdf/polices` enregistre le déplacement, `git mv` ayant déjà indexé la suppression côté `scripts/`.)

---

### Task 3: `src/pdf/texte.ts` — dates en français, saison, slug

**Files:**
- Create: `src/pdf/texte.ts`
- Test: `src/pdf/texte.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces :
  - `formaterDateLongue(iso: string): string` — « vendredi 16 octobre 2026 », `''` si invalide ;
  - `formaterDateCourte(valeur: string | Date): string` — « 16/10/2026 », `''` si invalide ;
  - `formaterHeure(date: Date): string` — « 21:05 » ;
  - `saison(iso: string): string` — « 2026-2027 », `''` si invalide ;
  - `slug(texte: string): string` — sans accent, `-` entre les mots, `''` si rien ne reste.

- [ ] **Step 1: Write the failing test**

Créer `src/pdf/texte.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { formaterDateCourte, formaterDateLongue, formaterHeure, saison, slug } from './texte'

describe('texte — dates', () => {
  it('écrit la date en toutes lettres sans décalage de jour', () => {
    expect(formaterDateLongue('2026-10-16')).toBe('vendredi 16 octobre 2026')
    expect(formaterDateLongue('2026-01-01')).toBe('jeudi 1 janvier 2026')
  })

  it('ignore une date absente ou mal formée', () => {
    expect(formaterDateLongue('')).toBe('')
    expect(formaterDateLongue('16/10/2026')).toBe('')
    expect(formaterDateLongue('2026-02-30')).toBe('')
    expect(formaterDateCourte('')).toBe('')
    expect(saison('')).toBe('')
  })

  it('écrit la date courte et l’heure', () => {
    expect(formaterDateCourte('2026-10-16')).toBe('16/10/2026')
    expect(formaterDateCourte(new Date(2026, 9, 16, 21, 5))).toBe('16/10/2026')
    expect(formaterHeure(new Date(2026, 9, 16, 21, 5))).toBe('21:05')
    expect(formaterHeure(new Date(2026, 9, 16, 9, 7))).toBe('09:07')
  })

  it('calcule la saison de septembre à août', () => {
    expect(saison('2026-09-01')).toBe('2026-2027')
    expect(saison('2027-03-01')).toBe('2026-2027')
    expect(saison('2027-08-31')).toBe('2026-2027')
    expect(saison('2027-09-01')).toBe('2027-2028')
  })
})

describe('texte — slug', () => {
  it('retire accents, espaces et ponctuation', () => {
    expect(slug('Villenave-d’Ornon')).toBe('Villenave-d-Ornon')
    expect(slug('  ST DELPHIN ')).toBe('ST-DELPHIN')
    expect(slug('Équipe Élite / Été')).toBe('Equipe-Elite-Ete')
  })

  it('renvoie une chaîne vide quand rien ne reste', () => {
    expect(slug('')).toBe('')
    expect(slug('🏀')).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pdf/texte.test.ts`
Expected: FAIL — module `./texte` introuvable.

- [ ] **Step 3: Write minimal implementation**

Créer `src/pdf/texte.ts` :

```ts
/** « 2026-10-16 » → date locale à midi, pour ne jamais changer de jour avec le fuseau ; null si mal formée. */
function dateLocale(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(annee, mois - 1, jour, 12)
  // Un 30 février « déborde » sur mars : on le refuse.
  return date.getMonth() === mois - 1 && date.getDate() === jour ? date : null
}

/** « 2026-10-16 » → « vendredi 16 octobre 2026 » ; chaîne vide si la date est absente ou mal formée. */
export function formaterDateLongue(iso: string): string {
  const date = dateLocale(iso)
  return date ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(date) : ''
}

/** « 2026-10-16 » ou une Date → « 16/10/2026 » ; chaîne vide si invalide. */
export function formaterDateCourte(valeur: string | Date): string {
  const date = typeof valeur === 'string' ? dateLocale(valeur) : valeur
  return date ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' }).format(date) : ''
}

/** « 21:05 » */
export function formaterHeure(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

/** Saison sportive de septembre à août : « 2026-10-16 » → « 2026-2027 », « 2027-03-01 » → « 2026-2027 ». */
export function saison(iso: string): string {
  const date = dateLocale(iso)
  if (!date) return ''
  const debut = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1
  return `${debut}-${debut + 1}`
}

/** « Villenave-d’Ornon » → « Villenave-d-Ornon » : sans accent, sans espace, pour un nom de fichier. */
export function slug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pdf/texte.test.ts`
Expected: PASS. Si `formaterHeure` renvoie `21:05` avec un séparateur inattendu (variante ICU), garder le test : Node 22 avec ICU complet produit `21:05`.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/pdf/texte.ts src/pdf/texte.test.ts
git commit -m "feat(pdf): Formats de date, saison et slug de la feuille de match"
```

---

### Task 4: `src/pdf/modele.ts` — composition du modèle de feuille

**Files:**
- Create: `src/pdf/modele.ts`
- Test: `src/pdf/modele.test.ts`

**Interfaces:**
- Consumes: `REGLES` (`config.ts`), `EtatMatch` (`etat.ts`), `parNumero` (`match.ts`), `libellePeriode` (`periodes.ts`), types de `types.ts` ; `formaterDateCourte`, `formaterDateLongue`, `formaterHeure`, `saison` (Task 3).
- Produces :
  - types `ModeleFeuille`, `LignePeriodes`, `BlocEquipe`, `LigneJoueur` ;
  - `composerFeuille(match: Match, etat: EtatMatch, maintenant?: Date): ModeleFeuille` ;
  - `mentionProlongation(etat: EtatMatch): string | null` ;
  - `nomJoueur(joueur: Pick<JoueurMatch, 'nom' | 'prenom'>): string`.

- [ ] **Step 1: Write the failing test**

Créer `src/pdf/modele.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { calculerEtat } from '../domain/etat'
import { OFFICIELS_VIDES } from '../domain/match'
import type { Match } from '../domain/types'
import { debut, EQUIPE_A, EQUIPE_B, faute, matchDeTest, panier, tempsMort } from '../test/fixtures'
import { composerFeuille, mentionProlongation, nomJoueur } from './modele'

const MAINTENANT = new Date(2026, 9, 16, 21, 5)

/** MT1 : 3–3 ; MT2 : 5–5 ; prolongation : 8–5. */
function matchReference(): Match {
  return matchDeTest(
    panier('A', 'a7', 2),
    panier('A', 'a4', 1),
    faute('A', 'a11'),
    tempsMort('A'),
    panier('B', 'b8', 3),
    debut('MT2'),
    panier('B', 'b5', 2),
    panier('A', 'a7', 2),
    faute('B', null),
    faute('B', 'b8'),
    tempsMort('B'),
    tempsMort('B'),
    debut('P1'),
    panier('A', 'a9', 3),
    faute('A', 'a11'),
    { type: 'finMatch' },
  )
}

const composer = (match: Match) => composerFeuille(match, calculerEtat(match), MAINTENANT)

describe('composerFeuille — en-tête et score', () => {
  it('titre, saison, date, lieu, score et mention', () => {
    const modele = composer(matchReference())
    expect(modele.titre).toBe('Feuille de match')
    expect(modele.sousTitre).toBe('Basket loisir UFOLEP 33 · Saison 2026-2027')
    expect(modele.date).toBe('vendredi 16 octobre 2026')
    expect(modele.lieu).toBe('Villenave-d’Ornon')
    expect(modele.score).toEqual({ nomA: 'ST DELPHIN', nomB: 'GRADIGNAN', scoreA: 8, scoreB: 5, mention: 'après prolongation' })
    expect(modele.piedDePage).toBe('Généré par Table de marque le 16/10/2026 à 21:05')
  })

  it('sans date valide, pas de saison ni de date', () => {
    const modele = composer({ ...matchDeTest(), date: '' })
    expect(modele.sousTitre).toBe('Basket loisir UFOLEP 33')
    expect(modele.date).toBe('')
  })

  it('mention de prolongation selon leur nombre', () => {
    expect(mentionProlongation(calculerEtat(matchDeTest()))).toBeNull()
    expect(mentionProlongation(calculerEtat(matchDeTest(debut('MT2'), debut('P1'))))).toBe('après prolongation')
    expect(mentionProlongation(calculerEtat(matchDeTest(debut('MT2'), debut('P1'), debut('P2'))))).toBe(
      'après 2 prolongations',
    )
  })
})

describe('composerFeuille — périodes', () => {
  it('une colonne par période jouée puis le total', () => {
    const { periodes } = composer(matchReference())
    expect(periodes.colonnes).toEqual(['1ère mi-temps', '2ème mi-temps', 'Prolongation', 'Total'])
    expect(periodes.lignes).toEqual([
      { equipe: 'A', nom: 'ST DELPHIN', points: [3, 2, 3, 8], fautesEquipe: [1, 0, 1], tempsMorts: [1, 0, 0] },
      { equipe: 'B', nom: 'GRADIGNAN', points: [3, 2, 0, 5], fautesEquipe: [0, 2, 0], tempsMorts: [0, 2, 0] },
    ])
  })

  it('un match sans événement n’a que la 1ère mi-temps', () => {
    const { periodes } = composer(matchDeTest())
    expect(periodes.colonnes).toEqual(['1ère mi-temps', 'Total'])
    expect(periodes.lignes[0].points).toEqual([0, 0])
  })
})

describe('composerFeuille — équipes', () => {
  it('joueurs triés par n° avec leurs points et fautes', () => {
    const { equipes } = composer(matchReference())
    expect(equipes.A.joueurs.map((j) => j.numero)).toEqual([4, 7, 9, 11, 15])
    expect(equipes.A.joueurs[0]).toEqual({
      numero: 4,
      nom: 'Prenoma4 NOMA4',
      licence: 'LIC-a4',
      lf: 1,
      deuxPts: 0,
      troisPts: 0,
      points: 1,
      fautes: 0,
      exclu: false,
    })
    expect(equipes.A.joueurs[1]).toMatchObject({ numero: 7, deuxPts: 2, points: 4 })
    expect(equipes.A.joueurs[2]).toMatchObject({ numero: 9, troisPts: 1, points: 3 })
    expect(equipes.A.joueurs[3]).toMatchObject({ numero: 11, fautes: 2, exclu: false })
  })

  it('coach joueur, coach libre et fautes du coach', () => {
    const { equipes } = composer(matchReference())
    expect(equipes.A).toMatchObject({ equipe: 'A', nom: 'ST DELPHIN', couleur: 'Vert', coach: 'n°7 Prenoma7 NOMA7', fautesCoach: 0 })
    expect(equipes.B).toMatchObject({ equipe: 'B', nom: 'GRADIGNAN', couleur: 'Noir', coach: 'Morgan F.', fautesCoach: 1 })
  })

  it('sans coach, ou coach libre au nom vide', () => {
    // Copies : EQUIPE_A et EQUIPE_B sont partagées par tous les tests, ne jamais les muter.
    const match = matchDeTest()
    match.equipes = { A: { ...EQUIPE_A, coach: null }, B: { ...EQUIPE_B, coach: { type: 'libre', nom: '  ' } } }
    const { equipes } = composer(match)
    expect(equipes.A.coach).toBeNull()
    expect(equipes.B.coach).toBeNull()
  })

  it('marque l’exclusion à 5 fautes', () => {
    const { equipes } = composer(matchDeTest(...Array.from({ length: 5 }, () => faute('A', 'a11'))))
    expect(equipes.A.joueurs[3]).toMatchObject({ numero: 11, fautes: 5, exclu: true })
  })

  it('nom du joueur : prénom puis NOM, ou « — »', () => {
    expect(nomJoueur({ prenom: 'Camille', nom: 'Dupont' })).toBe('Camille DUPONT')
    expect(nomJoueur({ prenom: '', nom: 'Dupont' })).toBe('DUPONT')
    expect(nomJoueur({ prenom: 'Camille', nom: '' })).toBe('Camille')
    expect(nomJoueur({ prenom: ' ', nom: '' })).toBe('—')
  })

  it('garde 14 joueurs', () => {
    const joueurs = Array.from({ length: 14 }, (_, i) => ({ ...EQUIPE_A.joueurs[0], id: `x${i}`, numero: 20 + i }))
    const match = matchDeTest()
    match.equipes.A = { ...EQUIPE_A, joueurs, coach: null }
    expect(composer(match).equipes.A.joueurs).toHaveLength(14)
  })
})

describe('composerFeuille — officiels', () => {
  it('sept cases dans l’ordre de la feuille, vides par défaut', () => {
    const { officiels } = composer(matchDeTest())
    expect(officiels.map((o) => o.libelle)).toEqual([
      'Chronométreur',
      'Opérateur 30"',
      'Marqueur',
      'Arbitre',
      'Aide arbitre',
      'Capitaine A (ST DELPHIN)',
      'Capitaine B (GRADIGNAN)',
    ])
    expect(officiels.every((o) => o.valeur === '')).toBe(true)
  })

  it('reprend les valeurs saisies', () => {
    const match = { ...matchDeTest(), officiels: { ...OFFICIELS_VIDES, arbitre: 'Camille R.', capitaineB: 'Alex' } }
    const { officiels } = composer(match)
    expect(officiels[3]).toEqual({ libelle: 'Arbitre', valeur: 'Camille R.' })
    expect(officiels[6]).toEqual({ libelle: 'Capitaine B (GRADIGNAN)', valeur: 'Alex' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pdf/modele.test.ts`
Expected: FAIL — module `./modele` introuvable.

- [ ] **Step 3: Write minimal implementation**

Créer `src/pdf/modele.ts` :

```ts
import { REGLES } from '../domain/config'
import type { EtatMatch } from '../domain/etat'
import { parNumero } from '../domain/match'
import { libellePeriode } from '../domain/periodes'
import type { EquipeId, JoueurMatch, Match, Officiels } from '../domain/types'
import { formaterDateCourte, formaterDateLongue, formaterHeure, saison } from './texte'

export interface LigneJoueur {
  numero: number
  /** « Prenom NOM » ; nom seul ou prénom seul si l'autre manque ; « — » sinon */
  nom: string
  licence: string
  lf: number
  deuxPts: number
  troisPts: number
  points: number
  fautes: number
  /** 5 fautes atteintes (REGLES.fautesPersoMax) */
  exclu: boolean
}

export interface BlocEquipe {
  equipe: EquipeId
  nom: string
  /** Couleur de maillot, texte libre */
  couleur: string
  /** Nom affiché, « n°7 Prenom NOM » pour un coach joueur, null sans coach */
  coach: string | null
  fautesCoach: number
  /** Triés par n° croissant */
  joueurs: LigneJoueur[]
}

export interface LignePeriodes {
  equipe: EquipeId
  nom: string
  /** Une valeur par période jouée, puis le total */
  points: number[]
  /** Une valeur par période jouée */
  fautesEquipe: number[]
  /** Une valeur par période jouée */
  tempsMorts: number[]
}

export interface ModeleFeuille {
  titre: string
  sousTitre: string
  /** « vendredi 16 octobre 2026 », vide si la date manque */
  date: string
  /** Vide si non renseigné */
  lieu: string
  score: {
    nomA: string
    nomB: string
    scoreA: number
    scoreB: number
    /** « après prolongation », « après 2 prolongations », ou null */
    mention: string | null
  }
  periodes: {
    /** Libellés des périodes jouées puis « Total » */
    colonnes: string[]
    /** Une ligne par équipe, A puis B */
    lignes: LignePeriodes[]
  }
  equipes: Record<EquipeId, BlocEquipe>
  /** 7 entrées, dans l'ordre de la feuille officielle */
  officiels: { libelle: string; valeur: string }[]
  piedDePage: string
}

const LIBELLES_OFFICIELS: [keyof Officiels, string][] = [
  ['chronometreur', 'Chronométreur'],
  ['operateur30s', 'Opérateur 30"'],
  ['marqueur', 'Marqueur'],
  ['arbitre', 'Arbitre'],
  ['aideArbitre', 'Aide arbitre'],
  ['capitaineA', 'Capitaine A'],
  ['capitaineB', 'Capitaine B'],
]

const STATS_VIDES = { points: 0, lf: 0, deuxPts: 0, troisPts: 0, fautes: 0 }

/** « Prenom NOM », ou l'un des deux, ou « — ». */
export function nomJoueur(joueur: Pick<JoueurMatch, 'nom' | 'prenom'>): string {
  return [joueur.prenom.trim(), joueur.nom.trim().toUpperCase()].filter(Boolean).join(' ') || '—'
}

/** null sans prolongation, « après prolongation », « après 2 prolongations »… */
export function mentionProlongation(etat: EtatMatch): string | null {
  const n = etat.periodes.filter((periode) => periode.startsWith('P')).length
  if (n === 0) return null
  return n === 1 ? 'après prolongation' : `après ${n} prolongations`
}

function nomCoach(match: Match, equipe: EquipeId): string | null {
  const { coach, joueurs } = match.equipes[equipe]
  if (!coach) return null
  if (coach.type === 'libre') return coach.nom.trim() || null
  const joueur = joueurs.find((j) => j.id === coach.joueurId)
  return joueur ? `n°${joueur.numero} ${nomJoueur(joueur)}` : null
}

function composerEquipe(match: Match, etat: EtatMatch, equipe: EquipeId): BlocEquipe {
  const { nom, couleur, joueurs } = match.equipes[equipe]
  const stats = etat.equipes[equipe]
  return {
    equipe,
    nom,
    couleur,
    coach: nomCoach(match, equipe),
    fautesCoach: stats.fautesCoach,
    joueurs: [...joueurs].sort(parNumero).map((joueur) => {
      const s = stats.joueurs[joueur.id] ?? STATS_VIDES
      return {
        numero: joueur.numero,
        nom: nomJoueur(joueur),
        licence: joueur.licence,
        lf: s.lf,
        deuxPts: s.deuxPts,
        troisPts: s.troisPts,
        points: s.points,
        fautes: s.fautes,
        exclu: s.fautes >= REGLES.fautesPersoMax,
      }
    }),
  }
}

function composerLignePeriodes(match: Match, etat: EtatMatch, equipe: EquipeId): LignePeriodes {
  const e = etat.equipes[equipe]
  return {
    equipe,
    nom: match.equipes[equipe].nom,
    points: [...etat.periodes.map((p) => e.pointsParPeriode[p] ?? 0), e.score],
    fautesEquipe: etat.periodes.map((p) => e.fautesEquipeParPeriode[p] ?? 0),
    tempsMorts: etat.periodes.map((p) => e.tempsMortsParPeriode[p] ?? 0),
  }
}

export function composerFeuille(match: Match, etat: EtatMatch, maintenant = new Date()): ModeleFeuille {
  const nomA = match.equipes.A.nom
  const nomB = match.equipes.B.nom
  const saisonDuMatch = saison(match.date)
  const nomEquipe = (cle: keyof Officiels) => (cle === 'capitaineA' ? nomA : cle === 'capitaineB' ? nomB : null)
  return {
    titre: 'Feuille de match',
    sousTitre: saisonDuMatch ? `Basket loisir UFOLEP 33 · Saison ${saisonDuMatch}` : 'Basket loisir UFOLEP 33',
    date: formaterDateLongue(match.date),
    lieu: match.lieu.trim(),
    score: {
      nomA,
      nomB,
      scoreA: etat.equipes.A.score,
      scoreB: etat.equipes.B.score,
      mention: mentionProlongation(etat),
    },
    periodes: {
      colonnes: [...etat.periodes.map(libellePeriode), 'Total'],
      lignes: [composerLignePeriodes(match, etat, 'A'), composerLignePeriodes(match, etat, 'B')],
    },
    equipes: { A: composerEquipe(match, etat, 'A'), B: composerEquipe(match, etat, 'B') },
    officiels: LIBELLES_OFFICIELS.map(([cle, libelle]) => {
      const equipe = nomEquipe(cle)
      return { libelle: equipe ? `${libelle} (${equipe})` : libelle, valeur: match.officiels[cle] }
    }),
    piedDePage: `Généré par Table de marque le ${formaterDateCourte(maintenant)} à ${formaterHeure(maintenant)}`,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pdf/modele.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/pdf/modele.ts src/pdf/modele.test.ts
git commit -m "feat(pdf): Composition du modèle de la feuille de match"
```

---

### Task 5: `src/pdf/courriel.ts` — nom de fichier et e-mail pré-rempli

**Files:**
- Create: `src/pdf/courriel.ts`
- Test: `src/pdf/courriel.test.ts`

**Interfaces:**
- Consumes: `ADRESSE_COMITE` (Task 1), `mentionProlongation` (Task 4), `formaterDateCourte`, `formaterDateLongue`, `slug` (Task 3).
- Produces :
  - `nomFichierFeuille(match: Match): string` ;
  - `interface CourrielFeuille { a: string; cc: string | null; objet: string; corps: string; lien: string }` ;
  - `courrielFeuille(match: Match, etat: EtatMatch, coachAdverse: string | null): CourrielFeuille`.

- [ ] **Step 1: Write the failing test**

Créer `src/pdf/courriel.test.ts` :

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pdf/courriel.test.ts`
Expected: FAIL — module `./courriel` introuvable.

- [ ] **Step 3: Write minimal implementation**

Créer `src/pdf/courriel.ts` :

```ts
import { ADRESSE_COMITE } from '../domain/config'
import type { EtatMatch } from '../domain/etat'
import type { EquipeId, Match } from '../domain/types'
import { mentionProlongation } from './modele'
import { formaterDateCourte, formaterDateLongue, slug } from './texte'

export interface CourrielFeuille {
  a: string
  cc: string | null
  objet: string
  corps: string
  /** Lien mailto: complet, encodé */
  lien: string
}

/** « 2026-10-16_ST-DELPHIN-GRADIGNAN.pdf » : date, puis noms sans accent ni espace. */
export function nomFichierFeuille(match: Match): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(match.date) ? match.date : 'sans-date'
  const nom = (equipe: EquipeId) => slug(match.equipes[equipe].nom) || 'equipe'
  return `${date}_${nom('A')}-${nom('B')}.pdf`
}

export function courrielFeuille(match: Match, etat: EtatMatch, coachAdverse: string | null): CourrielFeuille {
  const nomA = match.equipes.A.nom
  const nomB = match.equipes.B.nom
  const scoreA = etat.equipes.A.score
  const scoreB = etat.equipes.B.score
  const mention = mentionProlongation(etat)
  const lieu = match.lieu.trim()
  const dateLongue = formaterDateLongue(match.date)
  const dateCourte = formaterDateCourte(match.date)

  const quand = [dateLongue && `du ${dateLongue}`, lieu && `à ${lieu}`].filter(Boolean).join(' ')
  const objet = ['Feuille de match UFOLEP 33', dateCourte, `${nomA} ${scoreA}–${scoreB} ${nomB}`]
    .filter(Boolean)
    .join(' — ')
  const corps = [
    'Bonjour,',
    '',
    `Veuillez trouver ci-joint la feuille du match${quand ? ` ${quand}` : ''} :`,
    `${nomA} ${scoreA} – ${scoreB} ${nomB}${mention ? ` (${mention})` : ''}.`,
    '',
    'Cordialement,',
    'La table de marque',
  ].join('\r\n')

  // Pas d'URLSearchParams : il encode l'espace en « + », que les messageries n'interprètent pas.
  const parametres = [
    coachAdverse ? `cc=${encodeURIComponent(coachAdverse)}` : null,
    `subject=${encodeURIComponent(objet)}`,
    `body=${encodeURIComponent(corps)}`,
  ]
    .filter(Boolean)
    .join('&')

  return { a: ADRESSE_COMITE, cc: coachAdverse, objet, corps, lien: `mailto:${ADRESSE_COMITE}?${parametres}` }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/pdf/courriel.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/pdf/courriel.ts src/pdf/courriel.test.ts
git commit -m "feat(pdf): Nom de fichier et e-mail pré-rempli de la feuille de match"
```

---

### Task 6: `src/pdf/couleurs.ts` et `src/pdf/dessin.ts` — mise en page pdf-lib

**Files:**
- Create: `src/pdf/couleurs.ts`
- Create: `src/pdf/dessin.ts`
- Test: `src/pdf/couleurs.test.ts`
- Test: `src/pdf/dessin.test.ts`

**Interfaces:**
- Consumes: `ModeleFeuille`, `BlocEquipe`, `composerFeuille` (Task 4) ; polices de `src/pdf/polices/` (Task 2) ; `pdf-lib`, `@pdf-lib/fontkit`.
- Produces :
  - `JETONS_PDF`, `NomCouleur`, `versRvb(hex: string): [number, number, number]` (`couleurs.ts`) ;
  - `interface PolicesFeuille { normale: Uint8Array; grasse: Uint8Array }` ;
  - `dessinerFeuille(modele: ModeleFeuille, polices: PolicesFeuille): Promise<Uint8Array>` (`dessin.ts`).

- [ ] **Step 1: Write the failing test for the colours**

Créer `src/pdf/couleurs.test.ts` :

```ts
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { JETONS_PDF, versRvb } from './couleurs'

const css = readFileSync(resolve(import.meta.dirname, '../styles/jetons.css'), 'utf8')
const JETONS_CSS = Object.fromEntries(
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(([, nom, valeur]) => [nom, valeur.toLowerCase()]),
)

describe('couleurs du PDF', () => {
  it.each(Object.keys(JETONS_PDF))('« %s » est la valeur du jeton CSS', (nom) => {
    expect(JETONS_PDF[nom as keyof typeof JETONS_PDF]).toBe(JETONS_CSS[`--${nom}`])
  })

  it('convertit en composantes de 0 à 1', () => {
    expect(versRvb('#ffffff')).toEqual([1, 1, 1])
    expect(versRvb('#000000')).toEqual([0, 0, 0])
    expect(versRvb('#ff8000').map((c) => Math.round(c * 255))).toEqual([255, 128, 0])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/pdf/couleurs.test.ts`
Expected: FAIL — module `./couleurs` introuvable.

- [ ] **Step 3: Write the colours module**

Créer `src/pdf/couleurs.ts` :

```ts
/**
 * Copie des jetons de `src/styles/jetons.css` : pdf-lib ne lit pas le CSS.
 * Seconde (et dernière) source de couleurs littérales du projet ; `couleurs.test.ts` vérifie l'égalité avec le CSS.
 */
export const JETONS_PDF = {
  fond: '#f5f4f0',
  surface: '#ffffff',
  'surface-2': '#edece7',
  bordure: '#e3e1db',
  texte: '#1d1c1a',
  'texte-2': '#66645e',
  accent: '#c24f12',
  'accent-tint': '#fbeadf',
  'equipe-a': '#b83c35',
  'equipe-b': '#2d63c4',
  faute: '#9a3d2e',
  danger: '#b42318',
} as const

export type NomCouleur = keyof typeof JETONS_PDF

/** « #c24f12 » → [0.76, 0.31, 0.07] : composantes de 0 à 1 pour pdf-lib. */
export function versRvb(hex: string): [number, number, number] {
  const composante = (i: number) => parseInt(hex.slice(i, i + 2), 16) / 255
  return [composante(1), composante(3), composante(5)]
}
```

- [ ] **Step 4: Run the colours test**

Run: `npx vitest run src/pdf/couleurs.test.ts`
Expected: PASS. Si un jeton diffère, corriger `couleurs.ts` (jamais `jetons.css`).

- [ ] **Step 5: Write the failing test for the drawing**

Créer `src/pdf/dessin.test.ts` :

```ts
// @vitest-environment node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { calculerEtat } from '../domain/etat'
import { OFFICIELS_VIDES } from '../domain/match'
import type { JoueurMatch, Match } from '../domain/types'
import { debut, EQUIPE_A, EQUIPE_B, faute, matchDeTest, panier, tempsMort } from '../test/fixtures'
import { dessinerFeuille } from './dessin'
import { composerFeuille } from './modele'

const police = (fichier: string) => new Uint8Array(readFileSync(resolve(import.meta.dirname, 'polices', fichier)))
const POLICES = { normale: police('Manrope-Regular.ttf'), grasse: police('Manrope-Bold.ttf') }
const MAINTENANT = new Date(2026, 9, 16, 21, 5)
const SORTIE = resolve(import.meta.dirname, '../../test-results')

async function dessiner(match: Match, nomExemple?: string) {
  const octets = await dessinerFeuille(composerFeuille(match, calculerEtat(match), MAINTENANT), POLICES)
  if (nomExemple) {
    mkdirSync(SORTIE, { recursive: true })
    writeFileSync(resolve(SORTIE, nomExemple), octets)
  }
  return PDFDocument.load(octets)
}

const quatorze = (prefixe: string): JoueurMatch[] =>
  Array.from({ length: 14 }, (_, i) => ({
    id: `${prefixe}${i}`,
    numero: i,
    civilite: 'M',
    licence: `LIC-${prefixe}${i}`,
    nom: `Nom${i}`,
    prenom: `Prenom${i}`,
  }))

describe('dessinerFeuille', () => {
  it('produit une page A4 rechargeable (exemplaire écrit dans test-results/)', async () => {
    const match = matchDeTest(
      panier('A', 'a7', 2),
      panier('A', 'a4', 1),
      faute('A', 'a11'),
      tempsMort('A'),
      panier('B', 'b8', 3),
      debut('MT2'),
      panier('B', 'b5', 2),
      panier('A', 'a7', 2),
      faute('B', null),
      faute('B', 'b8'),
      debut('P1'),
      panier('A', 'a9', 3),
      ...Array.from({ length: 4 }, () => faute('A', 'a11')),
      { type: 'finMatch' },
    )
    match.officiels = { ...OFFICIELS_VIDES, arbitre: 'Camille R.', marqueur: 'Alex' }
    const doc = await dessiner(match, 'feuille-exemple.pdf')
    expect(doc.getPageCount()).toBe(1)
    const { width, height } = doc.getPage(0).getSize()
    expect([Math.round(width), Math.round(height)]).toEqual([595, 842])
    expect(doc.getTitle()).toBe('Feuille de match — ST DELPHIN – GRADIGNAN')
  })

  it('tient sur une ou deux pages avec 14 joueurs par équipe et deux prolongations', async () => {
    const match = matchDeTest(debut('MT2'), debut('P1'), debut('P2'), { type: 'finMatch' })
    match.equipes = { A: { ...EQUIPE_A, joueurs: quatorze('a') }, B: { ...EQUIPE_B, joueurs: quatorze('b'), coach: null } }
    const doc = await dessiner(match, 'feuille-14-joueurs.pdf')
    expect(doc.getPageCount()).toBeLessThanOrEqual(2)
  })

  it('remplace les caractères hors police et tronque les textes trop longs sans lever', async () => {
    const match = matchDeTest(panier('A', 'a7', 2))
    // Copies : les fixtures EQUIPE_A / EQUIPE_B sont partagées, on ne mute jamais leurs tableaux.
    const [premier, ...autres] = EQUIPE_A.joueurs
    match.equipes = {
      A: {
        ...EQUIPE_A,
        nom: 'ESAL – Entente Sportive Audenge Lanton 🏀 section loisir du bassin',
        joueurs: [{ ...premier, nom: 'Nom-Très-Long-Composé-Avec-Beaucoup-De-Lettres', prenom: 'Prénom 🎉' }, ...autres],
      },
      B: { ...EQUIPE_B, nom: '🐉', couleur: 'Bleu ciel et blanc à rayures 🌈' },
    }
    match.lieu = 'Complexe sportif Christiane Ballion, avenue de très loin, Audenge 🏟️'
    const doc = await dessiner(match, 'feuille-caracteres.pdf')
    expect(doc.getPageCount()).toBe(1)
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/pdf/dessin.test.ts`
Expected: FAIL — module `./dessin` introuvable.

- [ ] **Step 7: Write the drawing module**

Créer `src/pdf/dessin.ts` :

```ts
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, PageSizes, rgb, type PDFFont, type PDFPage, type RGB } from 'pdf-lib'
import { JETONS_PDF, versRvb, type NomCouleur } from './couleurs'
import type { BlocEquipe, ModeleFeuille } from './modele'

export interface PolicesFeuille {
  normale: Uint8Array
  grasse: Uint8Array
}

const [LARGEUR_PAGE, HAUTEUR_PAGE] = PageSizes.A4
const MARGE = 36
const LARGEUR_UTILE = LARGEUR_PAGE - 2 * MARGE
const HAUTEUR_PIED = 24
/** Dernière ordonnée (depuis le haut) utilisable avant le pied de page. */
const BAS_UTILE = HAUTEUR_PAGE - MARGE - HAUTEUR_PIED
const LIGNE_MAX = 16
const LIGNE_MIN = 10
const CASES_FAUTES = 5
const CASE = 7
const PAS_CASE = 10

/** Hauteurs fixes (hors lignes de tableau), pour calculer la hauteur de ligne qui fait tenir la feuille sur une page. */
const HAUTEUR_EN_TETE = 52
const HAUTEUR_SCORE = 64
const HAUTEUR_TITRE_EQUIPE = 30
const HAUTEUR_TITRE_OFFICIELS = 20
const HAUTEUR_CASE_OFFICIEL = 26
const ESPACE = 12

type Alignement = 'gauche' | 'droite' | 'centre'

interface Colonne {
  titre: string
  largeur: number
  alignement?: Alignement
}

/** Cellule de tableau : texte, ou cases de fautes. */
type Cellule = string | { cases: number; exclu: boolean }

interface OptionsTexte {
  x: number
  /** Ligne de base, mesurée depuis le HAUT de la page */
  y: number
  taille: number
  police?: PDFFont
  couleur?: NomCouleur
  /** Si donnée, le texte est tronqué avec « … » pour tenir, et aligné dans cette largeur */
  largeur?: number
  alignement?: Alignement
}

const teinte = (nom: NomCouleur): RGB => rgb(...versRvb(JETONS_PDF[nom]))

/** Curseur de dessin. `y` est mesuré depuis le haut de la page ; pdf-lib compte depuis le bas. */
class Feuille {
  readonly doc: PDFDocument
  readonly normale: PDFFont
  readonly grasse: PDFFont
  readonly pages: PDFPage[] = []
  page!: PDFPage
  y = MARGE
  private readonly jeux: Map<PDFFont, Set<number>>

  // Pas de propriétés de paramètre : le projet compile avec `erasableSyntaxOnly`.
  constructor(doc: PDFDocument, normale: PDFFont, grasse: PDFFont) {
    this.doc = doc
    this.normale = normale
    this.grasse = grasse
    this.jeux = new Map([normale, grasse].map((police) => [police, new Set(police.getCharacterSet())]))
    this.nouvellePage()
  }

  nouvellePage() {
    this.page = this.doc.addPage(PageSizes.A4)
    this.pages.push(this.page)
    this.y = MARGE
  }

  /** Passe à la page suivante si `hauteur` ne tient pas avant le pied de page. */
  assurerPlace(hauteur: number) {
    if (this.y + hauteur > BAS_UTILE) this.nouvellePage()
  }

  /** Remplace par « ? » les caractères absents de la police (emoji…). */
  nettoyer(texte: string, police: PDFFont): string {
    const jeu = this.jeux.get(police) ?? new Set<number>()
    return [...texte].map((c) => (jeu.has(c.codePointAt(0) ?? -1) ? c : '?')).join('')
  }

  /** Coupe avec « … » pour tenir dans `largeur`. */
  tronquer(texte: string, police: PDFFont, taille: number, largeur: number): string {
    let t = this.nettoyer(texte, police)
    if (police.widthOfTextAtSize(t, taille) <= largeur) return t
    const points = this.nettoyer('…', police)
    while (t.length > 0 && police.widthOfTextAtSize(`${t}${points}`, taille) > largeur) t = t.slice(0, -1)
    return `${t.trimEnd()}${points}`
  }

  texte(texte: string, options: OptionsTexte) {
    const police = options.police ?? this.normale
    const t =
      options.largeur === undefined
        ? this.nettoyer(texte, police)
        : this.tronquer(texte, police, options.taille, options.largeur)
    let x = options.x
    if (options.largeur !== undefined && options.alignement && options.alignement !== 'gauche') {
      const l = police.widthOfTextAtSize(t, options.taille)
      x = options.alignement === 'droite' ? options.x + options.largeur - l : options.x + (options.largeur - l) / 2
    }
    this.page.drawText(t, {
      x,
      y: HAUTEUR_PAGE - options.y,
      size: options.taille,
      font: police,
      color: teinte(options.couleur ?? 'texte'),
    })
  }

  /** `y` depuis le haut ; au moins un de `fond` / `bordure` doit être donné. */
  rectangle(x: number, y: number, largeur: number, hauteur: number, style: { fond?: NomCouleur; bordure?: NomCouleur }) {
    this.page.drawRectangle({
      x,
      y: HAUTEUR_PAGE - y - hauteur,
      width: largeur,
      height: hauteur,
      color: style.fond ? teinte(style.fond) : undefined,
      borderColor: style.bordure ? teinte(style.bordure) : undefined,
      borderWidth: style.bordure ? 0.5 : 0,
    })
  }

  /** Tableau pleine largeur : en-tête grisé (répété en haut d'une nouvelle page), lignes alternées. */
  tableau(colonnes: Colonne[], lignes: Cellule[][], hauteurLigne: number, taille: number) {
    const enTete = () =>
      this.ligneTableau(colonnes, colonnes.map((c) => c.titre), hauteurLigne, taille - 1, {
        fond: 'surface-2',
        police: this.grasse,
        couleur: 'texte-2',
      })
    this.assurerPlace(hauteurLigne * 2)
    enTete()
    lignes.forEach((cellules, i) => {
      if (this.y + hauteurLigne > BAS_UTILE) {
        this.nouvellePage()
        enTete()
      }
      this.ligneTableau(colonnes, cellules, hauteurLigne, taille, { fond: i % 2 ? 'fond' : 'surface' })
    })
  }

  private ligneTableau(
    colonnes: Colonne[],
    cellules: Cellule[],
    hauteur: number,
    taille: number,
    style: { fond: NomCouleur; police?: PDFFont; couleur?: NomCouleur },
  ) {
    this.rectangle(MARGE, this.y, LARGEUR_UTILE, hauteur, { fond: style.fond })
    const base = this.y + hauteur / 2 + taille * 0.35
    let x = MARGE
    colonnes.forEach((colonne, i) => {
      const cellule = cellules[i] ?? ''
      if (typeof cellule === 'string') {
        this.texte(cellule, {
          x: x + 4,
          y: base,
          taille,
          police: style.police,
          couleur: style.couleur,
          largeur: colonne.largeur - 8,
          alignement: colonne.alignement,
        })
      } else {
        this.casesFautes(cellule, x + 4, this.y + (hauteur - CASE) / 2)
      }
      x += colonne.largeur
    })
    this.y += hauteur
  }

  private casesFautes(cellule: { cases: number; exclu: boolean }, x: number, y: number) {
    for (let i = 0; i < CASES_FAUTES; i++) {
      const pleine = i < cellule.cases
      const derniere = i === CASES_FAUTES - 1
      if (pleine) {
        this.rectangle(x + i * PAS_CASE, y, CASE, CASE, { fond: derniere && cellule.exclu ? 'danger' : 'faute' })
      } else {
        this.rectangle(x + i * PAS_CASE, y, CASE, CASE, { bordure: 'bordure' })
      }
    }
  }
}

/** Hauteur de ligne qui fait tenir tous les tableaux sur la première page, bornée entre LIGNE_MIN et LIGNE_MAX. */
function calculerHauteurLigne(modele: ModeleFeuille): number {
  const lignesPeriodes = 1 + 3 * modele.periodes.lignes.length
  const lignesEquipes = 2 + modele.equipes.A.joueurs.length + modele.equipes.B.joueurs.length
  const lignes = lignesPeriodes + lignesEquipes
  const fixe =
    HAUTEUR_EN_TETE +
    HAUTEUR_SCORE +
    2 * HAUTEUR_TITRE_EQUIPE +
    HAUTEUR_TITRE_OFFICIELS +
    Math.ceil(modele.officiels.length / 2) * HAUTEUR_CASE_OFFICIEL +
    4 * ESPACE
  const disponible = BAS_UTILE - MARGE - fixe
  return Math.max(LIGNE_MIN, Math.min(LIGNE_MAX, Math.floor(disponible / lignes)))
}

function dessinerEnTete(f: Feuille, m: ModeleFeuille) {
  const moitie = LARGEUR_UTILE / 2
  f.texte(m.titre, { x: MARGE, y: f.y + 20, taille: 22, police: f.grasse })
  f.texte(m.sousTitre, { x: MARGE, y: f.y + 36, taille: 10, couleur: 'texte-2' })
  f.texte(m.date, { x: MARGE + moitie, y: f.y + 20, taille: 11, police: f.grasse, largeur: moitie, alignement: 'droite' })
  if (m.lieu) {
    f.texte(m.lieu, { x: MARGE + moitie, y: f.y + 36, taille: 10, couleur: 'texte-2', largeur: moitie, alignement: 'droite' })
  }
  f.y += HAUTEUR_EN_TETE
}

function dessinerScore(f: Feuille, m: ModeleFeuille) {
  f.rectangle(MARGE, f.y, LARGEUR_UTILE, HAUTEUR_SCORE, { fond: 'accent-tint' })
  const tiers = LARGEUR_UTILE / 3
  const base = f.y + 38
  f.texte(m.score.nomA, { x: MARGE + 12, y: base, taille: 14, police: f.grasse, couleur: 'equipe-a', largeur: tiers - 12 })
  f.texte(`${m.score.scoreA} – ${m.score.scoreB}`, {
    x: MARGE + tiers,
    y: base,
    taille: 30,
    police: f.grasse,
    largeur: tiers,
    alignement: 'centre',
  })
  f.texte(m.score.nomB, {
    x: MARGE + 2 * tiers,
    y: base,
    taille: 14,
    police: f.grasse,
    couleur: 'equipe-b',
    largeur: tiers - 12,
    alignement: 'droite',
  })
  if (m.score.mention) {
    f.texte(m.score.mention, { x: MARGE, y: f.y + 55, taille: 10, couleur: 'texte-2', largeur: LARGEUR_UTILE, alignement: 'centre' })
  }
  f.y += HAUTEUR_SCORE + ESPACE
}

function dessinerPeriodes(f: Feuille, m: ModeleFeuille, hauteurLigne: number) {
  const largeurEquipe = 120
  const largeurLibelle = 90
  const largeurColonne = (LARGEUR_UTILE - largeurEquipe - largeurLibelle) / m.periodes.colonnes.length
  const colonnes: Colonne[] = [
    { titre: 'Équipe', largeur: largeurEquipe },
    { titre: '', largeur: largeurLibelle },
    ...m.periodes.colonnes.map((titre) => ({ titre, largeur: largeurColonne, alignement: 'centre' as const })),
  ]
  const chiffres = (valeurs: number[]) => valeurs.map(String)
  const lignes: Cellule[][] = m.periodes.lignes.flatMap((ligne) => [
    [ligne.nom, 'Points', ...chiffres(ligne.points)],
    ['', "Fautes d'équipe", ...chiffres(ligne.fautesEquipe)],
    ['', 'Temps morts', ...chiffres(ligne.tempsMorts)],
  ])
  f.tableau(colonnes, lignes, hauteurLigne, 9)
  f.y += ESPACE
}

function dessinerEquipe(f: Feuille, bloc: BlocEquipe, hauteurLigne: number) {
  f.assurerPlace(HAUTEUR_TITRE_EQUIPE + hauteurLigne * 3)
  const couleur: NomCouleur = bloc.equipe === 'A' ? 'equipe-a' : 'equipe-b'
  const moitie = LARGEUR_UTILE / 2
  f.rectangle(MARGE, f.y, 4, HAUTEUR_TITRE_EQUIPE - 4, { fond: couleur })
  f.texte(bloc.nom, { x: MARGE + 12, y: f.y + 13, taille: 13, police: f.grasse, couleur, largeur: moitie - 12 })
  f.texte(`Maillot : ${bloc.couleur.trim() || '—'}`, {
    x: MARGE + moitie,
    y: f.y + 13,
    taille: 9,
    couleur: 'texte-2',
    largeur: moitie,
    alignement: 'droite',
  })
  const fautesCoach =
    bloc.fautesCoach > 0 ? ` (${bloc.fautesCoach} faute${bloc.fautesCoach > 1 ? 's' : ''})` : ''
  f.texte(bloc.coach ? `Coach : ${bloc.coach}${fautesCoach}` : 'Coach : —', {
    x: MARGE + 12,
    y: f.y + 25,
    taille: 9,
    couleur: 'texte-2',
    largeur: LARGEUR_UTILE - 12,
  })
  f.y += HAUTEUR_TITRE_EQUIPE

  const fixes = [
    { titre: 'N°', largeur: 36, alignement: 'droite' as const },
    { titre: 'Licence', largeur: 84 },
    { titre: 'LF', largeur: 36, alignement: 'droite' as const },
    { titre: '2 pts', largeur: 40, alignement: 'droite' as const },
    { titre: '3 pts', largeur: 40, alignement: 'droite' as const },
    { titre: 'Points', largeur: 44, alignement: 'droite' as const },
    { titre: 'Fautes', largeur: CASES_FAUTES * PAS_CASE + 8 },
  ]
  const largeurNom = LARGEUR_UTILE - fixes.reduce((somme, c) => somme + c.largeur, 0)
  const [numero, ...reste] = fixes
  const colonnes: Colonne[] = [numero, { titre: 'Nom', largeur: largeurNom }, ...reste]
  const lignes: Cellule[][] = bloc.joueurs.map((j) => [
    String(j.numero),
    j.nom,
    j.licence,
    String(j.lf),
    String(j.deuxPts),
    String(j.troisPts),
    String(j.points),
    { cases: j.fautes, exclu: j.exclu },
  ])
  f.tableau(colonnes, lignes, hauteurLigne, 9)
  f.y += ESPACE
}

function dessinerOfficiels(f: Feuille, m: ModeleFeuille) {
  const rangees = Math.ceil(m.officiels.length / 2)
  f.assurerPlace(HAUTEUR_TITRE_OFFICIELS + rangees * HAUTEUR_CASE_OFFICIEL)
  f.texte('Officiels', { x: MARGE, y: f.y + 12, taille: 11, police: f.grasse })
  f.y += HAUTEUR_TITRE_OFFICIELS
  const largeur = (LARGEUR_UTILE - ESPACE) / 2
  m.officiels.forEach((officiel, i) => {
    const x = MARGE + (i % 2) * (largeur + ESPACE)
    const y = f.y + Math.floor(i / 2) * HAUTEUR_CASE_OFFICIEL
    f.texte(officiel.libelle, { x, y: y + 7, taille: 7, couleur: 'texte-2', largeur })
    f.rectangle(x, y + 10, largeur, 15, { bordure: 'bordure' })
    if (officiel.valeur) f.texte(officiel.valeur, { x: x + 3, y: y + 21, taille: 9, largeur: largeur - 6 })
  })
  f.y += rangees * HAUTEUR_CASE_OFFICIEL
}

function dessinerPieds(f: Feuille, m: ModeleFeuille) {
  const total = f.pages.length
  f.pages.forEach((page, i) => {
    f.page = page
    f.texte(m.piedDePage, { x: MARGE, y: HAUTEUR_PAGE - MARGE, taille: 8, couleur: 'texte-2', largeur: LARGEUR_UTILE - 60 })
    f.texte(`Page ${i + 1}/${total}`, {
      x: MARGE,
      y: HAUTEUR_PAGE - MARGE,
      taille: 8,
      couleur: 'texte-2',
      largeur: LARGEUR_UTILE,
      alignement: 'droite',
    })
  })
}

export async function dessinerFeuille(modele: ModeleFeuille, polices: PolicesFeuille): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const normale = await doc.embedFont(polices.normale, { subset: true })
  const grasse = await doc.embedFont(polices.grasse, { subset: true })
  doc.setTitle(`${modele.titre} — ${modele.score.nomA} – ${modele.score.nomB}`)
  doc.setCreator('Table de marque')
  doc.setLanguage('fr')

  const feuille = new Feuille(doc, normale, grasse)
  const hauteurLigne = calculerHauteurLigne(modele)
  dessinerEnTete(feuille, modele)
  dessinerScore(feuille, modele)
  dessinerPeriodes(feuille, modele, hauteurLigne)
  dessinerEquipe(feuille, modele.equipes.A, hauteurLigne)
  dessinerEquipe(feuille, modele.equipes.B, hauteurLigne)
  dessinerOfficiels(feuille, modele)
  dessinerPieds(feuille, modele)
  return doc.save()
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/pdf/dessin.test.ts`
Expected: PASS. Si `doc.setLanguage` n'existe pas dans la version installée de pdf-lib, retirer cette ligne. Si TypeScript refuse `rgb(...versRvb(...))`, écrire `const [r, v, b] = versRvb(...)` puis `rgb(r, v, b)`.

- [ ] **Step 9: Contrôle visuel**

Ouvrir `test-results/feuille-exemple.pdf`, `test-results/feuille-14-joueurs.pdf` et `test-results/feuille-caracteres.pdf` (avec l'outil de lecture de fichiers, ou `open test-results/feuille-exemple.pdf`). Vérifier :

- en-tête à gauche, date et lieu à droite ; bandeau de score pastel avec A en rouge, B en bleu ; « après prolongation » sous le score ;
- tableau des périodes à 6 lignes (Points / Fautes d'équipe / Temps morts par équipe) ;
- un bloc par équipe avec barre de couleur, maillot, coach, tableau des joueurs, 5 cases de fautes dont la 5ᵉ rouge pour le n°11 ;
- 7 cases d'officiels, « Camille R. » et « Alex » écrits, les autres vides ;
- pied de page « Généré par Table de marque le 16/10/2026 à 21:05 » et « Page 1/1 » ;
- sur `feuille-caracteres.pdf` : « ? » à la place des emoji, noms coupés avec « … », rien qui déborde ;
- sur `feuille-14-joueurs.pdf` : lignes serrées mais lisibles ; si une 2ᵉ page existe, elle porte « Page 2/2 ».

Ajuster les constantes de hauteur ou de largeur de colonne de `dessin.ts` si quelque chose se chevauche, puis relancer le test.

- [ ] **Step 10: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/pdf/couleurs.ts src/pdf/couleurs.test.ts src/pdf/dessin.ts src/pdf/dessin.test.ts
git commit -m "feat(pdf): Dessin de la feuille de match avec pdf-lib et police Manrope"
```

---

### Task 7: `src/ui/saisie/feuille.ts` — chargement à la demande, partage ou téléchargement

**Files:**
- Create: `src/ui/saisie/feuille.ts`
- Test: `src/ui/saisie/feuille.test.ts`

**Interfaces:**
- Consumes: `composerFeuille` (Task 4), `dessinerFeuille`, `PolicesFeuille` (Task 6), polices `?url` (Task 2).
- Produces :
  - `genererFeuillePdf(match: Match, etat: EtatMatch): Promise<Uint8Array>` ;
  - `enregistrerFichier(octets: Uint8Array, nom: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Créer `src/ui/saisie/feuille.test.ts` :

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculerEtat } from '../../domain/etat'
import { matchDeTest } from '../../test/fixtures'
import { enregistrerFichier, genererFeuillePdf } from './feuille'

const OCTETS = new Uint8Array([37, 80, 68, 70])

function simulerTelechargement() {
  const creer = vi.fn((_fichier: Blob | MediaSource) => 'blob:feuille')
  const revoquer = vi.fn((_url: string) => undefined)
  Object.assign(URL, { createObjectURL: creer, revokeObjectURL: revoquer })
  const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  return { creer, revoquer, clic }
}

function simulerPartage(share: (donnees: ShareData) => Promise<void>) {
  const canShare = vi.fn(() => true)
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true })
  Object.defineProperty(navigator, 'share', { value: vi.fn(share), configurable: true })
  return { canShare, share: navigator.share as ReturnType<typeof vi.fn> }
}

afterEach(() => {
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('enregistrerFichier', () => {
  it('télécharge quand l’appareil ne sait pas partager', async () => {
    vi.useFakeTimers()
    const { creer, revoquer, clic } = simulerTelechargement()
    await enregistrerFichier(OCTETS, 'feuille.pdf')
    expect(creer).toHaveBeenCalledTimes(1)
    const fichier = creer.mock.calls[0][0] as File
    expect(fichier.name).toBe('feuille.pdf')
    expect(fichier.type).toBe('application/pdf')
    expect(clic).toHaveBeenCalledTimes(1)
    expect(revoquer).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revoquer).toHaveBeenCalledWith('blob:feuille')
  })

  it('partage quand l’appareil accepte le fichier', async () => {
    const { creer, clic } = simulerTelechargement()
    const { canShare, share } = simulerPartage(async () => undefined)
    await enregistrerFichier(OCTETS, 'feuille.pdf')
    expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] })
    expect(share).toHaveBeenCalledWith({ files: [expect.any(File)], title: 'feuille.pdf' })
    expect(creer).not.toHaveBeenCalled()
    expect(clic).not.toHaveBeenCalled()
  })

  it('ne fait rien si le menu de partage est fermé sans choix', async () => {
    const { clic } = simulerTelechargement()
    simulerPartage(() => Promise.reject(new DOMException('Annulé', 'AbortError')))
    await expect(enregistrerFichier(OCTETS, 'feuille.pdf')).resolves.toBeUndefined()
    expect(clic).not.toHaveBeenCalled()
  })

  it('se replie sur le téléchargement si le partage échoue', async () => {
    const { clic } = simulerTelechargement()
    simulerPartage(() => Promise.reject(new Error('Partage refusé')))
    await expect(enregistrerFichier(OCTETS, 'feuille.pdf')).resolves.toBeUndefined()
    expect(clic).toHaveBeenCalledTimes(1)
  })
})

describe('genererFeuillePdf', () => {
  it('charge les polices et produit un PDF', async () => {
    const police = (fichier: string) => readFileSync(resolve(import.meta.dirname, '../../pdf/polices', fichier))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => new Response(police(url.includes('Bold') ? 'Manrope-Bold.ttf' : 'Manrope-Regular.ttf'))),
    )
    const match = matchDeTest()
    const octets = await genererFeuillePdf(match, calculerEtat(match))
    expect(new TextDecoder().decode(octets.subarray(0, 4))).toBe('%PDF')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('signale une police introuvable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 404 })))
    const match = matchDeTest()
    await expect(genererFeuillePdf(match, calculerEtat(match))).rejects.toThrow(/Police introuvable/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/saisie/feuille.test.ts`
Expected: FAIL — module `./feuille` introuvable.

- [ ] **Step 3: Write minimal implementation**

Créer `src/ui/saisie/feuille.ts` :

```ts
import type { EtatMatch } from '../../domain/etat'
import type { Match } from '../../domain/types'
import { composerFeuille } from '../../pdf/modele'
import policeGrasseUrl from '../../pdf/polices/Manrope-Bold.ttf?url'
import policeNormaleUrl from '../../pdf/polices/Manrope-Regular.ttf?url'

async function lirePolice(url: string): Promise<Uint8Array> {
  const reponse = await fetch(url)
  if (!reponse.ok) throw new Error(`Police introuvable : ${url}`)
  return new Uint8Array(await reponse.arrayBuffer())
}

/** Charge pdf-lib et les polices à la demande (import dynamique), compose et dessine la feuille. */
export async function genererFeuillePdf(match: Match, etat: EtatMatch): Promise<Uint8Array> {
  const [{ dessinerFeuille }, normale, grasse] = await Promise.all([
    import('../../pdf/dessin'),
    lirePolice(policeNormaleUrl),
    lirePolice(policeGrasseUrl),
  ])
  return dessinerFeuille(composerFeuille(match, etat), { normale, grasse })
}

function telecharger(fichier: File) {
  const url = URL.createObjectURL(fichier)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = fichier.name
  document.body.append(lien)
  lien.click()
  lien.remove()
  // Révocation différée : Firefox et Safari annulent le téléchargement si l'URL disparaît trop tôt.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const estAbandon = (erreur: unknown) =>
  typeof erreur === 'object' && erreur !== null && 'name' in erreur && erreur.name === 'AbortError'

/** Menu de partage natif si l'appareil sait partager ce fichier (téléphones, tablettes), téléchargement sinon. */
export async function enregistrerFichier(octets: Uint8Array, nom: string): Promise<void> {
  const fichier = new File([new Uint8Array(octets)], nom, { type: 'application/pdf' })
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], title: nom })
      return
    } catch (erreur) {
      if (estAbandon(erreur)) return
      // Partage annoncé mais refusé : on retombe sur le téléchargement.
    }
  }
  telecharger(fichier)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/saisie/feuille.test.ts`
Expected: PASS. Si TypeScript refuse `new File([new Uint8Array(octets)], …)`, remplacer par `new File([octets.slice().buffer], …)` : il faut un `ArrayBuffer` strict, pas un `ArrayBufferLike`.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/ui/saisie/feuille.ts src/ui/saisie/feuille.test.ts
git commit -m "feat(saisie): Génération à la demande de la feuille PDF et enregistrement par partage ou téléchargement"
```

---

### Task 8: `FormulaireOfficiels` — saisie des officiels en fin de match

**Files:**
- Create: `src/ui/saisie/FormulaireOfficiels.tsx`
- Test: `src/ui/saisie/FormulaireOfficiels.test.tsx`

**Interfaces:**
- Consumes: `definirOfficiels` (Task 1), `OFFICIELS_VIDES`, `Officiels`, `Appliquer` (`src/ui/useMatch.ts`).
- Produces : `FormulaireOfficiels({ match, appliquer }: { match: Match; appliquer: Appliquer })`.

- [ ] **Step 1: Write the failing test**

Créer `src/ui/saisie/FormulaireOfficiels.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { definirOfficiels } from '../../domain/commandes'
import { OFFICIELS_VIDES } from '../../domain/match'
import type { Match } from '../../domain/types'
import { matchDeTest } from '../../test/fixtures'
import type { Appliquer } from '../useMatch'
import { FormulaireOfficiels } from './FormulaireOfficiels'

function afficher(match: Match = matchDeTest()) {
  const appliquer = vi.fn<Appliquer>(async () => null)
  render(<FormulaireOfficiels match={match} appliquer={appliquer} />)
  return { appliquer, user: userEvent.setup() }
}

describe('FormulaireOfficiels', () => {
  it('propose les sept champs, repliés sous « Officiels et capitaines »', () => {
    afficher()
    expect(screen.getByText('Officiels et capitaines')).toBeInTheDocument()
    expect(screen.getByLabelText('Chronométreur')).toBeInTheDocument()
    expect(screen.getByLabelText('Opérateur 30"')).toBeInTheDocument()
    expect(screen.getByLabelText('Marqueur')).toBeInTheDocument()
    expect(screen.getByLabelText('Arbitre')).toBeInTheDocument()
    expect(screen.getByLabelText('Aide arbitre')).toBeInTheDocument()
    expect(screen.getByLabelText('Capitaine A (ST DELPHIN)')).toBeInTheDocument()
    expect(screen.getByLabelText('Capitaine B (GRADIGNAN)')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Officiels et capitaines' })).not.toHaveAttribute('open')
  })

  it('enregistre les officiels à la perte de focus', async () => {
    const { appliquer, user } = afficher()
    await user.type(screen.getByLabelText('Arbitre'), 'Camille R.')
    expect(appliquer).not.toHaveBeenCalled()
    await user.tab()
    expect(appliquer).toHaveBeenCalledTimes(1)
    const operation = appliquer.mock.calls[0][0]
    expect(operation(matchDeTest()).officiels).toEqual({ ...OFFICIELS_VIDES, arbitre: 'Camille R.' })
  })

  it('reprend les officiels déjà enregistrés', () => {
    afficher(definirOfficiels(matchDeTest(), { ...OFFICIELS_VIDES, marqueur: 'Alex' }))
    expect(screen.getByLabelText('Marqueur')).toHaveValue('Alex')
    expect(screen.getByLabelText('Capitaine A (ST DELPHIN)')).toHaveValue('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/saisie/FormulaireOfficiels.test.tsx`
Expected: FAIL — module `./FormulaireOfficiels` introuvable.

- [ ] **Step 3: Write minimal implementation**

Créer `src/ui/saisie/FormulaireOfficiels.tsx` :

```tsx
import { useState } from 'react'
import { definirOfficiels } from '../../domain/commandes'
import { OFFICIELS_VIDES } from '../../domain/match'
import type { Match, Officiels } from '../../domain/types'
import type { Appliquer } from '../useMatch'

interface Props {
  match: Match
  appliquer: Appliquer
}

const CHAMPS: { cle: keyof Officiels; libelle: (match: Match) => string }[] = [
  { cle: 'chronometreur', libelle: () => 'Chronométreur' },
  { cle: 'operateur30s', libelle: () => 'Opérateur 30"' },
  { cle: 'marqueur', libelle: () => 'Marqueur' },
  { cle: 'arbitre', libelle: () => 'Arbitre' },
  { cle: 'aideArbitre', libelle: () => 'Aide arbitre' },
  { cle: 'capitaineA', libelle: (match) => `Capitaine A (${match.equipes.A.nom})` },
  { cle: 'capitaineB', libelle: (match) => `Capitaine B (${match.equipes.B.nom})` },
]

/** Sept champs facultatifs, enregistrés dans le match à la perte de focus. État local pour ne jamais perdre une frappe. */
export function FormulaireOfficiels({ match, appliquer }: Props) {
  const [officiels, setOfficiels] = useState<Officiels>({ ...OFFICIELS_VIDES, ...match.officiels })
  const enregistrer = () => void appliquer((m) => definirOfficiels(m, officiels))

  return (
    <details className="officiels">
      <summary>Officiels et capitaines</summary>
      <div className="grille-champs">
        {CHAMPS.map(({ cle, libelle }) => (
          <label key={cle}>
            {libelle(match)}
            <input
              value={officiels[cle]}
              autoComplete="off"
              onChange={(e) => setOfficiels({ ...officiels, [cle]: e.target.value })}
              onBlur={enregistrer}
            />
          </label>
        ))}
      </div>
    </details>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/saisie/FormulaireOfficiels.test.tsx`
Expected: PASS. Si jsdom n'expose pas `<details>` avec le rôle `group`, remplacer la dernière assertion du premier test par `expect(document.querySelector('details')).not.toHaveAttribute('open')`.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/ui/saisie/FormulaireOfficiels.tsx src/ui/saisie/FormulaireOfficiels.test.tsx
git commit -m "feat(saisie): Formulaire des officiels et capitaines en fin de match"
```

---

### Task 9: `EnvoiFeuille`, écran « Match terminé » et styles

**Files:**
- Create: `src/ui/saisie/EnvoiFeuille.tsx`
- Test: `src/ui/saisie/EnvoiFeuille.test.tsx`
- Modify: `src/ui/saisie/MatchTermine.tsx`
- Modify: `src/ui/saisie/EcranMatch.tsx:61-69`
- Modify: `src/styles/saisie.css` (bloc « Match terminé », vers la ligne 367)
- Test: `src/ui/saisie/EcranMatch.test.tsx` (vérification que la suite existante reste verte)

**Interfaces:**
- Consumes: `courrielFeuille`, `nomFichierFeuille` (Task 5) ; `genererFeuillePdf`, `enregistrerFichier` (Task 7) ; `FormulaireOfficiels` (Task 8) ; `Dialogue` (`src/ui/commun/Dialogue.tsx`) ; `Appliquer`.
- Produces : `EnvoiFeuille({ match, etat })` ; `MatchTermine` avec la prop supplémentaire `appliquer: Appliquer`.

- [ ] **Step 1: Write the failing test**

Créer `src/ui/saisie/EnvoiFeuille.test.tsx` :

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculerEtat } from '../../domain/etat'
import type { Match } from '../../domain/types'
import { matchDeTest, panier } from '../../test/fixtures'
import { EnvoiFeuille } from './EnvoiFeuille'
import { enregistrerFichier, genererFeuillePdf } from './feuille'

vi.mock('./feuille', () => ({ genererFeuillePdf: vi.fn(), enregistrerFichier: vi.fn() }))

const generer = vi.mocked(genererFeuillePdf)
const enregistrer = vi.mocked(enregistrerFichier)
const OCTETS = new Uint8Array([37, 80, 68, 70])

function afficher(match: Match = matchDeTest(panier('A', 'a7', 2), { type: 'finMatch' })) {
  render(<EnvoiFeuille match={match} etat={calculerEtat(match)} />)
  return { match, user: userEvent.setup() }
}

const lienCourriel = () => screen.getByRole('link', { name: "Préparer l'e-mail" })

beforeEach(() => {
  generer.mockReset()
  enregistrer.mockReset()
  generer.mockResolvedValue(OCTETS)
  enregistrer.mockResolvedValue(undefined)
})

describe('EnvoiFeuille — PDF', () => {
  it('génère puis enregistre la feuille sous son nom', async () => {
    const { match, user } = afficher()
    await user.click(screen.getByRole('button', { name: 'Enregistrer le PDF' }))
    await waitFor(() => expect(enregistrer).toHaveBeenCalledWith(OCTETS, '2026-10-16_ST-DELPHIN-GRADIGNAN.pdf'))
    expect(generer).toHaveBeenCalledWith(match, calculerEtat(match))
  })

  it('désactive le bouton pendant la préparation', async () => {
    let terminer: (octets: Uint8Array) => void = () => undefined
    generer.mockReturnValue(
      new Promise<Uint8Array>((resoudre) => {
        terminer = resoudre
      }),
    )
    const { user } = afficher()
    await user.click(screen.getByRole('button', { name: 'Enregistrer le PDF' }))
    const bouton = screen.getByRole('button', { name: 'Préparation…' })
    expect(bouton).toBeDisabled()
    terminer(OCTETS)
    expect(await screen.findByRole('button', { name: 'Enregistrer le PDF' })).toBeEnabled()
  })

  it('affiche un dialogue si la génération échoue', async () => {
    generer.mockRejectedValue(new Error('Police introuvable : Manrope'))
    const { user } = afficher()
    await user.click(screen.getByRole('button', { name: 'Enregistrer le PDF' }))
    const dialogue = await screen.findByRole('dialog', { name: 'Feuille impossible à générer' })
    expect(dialogue).toHaveTextContent('Police introuvable : Manrope')
    await user.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(enregistrer).not.toHaveBeenCalled()
  })

  it('rappelle le nom du fichier à joindre', () => {
    afficher()
    expect(screen.getByText(/Joignez le fichier/)).toHaveTextContent(
      'Joignez le fichier 2026-10-16_ST-DELPHIN-GRADIGNAN.pdf à l’e-mail.',
    )
  })
})

describe('EnvoiFeuille — e-mail', () => {
  it('lien mailto vers le comité, sans cc par défaut', () => {
    afficher()
    const href = lienCourriel().getAttribute('href') ?? ''
    expect(href.startsWith('mailto:cd.33@ufolep.org?')).toBe(true)
    expect(href).not.toContain('cc=')
    expect(href).toContain('subject=')
  })

  it('ajoute le coach adverse en cc', async () => {
    const { user } = afficher()
    await user.type(screen.getByLabelText('E-mail du coach adverse (facultatif)'), 'coach@exemple.fr')
    expect(lienCourriel().getAttribute('href')).toContain('cc=coach%40exemple.fr')
  })

  it('refuse une adresse invalide', async () => {
    const { user } = afficher()
    await user.type(screen.getByLabelText('E-mail du coach adverse (facultatif)'), 'pas-un-mail')
    expect(screen.getByRole('alert')).toHaveTextContent('Adresse e-mail invalide')
    expect(screen.queryByRole('link', { name: "Préparer l'e-mail" })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: "Préparer l'e-mail" })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/saisie/EnvoiFeuille.test.tsx`
Expected: FAIL — module `./EnvoiFeuille` introuvable.

- [ ] **Step 3: Write the component**

Créer `src/ui/saisie/EnvoiFeuille.tsx` :

```tsx
import { useState } from 'react'
import type { EtatMatch } from '../../domain/etat'
import type { Match } from '../../domain/types'
import { courrielFeuille, nomFichierFeuille } from '../../pdf/courriel'
import { Dialogue } from '../commun/Dialogue'
import { enregistrerFichier, genererFeuillePdf } from './feuille'

interface Props {
  match: Match
  etat: EtatMatch
}

const ADRESSE_VALIDE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Enregistrement du PDF et e-mail pré-rempli ; l'adresse du coach adverse reste un état d'écran, jamais enregistrée. */
export function EnvoiFeuille({ match, etat }: Props) {
  const [coachAdverse, setCoachAdverse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const adresse = coachAdverse.trim()
  const adresseValide = adresse === '' || ADRESSE_VALIDE.test(adresse)
  const nomFichier = nomFichierFeuille(match)
  const courriel = courrielFeuille(match, etat, adresseValide && adresse ? adresse : null)

  async function enregistrer() {
    setEnCours(true)
    try {
      const octets = await genererFeuillePdf(match, etat)
      await enregistrerFichier(octets, nomFichier)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e))
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="envoi-feuille">
      <h2>Feuille de match</h2>
      <label>
        E-mail du coach adverse (facultatif)
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={coachAdverse}
          aria-invalid={!adresseValide}
          onChange={(e) => setCoachAdverse(e.target.value)}
        />
      </label>
      {!adresseValide && (
        <p role="alert" className="erreurs">
          Adresse e-mail invalide
        </p>
      )}
      <div className="actions-feuille">
        <button className="btn btn-principal" disabled={enCours} onClick={() => void enregistrer()}>
          {enCours ? 'Préparation…' : 'Enregistrer le PDF'}
        </button>
        {adresseValide ? (
          <a className="btn" href={courriel.lien}>
            Préparer l'e-mail
          </a>
        ) : (
          <button className="btn" disabled>
            Préparer l'e-mail
          </button>
        )}
      </div>
      <p className="aide">
        Joignez le fichier <code>{nomFichier}</code> à l’e-mail.
      </p>
      {erreur && (
        <Dialogue
          titre="Feuille impossible à générer"
          actions={
            <button className="btn" onClick={() => setErreur(null)}>
              Fermer
            </button>
          }
        >
          <p>{erreur}</p>
        </Dialogue>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/saisie/EnvoiFeuille.test.tsx`
Expected: PASS.

- [ ] **Step 5: Brancher dans l'écran « Match terminé »**

Remplacer tout `src/ui/saisie/MatchTermine.tsx` par :

```tsx
import type { EtatMatch } from '../../domain/etat'
import type { Match } from '../../domain/types'
import type { Appliquer } from '../useMatch'
import { EnvoiFeuille } from './EnvoiFeuille'
import { FormulaireOfficiels } from './FormulaireOfficiels'

interface Props {
  match: Match
  etat: EtatMatch
  appliquer: Appliquer
  onRouvrir: () => void
  onAccueil: () => void
}

export function MatchTermine({ match, etat, appliquer, onRouvrir, onAccueil }: Props) {
  return (
    <section className="ecran match-termine carte">
      <h1>Match terminé</h1>
      <p className="score-final" aria-label="Score final">
        {match.equipes.A.nom} {etat.equipes.A.score} – {etat.equipes.B.score} {match.equipes.B.nom}
      </p>
      <FormulaireOfficiels key={match.id} match={match} appliquer={appliquer} />
      <EnvoiFeuille match={match} etat={etat} />
      <button className="btn" onClick={onRouvrir}>
        Rouvrir pour corriger
      </button>
      <button className="btn btn-principal" onClick={onAccueil}>
        Accueil
      </button>
    </section>
  )
}
```

Dans `src/ui/saisie/EcranMatch.tsx`, lignes 62 à 69, passer `appliquer` :

```tsx
    contenu = (
      <MatchTermine
        match={match}
        etat={etat}
        appliquer={appliquer}
        onRouvrir={garder(() => void appliquer(rouvrirMatch))}
        onAccueil={onAccueil}
      />
    )
```

- [ ] **Step 6: Styles**

Dans `src/styles/saisie.css`, après le bloc `.score-final { … }` (vers la ligne 381), ajouter :

```css
.match-termine .officiels,
.match-termine .envoi-feuille {
  text-align: left;
}

.officiels {
  background: var(--surface-2);
  border-radius: var(--r-btn);
  padding: 12px 16px;
}

.officiels summary {
  cursor: pointer;
  font-weight: 700;
}

.grille-champs {
  display: grid;
  gap: var(--espace-3);
  margin-top: var(--espace-3);
}

.envoi-feuille {
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
}

.envoi-feuille h2 {
  font-size: 18px;
  margin: 0;
}

.actions-feuille {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
}

.actions-feuille .btn {
  flex: 1 1 200px;
}

.aide {
  margin: 0;
  color: var(--texte-2);
  font-size: 14px;
}

.aide code {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (min-width: 480px) {
  .grille-champs {
    grid-template-columns: 1fr 1fr;
  }
}
```

Vérifier que `--espace-3` existe dans `src/styles/jetons.css` (il est déjà utilisé par `.bandeau`) ; sinon utiliser `--espace-2`.

- [ ] **Step 7: Vérifier la suite existante et l'écran complet**

Run: `npx vitest run src/ui/saisie src/styles`
Expected: PASS, y compris `EcranMatch.test.tsx` (le titre « Match terminé » et « Rouvrir pour corriger » sont inchangés) et `styles.test.ts`.

Puis `npm run dev`, jouer un match jusqu'à « Terminer le match » et contrôler : bloc « Officiels et capitaines » replié puis déplié en deux colonnes, champ e-mail, les deux boutons côte à côte, le rappel du fichier, puis « Enregistrer le PDF » qui télécharge la feuille et « Préparer l'e-mail » qui ouvre la messagerie.

- [ ] **Step 8: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/ui/saisie/EnvoiFeuille.tsx src/ui/saisie/EnvoiFeuille.test.tsx src/ui/saisie/MatchTermine.tsx src/ui/saisie/EcranMatch.tsx src/styles/saisie.css
git commit -m "feat(saisie): Enregistrement de la feuille PDF et e-mail pré-rempli sur l'écran de fin de match"
```

---

### Task 10: Bout en bout, guide, README et spec parente

**Files:**
- Modify: `e2e/match.spec.ts`
- Modify: `docs/guide-utilisation.md` (sections 6 et 9), puis `docs/guide-utilisation.docx` regénéré
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md` (section 8)

**Interfaces:**
- Consumes: l'écran de fin complet (Task 9).
- Produces : rien.

- [ ] **Step 1: Write the failing e2e test**

Dans `e2e/match.spec.ts`, ajouter en tête de fichier :

```ts
import { readFileSync } from 'node:fs'
```

Dans le test « un match se saisit, se corrige, survit à un rechargement et se termine », remplacer la première ligne `await page.goto('./')` par :

```ts
  // Chromium peut annoncer le partage de fichiers : on force le téléchargement, seul geste observable ici.
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined }))
  await page.goto('./')
```

et, après `await expect(page.getByLabel('Score final')).toContainText('3 – 2')`, ajouter :

```ts

  await page.getByText('Officiels et capitaines').click()
  await page.getByLabel('Arbitre', { exact: true }).fill('Camille R.')
  await page.getByLabel('Arbitre', { exact: true }).blur()

  const telechargement = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Enregistrer le PDF' }).click()
  const fichier = await telechargement
  expect(fichier.suggestedFilename()).toMatch(/^\d{4}-\d{2}-\d{2}_ST-DELPHIN-GRADIGNAN\.pdf$/)
  const chemin = await fichier.path()
  expect(chemin).toBeTruthy()
  expect(readFileSync(String(chemin)).subarray(0, 4).toString()).toBe('%PDF')

  await expect(page.getByRole('link', { name: "Préparer l'e-mail" })).toHaveAttribute(
    'href',
    /^mailto:cd\.33@ufolep\.org\?subject=/,
  )
```

- [ ] **Step 2: Run e2e**

Run: `npm run e2e`
Expected: PASS sur les trois projets (téléphone, tablette, ordinateur). Si le projet `telephone` ne produit pas d'événement `download` (émulation mobile), restreindre ce bloc avec `if (testInfo.project.name !== 'telephone')` en ajoutant `testInfo` aux paramètres du test, et le noter dans le commit.

- [ ] **Step 3: Guide d'utilisation**

Dans `docs/guide-utilisation.md`, section 6, remplacer :

```md
L'écran **Match terminé** affiche le score final.

- **Rouvrir pour corriger** permet de revenir sur une erreur constatée après coup.
- **Accueil** revient à l'écran principal.
```

par :

```md
L'écran **Match terminé** affiche le score final et permet d'envoyer la feuille de match.

### Officiels et capitaines

Dépliez **Officiels et capitaines** pour saisir le chronométreur, l'opérateur 30", le marqueur, l'arbitre, l'aide arbitre et les deux capitaines. Tout est facultatif : une case non remplie reste vide sur la feuille, à compléter au stylo si besoin. Chaque nom est enregistré dès que vous passez au champ suivant.

### Envoyer la feuille de match

1. Renseignez si vous le souhaitez l'**e-mail du coach adverse** : il recevra la feuille en copie. Cette adresse n'est pas mémorisée.
2. Touchez **Enregistrer le PDF**. Sur téléphone ou tablette, le menu de partage s'ouvre : choisissez **Enregistrer dans Fichiers** (ou directement **Mail**, la feuille est alors déjà jointe). Sur ordinateur, le fichier se télécharge. Il s'appelle par exemple `2026-10-16_ST-DELPHIN-GRADIGNAN.pdf`.
3. Touchez **Préparer l'e-mail** : votre messagerie s'ouvre avec le destinataire (`cd.33@ufolep.org`), le coach adverse en copie, l'objet et le texte déjà écrits.
4. **Joignez le fichier PDF** à l'e-mail, puis envoyez.

La feuille tient sur une page : score, points par période, fautes d'équipe et temps morts, joueurs de chaque équipe avec leurs points et fautes, officiels, date et lieu.

- **Rouvrir pour corriger** permet de revenir sur une erreur constatée après coup ; regénérez ensuite la feuille.
- **Accueil** revient à l'écran principal.
```

Dans la section 9 « Bon à savoir », après la puce **Données sur l'appareil**, ajouter :

```md
- **Feuille de match** — Le PDF est fabriqué sur l'appareil, sans connexion. Rien n'est envoyé tant que vous n'envoyez pas vous-même l'e-mail.
```

Puis regénérer le guide Word :

```bash
npm run guide
```

- [ ] **Step 4: README**

Dans `README.md`, liste des fonctionnalités, après la puce **Journal et corrections**, ajouter :

```md
- **Feuille de match PDF** : en fin de match, saisie facultative des officiels, feuille d'une page générée sur l'appareil (partage natif ou téléchargement) et e-mail pré-rempli vers le comité (`cd.33@ufolep.org`) et le coach adverse.
```

Dans le tableau « Pile technique », après la ligne QR code, ajouter :

```md
| Feuille de match PDF | pdf-lib, @pdf-lib/fontkit (police Manrope embarquée) |
```

Dans « Organisation du code », après la ligne `roster-share/`, ajouter :

```
  pdf/           Feuille de match : modèle, dessin pdf-lib, e-mail (logique pure, sans React)
```

- [ ] **Step 5: Spec parente**

Dans `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`, juste sous le titre `## 8. PDF de la feuille officielle`, ajouter :

```md
> **Remplacée** par `docs/superpowers/specs/2026-10-14-feuille-pdf-envoi-design.md` (2026-10-14) : la feuille est générée aux couleurs de l'application, sur une page, sans remplir le PDF officiel ; l'e-mail est pré-rempli par `mailto:` et le PDF joint à la main.
```

- [ ] **Step 6: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add e2e/match.spec.ts docs/guide-utilisation.md docs/guide-utilisation.docx README.md docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md
git commit -m "docs(feuille): Test de bout en bout, guide, README et renvoi de la spec parente vers la feuille PDF"
```

---

## Fin du plan

Une fois les dix tâches commitées sur `feat/feuille-pdf-envoi` : relancer `npm run e2e` une dernière fois, puis demander la revue de la branche entière avant toute fusion dans `dev` (jamais de merge ni de push sans demande).

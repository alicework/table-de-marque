# Plan 1 — Socle et match jouable : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer une PWA hors ligne qui permet de saisir un match complet (équipes saisies à la main, paniers, fautes, temps morts, périodes, prolongations, annulation, corrections) avec reprise automatique après fermeture.

**Architecture:** Le match est un journal d'événements stocké dans IndexedDB (Dexie). Un domaine en TypeScript pur calcule tout l'état (score, fautes, temps morts, alertes) à partir du journal. L'interface React se contente d'afficher l'état calculé et d'ajouter, modifier ou retirer des événements.

**Tech Stack:** TypeScript ~6.0, React 19, Vite 8, Dexie 4 + dexie-react-hooks, vite-plugin-pwa 2, Vitest 5 + Testing Library + fake-indexeddb, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`

**Découpage global (ce plan est le premier de quatre) :**
1. **Socle et match jouable** (ce plan)
2. Licenciés et équipes : pool par club, import Webaffiligue, sélection depuis le pool, partage QR / lien / code
3. Feuille officielle PDF : gabarit, remplissage, officiels, partage
4. Stats, historique, sauvegarde : stats et graphe, historique, export/import, rappel de sauvegarde, match de démo, aide à l'installation, hébergement

## Global Constraints

- Node ≥ 22.12 (exigé par Vitest 5 et @vitejs/plugin-react 6).
- Gabarit de départ : create-vite 9.2.1, template `react-ts` (TypeScript `~6.0`, Vite `^8.3`, React `^19.2`).
- Dépendances : dexie `^4.4.6`, dexie-react-hooks `^4.4.0`, vite-plugin-pwa `^2.0.0`, vitest `^5.0.3`, jsdom `^30.1.2`, @testing-library/react `^16.3.3`, @testing-library/dom `^10.4.2`, @testing-library/user-event `^14.6.7`, @testing-library/jest-dom `^7.0.1`, fake-indexeddb `^6.2.5`, @playwright/test `^1.64.0`.
- Interface **en français uniquement**. Identifiants du code en français (vocabulaire du domaine : match, équipe, joueur, faute, période…).
- **Aucun serveur, aucun appel réseau à l'exécution** : toutes les données restent dans IndexedDB.
- L'app **avertit, ne bloque jamais** une action de match. Seules exceptions : validation d'équipe (n° en double ou invalide, nom manquant, plus de 14 joueurs).
- Les seuils réglementaires (5 fautes perso, 8 fautes d'équipe, alerte à 7, 14 joueurs, 2 joueuses, n° 0 à 99) n'existent **que** dans `src/domain/config.ts`.
- Style de code du gabarit : guillemets simples, **pas de points-virgules**, indentation 2 espaces. Attention à l'ASI : ne jamais écrire `if (a) b() else c()` sur une seule ligne.
- Le domaine (`src/domain/`) n'importe ni React, ni Dexie, ni rien de `src/ui/` ou `src/storage/`.
- **Commits : uniquement si l'utilisateur a explicitement autorisé les commits pour cette exécution.** Format Conventional Commits, en français, titre en forme nominale (« Ajout… », « Initialisation… »). Jamais de trailer `Co-authored-by`, ni de lien vers une session ou un artefact.
- Travailler sur une branche dédiée (ex. `feat/socle-match-jouable`), jamais directement sur `main`.

## Review Focus

1. **Double tap sur une tuile joueur** : le marqueur tape vite ; une seule action doit être enregistrée. → test dans la Task 8.
2. **Fermeture ou rechargement en plein match** : à la réouverture, l'app revient directement sur le match en cours avec le même score. → tests dans la Task 11 et la Task 13.
3. **Saisie de n° de maillot approximative** (`""`, `"07"`, `"7.5"`, `"-3"`, `"100"`, espaces) : `07` vaut 7, le reste est refusé avec un message clair, jamais un n° 0 silencieux. → tests dans la Task 7.
4. **Annulation qui franchit un changement de période** : annuler le début de la 2ème mi-temps doit restaurer la 1ère mi-temps et ses compteurs de fautes d'équipe. → test dans la Task 3.
5. **Correction d'une action vers l'autre équipe** : déplacer un panier de A vers B impose de choisir un joueur de B, et les scores des deux équipes se recalculent. → tests dans la Task 3 et la Task 10.

---

## Structure des fichiers

```
index.html                         page hôte (lang fr, icônes, theme-color)
vite.config.ts                     Vite + React + PWA + config Vitest
playwright.config.ts               tests de bout en bout (3 formats d'écran)
public/icone.svg (+ PNG générés)   icône de l'app
src/
  main.tsx                         point d'entrée React
  App.tsx                          navigation entre écrans + reprise auto
  styles.css                       thème sombre, gros boutons
  pwa.d.ts                         types du module virtuel PWA
  domain/                          TypeScript pur, sans UI ni stockage
    types.ts                       types Match, Evenement, EquipeMatch…
    config.ts                      seuils réglementaires UFOLEP
    match.ts                       création d'un match, ids, tri par n°
    etat.ts                        calcul de l'état à partir du journal
    periodes.ts                    enchaînement et libellés des périodes
    regles.ts                      niveaux de fautes, alertes
    commandes.ts                   opérations sur le journal (ajout, annulation…)
    equipe.ts                      validation d'équipe, modifications en cours de match
  storage/
    db.ts                          base Dexie
    matchs.ts                      lecture / écriture des matchs
  ui/
    format.ts                      descriptions d'actions, pastilles, dates
    useMatch.ts                    hook : match courant + application d'opérations
    MiseAJour.tsx                  bandeau « nouvelle version » (hors match)
    Accueil.tsx                    écran d'accueil
    commun/Dialogue.tsx            boîte de dialogue modale
    preparation/                   écran « Nouveau match »
      brouillon.ts                 brouillon de formulaire → EquipeMatch
      EditeurEquipe.tsx            saisie d'une équipe
      PreparationMatch.tsx         écran complet
    saisie/                        écrans pendant le match
      types.ts                     ActionEnAttente
      Bandeau.tsx                  score, période, fautes d'équipe, TM
      EcranAction.tsx              boutons +1/+2/+3/F/Temps mort
      ChoixJoueur.tsx              tuiles « quel joueur ? »
      Alertes.tsx                  liste des alertes réglementaires
      FinPeriode.tsx               dialogue de fin de période
      MatchTermine.tsx             écran de fin
      EcranMatch.tsx               conteneur : enchaîne les vues
    journal/
      Journal.tsx                  liste des actions, annulation, suppression
      EditionEvenement.tsx         modification d'une action
      GestionJoueurs.tsx           ajout de joueur, changement de n°
  test/
    setup.ts                       fake-indexeddb, jest-dom, nettoyage
    fixtures.ts                    match et équipes de test
    remplirEquipe.ts               aide de test pour le formulaire d'équipe
    stub-pwa-register.ts           remplace le module virtuel PWA en test
e2e/match.spec.ts                  parcours complet + hors ligne
```

---

### Task 1 : Initialisation du projet

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `.oxlintrc.json`, `index.html` (copiés du gabarit puis adaptés)
- Create: `src/main.tsx`, `src/App.tsx`, `src/styles.css`, `src/test/setup.ts`
- Modify: `.gitignore`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes : rien.
- Produces : scripts npm `test` (watch), `test:run`, `typecheck`, `build`, `dev`, `preview`. Config Vitest : environnement `jsdom`, setup `src/test/setup.ts`, tests `src/**/*.test.{ts,tsx}`.

- [ ] **Step 1 : Récupérer le gabarit create-vite**

```bash
rm -rf /tmp/create-vite-tpl && mkdir -p /tmp/create-vite-tpl && cd /tmp/create-vite-tpl
npm pack create-vite@9.2.1
tar xzf create-vite-9.2.1.tgz
cd -
T=/tmp/create-vite-tpl/package/template-react-ts
cp $T/package.json $T/tsconfig.json $T/tsconfig.app.json $T/tsconfig.node.json $T/vite.config.ts .
cp -R $T/src .
cp $T/_oxlintrc.json .oxlintrc.json
cat $T/_gitignore >> .gitignore
rm -rf src/assets src/App.css src/index.css
mkdir -p public
```

Note : on copie le gabarit au lieu de lancer `npm create vite`, car le dossier n'est pas vide (PDF, CSV, docs) et l'option d'écrasement de create-vite viderait le dossier.

- [ ] **Step 2 : Renommer le projet et ajouter les scripts**

```bash
npm pkg set name=table-de-marque-ufolep
npm pkg set scripts.test="vitest" scripts.test:run="vitest run" scripts.typecheck="tsc -b"
```

- [ ] **Step 3 : Activer le mode strict de TypeScript**

Dans `tsconfig.app.json`, dans `compilerOptions`, juste après `"jsx": "react-jsx",`, ajouter :

```json
    "strict": true,
```

- [ ] **Step 4 : Installer les dépendances**

```bash
npm install
npm install dexie@^4.4.6 dexie-react-hooks@^4.4.0
npm install -D vitest@^5.0.3 jsdom@^30.1.2 @testing-library/react@^16.3.3 @testing-library/dom@^10.4.2 @testing-library/user-event@^14.6.7 @testing-library/jest-dom@^7.0.1 fake-indexeddb@^6.2.5
```

- [ ] **Step 5 : Écrire la configuration Vite / Vitest**

Remplacer `vite.config.ts` par :

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

- [ ] **Step 6 : Écrire le fichier de setup des tests**

`src/test/setup.ts` :

```ts
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
```

- [ ] **Step 7 : Écrire le test de fumée (il doit échouer)**

`src/App.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('affiche le titre', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Table de marque' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 8 : Lancer le test pour vérifier qu'il échoue**

Run : `npx vitest run src/App.test.tsx`
Expected : FAIL (le `App.tsx` du gabarit n'affiche pas « Table de marque »).

- [ ] **Step 9 : Remplacer l'app du gabarit**

`src/App.tsx` :

```tsx
export default function App() {
  return (
    <main className="app">
      <h1>Table de marque</h1>
    </main>
  )
}
```

`src/main.tsx` :

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

`src/styles.css` (remplacé en entier à la Task 6) :

```css
:root {
  color-scheme: dark;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: #16161b;
  color: #f2f2f5;
}

body {
  margin: 0;
}
```

`index.html` :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Table de marque — Basket UFOLEP 33</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10 : Vérifier tests, types et build**

Run : `npm run test:run && npm run build`
Expected : 1 test PASS ; `tsc -b` sans erreur ; `dist/` généré.

- [ ] **Step 11 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add .gitignore .oxlintrc.json index.html package.json package-lock.json tsconfig*.json vite.config.ts src
git commit -m "chore(app): Initialisation du projet Vite React TypeScript avec Vitest"
```

---

### Task 2 : Domaine — types, création d'un match, calcul de l'état

**Files:**
- Create: `src/domain/types.ts`, `src/domain/config.ts`, `src/domain/match.ts`, `src/domain/commandes.ts`, `src/domain/etat.ts`, `src/test/fixtures.ts`
- Test: `src/domain/etat.test.ts`

**Interfaces:**
- Consumes : rien.
- Produces :
  - `types.ts` : `EquipeId`, `EQUIPES`, `Civilite`, `Periode`, `JoueurMatch`, `Coach`, `EquipeMatch`, `Officiels`, `Evenement`, `NouvelEvenement`, `StatutMatch`, `Match` (voir code).
  - `config.ts` : `REGLES` (`fautesPersoMax`, `seuilFautesEquipe`, `alerteFautesEquipe`, `joueursMax`, `joueusesMin`, `numeroMin`, `numeroMax`).
  - `match.ts` : `OFFICIELS_VIDES: Officiels`, `nouvelId(): string`, `parNumero(a: JoueurMatch, b: JoueurMatch): number`, `nouveauMatch(params: { date: string; lieu: string; equipes: Record<EquipeId, EquipeMatch> }, maintenant?: Date): Match`.
  - `commandes.ts` : `ajouterEvenement(match: Match, evenement: NouvelEvenement): Match`.
  - `etat.ts` : `StatsJoueur`, `EtatEquipe`, `LigneChronologie`, `EtatMatch`, `calculerEtat(match: Match): EtatMatch`, `fautesEquipeEnCours(etat: EtatMatch, equipe: EquipeId): number`, `tempsMortsEnCours(etat: EtatMatch, equipe: EquipeId): number`.
  - `test/fixtures.ts` : `EQUIPE_A`, `EQUIPE_B`, `matchDeTest(...evenements: NouvelEvenement[]): Match`, `panier()`, `faute()`, `tempsMort()`, `debut()`.

- [ ] **Step 1 : Écrire les types**

`src/domain/types.ts` :

```ts
export type EquipeId = 'A' | 'B'
export const EQUIPES: readonly EquipeId[] = ['A', 'B']

export type Civilite = 'M' | 'Mme' | null

/** MT1, MT2, puis P1, P2… pour les prolongations. */
export type Periode = 'MT1' | 'MT2' | `P${number}`

export interface JoueurMatch {
  id: string
  licence: string
  nom: string
  prenom: string
  civilite: Civilite
  numero: number
}

export type Coach =
  | { type: 'joueur'; joueurId: string }
  | { type: 'libre'; nom: string }
  | null

export interface EquipeMatch {
  nom: string
  couleur: string
  joueurs: JoueurMatch[]
  coach: Coach
}

export interface Officiels {
  chronometreur: string
  operateur30s: string
  marqueur: string
  arbitre: string
  aideArbitre: string
  capitaineA: string
  capitaineB: string
}

export type Evenement =
  | { id: string; type: 'panier'; equipe: EquipeId; joueurId: string; valeur: 1 | 2 | 3 }
  /** joueurId null = faute du coach */
  | { id: string; type: 'faute'; equipe: EquipeId; joueurId: string | null }
  | { id: string; type: 'tempsMort'; equipe: EquipeId }
  | { id: string; type: 'debutPeriode'; periode: Periode }
  | { id: string; type: 'finMatch' }

type SansId<T> = T extends unknown ? Omit<T, 'id'> : never
export type NouvelEvenement = SansId<Evenement>

export type StatutMatch = 'en_cours' | 'termine'

export interface Match {
  id: string
  versionFormat: 1
  /** AAAA-MM-JJ */
  date: string
  lieu: string
  statut: StatutMatch
  equipes: Record<EquipeId, EquipeMatch>
  officiels: Officiels
  evenements: Evenement[]
  creeLe: string
  modifieLe: string
}
```

- [ ] **Step 2 : Écrire la configuration réglementaire**

`src/domain/config.ts` :

```ts
/** Règlement basket loisir UFOLEP 33, saison 2025-2026. Seul endroit où ces seuils existent. */
export const REGLES = {
  fautesPersoMax: 5,
  seuilFautesEquipe: 8,
  alerteFautesEquipe: 7,
  joueursMax: 14,
  joueusesMin: 2,
  numeroMin: 0,
  numeroMax: 99,
} as const
```

- [ ] **Step 3 : Écrire la création de match et l'ajout d'événement**

`src/domain/match.ts` :

```ts
import type { EquipeId, EquipeMatch, JoueurMatch, Match, Officiels } from './types'

export const OFFICIELS_VIDES: Officiels = {
  chronometreur: '',
  operateur30s: '',
  marqueur: '',
  arbitre: '',
  aideArbitre: '',
  capitaineA: '',
  capitaineB: '',
}

/** randomUUID n'existe qu'en contexte sécurisé (https, localhost) : repli pour un essai en http sur le réseau local. */
export function nouvelId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export const parNumero = (a: JoueurMatch, b: JoueurMatch) => a.numero - b.numero

export function nouveauMatch(
  params: { date: string; lieu: string; equipes: Record<EquipeId, EquipeMatch> },
  maintenant = new Date(),
): Match {
  const horodatage = maintenant.toISOString()
  return {
    id: nouvelId(),
    versionFormat: 1,
    date: params.date,
    lieu: params.lieu,
    statut: 'en_cours',
    equipes: params.equipes,
    officiels: { ...OFFICIELS_VIDES },
    evenements: [],
    creeLe: horodatage,
    modifieLe: horodatage,
  }
}
```

`src/domain/commandes.ts` (complété à la Task 3) :

```ts
import { nouvelId } from './match'
import type { Evenement, Match, NouvelEvenement } from './types'

export function ajouterEvenement(match: Match, evenement: NouvelEvenement): Match {
  return { ...match, evenements: [...match.evenements, { ...evenement, id: nouvelId() } as Evenement] }
}
```

- [ ] **Step 4 : Écrire les fixtures de test**

`src/test/fixtures.ts` :

```ts
import { ajouterEvenement } from '../domain/commandes'
import { nouveauMatch } from '../domain/match'
import type { Civilite, EquipeId, EquipeMatch, JoueurMatch, Match, NouvelEvenement, Periode } from '../domain/types'

function joueur(id: string, numero: number, civilite: Civilite = 'M'): JoueurMatch {
  return { id, numero, civilite, licence: `LIC-${id}`, nom: `Nom${id}`, prenom: `Prenom${id}` }
}

export const EQUIPE_A: EquipeMatch = {
  nom: 'ST DELPHIN',
  couleur: 'Vert',
  joueurs: [joueur('a4', 4, 'Mme'), joueur('a7', 7), joueur('a9', 9, 'Mme'), joueur('a11', 11), joueur('a15', 15)],
  coach: { type: 'joueur', joueurId: 'a7' },
}

export const EQUIPE_B: EquipeMatch = {
  nom: 'GRADIGNAN',
  couleur: 'Noir',
  joueurs: [joueur('b5', 5, 'Mme'), joueur('b8', 8), joueur('b10', 10, 'Mme')],
  coach: { type: 'libre', nom: 'Morgan F.' },
}

export function matchDeTest(...evenements: NouvelEvenement[]): Match {
  const base = nouveauMatch(
    { date: '2026-10-16', lieu: 'Villenave-d’Ornon', equipes: { A: EQUIPE_A, B: EQUIPE_B } },
    new Date('2026-10-16T19:00:00Z'),
  )
  return evenements.reduce(ajouterEvenement, base)
}

export const panier = (equipe: EquipeId, joueurId: string, valeur: 1 | 2 | 3): NouvelEvenement => ({
  type: 'panier',
  equipe,
  joueurId,
  valeur,
})
export const faute = (equipe: EquipeId, joueurId: string | null): NouvelEvenement => ({ type: 'faute', equipe, joueurId })
export const tempsMort = (equipe: EquipeId): NouvelEvenement => ({ type: 'tempsMort', equipe })
export const debut = (periode: Periode): NouvelEvenement => ({ type: 'debutPeriode', periode })
```

- [ ] **Step 5 : Écrire les tests du calcul d'état (ils doivent échouer)**

`src/domain/etat.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { debut, faute, matchDeTest, panier, tempsMort } from '../test/fixtures'
import { calculerEtat, fautesEquipeEnCours, tempsMortsEnCours } from './etat'

describe('calculerEtat', () => {
  it('démarre en 1ère mi-temps à 0–0', () => {
    const etat = calculerEtat(matchDeTest())
    expect(etat.periode).toBe('MT1')
    expect(etat.periodes).toEqual(['MT1'])
    expect(etat.termine).toBe(false)
    expect(etat.equipes.A.score).toBe(0)
    expect(etat.equipes.B.score).toBe(0)
  })

  it('cumule les paniers par équipe, par période et par joueur', () => {
    const etat = calculerEtat(
      matchDeTest(panier('A', 'a7', 2), panier('A', 'a7', 3), panier('B', 'b5', 1), debut('MT2'), panier('A', 'a4', 2)),
    )
    expect(etat.equipes.A.score).toBe(7)
    expect(etat.equipes.B.score).toBe(1)
    expect(etat.equipes.A.pointsParPeriode).toEqual({ MT1: 5, MT2: 2 })
    expect(etat.equipes.A.joueurs.a7).toEqual({ points: 5, lf: 0, deuxPts: 1, troisPts: 1, fautes: 0 })
    expect(etat.equipes.B.joueurs.b5.lf).toBe(1)
  })

  it('compte les fautes perso, les fautes du coach et les fautes d’équipe par période', () => {
    const etat = calculerEtat(
      matchDeTest(faute('A', 'a11'), faute('A', 'a11'), faute('A', null), debut('MT2'), faute('A', 'a11')),
    )
    expect(etat.equipes.A.joueurs.a11.fautes).toBe(3)
    expect(etat.equipes.A.fautesCoach).toBe(1)
    expect(etat.equipes.A.fautesEquipeParPeriode).toEqual({ MT1: 3, MT2: 1 })
    expect(fautesEquipeEnCours(etat, 'A')).toBe(1)
  })

  it('repart à zéro pour les fautes d’équipe en prolongation', () => {
    const etat = calculerEtat(matchDeTest(debut('MT2'), faute('B', 'b8'), faute('B', 'b8'), debut('P1'), faute('B', 'b10')))
    expect(etat.periode).toBe('P1')
    expect(etat.equipes.B.fautesEquipeParPeriode).toEqual({ MT2: 2, P1: 1 })
    expect(fautesEquipeEnCours(etat, 'B')).toBe(1)
  })

  it('compte les temps morts par période', () => {
    const etat = calculerEtat(matchDeTest(tempsMort('A'), tempsMort('A'), debut('MT2'), tempsMort('A')))
    expect(etat.equipes.A.tempsMortsParPeriode).toEqual({ MT1: 2, MT2: 1 })
    expect(tempsMortsEnCours(etat, 'A')).toBe(1)
    expect(tempsMortsEnCours(etat, 'B')).toBe(0)
  })

  it('marque la fin du match et donne le score après chaque action', () => {
    const etat = calculerEtat(matchDeTest(panier('A', 'a7', 2), panier('B', 'b8', 3), { type: 'finMatch' }))
    expect(etat.termine).toBe(true)
    expect(etat.chronologie.map((l) => [l.scoreA, l.scoreB])).toEqual([
      [2, 0],
      [2, 3],
      [2, 3],
    ])
    expect(etat.chronologie[0].periode).toBe('MT1')
  })
})
```

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/domain/etat.test.ts`
Expected : FAIL (« Failed to resolve import "./etat" »).

- [ ] **Step 7 : Implémenter le calcul d'état**

`src/domain/etat.ts` :

```ts
import type { EquipeId, Evenement, Match, Periode } from './types'

export interface StatsJoueur {
  points: number
  lf: number
  deuxPts: number
  troisPts: number
  fautes: number
}

export interface EtatEquipe {
  score: number
  pointsParPeriode: Record<string, number>
  fautesEquipeParPeriode: Record<string, number>
  tempsMortsParPeriode: Record<string, number>
  fautesCoach: number
  /** Indexé par JoueurMatch.id */
  joueurs: Record<string, StatsJoueur>
}

export interface LigneChronologie {
  evenement: Evenement
  /** Période pendant laquelle l'événement a eu lieu */
  periode: Periode
  /** Score après l'événement */
  scoreA: number
  scoreB: number
}

export interface EtatMatch {
  periode: Periode
  periodes: Periode[]
  termine: boolean
  equipes: Record<EquipeId, EtatEquipe>
  chronologie: LigneChronologie[]
}

function etatEquipeVide(match: Match, equipe: EquipeId): EtatEquipe {
  const joueurs: Record<string, StatsJoueur> = {}
  for (const joueur of match.equipes[equipe].joueurs) {
    joueurs[joueur.id] = { points: 0, lf: 0, deuxPts: 0, troisPts: 0, fautes: 0 }
  }
  return {
    score: 0,
    pointsParPeriode: {},
    fautesEquipeParPeriode: {},
    tempsMortsParPeriode: {},
    fautesCoach: 0,
    joueurs,
  }
}

function incrementer(compteur: Record<string, number>, cle: string, n = 1) {
  compteur[cle] = (compteur[cle] ?? 0) + n
}

export function calculerEtat(match: Match): EtatMatch {
  const equipes: Record<EquipeId, EtatEquipe> = { A: etatEquipeVide(match, 'A'), B: etatEquipeVide(match, 'B') }
  let periode: Periode = 'MT1'
  const periodes: Periode[] = ['MT1']
  let termine = false
  const chronologie: LigneChronologie[] = []

  for (const evenement of match.evenements) {
    switch (evenement.type) {
      case 'panier': {
        const equipe = equipes[evenement.equipe]
        equipe.score += evenement.valeur
        incrementer(equipe.pointsParPeriode, periode, evenement.valeur)
        const joueur = equipe.joueurs[evenement.joueurId]
        if (joueur) {
          joueur.points += evenement.valeur
          if (evenement.valeur === 1) joueur.lf++
          else if (evenement.valeur === 2) joueur.deuxPts++
          else joueur.troisPts++
        }
        break
      }
      case 'faute': {
        const equipe = equipes[evenement.equipe]
        incrementer(equipe.fautesEquipeParPeriode, periode)
        if (evenement.joueurId === null) {
          equipe.fautesCoach++
        } else {
          const joueur = equipe.joueurs[evenement.joueurId]
          if (joueur) joueur.fautes++
        }
        break
      }
      case 'tempsMort':
        incrementer(equipes[evenement.equipe].tempsMortsParPeriode, periode)
        break
      case 'debutPeriode':
        periode = evenement.periode
        periodes.push(evenement.periode)
        break
      case 'finMatch':
        termine = true
        break
    }
    chronologie.push({ evenement, periode, scoreA: equipes.A.score, scoreB: equipes.B.score })
  }

  return { periode, periodes, termine, equipes, chronologie }
}

export function fautesEquipeEnCours(etat: EtatMatch, equipe: EquipeId): number {
  return etat.equipes[equipe].fautesEquipeParPeriode[etat.periode] ?? 0
}

export function tempsMortsEnCours(etat: EtatMatch, equipe: EquipeId): number {
  return etat.equipes[equipe].tempsMortsParPeriode[etat.periode] ?? 0
}
```

- [ ] **Step 8 : Lancer les tests pour vérifier qu'ils passent**

Run : `npx vitest run src/domain/etat.test.ts && npm run typecheck`
Expected : 6 tests PASS, aucune erreur de type.

- [ ] **Step 9 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/domain src/test/fixtures.ts
git commit -m "feat(domaine): Ajout du modèle de match et du calcul de l'état à partir du journal"
```

---

### Task 3 : Domaine — règles, périodes, opérations sur le journal

**Files:**
- Create: `src/domain/periodes.ts`, `src/domain/regles.ts`
- Modify: `src/domain/commandes.ts` (remplacé en entier)
- Test: `src/domain/periodes.test.ts`, `src/domain/regles.test.ts`, `src/domain/commandes.test.ts`

**Interfaces:**
- Consumes : `calculerEtat`, `fautesEquipeEnCours`, `EtatMatch` (Task 2) ; `parNumero`, `nouvelId` (Task 2) ; `REGLES`.
- Produces :
  - `periodes.ts` : `type ChoixFinPeriode = 'periodeSuivante' | 'prolongation' | 'finMatch'`, `choixFinPeriode(etat: EtatMatch): ChoixFinPeriode[]`, `periodeSuivante(periode: Periode): Periode`, `libellePeriode(periode: Periode): string`.
  - `regles.ts` : `type NiveauFautesEquipe = 'normal' | 'attention' | 'limite'`, `type NiveauFautesJoueur = 'normal' | 'attention' | 'exclu'`, `interface Alerte { cle: string; message: string }`, `niveauFautesEquipe(fautes: number)`, `niveauFautesJoueur(fautes: number)`, `alertesActives(match: Match, etat: EtatMatch): Alerte[]`.
  - `commandes.ts` : `ajouterEvenement`, `annulerDernier(match): Match`, `remplacerEvenement(match, evenement: Evenement): Match`, `supprimerEvenement(match, id: string): Match`, `appliquerFinPeriode(match, choix: ChoixFinPeriode): Match` (lève une `Error` si le choix n'est pas permis), `rouvrirMatch(match): Match`.

- [ ] **Step 1 : Écrire les tests des périodes (ils doivent échouer)**

`src/domain/periodes.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { debut, matchDeTest, panier } from '../test/fixtures'
import { calculerEtat } from './etat'
import { choixFinPeriode, libellePeriode, periodeSuivante } from './periodes'

describe('périodes', () => {
  it('propose seulement la 2ème mi-temps à la fin de la 1ère', () => {
    expect(choixFinPeriode(calculerEtat(matchDeTest(panier('A', 'a7', 2))))).toEqual(['periodeSuivante'])
  })

  it('propose prolongation ou fin en cas d’égalité après la 2ème mi-temps', () => {
    const etat = calculerEtat(matchDeTest(debut('MT2'), panier('A', 'a7', 2), panier('B', 'b8', 2)))
    expect(choixFinPeriode(etat)).toEqual(['prolongation', 'finMatch'])
  })

  it('propose seulement la fin du match sans égalité', () => {
    expect(choixFinPeriode(calculerEtat(matchDeTest(debut('MT2'), panier('A', 'a7', 2))))).toEqual(['finMatch'])
  })

  it('ne propose rien quand le match est terminé', () => {
    expect(choixFinPeriode(calculerEtat(matchDeTest(debut('MT2'), { type: 'finMatch' })))).toEqual([])
  })

  it('enchaîne MT1, MT2, P1, P2', () => {
    expect(periodeSuivante('MT1')).toBe('MT2')
    expect(periodeSuivante('MT2')).toBe('P1')
    expect(periodeSuivante('P1')).toBe('P2')
  })

  it('donne des libellés lisibles', () => {
    expect(libellePeriode('MT1')).toBe('1ère mi-temps')
    expect(libellePeriode('MT2')).toBe('2ème mi-temps')
    expect(libellePeriode('P1')).toBe('Prolongation')
    expect(libellePeriode('P2')).toBe('Prolongation 2')
  })
})
```

- [ ] **Step 2 : Écrire les tests des règles (ils doivent échouer)**

`src/domain/regles.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { debut, faute, matchDeTest } from '../test/fixtures'
import { calculerEtat } from './etat'
import { alertesActives, niveauFautesEquipe, niveauFautesJoueur } from './regles'

const fautesA = (n: number) => Array.from({ length: n }, (_, i) => faute('A', ['a4', 'a7', 'a9', 'a11'][i % 4]))

describe('règles UFOLEP', () => {
  it('classe les fautes d’équipe : orange à 7, limite dès 8', () => {
    expect(niveauFautesEquipe(6)).toBe('normal')
    expect(niveauFautesEquipe(7)).toBe('attention')
    expect(niveauFautesEquipe(8)).toBe('limite')
    expect(niveauFautesEquipe(11)).toBe('limite')
  })

  it('classe les fautes perso : attention à 4, exclu à 5', () => {
    expect(niveauFautesJoueur(3)).toBe('normal')
    expect(niveauFautesJoueur(4)).toBe('attention')
    expect(niveauFautesJoueur(5)).toBe('exclu')
  })

  it('alerte à partir de 8 fautes d’équipe dans la période', () => {
    const match = matchDeTest(...fautesA(8))
    expect(alertesActives(match, calculerEtat(match))).toEqual([
      { cle: 'fautes-equipe-A', message: "ST DELPHIN : 8 fautes d'équipe — au-delà de 8, 2 lancers francs" },
    ])
  })

  it('n’alerte plus après le passage en prolongation', () => {
    const match = matchDeTest(debut('MT2'), ...fautesA(8), debut('P1'))
    expect(alertesActives(match, calculerEtat(match))).toEqual([])
  })

  it('alerte quand un joueur atteint 5 fautes', () => {
    const match = matchDeTest(...Array.from({ length: 5 }, () => faute('A', 'a11')))
    expect(alertesActives(match, calculerEtat(match))).toEqual([
      { cle: 'exclu-a11', message: 'ST DELPHIN : n°11 a 5 fautes, doit sortir' },
    ])
  })
})
```

- [ ] **Step 3 : Écrire les tests des opérations sur le journal (ils doivent échouer)**

`src/domain/commandes.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { debut, faute, matchDeTest, panier } from '../test/fixtures'
import {
  annulerDernier,
  appliquerFinPeriode,
  remplacerEvenement,
  rouvrirMatch,
  supprimerEvenement,
} from './commandes'
import { calculerEtat, fautesEquipeEnCours } from './etat'

describe('opérations sur le journal', () => {
  it('annule la dernière action', () => {
    const match = annulerDernier(matchDeTest(panier('A', 'a7', 2), panier('B', 'b8', 3)))
    expect(calculerEtat(match).equipes.B.score).toBe(0)
    expect(calculerEtat(match).equipes.A.score).toBe(2)
  })

  it('ne fait rien quand le journal est vide', () => {
    const match = matchDeTest()
    expect(annulerDernier(match)).toBe(match)
  })

  it('annuler le début de la 2ème mi-temps restaure la 1ère et ses fautes d’équipe', () => {
    const match = annulerDernier(matchDeTest(faute('A', 'a11'), faute('A', 'a11'), debut('MT2')))
    const etat = calculerEtat(match)
    expect(etat.periode).toBe('MT1')
    expect(fautesEquipeEnCours(etat, 'A')).toBe(2)
  })

  it('déplace un panier vers l’autre équipe et recalcule les deux scores', () => {
    const match = matchDeTest(panier('A', 'a7', 2))
    const evenement = match.evenements[0]
    if (evenement.type !== 'panier') throw new Error('panier attendu')
    const etat = calculerEtat(remplacerEvenement(match, { ...evenement, equipe: 'B', joueurId: 'b8' }))
    expect(etat.equipes.A.score).toBe(0)
    expect(etat.equipes.B.score).toBe(2)
    expect(etat.equipes.A.joueurs.a7.points).toBe(0)
    expect(etat.equipes.B.joueurs.b8.points).toBe(2)
  })

  it('supprime une action précise', () => {
    const match = matchDeTest(panier('A', 'a7', 2), panier('A', 'a4', 3))
    expect(calculerEtat(supprimerEvenement(match, match.evenements[0].id)).equipes.A.score).toBe(3)
  })

  it('passe de la 1ère à la 2ème mi-temps', () => {
    expect(calculerEtat(appliquerFinPeriode(matchDeTest(), 'periodeSuivante')).periode).toBe('MT2')
  })

  it('lance une prolongation en cas d’égalité', () => {
    expect(calculerEtat(appliquerFinPeriode(matchDeTest(debut('MT2')), 'prolongation')).periode).toBe('P1')
  })

  it('refuse une prolongation sans égalité', () => {
    const match = matchDeTest(debut('MT2'), panier('A', 'a7', 2))
    expect(() => appliquerFinPeriode(match, 'prolongation')).toThrow('Choix impossible : prolongation')
  })

  it('refuse de terminer le match à la fin de la 1ère mi-temps', () => {
    expect(() => appliquerFinPeriode(matchDeTest(), 'finMatch')).toThrow('Choix impossible : finMatch')
  })

  it('termine puis rouvre un match', () => {
    const termine = appliquerFinPeriode(matchDeTest(debut('MT2'), panier('A', 'a7', 2)), 'finMatch')
    expect(calculerEtat(termine).termine).toBe(true)
    expect(calculerEtat(rouvrirMatch(termine)).termine).toBe(false)
  })
})
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/domain`
Expected : FAIL sur les 3 nouveaux fichiers (imports `./periodes`, `./regles` introuvables, exports manquants dans `./commandes`).

- [ ] **Step 5 : Implémenter les périodes**

`src/domain/periodes.ts` :

```ts
import type { EtatMatch } from './etat'
import type { Periode } from './types'

export type ChoixFinPeriode = 'periodeSuivante' | 'prolongation' | 'finMatch'

export function choixFinPeriode(etat: EtatMatch): ChoixFinPeriode[] {
  if (etat.termine) return []
  if (etat.periode === 'MT1') return ['periodeSuivante']
  const egalite = etat.equipes.A.score === etat.equipes.B.score
  return egalite ? ['prolongation', 'finMatch'] : ['finMatch']
}

export function periodeSuivante(periode: Periode): Periode {
  if (periode === 'MT1') return 'MT2'
  if (periode === 'MT2') return 'P1'
  return `P${Number(periode.slice(1)) + 1}` as Periode
}

export function libellePeriode(periode: Periode): string {
  if (periode === 'MT1') return '1ère mi-temps'
  if (periode === 'MT2') return '2ème mi-temps'
  const numero = Number(periode.slice(1))
  return numero === 1 ? 'Prolongation' : `Prolongation ${numero}`
}
```

- [ ] **Step 6 : Implémenter les règles**

`src/domain/regles.ts` :

```ts
import { REGLES } from './config'
import { fautesEquipeEnCours, type EtatMatch } from './etat'
import { parNumero } from './match'
import { EQUIPES, type Match } from './types'

export type NiveauFautesEquipe = 'normal' | 'attention' | 'limite'
export type NiveauFautesJoueur = 'normal' | 'attention' | 'exclu'

export interface Alerte {
  cle: string
  message: string
}

export function niveauFautesEquipe(fautes: number): NiveauFautesEquipe {
  if (fautes >= REGLES.seuilFautesEquipe) return 'limite'
  if (fautes >= REGLES.alerteFautesEquipe) return 'attention'
  return 'normal'
}

export function niveauFautesJoueur(fautes: number): NiveauFautesJoueur {
  if (fautes >= REGLES.fautesPersoMax) return 'exclu'
  if (fautes === REGLES.fautesPersoMax - 1) return 'attention'
  return 'normal'
}

export function alertesActives(match: Match, etat: EtatMatch): Alerte[] {
  const alertes: Alerte[] = []
  for (const equipe of EQUIPES) {
    const nom = match.equipes[equipe].nom
    const fautesEquipe = fautesEquipeEnCours(etat, equipe)
    if (fautesEquipe >= REGLES.seuilFautesEquipe) {
      alertes.push({
        cle: `fautes-equipe-${equipe}`,
        message: `${nom} : ${fautesEquipe} fautes d'équipe — au-delà de ${REGLES.seuilFautesEquipe}, 2 lancers francs`,
      })
    }
    for (const joueur of [...match.equipes[equipe].joueurs].sort(parNumero)) {
      const fautes = etat.equipes[equipe].joueurs[joueur.id]?.fautes ?? 0
      if (fautes >= REGLES.fautesPersoMax) {
        alertes.push({ cle: `exclu-${joueur.id}`, message: `${nom} : n°${joueur.numero} a ${fautes} fautes, doit sortir` })
      }
    }
  }
  return alertes
}
```

- [ ] **Step 7 : Compléter les opérations sur le journal**

Remplacer `src/domain/commandes.ts` par :

```ts
import { calculerEtat } from './etat'
import { nouvelId } from './match'
import { choixFinPeriode, periodeSuivante, type ChoixFinPeriode } from './periodes'
import type { Evenement, Match, NouvelEvenement } from './types'

export function ajouterEvenement(match: Match, evenement: NouvelEvenement): Match {
  return { ...match, evenements: [...match.evenements, { ...evenement, id: nouvelId() } as Evenement] }
}

export function annulerDernier(match: Match): Match {
  if (match.evenements.length === 0) return match
  return { ...match, evenements: match.evenements.slice(0, -1) }
}

export function remplacerEvenement(match: Match, evenement: Evenement): Match {
  return { ...match, evenements: match.evenements.map((e) => (e.id === evenement.id ? evenement : e)) }
}

export function supprimerEvenement(match: Match, id: string): Match {
  return { ...match, evenements: match.evenements.filter((e) => e.id !== id) }
}

export function appliquerFinPeriode(match: Match, choix: ChoixFinPeriode): Match {
  const etat = calculerEtat(match)
  if (!choixFinPeriode(etat).includes(choix)) throw new Error(`Choix impossible : ${choix}`)
  if (choix === 'finMatch') return ajouterEvenement(match, { type: 'finMatch' })
  return ajouterEvenement(match, { type: 'debutPeriode', periode: periodeSuivante(etat.periode) })
}

export function rouvrirMatch(match: Match): Match {
  return { ...match, evenements: match.evenements.filter((e) => e.type !== 'finMatch') }
}
```

- [ ] **Step 8 : Lancer les tests pour vérifier qu'ils passent**

Run : `npx vitest run src/domain && npm run typecheck`
Expected : tous les tests du domaine PASS (6 + 6 + 5 + 10), aucune erreur de type.

- [ ] **Step 9 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/domain
git commit -m "feat(domaine): Ajout des règles UFOLEP, des périodes et des opérations sur le journal"
```

---

### Task 4 : Domaine — validation d'équipe et modifications en cours de match

**Files:**
- Create: `src/domain/equipe.ts`
- Test: `src/domain/equipe.test.ts`

**Interfaces:**
- Consumes : `REGLES`, `nouvelId`, types.
- Produces :
  - `interface VerificationEquipe { erreurs: string[]; avertissements: string[] }`
  - `class ErreurEquipe extends Error { readonly erreurs: string[] }`
  - `verifierEquipe(equipe: EquipeMatch): VerificationEquipe`
  - `ajouterJoueurAuMatch(match: Match, equipe: EquipeId, joueur: Omit<JoueurMatch, 'id'>): Match` (lève `ErreurEquipe`)
  - `changerNumero(match: Match, equipe: EquipeId, joueurId: string, numero: number): Match` (lève `ErreurEquipe`)

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/domain/equipe.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { EQUIPE_A, matchDeTest, panier } from '../test/fixtures'
import { ajouterJoueurAuMatch, changerNumero, ErreurEquipe, verifierEquipe } from './equipe'
import { calculerEtat } from './etat'
import type { EquipeMatch, JoueurMatch } from './types'

const avecJoueurs = (joueurs: JoueurMatch[]): EquipeMatch => ({ ...EQUIPE_A, joueurs, coach: null })
const j = (id: string, numero: number, civilite: JoueurMatch['civilite'] = 'Mme'): JoueurMatch => ({
  id,
  numero,
  civilite,
  nom: `Nom${id}`,
  prenom: '',
  licence: '',
})

describe('verifierEquipe', () => {
  it('accepte une équipe correcte', () => {
    expect(verifierEquipe(EQUIPE_A)).toEqual({ erreurs: [], avertissements: [] })
  })

  it('signale un n° attribué deux fois', () => {
    expect(verifierEquipe(avecJoueurs([j('x', 4), j('y', 4)])).erreurs).toEqual(['Le n°4 est attribué plusieurs fois.'])
  })

  it('refuse les n° hors de 0 à 99 ou non entiers', () => {
    const { erreurs } = verifierEquipe(avecJoueurs([j('x', Number.NaN), j('y', 100), j('z', 7.5)]))
    expect(erreurs).toHaveLength(3)
    expect(erreurs[0]).toBe('N° manquant ou invalide pour Nomx (0 à 99).')
  })

  it('refuse plus de 14 joueurs', () => {
    const joueurs = Array.from({ length: 15 }, (_, i) => j(`p${i}`, i))
    expect(verifierEquipe(avecJoueurs(joueurs)).erreurs).toContain('14 joueurs maximum (lignes de la feuille).')
  })

  it('exige un nom d’équipe, au moins un joueur et un nom par joueur', () => {
    const { erreurs } = verifierEquipe({ nom: ' ', couleur: '', joueurs: [], coach: null })
    expect(erreurs).toEqual(["Le nom de l'équipe est obligatoire.", 'Ajoutez au moins un joueur.'])
    expect(verifierEquipe(avecJoueurs([{ ...j('x', 4), nom: '' }])).erreurs).toEqual([
      'Nom manquant pour le joueur n°4.',
    ])
  })

  it('refuse un coach qui ne fait pas partie des joueurs', () => {
    const equipe: EquipeMatch = { ...EQUIPE_A, coach: { type: 'joueur', joueurId: 'inconnu' } }
    expect(verifierEquipe(equipe).erreurs).toEqual(['Le coach sélectionné ne fait pas partie des joueurs.'])
  })

  it('avertit, sans bloquer, s’il y a moins de 2 joueuses', () => {
    const resultat = verifierEquipe(avecJoueurs([j('x', 4, 'Mme'), j('y', 5, 'M'), j('z', 6, null)]))
    expect(resultat.erreurs).toEqual([])
    expect(resultat.avertissements).toEqual(['Seulement 1 joueuse : il en faut au moins 2 sur le terrain.'])
  })
})

describe('modifications en cours de match', () => {
  it('ajoute un joueur retardataire', () => {
    const match = ajouterJoueurAuMatch(matchDeTest(), 'B', {
      numero: 12,
      nom: 'Retard',
      prenom: 'Léa',
      licence: '',
      civilite: 'Mme',
    })
    expect(match.equipes.B.joueurs.map((x) => x.numero)).toEqual([5, 8, 10, 12])
  })

  it('refuse un joueur ajouté avec un n° déjà pris', () => {
    const ajout = () =>
      ajouterJoueurAuMatch(matchDeTest(), 'B', { numero: 8, nom: 'Double', prenom: '', licence: '', civilite: 'M' })
    expect(ajout).toThrow(ErreurEquipe)
    expect(ajout).toThrow('Le n°8 est attribué plusieurs fois.')
  })

  it('change un n° sans perdre les points du joueur', () => {
    const match = changerNumero(matchDeTest(panier('A', 'a7', 3)), 'A', 'a7', 21)
    expect(match.equipes.A.joueurs.find((x) => x.id === 'a7')?.numero).toBe(21)
    expect(calculerEtat(match).equipes.A.joueurs.a7.points).toBe(3)
  })

  it('refuse un changement vers un n° déjà pris', () => {
    expect(() => changerNumero(matchDeTest(), 'A', 'a7', 4)).toThrow('Le n°4 est attribué plusieurs fois.')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/domain/equipe.test.ts`
Expected : FAIL (« Failed to resolve import "./equipe" »).

- [ ] **Step 3 : Implémenter**

`src/domain/equipe.ts` :

```ts
import { REGLES } from './config'
import { nouvelId } from './match'
import type { EquipeId, EquipeMatch, JoueurMatch, Match } from './types'

export interface VerificationEquipe {
  erreurs: string[]
  avertissements: string[]
}

export class ErreurEquipe extends Error {
  readonly erreurs: string[]

  constructor(erreurs: string[]) {
    super(erreurs.join(' '))
    this.name = 'ErreurEquipe'
    this.erreurs = erreurs
  }
}

export function verifierEquipe(equipe: EquipeMatch): VerificationEquipe {
  const erreurs: string[] = []
  const avertissements: string[] = []

  if (!equipe.nom.trim()) erreurs.push("Le nom de l'équipe est obligatoire.")
  if (equipe.joueurs.length === 0) erreurs.push('Ajoutez au moins un joueur.')
  if (equipe.joueurs.length > REGLES.joueursMax) {
    erreurs.push(`${REGLES.joueursMax} joueurs maximum (lignes de la feuille).`)
  }

  const vus = new Set<number>()
  const doubles = new Set<number>()
  for (const joueur of equipe.joueurs) {
    const valide =
      Number.isInteger(joueur.numero) && joueur.numero >= REGLES.numeroMin && joueur.numero <= REGLES.numeroMax
    if (!valide) {
      erreurs.push(
        `N° manquant ou invalide pour ${joueur.nom || 'un joueur'} (${REGLES.numeroMin} à ${REGLES.numeroMax}).`,
      )
    } else if (vus.has(joueur.numero)) {
      doubles.add(joueur.numero)
    } else {
      vus.add(joueur.numero)
    }
    if (!joueur.nom.trim()) erreurs.push(`Nom manquant pour le joueur n°${valide ? joueur.numero : '?'}.`)
  }
  for (const numero of [...doubles].sort((a, b) => a - b)) {
    erreurs.push(`Le n°${numero} est attribué plusieurs fois.`)
  }

  const coach = equipe.coach
  if (coach?.type === 'joueur' && !equipe.joueurs.some((joueur) => joueur.id === coach.joueurId)) {
    erreurs.push('Le coach sélectionné ne fait pas partie des joueurs.')
  }

  const joueuses = equipe.joueurs.filter((joueur) => joueur.civilite === 'Mme').length
  if (joueuses < REGLES.joueusesMin) {
    avertissements.push(
      `Seulement ${joueuses} joueuse${joueuses > 1 ? 's' : ''} : il en faut au moins ${REGLES.joueusesMin} sur le terrain.`,
    )
  }

  return { erreurs, avertissements }
}

function remplacerEquipe(match: Match, equipe: EquipeId, nouvelle: EquipeMatch): Match {
  const { erreurs } = verifierEquipe(nouvelle)
  if (erreurs.length > 0) throw new ErreurEquipe(erreurs)
  return { ...match, equipes: { ...match.equipes, [equipe]: nouvelle } }
}

export function ajouterJoueurAuMatch(match: Match, equipe: EquipeId, joueur: Omit<JoueurMatch, 'id'>): Match {
  const actuelle = match.equipes[equipe]
  return remplacerEquipe(match, equipe, { ...actuelle, joueurs: [...actuelle.joueurs, { ...joueur, id: nouvelId() }] })
}

export function changerNumero(match: Match, equipe: EquipeId, joueurId: string, numero: number): Match {
  const actuelle = match.equipes[equipe]
  return remplacerEquipe(match, equipe, {
    ...actuelle,
    joueurs: actuelle.joueurs.map((joueur) => (joueur.id === joueurId ? { ...joueur, numero } : joueur)),
  })
}
```

- [ ] **Step 4 : Lancer les tests pour vérifier qu'ils passent**

Run : `npx vitest run src/domain/equipe.test.ts && npm run typecheck`
Expected : 11 tests PASS, aucune erreur de type.

- [ ] **Step 5 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/domain/equipe.ts src/domain/equipe.test.ts
git commit -m "feat(domaine): Ajout de la validation d'équipe et des modifications en cours de match"
```

---

### Task 5 : Stockage des matchs (Dexie)

**Files:**
- Create: `src/storage/db.ts`, `src/storage/matchs.ts`
- Modify: `src/test/setup.ts` (remplacé en entier)
- Test: `src/storage/matchs.test.ts`

**Interfaces:**
- Consumes : `Match` (Task 2).
- Produces :
  - `db.ts` : `db` (Dexie, base `table-de-marque`, table `matchs` indexée sur `id, statut, modifieLe`).
  - `matchs.ts` : `enregistrerMatch(match: Match, maintenant?: Date): Promise<Match>` (recalcule `statut` d'après la présence d'un événement `finMatch` et met à jour `modifieLe`), `lireMatch(id: string): Promise<Match | undefined>`, `matchEnCours(): Promise<Match | undefined>` (le match non terminé modifié le plus récemment).

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/storage/matchs.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { matchDeTest, panier } from '../test/fixtures'
import { enregistrerMatch, lireMatch, matchEnCours } from './matchs'

describe('stockage des matchs', () => {
  it('enregistre et relit un match', async () => {
    const match = await enregistrerMatch(matchDeTest(panier('A', 'a7', 2)), new Date('2026-10-16T20:00:00Z'))
    const relu = await lireMatch(match.id)
    expect(relu?.evenements).toHaveLength(1)
    expect(relu?.modifieLe).toBe('2026-10-16T20:00:00.000Z')
  })

  it('déduit le statut de la présence d’un événement de fin de match', async () => {
    const enCours = await enregistrerMatch(matchDeTest())
    const termine = await enregistrerMatch(matchDeTest({ type: 'finMatch' }))
    expect(enCours.statut).toBe('en_cours')
    expect(termine.statut).toBe('termine')
  })

  it('renvoie le match en cours modifié le plus récemment', async () => {
    const ancien = await enregistrerMatch(matchDeTest(), new Date('2026-10-16T19:00:00Z'))
    const recent = await enregistrerMatch(matchDeTest(), new Date('2026-10-16T21:00:00Z'))
    await enregistrerMatch(matchDeTest({ type: 'finMatch' }), new Date('2026-10-16T22:00:00Z'))
    expect((await matchEnCours())?.id).toBe(recent.id)
    expect(ancien.id).not.toBe(recent.id)
  })

  it('ne renvoie rien quand aucun match n’est en cours', async () => {
    expect(await matchEnCours()).toBeUndefined()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/storage`
Expected : FAIL (« Failed to resolve import "./matchs" »).

- [ ] **Step 3 : Implémenter la base et le dépôt**

`src/storage/db.ts` :

```ts
import { Dexie, type EntityTable } from 'dexie'
import type { Match } from '../domain/types'

export const db = new Dexie('table-de-marque') as Dexie & {
  matchs: EntityTable<Match, 'id'>
}

db.version(1).stores({
  matchs: 'id, statut, modifieLe',
})
```

`src/storage/matchs.ts` :

```ts
import type { Match } from '../domain/types'
import { db } from './db'

export async function enregistrerMatch(match: Match, maintenant = new Date()): Promise<Match> {
  const aEnregistrer: Match = {
    ...match,
    statut: match.evenements.some((e) => e.type === 'finMatch') ? 'termine' : 'en_cours',
    modifieLe: maintenant.toISOString(),
  }
  await db.matchs.put(aEnregistrer)
  return aEnregistrer
}

export function lireMatch(id: string): Promise<Match | undefined> {
  return db.matchs.get(id)
}

export async function matchEnCours(): Promise<Match | undefined> {
  const enCours = await db.matchs.where('statut').equals('en_cours').toArray()
  return enCours.sort((a, b) => b.modifieLe.localeCompare(a.modifieLe))[0]
}
```

- [ ] **Step 4 : Vider la base entre deux tests**

Remplacer `src/test/setup.ts` par :

```ts
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { db } from '../storage/db'

afterEach(async () => {
  cleanup()
  vi.restoreAllMocks()
  await Promise.all(db.tables.map((table) => table.clear()))
})
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck`
Expected : tous les tests PASS (dont 4 nouveaux), aucune erreur de type.

- [ ] **Step 6 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/storage src/test/setup.ts
git commit -m "feat(stockage): Ajout de la persistance locale des matchs avec Dexie"
```

---

### Task 6 : Briques d'interface communes

**Files:**
- Create: `src/ui/format.ts`, `src/ui/commun/Dialogue.tsx`, `src/ui/useMatch.ts`
- Modify: `src/styles.css` (remplacé en entier)
- Test: `src/ui/format.test.ts`, `src/ui/useMatch.test.tsx`

**Interfaces:**
- Consumes : `libellePeriode` (Task 3), `REGLES`, `enregistrerMatch`, `lireMatch` (Task 5), `ajouterEvenement` (Task 2).
- Produces :
  - `format.ts` : `pluriel(n: number, mot: string): string` (« 1 faute », « 2 points »), `pastillesFautes(fautes: number): string` (« ●●○○○ »), `decrireEvenement(match: Match, evenement: Evenement): string`, `aujourdhui(date?: Date): string` (« AAAA-MM-JJ », heure locale).
  - `Dialogue.tsx` : `Dialogue({ titre: string; children?: ReactNode; actions: ReactNode })` → `role="dialog"` nommé par son titre.
  - `useMatch.ts` : `MESSAGE_ERREUR_STOCKAGE: string`, `type Operation = (match: Match) => Match`, `type Appliquer = (operation: Operation) => Promise<string | null>`, `useMatch(matchId: string): { match: Match | undefined; appliquer: Appliquer; erreurStockage: string | null; effacerErreurStockage: () => void }`. `appliquer` exécute les opérations **l'une après l'autre**, relit le match en base avant chaque opération, renvoie `null` si tout va bien, le message d'erreur métier si l'opération lève une exception (rien n'est enregistré), ou `MESSAGE_ERREUR_STOCKAGE` si l'écriture échoue (et renseigne alors `erreurStockage`).
  - Classes CSS utilisées par toutes les tâches suivantes (voir `styles.css`).

- [ ] **Step 1 : Écrire les tests de formatage (ils doivent échouer)**

`src/ui/format.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { debut, faute, matchDeTest, panier, tempsMort } from '../test/fixtures'
import { aujourdhui, decrireEvenement, pastillesFautes, pluriel } from './format'

describe('format', () => {
  it('accorde au pluriel', () => {
    expect(pluriel(0, 'point')).toBe('0 point')
    expect(pluriel(1, 'faute')).toBe('1 faute')
    expect(pluriel(2, 'faute')).toBe('2 fautes')
  })

  it('dessine les pastilles de fautes', () => {
    expect(pastillesFautes(0)).toBe('○○○○○')
    expect(pastillesFautes(2)).toBe('●●○○○')
    expect(pastillesFautes(7)).toBe('●●●●●')
  })

  it('décrit chaque type d’action', () => {
    const match = matchDeTest(
      panier('A', 'a7', 2),
      faute('B', 'b8'),
      faute('A', null),
      tempsMort('B'),
      debut('MT2'),
      { type: 'finMatch' },
    )
    expect(match.evenements.map((e) => decrireEvenement(match, e))).toEqual([
      '+2 n°7 ST DELPHIN',
      'Faute n°8 GRADIGNAN',
      'Faute coach ST DELPHIN',
      'Temps mort GRADIGNAN',
      'Début : 2ème mi-temps',
      'Fin du match',
    ])
  })

  it('formate la date du jour en heure locale', () => {
    expect(aujourdhui(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05')
  })
})
```

- [ ] **Step 2 : Écrire les tests du hook (ils doivent échouer)**

`src/ui/useMatch.test.tsx` :

```tsx
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ajouterEvenement } from '../domain/commandes'
import { db } from '../storage/db'
import { enregistrerMatch, lireMatch } from '../storage/matchs'
import { matchDeTest, panier } from '../test/fixtures'
import { MESSAGE_ERREUR_STOCKAGE, useMatch } from './useMatch'

async function monter() {
  const match = await enregistrerMatch(matchDeTest())
  const rendu = renderHook(() => useMatch(match.id))
  await waitFor(() => expect(rendu.result.current.match).toBeDefined())
  return { id: match.id, result: rendu.result }
}

describe('useMatch', () => {
  it('applique une opération et la persiste', async () => {
    const { id, result } = await monter()
    let retour: string | null = 'non appelé'
    await act(async () => {
      retour = await result.current.appliquer((m) => ajouterEvenement(m, panier('A', 'a7', 2)))
    })
    expect(retour).toBeNull()
    expect((await lireMatch(id))?.evenements).toHaveLength(1)
    await waitFor(() => expect(result.current.match?.evenements).toHaveLength(1))
  })

  it('enchaîne les opérations rapprochées sans en perdre', async () => {
    const { id, result } = await monter()
    await act(async () => {
      await Promise.all([
        result.current.appliquer((m) => ajouterEvenement(m, panier('A', 'a7', 2))),
        result.current.appliquer((m) => ajouterEvenement(m, panier('B', 'b8', 3))),
      ])
    })
    expect((await lireMatch(id))?.evenements).toHaveLength(2)
  })

  it('renvoie le message d’une erreur métier sans rien enregistrer', async () => {
    const { id, result } = await monter()
    let retour: string | null = null
    await act(async () => {
      retour = await result.current.appliquer(() => {
        throw new Error('Interdit')
      })
    })
    expect(retour).toBe('Interdit')
    expect((await lireMatch(id))?.evenements).toHaveLength(0)
    expect(result.current.erreurStockage).toBeNull()
  })

  it('signale un échec d’écriture', async () => {
    const { result } = await monter()
    vi.spyOn(db.matchs, 'put').mockRejectedValueOnce(new Error('QuotaExceededError'))
    let retour: string | null = null
    await act(async () => {
      retour = await result.current.appliquer((m) => ajouterEvenement(m, panier('A', 'a7', 2)))
    })
    expect(retour).toBe(MESSAGE_ERREUR_STOCKAGE)
    expect(result.current.erreurStockage).toBe(MESSAGE_ERREUR_STOCKAGE)
  })
})
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui`
Expected : FAIL (« Failed to resolve import "./format" » et « ./useMatch »).

- [ ] **Step 4 : Implémenter le formatage**

`src/ui/format.ts` :

```ts
import { REGLES } from '../domain/config'
import { libellePeriode } from '../domain/periodes'
import type { EquipeId, Evenement, Match } from '../domain/types'

export function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? 's' : ''}`
}

export function pastillesFautes(fautes: number): string {
  const pleines = Math.min(fautes, REGLES.fautesPersoMax)
  return '●'.repeat(pleines) + '○'.repeat(REGLES.fautesPersoMax - pleines)
}

function numeroJoueur(match: Match, equipe: EquipeId, joueurId: string): string {
  const joueur = match.equipes[equipe].joueurs.find((j) => j.id === joueurId)
  return joueur ? `n°${joueur.numero}` : 'n°?'
}

export function decrireEvenement(match: Match, evenement: Evenement): string {
  switch (evenement.type) {
    case 'panier':
      return `+${evenement.valeur} ${numeroJoueur(match, evenement.equipe, evenement.joueurId)} ${match.equipes[evenement.equipe].nom}`
    case 'faute':
      return evenement.joueurId === null
        ? `Faute coach ${match.equipes[evenement.equipe].nom}`
        : `Faute ${numeroJoueur(match, evenement.equipe, evenement.joueurId)} ${match.equipes[evenement.equipe].nom}`
    case 'tempsMort':
      return `Temps mort ${match.equipes[evenement.equipe].nom}`
    case 'debutPeriode':
      return `Début : ${libellePeriode(evenement.periode)}`
    case 'finMatch':
      return 'Fin du match'
  }
}

export function aujourdhui(date = new Date()): string {
  const deuxChiffres = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${deuxChiffres(date.getMonth() + 1)}-${deuxChiffres(date.getDate())}`
}
```

- [ ] **Step 5 : Implémenter le dialogue**

`src/ui/commun/Dialogue.tsx` :

```tsx
import { useId, type ReactNode } from 'react'

interface Props {
  titre: string
  children?: ReactNode
  actions: ReactNode
}

export function Dialogue({ titre, children, actions }: Props) {
  const idTitre = useId()
  return (
    <div className="voile">
      <div className="dialogue" role="dialog" aria-modal="true" aria-labelledby={idTitre}>
        <h2 id={idTitre}>{titre}</h2>
        {children}
        <div className="dialogue-actions">{actions}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6 : Implémenter le hook**

`src/ui/useMatch.ts` :

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useRef, useState } from 'react'
import type { Match } from '../domain/types'
import { enregistrerMatch, lireMatch } from '../storage/matchs'

export const MESSAGE_ERREUR_STOCKAGE =
  "Enregistrement impossible sur cet appareil (stockage plein ou indisponible). La dernière action n'a pas été enregistrée."

export type Operation = (match: Match) => Match
export type Appliquer = (operation: Operation) => Promise<string | null>

async function executer(
  matchId: string,
  operation: Operation,
  signalerErreurStockage: (message: string) => void,
): Promise<string | null> {
  let suivant: Match
  try {
    const courant = await lireMatch(matchId)
    if (!courant) return 'Match introuvable.'
    suivant = operation(courant)
  } catch (erreur) {
    return erreur instanceof Error ? erreur.message : String(erreur)
  }
  try {
    await enregistrerMatch(suivant)
    return null
  } catch {
    signalerErreurStockage(MESSAGE_ERREUR_STOCKAGE)
    return MESSAGE_ERREUR_STOCKAGE
  }
}

export function useMatch(matchId: string) {
  const match = useLiveQuery(() => lireMatch(matchId), [matchId])
  const [erreurStockage, setErreurStockage] = useState<string | null>(null)
  // File d'attente : deux taps rapprochés ne doivent jamais partir du même état.
  const file = useRef<Promise<unknown>>(Promise.resolve())

  const appliquer = useCallback<Appliquer>(
    (operation) => {
      const execution = file.current.then(() => executer(matchId, operation, setErreurStockage))
      file.current = execution.catch(() => undefined)
      return execution
    },
    [matchId],
  )

  const effacerErreurStockage = useCallback(() => setErreurStockage(null), [])

  return { match, appliquer, erreurStockage, effacerErreurStockage }
}
```

- [ ] **Step 7 : Écrire la feuille de styles**

Remplacer `src/styles.css` par :

```css
:root {
  color-scheme: dark;
  --fond: #16161b;
  --surface: #24242c;
  --surface-2: #30303a;
  --texte: #f2f2f5;
  --texte-2: #a9a9b6;
  --equipe-a: #ff7b7b;
  --equipe-b: #74b9ff;
  --points: #2e8b57;
  --faute: #c0612b;
  --temps-mort: #55557a;
  --attention: #f5c04a;
  --danger: #e5484d;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--fond);
  color: var(--texte);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100dvh;
}

button,
input,
select {
  font: inherit;
  color: inherit;
}

input,
select {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
  padding: 10px;
  min-height: 44px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--texte-2);
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px;
}

.ecran {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entete {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.entete h1 {
  margin: 0;
}

.btn {
  background: var(--surface-2);
  border: none;
  border-radius: 10px;
  padding: 12px 16px;
  font-weight: 600;
  min-height: 48px;
  cursor: pointer;
}

.btn-principal {
  background: var(--points);
}

.btn-discret {
  background: var(--surface);
}

.btn-danger {
  background: var(--danger);
}

.btn:disabled,
.tuile:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.erreurs {
  color: var(--danger);
}

.avertissements {
  color: var(--attention);
}

/* Accueil */
.accueil {
  max-width: 480px;
  margin: 10vh auto 0;
  text-align: center;
}

.sous-titre {
  color: var(--texte-2);
  margin-top: 0;
}

/* Préparation */
.infos-match,
.equipes-preparation {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.editeur-equipe {
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.table-joueurs {
  width: 100%;
  border-collapse: collapse;
}

.table-joueurs th {
  text-align: left;
  color: var(--texte-2);
  font-weight: 500;
}

.table-joueurs input {
  width: 100%;
}

.table-joueurs .champ-numero {
  width: 4.5em;
}

/* Bandeau */
.bandeau {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border-radius: 12px;
  padding: 10px 14px;
}

.bandeau-equipe {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bandeau-equipe.equipe-B {
  text-align: right;
}

.equipe-A strong {
  color: var(--equipe-a);
}

.equipe-B strong {
  color: var(--equipe-b);
}

.bandeau-score {
  text-align: center;
}

.score {
  display: block;
  font-size: clamp(28px, 6vw, 48px);
  font-weight: 800;
}

.periode {
  color: var(--texte-2);
}

.fautes-equipe.niveau-attention {
  color: var(--attention);
  font-weight: 700;
}

.fautes-equipe.niveau-limite {
  color: var(--danger);
  font-weight: 800;
}

/* Saisie des actions */
.blocs-equipes {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr 1fr;
}

@media (max-width: 600px) and (orientation: portrait) {
  .blocs-equipes {
    grid-template-columns: 1fr;
  }
}

.bloc-equipe {
  background: var(--surface);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 4px solid var(--equipe-a);
}

.bloc-equipe.equipe-B {
  border-top-color: var(--equipe-b);
}

.grille-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.btn-action {
  border: none;
  border-radius: 12px;
  font-size: clamp(22px, 4vw, 34px);
  font-weight: 800;
  min-height: clamp(64px, 14vh, 120px);
  cursor: pointer;
}

.btn-points {
  background: var(--points);
}

.btn-faute {
  background: var(--faute);
}

.btn-temps-mort {
  background: var(--temps-mort);
}

.derniere-action {
  color: var(--texte-2);
  margin: 0;
}

.barre-basse {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.barre-basse .btn {
  flex: 1;
}

.alertes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alertes li {
  background: var(--danger);
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 700;
}

/* Choix du joueur */
.bandeau-choix {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 12px;
  padding: 10px 14px;
}

.bandeau-choix h2 {
  margin: 0;
}

.choix-panier {
  background: var(--points);
}

.choix-faute {
  background: var(--faute);
}

.grille-joueurs {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
}

.tuile {
  background: var(--surface-2);
  border: none;
  border-radius: 14px;
  padding: 14px 8px;
  min-height: 110px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.tuile-numero {
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
}

.tuile-fautes {
  color: var(--attention);
  letter-spacing: 2px;
}

.tuile-points {
  color: var(--texte-2);
}

.tuile.niveau-attention {
  box-shadow: inset 0 0 0 3px var(--attention);
}

.tuile.niveau-exclu {
  opacity: 0.45;
}

/* Dialogue */
.voile {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 0.6);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 10;
}

.dialogue {
  background: var(--surface);
  border-radius: 14px;
  padding: 18px;
  width: min(480px, 100%);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dialogue h2 {
  margin: 0;
}

.dialogue-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialogue-actions .btn {
  flex: 1;
}

/* Journal */
.liste-journal,
.liste-joueurs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.liste-journal li,
.liste-joueurs li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  border-radius: 8px;
  padding: 8px 10px;
}

.journal-periode,
.journal-score {
  color: var(--texte-2);
  min-width: 4.5em;
}

.journal-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.gestion-joueurs {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

/* Fin de match */
.match-termine {
  max-width: 520px;
  margin: 10vh auto 0;
  text-align: center;
}

.score-final {
  font-size: 32px;
  font-weight: 800;
}

/* Mise à jour */
.bandeau-maj {
  position: fixed;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface-2);
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 20;
}
```

- [ ] **Step 8 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck`
Expected : tous les tests PASS (dont 4 + 4 nouveaux), aucune erreur de type.

- [ ] **Step 9 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/ui src/styles.css
git commit -m "feat(ui): Ajout des briques communes (formatage, dialogue, hook de match, styles)"
```

---

### Task 7 : Écran « Nouveau match » (saisie manuelle des équipes)

**Files:**
- Create: `src/ui/preparation/brouillon.ts`, `src/ui/preparation/EditeurEquipe.tsx`, `src/ui/preparation/PreparationMatch.tsx`, `src/test/remplirEquipe.ts`
- Test: `src/ui/preparation/brouillon.test.ts`, `src/ui/preparation/PreparationMatch.test.tsx`

**Interfaces:**
- Consumes : `verifierEquipe` (Task 4), `nouveauMatch`, `nouvelId` (Task 2), `enregistrerMatch`, `lireMatch` (Task 5), `aujourdhui` (Task 6), `MESSAGE_ERREUR_STOCKAGE` (Task 6), `REGLES`.
- Produces :
  - `brouillon.ts` : `JoueurBrouillon`, `ModeCoach = 'aucun' | 'joueur' | 'libre'`, `BrouillonEquipe`, `joueurBrouillonVide(): JoueurBrouillon`, `brouillonVide(): BrouillonEquipe`, `lireNumero(saisie: string): number` (« 07 » → 7 ; vide, décimal, négatif ou > 2 chiffres → `NaN`), `brouillonVersEquipe(brouillon: BrouillonEquipe): EquipeMatch` (ignore les lignes entièrement vides).
  - `PreparationMatch({ onDemarre: (matchId: string) => void; onRetour: () => void })`.
  - Libellés accessibles (utilisés par les tests et l'E2E) : groupe « Équipe A » / « Équipe B » ; champs « Nom de l'équipe », « Couleur », « N° joueur i », « Nom joueur i », « Prénom joueur i », « Licence joueur i », « Civilité joueur i » (options `Mme` = F, `M` = H), « Coach », « Nom du coach » ; boutons « Ajouter un joueur », « Retirer joueur i », « Commencer le match ».
  - `test/remplirEquipe.ts` : `remplirEquipe(user: UserEvent, legende: string, nom: string, joueurs: { numero: string; nom: string; civilite: 'M' | 'Mme' }[]): Promise<void>`.

- [ ] **Step 1 : Écrire les tests du brouillon (ils doivent échouer)**

`src/ui/preparation/brouillon.test.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { brouillonVersEquipe, brouillonVide, lireNumero, type BrouillonEquipe } from './brouillon'

describe('lireNumero', () => {
  it('accepte 0 à 99, zéro initial compris', () => {
    expect(lireNumero('7')).toBe(7)
    expect(lireNumero(' 07 ')).toBe(7)
    expect(lireNumero('0')).toBe(0)
    expect(lireNumero('99')).toBe(99)
  })

  it('refuse les saisies douteuses au lieu de les transformer en 0', () => {
    for (const saisie of ['', '  ', '7.5', '-3', '100', 'sept', '1e1']) {
      expect(lireNumero(saisie)).toBeNaN()
    }
  })
})

describe('brouillonVersEquipe', () => {
  const brouillon: BrouillonEquipe = {
    ...brouillonVide(),
    nom: ' ST DELPHIN ',
    joueurs: [
      { id: 'x', numero: '7', nom: ' Durand ', prenom: 'Chloé', licence: '033_1', civilite: 'Mme' },
      { id: 'vide', numero: '', nom: '', prenom: '', licence: '', civilite: null },
    ],
  }

  it('nettoie les champs et ignore les lignes vides', () => {
    expect(brouillonVersEquipe(brouillon)).toEqual({
      nom: 'ST DELPHIN',
      couleur: '',
      joueurs: [{ id: 'x', numero: 7, nom: 'Durand', prenom: 'Chloé', licence: '033_1', civilite: 'Mme' }],
      coach: null,
    })
  })

  it('transforme le coach joueur ou libre', () => {
    expect(brouillonVersEquipe({ ...brouillon, modeCoach: 'joueur', coachJoueurId: 'x' }).coach).toEqual({
      type: 'joueur',
      joueurId: 'x',
    })
    expect(brouillonVersEquipe({ ...brouillon, modeCoach: 'libre', coachNomLibre: ' Morgan ' }).coach).toEqual({
      type: 'libre',
      nom: 'Morgan',
    })
    expect(brouillonVersEquipe({ ...brouillon, modeCoach: 'libre', coachNomLibre: '  ' }).coach).toBeNull()
  })
})
```

- [ ] **Step 2 : Écrire l'aide de test et les tests de l'écran (ils doivent échouer)**

`src/test/remplirEquipe.ts` :

```ts
import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'

export async function remplirEquipe(
  user: UserEvent,
  legende: string,
  nom: string,
  joueurs: { numero: string; nom: string; civilite: 'M' | 'Mme' }[],
) {
  const groupe = within(screen.getByRole('group', { name: legende }))
  await user.type(groupe.getByLabelText("Nom de l'équipe"), nom)
  for (const [index, joueur] of joueurs.entries()) {
    if (index > 0) await user.click(groupe.getByRole('button', { name: 'Ajouter un joueur' }))
    await user.type(groupe.getByLabelText(`N° joueur ${index + 1}`), joueur.numero)
    await user.type(groupe.getByLabelText(`Nom joueur ${index + 1}`), joueur.nom)
    await user.selectOptions(groupe.getByLabelText(`Civilité joueur ${index + 1}`), joueur.civilite)
  }
}
```

`src/ui/preparation/PreparationMatch.test.tsx` :

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { lireMatch } from '../../storage/matchs'
import { remplirEquipe } from '../../test/remplirEquipe'
import { PreparationMatch } from './PreparationMatch'

const EQUIPE_B = [
  { numero: '5', nom: 'Bernard', civilite: 'Mme' as const },
  { numero: '8', nom: 'Moreau', civilite: 'Mme' as const },
]

describe('PreparationMatch', () => {
  it('crée le match avec les deux équipes et le démarre', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '7', nom: 'Durand', civilite: 'Mme' },
    ])
    const groupeA = within(screen.getByRole('group', { name: 'Équipe A' }))
    await user.selectOptions(groupeA.getByLabelText('Coach'), 'n°7 Durand')
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.type(screen.getByLabelText('Lieu'), 'Villenave')
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    await waitFor(() => expect(onDemarre).toHaveBeenCalledTimes(1))
    const match = await lireMatch(onDemarre.mock.calls[0][0])
    expect(match?.lieu).toBe('Villenave')
    expect(match?.equipes.A.joueurs.map((j) => j.numero)).toEqual([4, 7])
    const durand = match?.equipes.A.joueurs.find((j) => j.nom === 'Durand')
    expect(match?.equipes.A.coach).toEqual({ type: 'joueur', joueurId: durand?.id })
    expect(match?.equipes.B.nom).toBe('GRADIGNAN')
  })

  it('bloque le démarrage si un n° est attribué deux fois', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '4', nom: 'Durand', civilite: 'Mme' },
    ])
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    expect(await screen.findByText('Le n°4 est attribué plusieurs fois.')).toBeInTheDocument()
    expect(onDemarre).not.toHaveBeenCalled()
  })

  it('refuse un n° vide au lieu de le prendre pour 0', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    const groupeA = within(screen.getByRole('group', { name: 'Équipe A' }))
    await user.type(groupeA.getByLabelText("Nom de l'équipe"), 'ST DELPHIN')
    await user.type(groupeA.getByLabelText('Nom joueur 1'), 'Martin')
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    expect(await screen.findByText('N° manquant ou invalide pour Martin (0 à 99).')).toBeInTheDocument()
    expect(onDemarre).not.toHaveBeenCalled()
  })

  it('avertit s’il y a moins de 2 joueuses mais laisse démarrer', async () => {
    const user = userEvent.setup()
    const onDemarre = vi.fn()
    render(<PreparationMatch onDemarre={onDemarre} onRetour={vi.fn()} />)

    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '7', nom: 'Durand', civilite: 'M' },
    ])
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', EQUIPE_B)

    expect(screen.getByText('Seulement 1 joueuse : il en faut au moins 2 sur le terrain.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))
    await waitFor(() => expect(onDemarre).toHaveBeenCalledTimes(1))
  })
})
```

- [ ] **Step 3 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/preparation`
Expected : FAIL (« Failed to resolve import "./brouillon" » et « ./PreparationMatch »).

- [ ] **Step 4 : Implémenter le brouillon**

`src/ui/preparation/brouillon.ts` :

```ts
import { nouvelId } from '../../domain/match'
import type { Civilite, Coach, EquipeMatch } from '../../domain/types'

export interface JoueurBrouillon {
  id: string
  numero: string
  nom: string
  prenom: string
  licence: string
  civilite: Civilite
}

export type ModeCoach = 'aucun' | 'joueur' | 'libre'

export interface BrouillonEquipe {
  nom: string
  couleur: string
  joueurs: JoueurBrouillon[]
  modeCoach: ModeCoach
  coachJoueurId: string
  coachNomLibre: string
}

export function joueurBrouillonVide(): JoueurBrouillon {
  return { id: nouvelId(), numero: '', nom: '', prenom: '', licence: '', civilite: null }
}

export function brouillonVide(): BrouillonEquipe {
  return {
    nom: '',
    couleur: '',
    joueurs: [joueurBrouillonVide()],
    modeCoach: 'aucun',
    coachJoueurId: '',
    coachNomLibre: '',
  }
}

/** « 07 » → 7. Tout ce qui n'est pas 1 ou 2 chiffres donne NaN (jamais un 0 silencieux). */
export function lireNumero(saisie: string): number {
  const nettoyee = saisie.trim()
  return /^\d{1,2}$/.test(nettoyee) ? Number(nettoyee) : Number.NaN
}

function estVide(joueur: JoueurBrouillon): boolean {
  return [joueur.numero, joueur.nom, joueur.prenom, joueur.licence].every((champ) => champ.trim() === '')
}

export function brouillonVersEquipe(brouillon: BrouillonEquipe): EquipeMatch {
  const joueurs = brouillon.joueurs
    .filter((joueur) => !estVide(joueur))
    .map((joueur) => ({
      id: joueur.id,
      numero: lireNumero(joueur.numero),
      nom: joueur.nom.trim(),
      prenom: joueur.prenom.trim(),
      licence: joueur.licence.trim(),
      civilite: joueur.civilite,
    }))

  let coach: Coach = null
  if (brouillon.modeCoach === 'joueur' && brouillon.coachJoueurId) {
    coach = { type: 'joueur', joueurId: brouillon.coachJoueurId }
  }
  if (brouillon.modeCoach === 'libre' && brouillon.coachNomLibre.trim()) {
    coach = { type: 'libre', nom: brouillon.coachNomLibre.trim() }
  }

  return { nom: brouillon.nom.trim(), couleur: brouillon.couleur.trim(), joueurs, coach }
}
```

- [ ] **Step 5 : Implémenter l'éditeur d'équipe**

`src/ui/preparation/EditeurEquipe.tsx` :

```tsx
import { REGLES } from '../../domain/config'
import { verifierEquipe } from '../../domain/equipe'
import type { Civilite } from '../../domain/types'
import {
  brouillonVersEquipe,
  joueurBrouillonVide,
  type BrouillonEquipe,
  type JoueurBrouillon,
} from './brouillon'

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
    </fieldset>
  )
}
```

- [ ] **Step 6 : Implémenter l'écran de préparation**

`src/ui/preparation/PreparationMatch.tsx` :

```tsx
import { useState } from 'react'
import { verifierEquipe } from '../../domain/equipe'
import { nouveauMatch } from '../../domain/match'
import { enregistrerMatch } from '../../storage/matchs'
import { aujourdhui } from '../format'
import { MESSAGE_ERREUR_STOCKAGE } from '../useMatch'
import { brouillonVersEquipe, brouillonVide } from './brouillon'
import { EditeurEquipe } from './EditeurEquipe'

interface Props {
  onDemarre: (matchId: string) => void
  onRetour: () => void
}

export function PreparationMatch({ onDemarre, onRetour }: Props) {
  const [date, setDate] = useState(() => aujourdhui())
  const [lieu, setLieu] = useState('')
  const [equipeA, setEquipeA] = useState(brouillonVide)
  const [equipeB, setEquipeB] = useState(brouillonVide)
  const [tentative, setTentative] = useState(false)
  const [erreurStockage, setErreurStockage] = useState<string | null>(null)

  async function demarrer() {
    setTentative(true)
    const equipes = { A: brouillonVersEquipe(equipeA), B: brouillonVersEquipe(equipeB) }
    const invalide = verifierEquipe(equipes.A).erreurs.length > 0 || verifierEquipe(equipes.B).erreurs.length > 0
    if (invalide) return
    try {
      const match = await enregistrerMatch(nouveauMatch({ date, lieu: lieu.trim(), equipes }))
      onDemarre(match.id)
    } catch {
      setErreurStockage(MESSAGE_ERREUR_STOCKAGE)
    }
  }

  return (
    <section className="ecran preparation">
      <header className="entete">
        <h1>Nouveau match</h1>
        <button className="btn" onClick={onRetour}>
          Retour
        </button>
      </header>
      <div className="infos-match">
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Lieu
          <input value={lieu} onChange={(e) => setLieu(e.target.value)} />
        </label>
      </div>
      <div className="equipes-preparation">
        <EditeurEquipe titre="Équipe A" valeur={equipeA} onChange={setEquipeA} afficherErreurs={tentative} />
        <EditeurEquipe titre="Équipe B" valeur={equipeB} onChange={setEquipeB} afficherErreurs={tentative} />
      </div>
      <button className="btn btn-principal" onClick={() => void demarrer()}>
        Commencer le match
      </button>
      {erreurStockage && (
        <p role="alert" className="erreurs">
          {erreurStockage}
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 7 : Lancer les tests pour vérifier qu'ils passent**

Run : `npx vitest run src/ui/preparation && npm run typecheck`
Expected : 4 + 4 tests PASS, aucune erreur de type.

- [ ] **Step 8 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/ui/preparation src/test/remplirEquipe.ts
git commit -m "feat(ui): Ajout de l'écran de préparation du match avec saisie manuelle des équipes"
```

---

### Task 8 : Saisie pendant le match — action puis joueur

**Files:**
- Create: `src/ui/saisie/types.ts`, `src/ui/saisie/Bandeau.tsx`, `src/ui/saisie/EcranAction.tsx`, `src/ui/saisie/ChoixJoueur.tsx`, `src/ui/saisie/EcranMatch.tsx`
- Test: `src/ui/saisie/EcranMatch.test.tsx`

**Interfaces:**
- Consumes : `calculerEtat`, `fautesEquipeEnCours`, `tempsMortsEnCours` (Task 2), `ajouterEvenement`, `annulerDernier` (Task 3), `niveauFautesEquipe`, `niveauFautesJoueur`, `libellePeriode` (Task 3), `parNumero` (Task 2), `useMatch`, `Dialogue`, `decrireEvenement`, `pastillesFautes`, `pluriel` (Task 6), `REGLES`.
- Produces :
  - `types.ts` : `type ActionEnAttente = { equipe: EquipeId; type: 'panier'; valeur: 1 | 2 | 3 } | { equipe: EquipeId; type: 'faute' }`.
  - `EcranMatch({ matchId: string; onAccueil: () => void })`.
  - Libellés accessibles : `aria-label="Score"` (texte « 2 – 0 ») ; « Fautes d'équipe {nom} » (texte « Fautes éq. n/8 », classe `niveau-*`) ; « Temps morts {nom} » (texte « TM n ») ; groupe « Actions {nom} » contenant les boutons « +1 », « +2 », « +3 », « Faute », « Temps mort » ; boutons « ↶ Annuler », « Accueil » ; écran de choix : titre « +2 — {nom} » ou « Faute — {nom} », bouton « ✕ Annuler », tuiles nommées « n°7, 1 faute, 2 points » et « Coach, 0 faute ».

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/ui/saisie/EcranMatch.test.tsx` :

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { NouvelEvenement } from '../../domain/types'
import { enregistrerMatch, lireMatch } from '../../storage/matchs'
import { faute, matchDeTest, panier } from '../../test/fixtures'
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
    expect(screen.getByText(/Dernière action : 2 – 0 · \+2 n°7 ST DELPHIN/)).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: '✕ Annuler' }))

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
    await user.click(screen.getByRole('button', { name: '✕ Annuler' }))
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Faute' }))
    expect(screen.getByRole('button', { name: /^n°11,/ })).toBeEnabled()
  })

  it('✕ Annuler revient à l’écran d’action sans rien enregistrer', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: '+3' }))
    await user.click(screen.getByRole('button', { name: '✕ Annuler' }))
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
    await user.click(screen.getByRole('button', { name: '↶ Annuler' }))
    await waitFor(() => expect(screen.getByLabelText('Temps morts ST DELPHIN')).toHaveTextContent('TM 0'))
  })

  it('affiche les fautes d’équipe de la période', async () => {
    await afficher(faute('B', 'b8'), faute('B', 'b5'))
    expect(screen.getByLabelText("Fautes d'équipe GRADIGNAN")).toHaveTextContent('Fautes éq. 2/8')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/saisie`
Expected : FAIL (« Failed to resolve import "./EcranMatch" »).

- [ ] **Step 3 : Implémenter le type d'action et le bandeau**

`src/ui/saisie/types.ts` :

```ts
import type { EquipeId } from '../../domain/types'

export type ActionEnAttente =
  | { equipe: EquipeId; type: 'panier'; valeur: 1 | 2 | 3 }
  | { equipe: EquipeId; type: 'faute' }
```

`src/ui/saisie/Bandeau.tsx` :

```tsx
import { REGLES } from '../../domain/config'
import { fautesEquipeEnCours, tempsMortsEnCours, type EtatMatch } from '../../domain/etat'
import { libellePeriode } from '../../domain/periodes'
import { niveauFautesEquipe } from '../../domain/regles'
import type { EquipeId, Match } from '../../domain/types'

interface Props {
  match: Match
  etat: EtatMatch
}

export function Bandeau({ match, etat }: Props) {
  const blocEquipe = (equipe: EquipeId) => {
    const nom = match.equipes[equipe].nom
    const fautes = fautesEquipeEnCours(etat, equipe)
    return (
      <div className={`bandeau-equipe equipe-${equipe}`}>
        <strong>{nom}</strong>
        <span
          className={`fautes-equipe niveau-${niveauFautesEquipe(fautes)}`}
          aria-label={`Fautes d'équipe ${nom}`}
        >
          Fautes éq. {fautes}/{REGLES.seuilFautesEquipe}
        </span>
        <span aria-label={`Temps morts ${nom}`}>TM {tempsMortsEnCours(etat, equipe)}</span>
      </div>
    )
  }

  return (
    <header className="bandeau">
      {blocEquipe('A')}
      <div className="bandeau-score">
        <span className="score" aria-label="Score">
          {etat.equipes.A.score} – {etat.equipes.B.score}
        </span>
        <span className="periode">{libellePeriode(etat.periode)}</span>
      </div>
      {blocEquipe('B')}
    </header>
  )
}
```

- [ ] **Step 4 : Implémenter l'écran d'action**

`src/ui/saisie/EcranAction.tsx` :

```tsx
import type { EtatMatch } from '../../domain/etat'
import { EQUIPES, type EquipeId, type Match } from '../../domain/types'
import { decrireEvenement } from '../format'
import { Bandeau } from './Bandeau'
import type { ActionEnAttente } from './types'

interface Props {
  match: Match
  etat: EtatMatch
  onAction: (action: ActionEnAttente) => void
  onTempsMort: (equipe: EquipeId) => void
  onAnnulerDernier: () => void
  onAccueil: () => void
}

const VALEURS = [1, 2, 3] as const

export function EcranAction({ match, etat, onAction, onTempsMort, onAnnulerDernier, onAccueil }: Props) {
  const derniere = etat.chronologie.at(-1)
  return (
    <section className="ecran ecran-action">
      <Bandeau match={match} etat={etat} />
      <div className="blocs-equipes">
        {EQUIPES.map((equipe) => (
          <div
            key={equipe}
            className={`bloc-equipe equipe-${equipe}`}
            role="group"
            aria-label={`Actions ${match.equipes[equipe].nom}`}
          >
            <div className="grille-actions">
              {VALEURS.map((valeur) => (
                <button
                  key={valeur}
                  className="btn-action btn-points"
                  onClick={() => onAction({ equipe, type: 'panier', valeur })}
                >
                  +{valeur}
                </button>
              ))}
              <button
                className="btn-action btn-faute"
                aria-label="Faute"
                onClick={() => onAction({ equipe, type: 'faute' })}
              >
                F
              </button>
            </div>
            <button className="btn btn-temps-mort" onClick={() => onTempsMort(equipe)}>
              Temps mort
            </button>
          </div>
        ))}
      </div>
      <p className="derniere-action">
        Dernière action :{' '}
        {derniere
          ? `${derniere.scoreA} – ${derniere.scoreB} · ${decrireEvenement(match, derniere.evenement)}`
          : 'aucune'}
      </p>
      <nav className="barre-basse">
        <button className="btn btn-discret" disabled={match.evenements.length === 0} onClick={onAnnulerDernier}>
          ↶ Annuler
        </button>
        <button className="btn btn-discret" onClick={onAccueil}>
          Accueil
        </button>
      </nav>
    </section>
  )
}
```

- [ ] **Step 5 : Implémenter l'écran « quel joueur ? »**

`src/ui/saisie/ChoixJoueur.tsx` :

```tsx
import { useRef } from 'react'
import type { EtatMatch } from '../../domain/etat'
import { parNumero } from '../../domain/match'
import { niveauFautesJoueur } from '../../domain/regles'
import type { Match } from '../../domain/types'
import { pastillesFautes, pluriel } from '../format'
import type { ActionEnAttente } from './types'

interface Props {
  match: Match
  etat: EtatMatch
  action: ActionEnAttente
  /** joueurId null = coach (faute uniquement) */
  onChoisir: (joueurId: string | null) => void
  onAnnuler: () => void
}

export function ChoixJoueur({ match, etat, action, onChoisir, onAnnuler }: Props) {
  // Un double tap ne doit enregistrer qu'une action : le second clic arrive avant le re-rendu.
  const dejaChoisi = useRef(false)
  const choisir = (joueurId: string | null) => {
    if (dejaChoisi.current) return
    dejaChoisi.current = true
    onChoisir(joueurId)
  }

  const equipe = match.equipes[action.equipe]
  const stats = etat.equipes[action.equipe]
  const titre = action.type === 'panier' ? `+${action.valeur} — ${equipe.nom}` : `Faute — ${equipe.nom}`

  return (
    <section className="ecran choix-joueur">
      <header className={`bandeau-choix ${action.type === 'panier' ? 'choix-panier' : 'choix-faute'}`}>
        <h2>{titre}</h2>
        <button className="btn" onClick={onAnnuler}>
          ✕ Annuler
        </button>
      </header>
      <div className="grille-joueurs">
        {[...equipe.joueurs].sort(parNumero).map((joueur) => {
          const { fautes, points } = stats.joueurs[joueur.id]
          const niveau = niveauFautesJoueur(fautes)
          return (
            <button
              key={joueur.id}
              className={`tuile niveau-${niveau}`}
              disabled={action.type === 'panier' && niveau === 'exclu'}
              aria-label={`n°${joueur.numero}, ${pluriel(fautes, 'faute')}, ${pluriel(points, 'point')}`}
              onClick={() => choisir(joueur.id)}
            >
              <span className="tuile-numero">{joueur.numero}</span>
              <span className="tuile-fautes">{pastillesFautes(fautes)}</span>
              <span className="tuile-points">{pluriel(points, 'pt')}</span>
            </button>
          )
        })}
        {action.type === 'faute' && (
          <button
            className="tuile tuile-coach"
            aria-label={`Coach, ${pluriel(stats.fautesCoach, 'faute')}`}
            onClick={() => choisir(null)}
          >
            <span className="tuile-numero">Coach</span>
            <span className="tuile-fautes">{'●'.repeat(stats.fautesCoach)}</span>
          </button>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 6 : Implémenter le conteneur**

`src/ui/saisie/EcranMatch.tsx` :

```tsx
import { useState, type ReactNode } from 'react'
import { ajouterEvenement, annulerDernier } from '../../domain/commandes'
import { calculerEtat } from '../../domain/etat'
import type { NouvelEvenement } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import { useMatch } from '../useMatch'
import { ChoixJoueur } from './ChoixJoueur'
import { EcranAction } from './EcranAction'
import type { ActionEnAttente } from './types'

type Vue = { nom: 'action' } | { nom: 'joueur'; action: ActionEnAttente }

interface Props {
  matchId: string
  onAccueil: () => void
}

export function EcranMatch({ matchId, onAccueil }: Props) {
  const { match, appliquer, erreurStockage, effacerErreurStockage } = useMatch(matchId)
  const [vue, setVue] = useState<Vue>({ nom: 'action' })

  if (!match) return <p className="chargement">Chargement…</p>

  const etat = calculerEtat(match)
  const enregistrer = (evenement: NouvelEvenement) => {
    void appliquer((m) => ajouterEvenement(m, evenement))
  }
  const retourAction = () => setVue({ nom: 'action' })

  let contenu: ReactNode
  if (vue.nom === 'joueur') {
    const action = vue.action
    contenu = (
      <ChoixJoueur
        match={match}
        etat={etat}
        action={action}
        onChoisir={(joueurId) => {
          if (action.type === 'faute') {
            enregistrer({ type: 'faute', equipe: action.equipe, joueurId })
          } else if (joueurId !== null) {
            enregistrer({ type: 'panier', equipe: action.equipe, joueurId, valeur: action.valeur })
          }
          retourAction()
        }}
        onAnnuler={retourAction}
      />
    )
  } else {
    contenu = (
      <EcranAction
        match={match}
        etat={etat}
        onAction={(action) => setVue({ nom: 'joueur', action })}
        onTempsMort={(equipe) => enregistrer({ type: 'tempsMort', equipe })}
        onAnnulerDernier={() => void appliquer(annulerDernier)}
        onAccueil={onAccueil}
      />
    )
  }

  return (
    <>
      {contenu}
      {erreurStockage && (
        <Dialogue
          titre="Enregistrement impossible"
          actions={
            <button className="btn" onClick={effacerErreurStockage}>
              Compris
            </button>
          }
        >
          <p>{erreurStockage}</p>
        </Dialogue>
      )}
    </>
  )
}
```

- [ ] **Step 7 : Lancer les tests pour vérifier qu'ils passent**

Run : `npx vitest run src/ui/saisie && npm run typecheck`
Expected : 8 tests PASS, aucune erreur de type.

- [ ] **Step 8 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/ui/saisie
git commit -m "feat(saisie): Ajout de la saisie des actions puis du choix du joueur"
```

---

### Task 9 : Fin de période, prolongation, fin de match et alertes

**Files:**
- Create: `src/ui/saisie/Alertes.tsx`, `src/ui/saisie/FinPeriode.tsx`, `src/ui/saisie/MatchTermine.tsx`
- Modify: `src/ui/saisie/EcranAction.tsx` (remplacé en entier), `src/ui/saisie/EcranMatch.tsx` (remplacé en entier)
- Test: `src/ui/saisie/EcranMatch.test.tsx` (ajout d'un bloc `describe`)

**Interfaces:**
- Consumes : `alertesActives`, `Alerte` (Task 3), `choixFinPeriode`, `libellePeriode`, `ChoixFinPeriode` (Task 3), `appliquerFinPeriode`, `rouvrirMatch` (Task 3), `Dialogue` (Task 6).
- Produces :
  - `EcranAction` reçoit en plus `onFinPeriode: () => void` et affiche les alertes.
  - Libellés : bouton « Fin de période » ; dialogue « Fin de la 1ère mi-temps ? » (titre construit à partir de `libellePeriode`) avec les boutons « Passer à la 2ème mi-temps », « Jouer une prolongation », « Terminer le match », « Annuler » ; liste `aria-label="Alertes"` ; écran « Match terminé » avec `aria-label="Score final"` et les boutons « Rouvrir pour corriger », « Accueil ».

- [ ] **Step 1 : Ajouter les tests (ils doivent échouer)**

Ajouter à la fin de `src/ui/saisie/EcranMatch.test.tsx` (les aides `afficher`, `actions` et `attendreScore` sont déjà définies en haut du fichier) :

```tsx
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
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/saisie`
Expected : les 6 nouveaux tests FAIL (bouton « Fin de période » et textes d'alerte introuvables), les 8 anciens PASS.

- [ ] **Step 3 : Implémenter les alertes, la fin de période et l'écran de fin**

`src/ui/saisie/Alertes.tsx` :

```tsx
import type { Alerte } from '../../domain/regles'

export function Alertes({ alertes }: { alertes: Alerte[] }) {
  if (alertes.length === 0) return null
  return (
    <ul className="alertes" aria-label="Alertes">
      {alertes.map((alerte) => (
        <li key={alerte.cle}>{alerte.message}</li>
      ))}
    </ul>
  )
}
```

`src/ui/saisie/FinPeriode.tsx` :

```tsx
import type { EtatMatch } from '../../domain/etat'
import { choixFinPeriode, libellePeriode, type ChoixFinPeriode } from '../../domain/periodes'
import { Dialogue } from '../commun/Dialogue'

const LIBELLES: Record<ChoixFinPeriode, string> = {
  periodeSuivante: 'Passer à la 2ème mi-temps',
  prolongation: 'Jouer une prolongation',
  finMatch: 'Terminer le match',
}

interface Props {
  etat: EtatMatch
  onChoix: (choix: ChoixFinPeriode) => void
  onAnnuler: () => void
}

export function FinPeriode({ etat, onChoix, onAnnuler }: Props) {
  const choix = choixFinPeriode(etat)
  const egalite = etat.equipes.A.score === etat.equipes.B.score
  return (
    <Dialogue
      titre={`Fin de la ${libellePeriode(etat.periode).toLowerCase()} ?`}
      actions={
        <>
          {choix.map((c) => (
            <button key={c} className="btn btn-principal" onClick={() => onChoix(c)}>
              {LIBELLES[c]}
            </button>
          ))}
          <button className="btn" onClick={onAnnuler}>
            Annuler
          </button>
        </>
      }
    >
      {choix.includes('prolongation') && egalite && (
        <p>Égalité : une prolongation est possible si les deux équipes sont d'accord.</p>
      )}
    </Dialogue>
  )
}
```

`src/ui/saisie/MatchTermine.tsx` :

```tsx
import type { EtatMatch } from '../../domain/etat'
import type { Match } from '../../domain/types'

interface Props {
  match: Match
  etat: EtatMatch
  onRouvrir: () => void
  onAccueil: () => void
}

export function MatchTermine({ match, etat, onRouvrir, onAccueil }: Props) {
  return (
    <section className="ecran match-termine">
      <h1>Match terminé</h1>
      <p className="score-final" aria-label="Score final">
        {match.equipes.A.nom} {etat.equipes.A.score} – {etat.equipes.B.score} {match.equipes.B.nom}
      </p>
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

- [ ] **Step 4 : Ajouter le bouton de fin de période et les alertes à l'écran d'action**

Remplacer `src/ui/saisie/EcranAction.tsx` par :

```tsx
import type { EtatMatch } from '../../domain/etat'
import { alertesActives } from '../../domain/regles'
import { EQUIPES, type EquipeId, type Match } from '../../domain/types'
import { decrireEvenement } from '../format'
import { Alertes } from './Alertes'
import { Bandeau } from './Bandeau'
import type { ActionEnAttente } from './types'

interface Props {
  match: Match
  etat: EtatMatch
  onAction: (action: ActionEnAttente) => void
  onTempsMort: (equipe: EquipeId) => void
  onAnnulerDernier: () => void
  onFinPeriode: () => void
  onAccueil: () => void
}

const VALEURS = [1, 2, 3] as const

export function EcranAction({
  match,
  etat,
  onAction,
  onTempsMort,
  onAnnulerDernier,
  onFinPeriode,
  onAccueil,
}: Props) {
  const derniere = etat.chronologie.at(-1)
  return (
    <section className="ecran ecran-action">
      <Bandeau match={match} etat={etat} />
      <Alertes alertes={alertesActives(match, etat)} />
      <div className="blocs-equipes">
        {EQUIPES.map((equipe) => (
          <div
            key={equipe}
            className={`bloc-equipe equipe-${equipe}`}
            role="group"
            aria-label={`Actions ${match.equipes[equipe].nom}`}
          >
            <div className="grille-actions">
              {VALEURS.map((valeur) => (
                <button
                  key={valeur}
                  className="btn-action btn-points"
                  onClick={() => onAction({ equipe, type: 'panier', valeur })}
                >
                  +{valeur}
                </button>
              ))}
              <button
                className="btn-action btn-faute"
                aria-label="Faute"
                onClick={() => onAction({ equipe, type: 'faute' })}
              >
                F
              </button>
            </div>
            <button className="btn btn-temps-mort" onClick={() => onTempsMort(equipe)}>
              Temps mort
            </button>
          </div>
        ))}
      </div>
      <p className="derniere-action">
        Dernière action :{' '}
        {derniere
          ? `${derniere.scoreA} – ${derniere.scoreB} · ${decrireEvenement(match, derniere.evenement)}`
          : 'aucune'}
      </p>
      <nav className="barre-basse">
        <button className="btn btn-discret" disabled={match.evenements.length === 0} onClick={onAnnulerDernier}>
          ↶ Annuler
        </button>
        <button className="btn" onClick={onFinPeriode}>
          Fin de période
        </button>
        <button className="btn btn-discret" onClick={onAccueil}>
          Accueil
        </button>
      </nav>
    </section>
  )
}
```

- [ ] **Step 5 : Brancher les nouvelles vues dans le conteneur**

Remplacer `src/ui/saisie/EcranMatch.tsx` par :

```tsx
import { useState, type ReactNode } from 'react'
import { ajouterEvenement, annulerDernier, appliquerFinPeriode, rouvrirMatch } from '../../domain/commandes'
import { calculerEtat } from '../../domain/etat'
import type { NouvelEvenement } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import { useMatch } from '../useMatch'
import { ChoixJoueur } from './ChoixJoueur'
import { EcranAction } from './EcranAction'
import { FinPeriode } from './FinPeriode'
import { MatchTermine } from './MatchTermine'
import type { ActionEnAttente } from './types'

type Vue = { nom: 'action' } | { nom: 'joueur'; action: ActionEnAttente } | { nom: 'finPeriode' }

interface Props {
  matchId: string
  onAccueil: () => void
}

export function EcranMatch({ matchId, onAccueil }: Props) {
  const { match, appliquer, erreurStockage, effacerErreurStockage } = useMatch(matchId)
  const [vue, setVue] = useState<Vue>({ nom: 'action' })

  if (!match) return <p className="chargement">Chargement…</p>

  const etat = calculerEtat(match)
  const enregistrer = (evenement: NouvelEvenement) => {
    void appliquer((m) => ajouterEvenement(m, evenement))
  }
  const retourAction = () => setVue({ nom: 'action' })

  let contenu: ReactNode
  if (etat.termine) {
    contenu = (
      <MatchTermine match={match} etat={etat} onRouvrir={() => void appliquer(rouvrirMatch)} onAccueil={onAccueil} />
    )
  } else if (vue.nom === 'joueur') {
    const action = vue.action
    contenu = (
      <ChoixJoueur
        match={match}
        etat={etat}
        action={action}
        onChoisir={(joueurId) => {
          if (action.type === 'faute') {
            enregistrer({ type: 'faute', equipe: action.equipe, joueurId })
          } else if (joueurId !== null) {
            enregistrer({ type: 'panier', equipe: action.equipe, joueurId, valeur: action.valeur })
          }
          retourAction()
        }}
        onAnnuler={retourAction}
      />
    )
  } else {
    contenu = (
      <>
        <EcranAction
          match={match}
          etat={etat}
          onAction={(action) => setVue({ nom: 'joueur', action })}
          onTempsMort={(equipe) => enregistrer({ type: 'tempsMort', equipe })}
          onAnnulerDernier={() => void appliquer(annulerDernier)}
          onFinPeriode={() => setVue({ nom: 'finPeriode' })}
          onAccueil={onAccueil}
        />
        {vue.nom === 'finPeriode' && (
          <FinPeriode
            etat={etat}
            onChoix={(choix) => {
              void appliquer((m) => appliquerFinPeriode(m, choix))
              retourAction()
            }}
            onAnnuler={retourAction}
          />
        )}
      </>
    )
  }

  return (
    <>
      {contenu}
      {erreurStockage && (
        <Dialogue
          titre="Enregistrement impossible"
          actions={
            <button className="btn" onClick={effacerErreurStockage}>
              Compris
            </button>
          }
        >
          <p>{erreurStockage}</p>
        </Dialogue>
      )}
    </>
  )
}
```

- [ ] **Step 6 : Lancer les tests pour vérifier qu'ils passent**

Run : `npx vitest run src/ui/saisie && npm run typecheck`
Expected : 14 tests PASS, aucune erreur de type.

- [ ] **Step 7 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/ui/saisie
git commit -m "feat(saisie): Ajout de la fin de période, des prolongations, de la fin de match et des alertes"
```

---

### Task 10 : Journal, corrections et joueurs en cours de match

**Files:**
- Create: `src/ui/journal/EditionEvenement.tsx`, `src/ui/journal/GestionJoueurs.tsx`, `src/ui/journal/Journal.tsx`
- Modify: `src/ui/saisie/EcranAction.tsx`, `src/ui/saisie/EcranMatch.tsx`
- Test: `src/ui/journal/Journal.test.tsx`

**Interfaces:**
- Consumes : `annulerDernier`, `remplacerEvenement`, `supprimerEvenement` (Task 3), `ajouterJoueurAuMatch`, `changerNumero` (Task 4), `parNumero` (Task 2), `libellePeriode` (Task 3), `lireNumero` (Task 7), `Appliquer`, `Dialogue`, `decrireEvenement` (Task 6).
- Produces :
  - `EditionEvenement.tsx` : `type EvenementModifiable = Extract<Evenement, { type: 'panier' | 'faute' | 'tempsMort' }>`, `EditionEvenement({ match, evenement, onValider, onAnnuler })`.
  - `Journal({ match: Match; etat: EtatMatch; appliquer: Appliquer; onRetour: () => void })`.
  - `GestionJoueurs({ match: Match; appliquer: Appliquer })`.
  - `EcranAction` reçoit en plus `onJournal: () => void` (bouton « Journal »).
  - Libellés : titre « Journal », bouton « Retour au match », bouton « ↶ Annuler la dernière action », liste `aria-label="Actions du match"`, boutons « Modifier : {description} » et « Supprimer : {description} », dialogue « Modifier l'action » (champs « Équipe », « Valeur », « Joueur », bouton « Enregistrer »), dialogue « Supprimer cette action ? », régions « Joueurs {nom} » avec les boutons « Changer le n°{n} » et « Ajouter un joueur », champ « Nouveau n° », dialogue « Ajouter un joueur — {nom} » (champs « N° », « Nom », « Prénom », « Licence », « Civilité »).

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/ui/journal/Journal.test.tsx` :

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { NouvelEvenement } from '../../domain/types'
import { enregistrerMatch } from '../../storage/matchs'
import { matchDeTest, panier } from '../../test/fixtures'
import { EcranMatch } from '../saisie/EcranMatch'

async function ouvrirJournal(...evenements: NouvelEvenement[]) {
  const match = await enregistrerMatch(matchDeTest(...evenements))
  const user = userEvent.setup()
  render(<EcranMatch matchId={match.id} onAccueil={vi.fn()} />)
  await user.click(await screen.findByRole('button', { name: 'Journal' }))
  await screen.findByRole('heading', { name: 'Journal' })
  return user
}

const lignes = () => within(screen.getByRole('list', { name: 'Actions du match' })).queryAllByRole('listitem')

async function revenirAuScore(user: ReturnType<typeof userEvent.setup>, texte: string) {
  await user.click(screen.getByRole('button', { name: 'Retour au match' }))
  await waitFor(() => expect(screen.getByLabelText('Score')).toHaveTextContent(texte))
}

describe('Journal', () => {
  it('liste les actions, la plus récente en premier, avec le score après chacune', async () => {
    await ouvrirJournal(panier('A', 'a7', 2), panier('B', 'b8', 3))
    expect(lignes()[0]).toHaveTextContent('2–3')
    expect(lignes()[0]).toHaveTextContent('+3 n°8 GRADIGNAN')
    expect(lignes()[1]).toHaveTextContent('+2 n°7 ST DELPHIN')
  })

  it('corrige la valeur d’un panier', async () => {
    const user = await ouvrirJournal(panier('A', 'a7', 2))
    await user.click(screen.getByRole('button', { name: 'Modifier : +2 n°7 ST DELPHIN' }))
    const dialogue = within(screen.getByRole('dialog', { name: "Modifier l'action" }))
    await user.selectOptions(dialogue.getByLabelText('Valeur'), '3')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByText('+3 n°7 ST DELPHIN')).toBeInTheDocument()
    await revenirAuScore(user, '3 – 0')
  })

  it('déplacer un panier vers l’autre équipe impose de choisir un de ses joueurs', async () => {
    const user = await ouvrirJournal(panier('A', 'a7', 2))
    await user.click(screen.getByRole('button', { name: 'Modifier : +2 n°7 ST DELPHIN' }))
    const dialogue = within(screen.getByRole('dialog', { name: "Modifier l'action" }))
    await user.selectOptions(dialogue.getByLabelText('Équipe'), 'B')
    expect(dialogue.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
    await user.selectOptions(dialogue.getByLabelText('Joueur'), 'b8')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    await revenirAuScore(user, '0 – 2')
  })

  it('supprime une action après confirmation', async () => {
    const user = await ouvrirJournal(panier('A', 'a7', 2))
    await user.click(screen.getByRole('button', { name: 'Supprimer : +2 n°7 ST DELPHIN' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Supprimer cette action ?' }))
    await user.click(dialogue.getByRole('button', { name: 'Supprimer' }))
    await waitFor(() => expect(lignes()).toHaveLength(0))
  })

  it('annule la dernière action depuis le journal', async () => {
    const user = await ouvrirJournal(panier('A', 'a7', 2), panier('B', 'b8', 3))
    await user.click(screen.getByRole('button', { name: '↶ Annuler la dernière action' }))
    await waitFor(() => expect(lignes()).toHaveLength(1))
  })

  it('refuse de changer un n° vers un n° déjà pris', async () => {
    const user = await ouvrirJournal()
    const joueurs = within(screen.getByRole('region', { name: 'Joueurs ST DELPHIN' }))
    await user.click(joueurs.getByRole('button', { name: 'Changer le n°7' }))
    const champ = screen.getByLabelText('Nouveau n°')
    await user.clear(champ)
    await user.type(champ, '4')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Le n°4 est attribué plusieurs fois.')
  })

  it('change un n° et garde le joueur', async () => {
    const user = await ouvrirJournal()
    const joueurs = within(screen.getByRole('region', { name: 'Joueurs ST DELPHIN' }))
    await user.click(joueurs.getByRole('button', { name: 'Changer le n°7' }))
    const champ = screen.getByLabelText('Nouveau n°')
    await user.clear(champ)
    await user.type(champ, '21')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(await joueurs.findByRole('button', { name: 'Changer le n°21' })).toBeInTheDocument()
  })

  it('ajoute un joueur retardataire', async () => {
    const user = await ouvrirJournal()
    const joueurs = within(screen.getByRole('region', { name: 'Joueurs GRADIGNAN' }))
    await user.click(joueurs.getByRole('button', { name: 'Ajouter un joueur' }))
    const dialogue = within(screen.getByRole('dialog', { name: 'Ajouter un joueur — GRADIGNAN' }))
    await user.type(dialogue.getByLabelText('N°'), '23')
    await user.type(dialogue.getByLabelText('Nom'), 'Retard')
    await user.selectOptions(dialogue.getByLabelText('Civilité'), 'Mme')
    await user.click(dialogue.getByRole('button', { name: 'Enregistrer' }))
    expect(await joueurs.findByText('n°23 Retard')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/ui/journal`
Expected : FAIL (bouton « Journal » introuvable).

- [ ] **Step 3 : Implémenter la modification d'une action**

`src/ui/journal/EditionEvenement.tsx` :

```tsx
import { useState } from 'react'
import { parNumero } from '../../domain/match'
import { EQUIPES, type EquipeId, type Evenement, type Match } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'

export type EvenementModifiable = Extract<Evenement, { type: 'panier' | 'faute' | 'tempsMort' }>

const COACH = 'coach'

interface Props {
  match: Match
  evenement: EvenementModifiable
  onValider: (evenement: EvenementModifiable) => void
  onAnnuler: () => void
}

function joueurInitial(evenement: EvenementModifiable): string {
  if (evenement.type === 'panier') return evenement.joueurId
  if (evenement.type === 'faute') return evenement.joueurId ?? COACH
  return ''
}

export function EditionEvenement({ match, evenement, onValider, onAnnuler }: Props) {
  const [equipe, setEquipe] = useState<EquipeId>(evenement.equipe)
  const [valeur, setValeur] = useState<1 | 2 | 3>(evenement.type === 'panier' ? evenement.valeur : 2)
  const [joueurId, setJoueurId] = useState(joueurInitial(evenement))

  const joueurs = [...match.equipes[equipe].joueurs].sort(parNumero)
  const joueurValide =
    evenement.type === 'tempsMort' ||
    (joueurId === COACH ? evenement.type === 'faute' : joueurs.some((j) => j.id === joueurId))

  function valider() {
    if (evenement.type === 'panier') {
      onValider({ ...evenement, equipe, valeur, joueurId })
    } else if (evenement.type === 'faute') {
      onValider({ ...evenement, equipe, joueurId: joueurId === COACH ? null : joueurId })
    } else {
      onValider({ ...evenement, equipe })
    }
  }

  return (
    <Dialogue
      titre="Modifier l'action"
      actions={
        <>
          <button className="btn btn-principal" disabled={!joueurValide} onClick={valider}>
            Enregistrer
          </button>
          <button className="btn" onClick={onAnnuler}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Équipe
        <select
          value={equipe}
          onChange={(e) => {
            setEquipe(e.target.value as EquipeId)
            setJoueurId('')
          }}
        >
          {EQUIPES.map((id) => (
            <option key={id} value={id}>
              {match.equipes[id].nom}
            </option>
          ))}
        </select>
      </label>
      {evenement.type === 'panier' && (
        <label>
          Valeur
          <select value={valeur} onChange={(e) => setValeur(Number(e.target.value) as 1 | 2 | 3)}>
            <option value={1}>1 pt</option>
            <option value={2}>2 pts</option>
            <option value={3}>3 pts</option>
          </select>
        </label>
      )}
      {evenement.type !== 'tempsMort' && (
        <label>
          Joueur
          <select value={joueurId} onChange={(e) => setJoueurId(e.target.value)}>
            <option value="">— choisir —</option>
            {joueurs.map((joueur) => (
              <option key={joueur.id} value={joueur.id}>
                n°{joueur.numero}
              </option>
            ))}
            {evenement.type === 'faute' && <option value={COACH}>Coach</option>}
          </select>
        </label>
      )}
    </Dialogue>
  )
}
```

- [ ] **Step 4 : Implémenter la gestion des joueurs en cours de match**

`src/ui/journal/GestionJoueurs.tsx` :

```tsx
import { useState } from 'react'
import { ajouterJoueurAuMatch, changerNumero } from '../../domain/equipe'
import { parNumero } from '../../domain/match'
import { EQUIPES, type Civilite, type EquipeId, type JoueurMatch, type Match } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import { lireNumero } from '../preparation/brouillon'
import type { Appliquer } from '../useMatch'

type Edition = { type: 'numero'; equipe: EquipeId; joueur: JoueurMatch } | { type: 'ajout'; equipe: EquipeId } | null

interface Props {
  match: Match
  appliquer: Appliquer
}

export function GestionJoueurs({ match, appliquer }: Props) {
  const [edition, setEdition] = useState<Edition>(null)
  const fermer = () => setEdition(null)

  return (
    <div className="gestion-joueurs">
      {EQUIPES.map((equipe) => {
        const nom = match.equipes[equipe].nom
        return (
          <section key={equipe} aria-label={`Joueurs ${nom}`}>
            <h2>{nom}</h2>
            <ul className="liste-joueurs">
              {[...match.equipes[equipe].joueurs].sort(parNumero).map((joueur) => (
                <li key={joueur.id}>
                  <span>{[`n°${joueur.numero}`, joueur.prenom, joueur.nom].filter(Boolean).join(' ')}</span>
                  <button
                    className="btn btn-discret"
                    onClick={() => setEdition({ type: 'numero', equipe, joueur })}
                  >
                    Changer le n°{joueur.numero}
                  </button>
                </li>
              ))}
            </ul>
            <button className="btn" onClick={() => setEdition({ type: 'ajout', equipe })}>
              Ajouter un joueur
            </button>
          </section>
        )
      })}
      {edition?.type === 'numero' && (
        <DialogueNumero
          joueur={edition.joueur}
          onValider={(numero) => appliquer((m) => changerNumero(m, edition.equipe, edition.joueur.id, numero))}
          onFermer={fermer}
        />
      )}
      {edition?.type === 'ajout' && (
        <DialogueAjout
          nomEquipe={match.equipes[edition.equipe].nom}
          onValider={(joueur) => appliquer((m) => ajouterJoueurAuMatch(m, edition.equipe, joueur))}
          onFermer={fermer}
        />
      )}
    </div>
  )
}

interface PropsNumero {
  joueur: JoueurMatch
  onValider: (numero: number) => Promise<string | null>
  onFermer: () => void
}

function DialogueNumero({ joueur, onValider, onFermer }: PropsNumero) {
  const [saisie, setSaisie] = useState(String(joueur.numero))
  const [erreur, setErreur] = useState<string | null>(null)

  async function valider() {
    const resultat = await onValider(lireNumero(saisie))
    if (resultat) {
      setErreur(resultat)
    } else {
      onFermer()
    }
  }

  return (
    <Dialogue
      titre={`Changer le n°${joueur.numero}`}
      actions={
        <>
          <button className="btn btn-principal" onClick={() => void valider()}>
            Enregistrer
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        Nouveau n°
        <input inputMode="numeric" value={saisie} onChange={(e) => setSaisie(e.target.value)} />
      </label>
      {erreur && (
        <p role="alert" className="erreurs">
          {erreur}
        </p>
      )}
    </Dialogue>
  )
}

interface PropsAjout {
  nomEquipe: string
  onValider: (joueur: Omit<JoueurMatch, 'id'>) => Promise<string | null>
  onFermer: () => void
}

function DialogueAjout({ nomEquipe, onValider, onFermer }: PropsAjout) {
  const [numero, setNumero] = useState('')
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [licence, setLicence] = useState('')
  const [civilite, setCivilite] = useState<Civilite>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  async function valider() {
    const resultat = await onValider({
      numero: lireNumero(numero),
      nom: nom.trim(),
      prenom: prenom.trim(),
      licence: licence.trim(),
      civilite,
    })
    if (resultat) {
      setErreur(resultat)
    } else {
      onFermer()
    }
  }

  return (
    <Dialogue
      titre={`Ajouter un joueur — ${nomEquipe}`}
      actions={
        <>
          <button className="btn btn-principal" onClick={() => void valider()}>
            Enregistrer
          </button>
          <button className="btn" onClick={onFermer}>
            Annuler
          </button>
        </>
      }
    >
      <label>
        N°
        <input inputMode="numeric" value={numero} onChange={(e) => setNumero(e.target.value)} />
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
        Licence
        <input value={licence} onChange={(e) => setLicence(e.target.value)} />
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

- [ ] **Step 5 : Implémenter le journal**

`src/ui/journal/Journal.tsx` :

```tsx
import { useState } from 'react'
import { annulerDernier, remplacerEvenement, supprimerEvenement } from '../../domain/commandes'
import type { EtatMatch } from '../../domain/etat'
import { libellePeriode } from '../../domain/periodes'
import type { Evenement, Match } from '../../domain/types'
import { Dialogue } from '../commun/Dialogue'
import { decrireEvenement } from '../format'
import type { Appliquer } from '../useMatch'
import { EditionEvenement, type EvenementModifiable } from './EditionEvenement'
import { GestionJoueurs } from './GestionJoueurs'

function estModifiable(evenement: Evenement): evenement is EvenementModifiable {
  return evenement.type === 'panier' || evenement.type === 'faute' || evenement.type === 'tempsMort'
}

interface Props {
  match: Match
  etat: EtatMatch
  appliquer: Appliquer
  onRetour: () => void
}

export function Journal({ match, etat, appliquer, onRetour }: Props) {
  const [edition, setEdition] = useState<EvenementModifiable | null>(null)
  const [suppression, setSuppression] = useState<EvenementModifiable | null>(null)

  return (
    <section className="ecran journal">
      <header className="entete">
        <h1>Journal</h1>
        <button className="btn btn-principal" onClick={onRetour}>
          Retour au match
        </button>
      </header>
      <button className="btn" disabled={match.evenements.length === 0} onClick={() => void appliquer(annulerDernier)}>
        ↶ Annuler la dernière action
      </button>
      <ol className="liste-journal" aria-label="Actions du match">
        {[...etat.chronologie].reverse().map(({ evenement, periode, scoreA, scoreB }) => {
          const description = decrireEvenement(match, evenement)
          return (
            <li key={evenement.id}>
              <span className="journal-periode">{libellePeriode(periode)}</span>
              <span className="journal-score">
                {scoreA}–{scoreB}
              </span>
              <span>{description}</span>
              {estModifiable(evenement) && (
                <span className="journal-actions">
                  <button
                    className="btn btn-discret"
                    aria-label={`Modifier : ${description}`}
                    onClick={() => setEdition(evenement)}
                  >
                    Modifier
                  </button>
                  <button
                    className="btn btn-discret"
                    aria-label={`Supprimer : ${description}`}
                    onClick={() => setSuppression(evenement)}
                  >
                    Supprimer
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <GestionJoueurs match={match} appliquer={appliquer} />

      {edition && (
        <EditionEvenement
          match={match}
          evenement={edition}
          onValider={(evenement) => {
            void appliquer((m) => remplacerEvenement(m, evenement))
            setEdition(null)
          }}
          onAnnuler={() => setEdition(null)}
        />
      )}
      {suppression && (
        <Dialogue
          titre="Supprimer cette action ?"
          actions={
            <>
              <button
                className="btn btn-danger"
                onClick={() => {
                  const id = suppression.id
                  void appliquer((m) => supprimerEvenement(m, id))
                  setSuppression(null)
                }}
              >
                Supprimer
              </button>
              <button className="btn" onClick={() => setSuppression(null)}>
                Annuler
              </button>
            </>
          }
        >
          <p>{decrireEvenement(match, suppression)}</p>
        </Dialogue>
      )}
    </section>
  )
}
```

- [ ] **Step 6 : Ajouter le bouton « Journal » à l'écran d'action**

Dans `src/ui/saisie/EcranAction.tsx` :

1. Dans `interface Props`, après `onFinPeriode: () => void`, ajouter :

```tsx
  onJournal: () => void
```

2. Dans la déstructuration des props, remplacer `onFinPeriode,` par :

```tsx
  onFinPeriode,
  onJournal,
```

3. Dans `<nav className="barre-basse">`, entre le bouton « ↶ Annuler » et le bouton « Fin de période », ajouter :

```tsx
        <button className="btn btn-discret" onClick={onJournal}>
          Journal
        </button>
```

- [ ] **Step 7 : Brancher le journal dans le conteneur**

Dans `src/ui/saisie/EcranMatch.tsx` :

1. Ajouter l'import (après l'import de `Dialogue`) :

```tsx
import { Journal } from '../journal/Journal'
```

2. Remplacer la déclaration du type `Vue` par :

```tsx
type Vue = { nom: 'action' } | { nom: 'joueur'; action: ActionEnAttente } | { nom: 'finPeriode' } | { nom: 'journal' }
```

3. Remplacer `if (etat.termine) {` par :

```tsx
  if (vue.nom === 'journal') {
    contenu = <Journal match={match} etat={etat} appliquer={appliquer} onRetour={retourAction} />
  } else if (etat.termine) {
```

4. Dans le JSX de `<EcranAction … />`, après `onFinPeriode={() => setVue({ nom: 'finPeriode' })}`, ajouter :

```tsx
          onJournal={() => setVue({ nom: 'journal' })}
```

- [ ] **Step 8 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run typecheck`
Expected : tous les tests PASS (dont 8 nouveaux), aucune erreur de type.

- [ ] **Step 9 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/ui/journal src/ui/saisie
git commit -m "feat(journal): Ajout du journal des actions, des corrections et de la gestion des joueurs en cours de match"
```

---

### Task 11 : Accueil, navigation et reprise automatique

**Files:**
- Create: `src/ui/Accueil.tsx`
- Modify: `src/App.tsx` (remplacé en entier)
- Test: `src/App.test.tsx` (remplacé en entier)

**Interfaces:**
- Consumes : `matchEnCours` (Task 5), `PreparationMatch` (Task 7), `EcranMatch` (Task 8-10), `remplirEquipe` (Task 7).
- Produces :
  - `Accueil({ onNouveauMatch: () => void; onReprendre: (matchId: string) => void })` : boutons « Nouveau match » et, s'il existe un match en cours, « Reprendre le match en cours ».
  - `App` : au démarrage, ouvre directement le match en cours s'il y en a un, sinon l'accueil.

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

Remplacer `src/App.test.tsx` par :

```tsx
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { enregistrerMatch } from './storage/matchs'
import { matchDeTest, panier } from './test/fixtures'
import { remplirEquipe } from './test/remplirEquipe'

describe('App', () => {
  it('ouvre l’accueil quand aucun match n’est en cours', async () => {
    render(<App />)
    expect(await screen.findByRole('button', { name: 'Nouveau match' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reprendre le match en cours/ })).not.toBeInTheDocument()
  })

  it('reprend automatiquement le match en cours', async () => {
    await enregistrerMatch(matchDeTest(panier('A', 'a7', 2)))
    render(<App />)
    expect(await screen.findByLabelText('Score')).toHaveTextContent('2 – 0')
  })

  it('crée un match, saisit une action, et la retrouve après un rechargement', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.click(await screen.findByRole('button', { name: 'Nouveau match' }))
    await remplirEquipe(user, 'Équipe A', 'ST DELPHIN', [
      { numero: '4', nom: 'Martin', civilite: 'Mme' },
      { numero: '7', nom: 'Durand', civilite: 'Mme' },
    ])
    await remplirEquipe(user, 'Équipe B', 'GRADIGNAN', [
      { numero: '5', nom: 'Bernard', civilite: 'Mme' },
      { numero: '8', nom: 'Moreau', civilite: 'Mme' },
    ])
    await user.click(screen.getByRole('button', { name: 'Commencer le match' }))

    const actionsA = within(await screen.findByRole('group', { name: 'Actions ST DELPHIN' }))
    await user.click(actionsA.getByRole('button', { name: '+2' }))
    await user.click(screen.getByRole('button', { name: /^n°4,/ }))
    await waitFor(() => expect(screen.getByLabelText('Score')).toHaveTextContent('2 – 0'))

    unmount()
    render(<App />)
    expect(await screen.findByLabelText('Score')).toHaveTextContent('2 – 0')
  })

  it('depuis le match, l’accueil propose de le reprendre', async () => {
    await enregistrerMatch(matchDeTest())
    const user = userEvent.setup()
    render(<App />)
    await screen.findByLabelText('Score')
    await user.click(screen.getByRole('button', { name: 'Accueil' }))
    await user.click(await screen.findByRole('button', { name: /Reprendre le match en cours/ }))
    expect(await screen.findByLabelText('Score')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent**

Run : `npx vitest run src/App.test.tsx`
Expected : FAIL (bouton « Nouveau match » introuvable).

- [ ] **Step 3 : Implémenter l'accueil**

`src/ui/Accueil.tsx` :

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { matchEnCours } from '../storage/matchs'

interface Props {
  onNouveauMatch: () => void
  onReprendre: (matchId: string) => void
}

export function Accueil({ onNouveauMatch, onReprendre }: Props) {
  const enCours = useLiveQuery(() => matchEnCours(), [])
  return (
    <section className="ecran accueil">
      <h1>Table de marque</h1>
      <p className="sous-titre">Basket loisir UFOLEP 33</p>
      {enCours && (
        <button className="btn btn-principal" onClick={() => onReprendre(enCours.id)}>
          Reprendre le match en cours
          <br />
          <small>
            {enCours.equipes.A.nom} – {enCours.equipes.B.nom}
          </small>
        </button>
      )}
      <button className="btn" onClick={onNouveauMatch}>
        Nouveau match
      </button>
    </section>
  )
}
```

- [ ] **Step 4 : Implémenter la navigation**

Remplacer `src/App.tsx` par :

```tsx
import { useEffect, useState } from 'react'
import { matchEnCours } from './storage/matchs'
import { Accueil } from './ui/Accueil'
import { PreparationMatch } from './ui/preparation/PreparationMatch'
import { EcranMatch } from './ui/saisie/EcranMatch'

type Ecran = { nom: 'chargement' } | { nom: 'accueil' } | { nom: 'preparation' } | { nom: 'match'; matchId: string }

export default function App() {
  const [ecran, setEcran] = useState<Ecran>({ nom: 'chargement' })

  useEffect(() => {
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
  }, [])

  const allerAccueil = () => setEcran({ nom: 'accueil' })
  const ouvrirMatch = (matchId: string) => setEcran({ nom: 'match', matchId })

  return (
    <main className="app">
      {ecran.nom === 'chargement' && <p className="chargement">Chargement…</p>}
      {ecran.nom === 'accueil' && (
        <Accueil onNouveauMatch={() => setEcran({ nom: 'preparation' })} onReprendre={ouvrirMatch} />
      )}
      {ecran.nom === 'preparation' && <PreparationMatch onDemarre={ouvrirMatch} onRetour={allerAccueil} />}
      {ecran.nom === 'match' && <EcranMatch key={ecran.matchId} matchId={ecran.matchId} onAccueil={allerAccueil} />}
    </main>
  )
}
```

- [ ] **Step 5 : Lancer les tests pour vérifier qu'ils passent**

Run : `npm run test:run && npm run build`
Expected : tous les tests PASS (dont 4 nouveaux) ; build OK.

- [ ] **Step 6 : Vérification manuelle rapide**

Run : `npm run dev`, ouvrir l'URL affichée, créer un match avec deux équipes, saisir quelques actions, recharger la page (le match doit revenir à l'identique), terminer le match.

- [ ] **Step 7 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add src/App.tsx src/App.test.tsx src/ui/Accueil.tsx
git commit -m "feat(app): Ajout de l'accueil, de la navigation et de la reprise automatique du match en cours"
```

---

### Task 12 : PWA hors ligne, installation et mises à jour hors match

**Files:**
- Create: `public/icone.svg`, `src/pwa.d.ts`, `src/test/stub-pwa-register.ts`, `src/ui/MiseAJour.tsx`
- Modify: `vite.config.ts`, `index.html`, `src/App.tsx`
- Test: `src/ui/MiseAJour.test.tsx`

**Interfaces:**
- Consumes : `matchEnCours` (Task 5), `App` (Task 11).
- Produces :
  - `MiseAJour({ autorisee: boolean })` : affiche « Nouvelle version disponible » + bouton « Recharger » seulement si une mise à jour attend **et** si `autorisee` est vrai.
  - `App` passe `autorisee` à `true` seulement hors de l'écran de match et quand aucun match n'est en cours.
  - Build : `dist/sw.js` et `dist/manifest.webmanifest`.

- [ ] **Step 1 : Installer les dépendances PWA**

```bash
npm install -D vite-plugin-pwa@^2.0.0 workbox-window@^7.4.1 @vite-pwa/assets-generator@^2.0.0
```

- [ ] **Step 2 : Créer l'icône source et générer les icônes**

`public/icone.svg` :

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#16161b"/>
  <circle cx="256" cy="256" r="176" fill="#e8742a" stroke="#1b1b1b" stroke-width="14"/>
  <path d="M80 256h352M256 80v352M131 131c60 60 60 190 0 250M381 131c-60 60-60 190 0 250" fill="none" stroke="#1b1b1b" stroke-width="14"/>
</svg>
```

```bash
npm pkg set scripts.icones="pwa-assets-generator --preset minimal-2023 public/icone.svg"
npm run icones
ls public
```

Expected : `public/` contient `icone.svg`, `favicon.ico`, `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`.

- [ ] **Step 3 : Écrire le test du bandeau de mise à jour (il doit échouer)**

`src/ui/MiseAJour.test.tsx` :

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MiseAJour } from './MiseAJour'

const pwa = vi.hoisted(() => ({ besoin: true, mettreAJour: vi.fn(async () => {}) }))

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [pwa.besoin, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: pwa.mettreAJour,
  }),
}))

describe('MiseAJour', () => {
  it('propose de recharger quand une version attend et qu’aucun match n’est en cours', async () => {
    const user = userEvent.setup()
    render(<MiseAJour autorisee />)
    expect(screen.getByText('Nouvelle version disponible')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Recharger' }))
    expect(pwa.mettreAJour).toHaveBeenCalledWith(true)
  })

  it('ne dit rien pendant un match', () => {
    render(<MiseAJour autorisee={false} />)
    expect(screen.queryByText('Nouvelle version disponible')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 4 : Déclarer les types et le substitut de test, configurer la PWA**

`src/pwa.d.ts` :

```ts
/// <reference types="vite-plugin-pwa/react" />
```

`src/test/stub-pwa-register.ts` :

```ts
// Remplace le module virtuel de vite-plugin-pwa, qui n'existe pas sous Vitest.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: async () => {},
  }
}
```

Remplacer `vite.config.ts` par :

```ts
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // « prompt » : jamais de rechargement automatique, l'utilisateur décide (et jamais pendant un match).
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icone.svg'],
      manifest: {
        name: 'Table de marque — Basket UFOLEP 33',
        short_name: 'Table de marque',
        description: 'Feuille de match numérique du basket loisir UFOLEP 33',
        lang: 'fr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#16161b',
        theme_color: '#16161b',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/test/stub-pwa-register.ts', import.meta.url)),
    },
  },
})
```

Remplacer `index.html` par :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#16161b" />
    <meta name="description" content="Feuille de match numérique du basket loisir UFOLEP 33" />
    <link rel="icon" href="/favicon.ico" sizes="48x48" />
    <link rel="icon" href="/icone.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
    <title>Table de marque — Basket UFOLEP 33</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5 : Implémenter le bandeau de mise à jour**

`src/ui/MiseAJour.tsx` :

```tsx
import { useRegisterSW } from 'virtual:pwa-register/react'

export function MiseAJour({ autorisee }: { autorisee: boolean }) {
  const {
    needRefresh: [besoin],
    updateServiceWorker,
  } = useRegisterSW()

  if (!besoin || !autorisee) return null
  return (
    <div className="bandeau-maj" role="status">
      <span>Nouvelle version disponible</span>
      <button className="btn btn-principal" onClick={() => void updateServiceWorker(true)}>
        Recharger
      </button>
    </div>
  )
}
```

- [ ] **Step 6 : Afficher le bandeau uniquement hors match**

Dans `src/App.tsx` :

1. Ajouter en tête les imports :

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { MiseAJour } from './ui/MiseAJour'
```

2. Juste après `const [ecran, setEcran] = useState<Ecran>({ nom: 'chargement' })`, ajouter :

```tsx
  const enCours = useLiveQuery(() => matchEnCours(), [])
  const miseAJourAutorisee = ecran.nom !== 'match' && ecran.nom !== 'chargement' && !enCours
```

3. Juste avant `</main>`, ajouter :

```tsx
      <MiseAJour autorisee={miseAJourAutorisee} />
```

- [ ] **Step 7 : Lancer les tests et le build**

Run : `npm run test:run && npm run build && ls dist`
Expected : tous les tests PASS (dont 2 nouveaux) ; `dist/` contient `sw.js`, `manifest.webmanifest` et les icônes.

- [ ] **Step 8 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add public index.html package.json package-lock.json vite.config.ts src/pwa.d.ts src/test/stub-pwa-register.ts src/ui/MiseAJour.tsx src/ui/MiseAJour.test.tsx src/App.tsx
git commit -m "feat(pwa): Ajout du mode hors ligne, de l'installation et des mises à jour proposées hors match"
```

---

### Task 13 : Tests de bout en bout (téléphone, tablette, ordinateur)

**Files:**
- Create: `playwright.config.ts`, `e2e/match.spec.ts`
- Modify: `package.json` (script `e2e`), `.gitignore`

**Interfaces:**
- Consumes : l'app construite (`npm run build` + `npm run preview`), les libellés accessibles des Tasks 7 à 11.
- Produces : script `npm run e2e`.

- [ ] **Step 1 : Installer Playwright et Chromium**

```bash
npm install -D @playwright/test@^1.64.0
npx playwright install chromium
npm pkg set scripts.e2e="playwright test"
printf 'test-results/\nplaywright-report/\n' >> .gitignore
```

- [ ] **Step 2 : Configurer Playwright**

`playwright.config.ts` :

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    { name: 'telephone', use: { ...devices['Pixel 7'] } },
    { name: 'tablette', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 3 : Écrire le parcours complet**

`e2e/match.spec.ts` :

```ts
import { expect, test, type Page } from '@playwright/test'

async function remplirEquipe(page: Page, legende: string, nom: string, joueurs: [string, string, 'M' | 'Mme'][]) {
  const groupe = page.getByRole('group', { name: legende })
  await groupe.getByLabel("Nom de l'équipe").fill(nom)
  for (const [index, [numero, nomJoueur, civilite]] of joueurs.entries()) {
    if (index > 0) await groupe.getByRole('button', { name: 'Ajouter un joueur' }).click()
    await groupe.getByLabel(`N° joueur ${index + 1}`).fill(numero)
    await groupe.getByLabel(`Nom joueur ${index + 1}`).fill(nomJoueur)
    await groupe.getByLabel(`Civilité joueur ${index + 1}`).selectOption(civilite)
  }
}

async function marquer(page: Page, equipe: string, bouton: string, numero: number) {
  await page.getByRole('group', { name: `Actions ${equipe}` }).getByRole('button', { name: bouton, exact: true }).click()
  await page.getByRole('button', { name: new RegExp(`^n°${numero},`) }).click()
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
  await page.getByRole('button', { name: '↶ Annuler' }).click()
  await expect(score).toHaveText('2 – 0')
  await marquer(page, 'GRADIGNAN', '+2', 5)
  await expect(score).toHaveText('2 – 2')

  await page.reload()
  await expect(score).toHaveText('2 – 2')

  await page.getByRole('button', { name: 'Fin de période' }).click()
  await page.getByRole('button', { name: 'Passer à la 2ème mi-temps' }).click()
  await expect(page.getByText('2ème mi-temps', { exact: true })).toBeVisible()
  await marquer(page, 'ST DELPHIN', '+1', 4)
  await page.getByRole('button', { name: 'Fin de période' }).click()
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
```

- [ ] **Step 4 : Lancer les tests de bout en bout**

Run : `npm run e2e`
Expected : 4 tests PASS (parcours sur les 3 formats + hors ligne sur ordinateur), 2 tests SKIP (hors ligne sur téléphone et tablette).

- [ ] **Step 5 : Vérification finale complète**

Run : `npm run test:run && npm run typecheck && npm run build && npm run e2e`
Expected : tout PASS.

- [ ] **Step 6 : Recette manuelle sur appareils réels** (à faire par l'utilisateur ; noter le résultat dans la PR)

1. `npm run build && npm run preview -- --host`, ouvrir l'URL réseau sur une tablette et un téléphone du même Wi-Fi.
2. Saisir un match complet au doigt : les boutons et tuiles sont-ils assez gros ? Le double tap est-il sans effet ?
3. Mettre l'appareil en mode avion, recharger : l'app doit s'ouvrir.

Note : l'installation sur l'écran d'accueil et le service worker exigent HTTPS sur un vrai appareil (sauf localhost). Leur recette complète est prévue au plan 4, avec l'hébergement.

- [ ] **Step 7 : Commit** (uniquement si l'utilisateur a autorisé les commits pour cette exécution)

```bash
git add playwright.config.ts e2e package.json package-lock.json .gitignore
git commit -m "test(e2e): Ajout des parcours de bout en bout sur téléphone, tablette et ordinateur"
```

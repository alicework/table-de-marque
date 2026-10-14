# Plan 4 — Minuteurs de temps mort et de pause : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher une popup de compte à rebours à chaque temps mort (1 min), au passage à la 2ème mi-temps (10 min) et avant une prolongation (2 min), avec bip et vibration à 0:00.

**Architecture:** Les durées et le titre de chaque pause sont produits par le domaine (`PAUSES` dans `config.ts`, `pauseAvant` dans `periodes.ts`). L'interface ajoute un module de signal (Web Audio + vibration, sans erreur possible), un composant `Minuteur` construit sur le `Dialogue` existant, et un état local `minuteur` dans `EcranMatch`. Rien n'est ajouté au `Match` : le minuteur est un état d'écran.

**Tech Stack:** existant (TypeScript ~6.0, React 19, Vite 8, Dexie 4, Vitest 5 + Testing Library, Playwright, oxlint). Aucune nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-10-14-minuteurs-pauses-design.md` (spec parente : `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`).

**Point de départ :** créer la branche `feat/minuteurs-pauses` depuis `dev` (qui contient la spec) : `git switch -c feat/minuteurs-pauses dev`.

## Global Constraints

- Node `^22.22.2 || ^24.15.0 || >=26` (champ `engines`). Sous Node 22.14, npm affiche EBADENGINE : connu et accepté.
- Aucune nouvelle dépendance, aucun fichier son : le bip est généré par Web Audio.
- Aucune donnée ajoutée à `Match`. `versionFormat` reste à `1`. Aucune nouvelle version du schéma Dexie.
- Le domaine (`src/domain/`) n'importe ni React, ni Dexie, ni rien de `src/ui/`. Les durées n'existent que dans `src/domain/config.ts` (`PAUSES`).
- Durées : temps mort **60 s**, mi-temps **600 s**, avant prolongation **120 s**. Pas de popup avant `MT1` ni après « Terminer le match ».
- Titres de la popup : « Temps mort — {nom de l'équipe} », « Mi-temps », « Avant la prolongation ». Affichage du temps au format `m:ss` (`1:00`, `10:00`, `0:07`). Bouton « Fermer ».
- À 0:00 : bip + vibration **une seule fois**, l'affichage reste sur `0:00` jusqu'à « Fermer ».
- `preparerSon()` et `emettreSignal()` ne lèvent jamais d'erreur (API absente, contexte refusé).
- Aucune couleur littérale hors de `src/styles/jetons.css`. Contraste texte / fond ≥ 4,5:1 (vérifié par `src/styles/styles.test.ts`).
- Interface en français. Identifiants du code en français. Style : guillemets simples, pas de points-virgules, indentation 2 espaces ; chaînes contenant une apostrophe en guillemets doubles.
- Commits : Conventional Commits en français, titre en forme nominale, `git add` par chemins explicites (jamais `-A` / `.`), aucun trailer `Co-authored-by`, aucun lien de session. Commiter librement sur `feat/minuteurs-pauses` ; jamais de push ni de merge sans demande.
- `docs/guide-utilisation.md` n'est **pas versionné** (fichier de travail de l'utilisatrice ou de l'utilisateur) : le modifier, ne jamais l'ajouter à un commit.
- Avant chaque commit : `npm run typecheck && npm run lint && npm run test:run` verts.

## Review Focus

1. **Téléphone verrouillé ou onglet en arrière-plan pendant la mi-temps** : au retour, le temps affiché est juste (calculé depuis l'heure de fin), et si l'échéance est passée, la popup affiche `0:00` et le signal part une fois. → test « saute directement à 0:00 après une longue absence » dans la Task 3.
2. **Double tap sur « Temps mort »** : le second tap tombe sur la popup qui vient de s'ouvrir ; il ne doit pas la fermer. → « Fermer » passe par la garde anti-double-tap ; test « un tap sur Fermer pendant la garde est ignoré » dans la Task 4.
3. **Mode strict de React** (`main.tsx` rend dans `<StrictMode>`, qui joue deux fois les effets en développement) : un seul bip à 0:00. → test « ne signale qu'une fois en mode strict » dans la Task 3.
4. **Navigateur sans Web Audio ni vibration** (iPhone pour la vibration, jsdom) : la popup décompte normalement, rien ne plante. → test « ne lève rien sans Web Audio ni vibration » dans la Task 2 ; tous les tests `EcranMatch` tournent sous jsdom sans ces API.
5. **Annuler la dernière action après un temps mort** : une fois la popup fermée, « Annuler » retire le temps mort et la popup ne réapparaît pas. → test dans la Task 4.

---

### Task 1: Domaine — durées et pause avant une période

**Files:**
- Modify: `src/domain/config.ts`
- Modify: `src/domain/periodes.ts`
- Test: `src/domain/periodes.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces :
  - `PAUSES: { readonly tempsMort: 60; readonly miTemps: 600; readonly avantProlongation: 120 }` exporté par `src/domain/config.ts` ;
  - `interface Pause { titre: string; secondes: number }` et `pauseAvant(periode: Periode): Pause | null` exportés par `src/domain/periodes.ts`.

- [ ] **Step 1: Write the failing test**

Dans `src/domain/periodes.test.ts`, compléter l'import :

```ts
import { choixFinPeriode, libellePeriode, pauseAvant, periodeSuivante } from './periodes'
```

et ajouter à la fin du `describe('périodes', …)` :

```ts
  it('ne prévoit pas de pause avant la 1ère mi-temps', () => {
    expect(pauseAvant('MT1')).toBeNull()
  })

  it('prévoit 10 min de mi-temps avant la 2ème mi-temps', () => {
    expect(pauseAvant('MT2')).toEqual({ titre: 'Mi-temps', secondes: 600 })
  })

  it('prévoit 2 min avant chaque prolongation', () => {
    expect(pauseAvant('P1')).toEqual({ titre: 'Avant la prolongation', secondes: 120 })
    expect(pauseAvant('P2')).toEqual({ titre: 'Avant la prolongation', secondes: 120 })
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/periodes.test.ts`
Expected: FAIL, `pauseAvant` n'est pas exporté (`pauseAvant is not a function`).

- [ ] **Step 3: Write minimal implementation**

À la fin de `src/domain/config.ts` :

```ts

/** Durée des arrêts de jeu, en secondes. */
export const PAUSES = {
  tempsMort: 60,
  miTemps: 600,
  avantProlongation: 120,
} as const
```

Dans `src/domain/periodes.ts`, ajouter l'import en tête :

```ts
import { PAUSES } from './config'
```

et à la fin du fichier :

```ts

export interface Pause {
  /** Titre de la popup. */
  titre: string
  secondes: number
}

/** Arrêt qui précède `periode`, ou null s'il n'y en a pas. */
export function pauseAvant(periode: Periode): Pause | null {
  if (periode === 'MT1') return null
  if (periode === 'MT2') return { titre: 'Mi-temps', secondes: PAUSES.miTemps }
  return { titre: 'Avant la prolongation', secondes: PAUSES.avantProlongation }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/periodes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/domain/config.ts src/domain/periodes.ts src/domain/periodes.test.ts
git commit -m "feat(periodes): Durées des arrêts de jeu et pause avant une période"
```

---

### Task 2: Signal sonore et vibration

**Files:**
- Create: `src/ui/commun/signal.ts`
- Test: `src/ui/commun/signal.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces : `preparerSon(): void` et `emettreSignal(): void` exportés par `src/ui/commun/signal.ts`. `preparerSon` doit être appelé **dans le gestionnaire du tap** qui ouvre la popup (Safari iOS n'autorise le son qu'après un geste). Aucune des deux ne lève d'erreur.

Le module garde un `AudioContext` au niveau du module : les tests réimportent le module à chaque cas (`vi.resetModules()` + `await import('./signal')`) pour repartir d'un état vierge.

- [ ] **Step 1: Write the failing test**

Créer `src/ui/commun/signal.test.ts` :

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const importer = () => import('./signal')

/** Contexte audio minimal : enregistre les oscillateurs démarrés. */
function fauxContexte(etat: 'running' | 'suspended' = 'running') {
  const creer = vi.fn()
  const demarrer = vi.fn()
  const reprendre = vi.fn(() => Promise.resolve())
  class FauxAudioContext {
    constructor() {
      creer()
    }
    state = etat
    currentTime = 0
    destination = {}
    resume = reprendre
    createOscillator() {
      return { frequency: { value: 0 }, connect: (noeud: unknown) => noeud, start: demarrer, stop: vi.fn() }
    }
    createGain() {
      return { gain: { value: 0 }, connect: (noeud: unknown) => noeud }
    }
  }
  vi.stubGlobal('AudioContext', FauxAudioContext)
  return { creer, demarrer, reprendre }
}

describe('signal', () => {
  let vibrer: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    vibrer = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrer, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'vibrate')
  })

  it('ne lève rien sans Web Audio ni vibration', async () => {
    Reflect.deleteProperty(navigator, 'vibrate')
    const { preparerSon, emettreSignal } = await importer()
    expect(() => {
      preparerSon()
      emettreSignal()
    }).not.toThrow()
  })

  it('joue un bip et fait vibrer une fois le son préparé', async () => {
    const { demarrer } = fauxContexte()
    const { preparerSon, emettreSignal } = await importer()
    preparerSon()
    emettreSignal()
    expect(demarrer).toHaveBeenCalledTimes(1)
    expect(vibrer).toHaveBeenCalledWith([200, 100, 200])
  })

  it('fait vibrer sans jouer de son si le son n’a pas été préparé', async () => {
    const { demarrer } = fauxContexte()
    const { emettreSignal } = await importer()
    emettreSignal()
    expect(demarrer).not.toHaveBeenCalled()
    expect(vibrer).toHaveBeenCalledTimes(1)
  })

  it('relance un contexte audio suspendu au moment du geste', async () => {
    const { reprendre } = fauxContexte('suspended')
    const { preparerSon } = await importer()
    preparerSon()
    expect(reprendre).toHaveBeenCalledTimes(1)
  })

  it('ne crée qu’un seul contexte audio', async () => {
    const { creer } = fauxContexte()
    const { preparerSon } = await importer()
    preparerSon()
    preparerSon()
    expect(creer).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/ui/commun/signal.test.ts`
Expected: FAIL, le module `./signal` est introuvable.

- [ ] **Step 3: Write minimal implementation**

Créer `src/ui/commun/signal.ts` :

```ts
let contexte: AudioContext | null = null

/** À appeler dans le gestionnaire d'un tap : Safari iOS ne joue de son qu'après un geste de l'utilisateur. */
export function preparerSon(): void {
  try {
    contexte ??= new AudioContext()
    if (contexte.state === 'suspended') void contexte.resume()
  } catch {
    // Web Audio absent ou refusé : le minuteur reste muet.
    contexte = null
  }
}

/** Bip de fin de minuteur et vibration. Silencieux si le son n'a pas été préparé. */
export function emettreSignal(): void {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    // Vibration indisponible.
  }
  if (!contexte) return
  try {
    const oscillateur = contexte.createOscillator()
    const volume = contexte.createGain()
    oscillateur.frequency.value = 880
    volume.gain.value = 0.3
    oscillateur.connect(volume).connect(contexte.destination)
    oscillateur.start()
    oscillateur.stop(contexte.currentTime + 0.5)
  } catch {
    // Contexte audio fermé par le navigateur.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/ui/commun/signal.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/ui/commun/signal.ts src/ui/commun/signal.test.ts
git commit -m "feat(ui): Signal sonore et vibration de fin de minuteur"
```

---

### Task 3: Composant `Minuteur`

**Files:**
- Modify: `src/ui/format.ts` (ajout de `formaterDuree`)
- Test: `src/ui/format.test.ts`
- Create: `src/ui/saisie/Minuteur.tsx`
- Test: `src/ui/saisie/Minuteur.test.tsx`
- Modify: `src/styles/saisie.css` (bloc « Minuteur » en fin de fichier)
- Modify: `src/styles/styles.test.ts` (couple de contraste)

**Interfaces:**
- Consumes: `emettreSignal(): void` de `src/ui/commun/signal.ts` (Task 2) ; `Dialogue` de `src/ui/commun/Dialogue.tsx` (props `titre`, `children`, `actions`).
- Produces :
  - `formaterDuree(secondes: number): string` exporté par `src/ui/format.ts` (`60` → `'1:00'`, `600` → `'10:00'`, `7` → `'0:07'`) ;
  - `Minuteur({ titre: string; fin: number; onFermer: () => void })` exporté par `src/ui/saisie/Minuteur.tsx`. `fin` est un horodatage en ms (`Date.now()` + durée). Rend un `dialog` nommé `titre`, contenant un élément `role="timer"` (nom accessible « Temps restant ») et un bouton « Fermer ». Le parent doit passer `key={fin}` pour repartir de zéro quand un minuteur en remplace un autre.

- [ ] **Step 1: Write the failing tests**

Dans `src/ui/format.test.ts`, compléter l'import :

```ts
import { aujourdhui, decrireEvenement, formaterDuree, pastillesFautes, pluriel } from './format'
```

et ajouter dans le `describe('format', …)` :

```ts
  it('affiche une durée en minutes et secondes', () => {
    expect(formaterDuree(600)).toBe('10:00')
    expect(formaterDuree(60)).toBe('1:00')
    expect(formaterDuree(59)).toBe('0:59')
    expect(formaterDuree(7)).toBe('0:07')
    expect(formaterDuree(0)).toBe('0:00')
  })
```

Créer `src/ui/saisie/Minuteur.test.tsx` :

```tsx
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { emettreSignal } from '../commun/signal'
import { Minuteur } from './Minuteur'

vi.mock('../commun/signal', () => ({ emettreSignal: vi.fn(), preparerSon: vi.fn() }))

const DEPART = new Date('2026-10-16T19:00:00Z').getTime()
const temps = () => screen.getByRole('timer', { name: 'Temps restant' })
const avancer = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms)
  })

describe('Minuteur', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(DEPART)
    vi.mocked(emettreSignal).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('affiche la durée complète puis décompte', () => {
    render(<Minuteur titre="Temps mort — ST DELPHIN" fin={DEPART + 60_000} onFermer={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Temps mort — ST DELPHIN' })).toBeInTheDocument()
    expect(temps()).toHaveTextContent('1:00')
    avancer(1_000)
    expect(temps()).toHaveTextContent('0:59')
    avancer(49_000)
    expect(temps()).toHaveTextContent('0:10')
    expect(emettreSignal).not.toHaveBeenCalled()
  })

  it('reste sur 0:00 et ne signale qu’une fois', () => {
    render(<Minuteur titre="Temps mort — ST DELPHIN" fin={DEPART + 60_000} onFermer={vi.fn()} />)
    avancer(60_000)
    expect(temps()).toHaveTextContent('0:00')
    expect(temps()).toHaveClass('minuteur-termine')
    avancer(30_000)
    expect(temps()).toHaveTextContent('0:00')
    expect(emettreSignal).toHaveBeenCalledTimes(1)
  })

  it('saute directement à 0:00 après une longue absence', () => {
    render(<Minuteur titre="Mi-temps" fin={DEPART + 600_000} onFermer={vi.fn()} />)
    expect(temps()).toHaveTextContent('10:00')
    // Téléphone verrouillé : l'horloge avance de 11 min, un seul tick est rattrapé au retour.
    vi.setSystemTime(DEPART + 660_000)
    avancer(250)
    expect(temps()).toHaveTextContent('0:00')
    expect(emettreSignal).toHaveBeenCalledTimes(1)
  })

  it('ne signale qu’une fois en mode strict', () => {
    // Échéance déjà passée au montage : le mode strict joue alors deux fois l'effet du signal.
    render(
      <StrictMode>
        <Minuteur titre="Mi-temps" fin={DEPART - 1_000} onFermer={vi.fn()} />
      </StrictMode>,
    )
    expect(temps()).toHaveTextContent('0:00')
    expect(emettreSignal).toHaveBeenCalledTimes(1)
  })

  it('se ferme sur « Fermer », même avant la fin', () => {
    const onFermer = vi.fn()
    render(<Minuteur titre="Avant la prolongation" fin={DEPART + 120_000} onFermer={onFermer} />)
    expect(temps()).toHaveTextContent('2:00')
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }))
    expect(onFermer).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/format.test.ts src/ui/saisie/Minuteur.test.tsx`
Expected: FAIL, `formaterDuree` n'est pas exporté et `./Minuteur` est introuvable.

- [ ] **Step 3: Write minimal implementation**

À la fin de `src/ui/format.ts` :

```ts

/** 600 → « 10:00 », 7 → « 0:07 ». */
export function formaterDuree(secondes: number): string {
  return `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, '0')}`
}
```

Créer `src/ui/saisie/Minuteur.tsx` :

```tsx
import { useEffect, useRef, useState } from 'react'
import { Dialogue } from '../commun/Dialogue'
import { emettreSignal } from '../commun/signal'
import { formaterDuree } from '../format'

/** Rafraîchissement plus fréquent que la seconde : l'affichage ne saute pas de chiffre. */
const PAS_MS = 250

interface Props {
  titre: string
  /** Horodatage (ms) de fin du décompte. */
  fin: number
  onFermer: () => void
}

/** Secondes restantes, recalculées depuis l'horloge : pas de dérive si l'onglet est ralenti. */
function restant(fin: number): number {
  return Math.max(0, Math.ceil((fin - Date.now()) / 1000))
}

export function Minuteur({ titre, fin, onFermer }: Props) {
  const [secondes, setSecondes] = useState(() => restant(fin))
  const signale = useRef(false)
  const termine = secondes === 0

  useEffect(() => {
    if (termine) {
      // Garde : le mode strict rejoue les effets, le signal ne doit partir qu'une fois.
      if (!signale.current) {
        signale.current = true
        emettreSignal()
      }
      return
    }
    const minuterie = setInterval(() => setSecondes(restant(fin)), PAS_MS)
    return () => clearInterval(minuterie)
  }, [fin, termine])

  return (
    <Dialogue
      titre={titre}
      actions={
        <button className="btn btn-principal" onClick={onFermer}>
          Fermer
        </button>
      }
    >
      <p className={termine ? 'minuteur minuteur-termine' : 'minuteur'} role="timer" aria-label="Temps restant">
        {formaterDuree(secondes)}
      </p>
    </Dialogue>
  )
}
```

À la fin de `src/styles/saisie.css` :

```css

/* ---------- Minuteur d'arrêt de jeu ---------- */
.minuteur {
  margin: var(--espace-2) 0;
  text-align: center;
  font-size: 72px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.minuteur.minuteur-termine {
  color: var(--danger);
}
```

Dans `src/styles/styles.test.ts`, ajouter à la fin du tableau `COUPLES` :

```ts
  ['--danger', '--surface', 'minuteur à 0:00'],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/format.test.ts src/ui/saisie/Minuteur.test.tsx src/styles/styles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/ui/format.ts src/ui/format.test.ts src/ui/saisie/Minuteur.tsx src/ui/saisie/Minuteur.test.tsx src/styles/saisie.css src/styles/styles.test.ts
git commit -m "feat(saisie): Popup de compte à rebours des arrêts de jeu"
```

---

### Task 4: Branchement dans l'écran de saisie

**Files:**
- Modify: `src/ui/saisie/EcranMatch.tsx`
- Test: `src/ui/saisie/EcranMatch.test.tsx`
- Modify: `e2e/match.spec.ts:60-66`
- Modify: `e2e/captures.spec.ts:67-69`
- Modify (non versionné) : `docs/guide-utilisation.md`, sections 4 et 6

**Interfaces:**
- Consumes :
  - `PAUSES.tempsMort` de `src/domain/config.ts` (Task 1) ;
  - `pauseAvant(periode: Periode): Pause | null` et `periodeSuivante(periode: Periode): Periode` de `src/domain/periodes.ts` (Task 1 / existant) ;
  - `preparerSon(): void` de `src/ui/commun/signal.ts` (Task 2) ;
  - `Minuteur({ titre, fin, onFermer })` de `src/ui/saisie/Minuteur.tsx` (Task 3).
- Produces : rien pour d'autres tâches.

`appliquerFinPeriode` ajoute `debutPeriode` avec `periodeSuivante(etat.periode)` pour les choix `periodeSuivante` **et** `prolongation` : la pause se calcule donc depuis `periodeSuivante(etat.periode)` dans les deux cas, et `finMatch` n'en a pas.

- [ ] **Step 1: Write the failing tests**

Dans `src/ui/saisie/EcranMatch.test.tsx`, ajouter ce bloc après `describe('EcranMatch — flèche de possession', …)` :

```tsx
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
```

Compléter l'import des fixtures en tête du fichier :

```ts
import { debut, faute, matchDeTest, panier } from '../../test/fixtures'
```

Dans le bloc existant `describe('garde anti-double-tap', …)`, ajouter ce test après « un double tap sur « Temps mort » n'en compte qu'un » :

```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/ui/saisie/EcranMatch.test.tsx`
Expected: FAIL sur les 5 tests du bloc « minuteurs » et sur « un tap sur « Fermer » pendant la garde est ignoré » (aucun `dialog` nommé « Temps mort — ST DELPHIN »). Les tests existants restent verts.

- [ ] **Step 3: Write minimal implementation**

Dans `src/ui/saisie/EcranMatch.tsx` :

1. Imports — remplacer la ligne `import type { ChoixFinPeriode } from '../../domain/periodes'` par :

```ts
import { PAUSES } from '../../domain/config'
import { pauseAvant, periodeSuivante, type ChoixFinPeriode } from '../../domain/periodes'
```

et ajouter, à leur place alphabétique :

```ts
import { preparerSon } from '../commun/signal'
```

```ts
import { Minuteur } from './Minuteur'
```

2. Juste après `type Vue = …`, ajouter :

```ts
/** Popup de compte à rebours ; `fin` en ms. État d'écran, jamais enregistré dans le match. */
type EtatMinuteur = { titre: string; fin: number }
```

3. Dans le composant, après `const [vue, setVue] = useState<Vue>({ nom: 'action' })` :

```ts
  const [minuteur, setMinuteur] = useState<EtatMinuteur | null>(null)
```

4. Après `const retourAction = () => setVue({ nom: 'action' })` :

```ts
  // Appelé dans le gestionnaire du tap : Safari iOS n'autorise le son qu'à ce moment-là.
  const lancerMinuteur = (titre: string, secondes: number) => {
    preparerSon()
    setMinuteur({ titre, fin: Date.now() + secondes * 1000 })
  }
```

5. Remplacer la prop `onTempsMort` d'`EcranAction` par :

```tsx
          onTempsMort={garder((equipe: EquipeId) => {
            enregistrer({ type: 'tempsMort', equipe })
            lancerMinuteur(`Temps mort — ${match.equipes[equipe].nom}`, PAUSES.tempsMort)
          })}
```

6. Remplacer la prop `onChoix` de `FinPeriode` par :

```tsx
            onChoix={garder((choix: ChoixFinPeriode) => {
              void appliquer((m) => appliquerFinPeriode(m, choix))
              const pause = choix === 'finMatch' ? null : pauseAvant(periodeSuivante(etat.periode))
              if (pause) lancerMinuteur(pause.titre, pause.secondes)
              retourAction()
            })}
```

7. Juste après le bloc `{vue.nom === 'finPeriode' && ( … )}`, toujours dans le fragment de l'écran d'action :

```tsx
        {minuteur && (
          <Minuteur
            key={minuteur.fin}
            titre={minuteur.titre}
            fin={minuteur.fin}
            onFermer={garder(() => setMinuteur(null))}
          />
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/ui/saisie/EcranMatch.test.tsx`
Expected: PASS (tests existants et nouveaux).

- [ ] **Step 5: Adapt the end-to-end tests**

La popup recouvre l'écran : les parcours Playwright doivent la fermer avant de continuer.

Dans `e2e/match.spec.ts`, remplacer :

```ts
  await page.getByRole('button', { name: 'Passer à la 2ème mi-temps' }).click()
  await expect(page.getByText('2ème mi-temps', { exact: true })).toBeVisible()
  await attendreGarde(page)
```

par :

```ts
  await page.getByRole('button', { name: 'Passer à la 2ème mi-temps' }).click()
  await expect(page.getByText('2ème mi-temps', { exact: true })).toBeVisible()
  const miTemps = page.getByRole('dialog', { name: 'Mi-temps' })
  await expect(miTemps.getByRole('timer')).toHaveText(/^(10:00|9:5\d)$/)
  await attendreGarde(page)
  await miTemps.getByRole('button', { name: 'Fermer' }).click()
  await expect(miTemps).toBeHidden()
  await attendreGarde(page)
```

Dans `e2e/captures.spec.ts`, remplacer :

```ts
  await page.getByRole('group', { name: `Actions ${NOM_LONG}` }).getByRole('button', { name: 'Temps mort' }).click()
  await attendreGarde(page)
  await capturer('04-saisie-102-2-penalite')
```

par :

```ts
  await page.getByRole('group', { name: `Actions ${NOM_LONG}` }).getByRole('button', { name: 'Temps mort' }).click()
  await attendreGarde(page)
  await capturer('04b-minuteur-temps-mort')
  await page.getByRole('button', { name: 'Fermer' }).click()
  await attendreGarde(page)
  await capturer('04-saisie-102-2-penalite')
```

Run: `npm run e2e`
Expected: PASS sur tous les projets. Ouvrir `captures/` (ou le dossier de sortie configuré dans `e2e/captures.spec.ts`) et vérifier à l'œil `04b-minuteur-temps-mort` sur chaque format : titre lisible, chiffres grands et centrés, bouton « Fermer » pleine largeur.

- [ ] **Step 6: Update the user guide (non versionné)**

Dans `docs/guide-utilisation.md`, section 4, remplacer :

```md
**Temps mort** s'enregistre en un seul appui.
```

par :

```md
**Temps mort** s'enregistre en un seul appui et ouvre un compte à rebours d'**1 minute**.
```

Puis, juste avant `### Alertes automatiques`, ajouter :

```md
### Comptes à rebours des arrêts de jeu

Une fenêtre affiche le temps restant de l'arrêt :

| Arrêt | Durée |
| --- | --- |
| Temps mort | 1 min |
| Mi-temps (passage à la 2ème mi-temps) | 10 min |
| Avant une prolongation | 2 min |

À 0:00, l'application émet un bip et fait vibrer le téléphone (si l'appareil le permet), puis reste sur 0:00. Touchez **Fermer** pour reprendre la saisie, à tout moment.

> Le compte à rebours n'est pas enregistré : il disparaît si vous revenez à l'accueil ou rechargez la page.
```

Dans la section 6, après la liste des choix de **Fin de période**, ajouter :

```md
Passer à la 2ème mi-temps ouvre le compte à rebours de la mi-temps (10 min), jouer une prolongation celui de 2 min.
```

Ne pas ajouter ce fichier au commit.

- [ ] **Step 7: Commit**

```bash
npm run typecheck && npm run lint && npm run test:run
git add src/ui/saisie/EcranMatch.tsx src/ui/saisie/EcranMatch.test.tsx e2e/match.spec.ts e2e/captures.spec.ts
git commit -m "feat(saisie): Comptes à rebours du temps mort, de la mi-temps et d'avant prolongation"
```

# Plan 3 — Refonte visuelle (thème clair épuré) : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à l'application un thème clair, doux et cohérent (police Manrope, un seul accent orange, cartes blanches) sur tous les écrans, sans changer les gestes, et ajouter au bandeau le voyant de fautes d'équipe (rouge dès 9) et la flèche de possession réglée à la main.

**Architecture:** Le fichier `src/styles.css` est remplacé par un dossier `src/styles/` (jetons, base, composants, un fichier par écran) importé par un `index.css`. Les composants React gardent leurs libellés et rôles ARIA ; seuls l'accueil, le bandeau, l'écran d'action, le choix du joueur, l'éditeur d'équipe et le journal reçoivent de petites retouches de structure. La flèche de possession est un champ facultatif du match (pas un événement) posé par une commande pure du domaine. Le quatrième niveau de fautes d'équipe (`penalite`) dérive des seuils existants.

**Tech Stack:** existant (TypeScript ~6.0, React 19, Vite 8, Dexie 4, Vitest 5, Playwright, oxlint) + `@fontsource-variable/manrope ^5.3`.

**Spec:** `docs/superpowers/specs/2026-10-14-refonte-visuelle-design.md` (spec parente : `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`).

**Point de départ :** branche `feat/refonte-visuelle` (créée depuis `dev`, contient déjà la spec). Maquette de référence : `nimbalyst-local/mockups/refonte-claire.mockup.html` (non versionnée, ouvrable dans un navigateur).

## Global Constraints

- Node `^22.22.2 || ^24.15.0 || >=26` (champ `engines`). Sous Node 22.14, npm affiche EBADENGINE : connu et accepté.
- Une seule nouvelle dépendance : `@fontsource-variable/manrope` `^5.3.0`. Aucune bibliothèque CSS, aucune icône externe.
- Thème **clair uniquement** : pas de `prefers-color-scheme`, pas de bascule. `color-scheme: light`.
- Aucune couleur littérale hors de `src/styles/jetons.css` (exception : `#fff` pour du texte sur fond plein et le fond blanc du QR).
- Contraste texte / fond ≥ 4,5:1 pour chaque couple de jetons listé dans la spec § 4.1. Zones tactiles ≥ 48 px ; boutons d'action (`.btn-action`) ≥ 96 px de haut.
- Aucun changement de libellé visible ni de rôle ARIA, sauf : « ↶ Annuler » → « Annuler » avec `aria-label="Annuler la dernière action"` ; « ↶ Annuler la dernière action » → « Annuler la dernière action » ; « ✕ Annuler » → « Annuler » ; ajout du groupe « Flèche de possession ».
- Toute animation vit sous `@media (prefers-reduced-motion: no-preference)`.
- Le domaine (`src/domain/`) n'importe ni React, ni Dexie, ni rien de `src/ui/`. Les seuils n'existent que dans `src/domain/config.ts` (`REGLES`) ; **aucun nouveau seuil** n'y est ajouté.
- `versionFormat` du match reste `1` ; aucune nouvelle version du schéma Dexie.
- Interface en français. Identifiants du code en français. Style : guillemets simples, pas de points-virgules, indentation 2 espaces, jamais `if (a) b() else c()` sur une ligne ; chaînes contenant une apostrophe en guillemets doubles.
- Icônes : SVG inline, `aria-hidden="true"`, jamais seules dans un bouton sans texte ou `aria-label`.
- Commits : Conventional Commits en français, titre en forme nominale, `git add` par chemins explicites (jamais `-A` / `.`), aucun trailer `Co-authored-by`, aucun lien de session. Commiter librement sur `feat/refonte-visuelle` ; jamais de push ni de merge sans demande.
- Avant chaque commit : `npm run typecheck && npm run lint && npm run test:run` verts.

## Review Focus

1. **Match enregistré avant cette version** (sans champ `possession`) : le bandeau affiche la flèche « non définie » (les deux côtés `aria-pressed="false"`), aucun crash, un tap la règle. → test dans la Task 7 (« accepte un match sans champ possession ») et Task 2.
2. **Tap sur la flèche juste après un autre tap de l'écran** (dans les 300 ms de la garde anti-double-tap) : ignoré, rien n'est écrit, comme pour toute action de l'écran. → test dans la Task 7 (« un tap sur la flèche pendant la garde est ignoré »).
3. **Noms d'équipe longs** (« AS SAINT-MÉDARD-EN-JALLES BASKET ») sur téléphone en portrait : le score reste lisible, rien ne déborde du bandeau, le nom se coupe sur deux lignes. → capture avec un nom long dans la Task 3 (spec de captures) ; vérification visuelle dans les Tasks 7 et 11.
4. **Score à trois chiffres** (≥ 100) : les chiffres tabulaires gardent le bandeau et la carte d'accueil alignés, le tiret ne saute pas à la ligne. → la spec de captures (Task 3) marque 34 paniers à 3 points ; vérification visuelle dans les Tasks 5, 7 et 11.
5. **Police non encore en cache** (toute première ouverture, réseau lent) : le texte s'affiche immédiatement en police système (`font-display: swap`, fourni par Fontsource) puis bascule ; aucune mise en page ne dépend d'une largeur de police exacte (pas de largeur fixe en `ch`/`em` sur des éléments à contenu variable). → revue de code dans la Task 11, étape « relecture des largeurs ».

---

## Structure des fichiers

```
src/main.tsx                          import de la police et de styles/index.css
src/styles/index.css                  @import dans l'ordre : jetons, base, composants, accueil, preparation, saisie, journal, clubs
src/styles/jetons.css                 variables :root (couleurs, rayons, ombres, espaces, durées)
src/styles/base.css                   reset, typographie, champs, .app/.ecran/.entete, erreurs, .masque, animations
src/styles/composants.css             .btn*, .icone, .carte, .pastille, .fautes-bloc, .pastilles-fautes, .couleur-equipe, dialogue, listes, .bandeau-maj
src/styles/accueil.css                marque, carte « match en cours », grille d'actions
src/styles/preparation.css            infos du match, éditeur d'équipe, tableau des joueurs, dialogue de sélection
src/styles/saisie.css                 bandeau, possession, alertes, blocs d'équipe, barre basse, choix du joueur, match terminé
src/styles/journal.css                journal, gestion des joueurs
src/styles/clubs.css                  clubs, fiche club, import, partage, équipe reçue, QR, scanner
src/styles/ecrans-transitoires.css    (temporaire, Task 3 → vidé puis supprimé Task 10)
src/ui/commun/Icones.tsx              composants SVG inline
src/ui/commun/PastillesFautes.tsx     cercles de fautes personnelles
src/domain/regles.ts                  niveau `penalite`
src/domain/types.ts                   Match.possession?: EquipeId | null
src/domain/match.ts                   nouveauMatch → possession: null
src/domain/commandes.ts               definirPossession
src/ui/Accueil.tsx                    carte « match en cours », actions avec icônes
src/ui/saisie/Bandeau.tsx             voyant de fautes, pastille TM, flèche de possession
src/ui/saisie/EcranAction.tsx         titre de bloc, icônes, aria-label « Annuler la dernière action », onPossession
src/ui/saisie/EcranMatch.tsx          branchement de onPossession
src/ui/saisie/ChoixJoueur.tsx         puce d'action, PastillesFautes, icône croix
src/ui/journal/Journal.tsx            icône retour, libellé sans ↶
src/ui/preparation/EditeurEquipe.tsx  boutons discrets avec icônes, icône « Retirer »
src/ui/preparation/PreparationMatch.tsx  carte des infos du match
src/ui/clubs/EcranClubs.tsx           effectif en pastille, chevron
src/ui/import/ApercuEquipe.tsx        carte
e2e/captures.spec.ts                  captures de contrôle visuel (à la demande)
e2e/match.spec.ts                     nom du bouton Annuler, possession
index.html, vite.config.ts            theme-color #f5f4f0
.gitignore                            captures/, .nimbalyst/, nimbalyst-local/
```

---

### Task 1 : Domaine — niveau « pénalité » des fautes d'équipe

**Files:**
- Modify: `src/domain/regles.ts:6-18`
- Test: `src/domain/regles.test.ts:9-14`

**Interfaces:**
- Consumes : `REGLES.seuilFautesEquipe` (8), `REGLES.alerteFautesEquipe` (7) de `src/domain/config.ts`.
- Produces : `type NiveauFautesEquipe = 'normal' | 'attention' | 'limite' | 'penalite'` ; `niveauFautesEquipe(fautes: number): NiveauFautesEquipe` renvoie `penalite` pour `fautes > REGLES.seuilFautesEquipe`.

- [ ] **Step 1 : Vérifier la branche**

```bash
git status --short && git branch --show-current
```

Attendu : `feat/refonte-visuelle`, arbre propre (les dossiers `.nimbalyst/` et `nimbalyst-local/` non suivis sont normaux).

- [ ] **Step 2 : Remplacer le test du niveau (il doit échouer)**

Dans `src/domain/regles.test.ts`, remplacer le test `classe les fautes d'équipe : orange à 7, limite dès 8` (lignes 9-14) par :

```ts
  it('classe les fautes d’équipe : attention à 7, limite à 8, pénalité dès 9', () => {
    expect(niveauFautesEquipe(0)).toBe('normal')
    expect(niveauFautesEquipe(6)).toBe('normal')
    expect(niveauFautesEquipe(7)).toBe('attention')
    expect(niveauFautesEquipe(8)).toBe('limite')
    expect(niveauFautesEquipe(9)).toBe('penalite')
    expect(niveauFautesEquipe(11)).toBe('penalite')
  })
```

- [ ] **Step 3 : Lancer le test, vérifier l'échec**

```bash
npx vitest run src/domain/regles.test.ts
```

Attendu : FAIL, `expected 'limite' to be 'penalite'`.

- [ ] **Step 4 : Implémenter**

Dans `src/domain/regles.ts`, remplacer le type et la fonction :

```ts
export type NiveauFautesEquipe = 'normal' | 'attention' | 'limite' | 'penalite'
```

```ts
/** Au-delà du seuil (9e faute et suivantes), chaque faute donne 2 lancers francs. */
export function niveauFautesEquipe(fautes: number): NiveauFautesEquipe {
  if (fautes > REGLES.seuilFautesEquipe) return 'penalite'
  if (fautes >= REGLES.seuilFautesEquipe) return 'limite'
  if (fautes >= REGLES.alerteFautesEquipe) return 'attention'
  return 'normal'
}
```

- [ ] **Step 5 : Lancer les tests, vérifier le vert**

```bash
npx vitest run src/domain src/ui/saisie
```

Attendu : PASS. (Le test `alerte à 8 fautes d'équipe et colore le compteur` de `EcranMatch.test.tsx` attend toujours `niveau-limite` à 8 : inchangé.)

- [ ] **Step 6 : Commit**

```bash
git add src/domain/regles.ts src/domain/regles.test.ts
git commit -m "feat(regles): Niveau « pénalité » des fautes d'équipe à partir de la 9e"
```

---

### Task 2 : Domaine — flèche de possession

**Files:**
- Modify: `src/domain/types.ts:53-65`
- Modify: `src/domain/match.ts:21-38`
- Modify: `src/domain/commandes.ts`
- Test: `src/domain/commandes.test.ts`

**Interfaces:**
- Produces :
  - `Match.possession?: EquipeId | null` (facultatif ; absent = non définie).
  - `nouveauMatch(...)` renvoie `possession: null`.
  - `definirPossession(match: Match, equipe: EquipeId): Match` — renvoie **le même objet** si `match.possession === equipe`, sinon une copie avec `possession: equipe` ; ne touche jamais `evenements`.

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

Dans `src/domain/commandes.test.ts`, ajouter `definirPossession` à l'import depuis `./commandes`, ajouter `import type { Match } from './types'`, puis ajouter en fin de fichier :

```ts
describe('flèche de possession', () => {
  it('un nouveau match n’a pas de possession définie', () => {
    expect(matchDeTest().possession).toBeNull()
  })

  it('se règle sur une équipe sans toucher au journal', () => {
    const match = matchDeTest(panier('A', 'a7', 2))
    const suivant = definirPossession(match, 'B')
    expect(suivant.possession).toBe('B')
    expect(suivant.evenements).toBe(match.evenements)
  })

  it('renvoie le même match quand l’équipe est déjà active', () => {
    const match = definirPossession(matchDeTest(), 'A')
    expect(definirPossession(match, 'A')).toBe(match)
  })

  it('survit à « Annuler »', () => {
    const match = annulerDernier(definirPossession(matchDeTest(panier('A', 'a7', 2)), 'A'))
    expect(match.possession).toBe('A')
    expect(match.evenements).toHaveLength(0)
  })

  it('accepte un match enregistré avant l’ajout du champ', () => {
    const ancien: Match = { ...matchDeTest() }
    delete ancien.possession
    expect(ancien.possession).toBeUndefined()
    expect(definirPossession(ancien, 'B').possession).toBe('B')
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

```bash
npx vitest run src/domain/commandes.test.ts
```

Attendu : FAIL (`definirPossession` n'existe pas ; erreur de type sur `possession`).

- [ ] **Step 3 : Implémenter**

`src/domain/types.ts`, dans `interface Match`, après `evenements: Evenement[]` :

```ts
  /** Flèche de possession alternée, réglée à la main par la table. Absente sur les matchs créés avant son ajout. */
  possession?: EquipeId | null
```

`src/domain/match.ts`, dans l'objet renvoyé par `nouveauMatch`, après `evenements: [],` :

```ts
    possession: null,
```

`src/domain/commandes.ts`, ajouter `EquipeId` à l'import de types et, en fin de fichier :

```ts
/** La flèche n'est pas un événement : le journal, « Annuler » et les corrections l'ignorent. */
export function definirPossession(match: Match, equipe: EquipeId): Match {
  if (match.possession === equipe) return match
  return { ...match, possession: equipe }
}
```

- [ ] **Step 4 : Lancer les tests et le typecheck**

```bash
npx vitest run src/domain && npm run typecheck
```

Attendu : PASS, aucune erreur de type.

- [ ] **Step 5 : Commit**

```bash
git add src/domain/types.ts src/domain/match.ts src/domain/commandes.ts src/domain/commandes.test.ts
git commit -m "feat(match): Ajout de la flèche de possession réglée à la main"
```

---

### Task 3 : Socle de styles — police, jetons, base, composants, captures

Après cette tâche, l'app est **déjà claire** : les écrans gardent leur structure actuelle, habillée par les nouveaux jetons et composants. Les fichiers par écran sont créés vides (ou presque) et un fichier transitoire porte les anciennes règles d'écran jusqu'à ce que chaque tâche suivante les remplace.

**Files:**
- Modify: `package.json` (dépendance), `src/main.tsx`
- Create: `src/styles/index.css`, `src/styles/jetons.css`, `src/styles/base.css`, `src/styles/composants.css`, `src/styles/accueil.css`, `src/styles/preparation.css`, `src/styles/saisie.css`, `src/styles/journal.css`, `src/styles/clubs.css`, `src/styles/ecrans-transitoires.css`
- Delete: `src/styles.css`
- Create: `e2e/captures.spec.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces : les jetons de la spec § 4.1 ; les classes `.btn`, `.btn-principal`, `.btn-discret`, `.btn-danger`, `.icone`, `.carte`, `.pastille`, `.fautes-bloc` (+ `.niveau-*`), `.pastilles-fautes`, `.couleur-equipe`, `.libelle`, `.numerique`, `.puce`, `.titre-carte`, `.voile`, `.dialogue`, `.dialogue-actions`, listes (`.liste-journal`, `.liste-joueurs`, `.liste-clubs`, `.liste-selection`), `.bandeau-maj`, `.erreurs`, `.avertissements`, `.masque`, `.chargement`, `.entete`, `.ecran`, `.app`.
- Commande de captures : `CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone` → images dans `captures/<projet>/`.

- [ ] **Step 1 : Installer la police**

```bash
npm install @fontsource-variable/manrope@^5.3.0
ls node_modules/@fontsource-variable/manrope/files | grep latin-wght-normal
```

Attendu : `manrope-latin-wght-normal.woff2` listé.

- [ ] **Step 2 : Écrire `src/styles/jetons.css`**

```css
/* Jetons de design — seul fichier contenant des couleurs littérales (spec § 4.1). */
:root {
  color-scheme: light;

  --fond: #f5f4f0;
  --surface: #ffffff;
  --surface-2: #edece7;
  --bordure: #e3e1db;
  --texte: #1d1c1a;
  --texte-2: #6f6d67;

  /* Un seul accent : l'orange du ballon. Texte blanc sur --accent : 4,8:1. */
  --accent: #c24f12;
  --accent-texte: #a8420c;
  --accent-tint: #fbeadf;

  --equipe-a: #c8463f;
  --equipe-a-tint: #fbe5e3;
  --equipe-b: #2d63c4;
  --equipe-b-tint: #e3ebfa;

  /* Actions : texte foncé sur teinte pastel, chaque couple ≥ 4,5:1. */
  --points: #1f6b3f;
  --points-tint: #e1f1e7;
  --faute: #9a3d2e;
  --faute-tint: #f8e4df;
  --temps-mort: #4a4f8c;
  --temps-mort-tint: #e7e8f6;
  --attention: #9a6b12;
  --attention-tint: #fbefd2;
  --danger: #b42318;

  --ombre: 0 1px 2px rgb(29 28 26 / 0.04), 0 8px 24px rgb(29 28 26 / 0.06);
  --ombre-basse: 0 1px 2px rgb(29 28 26 / 0.04);
  --r-carte: 18px;
  --r-btn: 12px;
  --r-tuile: 20px;

  --espace-1: 4px;
  --espace-2: 8px;
  --espace-3: 12px;
  --espace-4: 16px;
  --espace-5: 24px;

  --duree-tap: 120ms;
  --duree-dialogue: 160ms;
  --duree-ecran: 180ms;
}
```

- [ ] **Step 3 : Écrire `src/styles/base.css`**

```css
:root {
  font-family: 'Manrope Variable', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  background: var(--fond);
  color: var(--texte);
  -webkit-text-size-adjust: 100%;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100dvh;
}

h1,
h2,
h3 {
  margin: 0;
  font-weight: 800;
  letter-spacing: -0.02em;
}

h1 {
  font-size: 28px;
}

h2 {
  font-size: 20px;
}

p {
  margin: 0;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

input,
select,
textarea {
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: 10px;
  padding: 10px 12px;
  min-height: 44px;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

label {
  display: flex;
  flex-direction: column;
  gap: var(--espace-1);
  color: var(--texte-2);
  font-size: 14px;
  font-weight: 600;
}

.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--espace-4) 20px;
}

.ecran {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.entete {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--espace-2);
}

.sous-titre {
  color: var(--texte-2);
}

.chargement {
  color: var(--texte-2);
  text-align: center;
  padding: 48px 0;
}

/* Petits libellés en capitales (pastilles, titres de bloc). */
.libelle {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.numerique {
  font-variant-numeric: tabular-nums;
}

.puce {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--surface-2);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.erreurs,
.avertissements {
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  font-weight: 600;
}

ul.erreurs,
ul.avertissements {
  padding-left: 32px;
}

.erreurs {
  background: var(--danger);
  color: #fff;
}

.avertissements {
  background: var(--attention-tint);
  color: var(--attention);
}

/* Contenu réservé aux lecteurs d'écran ou aux champs fichier cachés. */
.masque {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: no-preference) {
  .btn,
  .btn-action,
  .tuile,
  .possession-cote {
    transition:
      transform var(--duree-tap),
      background-color var(--duree-tap),
      filter var(--duree-tap);
  }

  /* Retour visuel immédiat au toucher. */
  .btn:active:not(:disabled),
  .btn-action:active:not(:disabled),
  .tuile:active:not(:disabled),
  .possession-cote:active {
    transform: scale(0.97);
    filter: brightness(0.96);
  }

  .ecran {
    animation: fondu var(--duree-ecran) ease-out;
  }

  .voile {
    animation: apparition var(--duree-dialogue) ease-out;
  }

  .dialogue {
    animation: zoom var(--duree-dialogue) ease-out;
  }
}

@keyframes fondu {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

@keyframes apparition {
  from {
    opacity: 0;
  }
}

@keyframes zoom {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
}
```

- [ ] **Step 4 : Écrire `src/styles/composants.css`**

```css
/* ---------- Boutons ---------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--espace-2);
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--r-btn);
  padding: 12px 18px;
  min-height: 48px;
  font-weight: 700;
  color: var(--texte);
  box-shadow: var(--ombre-basse);
  cursor: pointer;
}

.btn-principal {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}

.btn-discret {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
  color: var(--texte-2);
}

.btn-danger {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
}

.btn:disabled,
.btn-action:disabled,
.tuile:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icone {
  width: 20px;
  height: 20px;
  flex: none;
}

/* ---------- Cartes et petits blocs ---------- */
.carte {
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--r-carte);
  box-shadow: var(--ombre);
  padding: var(--espace-4);
}

.titre-carte {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 800;
}

.couleur-equipe {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: var(--texte-2);
  flex: none;
}

.equipe-A .couleur-equipe {
  background: var(--equipe-a);
}

.equipe-B .couleur-equipe {
  background: var(--equipe-b);
}

.pastille {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--texte-2);
}

.pastille b {
  color: var(--texte);
  font-size: 22px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

/* Voyant des fautes d'équipe : toujours visible, comme sur une table de marque. */
.fautes-bloc {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 96px;
  padding: 6px 12px;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--texte-2);
  border: 1.5px solid transparent;
}

.fautes-bloc .valeur {
  font-size: 26px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--texte);
  font-variant-numeric: tabular-nums;
}

.fautes-bloc .valeur small {
  font-size: 14px;
  font-weight: 700;
  color: var(--texte-2);
}

.fautes-bloc.niveau-attention {
  background: var(--attention-tint);
  border-color: var(--attention);
  color: var(--attention);
}

.fautes-bloc.niveau-attention .valeur,
.fautes-bloc.niveau-attention .valeur small {
  color: var(--attention);
}

.fautes-bloc.niveau-limite {
  background: var(--attention);
  border-color: var(--attention);
  color: var(--texte);
}

.fautes-bloc.niveau-limite .valeur,
.fautes-bloc.niveau-limite .valeur small {
  color: var(--texte);
}

.fautes-bloc.niveau-penalite {
  background: var(--danger);
  border-color: var(--danger);
  color: #fff;
  box-shadow: 0 0 0 4px rgb(180 35 24 / 0.18);
}

.fautes-bloc.niveau-penalite .valeur,
.fautes-bloc.niveau-penalite .valeur small {
  color: #fff;
}

/* Cercles de fautes personnelles. */
.pastilles-fautes {
  display: inline-flex;
  gap: 4px;
}

.pastilles-fautes i {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1.5px solid var(--attention);
}

.pastilles-fautes i.pleine {
  background: var(--attention);
}

/* ---------- Dialogue ---------- */
.voile {
  position: fixed;
  inset: 0;
  background: rgb(29 28 26 / 0.45);
  display: grid;
  place-items: center;
  padding: var(--espace-4);
  z-index: 10;
}

.dialogue {
  background: var(--surface);
  border-radius: var(--r-carte);
  box-shadow: var(--ombre);
  padding: 20px;
  width: min(480px, 100%);
  max-height: 90dvh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
}

.dialogue textarea {
  resize: vertical;
}

.dialogue-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
}

.dialogue-actions .btn {
  flex: 1;
}

/* ---------- Listes ---------- */
.liste-journal,
.liste-joueurs,
.liste-clubs,
.liste-selection {
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
  border: 1px solid var(--bordure);
  border-radius: 12px;
  padding: 10px 14px;
}

/* ---------- Mise à jour ---------- */
.bandeau-maj {
  position: fixed;
  bottom: var(--espace-3);
  left: 50%;
  transform: translateX(-50%);
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--r-carte);
  box-shadow: var(--ombre);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 20;
}
```

- [ ] **Step 5 : Créer le fichier transitoire et les fichiers d'écran**

Créer `src/styles/ecrans-transitoires.css` en y copiant **tel quel** le contenu de `src/styles.css` puis en supprimant ces blocs (devenus inutiles ou remplacés) :

- le bloc `:root { … }` (lignes 1-21) ;
- `* { box-sizing }`, `body`, `button, input, select`, `input, select`, `label` (lignes 23-53) ;
- `.app`, `.ecran`, `.entete`, `.entete h1`, `.btn*`, `.btn:disabled`, le bloc « Retour visuel immédiat », `.erreurs`, `.avertissements` (lignes 55-120) ;
- `.sous-titre` (lignes 129-132) ;
- le bloc « Dialogue » (lignes 372-405) ;
- le bloc « Mise à jour » (lignes 459-472) ;
- le second `.dialogue`, `.dialogue textarea`, `.masque` (lignes 497-518) ;
- `.liste-journal, .liste-joueurs { … }` et `.liste-journal li, .liste-joueurs li { … }` (lignes 408-427) ;
- `.liste-clubs { … }` (lignes 481-488) ;
- `.liste-selection { list-style … }` : garder seulement `max-height: 50dvh; overflow-y: auto;` dans ce sélecteur.

Dans ce qui reste, remplacer `var(--danger-texte)` par `var(--danger)` (deux occurrences : `.fautes-equipe.niveau-limite`, et aucune autre si `.erreurs` a bien été retiré). Ajouter sous `.fautes-equipe.niveau-limite` :

```css
.fautes-equipe.niveau-penalite {
  color: #fff;
  background: var(--danger);
  border-radius: 6px;
  padding: 0 6px;
  font-weight: 800;
}
```

Créer les cinq fichiers d'écran avec seulement un commentaire (ils sont remplis par les tâches suivantes) :

`src/styles/accueil.css` : `/* Accueil — rempli par la Task 5. */`
`src/styles/preparation.css` : `/* Préparation du match — rempli par la Task 8. */`
`src/styles/saisie.css` : `/* Saisie du match — rempli par les Tasks 6 et 7. */`
`src/styles/journal.css` : `/* Journal — rempli par la Task 9. */`
`src/styles/clubs.css` : `/* Clubs, import, partage — rempli par la Task 10. */`

Créer `src/styles/index.css` :

```css
@import './jetons.css';
@import './base.css';
@import './composants.css';
@import './accueil.css';
@import './preparation.css';
@import './saisie.css';
@import './journal.css';
@import './clubs.css';
@import './ecrans-transitoires.css';
```

Supprimer `src/styles.css` :

```bash
git rm src/styles.css
```

- [ ] **Step 6 : Brancher la police et les styles**

`src/main.tsx` : remplacer `import './styles.css'` par :

```ts
import '@fontsource-variable/manrope'
import './styles/index.css'
```

- [ ] **Step 7 : Vérifier que tout compile et que les tests passent**

```bash
npm run typecheck && npm run lint && npm run test:run && npm run build
ls dist/assets | grep -i manrope
```

Attendu : tout vert ; un fichier `manrope-latin-wght-normal-*.woff2` dans `dist/assets` (le service worker le met en cache via `globPatterns`).

- [ ] **Step 8 : Écrire la spec de captures `e2e/captures.spec.ts`**

```ts
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
  const capturer = (nom: string) => page.screenshot({ path: `${dossier}/${nom}.png`, fullPage: true })

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
  for (let i = 0; i < 4; i++) await marquer(page, 'ST DELPHIN', 'F', 4)
  for (let i = 0; i < 9; i++) await marquer(page, NOM_LONG, 'F', [5, 8, 10][i % 3])
  await page.getByRole('group', { name: `Actions ${NOM_LONG}` }).getByRole('button', { name: 'Temps mort' }).click()
  await attendreGarde(page)
  await capturer('04-saisie-102-2-penalite')

  await page.getByRole('group', { name: 'Actions ST DELPHIN' }).getByRole('button', { name: '+2', exact: true }).click()
  await attendreGarde(page)
  await capturer('05-choix-joueur')
  await page.getByRole('button', { name: /Annuler$/ }).click()
  await attendreGarde(page)

  await page.getByRole('button', { name: 'Journal' }).click()
  await capturer('06-journal')
  await page.getByRole('button', { name: 'Retour au match' }).click()
  await attendreGarde(page)

  await page.getByRole('button', { name: 'Fin de période' }).click()
  await capturer('07-dialogue-fin-periode')
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await attendreGarde(page)

  await page.getByRole('button', { name: 'Accueil' }).click()
  await capturer('08-accueil-match-en-cours')

  await page.getByRole('button', { name: 'Clubs et licenciés' }).click()
  await capturer('09-clubs')
})
```

- [ ] **Step 9 : Ignorer les dossiers de captures et de l'éditeur**

Ajouter en fin de `.gitignore` :

```
# Captures de contrôle visuel et artefacts de l'éditeur
captures/
.nimbalyst/
nimbalyst-local/
```

- [ ] **Step 10 : Lancer les captures et regarder le résultat**

```bash
CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone
ls captures/tablette captures/telephone
```

Attendu : 9 images par projet. Ouvrir `captures/tablette/04-saisie-102-2-penalite.png` : fond clair, police Manrope, boutons blancs à bordure fine, score `102 – 2`. (Les écrans ont encore leur ancienne structure, c'est normal.)

- [ ] **Step 11 : Commit**

```bash
git add package.json package-lock.json src/main.tsx src/styles .gitignore e2e/captures.spec.ts
git commit -m "feat(styles): Socle du thème clair (police Manrope, jetons, base, composants) et captures de contrôle"
```

---

### Task 4 : Composants communs — icônes et cercles de fautes

**Files:**
- Create: `src/ui/commun/Icones.tsx`
- Create: `src/ui/commun/PastillesFautes.tsx`
- Test: `src/ui/commun/PastillesFautes.test.tsx`

**Interfaces:**
- Produces :
  - `IconePlus, IconePersonnes, IconeQr, IconeTelecharger, IconeFleche, IconeRetour, IconeListe, IconeMaison, IconeChrono, IconeCroix, IconeAlerte, IconeChevron, IconeTriangleGauche, IconeTriangleDroite` : composants `(props: SVGProps<SVGSVGElement>) => JSX`, 20 × 20, `className="icone"`, `aria-hidden="true"`.
  - `PastillesFautes({ fautes, total? })` : `total` par défaut `REGLES.fautesPersoMax` ; rend `<span class="pastilles-fautes" aria-hidden="true">` avec `total` éléments `<i>`, les `min(fautes, total)` premiers portant la classe `pleine`.

- [ ] **Step 1 : Écrire le test (il doit échouer)**

`src/ui/commun/PastillesFautes.test.tsx` :

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PastillesFautes } from './PastillesFautes'

const pleines = (container: HTMLElement) =>
  [...container.querySelectorAll('.pastilles-fautes i')].map((cercle) => cercle.classList.contains('pleine'))

describe('PastillesFautes', () => {
  it('dessine 5 cercles dont les n premiers pleins', () => {
    const { container } = render(<PastillesFautes fautes={2} />)
    expect(pleines(container)).toEqual([true, true, false, false, false])
  })

  it('plafonne au total', () => {
    const { container } = render(<PastillesFautes fautes={7} />)
    expect(pleines(container)).toEqual([true, true, true, true, true])
  })

  it('accepte un autre total (coach)', () => {
    const { container } = render(<PastillesFautes fautes={1} total={3} />)
    expect(pleines(container)).toEqual([true, false, false])
  })

  it('est masqué aux lecteurs d’écran', () => {
    const { container } = render(<PastillesFautes fautes={0} />)
    expect(container.querySelector('.pastilles-fautes')).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

```bash
npx vitest run src/ui/commun/PastillesFautes.test.tsx
```

Attendu : FAIL (module introuvable).

- [ ] **Step 3 : Écrire `src/ui/commun/PastillesFautes.tsx`**

```tsx
import { REGLES } from '../../domain/config'

interface Props {
  fautes: number
  total?: number
}

/** Cercles de fautes personnelles. Purement visuel : le texte accessible est porté par l'élément parent. */
export function PastillesFautes({ fautes, total = REGLES.fautesPersoMax }: Props) {
  return (
    <span className="pastilles-fautes" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <i key={index} className={index < fautes ? 'pleine' : undefined} />
      ))}
    </span>
  )
}
```

- [ ] **Step 4 : Écrire `src/ui/commun/Icones.tsx`**

```tsx
import type { ReactNode, SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement>

/** Icônes décoratives : toujours accompagnées d'un texte ou d'un aria-label sur le bouton. */
function Icone({ children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg
      className="icone"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconePlus = (props: Props) => (
  <Icone {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icone>
)

export const IconePersonnes = (props: Props) => (
  <Icone {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-5-6.3" />
  </Icone>
)

export const IconeQr = (props: Props) => (
  <Icone {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <path d="M14 14h3v3M21 14v3M17 21h4M14 18v3" />
  </Icone>
)

export const IconeTelecharger = (props: Props) => (
  <Icone {...props}>
    <path d="M12 4v11M7 10l5 5 5-5M4 20h16" />
  </Icone>
)

export const IconeFleche = (props: Props) => (
  <Icone {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icone>
)

export const IconeRetour = (props: Props) => (
  <Icone {...props}>
    <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
  </Icone>
)

export const IconeListe = (props: Props) => (
  <Icone {...props}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Icone>
)

export const IconeMaison = (props: Props) => (
  <Icone {...props}>
    <path d="M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10" />
  </Icone>
)

export const IconeChrono = (props: Props) => (
  <Icone {...props}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2M9 2h6" />
  </Icone>
)

export const IconeCroix = (props: Props) => (
  <Icone {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icone>
)

export const IconeAlerte = (props: Props) => (
  <Icone {...props}>
    <path d="M12 3 2 20h20L12 3zM12 9v5M12 17h.01" />
  </Icone>
)

export const IconeChevron = (props: Props) => (
  <Icone {...props}>
    <path d="m9 6 6 6-6 6" />
  </Icone>
)

export const IconeTriangleGauche = (props: Props) => (
  <Icone fill="currentColor" stroke="none" {...props}>
    <path d="M15 4 6 12l9 8z" />
  </Icone>
)

export const IconeTriangleDroite = (props: Props) => (
  <Icone fill="currentColor" stroke="none" {...props}>
    <path d="M9 4l9 8-9 8z" />
  </Icone>
)
```

- [ ] **Step 5 : Lancer les tests, le lint et le typecheck**

```bash
npx vitest run src/ui/commun && npm run lint && npm run typecheck
```

Attendu : PASS, aucune alerte (`react/only-export-components` accepte un fichier qui n'exporte que des composants).

- [ ] **Step 6 : Commit**

```bash
git add src/ui/commun/Icones.tsx src/ui/commun/PastillesFautes.tsx src/ui/commun/PastillesFautes.test.tsx
git commit -m "feat(ui): Icônes SVG inline et cercles de fautes personnelles"
```

---

### Task 5 : Accueil

**Files:**
- Modify: `src/ui/Accueil.tsx`
- Create: `src/ui/Accueil.test.tsx`
- Modify: `src/styles/accueil.css`, `src/styles/ecrans-transitoires.css`

**Interfaces:**
- Consumes : `calculerEtat` (`src/domain/etat.ts`), `libellePeriode` (`src/domain/periodes.ts`), icônes de la Task 4.
- Produces : région `aria-label="Match en cours"` contenant un score `aria-label="Score du match en cours"` ; bouton « Nouveau match » avec `btn-principal` seulement sans match en cours.

- [ ] **Step 1 : Écrire les tests (ils doivent échouer)**

`src/ui/Accueil.test.tsx` :

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { enregistrerMatch } from '../storage/matchs'
import { matchDeTest, panier } from '../test/fixtures'
import { Accueil } from './Accueil'

function afficher() {
  render(
    <Accueil onNouveauMatch={vi.fn()} onReprendre={vi.fn()} onClubs={vi.fn()} onPartager={vi.fn()} onImporter={vi.fn()} />,
  )
}

describe('Accueil', () => {
  it('met en avant le match en cours avec son score et sa période', async () => {
    await enregistrerMatch(matchDeTest(panier('A', 'a7', 2), { type: 'debutPeriode', periode: 'MT2' }))
    afficher()
    const carte = within(await screen.findByRole('region', { name: 'Match en cours' }))
    expect(carte.getByText('ST DELPHIN')).toBeInTheDocument()
    expect(carte.getByText('GRADIGNAN')).toBeInTheDocument()
    expect(carte.getByLabelText('Score du match en cours')).toHaveTextContent('2 – 0')
    expect(carte.getByText('2ème mi-temps')).toBeInTheDocument()
    expect(carte.getByRole('button', { name: 'Reprendre le match en cours' })).toHaveClass('btn-principal')
    expect(screen.getByRole('button', { name: 'Nouveau match' })).not.toHaveClass('btn-principal')
  })

  it('sans match en cours, « Nouveau match » est l’action principale', async () => {
    afficher()
    expect(await screen.findByRole('button', { name: 'Nouveau match' })).toHaveClass('btn-principal')
    expect(screen.queryByRole('region', { name: 'Match en cours' })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2 : Lancer le test, vérifier l'échec**

```bash
npx vitest run src/ui/Accueil.test.tsx
```

Attendu : FAIL (`region` introuvable ; classe `btn-principal` absente).

- [ ] **Step 3 : Réécrire `src/ui/Accueil.tsx`**

```tsx
import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { calculerEtat } from '../domain/etat'
import { libellePeriode } from '../domain/periodes'
import { matchEnCours } from '../storage/matchs'
import { Dialogue } from './commun/Dialogue'
import { IconeFleche, IconePersonnes, IconePlus, IconeQr, IconeTelecharger } from './commun/Icones'

interface Props {
  onNouveauMatch: () => void
  onReprendre: (matchId: string) => void
  onClubs: () => void
  onPartager: () => void
  onImporter: () => void
}

export function Accueil({ onNouveauMatch, onReprendre, onClubs, onPartager, onImporter }: Props) {
  const enCours = useLiveQuery(() => matchEnCours(), [])
  const [confirmation, setConfirmation] = useState(false)
  const etat = enCours ? calculerEtat(enCours) : null

  // Un second match en cours rendrait le premier inaccessible : on prévient avant.
  function demanderNouveauMatch() {
    if (enCours) {
      setConfirmation(true)
    } else {
      onNouveauMatch()
    }
  }

  return (
    <section className="ecran accueil">
      <header className="marque">
        <span className="logo" aria-hidden="true">
          <svg viewBox="0 0 512 512">
            <circle cx="256" cy="256" r="196" fill="#fff" />
            <path
              d="M60 256h392M256 60v392M118 118c70 70 70 206 0 276M394 118c-70 70-70 206 0 276"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="22"
            />
          </svg>
        </span>
        <div>
          <h1>Table de marque</h1>
          <p className="sous-titre">Basket loisir UFOLEP 33</p>
        </div>
      </header>

      {enCours && etat && (
        <section className="carte carte-encours" aria-label="Match en cours">
          <p className="etiquette">
            <i aria-hidden="true" /> Match en cours
          </p>
          <div className="affiche">
            <span className="nom equipe-A">{enCours.equipes.A.nom}</span>
            <span className="score-accueil" aria-label="Score du match en cours">
              {etat.equipes.A.score} – {etat.equipes.B.score}
            </span>
            <span className="nom equipe-B">{enCours.equipes.B.nom}</span>
          </div>
          <p className="periode">{libellePeriode(etat.periode)}</p>
          <button className="btn btn-principal" onClick={() => onReprendre(enCours.id)}>
            Reprendre le match en cours
            <IconeFleche />
          </button>
        </section>
      )}

      <div className="actions-accueil">
        <button className={enCours ? 'btn large' : 'btn btn-principal large'} onClick={demanderNouveauMatch}>
          <span className="ico">
            <IconePlus />
          </span>
          Nouveau match
        </button>
        <button className="btn" onClick={onClubs}>
          <span className="ico">
            <IconePersonnes />
          </span>
          Clubs et licenciés
        </button>
        <button className="btn" onClick={onPartager}>
          <span className="ico">
            <IconeQr />
          </span>
          Partager une équipe
        </button>
        <button className="btn large" onClick={onImporter}>
          <span className="ico">
            <IconeTelecharger />
          </span>
          Importer une équipe
        </button>
      </div>

      {confirmation && (
        <Dialogue
          titre="Un match est en cours"
          actions={
            <>
              <button className="btn btn-principal" onClick={onNouveauMatch}>
                Créer un nouveau match
              </button>
              <button className="btn" onClick={() => setConfirmation(false)}>
                Annuler
              </button>
            </>
          }
        >
          <p>Il restera enregistré mais ne sera plus repris automatiquement.</p>
        </Dialogue>
      )}
    </section>
  )
}
```

- [ ] **Step 4 : Écrire `src/styles/accueil.css`**

```css
.accueil {
  max-width: 560px;
  width: 100%;
  margin: 0 auto;
  padding-top: 56px;
  gap: 20px;
}

.marque {
  display: flex;
  align-items: center;
  gap: 14px;
}

.marque .logo {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: var(--accent);
  display: grid;
  place-items: center;
  flex: none;
}

.marque .logo svg {
  width: 32px;
  height: 32px;
}

.marque p {
  margin-top: 2px;
  font-weight: 500;
}

.carte-encours {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px 22px;
}

.carte-encours .etiquette {
  display: flex;
  align-items: center;
  gap: var(--espace-2);
  color: var(--accent-texte);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.carte-encours .etiquette i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
}

.carte-encours .affiche {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--espace-3);
}

.carte-encours .nom {
  font-weight: 700;
  font-size: 18px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.carte-encours .nom.equipe-B {
  text-align: right;
}

.carte-encours .score-accueil {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.carte-encours .periode {
  margin-top: -8px;
  text-align: center;
  color: var(--texte-2);
  font-size: 14px;
}

.carte-encours .btn {
  min-height: 56px;
  font-size: 17px;
}

.actions-accueil {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--espace-3);
}

.actions-accueil .btn {
  min-height: 64px;
  justify-content: flex-start;
  padding: 14px 18px;
}

.actions-accueil .btn.large {
  grid-column: 1 / -1;
}

.actions-accueil .ico {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--surface-2);
  display: grid;
  place-items: center;
  flex: none;
}

.actions-accueil .btn-principal .ico {
  background: rgb(255 255 255 / 0.2);
}

@media (max-width: 600px) {
  .accueil {
    padding-top: var(--espace-5);
  }

  .actions-accueil {
    grid-template-columns: 1fr;
  }
}
```

Dans `src/styles/ecrans-transitoires.css`, supprimer le bloc `/* Accueil */ .accueil { … }`.

- [ ] **Step 5 : Lancer tous les tests**

```bash
npm run test:run && npm run typecheck && npm run lint
```

Attendu : PASS. Les tests de `App.test.tsx` qui cherchent `/Reprendre le match en cours/` et `Nouveau match` passent toujours.

- [ ] **Step 6 : Captures et contrôle visuel**

```bash
CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone
```

Ouvrir `captures/tablette/08-accueil-match-en-cours.png` et `captures/telephone/08-accueil-match-en-cours.png` : carte blanche avec étiquette orange, score `102 – 2` centré sur une ligne, nom long de l'équipe B coupé sur deux lignes sans déborder, bouton orange, quatre actions avec icône (une colonne sur téléphone). `01-accueil-vide.png` : « Nouveau match » orange, pas de carte.

- [ ] **Step 7 : Commit**

```bash
git add src/ui/Accueil.tsx src/ui/Accueil.test.tsx src/styles/accueil.css src/styles/ecrans-transitoires.css
git commit -m "feat(accueil): Carte du match en cours et actions avec icônes"
```

---

### Task 6 : Écran d'action et choix du joueur

**Files:**
- Modify: `src/ui/saisie/EcranAction.tsx`
- Modify: `src/ui/saisie/ChoixJoueur.tsx`
- Modify: `src/ui/saisie/Alertes.tsx`
- Modify: `src/ui/saisie/EcranMatch.test.tsx`, `src/App.test.tsx` (aucun changement attendu, vérification)
- Modify: `src/styles/saisie.css`, `src/styles/ecrans-transitoires.css`
- Modify: `e2e/match.spec.ts:46`

**Interfaces:**
- Consumes : `IconeRetour, IconeListe, IconeMaison, IconeChrono, IconeCroix, IconeAlerte` (Task 4), `PastillesFautes` (Task 4).
- Produces : bouton de la barre basse avec nom accessible « Annuler la dernière action » (texte visible « Annuler ») ; bouton « Annuler » (sans ✕) sur le choix du joueur ; `EcranAction` accepte une prop facultative `onPossession?: (equipe: EquipeId) => void` qu'il transmet à `Bandeau` (branchée dans la Task 7).

- [ ] **Step 1 : Mettre à jour les tests (ils doivent échouer)**

Dans `src/ui/saisie/EcranMatch.test.tsx` :

- remplacer toutes les occurrences de `name: '✕ Annuler'` par `name: 'Annuler'` (lignes 46, 59, 67) et le titre du test ligne 64 par `'Annuler revient à l’écran d’action sans rien enregistrer'` ;
- remplacer toutes les occurrences de `name: '↶ Annuler'` par `name: 'Annuler la dernière action'` (lignes 84, 165, 196) et le titre ligne 163 par `'un double tap sur « Annuler la dernière action » ne supprime qu’une action'` ;
- remplacer la ligne 30 par :

```ts
    expect(screen.getByText(/^Dernière action/).closest('p')).toHaveTextContent(
      'Dernière action : 2 – 0 · +2 n°7 ST DELPHIN',
    )
```

Dans `e2e/match.spec.ts` ligne 46 : `'↶ Annuler'` → `'Annuler la dernière action'`.

- [ ] **Step 2 : Lancer les tests, vérifier l'échec**

```bash
npx vitest run src/ui/saisie/EcranMatch.test.tsx
```

Attendu : FAIL sur les boutons « Annuler » / « Annuler la dernière action » introuvables.

- [ ] **Step 3 : Réécrire `src/ui/saisie/EcranAction.tsx`**

```tsx
import type { EtatMatch } from '../../domain/etat'
import { alertesActives } from '../../domain/regles'
import { EQUIPES, type EquipeId, type Match } from '../../domain/types'
import { IconeChrono, IconeListe, IconeMaison, IconeRetour } from '../commun/Icones'
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
  onJournal: () => void
  onAccueil: () => void
  onPossession?: (equipe: EquipeId) => void
}

const VALEURS = [1, 2, 3] as const

export function EcranAction({
  match,
  etat,
  onAction,
  onTempsMort,
  onAnnulerDernier,
  onFinPeriode,
  onJournal,
  onAccueil,
  onPossession,
}: Props) {
  const derniere = etat.chronologie.at(-1)
  return (
    <section className="ecran ecran-action">
      <Bandeau match={match} etat={etat} onPossession={onPossession} />
      <Alertes alertes={alertesActives(match, etat)} />
      <div className="blocs-equipes">
        {EQUIPES.map((equipe) => (
          <div
            key={equipe}
            className={`bloc-equipe carte equipe-${equipe}`}
            role="group"
            aria-label={`Actions ${match.equipes[equipe].nom}`}
          >
            <p className="bloc-titre libelle">{match.equipes[equipe].nom}</p>
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
              <IconeChrono />
              Temps mort
            </button>
          </div>
        ))}
      </div>
      <p className="derniere-action">
        Dernière action :{' '}
        {derniere ? (
          <>
            <span className="puce">
              {derniere.scoreA} – {derniere.scoreB}
            </span>{' '}
            · <b>{decrireEvenement(match, derniere.evenement)}</b>
          </>
        ) : (
          'aucune'
        )}
      </p>
      <nav className="barre-basse">
        <button
          className="btn"
          aria-label="Annuler la dernière action"
          disabled={match.evenements.length === 0}
          onClick={onAnnulerDernier}
        >
          <IconeRetour />
          Annuler
        </button>
        <button className="btn" onClick={onJournal}>
          <IconeListe />
          Journal
        </button>
        <button className="btn btn-principal" onClick={onFinPeriode}>
          Fin de période
        </button>
        <button className="btn btn-discret" onClick={onAccueil}>
          <IconeMaison />
          Accueil
        </button>
      </nav>
    </section>
  )
}
```

`Bandeau` n'accepte pas encore `onPossession` : pour que le typecheck passe dès cette tâche, ajouter **provisoirement** à `src/ui/saisie/Bandeau.tsx` la prop dans l'interface (`onPossession?: (equipe: EquipeId) => void`) sans l'utiliser, en la déstructurant avec un commentaire `// branchée dans la Task 7` et en l'affectant à `void onPossession` pour éviter `noUnusedParameters`. La Task 7 la rend réelle.

- [ ] **Step 4 : Réécrire `src/ui/saisie/ChoixJoueur.tsx`**

```tsx
import { useRef } from 'react'
import { REGLES } from '../../domain/config'
import type { EtatMatch } from '../../domain/etat'
import { parNumero } from '../../domain/match'
import { niveauFautesJoueur } from '../../domain/regles'
import type { Match } from '../../domain/types'
import type { Garder } from '../commun/gardeDoubleTap'
import { IconeCroix } from '../commun/Icones'
import { PastillesFautes } from '../commun/PastillesFautes'
import { pluriel } from '../format'
import type { ActionEnAttente } from './types'

interface Props {
  match: Match
  etat: EtatMatch
  action: ActionEnAttente
  garder: Garder
  /** joueurId null = coach (faute uniquement) */
  onChoisir: (joueurId: string | null) => void
  onAnnuler: () => void
}

export function ChoixJoueur({ match, etat, action, garder, onChoisir, onAnnuler }: Props) {
  // Un double tap ne doit enregistrer qu'une action : le second clic arrive avant le re-rendu.
  // La garde passe avant ce verrou : un tap qu'elle ignore ne doit pas condamner la tuile.
  const dejaChoisi = useRef(false)
  const choisir = (joueurId: string | null) => {
    if (dejaChoisi.current) return
    dejaChoisi.current = true
    onChoisir(joueurId)
  }

  const equipe = match.equipes[action.equipe]
  const stats = etat.equipes[action.equipe]
  const valeur = action.type === 'panier' ? `+${action.valeur}` : 'Faute'

  return (
    <section className="ecran choix-joueur">
      <header className={`bandeau-choix ${action.type === 'panier' ? 'choix-panier' : 'choix-faute'}`}>
        <h2>
          <span className="valeur-action">{valeur}</span> — {equipe.nom}
        </h2>
        <button className="btn" onClick={onAnnuler}>
          <IconeCroix />
          Annuler
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
              onClick={() => garder(choisir)(joueur.id)}
            >
              <span className="tuile-numero">{joueur.numero}</span>
              <PastillesFautes fautes={fautes} />
              <span className="tuile-points">{pluriel(points, 'pt')}</span>
            </button>
          )
        })}
        {action.type === 'faute' && (
          <button
            className="tuile tuile-coach"
            aria-label={`Coach, ${pluriel(stats.fautesCoach, 'faute')}`}
            onClick={() => garder(choisir)(null)}
          >
            <span className="tuile-numero">Coach</span>
            <PastillesFautes fautes={stats.fautesCoach} total={Math.max(stats.fautesCoach, REGLES.fautesPersoMax)} />
          </button>
        )}
      </div>
    </section>
  )
}
```

Le nom accessible du `h2` reste `+2 — ST DELPHIN` (le test `getByRole('heading', { name: '+2 — ST DELPHIN' })` passe).

- [ ] **Step 5 : Réécrire `src/ui/saisie/Alertes.tsx`**

```tsx
import type { Alerte } from '../../domain/regles'
import { IconeAlerte } from '../commun/Icones'

export function Alertes({ alertes }: { alertes: Alerte[] }) {
  if (alertes.length === 0) return null
  return (
    <ul className="alertes" aria-label="Alertes">
      {alertes.map((alerte) => (
        <li key={alerte.cle}>
          <IconeAlerte />
          {alerte.message}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 6 : Écrire la partie « action et choix du joueur » de `src/styles/saisie.css`**

Remplacer le commentaire du fichier par :

```css
/* ---------- Alertes ---------- */
.alertes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.alertes li {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--danger);
  color: #fff;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 700;
}

/* ---------- Blocs d'équipe ---------- */
.blocs-equipes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.bloc-equipe {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
  padding: 14px;
}

/* Liseré aux couleurs de l'équipe, en retrait des angles arrondis. */
.bloc-equipe::before {
  content: '';
  position: absolute;
  top: 0;
  left: 22px;
  right: 22px;
  height: 4px;
  border-radius: 0 0 4px 4px;
  background: var(--equipe-a);
}

.bloc-equipe.equipe-B::before {
  background: var(--equipe-b);
}

.bloc-titre {
  color: var(--texte-2);
  padding: var(--espace-1) var(--espace-1) 0;
}

.grille-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.btn-action {
  border: none;
  border-radius: 16px;
  font-size: clamp(26px, 4vw, 36px);
  font-weight: 800;
  letter-spacing: -0.02em;
  min-height: clamp(96px, 16vh, 136px);
  box-shadow: inset 0 0 0 1px rgb(29 28 26 / 0.06);
  cursor: pointer;
}

.btn-points {
  background: var(--points-tint);
  color: var(--points);
}

.btn-faute {
  background: var(--faute-tint);
  color: var(--faute);
}

.btn-temps-mort {
  background: var(--temps-mort-tint);
  border-color: transparent;
  color: var(--temps-mort);
  min-height: 56px;
  border-radius: 14px;
  box-shadow: none;
}

.derniere-action {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--texte-2);
  font-size: 15px;
  padding: 0 6px;
}

.derniere-action b {
  color: var(--texte);
}

.barre-basse {
  display: grid;
  grid-template-columns: 1fr 1fr 1.4fr 1fr;
  gap: 10px;
}

.barre-basse .btn {
  min-height: 54px;
}

/* ---------- Choix du joueur ---------- */
.bandeau-choix {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--espace-3);
  border-radius: var(--r-carte);
  padding: 14px 22px;
}

.bandeau-choix h2 {
  display: flex;
  align-items: center;
  gap: var(--espace-3);
  font-size: 22px;
  min-width: 0;
  overflow-wrap: anywhere;
}

.bandeau-choix .valeur-action {
  color: #fff;
  border-radius: 10px;
  padding: 4px 12px;
  font-size: 24px;
  flex: none;
}

.bandeau-choix .btn {
  background: rgb(255 255 255 / 0.7);
  border-color: transparent;
  flex: none;
}

.choix-panier {
  background: var(--points-tint);
  color: var(--points);
  border: 1px solid rgb(31 107 63 / 0.15);
}

.choix-panier .valeur-action {
  background: var(--points);
}

.choix-panier .btn {
  color: var(--points);
}

.choix-faute {
  background: var(--faute-tint);
  color: var(--faute);
  border: 1px solid rgb(154 61 46 / 0.15);
}

.choix-faute .valeur-action {
  background: var(--faute);
}

.choix-faute .btn {
  color: var(--faute);
}

.grille-joueurs {
  display: grid;
  gap: var(--espace-3);
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
}

.tuile {
  background: var(--surface);
  border: 1px solid var(--bordure);
  border-radius: var(--r-tuile);
  box-shadow: var(--ombre);
  padding: 18px 10px 14px;
  min-height: 130px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espace-2);
  cursor: pointer;
}

.tuile-numero {
  font-size: 48px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.tuile-coach .tuile-numero {
  font-size: 24px;
  margin-top: var(--espace-3);
}

.tuile-points {
  color: var(--texte-2);
  font-size: 14px;
  font-weight: 600;
}

.tuile.niveau-attention {
  box-shadow: 0 0 0 3px var(--attention-tint), 0 0 0 4px var(--attention);
}

.tuile.niveau-exclu {
  opacity: 0.4;
}

/* ---------- Match terminé ---------- */
.match-termine {
  max-width: 520px;
  margin: 10vh auto 0;
  text-align: center;
  align-items: stretch;
  padding: 28px 24px;
}

.score-final {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

/* ---------- Téléphone ---------- */
@media (max-width: 600px) {
  .blocs-equipes {
    grid-template-columns: 1fr;
  }

  .barre-basse {
    grid-template-columns: 1fr 1fr;
  }

  .grille-joueurs {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  }
}

@media (max-height: 700px) and (orientation: landscape) {
  .btn-action {
    min-height: clamp(72px, 14vh, 136px);
  }
}
```

Dans `src/styles/ecrans-transitoires.css`, supprimer les blocs `/* Saisie des actions */` (de `.blocs-equipes` à `.alertes li`), `/* Choix du joueur */` (de `.bandeau-choix` à `.tuile.niveau-exclu`) et `/* Fin de match */`. Le bloc `/* Bandeau */` reste (Task 7).

Dans `src/ui/saisie/MatchTermine.tsx`, ajouter la classe `carte` : `<section className="ecran match-termine carte">`.

- [ ] **Step 7 : Lancer tous les tests**

```bash
npm run test:run && npm run typecheck && npm run lint
```

Attendu : PASS (y compris `App.test.tsx`, qui clique « Accueil » : le nom accessible reste « Accueil »).

- [ ] **Step 8 : Captures et contrôle visuel**

```bash
CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone
```

Vérifier `04-saisie-102-2-penalite.png` : blocs blancs avec liseré rouge et bleu, boutons +1 +2 +3 vert pastel, F terre cuite, « Temps mort » lavande avec chrono, barre basse avec « Fin de période » orange ; `05-choix-joueur.png` : bandeau vert pastel avec puce `+2` pleine, tuiles blanches, n°4 avec halo ambre (4 fautes) ; sur téléphone, blocs empilés et barre basse sur deux lignes.

- [ ] **Step 9 : Commit**

```bash
git add src/ui/saisie/EcranAction.tsx src/ui/saisie/ChoixJoueur.tsx src/ui/saisie/Alertes.tsx src/ui/saisie/Bandeau.tsx src/ui/saisie/MatchTermine.tsx src/ui/saisie/EcranMatch.test.tsx src/styles/saisie.css src/styles/ecrans-transitoires.css e2e/match.spec.ts
git commit -m "feat(saisie): Habillage clair de l'écran d'action et du choix du joueur"
```

---

### Task 7 : Bandeau — voyant de fautes, pastilles et flèche de possession

**Files:**
- Modify: `src/ui/saisie/Bandeau.tsx`
- Create: `src/ui/saisie/Bandeau.test.tsx`
- Modify: `src/ui/saisie/EcranMatch.tsx:69-80`
- Modify: `src/ui/saisie/EcranMatch.test.tsx` (nouveau `describe`)
- Modify: `src/styles/saisie.css`, `src/styles/ecrans-transitoires.css`
- Modify: `e2e/match.spec.ts`

**Interfaces:**
- Consumes : `definirPossession` (Task 2), `niveauFautesEquipe` à 4 niveaux (Task 1), `IconeTriangleGauche/Droite` (Task 4), prop `onPossession` déjà transmise par `EcranAction` (Task 6).
- Produces : `Bandeau({ match, etat, onPossession? })`. Groupe `role="group" aria-label="Flèche de possession"` avec deux boutons `aria-label="Possession <nom>"`, `aria-pressed`, rendu **seulement** si `onPossession` est fourni. Voyant `aria-label="Fautes d'équipe <nom>"` portant la classe `niveau-<niveau>` et le texte `Fautes éq. n/8` (+ ` · 2 LF` en pénalité). Pastille `aria-label="Temps morts <nom>"` au texte `TM n`.

- [ ] **Step 1 : Écrire `src/ui/saisie/Bandeau.test.tsx` (il doit échouer)**

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { definirPossession } from '../../domain/commandes'
import { calculerEtat } from '../../domain/etat'
import type { Match } from '../../domain/types'
import { faute, matchDeTest } from '../../test/fixtures'
import { Bandeau } from './Bandeau'

const fautesA = (n: number) => Array.from({ length: n }, (_, i) => faute('A', ['a4', 'a7', 'a9', 'a11'][i % 4]))

function afficher(match: Match, onPossession?: (equipe: 'A' | 'B') => void) {
  render(<Bandeau match={match} etat={calculerEtat(match)} onPossession={onPossession} />)
}

const voyantA = () => screen.getByLabelText("Fautes d'équipe ST DELPHIN")

describe('Bandeau — voyant de fautes d’équipe', () => {
  it('neutre sous 7', () => {
    afficher(matchDeTest(...fautesA(6)))
    expect(voyantA()).toHaveClass('niveau-normal')
    expect(voyantA()).toHaveTextContent('Fautes éq. 6/8')
    expect(voyantA()).not.toHaveTextContent('2 LF')
  })

  it('attention à 7, limite à 8', () => {
    afficher(matchDeTest(...fautesA(7)))
    expect(voyantA()).toHaveClass('niveau-attention')
  })

  it('pénalité avec « 2 LF » dès 9', () => {
    afficher(matchDeTest(...fautesA(9)))
    expect(voyantA()).toHaveClass('niveau-penalite')
    expect(voyantA()).toHaveTextContent('Fautes éq. 9/8 · 2 LF')
  })
})

describe('Bandeau — flèche de possession', () => {
  const cote = (nom: string) => screen.getByRole('button', { name: `Possession ${nom}` })

  it('n’est pas rendue sans onPossession', () => {
    afficher(matchDeTest())
    expect(screen.queryByRole('group', { name: 'Flèche de possession' })).not.toBeInTheDocument()
  })

  it('montre les deux côtés non pressés quand elle n’est pas définie', () => {
    afficher(matchDeTest(), vi.fn())
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
    expect(cote('GRADIGNAN')).toHaveAttribute('aria-pressed', 'false')
  })

  it('presse le côté actif', () => {
    afficher(definirPossession(matchDeTest(), 'B'), vi.fn())
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
    expect(cote('GRADIGNAN')).toHaveAttribute('aria-pressed', 'true')
  })

  it('accepte un match enregistré sans champ possession', () => {
    const ancien: Match = { ...matchDeTest() }
    delete ancien.possession
    afficher(ancien, vi.fn())
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
  })

  it('appelle onPossession avec le côté tapé, sauf s’il est déjà actif', () => {
    const onPossession = vi.fn()
    afficher(definirPossession(matchDeTest(), 'A'), onPossession)
    cote('GRADIGNAN').click()
    expect(onPossession).toHaveBeenCalledWith('B')
    cote('ST DELPHIN').click()
    expect(onPossession).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2 : Ajouter les tests d'intégration dans `src/ui/saisie/EcranMatch.test.tsx`**

Ajouter `definirPossession` à l'import depuis `'../../domain/commandes'` (créer l'import), puis, avant le `describe('garde anti-double-tap', …)` :

```tsx
describe('EcranMatch — flèche de possession', () => {
  const cote = (nom: string) => screen.getByRole('button', { name: `Possession ${nom}` })

  it('se règle d’un tap et se retrouve dans le match enregistré', async () => {
    const { user, id } = await afficher()
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
    expect(cote('GRADIGNAN')).toHaveAttribute('aria-pressed', 'false')
    await user.click(cote('GRADIGNAN'))
    await waitFor(() => expect(cote('GRADIGNAN')).toHaveAttribute('aria-pressed', 'true'))
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'false')
    const match = await lireMatch(id)
    expect(match?.possession).toBe('B')
    expect(match?.evenements).toHaveLength(0)
  })

  it('n’est pas touchée par « Annuler la dernière action »', async () => {
    const { user, id } = await afficher(panier('A', 'a7', 2))
    await user.click(cote('ST DELPHIN'))
    await waitFor(() => expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'true'))
    await user.click(screen.getByRole('button', { name: 'Annuler la dernière action' }))
    await attendreScore('0 – 0')
    expect(cote('ST DELPHIN')).toHaveAttribute('aria-pressed', 'true')
    expect((await lireMatch(id))?.possession).toBe('A')
  })

  it('un tap sur le côté déjà actif n’écrit rien', async () => {
    const match = await enregistrerMatch(definirPossession(matchDeTest(), 'A'))
    const user = userEvent.setup()
    render(<EcranMatch matchId={match.id} onAccueil={vi.fn()} />)
    await screen.findByLabelText('Score')
    const ecriture = vi.spyOn(db.matchs, 'put')
    await user.click(cote('ST DELPHIN'))
    expect(ecriture).not.toHaveBeenCalled()
  })
})
```

Et dans le `describe('garde anti-double-tap', …)` existant, ajouter :

```tsx
  it('un tap sur la flèche de possession pendant la garde est ignoré', async () => {
    const { user, id } = await afficher()
    await user.click(actions('ST DELPHIN').getByRole('button', { name: 'Temps mort' }))
    await user.click(screen.getByRole('button', { name: 'Possession GRADIGNAN' }))
    await synchroniser(user)
    expect(screen.getByRole('button', { name: 'Possession GRADIGNAN' })).toHaveAttribute('aria-pressed', 'false')
    expect((await lireMatch(id))?.possession).toBeNull()
  })
```

- [ ] **Step 3 : Lancer les tests, vérifier l'échec**

```bash
npx vitest run src/ui/saisie
```

Attendu : FAIL (boutons « Possession … » introuvables, classes `niveau-*` absentes sur le voyant).

- [ ] **Step 4 : Réécrire `src/ui/saisie/Bandeau.tsx`**

```tsx
import { REGLES } from '../../domain/config'
import { fautesEquipeEnCours, tempsMortsEnCours, type EtatMatch } from '../../domain/etat'
import { libellePeriode } from '../../domain/periodes'
import { niveauFautesEquipe } from '../../domain/regles'
import type { EquipeId, Match } from '../../domain/types'
import { IconeTriangleDroite, IconeTriangleGauche } from '../commun/Icones'

interface Props {
  match: Match
  etat: EtatMatch
  /** Absent = bandeau en lecture seule, sans flèche de possession. */
  onPossession?: (equipe: EquipeId) => void
}

export function Bandeau({ match, etat, onPossession }: Props) {
  const blocEquipe = (equipe: EquipeId) => {
    const nom = match.equipes[equipe].nom
    const fautes = fautesEquipeEnCours(etat, equipe)
    const niveau = niveauFautesEquipe(fautes)
    return (
      <div className={`bandeau-equipe equipe-${equipe}`}>
        <strong className="bandeau-nom">
          <i className="couleur-equipe" aria-hidden="true" />
          {nom}
        </strong>
        <div className="compteurs">
          <span className={`fautes-equipe fautes-bloc niveau-${niveau}`} aria-label={`Fautes d'équipe ${nom}`}>
            <span className="libelle">Fautes éq.</span>{' '}
            <span className="valeur">
              {fautes}/{REGLES.seuilFautesEquipe}
              {niveau === 'penalite' && <small> · 2 LF</small>}
            </span>
          </span>
          <span className="pastille" aria-label={`Temps morts ${nom}`}>
            <span className="libelle">TM</span> <b>{tempsMortsEnCours(etat, equipe)}</b>
          </span>
        </div>
      </div>
    )
  }

  const cotePossession = (equipe: EquipeId) => {
    const actif = (match.possession ?? null) === equipe
    const nom = match.equipes[equipe].nom
    return (
      <button
        type="button"
        className={`possession-cote equipe-${equipe}`}
        aria-pressed={actif}
        aria-label={`Possession ${nom}`}
        onClick={() => {
          if (!actif) onPossession?.(equipe)
        }}
      >
        {equipe === 'A' && <IconeTriangleGauche />}
        {nom}
        {equipe === 'B' && <IconeTriangleDroite />}
      </button>
    )
  }

  return (
    <header className="bandeau carte">
      {blocEquipe('A')}
      <div className="bandeau-score">
        <span className="score" aria-label="Score">
          {etat.equipes.A.score} – {etat.equipes.B.score}
        </span>
        <span className="periode">{libellePeriode(etat.periode)}</span>
        {onPossession && (
          <div className="possession" role="group" aria-label="Flèche de possession">
            {cotePossession('A')}
            <span className="possession-libelle" aria-hidden="true">
              Possession
            </span>
            {cotePossession('B')}
          </div>
        )}
      </div>
      {blocEquipe('B')}
    </header>
  )
}
```

Retirer le `void onPossession` provisoire de la Task 6.

- [ ] **Step 5 : Brancher dans `src/ui/saisie/EcranMatch.tsx`**

Ajouter `definirPossession` à l'import depuis `'../../domain/commandes'`, puis dans le rendu de `<EcranAction … />`, après `onAccueil={onAccueil}` :

```tsx
          onPossession={garder((equipe: EquipeId) => void appliquer((m) => definirPossession(m, equipe)))}
```

- [ ] **Step 6 : Écrire la partie « bandeau » de `src/styles/saisie.css`**

Ajouter **en tête** du fichier (avant `/* ---------- Alertes ---------- */`) :

```css
/* ---------- Bandeau de score ---------- */
.bandeau {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: var(--espace-4);
  padding: 14px 22px;
}

.bandeau-equipe {
  display: flex;
  flex-direction: column;
  gap: var(--espace-2);
  min-width: 0;
}

.bandeau-equipe.equipe-B {
  align-items: flex-end;
  text-align: right;
}

.bandeau-nom {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.bandeau-equipe.equipe-B .bandeau-nom {
  flex-direction: row-reverse;
}

.compteurs {
  display: flex;
  gap: 10px;
  align-items: stretch;
}

/* Le voyant de fautes reste côté extérieur pour les deux équipes. */
.bandeau-equipe.equipe-B .compteurs {
  flex-direction: row-reverse;
}

.bandeau-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--espace-2);
  text-align: center;
}

.score {
  font-size: clamp(40px, 6vw, 60px);
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.periode {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--accent-tint);
  color: var(--accent-texte);
  font-weight: 700;
  font-size: 13px;
}

/* ---------- Flèche de possession ---------- */
.possession {
  display: inline-flex;
  align-items: stretch;
  border: 1px solid var(--bordure);
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface);
}

.possession-cote {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  min-height: 36px;
  border: none;
  background: transparent;
  color: var(--texte-2);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  max-width: 180px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.possession-cote .icone {
  width: 14px;
  height: 14px;
}

.possession-cote.equipe-A[aria-pressed='true'] {
  background: var(--equipe-a-tint);
  color: var(--equipe-a);
}

.possession-cote.equipe-B[aria-pressed='true'] {
  background: var(--equipe-b-tint);
  color: var(--equipe-b);
}

.possession-libelle {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--espace-2);
  color: var(--texte-2);
  font-size: 12px;
  font-weight: 700;
}
```

Et dans le bloc `@media (max-width: 600px)` du même fichier, ajouter :

```css
  .bandeau {
    grid-template-columns: 1fr 1fr;
    gap: var(--espace-3);
    padding: 14px;
  }

  .bandeau-score {
    grid-column: 1 / -1;
    order: -1;
  }

  .bandeau-nom {
    font-size: 16px;
  }

  .fautes-bloc {
    min-width: 80px;
  }
```

Dans `src/styles/ecrans-transitoires.css`, supprimer le bloc `/* Bandeau */` (de `.bandeau` à `.fautes-equipe.niveau-penalite`).

- [ ] **Step 7 : Mettre à jour `e2e/match.spec.ts`**

Après la ligne `await marquer(page, 'GRADIGNAN', '+2', 5)` et avant `await page.reload()`, insérer :

```ts
  const possessionB = page.getByRole('button', { name: 'Possession GRADIGNAN' })
  await possessionB.click()
  await expect(possessionB).toHaveAttribute('aria-pressed', 'true')
  await attendreGarde(page)
```

Et après `await expect(score).toHaveText('2 – 2')` qui suit le `reload`, ajouter :

```ts
  await expect(possessionB).toHaveAttribute('aria-pressed', 'true')
```

- [ ] **Step 8 : Lancer tous les tests**

```bash
npm run test:run && npm run typecheck && npm run lint
```

Attendu : PASS, y compris `alerte à 8 fautes d'équipe et colore le compteur` (classe `niveau-limite`), `affiche les fautes d'équipe de la période` (`Fautes éq. 2/8`) et `compte un temps mort` (`TM 1`).

- [ ] **Step 9 : Captures et contrôle visuel**

```bash
CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone
```

`04-saisie-102-2-penalite.png` (tablette) : score `102 – 2` sur une ligne ; voyant de l'équipe B rouge plein « 9/8 · 2 LF » avec halo ; voyant A neutre « 4/8 » ; pastilles TM ; flèche de possession neutre sous le badge de période. Téléphone : score et période en haut, les deux blocs côte à côte dessous, nom long coupé sur deux lignes sans déborder, flèche tronquée proprement (points de suspension) si le nom est trop long.

- [ ] **Step 10 : Lancer les tests bout en bout du match**

```bash
npx playwright test e2e/match.spec.ts
```

Attendu : PASS sur les trois projets.

- [ ] **Step 11 : Commit**

```bash
git add src/ui/saisie/Bandeau.tsx src/ui/saisie/Bandeau.test.tsx src/ui/saisie/EcranMatch.tsx src/ui/saisie/EcranMatch.test.tsx src/styles/saisie.css src/styles/ecrans-transitoires.css e2e/match.spec.ts
git commit -m "feat(saisie): Voyant de fautes d'équipe et flèche de possession dans le bandeau"
```

---

### Task 8 : Préparation du match

**Files:**
- Modify: `src/ui/preparation/PreparationMatch.tsx:54-63`
- Modify: `src/ui/preparation/EditeurEquipe.tsx:50-84, 151-160`
- Modify: `src/styles/preparation.css`, `src/styles/ecrans-transitoires.css`

**Interfaces:**
- Consumes : `IconePersonnes, IconeQr, IconeTelecharger, IconeCroix` (Task 4).
- Produces : aucun changement de nom accessible (`Équipe A`, `Nom de l'équipe`, `N° joueur n`, `Retirer joueur n`, `Ajouter un joueur`, `Commencer le match` inchangés).

- [ ] **Step 1 : Lancer les tests de préparation pour disposer d'un point de référence**

```bash
npx vitest run src/ui/preparation src/App.test.tsx
```

Attendu : PASS.

- [ ] **Step 2 : Retoucher `src/ui/preparation/PreparationMatch.tsx`**

Remplacer `<div className="infos-match">` par `<div className="infos-match carte">`. Le bouton « Commencer le match » reste `btn btn-principal` (le CSS lui donne sa hauteur).

- [ ] **Step 3 : Retoucher `src/ui/preparation/EditeurEquipe.tsx`**

Ajouter l'import :

```tsx
import { IconeCroix, IconePersonnes, IconeQr, IconeTelecharger } from '../commun/Icones'
```

Remplacer `<fieldset className="editeur-equipe">` par `<fieldset className="editeur-equipe carte">`.

Remplacer les trois boutons de `.actions-equipe` par :

```tsx
      <div className="actions-equipe">
        <button type="button" className="btn btn-discret" disabled={!valeur.clubId} onClick={() => setSelection(true)}>
          <IconePersonnes />
          Choisir les joueurs du club
        </button>
        <button type="button" className="btn btn-discret" disabled={!peutPartager} onClick={() => setPartage(true)}>
          <IconeQr />
          Partager cette équipe
        </button>
        <button type="button" className="btn btn-discret" onClick={() => setImportation(true)}>
          <IconeTelecharger />
          Importer une équipe (QR / code)
        </button>
      </div>
```

Remplacer le contenu `✕` du bouton « Retirer » par `<IconeCroix />` (l'`aria-label` reste).

- [ ] **Step 4 : Écrire `src/styles/preparation.css`**

```css
.infos-match,
.equipes-preparation {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.infos-match {
  padding: var(--espace-4) 20px;
}

.preparation > .btn-principal {
  min-height: 56px;
  font-size: 17px;
}

/* ---------- Éditeur d'équipe ---------- */
.editeur-equipe {
  margin: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
  padding: var(--espace-4) 20px 20px;
}

.editeur-equipe legend {
  float: left;
  width: 100%;
  margin-bottom: var(--espace-2);
  font-size: 18px;
  font-weight: 800;
  padding: 0;
}

.editeur-equipe legend + * {
  clear: both;
}

.actions-equipe {
  display: flex;
  flex-wrap: wrap;
  gap: var(--espace-2);
}

.actions-equipe .btn-discret {
  padding-left: 10px;
  padding-right: 12px;
}

.table-joueurs {
  width: 100%;
  border-collapse: collapse;
}

.table-joueurs th {
  text-align: left;
  color: var(--texte-2);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0 4px 6px;
}

.table-joueurs td {
  padding: 3px 2px;
  border-top: 1px solid var(--bordure);
}

.table-joueurs input,
.table-joueurs select {
  width: 100%;
  border-color: transparent;
  background: transparent;
}

.table-joueurs input:focus-visible,
.table-joueurs select:focus-visible {
  background: var(--surface);
  border-color: var(--bordure);
}

.table-joueurs .champ-numero {
  width: 4.5em;
}

/* ---------- Dialogue de sélection ---------- */
.liste-selection {
  max-height: 50dvh;
  overflow-y: auto;
  gap: 4px;
}

.case {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  color: var(--texte);
  font-weight: 500;
  min-height: 44px;
  padding: 0 var(--espace-2);
  border-radius: 10px;
}

.case input {
  width: 22px;
  height: 22px;
  min-height: 0;
  accent-color: var(--accent);
}

@media (max-width: 600px) {
  .table-joueurs {
    display: block;
    overflow-x: auto;
  }
}
```

Dans `src/styles/ecrans-transitoires.css`, supprimer le bloc `/* Préparation */` (de `.infos-match` à `.table-joueurs .champ-numero`), le bloc `.actions-equipe { … }`, ce qui reste de `.liste-selection`, et les blocs `.case` et `.case input`.

- [ ] **Step 5 : Lancer tous les tests**

```bash
npm run test:run && npm run typecheck && npm run lint
```

Attendu : PASS (`remplirEquipe` et les tests de préparation ciblent les labels, inchangés).

- [ ] **Step 6 : Captures et contrôle visuel**

```bash
CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone
```

`02-preparation.png` : carte « Date / Lieu », deux cartes d'équipe avec titre en gras, trois actions discrètes avec icône, tableau à filets fins et champs sans bordure. Téléphone : cartes empilées, tableau défilable horizontalement.

- [ ] **Step 7 : Commit**

```bash
git add src/ui/preparation/PreparationMatch.tsx src/ui/preparation/EditeurEquipe.tsx src/styles/preparation.css src/styles/ecrans-transitoires.css
git commit -m "feat(preparation): Habillage clair du formulaire et de l'éditeur d'équipe"
```

---

### Task 9 : Journal et gestion des joueurs

**Files:**
- Modify: `src/ui/journal/Journal.tsx:37-43, 49-52`
- Modify: `src/ui/journal/Journal.test.tsx:65-75`
- Modify: `src/ui/journal/GestionJoueurs.tsx:25-26`
- Modify: `src/styles/journal.css`, `src/styles/ecrans-transitoires.css`

**Interfaces:**
- Consumes : `IconeRetour` (Task 4).
- Produces : bouton « Annuler la dernière action » (sans ↶) ; titres des cartes de gestion avec le carré de couleur.

- [ ] **Step 1 : Mettre à jour le test (il doit échouer)**

Dans `src/ui/journal/Journal.test.tsx`, remplacer `'↶ Annuler la dernière action'` par `'Annuler la dernière action'` (lignes 65, 69, 75).

```bash
npx vitest run src/ui/journal
```

Attendu : FAIL (bouton introuvable).

- [ ] **Step 2 : Retoucher `src/ui/journal/Journal.tsx`**

Ajouter `import { IconeRetour } from '../commun/Icones'` et remplacer le bouton d'annulation par :

```tsx
      <button
        className="btn"
        disabled={match.evenements.length === 0}
        onClick={garder(() => void appliquer(annulerDernier))}
      >
        <IconeRetour />
        Annuler la dernière action
      </button>
```

Remplacer les deux `span` de période et de score par :

```tsx
              <span className="journal-periode puce">{libellePeriode(periode)}</span>
              <span className="journal-score numerique">
                {scoreA}–{scoreB}
              </span>
```

- [ ] **Step 3 : Retoucher `src/ui/journal/GestionJoueurs.tsx`**

Remplacer :

```tsx
          <section key={equipe} aria-label={`Joueurs ${nom}`}>
            <h2>{nom}</h2>
```

par :

```tsx
          <section key={equipe} className={`carte equipe-${equipe}`} aria-label={`Joueurs ${nom}`}>
            <h2 className="titre-carte">
              <i className="couleur-equipe" aria-hidden="true" />
              {nom}
            </h2>
```

- [ ] **Step 4 : Écrire `src/styles/journal.css`**

```css
.journal-periode {
  color: var(--texte-2);
  font-weight: 600;
  font-size: 13px;
}

.journal-score {
  color: var(--texte-2);
  min-width: 3.5em;
  font-weight: 700;
}

.journal-actions {
  margin-left: auto;
  display: flex;
  gap: 6px;
}

.gestion-joueurs {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.gestion-joueurs .carte {
  display: flex;
  flex-direction: column;
  gap: var(--espace-3);
}

.gestion-joueurs .liste-joueurs li {
  justify-content: space-between;
}
```

Dans `src/styles/ecrans-transitoires.css`, supprimer le bloc `/* Journal */` restant (`.journal-periode`, `.journal-score`, `.journal-actions`, `.gestion-joueurs`).

- [ ] **Step 5 : Lancer tous les tests**

```bash
npm run test:run && npm run typecheck && npm run lint
```

Attendu : PASS.

- [ ] **Step 6 : Captures et contrôle visuel**

```bash
CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette
```

`06-journal.png` : lignes en cartes basses, période en puce, deux cartes d'équipe en bas avec carré de couleur.

- [ ] **Step 7 : Commit**

```bash
git add src/ui/journal/Journal.tsx src/ui/journal/Journal.test.tsx src/ui/journal/GestionJoueurs.tsx src/styles/journal.css src/styles/ecrans-transitoires.css
git commit -m "feat(journal): Habillage clair du journal et de la gestion des joueurs"
```

---

### Task 10 : Clubs, licenciés, import, partage, équipe reçue — et fin du fichier transitoire

**Files:**
- Modify: `src/ui/clubs/EcranClubs.tsx:27-35`
- Modify: `src/ui/import/ApercuEquipe.tsx:10`
- Modify: `src/styles/clubs.css`
- Delete: `src/styles/ecrans-transitoires.css` ; Modify: `src/styles/index.css`

**Interfaces:**
- Consumes : `IconeChevron` (Task 4).
- Produces : liste des clubs en cartes cliquables ; aucun nom accessible modifié (le bouton d'un club garde pour nom « <club> <n> licenciés »).

- [ ] **Step 1 : Lancer les tests des clubs pour référence**

```bash
npx vitest run src/ui/clubs src/ui/import src/ui/partage
```

Attendu : PASS.

- [ ] **Step 2 : Retoucher `src/ui/clubs/EcranClubs.tsx`**

Ajouter `import { IconeChevron } from '../commun/Icones'` et remplacer la liste par :

```tsx
      <ul className="liste-clubs">
        {clubs?.map(({ club, effectif }) => (
          <li key={club.id}>
            <button className="btn btn-club" onClick={() => setClubOuvert(club.id)}>
              <span className="nom-club">{club.nom}</span>
              <small className="puce">{pluriel(effectif, 'licencié')}</small>
              <IconeChevron />
            </button>
          </li>
        ))}
      </ul>
```

`src/ui/clubs/EcranClubs.test.tsx` cible le bouton d'un club par `name: /ST DELPHIN.*0 licencié/` : le nom accessible reste « ST DELPHIN 0 licencié » (le chevron est masqué), rien à changer.

- [ ] **Step 3 : Retoucher `src/ui/import/ApercuEquipe.tsx`**

Remplacer `<div className="apercu-equipe">` par `<div className="apercu-equipe carte">`.

- [ ] **Step 4 : Écrire `src/styles/clubs.css`**

```css
/* ---------- Liste des clubs ---------- */
.liste-clubs .btn-club {
  width: 100%;
  justify-content: flex-start;
  text-align: left;
  padding: 14px 16px;
  min-height: 60px;
}

.btn-club .nom-club {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
}

.btn-club .icone {
  color: var(--texte-2);
}

/* ---------- Équipe reçue / aperçu ---------- */
.apercu-equipe {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-lien {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--surface-2);
}

/* ---------- QR et caméra ---------- */
.qr {
  display: grid;
  place-items: center;
}

.qr svg {
  width: min(80vw, 340px);
  height: auto;
  background: #fff;
  border: 1px solid var(--bordure);
  border-radius: 12px;
  padding: 8px;
}

.video-scanner {
  width: 100%;
  max-height: 50dvh;
  background: var(--texte);
  border-radius: 12px;
}
```

- [ ] **Step 5 : Vider et supprimer le fichier transitoire**

Ouvrir `src/styles/ecrans-transitoires.css` : il ne doit plus rester que `.liste-clubs .btn { … }`, `.qr`, `.qr svg`, `.video-scanner`, éventuellement `.sous-titre` et des commentaires. Tout est couvert par les nouveaux fichiers. Vérifier qu'aucun sélecteur restant n'est absent des nouveaux fichiers :

```bash
grep -oE '^\.[a-zA-Z0-9_-]+' src/styles/ecrans-transitoires.css | sort -u
```

Pour chaque classe listée, `grep -rn "<classe>" src/styles/*.css src/ui` doit la trouver dans un nouveau fichier CSS ou montrer qu'aucun composant ne l'utilise plus. Puis :

```bash
git rm src/styles/ecrans-transitoires.css
```

et retirer la ligne `@import './ecrans-transitoires.css';` de `src/styles/index.css`.

- [ ] **Step 6 : Lancer tous les tests et le build**

```bash
npm run test:run && npm run typecheck && npm run lint && npm run build
```

Attendu : PASS.

- [ ] **Step 7 : Captures et contrôle visuel**

```bash
CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone
```

`09-clubs.png` : message « Aucun club pour l'instant… », boutons « Nouveau club » et « Importer un export Webaffiligue ». Pour voir une liste remplie et les dialogues, lancer `npm run dev`, importer `Sortie_simple_Ufolep.csv` depuis l'écran Clubs, ouvrir la fiche et les dialogues « Modifier le club », « Ajouter un licencié », « Partager cette équipe » (depuis Préparation) : cartes blanches, dialogue avec fondu et zoom, QR sur fond blanc bordé.

- [ ] **Step 8 : Commit**

```bash
git add src/ui/clubs/EcranClubs.tsx src/ui/import/ApercuEquipe.tsx src/styles/clubs.css src/styles/index.css src/styles/ecrans-transitoires.css
git commit -m "feat(clubs): Habillage clair des clubs, du partage et de l'import, fin du CSS transitoire"
```

---

### Task 11 : Finitions — couleur de thème, relecture, bout en bout complet

**Files:**
- Modify: `index.html:6`
- Modify: `vite.config.ts:23-24`
- Review: `src/styles/*.css`

- [ ] **Step 1 : Couleur de thème**

`index.html` : `<meta name="theme-color" content="#f5f4f0" />`.
`vite.config.ts` : `background_color: '#f5f4f0'` et `theme_color: '#f5f4f0'`.

- [ ] **Step 2 : Relecture des largeurs (Review Focus 5)**

```bash
grep -nE '[0-9.]+(ch|em)\b' src/styles/*.css
```

Attendu : seulement `.table-joueurs .champ-numero { width: 4.5em }` (champ à contenu borné, 2 chiffres) et `.journal-score { min-width: 3.5em }` (min-width, pas une largeur fixe). Toute autre largeur fixe en `ch`/`em` sur un élément à contenu variable est à remplacer par `min-width` ou une valeur en px.

- [ ] **Step 3 : Relecture des couleurs littérales**

```bash
grep -nE '#[0-9a-fA-F]{3,8}\b|rgb\(' src/styles/base.css src/styles/composants.css src/styles/accueil.css src/styles/preparation.css src/styles/saisie.css src/styles/journal.css src/styles/clubs.css src/ui --include=*.css --include=*.tsx
```

Attendu : uniquement `#fff` (texte sur fond plein, fond du QR, cercle du logo) et les `rgb(… / alpha)` des halos et voiles. Tout autre littéral est à remplacer par un jeton.

- [ ] **Step 4 : Mouvement réduit**

Dans `src/styles/base.css`, vérifier que chaque `transition` et `animation` est bien à l'intérieur du bloc `@media (prefers-reduced-motion: no-preference)` :

```bash
grep -n -E 'transition|animation:' src/styles/*.css
```

Attendu : toutes les lignes dans `base.css`, entre la ligne `@media (prefers-reduced-motion: no-preference) {` et son accolade fermante.

- [ ] **Step 5 : Suite complète**

```bash
npm run typecheck && npm run lint && npm run test:run && npm run e2e
```

Attendu : tout vert, sur les trois projets Playwright.

- [ ] **Step 6 : Captures finales et comparaison à la maquette**

```bash
CAPTURES=1 npx playwright test e2e/captures.spec.ts --project=tablette --project=telephone
```

Comparer `captures/tablette/08-accueil-match-en-cours.png`, `04-saisie-102-2-penalite.png` et `05-choix-joueur.png` à `nimbalyst-local/mockups/refonte-claire.mockup.html` ouvert dans un navigateur : mêmes proportions, mêmes couleurs, police Manrope. Noter tout écart dans le message de fin de tâche.

- [ ] **Step 7 : Commit**

```bash
git add index.html vite.config.ts
git commit -m "feat(pwa): Couleur de thème claire dans le manifeste et la page"
```

- [ ] **Step 8 : Bilan**

Lister dans le message final : les commits de la branche (`git log --oneline dev..feat/refonte-visuelle`), les écarts éventuels avec la maquette, et rappeler que la branche n'est ni poussée ni fusionnée.

---

## Auto-revue du plan

- **Couverture de la spec** : § 4.1 jetons → Task 3 ; § 4.2 typographie → Tasks 3, 6, 7 ; § 4.3 composants → Tasks 3, 4 ; § 4.4 animations → Task 3 (base.css) ; § 5.1 accueil → Task 5 ; § 5.2 bandeau → Task 7 ; § 5.3 action → Task 6 ; § 5.4 choix du joueur → Task 6 ; § 5.5 préparation → Task 8 ; § 5.6 journal → Task 9 ; § 5.7 clubs et dialogues → Tasks 3, 10 ; § 5.8 match terminé et mise à jour → Tasks 3, 6 ; § 6 possession → Tasks 2, 7 ; § 7 niveaux de fautes → Task 1 ; § 8 structure et manifeste → Tasks 3, 11 ; § 9 responsive → media queries des Tasks 5-8 ; § 11 tests → chaque tâche.
- **Écart assumé avec la spec** : § 5.3 prévoyait le score de « Dernière action » dans une puce ; le plan le fait (Task 6) et adapte le test existant en conséquence.
- **Cohérence des noms** : `definirPossession` (Tasks 2, 7), `onPossession` (Tasks 6, 7), `niveau-penalite` (Tasks 1, 3, 7), `PastillesFautes` (Tasks 4, 6), `.fautes-bloc` (Tasks 3, 7), `.pastille` (Tasks 3, 7, 10), `.puce` (Tasks 3, 6, 9, 10), `.carte` (Tasks 3, 5-10), `.couleur-equipe` (Tasks 3, 7, 9).

# Plan 5 — Mise en ligne sur GitHub Pages : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publier la table de marque à `https://alicework.github.io/table-de-marque/`, republiée automatiquement à chaque push sur `main`, après avoir retiré de tout l'historique les vrais numéros de licence UFOLEP.

**Architecture:** Trois temps. (1) Réécriture de l'historique avec `git filter-repo --replace-text` à partir d'une table de correspondance générée hors du dépôt. (2) Chemin de base de Vite lu dans `BASE_PATH` (défaut `/`) ; Playwright suit la même variable, ce qui permet de jouer toute la suite e2e sous le sous-chemin, plus un nouveau test hors ligne qui vérifie la portée du service worker. (3) Workflow GitHub Actions (lint → typecheck → tests unitaires → build → actions officielles Pages), puis création du dépôt public et premier déploiement.

**Tech Stack:** existant (TypeScript ~6.0, React 19, Vite 8, vite-plugin-pwa 2, Vitest 5, Playwright 1.64, oxlint). Outils ajoutés sur le poste, hors dépendances npm : `git-filter-repo` et `actionlint` (Homebrew). Actions : `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-pages-artifact@v5`, `actions/deploy-pages@v5`.

**Spec:** `docs/superpowers/specs/2026-10-14-mise-en-ligne-design.md` (spec parente : `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`).

**Point de départ :** branche `dev`, arbre propre (seuls les fichiers non versionnés `docs/guide-utilisation.*` sont tolérés). La Task 1 se fait **sur `dev`** (elle réécrit toutes les branches). Les Tasks 2 et 3 se font sur `feat/mise-en-ligne`, créée depuis `dev` réécrite. La Task 4 publie.

## Global Constraints

- Node `^22.22.2 || ^24.15.0 || >=26` (champ `engines`). Sous Node 22.14 en local, npm affiche EBADENGINE : connu et accepté. La CI utilise Node 24.
- Aucune nouvelle dépendance npm. Aucun changement du code applicatif (`src/`) hors de la réécriture des numéros par la Task 1.
- Dépôt : `alicework/table-de-marque`, **public**. Adresse : `https://alicework.github.io/table-de-marque/`. Chemin de base en CI : `/table-de-marque/`.
- `vite.config.ts` : `base: process.env.BASE_PATH ?? '/'`. En local, sans variable, rien ne change.
- Publication déclenchée par `push` sur `main` et par `workflow_dispatch`. Lint, typecheck et tests unitaires bloquent la publication ; les e2e restent locaux.
- Pas de branche `gh-pages` : publication par `upload-pages-artifact` + `deploy-pages`. Concurrence `pages`, sans annulation d'une publication en cours.
- Les vrais numéros de licence ne doivent apparaître **nulle part** dans l'historique poussé. La table de correspondance et le bundle de sauvegarde restent **hors du dépôt** et ne sont jamais commités. Ne jamais recopier un vrai numéro dans un fichier du dépôt, un message de commit ou ce plan.
- Le nom du club et le numéro d'association sont conservés (informations publiques).
- `registerType: 'prompt'` reste inchangé : une nouvelle version est proposée, jamais appliquée d'office.
- Style : guillemets simples, pas de points-virgules, indentation 2 espaces, identifiants et libellés en français ; chaînes contenant une apostrophe en guillemets doubles.
- Commits : Conventional Commits en français, titre en forme nominale, `git add` par chemins explicites (jamais `-A` / `.`), aucun trailer `Co-authored-by`, aucun lien de session. Commiter librement sur `feat/mise-en-ligne`.
- **Création du dépôt GitHub, push et fusion dans `main` : uniquement après accord explicite de l'utilisatrice ou de l'utilisateur, demandé au début de la Task 4.**
- `docs/guide-utilisation.*` ne sont **pas versionnés** : ne jamais les ajouter à un commit.
- Avant chaque commit : `npm run typecheck && npm run lint && npm run test:run` verts.

## Review Focus

1. **Lien d'équipe ouvert à l'adresse publique** (`…/table-de-marque/#equipe=CODE`) : l'écran « Équipe reçue » s'ouvre et l'adresse redevient `…/table-de-marque/`, pas la racine du domaine. → le test e2e existant « un lien d'équipe ouvre l'écran Équipe reçue » est joué sous le sous-chemin dans la Task 2.
2. **Réouverture hors ligne après installation** : le service worker a la portée `/table-de-marque/` (et non `/`, qui engloberait les autres sites Pages du compte) et l'app se recharge sans réseau. → nouveau test `e2e/hors-ligne.spec.ts`, Task 2.
3. **Version cassée poussée sur `main`** : rien n'est publié, la version en ligne reste la précédente. → `publier` dépend de `construire` et les contrôles précèdent le build ; vérifié par lecture du workflow et par `actionlint` dans la Task 3.
4. **Numéro réel resté dans un coin de l'historique** (ancienne version d'un test, d'une fixture, du plan 2) : il serait lisible par tous une fois le dépôt public. → contrôle `git grep` sur `$(git rev-list --all)` dans la Task 1, refait juste avant le push dans la Task 4.
5. **Écart entre le poste (macOS, Europe/Paris) et la CI (Linux, UTC)** : un test qui dépend du fuseau ou d'un binaire natif bloquerait toute publication. → la Task 3 rejoue la séquence CI en local avec `TZ=UTC` et `npm ci` ; le lockfile contient déjà les binaires `linux-x64-gnu` (rolldown, oxlint, lightningcss).

---

## Structure des fichiers

```
vite.config.ts                    base lu dans BASE_PATH                       (Task 2)
playwright.config.ts              baseURL et URL du serveur suivent BASE_PATH  (Task 2)
e2e/match.spec.ts                 goto('/') → goto('./')                       (Task 2)
e2e/licencies-equipes.spec.ts     goto relatifs                                (Task 2)
e2e/captures.spec.ts              goto relatifs                                (Task 2)
e2e/hors-ligne.spec.ts            nouveau : portée du SW + rechargement hors ligne (Task 2)
.github/workflows/deploiement.yml nouveau : contrôle, build, publication       (Task 3)
```

Hors dépôt : `/tmp/licences-reelles.txt`, `/tmp/remplacements-licences.txt` (Task 1), `../table-de-marque-avant-nettoyage.bundle` (sauvegarde, Task 1).

---

### Task 1 : Remplacement des numéros de licence réels dans tout l'historique

**Files:**
- Aucun fichier modifié à la main. `git filter-repo` réécrit, dans tous les commits de toutes les branches : `Sortie_simple_Ufolep.csv`, `src/test/fixturesClubs.ts`, `src/roster-share/qr.test.ts`, `src/storage/clubs.test.ts`, `src/ui/clubs/EcranClubs.test.tsx`, `src/ui/preparation/PreparationMatch.test.tsx`, `src/ui/preparation/brouillon.test.ts`, `src/webaffiligue/lireExport.test.ts`, `docs/superpowers/plans/2026-10-12-plan-2-licencies-equipes.md`, `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`.

**Interfaces:**
- Consumes : rien.
- Produces : branches `dev` et `docs/spec-conception` réécrites (nouveaux hash), sans aucun vrai numéro de licence. Les Tasks suivantes partent de cette `dev`.

**Contexte :** le CSV Webaffiligue (ISO-8859-1, `;`, valeurs `"=""…"""`) contient 22 numéros d'adhérent réels, colonne 6 « N° Adherent » : 17 au format `033_` + 8 chiffres, 5 au format 2 lettres + 8 chiffres. Ce sont les seules chaînes de ce type dans l'historique. Aucun message de commit n'en contient, et aucun code d'équipe encodé (base64url compressé) n'est écrit en dur dans les tests.

- [ ] **Step 1 : Vérifier le point de départ**

Run :
```bash
git switch dev
git status --porcelain --untracked-files=no
```
Expected : branche `dev`, **aucune ligne** (aucune modification de fichier versionné). S'il y en a, s'arrêter et demander.

- [ ] **Step 2 : Installer git-filter-repo**

Run : `brew install git-filter-repo && git filter-repo --version`
Expected : un numéro de version s'affiche.

- [ ] **Step 3 : Sauvegarder le dépôt complet hors du dossier**

Run :
```bash
git bundle create ../table-de-marque-avant-nettoyage.bundle --all
git bundle verify ../table-de-marque-avant-nettoyage.bundle
```
Expected : `The bundle records a complete history.` puis `… is okay`.

- [ ] **Step 4 : Générer la table de correspondance hors du dépôt**

Run :
```bash
iconv -f ISO-8859-1 -t UTF-8 Sortie_simple_Ufolep.csv \
  | awk -F';' 'NR > 1 { gsub(/[="]/, "", $6); if ($6 != "") print $6 }' \
  | LC_ALL=C sort -u > /tmp/licences-reelles.txt
LC_ALL=C awk '/^033_/ { n++; printf "%s==>033_%08d\n", $0, 100 + n; next }
  { m++; printf "%s==>%s%08d\n", $0, substr($0, 1, 2), m }' \
  /tmp/licences-reelles.txt > /tmp/remplacements-licences.txt
wc -l < /tmp/licences-reelles.txt
grep -c '==>033_' /tmp/remplacements-licences.txt
awk -F'==>' 'length($1) != length($2)' /tmp/remplacements-licences.txt | wc -l
```
Expected : `22`, puis `17`, puis `0` (même longueur partout). Le tri `LC_ALL=C` place les `033_` avant les numéros à lettres ; les numéros fictifs croissent dans le même ordre (`033_00000101` à `033_00000117`, puis préfixe d'origine + `00000001` à `00000005`). L'ordre de tri des licences, sur lequel s'appuient certains tests, est donc conservé.

Ne pas afficher le contenu de ces fichiers dans un document ni un commit.

- [ ] **Step 5 : Vérifier que les numéros fictifs n'existent pas déjà**

Run :
```bash
git grep -nE '033_000001[0-9]{2}|[A-Z]{2}0000000[1-5]' $(git rev-list --all) -- . | wc -l
```
Expected : `0`.

- [ ] **Step 6 : Réécrire l'historique**

Run :
```bash
git filter-repo --force --replace-text /tmp/remplacements-licences.txt
```
Expected : `New history written in …` puis `Completely finished after …`. `--force` est nécessaire parce que le dépôt n'est pas un clone frais. Les fichiers non versionnés (`docs/guide-utilisation.*`, `captures/`, le PDF du règlement) ne sont pas touchés.

- [ ] **Step 7 : Contrôler l'absence de tout numéro réel**

Run :
```bash
git grep -c -F -f /tmp/licences-reelles.txt $(git rev-list --all) -- . | wc -l
git log --all --format=%B | grep -c -F -f /tmp/licences-reelles.txt
git branch --list
git log --oneline -3
```
Expected : `0`, puis `0`. Les branches `dev` et `docs/spec-conception` existent toujours. Les trois derniers commits ont les mêmes titres qu'avant (hash différents).

- [ ] **Step 8 : Contrôler que tout passe sur `dev` réécrite**

Run :
```bash
npm run typecheck && npm run lint && npm run test:run && npm run e2e
```
Expected : tout vert (263 tests unitaires ou plus, e2e verts sur les 3 projets). Le port 4173 doit être libre (`lsof -i :4173` vide).

- [ ] **Step 9 : Pas de commit**

La réécriture n'ajoute aucun commit. Ne pas supprimer le bundle : il sert de retour arrière jusqu'à la fin de la Task 4. Il contient les données réelles : ne jamais le pousser.

---

### Task 2 : Build et e2e sous un chemin de base

**Files:**
- Modify : `vite.config.ts` (objet passé à `defineConfig`)
- Modify : `playwright.config.ts`
- Modify : `e2e/match.spec.ts:27`, `e2e/match.spec.ts:81`
- Modify : `e2e/licencies-equipes.spec.ts:29`, `e2e/licencies-equipes.spec.ts:67`
- Modify : `e2e/captures.spec.ts:40`, `e2e/captures.spec.ts:104`
- Create : `e2e/hors-ligne.spec.ts`

**Interfaces:**
- Consumes : `dev` réécrite (Task 1).
- Produces : variable d'environnement `BASE_PATH` (chemin avec barres obliques de début et de fin, ex. `/table-de-marque/` ; absente = `/`), lue par `vite.config.ts` et `playwright.config.ts`. La Task 3 la fournit au build de la CI.

**Contexte :** un `page.goto('/')` vise la racine du serveur quel que soit `baseURL`. `page.goto('./')` se résout par rapport à `baseURL` : avec `http://localhost:4173/table-de-marque/`, il ouvre le sous-chemin ; avec `http://localhost:4173/`, il ouvre la racine comme aujourd'hui. Un build jetable a confirmé que, avec `base: '/table-de-marque/'`, Vite préfixe les icônes de `index.html`, le manifeste et les scripts, et que le service worker s'enregistre en `/table-de-marque/sw.js` avec la portée `/table-de-marque/`.

- [ ] **Step 1 : Créer la branche**

Run : `git switch -c feat/mise-en-ligne dev`

- [ ] **Step 2 : Écrire le test hors ligne**

Créer `e2e/hors-ligne.spec.ts` :

```ts
import { expect, test } from '@playwright/test'

test("l'app se rouvre hors ligne, avec un service worker limité à son chemin", async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { name: 'Table de marque' })).toBeVisible()

  const portee = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(portee).toBe(new URL('./', page.url()).href)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Table de marque' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nouveau match' })).toBeVisible()
})
```

- [ ] **Step 3 : Rendre Playwright et les e2e indépendants du chemin de base**

Dans `playwright.config.ts`, remplacer le contenu par :

```ts
import { defineConfig, devices } from '@playwright/test'

// Même variable que vite.config.ts : `BASE_PATH=/table-de-marque/ npm run e2e` rejoue la suite sous le chemin de publication.
const adresse = `http://localhost:4173${process.env.BASE_PATH ?? '/'}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: adresse,
  },
  projects: [
    { name: 'telephone', use: { ...devices['Pixel 7'] } },
    { name: 'tablette', use: { ...devices['Galaxy Tab S4'] } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: adresse,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

Dans les specs e2e, rendre les navigations relatives :

- `e2e/match.spec.ts:27` et `e2e/match.spec.ts:81` : `await page.goto('/')` → `await page.goto('./')`
- `e2e/licencies-equipes.spec.ts:29` : `await page.goto('/')` → `await page.goto('./')`
- `e2e/licencies-equipes.spec.ts:67` : ``await page.goto(`/#equipe=${CODE_GRADIGNAN}`)`` → ``await page.goto(`./#equipe=${CODE_GRADIGNAN}`)``
- `e2e/captures.spec.ts:40` et `e2e/captures.spec.ts:104` : `await page.goto('/')` → `await page.goto('./')`

`e2e/licencies-equipes.spec.ts:69` (`toHaveURL(/\/$/)`) reste tel quel : l'adresse nettoyée se termine par `/` dans les deux cas.

Contrôle : `grep -n "goto('/\|goto(\`/" e2e/*.ts` ne renvoie rien.

- [ ] **Step 4 : Vérifier que le test échoue sous le sous-chemin**

Run : `lsof -i :4173` (doit être vide), puis :
```bash
BASE_PATH=/table-de-marque/ npx playwright test e2e/hors-ligne.spec.ts --project=ordinateur
```
Expected : FAIL. Comme `vite.config.ts` ignore encore `BASE_PATH`, l'app est construite pour `/` : soit la page ne se charge pas sous `/table-de-marque/`, soit la portée vaut `http://localhost:4173/` au lieu de `http://localhost:4173/table-de-marque/`.

- [ ] **Step 5 : Lire le chemin de base dans vite.config.ts**

Dans `vite.config.ts`, ajouter `base` en tête de l'objet passé à `defineConfig` :

```ts
export default defineConfig({
  // Chemin de publication : `/` en local, `/table-de-marque/` sur GitHub Pages (fourni par la CI).
  base: process.env.BASE_PATH ?? '/',
  plugins: [
```

(`process` est typé : `tsconfig.node.json` déclare `"types": ["node"]` et inclut `vite.config.ts`.)

- [ ] **Step 6 : Vérifier que le test passe sous le sous-chemin**

Run :
```bash
BASE_PATH=/table-de-marque/ npx playwright test e2e/hors-ligne.spec.ts --project=ordinateur
```
Expected : PASS.

- [ ] **Step 7 : Jouer toute la suite e2e dans les deux configurations**

Run :
```bash
BASE_PATH=/table-de-marque/ npm run e2e
npm run e2e
```
Expected : tout vert dans les deux cas, sur les 3 projets. Le premier run couvre le Review Focus 1 (lien `#equipe=` sous le sous-chemin) ; le second confirme que rien ne change en local. Les captures régénérées dans `captures/` sont ignorées par git.

- [ ] **Step 8 : Contrôler le build de publication**

Run :
```bash
BASE_PATH=/table-de-marque/ npm run build
grep -c '/table-de-marque/' dist/index.html
grep -o '"start_url":"[^"]*","display' dist/manifest.webmanifest
ls dist/sw.js
```
Expected : au moins `6` (3 icônes, script, feuille de style, manifeste) ; `"start_url":".","display` ; `dist/sw.js` existe.

- [ ] **Step 9 : Contrôles et commit**

Run : `npm run typecheck && npm run lint && npm run test:run`
Expected : vert.

```bash
git add vite.config.ts playwright.config.ts e2e/match.spec.ts e2e/licencies-equipes.spec.ts e2e/captures.spec.ts e2e/hors-ligne.spec.ts
git commit -m "build(pwa): Chemin de base configurable et e2e jouables sous le chemin de publication"
```

---

### Task 3 : Workflow de publication GitHub Pages

**Files:**
- Create : `.github/workflows/deploiement.yml`

**Interfaces:**
- Consumes : `BASE_PATH` (Task 2) ; scripts npm existants `lint`, `typecheck`, `test:run`, `build`.
- Produces : workflow « Déploiement » (fichier `deploiement.yml`), jobs `construire` puis `publier`, environnement `github-pages`. La Task 4 le déclenche par le push de `main` ou par `gh workflow run deploiement.yml --ref main`.

- [ ] **Step 1 : Écrire le workflow**

Créer `.github/workflows/deploiement.yml` :

```yaml
name: Déploiement

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

# Une seule publication à la fois ; celle en cours va jusqu'au bout.
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  construire:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:run
      - run: npm run build
        env:
          # Adresse de publication : https://<compte>.github.io/<dépôt>/
          BASE_PATH: /${{ github.event.repository.name }}/
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  publier:
    needs: construire
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.publication.outputs.page_url }}
    steps:
      - id: publication
        uses: actions/deploy-pages@v5
```

`BASE_PATH` est dérivé du nom du dépôt (`table-de-marque` → `/table-de-marque/`), donc reste juste si le dépôt est renommé.

- [ ] **Step 2 : Valider la syntaxe**

Run : `brew install actionlint && actionlint .github/workflows/deploiement.yml`
Expected : aucune sortie, code de retour 0.

Relire : `publier` a `needs: construire` ; lint, typecheck et tests précèdent le build ; aucun `continue-on-error` (Review Focus 3).

- [ ] **Step 3 : Rejouer la séquence CI en local, en UTC**

Run :
```bash
rm -rf dist
npm ci
TZ=UTC npm run lint && TZ=UTC npm run typecheck && TZ=UTC npm run test:run
BASE_PATH=/table-de-marque/ npm run build
ls dist/index.html dist/sw.js dist/manifest.webmanifest
```
Expected : `npm ci` sans erreur (avertissement EBADENGINE sous Node 22.14 accepté), lint, typecheck et tests verts, les trois fichiers listés.

- [ ] **Step 4 : Commit**

```bash
git add .github/workflows/deploiement.yml
git commit -m "ci(pages): Publication sur GitHub Pages à chaque push sur main"
```

---

### Task 4 : Création du dépôt public et premier déploiement

**Files:** aucun fichier du dépôt. Effets externes : dépôt GitHub public, branches poussées, Pages activé.

**Interfaces:**
- Consumes : `feat/mise-en-ligne` (Tasks 2 et 3), `dev` et `docs/spec-conception` réécrites (Task 1), workflow `deploiement.yml`.
- Produces : `https://alicework.github.io/table-de-marque/` en ligne ; branche par défaut `main`.

- [ ] **Step 1 : Demander l'accord explicite**

Ces actions publient le code et sont difficiles à défaire. Demander : « Je crée le dépôt public alicework/table-de-marque, je pousse main, dev et docs/spec-conception, et j'active GitHub Pages. On y va ? » Ne rien faire de la suite sans un oui explicite.

- [ ] **Step 2 : Préparer les branches**

Run :
```bash
git switch dev
git merge --ff-only feat/mise-en-ligne
git branch main dev
git status --porcelain --untracked-files=no
```
Expected : avance rapide sans conflit ; aucune ligne au statut.

- [ ] **Step 3 : Refaire le contrôle des numéros réels juste avant publication**

Run :
```bash
git grep -c -F -f /tmp/licences-reelles.txt $(git rev-list --all) -- . | wc -l
git log --all --format=%B | grep -c -F -f /tmp/licences-reelles.txt
```
Expected : `0`, puis `0`. Si `/tmp` a été vidé entre-temps, régénérer `/tmp/licences-reelles.txt` à partir du bundle de sauvegarde (`git clone ../table-de-marque-avant-nettoyage.bundle /tmp/avant` puis Step 4 de la Task 1 dans `/tmp/avant`, première commande seulement). Un résultat non nul bloque la publication.

- [ ] **Step 4 : Créer le dépôt et pousser `main` en premier**

Run :
```bash
gh repo create alicework/table-de-marque --public --source . --remote origin \
  --description "Feuille de match numérique du basket loisir UFOLEP 33"
git push -u origin main
```
Pousser `main` en premier en fait la branche par défaut. Le règlement de l'environnement `github-pages` n'autorise que la branche par défaut à publier.

- [ ] **Step 5 : Activer Pages en mode GitHub Actions**

Run, immédiatement après le push :
```bash
gh api -X POST repos/alicework/table-de-marque/pages -f build_type=workflow
gh api repos/alicework/table-de-marque/pages --jq '.build_type, .html_url, .https_enforced'
```
Expected : `workflow`, `https://alicework.github.io/table-de-marque/`, `true`.

- [ ] **Step 6 : Suivre le premier run**

Run :
```bash
gh run list --workflow deploiement.yml --limit 1
gh run watch "$(gh run list --workflow deploiement.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```
Expected : `construire` puis `publier` réussis. Si `publier` a échoué parce que Pages n'était pas encore activé au moment du run, relancer : `gh workflow run deploiement.yml --ref main`, puis surveiller ce nouveau run de la même façon.

- [ ] **Step 7 : Pousser les autres branches**

Run :
```bash
git push -u origin dev docs/spec-conception
gh repo view alicework/table-de-marque --json defaultBranchRef --jq .defaultBranchRef.name
```
Expected : `main`.

- [ ] **Step 8 : Vérifier l'adresse publique**

Run :
```bash
URL=https://alicework.github.io/table-de-marque/
curl -s -o /dev/null -w '%{http_code}\n' "$URL"
curl -s "$URL" | grep -c '/table-de-marque/'
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "${URL}manifest.webmanifest"
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "${URL}sw.js"
curl -s -o /dev/null -w '%{http_code}\n' "http://alicework.github.io/table-de-marque/"
```
Expected : `200` ; au moins `6` ; `200 application/manifest+json` ; `200 application/javascript` (le type exact peut porter `; charset=utf-8`) ; `301` (redirection vers HTTPS). La propagation peut prendre une à deux minutes après la fin du run.

- [ ] **Step 9 : Remettre la check-list de recette sur appareils**

Rien à exécuter : transmettre cette liste à l'utilisatrice ou l'utilisateur, avec l'adresse publique.

- iPhone (Safari) : ouvrir l'adresse → Partager → « Sur l'écran d'accueil » ; lancer l'app depuis l'icône (plein écran, sans barre Safari).
- Android (Chrome) : ouvrir l'adresse → « Installer l'application » ; lancer depuis l'icône.
- Sur chacun : passer en mode avion, fermer puis rouvrir l'app → l'accueil s'affiche.
- Scan : sur un appareil, partager une équipe (QR) ; sur l'autre, « Importer une équipe » → Scanner → l'équipe est reçue (la caméra est autorisée en HTTPS).
- Lien : envoyer le lien `#equipe=` par message, l'ouvrir sur l'autre appareil → « Équipe reçue ».
- Minuteur : lancer un temps mort → l'écran ne se met pas en veille pendant le décompte, le bip sonne à 0:00.
- Mise à jour : après un prochain push sur `main`, rouvrir l'app → le bandeau de mise à jour apparaît, sans rechargement automatique.

Rappeler aussi que le bundle `../table-de-marque-avant-nettoyage.bundle` contient les numéros réels : à garder hors ligne ou à supprimer une fois la publication validée.

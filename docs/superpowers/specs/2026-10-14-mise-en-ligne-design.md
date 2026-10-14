# Mise en ligne de l'application

**Date :** 2026-10-14
**Statut :** conception validée en conversation
**Spec parente :** `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md` (section 4 : « hébergée en statique gratuit, sans backend »)

## 1. Objectif

Rendre la table de marque accessible aux bénévoles UFOLEP 33 à une adresse HTTPS stable, mise à jour automatiquement.

Le HTTPS est un prérequis fonctionnel, pas un confort : l'installation sur l'écran d'accueil, le service worker (hors ligne), la caméra (scan des QR d'équipe) et `crypto.randomUUID` n'existent qu'en contexte sécurisé. La recette sur appareils réels (spec parente, section 12) attendait cet hébergement.

Critère de réussite : depuis `https://alicework.github.io/table-de-marque/`, un iPhone et un Android installent l'app, la rouvrent en mode avion et scannent le QR d'une équipe ; une fusion dans `main` publie la nouvelle version sans autre geste, et une version qui échoue au lint, au typecheck ou aux tests unitaires n'est jamais publiée.

## 2. Décisions de cadrage

| Sujet | Décision |
|---|---|
| Hébergeur | GitHub Pages, publication par GitHub Actions (actions officielles `upload-pages-artifact` et `deploy-pages`), sans branche `gh-pages` |
| Dépôt | `alicework/table-de-marque`, **public** |
| Adresse | Adresse par défaut : `https://alicework.github.io/table-de-marque/` |
| Déclencheur | Chaque push sur `main` ; déclenchement manuel possible (`workflow_dispatch`) |
| Branches | `main` créée depuis `dev`. Le travail continue sur `dev` ; fusionner dans `main` publie |
| Porte qualité | Lint, typecheck et tests unitaires bloquent la publication. Les e2e Playwright restent locaux |
| Données réelles | Numéros de licence réels remplacés par des numéros fictifs dans tout l'historique avant le premier push |

## 3. Nettoyage des données réelles

### 3.1 Constat

`Sortie_simple_Ufolep.csv` (export Webaffiligue, jeu d'essai des tests) contient de vrais numéros d'adhérent UFOLEP (formats `033_` suivi de 8 chiffres, et `SR` suivi de 8 chiffres), avec la civilité. Les noms et prénoms sont vides. Ces numéros sont recopiés dans des tests, des fixtures (`src/test/fixturesClubs.ts`), le plan 2 et la spec parente, depuis les premiers commits. Aucun message de commit n'en contient.

Le nom du club et le numéro d'association sont des informations publiques : ils sont conservés.

### 3.2 Remplacement

1. Sauvegarde du dépôt complet : `git bundle create ../table-de-marque-avant-nettoyage.bundle --all`.
2. Table de correspondance générée à partir du CSV : chaque numéro réel reçoit un numéro fictif **de même format et de même longueur**, et l'ordre de tri des numéros est conservé (premier numéro réel trié → plus petit numéro fictif). Les assertions de tri, de format et de longueur restent ainsi valables. La table vit hors du dépôt (`/tmp`) et n'est jamais versionnée.
3. `git filter-repo --replace-text <table>` sur toutes les branches (`dev`, `docs/spec-conception`). Les remplacements portent sur des chaînes ASCII : l'encodage ISO-8859-1 du CSV n'est pas affecté.
4. Les hash de tous les commits changent. Sans conséquence : rien n'a encore été poussé.

Les fichiers non versionnés (`docs/guide-utilisation.*`, captures, PDF du règlement) ne sont pas touchés. Le PDF du règlement reste ignoré par `.gitignore`.

### 3.3 Contrôle

- `git grep` de chaque numéro réel sur `$(git rev-list --all)` : aucun résultat.
- Lint, typecheck, tests unitaires et e2e passent sur `dev` réécrite.

## 4. Configuration de build

`vite.config.ts` lit le chemin de base dans l'environnement :

```ts
base: process.env.BASE_PATH ?? '/',
```

- En local (`npm run dev`, `npm run build`, e2e), rien ne change : la base reste `/`.
- La CI construit avec `BASE_PATH=/table-de-marque/`. Vite préfixe alors les ressources et les icônes absolues de `index.html` (`/favicon.ico`, `/icone.svg`, `/apple-touch-icon-180x180.png`) ; le manifeste (`start_url: '.'`, `scope: '.'`) et le service worker se calent sur ce sous-chemin.
- Le code applicatif n'a aucune route absolue ; les liens de partage d'équipe (`adresseApp()` = origine + chemin courant) suivent l'adresse publique sans modification.

Alternatives écartées : `base` codé en dur (toutes les URL des e2e à réécrire) ; `base: './'` (moins fiable pour la portée du service worker).

## 5. Dépôt et publication

### 5.1 Mise en place (une fois)

1. `git branch main dev`.
2. `gh repo create alicework/table-de-marque --public --source . --remote origin`.
3. Push de `main`, `dev` et `docs/spec-conception`.
4. Activation de Pages en mode « GitHub Actions » : `gh api -X POST repos/alicework/table-de-marque/pages -f build_type=workflow`.

### 5.2 Workflow `.github/workflows/deploiement.yml`

- Déclencheurs : `push` sur `main`, `workflow_dispatch`.
- Permissions : `contents: read`, `pages: write`, `id-token: write`.
- Concurrence : groupe `pages`, sans annulation d'une publication en cours.
- Job `construire` (ubuntu, Node 24 avec cache npm) : `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test:run` → `npm run build` avec `BASE_PATH=/table-de-marque/` → `upload-pages-artifact` sur `dist/`.
- Job `publier` (dépend de `construire`, environnement `github-pages`) : `deploy-pages`. Son URL est affichée dans le résumé du run.

Une étape en échec arrête le job : la version en ligne reste la précédente.

## 6. Vérification

- **Local, avant le premier push** : `BASE_PATH=/table-de-marque/ npm run build`, puis `vite preview` ; sur `http://localhost:4173/table-de-marque/`, l'app s'affiche, les icônes et le manifeste se chargent, le service worker s'enregistre avec la portée `/table-de-marque/`.
- **Après le premier déploiement** : le run est vert ; l'URL publique répond en HTTPS, `manifest.webmanifest` et `sw.js` sont servis.
- **Recette sur appareils réels (manuelle)**, check-list fournie à la fin de l'implémentation : installation sur iPhone (Safari → Partager → Sur l'écran d'accueil) et Android (Chrome → Installer) ; réouverture en mode avion ; scan d'un QR d'équipe ; lien `#equipe=` ouvert depuis un autre appareil ; écran maintenu allumé pendant un minuteur.

## 7. Points d'attention

- **Origine partagée** : IndexedDB est liée à l'origine `alicework.github.io`, commune aux autres sites Pages du compte. La base porte un nom propre (`table-de-marque`), donc pas de collision.
- **Changement d'adresse** : un domaine personnalisé ajouté plus tard serait une autre origine ; les matchs, clubs et licenciés saisis sur l'ancienne adresse n'y seraient pas visibles (passage par l'export/import de sauvegarde). Mieux vaut décider d'un éventuel domaine avant la diffusion aux bénévoles.
- **Mises à jour** : `registerType: 'prompt'` est conservé ; une nouvelle version publiée est proposée par le bandeau existant, jamais appliquée d'office pendant un match.

## 8. Hors périmètre

- Domaine personnalisé.
- e2e Playwright en CI.
- Aperçus de déploiement par branche ou par pull request.
- Protection de branche, revue obligatoire.

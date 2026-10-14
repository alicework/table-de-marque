# Table de marque — Basket loisir UFOLEP 33

Feuille de match numérique pour le basket loisir UFOLEP 33. L'application remplace la feuille papier à la table de marque : score, fautes personnelles et d'équipe, temps morts, périodes, flèche de possession et comptes à rebours des arrêts de jeu.

C'est une **PWA** (application web installable) qui fonctionne sur téléphone, tablette et ordinateur, **entièrement hors connexion** une fois installée. Toutes les données restent sur l'appareil : aucun serveur, aucun compte.

**Application en ligne :** <https://alicework.github.io/table-de-marque/>
**Guide d'utilisation :** [docs/guide-utilisation.md](docs/guide-utilisation.md) (version Word : [docs/guide-utilisation.docx](docs/guide-utilisation.docx))

## Fonctionnalités

- **Clubs et licenciés** : import de l'export CSV LiguAsso (« Extraction adhérents », type de sortie « Sortie simple Ufolep ») ou saisie manuelle. Réimport en cours de saison sans doublons (reconnaissance par n° d'association et n° de licence).
- **Préparation du match** : composition de chaque équipe à partir des licenciés du club ou en saisie libre, n° de maillot, coach, couleur. Contrôles avant démarrage (14 joueurs max, numéros 0 à 99 uniques, avertissement si moins de 2 joueuses).
- **Saisie en direct** : paniers à 1, 2 et 3 points, fautes (joueurs et coach), temps morts, flèche de possession, 2 mi-temps et prolongations.
- **Alertes réglementaires** : joueur à 4 puis 5 fautes, 7 puis 8 fautes d'équipe par période (2 lancers francs au-delà).
- **Comptes à rebours** : temps mort (1 min), mi-temps (10 min), avant prolongation (2 min), avec bip et vibration.
- **Journal et corrections** : annulation de la dernière action, modification ou suppression de n'importe quelle action, changement de numéro ou ajout d'un joueur en cours de match, réouverture d'un match terminé.
- **Feuille de match PDF** : en fin de match, saisie facultative des officiels, feuille d'une page générée sur l'appareil (partage natif ou téléchargement) et e-mail pré-rempli vers le comité (`cd.33@ufolep.org`) et le coach adverse.
- **Partage d'équipe par QR code** : chaque coach prépare son équipe sur son téléphone et la transmet à la table de marque par QR code, lien ou code à coller.
- **Reprise automatique** du match en cours après fermeture de l'application.
- **Mises à jour maîtrisées** : un bandeau propose la nouvelle version, jamais pendant un match.

Les seuils du règlement (saison 2025-2026) sont centralisés dans [src/domain/config.ts](src/domain/config.ts).

## Pile technique

| Rôle | Outil |
| --- | --- |
| Interface | React 19, TypeScript |
| Build et PWA | Vite, vite-plugin-pwa (Workbox) |
| Stockage local | Dexie (IndexedDB) |
| QR code | qrcode (génération), @zxing (lecture caméra) |
| Feuille de match PDF | pdf-lib, @pdf-lib/fontkit (police Manrope embarquée) |
| Tests unitaires | Vitest, Testing Library, fake-indexeddb |
| Tests de bout en bout | Playwright (téléphone, tablette, ordinateur) |
| Lint | oxlint |

Node.js 22, 24 ou 26 est requis (voir le champ `engines` de `package.json`).

## Démarrer en local

```bash
npm ci
npm run dev
```

L'application est servie sur <http://localhost:5173/>.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Vérification des types puis build de production dans `dist/` |
| `npm run preview` | Sert le build de production |
| `npm run lint` | Lint avec oxlint |
| `npm run typecheck` | Vérification des types TypeScript |
| `npm test` | Tests unitaires en mode interactif |
| `npm run test:run` | Tests unitaires en une passe |
| `npm run e2e` | Tests Playwright (construit et sert l'application automatiquement) |
| `npm run icones` | Régénère les icônes PWA à partir de `public/icone.svg` |
| `npm run guide` | Régénère le QR code et le guide Word à partir de `docs/guide-utilisation.md` |

Pour rejouer les tests de bout en bout sous le chemin de publication GitHub Pages :

```bash
BASE_PATH=/table-de-marque/ npm run e2e
```

## Organisation du code

```
src/
  domain/        Règles du jeu, état du match, commandes (logique pure, sans React)
  storage/       Persistance locale (Dexie) : clubs, licenciés, matchs
  webaffiligue/  Lecture de l'export CSV LiguAsso
  roster-share/  Encodage et décodage d'une équipe partagée (lien, code, QR)
  pdf/           Feuille de match : modèle, dessin pdf-lib, e-mail (logique pure, sans React)
  ui/            Écrans React : accueil, clubs, préparation, saisie, journal, partage, import
  test/          Fixtures et configuration des tests
e2e/             Scénarios Playwright
docs/            Guide d'utilisation, spécifications et plans d'implémentation
scripts/guide/   Génération du guide Word et du QR code
public/          Icônes et manifeste PWA
```

Les spécifications de conception et les plans d'implémentation sont dans [docs/superpowers/specs](docs/superpowers/specs) et [docs/superpowers/plans](docs/superpowers/plans).

## Déploiement

Chaque push sur `main` déclenche le workflow [.github/workflows/deploiement.yml](.github/workflows/deploiement.yml) : lint, types, tests unitaires, build avec `BASE_PATH=/<nom-du-dépôt>/`, puis publication sur GitHub Pages.

Le chemin de base est configurable par la variable d'environnement `BASE_PATH` (vide en local, `/table-de-marque/` en ligne).

## Données personnelles

Les clubs, licenciés et matchs sont stockés uniquement dans le navigateur de l'appareil. Rien n'est transmis sur internet.

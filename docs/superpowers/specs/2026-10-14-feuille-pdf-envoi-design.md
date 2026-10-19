# Feuille de match PDF et envoi par e-mail

**Date :** 2026-10-14
**Statut :** conception validée en conversation
**Spec parente :** `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md` (section 8, que cette spec remplace)
**Spec liée :** `docs/superpowers/specs/2026-10-14-lieu-mode-libre-design.md` (section 5.5, à venir)

## 1. Objectif

En fin de match, la table de marque produit la feuille de match au format PDF et prépare l'e-mail qui l'envoie au comité départemental (`cd.33@ufolep.org`) et au coach de l'équipe adverse, sans ressaisie.

Critère de réussite : le match terminé, le bénévole saisit les officiels, touche « Enregistrer le PDF », touche « Préparer l'e-mail », joint le fichier et envoie ; le comité reçoit une feuille lisible portant score, périodes, joueurs, points, fautes, temps morts, date, lieu et officiels.

## 2. Décisions de cadrage

| Sujet | Décision |
|---|---|
| Modèle de feuille | Feuille propre à l'application, aux couleurs et à la police de l'app. **Pas** de remplissage du PDF officiel (section 8 de la spec parente abandonnée) |
| Contenu | Synthèse sur **une page** : score, périodes, joueurs, officiels. **Pas** de déroulé action par action |
| Génération | pdf-lib et `@pdf-lib/fontkit`, dessin direct, police Manrope embarquée |
| Officiels et capitaines | Saisis **en fin de match**, facultatifs, enregistrés dans le match |
| E-mail du coach adverse | Saisi à la main à chaque match, **jamais enregistré** |
| Envoi | E-mail pré-rempli par lien `mailto:` (destinataires, objet, corps) ; le PDF est **joint à la main** par l'utilisateur |
| Enregistrement du PDF | Menu de partage natif quand l'appareil sait partager un fichier, téléchargement sinon |
| Chargement | pdf-lib, fontkit et les polices sont chargés **à la demande**, au premier clic |
| Mode libre (à venir) | Un match libre ne proposera ni officiels, ni PDF, ni e-mail (spec liée, section 5.5) |

## 3. Contraintes conservées

- Aucun nouveau champ dans `Match` : `officiels` existe déjà (`Officiels`, 7 chaînes). `versionFormat` reste à `1`, pas de migration.
- Le domaine (`src/domain/`) n'importe rien de l'interface. Le nouveau module `src/pdf/` n'importe que `src/domain/` et pdf-lib : aucun React, aucun `fetch`, aucun accès au DOM.
- Les seuils et adresses du règlement vivent dans `src/domain/config.ts`.
- Aucune donnée ne quitte l'appareil sans geste explicite : le PDF n'est produit qu'au clic, l'e-mail n'est préparé qu'au clic.
- Style de code du projet : guillemets simples, pas de points-virgules, identifiants en français.

## 4. Domaine

### 4.1 Adresse du comité

Dans `config.ts` :

```ts
/** Adresse à laquelle la feuille de match est retournée, imprimée sur la feuille officielle. */
export const ADRESSE_COMITE = 'cd.33@ufolep.org'
```

### 4.2 Commande `definirOfficiels`

Dans `commandes.ts` :

```ts
/** Les officiels ne sont pas des événements : le journal, « Annuler » et les corrections les ignorent. */
export function definirOfficiels(match: Match, officiels: Officiels): Match
```

Renvoie le même objet si rien ne change (comme `definirPossession`). Les valeurs sont enregistrées telles quelles, espaces de début et de fin retirés.

## 5. Module `src/pdf/`

Deux étapes isolées : composer un **modèle** (données pures, testables sans PDF), puis le **dessiner** (pdf-lib).

### 5.1 Fichiers

| Fichier | Rôle | Dépend de |
|---|---|---|
| `src/pdf/modele.ts` | `composerFeuille(match, etat, maintenant)` → `ModeleFeuille` | `domain` |
| `src/pdf/texte.ts` | Dates en français, saison, slug sans accents | — |
| `src/pdf/dessin.ts` | `dessinerFeuille(modele, polices)` → `Uint8Array` | pdf-lib, fontkit, `couleurs.ts` |
| `src/pdf/couleurs.ts` | Les couleurs des jetons (`src/styles/jetons.css`) en RVB pour pdf-lib | — |
| `src/pdf/courriel.ts` | `nomFichierFeuille(match)`, `courrielFeuille(match, etat, coachAdverse)` | `domain`, `texte.ts` |
| `src/pdf/polices/` | `Manrope-Regular.ttf`, `Manrope-Bold.ttf`, `Manrope-ExtraBold.ttf`, `OFL.txt` (déplacés depuis `scripts/guide/polices/`) | — |

`src/pdf/couleurs.ts` est la **seconde** source de couleurs littérales du projet, par nécessité (pdf-lib ne lit pas le CSS). Un test vérifie que ses valeurs sont celles de `jetons.css`.

### 5.2 Modèle de feuille

```ts
export interface ModeleFeuille {
  titre: string                     // « Feuille de match »
  sousTitre: string                 // « Basket loisir UFOLEP 33 · Saison 2026-2027 »
  date: string                      // « vendredi 16 octobre 2026 »
  lieu: string                      // vide si non renseigné
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
    lignes: LignePeriodes[]         // une par équipe, A puis B
  }
  equipes: Record<EquipeId, BlocEquipe>
  officiels: { libelle: string; valeur: string }[]   // 5 entrées, dans l'ordre de la feuille officielle
  capitaines: { libelle: string; valeur: string }[]  // capitaine A puis B
  piedDePage: string                // « Généré par Table de marque le 16/10/2026 à 21:05 »
}

export interface LignePeriodes {
  equipe: EquipeId
  nom: string
  points: number[]                  // une valeur par période jouée, puis le total
  fautesEquipe: number[]            // idem, sans total
  tempsMorts: number[]              // idem, sans total
}

export interface BlocEquipe {
  equipe: EquipeId
  nom: string
  couleur: string                   // couleur de maillot, texte libre
  coach: string | null              // nom affiché, « n°7 Prenom Nom » pour un coach joueur
  fautesCoach: number
  joueurs: LigneJoueur[]            // triés par n° croissant (`parNumero`)
}

export interface LigneJoueur {
  numero: number
  nom: string                       // « Prenom NOM » ; nom seul ou prénom seul si l'autre manque
  licence: string
  lf: number
  deuxPts: number
  troisPts: number
  points: number
  fautes: number
  /** 5 fautes atteintes (REGLES.fautesPersoMax) */
  exclu: boolean
}
```

Règles de composition :

- `colonnes` : `libellePeriode` de chaque période de `etat.periodes`, puis « Total ».
- `mention` : `null` sans prolongation ; « après prolongation » pour une ; « après N prolongations » au-delà.
- `officiels` : libellés « Chronométreur », « Opérateur 30" », « Marqueur », « Arbitre », « Aide arbitre », valeurs de `match.officiels` (vides possibles).
- `capitaines` : libellés « Capitaine A » et « Capitaine B » suivis du nom de l'équipe entre parenthèses, valeurs `match.officiels.capitaineA` / `capitaineB` (vides possibles).
- `sousTitre` : saison calculée depuis `match.date` (de septembre à août : `2026-09-01` → « 2026-2027 », `2027-03-01` → « 2026-2027 »).
- `date` : `Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' })` sur `match.date` interprétée en heure locale ; jamais de décalage de jour.
- `piedDePage` : `maintenant` fourni par l'appelant (testabilité).

### 5.3 Dessin

`dessinerFeuille(modele, polices)` avec `polices = { normale: Uint8Array; grasse: Uint8Array }`, renvoie `Promise<Uint8Array>`.

- A4 portrait (595,28 × 841,89 pt), marges 36 pt, police Manrope (Regular et Bold, embarquées en **sous-ensemble**), couleurs de `couleurs.ts`.
- Une seule page. Si le contenu déborde (14 joueurs par équipe et plusieurs prolongations), les hauteurs de lignes des tableaux se réduisent jusqu'à un minimum de 10 pt ; au-delà, une seconde page reçoit le bloc de l'équipe B et le bas de feuille. Le bas de feuille (officiels, observations, capitaines) n'est jamais coupé entre deux pages. La seconde page n'est attendue qu'en cas extrême et le test ne l'exige pas.
- Un utilitaire interne de tableau (colonnes à largeur fixe, en-tête sur fond `surface-2`, lignes alternées `surface` / `fond`, texte aligné à gauche pour les noms et à droite pour les nombres) sert aux trois tableaux.
- Mise en page de haut en bas :
  1. **En-tête** : `titre` en Bold 22 pt, `sousTitre` en Regular 10 pt `texte-2` ; à droite, `date` et `lieu`.
  2. **Score** : bandeau sur fond `accent-tint` ; `nomA` en `equipe-a`, `nomB` en `equipe-b`, scores en Bold 32 pt, `mention` en 10 pt dessous.
  3. **Tableau des périodes** : colonnes « Équipe », « », puis une colonne par entrée de `colonnes`. Trois lignes par équipe : « Points » (avec le total), « Fautes d'équipe » et « Temps morts » (sans total). Le nom de l'équipe n'est écrit que sur la ligne « Points ».
  4. **Bloc équipe A puis B** : barre de couleur d'équipe à gauche, titre `nom` + « Maillot : couleur », ligne « Coach : … (x faute(s)) » ou « Coach : — ». Tableau des joueurs : N°, Nom, Licence, LF, 2 pts, 3 pts, Points, Fautes. La colonne Fautes dessine 5 cases de 7 pt ; les cases atteintes sont remplies en `faute`, la 5ᵉ en `danger` quand `exclu`.
  5. **Officiels** : grille de 5 cases (3 colonnes), libellé en 7 pt `texte-2`, valeur en 9 pt ou case vide d'une hauteur de 22 pt (signable au stylo).
  6. **Observations** : cadre vide pleine largeur de 60 pt, rempli à la main ou dans un lecteur PDF, éventuellement après le match (déclaration d'assurance d'un joueur blessé, par exemple). Rien n'est saisi dans l'application.
  7. **Capitaines** : deux cases côte à côte de 22 pt, toujours vides pour la signature (papier ou numérique) ; le nom saisi en fin de match suit le libellé (« Capitaine A (ST DELPHIN) — Sam L. »).
  8. **Pied de page** sur chaque page : `piedDePage` à gauche, « Page n/N » à droite, 8 pt `texte-2`.
- Manrope couvre le latin étendu. Un caractère absent de la police (emoji dans un nom d'équipe, par exemple) est remplacé par « ? » avant le dessin : un nom fantaisiste ne doit jamais empêcher d'envoyer la feuille. Les textes trop longs pour leur colonne sont coupés avec « … ».

### 5.4 Courriel et nom de fichier

```ts
/** « 2026-10-16_ST-DELPHIN-GRADIGNAN.pdf » : date, puis noms sans accent ni espace. */
export function nomFichierFeuille(match: Match): string

export interface CourrielFeuille {
  a: string            // ADRESSE_COMITE
  cc: string | null    // coach adverse, ou null
  objet: string
  corps: string
  /** Lien mailto: complet, encodé */
  lien: string
}
export function courrielFeuille(match: Match, etat: EtatMatch, coachAdverse: string | null): CourrielFeuille
```

- Slug : décomposition Unicode NFD, suppression des diacritiques, tout caractère hors `[A-Za-z0-9]` remplacé par `-`, tirets consécutifs fusionnés, tirets de bord retirés. Dans le nom de fichier, un slug vide devient « equipe » et une date absente ou mal formée devient « sans-date ».
- Objet : « Feuille de match UFOLEP 33 — 16/10/2026 — ST DELPHIN 54–48 GRADIGNAN ».
- Corps :

  ```
  Bonjour,

  Veuillez trouver ci-joint la feuille du match du vendredi 16 octobre 2026 à Villenave-d'Ornon :
  ST DELPHIN 54 – 48 GRADIGNAN (après prolongation).

  Cordialement,
  La table de marque
  ```

  La ligne du lieu est « du vendredi 16 octobre 2026 : » sans lieu ; la mention entre parenthèses n'apparaît qu'avec une prolongation.
- `lien` : `mailto:${a}?cc=…&subject=…&body=…` avec `encodeURIComponent` ; `cc` omis si null. Retours à la ligne encodés `%0D%0A`.

## 6. Interface

### 6.1 Chargeur `src/ui/saisie/feuille.ts`

Point d'entrée de l'interface vers le module PDF, seul endroit qui connaît les URL des polices et pdf-lib :

```ts
/** Charge pdf-lib et les polices à la demande, compose et dessine la feuille. */
export async function genererFeuillePdf(match: Match, etat: EtatMatch): Promise<Uint8Array>

/** Menu de partage natif si l'appareil sait partager ce fichier, téléchargement sinon. */
export async function enregistrerFichier(octets: Uint8Array, nom: string): Promise<void>
```

- Polices importées en `?url` depuis `src/pdf/polices/`, lues par `fetch` ; `import('../../pdf/dessin')` et `import('../../pdf/modele')` dynamiques pour isoler pdf-lib dans son propre morceau de build.
- `enregistrerFichier` : construit un `File` de type `application/pdf` ; si `navigator.canShare?.({ files: [fichier] })` est vrai, `navigator.share({ files, title })`. Un rejet `AbortError` (menu fermé) est silencieux ; tout autre rejet, ou l'absence de partage, déclenche le téléchargement par un lien `a[download]` sur une `URL.createObjectURL`, révoquée ensuite.

### 6.2 Écran « Match terminé »

`MatchTermine` reçoit en plus `appliquer: Appliquer`. L'écran conserve le titre, le score final, « Rouvrir pour corriger » et « Accueil », et gagne deux blocs entre le score et les boutons :

**Officiels** (`src/ui/saisie/FormulaireOfficiels.tsx`) : un `<details>` replié, résumé « Officiels et capitaines » ; à l'intérieur, les 7 champs texte avec libellés (« Capitaine A » et « Capitaine B » suivis du nom de l'équipe). État local initialisé depuis `match.officiels` ; chaque champ est enregistré à la perte de focus par `appliquer((m) => definirOfficiels(m, officiels))`. L'écran de fin ne sachant pas si le match vient d'un `useLiveQuery`, l'état local évite de perdre une frappe pendant l'écriture.

**Envoi de la feuille** (`src/ui/saisie/EnvoiFeuille.tsx`) :

- Champ « E-mail du coach adverse » (`type="email"`, facultatif, état local jamais enregistré). Si non vide et ne correspond pas à `^[^\s@]+@[^\s@]+\.[^\s@]+$` : message « Adresse e-mail invalide » sous le champ, et le lien d'e-mail est remplacé par un bouton désactivé.
- Bouton **« Enregistrer le PDF »** (`btn btn-principal`) : passe en « Préparation… » et désactivé pendant la génération, appelle `genererFeuillePdf` puis `enregistrerFichier`.
- Lien **« Préparer l'e-mail »** (`a.btn` avec `href={courriel.lien}`), recalculé à chaque rendu depuis le match, l'état et l'adresse saisie.
- Sous les deux : « Joignez le fichier `2026-10-16_ST-DELPHIN-GRADIGNAN.pdf` à l'e-mail. » (nom réel).

`MatchTermine` ne masque rien aujourd'hui : le mode libre, quand il existera, conditionnera l'affichage des deux blocs à `modeDuMatch(match) === 'ufolep'`.

### 6.3 Styles

Dans `src/styles/saisie.css`, sous `.match-termine` : `details` sur fond `surface-2`, grille de champs à deux colonnes au-delà de 480 px, texte d'aide en `texte-2`. Pas de nouvelle couleur.

### 6.4 Erreurs

| Situation | Comportement |
|---|---|
| Échec de génération (import, police, pdf-lib) | `Dialogue` « Feuille impossible à générer » avec le message de l'erreur, bouton « Fermer » ; l'écran reste en place |
| Partage refusé par l'appareil | Repli silencieux sur le téléchargement |
| Menu de partage fermé sans choix | Rien |
| Échec d'enregistrement des officiels | Dialogue d'erreur de stockage existant de `EcranMatch` (via `appliquer`) |

## 7. Build et hors connexion

- `package.json` : `pdf-lib` et `@pdf-lib/fontkit` en dépendances.
- `vite.config.ts` : `ttf` ajouté aux `globPatterns` de Workbox, pour que les polices soient précachées et que la feuille se génère hors connexion ; `build.chunkSizeWarningLimit` relevé à 1000 pour le morceau pdf-lib, chargé à la demande.
- `scripts/guide/generer-docx.cjs` lit désormais les polices dans `src/pdf/polices/`.

## 8. Tests

- **Domaine** : `definirOfficiels` (valeurs rognées, même objet si inchangé, événements intacts).
- **`modele.ts`** sur le match de référence des fixtures : colonnes et lignes des périodes (MT1, MT2, prolongation, total), mention de prolongation (0, 1, 2), joueurs triés par n°, LF / 2 pts / 3 pts / points / fautes, `exclu` à 5 fautes, coach joueur et coach libre avec ses fautes, officiels vides et remplis, saison et date en français, 14 joueurs.
- **`texte.ts`** : slug (accents, apostrophes, espaces, vide), saison à cheval, date sans décalage.
- **`courriel.ts`** : nom de fichier, objet, corps avec et sans lieu, avec et sans prolongation, `cc` présent ou absent, lien `mailto:` décodable.
- **`couleurs.ts`** : chaque couleur égale à son jeton dans `jetons.css` (test en environnement `node`, comme `styles.test.ts`).
- **`dessin.ts`** (environnement `node`, polices lues avec `fs`) : le résultat se recharge avec `PDFDocument.load`, une page au format A4 ; le fichier est aussi écrit dans `test-results/feuille-exemple.pdf` pour contrôle visuel.
- **`EnvoiFeuille`** (`genererFeuillePdf` et `enregistrerFichier` simulés) : clic → générateur appelé avec le match puis `enregistrerFichier` avec le nom attendu ; bouton désactivé pendant la génération ; lien `mailto:` avec `cc` après saisie d'une adresse ; adresse invalide → message et bouton désactivé ; échec de génération → dialogue.
- **`FormulaireOfficiels`** : perte de focus → `appliquer` appelé avec les officiels ; `match.officiels` repris à l'ouverture.
- **`feuille.ts`** : `enregistrerFichier` choisit le partage si `canShare`, le téléchargement sinon, et se replie sur le téléchargement si le partage rejette autre chose qu'`AbortError`.
- **Bout en bout** (`e2e/match.spec.ts`, profil ordinateur, `navigator.canShare` neutralisé par `addInitScript`) : match terminé → saisie d'un arbitre → « Enregistrer le PDF » → téléchargement capturé, nom `AAAA-MM-JJ_ST-DELPHIN-GRADIGNAN.pdf`, premiers octets `%PDF` ; lien « Préparer l'e-mail » avec `href` commençant par `mailto:cd.33@ufolep.org`.

## 9. Documentation

- `docs/guide-utilisation.md`, section 6 : officiels, « Enregistrer le PDF » (menu de partage ou téléchargement), « Préparer l'e-mail », rappel de joindre le fichier ; section 9 « Bon à savoir » : le PDF est produit sur l'appareil, rien n'est envoyé sans l'utilisateur. Puis `npm run guide`.
- `README.md` : fonctionnalité « Feuille de match PDF et e-mail » et pdf-lib dans la pile technique.
- Spec parente, section 8 : note renvoyant vers cette spec.
- Spec liée (mode libre), section 5.5 : à jour, aucune modification nécessaire.

## 10. Hors périmètre

- Déroulé du match (journal) dans le PDF.
- Mémorisation des adresses e-mail (par club ou par coach).
- Historique des matchs et regénération d'une feuille ancienne.
- Envoi automatique (serveur, API de messagerie).
- Remplissage du PDF officiel de l'UFOLEP.

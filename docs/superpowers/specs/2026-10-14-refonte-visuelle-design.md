# Refonte visuelle — thème clair épuré

**Date :** 2026-10-14
**Statut :** conception validée en conversation (maquette `nimbalyst-local/mockups/refonte-claire.mockup.html`), en attente de relecture écrite
**Spec parente :** `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`

## 1. Objectif

Donner à l'application une apparence moderne, douce et cohérente, sans changer son fonctionnement. Le résultat attendu : un bénévole qui ouvre l'app sur une tablette dans un gymnase la trouve claire, agréable et lisible de loin, et retrouve exactement les mêmes gestes qu'aujourd'hui.

Deux ajouts fonctionnels demandés pendant la conception sont inclus parce qu'ils touchent le bandeau de score, pièce centrale de la refonte :

- un **voyant de fautes d'équipe** toujours visible, rouge plein dès la 9e faute, comme sur une table de marque réelle ;
- une **flèche de possession alternée** réglée à la main par la table.

## 2. Décisions de cadrage

| Sujet | Décision |
|---|---|
| Direction | Épurée et douce : surfaces claires, un seul accent, beaucoup d'air, coins arrondis généreux |
| Thème | **Clair uniquement.** Le thème sombre actuel disparaît. Pas de bascule, pas de suivi du réglage système. |
| Typographie | **Manrope** (variable, sous-ensemble latin) embarquée via le paquet `@fontsource-variable/manrope` |
| Périmètre | Tous les écrans : accueil, préparation, saisie (action, choix du joueur, bandeau), journal et gestion des joueurs, clubs, licenciés, import, partage, dialogues, bandeau de mise à jour |
| Mise en œuvre | CSS réécrit **plus** retouches légères du JSX. Aucune bibliothèque CSS. |
| Animations | Légères, désactivées si `prefers-reduced-motion: reduce` |

## 3. Contraintes conservées

- Français uniquement, gros boutons (zones tactiles ≥ 48 px, boutons d'action ≥ 120 px de haut sur tablette), contraste **AA (≥ 4,5:1)** pour tout texte sur son fond.
- Aucun changement de libellé, de rôle ARIA ni de comportement, à trois exceptions près : les caractères décoratifs « ↶ » et « ✕ » sortent des libellés (remplacés par des icônes masquées aux lecteurs d'écran) ; le bouton « ↶ Annuler » de la barre basse affiche « Annuler » mais porte le nom accessible « Annuler la dernière action » (`aria-label`), pour rester distinct du « Annuler » du dialogue de fin de période affiché par-dessus ; le bandeau gagne la flèche de possession.
- Fonctionnement hors ligne : la police est un fichier `woff2` servi avec l'app et pris par le `globPatterns` du service worker (déjà `**/*.{js,css,html,ico,png,svg,woff2}`).
- Le domaine (`src/domain/`) n'importe rien de l'interface. Les seuils restent dans `REGLES`.
- Style de code du projet : guillemets simples, pas de points-virgules, identifiants en français.

## 4. Système de design

### 4.1 Jetons (`src/styles/jetons.css`)

Toutes les valeurs ci-dessous sont des variables CSS sur `:root`. Le code n'utilise jamais une couleur littérale hors de ce fichier.

**Surfaces et texte**

| Jeton | Valeur | Usage |
|---|---|---|
| `--fond` | `#f5f4f0` | Fond de page, blanc cassé chaud |
| `--surface` | `#ffffff` | Cartes, bandeau, dialogues, champs |
| `--surface-2` | `#edece7` | Pastilles neutres, icônes d'accueil, fond des champs dans un dialogue |
| `--bordure` | `#e3e1db` | Bordures fines des cartes et boutons |
| `--texte` | `#1d1c1a` | Texte principal |
| `--texte-2` | `#66645e` | Texte secondaire, libellés |

**Accent (un seul)**

| Jeton | Valeur | Usage |
|---|---|---|
| `--accent` | `#c24f12` | Fond du bouton principal (texte blanc, contraste 4,8:1), point « match en cours » |
| `--accent-texte` | `#a8420c` | Texte accentué sur fond clair |
| `--accent-tint` | `#fbeadf` | Badge de période, fond derrière un texte accentué |

**Équipes**

| Jeton | Valeur |
|---|---|
| `--equipe-a` / `--equipe-a-tint` | `#b83c35` / `#fbe5e3` |
| `--equipe-b` / `--equipe-b-tint` | `#2d63c4` / `#e3ebfa` |

**Actions et états.** Chaque action a une teinte de fond pastel et une couleur de texte foncée ; le texte foncé sur la teinte dépasse 4,5:1.

| Jeton | Texte | Teinte | Usage |
|---|---|---|---|
| `--points` / `--points-tint` | `#1f6b3f` | `#e1f1e7` | Boutons +1 +2 +3, bandeau « quel joueur » pour un panier |
| `--faute` / `--faute-tint` | `#9a3d2e` | `#f8e4df` | Bouton F, bandeau « quel joueur » pour une faute |
| `--temps-mort` / `--temps-mort-tint` | `#4a4f8c` | `#e7e8f6` | Bouton Temps mort |
| `--attention` / `--attention-tint` | `#86590e` | `#fbefd2` | Fautes d'équipe à 7 et 8, 4e faute d'un joueur, avertissements |
| `--danger` | `#b42318` | — | Fautes d'équipe ≥ 9 (texte blanc), bouton danger, erreurs |

**Forme et mouvement**

| Jeton | Valeur |
|---|---|
| `--r-carte` | `18px` |
| `--r-btn` | `12px` |
| `--r-tuile` | `20px` |
| `--ombre` | `0 1px 2px rgb(29 28 26 / 0.04), 0 8px 24px rgb(29 28 26 / 0.06)` |
| `--espace-1` … `--espace-5` | `4px 8px 12px 16px 24px` |
| `--duree-tap` / `--duree-dialogue` / `--duree-ecran` | `120ms` / `160ms` / `180ms` |

### 4.2 Typographie

- `font-family: 'Manrope Variable', system-ui, sans-serif` sur `:root`. Import unique dans `src/main.tsx` : `import '@fontsource-variable/manrope'`.
- `font-variant-numeric: tabular-nums` sur tout ce qui affiche un score, un compteur ou un numéro.
- Échelle : texte 16 px ; libellés et pastilles 11 à 13 px en capitales espacées (`letter-spacing: 0.06em`, graisse 800) ; titres d'écran 28 px / 800 ; score du bandeau `clamp(40px, 6vw, 60px)` / 800 / `letter-spacing: -0.04em` ; numéro de joueur 48 px / 800 ; boutons d'action 36 px / 800.

### 4.3 Composants (`src/styles/composants.css`)

- **Bouton** `.btn` : fond `--surface`, bordure `--bordure`, rayon `--r-btn`, hauteur min 48 px, graisse 700, légère ombre. Variantes : `.btn-principal` (fond `--accent`, texte blanc), `.btn-discret` (sans fond ni bordure, texte `--texte-2`), `.btn-danger` (fond `--danger`, texte blanc). Un bouton peut contenir une icône à gauche.
- **Carte** `.carte` : fond `--surface`, bordure, rayon `--r-carte`, ombre, rembourrage 16 à 22 px. Utilisée par le bandeau, les blocs d'équipe, la carte « match en cours », l'éditeur d'équipe, les dialogues.
- **Pastille** `.pastille` : libellé en capitales au-dessus d'une valeur en 22 px, fond `--surface-2`, rayon 12 px.
- **Voyant de fautes** `.fautes-bloc` : même forme que la pastille, largeur min 96 px, valeur 26 px. États : `.niveau-attention` (teinte ambre, bordure ambre), `.niveau-limite` (ambre plein, texte blanc), `.niveau-penalite` (fond `--danger`, texte blanc, halo rouge à 18 %, mention « 2 LF » après la valeur).
- **Icône** : composants SVG inline 20 × 20, `aria-hidden="true"`, trait 2 px, `currentColor`. Jeu minimal : plus, personnes, QR, télécharger, flèche droite, retour (annuler), liste (journal), maison, chrono (temps mort), croix (fermer).
- **Dialogue** : voile `rgb(29 28 26 / 0.45)`, carte 480 px max, apparition fondu + zoom de 0,96 à 1.
- **Listes** (journal, licenciés, clubs, sélection) : lignes en cartes basses (rayon 12 px, bordure), sans ombre, espacement 6 px.
- **Champs** : fond `--surface`, bordure `--bordure`, rayon 10 px, hauteur min 44 px, anneau accentué au focus (`outline: 2px solid var(--accent)`, décalé de 2 px).

### 4.4 Animations (`src/styles/base.css`)

Toutes sous `@media (prefers-reduced-motion: no-preference)` :

- `.btn:active`, `.btn-action:active`, `.tuile:active` : `transform: scale(0.97)` avec transition `--duree-tap`. L'éclaircissement actuel (`filter: brightness`) devient un assombrissement de 4 % sur fond clair.
- `.ecran` : animation d'entrée `fondu` (opacité 0 → 1, translation 4 px → 0) sur `--duree-ecran`.
- `.voile` : fondu sur `--duree-dialogue` ; `.dialogue` : fondu + zoom sur la même durée.

## 5. Écrans

### 5.1 Accueil

- En-tête de marque : logo (carré arrondi `--accent` avec le ballon blanc, 52 px) à gauche, « Table de marque » en 28 px et « Basket loisir UFOLEP 33 » en `--texte-2` à droite.
- **Carte « match en cours »** (si un match est en cours) : étiquette « MATCH EN COURS » précédée d'un point accent, noms des équipes de part et d'autre du score en 40 px, période en dessous, bouton principal « Reprendre le match en cours » avec le sous-texte des équipes comme aujourd'hui. Cette carte **remplace** le bouton vert actuel.
- Grille d'actions à deux colonnes : « Nouveau match » (pleine largeur), « Clubs et licenciés », « Partager une équipe », « Importer une équipe » (pleine largeur). Chaque bouton a une icône dans un carré `--surface-2` de 36 px et le libellé aligné à gauche, hauteur 64 px. **Sans match en cours**, « Nouveau match » prend le style principal.
- Le dialogue de confirmation « Un match est en cours » ne change pas.
- Largeur max 560 px, centrée, marge haute 56 px sur tablette, 24 px sur téléphone.

### 5.2 Bandeau de score (`Bandeau.tsx`)

Grille `1fr auto 1fr`, carte.

- **Bloc équipe** : nom en 20 px / 800 précédé (A) ou suivi (B) d'un carré 12 px à la couleur de l'équipe ; dessous, le voyant de fautes puis la pastille « TM ». Pour B, l'ordre horizontal est inversé pour que le voyant reste côté extérieur.
- **Voyant de fautes** : libellé « Fautes éq. » en capitales par CSS, valeur `n/8` en gros chiffres tabulaires. Le `aria-label` reste `Fautes d'équipe <nom>` et le contenu textuel commence toujours par `Fautes éq. n/8` (un test existant le lit). En pénalité, un `<small>` « · 2 LF » est ajouté après la valeur.
- **Centre** : score `A – B` avec un tiret dessiné en trait fin (`span.sep`, décoratif, le texte reste `A – B` pour l'aria-label « Score »), badge de période, puis la **flèche de possession** (§ 6).

Sur téléphone en portrait (`max-width: 600px`), le bandeau passe en colonne : centre en haut, les deux blocs équipe côte à côte dessous.

### 5.3 Écran action (`EcranAction.tsx`)

- Chaque bloc équipe est une carte avec un **liseré** de 4 px en haut (couleur de l'équipe, arrondi en bas, retrait de 22 px de chaque côté) et un **titre** en capitales `--texte-2` 13 px (nom de l'équipe). Le `aria-label="Actions <nom>"` du groupe reste.
- Grille 4 colonnes : +1, +2, +3 (`--points-tint` / `--points`), F (`--faute-tint` / `--faute`), hauteur `clamp(96px, 16vh, 136px)`, rayon 16 px, anneau intérieur 1 px à 6 % de noir.
- « Temps mort » : bouton pleine largeur 56 px, `--temps-mort-tint` / `--temps-mort`, icône chrono.
- Ligne « Dernière action » : libellé en `--texte-2`, score dans une puce `--surface-2`, description en gras.
- Barre basse en grille `1fr 1fr 1.4fr 1fr` : « Annuler » (icône retour, `aria-label="Annuler la dernière action"`), « Journal » (icône liste), « Fin de période » en **principal**, « Accueil » en discret (icône maison). Sur téléphone, deux lignes de deux.
- Les alertes (`Alertes.tsx`) deviennent des cartes `--danger` texte blanc, rayon 12 px, icône d'avertissement. Leur `aria-label="Alertes"` reste.

### 5.4 Choix du joueur (`ChoixJoueur.tsx`)

- Bandeau : teinte de l'action (`--points-tint` ou `--faute-tint`), titre « +2 — ST DELPHIN » rendu comme une puce pleine (`+2` sur fond `--points`, texte blanc) suivie du nom. Le texte du `h2` reste exactement `+2 — ST DELPHIN` / `Faute — ST DELPHIN`. Bouton « Annuler » avec icône croix, fond blanc à 70 %.
- Grille `repeat(auto-fill, minmax(140px, 1fr))` (110 px sur téléphone).
- Tuile : carte rayon `--r-tuile`, numéro 48 px, cinq **cercles** de 9 px (bordure ambre, plein si faute), points en `--texte-2`. Le `aria-label` de la tuile ne change pas ; les cercles sont rendus par un composant `PastillesFautes` qui remplace la chaîne `●○` à l'écran. La fonction `pastillesFautes` de `format.ts` est conservée pour le journal et le PDF à venir.
- `niveau-attention` : double anneau ambre (3 px teinte + 1 px plein). `niveau-exclu` : opacité 0,4. Tuile coach : « Coach » en 24 px.

### 5.5 Préparation du match

- En-tête d'écran commun (`.entete`) : titre 28 px à gauche, « Retour » en bouton standard à droite. Même en-tête pour clubs, fiche club, journal, partage, équipe reçue.
- « Date » et « Lieu » dans une carte à deux colonnes.
- Chaque `EditeurEquipe` est une carte ; sa `legend` devient un titre de carte (18 px / 800, précédé d'un carré à la couleur de l'équipe A ou B). Les trois boutons d'action (choisir, partager, importer) passent en `.btn-discret` avec icône, sur une ligne.
- Tableau des joueurs : en-têtes en capitales `--texte-2` 11 px, champs sans bordure visible dans la ligne (bordure au focus), lignes séparées par un filet `--bordure`. Bouton « Retirer » en icône croix discrète (son `aria-label` reste).
- Avertissements en carte `--attention-tint`, erreurs en carte `--danger` texte blanc.
- « Commencer le match » : principal, pleine largeur, 56 px.

### 5.6 Journal et gestion des joueurs

- Lignes du journal : période en puce `--surface-2`, score en chiffres tabulaires, description, actions « Modifier » / « Supprimer » discrètes à droite.
- « Annuler la dernière action » : bouton standard avec icône retour, libellé sans « ↶ ».
- Gestion des joueurs : deux cartes (une par équipe) avec le même titre de carte que l'éditeur d'équipe.

### 5.7 Clubs, licenciés, import, partage, équipe reçue

- Liste des clubs : cartes basses cliquables, nom à gauche, effectif en pastille à droite, chevron.
- Fiche club : sous-titre, actions, liste des licenciés comme le journal.
- Dialogues (club, licencié, sélection, partage, import, édition d'événement, fin de période, erreurs) : tous via `Dialogue.tsx`, qui gagne l'animation ; aucun changement de contenu.
- QR : conteneur blanc rayon 12 px avec bordure, inchangé sinon.
- Écran « Équipe reçue » : l'aperçu de l'équipe (`ApercuEquipe`) devient une carte ; les deux boutons « Utiliser pour l'équipe A / B » restent principaux.

### 5.8 Match terminé et mise à jour

- Match terminé : carte centrée, score final en 40 px, deux boutons.
- Bandeau de mise à jour : carte flottante en bas, ombre, bouton principal « Recharger ».

## 6. Flèche de possession alternée

### Règle métier

Au basket, la flèche indique quelle équipe obtient la balle au prochain entre-deux. Elle est posée par la table au début du match et retournée après chaque situation d'entre-deux. **L'app ne la retourne jamais seule** : la table la règle d'un tap. Elle n'est pas remise à zéro à la mi-temps ni en prolongation.

### Modèle

- `Match` gagne un champ facultatif `possession?: EquipeId | null`. Un match créé avant cette version n'a pas le champ : il est lu comme `null` (« non définie »). `versionFormat` reste `1`, aucune migration Dexie (champ non indexé).
- `nouveauMatch` crée le match avec `possession: null`.
- Commande pure `definirPossession(match, equipe: EquipeId): Match` dans `src/domain/commandes.ts`. Elle ne touche pas à `evenements`, donc `annulerDernier`, le journal, les corrections et `rouvrirMatch` l'ignorent.
- `calculerEtat` ne change pas ; le bandeau lit `match.possession`.

### Interface (`Bandeau.tsx`)

- Sous le badge de période, un groupe `role="group" aria-label="Flèche de possession"` avec deux boutons : `◀ <nom A>` et `<nom B> ▶` (flèches en SVG, masquées), séparés par le mot « Possession » en `--texte-2`.
- Chaque bouton porte `aria-pressed` (vrai pour l'équipe active) et `aria-label="Possession <nom>"`. Le côté actif prend la teinte et la couleur de son équipe ; les deux côtés sont neutres quand la possession est non définie.
- Un tap sur un côté appelle `onPossession(equipe)`, passé par `EcranAction` et exécuté par `EcranMatch` via `appliquer((m) => definirPossession(m, equipe))`, **enveloppé par la garde anti-double-tap** comme les autres actions de l'écran.
- Un tap sur le côté déjà actif ne fait rien (pas d'écriture).
- Le `Bandeau` reçoit donc une nouvelle prop `onPossession?: (equipe: EquipeId) => void`. Sans cette prop (usage en lecture seule, par exemple plus tard dans l'historique), les boutons ne sont pas rendus.

## 7. Niveaux de fautes d'équipe

`niveauFautesEquipe` (`src/domain/regles.ts`) passe de trois à quatre niveaux :

| Fautes dans la période | Niveau | Rendu |
|---|---|---|
| 0 à 6 | `normal` | Voyant neutre |
| 7 | `attention` | Teinte ambre, bordure ambre |
| 8 | `limite` | Ambre plein |
| 9 et plus | `penalite` | Rouge plein, texte blanc, « 2 LF » |

Les seuils dérivent de `REGLES.alerteFautesEquipe` (7) et `REGLES.seuilFautesEquipe` (8) : `penalite` est `fautes > seuilFautesEquipe`. Aucun nouveau seuil dans `REGLES`. L'alerte texte « au-delà de 8, 2 lancers francs » (`alertesActives`) reste déclenchée à partir de 8.

## 8. Structure des fichiers

```
src/
  main.tsx                      import de la police et de styles/index.css
  styles/
    index.css                   @import des fichiers ci-dessous, dans l'ordre
    jetons.css                  variables :root
    base.css                    reset, typographie, champs, animations
    composants.css              btn, carte, pastille, fautes-bloc, dialogue, listes, entete
    accueil.css
    preparation.css
    saisie.css                  bandeau, action, choix joueur, alertes, possession
    journal.css
    clubs.css                   clubs, fiche, import, partage, équipe reçue, QR, scanner
  ui/commun/Icones.tsx          composants SVG inline
  ui/commun/PastillesFautes.tsx cercles de fautes (remplace la chaîne ●○ à l'écran)
  domain/commandes.ts           + definirPossession
  domain/types.ts               + possession?: EquipeId | null
  domain/regles.ts              niveau penalite
```

`src/styles.css` est supprimé. Les sélecteurs existants sont conservés quand ils désignent toujours le même élément (`.btn`, `.tuile`, `.bandeau`, `.grille-actions`…) pour limiter les changements de JSX.

`index.html` : `theme-color` passe à `#f5f4f0`. `vite.config.ts` : `background_color` et `theme_color` du manifeste passent à `#f5f4f0`. L'icône (`public/icone.svg` et PNG générés) ne change pas.

Nouvelle dépendance, version exacte : `@fontsource-variable/manrope ^5`. Aucune autre.

## 9. Responsive

| Largeur | Comportement |
|---|---|
| ≥ 900 px (tablette paysage, ordinateur) | Mise en page de la maquette ; largeur max 1200 px centrée |
| 600 à 900 px (tablette portrait) | Identique, boutons d'action `clamp` plus bas, grille de tuiles à 120 px |
| < 600 px (téléphone portrait) | Bandeau en colonne, blocs d'équipe empilés (règle existante), barre basse sur deux lignes, accueil et grille d'actions sur une colonne, tableau des joueurs en défilement horizontal |

Hauteur d'écran courte (`max-height: 700px` en paysage téléphone) : boutons d'action `clamp(72px, 14vh, 136px)`, bandeau compact (score 40 px, pastilles sur une ligne).

## 10. Gestion des erreurs

Rien de nouveau. Les erreurs de stockage, les dialogues d'erreur et les alertes existants gardent leur logique ; seul leur habillage change (§ 4.3).

## 11. Tests

### Unitaires (Vitest)

- `regles.test.ts` : `niveauFautesEquipe` renvoie `normal` (0, 6), `attention` (7), `limite` (8), `penalite` (9, 12).
- `commandes.test.ts` : `definirPossession` pose A puis B, ne modifie pas `evenements`, et `annulerDernier` ne la change pas. Un match sans champ `possession` est accepté.
- `match.test.ts` ou `etat.test.ts` : `nouveauMatch` crée `possession: null`.
- `EcranMatch.test.tsx` : le groupe « Flèche de possession » expose deux boutons ; un tap sur « Possession GRADIGNAN » rend ce bouton `aria-pressed="true"` et l'autre `false` ; un double tap n'écrit qu'une fois ; après « Annuler la dernière action », la possession est inchangée. Dans les tests existants, « ↶ Annuler » devient « Annuler la dernière action » et « ✕ Annuler » devient « Annuler » (l'écran de choix du joueur est affiché seul, sans la barre basse ni dialogue, donc le nom reste non ambigu).
- `Journal.test.tsx` : « Annuler la dernière action » sans « ↶ ».
- `Bandeau` (nouveau `Bandeau.test.tsx`) : à 9 fautes le voyant porte la classe `niveau-penalite` et le texte « 2 LF » ; à 7, `niveau-attention`.
- `App.test.tsx` / `Accueil` : avec un match en cours, la carte affiche le score et le bouton « Reprendre le match en cours » ; sans match, « Nouveau match » est le bouton principal (classe `btn-principal`).
- `format.test.ts` : inchangé (`pastillesFautes` reste).

### Bout en bout (Playwright)

- `match.spec.ts` : `'↶ Annuler'` → `'Annuler la dernière action'` ; ajout d'un tap sur « Possession GRADIGNAN » puis vérification de `aria-pressed` après rechargement de la page.
- Captures d'écran manuelles (tablette 1024 × 768, téléphone 390 × 844) de l'accueil, de la saisie et du choix joueur, comparées à la maquette avant de clore chaque écran.

### Recette manuelle

Sur un iPad ou une tablette Android dans un gymnase éclairé : lisibilité du score et du voyant de fautes à deux mètres, confort du thème clair, absence de scintillement des animations.

## 12. Hors périmètre

- Thème sombre ou bascule de thème.
- Retournement automatique de la flèche de possession.
- Changement de l'icône de l'application.
- Écrans non encore développés (stats, PDF, historique) : ils adopteront ce système de design quand ils seront construits.

# Choix du lieu, mode libre et format des périodes

**Date :** 2026-10-14
**Statut :** conception validée en conversation ; section 4 (lieu) implémentée le 2026-10-14, sections 5 et 6 (mode libre, format des périodes) reportées
**Spec parente :** `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`

## 1. Objectif

Trois retours d'usage sur la préparation d'un match :

- **Lieu** : choisir le lieu dans la liste des clubs UFOLEP 33 au lieu de le taper.
- **Mode libre** : pouvoir tenir un match hors championnat (entraînement, tournoi, amical), sans les règles UFOLEP et sans l'envoi de la feuille au comité en fin de match.
- **Format des périodes** : en mode libre, jouer en quarts-temps (4 × 8, 4 × 10, 4 × 15…) ou dans un autre découpage.

Critère de réussite : un bénévole crée un match libre en 4 × 10 dans une salle de la liste, le tient jusqu'au bout sans alerte UFOLEP hors sujet, et la table passe de quart-temps en quart-temps comme elle passe aujourd'hui de mi-temps en mi-temps.

## 2. Décisions de cadrage

| Sujet | Décision |
|---|---|
| Valeur du lieu | Texte « Club — Salle, Ville », plus une option « Autre lieu… » en saisie libre |
| Lieu dans les deux modes | Même sélecteur |
| Choix du mode | Bascule « Match UFOLEP / Match libre » en haut du formulaire de préparation, UFOLEP par défaut |
| Règles retirées en mode libre | Seuil de 8 fautes d'équipe, limite de 14 joueurs, avertissement « au moins 2 joueuses » |
| Règle conservée en mode libre | Alerte d'exclusion à 5 fautes personnelles |
| Format des périodes | Réglable **en mode libre uniquement** ; un match UFOLEP reste en 2 × 30 |
| Chronomètre | **Aucun.** La durée est affichée à titre indicatif ; la table passe toujours à la période suivante à la main |
| Fautes d'équipe et temps morts | Comptés par période (donc par quart-temps en 4 périodes), comme aujourd'hui par mi-temps |
| Mode et format après création | Figés : ni modifiables pendant le match ni à la réouverture |

## 3. Contraintes conservées

- Compatibilité des données : aucun match enregistré ne change de comportement, sans migration. Les nouveaux champs sont facultatifs et leur absence vaut « UFOLEP, 2 × 30 ».
- `versionFormat` reste à `1`. Le format d'équipe partagée (QR, lien, code) ne change pas.
- Le domaine (`src/domain/`) n'importe rien de l'interface. Les seuils restent dans `REGLES` ; les nouvelles constantes vivent dans `src/domain/config.ts`.
- Style de code du projet : guillemets simples, pas de points-virgules, identifiants en français.

## 4. Lieu

### 4.1 Liste des lieux

Nouveau fichier `src/domain/lieux.ts`, tiré du règlement 2025-2026 (pages 4 et 5). Il ne contient **que** le nom du club, la salle et la ville : aucun nom de responsable, téléphone ni e-mail (le PDF du règlement contient des coordonnées personnelles et ne doit pas être publié).

| Club | Salle | Ville |
|---|---|---|
| ESAL – Entente Sportive Audenge Lanton | Complexe sportif Christiane Ballion | Audenge |
| Basketball Barpais | Gymnase du collège du Barp | Le Barp |
| Biganos Basket Club | Salle des sports Robert Paul | Biganos |
| Carbon Blanc Basket | Salle Philippe Madrelle | Carbon-Blanc |
| C.A. Carignan | Salle municipale | Carignan |
| S.A. Gazinet-Cestas | Salle Raymond Subrenat, complexe du Bouzet | Cestas |
| Amicale des Basketteurs Gradignan | Salle Jehan Buhan | Gradignan |
| Les Petits Mousses Langoiran | Salle René Baillet | Langoiran |
| Basket Club de Marcheprime | Complexe sportif Émilie Andéol | Marcheprime |
| Marsas Basket Club | Gymnase Pierre Macrez | Marsas |
| Entente Pessac Basket Club | Salle du Haut Livrac | Pessac |
| Saint André Basket | Gymnase la Garosse | Saint-André-de-Cubzac |
| St Delphin | Complexe sportif Elisabeth Riffiod | Villenave-d'Ornon |
| Stade Bordelais | Salle Virginia | Bordeaux |
| U.S. Talence Basket Ball | Salle Jean Bouin | Talence |

« UFOLEP Bordeaux Maritime Métropole » est exclu : il n'accueille que du baby basket.

Une fonction pure `libelleLieu(lieu)` produit le texte enregistré : `St Delphin — Complexe sportif Elisabeth Riffiod, Villenave-d'Ornon`. Changer de saison revient à mettre à jour ce fichier.

### 4.2 Sélecteur

Dans `PreparationMatch`, le champ texte « Lieu » devient un `<select>` :

1. « — Choisir — » (valeur vide, par défaut) ;
2. les 15 lieux, triés par nom de club ;
3. « Autre lieu… », qui affiche dessous un champ texte libre.

`match.lieu` reste une chaîne : le libellé du lieu choisi, le texte saisi pour « Autre lieu… », ou une chaîne vide. Le lieu reste facultatif. Le sélecteur est identique en mode UFOLEP et en mode libre.

## 5. Mode libre

### 5.1 Données

```ts
export type ModeMatch = 'ufolep' | 'libre'

export interface Match {
  // …champs existants
  /** Absent sur les matchs créés avant son ajout : vaut 'ufolep'. */
  mode?: ModeMatch
}
```

Une fonction `modeDuMatch(match)` renvoie `match.mode ?? 'ufolep'` ; le code ne lit jamais `match.mode` directement.

`nouveauMatch` reçoit `mode` (et `format`, voir section 6) et les enregistre.

### 5.2 Règles selon le mode

| Règle | UFOLEP | Libre | Où |
|---|---|---|---|
| 14 joueurs maximum | Erreur bloquante | Pas de limite | `verifierEquipe`, `EditeurEquipe`, `DialogueSelection`, ajout en cours de match (`GestionJoueurs` → `ajouterJoueurAuMatch`) |
| Au moins 2 joueuses | Avertissement | Rien | `verifierEquipe` |
| Seuil de 8 fautes d'équipe | Voyant « n/8 » coloré, alerte « 2 lancers francs » | Compteur seul, sans « /8 » ni couleur, sans alerte | `niveauFautesEquipe`, `alertesActives`, `Bandeau` |
| Exclusion à 5 fautes perso | Alerte | Alerte | `alertesActives`, `niveauFautesJoueur` |
| N° de 0 à 99, n° unique, nom obligatoire | Erreur bloquante | Erreur bloquante | `verifierEquipe` |

`verifierEquipe(equipe, mode)` et `alertesActives(match, etat)` (qui lit le mode du match) portent la logique ; les composants passent le mode sans réimplémenter les règles.

### 5.3 Partage d'une équipe

Le format partagé (`src/roster-share/format.ts`) refuse plus de 14 joueurs et ne change pas. En mode libre, au-delà de 14 joueurs, le bouton « Partager cette équipe » est désactivé avec l'explication « Le partage est limité à 14 joueurs. »

### 5.4 Interface

- **Préparation** : bascule à deux options (« Match UFOLEP » / « Match libre ») en tête du bloc des informations du match, sur UFOLEP par défaut. Passer en libre fait apparaître le choix du format (section 6.3) ; revenir en UFOLEP le masque et rétablit 2 × 30.
- **Pastille « Libre »** sur la carte du match en cours de l'accueil et dans l'en-tête de l'écran de saisie. Un match UFOLEP n'a pas de pastille.

### 5.5 Fin de match

La génération du PDF et l'envoi au comité (spec parente, section 8) ne sont pas encore développés. Quand ils le seront, un match libre ne proposera **ni PDF officiel ni e-mail** vers `cd.33@ufolep.org` : l'écran de fin garde seulement le score final, « Rouvrir pour corriger » et « Accueil ». La spec parente sera annotée en ce sens lors de l'implémentation (section 9).

## 6. Format des périodes

### 6.1 Données

```ts
export interface FormatMatch {
  /** Nombre de périodes réglementaires, prolongations exclues. */
  periodes: number
  /** Durée indicative d'une période. */
  minutes: number
}

export interface Match {
  // …
  /** Absent sur les matchs créés avant son ajout : vaut 2 × 30. */
  format?: FormatMatch
}
```

Dans `config.ts` :

```ts
export const FORMAT_UFOLEP: FormatMatch = { periodes: 2, minutes: 30 }

export const FORMATS_LIBRES: readonly FormatMatch[] = [
  { periodes: 2, minutes: 30 },
  { periodes: 2, minutes: 20 },
  { periodes: 4, minutes: 8 },
  { periodes: 4, minutes: 10 },
  { periodes: 4, minutes: 12 },
  { periodes: 4, minutes: 15 },
]

export const FORMAT_PERSO = { periodesMin: 1, periodesMax: 6, minutesMin: 1, minutesMax: 60 }
```

`formatDuMatch(match)` renvoie `match.format ?? FORMAT_UFOLEP`. Un match UFOLEP est toujours créé avec `FORMAT_UFOLEP`.

### 6.2 Périodes

Le type `Periode` gagne les quarts-temps et périodes génériques :

```ts
export type Periode = 'MT1' | 'MT2' | `Q${number}` | `P${number}`
```

| Nombre de périodes | Identifiants | Libellés |
|---|---|---|
| 2 | `MT1`, `MT2` (inchangé) | « 1ère mi-temps », « 2ème mi-temps » |
| 4 | `Q1` … `Q4` | « 1er quart-temps » … « 4ème quart-temps » |
| 1 | `Q1` | « Période unique » |
| 3, 5, 6 | `Q1` … `Qn` | « 1ère période » … « nème période » |
| Prolongations | `P1`, `P2`… (inchangé) | « Prolongation », « Prolongation 2 »… |

Garder `MT1`/`MT2` pour tout format à 2 périodes laisse intacts les matchs existants, le futur PDF (qui ne connaît que les mi-temps) et les tests actuels.

Fonctions de `src/domain/periodes.ts`, qui reçoivent toutes le format :

- `premierePeriode(format)` : `MT1` ou `Q1`. `calculerEtat` part de cette période au lieu de `MT1` codé en dur.
- `periodeSuivante(periode, format)` : période réglementaire suivante, puis `P1`, `P2`…
- `choixFinPeriode(etat, format)` : `periodeSuivante` tant que la dernière période réglementaire n'est pas atteinte ; ensuite, en cas d'égalité, `prolongation` ou `finMatch`, sinon `finMatch` seul (règle actuelle).
- `libellePeriode(periode, format)` : libellé du tableau ci-dessus.
- Les tournures avec article sont produites par le domaine, pour ne pas les assembler dans les composants : « Fin de la 1ère mi-temps ? », « Fin du 2ème quart-temps ? », « Passer à la 2ème mi-temps », « Passer au 3ème quart-temps », « Passer à la 2ème période ».

`appliquerFinPeriode` (`commandes.ts`) utilise le format du match. Les compteurs par période de `calculerEtat` (points, fautes d'équipe, temps morts) sont déjà indexés par période : ils fonctionnent tels quels avec `Q1…Qn`.

### 6.3 Interface

- **Préparation, mode libre uniquement** : liste de formats « 2 × 30 min », « 2 × 20 min », « 4 × 8 min », « 4 × 10 min », « 4 × 12 min », « 4 × 15 min », « Personnalisé ». « 2 × 30 min » est présélectionné.
- **Personnalisé** : deux champs numériques, « Périodes » (1 à 6) et « Minutes » (1 à 60), entiers. Une valeur hors bornes bloque « Commencer le match » avec un message sous les champs, comme les erreurs d'équipe.
- **Bandeau et accueil** : libellé de la période suivi de la durée, « 2ème quart-temps · 10 min ». Pas de durée affichée pendant une prolongation.
- **Dialogue de fin de période** : titres et boutons produits par le domaine (section 6.2).
- **Journal** : « Début : 3ème quart-temps ».

## 7. Hors périmètre

- Chronomètre de jeu, compte à rebours ou rappel de fin de période. Les minuteurs d'arrêt de jeu (temps mort, pauses entre périodes) sont décrits dans `2026-10-14-minuteurs-pauses-design.md`, dont la section 7 complète cette spec (pause entre quarts-temps, mi-temps de 10 ou 5 min en mode libre).
- Durée des prolongations.
- Modifier le mode ou le format d'un match déjà créé.
- Liste de lieux modifiable dans l'app ou mise à jour automatique depuis le site de l'UFOLEP.
- Préremplissage du lieu d'après le club de l'équipe A.

## 8. Tests

- **Domaine** :
  - `verifierEquipe` dans les deux modes : 15 joueurs, 1 joueuse ;
  - `niveauFautesEquipe` et `alertesActives` en libre : 10 fautes d'équipe sans alerte, alerte d'exclusion à 5 fautes maintenue ;
  - périodes : enchaînement en 2, 4, 1 et 3 périodes, prolongation après la dernière période en cas d'égalité, libellés et tournures ;
  - `calculerEtat` d'un match en 4 périodes : fautes d'équipe remises à zéro à chaque quart-temps ;
  - `libelleLieu` ; compatibilité d'un match sans `mode` ni `format`.
- **Composants** : bascule de mode (affichage du format, retour à 2 × 30) ; sélecteur de lieu (club, « Autre lieu… », vide) ; format personnalisé hors bornes ; `mode`, `format` et `lieu` enregistrés ; pastille « Libre » ; bandeau sans « /8 » en libre ; partage désactivé au-delà de 14 joueurs.
- **Bout en bout** : match libre en 4 × 10 dans un lieu de la liste, joué du 1er au 4ème quart-temps puis terminé.

## 9. Documentation

- `docs/guide-utilisation.md` : préparation (lieu, mode, format) et saisie d'un match libre.
- Spec parente, section 8 : mention qu'un match libre ne produit ni PDF officiel ni e-mail au comité.

# Minuteurs de temps mort et de pause

**Date :** 2026-10-14
**Statut :** conception validée en conversation
**Spec parente :** `docs/superpowers/specs/2026-10-11-basket-score-sheet-design.md`
**Spec liée :** `docs/superpowers/specs/2026-10-14-lieu-mode-libre-design.md` (quarts-temps, à venir)

## 1. Objectif

Aider la table à tenir la durée des arrêts de jeu : à l'enregistrement d'un temps mort ou au passage à la période suivante, une popup affiche un compte à rebours de la durée de l'arrêt.

Critère de réussite : la table appuie sur « Temps mort », voit « 1:00 » décompter, entend un bip à 0:00 et ferme la popup pour reprendre la saisie.

## 2. Décisions de cadrage

| Sujet | Décision |
|---|---|
| Temps mort | Popup de 1 min à chaque temps mort enregistré |
| Mi-temps (UFOLEP) | Popup de 10 min au passage à la 2ème mi-temps |
| Avant une prolongation | Popup de 2 min |
| Entre deux quarts-temps | Popup de 2 min — **branchée avec le mode libre** (section 7) |
| Mi-temps en mode libre | 10 ou 5 min, au choix à la préparation — **branchée avec le mode libre** (section 7) |
| Fin du match | Pas de popup |
| Fermeture anticipée | Bouton « Fermer », disponible à tout moment |
| À 0:00 | Bip et vibration (une fois), la popup reste affichée sur « 0:00 » jusqu'à fermeture |
| Persistance | Aucune : le minuteur est un état d'écran. Recharger la page ou revenir à l'accueil le fait disparaître |

Le minuteur ne remplace pas le chronomètre de jeu, qui reste hors périmètre (spec liée, section 7) : il ne mesure que les arrêts.

## 3. Contraintes conservées

- Aucune donnée ajoutée à `Match` : pas de migration, `versionFormat` reste à `1`.
- Le domaine (`src/domain/`) n'importe rien de l'interface. Les durées vivent dans `src/domain/config.ts`.
- Style de code du projet : guillemets simples, pas de points-virgules, identifiants en français.

## 4. Domaine

### 4.1 Durées

Dans `config.ts` :

```ts
/** Durée des arrêts de jeu, en secondes. */
export const PAUSES = {
  tempsMort: 60,
  miTemps: 600,
  avantProlongation: 120,
} as const
```

`entreQuartsTemps` (120) et la mi-temps courte du mode libre (300) seront ajoutées avec le mode libre.

### 4.2 Pause avant une période

Dans `periodes.ts`, fonction pure :

```ts
export interface Pause {
  /** Titre de la popup. */
  titre: string
  secondes: number
}

/** Arrêt qui précède `periode`, ou null s'il n'y en a pas. */
export function pauseAvant(periode: Periode): Pause | null
```

| Période qui commence | Titre | Secondes |
|---|---|---|
| `MT1` | — | `null` |
| `MT2` | « Mi-temps » | `PAUSES.miTemps` |
| `P1`, `P2`… | « Avant la prolongation » | `PAUSES.avantProlongation` |

Le titre est produit par le domaine, comme les autres tournures de période (spec liée, section 6.2).

Le mode libre lui ajoutera un paramètre de format (section 7).

## 5. Interface

### 5.1 Composant `Minuteur`

`src/ui/saisie/Minuteur.tsx`, construit sur le `Dialogue` existant :

```ts
interface Props {
  titre: string
  /** Horodatage (ms) de fin du décompte. */
  fin: number
  onFermer: () => void
}
```

- Titre, puis le temps restant en grand au format `m:ss` (`1:00`, `10:00`, `0:07`), avec `role="timer"`.
- Le temps restant est recalculé toutes les 250 ms à partir de `fin - Date.now()`, arrondi à la seconde supérieure, borné à 0. Il ne dérive donc pas si l'onglet est ralenti.
- Au passage à 0 : un bip (Web Audio, oscillateur ~880 Hz pendant ~0,5 s, sans fichier son) et `navigator.vibrate?.([200, 100, 200])`, **une seule fois**. L'affichage reste sur `0:00` et le décompte s'arrête.
- Bouton « Fermer » (`btn btn-principal`).

Le signal sonore passe par un petit module `src/ui/commun/signal.ts` :

- `preparerSon()` crée ou relance l'`AudioContext`. Elle est appelée **dans le geste** qui ouvre la popup (tap sur « Temps mort » ou sur un choix de fin de période), sinon Safari iOS bloque le son ;
- `emettreSignal()` joue le bip et déclenche la vibration ;
- les deux fonctions ne lèvent jamais d'erreur (API absente, contexte refusé) : le minuteur fonctionne sans son.

### 5.2 `EcranMatch`

Nouvel état local `minuteur: { titre: string; fin: number } | null`.

| Déclencheur | Titre | Durée |
|---|---|---|
| Temps mort de l'équipe X | « Temps mort — X » (nom de l'équipe) | `PAUSES.tempsMort` |
| Choix `periodeSuivante` ou `prolongation` | `pauseAvant(nouvelle période).titre` | `pauseAvant(nouvelle période).secondes` |
| Choix `finMatch` | — | pas de popup |

- Un nouveau déclencheur pendant un minuteur le remplace.
- Le minuteur est affiché par-dessus l'écran d'action ; une fois fermé, la saisie reprend normalement (y compris « Annuler » la dernière action).
- Le minuteur disparaît si l'écran est quitté (accueil, rechargement).

## 6. Tests

- **Domaine** : `pauseAvant('MT1')` → `null`, `MT2` → « Mi-temps », 600 s, `P1` et `P2` → « Avant la prolongation », 120 s.
- **`Minuteur`** (horloge simulée de Vitest, `signal.ts` simulé) : affichage initial `1:00`, décompte, `0:00` figé après l'échéance, `emettreSignal` appelé une seule fois, `onFermer` au clic.
- **`EcranMatch`** : popup « Temps mort — ST DELPHIN » à `1:00` après un temps mort ; « Mi-temps » à `10:00` après « Passer à la 2ème mi-temps » ; « Avant la prolongation » à `2:00` après « Jouer une prolongation » ; aucune popup après « Terminer le match » ; « Fermer » fait disparaître la popup.

## 7. Avenant à la spec mode libre

Lors de l'implémentation du mode libre et du format des périodes :

- `PAUSES` gagne `entreQuartsTemps: 120` et `miTempsCourte: 300`.
- `FormatMatch` gagne un champ facultatif `pauseMiTemps` (secondes, 600 ou 300), choisi à la préparation en mode libre (« Mi-temps : 10 min / 5 min », 10 min par défaut). Un match UFOLEP a toujours 10 min. Absent, il vaut 600.
- `pauseAvant(periode, format)` :
  - format à 4 périodes : avant `Q2` et `Q4` → `entreQuartsTemps` ; avant `Q3` → `pauseMiTemps` ;
  - format à 2 périodes : avant `MT2` → `pauseMiTemps` ;
  - autres formats (1, 3, 5, 6 périodes) : `entreQuartsTemps` entre deux périodes ;
  - avant une prolongation : `avantProlongation`.
- Titre de la popup : « Mi-temps » pour la pause de mi-temps, « Pause » entre deux autres périodes.

## 8. Documentation

`docs/guide-utilisation.md` : décrire la popup du temps mort, celle de la mi-temps et celle d'avant prolongation (bip, vibration, bouton « Fermer »).

# Table de marque numérique — Basket loisir UFOLEP 33

**Date :** 2026-10-11
**Statut :** spec validée en conversation, en attente de relecture écrite

## 1. Objectif

Remplacer la feuille de match papier du basket loisir UFOLEP 33 par une application utilisable à la table de marque sur tablette, téléphone ou ordinateur. L'application saisit le match en direct (paniers, fautes, temps morts), affiche des stats, et produit en fin de match un **PDF fidèle à la feuille officielle** à envoyer au comité départemental (cd.33@ufolep.org).

**Utilisateurs :** les bénévoles de table de marque de **tous les clubs UFOLEP 33**, de profils variés, sans formation préalable.

**Critère de réussite :** un bénévole qui découvre l'application tient la table d'un match complet sans papier et envoie un PDF accepté par le comité comme feuille officielle.

**Point de vigilance hors technique :** confirmer auprès du comité UFOLEP 33 qu'une feuille générée numériquement (sans signature manuscrite) est acceptée.

## 2. Périmètre

### Inclus

- Pool de licenciés par club, alimenté par import de l'export Webaffiligue ou saisie manuelle.
- Constitution de l'équipe de chaque match à partir du pool (joueurs, n° de maillot, coach).
- Partage d'une équipe de match par QR code (ou lien/code) d'un appareil à l'autre ; import possible pour les deux équipes.
- Saisie en direct : paniers 1/2/3 pts, fautes (joueurs et coach), temps morts, périodes (2 mi-temps + prolongations).
- Annulation et correction de toute action.
- Application des règles UFOLEP sous forme d'avertissements (jamais de blocage).
- Stats : points par joueur, fautes et temps morts, évolution du score.
- Génération du PDF de la feuille officielle et partage.
- Historique des matchs, export/import de sauvegarde.
- Fonctionnement entièrement hors ligne.

### Exclus (décisions explicites)

- **Chronomètre** : il reste sur le tableau de la salle. L'app ne connaît que la période en cours.
- **Synchronisation multi-appareils** : un seul appareil saisit pendant le match.
- **Serveur, comptes utilisateurs, base de données distante.**
- **Signatures manuscrites** : seuls les noms des officiels sont saisis, tous facultatifs.
- **Tirs manqués / pourcentages de réussite.**
- **Noms des joueurs à l'écran de saisie** : seuls les n° sont affichés.
- **Publication sur les stores** (possible plus tard via Capacitor, non prévu).
- Langue autre que le français.

## 3. Règles UFOLEP prises en compte

Source : règlement Basket loisir UFOLEP 33, saison 2025-2026.

| Règle | Comportement de l'app |
|---|---|
| 2 mi-temps de 30 min, chrono courant | Périodes MT1, MT2 ; pas de chrono |
| Prolongation si match nul et accord des équipes | Proposée à la fin de MT2 en cas d'égalité ; plusieurs prolongations possibles |
| Au-delà de 5 fautes personnelles, le joueur sort | Alerte à la 5e faute ; tuile grisée pour les paniers ; une faute reste saisissable |
| 8 fautes d'équipe par mi-temps max, au-delà 2 LF | Compteur par période ; orange à 7 ; bandeau « au-delà de 8 : 2 lancers francs » dès la 8e |
| Fautes d'équipe en prolongation | Compteur remis à zéro au début de chaque prolongation, même seuil de 8 |
| Fautes du coach | Comptent dans les fautes d'équipe |
| Temps morts | Comptés par période, **sans limite** |
| ≥ 2 féminines sur le terrain | Non contrôlé pendant le jeu (changements à la volée non saisis). Avertissement à la constitution de l'équipe si moins de 2 joueuses sélectionnées (civilité issue de l'import) |

Les seuils (5, 8, nombre de lignes de la feuille) sont regroupés dans une configuration unique du domaine.

## 4. Architecture

### Choix technique

**Application web installable (PWA)**, hébergée en statique gratuit (GitHub Pages ou Netlify), sans backend.

- TypeScript, React, Vite
- `vite-plugin-pwa` : service worker, cache hors ligne, installation sur l'écran d'accueil
- Dexie (IndexedDB) : stockage local
- pdf-lib : remplissage de la feuille officielle côté appareil
- Génération et lecture de QR code : librairies JS compatibles Safari iOS (l'API `BarcodeDetector` n'y est pas disponible). Choix précis fait dans le plan.
- Compression du contenu des QR : fflate (ou équivalent)
- Graphe d'évolution du score : SVG fait main (pas de dépendance de graphes)
- Tests : Vitest (unitaires), Playwright (bout en bout)

Alternatives écartées : application native React Native/Flutter (coût des stores, validation, ordinateur mal couvert, diffusion plus difficile auprès de bénévoles).

### Principe central : le match est un journal d'événements

Le match stocke la **liste ordonnée des événements**. Le score, la marque courante, les fautes, les temps morts, les stats et le contenu du PDF sont **calculés** à partir de ce journal par des fonctions pures.

Conséquences :
- Annuler = retirer le dernier événement.
- Corriger = modifier ou supprimer un événement ; tout se recalcule de façon cohérente.
- Chaque événement est persisté à la saisie : aucune perte en cas de fermeture.
- Les règles sont testables sans interface.

### Modules

| Module | Rôle | Dépend de |
|---|---|---|
| `domain/` | Types, calcul de l'état à partir du journal, règles UFOLEP, stats. Pur TypeScript, sans UI ni stockage. | — |
| `storage/` | Persistance Dexie (clubs, licenciés, matchs), export/import de sauvegarde, migrations de schéma. | `domain` |
| `webaffiligue/` | Lecture de l'export CSV Webaffiligue vers des licenciés. | `domain` |
| `roster-share/` | Équipe de match ↔ format compact versionné ↔ QR / lien / code. | `domain` |
| `pdf/` | État du match → feuille officielle remplie (gabarit de coordonnées + PDF vierge embarqué). | `domain` |
| `ui/` | Écrans React ; lisent l'état calculé et ajoutent des événements. | tous |

## 5. Modèle de données

### Stocké durablement

**Club**
- `id`
- `numeroAssociation` (optionnel, issu de Webaffiligue, sert au rapprochement lors d'un réimport)
- `nom`
- `couleurParDefaut` (optionnel)

**Licencié** (pool d'un club)
- `id`, `clubId`
- `licence` (ex. `033_00000101`, `ZZ00000004`) — clé de rapprochement à l'import
- `civilite` : `M` | `Mme` | inconnu
- `nom`, `prenom`
- `typeLicence` (optionnel, ex. Compétition / Loisirs)

**Match**
- `id`, `versionFormat`
- `date`, `lieu`
- `statut` : `en_cours` | `termine`
- `equipes` : `{ A: EquipeMatch, B: EquipeMatch }`
- `officiels` : `chronometreur`, `operateur30s`, `marqueur`, `arbitre`, `aideArbitre`, `capitaineA`, `capitaineB` — chaînes libres, toutes facultatives (capitaines sélectionnables parmi les joueurs)
- `evenements` : `Evenement[]`
- `creeLe`, `modifieLe`

### Copié dans le match (figé)

**EquipeMatch**
- `nom`, `couleur`
- `joueurs` : `JoueurMatch[]` (14 au maximum, nombre de lignes de la feuille)
- `coach` : référence à un `JoueurMatch` **ou** nom libre (personne hors effectif)

**JoueurMatch**
- `id` (propre au match)
- `licence`, `nom`, `prenom`, `civilite` (copiés du pool ou saisis)
- `numero` (n° de maillot, attribué au début du match, modifiable)

La copie garantit que modifier le pool plus tard ne change ni l'historique ni les PDF.

### Événements

Chaque événement a un `id` et un ordre (position dans le journal).

| Type | Données |
|---|---|
| `panier` | `equipe` (A/B), `joueurId`, `valeur` (1, 2 ou 3) |
| `faute` | `equipe`, `cible` : `joueurId` ou `coach` |
| `tempsMort` | `equipe` |
| `debutPeriode` | `periode` : `MT2` ou `P1`, `P2`… (MT1 est implicite au début du journal) |
| `finMatch` | — |

L'ajout d'un joueur retardataire et le changement de n° en cours de match modifient directement l'`EquipeMatch` copiée dans le match (pas d'événement) : les événements référencent les joueurs par `joueurId`, donc les stats suivent, et la feuille affiche les n° définitifs.

### Calculé (non stocké)

- Score par équipe, total et par période
- Marque courante : pour chaque point de 1 à N, l'équipe, le n° du joueur, et si la case est « atteinte » (n° écrit) ou « sautée » (barrée)
- Fautes perso par joueur, fautes du coach, fautes d'équipe par période
- Temps morts par équipe et par période
- Stats joueurs et équipes, séries, écart maximum
- Avertissements actifs (5 fautes, seuil des 8 fautes d'équipe, moins de 2 joueuses)

## 6. Licenciés et équipes

### Import Webaffiligue

Format constaté sur l'export « Sortie simple » (fichier exemple `Sortie_simple_Ufolep.csv`) :
- encodage **ISO-8859-1 / Windows-1252**, séparateur `;`, fins de ligne `\n`
- valeurs encapsulées façon formule Excel : `"=""valeur"""` ; certaines valeurs nues (`Oui`) ; champs vides possibles
- colonnes utilisées : `N° Association`, `Nom association`, `Type licence`, `N° Adherent` (= licence), `Civilite`, `Nom`, `Prénom`
- autres colonnes ignorées (Activité, date de naissance, âge, tranche d'âge, homologation, rôles, risque, motif de rejet)

Comportement :
1. L'utilisateur choisit le fichier.
2. L'app décode, retire l'encapsulation `="…"`, repère les colonnes **par leur intitulé** (pas par leur position).
3. Le club est créé ou retrouvé via `N° Association`.
4. Aperçu des licenciés ; rapprochement par n° de licence : nouveaux ajoutés, existants mis à jour, aucun doublon.
5. Lignes sans licence ignorées avec un compte-rendu (« 2 lignes ignorées »).
6. Un fichier non reconnu (colonnes absentes) donne un message clair, sans import partiel.

La saisie manuelle d'un licencié reste possible (essai, licence en cours).

### Constitution de l'équipe de match

Au début du match, pour chaque équipe (A et B) :
- **Depuis un club enregistré** : choix des joueurs dans le pool (14 max), puis attribution des n° de maillot.
- **Depuis un QR / lien / code** : l'équipe arrive déjà constituée.
- Désignation du **coach** : un joueur sélectionné ou un nom libre.
- Couleur de maillot (pré-remplie depuis le club).
- Contrôles : n° de maillot en double interdit ; avertissement si moins de 2 joueuses.

### Partage d'une équipe de match (QR)

- Depuis l'écran d'équipe de match, « Partager » affiche un **QR code** et propose un **lien** et un **code à copier**.
- Contenu : club, couleur, coach, joueurs sélectionnés (licence, nom, prénom, civilité, n° s'ils sont attribués). JSON compact, compressé, encodé en base64url, avec un **numéro de version de format**.
- Le QR contient une URL de l'app portant le contenu dans le fragment (`#equipe=…`) : scanné par l'appareil photo natif, il ouvre l'app.
- Dans l'app, « Importer une équipe » propose : **scanner** (caméra), **coller** un lien ou un code, **choisir un fichier**.
- Aperçu avant validation. Les n° restent modifiables par la table.
- Cas iOS : un lien ouvert depuis l'extérieur s'ouvre dans Safari et non dans l'app installée (stockages séparés). La page affiche alors l'aperçu de l'équipe et un bouton « Copier le code » à coller dans l'app. Le scanner intégré est le chemin principal.
- Contrainte : l'équipe maximale (14 joueurs, noms accentués) doit tenir dans un QR lisible par une caméra de téléphone à distance de table ; vérifié par test.

## 7. Écrans

1. **Accueil** : match en cours (reprendre), nouveau match, historique, clubs et licenciés, importer une équipe, sauvegarde, aide à l'installation, match de démonstration.
2. **Clubs et licenciés** : liste des clubs, pool de chaque club, import Webaffiligue, ajout/modification/suppression d'un licencié.
3. **Préparation du match** : date, lieu ; équipe A et équipe B (depuis un club ou par import QR) ; sélection des joueurs, n°, coach ; bouton « Partager cette équipe ».
4. **Saisie — écran action** (validé en maquette, option B) :
   - Bandeau : nom des équipes, score, période en cours, temps morts et fautes d'équipe par équipe (orange à 7, alerte dès 8).
   - Pour chaque équipe : gros boutons **+1, +2, +3, F**, et **Temps mort**.
   - Barre basse : **Annuler**, **Journal**, **Stats**, **Fin de période**.
   - Rappel de la dernière action enregistrée.
5. **Saisie — écran « quel joueur ? »** (plein écran, après +1/+2/+3/F) :
   - Bandeau rappelant l'action et l'équipe, bouton **✕ Annuler** (retour sans enregistrer).
   - Tuiles triées par **n° croissant** : n° en grand, fautes perso (●), total de points. **Pas de nom.**
   - Tuile encadrée à 4 fautes, grisée à 5 (non sélectionnable pour un panier, sélectionnable pour une faute).
   - Tuile **Coach**, uniquement pour une faute.
   - Un tap enregistre l'action et revient à l'écran action.
6. **Journal** : liste des actions (période, score après l'action, équipe, n°, type). Modifier une action (joueur, valeur, équipe) ou la supprimer. Ajouter un joueur en cours de match, changer un n°.
7. **Stats** (pendant et après le match) : voir § 9.
8. **Fin de match** : noms des officiels et capitaines (facultatifs), génération et partage du PDF.
9. **Historique** : matchs (date, équipes, score, statut) ; ouvrir les stats, régénérer/partager le PDF, rouvrir pour corriger, supprimer.

Téléphone en portrait : même logique, les deux blocs d'équipe empilés sur l'écran action ; tuiles joueurs en grille adaptée.

### Périodes

- « Fin de période » demande confirmation.
- Fin de MT1 → MT2.
- Fin de MT2 ou d'une prolongation : si égalité, choix « Prolongation » ou « Terminer le match » ; sinon « Terminer le match ».
- Un match terminé peut être rouvert pour correction (retrait de l'événement `finMatch`).

### Principes d'interface

- Français uniquement, gros boutons, fort contraste.
- L'app **avertit, ne bloque jamais** une saisie d'action (sauf incohérence technique comme un n° en double).
- Confirmation uniquement pour les gestes structurants : fin de période, fin de match, suppression d'un match ou d'un licencié.

## 8. PDF de la feuille officielle

### Principe

Le PDF vierge officiel (`feuille_match_basketball.pdf`, saison 2025-2026) est embarqué dans l'app. pdf-lib écrit par-dessus aux coordonnées définies dans **un fichier de gabarit unique**. Un changement de modèle se traite en remplaçant le PDF et en ajustant ce gabarit.

### Remplissage

| Zone de la feuille | Contenu |
|---|---|
| Équipe A / B, Couleur | Nom et couleur de l'équipe |
| Tableau joueurs (14 lignes) | N° licence, nom, prénom, n°, triés par n° croissant |
| Ligne « Manager » | Nom du coach ; ses fautes dans les cases de la ligne |
| Cases fautes (5 par ligne) | Une **croix X** par faute, dans l'ordre |
| Grilles numérotées 1→8 (une ligne par mi-temps) | **Fautes d'équipe** : case suivante barrée à chaque faute ; « +N » à côté au-delà de 8 |
| Carré 2×2 (une ligne par mi-temps) | **Nombre** de temps morts pris dans la mi-temps |
| Marque courante PTS / N° (1→100) | N° du joueur écrit en face du score atteint ; cases sautées (paniers à 2 ou 3 pts) barrées |
| Au-delà de 100 points | 2e page sur le même modèle, marque courante 101→200 |
| 1ère mi-temps | Points marqués en MT1 par chaque équipe |
| 2ème mi-temps | Points marqués **pendant** MT2 (pas le cumul) |
| Score final | Total, prolongations incluses |
| Prolongation(s) | Mention à côté du tableau : « dont prolongation : X–Y », « Prol. : fautes éq. A x / B y, TM A x / B y » |
| Chronométreur, Opérateur 30", Arbitre, Marqueur, Aide arbitre, Capitaines, Date, Lieu | Valeurs saisies, cases laissées vides sinon |

### Partage

- Téléphone / tablette : menu de partage natif (Web Share API avec fichier) : mail, WhatsApp, Drive…
- Ordinateur (ou si le partage de fichier n'est pas disponible) : téléchargement du PDF et lien mail pré-rempli vers `cd.33@ufolep.org` (objet : équipes et date) ; la pièce jointe est ajoutée à la main.
- Nom de fichier : `AAAA-MM-JJ_EquipeA-EquipeB.pdf`.

## 9. Stats

Calculées depuis le journal, sans saisie supplémentaire.

- **Par joueur** : points totaux ; détail LF (1 pt) / 2 pts / 3 pts ; répartition MT1 / MT2 / prolongation ; fautes perso.
- **Par équipe** : points par période ; fautes d'équipe et temps morts par période.
- **Évolution du score** : courbe de l'écart en fonction du n° d'action (pas de temps) ; **séries** (ex. « 10–0 pour Gradignan ») ; **écart maximum** de chaque équipe.

## 10. Stockage, sauvegarde et mises à jour

- Tout est stocké sur l'appareil (IndexedDB via Dexie). Aucune donnée ne quitte l'appareil hors partage explicite (QR, lien, PDF, fichier de sauvegarde).
- **Export de sauvegarde** : un fichier JSON unique (clubs, licenciés, matchs) avec version de format. **Import** sur le même appareil ou un autre (fusion par identifiants ; en cas de conflit, l'élément le plus récemment modifié l'emporte).
- **Rappel de sauvegarde** discret si des matchs existent et qu'aucune sauvegarde n'a été faite depuis plus de 30 jours (protection contre l'effacement des données de site par Safari).
- **Migrations** : le schéma de stockage, le format QR et le format de sauvegarde sont versionnés ; une nouvelle version de l'app relit les anciennes données.
- **Mises à jour de l'app** : téléchargées en arrière-plan, appliquées seulement sur action de l'utilisateur via un bandeau « Nouvelle version disponible », **jamais affiché pendant un match en cours**.

## 11. Gestion des erreurs

| Situation | Comportement |
|---|---|
| Fichier Webaffiligue non reconnu | Message explicite (colonnes attendues), aucun import |
| QR illisible / code corrompu / version inconnue | Message « code non reconnu » ; proposer coller un code ou fichier |
| Caméra refusée ou absente | Explication + alternatives (coller un code, fichier) |
| Stockage plein ou en échec d'écriture | Alerte bloquante visible ; inviter à exporter une sauvegarde |
| Partage de fichier indisponible | Repli sur téléchargement |
| Fermeture de l'app pendant un match | Reprise automatique au match en cours à la réouverture |

## 12. Tests

- **Domaine (Vitest)** : score et marque courante (cases atteintes/sautées) ; fautes perso, fautes du coach, fautes d'équipe par période et remise à zéro en prolongation ; temps morts ; effets d'annulation et de correction ; stats, séries, écart max ; avertissements. Un **match de référence complet** rejoué événement par événement avec résultat attendu.
- **Webaffiligue** : parsing du fichier exemple (encodage, encapsulation `="…"`, colonnes par intitulé), réimport sans doublon, fichier invalide.
- **roster-share** : aller-retour encodage/décodage identique ; taille du QR pour 14 joueurs aux noms accentués ; lecture d'un format de version antérieure ; code corrompu.
- **PDF** : génération du match de référence et comparaison visuelle à une image de référence ; cas > 100 points ; cas prolongation. Vérification manuelle de l'alignement par impression.
- **Bout en bout (Playwright)**, formats téléphone, tablette, ordinateur : import Webaffiligue → préparation du match → saisie → annulation et correction → fin de match → PDF.
- **Recette manuelle sur appareils réels** (au moins un iPhone/iPad et un Android) : installation, mode avion, scan QR, partage du PDF.

## 13. Ressources du dépôt

- `feuille_match_basketball.pdf` : feuille officielle vierge, devient un asset de l'app.
- `Sortie_simple_Ufolep.csv` : export Webaffiligue anonymisé, devient une fixture de test.
- `Reglement Calendrier Adressier BASKET UFOLPE 2025-2026.pdf` : référence réglementaire (contient des coordonnées personnelles de responsables de clubs ; à ne pas publier si le dépôt devient public).

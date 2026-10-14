# Table de marque — Guide d'utilisation

Feuille de match numérique du **basket loisir UFOLEP 33**. L'application remplace la feuille papier à la table de marque : score, fautes personnelles et d'équipe, temps morts, périodes, flèche de possession.

Elle fonctionne sur téléphone et sur tablette, **sans connexion internet** une fois installée.

---

## Sommaire

1. [Installer l'application](#1-installer-lapplication)
2. [Première utilisation : préparer son club](#2-première-utilisation--préparer-son-club)
3. [Préparer un match](#3-préparer-un-match)
4. [Tenir la table de marque](#4-tenir-la-table-de-marque)
5. [Corriger une erreur : le journal](#5-corriger-une-erreur--le-journal)
6. [Fin de période et fin de match](#6-fin-de-période-et-fin-de-match)
7. [Partager une équipe avant le match](#7-partager-une-équipe-avant-le-match)
8. [Mettre à jour les licenciés en cours de saison](#8-mettre-à-jour-les-licenciés-en-cours-de-saison)
9. [Bon à savoir](#9-bon-à-savoir)

---

## 1. Installer l'application

<!--
  Le QR code est généré par « npm run guide » à partir de l'adresse ci-dessous :
  modifier l'adresse ici puis relancer la commande suffit.
-->

<p align="center"><img src="images/qrcode-application.png" alt="QR code de la Table de marque" width="220"></p>

<p align="center">Adresse : <a href="https://alicework.github.io/table-de-marque/">https://alicework.github.io/table-de-marque/</a></p>

Scannez le QR code avec l'appareil photo du téléphone ou de la tablette, ou saisissez l'adresse dans le navigateur. Installez ensuite l'application sur l'écran d'accueil :

| Appareil | Navigateur | Installation |
| --- | --- | --- |
| iPhone / iPad | Safari | Bouton **Partager** → **Sur l'écran d'accueil** |
| Android | Chrome | Menu **⋮** → **Installer l'application** (ou **Ajouter à l'écran d'accueil**) |

La première ouverture demande une connexion internet. Une fois installée, l'application s'ouvre comme une application classique, en plein écran, et **fonctionne hors connexion** : le gymnase n'a pas besoin de réseau.

> **Mises à jour** — Quand une nouvelle version est disponible, un bandeau **« Nouvelle version disponible »** apparaît sur l'écran d'accueil. Touchez **Recharger**. Ce bandeau ne s'affiche jamais pendant un match.

---

## 2. Première utilisation : préparer son club

Avant le premier match, enregistrez une fois pour toutes votre club et ses licenciés. Vous pourrez ensuite composer chaque équipe en cochant des noms, sans rien ressaisir.

Deux possibilités :

- **Recommandé** : importer l'export LiguAsso (tous les licenciés d'un coup) ;
- créer le club et ses licenciés à la main.

### 2.1 Récupérer l'export LiguAsso

1. Connectez-vous à **LiguAsso** avec le compte de l'association.
2. Ouvrez le menu **Statistiques et Extractions** → **Extractions** → **Extraction adhérents**.
   Si le menu ne s'ouvre pas (cas de Firefox), utilisez le lien direct : [Extraction adhérents sur LiguAsso](https://www.liguasso.org/LAPOOL5/Pages/Private/Extractions/AdhExtract.aspx). Il est aussi proposé dans l'application, sur l'écran **Clubs et licenciés** (bouton **Ouvrir l'extraction des adhérents**).
3. Exportez la liste des adhérents au format **CSV**.
4. Enregistrez le fichier sur l'appareil qui servira de table de marque (téléchargement, e-mail, cloud…).

Le fichier doit contenir au minimum les colonnes suivantes (c'est le cas de l'export standard) :

| Colonne | Utilisation |
| --- | --- |
| N° Adherent | N° de licence (sert à reconnaître le licencié lors d'un réimport) |
| Nom, Prénom | Identité du joueur |
| Civilite | F / H (contrôle du nombre de joueuses) |
| N° Association, Nom association | Rattachement au club |
| Type licence | Facultatif, conservé pour information |

> Un fichier ré-enregistré avec Excel est également accepté.

### 2.2 Importer l'export

1. Sur l'accueil, touchez **Clubs et licenciés**.
2. Touchez **Importer un export LiguAsso** et choisissez le fichier CSV.
3. Un aperçu s'affiche, club par club : par exemple *« Mon Club (nouveau club) : 18 nouveaux, 0 mis à jour, 0 inchangé »*.
   Les lignes sans n° de licence sont ignorées et signalées.
4. Touchez **Importer**, puis **OK**.

Le club apparaît dans la liste avec son nombre de licenciés. Si l'export contient plusieurs associations, chacune devient un club.

### 2.3 Compléter la fiche du club

Touchez le nom du club pour ouvrir sa fiche :

- **Modifier le club** : renseignez la **couleur par défaut** (couleur des maillots). Elle sera reprise automatiquement à chaque match.
- **Ajouter un licencié** : pour un joueur absent de l'export (essai, licence en cours…). Seul le nom est obligatoire ; le n° de licence peut rester vide.
- **Modifier** / **Supprimer** sur chaque ligne pour corriger un licencié.

### 2.4 Variante : créer un club à la main

Sans accès à LiguAsso :

1. **Clubs et licenciés** → **Nouveau club**.
2. Saisissez le **nom du club** (obligatoire) et la **couleur par défaut**, puis **Enregistrer**.
3. Ouvrez le club et ajoutez chaque joueur avec **Ajouter un licencié** (licence, nom, prénom, F/H).

> Vous pourrez importer un export LiguAsso plus tard : un club créé à la main n'ayant pas de n° d'association, l'import créera un second club. Supprimez alors le club saisi à la main.

### 2.5 Clubs adverses

Rien n'oblige à enregistrer les clubs adverses. Le jour du match, l'équipe adverse peut être :

- saisie directement dans **Nouveau match** (mode « Saisie libre ») ;
- ou reçue par QR code depuis le téléphone de son coach (voir [section 7](#7-partager-une-équipe-avant-le-match)).

---

## 3. Préparer un match

Sur l'accueil, touchez **Nouveau match**.

1. Vérifiez la **date** (aujourd'hui par défaut) et indiquez le **lieu**.
2. Pour l'**équipe A**, puis l'**équipe B** :
  - **Club** : choisissez votre club dans la liste. Le nom d'équipe et la couleur se remplissent tout seuls (modifiables). Pour une équipe non enregistrée, laissez **Saisie libre**.
  - **Choisir les joueurs du club** : cochez les présents (recherche par nom ou n° de licence), puis **Valider**.
  - Renseignez le **n° de maillot** de chaque joueur (0 à 99).
  - **Ajouter un joueur** pour une ligne saisie à la main, **✕** pour retirer une ligne.
  - **Coach** : aucun, un des joueurs, ou **Autre personne…** (saisir son nom).
  - Autre possibilité : **Importer une équipe (QR / code)** pour récupérer une équipe partagée.
3. Touchez **Commencer le match**.

L'application vérifie la feuille avant de démarrer :

| Bloquant (le match ne démarre pas) | Simple avertissement |
| --- | --- |
| Nom d'équipe manquant | Moins de **2 joueuses** dans l'équipe |
| Aucun joueur |  |
| Plus de **14 joueurs** |  |
| N° de maillot manquant, invalide ou en double |  |
| Nom de joueur manquant |  |

---

## 4. Tenir la table de marque

### L'écran de saisie

- **En haut, le bandeau** : score, période en cours et, pour chaque équipe, les **fautes d'équipe** de la période (`x/8`) et les **temps morts** (`TM`).
- **Flèche de possession** : touchez le nom de l'équipe qui bénéficiera de la prochaine possession alternée.
- **Un bloc par équipe** avec les boutons **+1**, **+2**, **+3**, **F** (faute) et **Temps mort**.
- **Dernière action** : rappel de la dernière saisie et du score à ce moment-là.

### Enregistrer un panier ou une faute

1. Touchez **+1**, **+2**, **+3** ou **F** dans le bloc de l'équipe concernée.
2. Touchez la tuile du **n° du joueur**. Chaque tuile affiche ses fautes (pastilles) et ses points.
3. L'action est enregistrée et l'écran revient à la saisie.

Pour une faute technique du banc, choisissez la tuile **Coach**. Le bouton **Annuler** en haut abandonne la saisie en cours.

**Temps mort** s'enregistre en un seul appui et ouvre un compte à rebours d'**1 minute**.

> Un double appui involontaire n'enregistre qu'une seule action.

### Comptes à rebours des arrêts de jeu

Une fenêtre affiche le temps restant de l'arrêt :

| Arrêt | Durée |
| --- | --- |
| Temps mort | 1 min |
| Mi-temps (passage à la 2ème mi-temps) | 10 min |
| Avant une prolongation | 2 min |

À 0:00, l'application émet un bip et fait vibrer le téléphone (si l'appareil le permet), puis reste sur 0:00. Touchez **Fermer** pour reprendre la saisie, à tout moment.

> Le compte à rebours n'est pas enregistré : il disparaît si vous revenez à l'accueil ou rechargez la page.

### Alertes automatiques

| Situation | Ce que fait l'application |
| --- | --- |
| Joueur à 4 fautes | Sa tuile est entourée d'un cadre ambré |
| Joueur à 5 fautes | Alerte « doit sortir », tuile grisée : il ne peut plus marquer (une faute reste enregistrable) |
| 7 fautes d'équipe dans la période | Compteur surligné en ambre |
| 8 fautes d'équipe | Compteur plein ambre + alerte : au-delà, 2 lancers francs |
| 9ᵉ faute d'équipe et suivantes | Compteur en rouge avec la mention **2 LF** |

Les fautes d'équipe et les temps morts repartent à zéro à chaque période.

### Barre du bas

- **Annuler** : supprime la dernière action enregistrée.
- **Journal** : historique complet et corrections (voir ci-dessous).
- **Fin de période** : clôture la mi-temps ou le match.
- **Accueil** : quitte l'écran sans rien perdre ; le match se reprend depuis l'accueil.

---

## 5. Corriger une erreur : le journal

Touchez **Journal** dans la barre du bas.

- Les actions sont listées de la plus récente à la plus ancienne, avec la période et le score.
- **Modifier** : changer l'équipe, le joueur ou la valeur d'un panier.
- **Supprimer** : retirer une action (confirmation demandée).
- **Annuler la dernière action** : même effet que le bouton de l'écran de saisie.

Le score, les fautes et les alertes sont recalculés immédiatement.

En bas du journal, la gestion des joueurs permet, en cours de match :

- **Changer le n°** d'un joueur (maillot échangé) ;
- **Ajouter un joueur** arrivé en retard.

Touchez **Retour au match** pour revenir à la saisie.

---

## 6. Fin de période et fin de match

Touchez **Fin de période** :

- à la fin de la 1ʳᵉ mi-temps : **Passer à la 2ème mi-temps** ;
- à la fin de la 2ᵉ mi-temps : **Terminer le match**, ou, en cas d'égalité, **Jouer une prolongation** (si les deux équipes sont d'accord).

Passer à la 2ème mi-temps ouvre le compte à rebours de la mi-temps (10 min), jouer une prolongation celui de 2 min.

L'écran **Match terminé** affiche le score final.

- **Rouvrir pour corriger** permet de revenir sur une erreur constatée après coup.
- **Accueil** revient à l'écran principal.

---

## 7. Partager une équipe avant le match

Pour gagner du temps à la table de marque, chaque coach peut préparer son équipe sur son propre téléphone et la transmettre par QR code.

**Sur le téléphone du coach**

1. Accueil → **Partager une équipe**.
2. Choisissez le club, cochez les joueurs, renseignez les n° de maillot et le coach.
3. Touchez **Partager cette équipe** : un QR code s'affiche, avec **Copier le lien**, **Copier le code** et **Partager…** (SMS, messagerie…).

**Sur la tablette de la table de marque**

1. **Nouveau match** → dans l'équipe concernée, **Importer une équipe (QR / code)**.
2. **Scanner le QR code**, ou collez le lien / le code reçu puis **Lire le code**.
3. Vérifiez l'aperçu et touchez **Utiliser cette équipe**.

Si le lien reçu par message est ouvert directement, l'application propose **Nouveau match : en équipe A** ou **en équipe B**.

> Un lien peut s'ouvrir dans le navigateur plutôt que dans l'application installée. Dans ce cas, touchez **Copier le code** puis collez-le dans l'application via **Importer une équipe (QR / code)**.

---

## 8. Mettre à jour les licenciés en cours de saison

Refaites simplement un import (section 2.2) avec un export LiguAsso récent :

- le club est retrouvé grâce à son **n° d'association** ;
- chaque licencié est reconnu par son **n° de licence** ;
- l'aperçu indique les **nouveaux**, **mis à jour** et **inchangés** ;
- rien n'est supprimé : les licenciés ajoutés à la main sont conservés.

---

## 9. Bon à savoir

- **Données sur l'appareil** — Clubs, licenciés et matchs sont enregistrés uniquement sur l'appareil utilisé. Rien n'est envoyé sur internet. Effacer les données du navigateur ou désinstaller l'application supprime tout : utilisez de préférence toujours la même tablette pour la table de marque.
- **Reprise automatique** — Si l'application est fermée pendant un match, elle rouvre directement le match en cours. L'accueil affiche aussi une carte **Match en cours** avec le bouton **Reprendre le match en cours**.
- **Un seul match en cours** — Créer un nouveau match alors qu'un autre n'est pas terminé est possible (confirmation demandée), mais l'ancien ne sera plus repris automatiquement.
- **Supprimer un club** supprime aussi ses licenciés ; les matchs déjà joués ne sont pas modifiés.
- **Mauvais fichier** — Si l'export LiguAsso est donné par erreur à **Importer une équipe**, l'application le signale et indique où l'importer.

### Règles appliquées (saison 2025-2026)

| Règle | Valeur |
| --- | --- |
| Joueurs maximum par équipe | 14 |
| Joueuses minimum sur le terrain | 2 |
| Fautes personnelles avant sortie | 5 |
| Seuil de fautes d'équipe par période | 8 (2 lancers francs au-delà) |
| Numéros de maillot autorisés | 0 à 99 |
| Périodes | 2 mi-temps, prolongations en cas d'égalité |

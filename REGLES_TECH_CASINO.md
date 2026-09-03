# 🎰 Livret d'Organisation - DRIPgame (BDE)

Ce document rassemble toutes les règles, les spécifications techniques et les mécaniques de jeu pour le bon déroulement de l'événement DRIPgame.

---

## 👑 1. Rôle et Fonctionnalités des Administrateurs

Les admins sont les garants du bon déroulement de la soirée. Ils gèrent les litiges, animent les tables et distribuent les jetons.

- **Connexion Admin** : Lors de la connexion, un admin doit utiliser des identifiants précis pour se connecter.
  - **Prénom** : `.`
  - **Nom** : `DRIP`
  *(Attention à ne pas le partager aux joueurs !)*
- **Fonction SOS** : Les joueurs peuvent utiliser un bouton "SOS" à leur table pour appeler un admin. L'alerte est diffusée à tous les admins connectés avec le nom du joueur et la table concernée.
- **Gestion manuelle** : Un admin peut ajouter manuellement des jetons à un joueur via son interface.

---

## 🪙 2. L'Économie et les Jetons (Tokens)

L'objectif de la soirée est de finir le plus haut possible dans le **Classement Général (Leaderboard)**, qui affiche en direct le top 30 des joueurs.

- **Solde initial** : Chaque joueur commence avec **100 jetons**.
- **Rebuy (Recave)** : Si un joueur est à sec, il peut faire un "Rebuy".
  - **Condition** : Avoir moins de **20 jetons**.
  - **Gain** : Donne **40 jetons**.
  - **Limite** : **2 Rebuys maximum** par personne sur toute la soirée.
  - **Cooldown** : Il faut attendre **30 minutes** entre chaque rebuy.

---

## 🎮 3. Les Mini-Jeux et leurs Règles

Chaque jeu possède son propre fonctionnement et système de mise. *Note : Un joueur ne peut rejoindre physiquement qu'une seule file d'attente à la fois.*

### ⚽️ FIFA (1v1)
- **Principe** : Match classique 1 contre 1.
- **Mise** : Les joueurs misent entre **5 et 30 jetons** (limité à 50% de leur solde total).
- **Spectateurs** : Les autres joueurs peuvent parier sur le gagnant (entre 2 et 15 jetons). Les gains sont redistribués proportionnellement à la mise.
- **Résolution** : À la fin du match, les deux joueurs déclarent le gagnant sur l'application. 
  - S'ils sont d'accord, les gains sont distribués.
  - S'ils ne sont pas d'accord (Litige), l'argent est remboursé et une alerte SOS est envoyée aux admins !

### 🥅 Babyfoot (jusqu'à 4v4)
- **Principe** : Match par équipes. La partie se lance quand il y a 8 joueurs (4v4) ou quand un admin force le lancement.
- **Mise** : Chaque joueur mise entre **5 et 20 jetons**.
- **Résolution** : À la fin, chaque joueur vote pour l'équipe gagnante. 
  - Il faut une majorité de **75%** (ex: 6 votes sur 8) pour valider la victoire.
  - En cas de litige, remboursement et appel SOS automatique aux admins.

### 🎵 Blindtest (Animé par un Admin)
- **Principe** : Les joueurs cliquent sur "Je participe" (sans frais). L'admin lance la musique et les joueurs lèvent la main.
- **Planning des Thèmes** :
  - **14h00 - 14h30** : Années 2000
  - **14h30 - 15h00** : Rap FR
  - **15h00 - 15h30** : Génériques de séries
  - **15h30 - 16h00** : Anime
  - **16h00 - 16h30** : Disney / Pixar
- **Mécanique** : L'admin voit la liste des participants et sélectionne manuellement la personne qui a donné la réponse.
- **Résolution par l'Admin** :
  - **Faux** : La manche continue.
  - **Moitié (Titre OU Artiste)** : Le joueur gagne **+5 jetons**.
  - **Vrai (Titre + Artiste)** : Le joueur gagne **+10 jetons**.
  - **Personne ne trouve** : L'admin annule la manche (aucun gain ni perte).

### 🕵️‍♂️ Undercover / Imposteur / Bluff
- **Principe global** : Jeux à rôles cachés où les joueurs s'affrontent sur le téléphone. (Les règles spécifiques de distribution de mots et de votes s'appliquent). L'application gère les rôles et l'élimination.

### 🙋‍♂️ Qui dans la salle (Who's in the room)
- **Principe** : L'application pose une question ("Qui est le plus susceptible de..."), les joueurs misent et parient sur une personne. 
- La majorité l'emporte et le pool de jetons est divisé entre ceux qui ont voté avec la majorité.

---

## 🚨 En cas de problème
- Si un joueur reste bloqué dans une partie ou que la partie "bug", un admin peut toujours utiliser son interface pour réajuster manuellement le solde des joueurs.
- La triche est limitée car les validations de score de jeux physiques (Fifa, Babyfoot) requièrent l'accord des deux parties ou une majorité qualifiée.


# Les Nominés du Néombre - Gestionnaire d'Aventures

🌍 **Découvrir le site en direct :** [lndn.photofilter.fr](https://lndn.photofilter.fr/)

Application web d'accompagnement pour le jeu de société **"Les Nominés du Néombre"** (créé par Antoine Poullin & Pierre Cailloux). Cette plateforme permet aux joueurs de numériser leur progression, de gérer leurs decks en temps réel lors de leurs parties, et d'interagir avec leur liste d'amis.

Ce projet a été développé en étroite collaboration avec les auteurs du jeu afin de traduire les mécaniques ludiques en une architecture de données structurée et une interface utilisateur immersive.

## ⚙️ Comment fonctionne le site ?

L'application est conçue pour être utilisée en direct autour de la table de jeu ou à distance :

1. **Création d'une chronique :** Un joueur crée une "Aventure" et en devient l'Administrateur (Héros Principal).
2. **Système de groupe (Multijoueur) :** L'Admin peut rechercher ses amis sur la plateforme et les inviter à rejoindre son aventure. Ceux-ci occupent alors l'un des 4 emplacements de héros disponibles.
3. **Synchronisation en temps réel :** Dès qu'un joueur ajoute ou retire une carte "Butin" de son deck, la modification apparaît instantanément sur l'écran de tous les autres joueurs de l'aventure, sans aucun rechargement de page.
4. **Limites partagées :** Le catalogue de cartes vérifie en direct le nombre d'exemplaires d'un butin et bloque l'ajout si la limite globale du groupe est atteinte.
5. **Gestion des permissions :** L'Admin garde le contrôle total. Il peut modifier les droits d'un participant (Spectateur, Éditeur de deck, Admin) ou l'expulser (le joueur perd son héros mais peut rester en mode lecture seule).

## 🚀 Fonctionnalités principales

* **Système d'Authentification & Sécurité :** Création de compte, connexion sécurisée, et option de suppression définitive du compte avec nettoyage des données sociales et réattribution des héros.
* **Gestion des Aventures (Decks) :** Création, modification et consultation dynamique des decks liés au compte du joueur.
* **Système Social :** Recherche de joueurs, envoi/réception de demandes de compagnonnage et gestion de la liste d'amis.
* **Interface Immersive & Responsive :** Design "parchemin" adapté à tous les écrans (optimisé du PC jusqu'au format ultra-mobile type Galaxy Z-Fold).

## 🛠️ Stack Technique

* **Frontend :** HTML5, CSS3 (Flexbox/Grid, Mobile-First), Vanilla JavaScript.
* **Backend & Base de données :** [PocketBase](https://pocketbase.io/) (SQLite, authentification intégrée, API RESTful, Souscriptions Temps Réel / SSE).
* **Hébergement & Déploiement :** AlwaysData (Serveur Backend) & Hébergement web classique (Frontend).

## 🗄️ Architecture des Données

La base de données relationnelle (gérée via PocketBase) est structurée autour de plusieurs collections clés :

* `users` : Profils des joueurs, identifiants et données d'authentification.
* `aventures` : Instances de parties multijoueurs en cours.
* `joueurs` & `decks` : Représentation des héros (emplacements 1 à 4) et de leurs cartes équipées.
* `participants` : Gestion des rôles et des droits d'accès (Admin, Deck, Spectateur) au sein d'une aventure.
* `amis` & `invitations_aventures` : Tables de jointure gérant les statuts des relations sociales (en attente, accepté).

## ✒️ Auteur & Crédits

* **Développement Web & Architecture Data :** Aurélien GIGUERRE ([LinkedIn](https://linkedin.com/in/aurélien-giguerre) | [GitHub](https://github.com/Boxbow231))
* **Créateurs du jeu de société :** Antoine Poullin & Pierre Cailloux

> *Projet développé dans le cadre de mon BUT Informatique (Parcours Réalisation d'applications) et en vue de ma recherche de stage de fin d'études en Data Analysis.*

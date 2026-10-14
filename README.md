<<<<<<< HEAD

=======
>>>>>>> 4cad51269fd92c910f2857e1adf813c73e1d12ee
# Les Nominés du Néombre - Gestionnaire d'Aventures

Application web officielle d'accompagnement pour le jeu de société **"Les Nominés du Néombre"** (créé par Antoine Poullin & Pierre Cailloux). Cette plateforme permet aux joueurs de numériser leur progression, de gérer leurs decks et d'interagir avec leur liste d'amis.

Ce projet a été développé en étroite collaboration avec les auteurs du jeu afin de traduire les mécaniques ludiques en une architecture de données structurée et une interface utilisateur immersive.

## 🚀 Fonctionnalités principales

* **Système d'Authentification :** Création de compte et connexion sécurisées.
* **Gestion des Aventures (Decks) :** Création, modification et consultation des decks liés au compte du joueur.
* **Système Social :** Recherche de joueurs, envoi/réception de demandes de compagnonnage et gestion de la liste d'amis.
* **Interface Immersive & Responsive :** Design "parchemin" adapté à tous les écrans (du PC au Galaxy Z-Fold 5).

## 🛠️ Stack Technique

* **Frontend :** HTML5, CSS3 (Flexbox/Grid, Mobile-First), Vanilla JavaScript.
* **Backend & Base de données :** [PocketBase](https://pocketbase.io/) (SQLite, authentification intégrée, API RESTful).
* **Hébergement & Déploiement :** en cours de préparation.

## 🗄️ Architecture des Données

La base de données relationnelle (gérée via PocketBase) est structurée autour de plusieurs collections clés :

* `users` : Profils des joueurs, identifiants et données d'authentification.
* `aventures` : Enregistrement des decks, reliés par relation au créateur.
* `amis` : Table de jointure gérant les statuts des relations sociales (en attente, accepté) entre les différents utilisateurs.

## 💻 Installation en local

Si vous souhaitez faire tourner ce projet sur votre machine :

1. **Cloner le dépôt :**
<<<<<<< HEAD

=======
>>>>>>> 4cad51269fd92c910f2857e1adf813c73e1d12ee
```bash
git clone https://github.com/Boxbow231/LNDN_Deck.git
```

<<<<<<< HEAD
2. **Configuration du Backend (PocketBase) :**

* Téléchargez PocketBase et lancez l'exécutable localement (`./pocketbase serve`).
* Importez le schéma de la base de données (fichier JSON/pb_schema.json) via l'interface d'administration (Admin UI).

3. **Liaison Frontend / Backend :**

* Dans les fichiers JavaScript (ex: `js/auth.js`, `js/accueil.js`, `js/amis.js`), assurez-vous que l'URL d'initialisation de PocketBase pointe vers votre serveur local :

=======

2. **Configuration du Backend (PocketBase) :**
* Téléchargez PocketBase et lancez l'exécutable localement (`./pocketbase serve`).
* Importez le schéma de la base de données (fichier JSON/pb_schema.json) via l'interface d'administration (Admin UI).


3. **Liaison Frontend / Backend :**
* Dans les fichiers JavaScript (ex: `js/auth.js`, `js/accueil.js`, `js/amis.js`), assurez-vous que l'URL d'initialisation de PocketBase pointe vers votre serveur local :
>>>>>>> 4cad51269fd92c910f2857e1adf813c73e1d12ee
```javascript
const pb = new PocketBase('http://127.0.0.1:8090');
```

<<<<<<< HEAD
4. **Lancement :**

* Ouvrez le dossier du projet avec VS Code et utilisez l'extension **Live Server** pour lancer le frontend.

=======

4. **Lancement :**
* Ouvrez le dossier du projet avec VS Code et utilisez l'extension **Live Server** pour lancer le frontend.


>>>>>>> 4cad51269fd92c910f2857e1adf813c73e1d12ee
## ✒️ Auteur & Crédits

* **Développement Web & Architecture Data :** Aurélien GIGUERRE ([LinkedIn](https://linkedin.com/in/aurélien-giguerre) | [GitHub](https://github.com/Boxbow231))
* **Créateurs du jeu de société :** Antoine Poullin & Pierre Cailloux

> *Projet développé dans le cadre de mon BUT Informatique (Parcours Réalisation d'applications) et en vue de mon stage en tant que Data Analyst.*
<<<<<<< HEAD
>
=======
>>>>>>> 4cad51269fd92c910f2857e1adf813c73e1d12ee

# Madrassati — School Management Platform

**Madrassati** est un projet pédagogique full-stack qui présente le concept d'une plateforme de gestion scolaire pour une école privée (primaire et collège). Il contient une interface web, une API REST avec Node.js/Express et un schéma de base de données MySQL.

> **État réel du projet : prototype / projet de portfolio.** La page publique et plusieurs espaces de démonstration utilisent des données fictives enregistrées dans `localStorage`. L'API et le schéma SQL couvrent plusieurs opérations métier, mais les tableaux de bord ne sont pas encore tous connectés à l'API. Le paiement par carte n'est pas activé. 

## Technologies

- Frontend : HTML5, CSS3, JavaScript vanilla.
- Backend : Node.js, Express 5.
- Base de données : MySQL 8 / mysql2.
- Authentification : bcryptjs (hachage des mots de passe) et JSON Web Token.
- Sécurité HTTP / configuration : Helmet, CORS et dotenv.

## Structure du projet

```text
Madrassati-Fullstack/
├── backend/
│   ├── server.js          # API REST, authentification, autorisations et serveur web
│   ├── seed.js            # création / mise à jour du compte administrateur initial
│   └── README.md          # notes backend
├── database/
│   └── schema.sql         # création de la base, tables, relations et données de référence
├── dist/
│   ├── index.html         # page publique et structure des espaces de démonstration
│   ├── app.js             # interactions frontend
│   └── *.css, *.webp      # styles et images
├── docs/
│   ├── TECHNICAL_GUIDE_DARIJA.md
│   ├── ORAL_PRESENTATION_DARIJA.md
│   ├── API_REFERENCE.md
│   └── TEST_CHECKLIST.md
├── .env.example           # exemple de configuration sans secret réel
├── .gitignore
├── package.json
└── README.md
```

## Prérequis

- Node.js 20 ou plus récent.
- MySQL 8 (ou XAMPP avec MySQL/MariaDB compatible).
- Git facultatif pour cloner le projet.

## Installation locale (Windows)

1. Ouvrir le dossier du projet dans VS Code.
2. Démarrer MySQL depuis XAMPP, ou démarrer le service MySQL.
3. Ouvrir phpMyAdmin ou MySQL Workbench et exécuter `database/schema.sql`.
4. Copier `.env.example` vers `.env` à la racine du projet.
5. Modifier les valeurs de `.env` : mot de passe MySQL, `JWT_SECRET`, `ADMIN_EMAIL` et `ADMIN_PASSWORD`. Utiliser un mot de passe administrateur unique d'au moins 12 caractères et un secret JWT aléatoire d'au moins 32 caractères.
6. Dans le terminal à la racine :

   ```bash
   npm install
   npm run seed
   npm run dev
   ```

7. Ouvrir `http://localhost:3000`.

Pour arrêter le serveur : `Ctrl + C`.

## Scripts npm

| Commande | Rôle |
|---|---|
| `npm install` | Installe les dépendances définies dans `package.json`. |
| `npm run dev` | Démarre le serveur avec redémarrage automatique via `node --watch`. |
| `npm start` | Démarre le serveur sans mode watch. |
| `npm run seed` | Crée ou met à jour le compte administrateur configuré dans `.env`. |

## Configuration `.env`

| Variable | Description |
|---|---|
| `PORT` | Port HTTP du serveur, par défaut 3000. |
| `DB_HOST`, `DB_PORT` | Adresse et port MySQL. |
| `DB_USER`, `DB_PASSWORD` | Identifiants MySQL. |
| `DB_NAME` | Nom de la base, par défaut `madrassati`. |
| `JWT_SECRET` | Secret utilisé pour signer et vérifier les JWT. Obligatoire en production. |
| `JWT_EXPIRES_IN` | Durée de validité du token, par défaut `8h`. |
| `APP_ORIGIN` | Origine(s) autorisée(s) par CORS, séparées par des virgules. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Identifiants du compte administrateur initial pour `npm run seed`. |

Ne jamais publier le fichier `.env`. Le fichier `.env.example` ne doit contenir aucun vrai mot de passe ou secret.

## Fonctionnalités représentées

- Demande de préinscription et consultation de son état par référence.
- Comptes et rôles : administrateur, enseignant, parent, élève et comptable.
- Gestion des classes et des dossiers élèves.
- Notes, absences, leçons, devoirs et séances de soutien.
- Factures / paiements enregistrés et notifications.
- Tableau de bord administratif via API.

## Documentation pour comprendre et présenter le projet

- [Guide technique en Darija](docs/TECHNICAL_GUIDE_DARIJA.md) — explication du dossier, des technologies, du fonctionnement et des limites.
- [Code walkthrough](docs/CODE_WALKTHROUGH_DARIJA.md) — explication des fonctions, routes et blocs de code importants.
- [Présentation orale en Darija](docs/ORAL_PRESENTATION_DARIJA.md) — discours de démonstration et questions possibles.
- [Référence API](docs/API_REFERENCE.md) — routes, rôles et exemples de requêtes.
- [Checklist de test](docs/TEST_CHECKLIST.md) — vérifications à effectuer avant une démonstration.
- [Rapport de revue](docs/REVIEW_REPORT.md) — corrections, fichiers retirés et points restant à améliorer.

## Limites connues / prochaines étapes

1. Connecter les pages des espaces (élève, parent, enseignant, administration) aux endpoints API au lieu d'utiliser les tableaux fictifs de `localStorage`.
2. Ajouter une gestion complète des comptes parents, enseignants et comptables, et relier les parents aux élèves.
3. Renforcer les autorisations par classe et par matière sur toutes les routes de lecture et d'écriture.
4. Ajouter validation stricte des données, limitation des tentatives de connexion, journalisation et tests automatisés.
5. Ajouter téléversement sécurisé des documents, gestion des fichiers et politique de conservation des données.
6. Intégrer un prestataire de paiement marocain seulement après obtention de ses identifiants et configuration de webhooks vérifiés.
7. Déployer derrière HTTPS avec des secrets sécurisés et une politique CSP adaptée.

Ce projet est destiné à l'apprentissage et à la démonstration technique. Il ne doit pas recevoir de vraies données d'élèves avant les travaux de sécurité, de conformité et de validation nécessaires.

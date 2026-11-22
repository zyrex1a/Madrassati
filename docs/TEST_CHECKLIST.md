# Checklist de vérification — Madrassati

## Avant le lancement

- [ ] Node.js 20+ installé (`node -v`).
- [ ] MySQL démarré.
- [ ] `database/schema.sql` importé sans erreur.
- [ ] `.env` créé depuis `.env.example`.
- [ ] `DB_PASSWORD` adapté à la configuration locale.
- [ ] `JWT_SECRET` remplacé par une longue valeur aléatoire.
- [ ] `ADMIN_EMAIL` valide.
- [ ] `ADMIN_PASSWORD` unique, au moins 12 caractères.

## Installation / démarrage

- [ ] `npm install` termine sans erreur.
- [ ] `npm run seed` affiche `Admin ready`.
- [ ] `npm run dev` démarre le serveur.
- [ ] `http://localhost:3000` affiche la page.
- [ ] `GET http://localhost:3000/api/health` retourne `status: ok` et `database: connected`.

## Tests manuels API

- [ ] Login avec identifiants Admin valides : JWT retourné.
- [ ] Login avec mauvais mot de passe : réponse 401.
- [ ] `GET /api/auth/me` sans token : réponse 401.
- [ ] Création d'une demande avec les champs obligatoires : réponse 201 et référence.
- [ ] Création d'une demande sans email : réponse 400.
- [ ] Consultation d'une référence existante : statut uniquement + référence + date.
- [ ] Consultation d'une référence inconnue : réponse 404.
- [ ] Route admin sans token : réponse 401.
- [ ] Route admin avec token d'un rôle non-admin : réponse 403.

## Vérification frontend

- [ ] Menu mobile s'ouvre et se ferme.
- [ ] Login modal s'ouvre et se ferme.
- [ ] Formulaire d'admission affiche le résultat API.
- [ ] En cas d'erreur API, le formulaire affiche une erreur et ne prétend pas avoir enregistré la demande.
- [ ] Les espaces de démonstration sont identifiés comme utilisant des données fictives.
- [ ] Les données ajoutées à une table demo sont affichées sans interprétation HTML.

## Contrôle avant GitHub

- [ ] `.env` absent du commit.
- [ ] Aucun mot de passe, token ou clé API dans les fichiers.
- [ ] `node_modules/` absent du dépôt.
- [ ] README et documentation à jour.
- [ ] Les limites du prototype sont clairement annoncées.

## Commandes utiles

```bash
node --check backend/server.js
node --check backend/seed.js
node --check dist/app.js
npm run dev
```

Ces commandes vérifient la syntaxe JavaScript et lancent l'application. Elles ne remplacent pas des tests d'intégration complets avec une base MySQL réelle.

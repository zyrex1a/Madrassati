# API Reference — Madrassati

Base URL local: `http://localhost:3000`. Les routes protégées nécessitent l'en-tête :

```http
Authorization: Bearer <JWT>
Content-Type: application/json
```

## Authentification et santé

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Non | Vérifie la connexion MySQL. |
| POST | `/api/auth/login` | Non | Vérifie email/password et retourne un JWT. |
| GET | `/api/auth/me` | Oui | Retourne le profil de l'utilisateur connecté. |

Login body :

```json
{"email":"admin@example.com","password":"your-password"}
```

## Admissions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/admissions` | Non | Crée une demande de préinscription. |
| GET | `/api/admissions/status/:reference` | Non | Retourne la référence, le statut et la date de mise à jour. |
| GET | `/api/admissions` | Admin | Liste les demandes; filtre facultatif `?status=pending`. |
| PATCH | `/api/admissions/:id` | Admin | Met à jour le statut et la note administrative. |

Exemple de création :

```json
{
  "studentName":"Adam Example",
  "desiredLevel":"primary",
  "parentName":"Parent Example",
  "parentEmail":"parent@example.com",
  "parentPhone":"0600000000"
}
```

`desiredLevel` accepte `primary` ou `middle`.

## Utilisateurs, classes et élèves

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | Admin | Liste les comptes. |
| POST | `/api/users` | Admin | Crée un compte avec un rôle existant. |
| GET | `/api/classes` | Connecté | Liste les classes. |
| POST | `/api/classes` | Admin | Crée une classe. |
| GET | `/api/students` | Admin / teacher / accountant | Liste les élèves; filtre facultatif `?classId=`. |
| POST | `/api/students` | Admin | Crée le compte utilisateur et le dossier élève dans une transaction. |
| GET | `/api/parent/children` | Parent | Liste les enfants liés au parent connecté. |

## Activités pédagogiques

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/grades?studentId=` | Connecté + contrôle d'accès | Consulte les notes d'un élève. |
| POST | `/api/grades` | Teacher / Admin | Ajoute une note. |
| GET | `/api/attendance?studentId=` | Connecté + contrôle d'accès | Consulte l'historique de présence. |
| POST | `/api/attendance` | Teacher / Admin | Enregistre présence/absence/retard. |
| GET | `/api/lessons` | Connecté | Liste les leçons. |
| POST | `/api/lessons` | Teacher / Admin | Publie une leçon. |
| GET | `/api/assignments` | Connecté | Liste les devoirs / examens. |
| POST | `/api/assignments` | Teacher / Admin | Crée un devoir. |
| GET | `/api/support-sessions` | Connecté | Liste les séances de soutien. |
| POST | `/api/support-sessions` | Teacher / Admin | Crée une séance et lie les élèves. |

## Finance et notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/payments` | Connecté + contrôle de rôle/élève | Liste les paiements autorisés. |
| POST | `/api/payments` | Admin / Accountant | Enregistre une facture / un paiement. |
| GET | `/api/notifications` | Connecté | Liste les notifications de l'utilisateur. |
| PATCH | `/api/notifications/:id/read` | Connecté | Marque une notification comme lue. |
| GET | `/api/dashboard/admin` | Admin | Retourne les statistiques administratives. |

## Codes HTTP fréquents

- `200`: requête réussie.
- `201`: ressource créée.
- `400`: données manquantes ou invalides.
- `401`: authentification absente ou invalide.
- `403`: rôle ou accès insuffisant.
- `404`: endpoint ou ressource introuvable.
- `409`: conflit, par exemple une valeur unique déjà utilisée.
- `500`: erreur serveur non détaillée au client.

> Cette documentation décrit les routes présentes dans le code. Elle ne signifie pas que chaque écran frontend les utilise déjà. Les restrictions d'accès doivent encore être auditées et renforcées avant production.

# Job Board

Projet Epitech T-WEB-501 : un site d'offres d'emploi (marque « Talentis »).
Back-end : Django 5.2 + Django REST Framework + MySQL, le tout dans Docker.
Front-end : HTML, CSS et JavaScript, servi par nginx.

## Lancer le projet avec Docker

1. Copier `.env.example` en `.env`, puis remplacer les `change-me` par ses propres valeurs
2. Lancer : `docker compose up -d --build`
3. Remplir la base (une seule fois) : `docker compose exec backend python manage.py seed`
   Cette commande crée les 16 catégories, des entreprises, des offres et des comptes de démo.
   Elle peut être relancée sans créer de doublons. Pour tout recréer : `python manage.py seed_demo --reset`.

Adresses :
- API : http://localhost:8000/api/
- Front : http://localhost:5500/main.html

Arrêter : `docker compose stop` (les données restent).
Repartir d'une base vide : `docker compose down -v`
(après un `down -v`, il faut refaire l'étape 3)

## Comptes de démo

Mot de passe de tous les comptes : `motdepasse123`

| Rôle | E-mail |
|---|---|
| Candidat | `lea.martin@example.com` |
| Recruteur | `recruiter.decathlon@example.com` |
| Administrateur | `admin@example.com` |

Les mots de passe sont stockés hachés. Ces comptes ne servent qu'à la démonstration.

## Routes de l'API

Toutes les routes commencent par `/api/`.
Les routes marquées « connecté » demandent l'en-tête `Authorization: Bearer LE_TOKEN`.
Les erreurs de validation sont renvoyées en français, champ par champ (code 400).

### Comptes
| Méthode | Route | Qui | Rôle |
|---|---|---|---|
| POST | `auth/register` | tout le monde | Créer un compte candidat ou recruteur |
| POST | `auth/login` | tout le monde | Se connecter, renvoie un token |
| GET | `auth/me` | connecté | Profil complet (CV, et entreprise pour un recruteur) |
| PATCH | `auth/me` | connecté | Modifier son profil, son CV (PDF, 5 Mo max) et son entreprise |
| DELETE | `auth/me` | connecté | Supprimer son compte (ses candidatures, messages et offres sont supprimés avec) |
| POST | `auth/logout` | connecté | Se déconnecter |
| POST | `auth/password` | connecté | Changer son mot de passe (`old_password`, `new_password`) |
| POST | `auth/forgot-password` | tout le monde | Demander un lien de réinitialisation par e-mail |
| POST | `auth/reset-password` | tout le monde | Choisir un nouveau mot de passe avec le lien reçu (`token`, `password`) |

Règle des mots de passe : 12 caractères minimum, avec au moins une lettre et un chiffre.

Réinitialisation : en développement, l'e-mail n'est pas envoyé pour de vrai, il s'affiche dans les journaux :
`docker compose logs backend`. Le lien est utilisable une seule fois.

### Offres
| Méthode | Route | Qui | Rôle |
|---|---|---|---|
| GET | `categories` | tout le monde | Liste des catégories (id, name, slug) |
| GET | `ads` | tout le monde | Liste des offres ouvertes. Filtres : `search`, `city`, `contract_type`, `working_time`, `education_level`, `experience`, `work_mode`, `category` (ex. `ads?search=python&city=Paris`) |
| GET | `ads?mine=true` | recruteur | Toutes mes offres, ouvertes et fermées |
| GET | `ads/<id>` | tout le monde | Détail d'une offre ouverte |
| POST | `ads` | recruteur | Créer une offre (`category` = l'id de la catégorie) |
| PUT / PATCH | `ads/<id>` | recruteur propriétaire | Modifier une offre |
| DELETE | `ads/<id>` | recruteur propriétaire | Fermer une offre (elle n'est pas effacée) |

### Candidatures et messages
| Méthode | Route | Qui | Rôle |
|---|---|---|---|
| POST | `ads/<id>/apply` | candidat | Postuler à une offre (une seule fois par offre, CV en PDF facultatif) |
| GET | `candidate/applications` | candidat | Mes candidatures |
| PATCH | `candidate/applications/<id>` | candidat propriétaire | Modifier sa candidature (impossible si acceptée ou refusée) |
| DELETE | `candidate/applications/<id>` | candidat propriétaire | Retirer sa candidature (impossible si acceptée ou refusée) |
| GET | `recruiter/applications` | recruteur | Candidatures reçues sur mes offres |
| PATCH | `applications/<id>/status` | recruteur | Changer le statut (sent, seen, interview, rejected, accepted) |
| GET | `applications/<id>/cv` | candidat ou recruteur concerné | Télécharger le CV |
| POST | `ads/<id>/messages` | candidat | Écrire au recruteur |
| GET | `ads/<id>/messages` | connecté | Messages d'une offre (le recruteur voit tous les messages de son offre, le candidat voit les siens) |
| PATCH | `messages/<id>/read` | recruteur | Marquer un message comme lu |

### Administration
Les routes `admin/companies`, `admin/categories`, `admin/ads`, `admin/applications`,
`admin/messages` et `admin/users` sont réservées aux comptes administrateurs
(liste, création, modification, suppression). Les autres comptes reçoivent 403,
les visiteurs non connectés 401.

## Lancer les tests

```
docker compose exec backend python manage.py test
```

Au premier lancement, MySQL peut refuser la création de la base de test
(`Access denied ... test_jobboard_db`). Il faut alors donner le droit à
`jobboard_user` (à refaire après chaque `docker compose down -v`) :

```
ROOTPW=$(docker compose logs db | grep "GENERATED ROOT PASSWORD" | awk '{print $NF}')
docker compose exec -e MYSQL_PWD="$ROOTPW" db mysql -uroot -e 'GRANT ALL PRIVILEGES ON `test_jobboard_db`.* TO "jobboard_user"@"%";'
```
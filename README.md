# Job Board

Projet Epitech T-WEB-501 : un site d'offres d'emploi.
Back-end : Django 5.2 + Django REST Framework + MySQL, le tout dans Docker.

## Lancer le projet avec Docker

1. Copier `.env.example` en `.env`
2. Lancer : `docker compose up --build`
3. Remplir les catégories (une seule fois) :
   `docker compose exec backend sh -c "python manage.py shell < seed_categories.py"`

Adresses :
- API : http://localhost:8000
- Front : http://localhost:5500

Pour repartir d'une base vide : `docker compose down -v`
(après un `down -v`, il faut refaire l'étape 3)

## Routes de l'API

Toutes les routes commencent par `/api/`.
Les routes marquées "connecté" demandent l'en-tête `Authorization: Bearer LE_TOKEN`.
Les erreurs de validation sont renvoyées en français, champ par champ (code 400).

### Comptes
| Méthode | Route | Qui | Rôle |
|---|---|---|---|
| POST | `auth/register` | tout le monde | Créer un compte candidat ou recruteur |
| POST | `auth/login` | tout le monde | Se connecter, renvoie un token |
| GET | `auth/me` | connecté | Infos du compte connecté |
| POST | `auth/logout` | connecté | Se déconnecter |

### Offres
| Méthode | Route | Qui | Rôle |
|---|---|---|---|
| GET | `categories` | tout le monde | Liste des catégories (id, name, slug) |
| GET | `ads` | tout le monde | Liste des offres ouvertes. Filtres : `search`, `city`, `contract_type`, `education_level`, `experience`, `work_mode`, `category` (ex. `ads?search=python&city=Paris`) |
| GET | `ads/<id>` | tout le monde | Détail d'une offre |
| POST | `ads` | recruteur | Créer une offre (`category` = l'id de la catégorie) |
| PUT / PATCH | `ads/<id>` | recruteur propriétaire | Modifier une offre |
| DELETE | `ads/<id>` | recruteur propriétaire | Fermer une offre (elle n'est pas effacée) |

### Candidatures et messages
| Méthode | Route | Qui | Rôle |
|---|---|---|---|
| POST | `ads/<id>/apply` | candidat | Postuler à une offre |
| GET | `candidate/applications` | candidat | Mes candidatures |
| POST | `ads/<id>/messages` | candidat | Écrire au recruteur |
| GET | `recruiter/applications` | recruteur | Candidatures reçues |
| PATCH | `applications/<id>/status` | recruteur | Changer le statut (sent, seen, interview, rejected, accepted) |
| PATCH | `messages/<id>/read` | recruteur | Marquer un message comme lu |
| GET | `applications/<id>/cv` | connecté | Télécharger le CV |

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
# 1. Cloner le dépôt
git clone <URL_DU_REPO>
cd <NOM_DU_REPO>/back-end

# 2. Créer et activer l'environnement virtuel
python -m venv venv

source venv/bin/activate

# Pour désactiver l'environnement virtuel plus tard :
deactivate


# 3. Installer les packages
pip install -r requirements.txt



# 4. Créer le fichier .env à partir de l'exemple
cp .env.example .env
# Modifier ensuite .env avec ses propres informations MySQL (fichier .env est caché, ouvre dans le terminal avec :
code .env


# 5. Générer une SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
# Copier la clé obtenue dans SECRET_KEY du fichier .env


# 6. Aller sur Mysql
sudo mysql

# 7. Créer une base de donnée locale vide
# Créer/configurer également son utilisateur MySQL
# avec les mêmes informations que dans .env
# </>SQL
    CREATE DATABASE jobboard_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

    CREATE USER 'jobboard_user'@'localhost'
    IDENTIFIED BY '9981';

    GRANT ALL PRIVILEGES
    ON jobboard_db.*
    TO 'jobboard_user'@'localhost';

    FLUSH PRIVILEGES;

    exit;


# 8. Appliquer les migrations
python manage.py migrate


# 9. Vérifier que Django fonctionne
python manage.py check


# 10. Lancer le serveur
python manage.py runserver

# 11. Accéder la base de donnée
mysql -u jobboard_user -p

# Voir les tables dedans
# </>SQL
    USE jobboard_db;

    SHOW TABLES;
















# clonage de git
git clone <>
cd <>

# créer et activer l'environement virtuel
python -m venv venv

source venv/bin/activate

# deactivate pour désactiver

# installation de tous les 
pip install -r requirements.txt



# générer un secret_key et copie-colle dans ton .env local
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
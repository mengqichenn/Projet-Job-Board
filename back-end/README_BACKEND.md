# ========= Lancer le serveur ==============
# Dans ton environement virtuel
python manage.py runserver

# ========Accéder au serveur admin============
# créer ton compte admin (local)
python manage.py migrate
python manage.py createsuperuser
# créer avec l'exemple suivant
# Email: admin@example.com 
# Password: jobboardadmin
# Puis dans le navigateur : http://127.0.0.1:8000/admin/


# ====== TEST => l'inscription d'un compte =========

# un candidat (déjà testé)
curl -X POST http://127.0.0.1:8000/api/auth/register \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -d '{"email":"lea@test.fr","password":"motdepasse123","role":"candidate","first_name":"Léa","last_name":"Michel", "postal_code":"34000", "city":"Montpellier"}'
    -d '{"email":"chris@test.fr","password":"motdepasse123","role":"candidate","first_name":"Chris","last_name":"Malet", "postal_code":"34000", "city":"Montpellier"}'
    -d '{"email":"lina@test.fr","password":"motdepasse123","role":"candidate","first_name":"Lina","last_name":"Marcel", "postal_code":"31007", "city":"Toulouse"}'
    
# token de Léa : 8ce03682c5fe6e2c88a9ce955fdf64f15f2dc305

# un recruteur
curl -X POST http://127.0.0.1:8000/api/auth/register \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -d '{"email":"rh@danone.fr","password":"motdepasse123","role":"recruiter","first_name":"Patrice","last_name":"Louvet","company_name":"Danone SAS","siret":"55203253400703","company_postal_code":"75000","company_city":"Paris"}'
    
    -d '{"email":"rh@ubisoft.fr","password":"motdepasse123","role":"recruiter","first_name":"Yves","last_name":"Guillemot","company_name":"Ubisoft Montpellier SAS","siret":"35355586500073","company_postal_code":"34000","company_city":"Montpellier"}'



# =====TEST => la connection d'un compte ======
       
# avec email+password (compte de Léa)
curl -X POST http://127.0.0.1:8000/api/auth/login \
    -H "Content-Type: application/json" -H "Accept: application/json" \
    -d '{"email":"lea@test.fr","password":"motdepasse123"}'  

    
# avec un token
curl http://127.0.0.1:8000/api/auth/me -H "Authorization: Bearer LE_TOKEN"  






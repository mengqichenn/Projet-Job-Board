from django.db import transaction
from rest_framework import serializers
from .models import User, Company, Ad, Application, Message, Category
import requests


# Serializer pour l'inscription

class RegisterSerializer(serializers.Serializer):

    # ----paramètres communs ------
    email = serializers.EmailField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=12)
    role = serializers.ChoiceField(choices=["candidate", "recruiter"])      # On met pas l'admin ici
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    telephone = serializers.CharField(max_length=30, required=False, allow_blank=True)

    # ---------candidate -------------
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True)
    cv = serializers.FileField(required=False, allow_empty_file=False)

    # --- recruteur : son entreprise --- les champs peuvent être vides quand c'est candidat
    company_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    siret = serializers.CharField(max_length=14, required=False, allow_blank=True)
    company_city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    company_postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    website = serializers.URLField(max_length=255, required=False, allow_blank=True)

    # Validation des adresses mail
    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cette adresse mail est déjà utilisée.")
        return value

    # Validation des mots de passe
    def validate_password(self, value):
        if not(any(c.isalpha() for c in value) and any(c.isdigit() for c in value)):
            raise serializers.ValidationError("Le mot de passe doit contenir uniquement des lettres et des chiffres.")
        return value

    # Validation fichier CV
    def validate_cv(self,f):
        if not f.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Le fichier doit être en format pdf.")
        if f.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Le fichier ne doit pas dépasser 5 Mo.")
        if f.read(5) != b"%PDF-":
            raise serializers.ValidationError("Ce fichier n'est pas en format PDF.")
        f.seek(0)   
        return f


    # def pour vérifier si l'entreprise est bien enregistré dans la DB du gouvernement
    @staticmethod 
    def siret_exists(siret):
        try:
            r = requests.get("https://recherche-entreprises.api.gouv.fr/search",
                         params={"q": siret}, timeout=5)
            r.raise_for_status()
        except requests.RequestException:
            return None
        return len(r.json().get("results", [])) > 0
    

    # Validation des certains champs rendus obligatoires selon role
    def validate(self, data):
        if data["role"] == "candidate":
            required = ("city", "postal_code")
        else:
            required = ("company_name", "siret", "company_city", "company_postal_code")

        errors = {f: "Champ obligatoire." for f in required if not data.get(f)}
        if errors:
            raise serializers.ValidationError(errors)

        if data["role"] == "recruiter":
            siret = data["siret"]
            if len(siret) != 14 or not siret.isdigit():
                raise serializers.ValidationError({"siret": "Le numéro SIRET doit contenir 14 chiffres."})
            if Company.objects.filter(siret=siret).exists():
                raise serializers.ValidationError({"siret": "Cette entreprise est déjà inscrite."})
            if self.siret_exists(siret) is False:
                raise serializers.ValidationError({"siret": "Ce numéro SIRET n'existe pas dans la base officielle."})
        return data

    @transaction.atomic
    def create(self, d):
        company = None
        if d["role"] == "recruiter":
            company = Company.objects.create(
                name=d["company_name"], siret=d["siret"],
                city=d["company_city"], postal_code=d["company_postal_code"],
                description=d.get("description", ""), website=d.get("website", ""),
            )
            # le recruteur prend la localisation de son entreprise
            city, postal_code = company.city, company.postal_code
        else:
            city, postal_code = d["city"], d["postal_code"]

        return User.objects.create_user(
            email=d["email"], password=d["password"], role=d["role"],
            first_name=d["first_name"], last_name=d["last_name"],
            telephone=d.get("telephone", ""),
            city=city, postal_code=postal_code, company=company,
            cv=d.get("cv") if d["role"] == "candidate" else None,   # CV ne peut qu'être déposé par les candidats
        )

# Serializer pour annonces

class AdSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    class Meta:
        model = Ad
        fields = [
            "id", "title", "short_description", "full_description",
            "city", "postal_code", "contract_type",
            "monthly_salary_min", "monthly_salary_max", "working_time",
            "education_level", "experience", "start_time", "work_mode",
            "status", "created_at", "company_name", "category_name",
        ]




# Serializer pour candidature

class ApplicationSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=150) 

    ad_title = serializers.CharField(source="ad.title", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id", "ad", "ad_title","first_name", "last_name", "email", 
            "telephone", "message", "status", "created_at",
        ]
        read_only_fields = ["id", "ad", "status", "created_at"]

        
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name"]       

    





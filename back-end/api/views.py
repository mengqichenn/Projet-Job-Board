from django.shortcuts import render, get_object_or_404
from django.db import IntegrityError, transaction
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, AdSerializer, CategorySerializer, ApplicationSerializer
from .models import Ad, Category, Application


# Create your views here.

def user_payload(user):
    return {
        "id": user.id,
        "role": user.role,
        "name": f"{user.first_name} {user.last_name}".strip() or user.email,
    }

# View pour Ad
class AdListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        ads = Ad.objects.filter(status="open")
        city = request.GET.get("city")
        if city:
            ads = ads.filter(city__icontains=city)
        contract_type = request.GET.get("contract_type")
        if contract_type:
            ads = ads.filter(contract_type=contract_type)
        education_level = request.GET.get("education_level")
        if education_level:
            ads = ads.filter(education_level=education_level)
        experience = request.GET.get("experience")
        if experience:
            ads = ads.filter(experience=experience)
        work_mode = request.GET.get("work_mode")
        if work_mode:
            ads = ads.filter(work_mode=work_mode)
        category = request.GET.get("category")
        if category:
            ads = ads.filter(category_id=category)
        serializer = AdSerializer(ads, many=True)
        return Response(serializer.data)
       

# View pour AdDetail
class AdDetailView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, pk):

        ad = Ad.objects.filter(pk=pk, status="open").first()
        if ad is None:
            return Response({"message": "Annonce introuvable"}, status=404)
        serializer = AdSerializer(ad)
        return Response(serializer.data)


# View pour inscription 
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        s = RegisterSerializer(data=request.data)       # le back-end reçoit les data de js transformés en JSON
        s.is_valid(raise_exception=True)
        user = s.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": user_payload(user)}, status=201)


# View pour connection 
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        user = authenticate(request, email=request.data.get("email"),
                            password=request.data.get("password"))
        if user is None:
            return Response({"message": "E-mail ou mot de passe incorrect"}, status=401)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": user_payload(user)})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(user_payload(request.user))


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.auth.delete()
        return Response(status=204)

class CategoryListView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data)


# View pour candidature qui postule
class ApplyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, ad_id):
        if request.user.role != "candidate":
            return Response(
                {"detail": "Connectez-vous pour postuler."},
                status=403,
            )

        ad = get_object_or_404(Ad, pk=ad_id)    #pk = primary key

        if ad.status != "open":
            return Response(
                {"detail": "Cette offre n'est plus disponible."},
                status=400,
            )

        # vérifier qu'un candidat n'a pas postulé 2 fois

        if Application.objects.filter(
            candidate = request.user, ad=ad     
            # filter() vérifie si les 2 conditions existent : candidat (dans Application) = utilisateur actuel && sa candidature concerne l'annonce
        ).exists():
            return Response(
                {"detail": "Vous avez déjà postulé à cette offre."},
                status=400,
            )

        serializer = ApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():      # enregistre les données du candidat
                serializer.save(candidate=request.user, ad=ad)
        except IntegrityError:      
            if Application.objects.filter(
                candidate = request.user, ad=ad
            ).exists():
                return Response(
                    {"detail": "Vous avez déjà postulé à cette offre."},
                    status=400,
                )
            raise
        return Response(serializer.data, status=201)


# view pour recruteur qui reçoit des candidatures
class RecruiterApplicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "recruiter":
            return Response(
                {"detail": "Accès réservé aux recruteurs."},
                status=403,
            )

        applications = (
            Application.objects.filter(ad__recruiter=request.user)
            .select_related("ad")
            .order_by("-created_at")
        )

        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)


from pathlib import Path
from django.http import FileResponse, Http404
from django.shortcuts import render, get_object_or_404
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission                    #(rajouté)
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets                                                     #=======rajouté===========
from rest_framework.exceptions import PermissionDenied                                  #=======rajouté===========


from .serializers import (
    RegisterSerializer, AdSerializer, ApplicationSerializer,
    CategorySerializer, MessageCreateSerializer, MessageSerializer, ProfileSerializer
)
from .models import Ad, Application, Category, Message


# Create your views here.

def user_payload(user):
    return {
        "id": user.id,
        "role": user.role,
        "cv_name": Path(user.cv.name).name if user.cv else None,
        "name": f"{user.first_name} {user.last_name}".strip() or user.email,
    }

# view pour recruteur                                                                  ================rajouté================

class IsRecruiter(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "recruiter"

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
        u = request.user
        data = user_payload(u)
        data.update({"email": u.email, "first_name": u.first_name, "last_name": u.last_name,
                     "telephone": u.telephone, "city": u.city, "postal_code": u.postal_code})
        return Response(data)

    def patch(self, request):
        s = ProfileSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return self.get(request)


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


# View pour candidature qui postule                                                             ================rajouté================
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

        serializer = ApplicationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        try:
            with transaction.atomic():      # enregistre les données du candidat
                application = serializer.save(candidate=request.user, ad=ad)

                # Add application message into Message table
                Message.objects.create(
                    candidate=request.user,
                    ad=ad,
                    object=f"Candidature : {ad.title}"[:255],
                    content=application.message,
                )


                if "cv" in request.FILES:
                    request.user.cv = application.cv.name
                    request.user.save(update_fields=["cv", "modified_at"])
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

# view pour recruteur qui reçoit des candidatures                                               ================rajouté================
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

# View pour que le recruteur change le statut d'une candidature
class UpdateApplicationStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        if request.user.role != "recruiter":
            return Response(
                {"detail": "Accès réservé aux recruteurs."},
                status=403,
            )
        application = Application.objects.filter(pk=pk, ad__recruiter=request.user).first()
        if application is None:
            return Response({"detail": "Candidature introuvable."}, status=404)
        new_status = request.data.get("status")
        valid_statuses = [choice[0] for choice in Application.STATUS_CHOICES]
        if new_status not in valid_statuses:
            return Response({"detail": "Statut invalide."}, status=400)
        application.status = new_status
        application.save(update_fields=["status"])
        return Response(ApplicationSerializer(application).data)

#View pour envoyer un message (candidat uniquement)

class MessageCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, ad_id):
        if request.user.role != "candidate":
            return Response(
                {"detail": "Seuls les candidats peuvent envoyer un message."},
                status=403,
            )

        ad = Ad.objects.filter(pk=ad_id).first()
        if ad is None:
            return Response({"message": "Annonce introuvable"}, status=404)
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(candidate=request.user, ad=ad, status="unread")
        return Response(serializer.data, status=201)

    def get(self, request, ad_id):
        ad = Ad.objects.filter(pk=ad_id).first()
        if ad is None: 
            return Response({"message":"Annonce introuvable"}, status=404)
        if request.user.role == "recruiter":
            if ad.recruiter != request.user:
                return Response(
                    {"detail": "Vous n'avez pas accès à ces messages."},
                    status=403,
                )
            messages = Message.objects.filter(ad=ad)
        else:
            messages = Message.objects.filter(ad=ad, candidate=request.user)
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)

# View pour candidat qui voit ses propres candidatures

class CandidateApplicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != "candidate":
            return Response(
                {"detail": "Accès réservé aux candidats."},
                status=403,
            )
        applications = (
        Application.objects.filter(candidate=request.user)
        .select_related("ad")
        .order_by("-created_at")
        )

        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)
# View pour que le recruteur marque un message comme lu 

class MessageMarkReadView(APIView): 
    permission_classes =[IsAuthenticated]
    def patch(self, request, pk):
        if request.user.role != "recruiter":
            return Response(
                {"detail": "Accès réservé aux recruteurs."},
                status=403,
            )

        message = Message.objects.filter(pk=pk, ad__recruiter=request.user).first()
        if message is None:
            return Response({"detail": "Message introuvable."}, status=404)
        message.status = "read"
        message.save(update_fields=["status"])
        return Response(MessageSerializer(message).data)

class AdViewSet(viewsets.ModelViewSet):                                                         #================rajouté================
    serializer_class = AdSerializer
 
    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]                              # tout le monde peut voir les annonces
        return [IsRecruiter()]                               # créer, modifier, supprimer : recruteurs
 
    def get_queryset(self):
        qs = Ad.objects.select_related("company", "category")
        if self.action in ("update", "partial_update", "destroy"):
            return qs.filter(recruiter=self.request.user)    # un recruteur ne touche qu'à ses annonces
        qs = qs.filter(status="open")                       # le public ne voit que les annonces ouvertes
        if self.action == "list":
            city = self.request.query_params.get("city")
            if city:
                qs = qs.filter(city__icontains=city)
            for field in ("contract_type", "education_level", "experience", "work_mode"):
                value = self.request.query_params.get(field)
                if value:
                    qs = qs.filter(**{field: value})
            category = self.request.query_params.get("category")
            if category:
                qs = qs.filter(category_id=category)
            search = self.request.query_params.get("search")
            if search:
                qs = qs.filter(Q(title__icontains=search)
                               | Q(short_description__icontains=search)
                               | Q(full_description__icontains=search))
        return qs
 
    def perform_create(self, serializer):
        user = self.request.user
        if user.company is None:
            raise PermissionDenied("Votre compte n'est lié à aucune entreprise.")
        serializer.save(recruiter=user, company=user.company)   # status = "open" par défaut
 
    def perform_destroy(self, instance):                     # « supprimer » = fermer l'annonce
        instance.status = "closed"
        instance.save(update_fields=["status", "modified_at"])


class ApplicationCVView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        application = get_object_or_404(Application.objects.select_related("ad"), pk=pk)
        if request.user.pk not in (application.candidate_id, application.ad.recruiter_id):
            raise PermissionDenied("Vous n'avez pas accès à ce CV.")
        if not application.cv:
            raise Http404("Aucun CV joint.")
        try:
            file = application.cv.open("rb")
        except FileNotFoundError:
            raise Http404("CV introuvable.")
        return FileResponse(file, as_attachment=True, filename=Path(application.cv.name).name,
                            content_type="application/pdf")

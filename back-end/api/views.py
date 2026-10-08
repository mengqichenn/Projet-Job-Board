from django.shortcuts import render
from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import RegisterSerializer, AdSerializer
from .models import Ad


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
        serializer = AdSerializer(ads, many=True)
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
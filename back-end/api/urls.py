from django.urls import path
from . import views


urlpatterns = [
    path("applications/<int:pk>/cv", views.ApplicationCVView.as_view()),
    path("auth/register", views.RegisterView.as_view()),
    path("auth/login", views.LoginView.as_view()),          # URLs retourne du JSON
    path("auth/me", views.MeView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("ads", views.AdViewSet.as_view({"get": "list", "post": "create"})),
    path("ads/<int:pk>", views.AdViewSet.as_view({
        "get": "retrieve", "put": "update", "patch": "partial_update",
        "delete": "destroy",
    })),
    path("categories", views.CategoryListView.as_view()),
    path("ads/<int:ad_id>/apply", views.ApplyView.as_view()),
    path("recruiter/applications", views.RecruiterApplicationsView.as_view()),
    path("ads/<int:ad_id>/messages", views.MessageCreateView.as_view()),
    path("candidate/applications", views.CandidateApplicationsView.as_view()),
    path("applications/<int:pk>/status", views.UpdateApplicationStatusView.as_view()),
    path("messages/<int:pk>/read", views.MessageMarkReadView.as_view()),
]

from django.urls import path
from . import views


urlpatterns = [
    path("auth/register", views.RegisterView.as_view()),
    path("auth/login", views.LoginView.as_view()),          # URLs retourne du JSON
    path("auth/me", views.MeView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("ads", views.AdListView.as_view()),
    path("ads/<int:pk>", views.AdDetailView.as_view()),
    path("categories", views.CategoryListView.as_view()),
    path("ads/<int:ad_id>/apply", views.ApplyView.as_view()),
    path("recruiter/applications", views.RecruiterApplicationsView.as_view()),
]
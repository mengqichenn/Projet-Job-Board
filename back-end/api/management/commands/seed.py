from django.core.management.base import BaseCommand
from api.models import Category

CATEGORIES = [
    "Informatique et développement",
    "Data et IA",
    "Cybersécurité",
    "Réseaux et systèmes",
    "Marketing et communication",
    "Commerce et vente",
    "Finance et comptabilité",
    "Ressources humaines",
    "Santé",
    "Éducation et formation",
    "Industrie et production",
    "Logistique et transport",
    "BTP et construction",
    "Hôtellerie et restauration",
    "Juridique",
    "Design et création",
]

class Command(BaseCommand):
    help = "Remplit la base avec les catégories de départ"

    def handle(self, *args, **kwargs):
        for category_name in CATEGORIES:
            Category.objects.get_or_create(name=category_name)
        self.stdout.write("Catégories prêtes.")
from api.models import Category
 
CATEGORIES = {
    "tech": "Informatique et numérique", "administration": "Administration et gestion",
    "commerce": "Commerce et vente", "marketing": "Marketing et communication",
    "finance": "Finance, banque et comptabilité", "rh": "Ressources humaines",
    "sante": "Santé et services sociaux", "education": "Éducation et formation",
    "industrie": "Industrie et production", "logistique": "Logistique et transport",
    "tourisme": "Tourisme et hôtellerie", "agri": "Agriculture",
    "btp": "BTP et construction", "juridique": "Juridique et droit",
    "creation": "Création et design", "autres": "Autres",
}
 
for slug, name in CATEGORIES.items():
    Category.objects.update_or_create(name=name, defaults={"slug": slug})
 
print(Category.objects.count(), "catégories en base")
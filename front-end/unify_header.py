"""Met le MÊME <header> (avec le menu déroulant "Mon compte") dans les 6 pages.

À lancer depuis le dossier front-end :   python3 unify_header.py

Le header est celui de main.html (marque Talentis, deux menus : candidate / recruiter,
data-role, avatar et initiales remplis par js/menu.js), avec ces liens :
  - candidat   : Modifier mon profil (edit-profile.html), Mes candidatures (dashboard-candidate.html), Déconnexion
  - recruteur  : Modifier mon profil (edit-profile.html), Mes offres (dashboard-recruiter.html), Déconnexion

Le script remplace aussi <!--HEADER--> dans les pages dashboard et edit-profile.
Dans main.html, login.html et account.html il ne change que le header, plus :
  - initMenu(user) appelé après initPage() (pour que les initiales s'affichent)
  - js/menu.js ajouté dans login.html s'il manque
Annuler : git checkout -- <fichier>
"""
import os
import re

PAGES = ["main.html", "login.html", "account.html",
         "dashboard-candidate.html", "dashboard-recruiter.html", "edit-profile.html"]

HEADER = """<header class="site-header">
        <div class="container">
            <a class="jobboard" href="main.html"><span>Talentis</span></a>
            <nav class="navbar">

                <!--header avec différents data-role-->

                <li><a href="main.html">Offres</a></li>

                <li data-role="visitor" hidden><a class="btn btn-sm" href="login.html">Se connecter</a></li>
                <li data-role="visitor" hidden><a class="btn btn-sm" href="account.html">S'inscrire</a></li>


                <!--Menu déroulant pour candidat-->
                <li class="menu" data-role="candidate" hidden>
                    <details>
                        <summary class="menu-toggle" aria-label="Menu du compte">
                            <span class="avatar menu-initials">MC</span><span class="menu-name">Mon compte</span>
                        </summary>
                        <div class="menu-panel">
                            <a class="menu-profile" href="edit-profile.html">
                                <span class="avatar menu-initials">MC</span>
                                <span><strong class="menu-name">Mon compte</strong><small>Modifier mon profil</small></span>
                            </a>
                            <hr>
                            <a href="dashboard-candidate.html">Mes candidatures</a>
                            <hr>
                            <button type="button" data-logout>Se déconnecter</button>
                        </div>
                    </details>
                </li>

                <!--Menu déroulant pour recruteur-->
                <li class="menu" data-role="recruiter" hidden>
                    <details>
                        <summary class="menu-toggle" aria-label="Menu du compte">
                            <span class="avatar menu-initials">MC</span><span class="menu-name">Mon compte</span>
                        </summary>
                        <div class="menu-panel">
                            <a class="menu-profile" href="edit-profile.html">
                                <span class="avatar menu-initials">MC</span>
                                <span><strong class="menu-name">Mon compte</strong><small>Modifier mon profil</small></span>
                            </a>
                            <hr>
                            <a href="dashboard-recruiter.html">Mes offres</a>
                            <hr>
                            <button type="button" data-logout>Se déconnecter</button>
                        </div>
                    </details>
                </li>
            </nav>
        </div>
    </header>"""

CHECKS = [("icône", "icon.ico"), ("style.css", 'href="style.css"'), ("js/api.js", "js/api.js"),
          ("js/menu.js", "js/menu.js"), ("initPage()", "initPage("), ("initMenu()", "initMenu(")]

print(f"{'page':28}" + "".join(f"{c[0]:12}" for c in CHECKS))
for name in PAGES:
    if not os.path.exists(name):
        print(f"{name:28}FICHIER ABSENT")
        continue
    html = open(name, encoding="utf-8").read()

    header = HEADER
    if name == "main.html":
        header = header.replace('href="main.html">Offres', 'href="main.html" aria-current="page">Offres')

    if "<!--HEADER-->" in html:
        html = html.replace("<!--HEADER-->", header)
    elif re.search(r"<header.*?</header>", html, re.S):
        html = re.sub(r"<header.*?</header>", lambda m: header, html, count=1, flags=re.S)
    else:
        print(f"{name:28}PAS DE <header> : à ajouter à la main juste après <body>")
        continue

    # initMenu(user) après initPage() dans les pages de l'équipe (sans toucher au reste de leur script)
    if "initMenu(" not in html:
        if 'console.log("Utilisateur connecté :", user);' in html:                    # main.html
            html = html.replace('console.log("Utilisateur connecté :", user);',
                                'console.log("Utilisateur connecté :", user);\n        if (typeof initMenu === "function") initMenu(user);', 1)
        else:                                                                         # login.html, account.html
            html = re.sub(r"^(\s*)initPage\(\);", r'\1initPage().then(u => { if (typeof initMenu === "function") initMenu(u); });',
                          html, count=1, flags=re.M)
    if "js/menu.js" not in html and '<script src="js/api.js"></script>' in html:      # login.html
        html = html.replace('<script src="js/api.js"></script>',
                            '<script src="js/api.js"></script>\n<script src="js/menu.js"></script>', 1)

    open(name, "w", encoding="utf-8").write(html)
    rest = html.replace(header, "")
    print(f"{name:28}" + "".join(f"{('ok' if needle in rest else 'MANQUE'):12}" for _, needle in CHECKS))

print("\nHeader mis à jour. 'MANQUE' = à ajouter dans la page.")

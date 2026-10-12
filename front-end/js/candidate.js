const statusLabels = {
    sent: "Envoyée",
    seen: "Vue",
    interview: "Entretien",
    rejected: "Refusée",
    accepted: "Acceptée",
};

async function loadApplications() {
    const list = document.querySelector(".ad-list");
    list.textContent = "Chargement de vos candidatures...";

    try {
        const applications = await api("/candidate/applications");

        if (applications.length === 0) {
            list.textContent = "Vous n'avez pas encore postulé.";
            return;
        }

        const cards = document.createDocumentFragment();

        for (const app of applications) {
            const card = document.createElement("article");
            card.className = "ad ad-row";

            const title = document.createElement("h3");
            title.className = "ad-title";
            title.textContent = app.ad_title;

            const date = document.createElement("p");
            date.className = "ad-meta";
            date.textContent = "Envoyée le " + new Date(app.created_at).toLocaleDateString("fr-FR");

            const status = document.createElement("p");
            status.className = "ad-desc";
            status.textContent = "Statut : " + (statusLabels[app.status] || app.status);

            card.append(title, date, status);
            cards.append(card);
        }

        list.replaceChildren(cards);
    } catch (error) {
        list.textContent = "Impossible de charger vos candidatures : " + error.message;
    }
}

async function start() {
    const user = await initPage();
    if (!user || user.role !== "candidate") {
        location.href = "login.html";
        return;
    }
    await loadApplications();
}

start();
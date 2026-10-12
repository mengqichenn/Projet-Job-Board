let currentUser = null;

const labels = {
    full_time: "Temps plein",
    part_time: "Temps partiel",
    remote: "Télétravail",
    hybrid: "Hybride",
    onsite: "Sur site",
    debutant: "Moins d’un an",
    junior: "1 à 3 ans",
    confirme: "3 à 5 ans",
    senior: "Plus de 5 ans",
};

async function loadAds() {
    const list = document.querySelector(".ad-list");
    list.textContent = "Chargement des offres...";

    try {
        const ads = await api("/ads");
        const cards = document.createDocumentFragment();

        for (const ad of ads) {
            const card = document.getElementById("template-ad").content.firstElementChild.cloneNode(true);

            card.dataset.id = ad.id;

            card.querySelector(".ad-title").textContent = ad.title;
            card.querySelector(".ad-meta").textContent = [
                ad.company_name,
                ad.city,
                ad.postal_code,
            ].filter(Boolean).join(" · ");

            card.querySelector(".ad-desc").textContent = ad.short_description;

            const tags = card.querySelector(".ad-tages");
            tags.replaceChildren();

            for (const [index, value] of [
                ad.contract_type,
                ad.working_time,
                ad.work_mode,
                ad.experience,
            ].entries()) {
                if (!value) continue;

                const tag = document.createElement("li");
                tag.textContent = labels[value] || value;
                if (index === 0) tag.className = "is-contract";
                tags.append(tag);
            }


            const min = ad.monthly_salary_min;
            const max = ad.monthly_salary_max;
            const euros = value => Number(value).toLocaleString("fr-FR") + " €";

            card.querySelector(".ad-salary").textContent = min != null && max != null
                ? `${euros(min)} à ${euros(max)} / mois`
                : min != null
                        ? `À partir de ${euros(min)} / mois`
                        : max != null
                            ? `Jusqu’à ${euros(max)} / mois`
                            : "Salaire non précisé";
            
            
            const date = card.querySelector(".ad-date");
            date.dateTime = ad.created_at;
            date.textContent = new Date(ad.created_at).toLocaleDateString("fr-FR");

            card.querySelector("[data-apply]").hidden = currentUser?.role !== "candidate";

            cards.append(card);
        }

        list.replaceChildren(cards);

        if (ads.length === 0) {
            list.textContent = "Aucune offre disponible pour le moment.";
        }
    } catch (error) {
        list.textContent = "Impossible de charger les offres : " + error.message;
    }
}

async function start() {
    currentUser = await initPage();
    await loadAds;
    
}

start();
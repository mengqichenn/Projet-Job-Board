(() => {
  const common = window.AdminCommon;
  const list = document.getElementById("promos-list");
  if (!list) return;

  const storageKey = "talentis-admin-promos";
  const statusFilter = document.getElementById("promo-status");
  const addButton = document.getElementById("add-promo");
  let promos = [];
  const statusLabels = { active: "Active", pending: "En attente", closed: "Terminée" };

  function save() { localStorage.setItem(storageKey, JSON.stringify(promos)); }

  function render() {
    const results = promos.filter(promo => statusFilter.value === "all" || promo.status === statusFilter.value);
    list.innerHTML = results.length ? results.map(promo => `
      <article class="app"><div><h3>${common.escape(promo.title)}</h3><p class="muted">${common.escape(promo.details)}</p></div>
      <div class="admin-actions"><span class="badge ${promo.status === "active" ? "s-active" : promo.status === "pending" ? "s-attente" : "s-fermee"}">${statusLabels[promo.status]}</span>
      <button class="btn btn-ghost btn-sm" type="button" data-edit-promo="${common.escape(promo.id)}">Modifier</button>
      <button class="btn btn-danger btn-sm" type="button" data-delete-promo="${common.escape(promo.id)}">Supprimer</button></div></article>`).join("") : common.empty(list, "Aucune annonce pour le moment.");
  }

  function openPromoForm(promo = null) {
    const dialog = common.formDialog(promo ? "Modifier une annonce" : "Ajouter une annonce", [
      ["title", "Titre de l'annonce", promo?.title || "", "text"],
      ["details", "Détails", promo?.details || "", "text", false],
    ], [["status", "Statut", promo?.status || "active", [["active", "Active"], ["pending", "En attente"], ["closed", "Terminée"]]]]);
    dialog.addEventListener("submit", event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(event.target));
      if (promo) Object.assign(promo, values);
      else promos.unshift({ id: `promo-${Date.now()}`, ...values });
      save(); render();
      common.report("Annonce enregistrée dans ce navigateur uniquement : aucune synchronisation serveur n'est disponible.");
      dialog.close(); dialog.remove();
    });
  }

  async function init() {
    if (!await common.requireAdmin()) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        promos = JSON.parse(saved);
      } else {
        promos = [...list.querySelectorAll("article.app")].map((article, index) => {
          const label = article.querySelector(".badge")?.textContent.trim();
          return {
            id: `promo-${index + 1}`,
            title: article.querySelector("h3")?.textContent.trim() || "Annonce",
            details: article.querySelector("p")?.textContent.trim() || "",
            status: label === "En attente" ? "pending" : label === "Terminée" ? "closed" : "active",
          };
        });
        save();
      }
      render();
      statusFilter.addEventListener("change", render);
      addButton.addEventListener("click", () => openPromoForm());
      list.addEventListener("click", event => {
        const editButton = event.target.closest("[data-edit-promo]");
        const deleteButton = event.target.closest("[data-delete-promo]");
        if (editButton) openPromoForm(promos.find(promo => promo.id === editButton.dataset.editPromo));
        if (deleteButton && confirm("Supprimer cette annonce locale ?")) {
          promos = promos.filter(promo => promo.id !== deleteButton.dataset.deletePromo);
          save(); render(); common.report("Annonce supprimée de ce navigateur uniquement.");
        }
      });
      common.report("Les annonces promotionnelles sont enregistrées localement dans ce navigateur.");
    } catch (error) { common.report(`Impossible de charger les annonces locales : ${error.message}`, true); }
  }
  init();
})();
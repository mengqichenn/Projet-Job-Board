(() => {
  const common = window.AdminCommon;
  const list = document.getElementById("companies-list");
  if (!list) return;

  const search = document.getElementById("company-search");
  let companies = [];
  let ads = [];

  function render() {
    const query = search.value.trim().toLocaleLowerCase("fr");
    const results = companies.filter(company => `${company.name} ${company.city} ${company.postal_code}`.toLocaleLowerCase("fr").includes(query));
    list.innerHTML = results.length ? results.map(company => {
      const count = ads.filter(ad => String(ad.company) === String(company.id)).length;
      return `<article class="app"><div><h3>${common.escape(company.name)}</h3><p class="muted">${common.escape(company.city)} · ${common.escape(company.postal_code)}</p></div>
        <div class="admin-actions"><span class="badge s-active">${count} offre${count === 1 ? "" : "s"}</span>
        <button class="btn btn-ghost btn-sm" type="button" data-action="edit" data-id="${company.id}">Modifier</button>
        <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${company.id}">Supprimer</button></div></article>`;
    }).join("") : common.empty(list, "Aucune entreprise pour le moment.");
  }

  function create() {
    const dialog = common.formDialog("Ajouter une entreprise", [
      ["name", "Nom", "", "text"],
      ["siret", "SIRET (14 chiffres)", "", "text"],
      ["city", "Ville", "", "text"],
      ["postal_code", "Code postal", "", "text"],
      ["website", "Site web", "", "url", false],
      ["description", "Description", "", "textarea", false],
    ]);
    dialog.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        await api("/admin/companies", { method: "POST", body: Object.fromEntries(new FormData(event.target)) });
        companies = await common.list("/admin/companies");
        render(); common.report("Entreprise ajoutée."); dialog.close(); dialog.remove();
      } catch (error) { common.report(error.message, true); }
    });
  }

  function edit(company) {
    const dialog = common.formDialog("Modifier une entreprise", [
      ["name", "Nom", company.name, "text"],
      ["siret", "SIRET (14 chiffres)", company.siret, "text"],
      ["city", "Ville", company.city, "text"],
      ["postal_code", "Code postal", company.postal_code, "text"],
      ["website", "Site web", company.website, "url", false],
      ["description", "Description", company.description, "textarea", false],
    ]);
    dialog.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        await api(`/admin/companies/${company.id}`, { method: "PATCH", body: Object.fromEntries(new FormData(event.target)) });
        companies = await common.list("/admin/companies");
        render(); common.report("Entreprise modifiée."); dialog.close(); dialog.remove();
      } catch (error) { common.report(error.message, true); }
    });
  }

  async function init() {
    if (!await common.requireAdmin()) return;
    try {
      [companies, ads] = await Promise.all([common.list("/admin/companies"), common.list("/admin/ads")]);
      render();
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "btn btn-sm";
      addButton.textContent = "Ajouter une entreprise";
      addButton.addEventListener("click", create);
      search.closest(".admin-toolbar").append(addButton);
      search.addEventListener("input", render);
      list.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const company = companies.find(item => String(item.id) === button.dataset.id);
        if (!company) return;
        if (button.dataset.action === "edit") { edit(company); return; }
        if (!confirm(`Supprimer l'entreprise ${company.name} ?`)) return;
        try {
          await api(`/admin/companies/${company.id}`, { method: "DELETE" });
          companies = await common.list("/admin/companies");
          render(); common.report("Entreprise supprimée.");
        } catch (error) { common.report(error.message, true); }
      });
    } catch (error) { common.report(`Impossible de charger les entreprises : ${error.message}`, true); }
  }
  init();
})();
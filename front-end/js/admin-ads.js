(() => {
  const common = window.AdminCommon;
  const list = document.getElementById("ads-list");
  if (!list) return;

  const search = document.getElementById("ads-search");
  const status = document.getElementById("ads-status");
  let ads = [];
  let companies = [];

  function render() {
    const query = search.value.trim().toLocaleLowerCase("fr");
    const results = ads.filter(ad => `${ad.title} ${common.companyName(companies, ad.company)} ${ad.city}`.toLocaleLowerCase("fr").includes(query)
      && (status.value === "all" || status.value === ad.status));
    list.innerHTML = results.length ? results.map(ad => `
      <article class="app"><div><h3>${common.escape(ad.title)}</h3><p class="muted">${common.escape(common.companyName(companies, ad.company))} · ${common.escape(ad.city)} · ${common.escape(ad.contract_type)}</p></div>
      <div class="admin-actions"><span class="badge ${common.statusClass(ad.status)}">${common.escape(common.statusLabel(ad.status))}</span>
      <button class="btn btn-ghost btn-sm" type="button" data-action="edit" data-id="${ad.id}">Modifier</button>
      <button class="btn btn-ghost btn-sm" type="button" data-action="toggle" data-id="${ad.id}">${ad.status === "open" ? "Fermer" : "Rouvrir"}</button>
      <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${ad.id}">Supprimer</button></div></article>`).join("") : common.empty(list, "Aucune offre pour le moment.");
  }

  async function reload() {
    ads = await common.list("/admin/ads");
    render();
  }

  function edit(ad) {
    const dialog = common.formDialog("Modifier une offre", [
      ["title", "Intitulé", ad.title, "text"],
      ["short_description", "Description courte", ad.short_description, "text"],
      ["full_description", "Description complète", ad.full_description, "textarea"],
      ["city", "Ville", ad.city, "text", false],
      ["postal_code", "Code postal", ad.postal_code, "text", false],
    ], [
      ["contract_type", "Contrat", ad.contract_type, [["CDI", "CDI"], ["CDD", "CDD"], ["Stage", "Stage"], ["Alternance", "Alternance"], ["Interim", "Intérim"]]],
      ["status", "Statut", ad.status, [["open", "Ouverte"], ["closed", "Fermée"]]],
    ]);
    dialog.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        await api(`/admin/ads/${ad.id}`, { method: "PATCH", body: Object.fromEntries(new FormData(event.target)) });
        await reload(); common.report("Offre modifiée."); dialog.close(); dialog.remove();
      } catch (error) { common.report(error.message, true); }
    });
  }

  async function init() {
    if (!await common.requireAdmin()) return;
    try {
      [ads, companies] = await Promise.all([common.list("/admin/ads"), common.list("/admin/companies")]);
      render();
      search.addEventListener("input", render);
      status.addEventListener("change", render);
      list.addEventListener("click", async event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const ad = ads.find(item => String(item.id) === button.dataset.id);
        if (!ad) return;
        try {
          if (button.dataset.action === "edit") { edit(ad); return; }
          if (button.dataset.action === "delete") {
            if (!confirm(`Supprimer l'offre « ${ad.title} » et ses candidatures ?`)) return;
            await api(`/admin/ads/${ad.id}`, { method: "DELETE" });
            common.report("Offre supprimée.");
          } else {
            const nextStatus = ad.status === "open" ? "closed" : "open";
            await api(`/admin/ads/${ad.id}`, { method: "PATCH", body: { status: nextStatus } });
            common.report(nextStatus === "closed" ? "Offre fermée." : "Offre rouverte.");
          }
          await reload();
        } catch (error) { common.report(error.message, true); }
      });
    } catch (error) { common.report(`Impossible de charger les offres : ${error.message}`, true); }
  }
  init();
})();
(() => {
  const common = window.AdminCommon;
  const list = document.getElementById("applications-list");
  if (!list) return;

  const filter = document.getElementById("application-status");
  let applications = [];
  let users = [];
  let ads = [];
  let companies = [];

  function render() {
    const results = applications.filter(application => filter.value === "all" || application.status === filter.value);
    list.innerHTML = results.length ? results.map(application => {
      const ad = ads.find(item => String(item.id) === String(application.ad));
      const user = users.find(item => String(item.id) === String(application.candidate));
      const candidate = user ? common.name(user) : `${application.first_name || "Candidat"} ${application.last_name || ""}`.trim();
      const options = [["sent", "Envoyée"], ["seen", "Vue"], ["interview", "Entretien"], ["accepted", "Acceptée"], ["rejected", "Refusée"]];
      return `<article class="app"><div><h3>${common.escape(candidate)} · ${common.escape(ad?.title || "Offre inconnue")}</h3>
        <p class="muted">${common.escape(application.email)} · ${common.escape(ad ? common.companyName(companies, ad.company) : "Entreprise inconnue")} · ${common.date(application.created_at)}</p>
        <p class="letter">${common.escape(application.message)}</p></div>
        <div class="admin-actions"><span class="badge ${common.statusClass(application.status)}">${common.escape(common.statusLabel(application.status))}</span>
        <label class="admin-control" for="application-status-${application.id}">Statut<select id="application-status-${application.id}" data-application-status="${application.id}">
          ${options.map(([value, label]) => `<option value="${value}" ${application.status === value ? "selected" : ""}>${label}</option>`).join("")}
        </select></label></div></article>`;
    }).join("") : common.empty(list, "Aucune candidature pour le moment.");
  }

  async function init() {
    if (!await common.requireAdmin()) return;
    try {
      [applications, users, ads, companies] = await Promise.all([
        common.list("/admin/applications"), common.list("/admin/users"),
        common.list("/admin/ads"), common.list("/admin/companies"),
      ]);
      render();
      filter.addEventListener("change", render);
      list.addEventListener("change", async event => {
        const select = event.target.closest("[data-application-status]");
        if (!select) return;
        try {
          await api(`/admin/applications/${select.dataset.applicationStatus}`, { method: "PATCH", body: { status: select.value } });
          applications = await common.list("/admin/applications");
          render(); common.report("Statut de candidature mis à jour.");
        } catch (error) { common.report(error.message, true); }
      });
    } catch (error) { common.report(`Impossible de charger les candidatures : ${error.message}`, true); }
  }
  init();
})();
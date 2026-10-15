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
        <span class="badge s-active">${count} offre${count === 1 ? "" : "s"}</span></article>`;
    }).join("") : common.empty(list, "Aucune entreprise pour le moment.");
  }

  async function init() {
    if (!await common.requireAdmin()) return;
    try {
      [companies, ads] = await Promise.all([common.list("/admin/companies"), common.list("/admin/ads")]);
      render();
      search.addEventListener("input", render);
    } catch (error) { common.report(`Impossible de charger les entreprises : ${error.message}`, true); }
  }
  init();
})();
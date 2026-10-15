(() => {
  const common = window.AdminCommon;
  const list = document.getElementById("users-list");
  if (!list) return;

  let users = [];
  
  let currentPage = 1;
  let totalPages = 1;

  const pageSize = 10; // Number of users per page

  const search = document.getElementById("search");
  const roleFilter = document.getElementById("role-filter");
  const roleNames = { candidate: "Candidat", recruiter: "Recruteur", admin: "Admin" };
  const previousButton = document.getElementById("user-previous");
  const nextButton = document.getElementById("user-next");
  const pageInfo = document.getElementById("user-page-info");

  let searchTimeout;

  // debounce : attend 300ms avant l'envoi de requête
  search.addEventListener("input", () => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(async () => {
          currentPage = 1;
          await reload();
      }, 300);
  });


  function render() {
    const results = users;
    list.innerHTML = results.length ? results.map(user => `
      <article class="app"><div><h3>${common.escape(common.name(user))}</h3><p class="muted">${common.escape(user.email)}</p></div>
      <div class="admin-actions"><span class="badge ${user.role === "recruiter" ? "s-active" : user.role === "admin" ? "s-vue" : "s-attente"}">${common.escape(roleNames[user.role] || user.role)}</span>
      <button class="btn btn-ghost btn-sm" type="button" data-action="edit" data-id="${user.id}">Modifier</button>
      <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${user.id}">Supprimer</button></div></article>`).join("") : common.empty(list, "Aucun utilisateur pour le moment.");
      pageInfo.textContent = `Page ${currentPage} sur ${Math.max(totalPages, 1)}`;

      previousButton.disabled = currentPage <= 1;
      nextButton.disabled = currentPage >= totalPages;
  }

  async function reload() {
    const params = new URLSearchParams({
      page: currentPage,
      page_size : pageSize
    });
    if (roleFilter.value !== "all") {
      params.append("role", roleFilter.value);
    }
    if (search.value.trim()){
      params.append("search", search.value.trim());
    }
    const data = await api(`/admin/users?${params}`);

    users = data.results || [];
    totalPages = Math.ceil((data.count || 0) / pageSize);
    render();
  }

  function edit(user) {
    const dialog = common.formDialog("Modifier un utilisateur", [
      ["first_name", "Prénom", user.first_name, "text"], ["last_name", "Nom", user.last_name, "text"],
      ["email", "Adresse e-mail", user.email, "email"], ["telephone", "Téléphone", user.telephone, "tel", false],
      ["city", "Ville", user.city, "text"], ["postal_code", "Code postal", user.postal_code, "text"],
    ], [["role", "Rôle", user.role, [["candidate", "Candidat"], ["recruiter", "Recruteur"], ["admin", "Admin"]]]]);
    dialog.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        await api(`/admin/users/${user.id}`, { method: "PATCH", body: Object.fromEntries(new FormData(event.target)) });
        await reload(); common.report("Utilisateur modifié."); dialog.close(); dialog.remove();
      } catch (error) { common.report(error.message, true); }
    }); 
  }

  async function init() {
    if (!await common.requireAdmin()) return;
    try {
      await reload();
      search.addEventListener("input", async()=>{
        currentPage = 1;
        await reload();
      });
      roleFilter.addEventListener("change", async() => {
        currentPage = 1;
        await reload();
      });
      previousButton.addEventListener("click", async () => {
        if (currentPage > 1) {
          currentPage--;
          await reload();
        }
      });

      nextButton.addEventListener("click", async () => {
        if (currentPage < totalPages) {
          currentPage++;
          await reload();
        }
      });
      list.addEventListener("click", async event => {
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const user = users.find(item => String(item.id) === button.dataset.id);
        if (!user) return;
        if (button.dataset.action === "edit") { edit(user); return; }
        if (!confirm(`Supprimer le compte de ${common.name(user)} ?`)) return;
        try {
          await api(`/admin/users/${user.id}`, { method: "DELETE" });
          await reload(); common.report("Utilisateur supprimé.");
        } catch (error) { common.report(error.message, true); }
      });
    } catch (error) { common.report(`Impossible de charger les utilisateurs : ${error.message}`, true); }
  }
  init();
})();
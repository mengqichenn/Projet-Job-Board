// admin.js - page "Gestion des utilisateurs"

const ROLE_LABELS = { candidate: "Candidat", recruiter: "Recruteur", admin: "Admin" };
const ROLE_BADGES = { candidate: "s-vue", recruiter: "s-active", admin: "s-attente" };

let currentUser = null;   // l'admin connecté
let currentPage = 1;      // la page affichée

// Empêche qu'un texte venant de la base soit lu comme du HTML (sécurité)
function esc(text) {
  return String(text ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Construit le HTML d'une ligne d'utilisateur
function userRow(u) {
  const name = `${u.first_name} ${u.last_name}`.trim() || u.email;
  const city = u.city ? ` · ${u.city}` : "";
  return `
    <article class="app" data-user-id="${u.id}" data-user-role="${esc(u.role)}">
      <div>
        <h3>${esc(name)}</h3>
        <p class="muted">${esc(u.email)}${esc(city)}</p>
      </div>
      <div class="admin-actions">
        <span class="badge ${ROLE_BADGES[u.role] || ""}">${esc(ROLE_LABELS[u.role] || u.role)}</span>
        <button class="btn btn-ghost btn-sm" data-act="edit">Modifier</button>
        <button class="btn btn-danger btn-sm" data-act="delete">Supprimer</button>
      </div>
    </article>`;
}

// Barre de pagination : Précédent / Suivant
function renderPager(data, page) {
  let pager = document.getElementById("users-pager");
  if (!pager) {
    pager = document.createElement("div");
    pager.id = "users-pager";
    pager.className = "admin-actions";
    document.getElementById("users-list").after(pager);
  }
  pager.innerHTML = `
    <button class="btn btn-ghost btn-sm" data-page="${page - 1}" ${data.previous ? "" : "disabled"}>Précédent</button>
    <span class="muted">Page ${page} · ${data.count} utilisateurs</span>
    <button class="btn btn-ghost btn-sm" data-page="${page + 1}" ${data.next ? "" : "disabled"}>Suivant</button>`;
}

// Va chercher une page d'utilisateurs et l'affiche
async function loadUsers(page = 1) {
  const data = await api(`/admin/users?page=${page}`);
  const list = document.getElementById("users-list");
  const empty = document.getElementById("users-empty");

  currentPage = page;
  list.querySelectorAll("article").forEach(a => a.remove());
  empty.insertAdjacentHTML("beforebegin", data.results.map(userRow).join(""));
  renderPager(data, page);
}

// Supprime un utilisateur (avec confirmation)
async function deleteUser(id) {
  if (id === currentUser.id) {
    alert("Tu ne peux pas supprimer ton propre compte.");
    return;
  }
  if (!confirm("Supprimer définitivement cet utilisateur ?")) return;

  try {
    await api(`/admin/users/${id}`, { method: "DELETE" });
    await loadUsers(currentPage).catch(() => loadUsers(1));
  } catch (err) {
    alert(err.message);
  }
}

// Clic sur un bouton de pagination
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-page]");
  if (btn && !btn.disabled) loadUsers(Number(btn.dataset.page));
});

// Clic sur un bouton d'action (Modifier / Supprimer)
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-act]");
  if (!btn) return;
  const id = Number(btn.closest("article").dataset.userId);
  if (btn.dataset.act === "delete") deleteUser(id);
});

// Démarrage : on vérifie que c'est bien un admin, sinon retour à la connexion
async function startAdminPage() {
  try {
    currentUser = await api("/auth/me");
    if (!currentUser || currentUser.role !== "admin") {
      location.href = "login.html";
      return;
    }
    await loadUsers();
  } catch (err) {
    console.error(err);
    location.href = "login.html";
  }
}

startAdminPage();
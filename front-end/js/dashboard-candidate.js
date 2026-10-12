/* ==================================================================
   MOCK = true  : données de test (la page marche sans back-end, le menu s'affiche comme un candidat connecté)
   MOCK = false : vraie API via api() de js/api.js
   Les adresses /applications/... sont à confirmer avec le back-end.
================================================================== */
const MOCK = true;

let applications = [
  { id: 1, title: "Développeur Python junior", company: "TechNova",  city: "Montpellier", date: "2026-10-01", status: "attente", cv: "cv_2026.pdf",   letter: "Bonjour, étudiant en informatique, je suis très intéressé par votre offre de développeur Python…" },
  { id: 2, title: "Stagiaire développeur web",  company: "WebAgency", city: "Paris",       date: "2026-09-28", status: "vue",     cv: "cv_2026.pdf",   letter: "Je souhaite rejoindre votre équipe pour approfondir mes compétences en HTML, CSS et Django…" },
  { id: 3, title: "Alternant DevOps",           company: "CloudSud",  city: "Toulouse",    date: "2026-09-20", status: "accepte", cv: "cv_devops.pdf", letter: "Passionné par Docker et l'automatisation, je candidate à votre alternance…" },
  { id: 4, title: "Data analyst junior",        company: "DataLab",   city: "Lyon",        date: "2026-09-12", status: "refuse",  cv: "cv_2026.pdf",   letter: "Votre offre correspond à mon projet professionnel…" }
];

/* ---- Accès aux données : seul endroit à adapter quand le back sera prêt ---- */
async function apiLoadApplications(){
  return MOCK ? applications : api("/applications/");
}
async function apiUpdateApplication(id, { letter, file }){
  if (MOCK){ const a = applications.find(x => x.id === id); a.letter = letter; if (file) a.cv = file.name; return; }
  const fd = new FormData();
  fd.append("letter", letter);
  if (file) fd.append("cv", file);
  return api(`/applications/${id}/`, { method: "PATCH", body: fd });
}
async function apiDeleteApplication(id){
  if (MOCK){ applications = applications.filter(a => a.id !== id); return; }
  return api(`/applications/${id}/`, { method: "DELETE" });
}

const STATUS = { attente:"En attente", vue:"Vue par le recruteur", accepte:"Acceptée", refuse:"Refusée" };
const $ = id => document.getElementById(id);
let currentId = null;

function esc(s){ const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function fmt(d){ return new Date(d).toLocaleDateString("fr-FR", {day:"numeric", month:"long", year:"numeric"}); }
function toast(msg){ const t = $("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }
const fail = err => toast(err?.data?.detail || "Une erreur est survenue, réessaie.");

function renderStats(){
  const count = s => applications.filter(a => a.status === s).length;
  $("stats").innerHTML =
    `<div><strong>${applications.length}</strong><span class="muted">Candidatures</span></div>` +
    `<div><strong>${count("attente")}</strong><span class="muted">En attente</span></div>` +
    `<div><strong>${count("accepte")}</strong><span class="muted">Acceptées</span></div>`;
}

function renderList(){
  const f = $("filter").value;
  const items = applications.filter(a => f === "all" || a.status === f);
  if (!items.length){
    $("list").innerHTML = `<div class="empty">${applications.length
      ? "Aucune candidature avec ce statut."
      : 'Tu n\'as pas encore postulé. <a href="main.html">Voir les offres</a>'}</div>`;
    return;
  }
  $("list").innerHTML = items.map(a => {
    const closed = a.status === "accepte" || a.status === "refuse";
    return `
    <article class="app">
      <div>
        <h3>${esc(a.title)}</h3>
        <div class="muted">${esc(a.company)}, ${esc(a.city)} · postulé le ${fmt(a.date)}</div>
        <span class="badge s-${a.status}">${STATUS[a.status] ?? esc(a.status)}</span>
      </div>
      <div class="actions">
        <button class="btn btn-sm btn-ghost" data-edit="${a.id}" ${closed ? 'disabled title="Candidature clôturée"' : ""}>Modifier</button>
        <button class="btn btn-sm btn-danger" data-del="${a.id}">Retirer</button>
      </div>
      <p class="letter">${esc((a.letter || "").length > 140 ? a.letter.slice(0,140) + "…" : (a.letter || ""))}</p>
    </article>`;
  }).join("");
}

function render(){ renderStats(); renderList(); }

$("list").addEventListener("click", e => {
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
  if (edit){
    const a = applications.find(x => x.id === +edit.dataset.edit);
    currentId = a.id;
    $("edit-title").textContent = "Modifier : " + a.title;
    $("e-cv").value = "";
    $("e-cv-current").textContent = "CV actuel : " + a.cv + " (choisis un fichier pour le remplacer)";
    $("e-cv-error").textContent = "";
    $("e-letter").value = a.letter;
    $("dlg-edit").showModal();
  }
  if (del){
    const a = applications.find(x => x.id === +del.dataset.del);
    currentId = a.id;
    $("del-text").textContent = `Ta candidature pour « ${a.title} » chez ${a.company} sera supprimée.`;
    $("dlg-del").showModal();
  }
});

$("form-edit").addEventListener("submit", async e => {
  e.preventDefault();
  const file = $("e-cv").files[0];
  if (file){
    if (!/\.pdf$/i.test(file.name))  { $("e-cv-error").textContent = "Le CV doit être un fichier PDF."; return; }
    if (file.size > 5 * 1024 * 1024) { $("e-cv-error").textContent = "Le fichier dépasse 5 Mo."; return; }
  }
  try {
    await apiUpdateApplication(currentId, { letter: $("e-letter").value.trim(), file });
    applications = await apiLoadApplications();
    $("dlg-edit").close(); render(); toast("Candidature modifiée");
  } catch (err) { fail(err); }
});
$("edit-cancel").onclick = () => $("dlg-edit").close();

$("del-ok").onclick = async () => {
  try {
    await apiDeleteApplication(currentId);
    applications = await apiLoadApplications();
    $("dlg-del").close(); render(); toast("Candidature retirée");
  } catch (err) { fail(err); }
};
$("del-cancel").onclick = () => $("dlg-del").close();
$("filter").addEventListener("change", renderList);

(async () => {
  let user;
  if (MOCK){ user = { name: "Test Étudiant", role: "candidate" }; applyRole(user.role); }
  else     { user = await initPage(); if (!user || user.role !== "candidate") { location.href = "login.html"; return; } }
  if (typeof initMenu === "function") initMenu(user);
  try { applications = await apiLoadApplications(); } catch (err) { fail(err); applications = []; }
  render();
})();
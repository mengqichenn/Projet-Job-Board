/* ==================================================================
   MOCK = true  : données de test (la page marche sans back-end, le menu s'affiche comme un recruteur connecté)
   MOCK = false : vraie API via api() de js/api.js
   Les adresses /offers/... et /applications/... sont à confirmer avec le back-end.
================================================================== */
const MOCK = true;

let offers = [
  { id: 1, title: "Développeur Python junior", city: "Montpellier", contract: "CDI",        date: "2026-09-25", status: "active", description: "Rejoins notre équipe pour développer des API avec Django." },
  { id: 2, title: "Stagiaire développeur web",  city: "Paris",       contract: "Stage",      date: "2026-09-18", status: "active", description: "Stage de 6 mois sur notre site e-commerce." },
  { id: 3, title: "Alternant DevOps",           city: "Toulouse",    contract: "Alternance", date: "2026-08-30", status: "fermee", description: "Alternance autour de Docker et de l'intégration continue." }
];
let applicants = [
  { id: 1, offerId: 1, name: "Sara Benali",    email: "sara@exemple.fr",    date: "2026-10-01", status: "attente", cv: "cv_sara.pdf",    letter: "Bonjour, étudiante en informatique, votre offre de développeur Python correspond à mon projet…" },
  { id: 2, offerId: 1, name: "Youssef Amrani", email: "youssef@exemple.fr", date: "2026-09-29", status: "vue",     cv: "cv_youssef.pdf", letter: "Je me permets de vous adresser ma candidature pour le poste de développeur…" },
  { id: 3, offerId: 2, name: "Lina Moreau",    email: "lina@exemple.fr",    date: "2026-09-26", status: "accepte", cv: "cv_lina.pdf",    letter: "Passionnée par le web, je souhaite effectuer mon stage au sein de votre équipe…" },
  { id: 4, offerId: 3, name: "Karim Haddad",   email: "karim@exemple.fr",   date: "2026-09-10", status: "refuse",  cv: "cv_karim.pdf",   letter: "Intéressé par Docker et l'automatisation, je candidate à votre alternance…" }
];

async function apiLoadAll(){
  if (MOCK) return;
  [offers, applicants] = await Promise.all([ api("/offers/mine/"), api("/applications/received/") ]);
}
async function apiSaveOffer(data, id){
  if (MOCK){
    if (id) Object.assign(offers.find(o => o.id === id), data);
    else offers.unshift({ id: Date.now(), date: new Date().toISOString().slice(0,10), status: "active", ...data });
    return;
  }
  return id ? api(`/offers/${id}/`, { method: "PATCH", body: data })
            : api("/offers/",       { method: "POST",  body: data });
}
async function apiToggleOffer(id){
  const o = offers.find(x => x.id === id), status = o.status === "active" ? "fermee" : "active";
  if (MOCK){ o.status = status; return; }
  return api(`/offers/${id}/`, { method: "PATCH", body: { status } });
}
async function apiDeleteOffer(id){
  if (MOCK){ offers = offers.filter(o => o.id !== id); applicants = applicants.filter(a => a.offerId !== id); return; }
  return api(`/offers/${id}/`, { method: "DELETE" });
}
async function apiSetApplicantStatus(id, status){
  if (MOCK){ applicants.find(a => a.id === id).status = status; return; }
  return api(`/applications/${id}/`, { method: "PATCH", body: { status } });
}

const STATUS = { attente:"En attente", vue:"Vue", accepte:"Acceptée", refuse:"Refusée" };
const $ = id => document.getElementById(id);
let currentId = null;

function esc(s){ const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
function fmt(d){ return new Date(d).toLocaleDateString("fr-FR", {day:"numeric", month:"long", year:"numeric"}); }
function toast(msg){ const t = $("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }
const fail = err => toast(err?.data?.detail || "Une erreur est survenue, réessaie.");
const offerOf = id => offers.find(o => o.id === id);
async function refresh(){ await apiLoadAll(); render(); }

function renderStats(){
  const active = offers.filter(o => o.status === "active").length;
  const toDo = applicants.filter(a => a.status === "attente").length;
  $("stats").innerHTML =
    `<div><strong>${active}</strong><span class="muted">Offres actives</span></div>` +
    `<div><strong>${applicants.length}</strong><span class="muted">Candidatures reçues</span></div>` +
    `<div><strong>${toDo}</strong><span class="muted">À traiter</span></div>`;
}

function renderOffers(){
  if (!offers.length){ $("offers").innerHTML = '<div class="empty">Aucune offre pour le moment. Clique sur « Publier une offre ».</div>'; return; }
  $("offers").innerHTML = offers.map(o => {
    const n = applicants.filter(a => a.offerId === o.id).length;
    const active = o.status === "active";
    return `
    <article class="app">
      <div>
        <h3>${esc(o.title)}</h3>
        <div class="muted">${esc(o.city)} · ${esc(o.contract)} · publiée le ${fmt(o.date)} · ${n} candidature${n > 1 ? "s" : ""}</div>
        <span class="badge s-${o.status}">${active ? "Active" : "Fermée"}</span>
      </div>
      <div class="actions">
        <button class="btn btn-sm btn-ghost" data-act="apps" data-id="${o.id}">Candidatures</button>
        <button class="btn btn-sm btn-ghost" data-act="edit" data-id="${o.id}">Modifier</button>
        <button class="btn btn-sm btn-ghost" data-act="toggle" data-id="${o.id}">${active ? "Fermer" : "Rouvrir"}</button>
        <button class="btn btn-sm btn-danger" data-act="del" data-id="${o.id}">Supprimer</button>
      </div>
    </article>`;
  }).join("");
}

function renderOfferFilter(){
  const keep = $("f-offer").value || "all";
  $("f-offer").innerHTML = '<option value="all">Toutes</option>' +
    offers.map(o => `<option value="${o.id}">${esc(o.title)}</option>`).join("");
  $("f-offer").value = [...$("f-offer").options].some(x => x.value === keep) ? keep : "all";
}

function renderApplicants(){
  const fo = $("f-offer").value, fs = $("f-status").value;
  const items = applicants.filter(a => (fo === "all" || a.offerId === +fo) && (fs === "all" || a.status === fs));
  if (!items.length){
    $("applicants").innerHTML = `<div class="empty">${applicants.length ? "Aucune candidature avec ces filtres." : "Aucune candidature reçue pour le moment."}</div>`;
    return;
  }
  $("applicants").innerHTML = items.map(a => `
    <article class="app">
      <div>
        <h3>${esc(a.name)}</h3>
        <div class="muted">${esc(a.email)} · pour « ${esc(offerOf(a.offerId)?.title ?? "offre supprimée")} » · reçue le ${fmt(a.date)}</div>
        <span class="badge s-${a.status}">${STATUS[a.status] ?? esc(a.status)}</span>
      </div>
      <div class="actions">
        <label class="muted" for="st-${a.id}">Statut</label>
        <select id="st-${a.id}" data-status="${a.id}">
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === a.status ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>
      <p class="letter"><strong>CV :</strong> ${esc(a.cv)}<br>${esc((a.letter || "").length > 160 ? a.letter.slice(0,160) + "…" : (a.letter || ""))}</p>
    </article>`).join("");
}

function render(){ renderStats(); renderOffers(); renderOfferFilter(); renderApplicants(); }

$("offers").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = +b.dataset.id, o = offerOf(id);
  currentId = id;
  if (b.dataset.act === "apps"){
    $("f-offer").value = String(id); $("f-status").value = "all"; renderApplicants();
    $("applicants-section").scrollIntoView({behavior: "smooth"});
  }
  if (b.dataset.act === "edit"){
    $("offer-title").textContent = "Modifier l'offre";
    $("o-title").value = o.title; $("o-city").value = o.city; $("o-contract").value = o.contract; $("o-desc").value = o.description;
    $("dlg-offer").showModal();
  }
  if (b.dataset.act === "toggle"){
    const wasActive = o.status === "active";
    try { await apiToggleOffer(id); await refresh(); toast(wasActive ? "Offre fermée" : "Offre rouverte"); } catch (err) { fail(err); }
  }
  if (b.dataset.act === "del"){
    $("del-text").textContent = `L'offre « ${o.title} » et ses candidatures seront supprimées.`;
    $("dlg-del").showModal();
  }
});

$("btn-new").onclick = () => { currentId = null; $("offer-title").textContent = "Publier une offre"; $("form-offer").reset(); $("dlg-offer").showModal(); };
$("form-offer").addEventListener("submit", async e => {
  e.preventDefault();
  const editing = currentId !== null;
  try {
    await apiSaveOffer({ title: $("o-title").value.trim(), city: $("o-city").value.trim(),
                         contract: $("o-contract").value, description: $("o-desc").value.trim() }, currentId);
    $("dlg-offer").close(); await refresh(); toast(editing ? "Offre modifiée" : "Offre publiée");
  } catch (err) { fail(err); }
});
$("offer-cancel").onclick = () => $("dlg-offer").close();

$("del-ok").onclick = async () => {
  try { await apiDeleteOffer(currentId); $("dlg-del").close(); await refresh(); toast("Offre supprimée"); } catch (err) { fail(err); }
};
$("del-cancel").onclick = () => $("dlg-del").close();

$("applicants").addEventListener("change", async e => {
  const s = e.target.closest("[data-status]"); if (!s) return;
  try { await apiSetApplicantStatus(+s.dataset.status, s.value); await refresh(); toast("Statut mis à jour"); } catch (err) { fail(err); }
});
$("f-offer").addEventListener("change", renderApplicants);
$("f-status").addEventListener("change", renderApplicants);

(async () => {
  let user;
  if (MOCK){ user = { name: "Test Recruteur", role: "recruiter" }; applyRole(user.role); }
  else     { user = await initPage(); if (!user || user.role !== "recruiter") { location.href = "login.html"; return; } }
  if (typeof initMenu === "function") initMenu(user);
  try { await apiLoadAll(); } catch (err) { fail(err); offers = []; applicants = []; }
  render();
})();
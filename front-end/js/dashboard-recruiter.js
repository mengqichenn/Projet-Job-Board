let offers = [];
let applicants = [];

async function apiLoadAll() {
  [offers, applicants] = await Promise.all([
    api("/ads?mine=1"),
    api("/recruiter/applications"),
  ]);
}

async function apiSaveOffer(data, id) {
  return id ? api(`/ads/${id}`, { method: "PATCH", body: data })
            : api("/ads",       { method: "POST",  body: data });
}
async function apiToggleOffer(id) {
  const o = offerOf(id);
  return o.status === "open"
    ? api(`/ads/${id}`, { method: "DELETE" })          // ferme l'offre
    : api(`/ads/${id}/reopen`, { method: "POST" });    // la rouvre
}
async function apiSetApplicantStatus(id, status) {
  return api(`/applications/${id}/status`, { method: "PATCH", body: { status } });
}

const STATUS = { sent: "En attente", seen: "Vue", interview: "Entretien", accepted: "Acceptée", rejected: "Refusée" };
const $ = id => document.getElementById(id);
let currentId = null;
let categories = [];

function esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }
function fmt(d) { return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }); }
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }
const fail = err => toast(err?.message || "Une erreur est survenue, réessaie.");
const offerOf = id => offers.find(o => o.id === id);
async function refresh() { await apiLoadAll(); render(); }

function renderStats() {
  const active = offers.filter(o => o.status === "open").length;
  const toDo = applicants.filter(a => a.status === "sent").length;
  $("stats").innerHTML =
    `<div><strong>${offers.length}</strong><span class="muted">Toutes mes offres</span></div>` +
    `<div><strong>${active}</strong><span class="muted">Offres actives</span></div>` +
    `<div><strong>${applicants.length}</strong><span class="muted">Candidatures reçues</span></div>` +
    `<div><strong>${toDo}</strong><span class="muted">À traiter</span></div>`;
}

function renderOffers() {
  if (!offers.length) { $("offers").innerHTML = '<div class="empty">Aucune offre pour le moment. Clique sur « Publier une offre ».</div>'; return; }
  $("offers").innerHTML = offers.map(o => {
    const n = applicants.filter(a => a.ad === o.id).length;
    const active = o.status === "open";
    return `
    <article class="app">
      <div>
        <h3>${esc(o.title)}</h3>
        <div class="muted">${esc(o.city)} · ${esc(o.contract_type)} · publiée le ${fmt(o.created_at)} · ${n} candidature${n > 1 ? "s" : ""}</div>
        <span class="badge s-${o.status}">${active ? "Active" : "Fermée"}</span>
      </div>
      <div class="actions">
        <button class="btn btn-sm btn-ghost" data-act="apps" data-id="${o.id}">Candidatures</button>
        <button class="btn btn-sm btn-ghost" data-act="edit" data-id="${o.id}">Modifier</button>
        <button class="btn btn-sm btn-ghost" data-act="toggle" data-id="${o.id}">${active ? "Fermer" : "Rouvrir"}</button>
      </div>
    </article>`;
  }).join("");
}

function renderOfferFilter() {
  const keep = $("f-offer").value || "all";
  $("f-offer").innerHTML = '<option value="all">Toutes</option>' +
    offers.map(o => `<option value="${o.id}">${esc(o.title)}</option>`).join("");
  $("f-offer").value = [...$("f-offer").options].some(x => x.value === keep) ? keep : "all";
}

function renderApplicants() {
  const fo = $("f-offer").value, fs = $("f-status").value;
  const items = applicants.filter(a => (fo === "all" || a.ad === +fo) && (fs === "all" || a.status === fs));
  if (!items.length) {
    $("applicants").innerHTML = `<div class="empty">${applicants.length ? "Aucune candidature avec ces filtres." : "Aucune candidature reçue pour le moment."}</div>`;
    return;
  }
  $("applicants").innerHTML = items.map(a => `
    <article class="app">
      <div>
        <h3>${esc(a.first_name)} ${esc(a.last_name)}</h3>
        <div class="muted">${esc(a.email)} · pour « ${esc(a.ad_title ?? "offre supprimée")} » · reçue le ${fmt(a.created_at)}</div>
        <span class="badge s-${a.status}">${STATUS[a.status] ?? esc(a.status)}</span>
      </div>
      <div class="actions">
        <label class="muted" for="st-${a.id}">Statut</label>
        <select id="st-${a.id}" data-status="${a.id}">
          ${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === a.status ? "selected" : ""}>${v}</option>`).join("")}
        </select>
      </div>
      <p class="letter">
        ${a.cv_download_url ? `<button type="button" class="btn-link" data-cv="${a.id}">Voir le CV</button><br>` : ""}
        ${esc((a.message || "").length > 160 ? a.message.slice(0, 160) + "…" : (a.message || ""))}
      </p>
    </article>`).join("");
}

function render() { renderStats(); renderOffers(); renderOfferFilter(); renderApplicants(); }

async function downloadCV(appId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/applications/${appId}/cv`, { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) { toast("Impossible de récupérer ce CV."); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `cv-${appId}.pdf`; a.click();
  URL.revokeObjectURL(url);
}

function fillOfferForm(o) {
  $("o-title").value = o?.title ?? "";
  $("o-short").value = o?.short_description ?? "";
  $("o-full").value = o?.full_description ?? "";
  $("o-city").value = o?.city ?? "";
  $("o-postal").value = o?.postal_code ?? "";
  $("o-contract").value = o?.contract_type ?? "CDI";
  $("o-category").value = o?.category ?? "";
  $("o-min").value = o?.monthly_salary_min ?? "";
  $("o-max").value = o?.monthly_salary_max ?? "";
  $("o-working-time").value = o?.working_time ?? "";
  $("o-work-mode").value = o?.work_mode ?? "onsite";
  $("o-experience").value = o?.experience ?? "";
  $("o-education").value = o?.education_level ?? "";
  $("o-start").value = o?.start_time ?? "";
}

function buildOfferPayload() {
  const data = {
    title: $("o-title").value.trim(),
    short_description: $("o-short").value.trim(),
    full_description: $("o-full").value.trim(),
    city: $("o-city").value.trim(),
    postal_code: $("o-postal").value.trim(),
    contract_type: $("o-contract").value,
    category: $("o-category").value,
    monthly_salary_min: $("o-min").value || null,
    monthly_salary_max: $("o-max").value || null,
    working_time: $("o-working-time").value,
    work_mode: $("o-work-mode").value,
    experience: $("o-experience").value,
    education_level: $("o-education").value,
    start_time: $("o-start").value || null,
  };
  return data;
}

$("offers").addEventListener("click", async e => {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const id = +b.dataset.id, o = offerOf(id);
  currentId = id;
  if (b.dataset.act === "apps") {
    $("f-offer").value = String(id); $("f-status").value = "all"; renderApplicants();
    $("applicants-section").scrollIntoView({ behavior: "smooth" });
  }
  if (b.dataset.act === "edit") {
    $("offer-title").textContent = "Modifier l'offre";
    fillOfferForm(o);
    $("dlg-offer").showModal();
  }
  if (b.dataset.act === "toggle") {
    const wasActive = o.status === "open";
    try { await apiToggleOffer(id); await refresh(); toast(wasActive ? "Offre fermée" : "Offre rouverte"); } catch (err) { fail(err); }
  }
});

$("applicants").addEventListener("click", e => {
  const b = e.target.closest("[data-cv]"); if (!b) return;
  downloadCV(+b.dataset.cv);
});

$("btn-new").onclick = () => { currentId = null; $("offer-title").textContent = "Publier une offre"; $("form-offer").reset(); fillOfferForm(null); $("dlg-offer").showModal(); };
$("form-offer").addEventListener("submit", async e => {
  e.preventDefault();
  const editing = currentId !== null;
  try {
    await apiSaveOffer(buildOfferPayload(), currentId);
    $("dlg-offer").close(); await refresh(); toast(editing ? "Offre modifiée" : "Offre publiée");
  } catch (err) { fail(err); }
});
$("offer-cancel").onclick = () => $("dlg-offer").close();

$("applicants").addEventListener("change", async e => {
  const s = e.target.closest("[data-status]"); if (!s) return;
  try { await apiSetApplicantStatus(+s.dataset.status, s.value); await refresh(); toast("Statut mis à jour"); } catch (err) { fail(err); }
});
$("f-offer").addEventListener("change", renderApplicants);
$("f-status").addEventListener("change", renderApplicants);

(async () => {
  const user = await initPage();
  if (!user || user.role !== "recruiter") { location.href = "login.html"; return; }
  if (typeof initMenu === "function") initMenu(user);
  try { categories = await api("/categories"); $("o-category").innerHTML = categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join(""); } catch {}
  try { await apiLoadAll(); } catch (err) { fail(err); offers = []; applicants = []; }
  render();
})();
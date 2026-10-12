/* ==================================================================
   MOCK = true  : données de test (la page marche sans back-end)
   MOCK = false : vraie API via api() de js/api.js
   /auth/me existe déjà (utilisée par initPage). /auth/password est à confirmer avec le back-end.
   Champs et rôles (candidate / recruiter) = ceux de account.html.
================================================================== */
const MOCK = true;
const MOCK_ROLE = "candidate";

let profile = { email: "etudiant@exemple.fr", first_name: "Prénom", last_name: "Nom", telephone: "",
                postal_code: "34000", city: "Montpellier", cv: "cv_2026.pdf",
                company_name: "TechNova", siret: "12345678901234", description: "", website: "",
                company_postal_code: "34000", company_city: "Montpellier" };

async function apiSaveProfile(fd){
  if (MOCK){ fd.forEach((v, k) => { if (!(v instanceof File)) profile[k] = v; else if (v.name) profile.cv = v.name; }); return; }
  return api("/auth/me", { method: "PATCH", body: fd });
}
async function apiChangePassword(oldPassword, newPassword){
  if (MOCK) return;
  return api("/auth/password", { method: "POST", body: { old_password: oldPassword, new_password: newPassword } });
}
async function apiDeleteAccount(){
  if (MOCK) return;
  await api("/auth/me", { method: "DELETE" });
  localStorage.removeItem("token");
}

const $ = id => document.getElementById(id);
const form = $("form-info");
function toast(msg){ const t = $("toast"); t.textContent = msg; t.classList.add("show"); setTimeout(() => t.classList.remove("show"), 2200); }
const fail = err => toast(err?.data?.detail || "Une erreur est survenue, réessaie.");
const serverErrors = err => Object.entries(err?.data || {}).map(([champ, msg]) => `${champ} : ${Array.isArray(msg) ? msg.join(" ") : msg}`).join(" | ");

function fillForm(){
  [...form.elements].forEach(el => { if (el.name && el.type !== "file") el.value = profile[el.name] ?? ""; });
  $("cv-current").textContent = profile.cv ? "CV actuel : " + profile.cv : "Aucun CV enregistré.";
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  ["err-email", "err-cv", "err-form"].forEach(id => $(id).textContent = "");
  const email = $("email").value.trim(), file = $("cv").files[0];
  const okMail = /^\S+@\S+\.\S+$/.test(email);
  $("email").setAttribute("aria-invalid", !okMail);
  if (!okMail) { $("err-email").textContent = "Entre une adresse mail valide, par exemple nom@exemple.fr."; return; }
  if (file && !/\.pdf$/i.test(file.name))  { $("err-cv").textContent = "Le CV doit être un fichier PDF."; return; }
  if (file && file.size > 5 * 1024 * 1024) { $("err-cv").textContent = "Le fichier dépasse 5 Mo."; return; }
  if (!$("fs-recruiter").disabled && !/^\d{14}$/.test($("siret").value.trim())) { $("err-form").textContent = "Le SIRET doit contenir 14 chiffres."; return; }

  const fd = new FormData(form);
  if (!file) fd.delete("cv");
  try {
    await apiSaveProfile(fd);
    if (!MOCK) profile = await api("/auth/me");
    fillForm(); $("cv").value = ""; toast("Profil mis à jour");
  } catch (err) { const m = serverErrors(err); m ? ($("err-form").textContent = m) : fail(err); }
});

$("form-pass").addEventListener("submit", async e => {
  e.preventDefault();
  const old = $("old-pass").value, p1 = $("new-pass").value, p2 = $("new-pass2").value, err = $("err-pass");
  if (!old)          return err.textContent = "Entre ton mot de passe actuel.";
  if (p1.length < 12 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) return err.textContent = "Le nouveau mot de passe doit contenir au moins 12 caractères, avec des lettres et des chiffres.";
  if (p1 !== p2)     return err.textContent = "Les deux mots de passe ne sont pas identiques.";
  err.textContent = "";
  try { await apiChangePassword(old, p1); e.target.reset(); toast("Mot de passe modifié"); }
  catch (er) { err.textContent = serverErrors(er) || "Une erreur est survenue, réessaie."; }
});

$("btn-delete").onclick = () => { $("confirm-text").value = ""; $("del-ok").disabled = true; $("dlg-del").showModal(); };
$("confirm-text").addEventListener("input", () => $("del-ok").disabled = $("confirm-text").value.trim() !== "SUPPRIMER");
$("del-cancel").onclick = () => $("dlg-del").close();
$("del-ok").onclick = async () => {
  try { await apiDeleteAccount(); location.href = "main.html"; } catch (err) { $("dlg-del").close(); fail(err); }
};

(async () => {
  let user;
  if (MOCK){ user = { name: "Test Utilisateur", role: MOCK_ROLE }; applyRole(user.role); }
  else     { user = await initPage(); if (!user) { location.href = "login.html"; return; } }
  if (typeof initMenu === "function") initMenu(user);

  ["candidate", "recruiter"].forEach(r => { $("fs-" + r).disabled = $("fs-" + r).hidden; });
  $("back-link").href = user.role === "recruiter" ? "dashboard-recruiter.html" : "dashboard-candidate.html";

  if (!MOCK) { try { profile = await api("/auth/me"); } catch (err) { fail(err); } }
  fillForm();
})();
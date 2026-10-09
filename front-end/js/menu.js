// menu.js : complète le menu HTML/CSS (à charger après api.js).
// L'ouverture et la fermeture au clic sur le bouton marchent sans JS (balise <details>).
// Ici : nom et initiales, fermeture au clic ailleurs ou avec Échap, déconnexion.

// Appelée par initPage() (api.js) avec l'utilisateur connecté
function initMenu(me) {
  if (!me) return;
  const name = me.name || 'Mon compte';
  const initials = name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  document.querySelectorAll('.menu-initials').forEach(el => el.textContent = initials);
  document.querySelectorAll('.menu-name').forEach(el => el.textContent = name);   // textContent : pas de XSS

  const menus = document.querySelectorAll('.menu details');
  document.addEventListener('click', e => {
    menus.forEach(d => { if (!d.contains(e.target)) d.open = false; });           // clic ailleurs : ferme
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    menus.forEach(d => { if (d.open) { d.open = false; d.querySelector('summary').focus(); } });
  });
}

// Déconnexion : un bouton [data-logout] par menu (pas d'id, car il y a deux menus dans la page)
document.addEventListener('click', async e => {
  if (!e.target.closest('[data-logout]')) return;
  try { await api('/auth/logout', { method: 'POST', redirectOn401: false }); } catch {}
  localStorage.removeItem('token');
  location.href = 'main.html';
});

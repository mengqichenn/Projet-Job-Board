(() => {
  const common = window.AdminCommon;
  const list = document.getElementById("messages-list");
  if (!list) return;

  const search = document.getElementById("messages-search");
  let messages = [];
  let users = [];
  let ads = [];

  function relatedUsers(message) {
    const ad = ads.find(item => String(item.id) === String(message.ad));
    return {
      ad,
      candidate: users.find(item => String(item.id) === String(message.candidate)),
      recruiter: users.find(item => ad && String(item.id) === String(ad.recruiter)),
    };
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase("fr");
    const results = messages.filter(message => {
      const { ad, candidate, recruiter } = relatedUsers(message);
      return `${message.object} ${message.content} ${common.name(candidate || {})} ${common.name(recruiter || {})} ${ad?.title || ""}`.toLocaleLowerCase("fr").includes(query);
    });
    list.innerHTML = results.length ? results.map(message => {
      const { ad, candidate, recruiter } = relatedUsers(message);
      return `<article class="app"><div><h3 class="ad-title"><span class="ad-new">Annonce</span> ${common.escape(ad?.title || "Annonce supprimée")}</h3>
        <p><strong>${common.escape(common.name(candidate || {}))}</strong> <span class="muted">→</span> <strong>${common.escape(common.name(recruiter || {}))}</strong></p>
        <p class="muted">${common.escape(candidate?.email || "")}${recruiter?.email ? ` · ${common.escape(recruiter.email)}` : ""} · ${common.date(message.sent_at)}</p>
        <p class="letter"><strong>${common.escape(message.object)}</strong><br>${common.escape(message.content)}</p></div>
        <div class="admin-actions"><button class="btn btn-danger btn-sm" type="button" data-delete-message="${message.id}">Supprimer</button></div></article>`;
    }).join("") : common.empty(list, "Aucun message pour le moment.");
  }

  async function init() {
    if (!await common.requireAdmin()) return;
    try {
      [messages, users, ads] = await Promise.all([
        common.list("/admin/messages"), common.list("/admin/users"), common.list("/admin/ads"),
      ]);
      render();
      search.addEventListener("input", render);
      list.addEventListener("click", async event => {
        const button = event.target.closest("[data-delete-message]");
        if (!button || !confirm("Supprimer définitivement ce message ?")) return;
        try {
          await api(`/admin/messages/${button.dataset.deleteMessage}`, { method: "DELETE" });
          messages = await common.list("/admin/messages");
          render(); common.report("Message supprimé.");
        } catch (error) { common.report(error.message, true); }
      });
    } catch (error) { common.report(`Impossible de charger les messages : ${error.message}`, true); }
  }
  init();
})();
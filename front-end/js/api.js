const API_URL = "http://127.0.0.1:8000/api";

// fonction API 
async function api(path, { method = "GET", body, redirectOn401 = true} = {}) {      
    const headers = { Accept: "application/JSON" };
    
    // récupérer le token
    const token = localStorage.getItem("token");
    if (token) headers.Authorization = "Bearer " + token;

    // on envoie en FormData si c'en est un sinon en Content-Type(JSON)
    let payload;
    if (body instanceof FormData) {
        payload = body;
    } else if (body) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }

    // envoie la requête au backend
    const res = await fetch(API_URL + path, { method, headers, body: payload});

    if (res.status === 401 && redirectOn401) {
        localStorage.removeItem("token");
        location.href = "login.html";
        return;
}

    // reçoit la réponse du backend en JSON
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw { status: res.status, data };
    return data;
}

// récuppér les sections qui ont un "data-role", masquer les pour les visiteurs
function applyRole(role) {
    const current = role || "visitor";
    document.querySelectorAll("[data-role]").forEach(el => {
        el.hidden = !el.dataset.role.split(" ").includes(current);
    });
}


// adapter la page à chaque "user"
async function initPage() {
    if (!localStorage.getItem("token")) {
        applyRole(null);
        return null; 
    }

    try {
        const user = await api("/auth/me", {
            redirectOn401: false
        });
        applyRole(user.role);
        return user;

    } catch(err) {
        console.error("Erreur API /auth/me :", err);

        if (err.status === 401) {
            localStorage.removeItem("token");
        }
        applyRole(null);
        return null;
    }
}



async function logout() {
    try {
        await api("/auth/logout", {
            method: "POST",
            redirectOn401: false
        });
    } finally {
        localStorage.removeItem("token");
        location.href = "login.html";
    }
}
// admin-login.js
// Connexion administrateur - auth par Token (Bearer)

const API_BASE = "http://127.0.0.1:8000/api";
const LOGIN_URL = `${API_BASE}/auth/login`;
const LOGOUT_URL = `${API_BASE}/auth/logout`;
const REDIRECT_URL = "dashboard-admin.html";

const TOKEN_KEY = "token";

const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = form.querySelector("button[type='submit']");

let errorBox = document.getElementById("login-error");
if (!errorBox) {
  errorBox = document.createElement("p");
  errorBox.id = "login-error";
  errorBox.setAttribute("role", "alert");
  errorBox.style.color = "#c0392b";
  errorBox.style.margin = "0 0 12px";
  errorBox.hidden = true;
  form.insertBefore(errorBox, submitBtn);
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Connexion..." : "Se connecter";
}

// Le back-end renvoie { token, user: { id, role, name, cv_name } }
function isAdmin(user) {
  return Boolean(user && user.role === "admin");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError("Veuillez remplir tous les champs.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      showError(data.message || data.detail || "E-mail ou mot de passe incorrect.");
      return;
    }

    // Vérifier que c'est bien un administrateur
    if (!isAdmin(data.user)) {
      // Pas admin: on supprime le token créé côté serveur
      await fetch(LOGOUT_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${data.token}` },
      }).catch(() => {});
      showError("Accès réservé aux administrateurs.");
      return;
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    window.location.href = REDIRECT_URL;
  } catch (error) {
    console.error(error);
    showError("Impossible de contacter le serveur. Réessayez plus tard.");
  } finally {
    setLoading(false);
  }
});
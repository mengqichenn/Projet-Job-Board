const newPasswordForm = document.getElementById("new-password-form");
const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");
const formMessage = document.getElementById("form-message");

function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message is-${type}`;
    formMessage.hidden = false;
}

newPasswordForm.addEventListener("submit", event => {
    event.preventDefault();
    formMessage.hidden = true;
    newPasswordInput.removeAttribute("aria-invalid");
    confirmPasswordInput.removeAttribute("aria-invalid");

    const password = newPasswordInput.value;
    const confirmation = confirmPasswordInput.value;

    if (!password || !confirmation) {
        if (!password) newPasswordInput.setAttribute("aria-invalid", "true");
        if (!confirmation) confirmPasswordInput.setAttribute("aria-invalid", "true");
        showFormMessage("Veuillez remplir les deux champs.", "error");
        (!password ? newPasswordInput : confirmPasswordInput).focus();
        return;
    }

    if (password.length < 12 || !/\p{L}/u.test(password) || !/\d/.test(password)) {
        newPasswordInput.setAttribute("aria-invalid", "true");
        showFormMessage("Le mot de passe doit contenir au moins 12 caractères, avec des lettres et des chiffres.", "error");
        newPasswordInput.focus();
        return;
    }

    if (password !== confirmation) {
        confirmPasswordInput.setAttribute("aria-invalid", "true");
        showFormMessage("Les deux mots de passe ne correspondent pas.", "error");
        confirmPasswordInput.focus();
        return;
    }

    showFormMessage(
        "Les champs sont valides. Aucun mot de passe n'a été enregistré ou modifié; cette étape nécessite le back-end et une vérification d'identité.",
        "info"
    );
    newPasswordForm.reset();
});

newPasswordForm.addEventListener("input", () => {
    newPasswordInput.removeAttribute("aria-invalid");
    confirmPasswordInput.removeAttribute("aria-invalid");
    formMessage.hidden = true;
});
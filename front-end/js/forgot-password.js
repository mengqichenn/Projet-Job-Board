const forgotPasswordForm = document.getElementById("forgot-password-form");
const emailInput = document.getElementById("email");
const formMessage = document.getElementById("form-message");

function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message is-${type}`;
    formMessage.hidden = false;
}

forgotPasswordForm.addEventListener("submit", event => {
    event.preventDefault();
    formMessage.hidden = true;
    emailInput.removeAttribute("aria-invalid");

    const email = emailInput.value.trim();

    if (!email) {
        emailInput.setAttribute("aria-invalid", "true");
        showFormMessage("Veuillez saisir votre adresse e-mail.", "error");
        emailInput.focus();
        return;
    }

    if (!emailInput.validity.valid) {
        emailInput.setAttribute("aria-invalid", "true");
        showFormMessage("Veuillez saisir une adresse e-mail valide.", "error");
        emailInput.focus();
        return;
    }

    window.location.href = "new-password.html";
});

emailInput.addEventListener("input", () => {
    emailInput.removeAttribute("aria-invalid");
    formMessage.hidden = true;
});
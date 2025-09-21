document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const submitBtn = document.getElementById('submitBtn');

    emailInput.addEventListener('blur', validateEmail);
    passwordInput.addEventListener('blur', validatePassword);

    form.addEventListener('submit', function(e) {
        let isValid = true;

        if (!validateEmail()) isValid = false;
        if (!validatePassword()) isValid = false;

        if (!isValid) {
            e.preventDefault();
            showToast('error', 'Erro no formulário', 'Por favor, corrija os campos destacados.');
        }
    });

    function validateEmail() {
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            showError(emailInput, emailError, 'Por favor, digite seu email.');
            return false;
        }

        if (!emailRegex.test(email)) {
            showError(emailInput, emailError, 'Por favor, digite um email válido.');
            return false;
        }

        clearError(emailInput, emailError);
        return true;
    }

    function validatePassword() {
        const password = passwordInput.value.trim();

        if (!password) {
            showError(passwordInput, passwordError, 'Por favor, digite sua senha.');
            return false;
        }

        if (password.length < 6) {
            showError(passwordInput, passwordError, 'A senha deve ter pelo menos 6 caracteres.');
            return false;
        }

        clearError(passwordInput, passwordError);
        return true;
    }

    function showError(input, errorElement, message) {
        input.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    function clearError(input, errorElement) {
        input.classList.remove('error');
        errorElement.classList.remove('show');
        errorElement.textContent = '';
    }
});
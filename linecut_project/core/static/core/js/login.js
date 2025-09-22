document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.login-form'); // Seleciona pela classe
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (form && emailInput && passwordInput) {
        form.addEventListener('submit', function(e) {
            if (emailInput.value.trim() === '' || passwordInput.value.trim() === '') {
                e.preventDefault();
                console.error("Formulário de login inválido.");
            }
        });
    }

    const modal = document.getElementById('passwordResetModal');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const closeButton = document.querySelector('.close-button');
    const resetForm = document.getElementById('passwordResetForm');
    const sendBtn = document.getElementById('sendResetLinkBtn');
    const messageArea = document.getElementById('modal-message-area');

    if (modal && forgotPasswordLink && closeButton && resetForm) {
        forgotPasswordLink.addEventListener('click', function(e) {
            e.preventDefault();
            messageArea.innerHTML = '';
            resetForm.reset();
            resetForm.style.display = 'block';
            modal.style.display = 'flex'; 
        });

        closeButton.addEventListener('click', function() {
            modal.style.display = 'none';
        });

        window.addEventListener('click', function(event) {
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });

        resetForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value;
            
            sendBtn.disabled = true;
            sendBtn.textContent = 'Enviando...';
            messageArea.innerHTML = '';

            fetch('/password-reset-request/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ email: email })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showMessage('success', 'Se o e-mail estiver cadastrado, um link de redefinição será enviado. Por favor, verifique sua caixa de entrada.');
                    resetForm.style.display = 'none';
                } else {
                    showMessage('error', data.message || 'Ocorreu um erro. Tente novamente.');
                }
            })
            .catch(error => {
                showMessage('error', 'Erro de conexão. Por favor, tente novamente.');
            })
            .finally(() => {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Enviar Link';
            });
        });
    }

    function getCSRFToken() {
        const tokenElement = document.querySelector('[name=csrfmiddlewaretoken]');
        return tokenElement ? tokenElement.value : '';
    }

    function showMessage(type, text) {
        if (messageArea) {
            const alertType = type === 'success' ? 'alert-success' : 'alert-error';
            messageArea.innerHTML = `<div class="alert ${alertType}">${text}</div>`;
        }
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const storeStatusToggle = document.getElementById('store-status-toggle');

    if (storeStatusToggle) {
        storeStatusToggle.addEventListener('click', toggleStoreStatus);
    }
});

async function toggleStoreStatus() {
    const button = document.getElementById('store-status-toggle');
    const indicator = button.querySelector('.status-indicator');
    const statusText = button.querySelector('span');
    const currentStatus = button.dataset.status;
    const action = currentStatus === 'fechado' ? 'abrir' : 'fechar';
    const csrfToken = getCSRFToken();

    button.classList.add('loading');
    button.disabled = true;

    try {
        const response = await fetch('/dashboard/toggle-store-status/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
        });

        const data = await response.json();

        if (response.ok && data.success) {
            const newStatus = data.new_status;
            button.dataset.status = newStatus;

            // Atualiza aparência do botão
            if (newStatus === 'aberto') {
                button.classList.remove('fechado');
                button.classList.add('aberto');
                statusText.textContent = 'Loja Aberta';
                button.title = 'Clique para fechar a loja';
            } else {
                button.classList.remove('aberto');
                button.classList.add('fechado');
                statusText.textContent = 'Loja Fechada';
                 button.title = 'Clique para abrir a loja'; 
            }
            showToast(data.message, 'success'); 

        } else {
            let errorMessage = data.error || 'Não foi possível alterar o status da loja.';
            showToast(errorMessage, 'error', 6000); 
            button.classList.remove('loading');
            button.disabled = false;
        }

    } catch (error) {
        console.error("Erro ao tentar alterar status da loja:", error);
        showToast('Erro de comunicação com o servidor.', 'error');
    } finally {
        setTimeout(() => {
            button.classList.remove('loading');
            button.disabled = false;
        }, 300);
    }
}

function getCSRFToken() {
    const csrfTokenInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (csrfTokenInput) {
        return csrfTokenInput.value;
    }
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    return cookieValue || '';
}

function showToast(message, type = 'info', duration = 4000) {
    const toastContainer = document.getElementById('toast-container'); 
    if (!toastContainer) {
        console.warn('Toast container not found!');
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.marginLeft = '10px';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'inherit';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => toast.remove();
    toast.appendChild(closeButton);


    toastContainer.appendChild(toast);

    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, duration);
}

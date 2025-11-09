let toastManager;
let modalAlreadyShown = false;

const modalManager = {
    modal: null,
    title: null,
    message: null,
    confirmBtn: null,
    isInitialized: false,

    init() {
        try {
            this.modal = document.getElementById('planoModal');
            this.title = document.getElementById('modalTitle');
            this.message = document.getElementById('modalMessage');
            this.confirmBtn = document.getElementById('modalConfirm');

            if (this.modal && this.title && this.message && this.confirmBtn) {
                const closeBtn = this.modal.querySelector('.modal-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.hide());
                }

                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) this.hide();
                });

                this.confirmBtn.addEventListener('click', () => this.hide());

                this.isInitialized = true;
            }
        } catch (error) {
        }
    },

    show(title, message) {
        if (!this.isInitialized) {
            this.init();
        }

        if (this.modal && this.title && this.message) {
            this.title.textContent = title;
            this.message.textContent = message;
            this.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            alert(`${title}\n\n${message}`);
        }
    },

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    modalManager.init();

    if (!toastManager) {
        toastManager = new ToastManager();
    }
    
    if (typeof checkTrialExpiration === 'function') {
        checkTrialExpiration();
    }
    
    document.querySelector('.menu-sair')?.addEventListener('click', function() {
    });

    document.querySelector('.btn-ver-pedidos')?.addEventListener('click', function() {
    });

    const detalhesLinks = document.querySelectorAll('.ver-detalhes');
    detalhesLinks.forEach(link => {
        link.addEventListener('click', function(e) {
        });
    });
});

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(data) {
    return new Intl.DateTimeFormat('pt-BR').format(data);
}

class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        if (!document.querySelector('.toast-container')) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.querySelector('.toast-container');
        }
    }

    showToast(type, title, message, duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconHTML = '';
        if (typeof staticUrl !== 'undefined') {
             const iconMap = {
                success: 'sucesso', 
                error: 'erro', 
                warning: 'alerta', 
                info: 'info'
            };
            const iconFile = iconMap[type] || 'info';
            iconHTML = `<img src="${staticUrl}dashboard/images/icone_${iconFile}.png" alt="${type}" class="toast-icon">`;
        } else {
            iconHTML = `<i>${type.charAt(0).toUpperCase()}</i>`;
        }


        toast.innerHTML = `
            ${iconHTML}
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                &times;
            </button>
        `;

        this.container.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }

        return toast;
    }

    removeToast(toast) {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

toastManager = new ToastManager();

async function checkTrialExpiration() {
    try {
        if (modalAlreadyShown) {
            return;
        }

        const response = await fetch('/dashboard/check-trial-expiration/');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.was_updated && data.trial_expired) {
            modalAlreadyShown = true;
            setTimeout(() => {
                modalManager.show(
                    'Plano Atualizado',
                    data.message || 'Seu período trial expirou. Seu plano foi alterado para Basic. Agora há uma taxa de 7% por venda.'
                );
            }, 2000);
        }
    } catch (error) {
    }
}
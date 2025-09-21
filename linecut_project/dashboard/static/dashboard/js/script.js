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

const dadosMockados = {
    nomeLanchonete: "Museoh",
    categoria: "Lanches e Salgados",
    endereco: "Praça 3 - Senac",
    horarios: {
        hoje: "18:00 - 23:00",
        amanha: "18:00 - 23:00"
    },
    metricas: {
        pedidosHoje: 15,
        totalVendas: "R$ 812,50",
        avaliacaoMedia: 4.7,
        totalAvaliacoes: 360
    },
    pedidos: [
        { id: "#1200", status: "em-andamento", valor: "R$ 20,00", data: "24/04/2025" },
        { id: "#1199", status: "em-andamento", valor: "R$ 20,00", data: "24/04/2025" },
        { id: "#1198", status: "concluido", valor: "R$ 20,00", data: "24/04/2025" },
        { id: "#1197", status: "concluido", valor: "R$ 20,00", data: "24/04/2025" },
        { id: "#1196", status: "concluido", valor: "R$ 20,00", data: "24/04/2025" }
    ]
};

document.addEventListener('DOMContentLoaded', function() {
    modalManager.init();

    if (!toastManager) {
        toastManager = new ToastManager();
    }

    debugCompanyData().then(() => {
        if (typeof checkTrialExpiration === 'function') {
            setTimeout(() => {
                checkTrialExpiration();
            }, 1000);
        }
    });

    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            menuItems.forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    document.querySelector('.menu-sair').addEventListener('click', function() {
    });

    document.querySelector('.btn-ver-pedidos').addEventListener('click', function() {
    });

    const detalhesLinks = document.querySelectorAll('.ver-detalhes');
    detalhesLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
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
        toast.className = `toast ${type}`;

        toast.innerHTML = `
            <img src="${staticUrl}dashboard/images/icone_${type === 'success' ? 'sucesso' : type === 'warning' ? 'alerta' : 'info'}.png" 
                 alt="${type}" class="toast-icon">
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <img src="${staticUrl}dashboard/images/icone_fechar.png" alt="Fechar" class="toast-close-icon">
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

async function debugCompanyData() {
    try {
        const response = await fetch('/dashboard/configuracoes/get-company-data/');
        const data = await response.json();
    } catch (error) {
    }
}

function testToast() {
    toastManager.showToast(
        'info',
        'Teste Toast',
        'Este é um teste do sistema de notificação',
        5000
    );
}
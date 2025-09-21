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
                // Fechar modal ao clicar no X
                const closeBtn = this.modal.querySelector('.modal-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.hide());
                }
                
                // Fechar modal ao clicar fora
                this.modal.addEventListener('click', (e) => {
                    if (e.target === this.modal) this.hide();
                });
                
                // Botão de confirmar
                this.confirmBtn.addEventListener('click', () => this.hide());
                
                this.isInitialized = true;
                console.log('Modal inicializado com sucesso');
            } else {
                console.error('Elementos do modal não encontrados:', {
                    modal: !!this.modal,
                    title: !!this.title,
                    message: !!this.message,
                    confirmBtn: !!this.confirmBtn
                });
            }
        } catch (error) {
            console.error('Erro ao inicializar modal:', error);
        }
    },
    
    show(title, message) {
        if (!this.isInitialized) {
            console.warn('Modal não inicializado, tentando inicializar...');
            this.init();
        }
        
        if (this.modal && this.title && this.message) {
            this.title.textContent = title;
            this.message.textContent = message;
            this.modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            console.log('Modal aberto com sucesso');
        } else {
            console.error('Não foi possível abrir o modal - elementos não encontrados');
            // Fallback: alert
            alert(`${title}\n\n${message}`);
        }
    },
    
    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            console.log('Modal fechado');
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

    console.log('Dashboard carregado - verificando trial expiration');

    modalManager.init();

     if (!toastManager) {
        toastManager = new ToastManager();
    }
    
    // Debug primeiro
    debugCompanyData().then(() => {
        // Depois verificar expiração
        if (typeof checkTrialExpiration === 'function') {
            setTimeout(() => {
                console.log('Executando verificação do trial...');
                checkTrialExpiration();
            }, 1000);
        }
    });

    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            menuItems.forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            
            const menuText = this.querySelector('span:not(.icon)').textContent;
            console.log(`Clicou em: ${menuText}`);
        });
    });
    
    document.querySelector('.menu-sair').addEventListener('click', function() {
        console.log('Sair clicado');
    });
    
    document.querySelector('.btn-ver-pedidos').addEventListener('click', function() {
        console.log('Ver todos os pedidos');
    });
    
    const detalhesLinks = document.querySelectorAll('.ver-detalhes');
    detalhesLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pedidoId = this.closest('.linha-pedido').querySelector('.col-numero').textContent;
            console.log(`Ver detalhes do pedido: ${pedidoId}`);
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
        // Criar container de toasts se não existir
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

        // Fechar toast ao clicar no botão
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        // Fechar toast automaticamente após o tempo especificado
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

// Função para verificar expiração do trial
async function checkTrialExpiration() {
    try {
        // Prevenir múltiplas execuções
        if (modalAlreadyShown) {
            console.log('Modal já foi mostrado, ignorando verificação');
            return;
        }
        
        console.log('Iniciando verificação do trial...');
        
        const response = await fetch('/dashboard/check-trial-expiration/');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resposta completa da verificação:', data);
        
        // Só mostrar modal se realmente houve atualização DO TRIAL PARA BASIC
        if (data.success && data.was_updated && data.trial_expired) {
            console.log('Mostrando modal de atualização de plano...');
            modalAlreadyShown = true;
            
            // Pequeno delay para garantir que o DOM está pronto
            setTimeout(() => {
                modalManager.show(
                    'Plano Atualizado',
                    data.message || 'Seu período trial expirou. Seu plano foi alterado para Basic. Agora há uma taxa de 7% por venda.'
                );
            }, 2000); // Aumentei para 2 segundos
            
        } else if (data.success && data.trial_expired && !data.was_updated) {
            console.log('Trial já estava expirado, não mostrar modal');
            
        } else if (data.success && data.is_trial === false) {
            console.log('Usuário não está no trial, ignorar');
            
        } else {
            console.log('Situação não requer modal:', data);
        }
        
    } catch (error) {
        console.error('Erro ao verificar expiração do trial:', error);
    }
}

async function debugCompanyData() {
    try {
        const response = await fetch('/dashboard/configuracoes/get-company-data/');
        const data = await response.json();
        console.log('Dados da empresa:', data);
        
        if (data.success && data.company_data) {
            console.log('Plano atual:', data.company_data.plano);
            console.log('Trial expirado:', data.company_data.trial_plan_expired);
            if (data.company_data.created_at) {
                console.log('Data de criação:', data.company_data.created_at);
            }
            if (data.company_data.data_cadastro) {
                console.log('Data de cadastro:', data.company_data.data_cadastro);
            }
        }
    } catch (error) {
        console.error('Erro ao obter dados da empresa:', error);
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


class Notificacoes {
    constructor() {
        this.container = this.criarContainer();
        this.autoHideDelay = 5000;
    }

    criarContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    }

    mostrar(mensagem, tipo = 'info', tempo = null) {
        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        
        const icon = this.getIcon(tipo);
        toast.innerHTML = `
            <i class="bi ${icon}"></i>
            <span>${mensagem}</span>
        `;

        this.container.appendChild(toast);

        const delay = tempo || this.autoHideDelay;
        setTimeout(() => {
            this.remover(toast);
        }, delay);

        return toast;
    }

    getIcon(tipo) {
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };
        return icons[tipo] || 'bi-info-circle-fill';
    }

    remover(toast) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    sucesso(mensagem, tempo = null) {
        return this.mostrar(mensagem, 'success', tempo);
    }

    erro(mensagem, tempo = null) {
        return this.mostrar(mensagem, 'error', tempo);
    }

    aviso(mensagem, tempo = null) {
        return this.mostrar(mensagem, 'warning', tempo);
    }

    info(mensagem, tempo = null) {
        return this.mostrar(mensagem, 'info', tempo);
    }
}

const notificacoes = new Notificacoes();
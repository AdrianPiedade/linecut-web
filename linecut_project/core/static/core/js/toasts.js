class Toast {
    static show(type, title, message, duration = 5000) {
        const container = document.getElementById('toastContainer') || createToastContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        toast.innerHTML = `
            <div class="toast-icon">
                ${this.getIcon(type)}
            </div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;
        
        container.appendChild(toast);
        
        if (duration > 0) {
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.style.animation = 'slideOut 0.3s ease';
                    setTimeout(() => toast.remove(), 300);
                }
            }, duration);
        }
        
        return toast;
    }

    static getIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || 'ℹ';
    }

    static success(message, title = 'Sucesso', duration = 5000) {
        return this.show('success', title, message, duration);
    }

    static error(message, title = 'Erro', duration = 5000) {
        return this.show('error', title, message, duration);
    }

    static warning(message, title = 'Aviso', duration = 5000) {
        return this.show('warning', title, message, duration);
    }

    static info(message, title = 'Informação', duration = 5000) {
        return this.show('info', title, message, duration);
    }
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showToast(type, title, message, duration = 5000) {
    return Toast.show(type, title, message, duration);
}
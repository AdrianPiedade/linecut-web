document.addEventListener('DOMContentLoaded', function() {
    const listaContainer = document.getElementById('notificacoes-lista');
    const loadingPlaceholder = document.getElementById('loading-placeholder');
    const excluirLidasBtn = document.getElementById('excluir-lidas');
    const btnConfirmaExclusao = document.getElementById('btn-confirma-exclusao');

    async function carregarNotificacoes() {
        try {
            const response = await fetch('/dashboard/notificacoes/data/');
            if (!response.ok) {
                throw new Error('Erro ao buscar notificações');
            }
            const data = await response.json();

            if (data.success) {
                renderNotificacoes(data.notificacoes);
                marcarTudoComoLido(); 
            } else {
                mostrarErro(data.error || 'Não foi possível carregar.');
            }
        } catch (error) {
            mostrarErro(error.message);
        }
    }

    function renderNotificacoes(notificacoes) {
        listaContainer.innerHTML = ''; // Limpa o loading

        if (!notificacoes || notificacoes.length === 0) {
            listaContainer.innerHTML = '<div class="linha-vazia">Nenhuma notificação encontrada.</div>';
            excluirLidasBtn.style.display = 'none';
            return;
        }

        let readCount = 0;
        notificacoes.forEach(notif => {
            if (notif.is_read) {
                readCount++;
            }
            
            const item = document.createElement('div');
            item.className = 'notificacao-item'; 
            
            const iconClass = notif.icon || 'bi-info-circle';
            
            item.innerHTML = `
                <i class="bi ${iconClass} icon"></i>
                <div class="notificacao-conteudo">
                    <h4>${notif.title}</h4>
                    <p>${notif.body}</p>
                    <span class="timestamp">${notif.timestamp_display}</span>
                </div>
            `;
            listaContainer.appendChild(item);
        });

        if (notificacoes.length > 0) {
             excluirLidasBtn.style.display = 'flex';
        } else {
             excluirLidasBtn.style.display = 'none';
        }
    }

    function mostrarErro(mensagem) {
        listaContainer.innerHTML = `<div class="linha-vazia" style="color: var(--vermelho-principal);">${mensagem}</div>`;
    }

    async function marcarTudoComoLido() {
        try {
            await fetch('/dashboard/notificacoes/mark-all-read/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (typeof updateNotificationIndicator === 'function') {
                updateNotificationIndicator(0);
            }
        } catch (error) {
            console.error("Erro ao marcar notificações como lidas:", error);
        }
    }

    function confirmarExclusao() {
        openModal('modal-confirmacao-exclusao');
    }

    async function executarExclusao() {
        // Estado de loading
        btnConfirmaExclusao.disabled = true;
        btnConfirmaExclusao.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Excluindo...';

        try {
            const response = await fetch('/dashboard/notificacoes/delete-read/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) throw new Error("Falha na requisição de exclusão");
            
            const data = await response.json();
            
            if (data.success) {
                listaContainer.style.transition = "opacity 0.3s ease";
                listaContainer.style.opacity = "0";
                
                setTimeout(() => {
                    carregarNotificacoes(); 
                    listaContainer.style.opacity = "1";
                }, 300);
                
            } else {
                throw new Error(data.error || "Erro ao excluir");
            }

        } catch (error) {
            console.error("Erro ao excluir notificações:", error);
        } finally {
            // Fecha o modal e restaura o botão
            closeModal('modal-confirmacao-exclusao');
            btnConfirmaExclusao.disabled = false;
            btnConfirmaExclusao.innerHTML = 'Excluir';
        }
    }

    excluirLidasBtn.addEventListener('click', confirmarExclusao);

    btnConfirmaExclusao.addEventListener('click', executarExclusao);

    carregarNotificacoes();

    if (!document.getElementById('spinner-styles')) {
        const styleSheet = document.createElement("style");
        styleSheet.id = 'spinner-styles';
        styleSheet.innerText = `
        .spinner-border { display: inline-block; width: 1rem; height: 1rem; vertical-align: -0.125em; border: .2em solid currentColor; border-right-color: transparent; border-radius: 50%; animation: spinner-border .75s linear infinite; }
        .spinner-border-sm { width: 0.8rem; height: 0.8rem; border-width: .15em; }
        @keyframes spinner-border { to { transform: rotate(360deg); } }
        button > .spinner-border { margin-right: 5px; }`;
        document.head.appendChild(styleSheet);
    }

    window.openModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });
});

function getCSRFToken() {
    if (typeof CSRF_TOKEN !== 'undefined') return CSRF_TOKEN;
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    if (cookieValue) return cookieValue;
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken) return metaToken;
    const inputToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    if (inputToken) return inputToken;
    return '';
}
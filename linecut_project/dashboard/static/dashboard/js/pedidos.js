document.addEventListener('DOMContentLoaded', function() {
    setupTabs();
    setupFilters();
    loadOrders();

    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target == modal) {
                closeModal(modal.id);
            }
        });
    });
});

let currentOrdersData = [];
let currentOrderDetails = null;
let currentActionInfo = {};

const STATUS_MAP = {
    pendente: { text: 'Pendente', dotClass: 'pendente', sortOrder: 1 },
    pago: { text: 'Pago', dotClass: 'pago', sortOrder: 2 },
    preparando: { text: 'Preparando', dotClass: 'preparando', sortOrder: 3 },
    pronto: { text: 'Pronto', dotClass: 'pronto', sortOrder: 4 },
    retirado: { text: 'Retirado', dotClass: 'retirado', sortOrder: 5 },
    concluido: { text: 'Concluído', dotClass: 'concluido', sortOrder: 5 },
    cancelado: { text: 'Cancelado', dotClass: 'cancelado', sortOrder: 6 }
};

const PAGAMENTO_MAP = {
    pendente: { text: 'Aguardando', dotClass: 'pendente'},
    efetuado: { text: 'Efetuado', dotClass: 'efetuado'},
    pago: { text: 'Efetuado', dotClass: 'efetuado'}, // Usa 'Efetuado' para status 'pago'
    nao_aplicavel: { text: 'N/A', dotClass: 'nao_aplicavel'},
};

const AVALIACAO_MAP = {
     pendente: { text: 'Pendente', badgeClass: 'pendente'},
     avaliado: { text: 'Avaliado', badgeClass: 'avaliado'},
     nao_avaliado: { text: 'Não Avaliado', badgeClass: 'nao_avaliado'}
};

const METODO_PAGAMENTO_MAP = {
    pix: 'PIX (App)',
    local: 'Pagamento Local',
};

function setupTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
}

function switchTab(tabId) {
    const tabLinks = document.querySelectorAll('.tab-link');
    const tabPanes = document.querySelectorAll('.tab-pane');
    tabLinks.forEach(link => link.classList.toggle('active', link.getAttribute('data-tab') === tabId));
    tabPanes.forEach(pane => pane.classList.toggle('active', pane.id === `${tabId}-content`));
    loadOrders();
}

function setupFilters() {
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const searchInput = document.getElementById('search-input');
    const sortOrderSelect = document.getElementById('sort-order');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', loadOrders);
    if (searchInput) searchInput.addEventListener('keypress', e => e.key === 'Enter' && loadOrders());
    if (sortOrderSelect) sortOrderSelect.addEventListener('change', loadOrders);
}

function getActiveTabId() {
    const activeTab = document.querySelector('.tab-link.active');
    return activeTab ? activeTab.getAttribute('data-tab') : 'preparo';
}

function showLoadingIndicator(show) {
    const indicator = document.getElementById('loading-indicator');
    const tableBodies = document.querySelectorAll('.corpo-tabela');
    if (indicator) indicator.style.display = show ? 'flex' : 'none';
    tableBodies.forEach(tbody => tbody.style.display = show ? 'none' : 'block');
}

async function loadOrders() {
    showLoadingIndicator(true);
    const activeTab = getActiveTabId();
    const searchTerm = document.getElementById('search-input').value;
    const sortOrder = document.getElementById('sort-order').value;

    try {
        const response = await fetch(`/dashboard/pedidos/data/?tab=${activeTab}&search=${encodeURIComponent(searchTerm)}&sort=${sortOrder}`);
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido.' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        currentOrdersData = data.success ? (data.orders || []) : [];
    } catch (error) {
        console.error("Fetch Error:", error);
        showErrorToast(`Erro ao carregar pedidos: ${error.message}`);
        currentOrdersData = [];
    } finally {
        renderOrders(activeTab);
        showLoadingIndicator(false);
    }
}

function renderOrders(activeTab) {
    const targetTableBodyId = `${activeTab}-table-body`;
    const tableBody = document.getElementById(targetTableBodyId);

    if (!tableBody) return;
    tableBody.innerHTML = '';

    const ordersToRender = currentOrdersData;
    const template = document.getElementById('pedido-row-template');

    if (!template) {
        tableBody.innerHTML = '<div class="linha-vazia erro-template">Erro: Template não encontrado.</div>';
        return;
    }

    let rowsAddedCount = 0;

    if (ordersToRender.length > 0) {
        ordersToRender.forEach((order) => {
            try {
                const rowClone = template.content.cloneNode(true);
                const newRow = rowClone.querySelector('.linha-pedido');
                if (!newRow) return;
                newRow.dataset.orderId = order.id;

                const statusInfo = STATUS_MAP[order.status] || { text: order.status, dotClass: 'pendente' };
                const colStatus = newRow.querySelector('.col-status');
                if (colStatus) {
                    colStatus.querySelector('.status-dot').className = `status-dot ${statusInfo.dotClass}`;
                    colStatus.querySelector('.status-text').textContent = statusInfo.text;
                    colStatus.querySelector('.hora').textContent = order.hora_criacao_display || '--:--';
                }

                const colNumero = newRow.querySelector('.col-numero');
                if (colNumero) {
                    colNumero.querySelector('.numero-id').textContent = order.id ? `#${order.id}` : '#ERRO'; // ID Completo
                }

                const colPagamentoStatus = newRow.querySelector('.col-pagamento-status');
                if (colPagamentoStatus) {
                    const pagamentoInfo = PAGAMENTO_MAP[order.status_pagamento] || PAGAMENTO_MAP['pendente'];
                    colPagamentoStatus.querySelector('.pagamento-dot').className = `pagamento-dot ${pagamentoInfo.dotClass}`;
                    colPagamentoStatus.querySelector('.pagamento-text-principal').textContent = pagamentoInfo.text;
                }

                const colMetodoPagamento = newRow.querySelector('.col-metodo-pagamento');
                 if (colMetodoPagamento) {
                     const metodoPagamentoTexto = METODO_PAGAMENTO_MAP[order.metodo_pagamento] || order.metodo_pagamento || 'Não info.';
                     colMetodoPagamento.querySelector('.metodo-texto').textContent = metodoPagamentoTexto;
                 }

                const colValor = newRow.querySelector('.col-valor');
                if (colValor) colValor.textContent = `R$ ${parseFloat(order.preco_total || 0).toFixed(2).replace('.', ',')}`;

                const colData = newRow.querySelector('.col-data');
                if (colData) colData.textContent = order.data_criacao_display || '--/--/----';

                const acoesCol = newRow.querySelector('.col-acoes');
                if (acoesCol) {
                    let actionsHTML = `<button class="btn-acao btn-ver-detalhes" onclick="showOrderDetails('${order.id}')"><i class="bi bi-eye"></i> Ver</button>`;
                    const isPago = order.status_pagamento === 'pago' || order.status_pagamento === 'efetuado';
                    const isMetodoLocal = order.metodo_pagamento === 'local';
                    const isCanceladoOuFinalizado = ['retirado', 'concluido', 'cancelado'].includes(order.status);

                    if (activeTab === 'preparo') {
                        // Botão Pronto (Sempre visível se não finalizado/cancelado, desabilitado se pgto pendente)
                        if (!isCanceladoOuFinalizado && order.status !== 'pronto') {
                            const prontoDisabled = false;
                            const prontoTitle = 'Marcar pedido como Pronto para Retirada';
                        actionsHTML += ` <button
                            class="btn-acao btn-marcar-pronto"
                            onclick="confirmUpdateStatus('${order.id}', 'pronto')"
                            title="${prontoTitle}" >
                                <i class="bi bi-check-lg"></i> Pronto
                         </button>`;
                        }

                        // Botão Cancelar (Se não finalizado/cancelado)
                        if(!isCanceladoOuFinalizado) {
                            actionsHTML += ` <button class="btn-acao btn-cancelar-pedido" onclick="confirmCancelOrder('${order.id}')"><i class="bi bi-x-circle"></i> Cancelar</button>`;
                        }
                    } else if (activeTab === 'retirada') {
                         const colHorarioRetirada = newRow.querySelector('.col-horario');
                         if(colHorarioRetirada) {
                            colHorarioRetirada.style.display = 'block';
                            colHorarioRetirada.textContent = order.hora_pronto_display || order.hora_criacao_display || '--:--';
                         }
                         const colPagamentoStatusRetirada = newRow.querySelector('.col-pagamento-status');
                         if (colPagamentoStatusRetirada) {
                             const pagamentoInfo = PAGAMENTO_MAP[order.status_pagamento] || PAGAMENTO_MAP['pendente'];
                             colPagamentoStatusRetirada.querySelector('.pagamento-dot').className = `pagamento-dot ${pagamentoInfo.dotClass}`;
                             colPagamentoStatusRetirada.querySelector('.pagamento-text-principal').textContent = pagamentoInfo.text;
                         }
                         const colMetodoPagamentoRetirada = newRow.querySelector('.col-metodo-pagamento');
                         if (colMetodoPagamentoRetirada) {
                             const metodoPagamentoTexto = METODO_PAGAMENTO_MAP[order.metodo_pagamento] || order.metodo_pagamento || 'Não info.';
                             colMetodoPagamentoRetirada.querySelector('.metodo-texto').textContent = metodoPagamentoTexto;
                         }
                         actionsHTML = `<button class="btn-acao btn-ver-detalhes" onclick="showOrderDetails('${order.id}')"><i class="bi bi-eye"></i> Ver</button>`;
                         actionsHTML += ` <button class="btn-acao btn-marcar-retirado" onclick="confirmUpdateStatus('${order.id}', 'retirado')"><i class="bi bi-bag-check"></i> Retirado</button>`;
                    } else if (activeTab === 'historico') {
                        const colAvaliacao = newRow.querySelector('.col-avaliacao');
                         if(colAvaliacao) {
                            colAvaliacao.style.display = 'block';
                            const avaliacaoInfo = AVALIACAO_MAP[order.avaliacao_status || 'pendente'];
                            const badge = colAvaliacao.querySelector('.avaliacao-badge');
                             if (badge) {
                                badge.textContent = avaliacaoInfo.text;
                                badge.className = `avaliacao-badge ${avaliacaoInfo.badgeClass}`;
                             }
                         }
                         actionsHTML = `<button class="btn-acao btn-ver-detalhes" onclick="showOrderDetails('${order.id}')"><i class="bi bi-eye"></i> Detalhes</button>`;
                    }
                    acoesCol.innerHTML = actionsHTML;
                }
                tableBody.appendChild(newRow);
                rowsAddedCount++;
            } catch (error) {
                console.error(`ERRO ao renderizar pedido ${order.id}:`, error);
                 tableBody.innerHTML += `<div class="linha-pedido erro-render" style="grid-column: 1 / -1; color: red; text-align: center; padding: 10px;">Erro ao renderizar pedido ${order.id}</div>`;
            }
        });
    }

    if (rowsAddedCount === 0) {
        const emptyMsgHTML = `<div class="linha-vazia" style="display: grid;">${getEmptyMessageForTab(activeTab)}</div>`;
        tableBody.innerHTML = emptyMsgHTML;
    } else {
         const possibleEmptyMsg = tableBody.querySelector('.linha-vazia');
         if (possibleEmptyMsg) possibleEmptyMsg.remove();
    }
}

function getEmptyMessageForTab(tabId) {
    switch (tabId) {
        case 'preparo': return 'Nenhum pedido em preparo no momento.';
        case 'retirada': return 'Nenhum pedido pronto para retirada.';
        case 'historico': return 'Nenhum pedido no histórico.';
        default: return 'Nenhum pedido encontrado.';
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
         currentActionInfo = {};
         const cancelReason = document.getElementById('motivo-cancelamento');
         if(cancelReason) cancelReason.value = '';
    }
}

async function showOrderDetails(orderId) {
    openModal('modal-detalhes-pedido');
    const title = document.getElementById('detalhes-titulo');
    const paymentInfo = document.getElementById('detalhes-pagamento-info');
    const paymentStatus = document.getElementById('detalhes-pagamento-status');
    const statusList = document.getElementById('detalhes-status-lista');
    const itemsTbody = document.getElementById('detalhes-itens-tabela').querySelector('tbody');
    const totalElement = document.getElementById('detalhes-total');
    const actionsContainer = document.getElementById('detalhes-acoes-pedido');

    title.textContent = `Carregando Pedido...`;
    paymentInfo.textContent = '...';
    paymentStatus.className = 'pagamento-status'; paymentStatus.innerHTML = '';
    statusList.innerHTML = '<li>Carregando histórico...</li>';
    itemsTbody.innerHTML = '<tr><td colspan="4">Carregando itens...</td></tr>';
    totalElement.textContent = 'R$ --,--';
    actionsContainer.innerHTML = '';

    try {
        const response = await fetch(`/dashboard/pedidos/details/${orderId}/`);
        if (!response.ok) throw new Error('Falha ao buscar detalhes');
        const data = await response.json();

        if (data.success) {
            currentOrderDetails = data.order;
            title.textContent = `Pedido Nº #${orderId.substring(Math.max(0, orderId.length - 8))}`;
            paymentInfo.textContent = METODO_PAGAMENTO_MAP[currentOrderDetails.metodo_pagamento] || currentOrderDetails.metodo_pagamento || 'Não informado';

            const pagamentoInfo = PAGAMENTO_MAP[currentOrderDetails.status_pagamento || 'pendente'];
            paymentStatus.className = `pagamento-status ${pagamentoInfo.dotClass}`;
            paymentStatus.innerHTML = `<i class="bi ${pagamentoInfo.dotClass === 'efetuado' ? 'bi-check-circle-fill' : 'bi-hourglass-split'}"></i> ${pagamentoInfo.text === 'Efetuado' ? 'Pedido pago' : 'Pagamento pendente'}`;

            statusList.innerHTML = '';
            if (currentOrderDetails.status_history && currentOrderDetails.status_history.length > 0) {
                 currentOrderDetails.status_history.sort((a, b) => new Date(b.timestamp_iso) - new Date(a.timestamp_iso));
                 currentOrderDetails.status_history.forEach(entry => {
                    const statusInfo = STATUS_MAP[entry.status] || { text: entry.status, dotClass: 'pendente' };
                    let iconClass = 'bi-info-circle-fill';
                    if (['retirado', 'concluido'].includes(entry.status)) iconClass = 'bi-check-circle-fill';
                    else if (entry.status === 'pronto') iconClass = 'bi-box-seam';
                    else if (entry.status === 'preparando') iconClass = 'bi-egg-fried';
                    else if (entry.status === 'pago' || entry.status === 'pagamento_confirmado') iconClass = 'bi-credit-card';
                    else if (entry.status === 'pendente') iconClass = 'bi-hourglass-split';
                    else if (entry.status === 'cancelado') iconClass = 'bi-x-circle-fill';
                    const statusTextForHistory = entry.status === 'pagamento_confirmado' ? 'Pagamento Confirmado' : statusInfo.text;

                    const li = document.createElement('li');
                    li.innerHTML = `<span class="timestamp">${entry.timestamp_display || ''}</span> <i class="bi ${iconClass} status-icon ${statusInfo.dotClass}"></i> ${statusTextForHistory}`;
                    statusList.appendChild(li);
                });
            } else {
                 const statusInfo = STATUS_MAP[currentOrderDetails.status_pedido] || { text: currentOrderDetails.status_pedido, dotClass: 'pendente' };
                 statusList.innerHTML = `<li><span class="timestamp">${currentOrderDetails.hora_criacao_display || ''}</span> <i class="bi bi-info-circle-fill status-icon ${statusInfo.dotClass}"></i> ${statusInfo.text}</li>`;
            }

            itemsTbody.innerHTML = '';
            if (currentOrderDetails.items_list && currentOrderDetails.items_list.length > 0) {
                currentOrderDetails.items_list.forEach(item => {
                    const tr = itemsTbody.insertRow();
                    tr.insertCell().textContent = item.quantidade;
                    tr.insertCell().textContent = item.nome_produto;
                    tr.insertCell().textContent = `R$ ${parseFloat(item.preco_unitario || 0).toFixed(2).replace('.', ',')}`;
                    tr.insertCell().textContent = `R$ ${parseFloat(item.subtotal || 0).toFixed(2).replace('.', ',')}`;
                });
            } else {
                 itemsTbody.innerHTML = '<tr><td colspan="4">Nenhum item encontrado.</td></tr>';
            }

            totalElement.textContent = `R$ ${parseFloat(currentOrderDetails.preco_total || 0).toFixed(2).replace('.', ',')}`;

            const currentStatus = currentOrderDetails.status_pedido;
            actionsContainer.innerHTML = '';

             if (currentStatus === 'pago' || currentStatus === 'preparando') {
                 actionsContainer.innerHTML += `<button class="btn-modal btn-pronto" onclick="confirmUpdateStatus('${orderId}', 'pronto')"><i class="bi bi-check-lg"></i> Marcar como Pronto</button>`;
             }
             if (currentStatus === 'pronto') {
                  actionsContainer.innerHTML += `<button class="btn-modal btn-retirado" onclick="confirmUpdateStatus('${orderId}', 'retirado')"><i class="bi bi-bag-check"></i> Marcar como Retirado</button>`;
             }
             if (!['retirado', 'concluido', 'cancelado'].includes(currentStatus)) {
                 actionsContainer.innerHTML += `<button class="btn-modal btn-cancelar-detalhes" onclick="confirmCancelOrder('${orderId}')"><i class="bi bi-x-lg"></i> Cancelar pedido</button>`;
             }
             if (actionsContainer.innerHTML === '') {
                 actionsContainer.innerHTML = '<p>Nenhuma ação disponível para este pedido.</p>';
             }

        } else {
            showErrorToast(data.error || 'Erro ao carregar detalhes.');
            title.textContent = `Erro`;
            statusList.innerHTML = '<li>Erro.</li>';
            itemsTbody.innerHTML = '<tr><td colspan="4">Erro.</td></tr>';
        }
    } catch (error) {
        showErrorToast(`Erro de rede: ${error.message}`);
        title.textContent = `Erro de Rede`;
        statusList.innerHTML = '<li>Erro de rede.</li>';
        itemsTbody.innerHTML = '<tr><td colspan="4">Erro de rede.</td></tr>';
    }
}

function confirmUpdateStatus(orderId, newStatus) {
    const statusText = STATUS_MAP[newStatus]?.text || newStatus;
    const messages = {
         preparando: `Marcar pedido #${orderId.substring(Math.max(0, orderId.length - 8))} como "Preparando"?`,
         pronto: `Marcar pedido #${orderId.substring(Math.max(0, orderId.length - 8))} como "Pronto para Retirada"?`,
         retirado: `Confirmar retirada do pedido #${orderId.substring(Math.max(0, orderId.length - 8))}?`
         // Adicione outras mensagens se necessário
     };
    const message = messages[newStatus] || `Mudar status para "${statusText}"?`;

    // Configura e abre o modal genérico de confirmação de status
    currentActionInfo = { orderId: orderId, newStatus: newStatus, action: 'update_status' };
    document.getElementById('confirmacao-status-titulo').textContent = `Confirmar Mudança de Status`;
    document.getElementById('confirmacao-status-mensagem').textContent = message;

    // Oculta subtexto (pode ser usado para adicionar mais info se quiser)
    const subtextoElement = document.getElementById('confirmacao-status-subtexto');
    if (subtextoElement) subtextoElement.style.display = 'none';

    // Garante que o listener do botão é atualizado
    const confirmBtn = document.getElementById('btn-confirma-status-modal');
    confirmBtn.replaceWith(confirmBtn.cloneNode(true)); // Remove listeners antigos
    document.getElementById('btn-confirma-status-modal').addEventListener('click', executeStatusUpdate); // Adiciona novo listener

    openModal('modal-confirmacao-status');
}

async function executeStatusUpdate() {
    const { orderId, newStatus } = currentActionInfo;
    if (!orderId || !newStatus) return;

    const confirmBtn = document.getElementById('btn-confirma-status-modal');
    setButtonLoading(confirmBtn, true, 'Confirmando...');

    await updateStatus(orderId, newStatus); // Chama a função que faz o fetch

    setButtonLoading(confirmBtn, false, 'Confirmar'); // Restaura o botão
    closeModal('modal-confirmacao-status'); // Fecha o modal
    currentActionInfo = {}; // Limpa a ação
}

async function updateStatus(orderId, newStatus) {
    // Mantém o indicador de loading geral da página, se desejado
    showLoadingIndicator(true);
    try {
        const response = await fetch(`/dashboard/pedidos/update_status/${orderId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ new_status: newStatus })
        });
        const data = await response.json();
        if (data.success) {
            showSuccessToast(data.message); // <--- TOAST DE SUCESSO AQUI
            closeModal('modal-detalhes-pedido'); // Fecha detalhes se estiver aberto
            loadOrders(); // Recarrega a lista
        } else {
            showErrorToast(data.error || 'Falha ao atualizar status.');
        }
    } catch (error) {
        showErrorToast(`Erro de comunicação: ${error.message}`);
    } finally {
        showLoadingIndicator(false);
    }
}

function confirmCancelOrder(orderId) {
     currentActionInfo = { orderId: orderId, action: 'cancel' };
     openModal('modal-confirmacao-cancelamento');
     const confirmBtn = document.getElementById('btn-confirma-cancelamento');
     confirmBtn.replaceWith(confirmBtn.cloneNode(true));
     document.getElementById('btn-confirma-cancelamento').addEventListener('click', executeCancellation);
}

async function executeCancellation() {
     const orderId = currentActionInfo.orderId;
     const reason = document.getElementById('motivo-cancelamento').value.trim();
     const confirmBtn = document.getElementById('btn-confirma-cancelamento');

     if (!reason) {
         showWarningToast('Por favor, informe o motivo do cancelamento.');
         return;
     }
     setButtonLoading(confirmBtn, true, 'Cancelando...');

     try {
        const response = await fetch(`/dashboard/pedidos/cancel/${orderId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': CSRF_TOKEN,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({ reason: reason })
        });
        const data = await response.json();
        if (data.success) {
            showSuccessToast(data.message);
            closeModal('modal-confirmacao-cancelamento');
            closeModal('modal-detalhes-pedido');
            loadOrders();
        } else {
            showErrorToast(data.error || 'Falha ao cancelar o pedido.');
        }
    } catch (error) {
        showErrorToast(`Erro de comunicação: ${error.message}`);
    } finally {
         setButtonLoading(confirmBtn, false, 'Cancelar Pedido');
         currentActionInfo = {};
    }
}

function getCSRFToken() {
    if (typeof CSRF_TOKEN !== 'undefined') return CSRF_TOKEN;
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    if (cookieValue) return cookieValue;
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken) return metaToken;
    const inputToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    if (inputToken) return inputToken;
    console.warn('CSRF token não encontrado.');
    return '';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = () => removeToast(toast);
    toast.appendChild(closeBtn);
    container.appendChild(toast);
    setTimeout(() => removeToast(toast), 5000);
}

function removeToast(toast) {
    if (toast && toast.parentNode) {
        toast.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 500);
    }
}

function showSuccessToast(message) { showToast(message, 'success'); }
function showErrorToast(message) { showToast(message, 'error'); }
function showWarningToast(message) { showToast(message, 'warning'); }
function showInfoToast(message) { showToast(message, 'info'); }

function setButtonLoading(button, isLoading, loadingText = 'Aguarde...') {
     if (!button) return;
     const originalTextHTML = button.dataset.originalTextHTML || button.innerHTML;
     if (isLoading) {
         if (!button.dataset.originalTextHTML) button.dataset.originalTextHTML = originalTextHTML;
         button.disabled = true;
         button.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> ${loadingText}`;
     } else {
         button.disabled = false;
         if (button.dataset.originalTextHTML) {
             button.innerHTML = button.dataset.originalTextHTML;
             delete button.dataset.originalTextHTML;
         } else {
              button.innerHTML = button.textContent || originalTextHTML;
         }
     }
}

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
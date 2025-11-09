// linecut_project/dashboard/static/dashboard/js/avaliacoes.js

document.addEventListener('DOMContentLoaded', function() {
    setupTabs();
    setupFilters();
    loadAvaliacoesData('desempenho');
    
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modal-detalhes-avaliacao');
        if (event.target === modal) {
            closeModal('modal-detalhes-avaliacao');
        }
    });
});

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
    
    showLoadingIndicator(true);
    loadAvaliacoesData(tabId);
}

function setupFilters() {
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', () => loadAvaliacoesData('avaliacoes'));
    
    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.addEventListener('keypress', e => e.key === 'Enter' && loadAvaliacoesData('avaliacoes'));
    
    const sortOrderSelect = document.getElementById('sort-order');
    if (sortOrderSelect) sortOrderSelect.addEventListener('change', () => loadAvaliacoesData('avaliacoes'));
}

function showLoadingIndicator(show) {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) indicator.style.display = show ? 'flex' : 'none';
    
    document.getElementById('desempenho-content').style.opacity = show ? '0.4' : '1';
    document.getElementById('avaliacoes-content').style.opacity = show ? '0.4' : '1';
}

async function loadAvaliacoesData(tabId) {
    showLoadingIndicator(true);
    
    const searchTerm = document.getElementById('search-input')?.value || '';
    const sortOrder = document.getElementById('sort-order')?.value || 'desc';
    const statusFilter = document.getElementById('status-filter')?.value || '';

    try {
        let url = `/dashboard/avaliacoes/data/?tab=${tabId}`;
        if (tabId === 'avaliacoes') {
             url += `&search=${encodeURIComponent(searchTerm)}&sort=${sortOrder}&status=${statusFilter}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido.' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (tabId === 'desempenho') {
                renderDesempenho(data.desempenho);
            } else if (tabId === 'avaliacoes') {
                renderAvaliacoesTabela(data.avaliacoes);
            }
        } else {
            showErrorToast(data.error || 'Falha ao carregar dados de avaliações.');
        }

    } catch (error) {
        showErrorToast(`Erro ao carregar dados: ${error.message}`);
    } finally {
        showLoadingIndicator(false);
        document.getElementById('desempenho-content').style.opacity = '1';
        document.getElementById('avaliacoes-content').style.opacity = '1';
    }
}

function renderDesempenho(data) {
    const { bloco_geral, bloco_notas_gerais, bloco_detalhes } = data;
    
    // Bloco Geral (1)
    document.getElementById('total-avaliacoes-30dias').textContent = `${bloco_geral.total_30dias} avaliações nos últimos 30 dias`;
    
    // Bloco Médias (2) - Média Geral
    document.getElementById('nota-media-geral').textContent = bloco_geral.nota_media_geral.toFixed(1).replace('.', ',');
    
    const estrelasMediaGeral = document.getElementById('estrelas-media-geral');
    estrelasMediaGeral.innerHTML = gerarEstrelas(bloco_geral.nota_media_geral, 24);

    document.getElementById('total-avaliacoes-texto').textContent = `(${bloco_geral.total_avaliacoes} avaliações)`;

    renderDetalhesEstrelas(bloco_notas_gerais, document.getElementById('detalhes-notas-gerais'));
    
    renderDetalhesEstrelas(bloco_detalhes.qualidade, document.getElementById('qualidade-detalhes'));
    renderDetalhesEstrelas(bloco_detalhes.atendimento, document.getElementById('atendimento-detalhes'));
    renderDetalhesEstrelas(bloco_detalhes.velocidade, document.getElementById('velocidade-detalhes'));
}

function gerarEstrelas(nota, fontSize = 14) {
    let html = '';
    const notaArredondada = Math.round(nota * 2) / 2;
    for (let i = 1; i <= 5; i++) {
        if (i <= notaArredondada) {
            html += `<i class="bi bi-star-fill" style="font-size: ${fontSize}px;"></i>`;
        } else if (i - 0.5 === notaArredondada) {
            html += `<i class="bi bi-star-half" style="font-size: ${fontSize}px;"></i>`;
        } else {
            html += `<i class="bi bi-star" style="font-size: ${fontSize}px;"></i>`;
        }
    }
    return html;
}

function renderDetalhesEstrelas(notas, container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    const notasArray = Object.entries(notas)
        .filter(([key]) => key.startsWith('nota_'))
        .map(([key, value]) => ({ nota: parseInt(key.split('_')[1]), contagem: value }))
        .sort((a, b) => b.nota - a.nota);
        
    const totalContagem = notasArray.reduce((sum, item) => sum + item.contagem, 0);
    
    if (totalContagem === 0) {
        container.innerHTML = `<p style="font-size: 14px; color: var(--cinza-escuro);">Nenhuma nota registrada nesta categoria.</p>`;
        return;
    }

    notasArray.forEach(item => {
        const percentual = totalContagem > 0 ? (item.contagem / totalContagem) * 100 : 0;
        const estrelasHtml = gerarEstrelas(item.nota, 14);
        
        container.innerHTML += `
            <div class="detalhe-linha">
                <span class="estrelas-icon">${estrelasHtml}</span>
                <div class="barra-fundo">
                    <div class="barra-preenchida" style="width: ${percentual}%;"></div>
                </div>
                <span class="valor-contagem">${item.contagem}</span>
            </div>
        `;
    });
}

function renderAvaliacoesTabela(avaliacoes) {
    const tableBody = document.getElementById('avaliacoes-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    const template = document.getElementById('avaliacao-row-template');
    
    if (avaliacoes.length === 0) {
        tableBody.innerHTML = '<div class="linha-vazia">Nenhuma avaliação encontrada.</div>';
        return;
    }
    
    avaliacoes.forEach(avaliacao => {
        const rowClone = template.content.cloneNode(true);
        const newRow = rowClone.querySelector('.linha-avaliacao');
        
        newRow.querySelector('.col-id').textContent = `#${avaliacao.id.substring(Math.max(0, avaliacao.id.length - 8))}`;
        newRow.querySelector('.col-data-pedido').textContent = avaliacao.data_pedido_str;
        newRow.querySelector('.col-data-avaliacao').textContent = avaliacao.data_avaliacao_str;
        newRow.querySelector('.col-nota').textContent = avaliacao.nota_geral.toFixed(1);
        newRow.querySelector('.col-qualidade').textContent = avaliacao.qualidade;
        newRow.querySelector('.col-atendimento').textContent = avaliacao.atendimento;
        newRow.querySelector('.col-velocidade').textContent = avaliacao.velocidade;
        
        const statusBadge = newRow.querySelector('.status-badge');
        statusBadge.textContent = avaliacao.status === 'avaliado' ? 'Avaliado' : 'Pendente';
        statusBadge.className = `status-badge ${avaliacao.status}`;
        
        const btnDetalhes = newRow.querySelector('.btn-ver-detalhes');
        btnDetalhes.setAttribute('data-order-id', avaliacao.id);
        
        tableBody.appendChild(rowClone);
    });
}

async function showAvaliacaoDetails(orderId) {
    openModal('modal-detalhes-avaliacao');
    
    const titulo = document.getElementById('detalhes-titulo');
    titulo.textContent = `Avaliação do Pedido #${orderId.substring(Math.max(0, orderId.length - 8))}`;

    const notaGeralElement = document.getElementById('detalhes-nota-geral');
    const notaQualidade = document.getElementById('nota-qualidade');
    const notaAtendimento = document.getElementById('nota-atendimento');
    const notaVelocidade = document.getElementById('nota-velocidade');
    
    notaGeralElement.innerHTML = `<span style="color: var(--vermelho-principal); font-weight: 700;">Carregando...</span>`;
    notaQualidade.innerHTML = '';
    notaAtendimento.innerHTML = '';
    notaVelocidade.innerHTML = '';
    document.getElementById('qualidade-texto').textContent = '...';
    document.getElementById('atendimento-texto').textContent = '...';
    document.getElementById('velocidade-texto').textContent = '...';

    try {
        const response = await fetch(`/dashboard/avaliacoes/details/${orderId}/`);
        if (!response.ok) throw new Error('Falha ao buscar detalhes');
        const data = await response.json();

        if (data.success) {
            const details = data.details;
            
            notaGeralElement.innerHTML = `Nota Geral: <span style="color: var(--vermelho-principal);">${details.nota_geral.toFixed(1).replace('.', ',')}</span>`;
            notaQualidade.innerHTML = gerarEstrelas(details.qualidade_nota, 20);
            notaAtendimento.innerHTML = gerarEstrelas(details.atendimento_nota, 20);
            notaVelocidade.innerHTML = gerarEstrelas(details.velocidade_nota, 20);
            
            document.getElementById('qualidade-texto').textContent = details.qualidade_texto;
            document.getElementById('atendimento-texto').textContent = details.atendimento_texto;
            document.getElementById('velocidade-texto').textContent = details.velocidade_texto;

        } else {
            showErrorToast(data.error || 'Erro ao carregar detalhes.');
        }
    } catch (error) {
        showErrorToast(`Erro de rede: ${error.message}`);
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
    }
}

function getCSRFToken() {
    const token = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    if (token) return token;
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken) return metaToken;
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    return cookieValue || '';
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);
    const closeButton = document.createElement('button');
    closeButton.className = 'toast-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => toast.remove();
    toast.appendChild(closeButton);
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.remove();
    }, 5000);
    return toast;
}

function showErrorToast(message) { return showToast(message, 'error'); }
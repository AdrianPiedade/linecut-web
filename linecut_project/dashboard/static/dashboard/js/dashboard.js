/* linecut_project/dashboard/static/dashboard/js/dashboard.js */

let vendasChartInstance = null;
let topProdutosChartInstance = null;
let satisfacaoChartInstance = null;
let fluxoHorarioChartInstance = null;

const DASHBOARD_COLORS = {
    primary: '#9C0202',
    primaryLight: '#c82828',
    primaryLighter: '#ff5c5c',
    green: '#189F4C',
    red: '#d32f2f',
    yellow: '#F2C12E',
    gray: '#7D7D7D',
    chartBackgrounds: ['#9C0202', '#c82828', '#ff5c5c', '#ff8f8f', '#ffc2c2']
};

document.addEventListener('DOMContentLoaded', function() {
    const periodSelector = document.getElementById('period-selector');
    if (periodSelector) {
        periodSelector.addEventListener('change', loadDashboardData);
    }
    loadDashboardData();
});

async function loadDashboardData() {
    showLoadingIndicator(true);
    const period = document.getElementById('period-selector').value;
    const url = `/dashboard/analitico/data/?period=${period}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido.' }));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.success) {
            updateMetrics(data.metrics);
            renderCharts(data.charts);
        } else {
            showErrorToast(data.error || 'Falha ao carregar dados do dashboard.');
        }

    } catch (error) {
        showErrorToast(`Erro de rede: ${error.message}`);
        updateMetrics({ faturamento: 0, pedidos_concluidos: 0, ticket_medio: 0, avaliacao_media: 0, satisfacao_percentual: 0, total_avaliacoes: 0, comparativos: { faturamento_diff: 0, pedidos_diff: 0, ticket_diff: 0 } });
        renderCharts({ vendas_labels: [], vendas_atual: [], vendas_passada: [], top_5_produtos_vendidos: [], satisfacao_labels: [], satisfacao_data: [] });
    } finally {
        showLoadingIndicator(false);
    }
}

function updateMetrics(metrics) {
    document.getElementById('faturamento-valor').textContent = formatCurrency(metrics.faturamento);
    document.getElementById('pedidos-concluidos-valor').textContent = formatNumber(metrics.pedidos_concluidos);
    document.getElementById('ticket-medio-valor').textContent = formatCurrency(metrics.ticket_medio);
    document.getElementById('avaliacao-media-valor').textContent = metrics.avaliacao_media.toFixed(1).replace('.', ',');
    document.getElementById('avaliacao-satisfacao').textContent = `(${formatNumber(metrics.total_avaliacoes)} avaliações)`;

    updateComparative('faturamento', metrics.comparativos.faturamento_diff, formatPercentage(Math.abs(metrics.comparativos.faturamento_diff)));
    updateComparative('pedidos-concluidos', metrics.comparativos.pedidos_diff, `${formatNumber(Math.abs(metrics.comparativos.pedidos_diff))} pedidos`); 
    updateComparative('ticket-medio', metrics.comparativos.ticket_diff, formatPercentage(Math.abs(metrics.comparativos.ticket_diff)));
    
    // Estrelas
    const estrelasContainer = document.getElementById('avaliacao-estrelas');
    estrelasContainer.innerHTML = generateStars(metrics.avaliacao_media);
}

function updateComparative(baseId, difference, textValue) {
    const iconSpan = document.getElementById(`${baseId}-comparativo-icone`);
    const textSpan = document.getElementById(`${baseId}-comparativo-texto`);
    const isPositive = difference > 0;
    const isNeutral = difference === 0;

    iconSpan.innerHTML = '';
    iconSpan.className = 'comparativo';
    
    if (isNeutral) {
        iconSpan.innerHTML = '<i class="bi bi-dash-lg"></i>';
        iconSpan.classList.add('comparativo-positivo'); 
        textSpan.textContent = `0% vs período anterior`;
    } else if (isPositive) {
        iconSpan.innerHTML = '<i class="bi bi-arrow-up-short"></i>';
        iconSpan.classList.add('comparativo-positivo');
        textSpan.textContent = `${textValue} vs período anterior`;
    } else {
        iconSpan.innerHTML = '<i class="bi bi-arrow-down-short"></i>';
        iconSpan.classList.add('comparativo-negativo');
        textSpan.textContent = `${textValue} vs período anterior`;
    }
}

function renderCharts(charts) {
    const vendasCtx = document.getElementById('vendasChart').getContext('2d');
    if (vendasChartInstance) vendasChartInstance.destroy();
    vendasChartInstance = new Chart(vendasCtx, {
        type: 'line',
        data: {
            labels: charts.vendas_labels,
            datasets: [{
                label: 'Semana Atual',
                data: charts.vendas_atual,
                borderColor: DASHBOARD_COLORS.primary,
                backgroundColor: DASHBOARD_COLORS.primary,
                tension: 0.3,
                fill: false,
                pointRadius: 5
            },
            {
                label: 'Período Anterior',
                data: charts.vendas_passada,
                borderColor: DASHBOARD_COLORS.primaryLighter,
                backgroundColor: DASHBOARD_COLORS.primaryLighter,
                borderDash: [5, 5],
                tension: 0.3,
                fill: false,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Qtd. Pedidos', color: DASHBOARD_COLORS.gray } } }
        }
    });

    const topProdutosCtx = document.getElementById('topProdutosChart').getContext('2d');
    if (topProdutosChartInstance) topProdutosChartInstance.destroy();
    
    const topProdutosData = charts.top_5_produtos_vendidos.slice(0, 5);
    const produtosLabels = topProdutosData.map(p => p.nome);
    const produtosQuantities = topProdutosData.map(p => p.qtd);
    
    topProdutosChartInstance = new Chart(topProdutosCtx, {
        type: 'bar',
        data: {
            labels: produtosLabels,
            datasets: [{
                label: 'Quantidade Vendida',
                data: produtosQuantities,
                backgroundColor: DASHBOARD_COLORS.chartBackgrounds.slice(0, 5),
                borderColor: DASHBOARD_COLORS.primary,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: { x: { beginAtZero: true, title: { display: true, text: 'Qtd.', color: DASHBOARD_COLORS.gray } } },
             plugins: { legend: { display: false } }
        }
    });
    
    const satisfacaoCtx = document.getElementById('satisfacaoChart').getContext('2d');
    if (satisfacaoChartInstance) satisfacaoChartInstance.destroy();
    
    satisfacaoChartInstance = new Chart(satisfacaoCtx, {
        type: 'doughnut',
        data: {
            labels: charts.satisfacao_labels,
            datasets: [{
                data: charts.satisfacao_data,
                backgroundColor: DASHBOARD_COLORS.chartBackgrounds.slice(0, charts.satisfacao_labels.length),
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
    
    renderSatisfacaoLegend(charts.satisfacao_labels, charts.satisfacao_data, DASHBOARD_COLORS.chartBackgrounds.slice(0, charts.satisfacao_labels.length));
    
    const fluxoHorarioCtx = document.getElementById('fluxoHorarioChart').getContext('2d');
    if (fluxoHorarioChartInstance) fluxoHorarioChartInstance.destroy();
    
    fluxoHorarioChartInstance = new Chart(fluxoHorarioCtx, {
        type: 'bar',
        data: {
            labels: charts.fluxo_labels,
            datasets: [{
                label: 'Movimento',
                data: charts.fluxo_data,
                backgroundColor: DASHBOARD_COLORS.primary,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true, title: { display: true, text: 'Qtd. Clientes (Simulada)', color: DASHBOARD_COLORS.gray } } },
            plugins: { legend: { display: false } }
        }
    });
}

function generateStars(rating) {
    let html = '';
    const roundedRating = Math.round(rating * 2) / 2;
    for (let i = 1; i <= 5; i++) {
        if (i <= roundedRating) {
            html += '<i class="bi bi-star-fill" style="color: ' + DASHBOARD_COLORS.yellow + ';"></i>';
        } else if (i - 0.5 === roundedRating) {
            html += '<i class="bi bi-star-half" style="color: ' + DASHBOARD_COLORS.yellow + ';"></i>';
        } else {
            html += '<i class="bi bi-star" style="color: ' + DASHBOARD_COLORS.yellow + '; opacity: 0.5;"></i>';
        }
    }
    return html;
}

function renderSatisfacaoLegend(labels, data, colors) {
    const container = document.getElementById('satisfacao-legenda');
    container.innerHTML = '';
    let total = data.reduce((sum, val) => sum + val, 0);

    labels.forEach((label, index) => {
        const value = data[index];
        const percent = total > 0 ? (value / total * 100).toFixed(0) : 0;

        const li = document.createElement('li');
        li.innerHTML = `
            <span class="cor-indicador" style="background-color: ${colors[index]}"></span>
            <span>${label}: <strong>${percent}%</strong> (${value})</span>
        `;
        container.appendChild(li);
    });
}

function formatCurrency(value) {
     return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatNumber(value) {
     return new Intl.NumberFormat('pt-BR').format(value);
}

function formatPercentage(value) {
     return (value * 100).toFixed(1).replace('.', ',') + '%';
}

function showLoadingIndicator(show) {
    const indicator = document.getElementById('loading-indicator');
    const mainContent = document.querySelector('.conteudo-principal');
    if (indicator) indicator.style.display = show ? 'flex' : 'none';
    if (mainContent) {
        const sections = mainContent.querySelectorAll('section, header:not(.cabecalho-dashboard)');
        sections.forEach(sec => sec.style.opacity = show ? '0.4' : '1');
    }
}

function showErrorToast(message) {
    if (typeof showToast === 'function') {
        showToast(message, 'error');
    } else {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-error`;
        toast.textContent = message;
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => toast.remove();
        toast.appendChild(closeBtn);
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 5000);
    }
}
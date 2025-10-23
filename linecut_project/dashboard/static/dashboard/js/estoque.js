document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const categoriaFilter = document.getElementById('categoria-filter');
    const statusEstoqueFilter = document.getElementById('status-estoque-filter');
    const formEstoque = document.getElementById('form-estoque');
    const quantidadeAtualInput = document.getElementById('quantidade-atual');
    const quantidadeIdealInput = document.getElementById('quantidade-ideal');
    const quantidadeCriticaInput = document.getElementById('quantidade-critica');

    if (searchInput) searchInput.addEventListener('input', filtrarEstoque);
    if (categoriaFilter) categoriaFilter.addEventListener('change', filtrarEstoque);
    if (statusEstoqueFilter) statusEstoqueFilter.addEventListener('change', filtrarEstoque);

    if (formEstoque) {
        formEstoque.addEventListener('submit', function(e) {
            e.preventDefault();
            salvarEstoque();
        });
    }

    if (quantidadeAtualInput && quantidadeIdealInput && quantidadeCriticaInput) {
        quantidadeAtualInput.addEventListener('input', atualizarStatusPreview);
        quantidadeIdealInput.addEventListener('input', atualizarStatusPreview);
        quantidadeCriticaInput.addEventListener('input', atualizarStatusPreview);
    }

    window.addEventListener('click', function(e) {
        const modalEstoque = document.getElementById('modal-estoque');
        const modalConfirmacao = document.getElementById('modal-confirmacao');

        if (e.target === modalEstoque) fecharModalEstoque();
        if (e.target === modalConfirmacao) fecharConfirmacao();
    });

    filtrarEstoque();
});

function filtrarEstoque() {
    const removerAcentos = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    const searchTerm = removerAcentos(document.getElementById('search-input').value.toLowerCase());
    const categoria = document.getElementById('categoria-filter').value;
    const statusEstoque = document.getElementById('status-estoque-filter').value;
    const linhas = document.querySelectorAll('.linha-estoque');
    let produtosVisiveis = 0;

    linhas.forEach(linha => {
        const nomeProduto = linha.querySelector('.col-nome').textContent;
        const nomeNormalizado = removerAcentos(nomeProduto.toLowerCase());
        const productCategoria = linha.getAttribute('data-category');
        const productStatusEstoque = linha.getAttribute('data-status-estoque');

        const matchesSearch = nomeNormalizado.includes(searchTerm) || searchTerm === '';
        const matchesCategoria = !categoria || productCategoria === categoria;
        const matchesStatusEstoque = !statusEstoque || productStatusEstoque === statusEstoque;

        if (matchesSearch && matchesCategoria && matchesStatusEstoque) {
            linha.style.display = 'grid';
            produtosVisiveis++;
        } else {
            linha.style.display = 'none';
        }
    });

    const linhaVazia = document.querySelector('.linha-vazia');
    if (linhaVazia) {
        if (produtosVisiveis === 0 && searchTerm !== '') {
            linhaVazia.textContent = 'Nenhum produto encontrado com os filtros aplicados.';
            linhaVazia.style.display = 'grid';
        } else if (produtosVisiveis === 0) {
            linhaVazia.textContent = 'Nenhum produto cadastrado.';
            linhaVazia.style.display = 'grid';
        } else {
            linhaVazia.style.display = 'none';
        }
    }
}

function editarEstoque(produtoId) {
    const modal = document.getElementById('modal-estoque');
    const titulo = document.getElementById('modal-titulo');
    const btnText = document.getElementById('btn-text');
    const loadingText = document.getElementById('loading-text');

    titulo.textContent = 'Editar Estoque';
    document.getElementById('produto-id').value = produtoId;
    if(btnText) btnText.textContent = 'Salvar Alterações';

    preencherFormularioEstoque(produtoId);
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function preencherFormularioEstoque(produtoId) {
    const linhaEstoque = encontrarLinhaPorId(produtoId);

    if (linhaEstoque) {
        const nome = linhaEstoque.querySelector('.col-nome').textContent;
        const categoria = linhaEstoque.getAttribute('data-category');
        const quantidade = linhaEstoque.getAttribute('data-quantidade');
        const quantidadeIdeal = linhaEstoque.getAttribute('data-quantidade-ideal');
        const quantidadeCritica = linhaEstoque.getAttribute('data-quantidade-critica');

        document.getElementById('nome-produto').textContent = nome;
        document.getElementById('categoria-produto').textContent = categoria;
        document.getElementById('quantidade-atual').value = quantidade;
        document.getElementById('quantidade-ideal').value = quantidadeIdeal !== "0" ? quantidadeIdeal : '';
        document.getElementById('quantidade-critica').value = quantidadeCritica !== "0" ? quantidadeCritica : '';

        atualizarStatusPreview();
    } else {
        fetch(`/dashboard/estoque/detalhes/${produtoId}/`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCSRFToken(),
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const produto = data.produto;
                document.getElementById('nome-produto').textContent = produto.name || '';
                document.getElementById('categoria-produto').textContent = produto.category || '';
                document.getElementById('quantidade-atual').value = produto.quantity || '';
                document.getElementById('quantidade-ideal').value = produto.ideal_quantity || '';
                document.getElementById('quantidade-critica').value = produto.critical_quantity || '';

                atualizarStatusPreview();
            } else {
                showErrorToast('Erro ao carregar produto: ' + data.message);
            }
        })
        .catch(error => {
            showErrorToast('Erro ao carregar dados do produto.');
        });
    }
}

function atualizarStatusPreview() {
    const quantidadeAtual = parseInt(document.getElementById('quantidade-atual').value) || 0;
    const quantidadeIdeal = parseInt(document.getElementById('quantidade-ideal').value) || 0;
    const quantidadeCritica = parseInt(document.getElementById('quantidade-critica').value) || 0;
    const statusPreview = document.getElementById('status-preview');
    let status = 'suficiente';
    let textoStatus = 'Suficiente';

    if (quantidadeCritica > 0 && quantidadeAtual <= quantidadeCritica) {
        status = 'critico';
        textoStatus = 'Crítico';
    } else if (quantidadeIdeal > 0 && quantidadeAtual <= quantidadeIdeal) {
        status = 'baixo';
        textoStatus = 'Baixo';
    }

    statusPreview.className = 'status-badge ' + status;
    statusPreview.textContent = textoStatus;
}

function salvarEstoque() {
    const btnSalvar = document.getElementById('btn-salvar-estoque');
    const produtoId = document.getElementById('produto-id').value;
    setButtonLoading(btnSalvar, true);

    const formData = new FormData();
    formData.append('csrfmiddlewaretoken', getCSRFToken());
    formData.append('produto_id', produtoId);
    const quantidade = parseInt(document.getElementById('quantidade-atual').value) || 0;
    const idealQuantity = parseInt(document.getElementById('quantidade-ideal').value) || 0;
    const criticalQuantity = parseInt(document.getElementById('quantidade-critica').value) || 0;
    formData.append('quantity', quantidade);
    formData.append('ideal_quantity', idealQuantity);
    formData.append('critical_quantity', criticalQuantity);

    fetch(`/dashboard/estoque/atualizar/${produtoId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRFToken': getCSRFToken(),
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessToast(data.message);
            fecharModalEstoque();
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            showErrorToast('Erro: ' + data.message);
        }
    })
    .catch(error => {
        showErrorToast('Erro ao salvar estoque: ' + error.message);
    })
    .finally(() => {
        setButtonLoading(btnSalvar, false);
    });
}

function fecharModalEstoque() {
    const modal = document.getElementById('modal-estoque');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function encontrarLinhaPorId(produtoId) {
    return document.querySelector(`.linha-estoque[data-product-id="${produtoId}"]`);
}


function fecharConfirmacao() {
    const modal = document.getElementById('modal-confirmacao');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    reativarBotoesConfirmacao();
}

function getCSRFToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfToken ? csrfToken.value : '';
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
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
    closeButton.onclick = () => removeToast(toast);
    toast.appendChild(closeButton);
    container.appendChild(toast);
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
    return toast;
}

function removeToast(toast) {
     if (!toast || !toast.parentNode) return;
    toast.style.animation = 'fadeOut 0.5s ease forwards';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 500);
}

function showSuccessToast(message) { return showToast(message, 'success'); }
function showErrorToast(message) { return showToast(message, 'error'); }
function showWarningToast(message) { return showToast(message, 'warning'); }
function showInfoToast(message) { return showToast(message, 'info'); }


function setButtonLoading(button, isLoading) {
    if (!button) return;
    const spinner = button.querySelector('.spinner-border');
    const btnText = button.querySelector('#btn-text');

    if (isLoading) {
        button.disabled = true;
        button.classList.add('btn-loading-state');
        if (btnText) btnText.style.display = 'none';
        if (spinner) {
             spinner.style.display = 'inline-block';
        } else {
             const newSpinner = document.createElement('span');
             newSpinner.className = 'spinner-border spinner-border-sm';
             newSpinner.setAttribute('role', 'status');
             newSpinner.setAttribute('aria-hidden', 'true');
             button.insertBefore(newSpinner, button.firstChild);
        }
    } else {
        button.disabled = false;
        button.classList.remove('btn-loading-state');
        if (btnText) btnText.style.display = 'inline';
        const existingSpinner = button.querySelector('.spinner-border');
        if (existingSpinner) existingSpinner.style.display = 'none';
    }
}


function reativarBotoesConfirmacao() {
    const btnConfirmar = document.getElementById('btn-confirmar-acao');
    if (btnConfirmar) {
        setButtonLoading(btnConfirmar, false);
        btnConfirmar.textContent = 'Confirmar';
        btnConfirmar.disabled = false;
    }
}
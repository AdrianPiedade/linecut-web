document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const categoriaFilter = document.getElementById('categoria-filter');
    const statusFilter = document.getElementById('status-filter');
    const imagemInput = document.getElementById('imagem-input');
    const formProduto = document.getElementById('form-produto');
    
    if (searchInput) searchInput.addEventListener('input', filtrarProdutos);
    if (categoriaFilter) categoriaFilter.addEventListener('change', filtrarProdutos);
    if (statusFilter) statusFilter.addEventListener('change', filtrarProdutos);
    
    if (imagemInput) {
        imagemInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewImg = document.getElementById('preview-img');
                    const placeholderText = document.getElementById('placeholder-text');
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                    placeholderText.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (formProduto) {
        formProduto.addEventListener('submit', function(e) {
            e.preventDefault();
            salvarProduto();
        });
    }
    
    filtrarProdutos();
});

function filtrarProdutos() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoria = document.getElementById('categoria-filter').value;
    const status = document.getElementById('status-filter').value;
    const linhas = document.querySelectorAll('.linha-produto');
    let produtosVisiveis = 0;
    
    linhas.forEach(linha => {
        const nome = linha.querySelector('.col-nome').textContent.toLowerCase();
        const productCategoria = linha.getAttribute('data-category');
        const productStatus = linha.getAttribute('data-status');
        const matchesSearch = nome.includes(searchTerm) || searchTerm === '';
        const matchesCategoria = !categoria || productCategoria === categoria;
        const matchesStatus = !status || productStatus === status;
        
        if (matchesSearch && matchesCategoria && matchesStatus) {
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
            linhaVazia.textContent = 'Nenhum produto cadastrado. Clique em "Cadastrar" para começar.';
            linhaVazia.style.display = 'grid';
        } else {
            linhaVazia.style.display = 'none';
        }
    }
}

function abrirModal(produtoId = null) {
    const modal = document.getElementById('modal-produto');
    const titulo = document.getElementById('modal-titulo');
    const btnText = document.getElementById('btn-text');
    const loadingText = document.getElementById('loading-text');
    
    if (produtoId && produtoId !== 'null' && produtoId !== 'undefined') {
        titulo.textContent = 'Editar Produto';
        document.getElementById('produto-id').value = produtoId;
        document.getElementById('modo-edicao').value = 'true';
        btnText.textContent = 'Atualizar Produto';
        loadingText.textContent = 'Atualizando...';
        preencherFormularioEdicao(produtoId);
    } else {
        titulo.textContent = 'Adicionar Produto';
        document.getElementById('produto-id').value = '';
        document.getElementById('modo-edicao').value = 'false';
        btnText.textContent = 'Salvar Produto';
        loadingText.textContent = 'Salvando...';
        limparFormulario();
    }
    
    modal.style.display = 'block';
}

function preencherFormularioEdicao(produtoId) {
    const linhaProduto = encontrarLinhaPorId(produtoId);
    
    if (linhaProduto) {
        const nome = linhaProduto.querySelector('.col-nome').textContent;
        const descricao = linhaProduto.querySelector('.col-descricao').textContent;
        const precoText = linhaProduto.querySelector('.col-preco').textContent;
        const preco = precoText.replace('R$', '').replace(',', '.').trim();
        const quantidade = linhaProduto.querySelector('.col-quantidade').textContent;
        const statusBadge = linhaProduto.querySelector('.status-badge');
        const status = statusBadge.textContent.trim() === 'Disponível' ? 'true' : 'false';
        const categoria = linhaProduto.getAttribute('data-category');
        const imagemUrl = linhaProduto.getAttribute('data-image-url');
        
        document.getElementById('nome').value = nome;
        document.getElementById('descricao').value = descricao;
        document.getElementById('preco').value = preco;
        document.getElementById('quantidade').value = quantidade;
        document.getElementById('status').value = status;
        document.getElementById('categoria').value = categoria;
        
        if (imagemUrl && imagemUrl !== 'null' && imagemUrl !== 'undefined' && imagemUrl !== '') {
            carregarImagemPreview(imagemUrl);
        } else {
            resetarImagemPreview();
        }
        
    } else {
        fetch(`/dashboard/produtos/detalhes/${produtoId}/`, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRFToken': getCSRFToken(),
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const produto = data.produto;
                document.getElementById('nome').value = produto.name || '';
                document.getElementById('categoria').value = produto.category || '';
                document.getElementById('preco').value = produto.price || '';
                document.getElementById('quantidade').value = produto.quantity || '';
                document.getElementById('status').value = produto.is_available ? 'true' : 'false';
                document.getElementById('descricao').value = produto.description || '';
                
                if (produto.image_url) {
                    carregarImagemPreview(produto.image_url);
                }
            } else {
                alert('Erro ao carregar produto: ' + data.message);
            }
        })
        .catch(error => {
            alert('Erro ao carregar dados do produto.');
        });
    }
}

function carregarImagemPreview(imagemUrl) {
    const previewImg = document.getElementById('preview-img');
    const placeholderText = document.getElementById('placeholder-text');
    
    if (imagemUrl && imagemUrl !== 'null' && imagemUrl !== 'undefined') {
        const urlUnica = imagemUrl + (imagemUrl.includes('?') ? '&' : '?') + '_=' + Date.now();
        previewImg.src = urlUnica;
        previewImg.style.display = 'block';
        placeholderText.style.display = 'none';
        
        previewImg.onerror = function() {
            previewImg.style.display = 'none';
            placeholderText.style.display = 'block';
        };
    } else {
        resetarImagemPreview();
    }
}

function resetarImagemPreview() {
    const previewImg = document.getElementById('preview-img');
    const placeholderText = document.getElementById('placeholder-text');
    previewImg.src = '';
    previewImg.style.display = 'none';
    placeholderText.style.display = 'block';
}

function limparFormulario() {
    document.getElementById('nome').value = '';
    document.getElementById('categoria').value = '';
    document.getElementById('preco').value = '';
    document.getElementById('quantidade').value = '';
    document.getElementById('status').value = 'true';
    document.getElementById('descricao').value = '';
    
    const previewImg = document.getElementById('preview-img');
    const placeholderText = document.getElementById('placeholder-text');
    const imagemInput = document.getElementById('imagem-input');
    
    previewImg.src = '';
    previewImg.style.display = 'none';
    placeholderText.style.display = 'block';
    imagemInput.value = '';
}

function salvarProduto() {
    const btnSalvar = document.getElementById('btn-salvar-produto');
    const btnText = document.getElementById('btn-text');
    const btnLoading = document.getElementById('btn-loading');
    const modoEdicao = document.getElementById('modo-edicao').value === 'true';
    const produtoId = document.getElementById('produto-id').value;
    
    btnText.style.display = 'none';
    btnLoading.style.display = 'flex';
    btnSalvar.disabled = true;
    
    const form = document.getElementById('form-produto');
    const formData = new FormData(form);
    const url = modoEdicao ? `/dashboard/produtos/editar/${produtoId}/` : '/dashboard/produtos/criar/';
    
    if (modoEdicao) {
        formData.append('_method', 'PUT');
    }
    
    fetch(url, {
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
            alert(data.message);
            fecharModal();
            location.reload();
        } else {
            alert('Erro: ' + data.message);
        }
    })
    .catch(error => {
        alert('Erro ao salvar produto: ' + error.message);
    })
    .finally(() => {
        btnText.style.display = 'flex';
        btnLoading.style.display = 'none';
        btnSalvar.disabled = false;
    });
}

function fecharModal() {
    const modal = document.getElementById('modal-produto');
    modal.style.display = 'none';
    limparFormulario();
}

function editarProduto(produtoId) {
    abrirModal(produtoId);
}

function excluirProduto(produtoId, produtoNome) {
    const modal = document.getElementById('modal-confirmacao');
    const titulo = document.getElementById('confirmacao-titulo');
    const mensagem = document.getElementById('confirmacao-mensagem');
    const btnConfirmar = document.getElementById('btn-confirmar-acao');
    const botoesContainer = document.querySelector('.botoes-confirmacao');
    
    titulo.textContent = 'Confirmar Exclusão';
    mensagem.textContent = `Tem certeza que deseja excluir o produto "${produtoNome}"? Esta ação não pode ser desfeita.`;
    
    btnConfirmar.classList.remove('loading');
    btnConfirmar.disabled = false;
    botoesContainer.classList.remove('loading');
    btnConfirmar.textContent = 'Sim';
    
    btnConfirmar.onclick = function() {
        btnConfirmar.classList.add('loading');
        btnConfirmar.disabled = true;
        botoesContainer.classList.add('loading');
        
        const linhaProduto = encontrarLinhaPorId(produtoId);
        const imagemUrl = linhaProduto ? linhaProduto.getAttribute('data-image-url') : null;
        const dados = { produto_id: produtoId, imagem_url: imagemUrl };
        
        fetch(`/dashboard/produtos/excluir/${produtoId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: JSON.stringify(dados)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fecharConfirmacao();
                if (linhaProduto) {
                    linhaProduto.remove();
                    const produtosRestantes = document.querySelectorAll('.linha-produto').length;
                    if (produtosRestantes === 0) {
                        mostrarLinhaVazia();
                    }
                    mostrarMensagemSucesso('Produto excluído com sucesso!');
                } else {
                    location.reload();
                }
            } else {
                alert('Erro: ' + data.message);
                reativarBotoesConfirmacao();
            }
        })
        .catch(error => {
            alert('Erro ao excluir produto: ' + error.message);
            reativarBotoesConfirmacao();
        });
    };
    
    modal.style.display = 'block';
}

function reativarBotoesConfirmacao() {
    const btnConfirmar = document.getElementById('btn-confirmar-acao');
    const botoesContainer = document.querySelector('.botoes-confirmacao');
    btnConfirmar.classList.remove('loading');
    btnConfirmar.disabled = false;
    botoesContainer.classList.remove('loading');
    btnConfirmar.textContent = 'Sim';
}

function mostrarMensagemSucesso(mensagem) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: var(--verde);
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        font-family: 'Poppins', sans-serif;
        font-size: 14px;
    `;
    toast.textContent = mensagem;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function encontrarLinhaPorId(produtoId) {
    const linhas = document.querySelectorAll('.linha-produto');
    for (const linha of linhas) {
        const idElement = linha.querySelector('.col-id');
        if (idElement && idElement.textContent.trim() === produtoId) {
            return linha;
        }
        if (linha.getAttribute('data-product-id') === produtoId) {
            return linha;
        }
    }
    return null;
}

function mostrarLinhaVazia() {
    const corpoTabela = document.querySelector('.corpo-tabela');
    let linhaVazia = corpoTabela.querySelector('.linha-vazia');
    if (!linhaVazia) {
        linhaVazia = document.createElement('div');
        linhaVazia.className = 'linha-vazia';
        linhaVazia.textContent = 'Nenhum produto cadastrado. Clique em "Cadastrar" para começar.';
        corpoTabela.appendChild(linhaVazia);
    }
    linhaVazia.style.display = 'grid';
}

function toggleStatus(produtoId, buttonElement, currentStatus) {
    const originalText = buttonElement.textContent;
    buttonElement.textContent = 'Processando...';
    buttonElement.disabled = true;
    
    fetch(`/dashboard/produtos/toggle-status/${produtoId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ current_status: currentStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            atualizarInterfaceStatus(produtoId, !currentStatus, buttonElement);
            alert(data.message);
        } else {
            alert('Erro: ' + data.message);
            buttonElement.textContent = originalText;
            buttonElement.disabled = false;
        }
    })
    .catch(error => {
        alert('Erro ao alterar status do produto');
        buttonElement.textContent = originalText;
        buttonElement.disabled = false;
    });
}

function atualizarInterfaceStatus(produtoId, novoStatus, buttonElement) {
    const linhaProduto = buttonElement.closest('.linha-produto');
    if (linhaProduto) {
        const statusBadge = linhaProduto.querySelector('.status-badge');
        if (statusBadge) {
            if (novoStatus) {
                statusBadge.className = 'status-badge disponivel';
                statusBadge.textContent = 'Disponível';
            } else {
                statusBadge.className = 'status-badge indisponivel';
                statusBadge.textContent = 'Indisponível';
            }
        }
        
        linhaProduto.setAttribute('data-status', novoStatus ? 'disponivel' : 'indisponivel');
        
        if (novoStatus) {
            buttonElement.className = 'btn-status desativar';
            buttonElement.textContent = 'Desativar';
            buttonElement.onclick = function() { toggleStatus(produtoId, this, true); };
        } else {
            buttonElement.className = 'btn-status ativar';
            buttonElement.textContent = 'Ativar';
            buttonElement.onclick = function() { toggleStatus(produtoId, this, false); };
        }
        
        buttonElement.disabled = false;
    }
}

function fecharConfirmacao() {
    const modal = document.getElementById('modal-confirmacao');
    modal.style.display = 'none';
    reativarBotoesConfirmacao();
}

function getCSRFToken() {
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
    return csrfToken ? csrfToken.value : '';
}

window.onclick = function(event) {
    const modal = document.getElementById('modal-produto');
    const modalConfirmacao = document.getElementById('modal-confirmacao');
    if (event.target === modal) fecharModal();
    if (event.target === modalConfirmacao) fecharConfirmacao();
}
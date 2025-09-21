document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    const categoriaFilter = document.getElementById('categoria-filter');
    const statusFilter = document.getElementById('status-filter');
    const imagemInput = document.getElementById('imagem-input');
    const editorImage = document.getElementById('editor-image');
    const formProduto = document.getElementById('form-produto');
    
    if (searchInput) searchInput.addEventListener('input', filtrarProdutos);
    if (categoriaFilter) categoriaFilter.addEventListener('change', filtrarProdutos);
    if (statusFilter) statusFilter.addEventListener('change', filtrarProdutos);
    
    if (imagemInput) {
        imagemInput.addEventListener('change', function(e) {
            if (e.target.files && e.target.files[0]) {
                abrirEditorImagem(e.target.files[0]);
            }
        });
    }

    if (editorImage) {
        editorImage.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
    }

    if (formProduto) {
        formProduto.addEventListener('submit', function(e) {
            e.preventDefault();
            salvarProduto();
        });
    }

    window.addEventListener('click', function(e) {
        const modalEditor = document.getElementById('modal-editor-imagem');
        if (e.target === modalEditor) {
            fecharEditorImagem();
        }
        
        const modalProduto = document.getElementById('modal-produto');
        const modalConfirmacao = document.getElementById('modal-confirmacao');
        
        if (e.target === modalProduto) fecharModal();
        if (e.target === modalConfirmacao) fecharConfirmacao();
    });
    
    filtrarProdutos();
});

let originalImageFile = null;
let currentRotation = 0;
let currentScale = 1;
let isDragging = false;
let startX, startY;
let offsetX = 0, offsetY = 0;

function abrirEditorImagem(file) {
    originalImageFile = file;
    const modal = document.getElementById('modal-editor-imagem');
    const editorImage = document.getElementById('editor-image');
    const previewImage = document.getElementById('preview-edited');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        editorImage.src = e.target.result;
        previewImage.src = e.target.result;
        
        currentRotation = 0;
        currentScale = 1;
        offsetX = 0;
        offsetY = 0;
        applyTransformations();
        
        modal.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function applyTransformations() {
    const editorImage = document.getElementById('editor-image');
    const previewImage = document.getElementById('preview-edited');
    
    const transform = `rotate(${currentRotation}deg) scale(${currentScale}) translate(${offsetX}px, ${offsetY}px)`;
    
    editorImage.style.transform = transform;
    previewImage.style.transform = transform;
    
    editorImage.style.transformOrigin = 'center';
    previewImage.style.transformOrigin = 'center';
}

function rotateImage() {
    currentRotation = (currentRotation + 90) % 360;
    applyTransformations();
}

function zoomIn() {
    currentScale = Math.min(3, currentScale + 0.1);
    applyTransformations();
}

function zoomOut() {
    currentScale = Math.max(0.5, currentScale - 0.1);
    applyTransformations();
}

function resetEditor() {
    currentRotation = 0;
    currentScale = 1;
    offsetX = 0;
    offsetY = 0;
    applyTransformations();
}

function startDrag(e) {
    if (e.button !== 0) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const editorImage = document.getElementById('editor-image');
    editorImage.style.cursor = 'grabbing';
    e.preventDefault();
}

function doDrag(e) {
    if (!isDragging) return;
    
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    
    offsetX += deltaX;
    offsetY += deltaY;
    
    startX = e.clientX;
    startY = e.clientY;
    
    applyTransformations();
}

function stopDrag() {
    isDragging = false;
    const editorImage = document.getElementById('editor-image');
    editorImage.style.cursor = 'grab';
}

function salvarImagemEditada() {
    const editorImage = document.getElementById('editor-image');
    const previewImg = document.getElementById('preview-img');
    const placeholderText = document.getElementById('placeholder-text');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.onload = function() {
        const originalScale = Math.min(
            outputSize / img.width,
            outputSize / img.height
        );
        
        const finalScale = originalScale * currentScale;
        
        const x = (outputSize - img.width * finalScale) / 2 + (offsetX * finalScale);
        const y = (outputSize - img.height * finalScale) / 2 + (offsetY * finalScale);
        
        ctx.save();
        ctx.translate(outputSize / 2, outputSize / 2);
        ctx.rotate(currentRotation * Math.PI / 180);
        ctx.translate(-outputSize / 2, -outputSize / 2);
        
        ctx.drawImage(img, x, y, img.width * finalScale, img.height * finalScale);
        ctx.restore();
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.9);
        previewImg.src = dataURL;
        previewImg.style.display = 'block';
        placeholderText.style.display = 'none';
        
        canvas.toBlob(function(blob) {
            const editedFile = new File([blob], 'product-image.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now()
            });
            
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(editedFile);
            document.getElementById('imagem-input').files = dataTransfer.files;
        }, 'image/jpeg', 0.9);
        
        fecharEditorImagem();
    };
    
    img.src = editorImage.src;
}

function fecharEditorImagem() {
    const modal = document.getElementById('modal-editor-imagem');
    modal.style.display = 'none';
}

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
        const quantidadeIdeal = linhaProduto.getAttribute('data-ideal-quantity') || '';
        const quantidadeCritica = linhaProduto.getAttribute('data-critical-quantity') || '';
        
        document.getElementById('nome').value = nome;
        document.getElementById('descricao').value = descricao;
        document.getElementById('preco').value = preco;
        document.getElementById('quantidade').value = quantidade;
        document.getElementById('status').value = status;
        document.getElementById('categoria').value = categoria;
        document.getElementById('quantidade_ideal').value = quantidadeIdeal;
        document.getElementById('quantidade_critica').value = quantidadeCritica;
        
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
                document.getElementById('quantidade_ideal').value = produto.ideal_quantity || '';
                document.getElementById('quantidade_critica').value = produto.critical_quantity || '';
                
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
    document.getElementById('quantidade_ideal').value = '';
    document.getElementById('quantidade_critica').value = '';
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
    const modoEdicao = document.getElementById('modo-edicao').value === 'true';
    const produtoId = document.getElementById('produto-id').value;
    
    setButtonLoading(btnSalvar, true);
    const loading = showLoading(modoEdicao ? 'Atualizando produto...' : 'Salvando produto...');
    
    const form = document.getElementById('form-produto');
    const formData = new FormData(form);
    
    const previewImg = document.getElementById('preview-img');
    if (previewImg.src && previewImg.src.startsWith('data:image')) {
        fetch(previewImg.src)
            .then(res => res.blob())
            .then(blob => {
                formData.set('image', blob, 'product-image.jpg');
                enviarFormulario(formData, modoEdicao, produtoId, btnSalvar, loading);
            })
            .catch(error => {
                enviarFormulario(formData, modoEdicao, produtoId, btnSalvar, loading);
            });
    } else {
        enviarFormulario(formData, modoEdicao, produtoId, btnSalvar, loading);
    }
}

function enviarFormulario(formData, modoEdicao, produtoId, btnSalvar, loading) {
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
            showSuccessToast(data.message);
            fecharModal();
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            showErrorToast('Erro: ' + data.message);
        }
    })
    .catch(error => {
        showErrorToast('Erro ao salvar produto: ' + error.message);
    })
    .finally(() => {
        setButtonLoading(btnSalvar, false);
        hideLoading();
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
    
    titulo.textContent = 'Confirmar Exclusão';
    mensagem.textContent = `Tem certeza que deseja excluir o produto "${produtoNome}"? Esta ação não pode ser desfeita.`;
    
    btnConfirmar.onclick = function() {
        setButtonLoading(btnConfirmar, true);
        
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
                showSuccessToast('Produto excluído com sucesso!');
                fecharConfirmacao();
                if (linhaProduto) {
                    linhaProduto.remove();
                    const produtosRestantes = document.querySelectorAll('.linha-produto').length;
                    if (produtosRestantes === 0) {
                        mostrarLinhaVazia();
                    }
                } else {
                    setTimeout(() => {
                        location.reload();
                    }, 1500);
                }
            } else {
                showErrorToast('Erro: ' + data.message);
                setButtonLoading(btnConfirmar, false);
            }
        })
        .catch(error => {
            showErrorToast('Erro ao excluir produto: ' + error.message);
            setButtonLoading(btnConfirmar, false);
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
    
    setButtonLoading(buttonElement, true);
    
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
            showSuccessToast(data.message);
            atualizarInterfaceStatus(produtoId, !currentStatus, buttonElement);
        } else {
            showErrorToast('Erro: ' + data.message);
            buttonElement.textContent = originalText;
            setButtonLoading(buttonElement, false);
        }
    })
    .catch(error => {
        showErrorToast('Erro ao alterar status do produto');
        buttonElement.textContent = originalText;
        setButtonLoading(buttonElement, false);
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
        if (toast.parentNode) {
            removeToast(toast);
        }
    }, 3000);
    
    return toast;
}

function removeToast(toast) {
    toast.style.animation = 'fadeOut 0.5s ease forwards';
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 500);
}

function showSuccessToast(message) {
    return showToast(message, 'success');
}

function showErrorToast(message) {
    return showToast(message, 'error');
}

function showWarningToast(message) {
    return showToast(message, 'warning');
}

function showInfoToast(message) {
    return showToast(message, 'info');
}

function showLoading(message = 'Carregando...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner-full';
        
        if (message) {
            const messageDiv = document.createElement('div');
            messageDiv.style.color = 'white';
            messageDiv.style.marginTop = '15px';
            messageDiv.style.fontFamily = 'Poppins, sans-serif';
            messageDiv.textContent = message;
            overlay.appendChild(spinner);
            overlay.appendChild(messageDiv);
        } else {
            overlay.appendChild(spinner);
        }
        
        document.body.appendChild(overlay);
    }
    
    return overlay;
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('btn-loading');
        button.disabled = true;
    } else {
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

window.onclick = function(event) {
    const modal = document.getElementById('modal-produto');
    const modalConfirmacao = document.getElementById('modal-confirmacao');
    if (event.target === modal) fecharModal();
    if (event.target === modalConfirmacao) fecharConfirmacao();
}
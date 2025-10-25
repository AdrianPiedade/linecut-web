let pendingPlanChange = null;
let originalCompanyImageFile = null;
let currentCompanyRotation = 0;
let currentCompanyScale = 1;
let companyOffsetX = 0, companyOffsetY = 0;
let isCompanyDragging = false;
let companyStartX, companyStartY;
let editedCompanyImageBlob = null;
let isSavingHorario = false;
let companyDataBackup = null;
let isSavingProfile = false;

document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    loadInitialData();

    const editorImageEmpresa = document.getElementById('editor-image-empresa');
    if (editorImageEmpresa) {
        editorImageEmpresa.addEventListener('mousedown', startCompanyDrag);
        document.addEventListener('mousemove', doCompanyDrag);
        document.addEventListener('mouseup', stopCompanyDrag);
    }
});

function initializePage() {
    window.selectedPlan = null;
    window.companyData = {};
}

function backupCompanyData() {
    companyDataBackup = window.companyData ? {...window.companyData} : null;
}

function handleCompanyImageUpload(file) {
    if (!file) return;
    backupCompanyData();
    originalCompanyImageFile = file;
    abrirEditorImagemEmpresa(file);
}

function restoreCompanyData() {
    if (companyDataBackup) {
        window.companyData = companyDataBackup;
        updateCompanyUI();
    }
}

function setupEventListeners() {
    const tituloPerfil = document.getElementById('titulo-perfil');
    const tituloAjuda = document.getElementById('titulo-ajuda');
    const secaoPerfil = document.getElementById('secao-perfil');
    const secaoAjuda = document.getElementById('secao-ajuda');

    tituloPerfil.addEventListener('click', () => {
        switchToSection('perfil', tituloPerfil, tituloAjuda, secaoPerfil, secaoAjuda);
    });
    
    tituloAjuda.addEventListener('click', () => {
        switchToSection('ajuda', tituloAjuda, tituloPerfil, secaoAjuda, secaoPerfil);
    });

    document.addEventListener('click', function(e) {
        const target = e.target;
        const card = target.closest('[data-modal]');
        const closeTrigger = target.closest('[data-modal-close]');

        if (card) {
            openModal(card.getAttribute('data-modal'));
        } else if (closeTrigger) {
            closeModal(closeTrigger.getAttribute('data-modal-close'));
        } else if (target.classList.contains('modal')) {
            closeModal(target);
        }
    });

    document.getElementById('form-perfil')?.addEventListener('submit', function(e) {
        e.preventDefault();
        salvarInformacoes();
    });
    
    document.getElementById('form-horario')?.addEventListener('submit', function(e) {
        e.preventDefault();
        salvarHorario();
    });
}

function abrirEditorImagemEmpresa(file) {
    if (!file) return;
    
    originalCompanyImageFile = file;
    const modal = document.getElementById('modal-editor-imagem-empresa');
    const editorImage = document.getElementById('editor-image-empresa');
    const previewImage = document.getElementById('preview-edited-empresa');
    
    const reader = new FileReader();
    reader.onload = function(e) {
        currentCompanyRotation = 0;
        currentCompanyScale = 1;
        companyOffsetX = 0;
        companyOffsetY = 0;
        
        editorImage.src = e.target.result;
        previewImage.src = e.target.result;
        
        editorImage.style.position = 'relative';
        editorImage.style.left = '0px';
        editorImage.style.top = '0px';
        previewImage.style.position = 'relative';
        previewImage.style.left = '0px';
        previewImage.style.top = '0px';
        
        applyCompanyTransformations();
        openModal('modal-editor-imagem-empresa');
    };
    reader.readAsDataURL(file);
}

function applyCompanyTransformations() {
    const editorImage = document.getElementById('editor-image-empresa');
    const previewImage = document.getElementById('preview-edited-empresa');
    
    const transform = `rotate(${currentCompanyRotation}deg) scale(${currentCompanyScale})`;
    
    editorImage.style.transform = transform;
    previewImage.style.transform = transform;
    
    editorImage.style.transformOrigin = 'center';
    previewImage.style.transformOrigin = 'center';
    
    editorImage.style.position = 'relative';
    editorImage.style.left = companyOffsetX + 'px';
    editorImage.style.top = companyOffsetY + 'px';
    
    previewImage.style.position = 'relative';
    previewImage.style.left = (companyOffsetX * 0.3) + 'px';
    previewImage.style.top = (companyOffsetY * 0.3) + 'px';
}

function rotateCompanyImage() {
    currentCompanyRotation = (currentCompanyRotation + 90) % 360;
    applyCompanyTransformations();
}

function zoomInCompanyImage() {
    currentCompanyScale = Math.min(3, currentCompanyScale + 0.1);
    applyCompanyTransformations();
}

function zoomOutCompanyImage() {
    currentCompanyScale = Math.max(0.5, currentCompanyScale - 0.1);
    applyCompanyTransformations();
}

function resetCompanyImageEditor() {
    currentCompanyRotation = 0;
    currentCompanyScale = 1;
    companyOffsetX = 0;
    companyOffsetY = 0;
    
    const editorImage = document.getElementById('editor-image-empresa');
    const previewImage = document.getElementById('preview-edited-empresa');
    
    editorImage.style.left = '0px';
    editorImage.style.top = '0px';
    previewImage.style.left = '0px';
    previewImage.style.top = '0px';
    
    applyCompanyTransformations();
}

function startCompanyDrag(e) {
    if (e.button !== 0) return;
    
    isCompanyDragging = true;
    companyStartX = e.clientX;
    companyStartY = e.clientY;
    
    const editorImage = document.getElementById('editor-image-empresa');
    editorImage.style.cursor = 'grabbing';
    e.preventDefault();
}

function doCompanyDrag(e) {
    if (!isCompanyDragging) return;
    
    const deltaX = e.clientX - companyStartX;
    const deltaY = e.clientY - companyStartY;
    
    companyOffsetX += deltaX;
    companyOffsetY += deltaY;
    
    companyStartX = e.clientX;
    companyStartY = e.clientY;
    
    const editorImage = document.getElementById('editor-image-empresa');
    const previewImage = document.getElementById('preview-edited-empresa');
    
    editorImage.style.left = companyOffsetX + 'px';
    editorImage.style.top = companyOffsetY + 'px';
    
    previewImage.style.left = (companyOffsetX * 0.3) + 'px';
    previewImage.style.top = (companyOffsetY * 0.3) + 'px';
}

function stopCompanyDrag() {
    isCompanyDragging = false;
    const editorImage = document.getElementById('editor-image-empresa');
    editorImage.style.cursor = 'grab';
}

function salvarImagemEditadaEmpresa() {
    const editorImage = document.getElementById('editor-image-empresa');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.onload = function() {
        const scale = Math.min(
            outputSize / img.width,
            outputSize / img.height
        ) * currentCompanyScale;
        
        const x = (outputSize - img.width * scale) / 2 + (companyOffsetX * scale);
        const y = (outputSize - img.height * scale) / 2 + (companyOffsetY * scale);
        
        ctx.save();
        ctx.translate(outputSize / 2, outputSize / 2);
        ctx.rotate(currentCompanyRotation * Math.PI / 180);
        ctx.translate(-outputSize / 2, -outputSize / 2);
        
        ctx.drawImage(
            img, 
            x, 
            y, 
            img.width * scale, 
            img.height * scale
        );
        ctx.restore();
        
        canvas.toBlob(function(blob) {
            editedCompanyImageBlob = blob;
            
            const previewUrl = URL.createObjectURL(blob);
            document.getElementById('preview-confirmacao').src = previewUrl;
            
            fecharEditorImagemEmpresa();
            abrirConfirmacaoUpload();
        }, 'image/jpeg', 0.9);
    };
    
    img.src = editorImage.src;
}

function fecharEditorImagemEmpresa() {
    const modal = document.getElementById('modal-editor-imagem-empresa');
    if (modal) {
        modal.style.display = 'none';
    }
}

function abrirConfirmacaoUpload() {
    openModal('modal-confirmacao-upload');
}

function fecharConfirmacaoUpload() {
    closeModal('modal-confirmacao-upload');
}

function showLoading(message = 'Carregando...') {
    hideLoading();
    
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay-config';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.7); display: flex; flex-direction: column;
        justify-content: center; align-items: center; z-index: 9999;
        color: white; font-family: 'Poppins', sans-serif;
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
        width: 40px; height: 40px; border: 4px solid #f3f3f3;
        border-top: 4px solid #9C0202; border-radius: 50%;
        animation: spin 1s linear infinite; margin-bottom: 15px;
    `;
    
    const text = document.createElement('div');
    text.textContent = message;
    text.style.fontSize = '16px';
    
    overlay.appendChild(spinner);
    overlay.appendChild(text);
    document.body.appendChild(overlay);
    
    return overlay;
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay-config');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 300);
    }
}

function confirmarUploadImagem() {
    if (!editedCompanyImageBlob) {
        showErrorToast('Nenhuma imagem para salvar');
        return;
    }

    const loadingOverlay = showLoading('Salvando imagem...');
    
    const timeoutId = setTimeout(() => {
        hideLoading();
        showErrorToast('Tempo limite excedido. Tente novamente.');
    }, 15000);
    
    const formData = new FormData();
    formData.append('company_image', editedCompanyImageBlob, 'company-logo.jpg');
    
    fetch('/dashboard/configuracoes/update-image/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(response => {
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            finalizarUploadComSucesso(data.image_url);
        } else {
            throw new Error(data.message || 'Erro ao salvar imagem');
        }
    })
    .catch(error => {
        showErrorToast('Erro: ' + error.message);
    })
    .finally(() => {
        clearTimeout(timeoutId);
        hideLoading();
        editedCompanyImageBlob = null;
    });
}

function finalizarUploadComSucesso(imageUrl) {
    fecharConfirmacaoUpload();
    fecharEditorImagemEmpresa();
    
    showSuccessToast('Imagem do perfil atualizada com sucesso!');
    
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

function switchToSection(targetSection, activeTitle, inactiveTitle, activeSection, inactiveSection) {
    activeTitle.classList.add('titulo-ativo');
    activeTitle.classList.remove('titulo-inativo');
    inactiveTitle.classList.add('titulo-inativo');
    inactiveTitle.classList.remove('titulo-ativo');
    activeSection.style.display = 'block';
    inactiveSection.style.display = 'none';
}

function loadInitialData() {
    loadCompanyData();
}

function loadCompanyData() {
    fetch('/dashboard/configuracoes/get-company-data/', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => {
        if (!response.ok) throw new Error('Erro de rede.');
        return response.json();
    })
    .then(data => {
        if (data.success) {
            window.companyData = data.company_data;
            updateCompanyUI();
        } else {
            showErrorToast('Erro ao carregar dados da empresa');
        }
    })
    .catch(error => {
        showErrorToast('Erro de conexão');
    });
}

function updateCompanyUI() {
    if (!window.companyData) return;
    
    const elementsToUpdate = {
        'nome-lanchonete': window.companyData.nome_lanchonete,
        'categoria-lanchonete': window.companyData.description,
        'tipo-plano': window.companyData.plano ? window.companyData.plano.charAt(0).toUpperCase() + window.companyData.plano.slice(1) : 'Premium',
        'info-nome-fantasia': window.companyData.nome_fantasia,
        'info-razao-social': window.companyData.razao_social,
        'info-cnpj': window.companyData.cnpj,
        'info-nome-lanchonete': window.companyData.nome_lanchonete,
        'info-description': window.companyData.description,
        'info-polo': window.companyData.polo,
        'info-telefone': window.companyData.telefone,
        'info-endereco': window.companyData.endereco,
        'info-numero': window.companyData.numero,
        'info-cep': window.companyData.cep,
        'info-data-cadastro': window.companyData.data_cadastro ? new Date(window.companyData.data_cadastro).toLocaleDateString('pt-BR') : 'Não disponível',
        'info-chave-pix': window.companyData.chave_pix || 'Não configurado',
    };
    
    Object.entries(elementsToUpdate).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || '';
        }
    });

    updateHorarioDisplay();
    updatePlanBadgeIcon(window.companyData.plano || 'premium');
    
    const logoElement = document.getElementById('logo-lanchonete');
    if (logoElement && window.companyData.image_url) {
        const timestamp = new Date().getTime();
        logoElement.src = `${window.companyData.image_url}${window.companyData.image_url.includes('?') ? '&' : '?'}t=${timestamp}`;
        logoElement.onerror = () => {
            logoElement.src = document.body.getAttribute('data-default-image') || '/static/dashboard/images/perfil_default.png';
        };
    }
    
    const formFields = {
        'edit-nome-lanchonete': window.companyData.nome_lanchonete,
        'edit-description': window.companyData.description,
        'edit-telefone': window.companyData.telefone,
        'edit-chave-pix': window.companyData.chave_pix,
    };
    
    Object.entries(formFields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || '';
        }
    });
}

function updateHorarioDisplay() {
    const container = document.getElementById('horario-info-container');
    const horarios = window.companyData.horario_funcionamento;

    if (!horarios || Object.keys(horarios).length === 0) {
        container.innerHTML = `<p style="color: var(--cinza-escuro);">Sua lanchonete ainda não tem um horário de funcionamento configurado. Por favor clique no botão de edição e ajuste os dias e horários.</p>`;
        return;
    }

    let html = '<div class="horario-card-container">';
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
    
    diasSemana.forEach(dia => {
        if (horarios[dia] && horarios[dia].aberto) {
            html += `
                <div class="horario-card">
                    <span class="dia-nome">${dia.charAt(0).toUpperCase() + dia.slice(1)}</span>
                    <span class="dia-horario">${horarios[dia].abertura} - ${horarios[dia].fechamento}</span>
                </div>
            `;
        } else if (horarios[dia] && !horarios[dia].aberto) {
            html += `
                <div class="horario-card">
                    <span class="dia-nome">${dia.charAt(0).toUpperCase() + dia.slice(1)}</span>
                    <span class="dia-horario fechado">Fechado</span>
                </div>
            `;
        }
    });

    html += '</div>';
    container.innerHTML = html;
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalOrId) {
    const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
    if (modal) {
        modal.style.display = 'none';
    }
}

function editarInformacoes() {
    openModal('modal-perfil');
}

function fecharModalPerfil() {
    closeModal('modal-perfil');
}

function editarHorario() {
    const horarios = window.companyData.horario_funcionamento || {};
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

    diasSemana.forEach(dia => {
        const checkbox = document.getElementById(`edit-${dia}`);
        const aberturaInput = document.getElementById(`edit-${dia}-abertura`);
        const fechamentoInput = document.getElementById(`edit-${dia}-fechamento`);
        const timeInputs = document.getElementById(`time-inputs-${dia}`);

        if (horarios[dia] && horarios[dia].aberto) {
            checkbox.checked = true;
            aberturaInput.value = horarios[dia].abertura;
            fechamentoInput.value = horarios[dia].fechamento;
            timeInputs.style.display = 'flex';
        } else {
            checkbox.checked = false;
            aberturaInput.value = '09:00';
            fechamentoInput.value = '18:00';
            timeInputs.style.display = 'none';
        }
    });

    openModal('modal-horario');
}

function fecharModalHorario() {
    closeModal('modal-horario');
}

async function abrirModalPlanos() {
    openModal('modal-planos');
    
    const isTrialExpired = await checkTrialPlanExpired();

    const alertElement = document.getElementById('plano-bloqueado-alert');
    if (alertElement) {
        alertElement.style.display = isTrialExpired ? 'block' : 'none';
    }
    
    const currentPlan = window.companyData?.plano || 'premium';
    document.querySelectorAll('.plano-option').forEach(option => {
        option.classList.remove('plano-selecionado');
        const badge = option.querySelector('.plano-atual-badge');
        if (badge) badge.remove();
        
        if (option.dataset.plano === 'trial' && isTrialExpired) {
            option.classList.add('plano-bloqueado');
            option.style.opacity = '0.6';
            option.style.cursor = 'not-allowed';
            option.onclick = null;
            
            const bloqueioMsg = option.querySelector('.plano-bloqueio-msg') || document.createElement('div');
            bloqueioMsg.className = 'plano-bloqueio-msg';
            bloqueioMsg.innerHTML = '<span style="color: var(--vermelho); font-size: 12px;">⚠️ Plano indisponível</span>';
            
            if (!option.querySelector('.plano-bloqueio-msg')) {
                option.appendChild(bloqueioMsg);
            }
        } else {
            option.classList.remove('plano-bloqueado');
            option.style.opacity = '1';
            option.style.cursor = 'pointer';
            option.onclick = function() { selectPlan(this); };
            
            const bloqueioMsg = option.querySelector('.plano-bloqueio-msg');
            if (bloqueioMsg) bloqueioMsg.remove();
        }
        
        if (option.dataset.plano === currentPlan) {
            option.classList.add('plano-selecionado');
            const h3 = option.querySelector('h3');
            if (h3 && !h3.querySelector('.plano-atual-badge')) {
                h3.innerHTML += ' <span class="plano-atual-badge">(Atual)</span>';
            }
        }
    });
    
    window.selectedPlan = null;
}

function fecharModalPlanos() {
    closeModal('modal-planos');
}

function selectPlan(planoOption) {
    if (planoOption.classList.contains('plano-bloqueado')) {
        showErrorToast('Este plano não está disponível para sua empresa');
        return;
    }
    
    document.querySelectorAll('.plano-option').forEach(option => {
        option.classList.remove('plano-selecionado');
    });
    
    planoOption.classList.add('plano-selecionado');
    window.selectedPlan = planoOption.dataset.plano;
}

function confirmarMudancaPlano() {
    if (!window.selectedPlan) {
        showErrorToast('Selecione um plano para continuar');
        return;
    }
    
    if (window.selectedPlan === 'trial' && window.trialPlanExpired) {
        showErrorToast('O período trial não está mais disponível para sua empresa');
        return;
    }
    
    const currentPlan = window.companyData?.plano || 'basic';
    if (window.selectedPlan === currentPlan) {
        showWarningToast('Este já é o seu plano atual');
        return;
    }
    
    const planMessages = {
        'trial': '⚠️ Atenção: O plano Trial é limitado a 30 dias. Após este período, seu acesso será suspenso até a escolha de um novo plano.',
        'basic': 'Você será cobrado 7% sobre o valor total de cada venda. Não há mensalidade fixa.',
        'premium': 'Você será cobrado 10% sobre o valor total de cada venda. Inclui dashboard analítico personalizado.'
    };
    
    const planTitles = {
        'trial': 'Trial',
        'basic': 'Basic', 
        'premium': 'Premium'
    };
    
    const message = `Tem certeza que deseja mudar para o plano ${planTitles[window.selectedPlan]}?`;
    const details = planMessages[window.selectedPlan];
    
    pendingPlanChange = window.selectedPlan;
    
    abrirModalConfirmacao(message, details);
}

function updatePlanBadgeIcon(planType) {
    const badgeIcon = document.querySelector('.icone-plano');
    if (!badgeIcon) return;
    
    const icons = {
        'trial': '🧩',
        'basic': '💼', 
        'premium': '👑'
    };
    
    badgeIcon.textContent = icons[planType] || '👑';
}

function updateCompanyPlan(newPlan) {
    const csrfToken = getCSRFToken();
    
    if (!csrfToken) {
        showErrorToast('Erro de segurança. Por favor, recarregue a página.');
        return;
    }
    
    fetch('/dashboard/configuracoes/update-plan/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ new_plan: newPlan })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showSuccessToast(data.message);
            if (window.companyData) {
                window.companyData.plano = newPlan;
            }
            updateCompanyUI();
            fecharModalPlanos();
        } else {
            showErrorToast(data.message);
        }
    })
    .catch(error => {
        showErrorToast('Erro ao atualizar plano. Tente novamente.');
    });
}

function abrirModalFAQ() { openModal('modal-faq'); }
function fecharModalFAQ() { closeModal('modal-faq'); }
function abrirModalSAC() { openModal('modal-sac'); }
function fecharModalSAC() { closeModal('modal-sac'); }
function abrirModalContato() { openModal('modal-contato'); }
function fecharModalContato() { closeModal('modal-contato'); }
function abrirModalTermos() { openModal('modal-termos'); }
function fecharModalTermos() { closeModal('modal-termos'); }
function abrirModalPolitica() { openModal('modal-politica'); }
function fecharModalPolitica() { closeModal('modal-politica'); }

function abrirModalConfirmacao(mensagem, detalhes = null) {
    document.getElementById('confirmacao-mensagem').textContent = mensagem;
    
    const detalhesElement = document.getElementById('confirmacao-detalhes');
    const detalhesTexto = document.getElementById('confirmacao-detalhes-texto');
    
    if (detalhes) {
        detalhesTexto.textContent = detalhes;
        detalhesElement.style.display = 'block';
    } else {
        detalhesElement.style.display = 'none';
    }
    
    openModal('modal-confirmacao');
}

function fecharModalConfirmacao() {
    closeModal('modal-confirmacao');
    pendingPlanChange = null;
}

function confirmarMudancaPlanoModal() {
    if (pendingPlanChange) {
        updateCompanyPlan(pendingPlanChange);
    }
    fecharModalConfirmacao();
}

document.getElementById('form-perfil')?.addEventListener('submit', function(e) {
    e.preventDefault();
    salvarInformacoes();
});

function salvarInformacoes() {
    if (isSavingProfile) return;
    isSavingProfile = true;

    const formData = new FormData();
    const fields = ['nome_lanchonete', 'description', 'telefone', 'chave_pix'];

    fields.forEach(field => {
        const elementId = `edit-${field.replace(/_/g, '-')}`;
        const element = document.getElementById(elementId);
        if (element) {
            formData.append(field, element.value);
        }
    });

    const loadingOverlay = showLoading('Salvando informações...'); 

    fetch('/dashboard/configuracoes/update-profile/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessToast(data.message || 'Perfil atualizado com sucesso!'); 
            loadCompanyData(); 
            closeModal('modal-perfil');
        } else {
            showErrorToast(data.message || 'Erro ao salvar informações'); 
        }
    })
    .catch(error => showErrorToast('Erro de comunicação ao salvar informações: ' + error.message))
    .finally(() => {
        hideLoading();
        isSavingProfile = false;
    });
}

function salvarHorario() {
    if (isSavingHorario) return;
    isSavingHorario = true; 

    const horarioData = {};
    const diasSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

    diasSemana.forEach(dia => {
        const checkbox = document.getElementById(`edit-${dia}`);
        horarioData[dia] = {
            aberto: checkbox.checked,
            abertura: document.getElementById(`edit-${dia}-abertura`).value,
            fechamento: document.getElementById(`edit-${dia}-fechamento`).value
        };
    });

    fetch('/dashboard/configuracoes/update-horario/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ horario_funcionamento: horarioData })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessToast('Horário atualizado com sucesso!');
            window.companyData.horario_funcionamento = horarioData;
            updateHorarioDisplay();
            closeModal('modal-horario');
        } else {
            showErrorToast(data.message || 'Erro ao salvar horário.');
        }
    })
    .catch(error => showErrorToast('Ocorreu um erro de comunicação.'))
    .finally(() => { isSavingHorario = false; });
}


function enviarSAC() {
    showSuccessToast('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    fecharModalSAC();
}

function enviarContato() {
    showSuccessToast('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    fecharModalContato();
}

function toggleTimeInputs(dia) {
    const checkbox = document.getElementById(`edit-${dia}`);
    const timeInputs = document.getElementById(`time-inputs-${dia}`);
    timeInputs.style.display = checkbox.checked ? 'flex' : 'none';
}

async function checkTrialPlanExpired() {
    try {
        const response = await fetch('/dashboard/configuracoes/check-trial-plan/', {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                window.trialPlanExpired = data.trial_plan_expired;
                return data.trial_plan_expired;
            }
        }
        return false;
    } catch (error) {
        return false;
    }
}

function getCSRFToken() {
    const cookieValue = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1];
    if (cookieValue) return cookieValue;
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken) return metaToken;
    return document.querySelector('[name=csrfmiddlewaretoken]')?.value || '';
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    toast.appendChild(messageSpan);
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'toast-close';
    closeButton.onclick = () => toast.remove();
    toast.appendChild(closeButton);
    
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}


function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showSuccessToast(message) { showToast(message, 'success'); }
function showErrorToast(message) { showToast(message, 'error'); }
function showWarningToast(message) { showToast(message, 'warning'); }
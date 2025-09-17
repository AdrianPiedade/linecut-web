document.addEventListener('DOMContentLoaded', function() {
    // Inicialização
    initializePage();
    
    // Configurar eventos
    setupEventListeners();
    
    // Carregar dados iniciais
    loadInitialData();
});

function initializePage() {
    // Inicializar variáveis globais
    window.selectedPlan = null;
    window.companyData = {};
}

function setupEventListeners() {
    // Alternar entre Perfil e Ajuda
    const tituloPerfil = document.getElementById('titulo-perfil');
    const tituloAjuda = document.getElementById('titulo-ajuda');
    const secaoPerfil = document.getElementById('secao-perfil');
    const secaoAjuda = document.getElementById('secao-ajuda');
    
    tituloPerfil.addEventListener('click', function() {
        switchToSection('perfil', tituloPerfil, tituloAjuda, secaoPerfil, secaoAjuda);
    });
    
    tituloAjuda.addEventListener('click', function() {
        switchToSection('ajuda', tituloAjuda, tituloPerfil, secaoAjuda, secaoPerfil);
    });
    
    // Fechar modais ao clicar fora
    window.addEventListener('click', function(e) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
    
    // Eventos de seleção de plano
    document.addEventListener('click', function(e) {
        const planoOption = e.target.closest('.plano-option');
        if (planoOption) {
            selectPlan(planoOption);
        }
    });
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
    // Carregar dados da empresa
    loadCompanyData();
}

// ========== FUNÇÕES DA EMPRESA ==========
function loadCompanyData() {
    fetch('/dashboard/configuracoes/get-company-data/', {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Erro na resposta do servidor');
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
        console.error('Erro ao carregar dados da empresa:', error);
        showErrorToast('Erro de conexão');
    });
}

function updateCompanyUI() {
    if (!window.companyData) return;
    
    // Atualizar informações básicas
    const elementsToUpdate = {
        'nome-fantasia': window.companyData.nome_fantasia,
        'categoria-lanchonete': window.companyData.descricao,
        'tipo-plano': window.companyData.plano ? window.companyData.plano.charAt(0).toUpperCase() + window.companyData.plano.slice(1) : 'Premium',
        'info-nome-fantasia': window.companyData.nome_fantasia,
        'info-razao-social': window.companyData.razao_social,
        'info-cnpj': window.companyData.cnpj,
        'info-descricao': window.companyData.descricao,
        'info-polo': window.companyData.polo,
        'info-telefone': window.companyData.telefone,
        'info-email': window.companyData.email,
        'info-endereco': window.companyData.endereco,
        'info-numero': window.companyData.numero,
        'info-cep': window.companyData.cep
    };
    
    Object.entries(elementsToUpdate).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) {
            element.textContent = value;
        }
    });
    
    // Atualizar imagem
    const logoElement = document.getElementById('logo-lanchonete');
    if (logoElement && window.companyData.image_url) {
        logoElement.src = window.companyData.image_url;
    }
    
    // Preencher formulário de edição
    const formFields = {
        'edit-nome-fantasia': window.companyData.nome_fantasia,
        'edit-razao-social': window.companyData.razao_social,
        'edit-cnpj': window.companyData.cnpj,
        'edit-descricao': window.companyData.descricao,
        'edit-polo': window.companyData.polo,
        'edit-telefone': window.companyData.telefone,
        'edit-email': window.companyData.email,
        'edit-endereco': window.companyData.endereco,
        'edit-numero': window.companyData.numero,
        'edit-cep': window.companyData.cep
    };
    
    Object.entries(formFields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) {
            element.value = value;
        }
    });
}

// ========== MODAIS ==========
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modalId) {
    const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (modal) {
        modal.style.display = 'none';
    }
}

// Modal Perfil (agora apenas para informações da conta)
function editarInformacoes() {
    openModal('modal-perfil');
}

function fecharModalPerfil() {
    closeModal('modal-perfil');
}

// Modal Horário
function editarHorario() {
    openModal('modal-horario');
}

function fecharModalHorario() {
    closeModal('modal-horario');
}

// Modal Planos
function abrirModalPlanos() {
    openModal('modal-planos');
    
    // Destacar plano atual
    const currentPlan = window.companyData?.plano || 'premium';
    document.querySelectorAll('.plano-option').forEach(option => {
        option.classList.remove('plano-selecionado');
        const badge = option.querySelector('.plano-atual-badge');
        if (badge) badge.remove();
        
        if (option.dataset.plano === currentPlan) {
            option.classList.add('plano-selecionado');
            const h3 = option.querySelector('h3');
            if (h3) {
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
    
    const currentPlan = window.companyData?.plano || 'trial';
    if (window.selectedPlan === currentPlan) {
        showWarningToast('Este já é o seu plano atual');
        return;
    }
    
    const planMessages = {
        'trial': '⚠️ Atenção: O plano Trial é limitado a 30 dias. Após este período, seu acesso será suspenso até a escolha de um novo plano.',
        'basic': 'Você será cobrado 7% sobre o valor total de cada venda. Não há mensalidade fixa.',
        'premium': 'Você será cobrado 10% sobre o valor total de cada venda. Inclui dashboard analítico personalizado.'
    };
    
    const message = planMessages[window.selectedPlan] || 'Confirmar mudança de plano?';
    
    if (confirm(`${message}\n\nTem certeza que deseja mudar para o plano ${window.selectedPlan.toUpperCase()}?`)) {
        updateCompanyPlan(window.selectedPlan);
    }
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
        console.error('Erro detalhado:', error);
        showErrorToast('Erro ao atualizar plano. Tente novamente.');
    });
}

function loadCompanyData() {
    fetch('/dashboard/configuracoes/get-company-data/', {
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Erro na resposta do servidor');
        return response.json();
    })
    .then(data => {
        if (data.success) {
            window.companyData = data.company_data;
            updateCompanyUI();
        } else {
            console.error('Erro ao carregar dados:', data.message);
            // Usar dados padrão como fallback
            window.companyData = {
                nome_fantasia: 'Minha Empresa',
                descricao: 'Descrição da empresa',
                plano: 'trial'  // Padrão agora é trial
            };
            updateCompanyUI();
        }
    })
    .catch(error => {
        console.error('Erro ao carregar dados da empresa:', error);
        // Usar dados padrão como fallback
        window.companyData = {
            nome_fantasia: 'Minha Empresa',
            descricao: 'Descrição da empresa',
            plano: 'trial'  // Padrão agora é trial
        };
        updateCompanyUI();
    });
}

// Modal FAQ
function abrirModalFAQ() {
    openModal('modal-faq');
}

function fecharModalFAQ() {
    closeModal('modal-faq');
}

// Modal SAC
function abrirModalSAC() {
    openModal('modal-sac');
}

function fecharModalSAC() {
    closeModal('modal-sac');
}

// Modal Contato
function abrirModalContato() {
    openModal('modal-contato');
}

function fecharModalContato() {
    closeModal('modal-contato');
}

// Modal Termos
function abrirModalTermos() {
    openModal('modal-termos');
}

function fecharModalTermos() {
    closeModal('modal-termos');
}

// Modal Política
function abrirModalPolitica() {
    openModal('modal-politica');
}

function fecharModalPolitica() {
    closeModal('modal-politica');
}

// ========== FORMULÁRIOS ==========
// Formulário de Perfil (Informações da Conta)
document.getElementById('form-perfil')?.addEventListener('submit', function(e) {
    e.preventDefault();
    salvarInformacoes();
});

function salvarInformacoes() {
    const formData = new FormData();
    
    // Adicionar campos do formulário
    const fields = [
        'nome_fantasia', 'razao_social', 'cnpj', 'descricao', 
        'polo', 'telefone', 'email', 'endereco', 'numero', 'cep'
    ];
    
    fields.forEach(field => {
        const value = document.getElementById(`edit-${field.replace('_', '-')}`)?.value;
        if (value) formData.append(field, value);
    });
    
    // Adicionar imagem se houver
    const imageFile = document.getElementById('edit-company-image')?.files[0];
    if (imageFile) {
        formData.append('company_image', imageFile);
    }
    
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
            showSuccessToast(data.message);
            loadCompanyData(); // Recarregar dados para atualizar a UI
            fecharModalPerfil();
        } else {
            showErrorToast(data.message);
        }
    })
    .catch(error => {
        showErrorToast('Erro ao salvar informações');
        console.error('Erro:', error);
    });
}

// Formulário de Horário
document.getElementById('form-horario')?.addEventListener('submit', function(e) {
    e.preventDefault();
    salvarHorario();
});

function salvarHorario() {
    const diasSelecionados = [];
    document.querySelectorAll('#form-horario input[name="dias[]"]:checked').forEach(checkbox => {
        diasSelecionados.push(checkbox.value);
    });
    
    const formData = {
        dias: diasSelecionados,
        abertura: document.getElementById('edit-abertura').value,
        fechamento: document.getElementById('edit-fechamento').value
    };
    
    // Simulação de salvamento
    console.log('Salvando horário:', formData);
    
    // Atualizar a interface
    document.querySelectorAll('input[name="dias"]').forEach(checkbox => {
        checkbox.checked = formData.dias.includes(checkbox.value);
    });
    
    document.getElementById('abertura').value = formData.abertura;
    document.getElementById('fechamento').value = formData.fechamento;
    
    showSuccessToast('Horário de funcionamento atualizado com sucesso!');
    fecharModalHorario();
}

// Formulário SAC
function enviarSAC() {
    const formData = {
        nome: document.getElementById('sac-nome').value,
        email: document.getElementById('sac-email').value,
        assunto: document.getElementById('sac-assunto').value,
        mensagem: document.getElementById('sac-mensagem').value
    };
    
    // Simulação de envio
    console.log('Enviando SAC:', formData);
    
    showSuccessToast('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    fecharModalSAC();
}

// Formulário Contato
function enviarContato() {
    const formData = {
        nome: document.getElementById('contato-nome').value,
        email: document.getElementById('contato-email').value,
        empresa: document.getElementById('contato-empresa').value,
        assunto: document.getElementById('contato-assunto').value,
        mensagem: document.getElementById('contato-mensagem').value
    };
    
    // Simulação de envio
    console.log('Enviando contato:', formData);
    
    showSuccessToast('Mensagem enviada com sucesso! Entraremos em contato em breve.');
    fecharModalContato();
}

// ========== UTILITÁRIOS ==========
function getCSRFToken() {
    // Tentar obter do cookie
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
    
    if (cookieValue) {
        return cookieValue;
    }
    
    // Tentar obter do meta tag
    const metaToken = document.querySelector('meta[name="csrf-token"]')?.content;
    if (metaToken) {
        return metaToken;
    }
    
    // Tentar obter do input hidden
    const inputToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
    if (inputToken) {
        return inputToken;
    }
    
    console.error('CSRF token não encontrado');
    return '';
}

// Toast notifications
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
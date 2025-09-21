document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('cadastroForm');
    const loadingOverlay = document.getElementById('loading-overlay');
    const btnCadastrar = document.getElementById('btn-cadastrar');
    
    if (form && btnCadastrar) {
        btnCadastrar.addEventListener('click', function(e) {
            e.preventDefault();
            submeterFormulario();
        });
    }
    
    if (form) {
        form.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submeterFormulario();
            }
        });
    }
    
    function submeterFormulario() {
        if (validarFormularioCompleto()) {
            const termosCheck = document.getElementById('termos_condicoes');
            const politicaCheck = document.getElementById('politica_privacidade');
            
            if (!termosCheck.checked || !politicaCheck.checked) {
                if (!termosCheck.checked) {
                    mostrarErroCheckbox(termosCheck, 'Você deve aceitar os Termos e Condições');
                }
                if (!politicaCheck.checked) {
                    mostrarErroCheckbox(politicaCheck, 'Você deve aceitar a Política de Privacidade');
                }
                
                scrollParaPrimeiroErro();
                return;
            }
            
            loadingOverlay.style.display = 'flex';
            btnCadastrar.disabled = true;
            
            const formData = new FormData(form);
            
            formData.set('termos_condicoes', true);
            formData.set('politica_privacidade', true);
            
            fetch('/cadastro/', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCSRFToken(),
                }
            })
            .then(response => {

                if (response.redirected) {
                    window.location.href = response.url;
                    return null;
                }
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    return response.json();
                } else {
                    return response.text().then(text => {
                        throw new Error('Resposta do servidor não é JSON');
                    });
                }
            })
            .then(data => {
                loadingOverlay.style.display = 'none';
                btnCadastrar.disabled = false;
                
                if (data) {
                    
                    if (data.success) {
                        notificacoes.sucesso('Cadastro realizado com sucesso! Redirecionando...');
                        setTimeout(() => {
                            window.location.href = data.redirect_url || '/';
                        }, 2000);
                    } else {
                        if (data.errors) {
                            mostrarErrosFormulario(data.errors);
                            notificacoes.erro('Por favor, corrija os erros no formulário');
                        } else {
                            notificacoes.erro(data.message || 'Erro ao processar cadastro');
                        }
                    }
                }
            })
            .catch(error => {
                loadingOverlay.style.display = 'none';
                btnCadastrar.disabled = false;
                notificacoes.erro('Erro de conexão. Tente novamente. ' + error.message);
            });
        } else {
            scrollParaPrimeiroErro();
        }
    }
    
    function getCSRFToken() {
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        return csrfToken ? csrfToken.value : '';
    }
    
    function validarFormularioCompleto() {
        limparTodosErros();
        
        const ordemValidacao = [
            'cnpj', 'nome_fantasia', 'razao_social', 'telefone', 'email',
            'plano', 'cep', 'numero', 'endereco', 'polo', 'senha',
            'termos_condicoes', 'politica_privacidade'
        ];
        
        for (const campoNome of ordemValidacao) {
            const erro = validarCampo(campoNome);
            if (erro) {
                mostrarErroCampo(erro.campo, erro.mensagem);
                return false;
            }
        }
        
        return true;
    }
    
    function validarCampo(campoNome) {
        switch (campoNome) {
            case 'cnpj':
                return validarCNPJ();
            case 'nome_fantasia':
                return validarCampoObrigatorio('nome_fantasia', 'Nome fantasia');
            case 'razao_social':
                return validarCampoObrigatorio('razao_social', 'Razão social');
            case 'telefone':
                return validarTelefone();
            case 'email':
                return validarEmail();
            case 'plano':
                return validarCampoObrigatorio('plano', 'Plano');
            case 'cep':
                return validarCEPSubmit();
            case 'numero':
                return validarCampoObrigatorio('numero', 'Número');
            case 'endereco':
                return validarCampoObrigatorio('endereco', 'Endereço');
            case 'polo':
                return validarCampoObrigatorio('polo', 'Polo');
            case 'senha':
                return validarSenhaSubmit();
            case 'termos_condicoes':
                return validarCheckbox('termos_condicoes', 'Termos e Condições');
            case 'politica_privacidade':
                return validarCheckbox('politica_privacidade', 'Política de Privacidade');
            default:
                return null;
        }
    }
    
    function validarCNPJ() {
        const cnpjInput = document.getElementById('cnpj');
        const cnpj = cnpjInput.value.replace(/\D/g, '');
        
        if (!cnpj.trim()) {
            return { campo: cnpjInput, mensagem: 'CNPJ é obrigatório' };
        }
        
        if (cnpj.length !== 14) {
            return { campo: cnpjInput, mensagem: 'CNPJ deve ter 14 dígitos' };
        }
        
        if (/^(\d)\1+$/.test(cnpj)) {
            return { campo: cnpjInput, mensagem: 'CNPJ inválido' };
        }
        
        return null;
    }
    
    function validarTelefone() {
        const telefoneInput = document.getElementById('telefone');
        const telefone = telefoneInput.value.replace(/\D/g, '');
        
        if (!telefone.trim()) {
            return { campo: telefoneInput, mensagem: 'Telefone é obrigatório' };
        }
        
        if (telefone.length < 10 || telefone.length > 11) {
            return { campo: telefoneInput, mensagem: 'Telefone deve ter 10 ou 11 dígitos' };
        }
        
        return null;
    }
    
    function validarEmail() {
        const emailInput = document.getElementById('email');
        const email = emailInput.value.trim();
        
        if (!email) {
            return { campo: emailInput, mensagem: 'Email é obrigatório' };
        }
        
        if (!validarEmailFormat(email)) {
            return { campo: emailInput, mensagem: 'Email inválido' };
        }
        
        return null;
    }
    
    function validarEmailFormat(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    
    function validarCEPSubmit() {
        const cepInput = document.getElementById('cep');
        const cep = cepInput.value.replace(/\D/g, '');
        
        if (!cep.trim()) {
            return { campo: cepInput, mensagem: 'CEP é obrigatório' };
        }
        
        if (cep.length !== 8) {
            return { campo: cepInput, mensagem: 'CEP deve ter 8 dígitos' };
        }
        
        if (/^(\d)\1+$/.test(cep)) {
            return { campo: cepInput, mensagem: 'CEP inválido' };
        }
        
        return null;
    }
    
    function validarSenhaSubmit() {
        const senhaInput = document.getElementById('senha');
        const senha = senhaInput.value;
        
        if (!senha.trim()) {
            return { campo: senhaInput, mensagem: 'Senha é obrigatória' };
        }
        
        const resultadoValidacao = validarSenha(senha);
        if (!resultadoValidacao.valida) {
            return { campo: senhaInput, mensagem: 'Senha não atende aos requisitos' };
        }
        
        return null;
    }
    
    function validarSenha(senha) {
        const validacoes = {
            tamanho: senha.length >= 10,
            maiuscula: /[A-Z]/.test(senha),
            minuscula: /[a-z]/.test(senha),
            numero: /[0-9]/.test(senha),
            especial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)
        };
        
        const valida = validacoes.tamanho && 
                      validacoes.maiuscula && 
                      validacoes.minuscula && 
                      validacoes.numero && 
                      validacoes.especial;
        
        return { valida, validacoes };
    }
    
    function validarCampoObrigatorio(campoId, nomeCampo) {
        const campo = document.getElementById(campoId);
        if (!campo.value.trim()) {
            return { campo: campo, mensagem: `${nomeCampo} é obrigatório` };
        }
        return null;
    }
    
    function validarCheckbox(checkboxId, nomeCheckbox) {
        const checkbox = document.getElementById(checkboxId);
        if (!checkbox.checked) {
            return { campo: checkbox, mensagem: `Você deve aceitar ${nomeCheckbox}` };
        }
        return null;
    }
    
    function scrollParaPrimeiroErro() {
        const primeiroErro = document.querySelector('.error');
        if (primeiroErro) {
            primeiroErro.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
        
            const campoInput = primeiroErro.querySelector('input:not([type="checkbox"]), select, textarea');
            if (campoInput) {
                setTimeout(() => {
                    campoInput.focus();
                }, 500);
            }
        }
    }
    
    function mostrarErrosFormulario(erros) {
        limparTodosErros();
        
        Object.keys(erros).forEach(campoNome => {
            const campo = document.querySelector(`[name="${campoNome}"]`);
            if (campo) {
                const mensagem = Array.isArray(erros[campoNome]) 
                    ? erros[campoNome].map(e => e.message).join(', ')
                    : String(erros[campoNome]);
                
                mostrarErroCampo(campo, mensagem);
            }
        });
        
        scrollParaPrimeiroErro();
    }
    
    function mostrarErroCampo(campo, mensagem) {
        const formGroup = campo.closest('.form-group') || campo.closest('.termo-check');
        if (formGroup) {
            formGroup.classList.add('error');
            
            let errorDiv = formGroup.querySelector('.field-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                
                if (campo.type === 'checkbox') {
                    formGroup.appendChild(errorDiv);
                } else {
                    campo.parentNode.insertBefore(errorDiv, campo.nextSibling);
                }
            }
            
            errorDiv.textContent = mensagem;
            errorDiv.style.display = 'block';
        }
    }
    
    function mostrarErroCheckbox(checkbox, mensagem) {
        const formGroup = checkbox.closest('.termo-check');
        if (formGroup) {
            formGroup.classList.add('error');
            
            let errorDiv = formGroup.querySelector('.field-error');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'field-error';
                formGroup.appendChild(errorDiv);
            }
            
            errorDiv.textContent = mensagem;
            errorDiv.style.display = 'block';
        }
    }
    
    function limparErroCampo(campo) {
        const formGroup = campo.closest('.form-group') || campo.closest('.termo-check');
        if (formGroup) {
            formGroup.classList.remove('error');
            const errorDiv = formGroup.querySelector('.field-error');
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }
    }
    
    function limparTodosErros() {
        const errors = document.querySelectorAll('.field-error');
        errors.forEach(error => error.style.display = 'none');
        
        const formGroups = document.querySelectorAll('.form-group, .termo-check');
        formGroups.forEach(group => group.classList.remove('error'));
    }
    
    const campos = form.querySelectorAll('input, select, textarea');
    campos.forEach(campo => {
        campo.addEventListener('input', function() {
            if (this.value.trim()) {
                limparErroCampo(this);
            }
        });
        
        campo.addEventListener('change', function() {
            limparErroCampo(this);
        });
    });
    
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            limparErroCampo(this);
        });
    });
});

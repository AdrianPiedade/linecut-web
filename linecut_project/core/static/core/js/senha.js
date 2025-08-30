document.addEventListener('DOMContentLoaded', function() {
    const senhaInput = document.getElementById('senha');
    const toggleSenhaBtn = document.getElementById('toggleSenha');
    const validacaoSenha = document.getElementById('senha-validacao');
    
    if (senhaInput && toggleSenhaBtn) {

        toggleSenhaBtn.addEventListener('click', function() {
            const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
            senhaInput.setAttribute('type', type);
            
            const icon = this.querySelector('i');
            if (type === 'text') {
                icon.classList.remove('bi-eye');
                icon.classList.add('bi-eye-slash');
            } else {
                icon.classList.remove('bi-eye-slash');
                icon.classList.add('bi-eye');
            }
        });
        
        senhaInput.addEventListener('focus', function() {
            validacaoSenha.style.display = 'block';
        });
        
        senhaInput.addEventListener('blur', function() {
            if (this.value === '' || !validarSenha(this.value).valida) {
                validacaoSenha.style.display = 'block';
            } else {
                validacaoSenha.style.display = 'none';
            }
        });
        
        senhaInput.addEventListener('input', function() {
            validarSenhaEmTempoReal(this.value);
        });
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
        
        return {
            valida,
            validacoes
        };
    }
    
    function validarSenhaEmTempoReal(senha) {
        const resultado = validarSenha(senha);
        
        atualizarRequisito('tamanho', resultado.validacoes.tamanho);
        atualizarRequisito('maiuscula-minuscula', resultado.validacoes.maiuscula && resultado.validacoes.minuscula);
        atualizarRequisito('numero', resultado.validacoes.numero);
        atualizarRequisito('especial', resultado.validacoes.especial);
        
        if (senha.length > 0) {
            if (resultado.valida) {
                senhaInput.style.borderColor = '#28a745';
            } else {
                senhaInput.style.borderColor = '#dc3545';
            }
        } else {
            senhaInput.style.borderColor = '#D1D1D1';
        }
    }
    
    function atualizarRequisito(id, isValid) {
        const elemento = document.getElementById(`req-${id}`);
        if (elemento) {
            const icon = elemento.querySelector('i');
            if (isValid) {
                icon.classList.remove('bi-x-circle');
                icon.classList.add('bi-check-circle');
                icon.style.color = '#28a745';
                elemento.style.color = '#28a745';
            } else {
                icon.classList.remove('bi-check-circle');
                icon.classList.add('bi-x-circle');
                icon.style.color = '#dc3545';
                elemento.style.color = '#dc3545';
            }
        }
    }
    
    const form = document.getElementById('cadastroForm');
    if (form) {
        form.addEventListener('submit', function(event) {
            const senha = document.getElementById('senha').value;
            const resultado = validarSenha(senha);
            
            if (!resultado.valida) {
                event.preventDefault();
                alert('Por favor, corrija os requisitos da senha antes de enviar o formulário.');
                senhaInput.focus();
                validacaoSenha.style.display = 'block';
            }
        });
    }
});
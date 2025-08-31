document.addEventListener('DOMContentLoaded', function() {
    const linkTermos = document.getElementById('link-termos');
    const linkPolitica = document.getElementById('link-politica');
    const modalTermos = document.getElementById('modal-termos');
    const modalPolitica = document.getElementById('modal-politica');
    const btnConcordarTermos = document.getElementById('btn-concordar-termos');
    const btnConcordarPolitica = document.getElementById('btn-concordar-politica');
    const checkboxTermos = document.getElementById('termos_condicoes');
    const checkboxPolitica = document.getElementById('politica_privacidade');
    const btnCadastrar = document.getElementById('btn-cadastrar');
    const termoInstruction = document.getElementById('termo-instruction');
    
    linkTermos.addEventListener('click', function(e) {
        e.preventDefault();
        modalTermos.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
    
    linkPolitica.addEventListener('click', function(e) {
        e.preventDefault();
        modalPolitica.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });
    
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.getAttribute('data-modal');
            document.getElementById(`modal-${modal}`).style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    });
    
    function verificarScroll(modalId, btnId, indicatorId) {
        const modalContent = document.getElementById(modalId);
        const btn = document.getElementById(btnId);
        const indicator = document.getElementById(indicatorId);
        
        modalContent.addEventListener('scroll', function() {
            const scrollPercentage = (this.scrollTop + this.clientHeight) / this.scrollHeight;
            
            if (scrollPercentage > 0.95) { // 95% scrolled
                btn.disabled = false;
                indicator.classList.add('scrolled');
                indicator.innerHTML = '<i class="bi bi-check-circle"></i><span>Documento lido completamente</span>';
            } else {
                btn.disabled = true;
                indicator.classList.remove('scrolled');
                indicator.innerHTML = '<i class="bi bi-arrow-down"></i><span>Role até o final para aceitar</span>';
            }
        });
    }
    
    verificarScroll('termos-content', 'btn-concordar-termos', 'indicator-termos');
    verificarScroll('politica-content', 'btn-concordar-politica', 'indicator-politica');
    
    btnConcordarTermos.addEventListener('click', function() {
        checkboxTermos.checked = true;
        checkboxTermos.disabled = false;
        modalTermos.style.display = 'none';
        document.body.style.overflow = 'auto';
        verificarEstadoBotoes();
    });
    
    btnConcordarPolitica.addEventListener('click', function() {
        checkboxPolitica.checked = true;
        checkboxPolitica.disabled = false;
        modalPolitica.style.display = 'none';
        document.body.style.overflow = 'auto';
        verificarEstadoBotoes();
    });
    
    function verificarEstadoBotoes() {
        if (checkboxTermos.checked && checkboxPolitica.checked) {
            btnCadastrar.disabled = false;
            btnCadastrar.style.opacity = '1';
            btnCadastrar.style.cursor = 'pointer';
            btnCadastrar.title = '';
            termoInstruction.style.display = 'none';
        } else {
            btnCadastrar.disabled = false;
            btnCadastrar.style.opacity = '0.6';
            btnCadastrar.style.cursor = 'not-allowed';
            btnCadastrar.title = 'Aceite os termos e política para cadastrar';
            termoInstruction.style.display = 'block';
        }
}
    
    checkboxTermos.addEventListener('change', verificarEstadoBotoes);
    checkboxPolitica.addEventListener('change', verificarEstadoBotoes);
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modaisAbertos = document.querySelectorAll('.modal[style="display: flex;"]');
            if (modaisAbertos.length > 0) {
                e.preventDefault();
                const indicator = modaisAbertos[0].querySelector('.scroll-indicator');
                if (indicator) {
                    const originalText = indicator.innerHTML;
                    indicator.innerHTML = '<i class="bi bi-exclamation-circle"></i><span>Role até o final para fechar</span>';
                    setTimeout(() => {
                        indicator.innerHTML = originalText;
                    }, 2000);
                }
            }
        }
    });
});
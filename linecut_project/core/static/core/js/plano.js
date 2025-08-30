function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function selecionarPlanoPorParametro() {
    const planoSelecionado = getQueryParam('plano');
    
    if (planoSelecionado) {
        const selectPlano = document.getElementById('plano');
        const planoContainer = document.querySelector('.plano-selecionado');
        
        if (selectPlano) {
            for (let i = 0; i < selectPlano.options.length; i++) {
                if (selectPlano.options[i].value === planoSelecionado) {
                    selectPlano.selectedIndex = i;
                    break;
                }
            }
            
            if (planoContainer) {
                planoContainer.classList.add('highlight');
                setTimeout(() => {
                    planoContainer.classList.remove('highlight');
                }, 2000);
            }
            
            setTimeout(() => {
                selectPlano.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
}

document.addEventListener('DOMContentLoaded', selecionarPlanoPorParametro);
document.addEventListener('DOMContentLoaded', function() {
    const cepInput = document.getElementById('cep');
    if (!cepInput) return;

    let debounceTimer;
    const debounceDelay = 500;

    cepInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            const cep = this.value.replace(/\D/g, '');

            if (cep.length === 8) {
                consultarCEP(cep);
            }
        }, debounceDelay);
    });

    function consultarCEP(cep) {
        const loadingElement = document.getElementById('cep-loading');
        loadingElement.style.display = 'block';
        document.getElementById('endereco').value = 'Buscando endereço...';

        fetch(`/consultar-cep/?cep=${cep}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro na resposta da rede');
                }
                return response.json();
            })
            .then(data => {
                if (data.erro) {
                    notificacoes.erro('CEP não encontrado. Verifique o número digitado.');
                    document.getElementById('endereco').value = '';
                } else {
                    const endereco = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                    document.getElementById('endereco').value = endereco;
                    notificacoes.sucesso('Endereço preenchido automaticamente!');
                }
            })
            .catch(error => {
                notificacoes.erro('Erro ao consultar CEP. Tente novamente.');
                document.getElementById('endereco').value = '';
            })
            .finally(() => {
                loadingElement.style.display = 'none';
            });
    }
});
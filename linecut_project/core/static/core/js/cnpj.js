document.addEventListener('DOMContentLoaded', function() {
    const cnpjInput = document.getElementById('cnpj');
    if (!cnpjInput) return;

    let debounceTimer;
    const debounceDelay = 500;

    cnpjInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);

        debounceTimer = setTimeout(() => {
            const cnpj = this.value.replace(/\D/g, '');

            if (cnpj.length === 14) {
                consultarCNPJ(cnpj);
            }
        }, debounceDelay);
    });

    function consultarCNPJ(cnpj) {
        const loadingElement = document.getElementById('cnpj-loading');
        loadingElement.style.display = 'block';
        
        document.getElementById('nome_fantasia').value = 'Buscando...';
        document.getElementById('razao_social').value = 'Buscando...';

        fetch(`/verificar-cnpj/?cnpj=${cnpj}`)
            .then(response => response.json())
            .then(data => {
                if (!data.disponivel) {
                    throw new Error(data.mensagem || 'Este CNPJ já está cadastrado.');
                }
                return fetch(`/consultar-cnpj/?cnpj=${cnpj}`);
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.erro || `Erro HTTP: ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.erro) {
                    throw new Error(data.erro);
                }
                
                document.getElementById('nome_fantasia').value = data.nome_fantasia || '';
                document.getElementById('razao_social').value = data.razao_social || '';
                document.getElementById('nome_fantasia').setAttribute('readonly', 'true');
                document.getElementById('razao_social').setAttribute('readonly', 'true');

                if (data.telefone) document.getElementById('telefone').value = data.telefone;
                if (data.email) document.getElementById('email').value = data.email;
                
                notificacoes.sucesso('CNPJ validado com sucesso!');
            })
            .catch(error => {
                notificacoes.erro(error.message);
                document.getElementById('nome_fantasia').value = '';
                document.getElementById('razao_social').value = '';
                document.getElementById('nome_fantasia').removeAttribute('readonly');
                document.getElementById('razao_social').removeAttribute('readonly');
            })
            .finally(() => {
                loadingElement.style.display = 'none';
            });
    }
});
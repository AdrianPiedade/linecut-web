document.addEventListener('DOMContentLoaded', function() {
    const cnpjInput = document.getElementById('cnpj');
    
    if (cnpjInput) {
        cnpjInput.addEventListener('blur', function() {
            const cnpj = this.value.replace(/\D/g, '');
            
            if (cnpj.length === 14) {
                const loadingElement = document.getElementById('cnpj-loading');
                if (loadingElement) {
                    loadingElement.style.display = 'block';
                }
                
                document.getElementById('nome_fantasia').value = '';
                document.getElementById('razao_social').value = '';
                
                fetch(`/consultar-cnpj/?cnpj=${cnpj}`)
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
                            alert('CNPJ não encontrado ou inválido: ' + data.erro);
                        
                            document.getElementById('nome_fantasia').removeAttribute('readonly');
                            document.getElementById('razao_social').removeAttribute('readonly');
                        } else {
                
                            document.getElementById('nome_fantasia').value = data.nome_fantasia || '';
                            document.getElementById('razao_social').value = data.razao_social || '';
                            
                            document.getElementById('nome_fantasia').setAttribute('readonly', 'true');
                            document.getElementById('razao_social').setAttribute('readonly', 'true');
                            
                            if (data.telefone) {
                                document.getElementById('telefone').value = data.telefone;
                            }
                            if (data.email) {
                                document.getElementById('email').value = data.email;
                            }
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao consultar CNPJ:', error);
                        alert('Erro ao consultar CNPJ: ' + error.message);

                        document.getElementById('nome_fantasia').removeAttribute('readonly');
                        document.getElementById('razao_social').removeAttribute('readonly');
                    })
                    .finally(() => {
                        const loadingElement = document.getElementById('cnpj-loading');
                        if (loadingElement) {
                            loadingElement.style.display = 'none';
                        }
                    });
            } else if (cnpj.length > 0) {
                alert('CNPJ deve ter 14 dígitos. Digite um CNPJ válido.');
            }
        });
    }
});
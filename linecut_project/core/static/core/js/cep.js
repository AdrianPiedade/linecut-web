document.addEventListener('DOMContentLoaded', function() {
    const cepInput = document.getElementById('cep');
    
    if (cepInput) {
        cepInput.addEventListener('blur', function() {
            const cep = this.value.replace(/\D/g, '');
            
            if (cep.length === 8) {
                document.getElementById('cep-loading').style.display = 'block';
                
                fetch(`/consultar-cep/?cep=${cep}`)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Erro na resposta da rede');
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.erro) {
                            alert('CEP não encontrado. Por favor, verifique o CEP digitado.');
                            document.getElementById('endereco').value = '';
                        } else {
                            const endereco = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
                            document.getElementById('endereco').value = endereco;
                        }
                    })
                    .catch(error => {
                        console.error('Erro ao consultar CEP:', error);
                        alert('Erro ao consultar CEP. Tente novamente.');
                    })
                    .finally(() => {
                        document.getElementById('cep-loading').style.display = 'none';
                    });
            }
        });
    }
});
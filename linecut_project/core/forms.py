from django import forms
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
import re

class CadastroForm(forms.Form):
    nome_fantasia = forms.CharField(max_length=100, required=True)
    razao_social = forms.CharField(max_length=100, required=True)
    cnpj = forms.CharField(max_length=18, required=True)
    telefone = forms.CharField(max_length=15, required=True)
    email = forms.EmailField(required=True)
    endereco = forms.CharField(max_length=200, required=True)
    cep = forms.CharField(max_length=9, required=True)
    numero = forms.CharField(max_length=10, required=True)
    polo = forms.CharField(max_length=100, required=True)
    senha = forms.CharField(widget=forms.PasswordInput, required=True)
    termos_condicoes = forms.BooleanField(required=True)
    politica_privacidade = forms.BooleanField(required=True)
    plano = forms.CharField(max_length=20, required=True)

    def clean_cnpj(self):
        cnpj = self.cleaned_data['cnpj']
        cnpj_limpo = re.sub(r'[^0-9]', '', cnpj)
        
        if len(cnpj_limpo) != 14:
            raise forms.ValidationError('CNPJ deve ter 14 dígitos.')
   
        return cnpj_limpo

    def clean_cep(self):
        cep = self.cleaned_data['cep']

        cep = re.sub(r'[^0-9]', '', cep)
        
        if len(cep) != 8:
            raise ValidationError('CEP deve ter 8 dígitos.')
        
        return cep

    def clean_telefone(self):
        telefone = self.cleaned_data['telefone']
        telefone = re.sub(r'[^0-9]', '', telefone)
        
        if len(telefone) not in [10, 11]:
            raise ValidationError('Telefone deve ter 10 ou 11 dígitos.')
        
        return telefone

    def clean_senha(self):
        senha = self.cleaned_data['senha']
        
        if len(senha) < 10:
            raise forms.ValidationError('A senha deve ter pelo menos 10 caracteres.')
        
        if not any(c.isupper() for c in senha) or not any(c.islower() for c in senha):
            raise forms.ValidationError('A senha deve conter letras maiúsculas e minúsculas.')
        
        if not any(c.isdigit() for c in senha):
            raise forms.ValidationError('A senha deve conter pelo menos 1 número.')
        
        caracteres_especiais = set('!@#$%^&*()_+-=[]{};:\'"\\|,.<>/?')
        if not any(c in caracteres_especiais for c in senha):
            raise forms.ValidationError('A senha deve conter pelo menos 1 caractere especial.')
        
        return senha
    
    def clean_termos_condicoes(self):
        termos = self.cleaned_data['termos_condicoes']
        if not termos:
            raise forms.ValidationError('Você deve aceitar os Termos e Condições.')
        return termos
    
    def clean_politica_privacidade(self):
        politica = self.cleaned_data['politica_privacidade']
        if not politica:
            raise forms.ValidationError('Você deve aceitar a Política de Privacidade.')
        return politica
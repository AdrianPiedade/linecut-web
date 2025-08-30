from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.views.decorators.http import require_GET
import requests
from .forms import CadastroForm
import logging

logger = logging.getLogger(__name__)


def home(request):
    return render(request, 'core/home.html')

def planos(request):
    return render(request, 'core/planos.html')

def cadastro(request):
    return render(request, 'core/cadastro.html')

def login(request):
    return render(request, 'core/login.html')

def quem_somos(request):
    return render(request, 'core/quem_somos.html')

def planos(request):
    return render(request, 'core/planos.html')

def como_funciona(request):
    return render(request, 'core/como_funciona.html')

def cadastro(request):
    if request.method == 'POST':
        form = CadastroForm(request.POST)
        if form.is_valid():
            # Processar os dados do formulário
            # Salvar no banco de dados
            # Redirecionar para página de sucesso
            messages.success(request, 'Cadastro realizado com sucesso!')
            return redirect('home')
        else:
            messages.error(request, 'Por favor, corrija os erros abaixo.')
    else:
        form = CadastroForm()
    
    return render(request, 'core/cadastro.html', {'form': form})

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('pagina_inicial')  # Redirecionar para a página inicial após login
        else:
            messages.error(request, 'E-mail ou senha incorretos.')
    
    return render(request, 'login.html')


class CEPService:
    
    @staticmethod
    def consultar_via_cep(cep):
        try:
            cep_limpo = cep.replace('-', '')
            if len(cep_limpo) != 8 or not cep_limpo.isdigit():
                return None
            
            response = requests.get(f'https://viacep.com.br/ws/{cep_limpo}/json/', timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'erro' in data:
                return None
                
            return data
            
        except requests.RequestException as e:
            logger.error(f"Erro ao consultar CEP {cep}: {str(e)}")
            return None

@require_GET
def consultar_cep(request):

    cep = request.GET.get('cep', '')
    
    if not cep:
        return JsonResponse({'erro': 'CEP não fornecido'}, status=400)
    
    dados_cep = CEPService.consultar_via_cep(cep)
    
    if not dados_cep:
        return JsonResponse({'erro': 'CEP não encontrado'}, status=404)
    
    return JsonResponse(dados_cep)


class CNPJService:
    
    @staticmethod
    def consultar_cnpj(cnpj):
        try:
            cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '')
            
            if len(cnpj_limpo) != 14 or not cnpj_limpo.isdigit():
                return None
            
            url = f'https://receitaws.com.br/v1/cnpj/{cnpj_limpo}'
            
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'ERROR' or data.get('situacao') == 'ERROR':
                return None
                
            return data
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Erro ao consultar CNPJ {cnpj}: {str(e)}")
            return None

    @staticmethod
    def validar_digitos_verificadores(cnpj):

        if len(cnpj) != 14 or not cnpj.isdigit():
            return False
        
        cnpj_limpo = ''.join(filter(str.isdigit, cnpj))
        
        if len(cnpj_limpo) != 14:
            return False
        
        if len(set(cnpj_limpo)) == 1:
            return False
        
        multiplicadores1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma = 0
        for i in range(12):
            soma += int(cnpj_limpo[i]) * multiplicadores1[i]
        
        resto = soma % 11
        digito1 = 0 if resto < 2 else 11 - resto
        
        if digito1 != int(cnpj_limpo[12]):
            return False
        
        multiplicadores2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma = 0
        for i in range(13):
            soma += int(cnpj_limpo[i]) * multiplicadores2[i]
        
        resto = soma % 11
        digito2 = 0 if resto < 2 else 11 - resto
        
        return digito2 == int(cnpj_limpo[13])

@require_GET
def consultar_cnpj(request):

    cnpj = request.GET.get('cnpj', '')
    logger.info(f"Consulta de CNPJ recebida: {cnpj}")
    
    if not cnpj:
        return JsonResponse({'erro': 'CNPJ não fornecido'}, status=400)
    
    cnpj_limpo = cnpj.replace('.', '').replace('/', '').replace('-', '')
    
    if len(cnpj_limpo) != 14 or not cnpj_limpo.isdigit():
        return JsonResponse({'erro': 'CNPJ deve ter 14 dígitos numéricos'}, status=400)
    
    if not CNPJService.validar_digitos_verificadores(cnpj_limpo):
        return JsonResponse({'erro': 'CNPJ inválido'}, status=400)
    
    try:
        dados_cnpj = CNPJService.consultar_cnpj(cnpj_limpo)
        
        if not dados_cnpj:
            return JsonResponse({'erro': 'CNPJ não encontrado na base de dados'}, status=404)
        
        telefone = dados_cnpj.get('telefone', '')
        if telefone and '/' in telefone:
            telefone = telefone.split('/')[0].strip()
        
        response_data = {
            'cnpj': dados_cnpj.get('cnpj', ''),
            'nome_fantasia': dados_cnpj.get('fantasia', ''),
            'razao_social': dados_cnpj.get('nome', ''),
            'situacao': dados_cnpj.get('situacao', ''),
            'atividade_principal': dados_cnpj.get('atividade_principal', [{}])[0].get('text', '') if dados_cnpj.get('atividade_principal') else '',
            'endereco': f"{dados_cnpj.get('logradouro', '')}, {dados_cnpj.get('numero', '')} - {dados_cnpj.get('bairro', '')}, {dados_cnpj.get('municipio', '')} - {dados_cnpj.get('uf', '')}",
            'telefone': telefone,
            'email': dados_cnpj.get('email', ''),
            'message': 'CNPJ válido e encontrado na base de dados'
        }
        
        return JsonResponse(response_data)
        
    except Exception as e:
        logger.error(f"Erro interno ao consultar CNPJ: {str(e)}")
        return JsonResponse({'erro': 'Erro interno ao processar a consulta'}, status=500)

def cadastro(request):
    if request.method == 'POST':
        form = CadastroForm(request.POST)
        if form.is_valid():

            messages.success(request, 'Cadastro realizado com sucesso!')
            return redirect('home')
        else:
            messages.error(request, 'Por favor, corrija os erros abaixo.')
    else:
        form = CadastroForm()
    
    return render(request, 'core/cadastro.html', {'form': form})

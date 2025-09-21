from django.shortcuts import render, redirect
from django.contrib import messages
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.contrib.auth import get_user_model
from django.urls import reverse
import requests
from .forms import CadastroForm
from .firebase_services import FirebaseService
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


def home(request):
    return render(request, 'core/home.html')

def planos(request):
    return render(request, 'core/planos.html')

def cadastro(request):
    return render(request, 'core/cadastro.html')

def login_page(request):
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
            try:
                print("✅ Formulário válido, processando cadastro...")
                
                dados = form.cleaned_data
                
                if FirebaseService.verificar_email_existe(dados['email']):
                    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                        return JsonResponse({
                            'success': False,
                            'errors': {'email': [{'message': 'Este email já está cadastrado.'}]}
                        }, status=400)
                    messages.error(request, 'Este email já está cadastrado.')
                    return render(request, 'core/cadastro.html', {'form': form})
                
                email = dados['email']
                senha = dados['senha']
                
                dados_empresa = {
                    'nome_fantasia': dados['nome_fantasia'],
                    'razao_social': dados['razao_social'],
                    'cnpj': dados['cnpj'],
                    'telefone': dados['telefone'],
                    'endereco': dados['endereco'],
                    'cep': dados['cep'],
                    'numero': dados['numero'],
                    'polo': dados['polo'],
                    'plano': dados['plano'],
                    'termos_condicoes': dados['termos_condicoes'],
                    'politica_privacidade': dados['politica_privacidade'],
                    'status': 'ativo',
                    'data_cadastro': datetime.now().isoformat(),
                    'trial_plan_expired': False,
                    'description': "Nova Lanchonete"
                }
                
                user = FirebaseService.criar_usuario(email, senha, dados_empresa)
                
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': True,
                        'message': 'Cadastro realizado com sucesso!',
                        'redirect_url': reverse('login_page')
                    })
                
                messages.success(request, 'Cadastro realizado com sucesso!')
                return redirect('login_page')
                
            except Exception as e:
                print(f"❌ ERRO NO CADASTRO: {str(e)}")
                logger.error(f"Erro no cadastro: {e}")
                
                if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                    return JsonResponse({
                        'success': False,
                        'message': f'Erro ao realizar cadastro: {str(e)}'
                    }, status=500)
                
                messages.error(request, f'Erro ao realizar cadastro: {str(e)}')
        else:
            print("❌ Formulário inválido")
            print(f"Erros: {form.errors}")
            
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({
                    'success': False,
                    'message': 'Por favor, corrija os erros abaixo.',
                    'errors': form.errors.get_json_data()
                }, status=400)
            
            messages.error(request, 'Por favor, corrija os erros abaixo.')
    else:
        form = CadastroForm()
        print("📋 Formulário de cadastro carregado (GET)")
    
    return render(request, 'core/cadastro.html', {'form': form})

def cadastro_submit(request):
    if request.method == 'POST' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        form = CadastroForm(request.POST)
        if form.is_valid():
            try:
                return JsonResponse({
                    'success': True,
                    'redirect_url': reverse('login_page'),
                    'message': 'Cadastro realizado com sucesso!'
                })
            except Exception as e:
                return JsonResponse({
                    'success': False,
                    'message': 'Erro ao realizar cadastro.'
                })
        else:
            return JsonResponse({
                'success': False,
                'message': 'Por favor, corrija os erros no formulário.',
                'errors': form.errors.get_json_data()
            })

    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def login_submit(request):
    if request.method == 'POST':
        try:
            email = request.POST.get('email', '').strip()
            senha = request.POST.get('password', '').strip()
            
            print(f"📧 Tentativa de login: {email}")
            
            # Validação básica
            if not email or not senha:
                messages.error(request, 'Por favor, preencha todos os campos.')
                return render(request, 'core/login.html', {'email': email})
            
            try:
                # Autentica com Firebase
                user_data = FirebaseService.autenticar_usuario(email, senha)
                
                # Obtém dados do usuário do Realtime Database
                user_profile = FirebaseService.obter_dados_usuario(user_data)
                
                if user_profile:
                    # Armazena dados na sessão
                    request.session['firebase_uid'] = user_data['uid']
                    request.session['user_email'] = email
                    request.session['user_profile'] = user_profile
                    request.session['logged_in'] = True
                    request.session['id_token'] = user_data['idToken']
                    request.session['refresh_token'] = user_data['refreshToken']
                    
                    print(f"✅ Login bem-sucedido para: {email}")
                    messages.success(request, 'Login realizado com sucesso!')
                    
                    return redirect('dashboard:index')
                    
                else:
                    messages.error(request, 'Perfil de usuário não encontrado.')
                    return render(request, 'core/login.html', {'email': email})
                    
            except Exception as e:
                error_message = str(e)
                print(f"❌ Erro no login: {error_message}")
                
                # Passa o email de volta para manter no formulário
                context = {'email': email}
                
                if "Email não cadastrado" in error_message:
                    messages.error(request, 'Este email não está cadastrado.')
                elif "Senha incorreta" in error_message:
                    messages.error(request, 'Senha incorreta. Tente novamente.')
                elif "Usuário desabilitado" in error_message:
                    messages.error(request, 'Esta conta foi desativada.')
                elif "Erro na autenticação" in error_message:
                    messages.error(request, 'Erro ao fazer login. Tente novamente.')
                else:
                    messages.error(request, error_message)
                
                return render(request, 'core/login.html', context)
                
        except Exception as e:
            print(f"❌ Erro geral no login: {str(e)}")
            messages.error(request, 'Erro ao processar login. Tente novamente.')
            return render(request, 'core/login.html', {'email': request.POST.get('email', '')})
    
    return redirect('login_page')

def logout(request):

    if 'firebase_uid' in request.session:
        del request.session['firebase_uid']
    if 'user_email' in request.session:
        del request.session['user_email']
    if 'user_profile' in request.session:
        del request.session['user_profile']
    if 'logged_in' in request.session:
        del request.session['logged_in']
    
    messages.success(request, 'Logout realizado com sucesso!')
    return redirect('home')


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

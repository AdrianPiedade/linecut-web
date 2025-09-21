from datetime import datetime
from django.conf import settings
from django.shortcuts import render, redirect
from django.http import JsonResponse
from .firebase_services import product_service, company_service
from .firebase_storage import storage_service
from django.core.cache import cache
from django.core.paginator import Paginator
from django.views.decorators.cache import cache_page
import json

def check_dashboard_auth(request):
    if not all(key in request.session for key in ['firebase_uid', 'user_email', 'logged_in']):
        return redirect(f'/login/?next={request.path}')
    return None

def dashboard_index(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    context = {
        'nome_restaurante': 'Museoh',
        'categoria': 'Lanches e Salgados',
        'endereco': 'Praça 3 - Senac',
        'pedidos_hoje': 15,
        'total_vendas': 'R$ 812,50',
        'avaliacao_media': 4.7,
        'total_avaliacoes': 360,
    }
    return render(request, 'dashboard/index.html', context)

def check_trial_expiration(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    try:
        firebase_uid = request.session.get('firebase_uid')
        print(f"=== INICIANDO VERIFICAÇÃO TRIAL ===")
        
        # Buscar dados da empresa
        company_data = company_service.get_company_data(firebase_uid)
        
        if not company_data:
            print("❌ Empresa não encontrada")
            return JsonResponse({
                'success': False, 
                'message': 'Empresa não encontrada'
            })
        
        print(f"Plano atual: {company_data.get('plano')}")
        print(f"Trial expirado: {company_data.get('trial_plan_expired')}")
        
        # Se não é trial, não precisa verificar expiração
        if company_data.get('plano') != 'trial':
            print("ℹ️ Não é plano trial, ignorando verificação")
            return JsonResponse({
                'success': True,
                'trial_expired': False,
                'was_updated': False,
                'is_trial': False,
                'message': 'Não é plano trial'
            })
        
        # Se já está marcado como expirado
        if company_data.get('trial_plan_expired'):
            print("✅ Já está marcado como trial expirado")
            return JsonResponse({
                'success': True,
                'trial_expired': True,
                'was_updated': False,
                'is_trial': False,
                'message': 'Seu período trial expirou anteriormente.'
            })
        
        # Verificar se precisa expirar
        print("🔍 Verificando expiração do trial...")
        expired, was_updated = company_service.check_and_update_trial_expiration(firebase_uid)
        print(f"📊 Resultado: expired={expired}, was_updated={was_updated}")
        
        response_data = {
            'success': True,
            'trial_expired': expired,
            'was_updated': was_updated,
            'is_trial': not expired  # Se expirou, não é mais trial
        }
        
        if expired and was_updated:
            response_data['message'] = 'Seu período trial expirou. Seu plano foi alterado para Basic. Agora há uma taxa de 7% por venda.'
            print("🎯 Trial expirado E atualizado - mostrar modal")
        elif expired:
            response_data['message'] = 'Seu período trial já havia expirado anteriormente.'
            print("ℹ️ Trial expirado mas não foi atualizado agora")
        else:
            response_data['message'] = 'Seu trial ainda está ativo.'
            print("✅ Trial ainda ativo")
        
        print(f"=== FIM DA VERIFICAÇÃO TRIAL ===")
        return JsonResponse(response_data)
            
    except Exception as e:
        print(f"❌ Erro completo ao verificar trial: {str(e)}")
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False, 
            'message': f'Erro ao verificar expiração do trial: {str(e)}'
        })
    

def pedidos(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    return render(request, 'dashboard/pedidos.html')

def produtos(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    firebase_uid = request.session.get('firebase_uid')
    products = product_service.get_all_products(firebase_uid)
    
    context = {'products': products}
    return render(request, 'dashboard/produtos.html', context)

def criar_produto(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            firebase_uid = request.session.get('firebase_uid')
            
            ideal_quantity = request.POST.get('ideal_quantity')
            critical_quantity = request.POST.get('critical_quantity')
            
            product_data = {
                'name': request.POST.get('name'),
                'description': request.POST.get('description'),
                'price': float(request.POST.get('price', 0)),
                'category': request.POST.get('category'),
                'quantity': int(request.POST.get('quantity', 0)),
                'is_available': request.POST.get('is_available') == 'true',
                'image_url': ''
            }
            
            if ideal_quantity and ideal_quantity.strip():
                product_data['ideal_quantity'] = int(ideal_quantity)
            
            if critical_quantity and critical_quantity.strip():
                product_data['critical_quantity'] = int(critical_quantity)
            
            image_file = request.FILES.get('image')
            
            success, product_id = product_service.create_product(firebase_uid, product_data)
            
            if success and image_file and product_id:
                image_path = storage_service.upload_image(image_file, firebase_uid, product_id)
                if image_path:
                    product_service.update_product(firebase_uid, product_id, {'image_url': image_path})
            
            if success:
                return JsonResponse({'success': True, 'message': 'Produto criado com sucesso!'})
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao criar produto'})
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def editar_produto(request, product_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            firebase_uid = request.session.get('firebase_uid')
            produto_atual = product_service.get_product(firebase_uid, product_id)
            imagem_antiga = produto_atual.get('image_url') if produto_atual else None
            
            ideal_quantity = request.POST.get('ideal_quantity')
            critical_quantity = request.POST.get('critical_quantity')
            
            product_data = {
                'name': request.POST.get('name'),
                'description': request.POST.get('description'),
                'price': float(request.POST.get('price', 0)),
                'category': request.POST.get('category'),
                'quantity': int(request.POST.get('quantity', 0)),
                'is_available': request.POST.get('is_available') == 'true'
            }
            
            if ideal_quantity and ideal_quantity.strip():
                product_data['ideal_quantity'] = int(ideal_quantity)
            elif 'ideal_quantity' in produto_atual:
                product_data['ideal_quantity'] = None
            
            if critical_quantity and critical_quantity.strip():
                product_data['critical_quantity'] = int(critical_quantity)
            elif 'critical_quantity' in produto_atual:
                product_data['critical_quantity'] = None
            
            image_file = request.FILES.get('image')
            if image_file:
                if imagem_antiga:
                    storage_service.delete_image(imagem_antiga)
                
                image_path = storage_service.upload_image(image_file, firebase_uid, product_id)
                if image_path:
                    product_data['image_url'] = image_path
            
            success = product_service.update_product(firebase_uid, product_id, product_data)
            
            if success:
                return JsonResponse({'success': True, 'message': 'Produto atualizado com sucesso!'})
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao atualizar produto'})
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def excluir_produto(request, product_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            firebase_uid = request.session.get('firebase_uid')
            product = product_service.get_product(firebase_uid, product_id)
            
            if product and 'image_url' in product and product['image_url']:
                storage_service.delete_image(product['image_url'])
            
            success = product_service.delete_product(firebase_uid, product_id)
            
            if success:
                return JsonResponse({'success': True, 'message': 'Produto excluído com sucesso!'})
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao excluir produto'})
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def toggle_status_produto(request, product_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            firebase_uid = request.session.get('firebase_uid')
            data = json.loads(request.body)
            current_status = data.get('current_status', False)
            
            success = product_service.toggle_product_status(firebase_uid, product_id, current_status)
            
            if success:
                return JsonResponse({'success': True, 'message': 'Status alterado com sucesso!'})
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao alterar status'})
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def detalhes_produto(request, product_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    try:
        firebase_uid = request.session.get('firebase_uid')
        product = product_service.get_product(firebase_uid, product_id)
        
        if product:
            return JsonResponse({
                'success': True,
                'produto': {
                    'name': product.get('name', ''),
                    'category': product.get('category', ''),
                    'price': product.get('price', 0),
                    'quantity': product.get('quantity', 0),
                    'is_available': product.get('is_available', False),
                    'description': product.get('description', ''),
                    'image_url': product.get('image_url', ''),
                    'ideal_quantity': product.get('ideal_quantity', ''),
                    'critical_quantity': product.get('critical_quantity', '')
                }
            })
        else:
            return JsonResponse({'success': False, 'message': 'Produto não encontrado'})
            
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})

def estoque(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    firebase_uid = request.session.get('firebase_uid')
    products = product_service.get_all_products(firebase_uid)
    
    paginator = Paginator(products, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'products': page_obj,
        'page_obj': page_obj,
        'paginator': paginator
    }
    return render(request, 'dashboard/estoque.html', context)

def atualizar_estoque(request, product_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            firebase_uid = request.session.get('firebase_uid')
                        
            quantity = request.POST.get('quantity', '0')
            ideal_quantity = request.POST.get('ideal_quantity', '0')
            critical_quantity = request.POST.get('critical_quantity', '0')
            
            try:
                quantity_int = int(quantity) if quantity else 0
            except ValueError:
                quantity_int = 0
                
            try:
                ideal_quantity_int = int(ideal_quantity) if ideal_quantity else 0
            except ValueError:
                ideal_quantity_int = 0
                
            try:
                critical_quantity_int = int(critical_quantity) if critical_quantity else 0
            except ValueError:
                critical_quantity_int = 0
                        
            product_data = {
                'quantity': quantity_int,
            }
            
            if ideal_quantity_int > 0:
                product_data['ideal_quantity'] = ideal_quantity_int
            else:
                product_data['ideal_quantity'] = None
                
            if critical_quantity_int > 0:
                product_data['critical_quantity'] = critical_quantity_int
            else:
                product_data['critical_quantity'] = None
                        
            success = product_service.update_product(firebase_uid, product_id, product_data)
            
            if success:
                return JsonResponse({'success': True, 'message': 'Estoque atualizado com sucesso!'})
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao atualizar estoque'})
                
        except Exception as e:
            print(f"Erro completo: {str(e)}")
            import traceback
            traceback.print_exc()
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def detalhes_estoque(request, product_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    try:
        firebase_uid = request.session.get('firebase_uid')
        product = product_service.get_product(firebase_uid, product_id)
        
        if product:
            return JsonResponse({
                'success': True,
                'produto': {
                    'name': product.get('name', ''),
                    'category': product.get('category', ''),
                    'quantity': product.get('quantity', 0),
                    'ideal_quantity': product.get('ideal_quantity', ''),
                    'critical_quantity': product.get('critical_quantity', '')
                }
            })
        else:
            return JsonResponse({'success': False, 'message': 'Produto não encontrado'})
            
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
def configuracoes(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    firebase_uid = request.session.get('firebase_uid')
    
    # Buscar dados da empresa
    company_data = company_service.get_company_data(firebase_uid)
    
    context = {
        'company_data': company_data
    }
    return render(request, 'dashboard/configuracoes.html', context)

def update_company_profile(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            firebase_uid = request.session.get('firebase_uid')
            current_company = company_service.get_company_data(firebase_uid)
            
            if not current_company:
                return JsonResponse({'success': False, 'message': 'Empresa não encontrada'})
            
            company_data = {}
            valid_fields = [
                'nome_lanchonete', 'description', 'telefone'
            ]
            
            for field in valid_fields:
                if field in request.POST:
                    company_data[field] = request.POST[field]
            
            # Manter a imagem existente
            if current_company.get('image_url'):
                company_data['image_url'] = current_company['image_url']
            
            success = company_service.update_company_data(firebase_uid, company_data)
            
            if success:
                return JsonResponse({'success': True, 'message': 'Perfil atualizado com sucesso!'})
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao atualizar perfil'})
                
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def update_horario_funcionamento(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            firebase_uid = request.session.get('firebase_uid')
            data = json.loads(request.body)
            horario_data = data.get('horario_funcionamento')

            if not isinstance(horario_data, dict):
                return JsonResponse({'success': False, 'message': 'Formato de dados inválido.'})

            success = company_service.update_company_field(firebase_uid, 'horario_funcionamento', horario_data)

            if success:
                return JsonResponse({'success': True, 'message': 'Horário de funcionamento atualizado com sucesso!'})
            return JsonResponse({'success': False, 'message': 'Não foi possível atualizar o horário.'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})

def update_company_plan(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            # Verificar se é uma requisição AJAX
            if not request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'message': 'Requisição inválida'})
            
            firebase_uid = request.session.get('firebase_uid')
            data = json.loads(request.body)
            new_plan = data.get('new_plan')
            
            # Planos válidos atualizados
            valid_plans = ['trial', 'basic', 'premium']
            if new_plan not in valid_plans:
                return JsonResponse({'success': False, 'message': 'Plano inválido'})
            
            # Verificar se já está no plano trial e tenta mudar para trial
            current_company = company_service.get_company_data(firebase_uid)
            if current_company and current_company.get('plano') == 'trial' and new_plan == 'trial':
                return JsonResponse({'success': False, 'message': 'Você já está no plano Trial'})
            
            success = company_service.update_company_plan(firebase_uid, new_plan)
            
            if success:
                return JsonResponse({
                    'success': True, 
                    'message': f'Plano alterado para {new_plan.capitalize()} com sucesso!'
                })
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao alterar plano'})
                
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Dados inválidos'})
        except Exception as e:
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def get_company_data(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    try:
        firebase_uid = request.session.get('firebase_uid')
        company_data = company_service.get_company_data(firebase_uid)
        
        if company_data:
            return JsonResponse({
                'success': True,
                'company_data': company_data
            })
        else:
            return JsonResponse({'success': True, 'company_data': {}})
            
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'message': f'Erro ao carregar dados: {str(e)}'
        })
    
def check_trial_plan_expired(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    try:
        firebase_uid = request.session.get('firebase_uid')
        is_expired = company_service.check_trial_plan_expired(firebase_uid)
        
        return JsonResponse({
            'success': True,
            'trial_plan_expired': is_expired
        })
            
    except Exception as e:
        return JsonResponse({
            'success': False, 
            'message': f'Erro ao verificar plano: {str(e)}'
        })
    
def update_company_image(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    if request.method == 'POST':
        try:
            firebase_uid = request.session.get('firebase_uid')
            
            # Buscar dados atuais da empresa
            current_company = company_service.get_company_data(firebase_uid)
            if not current_company:
                return JsonResponse({'success': False, 'message': 'Empresa não encontrada'})
            
            image_file = request.FILES.get('company_image')
            
            if not image_file:
                return JsonResponse({'success': False, 'message': 'Nenhuma imagem enviada'})
            
            # Deletar imagem antiga se existir
            old_image_url = current_company.get('image_url')
            if old_image_url:
                try:
                    storage_service.delete_image(old_image_url)
                except Exception as e:
                    print(f"Erro ao deletar imagem antiga: {e}")
            
            # Fazer upload da nova imagem
            image_path = storage_service.upload_image(image_file, firebase_uid, 'company_logo')
            if not image_path:
                return JsonResponse({'success': False, 'message': 'Erro ao fazer upload da imagem'})
            
            # Gerar URL assinada para a imagem
            try:
                from firebase_admin import storage
                from datetime import timedelta
                
                bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
                blob = bucket.blob(image_path)
                
                # Gerar URL assinada válida por 7 dias
                signed_url = blob.generate_signed_url(
                    expiration=timedelta(days=7),
                    method='GET'
                )
            except Exception as e:
                print(f"Erro ao gerar URL assinada: {e}")
                signed_url = image_path  # Fallback para o path original
            
            # Atualizar APENAS o campo image_url no banco
            success = company_service.update_company_field(firebase_uid, 'image_url', image_path)
            
            if success:
                return JsonResponse({
                    'success': True, 
                    'message': 'Imagem atualizada com sucesso!',
                    'image_url': signed_url  # Retornar URL assinada
                })
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao atualizar imagem no banco'})
                
        except Exception as e:
            print(f"Erro ao atualizar imagem: {e}")
            return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})
    
    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def dashboard_logout(request):
    dashboard_keys = ['firebase_uid', 'user_email', 'logged_in', 'user_profile']
    for key in dashboard_keys:
        if key in request.session:
            del request.session[key]
    return redirect('/')
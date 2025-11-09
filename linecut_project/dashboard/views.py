import pytz
import json
import traceback
from datetime import datetime, time
from django.conf import settings
from django.http import JsonResponse, Http404
from django.core.paginator import Paginator
from django.shortcuts import render, redirect
from django.views.decorators.http import require_POST, require_GET
from .firebase_storage import storage_service
from .firebase_services import product_service, company_service, order_service, ProductFirebaseService, AvaliacaoFirebaseService
from core.firebase_services import FirebaseService as CoreFirebaseService
import logging

logger = logging.getLogger(__name__)

def check_dashboard_auth(request):
    if not all(key in request.session for key in ['firebase_uid', 'user_email', 'logged_in']):
        return redirect(f'/login/?next={request.path}')
    return None

def dashboard_index(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect

    firebase_uid = request.session.get('firebase_uid')
    
    company_data = request.session.get('user_profile', {})
    horario_funcionamento = company_data.get('horario_funcionamento', {})
    
    dias_semana_map = {
        'segunda': 'Seg', 'terca': 'Ter', 'quarta': 'Qua', 'quinta': 'Qui',
        'sexta': 'Sex', 'sabado': 'Sáb', 'domingo': 'Dom'
    }
    
    horario_display = []

    for dia_chave, dia_nome in dias_semana_map.items():
        horario = horario_funcionamento.get(dia_chave, {})
        if horario.get('aberto'):
            horario_str = f"{horario.get('abertura', '')} - {horario.get('fechamento', '')}"
        else:
            horario_str = "Fechado"
            
        horario_display.append({
            'dia_nome': dia_nome,
            'horario_str': horario_str,
            'fechado': not horario.get('aberto')
        })

    performance_metrics = order_service.get_daily_performance(firebase_uid)
    
    rating_data = AvaliacaoFirebaseService.get_performance_data(firebase_uid)
    
    avaliacao_media = 0.0
    total_avaliacoes = 0
    if rating_data and rating_data.get('bloco_geral'):
        avaliacao_media = rating_data['bloco_geral'].get('nota_media_geral', 0.0)
        total_avaliacoes = rating_data['bloco_geral'].get('total_avaliacoes', 0) 

    ultimos_pedidos = order_service.get_last_orders(firebase_uid, limit=3)
    
    context = {
        'nome_restaurante': company_data.get('nome_lanchonete', 'Meu Restaurante'),
        'categoria': company_data.get('description', 'Categoria'),
        'endereco': company_data.get('polo', 'Endereço/Polo'), 
        
        'horario_display': horario_display,
        
        'pedidos_hoje': performance_metrics.get('pedidos_hoje', 0) if performance_metrics else 0,

        'total_vendas': f"R$ {performance_metrics.get('total_vendas_hoje', 0.0):.2f}".replace('.', ',') if performance_metrics else 'R$ 0,00',
        
        'avaliacao_media': f"{avaliacao_media:.1f}".replace('.', ','),
        'total_avaliacoes': total_avaliacoes,
        
        'ultimos_pedidos': ultimos_pedidos if ultimos_pedidos else []
    }
    return render(request, 'dashboard/inicio.html', context)

@require_POST
def toggle_store_status(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return JsonResponse({'success': False, 'error': 'Autenticação necessária'}, status=401)

    firebase_uid = request.session.get('firebase_uid')
    if not firebase_uid:
        return JsonResponse({'success': False, 'error': 'Sessão inválida'}, status=400)

    try:
        company_data = company_service.get_company_data(firebase_uid)
        if not company_data:
            return JsonResponse({'success': False, 'error': 'Dados da empresa não encontrados'}, status=404)

        current_status = company_data.get('status', 'fechado')
        new_status = 'aberto' if current_status == 'fechado' else 'fechado'
        message = ''

        if new_status == 'aberto':
            prerequisites = company_service.check_store_open_prerequisites(firebase_uid)
            if not prerequisites['can_open']:
                missing_str = " ".join(prerequisites['missing'])
                return JsonResponse({
                    'success': False,
                    'error': f'Não é possível abrir a loja. Requisitos pendentes: {missing_str}',
                    'missing': prerequisites['missing'],
                    'status': current_status
                }, status=400)
            else:
                 message = 'Loja aberta com sucesso!'
        else:
            message = 'Loja fechada com sucesso!'

        success = company_service.update_company_status(firebase_uid, new_status)

        if success:
            if 'user_profile' in request.session:
                request.session['user_profile']['status'] = new_status
                request.session.modified = True

            return JsonResponse({'success': True, 'message': message, 'new_status': new_status})
        else:
            return JsonResponse({'success': False, 'error': 'Erro ao atualizar o status da loja no banco de dados.'}, status=500)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor.'}, status=500)

def check_trial_expiration(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect

    try:
        firebase_uid = request.session.get('firebase_uid')

        company_data = company_service.get_company_data(firebase_uid)

        if not company_data:
            return JsonResponse({
                'success': False,
                'message': 'Empresa não encontrada'
            })

        if company_data.get('plano') != 'trial':
            return JsonResponse({
                'success': True,
                'trial_expired': False,
                'was_updated': False,
                'is_trial': False,
                'message': 'Não é plano trial'
            })

        if company_data.get('trial_plan_expired'):
            return JsonResponse({
                'success': True,
                'trial_expired': True,
                'was_updated': False,
                'is_trial': False,
                'message': 'Seu período trial expirou anteriormente.'
            })

        expired, was_updated = company_service.check_and_update_trial_expiration(firebase_uid)

        response_data = {
            'success': True,
            'trial_expired': expired,
            'was_updated': was_updated,
            'is_trial': not expired
        }

        if expired and was_updated:
            response_data['message'] = 'Seu período trial expirou. Seu plano foi alterado para Basic. Agora há uma taxa de 7% por venda.'
        elif expired:
            response_data['message'] = 'Seu período trial já havia expirado anteriormente.'
        else:
            response_data['message'] = 'Seu trial ainda está ativo.'

        return JsonResponse(response_data)

    except Exception as e:
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
    products_basic = product_service.get_all_products_basic(firebase_uid)
    categorias = CoreFirebaseService.obter_categorias_produto()

    context = {
        'products': products_basic if products_basic else [],
        'categorias': categorias
    }
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
            imagem_antiga_path = ProductFirebaseService._extract_storage_path(produto_atual.get('image_url')) if produto_atual else None


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
                if imagem_antiga_path:
                    storage_service.delete_image(imagem_antiga_path)

                image_path = storage_service.upload_image(image_file, firebase_uid, product_id)
                if image_path:
                    product_data['image_url'] = image_path
            elif 'image_url' not in request.POST:
                 if imagem_antiga_path:
                      product_data['image_url'] = imagem_antiga_path
                 else:
                      product_data['image_url'] = None

            success = product_service.update_product(firebase_uid, product_id, product_data)

            if success:
                return JsonResponse({'success': True, 'message': 'Produto atualizado com sucesso!'})
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao atualizar produto'})

        except Exception as e:
            traceback.print_exc()
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
            image_path = None
            if product and 'image_url' in product and product['image_url']:
                 image_path = ProductFirebaseService._extract_storage_path(product['image_url'])

            success = product_service.delete_product(firebase_uid, product_id)

            if success and image_path:
                storage_service.delete_image(image_path)

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
        traceback.print_exc()
        return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})

def estoque(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect

    firebase_uid = request.session.get('firebase_uid')
    products_basic = product_service.get_all_products_basic(firebase_uid)
    products_list = products_basic if products_basic else []

    paginator = Paginator(products_list, 25)
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

    company_data = company_service.get_company_data(firebase_uid)

    termos_condicoes_texto = CoreFirebaseService.obter_texto_legal('termos_condicoes')
    politica_privacidade_texto = CoreFirebaseService.obter_texto_legal('politica_privacidade')

    context = {
        'company_data': company_data,
        'termos_condicoes': termos_condicoes_texto,
        'politica_privacidade': politica_privacidade_texto
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
                'nome_lanchonete', 'description', 'telefone', 'chave_pix'
            ]

            for field in valid_fields:
                if field in request.POST:
                    company_data[field] = request.POST[field]

            if 'image_url' in current_company and 'image_url' not in company_data :
                 company_data['image_url'] = ProductFirebaseService._extract_storage_path(current_company['image_url'])

            success = company_service.update_company_data(firebase_uid, company_data)

            if success:
                return JsonResponse({'success': True, 'message': 'Perfil atualizado com sucesso!'})
            else:
                return JsonResponse({'success': False, 'message': 'Erro ao atualizar perfil'})

        except Exception as e:
             traceback.print_exc()
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
            if not request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return JsonResponse({'success': False, 'message': 'Requisição inválida'})

            firebase_uid = request.session.get('firebase_uid')
            data = json.loads(request.body)
            new_plan = data.get('new_plan')

            valid_plans = ['trial', 'basic', 'premium']
            if new_plan not in valid_plans:
                return JsonResponse({'success': False, 'message': 'Plano inválido'})

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

            current_company = company_service.get_company_data(firebase_uid)
            if not current_company:
                return JsonResponse({'success': False, 'message': 'Empresa não encontrada'})

            image_file = request.FILES.get('company_image')

            if not image_file:
                return JsonResponse({'success': False, 'message': 'Nenhuma imagem enviada'})

            old_image_url = current_company.get('image_url')
            old_image_path = None
            if old_image_url:
                 old_image_path = ProductFirebaseService._extract_storage_path(old_image_url)
                 if old_image_path:
                      try:
                          storage_service.delete_image(old_image_path)
                      except Exception as e:
                           logger.warning(f"Não foi possível excluir imagem antiga {old_image_path}: {e}")
                           pass

            image_path = storage_service.upload_image(image_file, firebase_uid, 'company_logo')
            if not image_path:
                return JsonResponse({'success': False, 'message': 'Erro ao fazer upload da imagem'})

            success = company_service.update_company_field(firebase_uid, 'image_url', image_path)

            if success:
                 signed_url = company_service._process_image_url(image_path)
                 return JsonResponse({
                    'success': True,
                    'message': 'Imagem atualizada com sucesso!',
                    'image_url': signed_url
                 })
            else:
                if image_path:
                    storage_service.delete_image(image_path)
                return JsonResponse({'success': False, 'message': 'Erro ao atualizar imagem no banco'})

        except Exception as e:
             traceback.print_exc()
             return JsonResponse({'success': False, 'message': f'Erro: {str(e)}'})

    return JsonResponse({'success': False, 'message': 'Método não permitido'})

def pedidos_view(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    return render(request, 'dashboard/pedidos.html')

@require_GET
def get_pedidos_data(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    firebase_uid = request.session.get('firebase_uid')
    if not firebase_uid:
        return JsonResponse({'success': False, 'error': 'User session not found'}, status=400)

    try:
        active_tab = request.GET.get('tab', 'preparo')
        search_term = request.GET.get('search', '').lower().replace('#', '')
        sort_order = request.GET.get('sort', 'desc')

        status_map = {
            'preparo': ['pendente', 'pago', 'preparando'],
            'retirada': ['pronto'],
            'historico': ['retirado', 'concluido', 'cancelado']
        }
        status_filter = status_map.get(active_tab)

        orders = order_service.get_orders_for_lanchonete(firebase_uid, status_filter=status_filter, sort_order=sort_order)


        if orders is None:
             return JsonResponse({'success': False, 'error': 'Falha ao buscar pedidos no banco de dados.'}, status=500)

        original_count = len(orders)
        if search_term:
             orders_filtrados = [
                 o for o in orders if search_term in o.get('id', '').lower() or o.get('id', '').endswith(search_term)
             ]
             orders = orders_filtrados
        else:
             pass


        return JsonResponse({'success': True, 'orders': orders})

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': 'Ocorreu um erro interno no servidor.'}, status=500)

@require_GET
def get_pedido_details(request, order_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    try:
        order_details = order_service.get_order_details(order_id)

        if order_details:
            return JsonResponse({'success': True, 'order': order_details})
        else:
            return JsonResponse({'success': False, 'error': 'Pedido não encontrado'}, status=404)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor'}, status=500)

@require_POST
def update_pedido_status(request, order_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    firebase_uid = request.session.get('firebase_uid')
    if not firebase_uid:
        return JsonResponse({'success': False, 'error': 'User session not found'}, status=400)

    try:
        data = json.loads(request.body)
        new_status = data.get('new_status')
        new_payment_status = data.get('new_payment_status')

        if new_payment_status:
            allowed_payment_statuses = ['pago', 'pendente']
            if new_payment_status not in allowed_payment_statuses:
                return JsonResponse({'success': False, 'error': 'Status de pagamento inválido'}, status=400)

            success = order_service.update_order_payment_status(firebase_uid, order_id, new_payment_status)
            if success:
                return JsonResponse({'success': True, 'message': f'Status de pagamento atualizado para {new_payment_status}'})
            else:
                return JsonResponse({'success': False, 'error': 'Falha ao atualizar status de pagamento'}, status=500)

        elif new_status:
            allowed_statuses = ['pendente', 'pago', 'preparando', 'pronto', 'retirado', 'cancelado']
            if new_status not in allowed_statuses:
                return JsonResponse({'success': False, 'error': 'Status de pedido inválido fornecido'}, status=400)

            success = order_service.update_order_status(firebase_uid, order_id, new_status)
            if success:
                return JsonResponse({'success': True, 'message': f'Status do pedido atualizado para {new_status}'})
            else:
                return JsonResponse({'success': False, 'error': 'Falha ao atualizar o status do pedido no banco de dados'}, status=500)
        else:
            return JsonResponse({'success': False, 'error': 'Nenhum status válido fornecido para atualização'}, status=400)

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Dados JSON inválidos'}, status=400)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor'}, status=500)


@require_POST
def cancel_pedido(request, order_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    firebase_uid = request.session.get('firebase_uid')
    if not firebase_uid:
        return JsonResponse({'success': False, 'error': 'User session not found'}, status=400)

    try:
        data = json.loads(request.body)
        reason = data.get('reason', 'Cancelado pelo restaurante')

        success = order_service.update_order_status(firebase_uid, order_id, 'cancelado', reason=reason)

        if success:
            return JsonResponse({'success': True, 'message': 'Pedido cancelado com sucesso.'})
        else:
            return JsonResponse({'success': False, 'error': 'Falha ao cancelar o pedido no banco de dados'}, status=500)

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Dados JSON inválidos'}, status=400)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor'}, status=500)

def avaliacoes_view(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return auth_redirect
    
    return render(request, 'dashboard/avaliacoes.html')

@require_GET
def get_avaliacoes_data(request):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return JsonResponse({'success': False, 'error': 'Autenticação necessária'}, status=401)

    firebase_uid = request.session.get('firebase_uid')
    if not firebase_uid:
        return JsonResponse({'success': False, 'error': 'Sessão inválida'}, status=400)

    try:
        active_tab = request.GET.get('tab', 'desempenho')

        if active_tab == 'desempenho':
            data = AvaliacaoFirebaseService.get_performance_data(firebase_uid)
            if data is None:
                 return JsonResponse({'success': False, 'error': 'Falha ao buscar dados de desempenho.'}, status=500)
            return JsonResponse({'success': True, 'desempenho': data})
        
        elif active_tab == 'avaliacoes':
            search_term = request.GET.get('search', '').lower().replace('#', '')
            sort_order = request.GET.get('sort', 'desc')
            
            avaliacoes = AvaliacaoFirebaseService.get_avaliacoes_for_lanchonete(
                firebase_uid, 
                search_term=search_term, 
                sort_order=sort_order
            )
            if avaliacoes is None:
                 return JsonResponse({'success': False, 'error': 'Falha ao buscar avaliações.'}, status=500)
            return JsonResponse({'success': True, 'avaliacoes': avaliacoes})

        return JsonResponse({'success': False, 'error': 'Aba inválida'}, status=400)

    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': f'Erro interno do servidor: {str(e)}'}, status=500)

@require_GET
def get_avaliacao_details(request, order_id):
    auth_redirect = check_dashboard_auth(request)
    if auth_redirect:
        return JsonResponse({'success': False, 'error': 'Autenticação necessária'}, status=401)

    firebase_uid = request.session.get('firebase_uid')
    if not firebase_uid:
        return JsonResponse({'success': False, 'error': 'Sessão inválida'}, status=400)

    try:
        details = AvaliacaoFirebaseService.get_avaliacao_details(firebase_uid, order_id)
        
        if details:
            return JsonResponse({'success': True, 'details': details})
        else:
            return JsonResponse({'success': False, 'error': 'Detalhes da avaliação não encontrados'}, status=404)
    except Exception as e:
        traceback.print_exc()
        return JsonResponse({'success': False, 'error': 'Erro interno do servidor'}, status=500)
    
def dashboard_logout(request):
    dashboard_keys = ['firebase_uid', 'user_email', 'logged_in', 'user_profile']
    for key in dashboard_keys:
        if key in request.session:
            del request.session[key]
    return redirect('/')
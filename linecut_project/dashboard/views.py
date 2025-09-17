from django.shortcuts import render, redirect
from django.http import JsonResponse
from .firebase_services import product_service
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

def dashboard_logout(request):
    dashboard_keys = ['firebase_uid', 'user_email', 'logged_in', 'user_profile']
    for key in dashboard_keys:
        if key in request.session:
            del request.session[key]
    return redirect('/')
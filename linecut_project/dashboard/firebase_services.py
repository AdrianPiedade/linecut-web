import uuid
import pytz
import logging
import traceback
import firebase_admin
from firebase_admin import db
from firebase_admin import storage
from datetime import datetime, time, timedelta
from urllib.parse import urlparse, unquote

logger = logging.getLogger(__name__)

class ProductFirebaseService:
    @staticmethod
    def has_products(user_id):
        try:
            restaurant_ref, restaurant_id = ProductFirebaseService._get_restaurant_ref(user_id)
            if not restaurant_ref:
                return False

            products_ref = restaurant_ref.child('products')
            first_product = products_ref.order_by_key().limit_to_first(1).get()
            return bool(first_product)
        except Exception as e:
            logger.error(f"Erro ao verificar existência de produtos para {user_id}: {e}")
            traceback.print_exc()
            return False

    @staticmethod
    def _ensure_initialized():
        try:
            if not firebase_admin._apps:
                from linecut_project.firebase_config import initialize_firebase
                initialize_firebase()
            return True
        except Exception as e:
            return False

    @staticmethod
    def _get_restaurant_ref(user_id):
        try:
            if not ProductFirebaseService._ensure_initialized():
                return None, None

            user_ref = db.reference(f'/users/{user_id}')
            user_data = user_ref.get()

            if user_data and 'restaurant_id' in user_data:
                restaurant_id = user_data['restaurant_id']
                return db.reference(f'/restaurants/{restaurant_id}'), restaurant_id
            else:
                return db.reference(f'/restaurants/{user_id}'), user_id
        except Exception as e:
            return None, None

    @staticmethod
    def get_all_products_basic(user_id):
        try:
            restaurant_ref, restaurant_id = ProductFirebaseService._get_restaurant_ref(user_id)
            if not restaurant_ref:
                return None

            products_ref = restaurant_ref.child('products')
            products_data = products_ref.get()

            if products_data:
                products_list = []
                for product_id, product_data in products_data.items():
                    product_data['id'] = product_id
                    product_data.setdefault('image_url', '')
                    product_data.setdefault('ideal_quantity', None)
                    product_data.setdefault('critical_quantity', None)
                    products_list.append(product_data)
                return products_list
            return []
        except Exception as e:
            logger.error(f"Erro em get_all_products_basic para {user_id}: {e}")
            traceback.print_exc()
            return None

    @staticmethod
    def get_product(user_id, product_id):
        try:
            restaurant_ref, restaurant_id = ProductFirebaseService._get_restaurant_ref(user_id)
            if not restaurant_ref:
                return None

            product_ref = restaurant_ref.child('products').child(product_id)
            product_data = product_ref.get()

            if product_data:
                product_data['id'] = product_id
                if 'image_url' in product_data:
                    product_data['image_url'] = ProductFirebaseService._process_image_url(product_data['image_url'])
                product_data.setdefault('ideal_quantity', None)
                product_data.setdefault('critical_quantity', None)
                return product_data
            return None
        except Exception as e:
            return None

    @staticmethod
    def create_product(user_id, product_data):
        try:
            restaurant_ref, restaurant_id = ProductFirebaseService._get_restaurant_ref(user_id)
            if not restaurant_ref:
                return False, None

            product_id = str(uuid.uuid4())[:8]
            product_data['created_at'] = datetime.now().isoformat()
            product_data['updated_at'] = datetime.now().isoformat()

            cleaned_product_data = product_data.copy()
            if cleaned_product_data.get('ideal_quantity') in [None, '', 0]:
                cleaned_product_data.pop('ideal_quantity', None)
            if cleaned_product_data.get('critical_quantity') in [None, '', 0]:
                cleaned_product_data.pop('critical_quantity', None)

            products_ref = restaurant_ref.child('products')
            products_ref.child(product_id).set(cleaned_product_data)
            return True, product_id
        except Exception as e:
            return False, None

    @staticmethod
    def update_product(user_id, product_id, product_data):
        try:
            restaurant_ref, restaurant_id = ProductFirebaseService._get_restaurant_ref(user_id)
            if not restaurant_ref:
                return False

            product_data['updated_at'] = datetime.now().isoformat()

            cleaned_product_data = {}
            for key, value in product_data.items():
                if value is not None:
                     if key == 'image_url' and isinstance(value, str) and value.startswith('http'):
                         cleaned_product_data[key] = ProductFirebaseService._extract_storage_path(value)
                     else:
                         cleaned_product_data[key] = value
                else:
                    cleaned_product_data[key] = None

            product_ref = restaurant_ref.child('products').child(product_id)
            product_ref.update(cleaned_product_data)
            return True
        except Exception as e:
            return False

    @staticmethod
    def delete_product(user_id, product_id):
        try:
            restaurant_ref, restaurant_id = ProductFirebaseService._get_restaurant_ref(user_id)
            if not restaurant_ref:
                return False

            product_ref = restaurant_ref.child('products').child(product_id)
            product_ref.delete()
            return True
        except Exception as e:
            return False

    @staticmethod
    def toggle_product_status(user_id, product_id, current_status):
        try:
            restaurant_ref, restaurant_id = ProductFirebaseService._get_restaurant_ref(user_id)
            if not restaurant_ref:
                return False

            new_status = not current_status
            product_ref = restaurant_ref.child('products').child(product_id)
            product_ref.update({
                'is_available': new_status,
                'updated_at': datetime.now().isoformat()
            })
            return True
        except Exception as e:
            return False

    @staticmethod
    def _process_image_url(image_path):
        if not image_path:
            return ""

        try:
            storage_path = ProductFirebaseService._extract_storage_path(image_path)
            if not storage_path:
                 return ""

            bucket = storage.bucket('linecut-3bf2b.firebasestorage.app')
            blob = bucket.blob(storage_path)

            if not blob.exists():
                return ""

            signed_url = blob.generate_signed_url(
                expiration=timedelta(days=7),
                method='GET'
            )
            return signed_url
        except Exception as e:
             logger.error(f"Erro ao processar URL da imagem '{image_path}': {e}")
             traceback.print_exc()
             return ""
    @staticmethod
    def _extract_storage_path(image_path_or_url):
         if not image_path_or_url:
             return None
         if image_path_or_url.startswith('http'):
             try:
                 parsed_url = urlparse(image_path_or_url)
                 path = unquote(parsed_url.path)

                 if '/o/' in path:
                     storage_path = path.split('/o/', 1)[1].split('?', 1)[0]
                     return storage_path
                 else:
                      bucket_name = 'linecut-3bf2b.firebasestorage.app'
                      if path.startswith(f'/{bucket_name}/'):
                           return path[len(f'/{bucket_name}/'):]
                      elif path.startswith('/'): 
                           return path[1:]
                      else: 
                           return path
             except Exception:
                 return None
         else:
             return image_path_or_url

    @staticmethod
    def check_low_stock_products(user_id):
        try:
            products = ProductFirebaseService.get_all_products_basic(user_id)
            if not products:
                return {}

            alerts = {
                'ideal_alerts': [],
                'critical_alerts': []
            }

            for product in products:
                current_quantity = product.get('quantity', 0)
                ideal_quantity = product.get('ideal_quantity')
                critical_quantity = product.get('critical_quantity')

                if (critical_quantity is not None and
                    current_quantity <= critical_quantity and
                    current_quantity > 0):
                    alerts['critical_alerts'].append({
                        'product_id': product['id'],
                        'product_name': product['name'],
                        'current_quantity': current_quantity,
                        'critical_quantity': critical_quantity
                    })

                elif (ideal_quantity is not None and
                      critical_quantity is not None and
                      current_quantity <= ideal_quantity and
                      current_quantity > critical_quantity):
                    alerts['ideal_alerts'].append({
                        'product_id': product['id'],
                        'product_name': product['name'],
                        'current_quantity': current_quantity,
                        'ideal_quantity': ideal_quantity
                    })

                elif (ideal_quantity is not None and
                      critical_quantity is None and
                      current_quantity <= ideal_quantity and
                      current_quantity > 0):
                    alerts['ideal_alerts'].append({
                        'product_id': product['id'],
                        'product_name': product['name'],
                        'current_quantity': current_quantity,
                        'ideal_quantity': ideal_quantity
                    })

            return alerts
        except Exception as e:
            return {}

class CompanyFirebaseService:
    @staticmethod
    def update_company_status(user_id, new_status):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return False

            company_ref = db.reference(f'/empresas/{user_id}')
            company_ref.update({
                'status': new_status,
                'updated_at': datetime.now().isoformat()
            })
            return True
        except Exception as e:
            logger.error(f"Erro ao atualizar status da empresa {user_id}: {e}")
            traceback.print_exc()
            return False

    @staticmethod
    def check_store_open_prerequisites(user_id):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return {'can_open': False, 'missing': ['Erro ao conectar ao Firebase.']}

            company_data = CompanyFirebaseService.get_company_data(user_id)

            missing = []

            horario = company_data.get('horario_funcionamento')
            if not horario or not isinstance(horario, dict) or not any(dia.get('aberto', False) for dia in horario.values()):
                missing.append('Configure o horário de funcionamento.')

            chave_pix = company_data.get('chave_pix')
            if not chave_pix or not str(chave_pix).strip():
                missing.append('Configure a chave PIX.')

            if not ProductFirebaseService.has_products(user_id):
                missing.append('Cadastre pelo menos um produto.')

            can_open = len(missing) == 0
            return {'can_open': can_open, 'missing': missing}

        except Exception as e:
            logger.error(f"Erro ao verificar pré-requisitos para {user_id}: {e}")
            traceback.print_exc()
            return {'can_open': False, 'missing': ['Erro ao verificar requisitos.']}

    @staticmethod
    def check_and_update_trial_expiration(user_id):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return False, False

            company_ref = db.reference(f'/empresas/{user_id}')
            company_data = company_ref.get()

            if company_data and company_data.get('plano') == 'trial':
                from datetime import datetime, timedelta
                import re

                signup_date_str = (company_data.get('created_at') or
                                company_data.get('data_cadastro') or
                                company_data.get('signup_date'))

                if not signup_date_str:
                    signup_date = datetime.now() - timedelta(days=31)
                else:
                    try:
                        if 'Z' in signup_date_str:
                            signup_date_str = signup_date_str.replace('Z', '')
                        if '+' in signup_date_str:
                            signup_date_str = signup_date_str.split('+')[0]

                        if '.' in signup_date_str:
                            signup_date_str = signup_date_str.split('.')[0]

                        formats = [
                            '%Y-%m-%dT%H:%M:%S',
                            '%Y-%m-%d %H:%M:%S',
                            '%Y-%m-%d',
                            '%d/%m/%Y %H:%M:%S',
                            '%d/%m/%Y'
                        ]

                        signup_date = None
                        for fmt in formats:
                            try:
                                signup_date = datetime.strptime(signup_date_str, fmt)
                                break
                            except ValueError:
                                continue

                        if not signup_date:
                            signup_date = datetime.now() - timedelta(days=31)

                    except Exception as e:
                        signup_date = datetime.now() - timedelta(days=31)

                days_diff = (datetime.now() - signup_date).days

                if days_diff >= 30:
                    update_data = {
                        'plano': 'basic',
                        'trial_plan_expired': True,
                        'trial_expired_at': datetime.now().isoformat(),
                        'updated_at': datetime.now().isoformat()
                    }
                    company_ref.update(update_data)
                    return True, True

                return False, False

            return False, False

        except Exception as e:
            traceback.print_exc()
            return False, False

    @staticmethod
    def _ensure_initialized():
        try:
            if not firebase_admin._apps:
                from linecut_project.firebase_config import initialize_firebase
                initialize_firebase()
            return True
        except Exception as e:
            return False

    @staticmethod
    def get_company_data(user_id):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return None

            company_ref = db.reference(f'/empresas/{user_id}')
            company_data = company_ref.get()

            if company_data:
                if 'image_url' in company_data:
                    company_data['image_url'] = CompanyFirebaseService._process_image_url(company_data['image_url'])
                return company_data
            return None
        except Exception as e:
            return None

    @staticmethod
    def update_company_data(user_id, company_data):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return False

            company_ref = db.reference(f'/empresas/{user_id}')
            current_data = company_ref.get() or {}

            image_url_processed = company_data.pop('image_url', None)

            updated_data = {**current_data, **company_data}
            updated_data['updated_at'] = datetime.now().isoformat()

            if 'image_url' in company_data:
                storage_path = ProductFirebaseService._extract_storage_path(company_data['image_url'])
                updated_data['image_url'] = storage_path

            elif image_url_processed:
                 storage_path = ProductFirebaseService._extract_storage_path(image_url_processed)
                 updated_data['image_url'] = storage_path

            company_ref.update(updated_data)
            return True
        except Exception as e:
             traceback.print_exc()
             return False


    @staticmethod
    def update_company_plan(user_id, new_plan):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return False

            company_ref = db.reference(f'/empresas/{user_id}')
            company_ref.update({
                'plano': new_plan,
                'updated_at': datetime.now().isoformat()
            })
            return True
        except Exception as e:
            return False

    @staticmethod
    def _process_image_url(image_path):
         return ProductFirebaseService._process_image_url(image_path)

    @staticmethod
    def check_trial_expiration(user_id):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return False

            company_ref = db.reference(f'/empresas/{user_id}')
            company_data = company_ref.get()

            if company_data and company_data.get('plano') == 'trial':
                from datetime import datetime, timedelta
                signup_date = datetime.fromisoformat(company_data.get('data_cadastro', datetime.now().isoformat()))

                if datetime.now() > signup_date + timedelta(days=30):
                    company_ref.update({
                        'plano': 'basic',
                        'trial_expired': True,
                        'updated_at': datetime.now().isoformat()
                    })
                    return True

            return False
        except Exception as e:
            return False

    @staticmethod
    def check_trial_plan_expired(user_id):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return False

            company_ref = db.reference(f'/empresas/{user_id}')
            company_data = company_ref.get()

            if company_data and company_data.get('trial_plan_expired'):
                return True
            return False
        except Exception as e:
            return False

    @staticmethod
    def update_company_field(user_id, field_name, field_value):
        try:
            if not CompanyFirebaseService._ensure_initialized():
                return False

            company_ref = db.reference(f'/empresas/{user_id}')

            update_data = {
                field_name: field_value,
                'updated_at': datetime.now().isoformat()
            }

            if field_name == 'image_url' and isinstance(field_value, str) and field_value.startswith('http'):
                 storage_path = ProductFirebaseService._extract_storage_path(field_value)
                 update_data[field_name] = storage_path
            elif field_name == 'image_url' and field_value is None:
                 update_data[field_name] = "" 
            company_ref.update(update_data)
            return True

        except Exception as e:
            traceback.print_exc()
            return False

class OrderFirebaseService:
    @staticmethod
    def _ensure_initialized():
        return ProductFirebaseService._ensure_initialized()

    @staticmethod
    def get_orders_for_lanchonete(user_id, status_filter=None, sort_order='desc'):
        try:
            if not OrderFirebaseService._ensure_initialized():
                return None

            lanchonete_id = user_id
            if not lanchonete_id:
                 return None

            orders_summary_ref = db.reference(f'/pedidos_por_lanchonete/{lanchonete_id}')
            orders_summary = None

            try:
                query = orders_summary_ref.order_by_child('data_criacao')
                orders_summary = query.get()
            except firebase_admin.exceptions.InvalidArgumentError as index_error:
                 try:
                     orders_summary = orders_summary_ref.get()
                 except Exception as fallback_error:
                      traceback.print_exc()
                      return None
            except Exception as query_error:
                 traceback.print_exc()
                 return None

            if not orders_summary:
                return []

            order_list = []
            sao_paulo_tz = pytz.timezone('America/Sao_Paulo')

            if not isinstance(orders_summary, dict):
                return []

            pedidos_principais_ref = db.reference('/pedidos')
            pedidos_principais_data = pedidos_principais_ref.get() or {}

            for order_id, summary_data in orders_summary.items():
                 if not isinstance(summary_data, dict):
                     continue

                 summary_data['id'] = order_id
                 current_status = summary_data.get('status')
                 if status_filter and current_status not in status_filter:
                    continue

                 pedido_principal = pedidos_principais_data.get(order_id, {})
                 summary_data['metodo_pagamento'] = pedido_principal.get('metodo_pagamento')
                 summary_data['status_pagamento'] = pedido_principal.get('status_pagamento', 'pendente')

                 data_criacao_str = summary_data.get('data_criacao')
                 if data_criacao_str:
                    try:
                        dt_utc = datetime.fromisoformat(data_criacao_str.replace('Z', '+00:00'))
                        dt_local = dt_utc.astimezone(sao_paulo_tz)
                        summary_data['data_criacao_dt'] = dt_local
                        summary_data['data_criacao_display'] = dt_local.strftime('%d/%m/%Y')
                        summary_data['hora_criacao_display'] = dt_local.strftime('%H:%M')
                    except (ValueError, TypeError) as date_error:
                         summary_data['data_criacao_dt'] = datetime.min.replace(tzinfo=sao_paulo_tz)
                         summary_data['data_criacao_display'] = "Data inválida"
                         summary_data['hora_criacao_display'] = "--:--"
                 else:
                    summary_data['data_criacao_dt'] = datetime.min.replace(tzinfo=sao_paulo_tz)
                    summary_data['data_criacao_display'] = "Sem data"
                    summary_data['hora_criacao_display'] = "--:--"

                 order_list.append(summary_data)

            try:
                reverse_sort = sort_order == 'desc'
                order_list.sort(key=lambda x: x.get('data_criacao_dt', datetime.min.replace(tzinfo=sao_paulo_tz)), reverse=reverse_sort)
            except Exception as sort_error:
                 pass

            return order_list

        except Exception as e:
            traceback.print_exc()
            return None

    @staticmethod
    def get_order_details(order_id):
        try:
            if not OrderFirebaseService._ensure_initialized():
                return None

            order_ref = db.reference(f'/pedidos/{order_id}')
            order_data = order_ref.get()

            if order_data:
                order_data['id'] = order_id
                sao_paulo_tz = pytz.timezone('America/Sao_Paulo')
                datahora_criacao_str = order_data.get('datahora_criacao')
                if datahora_criacao_str:
                    try:
                        dt_utc = datetime.fromisoformat(datahora_criacao_str.replace('Z', '+00:00'))
                        dt_local = dt_utc.astimezone(sao_paulo_tz)
                        order_data['data_criacao_display'] = dt_local.strftime('%d/%m/%Y')
                        order_data['hora_criacao_display'] = dt_local.strftime('%H:%M')
                    except (ValueError, TypeError):
                         order_data['data_criacao_display'] = "Data inválida"
                         order_data['hora_criacao_display'] = "--:--"
                else:
                    order_data['data_criacao_display'] = "Sem data"
                    order_data['hora_criacao_display'] = "--:--"


                if 'items' in order_data and isinstance(order_data['items'], dict):
                    order_data['items_list'] = list(order_data['items'].values())
                else:
                    order_data['items_list'] = []

                order_data.setdefault('status_history', [])
                if isinstance(order_data['status_history'], dict):
                     history_list = list(order_data['status_history'].values())
                     history_list.sort(key=lambda x: x.get('timestamp_iso', ''), reverse=True)
                     order_data['status_history'] = history_list
                elif isinstance(order_data['status_history'], list):
                    order_data['status_history'].sort(key=lambda x: x.get('timestamp_iso', ''), reverse=True)
                else:
                     order_data['status_history'] = []


                return order_data
            else:
                return None

        except Exception as e:
            traceback.print_exc()
            return None

    @staticmethod
    def update_order_status(user_id, order_id, new_status, reason=None):
        try:
            if not OrderFirebaseService._ensure_initialized():
                logger.error("Firebase não inicializado ao atualizar status.")
                return False

            lanchonete_id = user_id
            if not lanchonete_id:
                logger.error("user_id (lanchonete_id) vazio ao atualizar status.")
                return False

            now_utc = datetime.now(pytz.utc)
            now_iso = now_utc.isoformat()
            sao_paulo_tz = pytz.timezone('America/Sao_Paulo')
            now_local_str = now_utc.astimezone(sao_paulo_tz).strftime('%d/%m %H:%M')

            order_ref = db.reference(f'/pedidos/{order_id}')
            order_summary_ref = db.reference(f'/pedidos_por_lanchonete/{lanchonete_id}/{order_id}')

            updates_main = {
                'status_pedido': new_status,
                'datahora_ultima_atualizacao': now_iso
            }
            updates_summary = {'status': new_status}

            status_history_entry = {
                'status': new_status,
                'timestamp_iso': now_iso,
                'timestamp_display': now_local_str
            }

            if new_status == 'retirado':
                    updates_main['datahora_retirada'] = now_iso
                    order_ref.child('status_history').push(status_history_entry)
            elif new_status == 'cancelado':
                    updates_main['datahora_cancelamento'] = now_iso
                    if reason:
                        updates_main['motivo_cancelamento'] = reason
                        status_history_entry['reason'] = reason
                    order_ref.child('status_history').push(status_history_entry)
            else:
                order_ref.child('status_history').push(status_history_entry)
                if new_status == 'pronto':
                    try:
                        order_data = order_ref.get()
                        if order_data and 'datahora_criacao' in order_data:
                            creation_iso = order_data['datahora_criacao']
                            creation_display = ""
                            try:
                                dt_utc = datetime.fromisoformat(creation_iso.replace('Z', '+00:00'))
                                dt_local = dt_utc.astimezone(sao_paulo_tz)
                                creation_display = dt_local.strftime('%d/%m %H:%M')
                            except (ValueError, TypeError) as date_error:
                                logger.warning(f"Erro ao formatar data de criação {creation_iso} para histórico: {date_error}")
                                creation_display = "Data criação inválida"

                            creation_history_entry = {
                                'status': 'pedido_realizado',
                                'timestamp_iso': creation_iso,
                                'timestamp_display': creation_display
                            }
                            order_ref.child('status_history').push(creation_history_entry)
                            logger.info(f"Adicionado status 'pedido_realizado' ao histórico do pedido {order_id}")
                        else:
                            logger.warning(f"Não foi possível adicionar 'pedido_realizado' ao histórico: 'datahora_criacao' não encontrada para o pedido {order_id}.")
                    except Exception as history_error:
                        logger.error(f"Erro ao tentar adicionar 'pedido_realizado' ao histórico do pedido {order_id}: {history_error}")


            if updates_main:
                order_ref.update(updates_main)
            if updates_summary:
                order_summary_ref.update(updates_summary)


            logger.info(f"Atualização para pedido {order_id} concluída. Updates main: {updates_main}, Updates summary: {updates_summary}")
            return True

        except Exception as e:
            logger.error(f"Erro GERAL em update_order_status: {e}")
            traceback.print_exc()
            return False

    @staticmethod
    def update_order_payment_status(user_id, order_id, new_payment_status):
        try:
            if not OrderFirebaseService._ensure_initialized():
                return False

            lanchonete_id = user_id
            if not lanchonete_id:
                return False

            now_utc = datetime.now(pytz.utc)
            now_iso = now_utc.isoformat()
            sao_paulo_tz = pytz.timezone('America/Sao_Paulo')
            now_local_str = now_utc.astimezone(sao_paulo_tz).strftime('%d/%m %H:%M')

            order_ref = db.reference(f'/pedidos/{order_id}')
            order_summary_ref = db.reference(f'/pedidos_por_lanchonete/{lanchonete_id}/{order_id}')

            updates_main = {
                'status_pagamento': new_payment_status,
                'datahora_ultima_atualizacao': now_iso
            }
            updates_summary = {'status_pagamento': new_payment_status}

            if new_payment_status == 'pago':
                updates_main['datahora_pagamento'] = now_iso
                payment_history_entry = {
                    'status': 'pagamento_confirmado',
                    'timestamp_iso': now_iso,
                    'timestamp_display': now_local_str
                }
                try:
                    order_ref.child('status_history').push(payment_history_entry)
                except Exception as e:
                     pass

            order_ref.update(updates_main)
            order_summary_ref.update(updates_summary)

            return True

        except Exception as e:
            traceback.print_exc()
            return False
        
    @staticmethod
    def _get_orders_for_day(lanchonete_id, target_date, limit=None):
        try:
            if not OrderFirebaseService._ensure_initialized():
                return None
            
            sao_paulo_tz = pytz.timezone('America/Sao_Paulo')
            
            start_of_day = sao_paulo_tz.localize(datetime.combine(target_date, time.min)).astimezone(pytz.utc).isoformat()
            end_of_day = sao_paulo_tz.localize(datetime.combine(target_date, time.max)).astimezone(pytz.utc).isoformat()
            
            orders_summary_ref = db.reference(f'/pedidos_por_lanchonete/{lanchonete_id}')

            query = orders_summary_ref.order_by_child('data_criacao').start_at(start_of_day).end_at(end_of_day)
            
            orders_summary = query.get()
            
            if not orders_summary or not isinstance(orders_summary, dict):
                return []

            order_list = []
            
            for order_id, summary_data in orders_summary.items():
                if not isinstance(summary_data, dict):
                    continue
                    
                data_criacao_str = summary_data.get('data_criacao')
                if data_criacao_str:
                    try:
                        dt_utc = datetime.fromisoformat(data_criacao_str.replace('Z', '+00:00'))
                        dt_local = dt_utc.astimezone(sao_paulo_tz)
                        summary_data['data_criacao_dt'] = dt_local
                    except (ValueError, TypeError):
                         summary_data['data_criacao_dt'] = datetime.min.replace(tzinfo=sao_paulo_tz)

                order_list.append(summary_data)
            
            return order_list
            
        except Exception as e:
            logger.error(f"Erro em _get_orders_for_day para {lanchonete_id}: {e}")
            traceback.print_exc()
            return None

    @staticmethod
    def get_daily_performance(lanchonete_id):
        try:
            sao_paulo_tz = pytz.timezone('America/Sao_Paulo')
            today = datetime.now(sao_paulo_tz).date()

            orders_today = OrderFirebaseService._get_orders_for_day(lanchonete_id, today)
            if orders_today is None:
                return None

            pedidos_hoje = 0
            total_vendas_hoje = 0.0

            for order in orders_today:
                if order.get('status') != 'cancelado':
                    pedidos_hoje += 1
                    total_vendas_hoje += float(order.get('preco_total', 0.0))

            return {
                'pedidos_hoje': pedidos_hoje,
                'total_vendas_hoje': total_vendas_hoje
            }

        except Exception as e:
            logger.error(f"Erro em get_daily_performance para {lanchonete_id}: {e}")
            traceback.print_exc()
            return None
    
    @staticmethod
    def get_last_orders(lanchonete_id, limit=3):
        try:
            if not OrderFirebaseService._ensure_initialized():
                return None

            orders_summary_ref = db.reference(f'/pedidos_por_lanchonete/{lanchonete_id}')
            
            orders_summary = orders_summary_ref.order_by_child('data_criacao').limit_to_last(limit * 2).get() or {}
            
            order_list = []
            sao_paulo_tz = pytz.timezone('America/Sao_Paulo')
            
            for order_id, summary_data in orders_summary.items():
                if not isinstance(summary_data, dict):
                    continue
                    
                summary_data['id'] = order_id
                data_criacao_str = summary_data.get('data_criacao')

                if data_criacao_str:
                    try:
                        dt_utc = datetime.fromisoformat(data_criacao_str.replace('Z', '+00:00'))
                        dt_local = dt_utc.astimezone(sao_paulo_tz)
                        summary_data['data_criacao_dt'] = dt_local
                        summary_data['data_criacao_display'] = dt_local.strftime('%d/%m/%Y')
                    except (ValueError, TypeError):
                         summary_data['data_criacao_dt'] = datetime.min.replace(tzinfo=sao_paulo_tz)

                order_list.append(summary_data)
            
            order_list.sort(key=lambda x: x.get('data_criacao_dt', datetime.min.replace(tzinfo=sao_paulo_tz)), reverse=True)
            
            # Mapeamento para exibição
            STATUS_MAP = {
                'pendente': 'Pendente',
                'pago': 'Pago',
                'preparando': 'Preparando',
                'pronto': 'Pronto para Retirada',
                'retirado': 'Retirado/Entregue',
                'concluido': 'Concluído',
                'cancelado': 'Cancelado'
            }
            
            orders_for_display = []
            for order in order_list[:limit]:
                orders_for_display.append({
                    'id': order['id'][:8],
                    'status': order.get('status', 'pendente'),
                    'status_display': STATUS_MAP.get(order.get('status', 'pendente'), 'Status Desconhecido'),
                    'preco_total': order.get('preco_total', 0.0),
                    'data_criacao_display': order.get('data_criacao_display', '--/--/----'),
                    'dot_class': OrderFirebaseService.get_status_dot_class(order.get('status', 'pendente'))
                })
            
            return orders_for_display

        except Exception as e:
            logger.error(f"Erro em get_last_orders para {lanchonete_id}: {e}")
            traceback.print_exc()
            return None

    @staticmethod
    def get_status_dot_class(status):
        if status in ['pendente', 'pago', 'preparando', 'pronto']:
            return 'em-andamento'
        elif status in ['retirado', 'concluido']:
            return 'concluido'
        elif status == 'cancelado':
            return 'cancelado'
        return 'em-andamento'
        
class AvaliacaoFirebaseService:
    @staticmethod
    def _ensure_initialized():
        return ProductFirebaseService._ensure_initialized()

    @staticmethod
    def get_all_lanchonete_orders_with_ratings(user_id):
        if not AvaliacaoFirebaseService._ensure_initialized():
            return None

        orders_ref = db.reference(f'/pedidos_por_lanchonete/{user_id}')
        orders_summary = orders_ref.get()

        if not orders_summary or not isinstance(orders_summary, dict):
            return []
        
        lanchonete_avaliacoes = []
        sao_paulo_tz = pytz.timezone('America/Sao_Paulo')
            
        for order_id, summary_data in orders_summary.items():
            if summary_data.get('avaliacao'):
                avaliacao_data = summary_data['avaliacao']
                
                qualidade = avaliacao_data.get('qualidade', 0)
                atendimento = avaliacao_data.get('atendimento', 0)
                velocidade = avaliacao_data.get('velocidade', 0)
                
                notas = [n for n in [qualidade, atendimento, velocidade] if n > 0]
                nota_geral = sum(notas) / len(notas) if len(notas) == 3 else 0
                
                data_avaliacao_str = avaliacao_data.get('data_avaliacao')
                data_criacao_str = summary_data.get('data_criacao')
                
                data_avaliacao_dt = None
                if data_avaliacao_str:
                    try:
                        dt_utc = datetime.fromisoformat(data_avaliacao_str.replace('Z', '+00:00'))
                        data_avaliacao_dt = dt_utc.astimezone(sao_paulo_tz)
                    except (ValueError, TypeError):
                        pass

                data_pedido_dt = None
                if data_criacao_str:
                    try:
                        dt_utc = datetime.fromisoformat(data_criacao_str.replace('Z', '+00:00'))
                        data_pedido_dt = dt_utc.astimezone(sao_paulo_tz)
                    except (ValueError, TypeError):
                        pass

                lanchonete_avaliacoes.append({
                    'id': order_id,
                    'data_pedido_dt': data_pedido_dt,
                    'data_avaliacao_dt': data_avaliacao_dt,
                    'nota_geral': nota_geral,
                    'qualidade': qualidade,
                    'atendimento': atendimento,
                    'velocidade': velocidade,
                })
                
        return lanchonete_avaliacoes
        
    @staticmethod
    def get_performance_data(user_id):
        try:
            avaliacoes = AvaliacaoFirebaseService.get_all_lanchonete_orders_with_ratings(user_id)
            if avaliacoes is None:
                return None

            sao_paulo_tz = pytz.timezone('America/Sao_Paulo')
            now = datetime.now(sao_paulo_tz)
            trinta_dias_atras = now - timedelta(days=30)
            
            avaliacoes_30dias = [
                a for a in avaliacoes 
                if a['data_avaliacao_dt'] and a['data_avaliacao_dt'] >= trinta_dias_atras and a['nota_geral'] > 0
            ]
            
            total_avaliacoes = len(avaliacoes_30dias)
            
            total_soma_notas = 0
            bloco_notas_gerais = {'nota_5': 0, 'nota_4': 0, 'nota_3': 0, 'nota_2': 0, 'nota_1': 0}
            bloco_detalhes = {
                'qualidade': {'nota_5': 0, 'nota_4': 0, 'nota_3': 0, 'nota_2': 0, 'nota_1': 0},
                'atendimento': {'nota_5': 0, 'nota_4': 0, 'nota_3': 0, 'nota_2': 0, 'nota_1': 0},
                'velocidade': {'nota_5': 0, 'nota_4': 0, 'nota_3': 0, 'nota_2': 0, 'nota_1': 0}
            }

            for avaliacao in avaliacoes_30dias:
                nota_geral_arredondada = round(avaliacao['nota_geral'])
                total_soma_notas += avaliacao['nota_geral']
                
                if 1 <= nota_geral_arredondada <= 5:
                    bloco_notas_gerais[f'nota_{nota_geral_arredondada}'] += 1

                for categoria in ['qualidade', 'atendimento', 'velocidade']:
                    nota_categoria = avaliacao[categoria]
                    if 1 <= nota_categoria <= 5:
                        bloco_detalhes[categoria][f'nota_{nota_categoria}'] += 1
            
            nota_media_geral = total_soma_notas / total_avaliacoes if total_avaliacoes > 0 else 0
            
            return {
                'bloco_geral': {
                    'total_30dias': total_avaliacoes,
                    'nota_media_geral': round(nota_media_geral, 1),
                    'total_avaliacoes': total_avaliacoes
                },
                'bloco_notas_gerais': bloco_notas_gerais,
                'bloco_detalhes': bloco_detalhes
            }

        except Exception as e:
            logger.error(f"Erro em get_performance_data: {e}")
            traceback.print_exc()
            return None

    @staticmethod
    def get_avaliacoes_for_lanchonete(user_id, search_term=None, sort_order='desc'):
        try:
            avaliacoes = AvaliacaoFirebaseService.get_all_lanchonete_orders_with_ratings(user_id)
            if avaliacoes is None:
                return []
            
            avaliacoes_list = []
            
            for avaliacao in avaliacoes:
                if avaliacao['nota_geral'] == 0:
                    continue 

                data_pedido_display = avaliacao['data_pedido_dt'].strftime('%d/%m/%Y') if avaliacao['data_pedido_dt'] else "--/--/----"
                data_avaliacao_display = avaliacao['data_avaliacao_dt'].strftime('%d/%m/%Y') if avaliacao['data_avaliacao_dt'] else "--/--/----"

                nota_geral_formatada = round(avaliacao['nota_geral'], 1)
                
                avaliacao_status = "avaliado"
                
                search_term_lower = search_term.lower() if search_term else ''
                order_id_short = avaliacao['id'][len(avaliacao['id']) - 8:].lower()

                if search_term and not (search_term_lower in avaliacao['id'].lower() or search_term_lower in order_id_short):
                     continue
                
                avaliacoes_list.append({
                    'id': avaliacao['id'],
                    'data_pedido_str': data_pedido_display,
                    'data_avaliacao_str': data_avaliacao_display,
                    'nota_geral': nota_geral_formatada,
                    'qualidade': avaliacao['qualidade'],
                    'atendimento': avaliacao['atendimento'],
                    'velocidade': avaliacao['velocidade'],
                    'status': avaliacao_status,
                    'data_sort': avaliacao['data_avaliacao_dt'] or avaliacao['data_pedido_dt']
                })

            try:
                reverse_sort = sort_order == 'desc'
                avaliacoes_list.sort(key=lambda x: x.get('data_sort', datetime.min.replace(tzinfo=pytz.utc)), reverse=reverse_sort)
            except Exception:
                 pass
                
            for item in avaliacoes_list:
                item.pop('data_sort', None)
                
            return avaliacoes_list
            
        except Exception as e:
            logger.error(f"Erro em get_avaliacoes_for_lanchonete: {e}")
            traceback.print_exc()
            return None
            
    @staticmethod
    def get_avaliacao_details(user_id, order_id):
        if not AvaliacaoFirebaseService._ensure_initialized():
            return None

        avaliacao_summary_ref = db.reference(f'/pedidos_por_lanchonete/{user_id}/{order_id}/avaliacao')
        avaliacao_data = avaliacao_summary_ref.get()

        if avaliacao_data and isinstance(avaliacao_data, dict):
            qualidade = avaliacao_data.get('qualidade', 0)
            atendimento = avaliacao_data.get('atendimento', 0)
            velocidade = avaliacao_data.get('velocidade', 0)

            notas = [n for n in [qualidade, atendimento, velocidade] if n > 0]
            nota_geral = sum(notas) / len(notas) if len(notas) == 3 else 0

            return {
                'order_id': order_id,
                'nota_geral': round(nota_geral, 1),
                'qualidade_nota': qualidade,
                'atendimento_nota': atendimento,
                'velocidade_nota': velocidade,
                
                'qualidade_texto': "",
                'velocidade_texto': "",
                'atendimento_texto': ""
            }
        
        return None

order_service = OrderFirebaseService()
product_service = ProductFirebaseService()
company_service = CompanyFirebaseService()
avaliacao_service = AvaliacaoFirebaseService()
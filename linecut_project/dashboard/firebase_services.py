import firebase_admin
from firebase_admin import db, credentials
import logging
from datetime import datetime
import uuid
from django.conf import settings

logger = logging.getLogger(__name__)

class ProductFirebaseService:
    @staticmethod
    def _ensure_initialized():
        try:
            if not firebase_admin._apps:
                from linecut_project.firebase_config import initialize_firebase
                initialize_firebase()
            return True
        except Exception as e:
            logger.error(f"Erro ao inicializar Firebase: {e}")
            return False

    @staticmethod
    def _get_restaurant_ref(user_id):
        try:
            if not ProductFirebaseService._ensure_initialized():
                return None
                
            user_ref = db.reference(f'/users/{user_id}')
            user_data = user_ref.get()
            
            if user_data and 'restaurant_id' in user_data:
                restaurant_id = user_data['restaurant_id']
                return db.reference(f'/restaurants/{restaurant_id}'), restaurant_id
            else:
                return db.reference(f'/restaurants/{user_id}'), user_id
                
        except Exception as e:
            logger.error(f"Erro ao obter referência do restaurante: {e}")
            return None, None

    @staticmethod
    def get_all_products(user_id):
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
                    
                    if 'image_url' in product_data:
                        product_data['image_url'] = ProductFirebaseService._process_image_url(product_data['image_url'])
                    
                    product_data.setdefault('ideal_quantity', None)
                    product_data.setdefault('critical_quantity', None)
                    
                    products_list.append(product_data)
                
                return products_list
            return None
            
        except Exception as e:
            logger.error(f"Erro ao buscar produtos: {e}")
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
            logger.error(f"Erro ao buscar produto: {e}")
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
            logger.error(f"Erro ao criar produto: {e}")
            return False, None

    @staticmethod
    def update_product(user_id, product_id, product_data):
        try:
            restaurant_ref, restaurant_id = ProductFirebaseService._get_restaurant_ref(user_id)
            if not restaurant_ref:
                return False
            
            product_data['updated_at'] = datetime.now().isoformat()
            
            cleaned_product_data = product_data.copy()
            if cleaned_product_data.get('ideal_quantity') in [None, '', 0]:
                cleaned_product_data.pop('ideal_quantity', None)
            else:
                cleaned_product_data['ideal_quantity'] = int(cleaned_product_data['ideal_quantity'])
                
            if cleaned_product_data.get('critical_quantity') in [None, '', 0]:
                cleaned_product_data.pop('critical_quantity', None)
            else:
                cleaned_product_data['critical_quantity'] = int(cleaned_product_data['critical_quantity'])
            
            product_ref = restaurant_ref.child('products').child(product_id)
            product_ref.update(cleaned_product_data)
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao atualizar produto: {e}")
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
            logger.error(f"Erro ao excluir produto: {e}")
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
            logger.error(f"Erro ao alternar status do produto: {e}")
            return False
        
    @staticmethod
    def _process_image_url(image_path):
        if not image_path:
            return ""
        
        try:
            from firebase_admin import storage
            from datetime import timedelta
            from urllib.parse import urlparse, unquote
            
            if image_path.startswith('http'):
                parsed_url = urlparse(image_path)
                path = unquote(parsed_url.path)
                
                if '/o/' in path:
                    image_path = path.split('/o/')[1].split('?')[0]
            
            bucket = storage.bucket('linecut-3bf2b.firebasestorage.app')
            blob = bucket.blob(image_path)
            
            if not blob.exists():
                return ""
            
            signed_url = blob.generate_signed_url(
                expiration=timedelta(days=7),
                method='GET'
            )
            
            return signed_url
            
        except Exception as e:
            return ""

    @staticmethod
    def check_low_stock_products(user_id):
        try:
            products = ProductFirebaseService.get_all_products(user_id)
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
            logger.error(f"Erro ao verificar estoque baixo: {e}")
            return {}

product_service = ProductFirebaseService()
import uuid
import logging
from django.conf import settings
from firebase_admin import storage

logger = logging.getLogger(__name__)

class FirebaseStorageService:
    @staticmethod
    def upload_image(file, user_id, resource_type):
        try:
            if resource_type == 'company_logo':
                file_extension = file.name.split('.')[-1] if '.' in file.name else 'jpg'
                filename = f"company/{user_id}/logo_{uuid.uuid4().hex[:8]}.{file_extension}"
            else:
                file_extension = file.name.split('.')[-1] if '.' in file.name else 'jpg'
                filename = f"products/{user_id}/{resource_type}_{uuid.uuid4().hex[:8]}.{file_extension}"
            
            bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
            blob = bucket.blob(filename)
            blob.upload_from_file(file, rewind=True)
            
            return filename
                    
        except Exception as e:
            logger.error(f"Erro no upload da imagem: {e}")
            return None

    @staticmethod
    def delete_image(image_path_or_url):
        try:
            if not image_path_or_url:
                return False
            
            file_path = FirebaseStorageService.extract_file_path(image_path_or_url)
            
            if not file_path:
                return False
            
            bucket = storage.bucket(settings.FIREBASE_STORAGE_BUCKET)
            blob = bucket.blob(file_path)
            
            if blob.exists():
                blob.delete()
                return True
            else:
                return False
                
        except Exception as e:
            logger.error(f"Erro ao excluir imagem: {str(e)}")
            return False

    @staticmethod
    def extract_file_path(image_path_or_url):
        try:
            if not image_path_or_url:
                return None
                
            if not image_path_or_url.startswith('http'):
                return image_path_or_url
            
            from urllib.parse import urlparse, unquote
            
            if '/products/' in image_path_or_url:
                parts = image_path_or_url.split('/products/')
                if len(parts) > 1:
                    file_path = 'products/' + parts[1].split('?')[0]
                    file_path = unquote(file_path)
                    return file_path
            
            parsed_url = urlparse(image_path_or_url)
            path = unquote(parsed_url.path)
            
            bucket_name = settings.FIREBASE_STORAGE_BUCKET
            if path.startswith(f'/{bucket_name}/'):
                return path[len(f'/{bucket_name}/'):]
            elif path.startswith('/'):
                return path[1:]
            
            return path
            
        except Exception as e:
            return None

storage_service = FirebaseStorageService()
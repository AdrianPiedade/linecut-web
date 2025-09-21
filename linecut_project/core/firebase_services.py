import logging
import requests
import firebase_admin
from django.conf import settings
from firebase_admin import auth, db

logger = logging.getLogger(__name__)

class FirebaseService:
    @staticmethod
    def _ensure_initialized():
        try:
            if not firebase_admin._apps:
                from .firebase_auth import initialize_firebase
                initialize_firebase()
                return True
            return True
        except Exception as e:
            return False

    @staticmethod
    def criar_usuario(email, senha, dados_adicionais=None):
        try:            
            if not FirebaseService._ensure_initialized():
                raise Exception("Firebase não inicializado")
                        
            user = auth.create_user(
                email=email,
                password=senha,
                email_verified=False
            )
                        
            if dados_adicionais:
                dados_db = dados_adicionais.copy()
                dados_db.pop('senha', None)
                
                try:
                    ref = db.reference(f'/empresas/{user.uid}')
                    ref.set(dados_db)
                except Exception as db_error:
                    print(f"⚠️  AVISO: Dados não salvos no database: {db_error}")
            
            return user
        
        except auth.EmailAlreadyExistsError:
            error_msg = "Email já cadastrado"
            raise Exception(error_msg)
        except Exception as e:
            logger.error(f"Erro ao criar usuário no Firebase: {e}")
            raise

    @staticmethod
    def verificar_email_existe(email):
        try:
            if not FirebaseService._ensure_initialized():
                return False
            
            try:
                user = auth.get_user_by_email(email)
                return True
            except auth.UserNotFoundError:
                return False
            except Exception as e:
                users = auth.list_users().iterate_all()
                for user in users:
                    if user.email == email:
                        return True
                return False
                
        except Exception as e:
            logger.error(f"Erro ao verificar email: {e}")
            return False
        
    @staticmethod
    def autenticar_usuario(email, senha):

        try:
            url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={settings.FIREBASE_API_KEY}"
            
            payload = {
                "email": email,
                "password": senha,
                "returnSecureToken": True
            }
            
            response = requests.post(url, json=payload)
            data = response.json()

            if response.status_code == 200:

                return {
                    "uid": data["localId"],
                    "idToken": data["idToken"],
                    "refreshToken": data["refreshToken"]
                }
            else:
                error_msg = data.get("error", {}).get("message", "Erro desconhecido")
                if error_msg == "EMAIL_NOT_FOUND":
                    raise Exception("Email não cadastrado")
                elif error_msg == "INVALID_PASSWORD":
                    raise Exception("Senha incorreta")
                elif error_msg == "USER_DISABLED":
                    raise Exception("Usuário desabilitado")
                else:
                    raise Exception(f"Erro na autenticação: {error_msg}")
        
        except Exception as e:
            raise Exception(f"Falha na autenticação: {e}")
    

    @staticmethod
    def obter_dados_usuario(user_data):
        try:
            uid = user_data["uid"] if isinstance(user_data, dict) else user_data
            
            if not FirebaseService._ensure_initialized():
                raise Exception("Firebase não inicializado")
            
            ref = db.reference(f'/empresas/{uid}')
            dados = ref.get()
            
            if dados:
                return dados
            else:
                return None
                
        except Exception as e:
            logger.error(f"Erro ao obter dados do usuário: {e}")
            return None
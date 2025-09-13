# core/firebase_services.py
import firebase_admin
from firebase_admin import auth, db, credentials
import logging
from linecut_project.firebase_config import initialize_firebase
from datetime import datetime
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

class FirebaseService:
    @staticmethod
    def _ensure_initialized():
        print("🔄 Verificando inicialização do Firebase...")
        try:
            if not firebase_admin._apps:
                print("⚠️  Firebase não inicializado, tentando inicializar...")
                from .firebase_auth import initialize_firebase
                initialize_firebase()
                print("✅ Firebase inicializado com sucesso")
                return True
            print("✅ Firebase já inicializado")
            return True
        except Exception as e:
            print(f"❌ Erro ao verificar inicialização: {e}")
            return False

    @staticmethod
    def criar_usuario(email, senha, dados_adicionais=None):
        try:
            print(f"👤 Tentando criar usuário: {email}")
            
            if not FirebaseService._ensure_initialized():
                raise Exception("Firebase não inicializado")
            
            print("✅ Firebase OK, criando usuário...")
            
            user = auth.create_user(
                email=email,
                password=senha,
                email_verified=False
            )
            
            print(f"✅ Usuário criado no Auth: {user.uid}")
            
            if dados_adicionais:
                print("💾 Salvando dados no database...")
                dados_db = dados_adicionais.copy()
                dados_db.pop('senha', None)
                
                try:
                    ref = db.reference(f'/empresas/{user.uid}')
                    ref.set(dados_db)
                    print("✅ Dados salvos no database")
                except Exception as db_error:
                    print(f"⚠️  AVISO: Dados não salvos no database: {db_error}")
            
            return user
        
        except auth.EmailAlreadyExistsError:
            error_msg = "Email já cadastrado"
            print(f"❌ {error_msg}")
            raise Exception(error_msg)
        except Exception as e:
            print(f"❌ ERRO ao criar usuário: {e}")
            logger.error(f"Erro ao criar usuário no Firebase: {e}")
            raise

    @staticmethod
    def verificar_email_existe(email):
        try:
            print(f"🔍 Verificando se email existe: {email}")
            
            if not FirebaseService._ensure_initialized():
                print("❌ Firebase não inicializado para verificação de email")
                return False
            
            try:
                user = auth.get_user_by_email(email)
                print(f"✅ Email encontrado: {email}")
                return True
            except auth.UserNotFoundError:
                print(f"❌ Email não encontrado: {email}")
                return False
            except Exception as e:
                print(f"⚠️  Erro na verificação direta: {e}, usando método alternativo...")
                users = auth.list_users().iterate_all()
                for user in users:
                    if user.email == email:
                        print(f"✅ Email encontrado (fallback): {email}")
                        return True
                print(f"❌ Email não encontrado (fallback): {email}")
                return False
                
        except Exception as e:
            print(f"❌ ERRO ao verificar email: {e}")
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
            print(f"📋 Obtendo dados do usuário: {uid}")
            
            if not FirebaseService._ensure_initialized():
                raise Exception("Firebase não inicializado")
            
            ref = db.reference(f'/empresas/{uid}')
            dados = ref.get()
            
            if dados:
                print(f"✅ Dados encontrados para usuário: {uid}")
                return dados
            else:
                print(f"⚠️  Nenhum dado encontrado para usuário: {uid}")
                return None
                
        except Exception as e:
            print(f"❌ ERRO ao obter dados do usuário: {e}")
            logger.error(f"Erro ao obter dados do usuário: {e}")
            return None
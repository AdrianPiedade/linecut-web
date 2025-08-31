# core/firebase_services.py
import firebase_admin
from firebase_admin import auth, db
import logging
from linecut_project.firebase_config import initialize_firebase
from datetime import datetime

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
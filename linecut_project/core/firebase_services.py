import logging
import requests
import firebase_admin
from django.conf import settings
from firebase_admin import auth, db
from django.core.mail import send_mail

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
            
            link = auth.generate_email_verification_link(email)
            
            email_subject = 'Confirme seu cadastro no LineCut'
            email_body = f"""
            Olá,

            Obrigado por se cadastrar no LineCut!
            Por favor, clique no link abaixo para verificar seu e-mail e ativar sua conta:
            {link}

            Se você não se cadastrou, por favor ignore este e-mail.

            Atenciosamente,
            Equipe LineCut
            """
            
            try:
                send_mail(
                    email_subject,
                    email_body,
                    settings.DEFAULT_FROM_EMAIL,
                    [email],
                    fail_silently=False,
                )
                print(f"--- E-mail de verificação enviado para {email} ---")
            except Exception as email_error:
                print(f"--- ERRO AO ENVIAR E-MAIL de verificação: {email_error} ---")
                        
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
        
    @staticmethod
    def verificar_cnpj_existe(cnpj):
        try:
            if not FirebaseService._ensure_initialized():
                return False
            
            empresas_ref = db.reference('/empresas')
            empresas = empresas_ref.order_by_child('cnpj').equal_to(cnpj).get()
            
            return bool(empresas)

        except Exception as e:
            logger.error(f"Erro ao verificar CNPJ: {e}")
            return False
        
    @staticmethod
    def enviar_email_redefinicao_senha(email):
        try:
            auth.get_user_by_email(email)
            
            link = auth.generate_password_reset_link(email)
            
            send_mail(
                'Redefinição de Senha - LineCut',
                f'Olá,\n\nRecebemos uma solicitação para redefinir sua senha. Clique no link abaixo para criar uma nova senha:\n{link}\n\nSe você não solicitou isso, ignore este e-mail.\n\nEquipe LineCut',
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False
            )
            return True, "E-mail de redefinição enviado com sucesso."
        except auth.UserNotFoundError:
            print(f"Tentativa de redefinição para e-mail não cadastrado: {email}")
            return True, "E-mail não encontrado, mas retornando sucesso por segurança."
        except Exception as e:
            logger.error(f"Erro ao enviar e-mail de redefinição: {e}")
            return False, str(e)
        
    @staticmethod
    def obter_polos():
        try:
            if not FirebaseService._ensure_initialized():
                logger.error("Firebase não inicializado ao buscar polos.")
                return None

            polos_ref = db.reference('/polos')
            polos_data = polos_ref.get()

            if polos_data and isinstance(polos_data, dict):
                return polos_data
            else:
                logger.warning("Nenhum dado de polo encontrado ou formato inválido no Firebase.")
                return {} 

        except Exception as e:
            logger.error(f"Erro ao buscar polos no Firebase: {e}")
            return None
        
    @staticmethod
    def obter_texto_legal(tipo_texto):

        if tipo_texto not in ['termos_condicoes', 'politica_privacidade']:
            logger.error(f"Tipo de texto legal inválido solicitado: {tipo_texto}")
            return None
        try:
            if not FirebaseService._ensure_initialized():
                logger.error(f"Firebase não inicializado ao buscar texto legal: {tipo_texto}.")
                return None

            text_ref = db.reference(f'/textos_legais/{tipo_texto}')
            text_data = text_ref.get()

            if text_data and isinstance(text_data, dict):
                return text_data
            else:
                logger.warning(f"Nenhum dado encontrado ou formato inválido para o texto legal: {tipo_texto}")

                titulo_padrao = tipo_texto.replace('_', ' ').replace('oe', 'õe').replace('ca', 'ça').title()
                return {"titulo": titulo_padrao, "secoes": [{"paragrafos": ["Erro ao carregar o texto."]}]}

        except Exception as e:
            logger.error(f"Erro ao buscar texto legal '{tipo_texto}' no Firebase: {e}")

            titulo_padrao = tipo_texto.replace('_', ' ').replace('oe', 'õe').replace('ca', 'ça').title()
            return {"titulo": titulo_padrao, "secoes": [{"paragrafos": ["Erro crítico ao carregar o texto."]}]}
        
    @staticmethod
    def obter_categorias_produto():
        try:
            if not FirebaseService._ensure_initialized():
                logger.error("Firebase não inicializado ao buscar categorias de produto.")
                return None

            categorias_ref = db.reference('/categorias_produto')
            categorias_data = categorias_ref.get()

            if categorias_data and isinstance(categorias_data, list):

                return sorted(categorias_data)
            elif isinstance(categorias_data, dict):

                 return sorted(list(categorias_data.values()))
            else:
                logger.warning("Nenhuma categoria de produto encontrada ou formato inválido no Firebase.")

                return ["Outros"]

        except Exception as e:
            logger.error(f"Erro ao buscar categorias de produto no Firebase: {e}")

            return None
        
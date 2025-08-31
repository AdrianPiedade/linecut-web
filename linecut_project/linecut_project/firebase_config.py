import firebase_admin
from firebase_admin import credentials
import os
from django.conf import settings

_firebase_initialized = False

def initialize_firebase():
    global _firebase_initialized
    
    if _firebase_initialized:
        return True
        
    try:
        print("🔧 Inicializando Firebase...")
        
        possible_paths = [
            os.path.join(settings.BASE_DIR, 'linecut_project', 'firebase', 'serviceAccountKey.json'),
            os.path.join(settings.BASE_DIR, 'firebase', 'serviceAccountKey.json'),
            os.path.join('linecut_project', 'firebase', 'serviceAccountKey.json'),
        ]
        
        cred_path = None
        for path in possible_paths:
            if os.path.exists(path):
                cred_path = path
                print(f"✅ Arquivo encontrado em: {path}")
                break
        
        if not cred_path:
            print("❌ ERRO: Arquivo de credenciais não encontrado em nenhum caminho!")
            print("Caminhos testados:")
            for path in possible_paths:
                print(f"   - {path} -> {os.path.exists(path)}")
            return False
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            
            firebase_admin.initialize_app(cred, {
                'databaseURL': 'https://linecut-3bf2b-default-rtdb.firebaseio.com/'
            })
            print("✅ Firebase inicializado no Django!")
        
        _firebase_initialized = True
        return True
        
    except Exception as e:
        print(f"❌ Erro ao inicializar Firebase no Django: {e}")
        import traceback
        traceback.print_exc()
        return False
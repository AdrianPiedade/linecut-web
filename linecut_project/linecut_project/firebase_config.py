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
        possible_paths = [
            os.path.join(settings.BASE_DIR, 'linecut_project', 'firebase', 'serviceAccountKey.json'),
            os.path.join(settings.BASE_DIR, 'firebase', 'serviceAccountKey.json'),
            os.path.join('linecut_project', 'firebase', 'serviceAccountKey.json'),
        ]
        
        cred_path = None
        for path in possible_paths:
            if os.path.exists(path):
                cred_path = path
                break
        
        if not cred_path:
            return False
        
        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            
            firebase_admin.initialize_app(cred, {
                'databaseURL': 'https://linecut-3bf2b-default-rtdb.firebaseio.com/'
            })
        
        _firebase_initialized = True
        return True
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return False
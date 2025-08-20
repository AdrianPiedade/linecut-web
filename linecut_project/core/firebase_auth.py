import firebase_admin
from firebase_admin import credentials, auth

def initialize_firebase():
    cred = credentials.Certificate('linecut_project/firebase/serviceAccountKey.json')
    firebase_admin.initialize_app(cred)
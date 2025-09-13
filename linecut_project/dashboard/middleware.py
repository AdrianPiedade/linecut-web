# C:\Repository\linecut-web\linecut_project\dashboard\middleware.py
from django.shortcuts import redirect
from django.urls import reverse

class DashboardAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # URLs públicas do dashboard (login, se houver)
        public_urls = [
            # Adicione URLs públicas do dashboard aqui se necessário
        ]
        
        # Verificar se é uma URL do dashboard
        if request.path.startswith('/dashboard/'):
            # Verificar se a sessão do dashboard está ativa
            if not self.has_dashboard_session(request):
                # Se não tem sessão, redirecionar para login do core
                return redirect(f'/login/?next={request.path}')
        
        return self.get_response(request)
    
    def has_dashboard_session(self, request):
        """Verifica se a sessão do dashboard está ativa"""
        return (
            'firebase_uid' in request.session and 
            'user_email' in request.session and
            request.session.get('logged_in') is True
        )
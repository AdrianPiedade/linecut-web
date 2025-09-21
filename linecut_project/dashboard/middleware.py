from django.shortcuts import redirect

class DashboardAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
     
        if request.path.startswith('/dashboard/'):
            if not self.has_dashboard_session(request):
                return redirect(f'/login/?next={request.path}')
        
        return self.get_response(request)
    
    def has_dashboard_session(self, request):
        return (
            'firebase_uid' in request.session and 
            'user_email' in request.session and
            request.session.get('logged_in') is True
        )
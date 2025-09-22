from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('planos/', views.planos, name='planos'),
    path('cadastro/', views.cadastro, name='cadastro'),
    path('login/', views.login_page, name='login'),
    path('login/submit/', views.login_submit, name='login_submit'),
    path('password-reset-request/', views.password_reset_request, name='password_reset_request'),
    path('quem_somos/', views.quem_somos, name='quem_somos'),
    path('planos/', views.planos, name='planos'),
    path('como_funciona/', views.como_funciona, name='como_funciona'),
    path('consultar-cep/', views.consultar_cep, name='consultar_cep'),
    path('consultar-cnpj/', views.consultar_cnpj, name='consultar_cnpj'),
    path('verificar-cnpj/', views.verificar_cnpj, name='verificar_cnpj'),
    path('cadastro/submit/', views.cadastro_submit, name='cadastro_submit'),
    path('logout/', views.logout, name='logout'),
]
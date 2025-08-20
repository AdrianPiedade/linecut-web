from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('planos/', views.planos, name='planos'),
    path('cadastro/', views.cadastro, name='cadastro'),
    path('login/', views.login, name='login'),
    path('quem_somos/', views.quem_somos, name='quem_somos'),
    path('planos/', views.planos, name='planos'),
    path('como_funciona/', views.como_funciona, name='como_funciona'),
]
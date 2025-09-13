from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.dashboard_index, name='index'),
    path('produtos/', views.produtos, name='produtos'),
    path('produtos/criar/', views.criar_produto, name='criar_produto'),
    path('produtos/editar/<str:product_id>/', views.editar_produto, name='editar_produto'),
    path('produtos/excluir/<str:product_id>/', views.excluir_produto, name='excluir_produto'),
    path('produtos/toggle-status/<str:product_id>/', views.toggle_status_produto, name='toggle_status_produto'),
    path('produtos/detalhes/<str:product_id>/', views.detalhes_produto, name='detalhes_produto'),
    path('logout/', views.dashboard_logout, name='logout'), 
]
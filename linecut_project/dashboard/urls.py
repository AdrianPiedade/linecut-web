from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    path('', views.dashboard_index, name='index'),
    path('check-trial-expiration/', views.check_trial_expiration, name='check_trial_expiration'),
    path('produtos/', views.produtos, name='produtos'),
    path('produtos/criar/', views.criar_produto, name='criar_produto'),
    path('produtos/editar/<str:product_id>/', views.editar_produto, name='editar_produto'),
    path('produtos/excluir/<str:product_id>/', views.excluir_produto, name='excluir_produto'),
    path('produtos/toggle-status/<str:product_id>/', views.toggle_status_produto, name='toggle_status_produto'),
    path('produtos/detalhes/<str:product_id>/', views.detalhes_produto, name='detalhes_produto'),
    path('estoque/', views.estoque, name='estoque'),
    path('estoque/atualizar/<str:product_id>/', views.atualizar_estoque, name='atualizar_estoque'),
    path('estoque/detalhes/<str:product_id>/', views.detalhes_estoque, name='detalhes_estoque'),
    path('configuracoes/', views.configuracoes, name='configuracoes'),
    path('configuracoes/get-company-data/', views.get_company_data, name='get_company_data'),
    path('configuracoes/update-profile/', views.update_company_profile, name='update_company_profile'),
    path('configuracoes/update-horario/', views.update_horario_funcionamento, name='update_horario_funcionamento'),
    path('configuracoes/update-plan/', views.update_company_plan, name='update_company_plan'),
    path('configuracoes/check-trial-plan/', views.check_trial_plan_expired, name='check_trial_plan'),
    path('configuracoes/update-image/', views.update_company_image, name='update_company_image'),
    path('logout/', views.dashboard_logout, name='logout'),
]
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

def dashboard_index(request):
    context = {
        'nome_restaurante': 'Museoh',
        'categoria': 'Lanches e Salgados',
        'endereco': 'Praça 3 - Senac',
        'pedidos_hoje': 15,
        'total_vendas': 'R$ 812,50',
        'avaliacao_media': 4.7,
        'total_avaliacoes': 360,
        'pedidos': [
            {'numero': '#1200', 'status': 'em-andamento', 'valor': 'R$ 20,00', 'data': '24/04/2025'},
            {'numero': '#1199', 'status': 'em-andamento', 'valor': 'R$ 20,00', 'data': '24/04/2025'},
            {'numero': '#1198', 'status': 'concluido', 'valor': 'R$ 20,00', 'data': '24/04/2025'},
            {'numero': '#1197', 'status': 'concluido', 'valor': 'R$ 20,00', 'data': '24/04/2025'},
            {'numero': '#1196', 'status': 'concluido', 'valor': 'R$ 20,00', 'data': '24/04/2025'},
        ]
    }
    return render(request, 'dashboard/index.html', context)

def pedidos(request):
    return render(request, 'dashboard/pedidos.html')

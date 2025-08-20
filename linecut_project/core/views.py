from django.shortcuts import render

def home(request):
    return render(request, 'core/home.html')

def planos(request):
    return render(request, 'core/planos.html')

def cadastro(request):
    return render(request, 'core/cadastro.html')

def login(request):
    return render(request, 'core/login.html')

def quem_somos(request):
    return render(request, 'core/quem_somos.html')

def planos(request):
    return render(request, 'core/planos.html')

def como_funciona(request):
    return render(request, 'core/como_funciona.html')
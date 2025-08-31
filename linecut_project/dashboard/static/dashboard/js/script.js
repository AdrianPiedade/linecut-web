const dadosMockados = {
    nomeLanchonete: "Museoh",
    categoria: "Lanches e Salgados",
    endereco: "Praça 3 - Senac",
    horarios: {
        hoje: "18:00 - 23:00",
        amanha: "18:00 - 23:00"
    },
    metricas: {
        pedidosHoje: 15,
        totalVendas: "R$ 812,50",
        avaliacaoMedia: 4.7,
        totalAvaliacoes: 360
    },
    pedidos: [
        { id: "#1200", status: "em-andamento", valor: "R$ 20,00", data: "24/04/2025" },
        { id: "#1199", status: "em-andamento", valor: "R$ 20,00", data: "24/04/2025" },
        { id: "#1198", status: "concluido", valor: "R$ 20,00", data: "24/04/2025" },
        { id: "#1197", status: "concluido", valor: "R$ 20,00", data: "24/04/2025" },
        { id: "#1196", status: "concluido", valor: "R$ 20,00", data: "24/04/2025" }
    ]
};

document.addEventListener('DOMContentLoaded', function() {

    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            menuItems.forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
            
            const menuText = this.querySelector('span:not(.icon)').textContent;
            console.log(`Clicou em: ${menuText}`);
        });
    });
    
    document.querySelector('.menu-sair').addEventListener('click', function() {
        console.log('Sair clicado');
    });
    
    document.querySelector('.btn-ver-pedidos').addEventListener('click', function() {
        console.log('Ver todos os pedidos');
    });
    
    const detalhesLinks = document.querySelectorAll('.ver-detalhes');
    detalhesLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pedidoId = this.closest('.linha-pedido').querySelector('.col-numero').textContent;
            console.log(`Ver detalhes do pedido: ${pedidoId}`);
        });
    });
});

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarData(data) {
    return new Intl.DateTimeFormat('pt-BR').format(data);
}
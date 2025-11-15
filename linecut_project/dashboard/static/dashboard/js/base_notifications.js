document.addEventListener('DOMContentLoaded', () => {
    checkUnreadNotifications();
    loadOrderStateFromSession();

    if ('BroadcastChannel' in self) {
        const channel = new BroadcastChannel('fcm-channel');
        channel.onmessage = (event) => {
            console.log("[Base] Mensagem recebida do Service Worker:", event.data);
            
            if (event.data.type === 'NEW_ORDER') {
                if (typeof window.handleNewOrderFCM === 'function') {
                    window.handleNewOrderFCM();
                }
            } else if (event.data.type === 'NEW_NOTIFICATION') {
                if (typeof window.updateNotificationIndicator === 'function') {
                    const newCount = parseInt(event.data.unreadCount);
                    if (!isNaN(newCount)) {
                        window.updateNotificationIndicator(newCount);
                    }
                }
            }
        };
    }
});

let seenPreparoOrderIds = new Set();
let currentNewOrderCount = 0;
const SEEN_ORDERS_KEY = 'linecut_seenPreparoOrderIds';
const NEW_ORDER_COUNT_KEY = 'linecut_newOrderCount';

async function checkUnreadNotifications() {
    try {
        const response = await fetch('/dashboard/notificacoes/unread-count/');
        if (!response.ok) {
            return;
        }
        const data = await response.json();
        if (data.success) {
            updateNotificationIndicator(data.count);
        }
    } catch (error) {
        console.error("Erro ao verificar contagem de notificações:", error);
    }
}

window.updateNotificationIndicator = function(count) {
    const menuNotificacoes = document.getElementById('menu-notificacoes');
    if (!menuNotificacoes) return;

    let badge = menuNotificacoes.querySelector('.notification-badge');

    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            menuNotificacoes.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : count;
    } else {
        if (badge) {
            badge.remove();
        }
    }
}

function loadOrderStateFromSession() {
    const seenOrdersJson = sessionStorage.getItem(SEEN_ORDERS_KEY);
    if (seenOrdersJson) {
        seenPreparoOrderIds = new Set(JSON.parse(seenOrdersJson));
    } else {
        initializeNewOrderTracking();
    }

    currentNewOrderCount = parseInt(sessionStorage.getItem(NEW_ORDER_COUNT_KEY) || '0');
    if (currentNewOrderCount > 0) {
        updateNewOrderIndicator(currentNewOrderCount);
    }
}

function saveSeenOrdersToSession() {
    sessionStorage.setItem(SEEN_ORDERS_KEY, JSON.stringify(Array.from(seenPreparoOrderIds)));
}

function saveNewOrderCountToSession(count) {
    sessionStorage.setItem(NEW_ORDER_COUNT_KEY, count);
}

async function initializeNewOrderTracking() {
    try {
        const response = await fetch('/dashboard/pedidos/data/?tab=preparo&sort=desc');
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && Array.isArray(data.orders)) {
            data.orders.forEach(order => seenPreparoOrderIds.add(order.id));
            saveSeenOrdersToSession();
        }
    } catch (e) {
        console.error("Erro ao inicializar rastreamento de pedidos:", e);
    }
}

window.handleNewOrderFCM = async function() {
    try {
        const response = await fetch('/dashboard/pedidos/data/?tab=preparo&sort=desc');
        if (!response.ok) return;
        
        const data = await response.json();
        if (data.success && Array.isArray(data.orders)) {
            let newCount = 0;
            data.orders.forEach(order => {
                if (!seenPreparoOrderIds.has(order.id)) {
                    newCount++;
                }
            });
            
            if (newCount > 0) {
                currentNewOrderCount = newCount;
                saveNewOrderCountToSession(currentNewOrderCount);
                updateNewOrderIndicator(currentNewOrderCount);
            }
        }
    } catch (error) {
        console.error("Erro ao processar FCM de novo pedido:", error);
    }
}

function updateNewOrderIndicator(count) {
    const menuPedidos = document.getElementById('menu-pedidos');
    if (!menuPedidos) return;

    let badge = menuPedidos.querySelector('.notification-badge');

    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            menuPedidos.appendChild(badge);
        }
        badge.textContent = count > 9 ? '9+' : count;
    } else {
        if (badge) {
            badge.remove();
        }
    }
}

window.markOrdersAsSeen = function(orders) {
    if (!Array.isArray(orders)) return;
    orders.forEach(order => seenPreparoOrderIds.add(order.id));
    saveSeenOrdersToSession();
    currentNewOrderCount = 0; 
}

window.clearNewOrderIndicator = function() {
    currentNewOrderCount = 0;
    saveNewOrderCountToSession(0);
    updateNewOrderIndicator(0);
}
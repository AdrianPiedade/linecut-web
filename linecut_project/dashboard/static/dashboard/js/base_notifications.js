document.addEventListener('DOMContentLoaded', () => {
    startNotificationPolling();
});

let notificationPollingInterval = null;

function startNotificationPolling() {
    if (notificationPollingInterval) {
        clearInterval(notificationPollingInterval);
    }
    checkUnreadNotifications();
    notificationPollingInterval = setInterval(checkUnreadNotifications, 30000); 
}

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

function updateNotificationIndicator(count) {
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
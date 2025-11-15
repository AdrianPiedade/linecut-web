document.addEventListener("DOMContentLoaded", () => {
const firebaseConfig = {
  apiKey: "AIzaSyB14a_rxVSb5CtVQt2EJU4NByHeiMPpLOc",
  authDomain: "linecut-3bf2b.firebaseapp.com",
  databaseURL: "https://linecut-3bf2b-default-rtdb.firebaseio.com",
  projectId: "linecut-3bf2b",
  storageBucket: "linecut-3bf2b.firebasestorage.app",
  messagingSenderId: "140700221422",
  appId: "1:140700221422:web:6ef1108fac4527d79098ff",
  measurementId: "G-X1K3QMNV9B"
};

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  function requestPermissionAndGetToken() {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        console.log("Permissão de notificação concedida.");
        
        const vapidKey = "BCaI5nfsQlZjazQXxF_MPWy1_6mfrLEv5RRdAFXf_1axl9-iK7lNUR7dWk0IW9jLsewS085O63_fGEPvUdH5VMs";
        
        messaging.getToken({ vapidKey: vapidKey }).then((currentToken) => {
          if (currentToken) {
            console.log("Token FCM obtido:", currentToken);
            sendTokenToBackend(currentToken);
          } else {
            console.log("Não foi possível obter o token de registro.");
          }
        }).catch((err) => {
          console.log("Erro ao obter token.", err);
        });
      } else {
        console.log("Permissão de notificação negada.");
      }
    });
  }

  function sendTokenToBackend(token) {
    fetch("/dashboard/configuracoes/save-fcm-token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": CSRF_TOKEN,
        "X-Requested-With": "XMLHttpRequest"
      },
      body: JSON.stringify({ fcm_token: token })
    })
    .then(response => response.json())
    .then(data => {
      if(data.success) {
        console.log("Token salvo no backend.");
      } else {
        console.error("Falha ao salvar token no backend.");
      }
    })
    .catch((err) => {
      console.error("Erro ao enviar token:", err);
    });
  }

  requestPermissionAndGetToken();

  messaging.onMessage((payload) => {
    console.log("Mensagem recebida em primeiro plano: ", payload);
    
    if (typeof showToast === "function") {
        showToast(payload.notification.title, 'info');
    } else {
        alert(payload.notification.title + "\n" + payload.notification.body);
    }
  });
});
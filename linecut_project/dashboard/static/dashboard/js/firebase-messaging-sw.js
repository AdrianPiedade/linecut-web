importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

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

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload,
  );

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/static/dashboard/images/logo_linecut_title.png",
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
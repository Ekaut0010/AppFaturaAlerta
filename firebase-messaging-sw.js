// firebase-messaging-sw.js

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyBLeiDpZp2AZ-m_yM1C63OqFx0p7HGZLDc",
  authDomain: "faturaapp-49a98.firebaseapp.com",
  projectId: "faturaapp-49a98",
  storageBucket: "faturaapp-49a98.firebasestorage.app",
  messagingSenderId: "120182099403",
  appId: "1:120182099403:web:7f313c0713f582de71fa4e",
});

const messaging = firebase.messaging();

// receber notificação em background
messaging.onBackgroundMessage((payload) => {
  console.log("Notificação recebida:", payload);

  const title = payload.notification?.title || "Nova notificação";
  const options = {
    body: payload.notification?.body || "",
  };

  self.registration.showNotification(title, options);
});
//abri o app ao clicar na notificação
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});

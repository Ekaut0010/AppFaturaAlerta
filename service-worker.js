const CACHE_NAME = "app-fatura-v5";

// 🔥 arquivos essenciais (app shell)
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// =========================
// INSTALL
// =========================
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
});

// =========================
// ACTIVATE
// =========================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        }),
      ),
    ),
  );
});

// =========================
// FETCH
// =========================
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 🔥 NÃO INTERFERIR NO FIREBASE
  if (
    url.origin.includes("googleapis.com") ||
    url.origin.includes("gstatic.com") ||
    url.origin.includes("firebaseinstallations.googleapis.com") ||
    url.origin.includes("firestore.googleapis.com") ||
    url.origin.includes("identitytoolkit.googleapis.com")
  ) {
    return;
  }

  // 🔥 HTML → network first (sempre tenta atualizar)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html")),
    );
    return;
  }

  // 🔥 CSS / JS / IMG → cache first (ultra rápido)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    }),
  );
});

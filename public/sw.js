// Service worker mínimo: só existe pra o navegador oferecer "Instalar app".
// Não faz cache de propósito — o app sempre carrega a versão mais nova do servidor.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

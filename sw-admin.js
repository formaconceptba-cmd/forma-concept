/* App del panel (FORMA Admin): hace que se pueda instalar en el celular.
   No guarda nada en caché: el panel siempre se abre con la versión nueva.
   Las notificaciones (ventas, transferencias) se suman en la etapa 2. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(L => L.length ? L[0].focus() : self.clients.openWindow('/admin')));
});

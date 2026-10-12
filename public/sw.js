// Service worker de Tendar: muestra las notificaciones push de alertas y,
// al tocarlas, abre (o enfoca) la bandeja de alertas.
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Tendar', body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Tendar', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/alerts' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/alerts', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url === url && 'focus' in w) return w.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

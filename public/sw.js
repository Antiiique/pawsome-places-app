self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "Pawsome Places";
  const options = {
    body: data.body || "",
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: data.tag || "pawsome-push",
    data: data,
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.postMessage({ type: "notification-click", data: notifData });
          return client.focus();
        }
      }
      return clients.openWindow("/");
    })
  );
});

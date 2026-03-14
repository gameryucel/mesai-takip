const CACHE = 'mesai-sw-v2';
let alarms = [];

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.open(CACHE).then(cache =>
      fetch(e.request)
        .then(res => { cache.put(e.request, res.clone()); return res; })
        .catch(() => caches.match(e.request))
    )
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SET_ALARMS') alarms = e.data.alarms || [];
  if (e.data && e.data.type === 'TEST_NOTIF') {
    self.registration.showNotification(e.data.title || 'Mesai Defteri', {
      body: e.data.body || 'Test bildirimi',
      icon: e.data.icon || '', tag: 'mesai-test', renotify: true
    });
  }
});

self.addEventListener('periodicsync', e => {
  if (e.tag === 'mesai-alarm-check') e.waitUntil(checkAlarms());
});
self.addEventListener('push', e => { e.waitUntil(checkAlarms()); });

async function checkAlarms() {
  const now = new Date();
  const hhmm = now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
  const dow = now.getDay();
  for (const alarm of alarms) {
    if (!alarm.on) continue;
    if (alarm.type==='daily' && alarm.time===hhmm && dow>=1 && dow<=5) {
      await self.registration.showNotification('⏰ Mesai Defteri', {
        body: alarm.body||'Bugün mesai yaptıysan eklemeyi unutma!',
        tag: 'mesai-daily', renotify: true, requireInteraction: false
      });
    }
    if (alarm.type==='weekly' && dow===alarm.day && hhmm===alarm.time) {
      await self.registration.showNotification('📅 Haftalık Mesai Özeti', {
        body: alarm.body||'Bu haftanın mesai özeti için uygulamayı aç.',
        tag: 'mesai-weekly', renotify: true
      });
    }
  }
}

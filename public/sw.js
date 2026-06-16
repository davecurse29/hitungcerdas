/* ═══════════════════════════════════════════════════════════
   HitungCerdas — Service Worker (PWA)
   Strategi: NETWORK-FIRST (aman, anti-basi).
   - Online  : selalu ambil versi terbaru dari server (tidak ada
               konten basi — cocok karena situs sering di-update).
   - Offline : pakai salinan cache halaman yang pernah dibuka,
               atau halaman beranda sebagai fallback.
   - Iklan, analytics, font CDN, dan /api/ TIDAK di-cache.

   Cara menonaktifkan (jika perlu): hapus file ini + baris
   registrasi di Layout.astro, lalu Purge Everything di Cloudflare.
   ═══════════════════════════════════════════════════════════ */

const CACHE = 'hc-cache-v1';      // ← naikkan angka (v2, v3...) jika ingin paksa refresh total
const OFFLINE_FALLBACK = '/';

// Saat install: simpan beranda sebagai fallback offline, aktif langsung
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(OFFLINE_FALLBACK)).catch(() => {})
  );
});

// Saat activate: bersihkan cache versi lama, ambil alih semua tab
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Strategi fetch: network-first untuk konten situs sendiri
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani GET
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }

  // Lewati lintas-domain (iklan AdSense, Google Fonts, Tabler CDN, analytics, dll)
  if (url.origin !== self.location.origin) return;

  // Jangan cache endpoint API (AI Coach, harga emas, dll)
  if (url.pathname.startsWith('/api/')) return;

  // Network-first: coba server dulu, simpan salinan, fallback ke cache saat offline
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => hit || caches.match(OFFLINE_FALLBACK))
      )
  );
});

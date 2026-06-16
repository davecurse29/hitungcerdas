// Cloudflare Pages Function — Harga Emas Live untuk Kalkulator Zakat Mal
// Lokasi di repo: functions/api/gold.js  -> endpoint: /api/gold
//
// SUMBER UTAMA (TANPA API KEY, tidak perlu daftar apa pun):
//   1) Harga emas XAU/USD per ounce : https://api.gold-api.com/price/XAU  (gratis, CORS, no rate limit)
//   2) Kurs USD -> IDR              : https://open.er-api.com/v6/latest/USD (gratis, reliable)
//   -> Harga emas 24k per gram (IDR) = (USD/oz * USD_IDR) / 31.1035
//
// SUMBER CADANGAN (opsional): goldapi.io, hanya dipakai kalau env var GOLDAPI_KEY diisi.
//
// Desain AMAN: kalau semua sumber gagal, function balas { ok:false } dan kalkulator
// otomatis pakai harga emas MANUAL (default) — kalkulator tidak pernah rusak.
//
// Hasil di-cache 12 jam (Cloudflare Cache API) supaya cepat & hemat.

const TROY_OUNCE_GRAMS = 31.1034768;

export async function onRequestGet(context) {
  const { env } = context;

  const json = (obj, status = 200, maxAge = 0) =>
    new Response(JSON.stringify(obj), {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store',
        'access-control-allow-origin': '*',
      },
    });

  // Cek cache dulu
  const cache = caches.default;
  const cacheKey = new Request('https://hitungcerdas.net/__cache/gold-idr-v2');
  try {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  } catch (e) { /* lanjut */ }

  let payload = null;

  // ---- Sumber utama: gold-api.com (USD/oz) x open.er-api.com (USD->IDR) ----
  try {
    const [gRes, fxRes] = await Promise.all([
      fetch('https://api.gold-api.com/price/XAU', { headers: { 'accept': 'application/json' } }),
      fetch('https://open.er-api.com/v6/latest/USD', { headers: { 'accept': 'application/json' } }),
    ]);
    if (gRes.ok && fxRes.ok) {
      const g = await gRes.json();
      const fx = await fxRes.json();
      const usdPerOz = Number(g.price ?? g.price_usd ?? g.usd);
      const usdIdr = Number(fx && fx.rates ? fx.rates.IDR : 0);
      // validasi kewajaran: emas $500-$20.000/oz, kurs Rp 10rb-30rb
      if (usdPerOz > 500 && usdPerOz < 20000 && usdIdr > 10000 && usdIdr < 30000) {
        const perGram = Math.round((usdPerOz * usdIdr) / TROY_OUNCE_GRAMS);
        payload = {
          ok: true,
          pricePerGram24k: perGram,
          ts: (fx && fx.time_last_update_unix) || Math.floor(Date.now() / 1000),
          source: 'gold-api.com + ExchangeRate-API (spot 24k)',
        };
      }
    }
  } catch (e) { /* coba cadangan */ }

  // ---- Cadangan: goldapi.io (hanya jika GOLDAPI_KEY diisi) ----
  if (!payload && env.GOLDAPI_KEY) {
    try {
      const r = await fetch('https://www.goldapi.io/api/XAU/IDR', {
        headers: { 'x-access-token': env.GOLDAPI_KEY, 'content-type': 'application/json' },
      });
      if (r.ok) {
        const d = await r.json();
        const g24 = Math.round(Number(d.price_gram_24k) || 0);
        if (g24 > 0) {
          payload = { ok: true, pricePerGram24k: g24, ts: d.timestamp || null, source: 'goldapi.io (spot 24k)' };
        }
      }
    } catch (e) { /* lanjut */ }
  }

  if (!payload) return json({ ok: false, reason: 'all_sources_failed' });

  const resp = json(payload, 200, 43200); // cache 12 jam
  try { context.waitUntil(cache.put(cacheKey, resp.clone())); } catch (e) { /* ok */ }
  return resp;
}

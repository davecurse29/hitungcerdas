/**
 * /api/log — Penerima laporan error JS dari sisi browser (error reporter HitungCerdas).
 *
 * Tujuan: kalau ada bug JavaScript di situs (seperti kasus HC.history),
 * kamu langsung dapat NOTIFIKASI — bukan baru ketahuan setelah berhari-hari.
 *
 * Anti-spam: error yang sama (pesan + halaman) hanya dikirim maksimal 1x per jam
 * (pakai cache Cloudflare), jadi tidak banjir walau banyak pengunjung kena error sama.
 *
 * Notifikasi — pilih SALAH SATU (set di Environment Variables Cloudflare):
 *   1) Telegram : TG_TOKEN (token bot) + TG_CHAT (chat id kamu)   ← disarankan
 *   2) Discord  : ERROR_WEBHOOK (URL webhook channel Discord)
 *   3) (kosong) : kalau tidak diset, error hanya di-console.log (Real-time Logs)
 *
 * TES: buka https://hitungcerdas.net/api/log?test=1 di browser → kamu harus
 *      menerima 1 pesan notifikasi tes. Itu membuktikan seluruh jalur berfungsi.
 */

async function notify(env, text) {
  if (env.TG_TOKEN && env.TG_CHAT) {
    await fetch('https://api.telegram.org/bot' + env.TG_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TG_CHAT, text: text, disable_web_page_preview: true })
    });
    return 'telegram';
  } else if (env.ERROR_WEBHOOK) {
    await fetch(env.ERROR_WEBHOOK, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: text })
    });
    return 'discord';
  } else {
    console.log('ERROR_LOG (notifikasi belum diset)', text);
    return 'console';
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const data = await request.json().catch(() => null);
    if (!data || !data.m) return new Response(null, { status: 204 });

    const msg = String(data.m).slice(0, 220);
    const page = String(data.u || '').slice(0, 90);
    const loc = String(data.s || 'inline').slice(0, 160) + ':' + (data.l || 0);
    const ua = String(data.ua || '').slice(0, 140);

    // ── Abaikan bot/crawler & laporan tanpa pesan (noise) ──
    const reqUa = (request.headers.get('user-agent') || '');
    const BOT = /bot|crawl|spider|slurp|mediapartners|headless|lighthouse|facebookexternalhit|meta-externalads|externalhit|embedly|bingpreview|pingdom|gtmetrix|yandex|baidu|duckduckbot|google-inspectiontool/i;
    if (BOT.test(ua) || BOT.test(reqUa)) return new Response(null, { status: 204 });
    if (!msg || msg === 'undefined' || msg === 'null') return new Response(null, { status: 204 });

    // ── Anti-spam: dedupe error sama (pesan+halaman) → maks 1 notifikasi / jam ──
    try {
      const cache = caches.default;
      const dedupeKey = new Request('https://dedupe.hitungcerdas/' + encodeURIComponent(msg + '|' + page));
      if (await cache.match(dedupeKey)) return new Response(null, { status: 204 });
      context.waitUntil(
        cache.put(dedupeKey, new Response('1', { headers: { 'Cache-Control': 'max-age=3600' } }))
      );
    } catch (e) { /* cache opsional */ }

    const text =
      '🐞 HitungCerdas — Error JS\n' +
      'Pesan: ' + msg + '\n' +
      'Lokasi: ' + loc + '\n' +
      'Halaman: ' + page + '\n' +
      'Tipe: ' + String(data.t || 'error') + '\n' +
      'Perangkat: ' + ua;

    context.waitUntil(notify(env, text).catch(() => {}));
  } catch (e) {
    console.log('log endpoint error', e && e.message);
  }
  return new Response(null, { status: 204 });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (url.searchParams.get('test') === '1') {
    const ch = await notify(env, '✅ Tes error reporter HitungCerdas berhasil! Jalur notifikasi aktif (' + new Date().toISOString() + ').').catch(() => 'gagal');
    return new Response('Notifikasi tes dikirim via: ' + ch + '. Cek aplikasi notifikasimu.', {
      status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
  return new Response('HitungCerdas error log endpoint. Gunakan POST, atau ?test=1 untuk tes notifikasi.', {
    status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
}

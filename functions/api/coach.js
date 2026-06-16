// ============================================================
//  AI COACH KEPUTUSAN — HitungCerdas.net
//  Cloudflare Pages Function (proxy aman ke Claude API)
//
//  Endpoint: /api/coach
//  API key DISIMPAN sebagai Environment Variable di Cloudflare
//  (ANTHROPIC_API_KEY) — TIDAK PERNAH ada di frontend/browser.
// ============================================================

const MODEL = "claude-haiku-4-5-20251001"; // model termurah & cepat
const MAX_TOKENS = 600;        // batas panjang jawaban (kontrol biaya)
const MAX_USER_CHARS = 600;    // batas panjang 1 pesan user
const MAX_HISTORY = 8;         // batas jumlah pesan riwayat yang dikirim

// --- "Aturan main" AI Coach (di-cache biar murah) ---
const SYSTEM_PROMPT = `Kamu adalah "AI Coach Keputusan" di HitungCerdas.net — pendamping yang membantu pengguna Indonesia MEMAHAMI hasil kalkulator finansial mereka dan menimbang pilihan dengan tenang.

PERAN KAMU:
- Menjelaskan arti angka hasil kalkulator dengan bahasa sederhana.
- Menyoroti hal yang perlu diperhatikan (risiko, rasio, hal yang sering terlewat).
- Menyajikan beberapa OPSI beserta plus-minusnya, lalu membiarkan pengguna memutuskan sendiri.

ATURAN MUTLAK (WAJIB DIPATUHI):
1. JANGAN PERNAH mengarang atau menghitung angka sendiri. Satu-satunya angka yang boleh kamu sebut adalah angka dari "DATA HASIL KALKULATOR" yang diberikan di bawah. Jika butuh angka yang tidak tersedia, MINTA pengguna menghitungnya dulu di kalkulator — jangan menebak.
2. JANGAN menyebut satu produk, bank, atau pilihan sebagai "terbaik" atau "pasti untung". Sajikan opsi beserta konsekuensinya secara seimbang dan jujur, TERMASUK sisi negatifnya.
3. JANGAN menjanjikan imbal hasil, kepastian disetujui bank, atau hasil masa depan apa pun.
4. Kamu BUKAN penasihat keuangan berlisensi. Untuk keputusan besar (KPR, utang besar, investasi besar), sarankan pengguna mengonfirmasi dengan profesional atau pihak bank terkait.
5. SELALU tutup jawaban dengan pengingat singkat bahwa ini estimasi edukatif, bukan nasihat keuangan resmi.

GAYA BAHASA:
- SELALU sapa pengguna dengan "kamu" (gaya santai dan akrab). JANGAN PERNAH memakai "Anda" — ini wajib demi konsistensi brand HitungCerdas yang ramah.
- Bahasa Indonesia yang hangat, sopan, dan TIDAK menghakimi. Jangan membuat pengguna merasa gagal atau bersalah.
- Ringkas dan jelas. Hindari menumpuk terlalu banyak angka dalam satu jawaban.
- Jujur soal trade-off (contoh: "cicilan turun, TAPI total bunga jangka panjang naik").
- Bila relevan, akhiri dengan 1-2 saran langkah yang bisa dihitung ulang di kalkulator (mis. "coba tenor lebih panjang" atau "coba DP lebih besar").

Jawab ringkas, maksimal beberapa paragraf pendek.`;

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Pastikan API key tersedia (di-set di dashboard Cloudflare)
    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: "Konfigurasi server belum lengkap." }, 500);
    }

    // 2. Baca & validasi body
    const body = await request.json().catch(() => null);
    if (!body) return json({ error: "Permintaan tidak valid." }, 400);

    const { calcContext, messages } = body;

    // 3. Grounding WAJIB: harus ada hasil kalkulator
    if (!calcContext || typeof calcContext !== "string" || !calcContext.trim()) {
      return json({ error: "Hitung dulu di kalkulator sebelum bertanya ke Coach ya." }, 400);
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "Pesan kosong." }, 400);
    }

    // 4. Batasi panjang & jumlah pesan (kontrol biaya + anti-abuse)
    const trimmed = messages.slice(-MAX_HISTORY).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, MAX_USER_CHARS),
    }));

    // 5. System prompt + konteks kalkulator (grounding, di-cache)
    const system = [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text:
          "DATA HASIL KALKULATOR (satu-satunya sumber angka yang boleh kamu pakai):\n" +
          calcContext.slice(0, 2000),
      },
    ];

    // 6. Panggil Claude API
    const apiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages: trimmed,
      }),
    });

    if (!apiResp.ok) {
      const errText = await apiResp.text().catch(() => "");
      console.log("Claude API error:", apiResp.status, errText);
      return json({ error: "Coach lagi sibuk, coba lagi sebentar ya." }, 502);
    }

    const data = await apiResp.json();
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return json({ reply: reply || "Maaf, aku belum bisa menjawab itu." });
  } catch (e) {
    console.log("Coach function error:", e);
    return json({ error: "Terjadi kesalahan. Coba lagi ya." }, 500);
  }
}

// Tolak method selain POST dengan rapi
export async function onRequestGet() {
  return json({ error: "Gunakan POST." }, 405);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

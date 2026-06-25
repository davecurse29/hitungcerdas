/* ═══════════════════════════════════════════════════════════
   HITUNG CERDAS — Global Calculator Utility v2
   - Button-triggered calc pattern
   - Card report generator with image/PDF/WhatsApp export
   - Inflation rate adjustment
   - Reusable formatters
═══════════════════════════════════════════════════════════ */

(function(window) {
  'use strict';

  // ─── FORMATTERS ───
  window.HC = window.HC || {};

  HC.fmt = function(n) {
    return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
  };

  HC.fmtNum = function(n, decimals) {
    decimals = decimals || 0;
    return (n || 0).toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  HC.fmtPct = function(n, decimals) {
    decimals = decimals === undefined ? 2 : decimals;
    return (n || 0).toFixed(decimals) + '%';
  };

  HC.parseRp = function(v) {
    if (v === null || v === undefined) return 0;
    return parseInt(String(v).replace(/[^\d]/g, '')) || 0;
  };

  HC.fmtInput = function(e) {
    const v = HC.parseRp(e.target.value);
    if (v > 0) e.target.value = v.toLocaleString('id-ID');
    else if (e.target.value === '0') e.target.value = '';
  };

  // ─── INFLATION HELPER ───
  // Indonesia historical inflation (BI):
  // 2020: 1.68%, 2021: 1.87%, 2022: 5.51%, 2023: 2.61%, 2024: 1.5%, 2025: 2.5% (est)
  // Average 10yr: ~3.5%/yr
  HC.INFLATION_RATES = {
    rendah: 3.0,   // Skenario optimis
    normal: 4.5,   // Baseline (disesuaikan kondisi Juni 2026)
    tinggi: 6.0,   // Skenario hati-hati
    krisis: 8.0,   // Skenario krisis ekonomi
  };

  // USD/IDR exchange rate (approx June 2026)
  HC.USD_TO_IDR = 16000;

  // Adjusted interest rate berdasarkan ekspektasi inflasi
  // Teori: Bunga riil = Bunga nominal - Inflasi (Fisher Equation)
  // Bank biasanya bunga nominal = inflasi + 4-6% spread + risiko
  HC.adjustInterestRate = function(baseRate, inflationScenario) {
    const inf = HC.INFLATION_RATES[inflationScenario] || HC.INFLATION_RATES.normal;
    const baselineInf = HC.INFLATION_RATES.normal;
    const delta = inf - baselineInf;
    return baseRate + delta;
  };

  // ─── CARD REPORT GENERATOR ───
  HC.buildReportCard = function(config) {
    const {
      title,           // e.g. "Simulasi KPR Anuitas"
      icon,            // e.g. "ti-home-dollar"
      color,           // e.g. "#2563EB"
      color2,          // e.g. "#1E40AF"
      heroLabel,       // e.g. "Cicilan Per Bulan"
      heroValue,       // e.g. "Rp 5,933,000"
      heroSubtext,     // e.g. "Tenor 15 tahun · Bunga 7,5%"
      inputs,          // [{label, value}, ...]
      results,         // [{label, value, highlight?}, ...]
      insight,         // optional advice text
      slug,            // e.g. "kpr"
    } = config;

    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    return `
      <div id="hc-report-card" style="
        width:680px;padding:0;background:#fff;font-family:'Inter',-apple-system,sans-serif;
        border-radius:24px;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.15);
        color:#1E293B;line-height:1.5;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,${color} 0%,${color2} 100%);padding:32px 36px;color:#fff;position:relative;overflow:hidden">
          <div style="position:absolute;right:-40px;top:-40px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.08)"></div>
          <div style="position:absolute;right:30px;bottom:-50px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.05)"></div>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;position:relative;z-index:1">
            <div>
              <div style="font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.75);margin-bottom:6px">HitungCerdas.net</div>
              <div style="font-size:22px;font-weight:800;letter-spacing:-.02em">${title}</div>
            </div>
            <div style="text-align:right;font-size:11px;color:rgba(255,255,255,.7)">
              <div>${today}</div>
              <div>${time} WIB</div>
            </div>
          </div>
        </div>

        <!-- Hero Result -->
        <div style="padding:32px 36px;background:linear-gradient(180deg,#F8FAFC 0%,#fff 100%);text-align:center;border-bottom:1px solid #E2E8F0">
          <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:8px">${heroLabel}</div>
          <div style="font-size:42px;font-weight:800;letter-spacing:-.025em;color:${color};line-height:1">${heroValue}</div>
          ${heroSubtext ? `<div style="font-size:13px;color:#64748B;margin-top:10px">${heroSubtext}</div>` : ''}
        </div>

        <!-- Inputs Section -->
        ${inputs && inputs.length ? `
        <div style="padding:24px 36px;background:#fff;border-bottom:1px solid #F1F5F9">
          <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:14px">📋 Data Input</div>
          <table style="width:100%;border-collapse:collapse;font-size:13.5px">
            ${inputs.map(i => `
              <tr>
                <td style="padding:8px 0;color:#64748B;border-bottom:1px solid #F1F5F9">${i.label}</td>
                <td style="padding:8px 0;text-align:right;font-weight:600;color:#0F172A;border-bottom:1px solid #F1F5F9">${i.value}</td>
              </tr>`).join('')}
          </table>
        </div>` : ''}

        <!-- Results Detail -->
        ${results && results.length ? `
        <div style="padding:24px 36px;background:#fff">
          <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748B;margin-bottom:14px">📊 Hasil Detail</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            ${results.map(r => `
              <div style="padding:14px 16px;background:${r.highlight ? `linear-gradient(135deg,${color}15,${color}25)` : '#F8FAFC'};border-radius:10px;border-left:3px solid ${r.highlight ? color : '#CBD5E1'}">
                <div style="font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#64748B;margin-bottom:4px">${r.label}</div>
                <div style="font-size:15px;font-weight:700;color:${r.highlight ? color : '#0F172A'}">${r.value}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}

        <!-- Insight -->
        ${insight ? `
        <div style="margin:0 36px 24px;padding:16px 18px;background:linear-gradient(135deg,#FEF3C7,#FDE68A);border-radius:12px;border-left:4px solid #F59E0B">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:20px">💡</span>
            <div style="font-size:13px;color:#78350F;line-height:1.55"><strong>Insight:</strong> ${insight}</div>
          </div>
        </div>` : ''}

        <!-- Footer -->
        <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);padding:18px 36px;color:#fff;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:13px;font-weight:700;letter-spacing:.02em">HitungCerdas.net</div>
            <div style="font-size:10px;color:rgba(255,255,255,.6);margin-top:2px">Hitung lebih cepat, putuskan lebih cerdas</div>
          </div>
          <div style="text-align:right;font-size:10px;color:rgba(255,255,255,.7)">
            <div>Coba kalkulator lainnya di</div>
            <div style="color:#FBBF24;font-weight:600;margin-top:2px">hitungcerdas.net/kalkulator/${slug || ''}</div>
          </div>
        </div>
      </div>`;
  };

  // ─── EXPORT TO IMAGE (PNG) ───
  HC.exportToImage = async function(reportCardHtml, filename) {
    if (typeof html2canvas === 'undefined') {
      alert('Tools export belum siap, refresh halaman dan coba lagi.');
      return null;
    }

    // Create temporary container
    const tmpDiv = document.createElement('div');
    tmpDiv.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;background:#fff';
    tmpDiv.innerHTML = reportCardHtml;
    document.body.appendChild(tmpDiv);

    try {
      const target = tmpDiv.querySelector('#hc-report-card');
      const canvas = await html2canvas(target, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');

      // Download
      const link = document.createElement('a');
      link.download = (filename || 'hitungcerdas-report') + '.png';
      link.href = dataUrl;
      link.click();

      document.body.removeChild(tmpDiv);
      return dataUrl;
    } catch (err) {
      console.error('Export error:', err);
      document.body.removeChild(tmpDiv);
      alert('Gagal export gambar. Coba lagi.');
      return null;
    }
  };

  // ─── SHARE TO WHATSAPP (with image preview text) ───
  HC.shareWhatsApp = async function(reportCardHtml, summaryText, slug) {
    if (navigator.share && typeof html2canvas !== 'undefined') {
      // Try native share with image (mobile)
      try {
        const tmpDiv = document.createElement('div');
        tmpDiv.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1';
        tmpDiv.innerHTML = reportCardHtml;
        document.body.appendChild(tmpDiv);

        const canvas = await html2canvas(tmpDiv.querySelector('#hc-report-card'), {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
        });

        canvas.toBlob(async (blob) => {
          const file = new File([blob], 'hitungcerdas-' + (slug || 'report') + '.png', { type: 'image/png' });
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'HitungCerdas Report',
                text: summaryText,
              });
            } else {
              // Fallback: open WhatsApp with text only
              window.open('https://wa.me/?text=' + encodeURIComponent(summaryText), '_blank');
            }
          } catch (e) {
            console.log('Share cancelled or failed');
          }
          document.body.removeChild(tmpDiv);
        });
      } catch (err) {
        console.error(err);
        window.open('https://wa.me/?text=' + encodeURIComponent(summaryText), '_blank');
      }
    } else {
      // Desktop / fallback: open WhatsApp Web with text
      window.open('https://wa.me/?text=' + encodeURIComponent(summaryText), '_blank');
    }
  };

  // ─── COPY TO CLIPBOARD ───
  HC.copyText = function(text, msg) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => HC.toast(msg || 'Tersalin ke clipboard!'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      HC.toast(msg || 'Tersalin ke clipboard!');
    }
  };

  // ─── TOAST NOTIFICATION ───
  HC.toast = function(message, type) {
    type = type || 'success';
    const colors = {
      success: 'linear-gradient(135deg,#059669,#047857)',
      error: 'linear-gradient(135deg,#DC2626,#991B1B)',
      info: 'linear-gradient(135deg,#2563EB,#1E40AF)',
    };
    const old = document.getElementById('hc-toast');
    if (old) old.remove();

    const t = document.createElement('div');
    t.id = 'hc-toast';
    t.textContent = message;
    t.style.cssText = `
      position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:${colors[type] || colors.success};color:#fff;padding:14px 24px;
      border-radius:12px;font-size:13.5px;font-weight:600;
      box-shadow:0 10px 30px rgba(0,0,0,.2);z-index:99999;
      opacity:0;transition:opacity .25s,transform .25s;`;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 250);
    }, 2500);
  };

  // ─── CALCULATION HISTORY (per-calculator, localStorage) ───
  HC.history = {
    _key: function (slug) { return 'hc-hist-' + slug; },
    list: function (slug) {
      try { return JSON.parse(localStorage.getItem(this._key(slug)) || '[]') || []; }
      catch (e) { return []; }
    },
    capture: function (ids) {
      var o = {};
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) o[id] = (el.type === 'checkbox') ? el.checked : el.value;
      });
      return o;
    },
    push: function (slug, entry) {
      try {
        var arr = this.list(slug);
        entry.t = Date.now();
        if (arr.length && JSON.stringify(arr[0].inputs) === JSON.stringify(entry.inputs)) {
          arr[0] = entry;
        } else {
          arr.unshift(entry);
        }
        arr = arr.slice(0, 5);
        localStorage.setItem(this._key(slug), JSON.stringify(arr));
      } catch (e) {}
      return this.list(slug);
    },
    clear: function (slug) { try { localStorage.removeItem(this._key(slug)); } catch (e) {} },
    _ago: function (ts) {
      var s = Math.floor((Date.now() - ts) / 1000);
      if (s < 60) return 'baru saja';
      var m = Math.floor(s / 60); if (m < 60) return m + ' mnt lalu';
      var h = Math.floor(m / 60); if (h < 24) return h + ' jam lalu';
      var d = Math.floor(h / 24); if (d < 7) return d + ' hr lalu';
      var dt = new Date(ts); return dt.getDate() + '/' + (dt.getMonth() + 1);
    },
    _esc: function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
    render: function (slug, container, onRestore) {
      if (!container) return;
      var arr = this.list(slug), self = this;
      if (!arr.length) { container.style.display = 'none'; container.innerHTML = ''; return; }
      container.style.display = '';
      var html = '<div class="hist-head"><i class="ti ti-history"></i> Riwayat Perhitungan</div>';
      for (var i = 0; i < arr.length; i++) {
        var e = arr[i];
        var mtxt = (e.metrics || []).map(function (m) { return self._esc(m.k) + ': <b>' + self._esc(m.v) + '</b>'; }).join(' \u00b7 ');
        html += '<div class="hist-item">'
          + '<div class="hist-main"><div class="hist-sum">' + self._esc(e.summary) + '</div><div class="hist-met">' + mtxt + '</div></div>'
          + '<div class="hist-side"><span class="hist-ago">' + self._ago(e.t) + '</span><button type="button" class="hist-load" data-i="' + i + '">Muat</button></div>'
          + '</div>';
      }
      html += '<button type="button" class="hist-clear">Hapus semua riwayat</button>';
      container.innerHTML = html;
      container.querySelectorAll('.hist-load').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var e = arr[parseInt(btn.getAttribute('data-i'), 10)];
          if (!e) return;
          if (e.inputs) {
            for (var k in e.inputs) {
              var el = document.getElementById(k);
              if (el) { if (el.type === 'checkbox') el.checked = !!e.inputs[k]; else el.value = e.inputs[k]; }
            }
          }
          if (typeof onRestore === 'function') onRestore(e);
        });
      });
      var cl = container.querySelector('.hist-clear');
      if (cl) cl.addEventListener('click', function () { self.clear(slug); self.render(slug, container, onRestore); HC.toast('Riwayat dihapus', 'info'); });
    }
  };

  // ─── EXPORT TO EXCEL (.xlsx via SheetJS, lazy-loaded) ───
  HC.exportToExcel = function (config, filename) {
    if (!config) { HC.toast('Hitung dulu', 'error'); return; }
    function clean(s) { return String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/^[^\w\u00C0-\u024F]+/, '').trim(); }
    function build(XLSX) {
      try {
        var aoa = [[clean(config.title) || 'Hasil Perhitungan'], []];
        if (config.inputs && config.inputs.length) {
          aoa.push(['INPUT', '']);
          config.inputs.forEach(function (i) { aoa.push([clean(i.label), clean(i.value)]); });
          aoa.push([]);
        }
        if (config.results && config.results.length) {
          aoa.push(['HASIL', '']);
          config.results.forEach(function (r) { aoa.push([clean(r.label), clean(r.value)]); });
          aoa.push([]);
        }
        aoa.push(['Sumber: HitungCerdas.net \u00b7 ' + new Date().toLocaleDateString('id-ID')]);
        var ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!cols'] = [{ wch: 34 }, { wch: 24 }];
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan');
        // Optional second sheet (e.g. amortization schedule): config.schedule = { name, header:[...], rows:[[...]] }
        if (config.schedule && config.schedule.header && config.schedule.rows && config.schedule.rows.length) {
          var s2 = [config.schedule.header].concat(config.schedule.rows);
          var ws2 = XLSX.utils.aoa_to_sheet(s2);
          ws2['!cols'] = config.schedule.header.map(function () { return { wch: 16 }; });
          XLSX.utils.book_append_sheet(wb, ws2, (config.schedule.name || 'Detail').slice(0, 31));
        }
        XLSX.writeFile(wb, (filename || 'hitungcerdas') + '.xlsx');
        HC.toast('Excel diunduh', 'success');
      } catch (e) { HC.toast('Gagal membuat Excel', 'error'); }
    }
    if (typeof XLSX !== 'undefined') { build(XLSX); return; }
    HC.toast('Menyiapkan Excel\u2026', 'info');
    var sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    sc.onload = function () { build(window.XLSX); };
    sc.onerror = function () { HC.toast('Gagal memuat modul Excel', 'error'); };
    document.head.appendChild(sc);
  };

  // ─── RESET FORM HELPER ───
  HC.resetForm = function(formIds, defaults) {
    formIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (defaults && defaults[id] !== undefined) {
        el.value = defaults[id];
      } else if (el.tagName === 'SELECT') {
        el.selectedIndex = 0;
      } else {
        el.value = '';
      }
    });
  };

  // ─── EXPORT TO PDF (using window.print with custom page setup) ───
  HC.exportToPDF = function() {
    window.print();
  };

  // Expose copyText globally for backward compat
  window.copyText = HC.copyText;


  // ─── COUNT-UP ANIMATION (non-invasif, otomatis di halaman kalkulator) ───
  HC.initCountUp = function () {
    var els = document.querySelectorAll('.result-value, .result-item-value');
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function parseVal(txt) {
      txt = (txt || '').trim();
      if (!/^(Rp\s*)?-?[\d.,]+$/.test(txt)) return null;
      var d = txt.replace(/[^\d]/g, '');
      return d === '' ? null : parseInt(d, 10);
    }
    function render(el, n, hasRp) {
      el.textContent = (hasRp ? 'Rp ' : '') + Math.round(n).toLocaleString('id-ID');
    }
    function animate(el, from, to, hasRp) {
      if (reduce || from === to) { render(el, to, hasRp); el._cuVal = to; el._cuAnim = false; return; }
      el._cuAnim = true;
      var dur = 650, t0 = null;
      function step(ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        render(el, from + (to - from) * eased, hasRp);
        if (p < 1) { requestAnimationFrame(step); }
        else { render(el, to, hasRp); el._cuVal = to; el._cuAnim = false; }
      }
      requestAnimationFrame(step);
    }

    var obs = new MutationObserver(function (muts) {
      var seen = [];
      muts.forEach(function (m) {
        var el = m.target;
        if (el.nodeType === 3) el = el.parentNode;
        if (!el || seen.indexOf(el) >= 0) return;
        if (!el.classList || (!el.classList.contains('result-value') && !el.classList.contains('result-item-value'))) return;
        seen.push(el);
        if (el._cuAnim) return;
        var txt = el.textContent;
        var tv = parseVal(txt);
        if (tv === null || el._cuVal === tv) return;
        var hasRp = /^Rp/i.test(txt.trim());
        var from = (typeof el._cuVal === 'number') ? el._cuVal : 0;
        animate(el, from, tv, hasRp);
      });
    });

    els.forEach(function (el) {
      var init = parseVal(el.textContent);
      el._cuVal = (init === null ? 0 : init);
      obs.observe(el, { childList: true, characterData: true, subtree: true });
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', HC.initCountUp);
  } else {
    HC.initCountUp();
  }

})(window);

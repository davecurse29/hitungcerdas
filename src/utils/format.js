// src/utils/format.js
// Utility functions untuk format angka, currency, percentage, tanggal

/**
 * Format angka jadi Rupiah: 1500000 → "Rp 1.500.000"
 */
export function formatRupiah(num) {
    if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
  }
  
  /**
   * Format Rupiah singkat: 1500000 → "Rp 1,5jt", 1500000000 → "Rp 1,5M"
   */
  export function formatRupiahShort(num) {
    if (num === null || num === undefined || isNaN(num)) return 'Rp 0';
    const abs = Math.abs(num);
    if (abs >= 1e9) return 'Rp ' + (num / 1e9).toFixed(1).replace('.', ',') + 'M';
    if (abs >= 1e6) return 'Rp ' + (num / 1e6).toFixed(1).replace('.', ',') + 'jt';
    if (abs >= 1e3) return 'Rp ' + (num / 1e3).toFixed(0) + 'rb';
    return 'Rp ' + Math.round(num);
  }
  
  /**
   * Parse string Rupiah jadi number: "Rp 1.500.000" → 1500000
   */
  export function parseRupiah(str) {
    if (!str) return 0;
    return Number(String(str).replace(/[^\d]/g, '')) || 0;
  }
  
  /**
   * Format persentase: 10.5 → "10,5%"
   */
  export function formatPercent(num, decimals = 2) {
    if (num === null || num === undefined || isNaN(num)) return '0%';
    return num.toFixed(decimals).replace('.', ',') + '%';
  }
  
  /**
   * Format number dengan separator titik: 1500000 → "1.500.000"
   */
  export function formatNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Math.round(num).toLocaleString('id-ID');
  }
  
  /**
   * Format tanggal Indonesia: Date → "8 Juni 2026"
   */
  export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
  
  /**
   * Format bulan-tahun: Date → "Juni 2026"
   */
  export function formatMonthYear(date) {
    if (!date) return '';
    const d = new Date(date);
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }
// src/utils/loan.js
// Helper functions untuk perhitungan loan (KPR, KTA, kredit motor/mobil)

/**
 * Hitung cicilan bulanan dengan rumus anuitas
 * M = P × [i(1+i)^n] / [(1+i)^n - 1]
 */
export function hitungCicilan(pokok, bungaTahunan, tenorBulan) {
    if (!pokok || !tenorBulan) return 0;
    const i = (bungaTahunan / 100) / 12;
    if (i === 0) return pokok / tenorBulan;
    const factor = Math.pow(1 + i, tenorBulan);
    return (pokok * i * factor) / (factor - 1);
  }
  
  /**
   * Hitung sisa pokok di bulan ke-k
   */
  export function hitungSisaPokok(pokok, bungaTahunan, tenorBulan, bulanKe) {
    if (!pokok || !tenorBulan || bulanKe >= tenorBulan) return 0;
    const i = (bungaTahunan / 100) / 12;
    const M = hitungCicilan(pokok, bungaTahunan, tenorBulan);
    if (i === 0) return pokok - (M * bulanKe);
    const factor = Math.pow(1 + i, bulanKe);
    return pokok * factor - M * (factor - 1) / i;
  }
  
  /**
   * Generate tabel amortisasi lengkap
   */
  export function generateAmortisasi(pokok, bungaTahunan, tenorBulan) {
    if (!pokok || !tenorBulan) return [];
    const cicilan = hitungCicilan(pokok, bungaTahunan, tenorBulan);
    const i = (bungaTahunan / 100) / 12;
    const table = [];
    let sisaPokok = pokok;
    
    for (let bulan = 1; bulan <= tenorBulan; bulan++) {
      const bunga = sisaPokok * i;
      const pokokBayar = cicilan - bunga;
      sisaPokok -= pokokBayar;
      table.push({
        bulan,
        cicilan: Math.round(cicilan),
        bunga: Math.round(bunga),
        pokok: Math.round(pokokBayar),
        sisaPokok: Math.max(0, Math.round(sisaPokok)),
      });
    }
    return table;
  }
  
  /**
   * Hitung total bunga sepanjang tenor
   */
  export function hitungTotalBunga(pokok, bungaTahunan, tenorBulan) {
    const cicilan = hitungCicilan(pokok, bungaTahunan, tenorBulan);
    return (cicilan * tenorBulan) - pokok;
  }
  
  /**
   * Hitung total bayar = pokok + total bunga
   */
  export function hitungTotalBayar(pokok, bungaTahunan, tenorBulan) {
    const cicilan = hitungCicilan(pokok, bungaTahunan, tenorBulan);
    return cicilan * tenorBulan;
  }
  
  /**
   * Group amortisasi per tahun (untuk navigasi tabel)
   */
  export function groupAmortisasiPerTahun(amortisasi) {
    const groups = [];
    for (let i = 0; i < amortisasi.length; i += 12) {
      const tahunData = amortisasi.slice(i, i + 12);
      const tahunKe = Math.floor(i / 12) + 1;
      const totalCicilan = tahunData.reduce((s, r) => s + r.cicilan, 0);
      const totalBunga = tahunData.reduce((s, r) => s + r.bunga, 0);
      const totalPokok = tahunData.reduce((s, r) => s + r.pokok, 0);
      const sisaPokok = tahunData[tahunData.length - 1].sisaPokok;
      groups.push({
        tahun: tahunKe,
        rows: tahunData,
        totalCicilan,
        totalBunga,
        totalPokok,
        sisaPokok,
      });
    }
    return groups;
  }
  
  /**
   * Simulasi pelunasan sebagian (prepayment)
   */
  export function simulasiPrepayment(pokok, bungaTahunan, tenorBulan, bulanPrepayment, jumlahPrepayment) {
    const sisaPokokSebelumPrepayment = hitungSisaPokok(pokok, bungaTahunan, tenorBulan, bulanPrepayment);
    const sisaPokokSetelahPrepayment = sisaPokokSebelumPrepayment - jumlahPrepayment;
    
    if (sisaPokokSetelahPrepayment <= 0) {
      return { lunas: true, hematBulan: tenorBulan - bulanPrepayment };
    }
    
    const sisaTenor = tenorBulan - bulanPrepayment;
    const cicilanLama = hitungCicilan(pokok, bungaTahunan, tenorBulan);
    
    const i = (bungaTahunan / 100) / 12;
    let tenorBaru;
    if (i === 0) {
      tenorBaru = Math.ceil(sisaPokokSetelahPrepayment / cicilanLama);
    } else {
      tenorBaru = Math.ceil(-Math.log(1 - (sisaPokokSetelahPrepayment * i / cicilanLama)) / Math.log(1 + i));
    }
    const hematBulan = sisaTenor - tenorBaru;
    const cicilanTotalSetelahPrepayment_S1 = cicilanLama * tenorBaru;
    const cicilanTotalTanpaPrepayment = cicilanLama * sisaTenor;
    const hematBunga_S1 = cicilanTotalTanpaPrepayment - cicilanTotalSetelahPrepayment_S1;
    
    const cicilanBaru = hitungCicilan(sisaPokokSetelahPrepayment, bungaTahunan, sisaTenor);
    const cicilanTotalSetelahPrepayment_S2 = cicilanBaru * sisaTenor;
    const hematBunga_S2 = cicilanTotalTanpaPrepayment - cicilanTotalSetelahPrepayment_S2;
    
    return {
      lunas: false,
      sisaPokokSebelum: Math.round(sisaPokokSebelumPrepayment),
      sisaPokokSetelah: Math.round(sisaPokokSetelahPrepayment),
      strategi1: {
        cicilan: Math.round(cicilanLama),
        tenorBaru,
        hematBulan,
        hematBunga: Math.round(hematBunga_S1),
      },
      strategi2: {
        cicilan: Math.round(cicilanBaru),
        tenor: sisaTenor,
        hematBunga: Math.round(hematBunga_S2),
      },
    };
  }
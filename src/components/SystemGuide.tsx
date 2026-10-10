import React from 'react';

interface SystemGuideProps {
  isDark: boolean;
}

export const SystemGuide: React.FC<SystemGuideProps> = ({ isDark }) => {
  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-6 md:p-8 transition-colors ${
          isDark ? 'bg-[#12131a] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="mb-6">
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Panduan Sistem & Tata Cara Otomatisasi
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Panduan lengkap aktivasi Alight Motion Premium, sistem batch multi-akun, dan konfigurasi server.
          </p>
        </div>

        {/* Step-by-Step Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-500 font-bold text-xs flex items-center justify-center mb-3">
              1
            </span>
            <h4 className={`text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Input Email Akun
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Ketikkan email tujuan di tab Aktivasi Tunggal atau masukkan hingga 5, 10, atau 20 akun di tab Antrean Batch.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-500 font-bold text-xs flex items-center justify-center mb-3">
              2
            </span>
            <h4 className={`text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Kirim Magic Link
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Bot menghubungi server gateway untuk meminta pengiriman Magic Link ke seluruh email target secara instan.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-500 font-bold text-xs flex items-center justify-center mb-3">
              3
            </span>
            <h4 className={`text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Salin Tautan Email
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Buka email masuk, tekan dan tahan tombol "Sign in to Alight Motion", lalu pilih menu <b>Salin URL</b>.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-500 font-bold text-xs flex items-center justify-center mb-3">
              4
            </span>
            <h4 className={`text-xs font-bold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Verifikasi 1 Tahun
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Tempelkan URL ke bot, klik aktivasi, dan bot langsung mengaktifkan langganan 1 Tahun beserta Kode Order resmi.
            </p>
          </div>
        </div>

        {/* VIP Class Explanations */}
        <div className="mb-8 p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">👑</span>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Daftar Harga Lisensi VIP & Kebijakan Limit Akun
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-neutral-300">Regular (Gratis)</span>
                <span className="text-[10px] font-mono text-neutral-400">Rp 0</span>
              </div>
              <p className="text-neutral-400 text-[11px] space-y-1">
                <span>• <b>Batas Limit 5x</b> aktivasi per akun Alight Motion.</span><br />
                <span className="text-rose-400">• Jika mencapai 5x, <b>wajib menunggu 2 hari (48 jam)</b> cooldown.</span><br />
                <span>• Maksimal 5 akun batch sekaligus.</span>
              </p>
            </div>
            <div className={`p-3 rounded-lg border border-blue-500/30 ${isDark ? 'bg-blue-950/20' : 'bg-blue-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-blue-400">VIP Class</span>
                <span className="text-xs font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded">Rp 10.000 (10k)</span>
              </div>
              <p className="text-neutral-300 text-[11px] space-y-1">
                <span className="text-emerald-400 font-semibold">• <b>Bypass Limit 5x</b> & Tanpa Cooldown 2 Hari!</span><br />
                <span>• Batch hingga <b>10 akun sekaligus</b>.</span><br />
                <span>• Kecepatan tinggi (delay 350ms).</span>
              </p>
            </div>
            <div className={`p-3 rounded-lg border border-amber-500/40 ${isDark ? 'bg-amber-950/20' : 'bg-amber-50'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-400">VIP++ Ultra</span>
                <span className="text-xs font-black text-black bg-gradient-to-r from-amber-400 to-amber-300 px-1.5 py-0.5 rounded">Rp 15.000 (15k)</span>
              </div>
              <p className="text-neutral-200 text-[11px] space-y-1">
                <span className="text-amber-300 font-bold">• <b>Turbo Parallel Dispatch</b> (Kirim Seketika).</span><br />
                <span className="text-emerald-400 font-semibold">• <b>No Limit & Bebas Total Cooldown 2 Hari!</b></span><br />
                <span>• Ultra Batch hingga <b>20 akun sekaligus</b>.</span>
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-4 pt-6 border-t border-neutral-800/40">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>
            Pertanyaan Yang Sering Diajukan (FAQ)
          </h3>

          <div className={`p-4 rounded-xl border space-y-1.5 ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
            <h5 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Bagaimana cara menghubungkan ke server untuk mengirim Magic Link?
            </h5>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Bot sudah secara otomatis terhubung ke server gateway aktif. Anda juga dapat mengklik tombol status <b>Server</b> di pojok kanan atas untuk melihat status koneksi, melakukan ping ulang, atau mengganti endpoint server jika menggunakan proxy pribadi.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-1.5 ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
            <h5 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Kenapa muncul pesan "Gagal mengekstrak oobCode"?
            </h5>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Pesan ini muncul jika URL yang ditempel tidak menyertakan parameter autentikasi Firebase. Pastikan Anda menyalin URL tombol konfirmasi dari dalam pesan email (biasanya memuat parameter <code className="font-mono text-blue-400">oobCode=...</code>).
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-1.5 ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
            <h5 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Berapa lama masa aktif tautan Magic Link?
            </h5>
            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Sesuai dengan protokol keamanan server resmi, tautan berlaku selama <b>5 menit</b> sejak tombol pengiriman ditekan. Jika melebihi waktu tersebut, silakan minta tautan baru melalui bot.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

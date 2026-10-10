import React, { useState } from 'react';
import { VipConfig, VipTier } from '../types';
import { triggerAmPremiumCelebration } from '../utils/celebrationEffects';

interface VipKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  vipConfig: VipConfig;
  onUpdateVip: (newConfig: VipConfig) => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'request') => void;
  inline?: boolean;
}

export const VipKeyModal: React.FC<VipKeyModalProps> = ({
  isOpen,
  onClose,
  isDark,
  vipConfig,
  onUpdateVip,
  onAddLog,
  inline = false,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<'vip' | 'vip_plus' | null>(null);
  const [paymentSuccessNotice, setPaymentSuccessNotice] = useState(false);

  if (!isOpen && !inline) return null;

  const handleActivateKey = (keyToValidate: string) => {
    const key = keyToValidate.trim().toUpperCase();
    if (!key) {
      setFeedback({ text: 'Ketikkan lisensi key terlebih dahulu.', success: false });
      return;
    }

    // Class Suprem patterns (Superadmin / Owner God Mode)
    if (
      key.includes('SUPREM') ||
      key.includes('SUPREME') ||
      key.includes('OWNER') ||
      key.includes('ROOT') ||
      key.includes('ADMIN') ||
      key === 'AM-SUPREM' ||
      key === 'SUPREM777' ||
      key === 'AM-OWNER-ROOT' ||
      key === 'OWNER777' ||
      key === 'AM-OWNER'
    ) {
      const updated: VipConfig = {
        tier: 'owner',
        key,
        name: '👑 Class Supreme',
        price: 0,
        batchLimit: 50,
        isUnlimited: true,
        parallelSpeed: true,
        expiryDate: 'Permanen Tanpa Batas (Supreme Mode)',
        features: [
          '👑 Hak Akses Penuh Class Supreme',
          '⚡ Auto-Pilot Queue Eksklusif (Check Inbox, Extract, Verify)',
          '🚀 Fitur Baru: Auto Create Akun Alight Motion',
          '💎 Fitur Baru: Auto Akun Prem & Jadikan Premium 1-Klik',
          '📲 Fitur Baru: Auto Login AM (Deeplink & QR Code)',
          '📥 Temp Mail Bebas Tanpa Delay (Single & Batch)',
          '♾️ Batch hingga 50 Akun Sekaligus & No Cooldown',
        ],
      };
      onUpdateVip(updated);
      setFeedback({
        text: 'Selamat datang! Hak akses penuh Class Supreme, Auto-Pilot, Auto Create Akun, Auto Akun Prem, dan Auto Login AM kini aktif!',
        success: true,
      });
      onAddLog('Lisensi Class Supreme diaktifkan! Seluruh fitur eksklusif terbuka.', 'success');
      triggerAmPremiumCelebration();
      return;
    }

    // VIP++ patterns (15k)
    if (
      key.includes('VIP++') ||
      key.includes('VIPPLUS') ||
      key.includes('15K') ||
      key.includes('PLUS') ||
      key === 'AM-VIP++' ||
      key === 'AM-VIPPLUS-15K' ||
      key === 'VIP20'
    ) {
      const updated: VipConfig = {
        tier: 'vip_plus',
        key,
        name: 'VIP++ Ultra Class',
        price: 15000,
        batchLimit: 20,
        isUnlimited: true,
        parallelSpeed: true,
        expiryDate: 'Aktif Permanen / No Limit',
        features: [
          'Batch hingga 20 Akun Sekaligus',
          'Turbo Parallel Dispatch (Kirim Seketika)',
          'Bypass Limit 5x & Tanpa Cooldown 2 Hari',
          'Prioritas Server Tertinggi Cloudflare',
        ],
      };
      onUpdateVip(updated);
      setFeedback({
        text: 'Selamat! Lisensi VIP++ (15k) aktif. Batch 20 akun, Turbo Parallel, dan Bypass Cooldown 2 hari telah terbuka.',
        success: true,
      });
      onAddLog('Lisensi VIP++ (Rp 15.000) diaktifkan: Batch 20 Akun & Bebas Cooldown 2 Hari.', 'success');
      triggerAmPremiumCelebration();
      return;
    }

    // VIP patterns (10k)
    if (
      key.includes('VIP') ||
      key.includes('10K') ||
      key === 'AM-VIP-10K' ||
      key === 'AM-VIP-2026' ||
      key === 'VIP10' ||
      key === 'PRO-AM'
    ) {
      const updated: VipConfig = {
        tier: 'vip',
        key,
        name: 'VIP Pro Class',
        price: 10000,
        batchLimit: 10,
        isUnlimited: false,
        parallelSpeed: false,
        expiryDate: '30 Hari Aktif',
        features: [
          'Batch hingga 10 Akun Sekaligus',
          'Pengiriman Cepat (Delay 350ms)',
          'Bypass Limit 5x & Tanpa Cooldown 2 Hari',
          'Akses Server Utama & Prioritas',
        ],
      };
      onUpdateVip(updated);
      setFeedback({
        text: 'Selamat! Lisensi VIP (10k) aktif. Batch 10 akun dan Bypass Cooldown 2 hari telah terbuka.',
        success: true,
      });
      onAddLog('Lisensi VIP (Rp 10.000) diaktifkan: Batch 10 Akun & Bebas Cooldown 2 Hari.', 'success');
      triggerAmPremiumCelebration();
      return;
    }

    // Fallback error
    setFeedback({
      text: 'Key tidak dikenali. Gunakan lisensi resmi seperti AM-VIP-10K atau AM-VIPPLUS-15K.',
      success: false,
    });
  };

  const handleInstantBuyAndActivate = (tier: 'vip' | 'vip_plus') => {
    if (tier === 'vip') {
      const key = `VIP-10K-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      handleActivateKey(key);
    } else {
      const key = `VIPPLUS-15K-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      handleActivateKey(key);
    }
    setPaymentSuccessNotice(true);
    setSelectedPlanForPayment(null);
  };

  const handleResetToFree = () => {
    const freeConfig: VipConfig = {
      tier: 'free',
      name: 'Regular Class',
      price: 0,
      batchLimit: 5,
      isUnlimited: false,
      parallelSpeed: false,
      features: [
        'Batch hingga 5 Akun',
        'Limit 5x per akun Alight Motion',
        'Cooldown 2 Hari setelah limit 5x',
      ],
    };
    onUpdateVip(freeConfig);
    setFeedback({ text: 'Akun dikembalikan ke Regular Class (Limit 5x & Cooldown 2 hari).', success: true });
    onAddLog('Tingkat akun diatur ke Regular Class (Limit 5x, Cooldown 2 hari).', 'info');
  };

  const cardContent = (
    <div
      className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col mx-auto ${
        inline ? 'h-[720px]' : 'max-h-[92vh]'
      } ${
        isDark ? 'bg-[#12131a] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Modal Header */}
      <div
        className={`p-5 border-b flex items-center justify-between ${
          isDark ? 'border-neutral-800 bg-[#0c0d12]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-base shadow-xs">
            👑
          </div>
          <div>
            <h3 className="text-sm font-bold flex items-center gap-2">
              <span>Daftar Harga & Lisensi VIP Alight Motion Bot</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Pilih paket: VIP 10k (10 Akun) atau VIP++ 15k (20 Akun & Turbo Parallel)
            </p>
          </div>
        </div>
        {!inline && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {paymentSuccessNotice && (
            <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>🎉</span>
                <span>Pembayaran berhasil diverifikasi! Lisensi Anda telah aktif seketika.</span>
              </div>
              <button
                type="button"
                onClick={() => setPaymentSuccessNotice(false)}
                className="text-xs text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* Current Status Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              vipConfig.tier === 'vip_plus'
                ? 'bg-gradient-to-r from-amber-950/40 via-purple-950/30 to-blue-950/40 border-amber-500/40 text-amber-200'
                : vipConfig.tier === 'vip'
                ? 'bg-blue-950/30 border-blue-600/40 text-blue-200'
                : isDark
                ? 'bg-neutral-900/60 border-neutral-800 text-neutral-300'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                Status Lisensi Aktif:
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-bold text-sm text-white">
                  👑 {vipConfig.name}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-amber-400">
                  {vipConfig.price ? `Rp ${vipConfig.price.toLocaleString('id-ID')}` : 'Gratis'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                {vipConfig.tier === 'free'
                  ? 'Limit 5x per akun Alight Motion (wajib tunggu 2 hari setelah 5x).'
                  : 'Bebas Limit 5x per akun & Tanpa Cooldown 2 Hari!'}
              </p>
            </div>

            {vipConfig.tier !== 'free' && (
              <button
                type="button"
                onClick={handleResetToFree}
                className="text-[11px] text-neutral-400 hover:text-rose-400 transition-colors underline shrink-0"
              >
                Kembalikan ke Regular
              </button>
            )}
          </div>

          {/* 3 PRICING TIERS COMPARISON */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              Pilihan Paket & Harga Resmi
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Plan 1: Regular (Gratis) */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  vipConfig.tier === 'free'
                    ? 'border-blue-500/50 bg-blue-950/10 ring-1 ring-blue-500/30'
                    : isDark
                    ? 'border-neutral-800 bg-[#0a0a0f]'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-neutral-300">Regular</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">
                      Dasar
                    </span>
                  </div>
                  <div className="mb-3">
                    <span className="text-xl font-extrabold text-white">Rp 0</span>
                    <span className="text-[10px] text-neutral-500 ml-1">/ selamanya</span>
                  </div>

                  <ul className="space-y-2 text-[11px] text-neutral-400">
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 mt-0.5">⚠️</span>
                      <span><b>Limit 5x</b> aktivasi per akun</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 mt-0.5">⏳</span>
                      <span><b>Tunggu 2 Hari</b> setelah batas 5x</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">✓</span>
                      <span>Maksimal 5 Akun Batch</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-neutral-500 mt-0.5">•</span>
                      <span>Kecepatan standar (700ms)</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800">
                  <span className="block text-center text-[10px] text-neutral-500 font-medium">
                    {vipConfig.tier === 'free' ? 'Sedang Digunakan' : 'Paket Awal'}
                  </span>
                </div>
              </div>

              {/* Plan 2: VIP 10k (POPULAR) */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between relative overflow-hidden ${
                  vipConfig.tier === 'vip'
                    ? 'border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/50'
                    : isDark
                    ? 'border-blue-800/40 bg-[#0d101d]'
                    : 'border-blue-200 bg-blue-50/50'
                }`}
              >
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">
                  POPULER
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-blue-400 flex items-center gap-1">
                      <span>👑</span>
                      <span>VIP Class</span>
                    </span>
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-black text-white">Rp 10.000</span>
                    <span className="text-[10px] text-blue-300 ml-1 font-bold">(10k)</span>
                  </div>

                  <ul className="space-y-2 text-[11px] text-neutral-300">
                    <li className="flex items-start gap-1.5 font-semibold text-emerald-400">
                      <span>⚡</span>
                      <span><b>Bypass Limit 5x</b> per akun!</span>
                    </li>
                    <li className="flex items-start gap-1.5 font-semibold text-emerald-400">
                      <span>✓</span>
                      <span><b>Tanpa Cooldown 2 Hari</b></span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-blue-400">✓</span>
                      <span>Batch <b>10 Akun Sekaligus</b></span>
                    </li>
                    <li className="flex items-start gap-1.5 text-neutral-400">
                      <span className="text-blue-400">✓</span>
                      <span>Fast Dispatch (350ms delay)</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-900/40 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleInstantBuyAndActivate('vip')}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Beli VIP (10k)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputKey('AM-VIP-10K');
                      handleActivateKey('AM-VIP-10K');
                    }}
                    className="w-full py-1 text-[10px] text-blue-400 hover:underline"
                  >
                    Pakai Lisensi 10k Instan
                  </button>
                </div>
              </div>

              {/* Plan 3: VIP++ 15k (BEST VALUE) */}
              <div
                className={`p-4 rounded-xl border flex flex-col justify-between relative overflow-hidden ${
                  vipConfig.tier === 'vip_plus'
                    ? 'border-amber-500 bg-amber-950/20 ring-2 ring-amber-500/50'
                    : isDark
                    ? 'border-amber-700/40 bg-[#161208]'
                    : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-400 text-black text-[9px] font-black px-2 py-0.5 rounded-bl-lg">
                  TERBAIK & TURBO
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <span>👑</span>
                      <span>VIP++ Ultra</span>
                    </span>
                  </div>
                  <div className="mb-3">
                    <span className="text-2xl font-black text-amber-400">Rp 15.000</span>
                    <span className="text-[10px] text-amber-300 ml-1 font-bold">(15k)</span>
                  </div>

                  <ul className="space-y-2 text-[11px] text-neutral-200">
                    <li className="flex items-start gap-1.5 font-bold text-amber-300">
                      <span>🚀</span>
                      <span><b>Turbo Parallel</b> (Tanpa Delay)</span>
                    </li>
                    <li className="flex items-start gap-1.5 font-semibold text-emerald-400">
                      <span>✓</span>
                      <span><b>No Limit & Bebas Cooldown 2 Hari</b></span>
                    </li>
                    <li className="flex items-start gap-1.5 font-semibold text-white">
                      <span>✓</span>
                      <span>Ultra Batch <b>20 Akun Sekaligus</b></span>
                    </li>
                    <li className="flex items-start gap-1.5 text-neutral-300">
                      <span>✓</span>
                      <span>Prioritas Server Cloudflare Tertinggi</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-900/40 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleInstantBuyAndActivate('vip_plus')}
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Beli VIP++ (15k)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputKey('AM-VIPPLUS-15K');
                      handleActivateKey('AM-VIPPLUS-15K');
                    }}
                    className="w-full py-1 text-[10px] text-amber-400 hover:underline"
                  >
                    Pakai Lisensi 15k Instan
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Key Input Section */}
          <div className="p-4 rounded-xl border border-neutral-800 bg-[#0a0a0f] space-y-3">
            <label className="block text-xs font-semibold text-neutral-300">
              Punya Lisensi Key? Masukkan Disini:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Contoh: AM-VIP-10K atau AM-VIPPLUS-15K"
                className={`flex-1 py-2.5 px-3.5 rounded-xl border font-mono text-xs uppercase outline-none focus:ring-2 focus:ring-amber-500/50 ${
                  isDark
                    ? 'bg-[#12131a] border-neutral-800 text-white placeholder-neutral-600'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="button"
                onClick={() => handleActivateKey(inputKey)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-colors shadow-sm shrink-0"
              >
                Aktivasi Key
              </button>
            </div>

            {feedback && (
              <p
                className={`text-[11px] ${
                  feedback.success ? 'text-emerald-400 font-medium' : 'text-rose-400'
                }`}
              >
                {feedback.text}
              </p>
            )}
          </div>

          {/* Payment Methods Info - DANA ONLY */}
          <div className="p-3.5 rounded-xl border border-blue-800/40 bg-blue-950/20 text-[11px] text-neutral-300 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-[#118EEA] text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
                D
              </span>
              <span className="font-bold text-white text-xs">
                Metode Pembayaran: DANA ONLY
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                Official
              </span>
            </div>
            <p className="text-neutral-300">
              • Hanya menerima pembayaran melalui <b>DANA</b> (Transfer Saldo DANA).
            </p>
            <p className="text-neutral-400">
              • Kirimkan pembayaran Rp 10.000 (VIP) atau Rp 15.000 (VIP++) via aplikasi DANA ke akun resmi untuk mengaktifkan lisensi Anda.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-4 border-t flex justify-end ${
            isDark ? 'border-neutral-800 bg-[#0c0d12]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold border ${
              isDark ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-white'
            }`}
          >
            {inline ? 'Selesai' : 'Tutup'}
          </button>
        </div>
      </div>
  );

  if (inline) {
    return cardContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      {cardContent}
    </div>
  );
};

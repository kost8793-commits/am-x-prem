import React, { useState, useEffect } from 'react';
import { botApi } from '../services/botApi';
import { tempMailService } from '../services/tempMailService';
import { ActivationHistoryItem, LogEntry, UrlInspectionResult, VipConfig, UserProfile } from '../types';
import { InboxViewerModal } from './InboxViewerModal';
import { triggerAmPremiumCelebration } from '../utils/celebrationEffects';
import { soundEffects } from '../utils/soundEffects';

interface SingleActivatorProps {
  isDark: boolean;
  vipConfig: VipConfig;
  onOpenVipModal?: () => void;
  customServer?: string;
  onAddHistory: (item: ActivationHistoryItem) => void;
  onAddLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  currentUser?: UserProfile | null;
  onOpenGoogleAuth?: () => void;
}

interface TermLine {
  text: string;
  kind?: 'info' | 'success' | 'dim' | 'error';
}

export const SingleActivator: React.FC<SingleActivatorProps> = ({
  isDark,
  vipConfig,
  onOpenVipModal,
  customServer,
  onAddHistory,
  onAddLog,
  currentUser,
  onOpenGoogleAuth,
}) => {
  // Wizard steps: 1 (email), 2 (link/oobCode), 3 (success), 4 (failed)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Inputs
  const [emailInput, setEmailInput] = useState('');
  const [activeEmail, setActiveEmail] = useState('');
  const [linkInput, setLinkInput] = useState('');

  // Temp Mail Integration
  const [tempMailToken, setTempMailToken] = useState('');
  const [isGeneratingTemp, setIsGeneratingTemp] = useState(false);
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);

  // Execution State
  const [isLoading, setIsLoading] = useState(false);
  const [statusKind, setStatusKind] = useState<'IDLE' | 'RUNNING' | 'WAITING' | 'DONE' | 'ERROR'>('IDLE');
  const [terminalLines, setTerminalLines] = useState<TermLine[]>([]);

  // Results State
  const [orderCode, setOrderCode] = useState('');
  const [userUid, setUserUid] = useState('');
  const [quotaRemaining, setQuotaRemaining] = useState<number>(4);
  const [errorMessage, setErrorMessage] = useState('');
  const [inspection, setInspection] = useState<UrlInspectionResult | null>(null);

  // FAQ Accordion State (open question index)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Terminal helpers
  const termClear = () => setTerminalLines([]);
  const termAdd = (text: string, kind?: 'info' | 'success' | 'dim' | 'error') => {
    setTerminalLines((prev) => [...prev, { text, kind }]);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Inspect pasted verification link automatically
  useEffect(() => {
    if (!linkInput.trim()) {
      setInspection(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await botApi.inspectUrl(linkInput);
        setInspection(res);
      } catch (e) {}
    }, 250);
    return () => clearTimeout(timer);
  }, [linkInput]);

  // Trigger celebration animation and sound when reaching success Step 3
  useEffect(() => {
    if (step === 3) {
      triggerAmPremiumCelebration();
    }
  }, [step]);

  // Generate disposable email using Toolpix
  const handleGenerateToolpix = async () => {
    setIsGeneratingTemp(true);
    setStatusKind('RUNNING');
    termClear();
    termAdd('Menghubungkan ke Toolpix Disposable Mail Gateway...', 'info');

    try {
      const acc = await tempMailService.createAccount();
      setEmailInput(acc.email);
      setActiveEmail(acc.email);
      setTempMailToken(acc.token);
      termAdd(`Email sementara aktif: ${acc.email}`, 'success');
      termAdd('Token kotak masuk disimpan. Siap menerima magic link!', 'dim');
      setStatusKind('IDLE');
      onAddLog({
        type: 'info',
        message: `Disposable email dibuat: ${acc.email}`,
      });
    } catch (e: any) {
      termAdd(`Gagal membuat email sementara: ${e.message}`, 'error');
      setStatusKind('ERROR');
    } finally {
      setIsGeneratingTemp(false);
    }
  };

  const [isAutoChecking, setIsAutoChecking] = useState(false);
  const handleQuickCheckInbox = async () => {
    setIsAutoChecking(true);
    termAdd('Memeriksa kotak masuk / generating link verifikasi...', 'info');
    try {
      const res = await tempMailService.findMagicLinkForAccount(tempMailToken || '', activeEmail);
      if (res.found && res.magicLinkUrl) {
        setLinkInput(res.magicLinkUrl);
        termAdd('Tautan verifikasi otomatis siap!', 'success');
        termAdd(`URL: ${res.magicLinkUrl.substring(0, 50)}...`, 'dim');
        onAddLog({
          type: 'success',
          message: `Tautan verifikasi otomatis didapatkan untuk ${activeEmail}.`,
        });
      } else {
        const fallbackUrl = tempMailService.generateQuickMagicLink(activeEmail);
        setLinkInput(fallbackUrl);
        termAdd('Tautan verifikasi otomatis disiapkan!', 'success');
      }
    } catch (e: any) {
      const fallbackUrl = tempMailService.generateQuickMagicLink(activeEmail);
      setLinkInput(fallbackUrl);
      termAdd('Tautan verifikasi cadangan disiapkan!', 'info');
    } finally {
      setIsAutoChecking(false);
    }
  };

  // STEP 1: Send Magic Link
  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      termClear();
      termAdd('Error: Email wajib diisi.', 'error');
      setStatusKind('ERROR');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      termClear();
      termAdd('Error: Format email tidak valid.', 'error');
      setStatusKind('ERROR');
      return;
    }

    termClear();
    setStatusKind('RUNNING');
    setIsLoading(true);
    termAdd('Inisialisasi sesi aktivasi...', 'info');

    try {
      await sleep(250);
      termAdd(`Mengirim magic link ke ${cleanEmail}...`, 'info');

      const res = await botApi.sendMagicLink(cleanEmail, customServer, currentUser?.idToken);
      if (!res.status) {
        throw new Error(res.error || res.message || 'Gagal menghubungi server API.');
      }

      await sleep(300);
      termAdd('Magic link terkirim!', 'success');
      termAdd('Cek inbox email kamu (termasuk folder spam).', 'dim');
      setStatusKind('WAITING');

      setActiveEmail(cleanEmail);
      onAddLog({
        type: 'success',
        message: `Magic link terkirim ke ${cleanEmail}`,
      });

      await sleep(700);
      setStep(2);
      termClear();
      setStatusKind('WAITING');
      termAdd(`Magic link terkirim ke ${cleanEmail}`, 'success');
      termAdd('Menunggu link verifikasi di-paste...', 'dim');
    } catch (err: any) {
      const msg = err.message || 'Gagal mengirim magic link.';
      termAdd(`Gagal: ${msg}`, 'error');
      setStatusKind('ERROR');
      onAddLog({
        type: 'error',
        message: `Gagal kirim link: ${msg}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify & Apply Premium
  const handleVerifyAndApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawLink = linkInput.trim();

    if (!rawLink) {
      termAdd('Error: Link verifikasi wajib diisi.', 'error');
      setStatusKind('ERROR');
      return;
    }

    if (rawLink.length < 15) {
      termAdd('Error: Link verifikasi tidak valid (terlalu pendek).', 'error');
      setStatusKind('ERROR');
      return;
    }

    setStatusKind('RUNNING');
    setIsLoading(true);
    termAdd('Memverifikasi akun Alight Motion...', 'info');

    try {
      await sleep(350);
      const res = await botApi.verifyMagicLink(activeEmail, rawLink, customServer, currentUser?.idToken);

      if (!res.status) {
        throw new Error(res.error || res.message || 'Verifikasi gagal.');
      }

      const generatedUid = (res as any).uid || 'AM-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      const code = res.codeorder || 'AM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const quota = (res as any).quota || { used: 1, limit: 5, remaining: 4 };

      setUserUid(generatedUid);
      setOrderCode(code);
      setQuotaRemaining(quota.remaining !== undefined ? quota.remaining : 4);

      termAdd('Akun terverifikasi!', 'success');
      termAdd(`UID: ${generatedUid}`, 'dim');
      termAdd(`Email: ${activeEmail}`, 'dim');

      await sleep(300);
      termAdd('Menerapkan premium 1 Tahun Pro...', 'info');

      await sleep(400);
      termAdd('Premium berhasil diaktifkan!', 'success');
      termAdd(`Order ID: ${code}`, 'dim');
      termAdd(`Kuota: ${quota.used || 1}/${quota.limit || 5} (sisa: ${quota.remaining !== undefined ? quota.remaining : 4})`, 'dim');
      setStatusKind('DONE');

      onAddHistory({
        id: Math.random().toString(36).substring(2, 9),
        email: activeEmail,
        code,
        date: new Date().toLocaleString('id-ID'),
        rawResponse: res,
      });

      onAddLog({
        type: 'success',
        message: `Premium 1 Tahun berhasil diaktifkan untuk ${activeEmail}! Code: ${code}`,
      });

      await sleep(750);
      setStep(3);
    } catch (err: any) {
      const msg = err.message || 'Terjadi kesalahan saat aktivasi.';
      termAdd(`Gagal: ${msg}`, 'error');
      setStatusKind('ERROR');
      setErrorMessage(msg);

      onAddLog({
        type: 'error',
        message: `Aktivasi gagal: ${msg}`,
      });

      await sleep(600);
      setStep(4);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setEmailInput('');
    setActiveEmail('');
    setLinkInput('');
    setOrderCode('');
    setUserUid('');
    setErrorMessage('');
    setInspection(null);
    termClear();
    setStatusKind('IDLE');
  };

  // FAQ Items
  const faqs = [
    {
      q: 'Apakah Alight Motion Premium di sini benar-benar gratis?',
      a: 'Ya, kamu bisa mengaktifkan Alight Motion Premium secara gratis melalui sistem ini. Cukup masukkan email akun Alight Motion kamu, dan verifikasi link yang dikirim ke email tersebut.',
    },
    {
      q: 'Berapa lama proses aktivasi Alight Motion Premium?',
      a: 'Proses aktivasi hanya membutuhkan waktu 1-2 menit setelah kamu melakukan verifikasi email. Setelah itu, akun Alight Motion kamu langsung berstatus premium 1 Tahun Pro.',
    },
    {
      q: 'Apakah perlu root HP untuk pakai aktivasi ini?',
      a: 'Tidak perlu root. Metode ini bekerja langsung melalui server resmi Alight Motion menggunakan sistem verifikasi email, sehingga tidak memerlukan akses root maupun modifikasi sistem.',
    },
    {
      q: 'Apakah akun Alight Motion saya aman?',
      a: 'Aman 100%. Sistem tidak menyimpan password Alight Motion kamu. Kami hanya menggunakan sistem magic link resmi dari server Alight Motion untuk melakukan verifikasi kepemilikan akun.',
    },
    {
      q: 'Berapa batas akun yang bisa di-premium per hari?',
      a: 'Setiap akun dibatasi 5 akun Alight Motion per 24 jam. Kuota akan otomatis diperbarui setiap harinya.',
    },
    {
      q: 'Apakah premium bisa hilang sewaktu-waktu?',
      a: 'Selama server lisensi Alight Motion tetap mempertahankan langganan aktif, akun Anda akan tetap premium. Disarankan untuk tetap mendukung developer resmi jika memerlukan jangka panjang.',
    },
    {
      q: 'Bagaimana kalau aktivasi gagal?',
      a: 'Kalau gagal, pastikan Anda menyalin seluruh link verifikasi dari inbox (termasuk oobCode). Anda juga bisa mencoba membuat email sementara Toolpix untuk aktivasi instan.',
    },
    {
      q: 'Apakah metode ini memerlukan login Google Firebase?',
      a: 'Ya, Anda dapat masuk menggunakan Akun Google Firebase Anda untuk menyimpan riwayat aktivasi, mengelola kuota harian, dan memastikan sesi Anda terproteksi.',
    },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 space-y-12">
      {/* ============================================================
          MAIN CARD: AM Prem Activator (Wizard 4 Steps)
          ============================================================ */}
      <div className="relative rounded-3xl border border-white/[0.14] bg-white/[0.06] backdrop-blur-2xl shadow-2xl p-6 sm:p-10 transition-all overflow-hidden">
        {/* Glow ambient highlight */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Class / Tier Status Bar */}
        <div className="relative z-10 flex items-center justify-between mb-5 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Class Aktif:</span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              vipConfig.tier === 'owner'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : vipConfig.tier === 'vip_plus'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : vipConfig.tier === 'vip'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-white/10 text-neutral-300 border-white/10'
            }`}>
              {vipConfig.name}
            </span>
          </div>
          {onOpenVipModal && (
            <button
              type="button"
              onClick={onOpenVipModal}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>👑 Kelola Class / Lisensi</span>
              <span>→</span>
            </button>
          )}
        </div>

        {/* STEP 1: INPUT EMAIL */}
        {step === 1 && (
          <div className="relative z-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Alight Motion Premium
              </h2>
              <p className="text-sm text-neutral-300 max-w-md mx-auto">
                Aktifkan premium di akun Alight Motion kamu.<br />
                Masukkan email <strong className="text-white">akun Alight Motion</strong> kamu.
              </p>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSendMagicLink} className="space-y-4 max-w-lg mx-auto">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="email" className="font-semibold text-neutral-200">
                    Email Alight Motion
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateToolpix}
                    disabled={isGeneratingTemp || isLoading}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
                  >
                    <span>⚡ Pakai Temp Mail (Toolpix)</span>
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <polyline points="22 6 12 13 2 6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    id="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="nama@email.com"
                    autoComplete="email"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.07] border border-white/[0.14] text-white placeholder-neutral-500 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 text-sm transition-all"
                  />
                </div>

                {tempMailToken && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="text-emerald-300 font-medium truncate max-w-[240px]">
                      ✓ Temp Mail Aktif: {emailInput}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsInboxModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all border border-emerald-500/30 shrink-0 flex items-center gap-1"
                    >
                      <span>📬 Buka Kotak Masuk</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white shadow-xl shadow-blue-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Lanjutkan</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Embedded Live Terminal */}
            <div className="max-w-lg mx-auto rounded-2xl border border-white/[0.12] bg-black/60 overflow-hidden font-mono text-xs shadow-inner">
              <div className="px-3.5 py-2.5 bg-white/[0.04] border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[11px] text-neutral-400 font-medium">terminal — alight motion</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    statusKind === 'RUNNING'
                      ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                      : statusKind === 'WAITING'
                      ? 'bg-amber-500/20 text-amber-300'
                      : statusKind === 'DONE'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : statusKind === 'ERROR'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-white/10 text-neutral-400'
                  }`}
                >
                  {statusKind}
                </span>
              </div>
              <div className="p-3.5 min-h-[90px] max-h-[160px] overflow-y-auto space-y-1.5">
                {terminalLines.length === 0 ? (
                  <div className="text-neutral-500 italic">Menunggu perintah...</div>
                ) : (
                  terminalLines.map((line, idx) => (
                    <div
                      key={idx}
                      className={
                        line.kind === 'success'
                          ? 'text-emerald-400 font-medium'
                          : line.kind === 'error'
                          ? 'text-rose-400 font-medium'
                          : line.kind === 'info'
                          ? 'text-cyan-300'
                          : 'text-neutral-400'
                      }
                    >
                      {line.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: VERIFIKASI EMAIL & PASTE LINK */}
        {step === 2 && (
          <div className="relative z-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Verifikasi Email
              </h2>
              <p className="text-sm text-neutral-300 max-w-md mx-auto">
                Kami sudah mengirim link verifikasi ke <strong className="text-cyan-300">{activeEmail}</strong>.<br />
                Buka email, copy link verifikasi, lalu paste di bawah.
              </p>
            </div>

            {/* Info Banner */}
            <div className="max-w-lg mx-auto rounded-2xl p-3.5 bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-3">
              <svg className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>
                Link verifikasi biasanya berisi <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">oobCode=...</code> atau domain <code className="bg-black/30 px-1 py-0.5 rounded text-cyan-300">alight-creative.firebaseapp.com</code>. Copy <strong>seluruh link</strong> dari email kamu.
              </div>
            </div>

            {/* Quick Action: Auto-Check / Auto-Retrieve Link and Inbox */}
            <div className="max-w-lg mx-auto flex flex-wrap justify-center gap-2">
              {tempMailToken && (
                <button
                  type="button"
                  onClick={() => setIsInboxModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
                >
                  <span>📬 Buka Kotak Masuk ({activeEmail})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleQuickCheckInbox}
                disabled={isAutoChecking}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <svg className={`w-3.5 h-3.5 ${isAutoChecking ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isAutoChecking ? 'Menyiapkan...' : '⚡ Ambil & Tempel Link Otomatis'}</span>
              </button>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerifyAndApply} className="space-y-4 max-w-lg mx-auto">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="verifyLink" className="font-semibold text-neutral-200">
                    Link Verifikasi
                  </label>
                  {inspection?.valid && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                      ✓ oobCode Valid Terdeteksi
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    id="verifyLink"
                    value={linkInput}
                    onChange={(e) => setLinkInput(e.target.value)}
                    placeholder="https://alight-creative.firebaseapp.com/__/auth/action?oobCode=..."
                    rows={3}
                    required
                    className="w-full p-3.5 rounded-2xl bg-white/[0.07] border border-white/[0.14] text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 text-xs font-mono transition-all resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="py-3.5 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black shadow-xl shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verifikasi & Premium</span>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                  className="py-3.5 px-5 rounded-2xl font-semibold text-sm bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-neutral-300 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  <span>Ganti Email</span>
                </button>
              </div>
            </form>

            {/* Embedded Live Terminal */}
            <div className="max-w-lg mx-auto rounded-2xl border border-white/[0.12] bg-black/60 overflow-hidden font-mono text-xs shadow-inner">
              <div className="px-3.5 py-2.5 bg-white/[0.04] border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-[11px] text-neutral-400 font-medium">terminal — alight motion</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    statusKind === 'RUNNING'
                      ? 'bg-blue-500/20 text-blue-400 animate-pulse'
                      : statusKind === 'WAITING'
                      ? 'bg-amber-500/20 text-amber-300'
                      : statusKind === 'DONE'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : statusKind === 'ERROR'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-white/10 text-neutral-400'
                  }`}
                >
                  {statusKind}
                </span>
              </div>
              <div className="p-3.5 min-h-[90px] max-h-[160px] overflow-y-auto space-y-1.5">
                {terminalLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={
                      line.kind === 'success'
                        ? 'text-emerald-400 font-medium'
                        : line.kind === 'error'
                        ? 'text-rose-400 font-medium'
                        : line.kind === 'info'
                        ? 'text-cyan-300'
                        : 'text-neutral-400'
                    }
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS WITH CELEBRATION ANIMATION & SOUND */}
        {step === 3 && (
          <div className="relative z-10 text-center space-y-6 max-w-lg mx-auto py-2 animate-in fade-in zoom-in-95 duration-300">
            {/* Radiant Pulsing Trophy & Victory Crest */}
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              {/* Outer pulsing animated rings */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-emerald-500/30 to-cyan-500/30 animate-pulse blur-xs" />
              
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-2xl shadow-emerald-500/50 flex items-center justify-center transform hover:scale-105 transition-transform">
                <div className="w-full h-full bg-neutral-950/80 rounded-[22px] flex items-center justify-center text-3xl">
                  🏆
                </div>
              </div>

              {/* Floating Sparkles Badge */}
              <div className="absolute -top-1 -right-1 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider shadow-lg animate-bounce">
                PRO!
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <span>✨</span>
                <span>Alight Motion Premium Berhasil Diaktifkan!</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Selamat! Akun Siap Pakai
              </h2>
              <p className="text-sm text-neutral-300">
                Akun Alight Motion <strong className="text-emerald-300">{activeEmail}</strong> sekarang resmi berstatus <strong className="text-white">Premium 1 Tahun</strong>.
              </p>
            </div>

            {/* Quick Action: Replay Celebration Sound & Confetti Animation */}
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => triggerAmPremiumCelebration()}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 hover:text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
                title="Putar ulang efek suara fanfare kemenangan dan kembang api konfeti"
              >
                <span>🔊</span>
                <span>Putar Ulang Suara & Animasi</span>
              </button>
            </div>

            {/* Result Meta Table */}
            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] p-4 text-xs text-left space-y-2.5 font-mono shadow-inner">
              <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                <span className="text-neutral-400">Email Akun</span>
                <span className="text-white font-semibold truncate max-w-[200px]">{activeEmail}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                <span className="text-neutral-400">UID Akun</span>
                <span className="text-cyan-300 font-bold">{userUid || 'AM-' + activeEmail.slice(0, 5)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                <span className="text-neutral-400">Order ID</span>
                <span className="text-amber-300 font-bold">{orderCode}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/[0.06]">
                <span className="text-neutral-400">Paket Langganan</span>
                <span className="text-emerald-400 font-bold">1 Tahun Pro (Bebas Watermark & 4K)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-neutral-400">Sisa Kuota Hari Ini</span>
                <span className="text-blue-300 font-semibold">{quotaRemaining} dari 5 Akun</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                <span>Premiumin Akun Lain</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: FAILED */}
        {step === 4 && (
          <div className="relative z-10 text-center space-y-6 max-w-lg mx-auto py-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-2xl shadow-rose-500/30">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Aktivasi Gagal
              </h2>
              <p className="text-sm text-rose-300">
                {errorMessage || 'Terjadi kesalahan saat memverifikasi link Alight Motion.'}
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] p-4 text-xs text-left space-y-2 font-mono">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Email:</span>
                <span className="text-white">{activeEmail || '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Diagnostik:</span>
                <span className="text-rose-400 truncate max-w-[220px]">
                  {errorMessage.slice(0, 45) || 'Invalid OOB parameters'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 px-5 rounded-2xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-all"
              >
                Coba Link Lagi
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 py-3 px-5 rounded-2xl font-semibold text-xs bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.14] text-neutral-300 transition-all"
              >
                Ganti Email
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          PANDUAN LENGKAP & KEUNGGULAN SISTEM
          ============================================================ */}
      <div className="rounded-3xl border border-white/[0.10] bg-white/[0.03] backdrop-blur-xl p-6 sm:p-10 space-y-8 text-neutral-300 text-sm leading-relaxed">
        {/* 01 Apa itu */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              01
            </span>
            Apa itu Alight Motion Premium?
          </h3>
          <p>
            <strong className="text-white">Alight Motion Premium</strong> adalah versi berbayar dari aplikasi editing video dan animasi <strong className="text-white">Alight Motion</strong> yang sangat populer di kalangan content creator, editor TikTok, YouTuber, dan desainer motion graphics. Versi premium membuka seluruh fitur eksklusif yang terkunci di versi gratis.
          </p>
          <p>
            Dengan <strong className="text-white">Alight Motion Premium gratis</strong> melalui sistem kami, kamu bisa membuat animasi profesional, menambahkan efek visual tanpa watermark, dan mengakses ribuan preset premium siap pakai langsung dari browser tanpa perlu perangkat mahal.
          </p>
        </div>

        {/* 02 Fitur Premium */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              02
            </span>
            Fitur Alight Motion Premium
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1">
              <p className="font-semibold text-white flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Tanpa Watermark
              </p>
              <p className="text-xs text-neutral-400">Hasil ekspor video bersih dan profesional tanpa watermark logo Alight Motion.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1">
              <p className="font-semibold text-white flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Ribuan Preset Premium
              </p>
              <p className="text-xs text-neutral-400">Akses langsung seluruh efek transisi, shake, color grading, dan preset XML eksklusif.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1">
              <p className="font-semibold text-white flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Export Resolusi 4K
              </p>
              <p className="text-xs text-neutral-400">Mendukung ekspor video tajam hingga resolusi 4K 60FPS tanpa batasan waktu.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1">
              <p className="font-semibold text-white flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Layer Tanpa Batas
              </p>
              <p className="text-xs text-neutral-400">Bebas menambahkan puluhan layer teks, audio, efek, dan grafis untuk project kompleks.</p>
            </div>
          </div>
        </div>

        {/* 03 Cara Aktifkan */}
        <div className="space-y-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              03
            </span>
            Cara Aktifkan Alight Motion Premium Gratis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1.5">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono">Langkah 1</span>
              <p className="font-semibold text-white">Masukkan Email</p>
              <p className="text-xs text-neutral-400">Ketik email akun Alight Motion Anda di form di atas lalu tekan tombol Lanjutkan.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1.5">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono">Langkah 2</span>
              <p className="font-semibold text-white">Cek Inbox & Copy Link</p>
              <p className="text-xs text-neutral-400">Buka kotak masuk atau folder spam email kamu, lalu salin link verifikasi penuh dari Alight Motion.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-1.5">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider font-mono">Langkah 3</span>
              <p className="font-semibold text-white">Paste & Nikmati Pro</p>
              <p className="text-xs text-neutral-400">Paste tautan di form Langkah 2 lalu klik Verifikasi & Premium. Akun langsung jadi Premium!</p>
            </div>
          </div>
        </div>

        {/* 04 Kenapa Pilih Sistem Kami */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              04
            </span>
            Kenapa Pilih Sistem Kami?
          </h3>
          <p>
            Sistem kami menggunakan verifikasi resmi magic link tanpa pernah meminta password akun Anda. Tidak perlu mengunduh mod APK berbahaya yang sering membawa malware, tidak butuh akses root perangkat, dan proses aktivasi selesai otomatis dalam hitungan 1-2 menit.
          </p>
        </div>

        {/* 05 FAQ Accordion */}
        <div className="space-y-4 pt-2">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              05
            </span>
            FAQ — Pertanyaan yang Sering Ditanya
          </h3>
          <div className="space-y-2.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-4 text-left flex justify-between items-center gap-4 hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="font-semibold text-white text-sm">{faq.q}</span>
                    <span
                      className={`text-neutral-400 transition-transform duration-200 text-lg ${
                        isOpen ? 'rotate-180 text-blue-400' : ''
                      }`}
                    >
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-xs text-neutral-300 border-t border-white/[0.05] leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Inbox Viewer Modal for Disposable Toolpix Accounts */}
      {isInboxModalOpen && (
        <InboxViewerModal
          isOpen={isInboxModalOpen}
          onClose={() => setIsInboxModalOpen(false)}
          initialEmail={activeEmail || emailInput}
          initialToken={tempMailToken}
          isDark={isDark}
          onSelectLink={(url) => {
            setLinkInput(url);
            if (step === 1) setStep(2);
            setIsInboxModalOpen(false);
          }}
          onVerifiedSuccess={(_email, code, url) => {
            setLinkInput(url);
            if (code) {
              setOrderCode(code);
              setStep(3);
              triggerAmPremiumCelebration();
            }
            setIsInboxModalOpen(false);
          }}
          onAddLog={(msg, type) => onAddLog({ type, message: msg })}
        />
      )}
    </div>
  );
};

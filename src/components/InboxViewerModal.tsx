import React, { useState, useEffect, useCallback, useRef } from 'react';
import { tempMailService, TempMailMessage, extractAllUrls, extractAmVerificationUrl } from '../services/tempMailService';
import { botApi } from '../services/botApi';

interface AccountOption {
  email: string;
  sidToken?: string;
}

interface InboxViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  initialEmail?: string;
  initialToken?: string;
  accounts?: AccountOption[];
  customServer?: string;
  onVerifiedSuccess?: (email: string, code: string, url: string) => void;
  onSelectLink?: (url: string) => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const InboxViewerModal: React.FC<InboxViewerModalProps> = ({
  isOpen,
  onClose,
  isDark,
  initialEmail = '',
  initialToken = '',
  accounts = [],
  customServer,
  onVerifiedSuccess,
  onSelectLink,
  onAddLog,
}) => {
  // Active selected account
  const [selectedEmail, setSelectedEmail] = useState<string>(initialEmail);
  const [selectedToken, setSelectedToken] = useState<string>(initialToken);

  const [messages, setMessages] = useState<TempMailMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<TempMailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedGeneral, setCopiedGeneral] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    code?: string;
    message?: string;
  } | null>(null);

  // Sync state when props change or modal opens
  useEffect(() => {
    if (isOpen) {
      const email = initialEmail || (accounts.length > 0 ? accounts[0].email : '');
      const token =
        initialToken ||
        (accounts.find((a) => a.email === email)?.sidToken || '');
      setSelectedEmail(email);
      setSelectedToken(token);
      setVerificationResult(null);
      setSelectedMessage(null);
      setMobileView('list');
    }
  }, [isOpen, initialEmail, initialToken, accounts]);

  const loadInbox = useCallback(
    async (token: string, silent = false) => {
      if (!token) {
        setMessages([]);
        return;
      }
      if (!silent) setIsLoading(true);

      try {
        const fullList = await tempMailService.checkInboxWithFullDetails(token);
        setMessages(fullList);

        // Keep selection synced or auto-select Alight Motion message
        if (fullList.length > 0) {
          const amMsg = fullList.find((m) => m.magicLinkUrl || m.isAlightMotion);
          setSelectedMessage((prev) => {
            if (!prev) return amMsg || fullList[0];
            const updatedCurrent = fullList.find((m) => m.id === prev.id);
            return updatedCurrent || amMsg || fullList[0];
          });
        }
      } catch (err: any) {
        if (!silent) {
          onAddLog(`Gagal memuat kotak masuk: ${err.message}`, 'error');
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [onAddLog]
  );

  // Fetch once when modal opens or selected token changes
  useEffect(() => {
    if (isOpen && selectedToken) {
      loadInbox(selectedToken);
    }
  }, [isOpen, selectedToken, loadInbox]);

  // Auto-refresh interval (every 5 seconds)
  useEffect(() => {
    if (!isOpen || !selectedToken || !autoRefresh) return;
    const interval = setInterval(() => {
      loadInbox(selectedToken, true);
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, selectedToken, autoRefresh, loadInbox]);

  const handleSelectAccount = (acc: AccountOption) => {
    setSelectedEmail(acc.email);
    setSelectedToken(acc.sidToken || '');
    setVerificationResult(null);
    setSelectedMessage(null);
    setMobileView('list');
  };

  /**
   * Explicit handler when clicking a message in the list
   * Ensures instant selection, loads full details on-demand, and switches mobile view
   */
  const handleSelectMessage = async (msg: TempMailMessage) => {
    setSelectedMessage(msg);
    setMobileView('detail');

    // If body or magicLinkUrl is not yet loaded, fetch full details on-demand
    if (!msg.body || !msg.magicLinkUrl || msg.body.length < 50) {
      setIsLoadingBody(true);
      try {
        const details = await tempMailService.fetchEmailDetails(selectedToken, msg.id);
        if (details.body) {
          const detectedLink = details.magicLinkUrl || extractAmVerificationUrl(details.body) || msg.magicLinkUrl;
          const updated: TempMailMessage = {
            ...msg,
            body: details.body,
            magicLinkUrl: detectedLink,
            isAlightMotion: msg.isAlightMotion || Boolean(detectedLink),
          };
          setSelectedMessage(updated);
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)));
        }
      } catch (e) {
        // Fallback to already present msg
      } finally {
        setIsLoadingBody(false);
      }
    }
  };

  const handleVerifyDirectly = async (url: string) => {
    if (!url) return;
    setIsVerifying(true);
    setVerificationResult(null);

    onAddLog(`[AM VERIFIKASI] Memverifikasi login Alight Motion untuk ${selectedEmail}...`, 'info');

    try {
      const res = await botApi.verifyMagicLink(selectedEmail, url, customServer);
      if (res.status) {
        const code = res.codeorder || `AM-VERIF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setVerificationResult({
          success: true,
          code,
          message: 'Berhasil Masuk ke Alight Motion! Akun terverifikasi dan aktif 1 Tahun.',
        });

        onAddLog(
          `🎉 Verifikasi Berhasil! Akun ${selectedEmail} sukses masuk ke Alight Motion. Kode: ${code}`,
          'success'
        );

        if (onVerifiedSuccess) {
          onVerifiedSuccess(selectedEmail, code, url);
        }
      } else {
        const errMsg = res.error || res.message || 'Verifikasi login gagal.';
        setVerificationResult({
          success: false,
          message: errMsg,
        });
        onAddLog(`Aktivasi/Verifikasi gagal untuk ${selectedEmail}: ${errMsg}`, 'error');
      }
    } catch (e: any) {
      setVerificationResult({
        success: false,
        message: e.message || 'Gagal tersambung ke backend.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyGeneric = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGeneral(id);
    setTimeout(() => setCopiedGeneral(null), 2000);
  };

  const handleUseLinkInForm = (url: string) => {
    if (onSelectLink) {
      onSelectLink(url);
    } else if (onVerifiedSuccess) {
      onVerifiedSuccess(selectedEmail, '', url);
    }
    onClose();
  };

  // Helper to strip HTML tags for clean text reading
  const cleanEmailBody = (rawBody?: string): string => {
    if (!rawBody) return '';
    return rawBody
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  };

  if (!isOpen) return null;

  const currentUrls = selectedMessage?.body ? extractAllUrls(selectedMessage.body) : [];
  const activeLink = selectedMessage?.magicLinkUrl || (currentUrls.find((u) => u.includes('oobCode') || u.includes('alight')) || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col h-[94vh] max-h-[820px] ${
          isDark ? 'bg-[#101117] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 bg-gradient-to-r ${
            isDark
              ? 'from-blue-950/40 via-indigo-950/30 to-purple-950/40 border-neutral-800'
              : 'from-blue-100/70 via-indigo-100/50 to-purple-100/70 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              📬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold tracking-tight">
                  Kotak Masuk Email (Disposable Mail)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Live Inbox
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Pilih pesan untuk membuka isinya, salin link verifikasi Alight Motion, atau aktifkan akun.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors"
            title="Tutup"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Account Switcher Bar & Auto-Refresh Toggle */}
        <div
          className={`px-4 sm:px-6 py-2.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 ${
            isDark ? 'border-neutral-800/80 bg-[#0b0c10]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2 overflow-x-auto py-1 max-w-full">
            <span className="text-neutral-400 font-medium shrink-0 text-[11px]">Akun Aktif:</span>
            {accounts.length > 0 ? (
              <div className="flex items-center gap-1.5 overflow-x-auto">
                {accounts.map((acc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectAccount(acc)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors shrink-0 ${
                      selectedEmail === acc.email
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : isDark
                        ? 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    #{idx + 1} {acc.email.split('@')[0]}
                  </button>
                ))}
              </div>
            ) : (
              <span className="font-mono text-xs font-semibold text-cyan-400 truncate max-w-[240px]">
                {selectedEmail || 'Belum ada akun terpilih'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Auto refresh checkbox toggle */}
            <label className="flex items-center gap-1.5 text-[11px] text-neutral-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-neutral-700 text-blue-600 focus:ring-0"
              />
              <span>Auto-refresh 5s</span>
            </label>

            <button
              type="button"
              disabled={isLoading || !selectedToken}
              onClick={() => loadInbox(selectedToken)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                isLoading
                  ? 'opacity-60 bg-neutral-800 border-neutral-700 text-neutral-400 cursor-not-allowed'
                  : isDark
                  ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                  : 'border-slate-300 hover:bg-white text-slate-700'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{isLoading ? 'Memeriksa...' : 'Segarkan'}</span>
            </button>
          </div>
        </div>

        {/* Content Two-Column Layout (Responsive with mobileView state) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden min-h-0">
          {/* Left Column: Email Message List */}
          <div
            className={`md:col-span-4 border-b md:border-b-0 md:border-r overflow-y-auto p-3 space-y-2 h-full ${
              mobileView === 'detail' ? 'hidden md:block' : 'block'
            } ${isDark ? 'border-neutral-800 bg-[#0d0e14]' : 'border-slate-200 bg-slate-50/50'}`}
          >
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Pesan Masuk ({messages.length})
              </span>
              <span className="text-[10px] text-neutral-500">
                Klik pesan untuk membaca
              </span>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-12 px-3 space-y-3">
                <div className="w-10 h-10 rounded-full bg-neutral-800/60 mx-auto flex items-center justify-center text-lg animate-pulse">
                  📫
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-neutral-400">Belum ada email masuk</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed">
                    Kirim link verifikasi Alight Motion dari formulir aktivasi terlebih dahulu, lalu tunggu email masuk ke sini.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                const hasAmLink = Boolean(msg.magicLinkUrl || msg.isAlightMotion);

                return (
                  <button
                    key={msg.id}
                    type="button"
                    onClick={() => handleSelectMessage(msg)}
                    className={`w-full p-3 rounded-xl border text-left cursor-pointer transition-all block focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/30'
                        : isDark
                        ? 'border-neutral-800/80 bg-[#12131b] hover:border-neutral-700 hover:bg-[#161822]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[11px] font-bold truncate text-neutral-200">
                        {msg.from || 'Alight Motion'}
                      </span>
                      <span className="text-[10px] text-neutral-500 shrink-0 font-mono">{msg.date}</span>
                    </div>

                    <div className="text-xs font-semibold line-clamp-1 mb-1 text-white">
                      {msg.subject || '(Tanpa Judul)'}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/[0.05]">
                      {hasAmLink ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <span>⚡</span>
                          <span>Link AM Siap</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400">Pesan baru</span>
                      )}

                      <span className="text-[10px] text-blue-400 font-medium group-hover:underline flex items-center gap-0.5">
                        <span>Buka</span>
                        <span>→</span>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Message Detail & Verification Panel */}
          <div
            className={`md:col-span-8 flex flex-col overflow-y-auto p-4 sm:p-6 space-y-4 h-full ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Mobile Back Button to return to message list */}
            <div className="md:hidden flex items-center justify-between pb-2 border-b border-neutral-800">
              <button
                type="button"
                onClick={() => setMobileView('list')}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold py-1 px-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
              >
                <span>← Kembali ke Daftar Pesan</span>
              </button>
              <span className="text-[11px] text-neutral-400 font-mono">
                {selectedMessage?.date}
              </span>
            </div>

            {selectedMessage ? (
              <div className="space-y-4">
                {/* Email Header Info */}
                <div className="space-y-1.5 pb-3 border-b border-neutral-800">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm sm:text-base font-bold text-white">
                      {selectedMessage.subject || '(Tanpa Judul)'}
                    </h4>
                    <span className="hidden sm:inline-block text-xs text-neutral-500 font-mono shrink-0">
                      {selectedMessage.date}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    Pengirim: <span className="font-mono text-neutral-200">{selectedMessage.from || '-'}</span>
                  </div>
                </div>

                {isLoadingBody && (
                  <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 flex items-center gap-2 text-xs text-blue-300">
                    <svg className="w-4 h-4 animate-spin text-blue-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Memuat rincian lengkap pesan & memindai link...</span>
                  </div>
                )}

                {/* Prominent Alight Motion Verification Box */}
                {activeLink ? (
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isDark
                        ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-teal-950/20 to-neutral-900 shadow-lg shadow-emerald-950/20'
                        : 'border-emerald-300 bg-emerald-50/80 shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        <div>
                          <span className="font-bold text-xs sm:text-sm text-emerald-400">
                            Tautan Verifikasi Alight Motion Terdeteksi!
                          </span>
                          <p className="text-[11px] text-neutral-400">
                            Gunakan tombol di bawah untuk verifikasi langsung atau gunakan link di formulir aktivasi.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* URL Snippet */}
                    <div
                      className={`p-2.5 rounded-lg border font-mono text-[11px] select-all break-all ${
                        isDark ? 'bg-[#0a0a0f] border-neutral-800 text-cyan-300' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    >
                      {activeLink}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={() => handleVerifyDirectly(activeLink)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                          isVerifying
                            ? 'bg-emerald-600/60 text-white cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                      >
                        {isVerifying ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Memverifikasi Masuk ke AM...</span>
                          </>
                        ) : (
                          <>
                            <span>⚡ Verifikasi & Masuk Sekarang</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUseLinkInForm(activeLink)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <span>📥 Gunakan di Form Aktivasi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(activeLink)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                          copiedUrl
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isDark
                            ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                            : 'border-slate-300 hover:bg-white text-slate-700'
                        }`}
                      >
                        {copiedUrl ? '✓ Link Tersalin!' : '📋 Salin Link'}
                      </button>

                      <a
                        href={activeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-neutral-700 hover:bg-neutral-800 text-neutral-300 transition-colors"
                      >
                        🌐 Buka di Tab Baru ↗
                      </a>
                    </div>

                    {/* Result alert */}
                    {verificationResult && (
                      <div
                        className={`p-3 rounded-xl border text-xs ${
                          verificationResult.success
                            ? 'border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                            : 'border-rose-500/60 bg-rose-950/40 text-rose-300'
                        }`}
                      >
                        <div className="font-bold mb-0.5">
                          {verificationResult.success ? '✅ Status Verifikasi: Sukses!' : '❌ Gagal Verifikasi'}
                        </div>
                        <p>{verificationResult.message}</p>
                        {verificationResult.code && (
                          <div className="mt-1 font-mono text-[11px] font-bold text-amber-400 select-all">
                            Kode Order: {verificationResult.code}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-neutral-800 bg-neutral-900/40 text-xs text-neutral-400 space-y-2">
                    <p>ℹ️ Tautan login Alight Motion belum terdeteksi otomatis pada pesan ini.</p>
                    {currentUrls.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] text-neutral-300 font-semibold block mb-1.5">
                          Link yang ditemukan dalam email:
                        </span>
                        <div className="space-y-1">
                          {currentUrls.map((u, i) => (
                            <div key={i} className="flex items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-white/[0.06]">
                              <span className="font-mono text-[10px] text-neutral-300 truncate flex-1 select-all">{u}</span>
                              <button
                                type="button"
                                onClick={() => handleUseLinkInForm(u)}
                                className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-600 hover:bg-blue-500 text-white shrink-0"
                              >
                                Gunakan
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCopyGeneric(u, `url-${i}`)}
                                className="px-2 py-0.5 text-[10px] font-medium rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-800 shrink-0"
                              >
                                {copiedGeneral === `url-${i}` ? 'Tersalin' : 'Salin'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Email Content Body */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Isi Pesan Email
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyGeneric(cleanEmailBody(selectedMessage.body) || selectedMessage.body || '', 'body')}
                      className="text-[10px] text-neutral-400 hover:text-white"
                    >
                      {copiedGeneral === 'body' ? '✓ Teks Tersalin' : 'Salin Semua Teks'}
                    </button>
                  </div>

                  <div
                    className={`p-4 rounded-xl border text-xs font-mono whitespace-pre-wrap max-h-64 overflow-y-auto select-text leading-relaxed ${
                      isDark ? 'bg-[#08090d] border-neutral-800/80 text-neutral-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {cleanEmailBody(selectedMessage.body) || selectedMessage.body || 'Tidak ada konten pesan teks.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 py-16 text-center text-neutral-500 space-y-2">
                <span className="text-4xl">👈</span>
                <p className="text-sm font-medium text-neutral-400">Pilih salah satu pesan di kolom sebelah kiri</p>
                <p className="text-xs text-neutral-500">
                  Untuk melihat isi email dan mengambil tautan verifikasi Alight Motion secara instan.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 ${
            isDark ? 'border-neutral-800 bg-[#0c0d12]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="text-[11px] text-neutral-500 flex items-center gap-1.5">
            <span>ToolPix Disposable Mail Gateway</span>
            <span>·</span>
            <a
              href="https://toolpix.pythonanywhere.com/temp-mail"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              toolpix.pythonanywhere.com/temp-mail ↗
            </a>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={`w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold border ${
              isDark ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800' : 'border-slate-300 text-slate-700 hover:bg-white'
            }`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

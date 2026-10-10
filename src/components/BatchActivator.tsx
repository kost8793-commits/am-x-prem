import React, { useState, useRef, useEffect } from 'react';
import { botApi } from '../services/botApi';
import { tempMailService, TempMailAccount } from '../services/tempMailService';
import { BatchQueueItem, ActivationHistoryItem, LogEntry, VipConfig } from '../types';
import { InboxViewerModal } from './InboxViewerModal';
import { quotaService } from '../services/quotaService';
import { Dashboard } from './Dashboard';
import { triggerAmPremiumCelebration } from '../utils/celebrationEffects';

interface BatchActivatorProps {
  isDark: boolean;
  vipConfig: VipConfig;
  onOpenVipModal: () => void;
  onOpenSecretKeyModal: () => void;
  customServer?: string;
  onAddHistory: (item: ActivationHistoryItem) => void;
  onAddLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  history?: ActivationHistoryItem[];
}

export const BatchActivator: React.FC<BatchActivatorProps> = ({
  isDark,
  vipConfig,
  onOpenVipModal,
  onOpenSecretKeyModal,
  customServer,
  onAddHistory,
  onAddLog,
  history = [],
}) => {
  const [showDashboard, setShowDashboard] = useState(false);

  // 5-minute Cooldown for Regular Class using Mode Cepat / batch temp mail (Batas 5 akun, cooldown 5 menit)
  const [regularCooldownSeconds, setRegularCooldownSeconds] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('am_regular_tempmail_cooldown_until');
      if (raw) {
        const until = parseInt(raw, 10);
        const remaining = Math.max(0, Math.floor((until - Date.now()) / 1000));
        return remaining;
      }
    } catch (e) {}
    return 0;
  });

  const [cooldownNotice, setCooldownNotice] = useState<string>('');

  // Fixed interval effect: Only runs when cooldown is actively ticking, avoiding re-render loops
  const isCooldownActive = regularCooldownSeconds > 0;
  useEffect(() => {
    if (!isCooldownActive) return;
    const timer = setInterval(() => {
      setRegularCooldownSeconds((prev) => {
        if (prev <= 1) {
          localStorage.removeItem('am_regular_tempmail_cooldown_until');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isCooldownActive]);

  const checkRegularCooldown = (): boolean => {
    if (vipConfig.tier === 'free' && regularCooldownSeconds > 0) {
      const m = Math.floor(regularCooldownSeconds / 60);
      const s = regularCooldownSeconds % 60;
      setCooldownNotice(`⏳ Cooldown Class Regular Aktif: Harap tunggu ${m} menit ${s} detik untuk sesi berikutnya (Cooldown 5 menit).`);
      return false;
    }
    return true;
  };

  const rawLimit = Number(vipConfig?.batchLimit);
  const batchLimit = vipConfig?.tier === 'temp_mail' || vipConfig?.tier === 'free'
    ? 5
    : !isNaN(rawLimit) && rawLimit >= 1
    ? rawLimit
    : (vipConfig?.tier === 'owner' ? 50 : vipConfig?.tier === 'vip_plus' ? 20 : vipConfig?.tier === 'vip' ? 10 : 5);

  // Individual input slots state instead of multiline textarea
  const [emailInputs, setEmailInputs] = useState<string[]>(() => {
    const initialSlots = Math.max(1, Math.min(5, batchLimit || 5));
    return Array.from({ length: initialSlots }, () => '');
  });

  // Store tokens for Toolpix temp mail accounts
  const [tempMailTokens, setTempMailTokens] = useState<Record<string, string>>({});
  const [isGeneratingTempMail, setIsGeneratingTempMail] = useState(false);
  const [isCheckingAllInboxes, setIsCheckingAllInboxes] = useState(false);

  // Auto-Aktivasi (Auto-Pilot) State (Default: false)
  const [isAutoPilotEnabled, setIsAutoPilotEnabled] = useState(false);
  const [isAutoPilotRunning, setIsAutoPilotRunning] = useState(false);
  const autoPilotStopRef = useRef(false);

  // Inbox Viewer Modal State
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [inboxTargetEmail, setInboxTargetEmail] = useState('');
  const [inboxTargetToken, setInboxTargetToken] = useState('');

  // Auto Login Modal State for Batch Accounts
  const [selectedAutoLoginAccount, setSelectedAutoLoginAccount] = useState<{
    email: string;
    codeOrder?: string;
    magicLinkUrl?: string;
    sidToken?: string;
  } | null>(null);
  const [copiedBatchLogin, setCopiedBatchLogin] = useState(false);

  const [queue, setQueue] = useState<BatchQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeUrlInputs, setActiveUrlInputs] = useState<Record<string, string>>({});
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [isParallelMode, setIsParallelMode] = useState(false);

  const handleInputChange = (index: number, value: string) => {
    const updated = [...emailInputs];
    updated[index] = value;
    setEmailInputs(updated);
  };

  const handleAddInputRow = () => {
    if (emailInputs.length >= batchLimit) {
      onAddLog({
        type: 'warning',
        message: `Batas maksimal kelas ${vipConfig.name} adalah ${batchLimit} akun. Upgrade ke VIP/VIP++ untuk menambah slot.`,
      });
      return;
    }
    setEmailInputs([...emailInputs, '']);
  };

  const handleRemoveInputRow = (index: number) => {
    if (emailInputs.length <= 1) {
      setEmailInputs(['']);
      return;
    }
    setEmailInputs(emailInputs.filter((_, i) => i !== index));
  };

  // Generate a single Temp Mail via Toolpix (Permitted for Regular, VIP, VIP++, Supreme)
  const handleFillSingleTempMail = async (index: number) => {
    if (vipConfig.tier === 'free' && regularCooldownSeconds > 0) {
      if (!checkRegularCooldown()) return;
    }

    try {
      const account = await tempMailService.createAccount();
      const updated = [...emailInputs];
      updated[index] = account.email;
      setEmailInputs(updated);

      setTempMailTokens((prev) => ({
        ...prev,
        [account.email]: account.token,
      }));

      onAddLog({
        type: 'info',
        message: `Temp Mail Toolpix dibuat untuk slot #${index + 1}: ${account.email}`,
      });
    } catch (e: any) {
      onAddLog({
        type: 'error',
        message: 'Gagal membuat temp mail: ' + e.message,
      });
    }
  };

  // Generate All Temp Mails via Toolpix for batch slots (Supports Regular with 15-minute cooldown)
  const handleGenerateAllToolpixTempMails = async () => {
    if (vipConfig.tier === 'free') {
      if (!checkRegularCooldown()) return;
    }

    setIsGeneratingTempMail(true);
    const count = vipConfig.tier === 'free' ? Math.min(5, batchLimit) : batchLimit;
    const isOwner = vipConfig.tier === 'owner';

    onAddLog({
      type: 'request',
      message: isOwner
        ? `[Class Supreme] Menghubungi Toolpix untuk generate ${count} akun Temp Mail secara instan (tanpa delay)...`
        : isParallelMode
        ? `[Mode Cepat Aktif] Generate ${count} akun Temp Mail secara paralel cepat untuk semua class...`
        : vipConfig.tier === 'vip_plus'
        ? `[VIP++ Mode] Generate ${count} akun Temp Mail dengan proteksi delay aman 5 detik antar akun...`
        : `[Class Regular] Generate ${count} akun Temp Mail (Batas 5 akun, cooldown 5 menit)...`,
    });

    try {
      if (isOwner || isParallelMode) {
        // Mode Cepat / Class Supreme: Instant or fast batch generation
        const accounts = await tempMailService.generateBatch(count);
        const emails = accounts.map((a) => a.email);
        setEmailInputs(emails);

        const tokenMap: Record<string, string> = {};
        accounts.forEach((a) => {
          tokenMap[a.email] = a.sidToken;
        });
        setTempMailTokens((prev) => ({ ...prev, ...tokenMap }));

        onAddLog({
          type: 'success',
          message: `⚡ ${count} Akun Temp Mail Toolpix berhasil dibuat cepat dengan Mode Cepat!`,
        });

        // Trigger 5-minute cooldown for Regular Class
        if (vipConfig.tier === 'free') {
          const cooldownMs = 5 * 60 * 1000;
          localStorage.setItem('am_regular_tempmail_cooldown_until', String(Date.now() + cooldownMs));
          setRegularCooldownSeconds(5 * 60);
          onAddLog({
            type: 'warning',
            message: '⏳ Batas batch 5 akun Temp Mail Class Regular tercapai. Cooldown 5 menit dimulai.',
          });
        }
      } else {
        // Sequential creation
        const emails: string[] = [];
        const tokenMap: Record<string, string> = {};
        const delayBetween = vipConfig.tier === 'free' ? 800 : 5000;

        for (let i = 0; i < count; i++) {
          onAddLog({
            type: 'info',
            message: `[Batch Temp Mail] Membuat akun #${i + 1} dari ${count}...`,
          });

          const acc = await tempMailService.createAccount();
          emails.push(acc.email);
          tokenMap[acc.email] = acc.token;

          setEmailInputs([...emails, ...Array(count - emails.length).fill('')]);
          setTempMailTokens((prev) => ({ ...prev, ...tokenMap }));

          // Delay between accounts (skip delay on the final one)
          if (i < count - 1) {
            await new Promise((r) => setTimeout(r, delayBetween));
          }
        }

        onAddLog({
          type: 'success',
          message: `⚡ ${count} Akun Temp Mail berhasil digenerate untuk batch!`,
        });

        // Trigger 5-minute cooldown for Regular Class after filling 5 accounts
        if (vipConfig.tier === 'free') {
          const cooldownMs = 5 * 60 * 1000;
          localStorage.setItem('am_regular_tempmail_cooldown_until', String(Date.now() + cooldownMs));
          setRegularCooldownSeconds(5 * 60);
          onAddLog({
            type: 'warning',
            message: '⏳ Batas batch 5 akun Temp Mail Class Regular tercapai. Cooldown 5 menit dimulai.',
          });
        }
      }
    } catch (e: any) {
      onAddLog({
        type: 'error',
        message: `Gagal generate batch temp mail: ${e.message}`,
      });
    } finally {
      setIsGeneratingTempMail(false);
    }
  };

  const handleClearAllInputs = () => {
    setEmailInputs(['']);
  };

  const handlePasteToInput = async (index: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleInputChange(index, text.trim());
      }
    } catch (e) {
      // ignore
    }
  };

  const handleStartQueue = (e: React.FormEvent) => {
    e.preventDefault();
    const validEmails = emailInputs
      .map((e) => e.trim())
      .filter((e) => e.includes('@'));

    if (validEmails.length === 0) {
      onAddLog({
        type: 'warning',
        message: 'Masukkan minimal 1 alamat email yang valid di kolom input.',
      });
      return;
    }

    const unique = Array.from(new Set(validEmails)).slice(0, batchLimit);
    const newItems: BatchQueueItem[] = unique.map((email, idx) => ({
      id: `${Date.now()}-${idx}`,
      email,
      status: 'idle',
      sidToken: tempMailTokens[email],
      inboxUrl: 'https://toolpix.pythonanywhere.com/temp-mail',
    }));

    setQueue(newItems);
    onAddLog({
      type: 'info',
      message: `Menyiapkan antrean aktivasi batch untuk ${newItems.length} akun (${vipConfig.name}).`,
    });
  };

  const handleOpenInboxModal = (email?: string, sidToken?: string) => {
    setInboxTargetEmail(email || (queue.length > 0 ? queue[0].email : ''));
    setInboxTargetToken(sidToken || (email ? tempMailTokens[email] : '') || '');
    setIsInboxModalOpen(true);
  };

  // Perform single account verification
  const executeVerifyAccount = async (itemId: string, email: string, url: string) => {
    setVerifyingId(itemId);
    try {
      const res = await botApi.verifyMagicLink(email, url, customServer);
      if (res.status) {
        const code = res.codeorder || 'AM-BATCH-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        setQueue((prev) =>
          prev.map((q) =>
            q.id === itemId
              ? { ...q, status: 'success', codeOrder: code, magicLinkUrl: url }
              : q
          )
        );

        triggerAmPremiumCelebration();

        const isVip = vipConfig.tier === 'vip' || vipConfig.tier === 'vip_plus' || vipConfig.tier === 'owner';
        quotaService.recordActivation(email, code, isVip);

        onAddHistory({
          id: Date.now().toString(),
          email,
          code,
          date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        });

        onAddLog({
          type: 'success',
          message: `Akun batch ${email} berhasil diaktivasi 1 Tahun! Kode: ${code}`,
        });
        return true;
      } else {
        const err = res.error || res.message || 'Gagal verifikasi URL';
        setQueue((prev) =>
          prev.map((q) =>
            q.id === itemId ? { ...q, status: 'failed', error: err } : q
          )
        );
        onAddLog({
          type: 'error',
          message: `Aktivasi gagal untuk ${email}: ${err}`,
        });
        return false;
      }
    } catch (err: any) {
      onAddLog({
        type: 'error',
        message: `Gagal verifikasi ${email}: ${err.message}`,
      });
      return false;
    } finally {
      setVerifyingId(null);
    }
  };

  // Auto-Pilot: Automatically polls inboxes and activates accounts when links arrive
  const runAutoPilotPipeline = async (currentQueue: BatchQueueItem[]) => {
    autoPilotStopRef.current = false;
    setIsAutoPilotRunning(true);

    onAddLog({
      type: 'request',
      message: '🤖 [AUTO-AKTIVASI DIMULAI] Bot aktif memantau inbox ToolPix dan auto-verifikasi ke Alight Motion...',
    });

    const maxLoops = 25; // Poll up to ~75-90 seconds
    let loop = 0;

    while (loop < maxLoops && !autoPilotStopRef.current) {
      loop++;
      // Get latest state of items waiting for link
      const unverifiedItems = currentQueue.filter(
        (q) => q.status === 'waiting_link' && q.sidToken
      );

      if (unverifiedItems.length === 0) {
        break;
      }

      for (const item of unverifiedItems) {
        if (autoPilotStopRef.current) break;

        try {
          const check = await tempMailService.findMagicLinkForAccount(item.sidToken!);
          if (check.found && check.magicLinkUrl) {
            onAddLog({
              type: 'info',
              message: `⚡ [AUTO-PILOT] Link AM terdeteksi untuk ${item.email}. Menjalankan auto-aktivasi...`,
            });

            setActiveUrlInputs((prev) => ({
              ...prev,
              [item.id]: check.magicLinkUrl!,
            }));

            // Auto-verify immediately!
            await executeVerifyAccount(item.id, item.email, check.magicLinkUrl!);
            // Update local snapshot
            item.status = 'success';
          }
        } catch (e) {
          // ignore transient poll error
        }
      }

      // Check if all temp mail accounts completed
      const remaining = currentQueue.filter((q) => q.status === 'waiting_link' && q.sidToken);
      if (remaining.length === 0) {
        onAddLog({
          type: 'success',
          message: '🎉 [AUTO-AKTIVASI SELESAI] Seluruh akun Temp Mail Alight Motion berhasil diproses otomatis!',
        });
        break;
      }

      // Wait 3.5 seconds before next polling iteration
      await new Promise((r) => setTimeout(r, 3500));
    }

    setIsAutoPilotRunning(false);
  };

  const handleStartBatchDispatch = async () => {
    if (queue.length === 0) return;
    setIsProcessing(true);

    onAddLog({
      type: 'request',
      message: `Memulai pengiriman Magic Link batch untuk ${queue.length} akun (${vipConfig.name})...`,
    });

    try {
      const emailList = queue.map((q) => q.email);
      const res = await botApi.batchSend(
        emailList,
        vipConfig.tier,
        customServer,
        isParallelMode
      );

      if (res.status && Array.isArray(res.results)) {
        const resultMap = new Map(res.results.map((r) => [r.email, r]));
        const updatedQueue = queue.map((item) => {
          const result = resultMap.get(item.email);
          if (result && result.status) {
            return {
              ...item,
              status: 'waiting_link' as const,
              magicLinkSentAt: new Date().toLocaleTimeString(),
              expiresAt: Date.now() + 5 * 60 * 1000,
            };
          } else {
            return {
              ...item,
              status: 'failed' as const,
              error: result?.error || 'Gagal mengirim link',
            };
          }
        });

        setQueue(updatedQueue);

        onAddLog({
          type: 'success',
          message: `Pengiriman batch selesai! ${res.results.filter((r) => r.status).length}/${queue.length} link terkirim.${isParallelMode ? ' (Mode Cepat Turbo)' : ''}`,
        });

        // Trigger 5-minute cooldown for Regular Class
        if (vipConfig.tier === 'free') {
          const cooldownMs = 5 * 60 * 1000;
          localStorage.setItem('am_regular_tempmail_cooldown_until', String(Date.now() + cooldownMs));
          setRegularCooldownSeconds(5 * 60);
          onAddLog({
            type: 'warning',
            message: '⏳ Sesi batch selesai. Cooldown 5 menit untuk Class Regular aktif.',
          });
        }

        // Trigger Auto-Aktivasi Pipeline if enabled
        if (isAutoPilotEnabled) {
          runAutoPilotPipeline(updatedQueue);
        }
      }
    } catch (err: any) {
      onAddLog({
        type: 'error',
        message: `Pengiriman batch gagal: ${err.message}`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopAutoPilot = () => {
    autoPilotStopRef.current = true;
    setIsAutoPilotRunning(false);
    onAddLog({
      type: 'warning',
      message: 'Auto-Aktivasi dihentikan oleh pengguna.',
    });
  };

  // Check all Toolpix temp mail inboxes in parallel manually
  const handleCheckAllInboxes = async () => {
    const tempMailItems = queue.filter(
      (q) => q.status === 'waiting_link' && q.sidToken
    );

    if (tempMailItems.length === 0) {
      onAddLog({
        type: 'info',
        message: 'Tidak ada akun temp mail yang sedang menunggu link email.',
      });
      return;
    }

    setIsCheckingAllInboxes(true);
    onAddLog({
      type: 'request',
      message: `Memeriksa ${tempMailItems.length} kotak masuk Toolpix Temp Mail secara otomatis...`,
    });

    let foundCount = 0;
    try {
      await Promise.all(
        tempMailItems.map(async (item) => {
          try {
            const res = await tempMailService.findMagicLinkForAccount(item.sidToken!, item.email);
            if (res.found && res.magicLinkUrl) {
              setActiveUrlInputs((prev) => ({
                ...prev,
                [item.id]: res.magicLinkUrl!,
              }));
              foundCount++;

              if (isAutoPilotEnabled) {
                await executeVerifyAccount(item.id, item.email, res.magicLinkUrl!);
              }
            }
          } catch (e) {
            // continue
          }
        })
      );

      if (foundCount > 0) {
        onAddLog({
          type: 'success',
          message: `Berhasil mengekstrak ${foundCount} Magic Link dari inbox Toolpix Temp Mail!`,
        });
      } else {
        onAddLog({
          type: 'info',
          message: 'Pesan belum masuk di inbox Toolpix. Coba klik kembali dalam 10-15 detik.',
        });
      }
    } finally {
      setIsCheckingAllInboxes(false);
    }
  };

  const handleVerifyItem = async (item: BatchQueueItem) => {
    const url = activeUrlInputs[item.id]?.trim();
    if (!url || !url.startsWith('http')) {
      onAddLog({
        type: 'warning',
        message: 'Masukkan URL magic link yang valid untuk ' + item.email,
      });
      return;
    }
    await executeVerifyAccount(item.id, item.email, url);
  };

  const completedCount = queue.filter((q) => q.status === 'success').length;

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-6 md:p-8 transition-colors ${
          isDark ? 'bg-[#12131a] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        {/* Tier & Limit Header Ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Antrean Aktivasi Batch Multi-Akun
              </h2>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  vipConfig.tier === 'vip_plus'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : vipConfig.tier === 'vip'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : isDark
                    ? 'bg-neutral-800 text-neutral-300'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {vipConfig.name} (Maks {batchLimit} Akun)
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Input per kolom akun atau gunakan fitur Temp Mail Toolpix untuk generate otomatis, auto-baca link, dan auto-aktivasi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() => setShowDashboard(!showDashboard)}
              className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all flex items-center gap-1.5 ${
                showDashboard
                  ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                  : isDark
                  ? 'border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>📊</span>
              <span>{showDashboard ? 'Tutup Analitik' : 'Analitik & Tren Batch'}</span>
            </button>

            {vipConfig.tier !== 'vip_plus' && (
              <button
                type="button"
                onClick={onOpenVipModal}
                className="text-xs px-3 py-1.5 rounded-lg font-bold bg-amber-400 hover:bg-amber-300 text-black transition-colors shadow-xs"
              >
                👑 Upgrade VIP / Key
              </button>
            )}

            {queue.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  handleStopAutoPilot();
                  setQueue([]);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  isDark
                    ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Kembali ke Form Input
              </button>
            )}
          </div>
        </div>

        {/* Recharts Analytics Dashboard Container */}
        {showDashboard && (
          <div className="mb-6 p-1 rounded-2xl border border-blue-500/30 bg-blue-950/10 animate-in fade-in duration-200">
            <Dashboard
              isDark={isDark}
              history={history}
              vipConfig={vipConfig}
            />
          </div>
        )}

        {/* Regular Class 5-Minute Cooldown Alert Banner */}
        {vipConfig.tier === 'free' && regularCooldownSeconds > 0 && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <span className="text-xl animate-pulse">⏳</span>
              <div>
                <p className="font-bold">
                  Cooldown Mode Cepat & Batch Aktif (Class Regular — 5 Menit)
                </p>
                <p className="text-[11px] text-neutral-300 mt-0.5">
                  Batas 5 akun per sesi telah tercapai. Harap tunggu{' '}
                  <span className="font-mono font-bold text-amber-200 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                    {Math.floor(regularCooldownSeconds / 60)}:{String(regularCooldownSeconds % 60).padStart(2, '0')}
                  </span>{' '}
                  sebelum mengeksekusi sesi batch berikutnya (Cooldown 5 menit).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenVipModal}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shrink-0 self-start sm:self-center shadow-xs"
            >
              👑 Bypass Cooldown (VIP)
            </button>
          </div>
        )}

        {cooldownNotice && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between gap-2">
            <span>{cooldownNotice}</span>
            <button
              type="button"
              onClick={() => setCooldownNotice('')}
              className="text-neutral-400 hover:text-white px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {queue.length === 0 ? (
          <form onSubmit={handleStartQueue} className="space-y-5">
            {/* Toolpix Temp Mail Control Bar */}
            <div
              className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                  📫
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs">Fitur Temp Mail Toolpix Batch</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        vipConfig.tier === 'owner'
                          ? 'bg-purple-500/20 text-purple-300 font-bold'
                          : vipConfig.tier === 'vip_plus'
                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                          : vipConfig.tier === 'vip'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-emerald-500/20 text-emerald-300 font-bold'
                      }`}
                    >
                      {vipConfig.tier === 'owner'
                        ? 'Supreme Instant'
                        : vipConfig.tier === 'vip_plus'
                        ? 'VIP++ Delay 5s'
                        : vipConfig.tier === 'vip'
                        ? 'VIP (10k)'
                        : 'Class Regular (Cooldown 5m)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    {vipConfig.tier === 'owner'
                      ? `👑 Class Supreme: Generate ${batchLimit} email disposable secara instan tanpa delay.`
                      : vipConfig.tier === 'vip_plus'
                      ? `VIP++ Class: Generate ${batchLimit} email temporary dengan proteksi delay aman 5 detik antar akun.`
                      : vipConfig.tier === 'vip'
                      ? `VIP (10k): Generate ${batchLimit} email disposable dengan proteksi server.`
                      : `Class Regular: Generate 5 akun Temp Mail (batas batch 5 akun per sesi, cooldown 5 menit).`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {vipConfig.tier === 'owner' ? (
                  <button
                    type="button"
                    disabled={isGeneratingTempMail}
                    onClick={handleGenerateAllToolpixTempMails}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      isGeneratingTempMail
                        ? 'bg-purple-600/50 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white'
                    }`}
                  >
                    <span>👑 Instant Generate {batchLimit} Temp Mail (Supreme)</span>
                  </button>
                ) : vipConfig.tier === 'vip_plus' ? (
                  <button
                    type="button"
                    disabled={isGeneratingTempMail}
                    onClick={handleGenerateAllToolpixTempMails}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      isGeneratingTempMail
                        ? 'bg-amber-600/50 text-black cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-black font-extrabold'
                    }`}
                  >
                    {isGeneratingTempMail ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Membuat Akun (Delay 5 Detik)...</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Generate {batchLimit} Temp Mail (Delay 5s)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isGeneratingTempMail || (vipConfig.tier === 'free' && regularCooldownSeconds > 0)}
                    onClick={handleGenerateAllToolpixTempMails}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                      vipConfig.tier === 'free' && regularCooldownSeconds > 0
                        ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 cursor-not-allowed'
                        : isGeneratingTempMail
                        ? 'bg-blue-600/50 text-white cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-500 text-white font-extrabold'
                    }`}
                  >
                    {vipConfig.tier === 'free' && regularCooldownSeconds > 0 ? (
                      <span>⏳ Cooldown ({Math.floor(regularCooldownSeconds / 60)}:{String(regularCooldownSeconds % 60).padStart(2, '0')})</span>
                    ) : isGeneratingTempMail ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Membuat 5 Temp Mail...</span>
                      </>
                    ) : (
                      <span>⚡ Generate {Math.min(5, batchLimit)} Temp Mail (Class Regular)</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Individual Email Input Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-neutral-300">
                  Kolom Input Akun ({emailInputs.filter((e) => e.trim()).length} / {batchLimit} Terisi)
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleAddInputRow}
                    disabled={emailInputs.length >= batchLimit}
                    className="text-blue-400 hover:text-blue-300 font-semibold disabled:opacity-40"
                  >
                    + Tambah Slot Input
                  </button>
                  <span className="text-neutral-600">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllInputs}
                    className="text-neutral-400 hover:text-rose-400"
                  >
                    Kosongkan Semua
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {emailInputs.map((val, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2.5 transition-all ${
                      isDark
                        ? 'bg-[#0f1016] border-neutral-800 focus-within:border-blue-500/60'
                        : 'bg-white border-slate-200 focus-within:border-blue-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:w-24 shrink-0">
                      <span className="w-5 h-5 rounded-md bg-neutral-800 text-neutral-400 font-mono text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-neutral-400">Akun #{idx + 1}</span>
                    </div>

                    <div className="flex-1 relative flex items-center gap-2">
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleInputChange(idx, e.target.value)}
                        placeholder={`Ketik email akun #${idx + 1} (atau klik Toolpix Temp Mail)...`}
                        className={`flex-1 py-2 px-3 rounded-lg border text-xs font-mono outline-none ${
                          isDark
                            ? 'bg-[#08090d] border-neutral-800 text-white placeholder-neutral-600'
                            : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        }`}
                      />
                      {val && val.includes('@') && (
                        <div className="shrink-0">
                          {(() => {
                            const isVip = vipConfig.tier === 'vip' || vipConfig.tier === 'vip_plus' || vipConfig.tier === 'owner';
                            const check = quotaService.checkEligibility(val, isVip);
                            if (check.isVipBypass) {
                              return (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-500/20">
                                  👑 VIP
                                </span>
                              );
                            }
                            if (check.isLocked) {
                              return (
                                <span
                                  title={`Limit 5x tercapai. Cooldown tersisa: ${check.cooldownFormatted}`}
                                  className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold"
                                >
                                  🛑 5x ({check.cooldownFormatted})
                                </span>
                              );
                            }
                            return (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                                {check.usageCount}/5
                              </span>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {(vipConfig.tier === 'vip_plus' || vipConfig.tier === 'owner') && (
                        <button
                          type="button"
                          onClick={() => handleFillSingleTempMail(idx)}
                          title="Isi slot ini dengan Toolpix Temp Mail"
                          className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                            isDark
                              ? 'border-blue-900/40 text-blue-400 hover:bg-blue-950/30'
                              : 'border-blue-200 text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          ⚡ Temp Mail
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePasteToInput(idx)}
                        title="Tempel dari Clipboard"
                        className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                          isDark
                            ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        📋
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveInputRow(idx)}
                        title="Hapus baris input ini"
                        className="text-neutral-500 hover:text-rose-400 p-1.5 text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-Aktivasi Feature Card: Exclusive to Class Supreme */}
            {vipConfig.tier === 'owner' ? (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'border-purple-800/60 bg-purple-950/20' : 'border-purple-200 bg-purple-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-purple-300">⚡ Fitur Auto-Aktivasi (Auto-Pilot)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-extrabold border border-purple-500/30">
                      👑 SUPREME ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Setelah link dikirim, bot otomatis memantau inbox, mengekstrak link verifikasi AM, dan mengaktivasi akun tanpa klik manual.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={isAutoPilotEnabled}
                    onChange={(e) => setIsAutoPilotEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            ) : (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs opacity-90 ${
                  isDark ? 'border-neutral-800 bg-[#0d0e14]' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-neutral-400">⚡ Fitur Auto-Aktivasi (Auto-Pilot)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      👑 Eksklusif Class Supreme
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Fitur Auto-Pilot (auto cek inbox, auto extract link, & auto aktivasi tanpa sentuh) khusus tersedia di Class Supreme.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onOpenVipModal}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 shrink-0 ml-3"
                >
                  Buka Akses Supreme
                </button>
              </div>
            )}

            {/* Fitur Mode Cepat (Turbo Speed) - Tersedia di SEMUA Class */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
                isParallelMode
                  ? 'border-amber-500/50 bg-amber-950/20 shadow-sm'
                  : isDark
                  ? 'border-neutral-800 bg-[#0d0e14]'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span>⚡</span>
                    <span>Fitur Mode Cepat (Turbo Speed Dispatch)</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                    Semua Class
                  </span>
                  {vipConfig.tier === 'free' ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                      Class Regular (Cooldown 5 Menit)
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                      VIP Unlimited (No Cooldown)
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400">
                  {vipConfig.tier === 'free'
                    ? 'Eksekusi pengiriman Magic Link dan akun secara simultan cepat (paralel tanpa delay jeda). Khusus Class Regular, setelah digunakan berlaku cooldown 5 menit per sesi.'
                    : 'Kirim link dan proses akun secara simultan instan tanpa jeda delay (Unlimited tanpa cooldown untuk pengguna VIP).'}
                </p>
                {vipConfig.tier === 'free' && regularCooldownSeconds > 0 && (
                  <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1 pt-1 font-semibold">
                    <span>⏳ Sisa Cooldown:</span>
                    <span className="bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                      {Math.floor(regularCooldownSeconds / 60)} menit {String(regularCooldownSeconds % 60).padStart(2, '0')} detik
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span className={`text-[11px] font-bold ${isParallelMode ? 'text-amber-400' : 'text-neutral-500'}`}>
                  {isParallelMode ? 'MODE CEPAT ON' : 'MODE NORMAL'}
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isParallelMode}
                    onChange={(e) => {
                      if (vipConfig.tier === 'free' && regularCooldownSeconds > 0 && e.target.checked) {
                        checkRegularCooldown();
                        return;
                      }
                      setIsParallelMode(e.target.checked);
                      onAddLog({
                        type: 'info',
                        message: e.target.checked
                          ? `⚡ Mode Cepat (Turbo Speed) diaktifkan untuk kelas ${vipConfig.name}!`
                          : `Mode Cepat dinonaktifkan. Mode pengiriman normal aktif.`,
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
            >
              Lanjutkan ke Antrean Bot ({emailInputs.filter((e) => e.trim()).length} Akun)
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            {/* Control Bar for Dispatch & Auto-Pilot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isProcessing || isAutoPilotRunning}
                  onClick={handleStartBatchDispatch}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isProcessing || isAutoPilotRunning
                      ? 'opacity-60 bg-blue-600 text-white cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>Mengirim Magic Link Batch...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isAutoPilotEnabled
                          ? `🚀 Jalankan Auto-Aktivasi (${queue.length} Akun)`
                          : `Kirim Magic Link ke Semua ${queue.length} Akun`}
                      </span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                {/* Stop Auto-Pilot button if running */}
                {isAutoPilotRunning && (
                  <button
                    type="button"
                    onClick={handleStopAutoPilot}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 transition-colors flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                    <span>Hentikan Auto-Aktivasi</span>
                  </button>
                )}

                {/* Open Comprehensive Inbox Viewer */}
                <button
                  type="button"
                  onClick={() => handleOpenInboxModal()}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                    isDark
                      ? 'border-blue-500/40 bg-blue-950/30 text-blue-300 hover:bg-blue-900/40'
                      : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  <span>📬</span>
                  <span>Cek Inbox Masuk AM</span>
                </button>

                {/* Manual Check All Inboxes */}
                {queue.some((q) => q.sidToken) && (
                  <button
                    type="button"
                    disabled={isCheckingAllInboxes || isAutoPilotRunning}
                    onClick={handleCheckAllInboxes}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                      isCheckingAllInboxes
                        ? 'opacity-60 border-neutral-700 bg-neutral-800 text-white cursor-not-allowed'
                        : isDark
                        ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                        : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>🔄</span>
                    <span>{isCheckingAllInboxes ? 'Mengecek...' : 'Cek Cepat Semua'}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-neutral-400">
                <span className="font-mono tabular-nums">
                  Terselesaikan: <b className="text-emerald-400">{completedCount}</b>/{queue.length}
                </span>
              </div>
            </div>

            {/* Auto-Pilot live indicator ribbon */}
            {isAutoPilotRunning && (
              <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 text-xs text-emerald-300 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🤖</span>
                  <span className="font-semibold">
                    Auto-Aktivasi Aktif: Bot sedang memantau email masuk dan memverifikasi login Alight Motion secara otomatis...
                  </span>
                </div>
                <span className="text-[11px] font-mono opacity-80">Polling Inbox Live</span>
              </div>
            )}

            {/* Queue Table */}
            <div
              className={`overflow-x-auto rounded-xl border ${
                isDark ? 'border-neutral-800 bg-[#0a0a0f]' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-neutral-800 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="py-3 px-4 font-semibold">No</th>
                    <th className="py-3 px-4 font-semibold">Email Target</th>
                    <th className="py-3 px-4 font-semibold">Status Pengiriman</th>
                    <th className="py-3 px-4 font-semibold">Tautan Verifikasi / Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/40">
                  {queue.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-neutral-800/10">
                      <td className="py-3 px-4 text-neutral-500 font-mono text-[11px] tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">
                        <div className="flex items-center gap-2">
                          <span className={isDark ? 'text-white' : 'text-slate-900'}>{item.email}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenInboxModal(item.email, item.sidToken)}
                            className="text-[10px] px-2 py-0.5 rounded font-semibold bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors shrink-0 flex items-center gap-1"
                          >
                            <span>📬</span>
                            <span>Cek Inbox AM</span>
                          </button>
                        </div>
                        {item.magicLinkSentAt && (
                          <span className="block text-[10px] text-neutral-500 mt-0.5">
                            Terkirim pukul {item.magicLinkSentAt}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'idle' && (
                          <span className="text-neutral-400">Siap Kirim</span>
                        )}
                        {item.status === 'sending' && (
                          <span className="text-blue-400 flex items-center gap-1.5">
                            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Mengirim...
                          </span>
                        )}
                        {item.status === 'waiting_link' && (
                          <div className="space-y-1">
                            <span className="text-amber-400 font-medium block">
                              Menunggu Link Email
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenInboxModal(item.email, item.sidToken)}
                              className="text-[10px] px-2 py-0.5 rounded border border-indigo-500/40 text-indigo-300 hover:bg-indigo-950/30 font-medium transition-colors"
                            >
                              🔍 Periksa Pesan
                            </button>
                          </div>
                        )}
                        {item.status === 'success' && (
                          <div className="space-y-0.5">
                            <span className="text-emerald-400 font-bold">1 Tahun Aktif</span>
                            <span className="block font-mono text-[10px] text-amber-400 tabular-nums">
                              {item.codeOrder}
                            </span>
                          </div>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-rose-400 text-[11px]" title={item.error}>
                            {item.error || 'Gagal'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {item.status === 'success' ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAutoLoginAccount({
                                  email: item.email,
                                  codeOrder: item.codeOrder,
                                  magicLinkUrl: item.magicLinkUrl,
                                  sidToken: item.sidToken,
                                });
                              }}
                              className="text-xs px-2.5 py-1 rounded-md bg-blue-600/20 text-blue-400 border border-blue-500/40 hover:bg-blue-600/30 font-bold flex items-center gap-1 transition-colors"
                            >
                              <span>📲</span>
                              <span>Auto Login</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(item.codeOrder || '');
                                onAddLog({ type: 'info', message: `Kode order disalin: ${item.codeOrder}` });
                              }}
                              className={`text-xs px-2.5 py-1 rounded-md border ${
                                isDark ? 'border-neutral-700 text-neutral-300' : 'border-slate-300 text-slate-700'
                              }`}
                            >
                              Salin Kode
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 max-w-sm">
                            <input
                              type="url"
                              value={activeUrlInputs[item.id] || ''}
                              onChange={(e) =>
                                setActiveUrlInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              placeholder="Tempel https://alightcreative.page.link/..."
                              className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-mono outline-none ${
                                isDark
                                  ? 'bg-[#12131a] border-neutral-700 text-white placeholder-neutral-600'
                                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                              }`}
                            />
                            <button
                              type="button"
                              disabled={verifyingId === item.id}
                              onClick={() => handleVerifyItem(item)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 shrink-0"
                            >
                              {verifyingId === item.id ? 'Memverifikasi...' : 'Aktivasi'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* AUTO LOGIN & QR CODE MODAL FOR BATCH ACTIVATOR */}
      {selectedAutoLoginAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl relative ${
              isDark ? 'bg-[#12131a] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📲</span>
                <h3 className="text-sm font-bold">Auto Login Alight Motion</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAutoLoginAccount(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-4 pt-4">
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/40 text-blue-300">
                <p className="font-semibold">Akun Terpilih:</p>
                <p className="font-mono text-white mt-0.5 select-all">{selectedAutoLoginAccount.email}</p>
                <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-amber-400 text-black font-extrabold">
                  💎 1 TAHUN PREMIUM AKTIF (Kode: {selectedAutoLoginAccount.codeOrder || 'OK'})
                </span>
              </div>

              {/* QR Code Auto Login */}
              {selectedAutoLoginAccount.magicLinkUrl ? (
                <div className="text-center p-4 rounded-xl border border-neutral-800 bg-[#090a0f] space-y-3">
                  <p className="font-semibold text-neutral-300">Scan QR Code dengan Kamera HP</p>
                  <p className="text-[11px] text-neutral-400">
                    Arahkan kamera HP untuk otomatis membuka dan login ke aplikasi Alight Motion:
                  </p>
                  <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl shadow-md flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        selectedAutoLoginAccount.magicLinkUrl
                      )}`}
                      alt="QR Code Auto Login AM"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <a
                    href={selectedAutoLoginAccount.magicLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <span>🚀</span>
                    <span>Buka Langsung di Aplikasi Alight Motion</span>
                  </a>
                </div>
              ) : (
                <div className="p-3 text-center text-neutral-400 bg-neutral-900 rounded-xl space-y-2">
                  <p>Kode aktivasi tersedia: <b>{selectedAutoLoginAccount.codeOrder}</b></p>
                </div>
              )}

              {/* Cek Inbox Feature in Auto Login Modal */}
              <button
                type="button"
                onClick={() => {
                  const targetEmail = selectedAutoLoginAccount.email;
                  const targetToken = selectedAutoLoginAccount.sidToken || tempMailTokens[targetEmail] || '';
                  setSelectedAutoLoginAccount(null);
                  handleOpenInboxModal(targetEmail, targetToken);
                }}
                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                  isDark
                    ? 'border-purple-500/40 bg-purple-950/30 text-purple-200 hover:bg-purple-900/40'
                    : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <span>📬</span>
                <span>Cek Kotak Masuk (Inbox) Email Ini</span>
              </button>

              {/* Salin Ringkasan Akun */}
              <button
                type="button"
                onClick={() => {
                  const txt = `=== AKUN ALIGHT MOTION PRO PREMIUM ===\nEmail: ${selectedAutoLoginAccount.email}\nKode Order: ${selectedAutoLoginAccount.codeOrder || 'AKTIF'}\nLink Auto Login: ${selectedAutoLoginAccount.magicLinkUrl || 'N/A'}\n======================================`;
                  navigator.clipboard.writeText(txt);
                  setCopiedBatchLogin(true);
                  setTimeout(() => setCopiedBatchLogin(false), 2000);
                  onAddLog({ type: 'info', message: 'Data akun & link auto login disalin ke clipboard.' });
                }}
                className={`w-full py-2 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                  copiedBatchLogin
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : isDark
                    ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {copiedBatchLogin ? '✓ Data Akun Tersalin!' : '📋 Salin Data & Link Auto Login'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Inbox Viewer Modal */}
      <InboxViewerModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        isDark={isDark}
        initialEmail={inboxTargetEmail}
        initialToken={inboxTargetToken}
        accounts={queue.map((q) => ({ email: q.email, sidToken: q.sidToken }))}
        customServer={customServer}
        onVerifiedSuccess={(email, code, url) => {
          setQueue((prev) =>
            prev.map((q) =>
              q.email === email
                ? { ...q, status: 'success', codeOrder: code, magicLinkUrl: url }
                : q
            )
          );
          triggerAmPremiumCelebration();
        }}
        onAddLog={(msg, type) => onAddLog({ type, message: msg })}
      />
    </div>
  );
};

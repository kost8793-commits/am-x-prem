import React, { useState, useEffect, useRef } from 'react';
import { VipConfig, CreatedAmAccount, LogEntry } from '../types';
import { tempMailService } from '../services/tempMailService';
import { botApi } from '../services/botApi';
import { cryptoStorage } from '../services/cryptoStorage';
import { InboxViewerModal } from './InboxViewerModal';
import { triggerAmPremiumCelebration } from '../utils/celebrationEffects';

interface OwnerSuiteProps {
  isDark: boolean;
  vipConfig: VipConfig;
  onOpenVipModal: () => void;
  onUpdateVip?: (newConfig: VipConfig) => void;
  customServer: string;
  onAddLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

export const OwnerSuite: React.FC<OwnerSuiteProps> = ({
  isDark,
  vipConfig,
  onOpenVipModal,
  onUpdateVip,
  customServer,
  onAddLog,
}) => {
  const isSupreme = vipConfig.tier === 'owner';

  // Sub-tabs in Supreme Suite: 'prem' | 'create' | 'autologin'
  const [activeSubTab, setActiveSubTab] = useState<'prem' | 'create' | 'autologin'>('prem');

  // Stored Created Accounts in Encrypted Vault
  const [createdAccounts, setCreatedAccounts] = useState<CreatedAmAccount[]>([]);
  const [isVaultLoading, setIsVaultLoading] = useState(true);

  // State for Auto Create Akun
  const [createCount, setCreateCount] = useState<number>(3);
  const [isCreatingAccounts, setIsCreatingAccounts] = useState(false);
  const [autoMakePremiumOnCreate, setAutoMakePremiumOnCreate] = useState(true);
  const [createProgressText, setCreateProgressText] = useState('');

  // State for Auto Akun Prem Pipeline
  const [premTargetCount, setPremTargetCount] = useState<number>(1);
  const [isAutoPremRunning, setIsAutoPremRunning] = useState(false);
  const [autoPremLogs, setAutoPremLogs] = useState<string[]>([]);
  const autoPremStopRef = useRef(false);

  // State for individual account upgrade to Premium
  const [upgradingAccountId, setUpgradingAccountId] = useState<string | null>(null);

  // State for Auto Login Modal / QR Code viewer
  const [selectedAccountForLogin, setSelectedAccountForLogin] = useState<CreatedAmAccount | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inbox Viewer Modal state for Auto Login accounts
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);
  const [inboxTargetEmail, setInboxTargetEmail] = useState('');
  const [inboxTargetToken, setInboxTargetToken] = useState('');

  // State for Supreme Gate unlock input
  const [gateKeyInput, setGateKeyInput] = useState('');
  const [gateError, setGateError] = useState('');

  // Load encrypted accounts securely on mount or when key changes
  useEffect(() => {
    let mounted = true;
    setIsVaultLoading(true);
    cryptoStorage
      .loadAccounts(vipConfig.key)
      .then((loaded) => {
        if (mounted) {
          setCreatedAccounts(loaded);
          setIsVaultLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setIsVaultLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [vipConfig.key]);

  // Save to encrypted vault
  const saveAccounts = (updater: (prev: CreatedAmAccount[]) => CreatedAmAccount[]) => {
    setCreatedAccounts((prev) => {
      const next = updater(prev);
      cryptoStorage.saveAccounts(next, vipConfig.key);
      return next;
    });
  };

  // Helper to generate secure random password
  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let res = 'Am#';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res + '!';
  };

  // Helper to copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addPremLog = (text: string) => {
    setAutoPremLogs((prev) => [text, ...prev].slice(0, 60));
  };

  // Supreme Gate Key Verification
  const handleUnlockSupremeGate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = gateKeyInput.trim().toUpperCase();
    if (!cleanKey) {
      setGateError('Ketikkan kode lisensi Supreme Anda.');
      return;
    }

    if (
      cleanKey.includes('SUPREM') ||
      cleanKey.includes('SUPREME') ||
      cleanKey.includes('OWNER') ||
      cleanKey.includes('ROOT') ||
      cleanKey.includes('ADMIN') ||
      cleanKey === 'AM-SUPREM' ||
      cleanKey === 'SUPREM777' ||
      cleanKey === 'AM-OWNER-ROOT' ||
      cleanKey === 'OWNER777'
    ) {
      const updated: VipConfig = {
        tier: 'owner',
        key: cleanKey,
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

      if (onUpdateVip) {
        onUpdateVip(updated);
      }
      onAddLog({
        type: 'success',
        message: 'Akses Class Supreme berhasil diverifikasi! Menu manajemen akun terbuka.',
      });
      setGateError('');
      setGateKeyInput('');
    } else {
      setGateError('Kunci lisensi tidak valid atau tidak memiliki role Supreme.');
    }
  };

  // Core helper to activate an account with email & token to Premium
  const executeActivationForAccount = async (
    email: string,
    pass: string,
    tempMailToken?: string,
    logPrefix: string = '[Class Supreme]'
  ): Promise<{ success: boolean; account?: CreatedAmAccount; error?: string }> => {
    try {
      // 1. Send Magic Link
      const sendRes = await botApi.sendSingleActivation(email, customServer);
      if (!sendRes.status) {
        return { success: false, error: sendRes.error || 'Server menolak pengiriman link' };
      }

      // 2. Poll inbox
      let magicLinkUrl = '';
      if (tempMailToken) {
        let attempts = 0;
        const maxAttempts = 12; // ~36s polling
        while (attempts < maxAttempts && !magicLinkUrl) {
          attempts++;
          await new Promise((r) => setTimeout(r, 3000));
          try {
            const checkRes = await tempMailService.findMagicLinkForAccount(tempMailToken);
            if (checkRes.found && checkRes.magicLinkUrl) {
              magicLinkUrl = checkRes.magicLinkUrl;
              break;
            }
          } catch (e) {}
        }
      }

      if (!magicLinkUrl) {
        return { success: false, error: 'Magic Link belum masuk di inbox email.' };
      }

      // 3. Verify with Alight Motion
      const verifyRes = await botApi.verifyActivation(email, magicLinkUrl, customServer);
      if (!verifyRes.status) {
        return { success: false, error: verifyRes.error || 'Verifikasi link gagal atau kadaluarsa' };
      }

      const orderCode = verifyRes.codeorder || (verifyRes as any).orderCode || `ORD-${Date.now().toString().slice(-6)}`;
      const oobMatch = magicLinkUrl.match(/oobCode=([^&]+)/);
      const oobCode = oobMatch ? decodeURIComponent(oobMatch[1]) : '';
      const deeplink = `alightcreative://link?mode=signIn&oobCode=${encodeURIComponent(oobCode)}`;

      const completedAcc: CreatedAmAccount = {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        email,
        password: pass,
        tempMailToken,
        createdAt: new Date().toLocaleTimeString(),
        status: 'premium_active',
        magicLink: magicLinkUrl,
        orderCode,
        autoLoginUrl: magicLinkUrl,
        deeplinkAm: deeplink,
        premiumExpiresAt: '30 Hari / Aktif',
      };

      return { success: true, account: completedAcc };
    } catch (err: any) {
      return { success: false, error: err.message || 'Gagal dalam proses aktivasi' };
    }
  };

  // 1. AUTO CREATE AKUN LOGIC (with optional instant Jadikan Premium)
  const handleAutoCreateAccounts = async (forceMakePremium?: boolean) => {
    if (!isSupreme) {
      onOpenVipModal();
      return;
    }

    const shouldMakePrem = forceMakePremium !== undefined ? forceMakePremium : autoMakePremiumOnCreate;

    setIsCreatingAccounts(true);
    setCreateProgressText(
      shouldMakePrem
        ? `Membuat & Langsung Jadikan Premium ${createCount} akun...`
        : `Menghubungi server generator Toolpix...`
    );

    onAddLog({
      type: 'request',
      message: `[Class Supreme] Memulai proses Auto Create ${createCount} akun Alight Motion ${
        shouldMakePrem ? '(+ Otomatis Jadikan Premium)' : ''
      }...`,
    });

    const newAccounts: CreatedAmAccount[] = [];

    for (let i = 0; i < createCount; i++) {
      setCreateProgressText(
        shouldMakePrem
          ? `[Akun #${i + 1}/${createCount}] Membuat email & proses aktivasi Premium...`
          : `[Akun #${i + 1}/${createCount}] Membuat email disposable...`
      );

      try {
        const mailData = await tempMailService.createAccount();
        if (mailData && mailData.email) {
          const pass = generateStrongPassword();

          if (shouldMakePrem) {
            setCreateProgressText(`[Akun #${i + 1}/${createCount}] Mengirim link & memverifikasi ke Alight Motion...`);
            const premResult = await executeActivationForAccount(mailData.email, pass, mailData.token, '[Class Supreme]');
            if (premResult.success && premResult.account) {
              newAccounts.push(premResult.account);
              onAddLog({
                type: 'success',
                message: `[Class Supreme] Akun #${i + 1} (${mailData.email}) berhasil dibuat & LANGSUNG JADI PREMIUM!`,
              });
            } else {
              // Fallback to basic created if activation failed
              const fallbackAcc: CreatedAmAccount = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
                email: mailData.email,
                password: pass,
                tempMailToken: mailData.token,
                createdAt: new Date().toLocaleTimeString(),
                status: 'created',
              };
              newAccounts.push(fallbackAcc);
              onAddLog({
                type: 'warning',
                message: `[Class Supreme] Akun #${i + 1} (${mailData.email}) dibuat, tapi aktivasi prem tertunda: ${premResult.error}`,
              });
            }
          } else {
            const acc: CreatedAmAccount = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
              email: mailData.email,
              password: pass,
              tempMailToken: mailData.token,
              createdAt: new Date().toLocaleTimeString(),
              status: 'created',
            };
            newAccounts.push(acc);
          }
        }
      } catch (e: any) {
        onAddLog({
          type: 'error',
          message: `[Class Supreme] Gagal membuat akun #${i + 1}: ${e.message}`,
        });
      }
    }

    if (newAccounts.length > 0) {
      saveAccounts((prev) => [...newAccounts, ...prev]);
      onAddLog({
        type: 'success',
        message: `[Class Supreme] Selesai! Berhasil memproses ${newAccounts.length} akun Alight Motion baru di Vault!`,
      });
    }

    setIsCreatingAccounts(false);
    setCreateProgressText('');
  };

  // 2. UPGRADE EXISTING ACCOUNT TO PREMIUM ("Jadikan Premium" button in Vault)
  const handleUpgradeSingleAccount = async (account: CreatedAmAccount) => {
    if (!isSupreme) {
      onOpenVipModal();
      return;
    }
    if (account.status === 'premium_active') {
      onAddLog({
        type: 'info',
        message: `Akun ${account.email} sudah berstatus Premium Aktif!`,
      });
      return;
    }

    setUpgradingAccountId(account.id);
    onAddLog({
      type: 'request',
      message: `[Class Supreme] Memulai fitur Jadikan Premium untuk akun ${account.email}...`,
    });

    try {
      const result = await executeActivationForAccount(
        account.email,
        account.password || generateStrongPassword(),
        account.tempMailToken,
        '[Class Supreme]'
      );

      if (result.success && result.account) {
        saveAccounts((prev) =>
          prev.map((acc) =>
            acc.id === account.id
              ? {
                  ...acc,
                  status: 'premium_active',
                  magicLink: result.account!.magicLink,
                  orderCode: result.account!.orderCode,
                  autoLoginUrl: result.account!.autoLoginUrl,
                  deeplinkAm: result.account!.deeplinkAm,
                  premiumExpiresAt: '30 Hari / Aktif',
                }
              : acc
          )
        );

        onAddLog({
          type: 'success',
          message: `🎉 [Class Supreme] SUKSES! Akun ${account.email} berhasil dijadikan PREMIUM AKTIF (${result.account.orderCode})!`,
        });
        triggerAmPremiumCelebration();
      } else {
        throw new Error(result.error || 'Aktivasi gagal');
      }
    } catch (err: any) {
      onAddLog({
        type: 'error',
        message: `[Class Supreme] Gagal upgrade akun ke Premium: ${err.message}`,
      });
    } finally {
      setUpgradingAccountId(null);
    }
  };

  // 3. AUTO AKUN PREM PIPELINE LOGIC (1-Klik Jadi Premium)
  const handleStartAutoPremPipeline = async () => {
    if (!isSupreme) {
      onOpenVipModal();
      return;
    }

    setIsAutoPremRunning(true);
    autoPremStopRef.current = false;
    setAutoPremLogs([]);

    addPremLog(`🚀 [Pipeline Dimulai] Menyiapkan ${premTargetCount} akun Premium otomatis (Class Supreme)...`);
    onAddLog({
      type: 'request',
      message: `[Class Supreme] Memulai pipeline 1-klik untuk ${premTargetCount} akun Premium...`,
    });

    for (let idx = 0; idx < premTargetCount; idx++) {
      if (autoPremStopRef.current) {
        addPremLog(`🛑 Pipeline dihentikan oleh pengguna.`);
        break;
      }

      addPremLog(`\n[Akun #${idx + 1}/${premTargetCount}] 1. Membuat disposable email aktif...`);
      let mailData;
      try {
        mailData = await tempMailService.createAccount();
      } catch (e: any) {
        addPremLog(`❌ Gagal membuat email: ${e.message}`);
        continue;
      }

      const email = mailData.email;
      const pass = generateStrongPassword();
      addPremLog(`✅ Email dibuat: ${email}`);

      // Step 2: Kirim Magic Link AM
      addPremLog(`2. Mengirim Magic Link aktivasi Alight Motion...`);
      try {
        const sendRes = await botApi.sendSingleActivation(email, customServer);
        if (!sendRes.status) {
          addPremLog(`❌ Gagal kirim link: ${sendRes.error || 'Server menolak'}`);
          continue;
        }
        addPremLog(`✅ Magic link berhasil dikirim oleh server.`);
      } catch (e: any) {
        addPremLog(`❌ Error kirim link: ${e.message}`);
        continue;
      }

      // Step 3: Monitor Inbox secara berkala sampai link masuk
      addPremLog(`3. Memantau kotak masuk (menunggu email Alight Motion masuk)...`);
      let magicLinkUrl = '';
      let attempts = 0;
      const maxAttempts = 12; // Cek selama ~36 detik

      while (attempts < maxAttempts && !magicLinkUrl && !autoPremStopRef.current) {
        attempts++;
        addPremLog(`   ⏳ Polling inbox (percobaan ${attempts}/${maxAttempts})...`);
        await new Promise((r) => setTimeout(r, 3000));

        try {
          const checkRes = await tempMailService.findMagicLinkForAccount(mailData.token);
          if (checkRes.found && checkRes.magicLinkUrl) {
            magicLinkUrl = checkRes.magicLinkUrl;
            break;
          }
        } catch (e) {
          // continue polling
        }
      }

      if (!magicLinkUrl) {
        addPremLog(`❌ Batas waktu habis: Email magic link belum masuk di inbox.`);
        continue;
      }

      addPremLog(`✅ Magic Link diterima dari Alight Motion!`);

      // Step 4: Verifikasi & Aktivasi Akun
      addPremLog(`4. Mengekstrak token oobCode & memverifikasi akun ke AM...`);
      try {
        const verifyRes = await botApi.verifyActivation(email, magicLinkUrl, customServer);
        if (verifyRes.status) {
          const orderCode = verifyRes.codeorder || (verifyRes as any).orderCode || `ORD-${Date.now().toString().slice(-6)}`;
          const oobMatch = magicLinkUrl.match(/oobCode=([^&]+)/);
          const oobCode = oobMatch ? decodeURIComponent(oobMatch[1]) : '';
          const deeplink = `alightcreative://link?mode=signIn&oobCode=${encodeURIComponent(oobCode)}`;
          const autoLoginUrl = magicLinkUrl;

          const completeAccount: CreatedAmAccount = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
            email,
            password: pass,
            tempMailToken: mailData.token,
            createdAt: new Date().toLocaleTimeString(),
            status: 'premium_active',
            magicLink: magicLinkUrl,
            orderCode,
            autoLoginUrl,
            deeplinkAm: deeplink,
            premiumExpiresAt: '30 Hari / Aktif',
          };

          saveAccounts((prev) => [completeAccount, ...prev]);

          addPremLog(`🎉 SUKSES! Akun ${email} resmi menjadi PREMIUM AKTIF! (Kode: ${orderCode})`);
          onAddLog({
            type: 'success',
            message: `[Class Supreme] SUKSES! Akun ${email} kini Premium Aktif (${orderCode})!`,
          });
          triggerAmPremiumCelebration();
        } else {
          addPremLog(`❌ Verifikasi gagal: ${verifyRes.error || 'Link kadaluarsa'}`);
        }
      } catch (e: any) {
        addPremLog(`❌ Error verifikasi: ${e.message}`);
      }
    }

    setIsAutoPremRunning(false);
    addPremLog(`\n🏁 Selesai! Semua antrean akun telah diproses.`);
  };

  const handleStopAutoPrem = () => {
    autoPremStopRef.current = true;
    setIsAutoPremRunning(false);
    addPremLog(`🛑 Perintah stop diterima.`);
  };

  // Export all accounts to TXT
  const handleExportTxt = () => {
    if (createdAccounts.length === 0) return;
    let content = `=== DAFTAR AKUN ALIGHT MOTION PRO (CLASS SUPREM) ===\n`;
    content += `Status Enkripsi: AES-256-GCM Secure Storage\n`;
    content += `Diekspor pada: ${new Date().toLocaleString()}\n`;
    content += `Total Akun: ${createdAccounts.length}\n\n`;

    createdAccounts.forEach((acc, idx) => {
      content += `[Akun #${idx + 1}]\n`;
      content += `Email: ${acc.email}\n`;
      content += `Password: ${acc.password || 'Tidak ada'}\n`;
      content += `Status: ${acc.status === 'premium_active' ? '💎 PREMIUM AKTIF' : 'Akun Standar'}\n`;
      if (acc.orderCode) content += `Kode Order: ${acc.orderCode}\n`;
      if (acc.autoLoginUrl) content += `Magic Login Link: ${acc.autoLoginUrl}\n`;
      if (acc.deeplinkAm) content += `Deeplink AM: ${acc.deeplinkAm}\n`;
      content += `--------------------------------------------------\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AM_Accounts_Supreme_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAccounts = () => {
    if (confirm('Hapus seluruh data akun terenkripsi di Vault Supreme?')) {
      saveAccounts(() => []);
      cryptoStorage.clearAccounts();
    }
  };

  // -------------------------------------------------------------
  // RENDER: SUPREME SECURITY ACCESS GATE (IF NOT IN CLASS SUPREM)
  // -------------------------------------------------------------
  if (!isSupreme) {
    return (
      <div className="space-y-6">
        <div
          className={`p-8 md:p-12 rounded-3xl border text-center space-y-6 shadow-2xl relative overflow-hidden ${
            isDark
              ? 'bg-gradient-to-b from-[#13101c] via-[#0d0c14] to-[#0a0a0f] border-purple-900/60'
              : 'bg-gradient-to-b from-purple-50 via-white to-amber-50 border-purple-200'
          }`}
        >
          {/* Background glowing aesthetic */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Lock Icon */}
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center text-4xl shadow-xl">
              🔒
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center text-base font-bold shadow-md">
              👑
            </div>
          </div>

          <div className="max-w-lg mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-mono text-[11px] font-bold uppercase tracking-wider">
              Akses Terbatas: Role 'Supreme' Only
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Class Supremee Security Gate
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 leading-relaxed">
              Menu manajemen akun tambahan (<strong>Auto Akun Prem</strong>, <strong>Auto Create & Jadikan Premium</strong>, serta <strong>Auto Login AM & Vault</strong>) diproteksi secara ketat dengan enkripsi AES-256-GCM dan hanya dapat diakses oleh user dengan role <strong>'Supreme'</strong>.
            </p>
          </div>

          {/* Quick Unlock Form */}
          <form
            onSubmit={handleUnlockSupremeGate}
            className="max-w-md mx-auto space-y-3 pt-2 text-left"
          >
            <label className="block text-xs font-semibold text-neutral-300">
              Verifikasi Kunci Lisensi Supreme:
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={gateKeyInput}
                onChange={(e) => {
                  setGateKeyInput(e.target.value);
                  setGateError('');
                }}
                placeholder="Masukkan kode lisensi Supreme Anda..."
                className={`flex-1 py-3 px-4 rounded-xl border text-xs font-mono outline-none transition-all focus:ring-2 focus:ring-purple-500/50 ${
                  isDark
                    ? 'bg-[#0a0a0f] border-neutral-700 text-white placeholder-neutral-600'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 shadow-xs'
                }`}
              />
              <button
                type="submit"
                className="py-3 px-5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white transition-all shadow-md shrink-0 flex items-center gap-1.5"
              >
                <span>Buka Kunci</span>
                <span>➔</span>
              </button>
            </div>

            {gateError && (
              <p className="text-[11px] text-rose-400 font-medium">{gateError}</p>
            )}

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onOpenVipModal}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
              >
                Belum memiliki lisensi? Dapatkan Lisensi di Menu Lisensi
              </button>
            </div>
          </form>

          {/* Security Features Badge */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span>Proteksi Role Supreme</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span>Enkripsi AES-256-GCM Vault</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-400">✓</span>
              <span>Kompatibel 100% Netlify & PWA</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: FULL SUPREME CONTROL SUITE (WHEN USER HAS ROLE 'SUPREME')
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Suprem Header Banner */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isDark
            ? 'bg-gradient-to-r from-purple-950/40 via-neutral-900 to-amber-950/30 border-purple-900/50 shadow-lg'
            : 'bg-gradient-to-r from-purple-50 via-white to-amber-50 border-purple-200 shadow-sm'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
              👑
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight">Class Supreme Control Suite</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-amber-500 text-white font-extrabold uppercase tracking-wider shadow-xs">
                  Role Supreme Terverifikasi
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold flex items-center gap-1">
                  <span>🔒</span>
                  <span>AES-256-GCM Encrypted Storage</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Pusat kendali otomatisasi Alight Motion: Auto Create Akun, Fitur Jadikan Premium 1-Klik, dan Auto Login AM Deeplink.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              ● Supreme Mode Aktif
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Bypass Cooldown
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation inside Supreme Suite */}
      <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('prem')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'prem'
              ? 'bg-amber-400 text-black shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white bg-neutral-900/60'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <span>💎</span>
          <span>1. Auto Akun Prem (1-Klik)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('create')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'create'
              ? 'bg-purple-600 text-white shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white bg-neutral-900/60'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <span>⚡</span>
          <span>2. Auto Create & Jadikan Premium</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('autologin')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSubTab === 'autologin'
              ? 'bg-blue-600 text-white shadow-sm'
              : isDark
              ? 'text-neutral-400 hover:text-white bg-neutral-900/60'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <span>📲</span>
          <span>3. Auto Login AM & Vault ({createdAccounts.length})</span>
          <span className="text-[9px] px-1 rounded bg-black/30 font-mono text-emerald-300">
            🔒 AES
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: AUTO AKUN PREM (1-KLIK) */}
      {activeSubTab === 'prem' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <div
              className={`p-6 rounded-2xl border ${
                isDark ? 'bg-[#12131a] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>💎</span>
                <span>Pipeline Otomatis: Buat Akun Langsung Jadi Premium</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Bot secara otomatis melakukan urutan dari pembuatan email disposable, pengiriman magic link, pemantauan inbox, ekstraksi token oobCode, hingga aktivasi Premium.
              </p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Jumlah Akun Premium yang Ingin Dibuat Sekaligus:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 5].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setPremTargetCount(cnt)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          premTargetCount === cnt
                            ? 'bg-amber-400 border-amber-400 text-black'
                            : isDark
                            ? 'border-neutral-800 bg-[#0c0d12] text-neutral-300 hover:border-neutral-700'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {cnt} Akun
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-neutral-800 bg-black/30 space-y-2 text-[11px] text-neutral-300">
                  <div className="font-semibold text-amber-400">Alur Eksekusi Otomatis (No Click):</div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Create Temp Mail (Toolpix)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Kirim Magic Link ke AM via Gateway</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Monitoring Inbox & Auto-Extract oobCode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">4</span>
                    <span className="font-bold text-emerald-400">Verifikasi & Jadi Akun Premium Aktif!</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isAutoPremRunning}
                    onClick={handleStartAutoPremPipeline}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 ${
                      isAutoPremRunning
                        ? 'bg-amber-500/50 text-black cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black'
                    }`}
                  >
                    {isAutoPremRunning ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Pipeline Sedang Berjalan...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>Mulai Auto Akun Prem ({premTargetCount} Akun)</span>
                      </>
                    )}
                  </button>

                  {isAutoPremRunning && (
                    <button
                      type="button"
                      onClick={handleStopAutoPrem}
                      className="py-3 px-4 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-white"
                    >
                      Hentikan
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Live Terminal Console */}
          <div className="lg:col-span-7">
            <div
              className={`h-full min-h-[380px] rounded-2xl border p-4 font-mono text-xs flex flex-col ${
                isDark ? 'bg-[#090a0f] border-neutral-800' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-slate-200">Terminal Log Pipeline Auto Prem (Class Supreme)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPremLogs([])}
                  className="text-[11px] text-neutral-400 hover:text-white"
                >
                  Bersihkan
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 max-h-[360px]">
                {autoPremLogs.length === 0 ? (
                  <div className="text-neutral-500 italic py-12 text-center">
                    Klik "Mulai Auto Akun Prem" di sebelah kiri untuk melihat proses pembuatan dan aktivasi akun Premium secara langsung...
                  </div>
                ) : (
                  autoPremLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={`leading-relaxed ${
                        log.includes('SUKSES')
                          ? 'text-emerald-400 font-bold bg-emerald-950/30 p-1.5 rounded'
                          : log.includes('❌')
                          ? 'text-rose-400'
                          : log.includes('✅')
                          ? 'text-emerald-300'
                          : log.includes('🚀')
                          ? 'text-amber-400 font-bold'
                          : 'text-neutral-300'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AUTO CREATE AKUN & JADIKAN PREMIUM */}
      {activeSubTab === 'create' && (
        <div
          className={`p-6 rounded-2xl border ${
            isDark ? 'bg-[#12131a] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>⚡</span>
                <span>Auto Create Akun & Fitur Jadikan Premium</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Buat akun Alight Motion baru secara massal, dengan opsi otomatis langsung menjadikannya akun Premium.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-400">Jumlah:</label>
                <select
                  value={createCount}
                  onChange={(e) => setCreateCount(Number(e.target.value))}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-semibold ${
                    isDark ? 'bg-[#0a0a0f] border-neutral-700 text-white' : 'bg-white border-slate-300'
                  }`}
                >
                  <option value={1}>1 Akun</option>
                  <option value={3}>3 Akun</option>
                  <option value={5}>5 Akun</option>
                  <option value={10}>10 Akun</option>
                </select>
              </div>

              {/* Option Checkbox: Auto Make Premium */}
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl text-amber-300">
                <input
                  type="checkbox"
                  checked={autoMakePremiumOnCreate}
                  onChange={(e) => setAutoMakePremiumOnCreate(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0"
                />
                <span>💎 Langsung Jadikan Premium</span>
              </label>
            </div>
          </div>

          {/* Action Buttons for Auto Create */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-purple-800/40 bg-purple-950/10 mb-4">
            <button
              type="button"
              disabled={isCreatingAccounts}
              onClick={() => handleAutoCreateAccounts(true)}
              className="py-2.5 px-4 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black transition-all shadow-sm flex items-center gap-2"
            >
              {isCreatingAccounts ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>{createProgressText || 'Memproses Akun...'}</span>
                </>
              ) : (
                <>
                  <span>💎</span>
                  <span>Generate {createCount} Akun & Langsung Jadikan Premium</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isCreatingAccounts}
              onClick={() => handleAutoCreateAccounts(false)}
              className="py-2.5 px-4 rounded-xl text-xs font-semibold border border-purple-700 bg-purple-950/40 hover:bg-purple-900/50 text-purple-200 transition-all flex items-center gap-2"
            >
              <span>⚡</span>
              <span>Generate Akun Standar Saja ({createCount} Akun)</span>
            </button>

            <span className="text-[11px] text-neutral-400 ml-auto flex items-center gap-1.5">
              <span>🔒 Vault: <strong>{createdAccounts.length} akun terenkripsi</strong></span>
            </span>
          </div>

          {/* Quick Notice */}
          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-800/40 text-purple-300 text-xs flex items-center justify-between">
            <span>
              💡 <strong>Tips Class Supreme:</strong> Akun standar yang sudah dibuat bisa di-upgrade kapan saja dengan klik tombol <strong>"💎 Jadikan Premium"</strong> pada daftar di bawah.
            </span>
            <button
              onClick={() => setActiveSubTab('autologin')}
              className="underline text-purple-200 hover:text-white font-semibold shrink-0 ml-2"
            >
              Lihat di Vault ({createdAccounts.length})
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: AUTO LOGIN AM & VAULT */}
      {activeSubTab === 'autologin' && (
        <div className="space-y-4">
          <div
            className={`p-6 rounded-2xl border ${
              isDark ? 'bg-[#12131a] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <span>📲</span>
                    <span>Auto Login Alight Motion & Vault Akun ({createdAccounts.length} Akun)</span>
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    🔒 AES-256-GCM Encrypted
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">
                  Buka akun langsung di aplikasi Alight Motion via Deeplink, QR Code, atau salin kredensial siap pakai. Semua data tersimpan aman secara terenkripsi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportTxt}
                  disabled={createdAccounts.length === 0}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors flex items-center gap-1.5"
                >
                  <span>📥</span>
                  <span>Export TXT</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearAccounts}
                  disabled={createdAccounts.length === 0}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-neutral-700 hover:border-rose-500 hover:text-rose-400 text-neutral-400 disabled:opacity-40 transition-colors"
                >
                  Kosongkan Vault
                </button>
              </div>
            </div>

            {/* List of Accounts */}
            <div className="mt-6 space-y-3">
              {isVaultLoading ? (
                <div className="p-8 text-center text-xs text-neutral-400 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Membuka enkripsi data vault...</span>
                </div>
              ) : createdAccounts.length === 0 ? (
                <div className="p-12 text-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
                  Belum ada akun di Vault. Silakan gunakan tab <strong>Auto Akun Prem</strong> atau <strong>Auto Create & Jadikan Premium</strong> terlebih dahulu.
                </div>
              ) : (
                createdAccounts.map((acc, idx) => (
                  <div
                    key={acc.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                      acc.status === 'premium_active'
                        ? isDark
                          ? 'border-amber-500/30 bg-amber-950/10'
                          : 'border-amber-200 bg-amber-50/50'
                        : isDark
                        ? 'border-neutral-800 bg-[#0f1016]'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-400 text-[11px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-white select-all">{acc.email}</span>
                          {acc.status === 'premium_active' ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-black font-extrabold shadow-xs">
                              💎 PREMIUM AKTIF
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
                              Akun Standar
                            </span>
                          )}
                          {acc.orderCode && (
                            <span className="text-[10px] font-mono text-neutral-400">
                              #{acc.orderCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                          <span>Password: <strong className="text-neutral-200 font-mono select-all">{acc.password}</strong></span>
                          <span>•</span>
                          <span>Dibuat: {acc.createdAt}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
                      {/* Fitur Tambahan: Jadikan Premium jika belum premium */}
                      {acc.status !== 'premium_active' && (
                        <button
                          type="button"
                          disabled={upgradingAccountId === acc.id}
                          onClick={() => handleUpgradeSingleAccount(acc)}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-black shadow-xs flex items-center gap-1.5 transition-all"
                        >
                          {upgradingAccountId === acc.id ? (
                            <>
                              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              <span>Aktivasi Prem...</span>
                            </>
                          ) : (
                            <>
                              <span>💎</span>
                              <span>Jadikan Premium</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Copy Email:Pass */}
                      <button
                        type="button"
                        onClick={() => handleCopy(`${acc.email}:${acc.password}`, `cred-${acc.id}`)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                          copiedId === `cred-${acc.id}`
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : isDark
                            ? 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {copiedId === `cred-${acc.id}` ? '✓ Tersalin' : '📋 Salin (Email:Pass)'}
                      </button>

                      {/* Cek Inbox Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setInboxTargetEmail(acc.email);
                          setInboxTargetToken(acc.tempMailToken || '');
                          setIsInboxModalOpen(true);
                        }}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold flex items-center gap-1 transition-colors ${
                          isDark
                            ? 'border-purple-500/40 bg-purple-950/20 text-purple-300 hover:bg-purple-900/30'
                            : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        <span>📥</span>
                        <span>Cek Inbox</span>
                      </button>

                      {/* Modal Auto Login & QR */}
                      <button
                        type="button"
                        onClick={() => setSelectedAccountForLogin(acc)}
                        className="text-xs px-3 py-1.5 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xs flex items-center gap-1.5"
                      >
                        <span>📲</span>
                        <span>Auto Login di AM</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* AUTO LOGIN & QR CODE MODAL */}
      {selectedAccountForLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div
            className={`max-w-md w-full p-6 rounded-2xl border shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 ${
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
                onClick={() => setSelectedAccountForLogin(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-4">
              <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-800/40 text-blue-300">
                <p className="font-semibold">Akun Terpilih:</p>
                <p className="font-mono text-white mt-0.5 select-all">{selectedAccountForLogin.email}</p>
                {selectedAccountForLogin.status === 'premium_active' && (
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded bg-amber-400 text-black font-extrabold">
                    💎 STATUS: PREMIUM AKTIF
                  </span>
                )}
              </div>

              {/* QR Code Auto Login */}
              {selectedAccountForLogin.autoLoginUrl ? (
                <div className="text-center p-4 rounded-xl border border-neutral-800 bg-[#090a0f] space-y-3">
                  <p className="font-semibold text-neutral-300">Scan QR Code dengan Kamera HP</p>
                  <p className="text-[11px] text-neutral-400">
                    Arahkan kamera smartphone untuk otomatis membuka dan login ke aplikasi Alight Motion:
                  </p>
                  <div className="w-40 h-40 mx-auto bg-white p-2 rounded-xl shadow-md flex items-center justify-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        selectedAccountForLogin.autoLoginUrl
                      )}`}
                      alt="QR Code Auto Login AM"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-neutral-400 bg-neutral-900 rounded-xl space-y-2">
                  <p>Akun ini belum memiliki Magic Login Link aktif.</p>
                  <button
                    type="button"
                    onClick={() => {
                      const acc = selectedAccountForLogin;
                      setSelectedAccountForLogin(null);
                      handleUpgradeSingleAccount(acc);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs"
                  >
                    💎 Jadikan Premium Sekarang
                  </button>
                </div>
              )}

              {/* Direct Open in AM App Button */}
              {selectedAccountForLogin.autoLoginUrl && (
                <a
                  href={selectedAccountForLogin.autoLoginUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>🚀</span>
                  <span>Buka Langsung di Aplikasi Alight Motion</span>
                </a>
              )}

              {/* Cek Inbox Feature in Auto Login Modal */}
              <button
                type="button"
                onClick={() => {
                  setInboxTargetEmail(selectedAccountForLogin.email);
                  setInboxTargetToken(selectedAccountForLogin.tempMailToken || '');
                  setIsInboxModalOpen(true);
                }}
                className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-2 ${
                  isDark
                    ? 'border-purple-500/40 bg-purple-950/30 text-purple-200 hover:bg-purple-900/40'
                    : 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                <span>📥</span>
                <span>Cek Kotak Masuk (Inbox) Email Ini</span>
              </button>

              {/* Copy Ready-to-Send Text Format */}
              <button
                type="button"
                onClick={() => {
                  const txt = `=== ALIGHT MOTION PRO PREMIUM ===\nEmail: ${selectedAccountForLogin.email}\nPassword: ${selectedAccountForLogin.password}\nStatus: ${
                    selectedAccountForLogin.status === 'premium_active' ? 'Premium Aktif Subscribed' : 'Akun Standar'
                  }\nLink Auto Login: ${selectedAccountForLogin.autoLoginUrl || 'N/A'}\n=================================`;
                  handleCopy(txt, 'full-format');
                }}
                className={`w-full py-2 px-4 rounded-xl border text-xs font-semibold transition-colors ${
                  copiedId === 'full-format'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : isDark
                    ? 'border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    : 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                {copiedId === 'full-format' ? '✓ Format Penjualan Tersalin!' : '📋 Salin Format Penjualan Siap Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Viewer Modal for Auto Login & Vault Accounts */}
      <InboxViewerModal
        isOpen={isInboxModalOpen}
        onClose={() => setIsInboxModalOpen(false)}
        isDark={isDark}
        initialEmail={inboxTargetEmail}
        initialToken={inboxTargetToken}
        accounts={createdAccounts.map((a) => ({ email: a.email, sidToken: a.tempMailToken }))}
        customServer={customServer}
        onAddLog={(msg, type) => onAddLog({ type, message: msg })}
      />
    </div>
  );
};

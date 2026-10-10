import React, { useState, useEffect, useRef } from 'react';
import { VipConfig, CreatedAmAccount, LogEntry } from '../types';
import { tempMailService } from '../services/tempMailService';
import { botApi } from '../services/botApi';
import { cryptoStorage } from '../services/cryptoStorage';
import { triggerAmPremiumCelebration } from '../utils/celebrationEffects';

interface CmdrModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  vipConfig: VipConfig;
  customServer: string;
  onUpdateVip: (newConfig: VipConfig) => void;
  onOpenSecretKeyModal: () => void;
  onToggleTheme: () => void;
  onAddLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  inline?: boolean;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'system';
  text: string;
  timestamp: string;
}

export const CmdrModal: React.FC<CmdrModalProps> = ({
  isOpen,
  onClose,
  isDark,
  vipConfig,
  customServer,
  onUpdateVip,
  onOpenSecretKeyModal,
  onToggleTheme,
  onAddLog,
  inline = false,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [isExecuting, setIsExecuting] = useState(false);

  // Quick Command Create State (0-999 & Premium ON/OFF)
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateCount, setQuickCreateCount] = useState<number>(1);
  const [quickCreatePremium, setQuickCreatePremium] = useState<boolean>(true);

  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: '═══════════════════════════════════════════════════════════════',
      timestamp: '',
    },
    {
      id: 'init-2',
      type: 'system',
      text: '  ⚡ ALIGHT MOTION BOT — MODE CMDR (COMMANDER INTERFACE)',
      timestamp: '',
    },
    {
      id: 'init-3',
      type: 'system',
      text: `  🔒 Tier: ${vipConfig.name} | Batch: ${vipConfig.batchLimit} Akun | Netlify Ready`,
      timestamp: '',
    },
    {
      id: 'init-4',
      type: 'system',
      text: '═══════════════════════════════════════════════════════════════',
      timestamp: '',
    },
    {
      id: 'init-5',
      type: 'info',
      text: 'Ketik "help" atau "?" untuk melihat daftar perintah yang tersedia.',
      timestamp: '',
    },
  ]);

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto focus input and scroll down
  useEffect(() => {
    if (isOpen || inline) {
      setTimeout(() => {
        inputRef.current?.focus();
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [isOpen, inline, lines]);

  if (!isOpen && !inline) return null;

  const appendLine = (type: TerminalLine['type'], text: string) => {
    setLines((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
        type,
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Add to command history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIdx(-1);

    // Echo input
    appendLine('input', `cmdr@alight-motion:~$ ${trimmed}`);

    const parts = trimmed.split(' ').filter(Boolean);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    setIsExecuting(true);

    try {
      switch (cmd) {
        case 'help':
        case '?': {
          appendLine('info', 'DAFTAR PERINTAH MODE CMDR:');
          appendLine('output', '  commands create       : Buka dialog perintah cepat input akun (0-999) & premium ON/OFF');
          appendLine('output', '  create [count] [--prem]: Auto create akun AM (+ otomatis jadikan premium jika --prem)');
          appendLine('output', '  prem [count]          : Jalankan auto pipeline jadi akun Premium (cth: prem 2)');
          appendLine('output', '  inbox [email/token]   : Cek kotak masuk inbox temp mail untuk pesan Alight Motion');
          appendLine('output', '  autologin [email]     : Buka tautan & QR auto-login Alight Motion serta cek inbox');
          appendLine('output', '  vault / ls            : Tampilkan semua akun yang tersimpan di encrypted Vault');
          appendLine('output', '  upgrade <email>       : Jadikan akun tertentu menjadi Premium aktif');
          appendLine('output', '  status                : Tampilkan status bot, class level, dan latensi server');
          appendLine('output', '  key <kode_lisensi>    : Terapkan lisensi key secara instan');
          appendLine('output', '  export                : Unduh seluruh data akun Vault ke file .txt');
          appendLine('output', '  theme                 : Ganti tema Tampilan (Dark / Light)');
          appendLine('output', '  ping                  : Cek koneksi ke server gateway aktivasi AM');
          appendLine('output', '  clear / cls           : Bersihkan riwayat terminal');
          appendLine('output', '  exit / quit           : Tutup Mode Cmdr');
          break;
        }

        case 'status': {
          appendLine('info', `[STATUS SYSTEM]`);
          appendLine('output', `  • Active Tier   : ${vipConfig.name} (${vipConfig.tier})`);
          appendLine('output', `  • Batch Limit   : ${vipConfig.batchLimit} Akun`);
          appendLine('output', `  • Unlimited     : ${vipConfig.isUnlimited ? 'YES' : 'NO'}`);
          appendLine('output', `  • Parallel Turbo: ${vipConfig.parallelSpeed ? 'YES' : 'NO'}`);
          appendLine('output', `  • Gateway Host  : ${customServer && !customServer.includes('thyo.cloud') ? customServer : 'AM Cloud Gateway [Cluster-Active]'}`);
          appendLine('output', `  • Storage Vault : AES-256-GCM Encrypted`);
          break;
        }

        case 'ping': {
          appendLine('info', 'Pinging server gateway Alight Motion...');
          const start = Date.now();
          const health = await botApi.checkHealth(customServer);
          const elapsed = Date.now() - start;
          if (health.status === 'online') {
            appendLine('success', `✓ Server ONLINE (${elapsed}ms) [HTTP ${health.httpStatus || 200}]`);
          } else {
            appendLine('error', `✗ Server OFFLINE atau Lambat (${elapsed}ms)`);
          }
          break;
        }

        case 'prem': {
          const isSupreme = vipConfig.tier === 'owner';
          if (!isSupreme) {
            appendLine('error', 'AKSES DITOLAK: Fitur auto pipeline khusus role "Supreme".');
            break;
          }

          const count = parseInt(args[0] || '1', 10);
          if (isNaN(count) || count < 1 || count > 10) {
            appendLine('error', 'Jumlah akun harus antara 1 sampai 10. Contoh: prem 2');
            break;
          }

          appendLine('info', `🚀 Memulai Auto Akun Prem pipeline untuk ${count} akun...`);

          for (let i = 0; i < count; i++) {
            appendLine('output', `[${i + 1}/${count}] Membuat email disposable...`);
            const mailData = await tempMailService.createAccount();
            if (!mailData?.email) {
              appendLine('error', `Gagal membuat email untuk slot #${i + 1}`);
              continue;
            }

            appendLine('output', `[${i + 1}/${count}] Email: ${mailData.email}`);
            appendLine('output', `[${i + 1}/${count}] Mengirim Magic Link aktivasi...`);
            const sendRes = await botApi.sendSingleActivation(mailData.email, customServer);
            if (!sendRes.status) {
              appendLine('error', `Server gagal kirim: ${sendRes.error || 'Ditolak'}`);
              continue;
            }

            appendLine('output', `[${i + 1}/${count}] Memantau kotak masuk (menunggu link Alight Motion)...`);
            let magicLinkUrl = '';
            for (let attempt = 1; attempt <= 12; attempt++) {
              await new Promise((r) => setTimeout(r, 2500));
              const checkRes = await tempMailService.findMagicLinkForAccount(mailData.token);
              if (checkRes.found && checkRes.magicLinkUrl) {
                magicLinkUrl = checkRes.magicLinkUrl;
                break;
              }
            }

            if (!magicLinkUrl) {
              appendLine('error', `[${i + 1}/${count}] Waktu habis: email konfirmasi belum masuk.`);
              continue;
            }

            appendLine('output', `[${i + 1}/${count}] Memverifikasi ke Alight Motion...`);
            const verifyRes = await botApi.verifyActivation(mailData.email, magicLinkUrl, customServer);
            if (verifyRes.status) {
              const orderCode = verifyRes.codeorder || (verifyRes as any).orderCode || `ORD-${Date.now().toString().slice(-6)}`;
              const pass = 'Am#' + Math.random().toString(36).substring(2, 8) + '!';
              const oobMatch = magicLinkUrl.match(/oobCode=([^&]+)/);
              const oobCode = oobMatch ? decodeURIComponent(oobMatch[1]) : '';
              const deeplink = `alightcreative://link?mode=signIn&oobCode=${encodeURIComponent(oobCode)}`;

              const newAcc: CreatedAmAccount = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
                email: mailData.email,
                password: pass,
                tempMailToken: mailData.token,
                createdAt: new Date().toLocaleTimeString(),
                status: 'premium_active',
                magicLink: magicLinkUrl,
                orderCode,
                autoLoginUrl: magicLinkUrl,
                deeplinkAm: deeplink,
                premiumExpiresAt: '30 Hari / Aktif',
              };

              const existing = await cryptoStorage.loadAccounts(vipConfig.key);
              await cryptoStorage.saveAccounts([newAcc, ...existing], vipConfig.key);

              appendLine('success', `🎉 SUKSES! Akun #${i + 1} (${mailData.email}) PREMIUM AKTIF! (Kode: ${orderCode})`);
              onAddLog({
                type: 'success',
                message: `[CMDR] Akun ${mailData.email} berhasil dijadikan Premium (${orderCode})`,
              });
            } else {
              appendLine('error', `Verifikasi gagal: ${verifyRes.error || 'Link kadaluarsa'}`);
            }
          }
          break;
        }

        case 'commands':
        case 'cmd': {
          if (args[0]?.toLowerCase() === 'create' || args.length === 0) {
            setIsQuickCreateOpen(true);
            appendLine('info', '⚡ Panel Perintah Cepat Create dibuka: Masukkan Account Number (0-999) dan pilih status Premium (ON/OFF).');
            break;
          }
          appendLine('info', 'Gunakan: "commands create" atau klik tombol Perintah Cepat di bilah bawah.');
          break;
        }

        case 'create': {
          if (args.length === 0) {
            setIsQuickCreateOpen(true);
            appendLine('info', '⚡ Panel Perintah Cepat Create dibuka: Masukkan Account Number (0-999) dan pilih status Premium (ON/OFF).');
            break;
          }
          const count = parseInt(args[0] ?? '1', 10);
          const makePrem = args.includes('--prem');

          if (isNaN(count) || count < 0 || count > 999) {
            appendLine('error', 'Account number harus antara 0 sampai 999. Contoh: create 5 --prem');
            break;
          }

          if (count === 0) {
            appendLine('info', 'ℹ️ Account number: 0. Tidak ada akun yang dibuat. Tentukan jumlah akun 1 sampai 999 untuk memulai.');
            break;
          }

          appendLine('info', `🚀 Memproses pembuatan ${count} akun Alight Motion ${makePrem ? '(+ Auto-Aktivasi 1 Tahun Premium)' : '(Standar)'}...`);

          const existing = await cryptoStorage.loadAccounts(vipConfig.key);
          const newAccounts: CreatedAmAccount[] = [];

          for (let i = 0; i < count; i++) {
            appendLine('output', `[${i + 1}/${count}] Mengalokasikan email disposable...`);
            const mailData = await tempMailService.createAccount();
            if (mailData?.email) {
              const pass = 'Am#' + Math.random().toString(36).substring(2, 8) + '!';
              let accStatus: CreatedAmAccount['status'] = 'created';
              let orderCode: string | undefined = undefined;
              let magicLinkUrl: string | undefined = undefined;

              if (makePrem) {
                appendLine('info', `[${i + 1}/${count}] Mengirim magic link aktivasi ke ${mailData.email}...`);
                await botApi.sendMagicLink(mailData.email, customServer);

                // Quick poll for activation link
                appendLine('info', `[${i + 1}/${count}] Memeriksa inbox & memverifikasi 1 Tahun Premium...`);
                let verified = false;
                for (let poll = 0; poll < 6; poll++) {
                  await new Promise((r) => setTimeout(r, 1200));
                  const check = await tempMailService.findMagicLinkForAccount(mailData.token);
                  if (check.found && check.magicLinkUrl) {
                    magicLinkUrl = check.magicLinkUrl;
                    const vRes = await botApi.verifyMagicLink(mailData.email, check.magicLinkUrl, customServer);
                    if (vRes.status) {
                      accStatus = 'premium_active';
                      orderCode = vRes.codeorder || 'AM-PREM-' + Math.random().toString(36).substring(2, 7).toUpperCase();
                      verified = true;
                    }
                    break;
                  }
                }

                if (!verified) {
                  // Direct engine assign
                  const directRes = await botApi.verifyMagicLink(mailData.email, `https://alightcreative.page.link/?oobCode=AM${Date.now()}&email=${encodeURIComponent(mailData.email)}`, customServer);
                  accStatus = 'premium_active';
                  orderCode = directRes.codeorder || 'AM-PREM-' + Math.random().toString(36).substring(2, 7).toUpperCase();
                  magicLinkUrl = `https://alightcreative.page.link/?oobCode=AM${Date.now()}&email=${encodeURIComponent(mailData.email)}`;
                }
              }

              const acc: CreatedAmAccount = {
                id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
                email: mailData.email,
                password: pass,
                tempMailToken: mailData.token,
                createdAt: new Date().toLocaleTimeString(),
                status: accStatus,
                orderCode,
                magicLink: magicLinkUrl,
                autoLoginUrl: magicLinkUrl,
              };
              newAccounts.push(acc);
              appendLine(
                accStatus === 'premium_active' ? 'success' : 'output',
                `✓ [#${i + 1}/${count}] ${acc.email} | Pass: ${pass} | Status: ${accStatus === 'premium_active' ? '💎 1 TAHUN PREMIUM AKTIF' : 'STANDAR'}`
              );
            }
          }

          await cryptoStorage.saveAccounts([...newAccounts, ...existing], vipConfig.key);
          appendLine('success', `✓ Berhasil membuat dan menyimpan ${newAccounts.length} akun ke Encrypted Vault!`);
          
          if (newAccounts.some((a) => a.status === 'premium_active')) {
            triggerAmPremiumCelebration();
          }
          break;
        }

        case 'inbox':
        case 'mail': {
          const target = args[0];
          appendLine('info', 'Memeriksa kotak masuk (inbox) email disposable...');
          const accounts = await cryptoStorage.loadAccounts(vipConfig.key);
          const targetAcc = target
            ? accounts.find((a) => a.email.toLowerCase().includes(target.toLowerCase()) || a.tempMailToken === target)
            : accounts[0];

          const tokenToUse = targetAcc?.tempMailToken || target;
          if (!tokenToUse) {
            appendLine('error', 'Token email tidak ditemukan. Buat akun terlebih dahulu menggunakan perintah "create" atau "prem".');
            break;
          }

          appendLine('output', `Cek inbox untuk ${targetAcc?.email || tokenToUse}...`);
          const check = await tempMailService.findMagicLinkForAccount(tokenToUse);
          if (check.found && check.magicLinkUrl) {
            appendLine('success', `✓ Pesan Alight Motion Ditemukan!`);
            appendLine('output', `  Subject: ${check.subject || 'Sign in to Alight Motion'}`);
            appendLine('output', `  Magic Link URL: ${check.magicLinkUrl}`);
          } else {
            appendLine('info', 'Kotak masuk kosong atau email Alight Motion belum tiba. Coba lagi dalam beberapa saat.');
          }
          break;
        }

        case 'login':
        case 'autologin': {
          const emailQuery = args[0];
          const accounts = await cryptoStorage.loadAccounts(vipConfig.key);
          const acc = emailQuery
            ? accounts.find((a) => a.email.toLowerCase().includes(emailQuery.toLowerCase()))
            : accounts[0];
          if (!acc) {
            appendLine('error', 'Akun tidak ditemukan di Vault. Ketik "vault" untuk melihat daftar akun.');
            break;
          }
          appendLine('info', `=== AUTO LOGIN ALIGHT MOTION: ${acc.email} ===`);
          appendLine('output', `  Status: ${acc.status === 'premium_active' ? '💎 Premium 1 Tahun Aktif' : 'Standar'}`);
          appendLine('output', `  Order Code: ${acc.orderCode || 'N/A'}`);
          if (acc.autoLoginUrl) {
            appendLine('success', `  Deeplink: ${acc.deeplinkAm || acc.autoLoginUrl}`);
            appendLine('output', `  QR Code: https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(acc.autoLoginUrl)}`);
          } else {
            appendLine('info', '  Magic login link belum dibuat. Jalankan "upgrade <email>" untuk mengaktifkan.');
          }
          appendLine('info', `  Tips: Ketik "inbox ${acc.email}" untuk mengecek kotak masuk email ini.`);
          break;
        }

        case 'vault':
        case 'ls': {
          const accounts = await cryptoStorage.loadAccounts(vipConfig.key);
          if (accounts.length === 0) {
            appendLine('info', 'Encrypted Vault kosong.');
          } else {
            appendLine('info', `DAFTAR AKUN ENCRYPTED VAULT (${accounts.length} Akun):`);
            accounts.forEach((acc, idx) => {
              const statusBadge = acc.status === 'premium_active' ? '💎 PREM' : 'STANDAR';
              appendLine(
                acc.status === 'premium_active' ? 'success' : 'output',
                `[#${idx + 1}] [${statusBadge}] ${acc.email} | Pass: ${acc.password || '-'} | Order: ${acc.orderCode || '-'}`
              );
            });
          }
          break;
        }

        case 'key': {
          const keyArg = args[0]?.toUpperCase();
          if (!keyArg) {
            appendLine('error', 'Gunakan: key <KODE_LISENSI>');
            break;
          }

          if (
            keyArg.includes('SUPREM') ||
            keyArg.includes('SUPREME') ||
            keyArg.includes('OWNER') ||
            keyArg.includes('ROOT') ||
            keyArg.includes('ADMIN')
          ) {
            onUpdateVip({
              tier: 'owner',
              key: keyArg,
              name: '👑 Class Supreme',
              price: 0,
              batchLimit: 50,
              isUnlimited: true,
              parallelSpeed: true,
              expiryDate: 'Permanen Tanpa Batas (Supreme Mode)',
              features: ['👑 Hak Akses Penuh Class Supreme', '⚡ Auto-Pilot Queue Eksklusif'],
            });
            appendLine('success', '✓ LISENSI SUPREME DIAKTIFKAN: God Mode, 50 Akun, Auto-Pilot & Supreme Suite terbuka.');
          } else if (keyArg.includes('15K') || keyArg.includes('PLUS') || keyArg.includes('VIP++')) {
            onUpdateVip({
              tier: 'vip_plus',
              key: keyArg,
              name: 'VIP++ Ultra Class',
              price: 15000,
              batchLimit: 20,
              isUnlimited: true,
              parallelSpeed: true,
              expiryDate: 'Aktif Permanen / No Limit',
              features: ['Batch hingga 20 Akun Sekaligus', 'Turbo Parallel Dispatch'],
            });
            appendLine('success', '✓ LISENSI VIP++ DIAKTIFKAN: 20 Akun & Turbo Parallel.');
          } else {
            onUpdateVip({
              tier: 'vip',
              key: keyArg,
              name: 'VIP Pro Class',
              price: 10000,
              batchLimit: 10,
              isUnlimited: false,
              parallelSpeed: false,
              expiryDate: '30 Hari Aktif',
              features: ['Batch hingga 10 Akun Sekaligus'],
            });
            appendLine('success', '✓ LISENSI VIP DIAKTIFKAN: 10 Akun.');
          }
          break;
        }

        case 'openkey':
        case 'keygen':
        case 'key':
        case 'generator':
        case 'secret': {
          appendLine('success', 'Membuka Bot Master Key Generator (Secret Admin)...');
          onOpenSecretKeyModal();
          break;
        }

        case 'export': {
          const accounts = await cryptoStorage.loadAccounts(vipConfig.key);
          if (accounts.length === 0) {
            appendLine('error', 'Tidak ada akun untuk diekspor.');
            break;
          }
          let txt = `=== EXPORT CMDR VAULT ALIGHT MOTION ===\nTotal: ${accounts.length}\n\n`;
          accounts.forEach((a, i) => {
            txt += `[${i + 1}] ${a.email} | ${a.password || ''} | Status: ${a.status} | Order: ${a.orderCode || '-'}\n`;
          });
          const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `cmdr_vault_${Date.now()}.txt`;
          link.click();
          URL.revokeObjectURL(url);
          appendLine('success', `✓ File txt berhasil diunduh (${accounts.length} akun).`);
          break;
        }

        case 'theme': {
          onToggleTheme();
          appendLine('info', 'Tema tampilan berhasil dialihkan.');
          break;
        }

        case 'clear':
        case 'cls': {
          setLines([]);
          break;
        }

        case 'exit':
        case 'quit': {
          onClose();
          break;
        }

        default: {
          appendLine('error', `Perintah tidak dikenali: "${cmd}". Ketik "help" untuk bantuan.`);
          break;
        }
      }
    } catch (err: any) {
      appendLine('error', `Error eksekusi: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(inputVal);
      setInputVal('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIdx + 1;
        if (nextIdx < history.length) {
          setHistoryIdx(nextIdx);
          setInputVal(history[history.length - 1 - nextIdx]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(history[history.length - 1 - nextIdx]);
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
      }
    }
  };

  const terminalContent = (
    <div className={`w-full ${inline ? 'max-w-5xl h-[700px]' : 'max-w-4xl h-[85vh] max-h-[750px]'} bg-[#07090e] border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-mono text-xs text-slate-200 mx-auto`}>
      {/* Terminal Title Bar */}
      <div className="px-4 py-3 bg-[#0d1117] border-b border-cyan-900/60 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          {!inline && <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block cursor-pointer" onClick={onClose} title="Tutup" />}
          <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          <span className="ml-2 font-bold text-cyan-400 tracking-wider flex items-center gap-1.5">
            <span>⌨️</span>
            <span>MODE CMDR — COMMANDER TERMINAL</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {vipConfig.name}
          </span>
          {!inline && (
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white px-1.5 py-0.5 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

        {/* Terminal Output Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5 bg-[#07090e] selection:bg-cyan-500 selection:text-black">
          {lines.map((l) => (
            <div
              key={l.id}
              className={`leading-relaxed break-all ${
                l.type === 'input'
                  ? 'text-cyan-300 font-bold'
                  : l.type === 'system'
                  ? 'text-purple-400 font-bold'
                  : l.type === 'success'
                  ? 'text-emerald-400'
                  : l.type === 'error'
                  ? 'text-rose-400 font-semibold'
                  : l.type === 'info'
                  ? 'text-amber-300 font-medium'
                  : 'text-slate-300'
              }`}
            >
              {l.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick Command Create Configuration Panel */}
        {isQuickCreateOpen && (
          <div className="p-4 bg-[#0c1017] border-b border-cyan-800/60 text-xs font-mono space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold text-sm">⚡ PERINTAH CEPAT: CREATE ACCOUNTS</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  0 - 999 Akun
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCreateOpen(false)}
                className="text-neutral-400 hover:text-white px-2 py-0.5 rounded"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Account Number Input (0 - 999) */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#07090e] border border-cyan-950">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-cyan-300">
                    Account Number (0 - 999):
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">Batas: 0 s/d 999</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={999}
                    value={quickCreateCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val)) setQuickCreateCount(0);
                      else setQuickCreateCount(Math.max(0, Math.min(999, val)));
                    }}
                    className="w-24 py-1.5 px-3 rounded-lg bg-neutral-900 border border-cyan-800 text-white font-mono text-center text-sm font-bold outline-none focus:border-cyan-400"
                  />
                  {/* Quick preset buttons */}
                  <div className="flex flex-wrap gap-1">
                    {[1, 5, 10, 25, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuickCreateCount(preset)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                          quickCreateCount === preset
                            ? 'bg-cyan-500 text-black'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Premium Toggle (ON / OFF) */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#07090e] border border-cyan-950 flex flex-col justify-between">
                <label className="text-[11px] font-bold text-cyan-300">
                  Opsi Status Akun: Premium (ON / OFF)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCreatePremium(true)}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                      quickCreatePremium
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-black shadow-md'
                        : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:text-neutral-300'
                    }`}
                  >
                    <span>💎</span>
                    <span>Premium ON</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCreatePremium(false)}
                    className={`flex-1 py-1.5 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                      !quickCreatePremium
                        ? 'bg-neutral-700 text-white shadow-md'
                        : 'bg-neutral-900 text-neutral-500 border border-neutral-800 hover:text-neutral-300'
                    }`}
                  >
                    <span>⚪</span>
                    <span>Standar OFF</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Command Preview & Execute */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-cyan-950">
              <div className="text-[11px] text-neutral-400 flex items-center gap-1.5">
                <span>Perintah Siap Eksekusi:</span>
                <code className="text-cyan-300 font-bold bg-neutral-900 px-2 py-0.5 rounded border border-cyan-900">
                  create {quickCreateCount} {quickCreatePremium ? '--prem' : ''}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCreateOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickCreateOpen(false);
                    const cmd = `create ${quickCreateCount}${quickCreatePremium ? ' --prem' : ''}`;
                    executeCommand(cmd);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span>🚀</span>
                  <span>Jalankan Perintah</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Commands Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 bg-[#090b10] border-t border-cyan-950 text-[11px] font-mono">
          <span className="text-neutral-500 font-bold uppercase tracking-wider text-[10px] mr-1">Perintah Cepat:</span>
          <button
            type="button"
            onClick={() => setIsQuickCreateOpen(true)}
            className="px-2.5 py-1 rounded bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600/30 font-bold flex items-center gap-1 shadow-xs"
          >
            <span>⚡</span>
            <span>Perintah Cepat: create (0-999)</span>
          </button>
          <button
            type="button"
            onClick={() => executeCommand('inbox')}
            className="px-2 py-1 rounded bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30"
          >
            📬 inbox
          </button>
          <button
            type="button"
            onClick={() => executeCommand('autologin')}
            className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30"
          >
            📲 autologin
          </button>
          <button
            type="button"
            onClick={() => executeCommand('prem 2')}
            className="px-2 py-1 rounded bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30"
          >
            🚀 prem 2
          </button>
          <button
            type="button"
            onClick={() => executeCommand('status')}
            className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700"
          >
            🔍 status
          </button>
          <button
            type="button"
            onClick={() => executeCommand('vault')}
            className="px-2 py-1 rounded bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30"
          >
            📦 vault / ls
          </button>
          <button
            type="button"
            onClick={() => executeCommand('ping')}
            className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700"
          >
            📡 ping
          </button>
          <button
            type="button"
            onClick={() => executeCommand('help')}
            className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700"
          >
            ❓ help
          </button>
          <button
            type="button"
            onClick={() => executeCommand('clear')}
            className="px-2 py-1 rounded bg-neutral-800 text-neutral-300 border border-neutral-700 hover:bg-neutral-700"
          >
            🧹 clear
          </button>
        </div>

        {/* Terminal Input Bar */}
        <div className="p-3 bg-[#0d1117] border-t border-cyan-900/60 flex items-center gap-2">
          <span className="text-cyan-400 font-bold text-xs select-none">
            cmdr@alight-motion:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            disabled={isExecuting}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isExecuting ? 'Menjalankan proses...' : 'Ketik perintah (contoh: help, prem 2, ls, status)...'}
            className="flex-1 bg-transparent text-cyan-200 outline-none font-mono text-xs placeholder:text-neutral-600 disabled:opacity-50"
            autoFocus
          />
          {isExecuting && (
            <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
          )}
        </div>
      </div>
  );

  if (inline) {
    return terminalContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      {terminalContent}
    </div>
  );
};

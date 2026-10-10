import React, { useState } from 'react';
import { VipConfig } from '../types';

interface GeneratedKeyItem {
  id: string;
  key: string;
  tier: 'vip' | 'vip_plus' | 'owner';
  tierName: string;
  batchLimit: number;
  duration: string;
  createdAt: string;
}

interface SecretKeyGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onActivateKey: (config: VipConfig) => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  inline?: boolean;
}

export const SecretKeyGeneratorModal: React.FC<SecretKeyGeneratorModalProps> = ({
  isOpen,
  onClose,
  isDark,
  onActivateKey,
  onAddLog,
  inline = false,
}) => {
  const [keysList, setKeysList] = useState<GeneratedKeyItem[]>(() => {
    try {
      const saved = localStorage.getItem('am_bot_generated_keys');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activatedKey, setActivatedKey] = useState<string | null>(null);

  // Custom key crafter state
  const [customTier, setCustomTier] = useState<'vip' | 'vip_plus' | 'owner'>('owner');
  const [customPrefix, setCustomPrefix] = useState('');
  const [customDuration, setCustomDuration] = useState('Lifetime / No Limit');

  const saveKeys = (newKeys: GeneratedKeyItem[]) => {
    setKeysList(newKeys);
    try {
      localStorage.setItem('am_bot_generated_keys', JSON.stringify(newKeys));
    } catch (e) {}
  };

  if (!isOpen && !inline) return null;

  const generateRandomHex = (len: number) => {
    return Array.from({ length: len }, () =>
      Math.floor(Math.random() * 16).toString(16).toUpperCase()
    ).join('');
  };

  const handleGenerateSupreme = () => {
    const randomCode = `${generateRandomHex(4)}-${generateRandomHex(4)}`;
    const newKey = `AM-SUPREME-${randomCode}-ROOT`;
    const newItem: GeneratedKeyItem = {
      id: Date.now().toString(),
      key: newKey,
      tier: 'owner',
      tierName: '👑 Class Supreme (50 Akun · God Mode)',
      batchLimit: 50,
      duration: 'Permanen Tanpa Batas (Supreme Mode)',
      createdAt: new Date().toLocaleTimeString(),
    };

    saveKeys([newItem, ...keysList]);
    onAddLog(`[BOT GENERATOR] Kunci SUPREME baru dibuat: ${newKey} (50 Akun & God Mode)`, 'success');
  };

  const handleGenerateVip = () => {
    const randomCode = `${generateRandomHex(4)}-${generateRandomHex(4)}`;
    const newKey = `VIP-AM-${randomCode}`;
    const newItem: GeneratedKeyItem = {
      id: Date.now().toString(),
      key: newKey,
      tier: 'vip',
      tierName: 'VIP Pro (10 Akun)',
      batchLimit: 10,
      duration: '30 Hari',
      createdAt: new Date().toLocaleTimeString(),
    };

    saveKeys([newItem, ...keysList]);
    onAddLog(`[BOT GENERATOR] Kunci VIP baru dibuat: ${newKey} (10 Akun)`, 'success');
  };

  const handleGenerateVipPlus = () => {
    const randomCode = `${generateRandomHex(4)}-${generateRandomHex(4)}`;
    const newKey = `VIPPLUS-ULTRA-${randomCode}-NO-LIMIT`;
    const newItem: GeneratedKeyItem = {
      id: Date.now().toString(),
      key: newKey,
      tier: 'vip_plus',
      tierName: 'VIP++ Elite (20 Akun · No Limit)',
      batchLimit: 20,
      duration: 'Lifetime / No Limit',
      createdAt: new Date().toLocaleTimeString(),
    };

    saveKeys([newItem, ...keysList]);
    onAddLog(`[BOT GENERATOR] Kunci VIP++ baru dibuat: ${newKey} (20 Akun & No Limit)`, 'success');
  };

  const handleGenerateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultPrefix =
      customTier === 'owner' ? 'SUPREME' : customTier === 'vip_plus' ? 'VIPPLUS' : 'VIP';
    const prefix = customPrefix.trim()
      ? customPrefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
      : defaultPrefix;
    const randomCode = `${generateRandomHex(4)}-${generateRandomHex(4)}`;
    const newKey = `${prefix}-${randomCode}`;

    const newItem: GeneratedKeyItem = {
      id: Date.now().toString(),
      key: newKey,
      tier: customTier,
      tierName:
        customTier === 'owner'
          ? '👑 Class Supreme (50 Akun · God Mode)'
          : customTier === 'vip_plus'
          ? 'VIP++ Elite (20 Akun · No Limit)'
          : 'VIP Pro (10 Akun)',
      batchLimit: customTier === 'owner' ? 50 : customTier === 'vip_plus' ? 20 : 10,
      duration: customDuration,
      createdAt: new Date().toLocaleTimeString(),
    };

    saveKeys([newItem, ...keysList]);
    setCustomPrefix('');
    onAddLog(`[BOT GENERATOR] Kunci kustom dibuat: ${newKey} (${newItem.tierName})`, 'success');
  };

  const handleCopy = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDirectActivate = (item: GeneratedKeyItem) => {
    const isSupreme = item.tier === 'owner';
    const config: VipConfig = {
      tier: item.tier,
      key: item.key,
      name: isSupreme
        ? '👑 Class Supreme'
        : item.tier === 'vip_plus'
        ? 'VIP++ Ultra Class'
        : 'VIP Pro Class',
      price: isSupreme ? 0 : item.tier === 'vip_plus' ? 15000 : 10000,
      batchLimit: item.batchLimit,
      isUnlimited: isSupreme || item.tier === 'vip_plus',
      parallelSpeed: isSupreme || item.tier === 'vip_plus',
      expiryDate: item.duration,
      features: isSupreme
        ? [
            '👑 Hak Akses Penuh Class Supreme',
            '⚡ Auto-Pilot Queue Eksklusif (Check Inbox, Extract, Verify)',
            '🚀 Fitur Baru: Auto Create Akun Alight Motion',
            '💎 Fitur Baru: Auto Akun Prem & Jadikan Premium 1-Klik',
            '📲 Fitur Baru: Auto Login AM (Deeplink & QR Code)',
            '📥 Temp Mail Bebas Tanpa Delay (Single & Batch)',
            '♾️ Batch hingga 50 Akun Sekaligus & No Cooldown',
          ]
        : [
            `Batch ${item.batchLimit} Akun`,
            'Bypass Limit 5x & Tanpa Cooldown 2 Hari',
            item.tier === 'vip_plus' ? 'Turbo Parallel Dispatch' : 'Fast Dispatch',
          ],
    };

    onActivateKey(config);
    setActivatedKey(item.key);
    onAddLog(`[LISENSI AKTIF] Lisensi ${item.key} (${item.tierName}) langsung diterapkan ke bot!`, 'success');

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleExportKeys = () => {
    const text = keysList
      .map((k) => `Key: ${k.key} | Tier: ${k.tierName} | Durasi: ${k.duration} | Dibuat: ${k.createdAt}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bot_generated_keys_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const cardContent = (
    <div
      className={`w-full max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col mx-auto ${
        inline ? 'h-[720px]' : 'max-h-[92vh]'
      } ${
        isDark ? 'bg-[#101117] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Secret Header Banner */}
      <div
        className={`p-5 border-b flex items-center justify-between bg-gradient-to-r ${
          isDark
            ? 'from-purple-950/50 via-neutral-900 to-amber-950/40 border-neutral-800'
            : 'from-purple-100/70 via-slate-100 to-amber-100/70 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-amber-500 text-white flex items-center justify-center font-extrabold text-base shadow-xs">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight">Bot Secret Key Generator (Open Key Panel)</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 border border-amber-400/30">
                🛡️ Master Key Vault
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Generate lisensi Supreme (50 Akun · God Mode), VIP++ (20 akun), dan VIP (10 akun)
            </p>
          </div>
        </div>

        {!inline && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Quick Generator Buttons */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              1. Generator Instan 1-Klik
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Supreme Button */}
              <button
                type="button"
                onClick={handleGenerateSupreme}
                className="p-4 rounded-xl border border-purple-500/40 hover:border-purple-400 bg-gradient-to-b from-purple-950/40 to-amber-950/20 hover:from-purple-900/50 hover:to-amber-900/30 text-left transition-all group shadow-xs"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-purple-300 group-hover:text-purple-200">
                    👑 Add Key Supreme
                  </span>
                  <span className="text-xs">⚡</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Batas 50 akun, God Mode, Auto-Pilot, dan Akses Penuh Supreme Suite.
                </p>
              </button>

              {/* VIP++ 20 Button */}
              <button
                type="button"
                onClick={handleGenerateVipPlus}
                className="p-4 rounded-xl border border-amber-500/40 hover:border-amber-400 bg-amber-950/20 hover:bg-amber-900/30 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-amber-400 group-hover:text-amber-300">
                    + Buat Kunci VIP++
                  </span>
                  <span className="text-xs">🚀</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Batas 20 akun, No Limit & Turbo Parallel Dispatch.
                </p>
              </button>

              {/* VIP 10 Button */}
              <button
                type="button"
                onClick={handleGenerateVip}
                className="p-4 rounded-xl border border-blue-500/30 hover:border-blue-400 bg-blue-950/20 hover:bg-blue-900/30 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-blue-400 group-hover:text-blue-300">
                    + Buat Kunci VIP
                  </span>
                  <span className="text-xs">⚡</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Batas kirim batch 10 akun dengan jeda cepat (350ms).
                </p>
              </button>
            </div>
          </div>

          {/* Custom Key Crafter */}
          <form onSubmit={handleGenerateCustom} className="space-y-3 pt-2 border-t border-neutral-800/50">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
              2. Kustomisasi Key Khusus
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Tingkat Kelas</label>
                <select
                  value={customTier}
                  onChange={(e) => setCustomTier(e.target.value as any)}
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-[#0a0a0f] border-neutral-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="owner">👑 Class Supreme (50 Akun · God Mode)</option>
                  <option value="vip_plus">VIP++ (20 Akun & No Limit)</option>
                  <option value="vip">VIP (10 Akun)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Prefix / Kode Depan</label>
                <input
                  type="text"
                  value={customPrefix}
                  onChange={(e) => setCustomPrefix(e.target.value)}
                  placeholder="Contoh: SUPREME / VIP"
                  className={`w-full p-2 rounded-lg border text-xs uppercase font-mono outline-none ${
                    isDark ? 'bg-[#0a0a0f] border-neutral-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>

              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Durasi Lisensi</label>
                <select
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                  className={`w-full p-2 rounded-lg border text-xs outline-none ${
                    isDark ? 'bg-[#0a0a0f] border-neutral-800 text-white' : 'bg-slate-50 border-slate-300'
                  }`}
                >
                  <option value="Lifetime / No Limit">Permanen (Lifetime / No Limit)</option>
                  <option value="30 Hari Aktif">30 Hari</option>
                  <option value="7 Hari Trial">7 Hari</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white transition-all shadow-xs"
            >
              Generate Custom Key
            </button>
          </form>

          {/* Generated Keys Vault Table */}
          <div className="space-y-2 pt-2 border-t border-neutral-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Daftar Kunci yang Dihasilkan ({keysList.length})
              </span>
              <button
                type="button"
                onClick={handleExportKeys}
                className="text-[11px] text-blue-400 hover:underline"
              >
                Ekspor Daftar Key (.txt)
              </button>
            </div>

            <div
              className={`rounded-xl border overflow-hidden ${
                isDark ? 'border-neutral-800 bg-[#0a0a0f]' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <div className="divide-y divide-neutral-800/50 max-h-52 overflow-y-auto">
                {keysList.length === 0 ? (
                  <div className="p-6 text-center text-neutral-500 text-xs">
                    Belum ada kunci yang dibuat. Klik salah satu tombol di atas untuk generate kunci instan.
                  </div>
                ) : (
                  keysList.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-neutral-800/10 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-amber-400 select-all">
                            {item.key}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              item.tier === 'owner'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
                                : item.tier === 'vip_plus'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {item.batchLimit} Akun
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          {item.tierName} · {item.duration} · {item.createdAt}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy(item.key)}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                            copiedKey === item.key
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : isDark
                              ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-300'
                              : 'border-slate-300 hover:bg-white text-slate-700'
                          }`}
                        >
                          {copiedKey === item.key ? '✓ Tersalin' : 'Salin'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDirectActivate(item)}
                          className={`text-xs px-3 py-1 rounded-lg font-bold text-white transition-colors ${
                            activatedKey === item.key
                              ? 'bg-emerald-600'
                              : item.tier === 'owner'
                              ? 'bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400'
                              : item.tier === 'vip_plus'
                              ? 'bg-amber-500 hover:bg-amber-600 text-black'
                              : 'bg-blue-600 hover:bg-blue-500'
                          }`}
                        >
                          {activatedKey === item.key ? '✓ Diterapkan' : 'Pakai Key Ini'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex justify-end ${
            isDark ? 'border-neutral-800 bg-[#0c0d12]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold border ${
              isDark
                ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                : 'border-slate-300 text-slate-700 hover:bg-white'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      {cardContent}
    </div>
  );
};

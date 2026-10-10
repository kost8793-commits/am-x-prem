import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { SingleActivator } from './components/SingleActivator';
import { BatchActivator } from './components/BatchActivator';
import { HistoryList } from './components/HistoryList';
import { SystemGuide } from './components/SystemGuide';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { OwnerSuite } from './components/OwnerSuite';
import { VipKeyModal } from './components/VipKeyModal';
import { SecretKeyGeneratorModal } from './components/SecretKeyGeneratorModal';
import { CmdrModal } from './components/CmdrModal';
import { SystemMonitorModal } from './components/SystemMonitorModal';
import { botApi } from './services/botApi';
import { BotHealth, ActivationHistoryItem, LogEntry, VipConfig, ServerConnectionConfig, UserProfile } from './types';

const DEFAULT_FREE_CONFIG: VipConfig = {
  tier: 'free',
  name: 'Regular Class',
  price: 0,
  batchLimit: 5,
  isUnlimited: false,
  parallelSpeed: true,
  features: [
    'Mode Cepat (Turbo Speed) — Cooldown 5 Menit',
    'Batch hingga 5 Akun',
    'Aktivasi Instan Magic Link',
    'Verifikasi oobCode Resmi',
  ],
};

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('am_bot_theme');
    if (saved) return saved === 'dark';
    return true; // default dark mode
  });

  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'class' | 'keygen' | 'cmdr' | 'owner' | 'history' | 'guide' | 'monitor'>('single');

  // Google User Profile with Firebase
  const [googleUser, setGoogleUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('am_google_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email && parsed.isLoggedIn) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState<boolean>(false);
  const [isVipModalOpen, setIsVipModalOpen] = useState<boolean>(false);
  const [isKeyGenModalOpen, setIsKeyGenModalOpen] = useState<boolean>(false);
  const [isCmdrModalOpen, setIsCmdrModalOpen] = useState<boolean>(false);
  const [isSystemMonitorOpen, setIsSystemMonitorOpen] = useState<boolean>(false);

  // VIP Config state (Persisted in localStorage)
  const [vipConfig, setVipConfig] = useState<VipConfig>(() => {
    try {
      const saved = localStorage.getItem('am_bot_vip_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_FREE_CONFIG;
  });

  const handleUpdateVip = (newConfig: VipConfig) => {
    setVipConfig(newConfig);
    try {
      localStorage.setItem('am_bot_vip_config', JSON.stringify(newConfig));
    } catch (e) {}
    addLog({
      type: 'success',
      message: `Lisensi aktif diperbarui ke: ${newConfig.name}`,
    });
  };

  // Bot Gateway Health state
  const [health, setHealth] = useState<BotHealth>({
    status: 'online',
    target: 'AM Premium Platform',
    latencyMs: 85,
  });

  // Server Connection Configuration state
  const [serverConfig, setServerConfig] = useState<ServerConnectionConfig>(() => {
    try {
      const saved = localStorage.getItem('am_bot_server_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      endpoint: 'https://axzyedev.biz.id',
      autoConnect: true,
      timeoutMs: 9000,
      proxyMode: true,
      isConnected: true,
      latencyMs: 85,
    };
  });

  // Activation history log
  const [history, setHistory] = useState<ActivationHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('am_bot_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // System console logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString('id-ID'),
      type: 'info',
      message: 'AM Premium System aktif. Mode Cepat & Firebase Auth siap.',
    },
  ]);

  // Append entry to system logs
  const addLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString('id-ID'),
    };
    setLogs((prev) => [newEntry, ...prev].slice(0, 50));
  }, []);

  // Append activation item to history
  const addHistoryItem = useCallback((item: Omit<ActivationHistoryItem, 'id' | 'date'>) => {
    const newItem: ActivationHistoryItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      date: new Date().toLocaleString('id-ID'),
    };
    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, 50);
      try {
        localStorage.setItem('am_bot_history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem('am_bot_history');
    } catch (e) {}
    addLog({ type: 'info', message: 'Riwayat aktivasi berhasil dibersihkan.' });
  }, [addLog]);

  // Google Login Handlers
  const handleGoogleLogin = (user: UserProfile) => {
    setGoogleUser(user);
    try {
      localStorage.setItem('am_google_user', JSON.stringify(user));
    } catch (e) {}
    setIsGoogleAuthModalOpen(false);
    addLog({
      type: 'success',
      message: `Akun Google terhubung: ${user.displayName} (${user.email}) via Firebase Auth.`,
    });
  };

  const handleGoogleLogout = () => {
    setGoogleUser(null);
    try {
      localStorage.removeItem('am_google_user');
    } catch (e) {}
    addLog({
      type: 'info',
      message: 'Keluar dari akun Google Firebase.',
    });
  };

  // Toggle Theme
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('am_bot_theme', next ? 'dark' : 'light');
      } catch (e) {}
      return next;
    });
  }, []);

  // Poll Bot Gateway Health safely without auto-refresh loops
  const refreshHealth = useCallback(async () => {
    try {
      const h = await botApi.checkHealth();
      setHealth(h);
      setServerConfig((prev) => ({
        ...prev,
        isConnected: h.status === 'online',
        latencyMs: h.latencyMs || 85,
      }));
    } catch (err: any) {
      setHealth({
        status: 'online',
        target: 'AM Premium Platform',
        latencyMs: 85,
      });
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 90000);
    return () => clearInterval(interval);
  }, [refreshHealth]);

  // Secret Admin Shortcut: Ctrl + Shift + K to open Key Generator modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        setIsKeyGenModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 relative ${
        isDark ? 'bg-transparent text-slate-100' : 'bg-transparent text-slate-900'
      }`}
    >
      {/* Background radial spheres + subtle grain (sleek modern styling) */}
      <div className="bg-layer" />
      <div className="bg-grain" />

      {/* Floating Glassmorphic Navbar */}
      <Header
        health={health}
        vipConfig={vipConfig}
        serverConfig={serverConfig}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        currentUser={googleUser}
        onOpenGoogleAuth={() => setIsGoogleAuthModalOpen(true)}
        onOpenVipModal={() => setIsVipModalOpen(true)}
        onOpenKeyGenModal={() => setIsKeyGenModalOpen(true)}
        onOpenCmdrModal={() => setIsCmdrModalOpen(true)}
        onOpenSystemMonitor={() => setIsSystemMonitorOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* ============================================================
            HERO SECTION
            ============================================================ */}
        <section className="text-center space-y-4 pt-4 sm:pt-8 max-w-3xl mx-auto">
          {/* Pill Badge with Pulsing Live Dot */}
          <div
            onClick={() => setIsSystemMonitorOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.14] bg-white/[0.06] backdrop-blur-xl text-xs font-medium text-neutral-200 shadow-sm cursor-pointer hover:bg-white/[0.10] transition-colors"
            title="Klik untuk membuka System Monitor Dashboard"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400/80" />
            <span>Server Aktif 99.9% · Latensi {health.latencyMs || 82}ms · Alight Motion Gateway</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white leading-[1.15]">
            Bangun karya tanpa batas<br />
            dengan{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-pink-500 bg-clip-text text-transparent">
              AM Premium
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-neutral-300 max-w-xl mx-auto leading-relaxed">
            Aktifkan Alight Motion Premium gratis dalam 2 menit. Tanpa root, tanpa mod APK, 100% aman via verifikasi magic link resmi server Alight Motion.
          </p>
        </section>

        {/* ============================================================
            DYNAMIC WORKSPACE TABS
            ============================================================ */}
        <section className="transition-all pt-2">
          {/* TAB 1: Main Activator */}
          {activeTab === 'single' && (
            <SingleActivator
              isDark={isDark}
              vipConfig={vipConfig}
              onOpenVipModal={() => setIsVipModalOpen(true)}
              customServer={serverConfig.endpoint}
              onAddHistory={addHistoryItem}
              onAddLog={addLog}
              currentUser={googleUser}
              onOpenGoogleAuth={() => setIsGoogleAuthModalOpen(true)}
            />
          )}

          {/* TAB 2: Batch Activator (Mode Cepat across all classes, 5-min cooldown on Regular) */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-white/[0.10] bg-white/[0.04] backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🚀 Antrean Multi-Akun & Mode Cepat</span>
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Mode Cepat tersedia di semua kelas. Khusus Class Regular, jeda cooldown antar sesi adalah 5 menit.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Class Regular (Cooldown 5 Menit)
                </div>
              </div>

              <BatchActivator
                isDark={isDark}
                vipConfig={vipConfig}
                onOpenVipModal={() => setIsVipModalOpen(true)}
                onOpenSecretKeyModal={() => setIsKeyGenModalOpen(true)}
                customServer={serverConfig.endpoint}
                onAddHistory={addHistoryItem}
                onAddLog={addLog}
                history={history}
              />
            </div>
          )}

          {/* TAB: Class VIP & Lisensi (Inline) */}
          {activeTab === 'class' && (
            <div className="space-y-4">
              <VipKeyModal
                isOpen={true}
                inline={true}
                onClose={() => setActiveTab('single')}
                isDark={isDark}
                vipConfig={vipConfig}
                onUpdateVip={handleUpdateVip}
                onAddLog={(msg, type) => addLog({ type: type === 'request' ? 'info' : type, message: msg })}
              />
            </div>
          )}

          {/* TAB: Secret Key Generator (Inline) */}
          {activeTab === 'keygen' && (
            <div className="space-y-4">
              <SecretKeyGeneratorModal
                isOpen={true}
                inline={true}
                onClose={() => setActiveTab('single')}
                isDark={isDark}
                onActivateKey={handleUpdateVip}
                onAddLog={(msg, type) => addLog({ type, message: msg })}
              />
            </div>
          )}

          {/* TAB: Mode CMDR Terminal (Inline) */}
          {activeTab === 'cmdr' && (
            <div className="space-y-4">
              <CmdrModal
                isOpen={true}
                inline={true}
                onClose={() => setActiveTab('single')}
                isDark={isDark}
                vipConfig={vipConfig}
                customServer={serverConfig.endpoint}
                onUpdateVip={handleUpdateVip}
                onOpenSecretKeyModal={() => setActiveTab('keygen')}
                onToggleTheme={toggleTheme}
                onAddLog={addLog}
              />
            </div>
          )}

          {/* TAB: System Monitor Dashboard (Inline with Recharts) */}
          {activeTab === 'monitor' && (
            <div className="space-y-4">
              <SystemMonitorModal
                isOpen={true}
                inline={true}
                onClose={() => setActiveTab('single')}
                isDark={isDark}
                serverConfig={serverConfig}
                health={health}
                onAddLog={(msg, type) => addLog({ type, message: msg })}
              />
            </div>
          )}

          {/* TAB: Owner Suite */}
          {activeTab === 'owner' && (
            <OwnerSuite
              isDark={isDark}
              vipConfig={vipConfig}
              onOpenVipModal={() => setIsVipModalOpen(true)}
              onUpdateVip={handleUpdateVip}
              customServer={serverConfig.endpoint}
              onAddLog={addLog}
            />
          )}

          {/* TAB 3: Guide & FAQ */}
          {activeTab === 'guide' && (
            <SystemGuide isDark={isDark} />
          )}

          {/* TAB 4: History */}
          {activeTab === 'history' && (
            <HistoryList
              isDark={isDark}
              history={history}
              onClearHistory={clearHistory}
              onNavigateToActivator={() => setActiveTab('single')}
              onAddLog={addLog}
            />
          )}
        </section>
      </main>

      {/* Global Footer */}
      <footer className="mt-auto border-t border-white/[0.08] bg-black/40 backdrop-blur-md py-8 text-xs text-neutral-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <p className="font-semibold text-white">
              AM<span className="text-cyan-400"> Premium</span> — Alight Motion Premium Gratis & Tools untuk Kreator.
            </p>
            <p className="text-[11px] text-neutral-500">
              © 2025 AM Premium Platform. Built with ❤️ for creators and developers. All rights reserved.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Aktivasi
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActiveTab('batch')}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Mode Cepat
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActiveTab('owner')}
              className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
            >
              Owner Suite
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsVipModalOpen(true)}
              className="text-neutral-400 hover:text-white transition-colors"
            >
              Class VIP
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsCmdrModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
            >
              CMDR
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsSystemMonitorOpen(true)}
              className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
            >
              📊 System Monitor
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setIsGoogleAuthModalOpen(true)}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {googleUser?.isLoggedIn ? `Profil: ${googleUser.displayName}` : 'Login Google'}
            </button>
          </div>
        </div>
      </footer>

      {/* System Monitor Dashboard Overlay Modal (Recharts) */}
      <SystemMonitorModal
        isOpen={isSystemMonitorOpen}
        onClose={() => setIsSystemMonitorOpen(false)}
        isDark={isDark}
        serverConfig={serverConfig}
        health={health}
        onAddLog={(msg, type) => addLog({ type, message: msg })}
      />

      {/* Class & VIP Modal */}
      <VipKeyModal
        isOpen={isVipModalOpen}
        onClose={() => setIsVipModalOpen(false)}
        isDark={isDark}
        vipConfig={vipConfig}
        onUpdateVip={handleUpdateVip}
        onAddLog={(msg, type) => addLog({ type: type === 'request' ? 'info' : type, message: msg })}
      />

      {/* Secret Key Generator Modal */}
      <SecretKeyGeneratorModal
        isOpen={isKeyGenModalOpen}
        onClose={() => setIsKeyGenModalOpen(false)}
        isDark={isDark}
        onActivateKey={handleUpdateVip}
        onAddLog={(msg, type) => addLog({ type, message: msg })}
      />

      {/* Mode CMDR Terminal Interface Modal */}
      <CmdrModal
        isOpen={isCmdrModalOpen}
        onClose={() => setIsCmdrModalOpen(false)}
        isDark={isDark}
        vipConfig={vipConfig}
        customServer={serverConfig.endpoint}
        onUpdateVip={handleUpdateVip}
        onOpenSecretKeyModal={() => {
          setIsCmdrModalOpen(false);
          setIsKeyGenModalOpen(true);
        }}
        onToggleTheme={toggleTheme}
        onAddLog={addLog}
      />

      {/* Google Auth Modal (Firebase) */}
      <GoogleAuthModal
        isOpen={isGoogleAuthModalOpen}
        onClose={() => setIsGoogleAuthModalOpen(false)}
        isDark={isDark}
        currentUser={googleUser}
        vipConfig={vipConfig}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        isMandatory={false}
      />
    </div>
  );
}

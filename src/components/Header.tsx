import React from 'react';
import { BotHealth, VipConfig, ServerConnectionConfig, UserProfile } from '../types';

export type AppTabType = 'single' | 'batch' | 'class' | 'keygen' | 'cmdr' | 'owner' | 'history' | 'guide' | 'monitor';

interface HeaderProps {
  health: BotHealth;
  vipConfig: VipConfig;
  serverConfig: ServerConnectionConfig;
  activeTab: AppTabType;
  onSelectTab: (tab: AppTabType) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenBrowserScript?: () => void;
  currentUser?: UserProfile | null;
  onOpenGoogleAuth?: () => void;
  onOpenVipModal: () => void;
  onOpenKeyGenModal: () => void;
  onOpenCmdrModal: () => void;
  onOpenSystemMonitor: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  health,
  vipConfig,
  serverConfig,
  activeTab,
  onSelectTab,
  isDark,
  onToggleTheme,
  currentUser,
  onOpenGoogleAuth,
  onOpenVipModal,
  onOpenKeyGenModal,
  onOpenCmdrModal,
  onOpenSystemMonitor,
}) => {
  const isOnline = health.status === 'online' || serverConfig.isConnected;

  return (
    <header className="sticky top-3 z-40 px-3 sm:px-6 max-w-6xl mx-auto w-full transition-all">
      <div className="rounded-2xl border border-white/[0.14] bg-white/[0.08] backdrop-blur-2xl shadow-xl px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-3">
        {/* Brand Logo & Name (Secret double click opens Key Generator) */}
        <div
          onClick={() => onSelectTab('single')}
          onDoubleClick={onOpenKeyGenModal}
          title="AM Premium (Klik ganda untuk Secret Admin Panel)"
          className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            {/* Coding bracket icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div className="flex items-center text-base sm:text-lg font-bold tracking-tight text-white">
            <span>AM</span>
            <span className="text-cyan-400 font-extrabold ml-1">Premium</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/[0.06]">
          <button
            type="button"
            onClick={() => onSelectTab('single')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'single'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <span>⚡</span>
            <span>Aktivasi</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('batch')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'batch'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <span>🚀</span>
            <span>Mode Cepat</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('class')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'class'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <span>🏷️</span>
            <span>Class VIP</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('cmdr')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'cmdr'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <span>💻</span>
            <span>CMDR</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('owner')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'owner'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <span>👑</span>
            <span>Owner</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('history')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <span>📋</span>
            <span>Riwayat</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('guide')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <span>📖</span>
            <span>Panduan</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('monitor')}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'monitor'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm'
                : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <span>📊</span>
            <span>Monitor</span>
          </button>
        </nav>

        {/* Right Zone: Class Badge, Key Gen, CMDR, Google, Theme */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Class / VIP Tier Button */}
          <button
            type="button"
            onClick={onOpenVipModal}
            title="Kelola Lisensi & Class Akun"
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all shadow-xs ${
              vipConfig.tier === 'owner'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : vipConfig.tier === 'vip_plus'
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                : vipConfig.tier === 'vip'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                : 'bg-white/[0.06] text-neutral-300 border-white/[0.12] hover:bg-white/[0.10]'
            }`}
          >
            <span>{vipConfig.tier === 'owner' ? '👑' : vipConfig.tier === 'vip_plus' ? '🚀' : vipConfig.tier === 'vip' ? '⭐' : '🏷️'}</span>
            <span className="hidden sm:inline">{vipConfig.name}</span>
            <span className="sm:hidden">{vipConfig.tier === 'owner' ? 'Supreme' : vipConfig.tier === 'vip' ? 'VIP' : 'Class'}</span>
          </button>

          {/* Mode CMDR Button */}
          <button
            type="button"
            onClick={onOpenCmdrModal}
            title="Mode CMDR (Terminal Interface)"
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-[11px] font-mono font-bold text-cyan-300 transition-all shadow-xs"
          >
            <span className="animate-pulse">⚡</span>
            <span>CMDR</span>
          </button>

          {/* System Monitor Button / Latency Pill */}
          <button
            type="button"
            onClick={onOpenSystemMonitor}
            title="Buka System Monitor Dashboard (Recharts Latensi & Success Rate)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/40 text-[11px] font-mono text-cyan-300 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isOnline ? 'bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400/50' : 'bg-amber-400'
              }`}
            />
            <span className="font-bold">{health.latencyMs || 82}ms</span>
            <span className="text-[10px] text-cyan-400/70 hidden md:inline">📊 Monitor</span>
          </button>

          {/* Google Login via Firebase */}
          {onOpenGoogleAuth && (
            currentUser?.isLoggedIn ? (
              <button
                type="button"
                onClick={onOpenGoogleAuth}
                title="Akun Google Terhubung"
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 transition-all text-xs"
              >
                <img
                  src={currentUser.photoURL || 'https://lh3.googleusercontent.com/a/default-user=s96-c'}
                  alt={currentUser.displayName}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="max-w-[80px] sm:max-w-[100px] truncate font-medium">
                  {currentUser.displayName}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono hidden sm:inline">
                  5/5
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenGoogleAuth}
                title="Masuk dengan Google (Firebase)"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-semibold text-xs bg-white text-neutral-900 hover:bg-neutral-100 shadow-md transition-all active:scale-[0.98]"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Login Google</span>
              </button>
            )
          )}

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl border border-white/[0.08] bg-black/30 hover:bg-black/50 text-neutral-300 transition-colors"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Mobile Tab Navigation sub-bar */}
      <div className="flex lg:hidden items-center gap-1.5 mt-2 p-1.5 rounded-xl border border-white/[0.10] bg-white/[0.06] backdrop-blur-xl text-[11px] font-medium overflow-x-auto no-scrollbar scroll-smooth">
        <button
          type="button"
          onClick={() => onSelectTab('single')}
          className={`px-2.5 py-1.5 rounded-lg text-center whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'single' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-neutral-300 hover:text-white'
          }`}
        >
          ⚡ Aktivasi
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('batch')}
          className={`px-2.5 py-1.5 rounded-lg text-center whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'batch' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-neutral-300 hover:text-white'
          }`}
        >
          🚀 Mode Cepat
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('class')}
          className={`px-2.5 py-1.5 rounded-lg text-center whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'class' ? 'bg-amber-600 text-white font-bold shadow-xs' : 'text-amber-300/90 hover:text-amber-200'
          }`}
        >
          🏷️ Class VIP
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('cmdr')}
          className={`px-2.5 py-1.5 rounded-lg text-center whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'cmdr' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'text-cyan-300 hover:text-white'
          }`}
        >
          💻 CMDR
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('owner')}
          className={`px-2.5 py-1.5 rounded-lg text-center whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'owner' ? 'bg-purple-600 text-white font-bold shadow-xs' : 'text-neutral-300 hover:text-white'
          }`}
        >
          👑 Suite
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('history')}
          className={`px-2.5 py-1.5 rounded-lg text-center whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'history' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-neutral-300 hover:text-white'
          }`}
        >
          📋 Riwayat
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('guide')}
          className={`px-2.5 py-1.5 rounded-lg text-center whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'guide' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-neutral-300 hover:text-white'
          }`}
        >
          📖 Panduan
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('monitor')}
          className={`px-2.5 py-1.5 rounded-lg text-center whitespace-nowrap shrink-0 transition-all ${
            activeTab === 'monitor' ? 'bg-cyan-600 text-white font-bold shadow-xs' : 'text-cyan-300/80 hover:text-white'
          }`}
        >
          📊 Monitor
        </button>
      </div>
    </header>
  );
};

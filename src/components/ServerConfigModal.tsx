import React, { useState } from 'react';
import { botApi } from '../services/botApi';
import { ServerConnectionConfig } from '../types';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  serverConfig: ServerConnectionConfig;
  onUpdateServerConfig: (config: ServerConnectionConfig) => void;
  onAddLog: (message: string, type: 'info' | 'success' | 'warning' | 'error' | 'request') => void;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  isDark,
  serverConfig,
  onUpdateServerConfig,
  onAddLog,
}) => {
  const [endpointInput, setEndpointInput] = useState(() => {
    if (!serverConfig.endpoint || serverConfig.endpoint.includes('thyo.cloud')) {
      return '';
    }
    return serverConfig.endpoint;
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; success: boolean } | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    const cleanUrl = endpointInput.trim() || 'https://thyo.cloud';
    const displayEndpoint = cleanUrl.includes('thyo.cloud') ? 'AM Cloud Gateway' : cleanUrl;

    if (endpointInput.trim() && !cleanUrl.startsWith('http')) {
      setStatusMessage({ text: 'URL server harus diawali http:// atau https://', success: false });
      return;
    }

    setIsConnecting(true);
    setStatusMessage(null);
    onAddLog(`Mencoba menghubungkan ke server gateway: ${displayEndpoint}...`, 'request');

    try {
      const res = await botApi.connectServer(cleanUrl);
      if (res.connected) {
        onUpdateServerConfig({
          ...serverConfig,
          endpoint: res.endpoint,
          isConnected: true,
          latencyMs: res.latencyMs,
          lastChecked: new Date().toLocaleTimeString(),
        });
        setStatusMessage({
          text: `Berhasil terhubung ke gateway! Latency: ${res.latencyMs}ms. Siap mengirim magic link.`,
          success: true,
        });
        onAddLog(`Server gateway terhubung (${res.latencyMs}ms): ${displayEndpoint}`, 'success');
      } else {
        setStatusMessage({
          text: `Gagal menyambung: ${res.error || 'Server tidak merespons'}`,
          success: false,
        });
        onAddLog(`Koneksi gateway gagal: ${res.error}`, 'error');
      }
    } catch (err: any) {
      setStatusMessage({
        text: `Error koneksi: ${err.message}`,
        success: false,
      });
      onAddLog(`Gagal menghubungi server: ${err.message}`, 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleResetDefault = () => {
    const defaultHost = 'https://thyo.cloud';
    setEndpointInput('');
    onUpdateServerConfig({
      ...serverConfig,
      endpoint: defaultHost,
      isConnected: true,
      lastChecked: new Date().toLocaleTimeString(),
    });
    setStatusMessage({
      text: 'Server dikembalikan ke gateway default sistem (AM Cloud Gateway).',
      success: true,
    });
    onAddLog('Endpoint server dikembalikan ke default gateway.', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-[#12131a] border-neutral-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 border-b flex items-center justify-between ${
            isDark ? 'border-neutral-800 bg-[#0c0d12]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
              🌐
            </div>
            <div>
              <h3 className="text-sm font-bold">Koneksi Server Pengirim Magic Link</h3>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Konfigurasi dan tes koneksi ke gateway pengiriman tautan aktivasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Active status */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              serverConfig.isConnected
                ? isDark
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : isDark
                ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  serverConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <div>
                <p className="font-bold">
                  {serverConfig.isConnected ? 'Server Terhubung & Siap Kirim' : 'Server Terputus'}
                </p>
                <p className="text-[11px] opacity-80 font-mono">
                  {serverConfig.endpoint && !serverConfig.endpoint.includes('thyo.cloud')
                    ? serverConfig.endpoint
                    : 'AM Cloud Gateway (Dedicated Cluster)'} · {serverConfig.latencyMs ? `${serverConfig.latencyMs}ms` : 'N/A'}
                </p>
              </div>
            </div>

            <button
              onClick={handleTestConnection}
              disabled={isConnecting}
              className={`text-[11px] px-3 py-1 rounded-md border font-semibold transition-colors ${
                isDark
                  ? 'border-neutral-700 hover:bg-neutral-800 text-neutral-200'
                  : 'border-slate-300 hover:bg-white text-slate-700'
              }`}
            >
              {isConnecting ? 'Memeriksa...' : 'Ping Ulang'}
            </button>
          </div>

          {/* Form Endpoint */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold">
              Endpoint Server Pengirim (Gateway URL)
            </label>
            <input
              type="text"
              value={endpointInput}
              onChange={(e) => setEndpointInput(e.target.value)}
              placeholder="AM Cloud Gateway (Default Otomatis)"
              className={`w-full py-2.5 px-3.5 rounded-xl border font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isDark
                  ? 'bg-[#0a0a0f] border-neutral-800 text-white placeholder-neutral-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            <p className="text-[11px] text-neutral-400">
              Server ini bertugas mengeksekusi <code>/api/am?action=send</code> dan <code>/api/am?action=verif</code> untuk verifikasi 1 Tahun Premium.
            </p>
          </div>

          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-[11px] font-medium ${
                statusMessage.success
                  ? isDark
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark
                  ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleTestConnection}
              disabled={isConnecting}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50"
            >
              {isConnecting ? 'Menghubungkan...' : 'Simpan & Hubungkan ke Server'}
            </button>
            <button
              onClick={handleResetDefault}
              className={`px-4 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                isDark
                  ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'border-slate-300 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Reset Default
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex justify-end ${
            isDark ? 'border-neutral-800 bg-[#0c0d12]' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border ${
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

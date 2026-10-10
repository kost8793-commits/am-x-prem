import React, { useState } from 'react';
import { botApi } from '../services/botApi';
import { UrlInspectionResult, ActivationHistoryItem, LogEntry } from '../types';

interface UrlInspectorProps {
  isDark: boolean;
  onAddHistory: (item: ActivationHistoryItem) => void;
  onAddLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

export const UrlInspector: React.FC<UrlInspectorProps> = ({
  isDark,
  onAddHistory,
  onAddLog,
}) => {
  const [rawText, setRawText] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [result, setResult] = useState<UrlInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setIsInspecting(true);
    setErrorMsg('');
    setOrderCode('');

    try {
      const res = await botApi.inspectUrl(rawText);
      setResult(res);
      onAddLog({
        type: res.valid ? 'success' : 'warning',
        message: res.valid
          ? `Link berhasil dianalisis: oobCode valid ditemukan (${res.hostname})`
          : `Analisis link: ${res.error || res.message}`,
      });
    } catch (err: any) {
      setErrorMsg('Gagal menganalisis link: ' + err.message);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleDirectActivate = async () => {
    if (!result?.extractedUrl) return;
    if (!targetEmail.trim() || !targetEmail.includes('@')) {
      setErrorMsg('Masukkan email target terlebih dahulu untuk aktivasi.');
      return;
    }

    setIsActivating(true);
    setErrorMsg('');

    try {
      const res = await botApi.verifyMagicLink(targetEmail.trim(), result.extractedUrl);
      if (res.status) {
        const code = res.codeorder || 'AM-DIRECT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        setOrderCode(code);

        onAddHistory({
          id: Date.now().toString(),
          email: targetEmail.trim(),
          code,
          date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        });

        onAddLog({
          type: 'success',
          message: `Aktivasi langsung untuk ${targetEmail} berhasil! Kode: ${code}`,
        });
      } else {
        setErrorMsg(res.error || res.message || 'Verifikasi gagal.');
      }
    } catch (err: any) {
      setErrorMsg('Koneksi gagal: ' + err.message);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-6 md:p-8 transition-colors ${
          isDark ? 'bg-[#12131a] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="mb-6">
          <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Inspektor Link & Validator oobCode
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Uji dan bedah URL Magic Link Alight Motion untuk memastikan parameter otentikasi Firebase lengkap dan belum rusak.
          </p>
        </div>

        <form onSubmit={handleInspect} className="space-y-4">
          <div>
            <label
              htmlFor="rawText"
              className={`block text-xs font-semibold mb-2 ${
                isDark ? 'text-neutral-300' : 'text-slate-700'
              }`}
            >
              Tempel URL atau Teks Email Penuh
            </label>
            <textarea
              id="rawText"
              rows={4}
              required
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="https://alightcreative.page.link/?link=https://alightmotion.app/__/auth/action?apiKey%3D...%26mode%3DsignIn%26oobCode%3D..."
              className={`w-full p-4 rounded-xl border text-xs font-mono outline-none transition-all focus:ring-2 focus:ring-blue-500/50 ${
                isDark
                  ? 'bg-[#0a0a0f] border-neutral-800 text-white placeholder-neutral-600'
                  : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isInspecting}
              className="py-3 px-6 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm disabled:opacity-50"
            >
              {isInspecting ? 'Menganalisis...' : 'Bedah & Validasi URL'}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const clip = await navigator.clipboard.readText();
                  if (clip) setRawText(clip);
                } catch (e) {}
              }}
              className={`py-3 px-4 rounded-xl text-xs font-medium border transition-colors ${
                isDark
                  ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Tempel dari Clipboard
            </button>
          </div>
        </form>

        {errorMsg && (
          <div
            className={`mt-6 p-4 rounded-xl text-xs border ${
              isDark ? 'bg-rose-950/40 border-rose-800 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {errorMsg}
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6 pt-6 border-t border-neutral-800/40">
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                result.valid
                  ? isDark
                    ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : isDark
                  ? 'bg-rose-950/20 border-rose-800/50 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">Status Validitas:</span>
                <span className="text-xs">
                  {result.valid ? 'URL Valid & Siap Eksekusi' : 'URL Tidak Lengkap / Rusak'}
                </span>
              </div>
              <span className="font-mono text-xs text-neutral-400">{result.hostname}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-neutral-500 font-medium mb-1">oobCode (Firebase Auth Token)</p>
                <p className="font-mono font-semibold break-all text-blue-400">
                  {result.oobCode || '(Tidak Ditemukan)'}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-neutral-500 font-medium mb-1">Mode Autentikasi</p>
                <p className="font-mono font-semibold text-neutral-300">
                  {result.mode || 'signIn (Default)'}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-neutral-500 font-medium mb-1">Domain Asal</p>
                <p className="font-mono font-semibold text-neutral-300">
                  {result.hostname} {result.isAlightMotionApp ? '(Resmi Alight Motion)' : ''}
                </p>
              </div>

              <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#0a0a0f] border-neutral-800' : 'bg-slate-50 border-slate-200'}`}>
                <p className="text-neutral-500 font-medium mb-1">Firebase API Key Preview</p>
                <p className="font-mono font-semibold text-neutral-300">
                  {result.apiKey || 'N/A'}
                </p>
              </div>
            </div>

            {/* Direct Activation Section if Valid */}
            {result.valid && !orderCode && (
              <div className={`p-5 rounded-xl border space-y-4 ${
                isDark ? 'bg-blue-950/20 border-blue-800/40' : 'bg-blue-50/70 border-blue-200'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Eksekusi Langsung dengan URL Ini
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Masukkan email target yang memesan link ini lalu klik aktivasi.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    required
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="email@example.com"
                    className={`flex-1 py-2 px-3.5 rounded-lg border text-xs outline-none ${
                      isDark
                        ? 'bg-[#0a0a0f] border-neutral-700 text-white placeholder-neutral-600'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={isActivating}
                    onClick={handleDirectActivate}
                    className="px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50"
                  >
                    {isActivating ? 'Memproses...' : 'Aktivasi Sekarang'}
                  </button>
                </div>
              </div>
            )}

            {orderCode && (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/50 text-emerald-300 text-xs text-center space-y-2">
                <p className="font-bold">Aktivasi Sukses!</p>
                <p className="font-mono text-base text-amber-400 font-bold">{orderCode}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

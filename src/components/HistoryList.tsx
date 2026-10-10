import React, { useState } from 'react';
import { ActivationHistoryItem, LogEntry } from '../types';

interface HistoryListProps {
  history: ActivationHistoryItem[];
  isDark: boolean;
  onClearHistory: () => void;
  onNavigateToActivator?: () => void;
  onAddLog?: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  isDark,
  onClearHistory,
  onNavigateToActivator,
  onAddLog,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = history.filter(
    (item) =>
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    onAddLog?.({
      type: 'info',
      message: `Kode order ${code} disalin ke clipboard.`,
    });
  };

  const handleExportCSV = () => {
    if (history.length === 0) return;
    const header = 'Email,Kode Referensi,Tanggal Aktivasi\n';
    const rows = history
      .map((item) => `"${item.email}","${item.code}","${item.date}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `am_activations_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddLog?.({
      type: 'info',
      message: `Mengekspor ${history.length} riwayat ke format CSV.`,
    });
  };

  const handleExportJSON = () => {
    if (history.length === 0) return;
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `am_activations_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onAddLog?.({
      type: 'info',
      message: `Mengekspor ${history.length} riwayat ke format JSON.`,
    });
  };

  return (
    <div className="space-y-6">
      <div
        className={`rounded-2xl border p-6 md:p-8 transition-colors ${
          isDark ? 'bg-[#12131a] border-neutral-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Riwayat Transaksi Aktivasi
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Catatan akun yang berhasil diaktivasi 1 Tahun Premium Alight Motion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={history.length === 0}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                isDark
                  ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Ekspor CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={history.length === 0}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                isDark
                  ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Ekspor JSON
            </button>
            <button
              onClick={onClearHistory}
              disabled={history.length === 0}
              className="text-xs px-3 py-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
            >
              Bersihkan
            </button>
          </div>
        </div>

        {/* Search filter */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan email atau kode order..."
            className={`w-full py-2 px-3.5 rounded-xl border text-xs outline-none ${
              isDark
                ? 'bg-[#0a0a0f] border-neutral-800 text-white placeholder-neutral-600'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
            }`}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-slate-400'}`}>
              {history.length === 0
                ? 'Belum ada riwayat aktivasi. Lakukan aktivasi pertama Anda di tab Aktivasi Tunggal.'
                : 'Tidak ada riwayat yang cocok dengan kata kunci pencarian.'}
            </p>
          </div>
        ) : (
          <div
            className={`overflow-x-auto rounded-xl border ${
              isDark ? 'border-neutral-800 bg-[#0a0a0f]' : 'border-slate-200 bg-white'
            }`}
          >
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={`border-b ${isDark ? 'border-neutral-800 text-neutral-400' : 'border-slate-200 text-slate-500'}`}>
                  <th className="py-3 px-4 font-semibold">Email Pengguna</th>
                  <th className="py-3 px-4 font-semibold">Kode Referensi Order</th>
                  <th className="py-3 px-4 font-semibold">Waktu Aktivasi</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/40">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-800/10">
                    <td className="py-3 px-4 font-mono font-medium">
                      <span className={isDark ? 'text-white' : 'text-slate-900'}>{item.email}</span>
                      <span className="block text-[10px] text-emerald-500 font-semibold">
                        Premium 1 Tahun Aktif
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-amber-500 tabular-nums">
                      {item.code}
                    </td>
                    <td className="py-3 px-4 text-neutral-400 tabular-nums">
                      {item.date}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleCopy(item.code, item.id)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                          copiedId === item.id
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : isDark
                            ? 'border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {copiedId === item.id ? 'Tersalin' : 'Salin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

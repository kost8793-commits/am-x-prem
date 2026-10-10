import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';

interface ConsoleLogsProps {
  logs: LogEntry[];
  isDark: boolean;
  onClearLogs: () => void;
}

export const ConsoleLogs: React.FC<ConsoleLogsProps> = ({
  logs,
  isDark,
  onClearLogs,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-colors ${
        isDark ? 'bg-[#0b0c10] border-neutral-800' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
      }`}
    >
      <div className="px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between bg-black/30">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-neutral-300">
            Bot Activity Stream
          </span>
          <span className="text-[10px] font-mono text-neutral-500 tabular-nums">
            ({logs.length} entri)
          </span>
        </div>

        <button
          onClick={onClearLogs}
          className="text-[11px] font-mono text-neutral-400 hover:text-white transition-colors"
        >
          Bersihkan Konsol
        </button>
      </div>

      <div
        ref={scrollRef}
        className="p-4 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin select-text"
      >
        {logs.length === 0 ? (
          <p className="text-neutral-500 italic">Menunggu aktivitas bot...</p>
        ) : (
          logs.map((log) => {
            let color = 'text-neutral-300';
            if (log.type === 'success') color = 'text-emerald-400';
            if (log.type === 'error') color = 'text-rose-400';
            if (log.type === 'warning') color = 'text-amber-400';
            if (log.type === 'request') color = 'text-blue-400';

            return (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-neutral-600 shrink-0 tabular-nums">
                  [{log.timestamp}]
                </span>
                <span className={`shrink-0 font-bold ${color}`}>
                  {log.type.toUpperCase()}:
                </span>
                <span className={color}>{log.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';

interface BrowserScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

export const BrowserScriptModal: React.FC<BrowserScriptModalProps> = ({
  isOpen,
  onClose,
  isDark,
}) => {
  const [activeType, setActiveType] = useState<'console' | 'tampermonkey' | 'bookmarklet'>('console');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const consoleScript = `// == AM Activator In-Page Helper Bot ==
// Jalankan skrip ini di DevTools Console (F12) pada halaman aktivator
(function() {
  console.log("%c[AM BOT] Inisialisasi otomatisasi...", "color: #3b82f6; font-weight: bold;");

  // Inject floating bot toolbar
  const existing = document.getElementById("am-bot-panel");
  if (existing) existing.remove();

  const bar = document.createElement("div");
  bar.id = "am-bot-panel";
  bar.style.cssText = "position:fixed;bottom:24px;left:24px;z-index:999999;background:#09090b;color:#fff;border:1px solid #3b82f6;padding:16px;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-family:sans-serif;font-size:12px;width:320px;";
  bar.innerHTML = \`
    <div style="font-weight:bold;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
      <span style="color:#60a5fa;">⚡ AM Activator In-Page Bot</span>
      <button id="am-bot-close" style="background:transparent;border:none;color:#888;cursor:pointer;font-size:16px;">×</button>
    </div>
    <p style="color:#a1a1aa;margin:0 0 10px 0;font-size:11px;">Bot otomatis siap memverifikasi Magic Link secara instan.</p>
    <input id="am-bot-email" placeholder="Email akun..." style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #27272a;background:#18181b;color:#fff;margin-bottom:8px;font-size:11px;" />
    <button id="am-bot-send" style="width:100%;background:#2563eb;color:#fff;border:none;padding:8px;border-radius:8px;cursor:pointer;font-weight:bold;margin-bottom:8px;font-size:11px;">1. Minta Magic Link</button>
    <input id="am-bot-url" placeholder="Tempel URL Magic Link di sini..." style="width:100%;box-sizing:border-box;padding:8px;border-radius:8px;border:1px solid #27272a;background:#18181b;color:#fff;margin-bottom:8px;font-size:11px;" />
    <button id="am-bot-verif" style="width:100%;background:#16a34a;color:#fff;border:none;padding:8px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:11px;">2. Eksekusi Aktivasi 1 Tahun</button>
    <div id="am-bot-status" style="margin-top:8px;font-size:10px;color:#38bdf8;word-break:break-word;"></div>
  \`;
  document.body.appendChild(bar);

  document.getElementById("am-bot-close").onclick = () => bar.remove();

  const statusEl = document.getElementById("am-bot-status");
  document.getElementById("am-bot-send").onclick = async () => {
    const email = document.getElementById("am-bot-email").value.trim();
    if (!email) {
      statusEl.innerText = "Isi email terlebih dahulu";
      return;
    }
    statusEl.innerText = "Mengirim magic link...";
    try {
      const res = await fetch("/api/am?action=send&email=" + encodeURIComponent(email));
      const json = await res.json();
      statusEl.innerText = json.status ? "Link terkirim ke " + email + "! Cek kotak masuk." : (json.error || "Gagal kirim");
    } catch(e) {
      statusEl.innerText = "Gagal: " + e.message;
    }
  };

  document.getElementById("am-bot-verif").onclick = async () => {
    const email = document.getElementById("am-bot-email").value.trim();
    const url = document.getElementById("am-bot-url").value.trim();
    if (!email || !url) {
      statusEl.innerText = "Email dan URL wajib diisi";
      return;
    }
    statusEl.innerText = "Memverifikasi aktivasi...";
    try {
      const res = await fetch("/api/am?action=verif&email=" + encodeURIComponent(email) + "&url=" + encodeURIComponent(url));
      const json = await res.json();
      if (json.status) {
        statusEl.innerHTML = "<b style='color:#4ade80;'>SUKSES!</b> Kode Order: " + (json.codeorder || "SUCCESS");
      } else {
        statusEl.innerText = json.error || "Gagal aktivasi";
      }
    } catch(e) {
      statusEl.innerText = "Gagal: " + e.message;
    }
  };
})();`;

  const tampermonkeyScript = `// ==UserScript==
// @name         AM Activator Auto-Bot
// @namespace    https://am-activator.app/
// @version      2.0
// @description  Otomatisasi pengiriman dan verifikasi Alight Motion
// @author       AM Bot Engine
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    console.log('[AM BOT] Userscript aktif');

    // Auto-detect clipboard Alight Motion links
    window.addEventListener('focus', async () => {
        try {
            const clip = await navigator.clipboard.readText();
            if (clip && (clip.includes('alightmotion') || clip.includes('oobCode'))) {
                const urlInput = document.querySelector('input[type="url"]');
                if (urlInput && !urlInput.value) {
                    urlInput.value = clip;
                    urlInput.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log('[AM BOT] Auto-pasted Alight Motion link from clipboard!');
                }
            }
        } catch(e) {}
    });
})();`;

  const bookmarkletCode = `javascript:(function(){const s=document.createElement('script');s.innerHTML=\`${consoleScript.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;document.body.appendChild(s);})();`;

  const activeContent =
    activeType === 'console'
      ? consoleScript
      : activeType === 'tampermonkey'
      ? tampermonkeyScript
      : bookmarkletCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isDark ? 'bg-[#12131a] border-neutral-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-5 border-b flex items-center justify-between ${
          isDark ? 'border-neutral-800 bg-[#0c0d12]' : 'border-slate-200 bg-slate-50'
        }`}>
          <div>
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Skrip Otomatisasi Peramban Web (In-Page)
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Jalankan bot langsung di dalam tab halaman browser Anda
            </p>
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

        {/* Script Selection Tabs */}
        <div className={`flex border-b px-5 pt-3 gap-2 ${
          isDark ? 'border-neutral-800 bg-[#0f1017]' : 'border-slate-200 bg-white'
        }`}>
          <button
            onClick={() => setActiveType('console')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeType === 'console'
                ? 'border-blue-600 text-blue-500'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            DevTools Console Snippet
          </button>
          <button
            onClick={() => setActiveType('tampermonkey')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeType === 'tampermonkey'
                ? 'border-blue-600 text-blue-500'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Userscript (Tampermonkey)
          </button>
          <button
            onClick={() => setActiveType('bookmarklet')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeType === 'bookmarklet'
                ? 'border-blue-600 text-blue-500'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Bookmarklet (1-Klik)
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400">
              {activeType === 'console' && 'Salin kode di bawah, buka DevTools (F12) > Console di browser Anda, lalu tekan Enter.'}
              {activeType === 'tampermonkey' && 'Pasang ekstensi Tampermonkey di Chrome/Firefox/Kiwi, buat New Script, lalu simpan kode ini.'}
              {activeType === 'bookmarklet' && 'Seret atau simpan link ini sebagai Bookmark browser Anda.'}
            </span>
            <button
              onClick={handleCopy}
              className="py-1 px-3 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shrink-0"
            >
              {isCopied ? 'Tersalin!' : 'Salin Kode'}
            </button>
          </div>

          <pre
            className={`p-4 rounded-xl border font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed ${
              isDark ? 'bg-[#090a0e] border-neutral-800 text-neutral-300' : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            {activeContent}
          </pre>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex justify-end ${
          isDark ? 'border-neutral-800 bg-[#0c0d12]' : 'border-slate-200 bg-slate-50'
        }`}>
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

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AM Activator Guard] Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleResetApp = () => {
    try {
      // Clear any corrupted localStorage config that might have caused the issue
      localStorage.removeItem('am_bot_vip_config');
      localStorage.removeItem('am_bot_server_config');
    } catch (e) {}
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#09090d] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl border border-neutral-800 bg-[#12131a] shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center text-xl font-bold">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-bold">Pemulihan Sistem Aktif</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Tampilan aplikasi berhasil dipulihkan secara otomatis agar tidak mengalami layar putih.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 rounded-lg bg-black/50 border border-neutral-800 text-[11px] font-mono text-neutral-400 text-left overflow-x-auto max-h-24">
                {this.state.error.message || 'Unknown error'}
              </div>
            )}
            <button
              type="button"
              onClick={this.handleResetApp}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-sm"
            >
              Pulihkan & Muat Ulang Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

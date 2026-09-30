import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Server, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Zap, 
  Clock, 
  Users,
  ArrowRight
} from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { 
  subscribeToServerHealth, 
  getCurrentServerHealth, 
  wakeUpLiveServer, 
  testServerConnection,
  initWebSocketIfNeeded,
  LiveServerHealthState 
} from '../lib/liveRealtimeClient';

interface LiveServerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLiveQuiz?: () => void;
}

export const LiveServerStatusModal: React.FC<LiveServerStatusModalProps> = ({
  isOpen,
  onClose,
  onOpenLiveQuiz,
}) => {
  const [health, setHealth] = useState<LiveServerHealthState>(getCurrentServerHealth);
  const [isWaking, setIsWaking] = useState(false);

  useEffect(() => {
    const unsub = subscribeToServerHealth((state) => {
      setHealth(state);
    });
    return () => unsub();
  }, []);

  // Handle ESC key press to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleWakeUp = async () => {
    soundEffects.playClick();
    setIsWaking(true);
    try {
      await wakeUpLiveServer();
    } finally {
      setIsWaking(false);
    }
  };

  const handleQuickTest = async () => {
    soundEffects.playClick();
    setIsWaking(true);
    try {
      await testServerConnection({ timeoutMs: 15000 });
      initWebSocketIfNeeded();
    } finally {
      setIsWaking(false);
    }
  };

  const isOnline = health.status === 'online';
  const isWakingState = health.status === 'waking' || isWaking;

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg my-auto bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-4 sm:p-6 text-slate-100 flex flex-col max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header with Title and Big Visible Close Button */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm shrink-0 ${
              isOnline 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : isWakingState 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
            }`}>
              <Server className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 truncate">
                <span>Status Pelayan Live</span>
                {/* Visual Circle Indicator */}
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  {isOnline && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  {isWakingState && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                      isOnline
                        ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                        : isWakingState
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                    }`}
                  />
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                Penyambung kuiz kumpulan masa nyata (0 Kuota Firebase)
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEffects.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700 shrink-0 ml-2"
            title="Tutup Tetingkap (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto space-y-4 py-3.5 pr-1">
          {/* Current Status Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isOnline
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : isWakingState
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${
                    isOnline
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                      : isWakingState
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-bounce'
                      : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]'
                  }`} />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {isOnline ? 'Pelayan Aktif & Berhubung' : isWakingState ? 'Pelayan Sedang Bangun...' : 'Pelayan Terputus / Sedang Tidur'}
                  </span>
                </div>
                <p className="text-xs font-medium opacity-90">
                  {health.statusText}
                </p>
                {health.latencyMs && (
                  <p className="text-[11px] font-mono text-emerald-300">
                    ⚡ Kelajuan respons: {health.latencyMs}ms
                  </p>
                )}
              </div>

              <div className="shrink-0 text-right">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                    <Wifi className="w-3 h-3 text-emerald-400" /> Sedia
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold">
                    <WifiOff className="w-3 h-3 text-rose-400" /> Belum Aktif
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action: Masuk ke Bilik Kuiz Kumpulan if onOpenLiveQuiz provided */}
          {onOpenLiveQuiz && (
            <div className="p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs font-bold text-white">Mahu Mula / Masuk Kuiz Sekarang?</span>
              </div>
              <button
                onClick={() => {
                  soundEffects.playClick();
                  onClose();
                  onOpenLiveQuiz();
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow"
              >
                <span>Buka Kuiz Live</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Server URL Display (Kekal & Terkunci) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">URL Pelayan Semasa:</span>
              <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1 bg-slate-800/60 px-2 py-0.5 rounded-full border border-slate-700/50">
                🔒 Ditetapkan (Kekal)
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 truncate flex items-center justify-between gap-2">
              <span className="truncate">{health.serverUrl || 'Pelayan Rasmi Berpusat'}</span>
              {health.serverUrl && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 font-sans">
                  {health.serverUrl.includes('render.com') ? 'Render' : 'Pelayan'}
                </span>
              )}
            </div>
          </div>

          {/* Informative Explanation about Render Cold Start */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3.5 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Mengapa Pelayan Menjadi Tidur (Cold Start)?</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Pelan percuma di <strong>Render.com</strong> akan tidur automatik secara jimat tenaga sekiranya <strong>tiada aktiviti selama 15 minit</strong>.
            </p>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Apabila anda mahu memulakan kuiz baharu, pelayan memerlukan masa kira-kira <strong>30 hingga 50 saat</strong> untuk bangun semula bagi permintaan pertama.
            </p>
          </div>
        </div>

        {/* Bottom Action Footer with Obvious Close Button */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-2 pt-3 border-t border-slate-800 shrink-0">
          <button
            onClick={() => {
              soundEffects.playClick();
              onClose();
            }}
            className="w-full sm:w-auto py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
            <button
              onClick={handleQuickTest}
              disabled={isWakingState}
              className="flex-1 sm:flex-initial py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isWakingState ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
              <span>Sambung Semula</span>
            </button>

            <button
              onClick={handleWakeUp}
              disabled={isWakingState}
              className={`flex-1 sm:flex-initial py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer ${
                isWakingState
                  ? 'bg-amber-600/50 text-amber-200 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
              }`}
            >
              <Zap className={`w-4 h-4 ${isWakingState ? 'animate-bounce text-amber-300' : 'text-amber-300'}`} />
              <span>{isWakingState ? 'Membangunkan...' : 'Bangunkan Pelayan'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

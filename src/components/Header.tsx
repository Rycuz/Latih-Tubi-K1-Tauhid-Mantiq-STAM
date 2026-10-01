import React, { useState, useEffect } from 'react';
import { Flame, Volume2, VolumeX, Globe, Sparkles, BookOpen, ShieldCheck, Lock, Share2, User, Edit3, Server, Check, ChevronDown, X } from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { ShareAppModal } from './ShareAppModal';
import { 
  subscribeToServerHealth, 
  getCurrentServerHealth, 
  LiveServerHealthState 
} from '../lib/liveRealtimeClient';
import { LiveServerStatusModal } from './LiveServerStatusModal';

interface HeaderProps {
  xp: number;
  level: number;
  streak: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  languageMode: 'bilingual' | 'arabic' | 'malay';
  onChangeLanguageMode: (mode: 'bilingual' | 'arabic' | 'malay') => void;
  studentName?: string;
  onOpenProfile?: () => void;
  onOpenTeacherModal?: () => void;
  onOpenLiveQuiz?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  xp,
  level,
  streak,
  soundEnabled,
  onToggleSound,
  languageMode,
  onChangeLanguageMode,
  studentName,
  onOpenProfile,
  onOpenTeacherModal,
  onOpenLiveQuiz,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverHealth, setServerHealth] = useState<LiveServerHealthState>(getCurrentServerHealth);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [languageToast, setLanguageToast] = useState<{
    title: string;
    desc: string;
    badge: string;
    color: 'teal' | 'amber' | 'indigo';
  } | null>(null);

  useEffect(() => {
    if (!languageToast) return;
    const timer = setTimeout(() => {
      setLanguageToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [languageToast]);

  const handleSelectLanguageMode = (newMode: 'bilingual' | 'arabic' | 'malay') => {
    soundEffects.playClick();
    onChangeLanguageMode(newMode);
    setIsLanguageMenuOpen(false);

    const infoMap = {
      bilingual: {
        title: 'Mod Dwi-Bahasa (BM + BA)',
        desc: 'Soalan dipaparkan dalam teks Bahasa Arab berserta terjemahan Bahasa Melayu.',
        badge: 'BM + BA',
        color: 'teal' as const,
      },
      arabic: {
        title: 'Mod Bahasa Arab Sahaja (عربي)',
        desc: 'Soalan dipaparkan dalam teks Bahasa Arab sahaja (format peperiksaan sebenar).',
        badge: 'عربي (BA)',
        color: 'amber' as const,
      },
      malay: {
        title: 'Mod Bahasa Melayu Sahaja (BM)',
        desc: 'Soalan dan pilihan jawapan dipaparkan dalam Bahasa Melayu Rumi sepenuhnya.',
        badge: 'BM Sahaja',
        color: 'indigo' as const,
      },
    };

    setLanguageToast(infoMap[newMode]);
  };

  useEffect(() => {
    const unsub = subscribeToServerHealth((state) => {
      setServerHealth(state);
    });
    return () => unsub();
  }, []);

  const xpInCurrentLevel = xp % 100;
  const xpNeededForNext = 100;

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 text-white transition-all shadow-md">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Logo and App Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30 shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold tracking-tight text-white truncate">
                Latih Tubi Tauhid Mantiq STAM
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                STAM
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate font-arabic font-medium">
              التوحيد • الفرق الإسلامية • المنطق
            </p>
          </div>
        </div>

        {/* Gamified Stats Bar & Action Toggles */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Student Profile Button (Ubah Nama / Maklumat Sebenar) */}
          {onOpenProfile && (
            <button
              id="btn-open-student-profile"
              onClick={() => {
                soundEffects.playClick();
                onOpenProfile();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 rounded-full text-slate-200 text-xs font-semibold shadow-sm transition-all group"
              title="Klik untuk ubah nama sebenar, sekolah atau kelas anda"
            >
              <User className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="max-w-[75px] sm:max-w-[130px] truncate text-[11px] font-bold text-white">
                {studentName || 'Profil Pelajar'}
              </span>
              <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-emerald-300 transition-colors" />
            </button>
          )}

          {/* Streak Badge */}
          <div 
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-300 text-xs font-semibold shadow-sm"
            title={`${streak} hari berturut-turut aktif`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>{streak}</span>
          </div>

          {/* XP & Level Badge */}
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-semibold shadow-sm"
            title={`Tahap ${level} (${xp} XP)`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>Tahap {level}</span>
            <span className="text-[10px] text-emerald-400/80 font-normal">({xp} XP)</span>
          </div>

          {/* Language Mode Selector Dropdown & Prominent Visual Indicator */}
          <div className="relative">
            <button
              onClick={() => {
                const nextMode =
                  languageMode === 'bilingual'
                    ? 'arabic'
                    : languageMode === 'arabic'
                    ? 'malay'
                    : 'bilingual';
                handleSelectLanguageMode(nextMode);
              }}
              className={`p-1.5 px-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm active:scale-95 ${
                languageMode === 'bilingual'
                  ? 'bg-teal-950/80 hover:bg-teal-900 border-teal-500/60 text-teal-200 shadow-teal-950/40 ring-1 ring-teal-500/30'
                  : languageMode === 'arabic'
                  ? 'bg-amber-950/80 hover:bg-amber-900 border-amber-500/60 text-amber-200 shadow-amber-950/40 ring-1 ring-amber-500/30'
                  : 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-500/60 text-indigo-200 shadow-indigo-950/40 ring-1 ring-indigo-500/30'
              }`}
              title={`Mod Soalan Semasa: ${
                languageMode === 'bilingual'
                  ? 'Dwi-Bahasa (Arab + Terjemahan BM)'
                  : languageMode === 'arabic'
                  ? 'Bahasa Arab Sahaja (عربي)'
                  : 'Bahasa Melayu Sahaja (BM)'
              } - Klik untuk tukar atau tekan panah untuk menu`}
            >
              <Globe
                className={`w-3.5 h-3.5 shrink-0 ${
                  languageMode === 'bilingual'
                    ? 'text-teal-400'
                    : languageMode === 'arabic'
                    ? 'text-amber-400'
                    : 'text-indigo-400'
                }`}
              />

              {/* Glowing active indicator dot */}
              <span
                className={`h-2 w-2 rounded-full shrink-0 animate-pulse ${
                  languageMode === 'bilingual'
                    ? 'bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.9)]'
                    : languageMode === 'arabic'
                    ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]'
                    : 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.9)]'
                }`}
              />

              {/* Distinctive, always-visible text badge */}
              <span className="text-[11px] font-black tracking-wide whitespace-nowrap">
                {languageMode === 'bilingual'
                  ? 'BM + BA'
                  : languageMode === 'arabic'
                  ? 'عربي (BA)'
                  : 'BM Sahaja'}
              </span>

              {/* Dropdown open chevron trigger */}
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  soundEffects.playClick();
                  setIsLanguageMenuOpen(!isLanguageMenuOpen);
                }}
                className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors ml-0.5"
                title="Buka pilihan mod bahasa"
              >
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${isLanguageMenuOpen ? 'rotate-180' : ''}`}
                />
              </span>
            </button>

            {/* Language Selector Dropdown Menu */}
            {isLanguageMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLanguageMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-fade-in space-y-1">
                  <div className="px-2.5 py-1.5 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                    <span>Mod Paparan Soalan</span>
                    <button
                      onClick={() => setIsLanguageMenuOpen(false)}
                      className="text-slate-500 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Option 1: Bilingual */}
                  <button
                    onClick={() => handleSelectLanguageMode('bilingual')}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      languageMode === 'bilingual'
                        ? 'bg-teal-950/70 border border-teal-500/50 text-teal-200'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300 mt-0.5 shrink-0">
                      <Globe className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">BM + BA (Dwi-Bahasa)</span>
                        {languageMode === 'bilingual' && (
                          <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Teks Arab lengkap beserta terjemahan Bahasa Melayu.
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Arabic Only */}
                  <button
                    onClick={() => handleSelectLanguageMode('arabic')}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      languageMode === 'arabic'
                        ? 'bg-amber-950/70 border border-amber-500/50 text-amber-200'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 mt-0.5 shrink-0 font-arabic text-xs font-bold">
                      ض
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">عربي (Bahasa Arab Sahaja)</span>
                        {languageMode === 'arabic' && (
                          <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Format peperiksaan STAM sebenar tanpa sebarang terjemahan.
                      </p>
                    </div>
                  </button>

                  {/* Option 3: Malay Only */}
                  <button
                    onClick={() => handleSelectLanguageMode('malay')}
                    className={`w-full p-2.5 rounded-xl text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                      languageMode === 'malay'
                        ? 'bg-indigo-950/70 border border-indigo-500/50 text-indigo-200'
                        : 'hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 mt-0.5 shrink-0 text-xs font-bold">
                      BM
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">BM Sahaja (Bahasa Melayu)</span>
                        {languageMode === 'malay' && (
                          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        Teks soalan dan pilihan jawapan dalam Bahasa Melayu Rumi.
                      </p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Live Server Visual Indicator (Bulatan Hijau / Merah) */}
          <button
            id="btn-live-server-status"
            onClick={() => {
              soundEffects.playClick();
              setIsServerModalOpen(true);
            }}
            className={`p-1.5 px-2 rounded-lg border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
              serverHealth.status === 'online'
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300'
                : serverHealth.status === 'waking'
                ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300'
                : 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-300'
            }`}
            title={
              serverHealth.status === 'online'
                ? `Pelayan Live Aktif & Sedia (${serverHealth.latencyMs ? `${serverHealth.latencyMs}ms` : 'Online'}) - Klik untuk status/bantuan`
                : serverHealth.status === 'waking'
                ? 'Pelayan Live sedang bangun dari mod tidur (Cold Start)... Klik untuk info'
                : 'Pelayan Live terputus / sedang tidur. Klik untuk bangunkan atau uji semula'
            }
          >
            {/* Visual Dot: Green / Amber / Red */}
            <span className="relative flex h-2.5 w-2.5">
              {serverHealth.status === 'online' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              {serverHealth.status === 'waking' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  serverHealth.status === 'online'
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
                    : serverHealth.status === 'waking'
                    ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                }`}
              />
            </span>
            <span className="text-[10px] font-bold hidden sm:inline">
              {serverHealth.status === 'online' ? 'Server: On' : serverHealth.status === 'waking' ? 'Bangun...' : 'Server: Off'}
            </span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              soundEffects.playClick();
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
            title={soundEnabled ? 'Matikan Bunyi' : 'Hidupkan Bunyi'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Share App Button */}
          <button
            id="btn-open-share-modal"
            onClick={() => {
              soundEffects.playClick();
              setIsShareModalOpen(true);
            }}
            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Kongsi Aplikasi Latih Tubi STAM ke WhatsApp / Telegram"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline text-[10px]">Kongsi</span>
          </button>

          {/* Teacher / Admin Access Button */}
          {onOpenTeacherModal && (
            <button
              onClick={() => {
                soundEffects.playClick();
                onOpenTeacherModal();
              }}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-950/60 text-slate-400 hover:text-amber-400 border border-slate-700/60 hover:border-amber-500/40 transition-colors flex items-center gap-1"
              title="Akses Pengurusan Guru / Soalan (Perlu PIN)"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] font-bold hidden md:inline text-amber-300">Guru</span>
            </button>
          )}
        </div>
      </div>

      {/* Mini Level XP Progress Line */}
      <div className="max-w-4xl mx-auto mt-2 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
          style={{ width: `${(xpInCurrentLevel / xpNeededForNext) * 100}%` }}
        />
      </div>

      {/* Share App Modal */}
      <ShareAppModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
      />

      {/* Live Server Status Modal */}
      <LiveServerStatusModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        onOpenLiveQuiz={onOpenLiveQuiz}
      />

      {/* Floating Language Mode Notification Toast */}
      {languageToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92%] sm:w-auto animate-fade-in shadow-2xl pointer-events-auto">
          <div
            className={`p-3 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 ${
              languageToast.color === 'teal'
                ? 'bg-teal-950/95 border-teal-500/60 text-teal-100 shadow-teal-950/60'
                : languageToast.color === 'amber'
                ? 'bg-amber-950/95 border-amber-500/60 text-amber-100 shadow-amber-950/60'
                : 'bg-indigo-950/95 border-indigo-500/60 text-indigo-100 shadow-indigo-950/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`p-1.5 rounded-xl shrink-0 ${
                  languageToast.color === 'teal'
                    ? 'bg-teal-500/20 text-teal-300'
                    : languageToast.color === 'amber'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-indigo-500/20 text-indigo-300'
                }`}
              >
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black tracking-wide text-white">
                    {languageToast.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                      languageToast.color === 'teal'
                        ? 'bg-teal-500/30 text-teal-200'
                        : languageToast.color === 'amber'
                        ? 'bg-amber-500/30 text-amber-200'
                        : 'bg-indigo-500/30 text-indigo-200'
                    }`}
                  >
                    {languageToast.badge}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-tight mt-0.5">
                  {languageToast.desc}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLanguageToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
              title="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

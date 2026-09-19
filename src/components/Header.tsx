import React, { useState } from 'react';
import { Flame, Volume2, VolumeX, Globe, Sparkles, BookOpen, ShieldCheck, Lock, Share2, User, Edit3 } from 'lucide-react';
import { soundEffects } from '../utils/audio';
import { ShareAppModal } from './ShareAppModal';

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
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
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

          {/* Language Mode Selector Dropdown */}
          <div className="relative group">
            <button
              onClick={() => {
                soundEffects.playClick();
                const nextMode = languageMode === 'bilingual' ? 'arabic' : languageMode === 'arabic' ? 'malay' : 'bilingual';
                onChangeLanguageMode(nextMode);
              }}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors flex items-center gap-1 text-xs"
              title={`Mod Bahasa: ${languageMode === 'bilingual' ? 'Dwi-Bahasa (Arab + Terjemahan)' : languageMode === 'arabic' ? 'Teks Arab Sahaja' : 'Bahasa Melayu Sahaja'}`}
            >
              <Globe className="w-4 h-4 text-teal-400" />
              <span className="text-[10px] uppercase font-bold hidden xs:inline">
                {languageMode === 'bilingual' ? 'Dwi' : languageMode === 'arabic' ? 'عربي' : 'BM'}
              </span>
            </button>
          </div>

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
    </header>
  );
};

import React, { useState } from 'react';
import { 
  Award, 
  Sparkles, 
  Lock, 
  CheckCircle, 
  Shield, 
  Brain, 
  Layers, 
  Flame, 
  Users, 
  Crown, 
  Footprints,
  Share2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Badge } from '../types';
import { soundEffects } from '../utils/audio';

interface BadgesViewProps {
  badges: Badge[];
}

export const BadgesView: React.FC<BadgesViewProps> = ({ badges }) => {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const unlockedCount = badges.filter((b) => b.unlocked).length;

  const renderIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Footprints':
        return <Footprints className={className} />;
      case 'Shield':
        return <Shield className={className} />;
      case 'Layers':
        return <Layers className={className} />;
      case 'Brain':
        return <Brain className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      case 'Users':
        return <Users className={className} />;
      case 'Award':
        return <Award className={className} />;
      case 'Crown':
        return <Crown className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  const handleBadgeClick = (badge: Badge) => {
    soundEffects.playClick();
    setSelectedBadge(badge);
    if (badge.unlocked) {
      soundEffects.playCorrect();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
      {/* Header Banner */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-1">
          <Award className="w-3.5 h-3.5" />
          <span>Sistem Ganjaran Lencana Digital</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Koleksi Lencana & Pengiktirafan
        </h2>
        <p className="text-xs text-slate-400">
          Setiap pencapaian dalam latihan akan membuka lencana kehormatan digital untuk membakar semangat belajar anda.
        </p>
      </div>

      {/* Unlocked Progress Card */}
      <div className="bg-gradient-to-r from-amber-950/70 via-slate-900 to-emerald-950/70 border border-amber-500/30 rounded-3xl p-5 shadow-xl flex items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-400 block mb-0.5">
            STATUS KOLEKSI ANDA
          </span>
          <h3 className="text-xl font-extrabold text-white">
            {unlockedCount} daripada {badges.length} Dibuka
          </h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Teruskan menjawab latihan untuk membuka baki {badges.length - unlockedCount} lencana lagi!
          </p>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex flex-col items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
          <Sparkles className="w-6 h-6 text-amber-400" />
          <span className="text-[11px] font-black text-white mt-0.5">
            {Math.round((unlockedCount / badges.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {badges.map((badge) => {
          const isUnlocked = badge.unlocked;
          const progressPercent = Math.min(
            Math.round((badge.currentProgress / badge.maxProgress) * 100),
            100
          );

          return (
            <div
              key={badge.id}
              onClick={() => handleBadgeClick(badge)}
              className={`p-4 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col items-center text-center relative overflow-hidden group ${
                isUnlocked
                  ? 'bg-slate-900 hover:bg-slate-800/90 border-amber-500/40 shadow-lg shadow-amber-950/20 hover:scale-[1.02]'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-85'
              }`}
            >
              {/* Rarity Pill */}
              <div className="absolute top-2.5 right-2.5">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                    badge.rarity === 'Berlian'
                      ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40'
                      : badge.rarity === 'Emas'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : badge.rarity === 'Perak'
                      ? 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                      : 'bg-amber-800/20 text-amber-400 border-amber-800/40'
                  }`}
                >
                  {badge.rarity}
                </span>
              </div>

              {/* Icon Container */}
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 mt-1 shadow-md transition-transform group-hover:scale-110 ${
                  isUnlocked
                    ? 'bg-gradient-to-tr from-amber-500/30 to-emerald-500/30 border border-amber-400/50 text-amber-300'
                    : 'bg-slate-800 border border-slate-700 text-slate-500'
                }`}
              >
                {isUnlocked ? (
                  renderIcon(badge.icon, 'w-7 h-7')
                ) : (
                  <Lock className="w-6 h-6 text-slate-600" />
                )}
              </div>

              {/* Title Arabic & Malay */}
              <span className="font-arabic text-sm font-bold text-slate-300 mb-0.5">
                {badge.arabicTitle}
              </span>
              <h4 className="text-xs font-bold text-white mb-1.5 line-clamp-1">
                {badge.title}
              </h4>

              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                {badge.description}
              </p>

              {/* Progress Bar / Status */}
              <div className="w-full mt-auto">
                {isUnlocked ? (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Dibuka
                  </span>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-slate-400">
                      <span>Kemajuan</span>
                      <span className="font-semibold text-slate-300">
                        {badge.currentProgress}/{badge.maxProgress}
                      </span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Badge Modal */}
      {selectedBadge && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedBadge(null)}
        >
          <div
            className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-xl ${
                selectedBadge.unlocked
                  ? 'bg-gradient-to-tr from-amber-500 to-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              {selectedBadge.unlocked ? (
                renderIcon(selectedBadge.icon, 'w-10 h-10')
              ) : (
                <Lock className="w-8 h-8" />
              )}
            </div>

            <div>
              <span className="font-arabic text-lg font-bold text-amber-300 block">
                {selectedBadge.arabicTitle}
              </span>
              <h3 className="text-base font-bold text-white">
                {selectedBadge.title}
              </h3>
              <span className="inline-block mt-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Peringkat: {selectedBadge.rarity}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              {selectedBadge.description}
            </p>

            <div className="text-xs text-slate-400">
              {selectedBadge.unlocked ? (
                <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Telah dibuka ({selectedBadge.unlockedAt || 'Berjaya diraih'})
                </span>
              ) : (
                <span>
                  Kemajuan semasa: <strong className="text-white">{selectedBadge.currentProgress}</strong> / {selectedBadge.maxProgress} ({Math.min(Math.round((selectedBadge.currentProgress / selectedBadge.maxProgress) * 100), 100)}%)
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

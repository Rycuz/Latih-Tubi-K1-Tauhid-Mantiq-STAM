import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Target, 
  Clock, 
  BookOpen, 
  RotateCcw,
  ArrowUpRight,
  Flame,
  Bookmark
} from 'lucide-react';
import { UserStats, SubjectId } from '../types';
import { TOPICS_DATA, QUESTIONS_DATA } from '../data/questions';
import { soundEffects } from '../utils/audio';

interface AnalyticsViewProps {
  stats: UserStats;
  onPracticeWeakTopic: (topicId: string, subject: SubjectId) => void;
  onOpenBookmarkedQuiz: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  onPracticeWeakTopic,
  onOpenBookmarkedQuiz,
}) => {
  const totalAnswered = stats.totalQuestionsAnswered;
  const overallAccuracy =
    totalAnswered > 0 ? Math.round((stats.correctAnswersCount / totalAnswered) * 100) : 0;

  // Performance by subject
  const subjectsData = [
    {
      id: 'tauhid' as SubjectId,
      nameArabic: 'التوحيد',
      nameMalay: 'Ilmu Tauhid',
      color: 'emerald',
      answered: stats.subjectAccuracy.tauhid.answered,
      correct: stats.subjectAccuracy.tauhid.correct,
      rate:
        stats.subjectAccuracy.tauhid.answered > 0
          ? Math.round(
              (stats.subjectAccuracy.tauhid.correct / stats.subjectAccuracy.tauhid.answered) * 100
            )
          : 0,
    },
    {
      id: 'firaq' as SubjectId,
      nameArabic: 'الفرق الإسلامية',
      nameMalay: 'Al-Firaq Al-Islamiyyah',
      color: 'cyan',
      answered: stats.subjectAccuracy.firaq.answered,
      correct: stats.subjectAccuracy.firaq.correct,
      rate:
        stats.subjectAccuracy.firaq.answered > 0
          ? Math.round(
              (stats.subjectAccuracy.firaq.correct / stats.subjectAccuracy.firaq.answered) * 100
            )
          : 0,
    },
    {
      id: 'mantiq' as SubjectId,
      nameArabic: 'المنطق',
      nameMalay: 'Ilmu Mantiq',
      color: 'violet',
      answered: stats.subjectAccuracy.mantiq.answered,
      correct: stats.subjectAccuracy.mantiq.correct,
      rate:
        stats.subjectAccuracy.mantiq.answered > 0
          ? Math.round(
              (stats.subjectAccuracy.mantiq.correct / stats.subjectAccuracy.mantiq.answered) * 100
            )
          : 0,
    },
  ];

  // Weak topics calculation (answered at least once and accuracy < 70%, or topics not yet attempted)
  const weakTopics = TOPICS_DATA.map((t) => {
    const p = stats.topicPerformance[t.id];
    const answered = p?.answered || 0;
    const correct = p?.correct || 0;
    const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return { ...t, answered, correct, rate };
  })
    .filter((t) => t.answered === 0 || t.rate < 75)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 4);

  // Strong topics (accuracy >= 75% with at least 2 questions)
  const strongTopics = TOPICS_DATA.map((t) => {
    const p = stats.topicPerformance[t.id];
    const answered = p?.answered || 0;
    const correct = p?.correct || 0;
    const rate = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    return { ...t, answered, correct, rate };
  })
    .filter((t) => t.answered >= 1 && t.rate >= 75)
    .sort((a, b) => b.rate - a.rate);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-1">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analisis Kemajuan Individu Pelajar</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          Laporan Prestasi & Diagnostik
        </h2>
        <p className="text-xs text-slate-400">
          Kesan kekuatan dan topik yang memerlukan penambahbaikan untuk persediaan peperiksaan.
        </p>
      </div>

      {/* Main KPI Bento Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-1">Ketepatan Keseluruhan</span>
          <span className="text-2xl font-black text-emerald-400">{overallAccuracy}%</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">{stats.correctAnswersCount} daripada {totalAnswered} betul</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-1">Jumlah XP Terkumpul</span>
          <span className="text-2xl font-black text-amber-400 flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> {stats.totalXp}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Tahap {stats.level}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-1">Rentetan Terkini</span>
          <span className="text-2xl font-black text-orange-400 flex items-center gap-1">
            <Flame className="w-4 h-4 fill-orange-400" /> {stats.streak} Hari
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Aktif berterusan</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-md">
          <span className="text-[11px] text-slate-400 block mb-1">Sesi Selesai</span>
          <span className="text-2xl font-black text-teal-400">{stats.quizzesCompleted}</span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Modul latih tubi</span>
        </div>
      </div>

      {/* Accuracy By Subject Bar Visualizer */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          Kadar Penguasaan Mengikut Subjek
        </h3>

        <div className="space-y-4">
          {subjectsData.map((sub) => (
            <div key={sub.id} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-arabic text-base font-bold text-white">{sub.nameArabic}</span>
                  <span className="text-slate-400">({sub.nameMalay})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">{sub.correct}/{sub.answered} betul</span>
                  <span className="font-bold text-white text-xs">{sub.rate}%</span>
                </div>
              </div>

              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    sub.id === 'tauhid' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
                    sub.id === 'firaq' ? 'bg-gradient-to-r from-cyan-500 to-blue-400' :
                    'bg-gradient-to-r from-violet-500 to-fuchsia-400'
                  }`}
                  style={{ width: `${sub.rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak Topics Diagnostic Alert Card */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Diagnostik Topik Perlu Pengukuhan
            </h3>
          </div>
          <span className="text-[10px] text-slate-400">Kadar &lt; 75%</span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Berdasarkan rekod latihan anda, kami mengesyorkan latihan intensif pada bab-bab berikut untuk melonjakkan gred:
        </p>

        <div className="space-y-2">
          {weakTopics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-arabic text-sm font-bold text-white truncate">
                    {topic.titleArabic}
                  </span>
                  <span className="text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded bg-slate-700 text-slate-300">
                    {topic.subject}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block truncate">
                  {topic.titleMalay}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-amber-400">
                  {topic.answered === 0 ? 'Belum dicuba' : `${topic.rate}%`}
                </span>
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    onPracticeWeakTopic(topic.id, topic.subject);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <span>Latih</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bookmarked Questions Quick Launch */}
      {stats.bookmarkedQuestionIds.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Bookmark className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Soalan Simpanan Anda</h4>
              <p className="text-[11px] text-slate-400">
                {stats.bookmarkedQuestionIds.length} soalan ditandakan untuk semakan pantas.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEffects.playClick();
              onOpenBookmarkedQuiz();
            }}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs rounded-xl border border-amber-500/30 transition-colors"
          >
            Ulang Kaji
          </button>
        </div>
      )}
    </div>
  );
};

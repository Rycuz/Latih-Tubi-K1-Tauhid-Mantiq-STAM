import React, { useState, useMemo, useCallback } from 'react';
import { 
  BookOpen, 
  Sparkles, 
  ShieldCheck, 
  BrainCircuit, 
  ChevronRight, 
  Flame, 
  Play, 
  Bookmark, 
  CheckCircle,
  HelpCircle,
  Clock,
  Layers,
  Search,
  Eye,
  ArrowRight,
  Compass,
  Lock,
  Edit3,
  Shuffle,
  Dices
} from 'lucide-react';
import { SubjectId, TopicInfo, UserStats, Question } from '../types';
import { TOPICS_DATA, QUESTIONS_DATA } from '../data/questions';
import { soundEffects } from '../utils/audio';

// Helper to randomly shuffle an array using Fisher-Yates algorithm and pick N items
function getRandomSample<T>(items: T[], count: number): T[] {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned.slice(0, Math.min(count, cloned.length));
}

interface SubjectPracticeViewProps {
  stats: UserStats;
  questions?: Question[];
  topics?: TopicInfo[];
  onStartQuiz: (
    topicId?: string,
    subjectId?: SubjectId,
    customCount?: number,
    options?: {
      shuffle?: boolean;
      startIndex?: number;
      reviewMode?: boolean;
      singleQuestionId?: string;
      customQuestions?: Question[];
      customTitle?: string;
      isRandomSet?: boolean;
    }
  ) => void;
  onOpenBookmarkedQuiz: () => void;
  onOpenTeacherModal?: () => void;
}

export const SubjectPracticeView: React.FC<SubjectPracticeViewProps> = ({
  stats,
  questions = QUESTIONS_DATA,
  topics = TOPICS_DATA,
  onStartQuiz,
  onOpenBookmarkedQuiz,
  onOpenTeacherModal,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [jumpSubject, setJumpSubject] = useState<SubjectId>('tauhid');
  const [jumpTopicId, setJumpTopicId] = useState<string>('all');
  const [jumpQuestionNum, setJumpQuestionNum] = useState<number>(1);

  const subjects = [
    {
      id: 'tauhid' as SubjectId,
      nameArabic: 'التوحيد',
      nameMalay: 'Ilmu Tauhid & Sam\'iyyat',
      description: 'Sam\'iyyat, Malaikat, Jin, Kubur, Mahsyar, Syafaat, Maqasid & Imamah',
      badgeColor: 'emerald',
      gradient: 'from-emerald-900/60 to-slate-900',
      accentBorder: 'border-emerald-700/50',
      textColor: 'text-emerald-400',
      totalQuestions: questions.filter((q) => q.subject === 'tauhid').length,
    },
    {
      id: 'firaq' as SubjectId,
      nameArabic: 'الفرق الإسلامية',
      nameMalay: 'Al-Firaq Al-Islamiyyah',
      description: 'Muktazilah, Ahli Sunnah, Syi\'ah, Khawarij, Ibadiyyah, Murji\'ah & Qadiyaniyyah',
      badgeColor: 'cyan',
      gradient: 'from-cyan-900/60 to-slate-900',
      accentBorder: 'border-cyan-700/50',
      textColor: 'text-cyan-400',
      totalQuestions: questions.filter((q) => q.subject === 'firaq').length,
    },
    {
      id: 'mantiq' as SubjectId,
      nameArabic: 'المنطق',
      nameMalay: 'Ilmu Mantiq & Kaedah Berfikir',
      description: 'Qadaya, Syartiyyah, Tanaqud, \'Aks Mustawi, Qiyas & Syakal Silogisme',
      badgeColor: 'violet',
      gradient: 'from-violet-900/60 to-slate-900',
      accentBorder: 'border-violet-700/50',
      textColor: 'text-violet-400',
      totalQuestions: questions.filter((q) => q.subject === 'mantiq').length,
    },
  ];

  const filteredTopics = topics.filter((topic) => {
    const matchSub = selectedSubject === 'all' || topic.subject === selectedSubject;
    const matchSearch =
      topic.titleMalay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.titleArabic.includes(searchQuery) ||
      (topic.descriptionMalay && topic.descriptionMalay.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSub && matchSearch;
  });

  // Helper to match a question to a topic reliably (by topicId or normalized title)
  const isQuestionInTopic = useCallback((q: Question, topic: TopicInfo) => {
    if (q.topicId === topic.id) return true;
    if (q.subject !== topic.subject) return false;
    const normQ = (q.topicId || '').trim().toLowerCase().replace(/[-_\s]/g, '');
    const normT = (topic.id || '').trim().toLowerCase().replace(/[-_\s]/g, '');
    if (normQ && normT && normQ === normT) return true;
    if (q.topicTitleMalay && topic.titleMalay && q.topicTitleMalay.trim().toLowerCase() === topic.titleMalay.trim().toLowerCase()) {
      return true;
    }
    if (q.topicTitleArabic && topic.titleArabic && q.topicTitleArabic.trim() === topic.titleArabic.trim()) {
      return true;
    }
    return false;
  }, []);

  const jumpSubjectTopics = useMemo(() => {
    return topics.filter((t) => t.subject === jumpSubject);
  }, [topics, jumpSubject]);

  const jumpActiveQuestions = useMemo(() => {
    if (jumpTopicId === 'all') {
      return questions.filter((q) => q.subject === jumpSubject);
    }
    const currentTopic = topics.find((t) => t.id === jumpTopicId);
    if (currentTopic) {
      return questions.filter((q) => isQuestionInTopic(q, currentTopic));
    }
    return questions.filter((q) => q.subject === jumpSubject && q.topicId === jumpTopicId);
  }, [questions, jumpSubject, jumpTopicId, topics, isQuestionInTopic]);

  const jumpActiveTotal = jumpActiveQuestions.length;

  // 4 BUTANG LATIHAN SOALAN RAWAK
  // 1. Set 40 Soalan (20 Tauhid, 10 Firaq, 10 Mantiq)
  const handleStartRandom40Quiz = () => {
    soundEffects.playClick();
    const tauhidPool = questions.filter((q) => q.subject === 'tauhid');
    const firaqPool = questions.filter((q) => q.subject === 'firaq');
    const mantiqPool = questions.filter((q) => q.subject === 'mantiq');

    const sampledTauhid = getRandomSample(tauhidPool, 20);
    const sampledFiraq = getRandomSample(firaqPool, 10);
    const sampledMantiq = getRandomSample(mantiqPool, 10);

    const combined40 = [...sampledTauhid, ...sampledFiraq, ...sampledMantiq];

    onStartQuiz(undefined, undefined, undefined, {
      customQuestions: combined40,
      customTitle: 'Simulasi STAM: 40 Soalan Rawak (20 Tauhid, 10 Firaq, 10 Mantiq)',
      shuffle: false,
      startIndex: 0,
      reviewMode: false,
      isRandomSet: true,
    });
  };

  // 2. Set 20 Soalan Rawak Tauhid
  const handleStartRandomTauhidQuiz = () => {
    soundEffects.playClick();
    const tauhidPool = questions.filter((q) => q.subject === 'tauhid');
    const sampled = getRandomSample(tauhidPool, 20);

    onStartQuiz(undefined, undefined, undefined, {
      customQuestions: sampled,
      customTitle: 'Set Rawak 20 Soalan: Ilmu Tauhid',
      shuffle: false,
      startIndex: 0,
      reviewMode: false,
      isRandomSet: true,
    });
  };

  // 3. Set 20 Soalan Rawak Firaq
  const handleStartRandomFiraqQuiz = () => {
    soundEffects.playClick();
    const firaqPool = questions.filter((q) => q.subject === 'firaq');
    const sampled = getRandomSample(firaqPool, 20);

    onStartQuiz(undefined, undefined, undefined, {
      customQuestions: sampled,
      customTitle: 'Set Rawak 20 Soalan: Al-Firaq Al-Islamiyyah',
      shuffle: false,
      startIndex: 0,
      reviewMode: false,
      isRandomSet: true,
    });
  };

  // 4. Set 20 Soalan Rawak Mantiq
  const handleStartRandomMantiqQuiz = () => {
    soundEffects.playClick();
    const mantiqPool = questions.filter((q) => q.subject === 'mantiq');
    const sampled = getRandomSample(mantiqPool, 20);

    onStartQuiz(undefined, undefined, undefined, {
      customQuestions: sampled,
      customTitle: 'Set Rawak 20 Soalan: Ilmu Mantiq',
      shuffle: false,
      startIndex: 0,
      reviewMode: false,
      isRandomSet: true,
    });
  };

  const handleExecuteJump = (reviewMode: boolean) => {
    soundEffects.playClick();
    const clampedIndex = Math.max(0, Math.min(jumpQuestionNum - 1, (jumpActiveTotal || 1) - 1));
    if (jumpTopicId !== 'all') {
      const selectedTopic = topics.find((t) => t.id === jumpTopicId);
      const title = selectedTopic ? `${selectedTopic.titleMalay} (${selectedTopic.titleArabic})` : undefined;
      onStartQuiz(jumpTopicId, jumpSubject, undefined, {
        shuffle: false,
        startIndex: clampedIndex,
        reviewMode,
        customTitle: title,
      });
    } else {
      onStartQuiz(undefined, jumpSubject, undefined, {
        shuffle: false,
        startIndex: clampedIndex,
        reviewMode,
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-5 pb-28">
      {/* Hero Action Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800/80 via-teal-900/70 to-slate-900 border border-emerald-500/30 p-5 shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bank Soalan Latihan STAM (286 Soalan)</span>
          </div>

          <h2 className="text-xl font-extrabold text-white mb-1.5 tracking-tight">
            Uji & Kuasai Tauhid, Firaq & Mantiq K1
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-4 max-w-lg">
            Koleksi lengkap soalan latihan aneka pilihan STAM. Dilengkapi teks Arab asal, pilihan jawapan, dan penjelasan skema.
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                soundEffects.playClick();
                onStartQuiz(undefined, undefined, undefined, { shuffle: false, startIndex: 0 });
              }}
              className="flex-1 min-w-[140px] py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>Mula Latihan Mengikut Susunan (Soalan 1)</span>
            </button>

            {stats.bookmarkedQuestionIds.length > 0 && (
              <button
                onClick={() => {
                  soundEffects.playClick();
                  onOpenBookmarkedQuiz();
                }}
                className="py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Bookmark className="w-3.5 h-3.5 fill-amber-400" />
                <span>Simpanan ({stats.bookmarkedQuestionIds.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Decorative background ambient */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 4 BUTANG LATIHAN SOALAN RAWAK / SIMULASI PEPERIKSAAN */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Mod Latihan Soalan Rawak</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  4 Pilihan Rawak
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Pilih set latihan rawak mengikut topik atau simulasi format STAM. Jika soalan dilangkau, ia akan diulang semula secara automatik selepas soalan terakhir.
              </p>
            </div>
          </div>
        </div>

        {/* BUTANG 1: SET 40 SOALAN RAWAK (SIMULASI FORMAT STAM) */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 p-4 shadow-lg hover:border-emerald-400/60 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Format Penuh STAM K1
                </span>
                <span className="text-[11px] font-semibold text-slate-300">
                  Jumlah: <span className="text-white font-bold">40 Soalan</span>
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">
                Set 40 Soalan Campuran Rawak
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Gabungan seimbang 40 soalan mengikut format Kertas 1:
              </p>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-emerald-950 border border-emerald-600/40 text-emerald-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  20 Tauhid
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-cyan-950 border border-cyan-600/40 text-cyan-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  10 Firaq
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-violet-950 border border-violet-600/40 text-violet-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                  10 Mantiq
                </span>
              </div>
            </div>

            <button
              id="btn-random-40-stam"
              type="button"
              onClick={handleStartRandom40Quiz}
              className="py-3 px-4 sm:px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all active:scale-95 shrink-0"
            >
              <Shuffle className="w-4 h-4" />
              <span>Jawab Set 40 Soalan Rawak</span>
            </button>
          </div>
        </div>

        {/* 3 BUTANG KHAS MENGIKUT SUBJEK (20 SOALAN RAWAK SETIAP SATU) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* BUTANG 2: 20 SOALAN TAUHID */}
          <div className="bg-slate-800/70 hover:bg-slate-800 border border-emerald-900/60 hover:border-emerald-600/50 rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  20 Soalan Rawak
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <h5 className="text-xs font-bold text-white pt-1">
                Ilmu Tauhid
              </h5>
              <p className="text-[11px] text-slate-400 leading-snug">
                20 soalan dipilih rawak daripada {questions.filter(q => q.subject === 'tauhid').length} soalan Tauhid.
              </p>
            </div>
            <button
              id="btn-random-20-tauhid"
              type="button"
              onClick={handleStartRandomTauhidQuiz}
              className="w-full py-2 px-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-emerald-950/40"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Jawab 20 Tauhid</span>
            </button>
          </div>

          {/* BUTANG 3: 20 SOALAN FIRAQ */}
          <div className="bg-slate-800/70 hover:bg-slate-800 border border-cyan-900/60 hover:border-cyan-600/50 rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                  20 Soalan Rawak
                </span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <h5 className="text-xs font-bold text-white pt-1">
                Al-Firaq Al-Islamiyyah
              </h5>
              <p className="text-[11px] text-slate-400 leading-snug">
                20 soalan dipilih rawak daripada {questions.filter(q => q.subject === 'firaq').length} soalan Firaq.
              </p>
            </div>
            <button
              id="btn-random-20-firaq"
              type="button"
              onClick={handleStartRandomFiraqQuiz}
              className="w-full py-2 px-3 rounded-xl bg-cyan-600/90 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-cyan-950/40"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Jawab 20 Firaq</span>
            </button>
          </div>

          {/* BUTANG 4: 20 SOALAN MANTIQ */}
          <div className="bg-slate-800/70 hover:bg-slate-800 border border-violet-900/60 hover:border-violet-600/50 rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/20">
                  20 Soalan Rawak
                </span>
                <BrainCircuit className="w-4 h-4 text-violet-400" />
              </div>
              <h5 className="text-xs font-bold text-white pt-1">
                Ilmu Mantiq
              </h5>
              <p className="text-[11px] text-slate-400 leading-snug">
                20 soalan dipilih rawak daripada {questions.filter(q => q.subject === 'mantiq').length} soalan Mantiq.
              </p>
            </div>
            <button
              id="btn-random-20-mantiq"
              type="button"
              onClick={handleStartRandomMantiqQuiz}
              className="w-full py-2 px-3 rounded-xl bg-violet-600/90 hover:bg-violet-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-violet-950/40"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Jawab 20 Mantiq</span>
            </button>
          </div>
        </div>
      </div>

      {/* QUICK QUESTION JUMP CARD (Semakan Terus Soalan) */}
      <div className="rounded-3xl bg-slate-900/90 border border-teal-500/40 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Semakan Pantas & Lompat Terus ke Mana-Mana Soalan
              </h3>
              <p className="text-[11px] text-slate-400">
                Lihat soalan (cth: Soalan 5) secara langsung tanpa perlu menjawab soalan lain
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-500/30 uppercase">
            Semakan Pantas
          </span>
        </div>

        {/* Controls: Select Subject & Select Topic & Input Question Number */}
        <div className="space-y-3 mb-3">
          {/* 1. Pilih Subjek */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 block mb-1">
              Pilih Subjek:
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              {(['tauhid', 'firaq', 'mantiq'] as SubjectId[]).map((sId) => {
                const subCount = questions.filter((q) => q.subject === sId).length;
                const labelMap = { 
                  tauhid: `Tauhid (${subCount})`, 
                  firaq: `Firaq (${subCount})`, 
                  mantiq: `Mantiq (${subCount})` 
                };
                return (
                  <button
                    key={sId}
                    type="button"
                    onClick={() => {
                      soundEffects.playClick();
                      setJumpSubject(sId);
                      setJumpTopicId('all');
                      setJumpQuestionNum(1);
                    }}
                    className={`py-1.5 px-1 text-center rounded-lg text-[11px] font-semibold transition-all ${
                      jumpSubject === sId
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {labelMap[sId]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Pilih Tajuk & Nombor Soalan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Pilih Tajuk */}
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                <span>Pilih Tajuk:</span>
              </label>
              <select
                value={jumpTopicId}
                onChange={(e) => {
                  soundEffects.playClick();
                  setJumpTopicId(e.target.value);
                  setJumpQuestionNum(1);
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-400"
              >
                <option value="all">
                  Semua Tajuk ({questions.filter((q) => q.subject === jumpSubject).length} soalan)
                </option>
                {jumpSubjectTopics.map((t) => {
                  const count = questions.filter((q) => isQuestionInTopic(q, t)).length;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.titleMalay} - {t.titleArabic} ({count} soalan)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Input Nombor Soalan */}
            <div>
              <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                Nombor Soalan:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, jumpActiveTotal)}
                  value={jumpQuestionNum}
                  onChange={(e) => setJumpQuestionNum(Math.max(1, Math.min(jumpActiveTotal || 1, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs text-center focus:outline-none focus:border-teal-400"
                />
                <span className="text-xs text-slate-400 shrink-0">/ {jumpActiveTotal}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pratonton Ringkas Soalan Yang Dipilih */}
        {jumpActiveQuestions[jumpQuestionNum - 1] && (
          <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300 flex items-center justify-between gap-3 mb-3">
            <span className="text-teal-400 font-bold shrink-0">
              Soalan {jumpQuestionNum}:
            </span>
            <span className="font-arabic text-right dir-rtl truncate text-slate-200" dir="rtl">
              {jumpActiveQuestions[jumpQuestionNum - 1].questionArabic}
            </span>
          </div>
        )}

        {/* Action Buttons for Jump */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            onClick={() => handleExecuteJump(true)}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-teal-950/50 transition-all active:scale-95"
          >
            <Eye className="w-4 h-4" />
            <span>Lihat Terus Soalan {jumpQuestionNum} (Mod Skema)</span>
          </button>

          <button
            onClick={() => handleExecuteJump(false)}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-slate-300" />
            <span>Jawab Bermula Soalan {jumpQuestionNum}</span>
          </button>
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Senarai Bab & Topik Sukatan STAM
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              {filteredTopics.length} Topik Tersedia
            </span>
            {onOpenTeacherModal && (
              <button
                onClick={() => {
                  soundEffects.playClick();
                  onOpenTeacherModal();
                }}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors flex items-center gap-1"
                title="Buka mod guru untuk menyunting nama senarai bab"
              >
                <Edit3 className="w-3 h-3" />
                <span>Sunting Bab</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-slate-800">
          <button
            onClick={() => {
              soundEffects.playClick();
              setSelectedSubject('all');
            }}
            className={`py-2 px-2 text-center rounded-xl text-xs font-semibold transition-all ${
              selectedSubject === 'all'
                ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua
          </button>
          {subjects.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                soundEffects.playClick();
                setSelectedSubject(sub.id);
              }}
              className={`py-2 px-2 text-center rounded-xl text-xs font-semibold transition-all truncate ${
                selectedSubject === sub.id
                  ? 'bg-slate-800 text-emerald-300 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {sub.nameArabic}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari topik (cth: Malaikat, Qiyas, Muktazilah)..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
          >
            Padam
          </button>
        )}
      </div>

      {/* Topics List */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-2.5">
          {filteredTopics.map((topic) => {
            const questionsInTopic = questions.filter((q) => isQuestionInTopic(q, topic));
            const answered = stats.topicPerformance[topic.id]?.answered || 0;
            const correct = stats.topicPerformance[topic.id]?.correct || 0;
            const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;
            const subjectTopics = topics.filter((t) => t.subject === topic.subject);
            const subIndex = subjectTopics.findIndex((t) => t.id === topic.id);

            return (
              <div
                key={topic.id}
                onClick={() => {
                  soundEffects.playClick();
                  onStartQuiz(topic.id, topic.subject, undefined, { shuffle: false, startIndex: 0 });
                }}
                className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition-all duration-200 cursor-pointer shadow-md flex items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0 mt-0.5 font-bold text-xs">
                    {subIndex !== -1 ? `#${subIndex + 1}` : <BookOpen className="w-5 h-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-arabic text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {topic.titleArabic}
                      </span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                        {topic.subject}
                      </span>
                      {subIndex !== -1 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Bab {subIndex + 1}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-semibold text-slate-300 truncate">
                      {topic.titleMalay}
                    </h4>

                    <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                      {topic.descriptionMalay}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                      <span>{questionsInTopic.length} Soalan disediakan</span>
                      {answered > 0 && (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> {accuracy}% tepat ({answered}x)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button 
                    className="p-2 rounded-xl bg-slate-800 group-hover:bg-emerald-500 text-slate-300 group-hover:text-slate-950 transition-colors"
                    title="Mula latihan bab ini"
                  >
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Teacher / Admin Question Management Access Card */}
      {onOpenTeacherModal && (
        <div className="pt-4 pb-2">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 transition-all">
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                  <span>Portal Guru: Dashboard Pelajar & Bank Soalan</span>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                    Dilindungi PIN
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Pantau markah dan sejarah latihan pelajar (bezakan pelajar sendiri vs sekolah lain) serta urus soalan.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                soundEffects.playClick();
                onOpenTeacherModal();
              }}
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 transition-all shrink-0 active:scale-95"
            >
              <Edit3 className="w-4 h-4" />
              <span>Buka Portal Guru</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

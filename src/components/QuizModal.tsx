import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Flame, 
  ChevronRight, 
  ChevronLeft,
  Bookmark, 
  BookmarkCheck, 
  HelpCircle, 
  RotateCcw, 
  Award,
  BookOpen,
  ArrowLeft,
  Grid,
  Eye,
  EyeOff,
  SkipForward,
  UploadCloud,
  Share2,
  School,
  User,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, QuestionAttempt, SubjectId } from '../types';
import { soundEffects } from '../utils/audio';
import { cleanRepeatedText } from '../utils/sanitizeText';
import { FormattedQuestionStem } from './FormattedQuestionStem';
import { QuestionDiagramRenderer } from './QuestionDiagramRenderer';
import { submitQuizToFirebase } from '../lib/firebase';

interface QuizModalProps {
  questions: Question[];
  title: string;
  subjectName?: string;
  initialIndex?: number;
  initialReviewMode?: boolean;
  isRandomSet?: boolean;
  onClose: () => void;
  onFinishQuiz: (results: {
    score: number;
    total: number;
    xpEarned: number;
    attempts: QuestionAttempt[];
  }) => void;
  languageMode: 'bilingual' | 'arabic' | 'malay';
  bookmarkedIds: string[];
  onToggleBookmark: (questionId: string) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  questions,
  title,
  subjectName,
  initialIndex = 0,
  initialReviewMode = false,
  isRandomSet = false,
  onClose,
  onFinishQuiz,
  languageMode,
  bookmarkedIds,
  onToggleBookmark,
}) => {
  const [quizQuestions, setQuizQuestions] = useState<Question[]>(questions);
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 && initialIndex < questions.length ? initialIndex : 0
  );
  const [selectedOption, setSelectedOption] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [reviewMode, setReviewMode] = useState(initialReviewMode);
  const [showGridNavigator, setShowGridNavigator] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [fontSizeClass, setFontSizeClass] = useState<'text-lg' | 'text-xl' | 'text-2xl'>('text-xl');
  const [attempts, setAttempts] = useState<QuestionAttempt[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Random set skip-and-repeat states
  const [skippedNotice, setSkippedNotice] = useState<string | null>(null);
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);

  // Check if current quiz is a random set
  const isRandom = Boolean(
    isRandomSet ||
    title.toLowerCase().includes('rawak') ||
    (subjectName && subjectName.toLowerCase().includes('rawak'))
  );

  useEffect(() => {
    setQuizQuestions(questions);
    setCurrentIndex(initialIndex >= 0 && initialIndex < questions.length ? initialIndex : 0);
  }, [questions, initialIndex]);

  // Cloud Sync & Student Profile States
  const [studentName, setStudentName] = useState<string>(() => {
    try {
      return localStorage.getItem('stam_student_name') || '';
    } catch {
      return '';
    }
  });
  const [studentSchool, setStudentSchool] = useState<string>(() => {
    try {
      return localStorage.getItem('stam_student_school') || '';
    } catch {
      return '';
    }
  });
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [cloudErrorMsg, setCloudErrorMsg] = useState<string>('');

  const currentQ = quizQuestions[currentIndex];
  const isRepeatedQuestion = isRandom && currentIndex >= questions.length;

  useEffect(() => {
    setQuestionStartTime(Date.now());
    // Reset selection unless already answered
    const existingAttempt = attempts.find((a) => a.questionId === currentQ?.id);
    if (existingAttempt) {
      setSelectedOption(existingAttempt.selectedOption);
      setIsAnswerSubmitted(true);
    } else {
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    }
  }, [currentIndex, currentQ?.id]);

  if (!currentQ && !quizCompleted) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center text-slate-300">
          <p>Tiada soalan ditemui bagi modul ini.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-emerald-600 rounded-xl text-white">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const handleSelectOption = (optionId: 'a' | 'b' | 'c' | 'd') => {
    if (isAnswerSubmitted && !reviewMode) return;

    soundEffects.playClick();
    setSelectedOption(optionId);
    setIsAnswerSubmitted(true);

    const isCorrect = optionId === currentQ.correctAnswer;
    const timeSpent = Math.round((Date.now() - questionStartTime) / 1000);

    // Save or update attempt record
    const attempt: QuestionAttempt = {
      questionId: currentQ.id,
      selectedOption: optionId,
      isCorrect,
      timeSpentSeconds: timeSpent,
      timestamp: Date.now(),
      subject: currentQ.subject,
      topicId: currentQ.topicId,
    };
    setAttempts((prev) => {
      const filtered = prev.filter((a) => a.questionId !== currentQ.id);
      return [...filtered, attempt];
    });

    if (isCorrect) {
      soundEffects.playCorrect();
      const newStreak = currentStreak + 1;
      setCurrentStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      const baseScore = 10;
      const streakBonus = Math.min(newStreak * 2, 10);
      const earned = baseScore + streakBonus;

      setScore((prev) => prev + 1);
      setXpEarned((prev) => prev + earned);
    } else {
      soundEffects.playWrong();
      setCurrentStreak(0);
    }
  };

  const handleSkipQuestion = () => {
    soundEffects.playClick();

    if (isRandom && currentQ) {
      const skippedQuestion = currentQ;
      const originalNum = currentIndex + 1;

      // Track this index as skipped
      setSkippedIndices((prev) => [...prev, currentIndex]);

      // Re-enqueue the skipped question to the end of the quiz queue
      setQuizQuestions((prev) => [...prev, skippedQuestion]);

      // Display informative notification
      setSkippedNotice(
        `Soalan #${originalNum} dilangkau. Ia akan diulang semula selepas soalan terakhir.`
      );
      setTimeout(() => {
        setSkippedNotice(null);
      }, 4500);

      // Advance to the next question
      setCurrentIndex((prev) => prev + 1);
    } else {
      handleNextQuestion();
    }
  };

  const handleNextQuestion = () => {
    soundEffects.playClick();
    if (currentIndex + 1 < quizQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setQuizCompleted(true);
      soundEffects.playFanfare();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  const handlePrevQuestion = () => {
    soundEffects.playClick();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleJumpToQuestion = (targetIndex: number) => {
    if (targetIndex >= 0 && targetIndex < quizQuestions.length) {
      soundEffects.playClick();
      setCurrentIndex(targetIndex);
      setShowGridNavigator(false);
    }
  };

  const handleCompleteAndExit = () => {
    onFinishQuiz({
      score,
      total: questions.length,
      xpEarned,
      attempts,
    });
  };

  const handleUploadToFirebase = async () => {
    if (!studentName.trim()) return;
    setCloudSyncStatus('syncing');
    setCloudErrorMsg('');
    try {
      localStorage.setItem('stam_student_name', studentName.trim());
      if (studentSchool.trim()) {
        localStorage.setItem('stam_student_school', studentSchool.trim());
      }
      const res = await submitQuizToFirebase({
        studentName: studentName.trim(),
        schoolOrClass: studentSchool.trim() || 'Umum',
        quizTitle: title,
        subject: subjectName || 'campuran',
        score,
        totalQuestions: questions.length,
        xpEarned,
      });
      if (res.success) {
        setCloudSyncStatus('synced');
        soundEffects.playCorrect();
      } else {
        setCloudSyncStatus('error');
        setCloudErrorMsg(res.error || 'Gagal menghantar ke Firebase');
      }
    } catch (err: any) {
      setCloudSyncStatus('error');
      setCloudErrorMsg(err?.message || 'Ralat sambungan');
    }
  };

  const handleShareWhatsApp = () => {
    soundEffects.playClick();
    const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const msg = `*Slip Keputusan Latihan STAM 2025*\n` +
      `👤 *Nama:* ${studentName.trim() || 'Calon STAM'}\n` +
      `🏫 *Sekolah/Kelas:* ${studentSchool.trim() || '-'}\n` +
      `📖 *Tajuk Kuiz:* ${title}\n` +
      `🎯 *Markah:* ${score}/${questions.length} (${accuracy}%)\n` +
      `⭐ *Ganjaran XP:* +${xpEarned} XP\n` +
      `📅 *Tarikh:* ${new Date().toLocaleDateString('ms-MY')}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    if (quizCompleted && studentName.trim() && cloudSyncStatus === 'idle') {
      handleUploadToFirebase();
    }
  }, [quizCompleted]);

  const isBookmarked = currentQ && bookmarkedIds.includes(currentQ.id);

  // Completed Screen
  if (quizCompleted) {
    const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center my-auto animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50 mb-4">
            <Award className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">
            Tahniah! Sesi Selesai
          </h2>
          <p className="text-sm text-slate-400 mb-6 font-arabic text-base">
            مَا شَاءَ الله! أَحْسَنْتَ يَا طَالِبَ العِلْمِ
          </p>

          {/* Results Summary Bento */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3">
              <span className="text-[11px] text-slate-400 block mb-0.5">Markah</span>
              <span className="text-xl font-bold text-white">
                {score}/{questions.length}
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3">
              <span className="text-[11px] text-slate-400 block mb-0.5">Ketepatan</span>
              <span className="text-xl font-bold text-emerald-400">
                {accuracy}%
              </span>
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3">
              <span className="text-[11px] text-slate-400 block mb-0.5">Ganjaran XP</span>
              <span className="text-xl font-bold text-amber-400 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4" />+{xpEarned}
              </span>
            </div>
          </div>

          {/* Repeated Questions Completed Notice */}
          {skippedIndices.length > 0 && (
            <div className="mb-4 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {skippedIndices.length} soalan yang dilangkau telah diulang semula sebelum sesi tamat.
              </span>
            </div>
          )}

          {/* Cloud Sync & Student Details Card */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 text-left mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <UploadCloud className="w-4 h-4 text-teal-400" />
                <span>Pangkalan Data Guru (Awan Firebase)</span>
              </span>
              {cloudSyncStatus === 'synced' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Tersimpan</span>
                </span>
              )}
            </div>

            {cloudSyncStatus === 'synced' ? (
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p>
                  Markah bagi <strong>{studentName}</strong> ({studentSchool || 'Umum'}) telah direkodkan terus ke Dashboard Guru!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Masukkan nama anda supaya guru dapat melihat markah latihan anda di Dashboard Guru:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Nama Pelajar (Wajib)"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                  <div className="relative">
                    <School className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Sekolah / Kelas (cth: Maahad Yaakubiah / MAYA)"
                      value={studentSchool}
                      onChange={(e) => setStudentSchool(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUploadToFirebase}
                  disabled={!studentName.trim() || cloudSyncStatus === 'syncing'}
                  className="w-full mt-1.5 py-2 px-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>
                    {cloudSyncStatus === 'syncing' ? 'Sedang Menyimpan ke Awan...' : 'Hantar Markah ke Dashboard Guru (Awan)'}
                  </span>
                </button>

                {cloudErrorMsg && (
                  <p className="text-[11px] text-rose-400 mt-1">{cloudErrorMsg}</p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleShareWhatsApp}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500/40 font-semibold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hantar Slip ke WhatsApp Guru</span>
            </button>

            <button
              onClick={handleCompleteAndExit}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold rounded-2xl shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
            >
              Simpan & Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showArabic = languageMode === 'bilingual' || languageMode === 'arabic';
  const showMalay = languageMode === 'bilingual' || languageMode === 'malay';
  const isCorrectRevealed = reviewMode || isAnswerSubmitted;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Bar with Question Navigator */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Back button & Title */}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wide block truncate max-w-[170px] sm:max-w-xs">
                {subjectName || currentQ.topicTitleMalay}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowGridNavigator(true)}
                  className="text-sm font-extrabold text-white flex items-center gap-1 hover:text-emerald-300 transition-colors bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700"
                  title="Klik untuk pilih mana-mana soalan terus"
                >
                  <span>Soalan {currentIndex + 1} / {quizQuestions.length}</span>
                  <Grid className="w-3.5 h-3.5 text-emerald-400" />
                  {isRepeatedQuestion && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-0.5 ml-1">
                      <RotateCcw className="w-2.5 h-2.5" />
                      Ulangan
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Controls: Jump Previous / Next + Review Mode + Bookmarks */}
          <div className="flex items-center gap-1.5">
            {/* Quick Prev Question */}
            <button
              onClick={handlePrevQuestion}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Soalan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Next Question */}
            <button
              onClick={handleNextQuestion}
              disabled={currentIndex + 1 >= quizQuestions.length}
              className="p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              title="Soalan Seterusnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Skema / Review Mode Toggle */}
            <button
              onClick={() => {
                soundEffects.playClick();
                setReviewMode((prev) => !prev);
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                reviewMode
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title={reviewMode ? 'Tutup Skema Jawapan' : 'Tunjuk Skema Jawapan Terus'}
            >
              {reviewMode ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{reviewMode ? 'Skema Aktif' : 'Skema'}</span>
            </button>

            {/* Bookmark button */}
            <button
              onClick={() => onToggleBookmark(currentQ.id)}
              className={`p-1.5 rounded-xl border transition-colors ${
                isBookmarked 
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={isBookmarked ? 'Dibuang dari simpanan' : 'Simpan soalan ini'}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
            style={{ width: `${Math.min(100, ((currentIndex + 1) / quizQuestions.length) * 100)}%` }}
          />
        </div>

        {/* Skipped Question Notice Toast */}
        {skippedNotice && (
          <div className="max-w-2xl mx-auto mt-2 px-3.5 py-2 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs font-medium flex items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
              <span>{skippedNotice}</span>
            </div>
            <button
              onClick={() => setSkippedNotice(null)}
              className="p-1 hover:text-white text-amber-400/80 rounded-lg"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Review Mode Banner */}
      {reviewMode && (
        <div className="bg-amber-950/70 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-300 font-medium flex items-center justify-center gap-2">
          <Eye className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Mod Semakan Skema: Jawapan yang betul dipaparkan terus untuk rujukan dan ulangkaji.</span>
        </div>
      )}

      {/* Main Question Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Learning Standard Tag */}
          {currentQ.learningStandard && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300 font-arabic">
              <span className="w-2 h-2 rounded-full bg-teal-400"></span>
              <span>معيار التعلم: {currentQ.learningStandard}</span>
            </div>
          )}

          {/* Question Stem Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Soalan #{currentIndex + 1}
                </span>
                {isRepeatedQuestion && (
                  <span className="text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>Ulangan Soalan Yang Dilangkau</span>
                  </span>
                )}
              </div>
              {currentQ.topicTitleArabic && (
                <span className="font-arabic text-xs text-slate-400" dir="rtl">
                  {currentQ.topicTitleArabic}
                </span>
              )}
            </div>

            {/* Authentic Diagram / Statement from Document (Pernyataan di atas soalan) */}
            <QuestionDiagramRenderer
              diagramArabic={currentQ.diagramArabic}
              diagramType={currentQ.diagramType}
              reviewMode={reviewMode}
              isAnswerSubmitted={isAnswerSubmitted}
              correctAnswer={currentQ.correctAnswer}
            />

            <FormattedQuestionStem
              questionArabic={currentQ.questionArabic}
              questionMalay={currentQ.questionMalay}
              showArabic={showArabic}
              showMalay={showMalay}
              fontSizeClass={fontSizeClass}
            />
          </div>

          {/* Options Grid */}
          <div className="space-y-2.5">
            {currentQ.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              const isCorrectOpt = opt.id === currentQ.correctAnswer;
              
              let optStyle = 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-200';
              let badgeStyle = 'bg-slate-800 text-slate-400 border-slate-700';

              if (reviewMode) {
                // In review mode, show the correct answer immediately
                if (isCorrectOpt) {
                  optStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-100 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500';
                  badgeStyle = 'bg-emerald-500 text-white border-emerald-400 font-black';
                } else {
                  optStyle = 'bg-slate-900/60 border-slate-800/60 text-slate-400';
                }
              } else if (isAnswerSubmitted) {
                if (isCorrectOpt) {
                  optStyle = 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/40';
                  badgeStyle = 'bg-emerald-500 text-white border-emerald-400';
                } else if (isSelected && !isCorrectOpt) {
                  optStyle = 'bg-rose-950/60 border-rose-500 text-rose-200 shadow-md shadow-rose-950/40';
                  badgeStyle = 'bg-rose-500 text-white border-rose-400';
                } else {
                  optStyle = 'bg-slate-900/40 border-slate-800/50 text-slate-500 opacity-60';
                }
              } else if (isSelected) {
                optStyle = 'bg-slate-800 border-emerald-500 text-white';
                badgeStyle = 'bg-emerald-600 text-white border-emerald-500';
              }

              const labelArabicMap: Record<string, string> = {
                a: 'أ',
                b: 'ب',
                c: 'ج',
                d: 'د',
              };

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 relative active:scale-[0.99] ${optStyle}`}
                >
                  <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${badgeStyle}`}>
                    {opt.id.toUpperCase()} ({labelArabicMap[opt.id] || opt.id})
                  </span>

                  <div className="flex-1 min-w-0">
                    {showArabic && opt.textArabic && (
                      <p className="font-arabic text-base font-semibold leading-relaxed text-right dir-rtl mb-1" dir="rtl">
                        {opt.textArabic}
                      </p>
                    )}
                    {showMalay && opt.textMalay && (
                      <p className="text-xs text-slate-300 font-normal leading-relaxed">
                        {opt.textMalay}
                      </p>
                    )}
                  </div>

                  {isCorrectRevealed && isCorrectOpt && (
                    <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/80 px-2 py-1 rounded-lg border border-emerald-500/40 shrink-0 self-center">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-[10px] font-bold">JAWAPAN TEPAT</span>
                    </div>
                  )}
                  {!reviewMode && isAnswerSubmitted && isSelected && !isCorrectOpt && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 self-center" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Real-time Explanation Card */}
          {isCorrectRevealed && (
            <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-800">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Skema Jawapan & Penjelasan:
                  </h3>
                  <span className="text-xs text-slate-400">
                    Pilihan Tepat: <span className="font-bold text-emerald-400 uppercase">({currentQ.correctAnswer.toUpperCase()})</span>
                  </span>
                </div>
              </div>

              {/* Arabic Explanation */}
              {showArabic && currentQ.explanationArabic && currentQ.explanationArabic.trim() !== '' && (
                <div className="mb-3 bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
                  <span className="text-[11px] font-bold text-teal-300 block mb-1">الشَّرْحُ وَالتَّوْجِيهُ:</span>
                  <p className="font-arabic text-sm text-slate-200 leading-relaxed text-right dir-rtl" dir="rtl">
                    {currentQ.explanationArabic}
                  </p>
                </div>
              )}

              {/* Malay Explanation */}
              {showMalay && currentQ.explanationMalay && currentQ.explanationMalay.trim() !== '' && (
                <div className="text-xs text-slate-300 leading-relaxed space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-400 block">Huraian Bahasa Melayu:</span>
                  <p>{currentQ.explanationMalay}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => setShowGridNavigator(true)}
            className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700"
          >
            <Grid className="w-3.5 h-3.5 text-emerald-400" />
            <span>Lompat Soalan</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Langkau button if not answered */}
            {!isAnswerSubmitted && !reviewMode && (
              <button
                onClick={handleSkipQuestion}
                className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm"
                title={isRandom ? 'Langkau soalan ini dan jawab semula selepas soalan terakhir' : 'Langkau soalan ini'}
              >
                <span>{isRandom ? 'Langkau (Ulang Di Akhir)' : 'Langkau'}</span>
                {isRandom ? (
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>
            )}

            {/* Next or Finish Button */}
            <button
              onClick={handleNextQuestion}
              className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
            >
              <span>{currentIndex + 1 < quizQuestions.length ? 'Seterusnya' : 'Selesai'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Navigator Drawer / Modal */}
      {showGridNavigator && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Grid className="w-4 h-4 text-emerald-400" />
                  <span>Pilih Mana-Mana Soalan Terus</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Klik mana-mana nombor soalan untuk membukanya secara terus
                </p>
              </div>
              <button
                onClick={() => setShowGridNavigator(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Question Buttons Grid */}
            <div className="flex-1 overflow-y-auto p-2 my-3 grid grid-cols-5 sm:grid-cols-8 gap-2">
              {quizQuestions.map((q, idx) => {
                const isCurrent = idx === currentIndex;
                const att = attempts.find((a) => a.questionId === q.id);
                const wasSkippedHere = skippedIndices.includes(idx);
                const isRepeatedInstance = idx >= questions.length;
                let btnColor = 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700';

                if (isCurrent) {
                  btnColor = 'bg-emerald-600 border-emerald-400 text-white font-extrabold ring-2 ring-emerald-400/50';
                } else if (att) {
                  btnColor = att.isCorrect 
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300' 
                    : 'bg-rose-950/80 border-rose-600 text-rose-300';
                } else if (wasSkippedHere) {
                  btnColor = 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40';
                }

                return (
                  <button
                    key={`${q.id}-${idx}`}
                    onClick={() => handleJumpToQuestion(idx)}
                    className={`h-11 rounded-xl border flex flex-col items-center justify-center text-xs transition-all active:scale-95 ${btnColor}`}
                    title={
                      isRepeatedInstance
                        ? `Soalan ${idx + 1} (Ulangan Soalan Dilangkau)`
                        : wasSkippedHere
                        ? `Soalan ${idx + 1} (Dilangkau - diulang di akhir)`
                        : `Soalan ${idx + 1}`
                    }
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="font-bold">{idx + 1}</span>
                      {isRepeatedInstance && (
                        <RotateCcw className="w-2.5 h-2.5 text-amber-400" />
                      )}
                    </div>
                    {wasSkippedHere && !att && (
                      <span className="text-[8px] text-amber-400 font-bold -mt-0.5">LANGKAU</span>
                    )}
                    {isRepeatedInstance && (
                      <span className="text-[8px] text-amber-400 font-bold -mt-0.5">ULANG</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowGridNavigator(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

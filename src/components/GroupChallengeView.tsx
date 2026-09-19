import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ChevronRight, 
  Sparkles, 
  RotateCcw, 
  Play, 
  Share2,
  Swords
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, GroupChallengeState } from '../types';
import { QUESTIONS_DATA } from '../data/questions';
import { soundEffects } from '../utils/audio';
import { FormattedQuestionStem } from './FormattedQuestionStem';
import { QuestionDiagramRenderer } from './QuestionDiagramRenderer';

interface GroupChallengeViewProps {
  onUnlockGroupBadge: () => void;
  languageMode: 'bilingual' | 'arabic' | 'malay';
  questions?: Question[];
}

export const GroupChallengeView: React.FC<GroupChallengeViewProps> = ({
  onUnlockGroupBadge,
  languageMode,
  questions = QUESTIONS_DATA,
}) => {
  const [gameState, setGameState] = useState<GroupChallengeState>({
    roomId: 'HALAQAH-786',
    roomName: 'Halaqah Dirasat Islamiyyah',
    teams: [
      {
        id: 'team-a',
        name: 'Kumpulan Al-Ghazali',
        color: 'emerald',
        score: 0,
        streak: 0,
        members: ['Ahmad', 'Irfan', 'Zul'],
      },
      {
        id: 'team-b',
        name: 'Kumpulan Al-Asy\'ari',
        color: 'cyan',
        score: 0,
        streak: 0,
        members: ['Aisyah', 'Humaira', 'Sarah'],
      },
    ],
    currentTeamIndex: 0,
    questionList: [],
    currentQuestionIndex: 0,
    status: 'setup',
    roundTimerSeconds: 30,
    totalRounds: 6,
  });

  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedOption, setSelectedOption] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [tempTeamAName, setTempTeamAName] = useState('Kumpulan Al-Ghazali');
  const [tempTeamBName, setTempTeamBName] = useState('Kumpulan Al-Asy\'ari');
  const [roundCount, setRoundCount] = useState(6);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState.status === 'active' && !isAnswerRevealed && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (gameState.status === 'active' && !isAnswerRevealed && timeLeft === 0) {
      // Time expired
      soundEffects.playWrong();
      setIsAnswerRevealed(true);
    }
    return () => clearTimeout(timer);
  }, [gameState.status, isAnswerRevealed, timeLeft]);

  const startNewChallenge = () => {
    soundEffects.playClick();
    // Shuffle questions randomly
    const pool = questions.length > 0 ? questions : QUESTIONS_DATA;
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, roundCount);
    
    setGameState((prev) => ({
      ...prev,
      teams: [
        { ...prev.teams[0], name: tempTeamAName, score: 0, streak: 0 },
        { ...prev.teams[1], name: tempTeamBName, score: 0, streak: 0 },
      ],
      currentTeamIndex: 0,
      questionList: shuffled,
      currentQuestionIndex: 0,
      status: 'active',
      totalRounds: roundCount,
    }));
    setTimeLeft(30);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
  };

  const handleSelectOption = (optId: 'a' | 'b' | 'c' | 'd') => {
    if (isAnswerRevealed) return;
    soundEffects.playClick();
    setSelectedOption(optId);
    setIsAnswerRevealed(true);

    const currentQ = gameState.questionList[gameState.currentQuestionIndex];
    const isCorrect = optId === currentQ.correctAnswer;
    const currentTeamIdx = gameState.currentTeamIndex;

    setGameState((prev) => {
      const updatedTeams = [...prev.teams] as [typeof prev.teams[0], typeof prev.teams[1]];
      const targetTeam = updatedTeams[currentTeamIdx];

      if (isCorrect) {
        soundEffects.playCorrect();
        const newStreak = targetTeam.streak + 1;
        const earnedPoints = 10 + Math.min(newStreak * 2, 6);
        updatedTeams[currentTeamIdx] = {
          ...targetTeam,
          score: targetTeam.score + earnedPoints,
          streak: newStreak,
        };
      } else {
        soundEffects.playWrong();
        updatedTeams[currentTeamIdx] = {
          ...targetTeam,
          streak: 0,
        };
      }

      return {
        ...prev,
        teams: updatedTeams,
      };
    });
  };

  const handleNextRound = () => {
    soundEffects.playClick();
    const nextQIndex = gameState.currentQuestionIndex + 1;
    if (nextQIndex < gameState.questionList.length) {
      // Toggle to next team
      setGameState((prev) => ({
        ...prev,
        currentQuestionIndex: nextQIndex,
        currentTeamIndex: prev.currentTeamIndex === 0 ? 1 : 0,
      }));
      setTimeLeft(30);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      // Game ended
      const teamA = gameState.teams[0];
      const teamB = gameState.teams[1];
      let winnerId = undefined;
      if (teamA.score > teamB.score) winnerId = teamA.id;
      else if (teamB.score > teamA.score) winnerId = teamB.id;

      setGameState((prev) => ({
        ...prev,
        status: 'finished',
        winnerTeamId: winnerId,
      }));
      soundEffects.playFanfare();
      onUnlockGroupBadge();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const resetLobby = () => {
    soundEffects.playClick();
    setGameState((prev) => ({
      ...prev,
      status: 'setup',
      currentQuestionIndex: 0,
      questionList: [],
    }));
  };

  // 1. SETUP / LOBBY SCREEN
  if (gameState.status === 'setup') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
        <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Mod Cabaran Berkumpulan
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                  Kolaboratif
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Belajar bersama rakan sekelas secara bersemuka atau berkumpulan dengan sistem giliran dan perbincangan hujah.
              </p>
            </div>
          </div>

          {/* Quick Guide */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Swords className="w-4 h-4 text-indigo-400" /> Cara Permainan:
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Bahagikan kelas kepada 2 Kumpulan (atau 2 orang pelajar).</li>
              <li>Setiap soalan diberi masa 30 saat untuk perbincangan bersama.</li>
              <li>Kumpulan bergilir menjawab dan penjelasan dalil akan dibentangkan untuk kefahaman bersama.</li>
            </ul>
          </div>

          {/* Teams Customization */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                Pasukan 1 (Hijau)
              </span>
              <input
                type="text"
                value={tempTeamAName}
                onChange={(e) => setTempTeamAName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block mb-1">
                Pasukan 2 (Biru Muda)
              </span>
              <input
                type="text"
                value={tempTeamBName}
                onChange={(e) => setTempTeamBName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-semibold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Round selector */}
          <div className="mb-6">
            <span className="text-xs font-bold text-slate-400 block mb-2">
              Bilangan Pusingan Soalan:
            </span>
            <div className="flex gap-2">
              {[4, 6, 10, 14].map((num) => (
                <button
                  key={num}
                  onClick={() => setRoundCount(num)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    roundCount === num
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {num} Pusingan
                </button>
              ))}
            </div>
          </div>

          {/* Launch Button */}
          <button
            onClick={startNewChallenge}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500 hover:opacity-95 text-white font-bold rounded-2xl shadow-xl shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Mula Cabaran Berkumpulan</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. FINISHED / VICTORY SCREEN
  if (gameState.status === 'finished') {
    const teamA = gameState.teams[0];
    const teamB = gameState.teams[1];
    const isTie = teamA.score === teamB.score;
    const winner = teamA.score > teamB.score ? teamA : teamB;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center space-y-6 pb-28">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-xl shadow-amber-950/40">
          <Trophy className="w-10 h-10 text-slate-950" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-white mb-1">
            {isTie ? 'Keputusan Seri!' : `Juara: ${winner.name}!`}
          </h2>
          <p className="text-sm text-slate-400 font-arabic text-base">
            مُبَارَكٌ لَكُمْ جَمِيعًا عَلَى التَّعَاوُنِ فِي طَلَبِ العِلْمِ
          </p>
        </div>

        {/* Score comparison card */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className={`p-4 rounded-2xl border ${winner.id === teamA.id ? 'bg-emerald-950/60 border-emerald-500/80 shadow-lg shadow-emerald-950/50' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-xs font-bold text-emerald-400 block mb-1">{teamA.name}</span>
            <span className="text-3xl font-extrabold text-white">{teamA.score}</span>
            <span className="text-[10px] text-slate-400 block mt-1">Mata Pasukan</span>
          </div>

          <div className={`p-4 rounded-2xl border ${winner.id === teamB.id ? 'bg-cyan-950/60 border-cyan-500/80 shadow-lg shadow-cyan-950/50' : 'bg-slate-900 border-slate-800'}`}>
            <span className="text-xs font-bold text-cyan-400 block mb-1">{teamB.name}</span>
            <span className="text-3xl font-extrabold text-white">{teamB.score}</span>
            <span className="text-[10px] text-slate-400 block mt-1">Mata Pasukan</span>
          </div>
        </div>

        {/* Group Badge Unlock Message */}
        <div className="p-4 bg-indigo-500/15 border border-indigo-500/30 rounded-2xl max-w-md mx-auto flex items-center gap-3 text-left">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Lencana Digital Diperoleh!</h4>
            <p className="text-[11px] text-slate-400">
              Semua peserta telah menyumbang kepada kemajuan lencana "Wira Cabaran Berkumpulan".
            </p>
          </div>
        </div>

        <button
          onClick={resetLobby}
          className="py-3 px-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl shadow-lg transition-all active:scale-95"
        >
          Main Pusingan Baharu
        </button>
      </div>
    );
  }

  // 3. ACTIVE ROUND SCREEN
  const currentQ = gameState.questionList[gameState.currentQuestionIndex];
  const activeTeam = gameState.teams[gameState.currentTeamIndex];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Live Duel Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-md">
        {/* Team 1 Score */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${gameState.currentTeamIndex === 0 ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400'}`}>
          <span className="text-xs font-bold truncate max-w-[110px]">{gameState.teams[0].name}</span>
          <span className="font-extrabold text-sm text-white">{gameState.teams[0].score}</span>
        </div>

        {/* Round & Timer indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-lg border ${timeLeft <= 5 ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s</span>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {gameState.currentQuestionIndex + 1}/{gameState.totalRounds}
          </span>
        </div>

        {/* Team 2 Score */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${gameState.currentTeamIndex === 1 ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300' : 'bg-slate-800/60 border-slate-700/50 text-slate-400'}`}>
          <span className="text-xs font-bold truncate max-w-[110px]">{gameState.teams[1].name}</span>
          <span className="font-extrabold text-sm text-white">{gameState.teams[1].score}</span>
        </div>
      </div>

      {/* Active Team Prompt Banner */}
      <div className={`p-3 rounded-2xl border text-center text-xs font-bold shadow-sm ${gameState.currentTeamIndex === 0 ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300' : 'bg-cyan-950/50 border-cyan-500/50 text-cyan-300'}`}>
        Giliran Menjawab: <span className="underline">{activeTeam.name}</span> (Bincang bersama & pilih jawapan)
      </div>

      {/* Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
          <span className="font-bold uppercase text-emerald-400">{currentQ.subject}</span>
          <span className="font-arabic">{currentQ.topicTitleArabic}</span>
        </div>

        {/* Diagram / Tree / Table / Box Statement if available */}
        {currentQ.diagramArabic && (
          <QuestionDiagramRenderer
            diagramArabic={currentQ.diagramArabic}
            diagramType={currentQ.diagramType}
            reviewMode={isAnswerRevealed}
            isAnswerSubmitted={isAnswerRevealed}
            correctAnswer={currentQ.correctAnswer}
          />
        )}

        <FormattedQuestionStem
          questionArabic={currentQ.questionArabic}
          questionMalay={currentQ.questionMalay}
          showArabic={languageMode !== 'malay'}
          showMalay={languageMode !== 'arabic'}
          fontSizeClass="text-xl"
        />
      </div>

      {/* Options */}
      <div className="space-y-2.5">
        {currentQ.options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          const isCorrect = opt.id === currentQ.correctAnswer;

          let style = 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200';
          if (isAnswerRevealed) {
            if (isCorrect) style = 'bg-emerald-950/80 border-emerald-500 text-emerald-200';
            else if (isSelected && !isCorrect) style = 'bg-rose-950/80 border-rose-500 text-rose-200';
            else style = 'bg-slate-900/40 border-slate-800/40 text-slate-600 opacity-50';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelectOption(opt.id)}
              disabled={isAnswerRevealed}
              className={`w-full p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${style}`}
            >
              <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold flex items-center justify-center shrink-0">
                {opt.id.toUpperCase()}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-arabic text-base font-bold text-right dir-rtl mb-1" dir="rtl">
                  {opt.textArabic}
                </p>
                <p className="text-xs text-slate-300">
                  {opt.textMalay}
                </p>
              </div>
              {isAnswerRevealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {isAnswerRevealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Answer Revealed Explanation for Collaboration */}
      {isAnswerRevealed && (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            <span>Perbincangan & Rujukan Dalil:</span>
          </div>

          {currentQ.explanationArabic && currentQ.explanationArabic.trim() !== '' && (
            <div className="font-arabic text-xs text-slate-200 text-right dir-rtl bg-slate-800/70 p-3 rounded-xl border border-slate-700/50" dir="rtl">
              {currentQ.explanationArabic}
            </div>
          )}

          {currentQ.explanationMalay && currentQ.explanationMalay.trim() !== '' && (
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentQ.explanationMalay}
            </p>
          )}

          <button
            onClick={handleNextRound}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
          >
            <span>{gameState.currentQuestionIndex + 1 < gameState.totalRounds ? 'Pusingan Seterusnya' : 'Tamatkan & Lihat Pemenang'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

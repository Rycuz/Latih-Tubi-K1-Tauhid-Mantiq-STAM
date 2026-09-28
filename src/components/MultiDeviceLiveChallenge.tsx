import React, { useState, useEffect, useRef } from 'react';
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
  Swords,
  Radio,
  Zap,
  Flame,
  Crown,
  Copy,
  Check,
  Smartphone,
  Layers,
  ArrowRight,
  LogOut,
  Medal,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question, MultiDeviceRoom, MultiDevicePlayer, MultiDeviceAnswer } from '../types';
import { soundEffects } from '../utils/audio';
import { FormattedQuestionStem } from './FormattedQuestionStem';
import { QuestionDiagramRenderer } from './QuestionDiagramRenderer';
import { 
  createLiveChallengeRoom,
  joinLiveChallengeRoom,
  updateChallengeRoomStatus,
  submitLiveChallengeAnswer,
  subscribeToLiveChallengeRoom,
  subscribeToLiveChallengePlayers,
  subscribeToLiveChallengeAnswers
} from '../lib/firebase';

interface MultiDeviceLiveChallengeProps {
  questions: Question[];
  languageMode: 'bilingual' | 'arabic' | 'malay';
  currentStudent: {
    id: string;
    name: string;
    schoolOrClass?: string;
  };
  onUnlockGroupBadge: () => void;
  onBackToModeSelect: () => void;
}

export const MultiDeviceLiveChallenge: React.FC<MultiDeviceLiveChallengeProps> = ({
  questions,
  languageMode,
  currentStudent,
  onUnlockGroupBadge,
  onBackToModeSelect,
}) => {
  // Navigation inside Live view: 'join_or_host' | 'hosting_lobby' | 'player_lobby' | 'game'
  const [viewState, setViewState] = useState<'join_or_host' | 'hosting_lobby' | 'player_lobby' | 'game'>('join_or_host');
  
  // Room code and metadata
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [roomTitle, setRoomTitle] = useState('Piala Dirasat Islamiyyah STAM');
  const [roundCount, setRoundCount] = useState(8);
  const [timeLimit, setTimeLimit] = useState(25);
  const [isHost, setIsHost] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Player identity for the room
  const [playerName, setPlayerName] = useState(currentStudent.name || 'Pelajar STAM');
  const [playerSchool, setPlayerSchool] = useState(currentStudent.schoolOrClass || '');
  const [playerId] = useState(currentStudent.id || `player-${Date.now()}`);

  // Real-time Firestore state
  const [currentRoom, setCurrentRoom] = useState<MultiDeviceRoom | null>(null);
  const [players, setPlayers] = useState<MultiDevicePlayer[]>([]);
  const [answers, setAnswers] = useState<MultiDeviceAnswer[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Current Question Player State
  const [selectedOption, setSelectedOption] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState<number | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Local question countdown timer
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const questionStartTimeRef = useRef<number>(Date.now());

  // Real-time Firestore Subscriptions when roomCode is active
  useEffect(() => {
    if (!roomCode) return;

    const unsubRoom = subscribeToLiveChallengeRoom(roomCode, (room) => {
      if (!room) {
        setErrorMessage('Bilik telah ditamatkan oleh hos.');
        setViewState('join_or_host');
        setCurrentRoom(null);
        return;
      }
      setCurrentRoom(room);

      // Handle room stage changes
      if (room.status === 'lobby') {
        setViewState(isHost ? 'hosting_lobby' : 'player_lobby');
      } else if (room.status === 'active' || room.status === 'question_result' || room.status === 'finished') {
        setViewState('game');
      }
    });

    const unsubPlayers = subscribeToLiveChallengePlayers(roomCode, (list) => {
      setPlayers(list);
      // Track my streak
      const me = list.find((p) => p.id === playerId);
      if (me) {
        setCurrentStreak(me.streak || 0);
      }
    });

    const unsubAnswers = subscribeToLiveChallengeAnswers(roomCode, (ansList) => {
      setAnswers(ansList);
    });

    return () => {
      unsubRoom();
      unsubPlayers();
      unsubAnswers();
    };
  }, [roomCode, isHost, playerId]);

  // When room question changes or becomes active, reset local answer state
  const currentQuestionIdx = currentRoom?.currentQuestionIndex ?? 0;
  const currentRoomStatus = currentRoom?.status;

  useEffect(() => {
    if (currentRoomStatus === 'active') {
      setSelectedOption(null);
      setHasSubmittedAnswer(false);
      setLastPointsEarned(null);
      questionStartTimeRef.current = Date.now();
      setTimeLeft(currentRoom?.timeLimitSeconds || 25);
    }
  }, [currentQuestionIdx, currentRoomStatus, currentRoom?.timeLimitSeconds]);

  // Question timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentRoomStatus === 'active' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // If time expires and host, automatically show results
            if (isHost && roomCode) {
              updateChallengeRoomStatus(roomCode, { status: 'question_result' });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentRoomStatus, timeLeft, isHost, roomCode]);

  // Fanfare when game finishes
  useEffect(() => {
    if (currentRoomStatus === 'finished') {
      soundEffects.playFanfare();
      onUnlockGroupBadge();
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.5 },
      });
    }
  }, [currentRoomStatus, onUnlockGroupBadge]);

  // HOST: Create Room
  const handleHostCreateRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage('Sila masukkan nama anda dahulu.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    soundEffects.playClick();

    // Select questions randomly
    const pool = questions.length > 0 ? questions : [];
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, roundCount);

    const res = await createLiveChallengeRoom({
      hostId: playerId,
      hostName: playerName,
      title: roomTitle,
      questions: shuffled,
      timeLimitSeconds: timeLimit,
    });

    setIsProcessing(false);
    if (res.success && res.roomCode) {
      setRoomCode(res.roomCode);
      setIsHost(true);
      setViewState('hosting_lobby');
    } else {
      setErrorMessage(res.error || 'Gagal membuka bilik.');
    }
  };

  // PLAYER: Join Room
  const handleJoinRoom = async () => {
    const cleanCode = inputRoomCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setErrorMessage('Sila masukkan Kod Bilik / PIN 6-aksara yang sah.');
      return;
    }
    if (!playerName.trim()) {
      setErrorMessage('Sila masukkan nama anda.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    soundEffects.playClick();

    const res = await joinLiveChallengeRoom({
      roomCode: cleanCode,
      playerId,
      playerName,
      schoolOrClass: playerSchool,
    });

    setIsProcessing(false);
    if (res.success && res.room) {
      setRoomCode(cleanCode);
      setIsHost(false);
      setViewState('player_lobby');
    } else {
      setErrorMessage(res.error || 'Tidak dapat menyertai bilik.');
    }
  };

  // HOST: Start Game
  const handleStartGame = async () => {
    if (!roomCode) return;
    soundEffects.playClick();
    await updateChallengeRoomStatus(roomCode, {
      status: 'active',
      currentQuestionIndex: 0,
      questionStartTime: Date.now(),
    });
  };

  // PLAYER: Submit Answer with Speed Bonus Calculation
  const handleAnswerSubmit = async (optId: 'a' | 'b' | 'c' | 'd') => {
    if (hasSubmittedAnswer || currentRoomStatus !== 'active' || !currentRoom) return;

    setSelectedOption(optId);
    setHasSubmittedAnswer(true);
    soundEffects.playClick();

    const currentQ = currentRoom.questions[currentRoom.currentQuestionIndex];
    const isCorrect = optId === currentQ.correctAnswer;
    const timeTakenSeconds = Math.max(0.5, (Date.now() - questionStartTimeRef.current) / 1000);

    if (isCorrect) {
      soundEffects.playCorrect();
    } else {
      soundEffects.playWrong();
    }

    const res = await submitLiveChallengeAnswer({
      roomCode,
      playerId,
      playerName,
      questionIndex: currentRoom.currentQuestionIndex,
      selectedOption: optId,
      isCorrect,
      timeTakenSeconds,
      timeLimitSeconds: currentRoom.timeLimitSeconds,
      currentStreak,
    });

    if (res.success) {
      setLastPointsEarned(res.pointsEarned);
      setCurrentStreak(res.newStreak);
    }
  };

  // HOST: Move to Question Result
  const handleShowQuestionResult = async () => {
    if (!roomCode) return;
    soundEffects.playClick();
    await updateChallengeRoomStatus(roomCode, {
      status: 'question_result',
    });
  };

  // HOST: Advance to Next Question or Finish
  const handleNextQuestion = async () => {
    if (!roomCode || !currentRoom) return;
    soundEffects.playClick();

    const nextIndex = currentRoom.currentQuestionIndex + 1;
    if (nextIndex < currentRoom.totalQuestions) {
      await updateChallengeRoomStatus(roomCode, {
        status: 'active',
        currentQuestionIndex: nextIndex,
        questionStartTime: Date.now(),
      });
    } else {
      await updateChallengeRoomStatus(roomCode, {
        status: 'finished',
      });
    }
  };

  // Copy Room Code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ============================================================
  // 1. VIEW: JOIN OR HOST SELECTION
  // ============================================================
  if (viewState === 'join_or_host') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
        {/* Header Hero */}
        <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-inner">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Cabaran Live Multi-Device
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Sync
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Pertarungan pantas serentak melalui telefon masing-masing. Siapa cepat & betul dapat markah tertinggi!
                </p>
              </div>
            </div>

            <button
              onClick={onBackToModeSelect}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 transition-colors"
            >
              Kembali
            </button>
          </div>

          {/* Quick Rules */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" /> Sistem Pemarkahan Kompetitif (Speed Multiplier):
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong className="text-emerald-300">Asas Jawapan Betul:</strong> 100 mata.</li>
              <li><strong className="text-amber-300">Bonus Kelajuan (+1 hingga +100 mata):</strong> Semakin laju anda menekan jawapan betul, semakin tinggi markah tambahan yang diperolehi.</li>
              <li><strong className="text-indigo-300">Streak Kombo:</strong> Jawapan berturut-turut betul memberi bonus streak sehingga +45 mata.</li>
            </ul>
          </div>

          {/* Player Info Box */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6 space-y-3">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
              Profil Anda Dalam Permainan:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Nama Penuh / Gelaran:</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Contoh: Muhammad Danish"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Sekolah / Kelas:</label>
                <input
                  type="text"
                  value={playerSchool}
                  onChange={(e) => setPlayerSchool(e.target.value)}
                  placeholder="Contoh: SMKA Maahad Hamidiah (STAM-6A)"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-300 text-xs mb-4">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Two Pathways: Join Room vs Host Room */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Enter Pin / Join */}
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Sertai Bilik (Murid)</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Masukkan PIN / Kod Bilik 6-aksara yang dipaparkan oleh guru atau rakan anda.
                </p>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  value={inputRoomCode}
                  onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
                  placeholder="KOD PIN (Cth: 8X7K2P)"
                  className="w-full text-center tracking-widest text-xl font-mono font-bold uppercase bg-slate-950 border-2 border-indigo-500/40 rounded-xl py-3 text-emerald-300 focus:outline-none focus:border-emerald-400"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={isProcessing}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <ArrowRight className="w-4 h-4" /> Masuk Bilik Sekarang
                </button>
              </div>
            </div>

            {/* 2. Create Room / Host */}
            <div className="bg-gradient-to-b from-slate-900 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-white text-base">Buka Bilik Baharu (Hos/Guru)</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Jadi Hos untuk mengawal perlawanan. Paparkan kod bilik kepada murid pada projektor atau skrin.
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Pusingan Soalan:</label>
                    <select
                      value={roundCount}
                      onChange={(e) => setRoundCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-slate-200 font-semibold"
                    >
                      <option value={5}>5 Soalan</option>
                      <option value={8}>8 Soalan</option>
                      <option value={10}>10 Soalan</option>
                      <option value={15}>15 Soalan</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Masa / Soalan:</label>
                    <select
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-slate-200 font-semibold"
                    >
                      <option value={15}>15 Saat (Pantas)</option>
                      <option value={20}>20 Saat</option>
                      <option value={25}>25 Saat (Standard)</option>
                      <option value={30}>30 Saat (Santai)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleHostCreateRoom}
                  disabled={isProcessing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Play className="w-4 h-4" /> Buka Bilik Live
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 2. VIEW: LOBBY (WAITING FOR PLAYERS TO JOIN)
  // ============================================================
  if (viewState === 'hosting_lobby' || viewState === 'player_lobby') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
        <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
          {/* Header Pin Display */}
          <div className="text-center space-y-2 mb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {isHost ? '👑 Anda adalah Hos Bilik' : '🎮 Anda Sedang Menunggu di Lobi'}
            </span>
            <h2 className="text-2xl font-black text-white">{currentRoom?.title || 'Bilik Cabaran STAM'}</h2>
            <p className="text-xs text-slate-400">
              Minta semua peserta membuka aplikasi di telefon masing-masing dan masukkan PIN ini:
            </p>

            <div className="inline-flex items-center gap-3 bg-slate-950 border-2 border-indigo-500/60 px-6 py-3 rounded-2xl shadow-inner mt-2">
              <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-400">
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
                title="Salin PIN"
              >
                {isCopied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Connected Players Grid */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Senarai Peserta Telah Masuk ({players.length}):</span>
              </h4>
              <span className="text-[10px] text-emerald-400 font-mono animate-pulse">● Sambungan Langsung</span>
            </div>

            {players.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Menunggu pemain pertama menyertai menggunakan PIN...
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {players.map((p) => {
                  const isMe = p.id === playerId;
                  return (
                    <div
                      key={p.id}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs transition-all ${
                        isMe
                          ? 'bg-indigo-950/80 border-indigo-500/60 text-indigo-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 text-emerald-400">
                        {p.isHost ? '👑' : '👤'}
                      </div>
                      <div className="truncate flex-1 min-w-0">
                        <p className="font-bold truncate">{p.name} {isMe && '(Saya)'}</p>
                        {p.schoolOrClass && <p className="text-[10px] text-slate-400 truncate">{p.schoolOrClass}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={players.length === 0}
                className="w-full sm:flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>MULAKAN PERLAWANAN SEKARANG</span>
              </button>
            ) : (
              <div className="w-full p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-xl text-center text-xs text-indigo-300 font-semibold animate-pulse">
                ⏳ Menunggu Hos ({currentRoom?.hostName}) memulakan pusingan soalan...
              </div>
            )}

            <button
              onClick={() => {
                setRoomCode('');
                setViewState('join_or_host');
              }}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 3. VIEW: GAME IN PROGRESS (ACTIVE / RESULT / FINISHED)
  // ============================================================
  if (!currentRoom || !currentRoom.questions || currentRoom.questions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">
        Memuatkan data bilik permainan...
      </div>
    );
  }

  const currentQ = currentRoom.questions[currentRoom.currentQuestionIndex];
  const isQuestionResult = currentRoom.status === 'question_result';
  const isGameFinished = currentRoom.status === 'finished';

  // Answers received for this specific question
  const currentAnswers = answers.filter((a) => a.questionIndex === currentRoom.currentQuestionIndex);
  const correctAnswersCount = currentAnswers.filter((a) => a.isCorrect).length;

  // Podium Sort
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const myPlayerRecord = players.find((p) => p.id === playerId);

  // If Finished Screen
  if (isGameFinished) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
        <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-6">
          <div className="inline-flex p-4 rounded-3xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
            <Trophy className="w-12 h-12" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">KEPUTUSAN PENUH CABARAN LIVE</h2>
            <p className="text-xs text-slate-400 mt-1">
              Tahniah kepada semua peserta yang telah berjuang dengan pantas dan tepat!
            </p>
          </div>

          {/* Podium Top 3 */}
          <div className="grid grid-cols-3 gap-2 items-end pt-4 max-w-md mx-auto">
            {/* Rank 2 */}
            {sortedPlayers[1] && (
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-center space-y-1">
                <span className="text-xl">🥈</span>
                <p className="text-xs font-bold text-white truncate">{sortedPlayers[1].name}</p>
                <p className="text-xs text-indigo-400 font-mono font-bold">{sortedPlayers[1].score} XP</p>
                <span className="inline-block text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">#2</span>
              </div>
            )}

            {/* Rank 1 (Champion) */}
            {sortedPlayers[0] && (
              <div className="bg-gradient-to-b from-amber-950/80 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 text-center space-y-1 shadow-xl transform -translate-y-2">
                <Crown className="w-6 h-6 text-amber-400 mx-auto" />
                <span className="text-2xl">🥇</span>
                <p className="text-sm font-black text-white truncate">{sortedPlayers[0].name}</p>
                <p className="text-sm text-amber-400 font-mono font-black">{sortedPlayers[0].score} XP</p>
                <span className="inline-block text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">JUARA</span>
              </div>
            )}

            {/* Rank 3 */}
            {sortedPlayers[2] && (
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-center space-y-1">
                <span className="text-xl">🥉</span>
                <p className="text-xs font-bold text-white truncate">{sortedPlayers[2].name}</p>
                <p className="text-xs text-cyan-400 font-mono font-bold">{sortedPlayers[2].score} XP</p>
                <span className="inline-block text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">#3</span>
              </div>
            )}
          </div>

          {/* Full Leaderboard Table */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 max-h-60 overflow-y-auto">
            <h4 className="text-xs font-bold text-slate-400 mb-2 text-left">Kedudukan Semua Peserta:</h4>
            <div className="space-y-1.5">
              {sortedPlayers.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                    p.id === playerId
                      ? 'bg-indigo-950/80 border-indigo-500/60 text-white font-bold'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-slate-500 font-mono font-bold">{idx + 1}.</span>
                    <span>{p.name} {p.id === playerId && '(Anda)'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.streak > 1 && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                        <Flame className="w-3 h-3" /> {p.streak}
                      </span>
                    )}
                    <span className="font-mono font-bold text-emerald-400">{p.score} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setRoomCode('');
                setViewState('join_or_host');
              }}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-xl transition-all"
            >
              Main Pusingan Baharu
            </button>
            <button
              onClick={onBackToModeSelect}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-xs"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active or Result Question Screen
  return (
    <div className="max-w-2xl mx-auto px-4 py-3 space-y-4 pb-28">
      {/* Top Bar: Progress, Timer, Live Answers Counter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between shadow-lg">
        {/* Round counter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
            Soalan {currentRoom.currentQuestionIndex + 1} / {currentRoom.totalQuestions}
          </span>
          <span className="text-xs text-slate-400 hidden sm:inline">{currentQ.subject.toUpperCase()}</span>
        </div>

        {/* Live Timer Indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-sm font-bold border ${
            timeLeft <= 5 
              ? 'bg-rose-950 border-rose-500 text-rose-300 animate-bounce' 
              : 'bg-slate-800 border-slate-700 text-amber-300'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{isQuestionResult ? 'Tamat' : `${timeLeft}s`}</span>
          </div>

          {/* Submissions count */}
          <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono">
            👥 {currentAnswers.length} / {players.length} Menjawab
          </div>
        </div>
      </div>

      {/* Speed & Streak Banner for Current Player */}
      {myPlayerRecord && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span>Kedudukan Anda:</span>
            <span className="font-bold text-white">
              #{sortedPlayers.findIndex((p) => p.id === playerId) + 1}
            </span>
            <span className="text-emerald-400 font-mono font-bold">({myPlayerRecord.score} XP)</span>
          </div>
          {currentStreak > 1 && (
            <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
              <Flame className="w-3.5 h-3.5" />
              <span>Streak x{currentStreak}!</span>
            </div>
          )}
        </div>
      )}

      {/* Main Question Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800 pb-2">
          <span className="font-bold uppercase text-emerald-400">{currentQ.subject}</span>
          <span className="font-arabic">{currentQ.topicTitleArabic}</span>
        </div>

        {/* Diagram if available */}
        {currentQ.diagramArabic && (
          <QuestionDiagramRenderer
            diagramArabic={currentQ.diagramArabic}
            diagramType={currentQ.diagramType}
            reviewMode={isQuestionResult}
            isAnswerSubmitted={hasSubmittedAnswer || isQuestionResult}
            correctAnswer={currentQ.correctAnswer}
          />
        )}

        <FormattedQuestionStem
          questionArabic={currentQ.questionArabic}
          questionMalay={currentQ.questionMalay}
          showArabic={languageMode !== 'malay'}
          showMalay={languageMode !== 'arabic'}
          fontSizeClass="text-lg sm:text-xl"
        />
      </div>

      {/* Options Grid (Kahoot / Quizizz style fast buttons) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {currentQ.options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          const isCorrect = opt.id === currentQ.correctAnswer;

          let btnColor = 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200';
          if (hasSubmittedAnswer && !isQuestionResult) {
            if (isSelected) btnColor = 'bg-indigo-950 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/50';
            else btnColor = 'bg-slate-900/40 border-slate-800/40 text-slate-600 opacity-50';
          } else if (isQuestionResult) {
            if (isCorrect) btnColor = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50';
            else if (isSelected && !isCorrect) btnColor = 'bg-rose-950/90 border-rose-500 text-rose-200';
            else btnColor = 'bg-slate-900/40 border-slate-800/40 text-slate-600 opacity-50';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleAnswerSubmit(opt.id)}
              disabled={hasSubmittedAnswer || isQuestionResult}
              className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all active:scale-[0.98] ${btnColor}`}
            >
              <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black flex items-center justify-center shrink-0">
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
              {isQuestionResult && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {isQuestionResult && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Answer Submitted Feedback Notice for Player */}
      {hasSubmittedAnswer && !isQuestionResult && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-1">
          <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Jawapan anda telah dihantar!
          </p>
          <p className="text-[11px] text-slate-400">
            Masa direkodkan. Markah kelajuan akan dikira sebaik sahaja pemasa tamat.
          </p>
        </div>
      )}

      {/* Question Result Discussion & Leaderboard snippet */}
      {isQuestionResult && (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span>Huraian Dalil & Jawapan:</span>
            </div>
            <span className="text-xs text-emerald-400 font-mono">
              🎯 {correctAnswersCount} daripada {currentAnswers.length} orang betul!
            </span>
          </div>

          {currentQ.explanationArabic && (
            <div className="font-arabic text-xs text-slate-200 text-right dir-rtl bg-slate-800/80 p-3 rounded-xl border border-slate-700/60" dir="rtl">
              {currentQ.explanationArabic}
            </div>
          )}

          {currentQ.explanationMalay && (
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentQ.explanationMalay}
            </p>
          )}

          {/* Current Question Top Answerers by Speed */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              ⚡ Terpantas Menjawab Betul Soalan Ini:
            </span>
            <div className="space-y-1">
              {currentAnswers
                .filter((a) => a.isCorrect)
                .sort((a, b) => a.timeTakenSeconds - b.timeTakenSeconds)
                .slice(0, 3)
                .map((a, idx) => (
                  <div key={a.playerId} className="flex items-center justify-between text-xs py-1 border-b border-slate-800/50 last:border-0">
                    <span className="text-slate-300 font-medium">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'} {a.playerName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[11px]">{a.timeTakenSeconds}s</span>
                      <span className="text-emerald-400 font-mono font-bold">+{a.scoreEarned} XP</span>
                    </div>
                  </div>
                ))}
              {currentAnswers.filter((a) => a.isCorrect).length === 0 && (
                <p className="text-[11px] text-slate-500 py-1">Tiada peserta menjawab betul soalan ini.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Host Controls */}
      {isHost && (
        <div className="flex items-center gap-3 pt-2">
          {!isQuestionResult ? (
            <button
              onClick={handleShowQuestionResult}
              className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Kunci Jawapan & Papar Keputusan Sekarang
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              <span>
                {currentRoom.currentQuestionIndex + 1 < currentRoom.totalQuestions
                  ? 'Soalan Seterusnya ➔'
                  : 'Tamatkan Kuiz & Papar Pemenang 🏆'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

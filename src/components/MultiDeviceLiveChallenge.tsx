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
  Award,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Server,
  Wifi,
  X
} from 'lucide-react';
import { Question, MultiDeviceRoom, MultiDevicePlayer, MultiDeviceAnswer } from '../types';
import { QUESTIONS_DATA } from '../data/questions';
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
  subscribeToLiveChallengeAnswers,
  getLiveServerBaseUrl,
  detectIsStaticHosting,
  forceReconnectRoom,
  subscribeToServerHealth,
  getCurrentServerHealth,
  wakeUpLiveServer,
  LiveServerHealthState
} from '../lib/liveRealtimeClient';

export const AVATAR_CATEGORIES = [
  {
    id: 'human',
    label: 'Manusia',
    icon: '👤',
    avatars: [
      { emoji: '🧑‍🎓', name: 'Pelajar Pintar' },
      { emoji: '👦', name: 'Danish' },
      { emoji: '👧', name: 'Aisyah' },
      { emoji: '🧕', name: 'Fatimah' },
      { emoji: '👳‍♂️', name: 'Ustaz Muda' },
      { emoji: '🦸‍♂️', name: 'Wira Muslim' },
      { emoji: '🥷', name: 'Pendekar' },
      { emoji: '🕵️‍♂️', name: 'Penyelidik Mantiq' },
    ],
  },
  {
    id: 'animal',
    label: 'Haiwan',
    icon: '🐾',
    avatars: [
      { emoji: '🦁', name: 'Singa Berani' },
      { emoji: '🦅', name: 'Helang Pantas' },
      { emoji: '🐯', name: 'Harimau Tangkas' },
      { emoji: '🐺', name: 'Serigala Pintar' },
      { emoji: '🐬', name: 'Lumba-lumba' },
      { emoji: '🦊', name: 'Musang Cerdik' },
      { emoji: '🐼', name: 'Panda Tenang' },
      { emoji: '🐱', name: 'Kucing Comel' },
    ],
  },
  {
    id: 'monster',
    label: 'Raksasa & Mitos',
    icon: '👾',
    avatars: [
      { emoji: '👾', name: 'Raksasa Angkasa' },
      { emoji: '🤖', name: 'Robot Logik' },
      { emoji: '🐲', name: 'Naga Emas' },
      { emoji: '🧌', name: 'Gergasi Cergas' },
      { emoji: '👻', name: 'Hantu Comel' },
      { emoji: '🦄', name: 'Kuda Sakti' },
      { emoji: '🦖', name: 'T-Rex Perkasa' },
      { emoji: '🧙‍♂️', name: 'Pendeta Ilmu' },
    ],
  },
] as const;

interface MultiDeviceLiveChallengeProps {
  questions: Question[];
  languageMode: 'bilingual' | 'arabic' | 'malay';
  currentStudent: {
    id: string;
    name: string;
    schoolOrClass?: string;
  };
  onUnlockGroupBadge: () => void;
  onClose?: () => void;
}

export const MultiDeviceLiveChallenge: React.FC<MultiDeviceLiveChallengeProps> = ({
  questions,
  languageMode,
  currentStudent,
  onUnlockGroupBadge,
  onClose,
}) => {
  // Navigation inside Live view: 'join_or_host' | 'hosting_lobby' | 'player_lobby' | 'game'
  const [viewState, setViewState] = useState<'join_or_host' | 'hosting_lobby' | 'player_lobby' | 'game'>('join_or_host');
  
  // Room code and metadata
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [roomTitle, setRoomTitle] = useState('Piala Dirasat Islamiyyah STAM');
  const [selectedSubject, setSelectedSubject] = useState<'all' | 'tauhid' | 'firaq' | 'mantiq'>('all');
  const [roundCount, setRoundCount] = useState(8);
  const [timeLimit, setTimeLimit] = useState(25);
  const [isHost, setIsHost] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Player identity for the room
  const [playerName, setPlayerName] = useState(currentStudent.name || 'Pelajar STAM');
  const [playerSchool, setPlayerSchool] = useState(currentStudent.schoolOrClass || '');
  const [playerId] = useState(currentStudent.id || `player-${Date.now()}`);
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    try {
      return localStorage.getItem('stam_student_live_avatar') || '🧑‍🎓';
    } catch {
      return '🧑‍🎓';
    }
  });
  const [activeAvatarTab, setActiveAvatarTab] = useState<'human' | 'animal' | 'monster'>('human');
  const [showAvatarPicker, setShowAvatarPicker] = useState<boolean>(false);

  // Real-time Firestore state
  const [currentRoom, setCurrentRoom] = useState<MultiDeviceRoom | null>(null);
  const [players, setPlayers] = useState<MultiDevicePlayer[]>([]);
  const [answers, setAnswers] = useState<MultiDeviceAnswer[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

  // Current Question Player State
  const [selectedOption, setSelectedOption] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState<number | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Local question countdown timer
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const questionStartTimeRef = useRef<number>(Date.now());
  const hasHandledFinishRef = useRef<boolean>(false);

  // Render / Backend Server Status State
  const [isTestingServer, setIsTestingServer] = useState(false);
  const [serverHealth, setServerHealth] = useState<LiveServerHealthState>(getCurrentServerHealth);

  useEffect(() => {
    const unsub = subscribeToServerHealth((state) => {
      setServerHealth(state);
    });
    return () => unsub();
  }, []);

  const handleWakeUpServer = async () => {
    soundEffects.playClick();
    setIsTestingServer(true);
    try {
      await wakeUpLiveServer();
    } finally {
      setIsTestingServer(false);
    }
  };

  // Reconnection state for force reconnect button
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectToast, setReconnectToast] = useState<string | null>(null);

  const handleForceReconnect = async () => {
    if (!roomCode) return;
    soundEffects.playClick();
    setIsReconnecting(true);
    setReconnectToast('Sedang menyambung semula ke pelayan...');
    try {
      const res = await forceReconnectRoom(roomCode);
      setReconnectToast(res.message);
    } catch {
      setReconnectToast('Percubaan menyambung semula selesai.');
    } finally {
      setIsReconnecting(false);
      setTimeout(() => setReconnectToast(null), 3500);
    }
  };

  // Real-time Firestore Subscriptions when roomCode is active
  useEffect(() => {
    if (!roomCode) return;

    const unsubRoom = subscribeToLiveChallengeRoom(roomCode, (room) => {
      if (!room) {
        setErrorMessage('Bilik telah ditamatkan.');
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

  // Animated ranking stage after each question: 'initial' (suspense / old rank) -> 'transitioning' (smooth glide) -> 'settled'
  const [rankAnimStage, setRankAnimStage] = useState<'initial' | 'transitioning' | 'settled'>('settled');

  useEffect(() => {
    if (currentRoomStatus === 'active') {
      setSelectedOption(null);
      setHasSubmittedAnswer(false);
      setLastPointsEarned(null);
      questionStartTimeRef.current = Date.now();
      setTimeLeft(currentRoom?.timeLimitSeconds || 25);
      setRankAnimStage('initial');
    } else if (currentRoomStatus === 'question_result') {
      // Auto-scroll to top so students immediately see the animated ranking results without scrolling
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const mainEl = document.querySelector('main');
        if (mainEl) mainEl.scrollTop = 0;
      } catch {}

      // Start in initial state showing previous ranking
      setRankAnimStage('initial');

      // After 750ms suspense delay, trigger smooth rank glide transition
      const t1 = setTimeout(() => {
        setRankAnimStage('transitioning');
        try {
          soundEffects.playCorrect();
        } catch {}
      }, 750);

      // Settle after animation completes
      const t2 = setTimeout(() => {
        setRankAnimStage('settled');
      }, 1900);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
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

  // Clean finish handler without music/fanfare or particles (prevents lagging and re-render loops)
  useEffect(() => {
    if (currentRoomStatus === 'finished' && !hasHandledFinishRef.current) {
      hasHandledFinishRef.current = true;
      try {
        onUnlockGroupBadge();
      } catch {
        // Safe catch
      }
    }
  }, [currentRoomStatus, onUnlockGroupBadge]);

  // Comprehensive reset function to return cleanly to menu or close
  const handleExitToMenu = () => {
    soundEffects.playClick();
    hasHandledFinishRef.current = false;
    setRoomCode('');
    setCurrentRoom(null);
    setPlayers([]);
    setAnswers([]);
    setSelectedOption(null);
    setHasSubmittedAnswer(false);
    setViewState('join_or_host');
    if (onClose) {
      onClose();
    }
  };

  const handleRestartNewRound = () => {
    soundEffects.playClick();
    hasHandledFinishRef.current = false;
    setRoomCode('');
    setCurrentRoom(null);
    setPlayers([]);
    setAnswers([]);
    setSelectedOption(null);
    setHasSubmittedAnswer(false);
    setViewState('join_or_host');
  };

  // Filter available questions pool based on host subject selection
  const allPool = questions && questions.length > 0 ? questions : QUESTIONS_DATA;
  const subjectFilteredPool = selectedSubject === 'all' 
    ? allPool 
    : allPool.filter((q) => q.subject === selectedSubject);

  // Available count for selected subject
  const availableQuestionCount = subjectFilteredPool.length;

  // HOST: Create Room
  const handleHostCreateRoom = async () => {
    if (!playerName.trim()) {
      setErrorMessage('Sila masukkan nama anda dahulu.');
      return;
    }
    setIsProcessing(true);
    setErrorMessage(null);
    hasHandledFinishRef.current = false;
    soundEffects.playClick();

    try {
      // Select questions randomly from the chosen subject pool
      const poolToUse = subjectFilteredPool.length > 0 ? subjectFilteredPool : allPool;
      const finalRoundCount = Math.min(roundCount, poolToUse.length);
      const shuffled = [...poolToUse].sort(() => 0.5 - Math.random()).slice(0, finalRoundCount);

      const subjectLabels = {
        all: 'Campuran Subjek',
        tauhid: 'Tauhid (Ilmu Kalam)',
        firaq: 'Firaq (Aliran Pemikiran)',
        mantiq: 'Mantiq (Logik Islam)',
      };

      const generatedTitle = selectedSubject === 'all' 
        ? roomTitle 
        : `${roomTitle} - ${subjectLabels[selectedSubject]}`;

      const res = await createLiveChallengeRoom({
        hostId: playerId,
        hostName: playerName,
        title: generatedTitle,
        subject: selectedSubject,
        questions: shuffled,
        timeLimitSeconds: timeLimit,
        avatar: selectedAvatar,
        hostAvatar: selectedAvatar,
      });

      if (res.success && res.roomCode) {
        setRoomCode(res.roomCode);
        setIsHost(true);
        setViewState('hosting_lobby');
      } else {
        setErrorMessage(res.error || 'Gagal membuka bilik.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ralat semasa menghubungi pelayan bilik.');
    } finally {
      setIsProcessing(false);
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
    hasHandledFinishRef.current = false;
    soundEffects.playClick();

    try {
      const res = await joinLiveChallengeRoom({
        roomCode: cleanCode,
        playerId,
        playerName,
        schoolOrClass: playerSchool,
        avatar: selectedAvatar,
      });

      if (res.success && res.room) {
        setRoomCode(cleanCode);
        setIsHost(false);
        setViewState('player_lobby');
      } else {
        setErrorMessage(res.error || 'Tidak dapat menyertai bilik.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ralat semasa menyertai bilik.');
    } finally {
      setIsProcessing(false);
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Cabaran Live Multi-Device
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Live Real-Time
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Sifar Kuota Firebase (Multi-Hos)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Pertarungan pantas serentak melalui telefon masing-masing. Siapa cepat & betul dapat markah tertinggi!
                </p>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-slate-300 hover:text-white px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 transition-all flex items-center gap-1.5 font-bold cursor-pointer shrink-0 shadow-sm active:scale-95"
                title="Tutup Cabaran Live dan kembali ke Latihan"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
                <span>Tutup</span>
              </button>
            )}
          </div>

          {/* Quick Rules */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-4 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" /> Sistem Pemarkahan Kompetitif (Speed Multiplier):
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li><strong className="text-emerald-300">Asas Jawapan Betul:</strong> 100 mata.</li>
              <li><strong className="text-amber-300">Bonus Kelajuan (+1 hingga +100 mata):</strong> Semakin laju anda menekan jawapan betul, semakin tinggi markah tambahan yang diperolehi.</li>
              <li><strong className="text-indigo-300">Streak Kombo:</strong> Jawapan berturut-turut betul memberi bonus streak sehingga +45 mata.</li>
            </ul>
          </div>

          {/* Render Backend Server Configuration Toggle (0 Kuota Firebase) with Visual Indicator */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className={`p-2.5 rounded-xl border shrink-0 ${
                  serverHealth.status === 'online'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : serverHealth.status === 'waking'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                }`}>
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      Status Pelayan Live (WebSockets)
                    </span>
                    {/* Visual Circle Indicator (Bulatan Kecil Hijau / Merah) */}
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[11px] font-semibold">
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
                      <span className={
                        serverHealth.status === 'online'
                          ? 'text-emerald-300 font-bold'
                          : serverHealth.status === 'waking'
                          ? 'text-amber-300 font-bold'
                          : 'text-rose-400 font-bold'
                      }>
                        {serverHealth.status === 'online'
                          ? 'Pelayan Aktif (0 Kuota Firebase)'
                          : serverHealth.status === 'waking'
                          ? 'Membangunkan Pelayan (Cold Start)...'
                          : 'Pelayan Sedang Tidur / Terputus'}
                      </span>
                    </div>

                    {serverHealth.latencyMs && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        ⚡ {serverHealth.latencyMs}ms
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1">
                    {getLiveServerBaseUrl()
                      ? `URL Pelayan: ${getLiveServerBaseUrl()} (Sifar kuota Firestore)`
                      : 'Tiada URL pelayan disetkan. Menggunakan sandaran Firebase.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleWakeUpServer}
                  disabled={isTestingServer || serverHealth.status === 'waking'}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                    serverHealth.status === 'online'
                      ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500'
                  }`}
                  title="Bangunkan pelayan dari mod tidur (Render Cold Start) atau semak kelajuan ping"
                >
                  <Zap className={`w-3.5 h-3.5 ${isTestingServer ? 'animate-bounce text-amber-300' : 'text-amber-400'}`} />
                  <span>{isTestingServer ? 'Menguji...' : serverHealth.status === 'online' ? 'Semak Ping (ms)' : 'Bangunkan Pelayan'}</span>
                </button>
              </div>
            </div>

            {/* Quick status tip when server is not online */}
            {serverHealth.status !== 'online' && (
              <div className="mt-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Tip Render.com:</strong> Pelayan percuma tidur automatik jika tiada aktiviti selama 15 minit. Tekan butang hijau <strong>&quot;Bangunkan Pelayan&quot;</strong> di atas sebelum membuka bilik untuk mengelakkan sesi tergantung (~30 saat).
                </span>
              </div>
            )}
          </div>

          {/* Player Info Box with Cartoon Avatar Selector */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider block">
                Profil & Avatar Anda:
              </span>
              <span className="text-[10px] text-indigo-400 font-medium">
                Pilih avatar kartun kegemaran anda
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Avatar Selector Button */}
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900/60 border-2 border-indigo-500/50 hover:border-indigo-400 active:scale-95 transition-all flex items-center justify-center text-3xl shadow-lg relative group cursor-pointer"
                  title="Klik untuk tukar avatar kartun"
                >
                  <span>{selectedAvatar}</span>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white border border-slate-900">
                    ✏️
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="text-[10px] text-indigo-300 hover:text-indigo-200 underline font-semibold"
                >
                  {showAvatarPicker ? 'Tutup Pilihan' : 'Tukar Avatar'}
                </button>
              </div>

              {/* Name and School Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
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

            {/* Cartoon Avatar Picker Modal / Drawer */}
            {showAvatarPicker && (
              <div className="p-3.5 bg-slate-900 border border-indigo-500/40 rounded-2xl space-y-3 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Pilih Kategori Avatar Kartun:
                  </span>
                  {/* Category Tabs: Manusia, Haiwan, Raksasa */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                    {AVATAR_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveAvatarTab(cat.id as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          activeAvatarTab === cat.id
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid of Avatars for selected category */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-1">
                  {AVATAR_CATEGORIES.find((c) => c.id === activeAvatarTab)?.avatars.map((av) => {
                    const isSelected = selectedAvatar === av.emoji;
                    return (
                      <button
                        key={av.emoji}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(av.emoji);
                          soundEffects.playClick();
                          try {
                            localStorage.setItem('stam_student_live_avatar', av.emoji);
                          } catch (e) {}
                        }}
                        className={`p-2 rounded-xl flex flex-col items-center gap-1 border transition-all active:scale-90 ${
                          isSelected
                            ? 'bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-400 text-white scale-105 shadow-md'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <span className="text-2xl sm:text-3xl leading-none">{av.emoji}</span>
                        <span className="text-[9px] text-slate-400 font-medium truncate max-w-full text-center">
                          {av.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
                  className={`w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${
                    isProcessing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sedang Menyertai...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Masuk Bilik Sekarang</span>
                    </>
                  )}
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
                  Pilih fokus subjek, masa dan bilangan soalan. Paparkan kod kepada murid di smartboard.
                </p>
              </div>

              <div className="space-y-3">
                {/* 1. Subject Focus Selection (Tauhid, Firaq, Mantiq, Campuran) */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    🎯 Fokus Bahagian / Subjek:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedSubject('all')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        selectedSubject === 'all'
                          ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      🌟 Campuran
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubject('tauhid')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        selectedSubject === 'tauhid'
                          ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      📖 Tauhid
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubject('firaq')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        selectedSubject === 'firaq'
                          ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      ⚖️ Firaq
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubject('mantiq')}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        selectedSubject === 'mantiq'
                          ? 'bg-emerald-600 border-emerald-400 text-white font-bold shadow'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      🧠 Mantiq
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Bilangan Soalan (Maks: {availableQuestionCount}):
                    </label>
                    <select
                      value={roundCount}
                      onChange={(e) => setRoundCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-slate-200 font-semibold"
                    >
                      <option value={5}>5 Soalan</option>
                      <option value={8}>8 Soalan</option>
                      <option value={10}>10 Soalan</option>
                      <option value={15}>15 Soalan</option>
                      <option value={20}>20 Soalan</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Masa Menjawab (Sehingga 1 Minit):
                    </label>
                    <select
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-slate-200 font-semibold"
                    >
                      <option value={15}>15 Saat (Pantas Kilat)</option>
                      <option value={20}>20 Saat (Cepat)</option>
                      <option value={25}>25 Saat (Standard)</option>
                      <option value={30}>30 Saat (Selesa)</option>
                      <option value={45}>45 Saat (Panjang)</option>
                      <option value={60}>60 Saat (1 Minit Penuh)</option>
                    </select>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-rose-300 text-xs leading-relaxed space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      ⚠️ Makluman Sambungan Bilik:
                    </div>
                    <div>{errorMessage}</div>
                  </div>
                )}

                {isProcessing && (
                  <div className="p-3 bg-amber-950/70 border border-amber-500/50 rounded-xl text-amber-200 text-xs flex items-start gap-2 animate-pulse">
                    <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
                    <div className="space-y-0.5">
                      <span className="font-bold block">Menghubungi Pelayan Live...</span>
                      <p className="text-[11px] text-slate-300">
                        Sekiranya pelayan Render baru bangun dari tidur (Cold Start), ia mengambil masa ~30-45 saat untuk permulaan pertama. Sila tunggu seketika tanpa perlu menekan berulang kali.
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleHostCreateRoom}
                  disabled={isProcessing}
                  className={`w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all ${
                    isProcessing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sedang Membuka Bilik (Sila Tunggu)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Buka Bilik Live</span>
                    </>
                  )}
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
          {/* Top Utility Bar with Reconnect Button & Visual Dot */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                {isHost ? '👑 Anda adalah Hos Bilik' : '🎮 Anda Sedang Menunggu di Lobi'}
              </span>
              {/* Visual dot indicator */}
              <div 
                className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px]"
                title={`Status Pelayan: ${serverHealth.status}`}
              >
                <span
                  className={`inline-block rounded-full h-2 w-2 ${
                    serverHealth.status === 'online'
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                      : serverHealth.status === 'waking'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
                <span className="text-slate-400 font-mono hidden sm:inline">
                  {serverHealth.status === 'online' ? 'Online' : serverHealth.status === 'waking' ? 'Bangun...' : 'Offline'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleForceReconnect}
              disabled={isReconnecting}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 hover:text-white rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all flex items-center gap-1.5 text-xs font-bold shadow-sm cursor-pointer"
              title="Sambung Semula & Segarkan Bilik Jika Terputus atau Tersangkut"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
              <span>{isReconnecting ? 'Menyambung Semula...' : 'Refresh / Sambung Semula'}</span>
            </button>
          </div>

          {reconnectToast && (
            <div className="p-2.5 bg-indigo-950/90 border border-indigo-500/50 rounded-xl text-center text-xs text-indigo-200 mb-4 shadow-lg">
              {reconnectToast}
            </div>
          )}

          {/* Header Pin Display */}
          <div className="text-center space-y-2 mb-6">
            <h2 className="text-2xl font-black text-white">{currentRoom?.title || 'Bilik Cabaran STAM'}</h2>
            
            {currentRoom?.subject && (
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                Fokus: {currentRoom.subject.toUpperCase()} • {currentRoom.timeLimitSeconds}s / Soalan
              </span>
            )}

            <p className="text-xs text-slate-400 mt-2">
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
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-base shrink-0">
                        {p.avatar || (p.isHost ? '👑' : '🧑‍🎓')}
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
              onClick={handleExitToMenu}
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

  // Calculate scores before this question vs after to find exact rank delta
  const playersWithStats = players.map((p) => {
    const roundAnswer = currentAnswers.find((a) => a.playerId === p.id);
    const roundPoints = roundAnswer?.scoreEarned || 0;
    const prevScore = Math.max(0, p.score - roundPoints);
    return {
      ...p,
      roundPoints,
      prevScore,
      isCorrectThisRound: roundAnswer?.isCorrect ?? false,
      roundSpeed: roundAnswer?.timeTakenSeconds,
      selectedOptionThisRound: roundAnswer?.selectedOption,
    };
  });

  // Calculate previous rank (before current question points)
  const prevRankSorted = [...playersWithStats].sort((a, b) => b.prevScore - a.prevScore);
  // Calculate current rank (after current question points)
  const sortedPlayers = [...playersWithStats].sort((a, b) => b.score - a.score);

  const playersWithDelta = sortedPlayers.map((p, idx) => {
    const currentRank = idx + 1;
    const prevIdx = prevRankSorted.findIndex((x) => x.id === p.id);
    const prevRank = prevIdx >= 0 ? prevIdx + 1 : currentRank;
    const rankDelta = prevRank - currentRank; // > 0 means climbed up (e.g. was 4th, now 2nd -> +2)
    return {
      ...p,
      currentRank,
      prevRank,
      rankDelta,
    };
  });

  // Find highest climber this round (if climbed at least 1 spot)
  const highestClimber = [...playersWithDelta]
    .filter((p) => p.rankDelta > 0)
    .sort((a, b) => b.rankDelta - a.rankDelta)[0];

  const myPlayerRecord = playersWithDelta.find((p) => p.id === playerId);
  const highestScore = sortedPlayers[0]?.score || 1;

  // If Finished Screen
  if (isGameFinished) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6 pb-28">
        <div className="bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-6">
          {/* Finished View Utility Bar with Refresh / Sambung Semula */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              🏆 Keputusan Akhir
            </span>
            <button
              type="button"
              onClick={handleForceReconnect}
              disabled={isReconnecting}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm"
              title="Segarkan data bilik jika ada markah tertangguh"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
              <span>{isReconnecting ? 'Menyambung...' : 'Refresh / Sambung Semula'}</span>
            </button>
          </div>

          {reconnectToast && (
            <div className="p-2.5 bg-indigo-950/90 border border-indigo-500/50 rounded-xl text-center text-xs text-indigo-200 shadow-lg">
              {reconnectToast}
            </div>
          )}

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
                <span className="text-3xl block">{sortedPlayers[1].avatar || '🥈'}</span>
                <span className="text-xs">🥈</span>
                <p className="text-xs font-bold text-white truncate">{sortedPlayers[1].name}</p>
                <p className="text-xs text-indigo-400 font-mono font-bold">{sortedPlayers[1].score} XP</p>
                <span className="inline-block text-[9px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">#2</span>
              </div>
            )}

            {/* Rank 1 (Champion) */}
            {sortedPlayers[0] && (
              <div className="bg-gradient-to-b from-amber-950/80 to-slate-900 border-2 border-amber-500/60 rounded-2xl p-4 text-center space-y-1 shadow-xl transform -translate-y-2">
                <Crown className="w-6 h-6 text-amber-400 mx-auto" />
                <span className="text-4xl block my-0.5">{sortedPlayers[0].avatar || '🥇'}</span>
                <span className="text-xs">🥇</span>
                <p className="text-sm font-black text-white truncate">{sortedPlayers[0].name}</p>
                <p className="text-sm text-amber-400 font-mono font-black">{sortedPlayers[0].score} XP</p>
                <span className="inline-block text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">JUARA</span>
              </div>
            )}

            {/* Rank 3 */}
            {sortedPlayers[2] && (
              <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-3 text-center space-y-1">
                <span className="text-3xl block">{sortedPlayers[2].avatar || '🥉'}</span>
                <span className="text-xs">🥉</span>
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
                    <span className="text-base">{p.avatar || '🧑‍🎓'}</span>
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
              onClick={handleRestartNewRound}
              className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-xl transition-all"
            >
              Main Pusingan Baharu
            </button>
            <button
              onClick={handleExitToMenu}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors text-xs"
            >
              Tutup & Tamatkan
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
          <div className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono hidden sm:block">
            👥 {currentAnswers.length} / {players.length} Menjawab
          </div>

          {/* Reconnect / Refresh button */}
          <button
            type="button"
            onClick={handleForceReconnect}
            disabled={isReconnecting}
            className="p-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-100 hover:text-white rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer shadow-sm"
            title="Sambung Semula & Segarkan Bilik Jika Terputus atau Tersangkut"
          >
            <span
              className={`inline-block rounded-full h-2 w-2 shrink-0 ${
                serverHealth.status === 'online'
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                  : serverHealth.status === 'waking'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <RotateCcw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin text-amber-400' : 'text-emerald-400'}`} />
            <span>{isReconnecting ? 'Menyambung...' : 'Refresh / Sambung Semula'}</span>
          </button>
        </div>
      </div>

      {reconnectToast && (
        <div className="p-2.5 bg-indigo-950/90 border border-indigo-500/50 rounded-xl text-center text-xs text-indigo-200 shadow-lg">
          {reconnectToast}
        </div>
      )}

      {/* Speed & Streak Banner for Current Player */}
      {myPlayerRecord && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-base shrink-0">{myPlayerRecord.avatar || selectedAvatar}</span>
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

      {/* 1. SOALAN AKTIF: Ditunjukkan semasa murid sedang menjawab */}
      {!isQuestionResult && (
        <>
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
                reviewMode={false}
                isAnswerSubmitted={hasSubmittedAnswer}
                correctAnswer={currentQ.correctAnswer}
              />
            )}

            {/* Group challenge strictly in Arabic (no Malay translation for questions/options) */}
            <FormattedQuestionStem
              questionArabic={currentQ.questionArabic}
              questionMalay=""
              showArabic={true}
              showMalay={false}
              fontSizeClass="text-lg sm:text-xl"
            />
          </div>

          {/* Options Grid (Arabic only for Group Challenge) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {currentQ.options.map((opt) => {
              const isSelected = selectedOption === opt.id;
              let btnColor = 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200';
              if (hasSubmittedAnswer) {
                if (isSelected) btnColor = 'bg-indigo-950 border-indigo-500 text-indigo-200 ring-2 ring-indigo-500/50';
                else btnColor = 'bg-slate-900/40 border-slate-800/40 text-slate-600 opacity-50';
              }

              return (
                <button
                  key={opt.id}
                  onClick={() => handleAnswerSubmit(opt.id)}
                  disabled={hasSubmittedAnswer}
                  className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all active:scale-[0.98] ${btnColor}`}
                >
                  <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                    {opt.id.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-arabic text-lg font-bold text-right dir-rtl leading-relaxed" dir="rtl">
                      {opt.textArabic}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Answer Submitted Feedback Notice for Player */}
          {hasSubmittedAnswer && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-center space-y-1 animate-fade-in">
              <p className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Jawapan anda telah dihantar!
              </p>
              <p className="text-[11px] text-slate-400">
                Masa direkodkan. Markah kelajuan dan perubahan kedudukan akan dikira sebaik sahaja pemasa tamat atau guru mengunci jawapan.
              </p>
            </div>
          )}
        </>
      )}

      {/* 2. KEPUTUSAN PUSINGAN & PERUBAHAN KEDUDUKAN (Dipaparkan DAHULU kepada murid) */}
      {isQuestionResult && (
        <div className="space-y-4 animate-fade-in">
          {/* Header Banner Keputusan & Perubahan Kedudukan */}
          <div className="bg-gradient-to-r from-amber-500/20 via-indigo-950/80 to-emerald-500/20 border border-amber-500/40 rounded-2xl p-3 text-center shadow-lg">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
              KEPUTUSAN PUSINGAN & PERUBAHAN KEDUDUKAN
            </span>
          </div>

          {/* 1. Student Personal Feedback Card */}
          {myPlayerRecord && (
            <div className={`p-4 rounded-3xl border shadow-xl relative overflow-hidden transition-all duration-500 ${
              rankAnimStage === 'initial'
                ? 'bg-slate-900 border-indigo-500/30'
                : myPlayerRecord.rankDelta > 0
                ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/90 border-emerald-500/50 shadow-emerald-950/50'
                : myPlayerRecord.rankDelta < 0
                ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/60 border-slate-700'
                : 'bg-gradient-to-r from-slate-900 to-indigo-950/80 border-indigo-500/30'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border shadow-inner transition-all duration-500 ${
                    rankAnimStage === 'initial'
                      ? 'bg-slate-800 border-slate-700 text-indigo-300'
                      : myPlayerRecord.rankDelta > 0
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                      : myPlayerRecord.rankDelta < 0
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                  }`}>
                    {rankAnimStage === 'initial' ? (
                      <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
                    ) : myPlayerRecord.rankDelta > 0 ? (
                      <TrendingUp className="w-6 h-6 animate-bounce" />
                    ) : myPlayerRecord.rankDelta < 0 ? (
                      <TrendingDown className="w-6 h-6" />
                    ) : (
                      <Minus className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl shrink-0">{myPlayerRecord.avatar || selectedAvatar}</span>
                      <span className="text-sm font-black text-white">
                        Kedudukan #{rankAnimStage === 'initial' ? myPlayerRecord.prevRank : myPlayerRecord.currentRank}
                      </span>
                      {/* Rank Delta Pill */}
                      {rankAnimStage === 'initial' ? (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold animate-pulse">
                          Mengira Kedudukan...
                        </span>
                      ) : myPlayerRecord.rankDelta > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-black flex items-center gap-0.5 animate-pulse">
                          ▲ +{myPlayerRecord.rankDelta} Tangga!
                        </span>
                      ) : myPlayerRecord.rankDelta < 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-0.5">
                          ▼ {Math.abs(myPlayerRecord.rankDelta)} Tangga
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px] font-bold">
                          Kekal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {rankAnimStage === 'initial'
                        ? 'Menyemak kelajuan dan ketepatan jawapan pusingan ini...'
                        : myPlayerRecord.rankDelta > 0
                        ? `Syabas! Anda melonjak naik dengan kutipan pantas!`
                        : myPlayerRecord.rankDelta < 0
                        ? `Rakan lain memotong laju. Soalan seterusnya ada peluang pintas kembali!`
                        : `Kedudukan anda stabil. Teruskan momentum!`}
                    </p>
                  </div>
                </div>

                {/* Points earned this question badge */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-emerald-400 font-mono">
                    +{myPlayerRecord.roundPoints} XP
                  </div>
                  {myPlayerRecord.roundSpeed && (
                    <div className="text-[10px] text-slate-400 font-mono">
                      ⚡ {myPlayerRecord.roundSpeed}s
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. Highest Climber Spotlight (if someone jumped up) */}
          {rankAnimStage !== 'initial' && highestClimber && highestClimber.rankDelta > 0 && (
            <div className="p-3 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 text-xs animate-fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
                  <Flame className="w-4 h-4 fill-current animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                    Pelompat Tertinggi Pusingan Ini:
                  </span>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <span className="text-base shrink-0">{highestClimber.avatar || '🚀'}</span>
                    <span>
                      <span className="text-amber-300">{highestClimber.name}</span> melonjak{' '}
                      <span className="text-emerald-400 font-black">+{highestClimber.rankDelta}</span> anak tangga ke Tempat Ke-#{highestClimber.currentRank}!
                    </span>
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-2.5 py-1 bg-amber-500/20 rounded-lg border border-amber-500/30">
                +{highestClimber.roundPoints} XP
              </span>
            </div>
          )}

          {/* 3. Live Leaderboard with Animated Ranking Shifts */}
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">
                  Papan Kedudukan Langsung ({players.length} Peserta)
                </h3>
              </div>
              {rankAnimStage === 'initial' ? (
                <span className="text-[11px] text-indigo-300 font-mono animate-pulse flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" /> Mengira Markah Pusingan...
                </span>
              ) : (
                <span className="text-[11px] text-emerald-400 font-mono">
                  🎯 {correctAnswersCount}/{currentAnswers.length} Betul
                </span>
              )}
            </div>

            {/* List of Players with Animated Delta Shifts */}
            <div className="space-y-2 relative overflow-hidden p-1">
              {(showAllLeaderboard ? playersWithDelta : playersWithDelta.slice(0, 5)).map((p, idx) => {
                const isMe = p.id === playerId;
                const isInitial = rankAnimStage === 'initial';
                const percentage = Math.max(8, Math.round((p.score / (highestScore || 1)) * 100));

                // Calculate vertical slide offset for smooth glide
                // If isInitial, position card at its previous rank position
                // When transitioning to revealed, translateY smoothly goes to 0px
                const ROW_HEIGHT = 64;
                const slotDelta = p.prevRank - p.currentRank;
                const clampedDelta = Math.max(-5, Math.min(5, slotDelta));
                const translateY = isInitial ? clampedDelta * ROW_HEIGHT : 0;
                const displayRank = isInitial ? p.prevRank : p.currentRank;
                const displayScore = isInitial ? p.prevScore : p.score;

                return (
                  <div
                    key={p.id}
                    style={{
                      transform: `translateY(${translateY}px)`,
                      transition: isInitial ? 'none' : 'transform 850ms cubic-bezier(0.2, 0.9, 0.3, 1.2), box-shadow 500ms ease, border-color 500ms ease',
                      zIndex: isInitial ? (10 - Math.min(9, p.prevRank)) : (p.rankDelta > 0 ? 10 : 2),
                    }}
                    className={`relative p-3 rounded-2xl border ${
                      isMe
                        ? 'bg-indigo-950/70 border-indigo-500/60 ring-1 ring-indigo-500/40 shadow-lg'
                        : !isInitial && p.rankDelta > 0
                        ? 'bg-slate-900 border-emerald-500/40 shadow-emerald-950/30'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Background Progress Fill based on relative score */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-2xl bg-indigo-500/5 transition-all duration-700 pointer-events-none"
                      style={{ width: `${percentage}%` }}
                    />

                    <div className="relative flex items-center justify-between gap-3">
                      {/* Left: Position & Delta */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <div className={`w-8 h-8 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 border transition-all duration-500 ${
                          displayRank === 1
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md'
                            : displayRank === 2
                            ? 'bg-slate-400/20 border-slate-400/50 text-slate-200'
                            : displayRank === 3
                            ? 'bg-amber-700/20 border-amber-700/50 text-amber-400'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400'
                        }`}>
                          {displayRank === 1 ? '🥇' : displayRank === 2 ? '🥈' : displayRank === 3 ? '🥉' : `#${displayRank}`}
                        </div>

                        {/* Rank Shift Indicator */}
                        <div className="w-14 shrink-0 text-center">
                          {isInitial ? (
                            <span className="inline-flex items-center text-[10px] text-slate-500 font-mono animate-pulse bg-slate-900/80 px-1.5 py-0.5 rounded-md">
                              -
                            </span>
                          ) : p.rankDelta > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md animate-bounce shadow-sm">
                              ▲ +{p.rankDelta}
                            </span>
                          ) : p.rankDelta < 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 rounded-md">
                              ▼ {Math.abs(p.rankDelta)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded-md">
                              Kekal
                            </span>
                          )}
                        </div>

                        {/* Name and School */}
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate flex items-center gap-1.5 ${isMe ? 'text-indigo-200' : 'text-slate-200'}`}>
                            <span className="text-base shrink-0">{p.avatar || '🧑‍🎓'}</span>
                            <span className="truncate">{p.name}</span> {isMe && <span className="text-[10px] text-indigo-400 font-normal shrink-0">(Anda)</span>}
                            {p.streak > 1 && (
                              <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-0.5">
                                <Flame className="w-3 h-3 fill-current" /> {p.streak}
                              </span>
                            )}
                          </p>
                          {p.schoolOrClass && (
                            <p className="text-[10px] text-slate-400 truncate">{p.schoolOrClass}</p>
                          )}
                        </div>
                      </div>

                      {/* Right: Round points & Total XP */}
                      <div className="text-right shrink-0 flex items-center gap-2.5">
                        {!isInitial && p.roundPoints > 0 && (
                          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/30 animate-pulse">
                            +{p.roundPoints}
                          </span>
                        )}
                        <span className="text-xs font-mono font-black text-white min-w-[60px] text-right">
                          {displayScore} <span className="text-[10px] text-slate-400 font-normal">XP</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expand / Collapse Leaderboard if more than 5 players */}
            {playersWithDelta.length > 5 && (
              <button
                onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
                className="w-full py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-indigo-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                {showAllLeaderboard ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" /> Ringkaskan Papan Kedudukan
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" /> Tunjukkan Semua ({playersWithDelta.length} Peserta)
                  </>
                )}
              </button>
            )}

            {/* Current Question Top Answerers by Speed */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 pt-2.5">
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

          {/* 4. SEMAKAN SOALAN, JAWAPAN & HURAIAN (DI BAWAH KEPUTUSAN) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  Semakan Jawapan & Huraian Soalan
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono">
                Jawapan Betul: ({currentQ.correctAnswer.toUpperCase()})
              </span>
            </div>

            {/* Subject and Topic tag */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 border-b border-slate-800/60 pb-1.5">
              <span className="font-bold uppercase text-emerald-400">{currentQ.subject}</span>
              <span className="font-arabic">{currentQ.topicTitleArabic}</span>
            </div>

            {/* Diagram */}
            {currentQ.diagramArabic && (
              <QuestionDiagramRenderer
                diagramArabic={currentQ.diagramArabic}
                diagramType={currentQ.diagramType}
                reviewMode={true}
                isAnswerSubmitted={true}
                correctAnswer={currentQ.correctAnswer}
              />
            )}

            {/* Question Stem */}
            <FormattedQuestionStem
              questionArabic={currentQ.questionArabic}
              questionMalay=""
              showArabic={true}
              showMalay={false}
              fontSizeClass="text-lg sm:text-xl"
            />

            {/* Options Review Grid (Showing Green for Correct, Red for Wrong Selected) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {currentQ.options.map((opt) => {
                const isSelected = selectedOption === opt.id;
                const isCorrect = opt.id === currentQ.correctAnswer;

                let btnColor = 'bg-slate-950/40 border-slate-800/40 text-slate-500 opacity-60';
                if (isCorrect) {
                  btnColor = 'bg-emerald-950/90 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/50 shadow-emerald-950/50';
                } else if (isSelected && !isCorrect) {
                  btnColor = 'bg-rose-950/90 border-rose-500 text-rose-200 ring-1 ring-rose-500/50';
                }

                return (
                  <div
                    key={opt.id}
                    className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${btnColor}`}
                  >
                    <span className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 border ${
                      isCorrect 
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black' 
                        : isSelected 
                        ? 'bg-rose-500 text-white border-rose-400' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      {opt.id.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-arabic text-lg font-bold text-right dir-rtl leading-relaxed" dir="rtl">
                        {opt.textArabic}
                      </p>
                    </div>
                    {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                    {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Dalil & Explanation */}
            {currentQ.explanationArabic && (
              <div className="pt-3 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Huraian Dalil & Jawapan:</span>
                </div>
                <div className="font-arabic text-sm text-slate-100 text-right dir-rtl bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 leading-relaxed" dir="rtl">
                  {currentQ.explanationArabic}
                </div>
              </div>
            )}
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

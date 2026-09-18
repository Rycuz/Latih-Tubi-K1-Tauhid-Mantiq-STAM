import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Unlock, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Upload, 
  RotateCcw, 
  Eye, 
  KeyRound, 
  HelpCircle, 
  BookOpen, 
  Table, 
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
  Users,
  Layers
} from 'lucide-react';
import { Question, SubjectId, TopicInfo, Difficulty, StudentRecord } from '../types';
import { TOPICS_DATA } from '../data/questions';
import { soundEffects } from '../utils/audio';
import { cleanRepeatedText, sanitizeQuestion } from '../utils/sanitizeText';
import { FormattedQuestionStem } from './FormattedQuestionStem';
import { QuestionDiagramRenderer } from './QuestionDiagramRenderer';
import { TeacherDashboard } from './TeacherDashboard';
import { TeacherTopicManager } from './TeacherTopicManager';
import { CloudQuizSubmission } from '../lib/firebase';

const STORAGE_KEY_TEACHER_PIN = 'stam_teacher_pin_v1';
const DEFAULT_PIN = 'stam2025';

interface TeacherQuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  students: StudentRecord[];
  cloudSubmissions?: CloudQuizSubmission[];
  topics: TopicInfo[];
  onSaveQuestions: (updatedQuestions: Question[]) => void;
  onResetToDefault: () => void;
  onAddStudent?: (newStudent: StudentRecord) => void;
  onClearDemoStudents?: () => void;
  onSaveTopics: (updatedTopics: TopicInfo[]) => void;
  onResetTopicsToDefault: () => void;
  onUpdateTopicTitleInQuestions?: (topicId: string, newTitleMalay: string, newTitleArabic: string) => void;
}

export const TeacherQuestionManagerModal: React.FC<TeacherQuestionManagerModalProps> = ({
  isOpen,
  onClose,
  questions,
  students,
  cloudSubmissions,
  topics,
  onSaveQuestions,
  onResetToDefault,
  onAddStudent,
  onClearDemoStudents,
  onSaveTopics,
  onResetTopicsToDefault,
  onUpdateTopicTitleInQuestions,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSuccessMessage, setPinSuccessMessage] = useState('');

  // Manager Tabs: default to 'dashboard' to instantly see students and performance
  const [activeTab, setActiveTab] = useState<'dashboard' | 'topics' | 'list' | 'add' | 'settings'>('dashboard');

  // Filter & Search
  const [filterSubject, setFilterSubject] = useState<SubjectId | 'all'>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing State
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formSubject, setFormSubject] = useState<SubjectId>('tauhid');
  const [formTopicId, setFormTopicId] = useState<string>('tauhid-01-sam-iyyat');
  const [formLearningStandard, setFormLearningStandard] = useState('');
  const [formQuestionArabic, setFormQuestionArabic] = useState('');
  const [formQuestionMalay, setFormQuestionMalay] = useState('');
  const [formDiagramType, setFormDiagramType] = useState<'none' | 'tree' | 'table' | 'box'>('none');
  const [formDiagramArabic, setFormDiagramArabic] = useState('');
  const [formOptAArabic, setFormOptAArabic] = useState('');
  const [formOptAMalay, setFormOptAMalay] = useState('');
  const [formOptBArabic, setFormOptBArabic] = useState('');
  const [formOptBMalay, setFormOptBMalay] = useState('');
  const [formOptCArabic, setFormOptCArabic] = useState('');
  const [formOptCMalay, setFormOptCMalay] = useState('');
  const [formOptDArabic, setFormOptDArabic] = useState('');
  const [formOptDMalay, setFormOptDMalay] = useState('');
  const [formCorrectAnswer, setFormCorrectAnswer] = useState<'a' | 'b' | 'c' | 'd'>('b');
  const [formExplanationArabic, setFormExplanationArabic] = useState('');
  const [formExplanationMalay, setFormExplanationMalay] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('sederhana');

  // Get current active PIN from storage or default
  const getCurrentPin = (): string => {
    try {
      return localStorage.getItem(STORAGE_KEY_TEACHER_PIN) || DEFAULT_PIN;
    } catch {
      return DEFAULT_PIN;
    }
  };

  const handleVerifyPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const correctPin = getCurrentPin();
    if (enteredPin.trim() === correctPin) {
      soundEffects.playCorrect();
      setIsAuthenticated(true);
      setPinError('');
      setEnteredPin('');
    } else {
      soundEffects.playWrong();
      setPinError('Kod PIN tidak tepat. Sila cuba lagi.');
    }
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4) {
      alert('Sila masukkan PIN sekurang-kurangnya 4 aksara.');
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY_TEACHER_PIN, newPin.trim());
      soundEffects.playCorrect();
      setPinSuccessMessage('Kod PIN keselamatan guru berjaya ditukar!');
      setNewPin('');
      setIsChangingPin(false);
      setTimeout(() => setPinSuccessMessage(''), 4000);
    } catch {
      alert('Ralat menyimpan PIN.');
    }
  };

  const handleLockSession = () => {
    soundEffects.playClick();
    setIsAuthenticated(false);
    setEnteredPin('');
    setPinError('');
    onClose();
  };

  // Populate form when editing an existing question
  const startEditQuestion = (q: Question) => {
    soundEffects.playClick();
    setEditingQuestion(q);
    setFormSubject(q.subject);
    setFormTopicId(q.topicId);
    setFormLearningStandard(q.learningStandard || '');
    setFormQuestionArabic(q.questionArabic || '');
    setFormQuestionMalay(q.questionMalay || '');
    setFormDiagramType(q.diagramType === 'table' ? 'table' : q.diagramType === 'tree' ? 'tree' : q.diagramType === 'box' ? 'box' : 'none');
    setFormDiagramArabic(q.diagramArabic || '');
    
    const optA = q.options.find((o) => o.id === 'a');
    const optB = q.options.find((o) => o.id === 'b');
    const optC = q.options.find((o) => o.id === 'c');
    const optD = q.options.find((o) => o.id === 'd');

    setFormOptAArabic(optA?.textArabic || '');
    setFormOptAMalay(optA?.textMalay || '');
    setFormOptBArabic(optB?.textArabic || '');
    setFormOptBMalay(optB?.textMalay || '');
    setFormOptCArabic(optC?.textArabic || '');
    setFormOptCMalay(optC?.textMalay || '');
    setFormOptDArabic(optD?.textArabic || '');
    setFormOptDMalay(optD?.textMalay || '');

    setFormCorrectAnswer(q.correctAnswer);
    setFormExplanationArabic(q.explanationArabic || '');
    setFormExplanationMalay(q.explanationMalay || '');
    setFormDifficulty(q.difficulty || 'sederhana');

    setActiveTab('add'); // Switch to editor form
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setFormSubject('tauhid');
    setFormTopicId('tauhid-01-sam-iyyat');
    setFormLearningStandard('');
    setFormQuestionArabic('');
    setFormQuestionMalay('');
    setFormDiagramType('none');
    setFormDiagramArabic('');
    setFormOptAArabic('');
    setFormOptAMalay('');
    setFormOptBArabic('');
    setFormOptBMalay('');
    setFormOptCArabic('');
    setFormOptCMalay('');
    setFormOptDArabic('');
    setFormOptDMalay('');
    setFormCorrectAnswer('b');
    setFormExplanationArabic('');
    setFormExplanationMalay('');
    setFormDifficulty('sederhana');
  };

  const handleSaveQuestionForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formQuestionArabic.trim()) {
      alert('Sila masukkan teks soalan bahasa Arab.');
      return;
    }

    if (!formOptAArabic.trim() || !formOptBArabic.trim()) {
      alert('Sila lengkapkan sekurang-kurangnya pilihan jawapan (أ) dan (ب).');
      return;
    }

    const topicObj = topics.find((t) => t.id === formTopicId) || TOPICS_DATA.find((t) => t.id === formTopicId);
    const topicTitleArabic = topicObj ? topicObj.titleArabic : 'عام';
    const topicTitleMalay = topicObj ? topicObj.titleMalay : 'Umum';

    const questionPayload: Question = {
      id: editingQuestion ? editingQuestion.id : `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      subject: formSubject,
      topicId: formTopicId,
      topicTitleArabic,
      topicTitleMalay,
      learningStandard: formLearningStandard.trim() || undefined,
      questionArabic: cleanRepeatedText(formQuestionArabic.trim()),
      questionMalay: cleanRepeatedText(formQuestionMalay.trim()) || 'Sila pilih jawapan yang paling tepat berdasarkan teks di atas.',
      diagramType: formDiagramType !== 'none' ? formDiagramType : undefined,
      diagramArabic: formDiagramType !== 'none' && formDiagramArabic.trim() ? cleanRepeatedText(formDiagramArabic.trim()) : undefined,
      options: [
        { id: 'a', textArabic: formOptAArabic.trim(), textMalay: formOptAMalay.trim() },
        { id: 'b', textArabic: formOptBArabic.trim(), textMalay: formOptBMalay.trim() },
        { id: 'c', textArabic: formOptCArabic.trim(), textMalay: formOptCMalay.trim() },
        { id: 'd', textArabic: formOptDArabic.trim(), textMalay: formOptDMalay.trim() },
      ],
      correctAnswer: formCorrectAnswer,
      explanationArabic: formExplanationArabic.trim(),
      explanationMalay: formExplanationMalay.trim(),
      difficulty: formDifficulty,
    };

    let updatedList: Question[];
    if (editingQuestion) {
      // Update existing
      updatedList = questions.map((q) => (q.id === editingQuestion.id ? questionPayload : q));
      setSuccessNotice('Soalan berjaya dikemaskini!');
    } else {
      // Insert new question at beginning or end
      updatedList = [questionPayload, ...questions];
      setSuccessNotice('Soalan baharu berjaya ditambah ke dalam sistem!');
    }

    soundEffects.playCorrect();
    onSaveQuestions(updatedList);
    resetForm();
    setActiveTab('list');

    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const handleDeleteQuestion = (qId: string) => {
    soundEffects.playClick();
    const updated = questions.filter((q) => q.id !== qId);
    onSaveQuestions(updated);
    setDeleteConfirmId(null);
    setSuccessNotice('Soalan telah berjaya dipadam.');
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleExportJson = () => {
    soundEffects.playClick();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `soalan_stam_k1_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].questionArabic) {
          const sanitizedQuestions = parsed.map(sanitizeQuestion);
          onSaveQuestions(sanitizedQuestions);
          soundEffects.playFanfare();
          alert(`Berjaya memuat naik ${sanitizedQuestions.length} soalan daripada fail JSON!`);
        } else {
          alert('Format fail JSON tidak sah atau tidak mematuhi struktur soalan.');
        }
      } catch {
        alert('Ralat semasa membaca fail JSON. Sila pastikan format sah.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered list for management view
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSub = filterSubject === 'all' || q.subject === filterSubject;
      const matchTopic = filterTopic === 'all' || q.topicId === filterTopic;
      const matchSearch =
        searchQuery === '' ||
        q.questionArabic.includes(searchQuery) ||
        q.questionMalay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.options.some((o) => o.textArabic.includes(searchQuery) || o.textMalay.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSub && matchTopic && matchSearch;
    });
  }, [questions, filterSubject, filterTopic, searchQuery]);

  // Topics for selected form subject
  const availableTopicsForSubject = useMemo(() => {
    return topics.filter((t) => t.subject === formSubject);
  }, [topics, formSubject]);

  if (!isOpen) return null;

  // 1. PIN GATE (Pelajar tidak boleh masuk tanpa PIN)
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 mb-4">
            <Lock className="w-7 h-7" />
          </div>

          <h2 className="text-lg font-bold text-white text-center mb-1">
            Akses Pengurusan Guru & Pentadbir
          </h2>
          <p className="text-xs text-slate-400 text-center mb-5 leading-relaxed">
            Mod ini dilindungi khas. Sila masukkan Kod PIN Keselamatan Guru untuk menambah, menyunting, atau memadam soalan.
          </p>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Kod PIN Keselamatan:
              </label>
              <input
                type="password"
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError('');
                }}
                placeholder="Masukkan PIN (Lalai: stam2025)"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-center tracking-widest text-base focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              {pinError && (
                <div className="flex items-center gap-1.5 text-rose-400 text-xs mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            <div className="bg-slate-800/60 rounded-xl p-2.5 border border-slate-700/60 text-[11px] text-slate-400 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Pelajar tidak mengetahui PIN ini. Kod lalai ialah <code className="text-emerald-300 font-mono">stam2025</code> dan anda boleh menukarnya di dalam menu tetapan mod guru.
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/50 transition-all"
              >
                Buka Mod Guru
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 2. MAIN TEACHER MANAGEMENT INTERFACE
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden text-slate-100">
      {/* Top Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-white">
                  Pengurusan Soalan Guru (Teacher Editor)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  {questions.length} Soalan Aktif
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tambah, sunting, dan padam soalan terus dari skrin ini tanpa mengubah fail kod
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLockSession}
              className="py-1.5 px-3 bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Kunci semula & keluar"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kunci & Keluar</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-5xl mx-auto mt-3 flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('dashboard');
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Dashboard Pelajar ({students.length})</span>
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('topics');
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'topics'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Urus Bab & Topik ({topics.length})</span>
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('list');
              setEditingQuestion(null);
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'list'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bank Soalan ({questions.length})</span>
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              resetForm();
              setActiveTab('add');
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'add'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{editingQuestion ? 'Sunting Soalan' : 'Tambah Soalan Baru'}</span>
          </button>

          <button
            onClick={() => {
              soundEffects.playClick();
              setActiveTab('settings');
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Keselamatan & Sandaran</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successNotice && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 shadow animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Main Body Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto">
          {/* TAB 0: DASHBOARD PRESTASI PELAJAR (STUDENT PERFORMANCE DASHBOARD) */}
          {activeTab === 'dashboard' && (
            <TeacherDashboard
              students={students}
              cloudSubmissions={cloudSubmissions}
              onAddStudent={onAddStudent}
              onClearDemoStudents={onClearDemoStudents}
            />
          )}

          {/* TAB 1: URUS BAB & TOPIK SUKATAN (CHAPTER & TOPIC MANAGER) */}
          {activeTab === 'topics' && (
            <TeacherTopicManager
              topics={topics}
              questions={questions}
              onSaveTopics={onSaveTopics}
              onResetTopicsToDefault={onResetTopicsToDefault}
              onUpdateTopicTitleInQuestions={onUpdateTopicTitleInQuestions}
            />
          )}

          {/* TAB 2: SENARAI SOALAN (QUESTION LIST & MANAGEMENT) */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari soalan (Arab atau Melayu)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Subject Filter */}
                <div className="sm:col-span-3">
                  <select
                    value={filterSubject}
                    onChange={(e) => {
                      setFilterSubject(e.target.value as SubjectId | 'all');
                      setFilterTopic('all');
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Semua Subjek (Tauhid, Firaq, Mantiq)</option>
                    <option value="tauhid">Ilmu Tauhid</option>
                    <option value="firaq">Al-Firaq Al-Islamiyyah</option>
                    <option value="mantiq">Ilmu Mantiq</option>
                  </select>
                </div>

                {/* Topic Filter */}
                <div className="sm:col-span-4">
                  <select
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Semua Bab / Topik</option>
                    {topics.filter((t) => filterSubject === 'all' || t.subject === filterSubject).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.titleArabic} ({t.titleMalay})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Banner */}
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Menunjukkan <strong>{filteredQuestions.length}</strong> daripada {questions.length} soalan</span>
                <button
                  onClick={() => {
                    soundEffects.playClick();
                    resetForm();
                    setActiveTab('add');
                  }}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-1 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Soalan Baharu</span>
                </button>
              </div>

              {/* Questions Table / Cards */}
              <div className="space-y-3">
                {filteredQuestions.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
                    <p className="text-sm">Tiada soalan yang sepadan dengan carian anda.</p>
                  </div>
                ) : (
                  filteredQuestions.map((q, index) => {
                    const labelArabicMap: Record<string, string> = { a: 'أ', b: 'ب', c: 'ج', d: 'د' };
                    const correctOpt = q.options.find((o) => o.id === q.correctAnswer);

                    return (
                      <div
                        key={q.id}
                        className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all shadow-md"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold text-xs">
                              #{index + 1}
                            </span>
                            <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {q.subject}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {q.topicTitleMalay}
                            </span>
                            {q.diagramType && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/30">
                                Mengandungi {q.diagramType === 'table' ? 'Jadual' : q.diagramType === 'tree' ? 'Rajah Pokok' : 'Pernyataan Kotak'}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons: Edit, Preview, Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => setPreviewQuestion(q)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                              title="Pratonton Soalan"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEditQuestion(q)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-950 text-slate-300 hover:text-emerald-400 border border-slate-700 hover:border-emerald-500/40"
                              title="Sunting Soalan Ini"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(q.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40"
                              title="Padam Soalan Ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Question Stem (Arabic & Malay with separated lines for complex questions) */}
                        <div className="my-2">
                          <FormattedQuestionStem
                            questionArabic={q.questionArabic}
                            questionMalay={q.questionMalay}
                            fontSizeClass="text-base"
                          />
                        </div>

                        {/* Options preview summary */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt) => {
                            const isCorrect = opt.id === q.correctAnswer;
                            return (
                              <div
                                key={opt.id}
                                className={`p-2 rounded-xl border flex items-start gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 font-semibold'
                                    : 'bg-slate-800/40 border-slate-800 text-slate-400'
                                }`}
                              >
                                <span className="font-bold shrink-0">
                                  ({opt.id.toUpperCase()} - {labelArabicMap[opt.id]}):
                                </span>
                                <span className="font-arabic text-right flex-1 truncate" dir="rtl">
                                  {opt.textArabic || opt.textMalay}
                                </span>
                                {isCorrect && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold shrink-0">
                                    BOLD
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TAMBAH / SUNTING SOALAN (FORM EDITOR) */}
          {activeTab === 'add' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-emerald-400" />
                    <span>{editingQuestion ? `Sunting Soalan (#${editingQuestion.id})` : 'Tambah Soalan Baharu'}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lengkapkan butiran soalan dan pilihan jawapan. Tanda jawapan yang betul (bold).
                  </p>
                </div>
                {editingQuestion && (
                  <button
                    onClick={resetForm}
                    className="py-1 px-3 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Batal Sunting
                  </button>
                )}
              </div>

              <form onSubmit={handleSaveQuestionForm} className="space-y-4">
                {/* Subject & Topic Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Subjek:
                    </label>
                    <select
                      value={formSubject}
                      onChange={(e) => {
                        const newSub = e.target.value as SubjectId;
                        setFormSubject(newSub);
                        const firstTopic = topics.find((t) => t.subject === newSub);
                        if (firstTopic) setFormTopicId(firstTopic.id);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="tauhid">Ilmu Tauhid</option>
                      <option value="firaq">Al-Firaq Al-Islamiyyah</option>
                      <option value="mantiq">Ilmu Mantiq</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Bab / Topik Sukatan:
                    </label>
                    <select
                      value={formTopicId}
                      onChange={(e) => setFormTopicId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      {availableTopicsForSubject.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.titleArabic} ({t.titleMalay})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Standard Pembelajaran (Optional) */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Standard Pembelajaran / معيار التعلم (Pilihan):
                  </label>
                  <input
                    type="text"
                    value={formLearningStandard}
                    onChange={(e) => setFormLearningStandard(e.target.value)}
                    placeholder="Contoh: (ب) مقارنة بين السمعيات والغيبيات"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500"
                    dir="rtl"
                  />
                </div>

                {/* Arabic Question Stem */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Teks Soalan Bahasa Arab (Wajib): <span className="text-emerald-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormQuestionArabic((prev) => (prev ? `${prev} ﴿ ﴾` : '﴿ ﴾'))}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors"
                      title="Sisip Kurungan Khas Ayat Al-Quran (Ornate Brackets)"
                    >
                      <span className="font-arabic text-sm">﴿ ﴾</span>
                      <span className="font-sans text-[10px]">+ Sisip Kurungan Quran</span>
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    value={formQuestionArabic}
                    onChange={(e) => setFormQuestionArabic(e.target.value)}
                    placeholder="أدخل نص السؤال باللغة العربية هنا..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-base text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500"
                    dir="rtl"
                    required
                  />
                </div>

                {/* Malay Question / Translation */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Terjemahan / Soalan Bahasa Melayu:
                  </label>
                  <input
                    type="text"
                    value={formQuestionMalay}
                    onChange={(e) => setFormQuestionMalay(e.target.value)}
                    placeholder="Contoh: Pilih perbandingan yang benar antara Sam'iyyat dan Ghaibiyyat..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Diagram / Table / Tree Section */}
                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Table className="w-4 h-4 text-teal-400" />
                      <span>Format Rajah Pokok, Jadual atau Kotak (Pilihan):</span>
                    </label>
                    <select
                      value={formDiagramType}
                      onChange={(e) => setFormDiagramType(e.target.value as 'none' | 'tree' | 'table' | 'box')}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white"
                    >
                      <option value="none">Tiada Rajah / Jadual</option>
                      <option value="tree">🌳 Rajah Pokok / Peta Konsep (Tree Diagram)</option>
                      <option value="table">📊 Jadual Perbandingan (Table)</option>
                      <option value="box">📦 Pernyataan Teks Kotak (Box Statement)</option>
                    </select>
                  </div>

                  {formDiagramType !== 'none' && (
                    <div className="space-y-2">
                      <div className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-750">
                        {formDiagramType === 'tree' && (
                          <div>
                            <span className="font-bold text-emerald-400">Cara tulis Rajah Pokok:</span> Tulis tajuk induk diikuti anak panah (<code className="text-teal-300">-&gt;</code>), kemudian cabang-cabang dipisahkan dengan tanda pipe (<code className="text-teal-300">|</code>).
                            <div className="mt-1 text-slate-400 font-mono text-[10px]">
                              Contoh: <span className="text-teal-200">P -&gt; الحافظون والكاتبون | ملائكة الموت | حملة العرش | حملة الجنة</span>
                            </div>
                          </div>
                        )}
                        {formDiagramType === 'table' && (
                          <div>
                            <span className="font-bold text-teal-400">Cara tulis Jadual:</span> Gunakan tanda <code className="text-teal-300">|</code> antara lajur dan baris baru bagi setiap baris jadual. Baris pertama ialah tajuk lajur.
                            <div className="mt-1 text-slate-400 font-mono text-[10px]">
                              Contoh:<br />
                              <span className="text-teal-200">السمعيات | الغيبيات<br />السمعيات أعم | الغيبيات أخص</span>
                            </div>
                          </div>
                        )}
                        {formDiagramType === 'box' && (
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-400">Pernyataan Teks Kotak:</span>
                            <button
                              type="button"
                              onClick={() => setFormDiagramArabic((prev) => (prev ? `${prev} ﴿ ﴾` : '﴿ ﴾'))}
                              className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors"
                              title="Sisip Kurungan Khas Ayat Al-Quran (Ornate Brackets)"
                            >
                              <span className="font-arabic text-sm">﴿ ﴾</span>
                              <span className="font-sans text-[10px]">+ Sisip Kurungan Quran</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <textarea
                        rows={3}
                        value={formDiagramArabic}
                        onChange={(e) => setFormDiagramArabic(e.target.value)}
                        placeholder={
                          formDiagramType === 'tree'
                            ? 'P -> الحافظون والكاتبون | ملائكة الموت | حملة العرش | حملة الجنة'
                            : formDiagramType === 'table'
                            ? 'السمعيات | الغيبيات\nالسمعيات أعم | الغيبيات أخص\nالسمعيات أخص | الغيبيات أعم'
                            : 'نص السند أو الملاحظة...'
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-arabic text-right dir-rtl focus:outline-none focus:border-teal-500"
                        dir="rtl"
                      />

                      {/* Live Diagram Preview */}
                      {formDiagramArabic.trim() && (
                        <div className="mt-2 p-3 rounded-xl bg-slate-900/90 border border-slate-700/80">
                          <span className="text-[10px] uppercase font-bold text-teal-400 mb-2 block">
                            Pratonton Rajah Langsung (Live Interactive Preview):
                          </span>
                          <QuestionDiagramRenderer
                            diagramArabic={formDiagramArabic}
                            diagramType={formDiagramType}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4 Options (أ, ب, ج, د) with Correct Answer Selector */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                    Pilihan Jawapan (Tandakan Radio Jawapan Yang Betul):
                  </label>

                  {/* Option A */}
                  <div className={`p-3 rounded-2xl border transition-all ${
                    formCorrectAnswer === 'a' ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-800/60 border-slate-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="opt-a"
                          name="correctAnswer"
                          checked={formCorrectAnswer === 'a'}
                          onChange={() => setFormCorrectAnswer('a')}
                          className="w-4 h-4 text-emerald-500 focus:ring-emerald-400"
                        />
                        <label htmlFor="opt-a" className="text-xs font-bold text-white cursor-pointer flex items-center gap-1.5">
                          <span>Pilihan (A) - أ</span>
                          {formCorrectAnswer === 'a' && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded">
                              JAWAPAN TEPAT (BOLD)
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formOptAArabic}
                        onChange={(e) => setFormOptAArabic(e.target.value)}
                        placeholder="نص الخيار (أ) بالعربية..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500"
                        dir="rtl"
                        required
                      />
                      <input
                        type="text"
                        value={formOptAMalay}
                        onChange={(e) => setFormOptAMalay(e.target.value)}
                        placeholder="Huraian/Terjemahan Melayu (Pilihan)..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Option B */}
                  <div className={`p-3 rounded-2xl border transition-all ${
                    formCorrectAnswer === 'b' ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-800/60 border-slate-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="opt-b"
                          name="correctAnswer"
                          checked={formCorrectAnswer === 'b'}
                          onChange={() => setFormCorrectAnswer('b')}
                          className="w-4 h-4 text-emerald-500 focus:ring-emerald-400"
                        />
                        <label htmlFor="opt-b" className="text-xs font-bold text-white cursor-pointer flex items-center gap-1.5">
                          <span>Pilihan (B) - ب</span>
                          {formCorrectAnswer === 'b' && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded">
                              JAWAPAN TEPAT (BOLD)
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formOptBArabic}
                        onChange={(e) => setFormOptBArabic(e.target.value)}
                        placeholder="نص الخيار (ب) بالعربية..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500"
                        dir="rtl"
                        required
                      />
                      <input
                        type="text"
                        value={formOptBMalay}
                        onChange={(e) => setFormOptBMalay(e.target.value)}
                        placeholder="Huraian/Terjemahan Melayu (Pilihan)..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Option C */}
                  <div className={`p-3 rounded-2xl border transition-all ${
                    formCorrectAnswer === 'c' ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-800/60 border-slate-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="opt-c"
                          name="correctAnswer"
                          checked={formCorrectAnswer === 'c'}
                          onChange={() => setFormCorrectAnswer('c')}
                          className="w-4 h-4 text-emerald-500 focus:ring-emerald-400"
                        />
                        <label htmlFor="opt-c" className="text-xs font-bold text-white cursor-pointer flex items-center gap-1.5">
                          <span>Pilihan (C) - ج</span>
                          {formCorrectAnswer === 'c' && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded">
                              JAWAPAN TEPAT (BOLD)
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formOptCArabic}
                        onChange={(e) => setFormOptCArabic(e.target.value)}
                        placeholder="نص الخيار (ج) بالعربية..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500"
                        dir="rtl"
                      />
                      <input
                        type="text"
                        value={formOptCMalay}
                        onChange={(e) => setFormOptCMalay(e.target.value)}
                        placeholder="Huraian/Terjemahan Melayu (Pilihan)..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Option D */}
                  <div className={`p-3 rounded-2xl border transition-all ${
                    formCorrectAnswer === 'd' ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500' : 'bg-slate-800/60 border-slate-700'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id="opt-d"
                          name="correctAnswer"
                          checked={formCorrectAnswer === 'd'}
                          onChange={() => setFormCorrectAnswer('d')}
                          className="w-4 h-4 text-emerald-500 focus:ring-emerald-400"
                        />
                        <label htmlFor="opt-d" className="text-xs font-bold text-white cursor-pointer flex items-center gap-1.5">
                          <span>Pilihan (D) - د</span>
                          {formCorrectAnswer === 'd' && (
                            <span className="text-[10px] bg-emerald-500 text-slate-950 font-extrabold px-1.5 py-0.2 rounded">
                              JAWAPAN TEPAT (BOLD)
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formOptDArabic}
                        onChange={(e) => setFormOptDArabic(e.target.value)}
                        placeholder="نص الخيار (د) بالعربية..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500"
                        dir="rtl"
                      />
                      <input
                        type="text"
                        value={formOptDMalay}
                        onChange={(e) => setFormOptDMalay(e.target.value)}
                        placeholder="Huraian/Terjemahan Melayu (Pilihan)..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Explanation / Skema Jawapan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Huraian Skema Jawapan (Bahasa Arab):
                    </label>
                    <textarea
                      rows={2}
                      value={formExplanationArabic}
                      onChange={(e) => setFormExplanationArabic(e.target.value)}
                      placeholder="الشرح والتوجيه الرسمي في وثيقة الامتحان..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Huraian Skema Jawapan (Bahasa Melayu):
                    </label>
                    <textarea
                      rows={2}
                      value={formExplanationMalay}
                      onChange={(e) => setFormExplanationMalay(e.target.value)}
                      placeholder="Huraian jawapan tepat untuk kefahaman pelajar..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Submit Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setActiveTab('list');
                    }}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>{editingQuestion ? 'Simpan Perubahan Soalan' : 'Simpan & Masukkan Soalan'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: KESELAMATAN & SANDARAN (PIN & BACKUP) */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Change PIN Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Tukar Kod PIN Keselamatan Guru
                    </h3>
                    <p className="text-xs text-slate-400">
                      Tukar kod laluan rahsia anda supaya pelajar tidak dapat membuka mod ini
                    </p>
                  </div>
                </div>

                {pinSuccessMessage && (
                  <div className="mb-3 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500 text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>{pinSuccessMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSaveNewPin} className="max-w-md space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Kod PIN Baharu (minimum 4 aksara):
                    </label>
                    <input
                      type="text"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Contoh: uztaz2025 / 8899"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                  >
                    Simpan PIN Baharu
                  </button>
                </form>
              </div>

              {/* Export & Import Backup */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Sandaran & Eksport / Import Data Soalan
                    </h3>
                    <p className="text-xs text-slate-400">
                      Simpan fail salinan sandaran (backup) soalan ke komputer atau muat naik fail soalan yang dikongsi
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Eksport Fail JSON</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Muat turun kesemua {questions.length} soalan terkini sebagai fail JSON untuk disimpan dalam komputer/telefon anda.
                    </p>
                    <button
                      onClick={handleExportJson}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-colors"
                    >
                      Muat Turun Fail Soalan (.json)
                    </button>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-teal-400" />
                      <span>Import Fail JSON</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Muat naik fail soalan JSON untuk menggantikan atau menambah soalan dari luar secara serentak.
                    </p>
                    <label className="w-full py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow text-center block cursor-pointer transition-colors">
                      Pilih Fail JSON Untuk Dimuat Naik
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportJson}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Reset to Original Default STAM Questions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-rose-400">
                      Pulihkan Kepada 286 Soalan STAM Asal
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Jika anda tersalah padam atau ingin kembali kepada set soalan latihan asal aplikasi.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Adakah anda pasti ingin memulihkan semula kepada 286 soalan latihan STAM asal? Sebarang soalan baharu yang tidak dieksport akan hilang.')) {
                        onResetToDefault();
                        soundEffects.playFanfare();
                        setSuccessNotice('Semua 286 soalan latihan STAM asal telah dipulihkan semula!');
                        setTimeout(() => setSuccessNotice(null), 3500);
                      }
                    }}
                    className="py-2 px-3.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Ke Asal</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white text-center mb-1">
              Sahkan Pemadaman Soalan
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 leading-relaxed">
              Adakah anda pasti ingin memadam soalan ini dari aplikasi? Tindakan ini tidak boleh diundur melainkan anda menekan Reset ke Asal.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteQuestion(deleteConfirmId)}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
              >
                Padam Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Modal */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                Pratonton Pelajar: {previewQuestion.topicTitleMalay}
              </span>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Authentic Diagram / Statement Preview */}
            {previewQuestion.diagramArabic && (
              <div className="mb-3">
                <QuestionDiagramRenderer
                  diagramArabic={previewQuestion.diagramArabic}
                  diagramType={previewQuestion.diagramType}
                  correctAnswer={previewQuestion.correctAnswer}
                  isAnswerSubmitted={true}
                  reviewMode={true}
                />
              </div>
            )}

            <div className="mb-3">
              <FormattedQuestionStem
                questionArabic={previewQuestion.questionArabic}
                questionMalay={previewQuestion.questionMalay}
                fontSizeClass="text-base"
              />
            </div>

            <div className="space-y-2">
              {previewQuestion.options.map((opt) => {
                const isCorrect = opt.id === previewQuestion.correctAnswer;
                return (
                  <div
                    key={opt.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                      isCorrect
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 font-bold'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className="text-xs">({opt.id.toUpperCase()})</span>
                    <span className="font-arabic text-right dir-rtl text-sm" dir="rtl">
                      {opt.textArabic}
                    </span>
                    {isCorrect && (
                      <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                        TEPAT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
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

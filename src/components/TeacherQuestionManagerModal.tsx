import React, { useState, useMemo, useRef } from 'react';
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
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ListOrdered,
  Cloud,
  Underline,
  Archive,
  Undo2,
  Bot,
  Wand2,
  Loader2,
  RefreshCw,
  Languages,
  Bold,
  Highlighter,
  Palette
} from 'lucide-react';
import { Question, SubjectId, TopicInfo, Difficulty, StudentRecord } from '../types';
import { TOPICS_DATA } from '../data/questions';
import { soundEffects } from '../utils/audio';
import { cleanRepeatedText, sanitizeQuestion } from '../utils/sanitizeText';
import { renderFormattedUnderlineText } from '../utils/formatTextWithUnderline';
import { RichTextFormattingToolbar } from './RichTextFormattingToolbar';
import { autoTranslateArabicOption, autoTranslateArabicQuestion } from '../utils/bilingualTranslator';
import {
  translateTextWithGemini,
  translateQuestionFullWithGemini,
  translateOptionsBatchWithGemini,
  checkGeminiStatus
} from '../utils/geminiTranslationService';
import { 
  insertNewQuestionInTopic, 
  moveQuestionWithinTopic, 
  moveQuestionToPositionInTopic, 
  reorderTopicQuestions, 
  getQuestionTopicPosition 
} from '../utils/questionReorder';
import { FormattedQuestionStem } from './FormattedQuestionStem';
import { QuestionDiagramRenderer } from './QuestionDiagramRenderer';
import { TeacherDashboard } from './TeacherDashboard';
import { TeacherTopicManager } from './TeacherTopicManager';
import { TopicQuestionsReorderModal } from './TopicQuestionsReorderModal';
import { CloudQuizSubmission } from '../lib/firebase';

const STORAGE_KEY_TEACHER_PIN = 'stam_teacher_pin_v1';
const DEFAULT_PIN = 'stam2025';

interface TeacherQuestionManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  deletedQuestions?: Question[];
  students: StudentRecord[];
  cloudSubmissions?: CloudQuizSubmission[];
  topics: TopicInfo[];
  onSaveQuestions: (updatedQuestions: Question[], deletedId?: string) => void;
  onRestoreQuestion?: (question: Question) => void;
  onPermanentlyDeleteQuestion?: (questionId: string) => void;
  onEmptyTrash?: () => void;
  onResetToDefault?: () => void;
  onAddStudent?: (newStudent: StudentRecord) => void;
  onClearDemoStudents?: () => void;
  onDeleteStudent?: (studentId: string) => Promise<void> | void;
  onDeleteSubmission?: (submissionId: string, studentId?: string) => Promise<void> | void;
  onSaveTopics: (updatedTopics: TopicInfo[]) => void;
  onResetTopicsToDefault: () => void;
  onUpdateTopicTitleInQuestions?: (topicId: string, newTitleMalay: string, newTitleArabic: string) => void;
  onSyncCurriculumToCloud?: () => Promise<{ success: boolean; error?: string }>;
}

export const TeacherQuestionManagerModal: React.FC<TeacherQuestionManagerModalProps> = ({
  isOpen,
  onClose,
  questions,
  deletedQuestions = [],
  students,
  cloudSubmissions,
  topics,
  onSaveQuestions,
  onRestoreQuestion,
  onPermanentlyDeleteQuestion,
  onEmptyTrash,
  onResetToDefault,
  onAddStudent,
  onClearDemoStudents,
  onDeleteStudent,
  onDeleteSubmission,
  onSaveTopics,
  onResetTopicsToDefault,
  onUpdateTopicTitleInQuestions,
  onSyncCurriculumToCloud,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSuccessMessage, setPinSuccessMessage] = useState('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncNotice, setCloudSyncNotice] = useState<string | null>(null);

  // Manager Tabs: default to 'dashboard' to instantly see students and performance
  const [activeTab, setActiveTab] = useState<'dashboard' | 'topics' | 'list' | 'add' | 'archive' | 'settings'>('dashboard');

  // Filter & Search
  const [filterSubject, setFilterSubject] = useState<SubjectId | 'all'>('all');
  const [filterTopic, setFilterTopic] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing State
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [permanentDeleteConfirmId, setPermanentDeleteConfirmId] = useState<string | null>(null);
  const [restoreConfirmQuestion, setRestoreConfirmQuestion] = useState<Question | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
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

  // Topic Question Positioning & Reorder States
  const [formPositionOption, setFormPositionOption] = useState<'end' | 'start' | 'custom'>('end');
  const [formCustomPosition, setFormCustomPosition] = useState<number>(1);
  const [formEditPosition, setFormEditPosition] = useState<number>(1);
  const [activeReorderTopicId, setActiveReorderTopicId] = useState<string | null>(null);

  // Gemini AI Translation States
  const [isTranslatingFull, setIsTranslatingFull] = useState(false);
  const [isTranslatingQuestion, setIsTranslatingQuestion] = useState(false);
  const [isTranslatingOptions, setIsTranslatingOptions] = useState(false);
  const [translatingOptionKey, setTranslatingOptionKey] = useState<'a' | 'b' | 'c' | 'd' | null>(null);
  const [isTranslatingExplanation, setIsTranslatingExplanation] = useState(false);
  const [translationDirection, setTranslationDirection] = useState<'ar_to_ms' | 'ms_to_ar'>('ar_to_ms');
  const [geminiStatus, setGeminiStatus] = useState<{ available: boolean; model: string } | null>(null);

  // Input Refs for Selection-Aware Rich Text Formatting (Bold, Highlight, Underline)
  const arabicQuestionInputRef = useRef<HTMLTextAreaElement>(null);
  const malayQuestionInputRef = useRef<HTMLInputElement>(null);
  const arabicExplanationInputRef = useRef<HTMLTextAreaElement>(null);
  const malayExplanationInputRef = useRef<HTMLTextAreaElement>(null);
  const [listTranslatingId, setListTranslatingId] = useState<string | null>(null);

  React.useEffect(() => {
    checkGeminiStatus().then((status) => {
      setGeminiStatus(status);
    });
  }, []);

  // Memo for question count in the currently selected form topic
  const currentFormTopicQuestionCount = useMemo(() => {
    return questions.filter((q) => q.topicId === formTopicId).length;
  }, [questions, formTopicId]);

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

  const handleCloudSync = async () => {
    if (!onSyncCurriculumToCloud) return;
    setIsSyncingCloud(true);
    setCloudSyncNotice('Menyegerakkan soalan dan tajuk ke pangkalan data awan (Firebase)...');
    try {
      const res = await onSyncCurriculumToCloud();
      if (res.success) {
        soundEffects.playCorrect();
        setCloudSyncNotice('✅ Berjaya disegerakkan! Semua soalan dan terjemahan terkini kini aktif di Mod Biasa untuk semua pelajar.');
      } else {
        soundEffects.playWrong();
        setCloudSyncNotice(`❌ Ralat penyegerakan awan: ${res.error || 'Sila cuba lagi'}`);
      }
    } catch (err: any) {
      soundEffects.playWrong();
      setCloudSyncNotice('❌ Gagal berhubung dengan pangkalan data awan.');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setCloudSyncNotice(null), 6000);
    }
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
    const isNone = !q.diagramType || q.diagramType === 'none' || !q.diagramArabic || !q.diagramArabic.trim();
    setFormDiagramType(isNone ? 'none' : (q.diagramType as 'tree' | 'table' | 'box'));
    setFormDiagramArabic(isNone ? '' : (q.diagramArabic || ''));
    
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

    const posInfo = getQuestionTopicPosition(questions, q.id);
    setFormEditPosition(posInfo.position);

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
    setFormPositionOption('end');
    setFormCustomPosition(1);
    setFormEditPosition(1);
  };

  const handleAutoTranslateOptions = () => {
    soundEffects.playClick();

    // 1. Check if user has entered any Arabic options yet
    const hasAnyArabic = Boolean(
      formOptAArabic.trim() ||
      formOptBArabic.trim() ||
      formOptCArabic.trim() ||
      formOptDArabic.trim()
    );

    if (!hasAnyArabic) {
      setSuccessNotice('⚠️ Sila masukkan teks pilihan jawapan dalam Bahasa Arab (Kolum Kiri) terlebih dahulu.');
      setTimeout(() => setSuccessNotice(null), 4000);
      return;
    }

    // 2. Check if all Malay fields already have content
    const allFilled = Boolean(
      formOptAMalay.trim() &&
      formOptBMalay.trim() &&
      formOptCMalay.trim() &&
      formOptDMalay.trim()
    );

    if (allFilled) {
      setSuccessNotice('ℹ️ Kesemua 4 pilihan jawapan telah pun mempunyai terjemahan BM. Kosongkan kotak sekiranya ingin cadangan baharu.');
      setTimeout(() => setSuccessNotice(null), 3500);
      return;
    }

    let updatedCount = 0;
    const opts = [
      { ar: formOptAArabic, my: formOptAMalay, setMy: setFormOptAMalay },
      { ar: formOptBArabic, my: formOptBMalay, setMy: setFormOptBMalay },
      { ar: formOptCArabic, my: formOptCMalay, setMy: setFormOptCMalay },
      { ar: formOptDArabic, my: formOptDMalay, setMy: setFormOptDMalay },
    ];

    for (const opt of opts) {
      if (opt.ar.trim() && !opt.my.trim()) {
        const tr = autoTranslateArabicOption(opt.ar);
        if (tr) {
          opt.setMy(tr);
          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      setSuccessNotice(`✅ Berjaya mencadangkan ${updatedCount} terjemahan dwi-bahasa secara automatik!`);
    } else {
      setSuccessNotice('⚠️ Tiada padanan automatik dalam glosari STAM bagi pilihan ini. Sila taip terjemahan Bahasa Melayu secara manual.');
    }
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleAutoTranslateQuestion = () => {
    soundEffects.playClick();
    if (!formQuestionArabic.trim()) {
      setSuccessNotice('⚠️ Sila masukkan Teks Soalan Bahasa Arab terlebih dahulu.');
      setTimeout(() => setSuccessNotice(null), 3500);
      return;
    }
    if (formQuestionMalay.trim()) {
      setSuccessNotice('ℹ️ Soalan telah pun mempunyai terjemahan Bahasa Melayu. Kosongkan kotak jika ingin cadangan baharu.');
      setTimeout(() => setSuccessNotice(null), 3500);
      return;
    }
    const tr = autoTranslateArabicQuestion(formQuestionArabic);
    if (tr) {
      setFormQuestionMalay(tr);
      setSuccessNotice('✅ Berjaya mencadangkan terjemahan soalan secara automatik!');
    } else {
      setSuccessNotice('⚠️ Tiada padanan soalan automatik dalam pangkalan data STAM. Sila taip terjemahan soalan secara manual.');
    }
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Gemini AI: Translate Full Question, Diagram, All 4 Options & Explanation in one go
  const handleGeminiTranslateFull = async () => {
    soundEffects.playClick();
    const isToMalay = translationDirection === 'ar_to_ms';
    const sourceQuestion = isToMalay ? formQuestionArabic : formQuestionMalay;
    const hasSourceOpts = isToMalay
      ? Boolean(formOptAArabic.trim() || formOptBArabic.trim() || formOptCArabic.trim() || formOptDArabic.trim())
      : Boolean(formOptAMalay.trim() || formOptBMalay.trim() || formOptCMalay.trim() || formOptDMalay.trim());

    if (!sourceQuestion.trim() && !hasSourceOpts) {
      setSuccessNotice(
        isToMalay
          ? '⚠️ Sila masukkan teks soalan atau pilihan jawapan dalam Bahasa Arab terlebih dahulu.'
          : '⚠️ Sila masukkan teks soalan atau pilihan jawapan dalam Bahasa Melayu terlebih dahulu.'
      );
      setTimeout(() => setSuccessNotice(null), 4000);
      return;
    }

    setIsTranslatingFull(true);
    setSuccessNotice('🤖 Gemini AI sedang menterjemahkan soalan, rajah, dan 4 pilihan jawapan (STAM)...');

    try {
      const optionsPayload = [
        { id: 'a', textArabic: formOptAArabic, textMalay: formOptAMalay },
        { id: 'b', textArabic: formOptBArabic, textMalay: formOptBMalay },
        { id: 'c', textArabic: formOptCArabic, textMalay: formOptCMalay },
        { id: 'd', textArabic: formOptDArabic, textMalay: formOptDMalay },
      ];

      const res = await translateQuestionFullWithGemini({
        questionArabic: formQuestionArabic,
        questionMalay: formQuestionMalay,
        options: optionsPayload,
        explanationArabic: formExplanationArabic,
        explanationMalay: formExplanationMalay,
        diagramArabic: formDiagramArabic,
        targetLanguage: isToMalay ? 'ms' : 'ar',
      });

      if (res.success && res.data) {
        soundEffects.playCorrect();
        if (isToMalay) {
          if (res.data.translatedQuestion) setFormQuestionMalay(res.data.translatedQuestion);
          if (res.data.translatedExplanation) setFormExplanationMalay(res.data.translatedExplanation);
          if (res.data.translatedOptions) {
            for (const opt of res.data.translatedOptions) {
              if (opt.id === 'a') setFormOptAMalay(opt.translatedText);
              if (opt.id === 'b') setFormOptBMalay(opt.translatedText);
              if (opt.id === 'c') setFormOptCMalay(opt.translatedText);
              if (opt.id === 'd') setFormOptDMalay(opt.translatedText);
            }
          }
        } else {
          if (res.data.translatedQuestion) setFormQuestionArabic(res.data.translatedQuestion);
          if (res.data.translatedExplanation) setFormExplanationArabic(res.data.translatedExplanation);
          if (res.data.translatedOptions) {
            for (const opt of res.data.translatedOptions) {
              if (opt.id === 'a') setFormOptAArabic(opt.translatedText);
              if (opt.id === 'b') setFormOptBArabic(opt.translatedText);
              if (opt.id === 'c') setFormOptCArabic(opt.translatedText);
              if (opt.id === 'd') setFormOptDArabic(opt.translatedText);
            }
          }
        }
        setSuccessNotice(
          res.notice ||
            (res.fallback
              ? '✨ Terjemahan soalan & pilihan jawapan disiapkan menggunakan Glosari Pintar STAM!'
              : '✨ Berjaya menterjemah soalan dan semua pilihan jawapan menggunakan Gemini AI!')
        );
      } else {
        soundEffects.playWrong();
        setSuccessNotice(`❌ ${res.error || 'Gagal menterjemah dengan Gemini AI. Sila cuba lagi.'}`);
      }
    } catch (err: any) {
      soundEffects.playWrong();
      setSuccessNotice('❌ Ralat semasa menghubungi servis terjemahan.');
    } finally {
      setIsTranslatingFull(false);
      setTimeout(() => setSuccessNotice(null), 5000);
    }
  };

  // Gemini AI: Translate Question Stem Only
  const handleGeminiTranslateQuestion = async () => {
    soundEffects.playClick();
    const isToMalay = translationDirection === 'ar_to_ms';
    const sourceText = isToMalay ? formQuestionArabic : formQuestionMalay;

    if (!sourceText.trim()) {
      setSuccessNotice(
        isToMalay
          ? '⚠️ Sila masukkan teks soalan Bahasa Arab terlebih dahulu.'
          : '⚠️ Sila masukkan teks soalan Bahasa Melayu terlebih dahulu.'
      );
      setTimeout(() => setSuccessNotice(null), 3500);
      return;
    }

    setIsTranslatingQuestion(true);
    setSuccessNotice('🤖 Gemini AI sedang menterjemahkan teks soalan STAM...');

    try {
      const res = await translateTextWithGemini(sourceText, isToMalay ? 'ms' : 'ar');
      if (res.success && res.translatedText) {
        soundEffects.playCorrect();
        if (isToMalay) {
          setFormQuestionMalay(res.translatedText);
        } else {
          setFormQuestionArabic(res.translatedText);
        }
        setSuccessNotice(
          res.usedFallback
            ? '✨ Terjemahan soalan disiapkan menggunakan Glosari Pintar STAM!'
            : '✨ Terjemahan soalan berjaya disiapkan oleh Gemini AI!'
        );
      } else {
        soundEffects.playWrong();
        setSuccessNotice(`❌ ${res.error || 'Gagal menterjemahkan soalan.'}`);
      }
    } catch {
      soundEffects.playWrong();
      setSuccessNotice('❌ Ralat memproses terjemahan soalan.');
    } finally {
      setIsTranslatingQuestion(false);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  // Gemini AI: Translate all 4 Options simultaneously
  const handleGeminiTranslateOptions = async () => {
    soundEffects.playClick();
    const isToMalay = translationDirection === 'ar_to_ms';
    const hasAnySource = isToMalay
      ? Boolean(formOptAArabic.trim() || formOptBArabic.trim() || formOptCArabic.trim() || formOptDArabic.trim())
      : Boolean(formOptAMalay.trim() || formOptBMalay.trim() || formOptCMalay.trim() || formOptDMalay.trim());

    if (!hasAnySource) {
      setSuccessNotice(
        isToMalay
          ? '⚠️ Sila masukkan sekurang-kurangnya satu pilihan jawapan Bahasa Arab terlebih dahulu.'
          : '⚠️ Sila masukkan sekurang-kurangnya satu pilihan jawapan Bahasa Melayu terlebih dahulu.'
      );
      setTimeout(() => setSuccessNotice(null), 4000);
      return;
    }

    setIsTranslatingOptions(true);
    setSuccessNotice('🤖 Gemini AI sedang menterjemahkan 4 pilihan jawapan...');

    try {
      const optionsList = [
        { id: 'a', textArabic: formOptAArabic, textMalay: formOptAMalay },
        { id: 'b', textArabic: formOptBArabic, textMalay: formOptBMalay },
        { id: 'c', textArabic: formOptCArabic, textMalay: formOptCMalay },
        { id: 'd', textArabic: formOptDArabic, textMalay: formOptDMalay },
      ];

      const res = await translateOptionsBatchWithGemini(optionsList, isToMalay ? 'ms' : 'ar');
      if (res.success && res.translatedOptions) {
        soundEffects.playCorrect();
        for (const opt of res.translatedOptions) {
          if (isToMalay) {
            if (opt.id === 'a') setFormOptAMalay(opt.translatedText);
            if (opt.id === 'b') setFormOptBMalay(opt.translatedText);
            if (opt.id === 'c') setFormOptCMalay(opt.translatedText);
            if (opt.id === 'd') setFormOptDMalay(opt.translatedText);
          } else {
            if (opt.id === 'a') setFormOptAArabic(opt.translatedText);
            if (opt.id === 'b') setFormOptBArabic(opt.translatedText);
            if (opt.id === 'c') setFormOptCArabic(opt.translatedText);
            if (opt.id === 'd') setFormOptDArabic(opt.translatedText);
          }
        }
        setSuccessNotice(
          res.fallback
            ? '✨ Kesemua 4 pilihan jawapan diterjemahkan menggunakan Glosari Pintar STAM!'
            : '✨ Kesemua 4 pilihan jawapan berjaya diterjemahkan oleh Gemini AI!'
        );
      } else {
        soundEffects.playWrong();
        setSuccessNotice(`❌ ${res.error || 'Gagal menterjemahkan pilihan jawapan.'}`);
      }
    } catch {
      soundEffects.playWrong();
      setSuccessNotice('❌ Ralat memproses terjemahan pilihan jawapan.');
    } finally {
      setIsTranslatingOptions(false);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  // Gemini AI: Translate a Single Option (A, B, C, or D)
  const handleGeminiTranslateSingleOption = async (optKey: 'a' | 'b' | 'c' | 'd') => {
    soundEffects.playClick();
    const isToMalay = translationDirection === 'ar_to_ms';
    let sourceText = '';
    if (optKey === 'a') sourceText = isToMalay ? formOptAArabic : formOptAMalay;
    if (optKey === 'b') sourceText = isToMalay ? formOptBArabic : formOptBMalay;
    if (optKey === 'c') sourceText = isToMalay ? formOptCArabic : formOptCMalay;
    if (optKey === 'd') sourceText = isToMalay ? formOptDArabic : formOptDMalay;

    if (!sourceText.trim()) {
      setSuccessNotice(`⚠️ Sila isi teks pilihan (${optKey.toUpperCase()}) terlebih dahulu.`);
      setTimeout(() => setSuccessNotice(null), 3000);
      return;
    }

    setTranslatingOptionKey(optKey);
    try {
      const res = await translateTextWithGemini(sourceText, isToMalay ? 'ms' : 'ar');
      if (res.success && res.translatedText) {
        soundEffects.playCorrect();
        if (isToMalay) {
          if (optKey === 'a') setFormOptAMalay(res.translatedText);
          if (optKey === 'b') setFormOptBMalay(res.translatedText);
          if (optKey === 'c') setFormOptCMalay(res.translatedText);
          if (optKey === 'd') setFormOptDMalay(res.translatedText);
        } else {
          if (optKey === 'a') setFormOptAArabic(res.translatedText);
          if (optKey === 'b') setFormOptBArabic(res.translatedText);
          if (optKey === 'c') setFormOptCArabic(res.translatedText);
          if (optKey === 'd') setFormOptDArabic(res.translatedText);
        }
        setSuccessNotice(`✨ Pilihan (${optKey.toUpperCase()}) berjaya diterjemahkan!`);
      } else {
        soundEffects.playWrong();
        setSuccessNotice(`❌ ${res.error || 'Ralat terjemahan.'}`);
      }
    } catch {
      soundEffects.playWrong();
      setSuccessNotice('❌ Ralat terjemahan pilihan.');
    } finally {
      setTranslatingOptionKey(null);
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  // Gemini AI: Translate Explanation
  const handleGeminiTranslateExplanation = async () => {
    soundEffects.playClick();
    const isToMalay = translationDirection === 'ar_to_ms';
    const sourceText = isToMalay ? formExplanationArabic : formExplanationMalay;

    if (!sourceText.trim()) {
      setSuccessNotice('⚠️ Sila masukkan huraian jawapan terlebih dahulu.');
      setTimeout(() => setSuccessNotice(null), 3000);
      return;
    }

    setIsTranslatingExplanation(true);
    try {
      const res = await translateTextWithGemini(sourceText, isToMalay ? 'ms' : 'ar');
      if (res.success && res.translatedText) {
        soundEffects.playCorrect();
        if (isToMalay) {
          setFormExplanationMalay(res.translatedText);
        } else {
          setFormExplanationArabic(res.translatedText);
        }
        setSuccessNotice('✨ Huraian jawapan berjaya diterjemahkan oleh Gemini AI!');
      } else {
        soundEffects.playWrong();
        setSuccessNotice(`❌ ${res.error || 'Ralat menterjemah huraian.'}`);
      }
    } catch {
      soundEffects.playWrong();
      setSuccessNotice('❌ Ralat menterjemah huraian.');
    } finally {
      setIsTranslatingExplanation(false);
      setTimeout(() => setSuccessNotice(null), 3500);
    }
  };

  // Gemini AI: Quick translate a question card in Question List tab
  const handleGeminiTranslateListItem = async (q: Question) => {
    soundEffects.playClick();
    setListTranslatingId(q.id);
    setSuccessNotice(`🤖 Gemini AI sedang menterjemahkan soalan #${q.id.slice(0, 8)}...`);

    try {
      const res = await translateQuestionFullWithGemini({
        questionArabic: q.questionArabic,
        questionMalay: q.questionMalay,
        options: q.options,
        explanationArabic: q.explanationArabic,
        explanationMalay: q.explanationMalay,
        diagramArabic: q.diagramArabic,
        targetLanguage: 'ms',
      });

      if (res.success && res.data) {
        soundEffects.playCorrect();
        const updatedQuestion: Question = {
          ...q,
          questionMalay: res.data.translatedQuestion || q.questionMalay,
          explanationMalay: res.data.translatedExplanation || q.explanationMalay,
          options: q.options.map((opt) => {
            const tr = res.data?.translatedOptions?.find((o) => o.id === opt.id);
            return tr ? { ...opt, textMalay: tr.translatedText } : opt;
          }),
        };

        const updatedList = questions.map((item) => (item.id === q.id ? updatedQuestion : item));
        onSaveQuestions(updatedList);
        setSuccessNotice(`✨ Soalan berjaya diterjemahkan dengan Gemini AI dan disimpan secara automatik!`);
      } else {
        soundEffects.playWrong();
        setSuccessNotice(`❌ ${res.error || 'Gagal menterjemah soalan ini.'}`);
      }
    } catch {
      soundEffects.playWrong();
      setSuccessNotice('❌ Ralat menterjemah soalan senarai.');
    } finally {
      setListTranslatingId(null);
      setTimeout(() => setSuccessNotice(null), 4000);
    }
  };

  // Quick template for Complex MCQ (2 combinations: 1&2, 2&3, 3&4, 1&4)
  const handleApplyComplexCombo2 = () => {
    soundEffects.playClick();
    setFormOptAArabic('١ و ٢');
    setFormOptAMalay('1 dan 2');
    setFormOptBArabic('٢ و ٣');
    setFormOptBMalay('2 dan 3');
    setFormOptCArabic('٣ و ٤');
    setFormOptCMalay('3 dan 4');
    setFormOptDArabic('١ و ٤');
    setFormOptDMalay('1 dan 4');
    setSuccessNotice('✅ Berjaya mengisi pilihan aneka kompleks (2 gabungan angka Arab: ١ dan ٢, dsb.)!');
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  // Quick template for Complex MCQ (3 combinations: 1,2&3; 1,2&4; 1,3&4; 2,3&4)
  const handleApplyComplexCombo3 = () => {
    soundEffects.playClick();
    setFormOptAArabic('١ و ٢ و ٣');
    setFormOptAMalay('1, 2 dan 3');
    setFormOptBArabic('١ و ٢ و ٤');
    setFormOptBMalay('1, 2 dan 4');
    setFormOptCArabic('١ و ٣ و ٤');
    setFormOptCMalay('1, 3 dan 4');
    setFormOptDArabic('٢ و ٣ و ٤');
    setFormOptDMalay('2, 3 dan 4');
    setSuccessNotice('✅ Berjaya mengisi pilihan aneka kompleks (3 gabungan angka Arab: ١، ٢ dan ٣, dsb.)!');
    setTimeout(() => setSuccessNotice(null), 3500);
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
      diagramType: formDiagramType !== 'none' ? formDiagramType : 'none',
      diagramArabic: formDiagramType !== 'none' && formDiagramArabic.trim() ? cleanRepeatedText(formDiagramArabic.trim()) : '',
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
      let listWithUpdated = questions.map((q) => (q.id === editingQuestion.id ? questionPayload : q));

      // If user changed position within the same topic:
      if (editingQuestion.topicId === questionPayload.topicId) {
        const moveRes = moveQuestionToPositionInTopic(listWithUpdated, questionPayload.id, formEditPosition);
        if (moveRes) {
          listWithUpdated = moveRes.updatedList;
        }
      }
      updatedList = listWithUpdated;
      setSuccessNotice(`Soalan berjaya dikemaskini (Kedudukan #${formEditPosition} dalam tajuk)!`);
    } else {
      // Insert new question at specified position within the topic
      const { updatedList: inserted, positionNumber } = insertNewQuestionInTopic(
        questions,
        questionPayload,
        formPositionOption,
        formCustomPosition
      );
      updatedList = inserted;
      setSuccessNotice(`Soalan baharu berjaya ditambah di kedudukan #${positionNumber} dalam tajuk "${topicTitleMalay}"!`);
    }

    soundEffects.playCorrect();
    onSaveQuestions(updatedList);
    resetForm();
    setActiveTab('list');

    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const handleMoveQuestionInTopic = (qId: string, direction: 'up' | 'down') => {
    soundEffects.playClick();
    const res = moveQuestionWithinTopic(questions, qId, direction);
    if (res) {
      onSaveQuestions(res.updatedList);
      setSuccessNotice(`Soalan dipindahkan ke kedudukan #${res.newPos} daripada ${res.total} dalam tajuk ini.`);
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  const handleJumpQuestionInTopic = (qId: string, targetPos: number) => {
    soundEffects.playClick();
    const res = moveQuestionToPositionInTopic(questions, qId, targetPos);
    if (res) {
      onSaveQuestions(res.updatedList);
      setSuccessNotice(`Soalan dipindahkan ke kedudukan #${res.newPos} daripada ${res.total} dalam tajuk ini.`);
      setTimeout(() => setSuccessNotice(null), 3000);
    }
  };

  const handleSaveBulkReordered = (orderedIds: string[]) => {
    if (!activeReorderTopicId) return;
    const updated = reorderTopicQuestions(questions, activeReorderTopicId, orderedIds);
    onSaveQuestions(updated);
    const topObj = topics.find((t) => t.id === activeReorderTopicId) || TOPICS_DATA.find((t) => t.id === activeReorderTopicId);
    setSuccessNotice(`Susunan ${orderedIds.length} soalan bagi tajuk "${topObj?.titleMalay || 'Tajuk'}" berjaya disimpan!`);
    setActiveReorderTopicId(null);
    setTimeout(() => setSuccessNotice(null), 3500);
  };

  const handleDeleteQuestion = (qId: string) => {
    soundEffects.playClick();
    const updated = questions.filter((q) => q.id !== qId);
    onSaveQuestions(updated, qId);
    setDeleteConfirmId(null);
    setSuccessNotice('Soalan telah dipindahkan ke Arkib Soalan Dipadam (Kotak Sampah). Anda boleh memulihkannya bila-bila masa.');
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleExecuteRestore = (q: Question) => {
    soundEffects.playCorrect();
    if (onRestoreQuestion) {
      onRestoreQuestion(q);
      setSuccessNotice(`Soalan "${q.questionArabic.slice(0, 30)}..." telah berjaya dipulihkan kembali ke Bank Soalan!`);
    }
    setRestoreConfirmQuestion(null);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleExecutePermanentDelete = (qId: string) => {
    soundEffects.playWrong();
    if (onPermanentlyDeleteQuestion) {
      onPermanentlyDeleteQuestion(qId);
      setSuccessNotice('Soalan telah dipadam secara kekal dari pangkalan data.');
    }
    setPermanentDeleteConfirmId(null);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  const handleExecuteEmptyTrash = () => {
    soundEffects.playWrong();
    if (onEmptyTrash) {
      onEmptyTrash();
      setSuccessNotice('Semua soalan dalam Arkib telah dipadam secara kekal.');
    }
    setEmptyTrashConfirm(false);
    setTimeout(() => setSuccessNotice(null), 4000);
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

  // Filtered list for Recycle Bin / Arkib Soalan Dipadam
  const filteredDeletedQuestions = useMemo(() => {
    return deletedQuestions.filter((q) => {
      const matchSub = filterSubject === 'all' || q.subject === filterSubject;
      const matchTopic = filterTopic === 'all' || q.topicId === filterTopic;
      const matchSearch =
        searchQuery === '' ||
        q.questionArabic.includes(searchQuery) ||
        q.questionMalay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.options.some((o) => o.textArabic.includes(searchQuery) || o.textMalay.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSub && matchTopic && matchSearch;
    });
  }, [deletedQuestions, filterSubject, filterTopic, searchQuery]);

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
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold" title="Integrasi API Gemini AI sedia digunakan untuk terjemahan soalan & pilihan jawapan">
                  <Bot className="w-3 h-3 text-teal-300" />
                  <span>Gemini AI Terjemahan</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tambah, sunting, dan padam soalan terus dari skrin ini tanpa mengubah fail kod
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onSyncCurriculumToCloud && (
              <button
                type="button"
                onClick={handleCloudSync}
                disabled={isSyncingCloud}
                className={`py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                  isSyncingCloud
                    ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-wait'
                    : 'bg-teal-600/90 hover:bg-teal-500 border border-teal-500/40 text-white active:scale-95'
                }`}
                title="Segerakkan soalan dan tajuk ke pangkalan data awan (Firebase) supaya aktif serta-merta di Mod Biasa untuk semua pelajar"
              >
                <Cloud className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-bounce' : ''}`} />
                <span className="hidden sm:inline">{isSyncingCloud ? 'Menyegerak...' : 'Segerak ke Awan'}</span>
                <span className="sm:hidden">{isSyncingCloud ? '...' : 'Awan'}</span>
              </button>
            )}

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

        {/* Real-time Cloud Sync Feedback Banner */}
        {cloudSyncNotice && (
          <div className="max-w-5xl mx-auto mt-2.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{cloudSyncNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setCloudSyncNotice(null)}
              className="text-slate-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

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
              setActiveTab('archive');
            }}
            className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'archive'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Arkib Dipadam ({deletedQuestions.length})</span>
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
              onDeleteStudent={onDeleteStudent}
              onDeleteSubmission={onDeleteSubmission}
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
              onOpenReorderTopicQuestions={(topicId) => setActiveReorderTopicId(topicId)}
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 px-1">
                <span>Menunjukkan <strong>{filteredQuestions.length}</strong> daripada {questions.length} soalan</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {filterTopic !== 'all' && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEffects.playClick();
                        setActiveReorderTopicId(filterTopic);
                      }}
                      className="py-1.5 px-3 bg-teal-900/60 hover:bg-teal-800/80 text-teal-200 border border-teal-500/40 rounded-xl font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                      title="Buka panel susun semula urutan soalan bagi topik ini"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5 text-teal-300" />
                      <span>Susun Urutan Topik Ini</span>
                    </button>
                  )}
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
                    const posInfo = getQuestionTopicPosition(questions, q.id);
                    const isFirstInTopic = posInfo.position === 1;
                    const isLastInTopic = posInfo.position === posInfo.total;

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
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-teal-950/80 border border-teal-500/30 text-teal-300 flex items-center gap-1" title="Kedudukan soalan dalam tajuk sukatan">
                              <ListOrdered className="w-3 h-3 text-teal-400" />
                              <span>Urutan Tajuk: #{posInfo.position} / {posInfo.total}</span>
                            </span>
                            {q.diagramType && q.diagramType !== 'none' && q.diagramArabic && q.diagramArabic.trim() && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-500/30">
                                Mengandungi {q.diagramType === 'table' ? 'Jadual' : q.diagramType === 'tree' ? 'Rajah Pokok' : 'Pernyataan Kotak'}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons: Position up/down, Edit, Preview, Delete */}
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            {/* Up / Down buttons within topic */}
                            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                              <button
                                type="button"
                                onClick={() => handleMoveQuestionInTopic(q.id, 'up')}
                                disabled={isFirstInTopic}
                                className="p-1 rounded text-slate-300 hover:text-teal-300 hover:bg-slate-700 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors"
                                title={isFirstInTopic ? 'Sudah berada di kedudukan pertama dalam tajuk ini' : 'Pindah Ke Atas (▲) dalam tajuk ini'}
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveQuestionInTopic(q.id, 'down')}
                                disabled={isLastInTopic}
                                className="p-1 rounded text-slate-300 hover:text-teal-300 hover:bg-slate-700 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-300 transition-colors"
                                title={isLastInTopic ? 'Sudah berada di kedudukan terakhir dalam tajuk ini' : 'Pindah Ke Bawah (▼) dalam tajuk ini'}
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Direct position changer dropdown */}
                            {posInfo.total > 1 && (
                              <select
                                value={posInfo.position}
                                onChange={(e) => handleJumpQuestionInTopic(q.id, Number(e.target.value))}
                                className="px-1.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-bold text-teal-300 focus:outline-none focus:border-teal-500 cursor-pointer"
                                title="Lompat terus ke nombor kedudukan dalam tajuk ini"
                              >
                                {[...Array(posInfo.total)].map((_, i) => (
                                  <option key={i + 1} value={i + 1}>
                                    #{i + 1}
                                  </option>
                                ))}
                              </select>
                            )}

                            <button
                              onClick={() => setPreviewQuestion(q)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                              title="Pratonton Soalan"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleGeminiTranslateListItem(q)}
                              disabled={listTranslatingId === q.id}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-teal-950 text-slate-300 hover:text-teal-300 border border-slate-700 hover:border-teal-500/40 disabled:opacity-50 transition-colors"
                              title="Terjemahkan soalan dan 4 pilihan jawapan ini dengan Gemini AI"
                            >
                              {listTranslatingId === q.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-amber-400" />
                              )}
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

                        {/* Options preview summary (Dwi Bahasa: Bahasa Arab & Bahasa Melayu) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt) => {
                            const isCorrect = opt.id === q.correctAnswer;
                            return (
                              <div
                                key={opt.id}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-sm'
                                    : 'bg-slate-800/50 border-slate-800/90 text-slate-300'
                                }`}
                              >
                                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-lg shrink-0 mt-0.5 ${
                                  isCorrect ? 'bg-emerald-500 text-slate-950 font-black' : 'bg-slate-700/70 text-slate-300'
                                }`}>
                                  {opt.id.toUpperCase()} ({labelArabicMap[opt.id]})
                                </span>
                                <div className="flex-1 min-w-0">
                                  {opt.textArabic && (
                                    <div className="font-arabic text-right font-medium text-slate-100 text-xs leading-relaxed" dir="rtl">
                                      {renderFormattedUnderlineText(opt.textArabic, true)}
                                    </div>
                                  )}
                                  {opt.textMalay && opt.textMalay !== opt.textArabic && (
                                    <div className="text-[11px] text-teal-300/90 leading-snug mt-1 italic">
                                      {renderFormattedUnderlineText(opt.textMalay, false)}
                                    </div>
                                  )}
                                </div>
                                {isCorrect && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold shrink-0">
                                    JAWAPAN
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
                {/* GEMINI AI TRANSLATION HUB */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/70 to-indigo-950/60 border border-teal-500/40 shadow-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-inner">
                        <Bot className="w-5 h-5 text-teal-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>Integrasi Penterjemahan Pintar Gemini AI</span>
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-mono border border-teal-500/40 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                            <span>gemini-3.8-flash</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5">
                          Penterjemahan automatik soalan &amp; pilihan jawapan dengan ketepatan istilah sukatan STAM (Tauhid, Firaq &amp; Mantiq).
                        </p>
                      </div>
                    </div>

                    {/* Direction Toggle */}
                    <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playClick();
                          setTranslationDirection('ar_to_ms');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          translationDirection === 'ar_to_ms'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Terjemah daripada Bahasa Arab ke Bahasa Melayu"
                      >
                        <span>🇸🇦 Arab ➔ 🇲🇾 BM</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEffects.playClick();
                          setTranslationDirection('ms_to_ar');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          translationDirection === 'ms_to_ar'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Terjemah daripada Bahasa Melayu ke Bahasa Arab"
                      >
                        <span>🇲🇾 BM ➔ 🇸🇦 Arab</span>
                      </button>
                    </div>
                  </div>

                  {/* One-Click Full Translation Action */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-teal-500/20">
                    <button
                      type="button"
                      onClick={handleGeminiTranslateFull}
                      disabled={isTranslatingFull}
                      className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-teal-900/40 transition-all active:scale-98 cursor-pointer"
                    >
                      {isTranslatingFull ? (
                        <>
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                          <span>Gemini AI Sedang Menterjemah (Soalan &amp; 4 Pilihan)...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>✨ Terjemah Lengkap dengan Gemini AI (Soalan, Rajah &amp; 4 Pilihan)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
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

                {/* Topic Question Sequence / Position Setting */}
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-teal-400" />
                      <span>Kedudukan Urutan Soalan dalam Tajuk Ini:</span>
                    </label>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {currentFormTopicQuestionCount} soalan sedia ada dalam tajuk ini
                    </span>
                  </div>

                  {!editingQuestion ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        formPositionOption === 'end' 
                          ? 'bg-teal-950/60 border-teal-500 text-teal-200 ring-1 ring-teal-500' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name="questionPosOption"
                          checked={formPositionOption === 'end'}
                          onChange={() => setFormPositionOption('end')}
                          className="text-teal-500 focus:ring-teal-400"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-white">Di Akhir Tajuk</div>
                          <div className="text-[10px] text-slate-400">Soalan #{currentFormTopicQuestionCount + 1} (Disyorkan)</div>
                        </div>
                      </label>

                      <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        formPositionOption === 'start' 
                          ? 'bg-teal-950/60 border-teal-500 text-teal-200 ring-1 ring-teal-500' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name="questionPosOption"
                          checked={formPositionOption === 'start'}
                          onChange={() => setFormPositionOption('start')}
                          className="text-teal-500 focus:ring-teal-400"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-white">Di Permulaan Tajuk</div>
                          <div className="text-[10px] text-slate-400">Menjadi Soalan #1</div>
                        </div>
                      </label>

                      <label className={`p-2.5 rounded-xl border cursor-pointer flex items-center gap-2.5 transition-all ${
                        formPositionOption === 'custom' 
                          ? 'bg-teal-950/60 border-teal-500 text-teal-200 ring-1 ring-teal-500' 
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}>
                        <input
                          type="radio"
                          name="questionPosOption"
                          checked={formPositionOption === 'custom'}
                          onChange={() => setFormPositionOption('custom')}
                          className="text-teal-500 focus:ring-teal-400"
                        />
                        <div className="text-xs flex-1 flex items-center justify-between gap-1">
                          <div>
                            <div className="font-semibold text-white">No. Khusus:</div>
                            <div className="text-[10px] text-slate-400">Pilih kedudukan</div>
                          </div>
                          {formPositionOption === 'custom' && (
                            <select
                              value={formCustomPosition}
                              onChange={(e) => setFormCustomPosition(Number(e.target.value))}
                              className="px-2 py-1 bg-slate-900 border border-teal-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {[...Array(currentFormTopicQuestionCount + 1)].map((_, i) => (
                                <option key={i + 1} value={i + 1}>
                                  #{i + 1}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-slate-900/80 p-2.5 rounded-xl border border-slate-700">
                      <span className="text-xs text-slate-300">
                        Tukar kedudukan soalan ini dalam tajuk (1 hingga {Math.max(1, currentFormTopicQuestionCount)}):
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">Kedudukan:</span>
                        <select
                          value={formEditPosition}
                          onChange={(e) => setFormEditPosition(Number(e.target.value))}
                          className="px-3 py-1 bg-slate-800 border border-emerald-500 text-emerald-300 font-bold text-xs rounded-xl focus:outline-none cursor-pointer"
                        >
                          {[...Array(Math.max(1, currentFormTopicQuestionCount))].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              No. #{i + 1} {i + 1 === formEditPosition ? '(Semasa)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
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
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Teks Soalan Bahasa Arab (Wajib): <span className="text-emerald-400">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Kata Kunci: Bold (<code className="text-teal-300 font-mono">&lt;b&gt;</code>) &amp; Warna Merah (<code className="text-rose-400 font-mono">&lt;merah&gt;</code>)
                    </span>
                  </div>

                  {/* Rich Text Toolbar for Arabic Question */}
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80">
                    <RichTextFormattingToolbar
                      value={formQuestionArabic}
                      onChange={setFormQuestionArabic}
                      inputRef={arabicQuestionInputRef}
                      isArabic={true}
                      label="Alat Kata Kunci Arab"
                    />
                  </div>

                  <textarea
                    ref={arabicQuestionInputRef}
                    rows={3}
                    value={formQuestionArabic}
                    onChange={(e) => setFormQuestionArabic(e.target.value)}
                    placeholder="أدخل نص السؤال باللغة العربية هنا... (Pilih mana-mana perkataan & klik butang alat di atas untuk Bold atau Warna Merah)"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-base text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500 shadow-inner"
                    dir="rtl"
                    required
                  />

                  {/* Live Arabic Rich Text Preview */}
                  {formQuestionArabic && (
                    <div className="p-3 rounded-2xl bg-slate-900/90 border border-teal-500/30 text-right dir-rtl space-y-1.5 shadow-md" dir="rtl">
                      <div className="flex items-center justify-between font-sans text-[11px]">
                        <span className="text-[10px] uppercase font-bold text-teal-300 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-teal-400" />
                          <span>Pratonton Teks Soalan Arab (Live Preview):</span>
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          Paparan tepat seperti dilihat oleh pelajar di Mod Kuiz
                        </span>
                      </div>
                      <div className="font-arabic text-base text-slate-100 leading-loose pt-1">
                        {renderFormattedUnderlineText(formQuestionArabic, true)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Malay Question / Translation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Terjemahan / Soalan Bahasa Melayu:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleGeminiTranslateQuestion}
                        disabled={isTranslatingQuestion}
                        className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Terjemahkan teks soalan menggunakan Gemini AI"
                      >
                        {isTranslatingQuestion ? (
                          <Loader2 className="w-3 h-3 animate-spin text-white" />
                        ) : (
                          <Bot className="w-3 h-3 text-amber-300" />
                        )}
                        <span>✨ Terjemah Soalan (Gemini AI)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAutoTranslateQuestion}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-all"
                        title="Isi terjemahan soalan daripada glosari STAM luar talian"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-teal-400" />
                        <span>Glosari Asas</span>
                      </button>
                    </div>
                  </div>

                  {/* Rich Text Toolbar for Malay Question */}
                  <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80">
                    <RichTextFormattingToolbar
                      value={formQuestionMalay}
                      onChange={setFormQuestionMalay}
                      inputRef={malayQuestionInputRef}
                      isArabic={false}
                      label="Alat Kata Kunci BM"
                    />
                  </div>

                  <input
                    ref={malayQuestionInputRef}
                    type="text"
                    value={formQuestionMalay}
                    onChange={(e) => setFormQuestionMalay(e.target.value)}
                    placeholder="Contoh: Apakah bahagian qadhiyyah bagi perkataan <merah>memabukkan</merah> yang berwarna merah..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />

                  {/* Live Malay Rich Text Preview */}
                  {formQuestionMalay && (
                    <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-teal-500/30 text-xs text-slate-200 shadow-md">
                      <span className="text-[10px] uppercase font-bold text-teal-300 mb-1 flex items-center gap-1.5">
                        <Eye className="w-3 h-3 text-teal-400" />
                        <span>Pratonton Teks Soalan BM:</span>
                      </span>
                      <div className="pt-0.5 leading-relaxed">
                        {renderFormattedUnderlineText(formQuestionMalay, false)}
                      </div>
                    </div>
                  )}
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
                      onChange={(e) => {
                        const val = e.target.value as 'none' | 'tree' | 'table' | 'box';
                        setFormDiagramType(val);
                        if (val === 'none') {
                          setFormDiagramArabic('');
                        }
                      }}
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
                          <div className="flex items-center justify-between flex-wrap gap-1.5">
                            <span className="font-bold text-amber-400">Pernyataan Teks Kotak:</span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setFormDiagramArabic((prev) => (prev ? `${prev} <u>كلمة</u>` : '<u>كلمة</u>'))}
                                className="text-[11px] px-2 py-0.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition-colors"
                                title="Gariskan perkataan dalam kotak pernyataan"
                              >
                                <Underline className="w-3 h-3 text-amber-300" />
                                <span className="font-sans text-[10px]">+ Garis Perkataan &lt;u&gt;</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormDiagramArabic((prev) => (prev ? `${prev} ﴿ ﴾` : '﴿ ﴾'))}
                                className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 transition-colors"
                                title="Sisip Kurungan Khas Ayat Al-Quran (Ornate Brackets)"
                              >
                                <span className="font-arabic text-sm">﴿ ﴾</span>
                                <span className="font-sans text-[10px]">+ Sisip Kurungan Quran</span>
                              </button>
                            </div>
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

                {/* 4 Options (أ, ب, ج, د) with Correct Answer Selector & Bilingual Columns */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                        Pilihan Jawapan (4 Pilihan Dwi Bahasa):
                      </label>
                      <span className="text-[11px] text-slate-400 block">
                        Kolum Kiri: Bahasa Arab | Kolum Kanan: Terjemahan Bahasa Melayu
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyComplexCombo2}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-950/70 hover:bg-amber-900/90 border border-amber-500/50 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Isi automatik pilihan jawapan aneka kompleks (2 Gabungan: ١ و ٢, ٢ و ٣, ٣ و ٤, ١ و ٤)"
                      >
                        <ListOrdered className="w-3.5 h-3.5 text-amber-400" />
                        <span>Aneka Kompleks (2 Gabungan: ١ dan ٢)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleApplyComplexCombo3}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-950/70 hover:bg-indigo-900/90 border border-indigo-500/50 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Isi automatik pilihan jawapan aneka kompleks (3 Gabungan: ١ و ٢ و ٣, ١ و ٢ و ٤, ١ و ٣ و ٤, ٢ و ٣ و ٤)"
                      >
                        <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Aneka Kompleks (3 Gabungan: ١, ٢ dan ٣)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGeminiTranslateOptions}
                        disabled={isTranslatingOptions}
                        className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Terjemahkan kesemua 4 pilihan jawapan serentak menggunakan Gemini AI"
                      >
                        {isTranslatingOptions ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          <Bot className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        <span>✨ Terjemah 4 Pilihan (Gemini AI)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAutoTranslateOptions}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-750 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
                        title="Isi terjemahan Bahasa Melayu bagi 4 pilihan jawapan daripada Glosari STAM luar talian"
                      >
                        <Sparkles className="w-3 h-3 text-teal-300" />
                        <span>Glosari Asas</span>
                      </button>
                    </div>
                  </div>

                  {/* Header labels for the two columns */}
                  <div className="hidden sm:grid sm:grid-cols-2 gap-2 text-[11px] font-bold text-slate-400 px-3">
                    <div className="text-right text-emerald-300 font-arabic" dir="rtl">
                      الخيار باللغة العربية (Kolum Arab)
                    </div>
                    <div className="text-teal-300">
                      Terjemahan Bahasa Melayu (Kolum BM)
                    </div>
                  </div>

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
                      <button
                        type="button"
                        onClick={() => handleGeminiTranslateSingleOption('a')}
                        disabled={translatingOptionKey === 'a'}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-teal-900/60 border border-slate-700 hover:border-teal-500/40 text-teal-300 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Terjemah pilihan (A) sahaja dengan Gemini AI"
                      >
                        {translatingOptionKey === 'a' ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        )}
                        <span>Terjemah (A)</span>
                      </button>
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
                        placeholder="Terjemahan Bahasa Melayu (Pilihan A)..."
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
                      <button
                        type="button"
                        onClick={() => handleGeminiTranslateSingleOption('b')}
                        disabled={translatingOptionKey === 'b'}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-teal-900/60 border border-slate-700 hover:border-teal-500/40 text-teal-300 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Terjemah pilihan (B) sahaja dengan Gemini AI"
                      >
                        {translatingOptionKey === 'b' ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        )}
                        <span>Terjemah (B)</span>
                      </button>
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
                        placeholder="Terjemahan Bahasa Melayu (Pilihan B)..."
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
                      <button
                        type="button"
                        onClick={() => handleGeminiTranslateSingleOption('c')}
                        disabled={translatingOptionKey === 'c'}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-teal-900/60 border border-slate-700 hover:border-teal-500/40 text-teal-300 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Terjemah pilihan (C) sahaja dengan Gemini AI"
                      >
                        {translatingOptionKey === 'c' ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        )}
                        <span>Terjemah (C)</span>
                      </button>
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
                        placeholder="Terjemahan Bahasa Melayu (Pilihan C)..."
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
                      <button
                        type="button"
                        onClick={() => handleGeminiTranslateSingleOption('d')}
                        disabled={translatingOptionKey === 'd'}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-teal-900/60 border border-slate-700 hover:border-teal-500/40 text-teal-300 text-[10px] font-semibold flex items-center gap-1 transition-all"
                        title="Terjemah pilihan (D) sahaja dengan Gemini AI"
                      >
                        {translatingOptionKey === 'd' ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                        )}
                        <span>Terjemah (D)</span>
                      </button>
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
                        placeholder="Terjemahan Bahasa Melayu (Pilihan D)..."
                        className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Explanation / Skema Jawapan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Huraian Skema Jawapan (Bahasa Arab):
                      </label>
                      <RichTextFormattingToolbar
                        value={formExplanationArabic}
                        onChange={setFormExplanationArabic}
                        inputRef={arabicExplanationInputRef}
                        isArabic={true}
                        compact={true}
                      />
                    </div>
                    <textarea
                      ref={arabicExplanationInputRef}
                      rows={2}
                      value={formExplanationArabic}
                      onChange={(e) => setFormExplanationArabic(e.target.value)}
                      placeholder="الشرح والتوجيه الرسمي في وثيقة الامتحان..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white font-arabic text-right dir-rtl focus:outline-none focus:border-emerald-500"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        Huraian Skema Jawapan (Bahasa Melayu):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <RichTextFormattingToolbar
                          value={formExplanationMalay}
                          onChange={setFormExplanationMalay}
                          inputRef={malayExplanationInputRef}
                          isArabic={false}
                          compact={true}
                        />
                        <button
                          type="button"
                          onClick={handleGeminiTranslateExplanation}
                          disabled={isTranslatingExplanation}
                          className="px-2 py-0.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-[10px] font-bold flex items-center gap-1 transition-all shrink-0"
                          title="Terjemahkan huraian jawapan dengan Gemini AI"
                        >
                          {isTranslatingExplanation ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-white" />
                          ) : (
                            <Bot className="w-2.5 h-2.5 text-amber-300" />
                          )}
                          <span>✨ Terjemah</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      ref={malayExplanationInputRef}
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

          {/* TAB: ARKIB SOALAN DIPADAM (RECYCLE BIN / KOTAK SAMPAH) */}
          {activeTab === 'archive' && (
            <div className="space-y-4">
              {/* Info Header Banner */}
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Arkib Soalan Dipadam (Kotak Sampah)</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                        {deletedQuestions.length} soalan
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Soalan yang dipadam dari bank soalan disimpan di sini dengan selamat. Anda boleh memulihkan soalan kembali bila-bila masa atau memadamkannya secara kekal.
                    </p>
                  </div>
                </div>

                {deletedQuestions.length > 0 && (
                  <button
                    onClick={() => {
                      soundEffects.playClick();
                      setEmptyTrashConfirm(true);
                    }}
                    className="py-2 px-3.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Arkib</span>
                  </button>
                )}
              </div>

              {/* Filter and Search Bar for Trash */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search */}
                <div className="sm:col-span-5 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari dalam soalan dipadam (Arab / Melayu)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
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
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
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

              {/* Deleted Questions List */}
              <div className="space-y-3">
                {filteredDeletedQuestions.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto mb-3">
                      <Archive className="w-7 h-7" />
                    </div>
                    <p className="text-sm font-semibold text-slate-300">
                      {deletedQuestions.length === 0
                        ? 'Tiada soalan dalam arkib dipadam.'
                        : 'Tiada soalan dipadam yang menepati kriteria tapisan.'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {deletedQuestions.length === 0
                        ? 'Apabila anda memadam soalan dari Bank Soalan, soalan tersebut akan disimpan di sini.'
                        : 'Cuba ubah kata kunci carian atau tetapan tapisan subjek/tajuk.'}
                    </p>
                  </div>
                ) : (
                  filteredDeletedQuestions.map((q, index) => {
                    const labelArabicMap: Record<string, string> = { a: 'أ', b: 'ب', c: 'ج', d: 'د' };
                    const correctOpt = q.options.find((o) => o.id === q.correctAnswer);

                    return (
                      <div
                        key={q.id}
                        className="bg-slate-900 border border-amber-900/30 hover:border-amber-500/40 rounded-2xl p-4 transition-all shadow-md relative overflow-hidden"
                      >
                        {/* Top Indicator */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-amber-950 border border-amber-500/40 text-amber-300 font-bold text-xs">
                              #{index + 1}
                            </span>
                            <span className="text-xs uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {q.subject}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {q.topicTitleMalay}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/70 border border-rose-500/30 text-rose-300">
                              Dipadam
                            </span>
                          </div>

                          {/* Quick Action Buttons for Restore & Permanent Delete */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => {
                                soundEffects.playClick();
                                setPreviewQuestion(q);
                              }}
                              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                              title="Pratonton Soalan Ini"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                soundEffects.playClick();
                                setRestoreConfirmQuestion(q);
                              }}
                              className="py-1 px-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Kembalikan soalan ini ke Bank Soalan"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>Pulihkan</span>
                            </button>
                            <button
                              onClick={() => {
                                soundEffects.playClick();
                                setPermanentDeleteConfirmId(q.id);
                              }}
                              className="py-1 px-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-700/50 text-rose-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                              title="Padam soalan ini secara kekal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Padam Kekal</span>
                            </button>
                          </div>
                        </div>

                        {/* Arabic Question Body */}
                        <div className="mb-2">
                          <FormattedQuestionStem
                            questionArabic={q.questionArabic}
                            questionMalay={q.questionMalay}
                            fontSizeClass="text-sm sm:text-base"
                          />
                        </div>

                        {/* Diagram Note if exists */}
                        {q.diagramType && q.diagramType !== 'none' && q.diagramArabic && (
                          <div className="mb-2 p-2 bg-slate-950/50 border border-slate-800 rounded-xl text-[11px] text-slate-400">
                            <span className="text-amber-400 font-semibold">Mengandungi Rajah ({q.diagramType})</span>
                          </div>
                        )}

                        {/* Options Preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-800/80">
                          {q.options.map((opt) => {
                            const isCorrect = opt.id === q.correctAnswer;
                            return (
                              <div
                                key={opt.id}
                                className={`text-[11px] p-2 rounded-xl border flex items-center justify-between gap-1.5 ${
                                  isCorrect
                                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-medium'
                                    : 'bg-slate-800/40 border-slate-700/40 text-slate-400'
                                }`}
                              >
                                <span className="font-bold">
                                  ({opt.id.toUpperCase()} - {labelArabicMap[opt.id]})
                                </span>
                                <span className="font-arabic text-right truncate flex-1 px-1" dir="rtl">
                                  {opt.textArabic}
                                </span>
                                {isCorrect && (
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 py-0.5 rounded font-bold shrink-0">
                                    Betul
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

          {/* TAB 3: KESELAMATAN & SANDARAN (PIN & BACKUP) */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              {/* Cloud Synchronization Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        Penyegerakan Pangkalan Data Awan (Firebase Firestore)
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold">
                        Sinkronasi Automatik
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Soalan yang ditambah dan terjemahan yang disunting disegerakkan terus ke pangkalan data awan untuk paparan Mod Biasa pelajar di Vercel.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Setiap kali anda menyimpan atau menyunting soalan di Mod Guru, sistem akan mengemas kini storan setempat dan pangkalan data awan Firebase. Pelajar yang mengakses pautan web Vercel dalam <strong>Mod Biasa</strong> pada mana-mana telefon atau komputer akan menerima soalan terkini secara automatik.
                  </p>
                  {onSyncCurriculumToCloud && (
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleCloudSync}
                        disabled={isSyncingCloud}
                        className={`py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                          isSyncingCloud
                            ? 'bg-slate-700 text-slate-400 cursor-wait'
                            : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 active:scale-95'
                        }`}
                      >
                        <Cloud className={`w-4 h-4 ${isSyncingCloud ? 'animate-bounce' : ''}`} />
                        <span>{isSyncingCloud ? 'Sedang Menyegerak ke Awan...' : 'Segerakkan ke Pangkalan Data Awan Sekarang'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal (Moving to Trash/Arkib) */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white text-center mb-1">
              Pindahkan Soalan Ke Arkib?
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 leading-relaxed">
              Soalan ini akan dikeluarkan dari senarai aktif dan dipindahkan ke <strong>Arkib Soalan Dipadam</strong>. Anda masih boleh memulihkannya pada bila-bila masa.
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
                Pindah Ke Arkib
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreConfirmQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Undo2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white text-center mb-1">
              Pulihkan Soalan Ini?
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 leading-relaxed">
              Soalan ini akan dikembalikan semula ke senarai aktif Bank Soalan mengikut bab dan topik asalnya.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRestoreConfirmQuestion(null)}
                className="flex-1 py-2 px-3 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => handleExecuteRestore(restoreConfirmQuestion)}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
              >
                Pulihkan Soalan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {permanentDeleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-900/50 rounded-3xl p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white text-center mb-1">
              Padam Soalan Secara Kekal?
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 leading-relaxed">
              Adakah anda pasti ingin memadam soalan ini secara kekal? Tindakan ini <strong className="text-rose-400">tidak boleh dipulihkan semula</strong>.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPermanentDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => handleExecutePermanentDelete(permanentDeleteConfirmId)}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
              >
                Padam Kekal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Entire Trash Confirmation Modal */}
      {emptyTrashConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-rose-900/50 rounded-3xl p-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white text-center mb-1">
              Kosongkan Semua Soalan Arkib?
            </h3>
            <p className="text-xs text-slate-400 text-center mb-4 leading-relaxed">
              Semua {deletedQuestions.length} soalan di dalam Arkib Soalan Dipadam akan dihapuskan secara kekal. Tindakan ini tidak boleh diundur.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEmptyTrashConfirm(false)}
                className="flex-1 py-2 px-3 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteEmptyTrash}
                className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl"
              >
                Ya, Kosongkan Arkib
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
                      {renderFormattedUnderlineText(opt.textArabic, true)}
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

      {/* Bulk Topic Questions Reorder Modal */}
      {activeReorderTopicId && (
        <TopicQuestionsReorderModal
          isOpen={Boolean(activeReorderTopicId)}
          onClose={() => setActiveReorderTopicId(null)}
          topic={topics.find((t) => t.id === activeReorderTopicId) || TOPICS_DATA.find((t) => t.id === activeReorderTopicId)}
          topicQuestions={questions.filter((q) => q.topicId === activeReorderTopicId)}
          onSaveReordered={handleSaveBulkReordered}
        />
      )}
    </div>
  );
};

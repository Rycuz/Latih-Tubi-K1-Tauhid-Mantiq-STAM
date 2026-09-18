import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Edit3,
  Trash2,
  Plus,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Scale,
  BrainCircuit,
  Flame,
  ShieldCheck,
  GitFork,
  Users,
  Target,
  ArrowLeftRight,
  RefreshCw,
  Split,
  ChevronRight,
  FileText,
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  ArrowUpDown,
  GripVertical,
  ListOrdered
} from 'lucide-react';
import { SubjectId, TopicInfo, Question } from '../types';
import { soundEffects } from '../utils/audio';

interface TeacherTopicManagerProps {
  topics: TopicInfo[];
  questions: Question[];
  onSaveTopics: (updatedTopics: TopicInfo[]) => void;
  onResetTopicsToDefault: () => void;
  onUpdateTopicTitleInQuestions?: (topicId: string, newTitleMalay: string, newTitleArabic: string) => void;
  onOpenReorderTopicQuestions?: (topicId: string) => void;
}

const AVAILABLE_ICONS = [
  'BookOpen',
  'Sparkles',
  'ShieldCheck',
  'Flame',
  'Scale',
  'BrainCircuit',
  'GitFork',
  'Users',
  'Layers',
  'Target',
  'Split',
  'RefreshCw',
  'ArrowLeftRight',
  'HelpCircle',
  'FileText',
];

export const TeacherTopicManager: React.FC<TeacherTopicManagerProps> = ({
  topics,
  questions,
  onSaveTopics,
  onResetTopicsToDefault,
  onUpdateTopicTitleInQuestions,
  onOpenReorderTopicQuestions,
}) => {
  // Filters & Search
  const [filterSubject, setFilterSubject] = useState<SubjectId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing / Adding State
  const [isEditing, setIsEditing] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form Fields
  const [formSubject, setFormSubject] = useState<SubjectId>('tauhid');
  const [formId, setFormId] = useState('');
  const [formTitleMalay, setFormTitleMalay] = useState('');
  const [formTitleArabic, setFormTitleArabic] = useState('');
  const [formDescriptionMalay, setFormDescriptionMalay] = useState('');
  const [formIconName, setFormIconName] = useState('BookOpen');

  // Confirmation modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reorder Features State
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderSubject, setReorderSubject] = useState<SubjectId>('tauhid');
  const [positionDialogTopic, setPositionDialogTopic] = useState<TopicInfo | null>(null);

  // Position choices when creating a new chapter
  const [formInsertPosition, setFormInsertPosition] = useState<'end' | 'start' | 'after'>('end');
  const [formInsertAfterTopicId, setFormInsertAfterTopicId] = useState<string>('');

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered topics
  const filteredTopics = useMemo(() => {
    return topics.filter((topic) => {
      const matchSub = filterSubject === 'all' || topic.subject === filterSubject;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        q === '' ||
        topic.titleMalay.toLowerCase().includes(q) ||
        topic.titleArabic.includes(q) ||
        topic.descriptionMalay.toLowerCase().includes(q) ||
        topic.id.toLowerCase().includes(q);
      return matchSub && matchSearch;
    });
  }, [topics, filterSubject, searchQuery]);

  // Reorder Helper: Move topic up or down within its subject
  const handleMoveTopicWithinSubject = (topicId: string, direction: 'up' | 'down') => {
    const targetTopic = topics.find((t) => t.id === topicId);
    if (!targetTopic) return;

    const subject = targetTopic.subject;
    const subjectTopics = topics.filter((t) => t.subject === subject);
    const currentIdx = subjectTopics.findIndex((t) => t.id === topicId);

    if (direction === 'up' && currentIdx === 0) return;
    if (direction === 'down' && currentIdx === subjectTopics.length - 1) return;

    const newIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    const reorderedSubjectTopics = [...subjectTopics];
    const [removed] = reorderedSubjectTopics.splice(currentIdx, 1);
    reorderedSubjectTopics.splice(newIdx, 0, removed);

    let subjectPlaced = false;
    const newFullTopics: TopicInfo[] = [];

    for (const t of topics) {
      if (t.subject === subject) {
        if (!subjectPlaced) {
          newFullTopics.push(...reorderedSubjectTopics);
          subjectPlaced = true;
        }
      } else {
        newFullTopics.push(t);
      }
    }

    onSaveTopics(newFullTopics);
    soundEffects.playClick();
    showNotification(`Kedudukan bab "${targetTopic.titleMalay}" ditukar ke #${newIdx + 1}.`);
  };

  // Move topic to extreme top or extreme bottom
  const handleMoveTopicToEdge = (topicId: string, edge: 'top' | 'bottom') => {
    const targetTopic = topics.find((t) => t.id === topicId);
    if (!targetTopic) return;

    const subject = targetTopic.subject;
    const subjectTopics = topics.filter((t) => t.subject === subject);
    const currentIdx = subjectTopics.findIndex((t) => t.id === topicId);
    if (currentIdx === -1) return;

    const newIdx = edge === 'top' ? 0 : subjectTopics.length - 1;
    if (newIdx === currentIdx) return;

    const reorderedSubjectTopics = [...subjectTopics];
    const [removed] = reorderedSubjectTopics.splice(currentIdx, 1);
    reorderedSubjectTopics.splice(newIdx, 0, removed);

    let subjectPlaced = false;
    const newFullTopics: TopicInfo[] = [];

    for (const t of topics) {
      if (t.subject === subject) {
        if (!subjectPlaced) {
          newFullTopics.push(...reorderedSubjectTopics);
          subjectPlaced = true;
        }
      } else {
        newFullTopics.push(t);
      }
    }

    onSaveTopics(newFullTopics);
    soundEffects.playCorrect();
    showNotification(`Bab "${targetTopic.titleMalay}" dipindahkan ke kedudukan #${newIdx + 1}.`);
  };

  // Direct numeric position selector (1-based index)
  const handleSetTopicPosition = (topicId: string, targetPositionOneIndexed: number) => {
    const targetTopic = topics.find((t) => t.id === topicId);
    if (!targetTopic) return;

    const subject = targetTopic.subject;
    const subjectTopics = topics.filter((t) => t.subject === subject);
    const currentIdx = subjectTopics.findIndex((t) => t.id === topicId);
    if (currentIdx === -1) return;

    const boundedTarget = Math.max(0, Math.min(subjectTopics.length - 1, targetPositionOneIndexed - 1));
    if (boundedTarget === currentIdx) return;

    const reorderedSubjectTopics = [...subjectTopics];
    const [removed] = reorderedSubjectTopics.splice(currentIdx, 1);
    reorderedSubjectTopics.splice(boundedTarget, 0, removed);

    let subjectPlaced = false;
    const newFullTopics: TopicInfo[] = [];

    for (const t of topics) {
      if (t.subject === subject) {
        if (!subjectPlaced) {
          newFullTopics.push(...reorderedSubjectTopics);
          subjectPlaced = true;
        }
      } else {
        newFullTopics.push(t);
      }
    }

    onSaveTopics(newFullTopics);
    soundEffects.playCorrect();
    showNotification(`Bab "${targetTopic.titleMalay}" kini berada di kedudukan #${boundedTarget + 1}.`);
  };

  // Open edit modal
  const handleStartEdit = (topic: TopicInfo) => {
    soundEffects.playClick();
    setEditingTopicId(topic.id);
    setIsCreatingNew(false);
    setFormSubject(topic.subject);
    setFormId(topic.id);
    setFormTitleMalay(topic.titleMalay);
    setFormTitleArabic(topic.titleArabic);
    setFormDescriptionMalay(topic.descriptionMalay);
    setFormIconName(topic.iconName || 'BookOpen');
    setIsEditing(true);
  };

  // Open create modal
  const handleStartCreate = () => {
    soundEffects.playClick();
    const defaultSub: SubjectId = filterSubject === 'all' ? 'tauhid' : filterSubject;
    const generatedId = `${defaultSub}-${Date.now().toString().slice(-4)}`;
    const subTopics = topics.filter((t) => t.subject === defaultSub);
    const lastTopicId = subTopics.length > 0 ? subTopics[subTopics.length - 1].id : '';

    setEditingTopicId(null);
    setIsCreatingNew(true);
    setFormSubject(defaultSub);
    setFormId(generatedId);
    setFormTitleMalay('');
    setFormTitleArabic('');
    setFormDescriptionMalay('');
    setFormIconName('BookOpen');
    setFormInsertPosition('end');
    setFormInsertAfterTopicId(lastTopicId);
    setIsEditing(true);
  };

  // Close form
  const handleCancelForm = () => {
    setIsEditing(false);
    setEditingTopicId(null);
    setIsCreatingNew(false);
  };

  // Save form (Add or Edit)
  const handleSaveTopic = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitleMalay.trim()) {
      alert('Sila masukkan Tajuk Bab dalam Bahasa Melayu.');
      return;
    }

    if (!formTitleArabic.trim()) {
      alert('Sila masukkan Tajuk Bab dalam Bahasa Arab.');
      return;
    }

    if (isCreatingNew) {
      // Check ID uniqueness
      const cleanId = formId.trim().toLowerCase().replace(/\s+/g, '-');
      if (topics.some((t) => t.id === cleanId)) {
        alert('ID Bab ini sudah wujud. Sila gunakan ID lain.');
        return;
      }

      const newTopic: TopicInfo = {
        id: cleanId,
        subject: formSubject,
        titleArabic: formTitleArabic.trim(),
        titleMalay: formTitleMalay.trim(),
        descriptionMalay: formDescriptionMalay.trim() || 'Bab sukatan pembelajaran.',
        questionCount: 0,
        iconName: formIconName,
      };

      const subjectTopics = topics.filter((t) => t.subject === formSubject);
      const reorderedSubTopics = [...subjectTopics];

      if (formInsertPosition === 'start') {
        reorderedSubTopics.unshift(newTopic);
      } else if (formInsertPosition === 'after' && formInsertAfterTopicId) {
        const afterIdx = reorderedSubTopics.findIndex((t) => t.id === formInsertAfterTopicId);
        if (afterIdx !== -1) {
          reorderedSubTopics.splice(afterIdx + 1, 0, newTopic);
        } else {
          reorderedSubTopics.push(newTopic);
        }
      } else {
        reorderedSubTopics.push(newTopic);
      }

      // Reconstruct full topics array
      let subjectInserted = false;
      const newFullTopics: TopicInfo[] = [];

      if (topics.some((t) => t.subject === formSubject)) {
        for (const t of topics) {
          if (t.subject === formSubject) {
            if (!subjectInserted) {
              newFullTopics.push(...reorderedSubTopics);
              subjectInserted = true;
            }
          } else {
            newFullTopics.push(t);
          }
        }
      } else {
        newFullTopics.push(...topics, ...reorderedSubTopics);
      }

      onSaveTopics(newFullTopics);
      soundEffects.playCorrect();
      showNotification(`Bab baharu "${newTopic.titleMalay}" berjaya ditambah mengikut susunan pilihan!`);
    } else if (editingTopicId) {
      // Update existing topic
      const updated = topics.map((t) => {
        if (t.id === editingTopicId) {
          return {
            ...t,
            subject: formSubject,
            titleArabic: formTitleArabic.trim(),
            titleMalay: formTitleMalay.trim(),
            descriptionMalay: formDescriptionMalay.trim(),
            iconName: formIconName,
          };
        }
        return t;
      });

      onSaveTopics(updated);

      // Sync question titles if function provided
      if (onUpdateTopicTitleInQuestions) {
        onUpdateTopicTitleInQuestions(editingTopicId, formTitleMalay.trim(), formTitleArabic.trim());
      }

      soundEffects.playCorrect();
      showNotification(`Bab "${formTitleMalay.trim()}" berjaya dikemas kini!`);
    }

    setIsEditing(false);
    setEditingTopicId(null);
    setIsCreatingNew(false);
  };

  // Delete topic
  const handleDeleteTopic = (topicId: string) => {
    soundEffects.playClick();
    const updated = topics.filter((t) => t.id !== topicId);
    onSaveTopics(updated);
    setDeleteConfirmId(null);
    soundEffects.playCorrect();
    showNotification('Bab telah dipadam daripada senarai.');
  };

  // Reset to default
  const handleResetTopics = () => {
    soundEffects.playClick();
    onResetTopicsToDefault();
    setShowResetConfirm(false);
    soundEffects.playCorrect();
    showNotification('Senarai bab telah diset semula kepada silibus asal!');
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-2 text-center text-xs font-bold flex items-center justify-center gap-2 rounded-xl shadow animate-in slide-in-from-top duration-200">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Description */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              Pengurusan Bab & Topik Sukatan (Silibus)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Sunting nama bab dalam Bahasa Melayu & Bahasa Arab, kemas kini huraian sukatan, atau tambah bab baharu. 
            Sebarang penukaran nama bab akan dikemas kini secara automatik pada semua soalan di dalam bank soalan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => {
              soundEffects.playClick();
              setReorderSubject(filterSubject === 'all' ? 'tauhid' : filterSubject);
              setShowReorderModal(true);
            }}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Buka panel susunan kedudukan bab"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
            <span>Susun Urutan Bab</span>
          </button>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Pulihkan senarai bab mengikut sukatan asal STAM"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Set Semula Asal</span>
          </button>

          <button
            onClick={handleStartCreate}
            className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bab Baharu</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari bab (Bahasa Melayu atau Arab)..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Subject Filter */}
        <div className="sm:col-span-6">
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setFilterSubject('all')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                filterSubject === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua ({topics.length})
            </button>
            <button
              onClick={() => setFilterSubject('tauhid')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                filterSubject === 'tauhid'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tauhid ({topics.filter((t) => t.subject === 'tauhid').length})
            </button>
            <button
              onClick={() => setFilterSubject('firaq')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                filterSubject === 'firaq'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Firaq ({topics.filter((t) => t.subject === 'firaq').length})
            </button>
            <button
              onClick={() => setFilterSubject('mantiq')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                filterSubject === 'mantiq'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Mantiq ({topics.filter((t) => t.subject === 'mantiq').length})
            </button>
          </div>
        </div>
      </div>

      {/* Topic Count Stat */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Menunjukkan <strong>{filteredTopics.length}</strong> daripada {topics.length} bab berdaftar
        </span>
      </div>

      {/* Topic Cards List */}
      <div className="space-y-3">
        {filteredTopics.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
            <p className="text-sm font-semibold">Tiada bab ditemui mengikut tapisan ini.</p>
            <button
              onClick={() => {
                setFilterSubject('all');
                setSearchQuery('');
              }}
              className="mt-3 px-4 py-1.5 bg-slate-800 text-xs text-emerald-400 rounded-xl hover:bg-slate-700"
            >
              Set Semula Carian
            </button>
          </div>
        ) : (
          filteredTopics.map((topic, index) => {
            const questionsCount = questions.filter((q) => {
              if (q.topicId === topic.id) return true;
              if (q.subject !== topic.subject) return false;
              const normQ = (q.topicId || '').trim().toLowerCase().replace(/[-_\s]/g, '');
              const normT = (topic.id || '').trim().toLowerCase().replace(/[-_\s]/g, '');
              if (normQ && normT && normQ === normT) return true;
              if (q.topicTitleMalay && topic.titleMalay && q.topicTitleMalay.trim().toLowerCase() === topic.titleMalay.trim().toLowerCase()) return true;
              if (q.topicTitleArabic && topic.titleArabic && q.topicTitleArabic.trim() === topic.titleArabic.trim()) return true;
              return false;
            }).length;
            const subjectTopics = topics.filter((t) => t.subject === topic.subject);
            const subjectIndex = subjectTopics.findIndex((t) => t.id === topic.id);
            const isFirstInSubject = subjectIndex === 0;
            const isLastInSubject = subjectIndex === subjectTopics.length - 1;

            const subjectBadge =
              topic.subject === 'tauhid'
                ? { label: 'Tauhid', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' }
                : topic.subject === 'firaq'
                ? { label: 'Al-Firaq', bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' }
                : { label: 'Mantiq', bg: 'bg-violet-500/10 text-violet-400 border-violet-500/30' };

            return (
              <div
                key={topic.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 transition-all duration-150 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Reordering Controls (Up / Number / Down) */}
                  <div className="flex flex-col items-center justify-center gap-0.5 shrink-0 bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 w-11 shadow-inner">
                    <button
                      type="button"
                      disabled={isFirstInSubject}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveTopicWithinSubject(topic.id, 'up');
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700/70 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                      title={isFirstInSubject ? 'Sudah berada di kedudukan teratas' : 'Alih ke atas (naikkan susunan)'}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPositionDialogTopic(topic);
                      }}
                      className="text-xs font-black text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 px-1 py-0.5 rounded transition-all"
                      title="Klik untuk memilih nombor kedudukan terus"
                    >
                      #{subjectIndex + 1}
                    </button>

                    <button
                      type="button"
                      disabled={isLastInSubject}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveTopicWithinSubject(topic.id, 'down');
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700/70 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                      title={isLastInSubject ? 'Sudah berada di kedudukan terbawah' : 'Alih ke bawah (turunkan susunan)'}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${subjectBadge.bg}`}>
                        {subjectBadge.label}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        ID: {topic.id}
                      </span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-semibold border border-slate-700/60">
                        {questionsCount} Soalan
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/40">
                        Kedudukan Bab: #{subjectIndex + 1}
                      </span>
                    </div>

                    {/* Arabic Title */}
                    <div className="font-arabic text-lg font-bold text-white mb-0.5" dir="rtl">
                      {topic.titleArabic}
                    </div>

                    {/* Malay Title */}
                    <h4 className="text-sm font-bold text-slate-200">
                      {topic.titleMalay}
                    </h4>

                    {/* Description */}
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {topic.descriptionMalay || 'Tiada huraian tambahan.'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-800 w-full md:w-auto justify-end flex-wrap">
                  {onOpenReorderTopicQuestions && questionsCount > 0 && (
                    <button
                      onClick={() => onOpenReorderTopicQuestions(topic.id)}
                      className="py-1.5 px-2.5 bg-teal-950/80 hover:bg-teal-900 text-teal-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-teal-500/40"
                      title={`Susun kedudukan urutan soalan bagi tajuk "${topic.titleMalay}"`}
                    >
                      <ListOrdered className="w-3.5 h-3.5 text-teal-400" />
                      <span>Susun Soalan ({questionsCount})</span>
                    </button>
                  )}

                  <button
                    onClick={() => setPositionDialogTopic(topic)}
                    className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                    title="Tukar kedudukan urutan bab ini"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Susun Bab (#{subjectIndex + 1})</span>
                  </button>

                  <button
                    onClick={() => handleStartEdit(topic)}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-emerald-600/30 hover:text-emerald-300 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sunting Bab</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmId(topic.id)}
                    className="py-1.5 px-2.5 bg-slate-800/80 hover:bg-red-500/20 text-slate-400 hover:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-700"
                    title="Padam bab ini"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: SUNTING ATAU TAMBAH BAB */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {isCreatingNew ? 'Tambah Bab / Topik Baharu' : 'Sunting Nama Bab & Sukatan'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isCreatingNew ? 'Cipta bab baharu mengikut sukatan' : `Mengemas kini ID: ${editingTopicId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancelForm}
                className="py-1 px-2.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:text-white"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Subjek */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Subjek Sukatan:
                  </label>
                  <select
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value as SubjectId)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="tauhid">Ilmu Tauhid</option>
                    <option value="firaq">Al-Firaq Al-Islamiyyah</option>
                    <option value="mantiq">Ilmu Mantiq</option>
                  </select>
                </div>

                {/* ID Bab */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Kod ID Bab:
                  </label>
                  <input
                    type="text"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value)}
                    disabled={!isCreatingNew}
                    placeholder="cth: tauhid-10-maqasid"
                    className={`w-full px-3 py-2 rounded-xl border text-xs text-white focus:outline-none ${
                      isCreatingNew
                        ? 'bg-slate-800 border-slate-700 focus:border-emerald-500'
                        : 'bg-slate-800/50 border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  />
                </div>
              </div>

              {/* Tajuk Melayu */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nama Bab (Bahasa Melayu) <span className="text-red-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={formTitleMalay}
                  onChange={(e) => setFormTitleMalay(e.target.value)}
                  placeholder="cth: Al-Sam'iyyat & Al-Ghaibiyyat"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Tajuk Arab */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Nama Bab (Bahasa Arab) <span className="text-red-400">*</span>:
                </label>
                <input
                  type="text"
                  required
                  dir="rtl"
                  value={formTitleArabic}
                  onChange={(e) => setFormTitleArabic(e.target.value)}
                  placeholder="السمعيات والغيبيات"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white font-arabic placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Pratonton:</span>
                  <span className="font-arabic text-emerald-300 font-bold" dir="rtl">
                    {formTitleArabic || '—'}
                  </span>
                </div>
              </div>

              {/* Huraian Melayu */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Penerangan / Huraian Sukatan Bab:
                </label>
                <textarea
                  rows={3}
                  value={formDescriptionMalay}
                  onChange={(e) => setFormDescriptionMalay(e.target.value)}
                  placeholder="cth: Konsep perkara ghaib, perbezaan sam'iyyat dan ghaibiyyat, jalan pengetahuan wahyu..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                />
              </div>

              {/* Notice for question synchronization */}
              {!isCreatingNew && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-amber-300 text-[11px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Penyelarasan Automatik:</strong> Perubahan nama bab ini akan mengemas kini tajuk bab bagi kesemua soalan yang berdaftar di bawah kod <code>{editingTopicId}</code> secara automatik.
                  </span>
                </div>
              )}

              {/* Pilihan Kedudukan Bab Baharu atau Semasa */}
              {isCreatingNew ? (
                <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>Kedudukan Susunan Bab Baharu:</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Jumlah bab sedia ada: {topics.filter((t) => t.subject === formSubject).length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        formInsertPosition === 'end'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="insertPosition"
                        value="end"
                        checked={formInsertPosition === 'end'}
                        onChange={() => setFormInsertPosition('end')}
                        className="accent-emerald-500"
                      />
                      <span>Di Hujung (Terakhir)</span>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        formInsertPosition === 'start'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="insertPosition"
                        value="start"
                        checked={formInsertPosition === 'start'}
                        onChange={() => setFormInsertPosition('start')}
                        className="accent-emerald-500"
                      />
                      <span>Di Permulaan (#1)</span>
                    </label>

                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        formInsertPosition === 'after'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="insertPosition"
                        value="after"
                        checked={formInsertPosition === 'after'}
                        onChange={() => setFormInsertPosition('after')}
                        className="accent-emerald-500"
                      />
                      <span>Selepas Bab...</span>
                    </label>
                  </div>

                  {formInsertPosition === 'after' && (
                    <div className="pt-1.5 animate-in fade-in duration-150">
                      <label className="text-[11px] text-slate-300 font-medium block mb-1">
                        Pilih bab yang mendahului bab baharu ini:
                      </label>
                      <select
                        value={formInsertAfterTopicId}
                        onChange={(e) => setFormInsertAfterTopicId(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        {topics
                          .filter((t) => t.subject === formSubject)
                          .map((t, idx) => (
                            <option key={t.id} value={t.id}>
                              Kedudukan #{idx + 1}: {t.titleMalay} ({t.titleArabic})
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                editingTopicId && (
                  <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        Kedudukan Bab Dalam Silibus:
                      </span>
                      <span className="text-[11px] text-slate-300 mt-0.5 block">
                        Bab ke-{(topics.filter(t => t.subject === formSubject).findIndex(t => t.id === editingTopicId) + 1)} daripada {topics.filter(t => t.subject === formSubject).length} bab dalam subjek ini.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={topics.filter(t => t.subject === formSubject).findIndex(t => t.id === editingTopicId) === 0}
                        onClick={() => handleMoveTopicWithinSubject(editingTopicId, 'up')}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 text-xs border border-slate-700 flex items-center gap-1 transition-colors"
                        title="Alih ke atas"
                      >
                        <ChevronUp className="w-4 h-4 text-emerald-400" />
                        <span>Ke Atas</span>
                      </button>
                      <button
                        type="button"
                        disabled={topics.filter(t => t.subject === formSubject).findIndex(t => t.id === editingTopicId) === topics.filter(t => t.subject === formSubject).length - 1}
                        onClick={() => handleMoveTopicWithinSubject(editingTopicId, 'down')}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-200 text-xs border border-slate-700 flex items-center gap-1 transition-colors"
                        title="Alih ke bawah"
                      >
                        <ChevronDown className="w-4 h-4 text-emerald-400" />
                        <span>Ke Bawah</span>
                      </button>
                    </div>
                  </div>
                )
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="py-2 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
                >
                  {isCreatingNew ? 'Simpan Bab Baharu' : 'Kemas Kini Bab'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE TOPIC */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                Padam Bab Ini?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Adakah anda pasti mahu memadam bab <strong>{deleteConfirmId}</strong>?
              </p>
              {questions.filter((q) => q.topicId === deleteConfirmId).length > 0 && (
                <div className="mt-3 bg-red-950/40 border border-red-500/40 rounded-xl p-3 text-[11px] text-red-300">
                  Amaran: Terdapat <strong>{questions.filter((q) => q.topicId === deleteConfirmId).length} soalan</strong> yang masih berdaftar di bawah bab ini. Soalan-soalan tersebut tidak akan dipadam tetapi bab rujukannya akan tiada.
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteTopic(deleteConfirmId)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-950/40"
              >
                Ya, Padam Bab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: RESET TO DEFAULT */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white">
                Set Semula ke Silibus Asal?
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Tindakan ini akan memulihkan semua nama bab dan topik kepada senarai asal sukatan STAM K1. Sebarang perubahan nama bab yang telah anda lakukan akan dikembalikan kepada asal.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                onClick={handleResetTopics}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-950/40"
              >
                Ya, Set Semula Asal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT POSITION JUMP CHOOSER */}
      {positionDialogTopic && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Tukar Kedudukan Bab</h3>
                  <p className="text-[11px] text-slate-400">Pilih susunan nombor baharu</p>
                </div>
              </div>
              <button
                onClick={() => setPositionDialogTopic(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3 mb-3">
                <div className="font-arabic text-sm font-bold text-emerald-300" dir="rtl">
                  {positionDialogTopic.titleArabic}
                </div>
                <div className="text-xs font-bold text-white mt-0.5">
                  {positionDialogTopic.titleMalay}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 uppercase font-semibold">
                  Subjek: {positionDialogTopic.subject}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => {
                    handleMoveTopicToEdge(positionDialogTopic.id, 'top');
                    setPositionDialogTopic(null);
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 border border-slate-700"
                >
                  <ChevronsUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ke Pertama (#1)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleMoveTopicToEdge(positionDialogTopic.id, 'bottom');
                    setPositionDialogTopic(null);
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 border border-slate-700"
                >
                  <ChevronsDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ke Hujung (Terakhir)</span>
                </button>
              </div>

              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Atau pilih nombor kedudukan (1 hingga {topics.filter((t) => t.subject === positionDialogTopic.subject).length}):
              </label>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950/50 rounded-2xl border border-slate-800/80">
                {topics
                  .filter((t) => t.subject === positionDialogTopic.subject)
                  .map((_, idx) => {
                    const pos = idx + 1;
                    const currentSubjectIdx = topics
                      .filter((t) => t.subject === positionDialogTopic.subject)
                      .findIndex((t) => t.id === positionDialogTopic.id) + 1;
                    const isCurrent = pos === currentSubjectIdx;

                    return (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => {
                          handleSetTopicPosition(positionDialogTopic.id, pos);
                          setPositionDialogTopic(null);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        #{pos}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setPositionDialogTopic(null)}
                className="py-1.5 px-3.5 bg-slate-800 text-slate-300 rounded-xl text-xs hover:bg-slate-700"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL REORDER MODAL: SUSUN URUTAN BAB MENGIKUT SUBJEK */}
      {showReorderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh] space-y-4 animate-in fade-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ArrowUpDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Susun Urutan & Kedudukan Bab
                  </h3>
                  <p className="text-xs text-slate-400">
                    Susun kedudukan bab sukatan STAM dengan menaikkan atau menurunkan giliran.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReorderModal(false)}
                className="py-1 px-3 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Tutup
              </button>
            </div>

            {/* Subject Filter Tabs */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shrink-0">
              {(['tauhid', 'firaq', 'mantiq'] as SubjectId[]).map((sub) => {
                const isSelected = reorderSubject === sub;
                const count = topics.filter((t) => t.subject === sub).length;
                const subName =
                  sub === 'tauhid' ? 'Ilmu Tauhid' : sub === 'firaq' ? 'Al-Firaq' : 'Ilmu Mantiq';

                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setReorderSubject(sub)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <span>{subName}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-emerald-700/60 text-emerald-100' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Topics Reorder List */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {topics
                .filter((t) => t.subject === reorderSubject)
                .map((topic, idx, arr) => {
                  const isFirst = idx === 0;
                  const isLast = idx === arr.length - 1;

                  return (
                    <div
                      key={topic.id}
                      className="bg-slate-800/70 border border-slate-700/70 rounded-2xl p-3 flex items-center justify-between gap-3 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="font-arabic text-sm font-bold text-white truncate" dir="rtl">
                            {topic.titleArabic}
                          </div>
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {topic.titleMalay}
                          </div>
                        </div>
                      </div>

                      {/* Reorder Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveTopicToEdge(topic.id, 'top')}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-slate-900/80 text-slate-300 border border-slate-700/60"
                          title="Paling Atas (#1)"
                        >
                          <ChevronsUp className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMoveTopicWithinSubject(topic.id, 'up')}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-slate-900/80 text-slate-300 border border-slate-700/60"
                          title="Naik 1 kedudukan"
                        >
                          <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveTopicWithinSubject(topic.id, 'down')}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-slate-900/80 text-slate-300 border border-slate-700/60"
                          title="Turun 1 kedudukan"
                        >
                          <ChevronDown className="w-4 h-4 text-emerald-400" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMoveTopicToEdge(topic.id, 'bottom')}
                          className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-slate-900/80 text-slate-300 border border-slate-700/60"
                          title="Paling Bawah (Terakhir)"
                        >
                          <ChevronsDown className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-400">
                Susunan kedudukan disimpan secara automatik.
              </span>
              <button
                type="button"
                onClick={() => {
                  soundEffects.playCorrect();
                  setShowReorderModal(false);
                }}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40"
              >
                Selesai Menyusun
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

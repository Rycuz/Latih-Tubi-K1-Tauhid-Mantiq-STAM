import React, { useState, useMemo } from 'react';
import { 
  Users, 
  GraduationCap, 
  Search, 
  Filter, 
  Download, 
  Plus, 
  Calendar, 
  Trophy, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ChevronRight, 
  X, 
  Building2, 
  BookOpen, 
  Flame, 
  BarChart3, 
  Eye, 
  FileSpreadsheet,
  Award,
  Sparkles,
  ArrowUpDown,
  School,
  Trash2,
  Radio,
  Wifi,
  Zap,
  UploadCloud
} from 'lucide-react';
import { StudentRecord, StudentQuizHistory, SubjectId } from '../types';
import { soundEffects } from '../utils/audio';
import { CloudQuizSubmission } from '../lib/firebase';

const STORAGE_KEY_TEACHER_SCHOOL = 'stam_teacher_assigned_school_v1';
const DEFAULT_TEACHER_SCHOOL = 'Maahad Yaakubiah (MAYA)';

export const isStudentFromTeacherSchool = (studentSchoolOrClass: string, teacherSchool: string): boolean => {
  if (!studentSchoolOrClass || !teacherSchool) return false;
  const s = studentSchoolOrClass.toLowerCase().trim();
  const t = teacherSchool.toLowerCase().trim();

  // Direct bidirectional containment
  if (s.includes(t) || t.includes(s)) return true;

  // MAYA / Maahad Yaakubiah alias & synonym matching
  const mayaAliases = ['maya', 'maahad yaakubiah', 'yaakubiah', "ma'had yaakubiah", 'mahad yaakubiah', 'yaqubiah'];
  const studentIsMaya = mayaAliases.some((alias) => s.includes(alias));
  const teacherIsMaya = mayaAliases.some((alias) => t.includes(alias));
  if (studentIsMaya && teacherIsMaya) return true;

  // Keyword token matching for multi-word school names
  const teacherTokens = t.split(/[\s(),\-_]+/).filter((tok) => tok.length >= 4);
  for (const token of teacherTokens) {
    if (s.includes(token)) return true;
  }

  return false;
};

interface TeacherDashboardProps {
  students: StudentRecord[];
  cloudSubmissions?: CloudQuizSubmission[];
  onAddStudent?: (newStudent: StudentRecord) => void;
  onClearDemoStudents?: () => void;
  onRefreshLocalStudent?: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  students,
  cloudSubmissions = [],
  onAddStudent,
  onClearDemoStudents,
}) => {
  const [showLiveFeedModal, setShowLiveFeedModal] = useState(false);
  // Teacher's own school configuration
  const [teacherSchool, setTeacherSchool] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TEACHER_SCHOOL);
      if (saved && saved !== 'SMKA Maahad Hamidiah' && saved !== 'MAYA (6syukur)') {
        return saved;
      }
      return DEFAULT_TEACHER_SCHOOL;
    } catch {
      return DEFAULT_TEACHER_SCHOOL;
    }
  });
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [tempSchoolInput, setTempSchoolInput] = useState(teacherSchool);

  // Filter and Search States
  // 'my_school' = Only students from teacher's school (Maahad Yaakubiah / MAYA)
  // 'all' = All students nationwide
  // 'other_schools' = Only students from other schools
  const [schoolFilterMode, setSchoolFilterMode] = useState<'my_school' | 'all' | 'other_schools'>('my_school');
  const [selectedSpecificSchool, setSelectedSpecificSchool] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'accuracy' | 'xp' | 'quizzes' | 'recent'>('xp');

  // Modal / Drawer state for viewing a specific student's detailed performance history
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<StudentRecord | null>(null);

  // Modal for adding a manual student record
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentSchool, setNewStudentSchool] = useState(teacherSchool);
  const [newStudentClass, setNewStudentClass] = useState('6syukur');
  const [newStudentTauhidScore, setNewStudentTauhidScore] = useState<number>(85);
  const [newStudentFiraqScore, setNewStudentFiraqScore] = useState<number>(80);
  const [newStudentMantiqScore, setNewStudentMantiqScore] = useState<number>(75);

  // Enrich students with matching cloud submissions if quizHistory is missing or empty
  const enrichedStudents = useMemo(() => {
    return students.map((std) => {
      const existingHistory = std.quizHistory || [];
      const matchingSubs = cloudSubmissions.filter(
        (sub) => sub.studentId === std.id || sub.studentName.trim().toLowerCase() === std.name.trim().toLowerCase()
      );
      if (matchingSubs.length === 0) return std;

      const historyIds = new Set(existingHistory.map((h) => h.id));
      const newHistoryEntries: StudentQuizHistory[] = matchingSubs
        .filter((sub) => !historyIds.has(sub.id))
        .map((sub) => ({
          id: sub.id,
          quizTitle: sub.quizTitle,
          subject: (['tauhid', 'firaq', 'mantiq'].includes(sub.subject) ? sub.subject : 'campuran') as SubjectId | 'campuran',
          completedAt: new Date(sub.completedAt).toLocaleString('ms-MY', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          }),
          score: sub.score,
          totalQuestions: sub.totalQuestions,
          accuracy: sub.accuracy,
          xpEarned: sub.xpEarned,
          timeSpentSeconds: sub.timeSpentSeconds,
        }));

      return {
        ...std,
        quizHistory: [...existingHistory, ...newHistoryEntries],
      };
    });
  }, [students, cloudSubmissions]);

  // Save updated teacher school
  const handleSaveTeacherSchool = () => {
    if (!tempSchoolInput.trim()) return;
    const clean = tempSchoolInput.trim();
    setTeacherSchool(clean);
    setIsEditingSchool(false);
    try {
      localStorage.setItem(STORAGE_KEY_TEACHER_SCHOOL, clean);
      soundEffects.playCorrect();
    } catch {
      // ignore
    }
  };

  // Distinct list of all schools in dataset
  const allUniqueSchools = useMemo(() => {
    const list = Array.from(new Set(enrichedStudents.map((s) => s.schoolOrClass.trim()))).filter(Boolean);
    return list.sort();
  }, [enrichedStudents]);

  // Filtered & Sorted Student List
  const filteredStudents = useMemo(() => {
    return enrichedStudents
      .filter((std) => {
        const isMyStudent = isStudentFromTeacherSchool(std.schoolOrClass, teacherSchool);

        // Scope filter
        if (schoolFilterMode === 'my_school' && !isMyStudent) return false;
        if (schoolFilterMode === 'other_schools' && isMyStudent) return false;

        // Specific school dropdown
        if (selectedSpecificSchool !== 'all' && std.schoolOrClass !== selectedSpecificSchool) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = std.name.toLowerCase().includes(q);
          const matchSchool = std.schoolOrClass.toLowerCase().includes(q);
          const matchClassCode = std.classCode?.toLowerCase().includes(q) || false;
          if (!matchName && !matchSchool && !matchClassCode) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'accuracy') return b.accuracy - a.accuracy;
        if (sortBy === 'xp') return b.totalXp - a.totalXp;
        if (sortBy === 'quizzes') return b.quizzesCompleted - a.quizzesCompleted;
        // 'recent' by default or quizzes count
        return b.quizzesCompleted - a.quizzesCompleted;
      });
  }, [enrichedStudents, teacherSchool, schoolFilterMode, selectedSpecificSchool, searchQuery, sortBy]);

  // Aggregate Class Performance Statistics (based on currently filtered group or teacher's school)
  const statsSummary = useMemo(() => {
    const targetGroup = filteredStudents;
    const totalCount = targetGroup.length;
    if (totalCount === 0) {
      return {
        totalStudents: 0,
        averageAccuracy: 0,
        totalQuizzesDone: 0,
        tauhidAvg: 0,
        firaqAvg: 0,
        mantiqAvg: 0,
      };
    }

    const totalQuizzes = targetGroup.reduce((acc, s) => acc + s.quizzesCompleted, 0);
    const avgAcc = Math.round(targetGroup.reduce((acc, s) => acc + s.accuracy, 0) / totalCount);

    // Subject accuracy averages
    const calcSubAvg = (sub: SubjectId) => {
      let totalAns = 0;
      let totalCor = 0;
      targetGroup.forEach((s) => {
        totalAns += s.subjectAccuracy[sub]?.answered || 0;
        totalCor += s.subjectAccuracy[sub]?.correct || 0;
      });
      return totalAns > 0 ? Math.round((totalCor / totalAns) * 100) : 0;
    };

    return {
      totalStudents: totalCount,
      averageAccuracy: avgAcc,
      totalQuizzesDone: totalQuizzes,
      tauhidAvg: calcSubAvg('tauhid'),
      firaqAvg: calcSubAvg('firaq'),
      mantiqAvg: calcSubAvg('mantiq'),
    };
  }, [filteredStudents]);

  // Export to CSV for school records/PBD
  const handleExportCSV = () => {
    soundEffects.playClick();
    const headers = [
      'No',
      'Nama Pelajar',
      'Sekolah / Kelas',
      'Kod Kelas',
      'Kategori',
      'Jumlah Kuiz Disiapkan',
      'Jumlah Skor XP',
      'Ketepatan Keseluruhan (%)',
      'Ketepatan Tauhid (%)',
      'Ketepatan Firaq (%)',
      'Ketepatan Mantiq (%)',
      'Status Gred',
      'Tarikh Aktif Terakhir',
    ];

    const rows = filteredStudents.map((s, idx) => {
      const isMyStudent = isStudentFromTeacherSchool(s.schoolOrClass, teacherSchool);
      const tauhidPct = s.subjectAccuracy.tauhid.answered > 0
        ? Math.round((s.subjectAccuracy.tauhid.correct / s.subjectAccuracy.tauhid.answered) * 100)
        : 0;
      const firaqPct = s.subjectAccuracy.firaq.answered > 0
        ? Math.round((s.subjectAccuracy.firaq.correct / s.subjectAccuracy.firaq.answered) * 100)
        : 0;
      const mantiqPct = s.subjectAccuracy.mantiq.answered > 0
        ? Math.round((s.subjectAccuracy.mantiq.correct / s.subjectAccuracy.mantiq.answered) * 100)
        : 0;

      const gred = s.accuracy >= 85 ? 'Mumtaz' : s.accuracy >= 75 ? 'Jayyid Jiddan' : s.accuracy >= 60 ? 'Jayyid' : 'Perlu Bimbingan';

      return [
        idx + 1,
        `"${s.name.replace(/"/g, '""')}"`,
        `"${s.schoolOrClass.replace(/"/g, '""')}"`,
        `"${s.classCode || '-'}"`,
        isMyStudent ? 'Pelajar Saya' : 'Sekolah Luar',
        s.quizzesCompleted,
        s.totalXp,
        `${s.accuracy}%`,
        `${tauhidPct}%`,
        `${firaqPct}%`,
        `${mantiqPct}%`,
        gred,
        `"${s.lastActive}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekod_Prestasi_Pelajar_STAM_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateManualStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const overallAccuracy = Math.round((newStudentTauhidScore + newStudentFiraqScore + newStudentMantiqScore) / 3);

    const created: StudentRecord = {
      id: `manual-std-${Date.now()}`,
      name: newStudentName.trim(),
      avatar: '🧑‍🎓',
      schoolOrClass: newStudentSchool.trim() || teacherSchool,
      classCode: newStudentClass.trim() || 'STAM-6A',
      totalXp: overallAccuracy * 10,
      level: Math.floor((overallAccuracy * 10) / 100) + 1,
      accuracy: overallAccuracy,
      quizzesCompleted: 6,
      totalQuestionsAnswered: 60,
      correctAnswersCount: Math.round((60 * overallAccuracy) / 100),
      streakDays: 1,
      lastActive: 'Direkod Manual Hari Ini',
      subjectAccuracy: {
        tauhid: { answered: 20, correct: Math.round((20 * newStudentTauhidScore) / 100) },
        firaq: { answered: 20, correct: Math.round((20 * newStudentFiraqScore) / 100) },
        mantiq: { answered: 20, correct: Math.round((20 * newStudentMantiqScore) / 100) },
      },
      quizHistory: [
        {
          id: `qh-man-${Date.now()}-1`,
          quizTitle: 'Ujian Kelas: Subjek Tauhid',
          subject: 'tauhid',
          completedAt: 'Hari Ini',
          score: Math.round((10 * newStudentTauhidScore) / 100),
          totalQuestions: 10,
          accuracy: newStudentTauhidScore,
          xpEarned: newStudentTauhidScore,
          timeSpentSeconds: 240,
        },
        {
          id: `qh-man-${Date.now()}-2`,
          quizTitle: 'Ujian Kelas: Subjek Al-Firaq',
          subject: 'firaq',
          completedAt: 'Hari Ini',
          score: Math.round((10 * newStudentFiraqScore) / 100),
          totalQuestions: 10,
          accuracy: newStudentFiraqScore,
          xpEarned: newStudentFiraqScore,
          timeSpentSeconds: 230,
        },
        {
          id: `qh-man-${Date.now()}-3`,
          quizTitle: 'Ujian Kelas: Subjek Mantiq',
          subject: 'mantiq',
          completedAt: 'Hari Ini',
          score: Math.round((10 * newStudentMantiqScore) / 100),
          totalQuestions: 10,
          accuracy: newStudentMantiqScore,
          xpEarned: newStudentMantiqScore,
          timeSpentSeconds: 260,
        },
      ],
    };

    if (onAddStudent) {
      onAddStudent(created);
    }
    soundEffects.playCorrect();
    setIsAddStudentOpen(false);
    setNewStudentName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Teacher School & Class Scope Configuration */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <School className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Penetapan Sekolah Guru
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  Aktif
                </span>
              </div>
              
              {isEditingSchool ? (
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="text"
                    value={tempSchoolInput}
                    onChange={(e) => setTempSchoolInput(e.target.value)}
                    placeholder="Nama Sekolah atau Kelas Anda"
                    className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 w-64"
                  />
                  <button
                    onClick={handleSaveTeacherSchool}
                    className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => {
                      setTempSchoolInput(teacherSchool);
                      setIsEditingSchool(false);
                    }}
                    className="px-2.5 py-1.5 bg-slate-800 text-slate-400 rounded-xl text-xs hover:text-white"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    {teacherSchool}
                  </h2>
                  {isStudentFromTeacherSchool('MAYA', teacherSchool) && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-medium border border-emerald-500/30">
                      Singkatan: MAYA
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setTempSchoolInput(teacherSchool);
                      setIsEditingSchool(true);
                    }}
                    className="text-xs text-slate-400 hover:text-emerald-400 underline decoration-dotted transition-colors ml-1"
                  >
                    Tukar Sekolah
                  </button>
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Sistem memadankan secara automatik sekolah guru (termasuk singkatan <strong>MAYA</strong> bagi <strong>Maahad Yaakubiah</strong>) untuk melabelkan calon sebagai <strong>Pelajar Saya</strong>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {onClearDemoStudents && students.some((s) => s.id.startsWith('std-00') || s.id === 'std-current-user') && (
              <button
                onClick={() => {
                  soundEffects.playClick();
                  if (window.confirm('Adakah anda pasti mahu memadamkan sebarang rekod pelajar contoh? Hanya rekod pelajar sebenar akan dikekalkan.')) {
                    onClearDemoStudents();
                  }
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                title="Padam data contoh awal"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Padam Rekod Contoh</span>
              </button>
            )}

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm active:scale-95"
              title="Muat turun senarai markah dalam format Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Eksport CSV</span>
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                setIsAddStudentOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Daftar Markah Pelajar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Firebase Cloud Sync Status Card */}
      <div className="bg-gradient-to-r from-teal-950/70 via-slate-900 to-emerald-950/70 border border-teal-500/30 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg shadow-teal-950/30">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-500/40 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 relative"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Google Firebase Firestore (Awan) Aktif</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1">
                <Wifi className="w-2.5 h-2.5" />
                <span>Masa Nyata (Live)</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Markah dan data latihan calon STAM diselaraskan secara automatik ke pangkalan data awan sebaik sahaja kuiz diselesaikan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundEffects.playClick();
              setShowLiveFeedModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-teal-600/30 hover:bg-teal-600/50 text-teal-200 border border-teal-500/40 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 text-teal-300 animate-pulse" />
            <span>Suapan Langsung Markah ({cloudSubmissions.length})</span>
          </button>
        </div>
      </div>

      {/* Class Overview Statistics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pelajar Dinilai</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {statsSummary.totalStudents} <span className="text-xs font-normal text-slate-400">orang</span>
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Telah siapkan latihan</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Purata Ketepatan</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {statsSummary.averageAccuracy}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Gred: <span className="font-semibold text-emerald-400">{statsSummary.averageAccuracy >= 85 ? 'Mumtaz' : 'Jayyid Jiddan'}</span>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Jumlah Kuiz Siap</span>
            <BookOpen className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">
            {statsSummary.totalQuizzesDone}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Sesi latihan lengkap
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Penguasaan Subjek</span>
            <BarChart3 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-1 mt-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Tauhid:</span>
              <span className="font-bold text-emerald-400">{statsSummary.tauhidAvg}%</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Al-Firaq:</span>
              <span className="font-bold text-teal-400">{statsSummary.firaqAvg}%</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Mantiq:</span>
              <span className={`font-bold ${statsSummary.mantiqAvg < 75 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {statsSummary.mantiqAvg}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Differentiation & Filter Control Tabs */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* 3 Scope Buttons */}
          <div className="flex items-center p-1 bg-slate-950/80 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => {
                soundEffects.playClick();
                setSchoolFilterMode('my_school');
                setSelectedSpecificSchool('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                schoolFilterMode === 'my_school'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              <span>Pelajar Sekolah Saya</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                schoolFilterMode === 'my_school' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
              }`}>
                {enrichedStudents.filter((s) => isStudentFromTeacherSchool(s.schoolOrClass, teacherSchool)).length}
              </span>
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                setSchoolFilterMode('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                schoolFilterMode === 'all'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Semua Sekolah (Kebangsaan)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                schoolFilterMode === 'all' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
              }`}>
                {enrichedStudents.length}
              </span>
            </button>

            <button
              onClick={() => {
                soundEffects.playClick();
                setSchoolFilterMode('other_schools');
                setSelectedSpecificSchool('all');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                schoolFilterMode === 'other_schools'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Sekolah Luar</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                schoolFilterMode === 'other_schools' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
              }`}>
                {enrichedStudents.filter((s) => !isStudentFromTeacherSchool(s.schoolOrClass, teacherSchool)).length}
              </span>
            </button>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Susun:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              <option value="xp">Skor / XP Tertinggi</option>
              <option value="accuracy">Ketepatan Jawapan (%)</option>
              <option value="quizzes">Paling Banyak Latihan</option>
            </select>
          </div>
        </div>

        {/* Search and Secondary Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-slate-800/80">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pelajar atau kod kelas..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/70 border border-slate-700/80 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {schoolFilterMode === 'all' && (
            <div className="w-full sm:w-64">
              <select
                value={selectedSpecificSchool}
                onChange={(e) => setSelectedSpecificSchool(e.target.value)}
                className="w-full bg-slate-800/70 border border-slate-700/80 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Semua Nama Sekolah</option>
                {allUniqueSchools.map((sch) => (
                  <option key={sch} value={sch}>
                    {sch}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Student Roster Table / List */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Senarai Pelajar yang Telah Menyiapkan Latihan</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {filteredStudents.length} rekod dijumpai
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Klik pada nama pelajar untuk melihat sejarah perincian setiap kuiz, markah topik, dan topik yang perlu bimbingan.
            </p>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-300">Tiada pelajar dijumpai</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Sila ubah carian atau pilih tab "Semua Sekolah" untuk melihat rekod pelajar lain.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {filteredStudents.map((student, index) => {
              const isMyStudent = isStudentFromTeacherSchool(student.schoolOrClass, teacherSchool);

              // Calculate subject percentages
              const tauhidPct = student.subjectAccuracy.tauhid.answered > 0
                ? Math.round((student.subjectAccuracy.tauhid.correct / student.subjectAccuracy.tauhid.answered) * 100)
                : 0;
              const firaqPct = student.subjectAccuracy.firaq.answered > 0
                ? Math.round((student.subjectAccuracy.firaq.correct / student.subjectAccuracy.firaq.answered) * 100)
                : 0;
              const mantiqPct = student.subjectAccuracy.mantiq.answered > 0
                ? Math.round((student.subjectAccuracy.mantiq.correct / student.subjectAccuracy.mantiq.answered) * 100)
                : 0;

              // Accuracy category badge
              const isMumtaz = student.accuracy >= 85;
              const isJayyid = student.accuracy >= 70;

              return (
                <div
                  key={student.id}
                  onClick={() => {
                    soundEffects.playClick();
                    setSelectedStudentForDetail(student);
                  }}
                  className={`p-4 transition-colors hover:bg-slate-800/50 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isMyStudent ? 'bg-emerald-950/10' : ''
                  }`}
                >
                  {/* Student Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="text-xs font-extrabold text-slate-500 w-5 text-center">
                      #{index + 1}
                    </div>

                    <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xl shrink-0">
                      {student.avatar || '🧑‍🎓'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate hover:text-emerald-400 transition-colors">
                          {student.name}
                        </h4>
                        
                        {/* Differentiation Badge: My Student vs Other School */}
                        {isMyStudent ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold inline-flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            Pelajar Saya
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-medium">
                            Sekolah Luar
                          </span>
                        )}

                        {student.isCurrentUser && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            Peranti Ini
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 truncate">
                        <span className="truncate">{student.schoolOrClass}</span>
                        {student.classCode && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            {student.classCode}
                          </span>
                        )}
                        <span className="text-slate-600">•</span>
                        <span className="text-[11px] text-slate-500 shrink-0">{student.lastActive}</span>
                      </div>
                    </div>
                  </div>

                  {/* Student Stats & Performance Breakdown */}
                  <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pl-8 md:pl-0">
                    {/* Subject Mini Progress Bars */}
                    <div className="hidden lg:flex flex-col gap-1 w-32 text-[10px]">
                      <div className="flex justify-between text-slate-400">
                        <span>Tauhid</span>
                        <span className="font-semibold text-emerald-400">{tauhidPct}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Firaq</span>
                        <span className="font-semibold text-teal-400">{firaqPct}%</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Mantiq</span>
                        <span className={`font-semibold ${mantiqPct < 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {mantiqPct}%
                        </span>
                      </div>
                    </div>

                    {/* Quizzes Completed Counter */}
                    <div className="text-center">
                      <div className="text-xs text-slate-400">Latihan</div>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {student.quizzesCompleted} <span className="text-[10px] text-slate-500 font-normal">kuiz</span>
                      </div>
                    </div>

                    {/* Total XP Score */}
                    <div className="text-center min-w-[70px]">
                      <div className="text-xs text-slate-400">Skor (XP)</div>
                      <div className="text-sm font-extrabold text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>{student.totalXp}</span>
                      </div>
                    </div>

                    {/* Overall Accuracy */}
                    <div className="text-right min-w-[90px]">
                      <div className="text-xs text-slate-400">Ketepatan</div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className={`text-base font-extrabold ${
                          isMumtaz ? 'text-emerald-400' : isJayyid ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {student.accuracy}%
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full inline-block ${
                        isMumtaz
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : isJayyid
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}>
                        {isMumtaz ? 'Mumtaz' : isJayyid ? 'Jayyid Jiddan' : 'Bimbingan'}
                      </span>
                    </div>

                    {/* Action Arrow */}
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student Detailed Performance & History Modal */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
                  {selectedStudentForDetail.avatar || '🧑‍🎓'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      {selectedStudentForDetail.name}
                    </h3>
                    {isStudentFromTeacherSchool(selectedStudentForDetail.schoolOrClass, teacherSchool) ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                        Pelajar Saya
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium border border-slate-700">
                        Sekolah Luar
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedStudentForDetail.schoolOrClass} {selectedStudentForDetail.classCode ? `(${selectedStudentForDetail.classCode})` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60 text-center">
                  <span className="text-[11px] text-slate-400 block">Jumlah Skor XP</span>
                  <span className="text-xl font-extrabold text-amber-400 mt-0.5 block">
                    {selectedStudentForDetail.totalXp} XP
                  </span>
                  <span className="text-[10px] text-slate-500">Tahap {selectedStudentForDetail.level}</span>
                </div>

                <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60 text-center">
                  <span className="text-[11px] text-slate-400 block">Kadar Ketepatan</span>
                  <span className="text-xl font-extrabold text-emerald-400 mt-0.5 block">
                    {selectedStudentForDetail.accuracy}%
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {selectedStudentForDetail.correctAnswersCount}/{selectedStudentForDetail.totalQuestionsAnswered} betul
                  </span>
                </div>

                <div className="bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60 text-center">
                  <span className="text-[11px] text-slate-400 block">Latihan Disiapkan</span>
                  <span className="text-xl font-extrabold text-teal-400 mt-0.5 block">
                    {selectedStudentForDetail.quizzesCompleted} Kuiz
                  </span>
                  <span className="text-[10px] text-slate-500">{selectedStudentForDetail.streakDays} hari aktif</span>
                </div>
              </div>

              {/* Subject Mastery Breakdown */}
              <div className="bg-slate-800/40 rounded-2xl p-4 border border-slate-800">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Kadar Penguasaan Mengikut Subjek</span>
                </h4>

                <div className="space-y-3">
                  {/* Tauhid */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-white">Subjek Tauhid (التوحيد)</span>
                      <span className="font-bold text-emerald-400">
                        {selectedStudentForDetail.subjectAccuracy.tauhid.answered > 0
                          ? Math.round((selectedStudentForDetail.subjectAccuracy.tauhid.correct / selectedStudentForDetail.subjectAccuracy.tauhid.answered) * 100)
                          : 0}%
                        <span className="text-slate-500 font-normal ml-1">
                          ({selectedStudentForDetail.subjectAccuracy.tauhid.correct}/{selectedStudentForDetail.subjectAccuracy.tauhid.answered})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${selectedStudentForDetail.subjectAccuracy.tauhid.answered > 0 ? (selectedStudentForDetail.subjectAccuracy.tauhid.correct / selectedStudentForDetail.subjectAccuracy.tauhid.answered) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Firaq */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-white">Subjek Al-Firaq (الفرق الإسلامية)</span>
                      <span className="font-bold text-teal-400">
                        {selectedStudentForDetail.subjectAccuracy.firaq.answered > 0
                          ? Math.round((selectedStudentForDetail.subjectAccuracy.firaq.correct / selectedStudentForDetail.subjectAccuracy.firaq.answered) * 100)
                          : 0}%
                        <span className="text-slate-500 font-normal ml-1">
                          ({selectedStudentForDetail.subjectAccuracy.firaq.correct}/{selectedStudentForDetail.subjectAccuracy.firaq.answered})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-500 rounded-full"
                        style={{
                          width: `${selectedStudentForDetail.subjectAccuracy.firaq.answered > 0 ? (selectedStudentForDetail.subjectAccuracy.firaq.correct / selectedStudentForDetail.subjectAccuracy.firaq.answered) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Mantiq */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-white">Subjek Mantiq (المنطق)</span>
                      <span className="font-bold text-indigo-400">
                        {selectedStudentForDetail.subjectAccuracy.mantiq.answered > 0
                          ? Math.round((selectedStudentForDetail.subjectAccuracy.mantiq.correct / selectedStudentForDetail.subjectAccuracy.mantiq.answered) * 100)
                          : 0}%
                        <span className="text-slate-500 font-normal ml-1">
                          ({selectedStudentForDetail.subjectAccuracy.mantiq.correct}/{selectedStudentForDetail.subjectAccuracy.mantiq.answered})
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${selectedStudentForDetail.subjectAccuracy.mantiq.answered > 0 ? (selectedStudentForDetail.subjectAccuracy.mantiq.correct / selectedStudentForDetail.subjectAccuracy.mantiq.answered) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Weak Topics Intervention Alert if any */}
              {selectedStudentForDetail.weakTopics && selectedStudentForDetail.weakTopics.length > 0 && (
                <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-amber-300">
                      Cadangan Intervensi Guru (Topik Perlu Bimbingan):
                    </h5>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedStudentForDetail.weakTopics.map((top, i) => (
                        <span key={i} className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 text-amber-200 text-[10px] rounded-lg">
                          {top}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Individual Completed Exercises / Quizzes History */}
              <div>
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>Sejarah Latihan & Kuiz yang Telah Disiapkan</span>
                </h4>

                {selectedStudentForDetail.quizHistory && selectedStudentForDetail.quizHistory.length > 0 ? (
                  <div className="space-y-2">
                    {selectedStudentForDetail.quizHistory.map((hist) => {
                      const isPerfect = hist.score === hist.totalQuestions;
                      return (
                        <div
                          key={hist.id}
                          className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                hist.subject === 'tauhid'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : hist.subject === 'firaq'
                                  ? 'bg-teal-500/20 text-teal-300'
                                  : hist.subject === 'mantiq'
                                  ? 'bg-indigo-500/20 text-indigo-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {hist.subject}
                              </span>
                              <h5 className="text-xs font-bold text-white truncate">
                                {hist.quizTitle}
                              </h5>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                              <span>{hist.completedAt}</span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {Math.floor(hist.timeSpentSeconds / 60)}m {hist.timeSpentSeconds % 60}s
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-white">
                              Skor: <span className="text-emerald-400">{hist.score}</span> / {hist.totalQuestions}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Ketepatan: <span className="font-semibold text-amber-400">{hist.accuracy}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 text-center bg-slate-800/30 rounded-xl">
                    Tiada rekod kuiz terperinci direkodkan untuk pelajar ini lagi.
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
              <button
                onClick={() => setSelectedStudentForDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Tutup Paparan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Daftar / Rekod Markah Pelajar Baharu</span>
              </h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualStudent} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Penuh Pelajar *</label>
                <input
                  type="text"
                  required
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Contoh: Muhammad Syamil"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sekolah</label>
                  <input
                    type="text"
                    value={newStudentSchool}
                    onChange={(e) => setNewStudentSchool(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kod / Nama Kelas</label>
                  <input
                    type="text"
                    value={newStudentClass}
                    onChange={(e) => setNewStudentClass(e.target.value)}
                    placeholder="Contoh: STAM-6A"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <label className="block text-slate-300 font-semibold mb-2">Markah Penguasaan Subjek (%)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Tauhid (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newStudentTauhidScore}
                      onChange={(e) => setNewStudentTauhidScore(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Al-Firaq (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newStudentFiraqScore}
                      onChange={(e) => setNewStudentFiraqScore(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Mantiq (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newStudentMantiqScore}
                      onChange={(e) => setNewStudentMantiqScore(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 rounded-xl font-semibold hover:bg-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl hover:bg-emerald-400"
                >
                  Simpan Pelajar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Feed Modal for Firebase Cloud Submissions */}
      {showLiveFeedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Suapan Langsung Markah Pelajar</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/90 text-emerald-300 font-bold border border-emerald-500/40">
                      Firebase Cloud
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Keputusan terkini dihantar oleh calon STAM dari pelbagai peranti & sekolah
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowLiveFeedModal(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cloudSubmissions && cloudSubmissions.length > 0 ? (
                cloudSubmissions.map((sub, idx) => {
                  const dateStr = sub.completedAt ? new Date(sub.completedAt).toLocaleString('ms-MY', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : 'Baru tadi';

                  const isMumtaz = sub.accuracy >= 85;
                  const isJayyid = sub.accuracy >= 65 && sub.accuracy < 85;

                  return (
                    <div
                      key={sub.id || idx}
                      className="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/60 hover:border-slate-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-700/60 border border-slate-600 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0 mt-0.5">
                          {sub.studentName ? sub.studentName.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white">{sub.studentName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                              {sub.schoolOrClass || 'Umum'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 font-medium mt-1">
                            {sub.quizTitle}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {dateStr}
                            </span>
                            <span className="uppercase text-[10px] font-bold text-teal-400">
                              {sub.subject}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-700/60 shrink-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-extrabold text-white">
                            {sub.score}/{sub.totalQuestions}
                          </span>
                          <span className={`text-xs font-bold ${isMumtaz ? 'text-emerald-400' : isJayyid ? 'text-teal-400' : 'text-amber-400'}`}>
                            ({sub.accuracy}%)
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1 mt-0.5">
                          <Sparkles className="w-3 h-3" />
                          +{sub.xpEarned} XP
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 px-4">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
                    <Radio className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Belum Ada Keputusan Kuiz Baharu
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Pangkalan data Firestore sedang bersiap sedia. Apabila mana-mana pelajar menamatkan kuiz pada peranti mereka dan klik simpan, keputusan mereka akan dipaparkan di sini secara serta-merta!
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowLiveFeedModal(false)}
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

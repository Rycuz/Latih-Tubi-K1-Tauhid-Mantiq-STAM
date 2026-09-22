import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  SubjectId, 
  UserStats, 
  Badge, 
  QuestionAttempt, 
  Question,
  LeaderboardUser,
  StudentRecord,
  StudentQuizHistory,
  TopicInfo
} from './types';
import { QUESTIONS_DATA, TOPICS_DATA } from './data/questions';
import { INITIAL_BADGES } from './data/badges';
import { INITIAL_LEADERBOARD } from './data/leaderboard';
import { INITIAL_STUDENTS_ROSTER } from './data/studentsData';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { SubjectPracticeView } from './components/SubjectPracticeView';
import { GroupChallengeView } from './components/GroupChallengeView';
import { LeaderboardView } from './components/LeaderboardView';
import { AnalyticsView } from './components/AnalyticsView';
import { BadgesView } from './components/BadgesView';
import { QuizModal } from './components/QuizModal';
import { TeacherQuestionManagerModal } from './components/TeacherQuestionManagerModal';
import { StudentProfileModal, StudentProfileData } from './components/StudentProfileModal';
import { soundEffects } from './utils/audio';
import { sanitizeQuestion } from './utils/sanitizeText';
import { 
  subscribeToCloudStudents, 
  subscribeToCloudSubmissions, 
  CloudQuizSubmission,
  saveCurriculumToFirebase,
  subscribeToCloudCurriculum,
  deleteStudentFromFirebase,
  deleteQuizSubmissionFromFirebase,
  updateStudentProfileInFirebase
} from './lib/firebase';

const STORAGE_KEY_STATS = 'al_dirasat_stats_v1';
const STORAGE_KEY_BADGES = 'al_dirasat_badges_v1';
const STORAGE_KEY_QUESTIONS = 'al_dirasat_custom_questions_v6';
const STORAGE_KEY_DELETED_QUESTION_IDS = 'al_dirasat_deleted_question_ids_v1';
const STORAGE_KEY_TRASH_QUESTIONS = 'al_dirasat_trash_questions_v1';
const STORAGE_KEY_STUDENTS = 'stam_students_roster_v3';
const STORAGE_KEY_TOPICS = 'al_dirasat_custom_topics_v3';

const DEFAULT_STATS: UserStats = {
  totalXp: 0,
  level: 1,
  streak: 0,
  lastActiveDate: new Date().toISOString().split('T')[0],
  quizzesCompleted: 0,
  totalQuestionsAnswered: 0,
  correctAnswersCount: 0,
  subjectAccuracy: {
    tauhid: { answered: 0, correct: 0 },
    firaq: { answered: 0, correct: 0 },
    mantiq: { answered: 0, correct: 0 },
  },
  topicPerformance: {},
  bookmarkedQuestionIds: [],
  history: [],
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('practice');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [languageMode, setLanguageMode] = useState<'bilingual' | 'arabic' | 'malay'>('bilingual');

  // Persistent User Stats
  const [stats, setStats] = useState<UserStats>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return DEFAULT_STATS;
  });

  // Persistent Badges
  const [badges, setBadges] = useState<Badge[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BADGES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_BADGES;
  });

  // Student Profile State (Mandatory before accessing app, editable anytime)
  const [studentProfile, setStudentProfile] = useState<StudentProfileData>(() => {
    try {
      const storedId = localStorage.getItem('stam_student_id') || '';
      const storedName = localStorage.getItem('stam_student_name') || '';
      const storedSchool = localStorage.getItem('stam_student_school') || '';
      const storedClass = localStorage.getItem('stam_student_class') || '';
      return {
        studentId: storedId || (storedName ? `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` : ''),
        name: storedName,
        school: storedSchool,
        studentClass: storedClass,
      };
    } catch {
      return { studentId: '', name: '', school: '', studentClass: '' };
    }
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Check if student profile is incomplete (requires mandatory onboarding before using the app)
  const isMandatoryProfileMissing = !studentProfile.name.trim() || !studentProfile.school.trim() || !studentProfile.studentClass.trim();

  const handleSaveStudentProfile = async (updated: StudentProfileData) => {
    const studentId = updated.studentId || studentProfile.studentId || `std-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cleanName = updated.name.trim();
    const cleanSchool = updated.school.trim();
    const cleanClass = updated.studentClass.trim();

    try {
      localStorage.setItem('stam_student_id', studentId);
      localStorage.setItem('stam_student_name', cleanName);
      localStorage.setItem('stam_student_school', cleanSchool);
      localStorage.setItem('stam_student_class', cleanClass);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    setStudentProfile({
      studentId,
      name: cleanName,
      school: cleanSchool,
      studentClass: cleanClass,
    });

    // Update in Firebase so any past submissions or teacher dashboard records immediately reflect the real name
    try {
      await updateStudentProfileInFirebase({
        studentId,
        newName: cleanName,
        newSchoolOrClass: cleanClass ? `${cleanSchool} (${cleanClass})` : cleanSchool,
      });
    } catch (fbErr) {
      console.warn('Non-blocking cloud profile update notice:', fbErr);
    }

    setIsProfileModalOpen(false);
  };

  // Active Quiz State
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[] | null>(null);
  const [activeQuizTitle, setActiveQuizTitle] = useState<string>('');
  const [activeQuizInitialIndex, setActiveQuizInitialIndex] = useState<number>(0);
  const [activeQuizReviewMode, setActiveQuizReviewMode] = useState<boolean>(false);
  const [activeQuizIsRandomSet, setActiveQuizIsRandomSet] = useState<boolean>(false);

  // Teacher / Admin Question Management State
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState<boolean>(false);
  const [allQuestions, setAllQuestions] = useState<Question[]>(() => {
    try {
      // Clear legacy storage keys
      localStorage.removeItem('al_dirasat_custom_questions_v1');
      localStorage.removeItem('al_dirasat_custom_questions_v2');
      localStorage.removeItem('al_dirasat_custom_questions_v3');
      localStorage.removeItem('al_dirasat_custom_questions_v4');

      const officialMap = new Map(QUESTIONS_DATA.map((q) => [q.id, q]));
      const saved = localStorage.getItem(STORAGE_KEY_QUESTIONS);
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_QUESTION_IDS);
      let deletedIds = new Set<string>();
      if (savedDeleted) {
        try {
          const parsedDeleted = JSON.parse(savedDeleted);
          if (Array.isArray(parsedDeleted)) {
            deletedIds = new Set(parsedDeleted);
          }
        } catch {
          // ignore
        }
      }
      let parsed: Question[] = [];

      if (saved) {
        try {
          parsed = JSON.parse(saved);
        } catch {
          // ignore
        }
      } else {
        // Migration from v5
        const v5Saved = localStorage.getItem('al_dirasat_custom_questions_v5');
        if (v5Saved) {
          try {
            parsed = JSON.parse(v5Saved);
          } catch {
            // ignore
          }
          localStorage.removeItem('al_dirasat_custom_questions_v5');
        }
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge with official questions: use official questions as base structure,
        // but preserve user-edited translations, options, explanations, and difficulty
        const merged = parsed.map((q) => {
          const official = officialMap.get(q.id);
          if (official) {
            const hasDiagramType = q.diagramType !== undefined;
            const hasDiagramArabic = q.diagramArabic !== undefined;
            const res: Question = {
              ...official,
              ...q,
              diagramType: hasDiagramType ? q.diagramType : (hasDiagramArabic && !q.diagramArabic ? 'none' : official.diagramType),
              diagramArabic: hasDiagramArabic ? q.diagramArabic : (hasDiagramType && q.diagramType === 'none' ? '' : official.diagramArabic),
              options: Array.isArray(q.options) && q.options.length > 0
                ? q.options.map((opt, idx) => ({
                    ...(official.options[idx] || {}),
                    ...opt,
                  }))
                : official.options,
            };
            if (res.id === 'tauhid-k1-090' || res.id === 'tauhid-k1-091') {
              res.diagramType = 'none';
              res.diagramArabic = '';
            }
            return res;
          }
          const sanitized = sanitizeQuestion(q);
          if (sanitized.id === 'tauhid-k1-090' || sanitized.id === 'tauhid-k1-091') {
            sanitized.diagramType = 'none';
            sanitized.diagramArabic = '';
          }
          return sanitized;
        });

        // Filter out questions that user explicitly deleted
        const filteredMerged = merged.filter((q) => !deletedIds.has(q.id));

        // Ensure any newly added official questions are present, unless explicitly deleted
        const existingIds = new Set(filteredMerged.map((q) => q.id));
        for (const official of QUESTIONS_DATA) {
          if (!existingIds.has(official.id) && !deletedIds.has(official.id)) {
            filteredMerged.push(official);
          }
        }

        try {
          localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(filteredMerged));
        } catch {
          // ignore
        }
        return filteredMerged;
      }
    } catch {
      // fallback
    }
    return QUESTIONS_DATA.map(sanitizeQuestion);
  });

  // Recycle Bin / Trash Questions State
  const [deletedQuestions, setDeletedQuestions] = useState<Question[]>(() => {
    try {
      const savedTrash = localStorage.getItem(STORAGE_KEY_TRASH_QUESTIONS);
      if (savedTrash) {
        const parsed = JSON.parse(savedTrash);
        if (Array.isArray(parsed)) return parsed.map(sanitizeQuestion);
      }
      // If no trash stored yet, populate from deletedIds and QUESTIONS_DATA
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_QUESTION_IDS);
      if (savedDeleted) {
        const ids = JSON.parse(savedDeleted);
        if (Array.isArray(ids)) {
          const offMap = new Map(QUESTIONS_DATA.map((q) => [q.id, q]));
          const fallbackTrash: Question[] = [];
          for (const id of ids) {
            const found = offMap.get(id);
            if (found) fallbackTrash.push(found);
          }
          return fallbackTrash;
        }
      }
    } catch {
      // fallback
    }
    return [];
  });

  // Students Roster & Performance History State
  const [students, setStudents] = useState<StudentRecord[]>(() => {
    try {
      // Clear legacy storage keys containing mock students
      localStorage.removeItem('stam_students_roster_v1');
      localStorage.removeItem('stam_students_roster_v2');

      const saved = localStorage.getItem(STORAGE_KEY_STUDENTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Retain only real students, discarding mock ids
          const realOnly = parsed.filter(
            (s: StudentRecord) => !s.id.startsWith('std-00') && s.id !== 'std-current-user'
          );
          if (realOnly.length > 0) return realOnly;
        }
      }
    } catch {
      // fallback
    }
    return INITIAL_STUDENTS_ROSTER;
  });

  const handleAddStudent = (newStudent: StudentRecord) => {
    setStudents((prev) => [newStudent, ...prev]);
  };

  const handleClearDemoStudents = () => {
    setStudents((prev) => {
      const filtered = prev.filter(
        (s) => !s.id.startsWith('std-00') && s.id !== 'std-current-user'
      );
      try {
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(filtered));
      } catch {
        // ignore
      }
      return filtered;
    });
  };

  const handleDeleteStudent = async (studentId: string) => {
    // 1. Delete student & associated submissions from Firebase
    await deleteStudentFromFirebase(studentId);

    // 2. Remove from local state
    setStudents((prev) => {
      const filtered = prev.filter((s) => s.id !== studentId);
      try {
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(filtered));
      } catch {
        // ignore
      }
      return filtered;
    });

    // 3. Remove student's submissions from local state
    setCloudSubmissions((prev) => prev.filter((sub) => sub.studentId !== studentId));
  };

  const handleDeleteSubmission = async (submissionId: string, studentId?: string) => {
    // 1. Delete submission from Firebase
    await deleteQuizSubmissionFromFirebase(submissionId, studentId);

    // 2. Remove from local cloudSubmissions state
    setCloudSubmissions((prev) => prev.filter((sub) => sub.id !== submissionId));

    // 3. If studentId provided, update the student's local quiz history
    if (studentId) {
      setStudents((prev) => {
        const updated = prev.map((s) => {
          if (s.id !== studentId) return s;
          const updatedHistory = (s.quizHistory || []).filter((h) => h.id !== submissionId);
          const totalQ = updatedHistory.reduce((acc, h) => acc + h.totalQuestions, 0);
          const correctQ = updatedHistory.reduce((acc, h) => acc + h.score, 0);
          const totalXp = updatedHistory.reduce((acc, h) => acc + h.xpEarned, 0);
          const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
          return {
            ...s,
            quizHistory: updatedHistory,
            quizzesCompleted: updatedHistory.length,
            totalQuestionsAnswered: totalQ,
            correctAnswersCount: correctQ,
            totalXp,
            accuracy,
          };
        });
        try {
          localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  };

  // Real-time Cloud Submissions & Students via Firebase Firestore
  const [cloudSubmissions, setCloudSubmissions] = useState<CloudQuizSubmission[]>([]);

  useEffect(() => {
    const unsubStudents = subscribeToCloudStudents((cloudStudents) => {
      if (cloudStudents) {
        setStudents((prev) => {
          const cloudIds = new Set(cloudStudents.map((s) => s.id));
          // Keep only real cloud students, plus any purely local manual additions
          const manualOnly = prev
            .filter((s) => !s.id.startsWith('std-00') && s.id !== 'std-current-user')
            .filter((s) => !cloudIds.has(s.id) && s.id.startsWith('std-manual-'));
          const merged = [...cloudStudents, ...manualOnly];
          try {
            localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      }
    });

    const unsubSubmissions = subscribeToCloudSubmissions((subs) => {
      setCloudSubmissions(subs);
    });

    // Real-time listener for questions & topics from Firebase Firestore (Cloud Curriculum)
    // Ensures questions added & translations edited in Teacher Mode immediately reflect on all devices
    const unsubCurriculum = subscribeToCloudCurriculum({
      onQuestions: (cloudQuestions) => {
        if (Array.isArray(cloudQuestions) && cloudQuestions.length > 0) {
          const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_QUESTION_IDS);
          let deletedIds = new Set<string>();
          if (savedDeleted) {
            try {
              const parsedDeleted = JSON.parse(savedDeleted);
              if (Array.isArray(parsedDeleted)) {
                deletedIds = new Set(parsedDeleted);
              }
            } catch {
              // ignore
            }
          }

          const officialMap = new Map(QUESTIONS_DATA.map((q) => [q.id, q]));
          const merged = cloudQuestions.map((q) => {
            const official = officialMap.get(q.id);
            if (official) {
              const hasDiagramType = q.diagramType !== undefined;
              const hasDiagramArabic = q.diagramArabic !== undefined;
              const res: Question = {
                ...official,
                ...q,
                diagramType: hasDiagramType ? q.diagramType : (hasDiagramArabic && !q.diagramArabic ? 'none' : official.diagramType),
                diagramArabic: hasDiagramArabic ? q.diagramArabic : (hasDiagramType && q.diagramType === 'none' ? '' : official.diagramArabic),
                options: Array.isArray(q.options) && q.options.length > 0
                  ? q.options.map((opt, idx) => ({
                      ...(official.options[idx] || {}),
                      ...opt,
                    }))
                  : official.options,
              };
              if (res.id === 'tauhid-k1-090' || res.id === 'tauhid-k1-091') {
                res.diagramType = 'none';
                res.diagramArabic = '';
              }
              return res;
            }
            const sanitized = sanitizeQuestion(q);
            if (sanitized.id === 'tauhid-k1-090' || sanitized.id === 'tauhid-k1-091') {
              sanitized.diagramType = 'none';
              sanitized.diagramArabic = '';
            }
            return sanitized;
          });

          // Filter out questions that user explicitly deleted
          const filteredMerged = merged.filter((q) => !deletedIds.has(q.id));

          // Ensure official questions not present in cloud are preserved, unless explicitly deleted
          const existingIds = new Set(filteredMerged.map((q) => q.id));
          for (const official of QUESTIONS_DATA) {
            if (!existingIds.has(official.id) && !deletedIds.has(official.id)) {
              filteredMerged.push(official);
            }
          }

          setAllQuestions(filteredMerged);
          try {
            localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(filteredMerged));
          } catch {
            // ignore
          }
        }
      },
      onTopics: (cloudTopics) => {
        if (Array.isArray(cloudTopics) && cloudTopics.length > 0) {
          setTopics(cloudTopics);
          try {
            localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(cloudTopics));
          } catch {
            // ignore
          }
        }
      },
    });

    return () => {
      unsubStudents();
      unsubSubmissions();
      unsubCurriculum();
    };
  }, []);

  // Topics State (Customizable via Teacher Mode)
  const [topics, setTopics] = useState<TopicInfo[]>(() => {
    try {
      // Clear legacy topics keys v1 & v2 so the official 29 topics (with clean Arabic titles) load
      localStorage.removeItem('al_dirasat_custom_topics_v1');
      localStorage.removeItem('al_dirasat_custom_topics_v2');

      const saved = localStorage.getItem(STORAGE_KEY_TOPICS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return TOPICS_DATA;
  });

  const handleSaveTopics = (updatedTopics: TopicInfo[]) => {
    setTopics(updatedTopics);
    try {
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(updatedTopics));
    } catch (err) {
      console.error('Failed to save topics to local storage', err);
    }
    saveCurriculumToFirebase(allQuestions, updatedTopics).catch((err) => {
      console.warn('Failed to sync topics to cloud:', err);
    });
  };

  const handleResetTopicsToDefault = () => {
    setTopics(TOPICS_DATA);
    try {
      localStorage.removeItem(STORAGE_KEY_TOPICS);
    } catch (err) {
      console.error('Failed to reset topics', err);
    }
    saveCurriculumToFirebase(allQuestions, TOPICS_DATA).catch((err) => {
      console.warn('Failed to reset topics in cloud:', err);
    });
  };

  const handleUpdateTopicTitleInQuestions = (topicId: string, newTitleMalay: string, newTitleArabic: string) => {
    setAllQuestions((prev) => {
      const updated = prev.map((q) => {
        if (q.topicId === topicId) {
          return {
            ...q,
            topicTitleMalay: newTitleMalay,
            topicTitleArabic: newTitleArabic,
          };
        }
        return q;
      });
      try {
        localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(updated));
      } catch {
        // ignore
      }
      saveCurriculumToFirebase(updated, topics).catch((err) => {
        console.warn('Failed to sync updated topic titles to cloud:', err);
      });
      return updated;
    });
  };

  const handleSaveCustomQuestions = (updatedQuestions: Question[], deletedId?: string) => {
    // If a specific question was deleted, track it in deletedQuestions (Recycle Bin)
    if (deletedId) {
      const deletedObj = allQuestions.find((q) => q.id === deletedId);
      if (deletedObj) {
        setDeletedQuestions((prev) => {
          const next = [deletedObj, ...prev.filter((q) => q.id !== deletedId)];
          try {
            localStorage.setItem(STORAGE_KEY_TRASH_QUESTIONS, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
    }

    let currentDeleted = new Set<string>();
    try {
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_QUESTION_IDS);
      if (savedDeleted) {
        const parsed = JSON.parse(savedDeleted);
        if (Array.isArray(parsed)) {
          currentDeleted = new Set(parsed);
        }
      }
    } catch {
      // ignore
    }

    if (deletedId) {
      currentDeleted.add(deletedId);
    }

    // Also compare with official questions: any official question absent from updatedQuestions is recorded as deleted
    const updatedIds = new Set(updatedQuestions.map((q) => q.id));
    for (const off of QUESTIONS_DATA) {
      if (!updatedIds.has(off.id)) {
        currentDeleted.add(off.id);
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY_DELETED_QUESTION_IDS, JSON.stringify(Array.from(currentDeleted)));
    } catch {
      // ignore
    }

    setAllQuestions(updatedQuestions);
    try {
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(updatedQuestions));
    } catch (err) {
      console.error('Failed to save questions to local storage', err);
    }
    // Save to Firebase Firestore cloud so that all students and devices in Normal Mode get the latest updates
    saveCurriculumToFirebase(updatedQuestions, topics).catch((err) => {
      console.warn('Failed to sync questions to cloud:', err);
    });
  };

  // Restore a question from Recycle Bin back into active questions list
  const handleRestoreQuestion = (questionToRestore: Question) => {
    // Remove from deleted registry
    let currentDeleted = new Set<string>();
    try {
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_QUESTION_IDS);
      if (savedDeleted) {
        const parsed = JSON.parse(savedDeleted);
        if (Array.isArray(parsed)) currentDeleted = new Set(parsed);
      }
    } catch {
      // ignore
    }
    currentDeleted.delete(questionToRestore.id);
    try {
      localStorage.setItem(STORAGE_KEY_DELETED_QUESTION_IDS, JSON.stringify(Array.from(currentDeleted)));
    } catch {
      // ignore
    }

    // Remove from Recycle Bin
    setDeletedQuestions((prev) => {
      const next = prev.filter((q) => q.id !== questionToRestore.id);
      try {
        localStorage.setItem(STORAGE_KEY_TRASH_QUESTIONS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    // Re-insert into active questions
    const nextQuestions = [...allQuestions, questionToRestore];
    setAllQuestions(nextQuestions);
    try {
      localStorage.setItem(STORAGE_KEY_QUESTIONS, JSON.stringify(nextQuestions));
    } catch {
      // ignore
    }

    // Sync back to Firebase Firestore cloud
    saveCurriculumToFirebase(nextQuestions, topics).catch((err) => {
      console.warn('Failed to sync restored question to cloud:', err);
    });
  };

  // Permanently delete a question from the Recycle Bin
  const handlePermanentlyDeleteQuestion = (questionId: string) => {
    setDeletedQuestions((prev) => {
      const next = prev.filter((q) => q.id !== questionId);
      try {
        localStorage.setItem(STORAGE_KEY_TRASH_QUESTIONS, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    // Ensure it stays in deletedIds so it is never re-added
    try {
      const savedDeleted = localStorage.getItem(STORAGE_KEY_DELETED_QUESTION_IDS);
      let currentDeleted = new Set<string>();
      if (savedDeleted) {
        const parsed = JSON.parse(savedDeleted);
        if (Array.isArray(parsed)) currentDeleted = new Set(parsed);
      }
      currentDeleted.add(questionId);
      localStorage.setItem(STORAGE_KEY_DELETED_QUESTION_IDS, JSON.stringify(Array.from(currentDeleted)));
    } catch {
      // ignore
    }
  };

  // Permanently empty all questions in the Recycle Bin
  const handleEmptyTrash = () => {
    setDeletedQuestions([]);
    try {
      localStorage.removeItem(STORAGE_KEY_TRASH_QUESTIONS);
    } catch {
      // ignore
    }
  };

  const handleSyncCurriculumToCloud = async () => {
    return await saveCurriculumToFirebase(allQuestions, topics);
  };

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(stats));
    } catch {
      // ignore
    }
  }, [stats]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BADGES, JSON.stringify(badges));
    } catch {
      // ignore
    }
  }, [badges]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
    } catch {
      // ignore
    }
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TOPICS, JSON.stringify(topics));
    } catch {
      // ignore
    }
  }, [topics]);

  // Audio mute/unmute sync
  useEffect(() => {
    soundEffects.enabled = soundEnabled;
  }, [soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => !prev);
  };

  const handleToggleBookmark = (questionId: string) => {
    soundEffects.playClick();
    setStats((prev) => {
      const isBookmarked = prev.bookmarkedQuestionIds.includes(questionId);
      const updated = isBookmarked
        ? prev.bookmarkedQuestionIds.filter((id) => id !== questionId)
        : [...prev.bookmarkedQuestionIds, questionId];
      return {
        ...prev,
        bookmarkedQuestionIds: updated,
      };
    });
  };

  // Launch Quiz Helper
  const handleStartQuiz = (
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
  ) => {
    const isRandom = Boolean(
      options?.isRandomSet ||
      (options?.customTitle && options.customTitle.toLowerCase().includes('rawak')) ||
      options?.shuffle
    );
    setActiveQuizIsRandomSet(isRandom);

    // If a pre-constructed custom set of questions is provided (e.g. random sets)
    if (options?.customQuestions && options.customQuestions.length > 0) {
      setActiveQuizTitle(options.customTitle || 'Set Soalan Rawak');
      setActiveQuizQuestions(options.customQuestions);
      setActiveQuizInitialIndex(options?.startIndex ?? 0);
      setActiveQuizReviewMode(options?.reviewMode ?? false);
      return;
    }

    let pool = [...allQuestions];

    if (options?.singleQuestionId) {
      const single = pool.find((q) => q.id === options.singleQuestionId);
      if (single) {
        setActiveQuizTitle(`Semakan ${single.topicTitleMalay}`);
        setActiveQuizQuestions([single]);
        setActiveQuizInitialIndex(0);
        setActiveQuizReviewMode(options.reviewMode ?? false);
        return;
      }
    }

    if (topicId) {
      const topicObj = topics.find((t) => t.id === topicId);
      pool = pool.filter((q) => {
        if (q.topicId === topicId) return true;
        if (topicObj) {
          if (q.subject !== topicObj.subject) return false;
          const normQ = (q.topicId || '').trim().toLowerCase().replace(/[-_\s]/g, '');
          const normT = (topicObj.id || '').trim().toLowerCase().replace(/[-_\s]/g, '');
          if (normQ && normT && normQ === normT) return true;
          if (q.topicTitleMalay && topicObj.titleMalay && q.topicTitleMalay.trim().toLowerCase() === topicObj.titleMalay.trim().toLowerCase()) return true;
          if (q.topicTitleArabic && topicObj.titleArabic && q.topicTitleArabic.trim() === topicObj.titleArabic.trim()) return true;
        }
        return false;
      });
    } else if (subjectId) {
      pool = pool.filter((q) => q.subject === subjectId);
    }

    const shouldShuffle = options?.shuffle ?? false;
    const selected = shouldShuffle
      ? [...pool].sort(() => 0.5 - Math.random()).slice(0, customCount || Math.min(pool.length, 10))
      : customCount
      ? pool.slice(0, customCount)
      : pool;

    const title = topicId
      ? selected[0]?.topicTitleMalay || 'Latihan Topik'
      : subjectId
      ? subjectId === 'tauhid'
        ? 'Latihan Subjek Tauhid'
        : subjectId === 'firaq'
        ? 'Latihan Subjek Al-Firaq'
        : 'Latihan Subjek Mantiq'
      : 'Kuiz Pantas Campuran';

    setActiveQuizTitle(title);
    setActiveQuizQuestions(selected);
    setActiveQuizInitialIndex(options?.startIndex ?? 0);
    setActiveQuizReviewMode(options?.reviewMode ?? false);
  };

  const handleOpenBookmarkedQuiz = () => {
    const bookmarkedQuestions = allQuestions.filter((q) =>
      stats.bookmarkedQuestionIds.includes(q.id)
    );
    if (bookmarkedQuestions.length === 0) return;
    setActiveQuizTitle('Semakan Soalan Simpanan');
    setActiveQuizQuestions(bookmarkedQuestions);
  };

  const handleFinishQuiz = (results: {
    score: number;
    total: number;
    xpEarned: number;
    attempts: QuestionAttempt[];
    isReviewOnly?: boolean;
  }) => {
    if (results.isReviewOnly) {
      // Mod Skema: Jangan simpan sebarang markah atau statistik cubaan, tutup modal serta-merta
      setActiveQuizQuestions(null);
      return;
    }

    const newTotalXp = stats.totalXp + results.xpEarned;
    const newLevel = Math.floor(newTotalXp / 100) + 1;

    setStats((prev) => {
      const updatedSubAccuracy = { ...prev.subjectAccuracy };
      const updatedTopicPerformance = { ...prev.topicPerformance };

      results.attempts.forEach((att) => {
        // Subject accuracy
        const sub = att.subject;
        updatedSubAccuracy[sub] = {
          answered: updatedSubAccuracy[sub].answered + 1,
          correct: updatedSubAccuracy[sub].correct + (att.isCorrect ? 1 : 0),
        };

        // Topic performance
        const topId = att.topicId;
        const currentTop = updatedTopicPerformance[topId] || { answered: 0, correct: 0 };
        updatedTopicPerformance[topId] = {
          answered: currentTop.answered + 1,
          correct: currentTop.correct + (att.isCorrect ? 1 : 0),
        };
      });

      return {
        ...prev,
        totalXp: newTotalXp,
        level: newLevel,
        quizzesCompleted: prev.quizzesCompleted + 1,
        totalQuestionsAnswered: prev.totalQuestionsAnswered + results.total,
        correctAnswersCount: prev.correctAnswersCount + results.score,
        subjectAccuracy: updatedSubAccuracy,
        topicPerformance: updatedTopicPerformance,
        history: [...results.attempts, ...prev.history].slice(0, 50),
      };
    });

    // Check Badges Progress & Unlock triggers
    setBadges((prevBadges) => {
      return prevBadges.map((badge) => {
        if (badge.unlocked) return badge;

        let newProgress = badge.currentProgress;
        let shouldUnlock = false;

        if (badge.id === 'badge-first-step') {
          shouldUnlock = true;
          newProgress = 1;
        } else if (badge.id === 'badge-perfect-score') {
          if (results.score === results.total && results.total >= 6) {
            shouldUnlock = true;
            newProgress = 1;
          }
        } else if (badge.id === 'badge-tauhid-master') {
          const tauhidCorrect = results.attempts.filter(
            (a) => a.subject === 'tauhid' && a.isCorrect
          ).length;
          newProgress = Math.min(badge.currentProgress + tauhidCorrect, badge.maxProgress);
          if (newProgress >= badge.maxProgress) shouldUnlock = true;
        } else if (badge.id === 'badge-firaq-scholar') {
          const firaqCorrect = results.attempts.filter(
            (a) => a.subject === 'firaq' && a.isCorrect
          ).length;
          newProgress = Math.min(badge.currentProgress + firaqCorrect, badge.maxProgress);
          if (newProgress >= badge.maxProgress) shouldUnlock = true;
        } else if (badge.id === 'badge-mantiq-logician') {
          const mantiqCorrect = results.attempts.filter(
            (a) => a.subject === 'mantiq' && a.isCorrect
          ).length;
          newProgress = Math.min(badge.currentProgress + mantiqCorrect, badge.maxProgress);
          if (newProgress >= badge.maxProgress) shouldUnlock = true;
        } else if (badge.id === 'badge-grand-master') {
          newProgress = Math.min(newTotalXp, badge.maxProgress);
          if (newProgress >= badge.maxProgress) shouldUnlock = true;
        }

        if (shouldUnlock && !badge.unlocked) {
          soundEffects.playFanfare();
          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.5 },
          });
          return {
            ...badge,
            currentProgress: badge.maxProgress,
            unlocked: true,
            unlockedAt: 'Baru Sahaja Diraih!',
          };
        }

        return {
          ...badge,
          currentProgress: newProgress,
        };
      });
    });

    // Sync with Teacher Dashboard student roster
    setStudents((prevStudents) => {
      const quizTitle = activeQuizTitle || 'Latihan STAM';
      const primarySubject = (results.attempts[0]?.subject as SubjectId) || 'tauhid';
      const timeSpentTotal = results.attempts.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) || 120;
      const accuracyScore = results.total > 0 ? Math.round((results.score / results.total) * 100) : 100;

      const newQuizHistoryItem: StudentQuizHistory = {
        id: `qh-${Date.now()}`,
        quizTitle,
        subject: primarySubject,
        completedAt: 'Hari Ini, Baru Sahaja',
        score: results.score,
        totalQuestions: results.total,
        accuracy: accuracyScore,
        xpEarned: results.xpEarned,
        timeSpentSeconds: timeSpentTotal,
      };

      const userIdx = prevStudents.findIndex((s) => s.isCurrentUser);
      if (userIdx >= 0) {
        const std = prevStudents[userIdx];
        const newTotXp = std.totalXp + results.xpEarned;
        const newQuizzes = std.quizzesCompleted + 1;
        const newQuestions = std.totalQuestionsAnswered + results.total;
        const newCorrect = std.correctAnswersCount + results.score;
        const newAcc = newQuestions > 0 ? Math.round((newCorrect / newQuestions) * 100) : 100;

        const subAcc = { ...std.subjectAccuracy };
        results.attempts.forEach((att) => {
          const s = att.subject;
          if (subAcc[s]) {
            subAcc[s] = {
              answered: subAcc[s].answered + 1,
              correct: subAcc[s].correct + (att.isCorrect ? 1 : 0),
            };
          }
        });

        const updatedStd: StudentRecord = {
          ...std,
          totalXp: newTotXp,
          level: Math.floor(newTotXp / 100) + 1,
          quizzesCompleted: newQuizzes,
          totalQuestionsAnswered: newQuestions,
          correctAnswersCount: newCorrect,
          accuracy: newAcc,
          lastActive: 'Hari Ini, Baru Sahaja',
          subjectAccuracy: subAcc,
          quizHistory: [newQuizHistoryItem, ...std.quizHistory].slice(0, 30),
        };

        const copy = [...prevStudents];
        copy[userIdx] = updatedStd;
        return copy;
      } else {
        const newStd: StudentRecord = {
          id: 'std-current-user',
          name: 'Pelajar Anda (Saya)',
          avatar: '🌟',
          schoolOrClass: 'SMKA Maahad Hamidiah',
          classCode: 'STAM-6A',
          totalXp: newTotalXp,
          level: newLevel,
          accuracy: accuracyScore,
          quizzesCompleted: 1,
          totalQuestionsAnswered: results.total,
          correctAnswersCount: results.score,
          streakDays: stats.streak,
          lastActive: 'Hari Ini, Baru Sahaja',
          isCurrentUser: true,
          subjectAccuracy: {
            tauhid: {
              answered: results.attempts.filter((a) => a.subject === 'tauhid').length,
              correct: results.attempts.filter((a) => a.subject === 'tauhid' && a.isCorrect).length,
            },
            firaq: {
              answered: results.attempts.filter((a) => a.subject === 'firaq').length,
              correct: results.attempts.filter((a) => a.subject === 'firaq' && a.isCorrect).length,
            },
            mantiq: {
              answered: results.attempts.filter((a) => a.subject === 'mantiq').length,
              correct: results.attempts.filter((a) => a.subject === 'mantiq' && a.isCorrect).length,
            },
          },
          quizHistory: [newQuizHistoryItem],
        };
        return [newStd, ...prevStudents];
      }
    });

    setActiveQuizQuestions(null);
  };

  const handleUnlockGroupBadge = () => {
    setBadges((prev) =>
      prev.map((b) => {
        if (b.id === 'badge-group-champion' && !b.unlocked) {
          return {
            ...b,
            currentProgress: 1,
            unlocked: true,
            unlockedAt: 'Baru Sahaja Diraih!',
          };
        }
        return b;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        xp={stats.totalXp}
        level={stats.level}
        streak={stats.streak}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        languageMode={languageMode}
        onChangeLanguageMode={setLanguageMode}
        studentName={studentProfile.name}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full max-w-4xl mx-auto">
        {currentTab === 'practice' && (
          <SubjectPracticeView
            stats={stats}
            questions={allQuestions}
            topics={topics}
            onStartQuiz={handleStartQuiz}
            onOpenBookmarkedQuiz={handleOpenBookmarkedQuiz}
            onOpenTeacherModal={() => setIsTeacherModalOpen(true)}
          />
        )}

        {currentTab === 'group' && (
          <GroupChallengeView
            onUnlockGroupBadge={handleUnlockGroupBadge}
            languageMode={languageMode}
            questions={allQuestions}
          />
        )}

        {currentTab === 'leaderboard' && (
          <LeaderboardView
            users={students.map((s) => ({
              id: s.id,
              name: s.name,
              avatar: s.avatar || '🧕',
              schoolOrClass: s.schoolOrClass,
              totalXp: s.totalXp,
              accuracy: s.accuracy,
              quizzesCompleted: s.quizzesCompleted,
              badgesCount: Math.max(1, Math.floor(s.quizzesCompleted)),
              streakDays: s.streakDays || 1,
            }))}
            currentStudentXp={stats.totalXp}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsView
            stats={stats}
            topics={topics}
            onPracticeWeakTopic={(topicId, subject) => handleStartQuiz(topicId, subject)}
            onOpenBookmarkedQuiz={handleOpenBookmarkedQuiz}
          />
        )}

        {currentTab === 'badges' && <BadgesView badges={badges} />}
      </main>

      {/* Bottom Navigation for Mobile App Feel */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        unclaimedBadgesCount={badges.filter((b) => !b.unlocked && b.currentProgress >= b.maxProgress).length}
      />

      {/* Active Quiz Fullscreen Modal */}
      {Boolean(activeQuizQuestions && activeQuizQuestions.length > 0) && (
        <QuizModal
          questions={activeQuizQuestions}
          title={activeQuizTitle}
          subjectName={activeQuizTitle}
          initialIndex={activeQuizInitialIndex}
          initialReviewMode={activeQuizReviewMode}
          isRandomSet={activeQuizIsRandomSet}
          onClose={() => setActiveQuizQuestions(null)}
          onFinishQuiz={handleFinishQuiz}
          languageMode={languageMode}
          bookmarkedIds={stats.bookmarkedQuestionIds}
          onToggleBookmark={handleToggleBookmark}
          studentProfile={studentProfile}
          onOpenEditProfile={() => setIsProfileModalOpen(true)}
        />
      )}

      {/* Student Profile Registration & Edit Modal */}
      <StudentProfileModal
        isOpen={isMandatoryProfileMissing || isProfileModalOpen}
        isMandatoryOnboarding={isMandatoryProfileMissing}
        initialProfile={studentProfile}
        onSave={handleSaveStudentProfile}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Teacher / Admin Question Management Modal (PIN Protected) */}
      <TeacherQuestionManagerModal
        isOpen={isTeacherModalOpen}
        onClose={() => setIsTeacherModalOpen(false)}
        questions={allQuestions}
        deletedQuestions={deletedQuestions}
        students={students}
        cloudSubmissions={cloudSubmissions}
        topics={topics}
        onSaveQuestions={handleSaveCustomQuestions}
        onRestoreQuestion={handleRestoreQuestion}
        onPermanentlyDeleteQuestion={handlePermanentlyDeleteQuestion}
        onEmptyTrash={handleEmptyTrash}
        onAddStudent={handleAddStudent}
        onClearDemoStudents={handleClearDemoStudents}
        onDeleteStudent={handleDeleteStudent}
        onDeleteSubmission={handleDeleteSubmission}
        onSaveTopics={handleSaveTopics}
        onResetTopicsToDefault={handleResetTopicsToDefault}
        onUpdateTopicTitleInQuestions={handleUpdateTopicTitleInQuestions}
        onSyncCurriculumToCloud={handleSyncCurriculumToCloud}
      />
    </div>
  );
}

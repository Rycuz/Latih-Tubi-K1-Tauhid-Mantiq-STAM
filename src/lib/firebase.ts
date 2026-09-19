import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocFromServer,
  arrayUnion,
} from 'firebase/firestore';
import config from '../../firebase-applet-config.json';
import { StudentRecord, StudentQuizHistory, SubjectId, Question, TopicInfo } from '../types';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(config) : getApp();

// Target Firestore Database using database ID from config
export const db = getFirestore(app, config.firestoreDatabaseId || '(default)');

// Validate connection to Firestore on boot as mandated by skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is currently offline or connecting...');
    }
  }
}
testConnection();

export interface CloudQuizSubmission {
  id: string;
  studentId: string;
  studentName: string;
  schoolOrClass: string;
  quizTitle: string;
  subject: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  xpEarned: number;
  timeSpentSeconds: number;
  completedAt: string;
}

/**
 * Submit quiz result to Firestore cloud database
 */
export async function submitQuizToFirebase(data: {
  studentId?: string;
  studentName: string;
  schoolOrClass: string;
  quizTitle: string;
  subject: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  timeSpentSeconds?: number;
}): Promise<{ success: boolean; submissionId?: string; error?: string }> {
  try {
    const studentId = data.studentId || `std-${data.studentName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') || 'anonymous'}`;
    const cleanStudentName = data.studentName.trim() || 'Pelajar STAM';
    const cleanSchool = data.schoolOrClass.trim() || 'Umum';
    const nowIso = new Date().toISOString();
    const accuracy = data.totalQuestions > 0 ? Math.round((data.score / data.totalQuestions) * 100) : 0;

    const submissionDocData: CloudQuizSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId,
      studentName: cleanStudentName,
      schoolOrClass: cleanSchool,
      quizTitle: data.quizTitle || 'Latihan STAM',
      subject: data.subject || 'campuran',
      score: data.score,
      totalQuestions: data.totalQuestions,
      accuracy,
      xpEarned: data.xpEarned,
      timeSpentSeconds: data.timeSpentSeconds || 60,
      completedAt: nowIso,
    };

    // 1. Write to quiz_submissions collection
    const submissionRef = doc(collection(db, 'quiz_submissions'), submissionDocData.id);
    await setDoc(submissionRef, submissionDocData);

    // 2. Update or create student cumulative profile in students collection
    const studentRef = doc(db, 'students', studentId);
    
    // History entry for student profile
    const subjectResolved: SubjectId | 'campuran' = ['tauhid', 'firaq', 'mantiq'].includes(submissionDocData.subject)
      ? (submissionDocData.subject as SubjectId)
      : 'campuran';

    const historyEntry: StudentQuizHistory = {
      id: submissionDocData.id,
      quizTitle: submissionDocData.quizTitle,
      subject: subjectResolved,
      completedAt: new Date().toLocaleString('ms-MY', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      score: submissionDocData.score,
      totalQuestions: submissionDocData.totalQuestions,
      accuracy: submissionDocData.accuracy,
      xpEarned: submissionDocData.xpEarned,
      timeSpentSeconds: submissionDocData.timeSpentSeconds,
    };

    // We update student document
    const studentDocData: any = {
      id: studentId,
      name: cleanStudentName,
      schoolOrClass: cleanSchool,
      avatar: '🧕',
      totalXp: data.xpEarned,
      quizzesCompleted: 1,
      totalQuestionsAnswered: data.totalQuestions,
      correctAnswersCount: data.score,
      accuracy,
      streakDays: 1,
      lastActive: nowIso,
      updatedAt: nowIso,
      quizHistory: arrayUnion(historyEntry),
    };

    await setDoc(studentRef, studentDocData, { merge: true });

    return { success: true, submissionId: submissionDocData.id };
  } catch (err: any) {
    console.error('Failed to submit quiz to Firebase:', err);
    return { success: false, error: err?.message || 'Gagal menghantar ke pangkalan data awan' };
  }
}

/**
 * Real-time listener for students roster from Firebase
 */
export function subscribeToCloudStudents(
  onData: (students: StudentRecord[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = collection(db, 'students');
    return onSnapshot(
      q,
      (snapshot) => {
        const list: StudentRecord[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || 'Pelajar',
            avatar: d.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
            schoolOrClass: d.schoolOrClass || 'STAM',
            totalXp: Number(d.totalXp) || 0,
            level: Math.floor((Number(d.totalXp) || 0) / 100) + 1,
            accuracy: Number(d.accuracy) || 0,
            quizzesCompleted: Number(d.quizzesCompleted) || 1,
            totalQuestionsAnswered: Number(d.totalQuestionsAnswered) || 0,
            correctAnswersCount: Number(d.correctAnswersCount) || 0,
            streakDays: Number(d.streakDays) || 1,
            subjectAccuracy: d.subjectAccuracy || {
              tauhid: { answered: 0, correct: 0 },
              firaq: { answered: 0, correct: 0 },
              mantiq: { answered: 0, correct: 0 },
            },
            lastActive: d.lastActive || 'Baru sahaja',
            quizHistory: d.quizHistory || [],
          });
        });
        onData(list);
      },
      (error) => {
        console.warn('Firestore students subscription error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('Cannot subscribe to students:', err);
    return () => {};
  }
}

/**
 * Real-time listener for live quiz submissions feed
 */
export function subscribeToCloudSubmissions(
  onData: (submissions: CloudQuizSubmission[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, 'quiz_submissions'), orderBy('completedAt', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snapshot) => {
        const list: CloudQuizSubmission[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as CloudQuizSubmission);
        });
        onData(list);
      },
      (error) => {
        console.warn('Firestore quiz submissions subscription error:', error);
        if (onError) onError(error);
      }
    );
  } catch (err: any) {
    console.warn('Cannot subscribe to submissions:', err);
    return () => {};
  }
}

/**
 * Save questions and topics to Firestore cloud so they are synchronized
 * across all devices, sessions, teachers, and students in Normal Mode.
 */
export async function saveCurriculumToFirebase(
  questions: Question[],
  topics: TopicInfo[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    
    // Group questions by subject for fast updates and safely staying under Firestore document limits
    const tauhid = questions.filter((q) => q.subject === 'tauhid');
    const firaq = questions.filter((q) => q.subject === 'firaq');
    const mantiq = questions.filter((q) => q.subject === 'mantiq');
    const custom = questions.filter((q) => !['tauhid', 'firaq', 'mantiq'].includes(q.subject));

    // Serialize cleanly without undefined fields
    const safeTauhid = JSON.parse(JSON.stringify(tauhid));
    const safeFiraq = JSON.parse(JSON.stringify(firaq));
    const safeMantiq = JSON.parse(JSON.stringify(mantiq));
    const safeCustom = JSON.parse(JSON.stringify(custom));
    const safeTopics = JSON.parse(JSON.stringify(topics));

    // Save each subject section and topics in parallel
    await Promise.all([
      setDoc(doc(db, 'curriculum', 'questions_tauhid'), {
        id: 'questions_tauhid',
        subject: 'tauhid',
        updatedAt: nowIso,
        count: safeTauhid.length,
        questions: safeTauhid,
      }),
      setDoc(doc(db, 'curriculum', 'questions_firaq'), {
        id: 'questions_firaq',
        subject: 'firaq',
        updatedAt: nowIso,
        count: safeFiraq.length,
        questions: safeFiraq,
      }),
      setDoc(doc(db, 'curriculum', 'questions_mantiq'), {
        id: 'questions_mantiq',
        subject: 'mantiq',
        updatedAt: nowIso,
        count: safeMantiq.length,
        questions: safeMantiq,
      }),
      setDoc(doc(db, 'curriculum', 'questions_custom'), {
        id: 'questions_custom',
        subject: 'custom',
        updatedAt: nowIso,
        count: safeCustom.length,
        questions: safeCustom,
      }),
      setDoc(doc(db, 'curriculum', 'topics'), {
        id: 'topics',
        updatedAt: nowIso,
        count: safeTopics.length,
        topics: safeTopics,
      }),
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save curriculum to Firestore:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan ke pangkalan data awan' };
  }
}

/**
 * Real-time listener for curriculum (questions & topics) updates from Firestore.
 * Automatically synchronizes Normal Mode across all student devices whenever
 * the teacher saves changes.
 */
export function subscribeToCloudCurriculum(callbacks: {
  onQuestions?: (questions: Question[]) => void;
  onTopics?: (topics: TopicInfo[]) => void;
  onError?: (err: Error) => void;
}) {
  try {
    const q = collection(db, 'curriculum');
    return onSnapshot(
      q,
      (snapshot) => {
        let hasQuestions = false;
        let hasTopics = false;
        let tauhidQuestions: Question[] = [];
        let firaqQuestions: Question[] = [];
        let mantiqQuestions: Question[] = [];
        let customQuestions: Question[] = [];
        let fetchedTopics: TopicInfo[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (docSnap.id === 'questions_tauhid' && Array.isArray(data.questions)) {
            tauhidQuestions = data.questions;
            hasQuestions = true;
          } else if (docSnap.id === 'questions_firaq' && Array.isArray(data.questions)) {
            firaqQuestions = data.questions;
            hasQuestions = true;
          } else if (docSnap.id === 'questions_mantiq' && Array.isArray(data.questions)) {
            mantiqQuestions = data.questions;
            hasQuestions = true;
          } else if (docSnap.id === 'questions_custom' && Array.isArray(data.questions)) {
            customQuestions = data.questions;
            hasQuestions = true;
          } else if (docSnap.id === 'topics' && Array.isArray(data.topics)) {
            fetchedTopics = data.topics;
            hasTopics = true;
          }
        });

        if (hasQuestions && callbacks.onQuestions) {
          const combined = [
            ...tauhidQuestions,
            ...firaqQuestions,
            ...mantiqQuestions,
            ...customQuestions,
          ];
          if (combined.length > 0) {
            callbacks.onQuestions(combined);
          }
        }

        if (hasTopics && callbacks.onTopics && fetchedTopics.length > 0) {
          callbacks.onTopics(fetchedTopics);
        }
      },
      (error) => {
        console.warn('Firestore curriculum subscription error:', error);
        if (callbacks.onError) callbacks.onError(error);
      }
    );
  } catch (err: any) {
    console.warn('Cannot subscribe to curriculum:', err);
    return () => {};
  }
}


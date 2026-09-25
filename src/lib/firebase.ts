import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  where,
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
 * Delete a student record from Firestore, and also delete any associated submissions.
 */
export async function deleteStudentFromFirebase(studentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete student document
    await deleteDoc(doc(db, 'students', studentId));

    // 2. Also find and delete all submissions belonging to this student
    try {
      const q = query(collection(db, 'quiz_submissions'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
    } catch (subErr) {
      console.warn('Submissions deletion non-blocking notice:', subErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete student from Firebase:', err);
    return { success: false, error: err?.message || 'Gagal memadam rekod pelajar dari Firestore' };
  }
}

/**
 * Delete a specific quiz submission from Firestore, and update/remove from student history if needed.
 */
export async function deleteQuizSubmissionFromFirebase(
  submissionId: string,
  studentId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete submission document
    await deleteDoc(doc(db, 'quiz_submissions', submissionId));

    // 2. If studentId provided, clean up or recalculate in student profile
    if (studentId) {
      try {
        const studentRef = doc(db, 'students', studentId);
        const studentSnap = await getDocFromServer(studentRef).catch(() => null);
        if (studentSnap && studentSnap.exists()) {
          const data = studentSnap.data();
          const oldHistory: StudentQuizHistory[] = data.quizHistory || [];
          const updatedHistory = oldHistory.filter((h) => h.id !== submissionId);

          if (updatedHistory.length === 0) {
            // If the student has no remaining history, delete the student profile as well
            await deleteDoc(studentRef);
          } else {
            const totalQ = updatedHistory.reduce((acc, h) => acc + h.totalQuestions, 0);
            const correctQ = updatedHistory.reduce((acc, h) => acc + h.score, 0);
            const totalXp = updatedHistory.reduce((acc, h) => acc + h.xpEarned, 0);
            const accuracy = totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0;
            await setDoc(
              studentRef,
              {
                quizHistory: updatedHistory,
                quizzesCompleted: updatedHistory.length,
                totalQuestionsAnswered: totalQ,
                correctAnswersCount: correctQ,
                totalXp,
                accuracy,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          }
        }
      } catch (e) {
        console.warn('Student update after submission delete non-blocking notice:', e);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to delete submission from Firebase:', err);
    return { success: false, error: err?.message || 'Gagal memadam rekod kuiz dari Firestore' };
  }
}

/**
 * Update an existing student's profile (e.g. rename from pseudonym to real name, update school/class)
 * in Firestore students collection, and synchronize all previous submissions with the new name.
 */
export async function updateStudentProfileInFirebase(params: {
  studentId: string;
  newName: string;
  newSchoolOrClass: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = params.newName.trim();
    const cleanSchool = params.newSchoolOrClass.trim();
    const nowIso = new Date().toISOString();

    // 1. Update the student document in 'students'
    const studentRef = doc(db, 'students', params.studentId);
    await setDoc(
      studentRef,
      {
        name: cleanName,
        schoolOrClass: cleanSchool,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    // 2. Also update all past submissions belonging to this student in 'quiz_submissions'
    try {
      const q = query(collection(db, 'quiz_submissions'), where('studentId', '==', params.studentId));
      const snap = await getDocs(q);
      const updatePromises = snap.docs.map((docSnap) =>
        setDoc(
          docSnap.ref,
          {
            studentName: cleanName,
            schoolOrClass: cleanSchool,
          },
          { merge: true }
        )
      );
      await Promise.all(updatePromises);
    } catch (subErr) {
      console.warn('Past submissions rename notice:', subErr);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to update student profile in Firebase:', err);
    return { success: false, error: err?.message || 'Gagal mengemas kini profil pelajar' };
  }
}

/**
 * Save questions and topics to Firestore cloud so they are synchronized
 * across all devices, sessions, teachers, and students in Normal Mode.
 */
export async function saveCurriculumToFirebase(
  questions: Question[],
  topics: TopicInfo[],
  deletedQuestionIds?: string[],
  trashQuestions?: Question[]
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
    const safeTrash = trashQuestions ? JSON.parse(JSON.stringify(trashQuestions)) : [];
    const safeDeletedIds = deletedQuestionIds || [];

    // Save each subject section, topics, and deleted registry in parallel
    const savePromises = [
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
    ];

    if (deletedQuestionIds !== undefined || trashQuestions !== undefined) {
      savePromises.push(
        setDoc(doc(db, 'curriculum', 'deleted_registry'), {
          id: 'deleted_registry',
          updatedAt: nowIso,
          count: safeDeletedIds.length,
          deletedQuestionIds: safeDeletedIds,
          trashQuestions: safeTrash,
        })
      );
    }

    await Promise.all(savePromises);

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save curriculum to Firestore:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan ke pangkalan data awan' };
  }
}

/**
 * Real-time listener for curriculum (questions, topics & deleted registry) updates from Firestore.
 * Automatically synchronizes Normal Mode and deletions across all student & teacher devices.
 */
export function subscribeToCloudCurriculum(callbacks: {
  onQuestions?: (questions: Question[]) => void;
  onTopics?: (topics: TopicInfo[]) => void;
  onDeletedRegistry?: (deletedIds: string[], trashQuestions?: Question[]) => void;
  onError?: (err: Error) => void;
}) {
  try {
    const q = collection(db, 'curriculum');
    return onSnapshot(
      q,
      (snapshot) => {
        let hasQuestions = false;
        let hasTopics = false;
        let hasDeletedRegistry = false;
        let tauhidQuestions: Question[] = [];
        let firaqQuestions: Question[] = [];
        let mantiqQuestions: Question[] = [];
        let customQuestions: Question[] = [];
        let fetchedTopics: TopicInfo[] = [];
        let fetchedDeletedIds: string[] = [];
        let fetchedTrash: Question[] = [];

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
          } else if (docSnap.id === 'deleted_registry') {
            fetchedDeletedIds = Array.isArray(data.deletedQuestionIds) ? data.deletedQuestionIds : [];
            fetchedTrash = Array.isArray(data.trashQuestions) ? data.trashQuestions : [];
            hasDeletedRegistry = true;
          }
        });

        if (hasDeletedRegistry && callbacks.onDeletedRegistry) {
          callbacks.onDeletedRegistry(fetchedDeletedIds, fetchedTrash);
        }

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


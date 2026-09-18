import { StudentRecord } from '../types';

export const INITIAL_STUDENTS_ROSTER: StudentRecord[] = [
  {
    id: 'std-anati',
    name: 'Anati',
    avatar: '🧕',
    schoolOrClass: 'Maahad Yaakubiah - MAYA (6syukur)',
    classCode: '6syukur',
    totalXp: 190,
    level: 2,
    accuracy: 50,
    quizzesCompleted: 1,
    totalQuestionsAnswered: 28,
    correctAnswersCount: 14,
    streakDays: 1,
    lastActive: 'Hari Ini, 04:39 PM',
    subjectAccuracy: {
      tauhid: { answered: 28, correct: 14 },
      firaq: { answered: 0, correct: 0 },
      mantiq: { answered: 0, correct: 0 },
    },
    weakTopics: ["Tauhid: Bab 2: Al-Mala'ikah"],
    quizHistory: [
      {
        id: 'sub-1789720775434-5rs5d',
        quizTitle: "Bab 2: Al-Mala'ikah",
        subject: 'tauhid',
        completedAt: '18 Sep 2026, 04:39 PM',
        score: 14,
        totalQuestions: 28,
        accuracy: 50,
        xpEarned: 190,
        timeSpentSeconds: 60,
      },
    ],
  },
];

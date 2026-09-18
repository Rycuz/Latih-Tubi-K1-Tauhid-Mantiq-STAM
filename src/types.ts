export type SubjectId = 'tauhid' | 'firaq' | 'mantiq';

export type Difficulty = 'mudah' | 'sederhana' | 'sukar';

export interface QuestionOption {
  id: 'a' | 'b' | 'c' | 'd';
  textArabic: string;
  textMalay: string;
}

export interface Question {
  id: string;
  subject: SubjectId;
  topicId: string;
  topicTitleArabic: string;
  topicTitleMalay: string;
  learningStandard?: string;
  questionArabic: string;
  questionMalay: string;
  diagramArabic?: string; // For questions with tree diagrams / flowcharts like in PDF
  diagramType?: 'tree' | 'table' | 'box';
  options: QuestionOption[];
  correctAnswer: 'a' | 'b' | 'c' | 'd';
  explanationArabic: string;
  explanationMalay: string;
  difficulty: Difficulty;
  dalilReference?: string;
}

export interface TopicInfo {
  id: string;
  subject: SubjectId;
  titleArabic: string;
  titleMalay: string;
  descriptionMalay: string;
  questionCount: number;
  iconName: string;
}

export interface Badge {
  id: string;
  title: string;
  arabicTitle: string;
  description: string;
  category: 'tauhid' | 'firaq' | 'mantiq' | 'streak' | 'group' | 'mastery';
  icon: string;
  color: string;
  rarity: 'Gangsa' | 'Perak' | 'Emas' | 'Berlian';
  maxProgress: number;
  currentProgress: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  schoolOrClass: string;
  totalXp: number;
  accuracy: number;
  quizzesCompleted: number;
  badgesCount: number;
  streakDays: number;
  rank?: number;
  isCurrentUser?: boolean;
}

export interface QuestionAttempt {
  questionId: string;
  selectedOption: 'a' | 'b' | 'c' | 'd';
  isCorrect: boolean;
  timeSpentSeconds: number;
  timestamp: number;
  subject: SubjectId;
  topicId: string;
}

export interface UserStats {
  totalXp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  quizzesCompleted: number;
  totalQuestionsAnswered: number;
  correctAnswersCount: number;
  subjectAccuracy: {
    tauhid: { answered: number; correct: number };
    firaq: { answered: number; correct: number };
    mantiq: { answered: number; correct: number };
  };
  topicPerformance: Record<string, { answered: number; correct: number }>;
  bookmarkedQuestionIds: string[];
  history: QuestionAttempt[];
}

export interface StudentQuizHistory {
  id: string;
  quizTitle: string;
  subject: SubjectId | 'campuran';
  completedAt: string;
  score: number;
  totalQuestions: number;
  accuracy: number;
  xpEarned: number;
  timeSpentSeconds: number;
}

export interface StudentRecord {
  id: string;
  name: string;
  avatar: string;
  schoolOrClass: string;
  classCode?: string;
  totalXp: number;
  level: number;
  accuracy: number;
  quizzesCompleted: number;
  totalQuestionsAnswered: number;
  correctAnswersCount: number;
  streakDays: number;
  subjectAccuracy: {
    tauhid: { answered: number; correct: number };
    firaq: { answered: number; correct: number };
    mantiq: { answered: number; correct: number };
  };
  weakTopics?: string[];
  lastActive: string;
  quizHistory: StudentQuizHistory[];
  isCurrentUser?: boolean;
}

export interface GroupTeam {
  id: string;
  name: string;
  color: string;
  score: number;
  streak: number;
  members: string[];
}

export interface GroupChallengeState {
  roomId: string;
  roomName: string;
  teams: [GroupTeam, GroupTeam];
  currentTeamIndex: 0 | 1;
  questionList: Question[];
  currentQuestionIndex: number;
  status: 'setup' | 'active' | 'round_end' | 'finished';
  roundTimerSeconds: number;
  totalRounds: number;
  winnerTeamId?: string;
}

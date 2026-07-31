export interface User {
  id: string; // Normalized ID, e.g., 'DINESH D' or 'DAYANA'
  username: string; // Display username
  name: string;
}

export interface MatchItem {
  id: string;
  text: string;
  textTa?: string;
}

export interface Question {
  id: string;
  type?: 'mcq' | 'match' | 'passage' | string;
  questionText: string;
  questionTamilText?: string;
  options: string[];
  tamilOptions?: string[];
  correctOptionIndex: number;
  explanation: string;
  tamilExplanation?: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  // Match the following support
  leftItems?: MatchItem[];
  rightItems?: MatchItem[];
  correctMatchAnswer?: Record<string, string>;
  // Passage support
  passageTitle?: string;
  passageEn?: string;
  passageTa?: string;
}

export interface ExamSettings {
  defaultLanguage: 'English' | 'Tamil';
  negativeMarking: number; // e.g., 0.25, 0.33, or 0
  positiveMarking: number; // e.g., 1 or 2
  warnOnTabLeave: boolean;
  enableSoundAlerts: boolean;
  timeLimitPerQuestion: number; // in seconds (for customizable presets, e.g. 60)
}

export interface ExamSession {
  id: string;
  userId?: string;
  username?: string;
  title: string;
  questions: Question[];
  timeLimit: number; // in seconds
  startedAt: number; // timestamp
  answers: { [questionId: string]: number }; // -1 or index of option
  bookmarks: { [questionId: string]: boolean };
  visited: { [questionId: string]: boolean };
  timeSpent: { [questionId: string]: number }; // seconds spent per question
}

export interface TopicStat {
  topic: string;
  correct: number;
  total: number;
}

export interface ExamHistoryLog {
  id: string;
  _id?: string;
  userId?: string;
  username?: string;
  title: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  incorrectCount: number;
  score: number;
  accuracy: number;
  totalTimeSpent: number; // in seconds
  date: string; // locale string
  topicStats: TopicStat[];
  questions: Question[];
  answers: { [questionId: string]: number };
}

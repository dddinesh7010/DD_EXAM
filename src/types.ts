export interface Question {
  id: string;
  questionText: string;
  questionTamilText?: string;
  options: string[];
  tamilOptions?: string[];
  correctOptionIndex: number;
  explanation: string;
  tamilExplanation?: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
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

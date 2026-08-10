export interface User {
  id: string; // Normalized ID, e.g., 'DINESH D' or 'DAYANA'
  username: string; // Display username
  name: string;
}

export type QuestionType = 'mcq' | 'match' | 'passage';

export interface MatchItem {
  id: string;
  text_en: string;
  text_ta: string;
}

export interface MatchQuestion {
  id: string;
  type: 'match';
  question_en: string;
  question_ta?: string;
  displayMode?: 'interactive' | 'static' | string;
  interactionType?: 'dropdown' | 'drag' | 'line' | string;
  leftItems: MatchItem[];
  rightItems: MatchItem[];
  correctAnswer: { [leftId: string]: string }; // e.g. { "A": "3", "B": "2", "C": "1", "D": "4" }
  marks?: number;
  negativeMarks?: number;
  difficulty?: 'Easy' | 'Moderate' | 'Hard' | string;
  year?: string;
  topic?: string;
  explanation_en?: string;
  explanation_ta?: string;
  // Legacy compatibility getters/fields if needed
  questionText?: string;
  questionTamilText?: string;
  correctOptionIndex?: number;
}

export interface MCQQuestion {
  id: string;
  type?: 'mcq';
  question_en?: string;
  question_ta?: string;
  options_en?: string[];
  options_ta?: string[];
  correctOptionIndex?: number;
  correctAnswer_en?: string;
  correctAnswer_ta?: string;
  marks?: number;
  negativeMarks?: number;
  difficulty?: 'Easy' | 'Moderate' | 'Hard' | string;
  year?: string;
  topic?: string;
  explanation_en?: string;
  explanation_ta?: string;
  // Legacy compatibility fields
  questionText?: string;
  questionTamilText?: string;
  options?: string[];
  tamilOptions?: string[];
  explanation?: string;
  tamilExplanation?: string;
}

export interface PassageQuestion {
  id: string;
  type: 'passage';
  title_en: string;
  title_ta?: string;
  layout?: 'split' | 'stacked' | string;
  stickyPassage?: boolean;
  passage_en: string;
  passage_ta?: string;
  questions: MCQQuestion[];
  marks?: number;
  negativeMarks?: number;
  difficulty?: 'Easy' | 'Moderate' | 'Hard' | string;
  year?: string;
  topic?: string;
}

export type Question = MCQQuestion | MatchQuestion | PassageQuestion;

export interface QuestionPaperData {
  title_en: string;
  title_ta?: string;
  questions: Question[];
}

export interface ExamSettings {
  defaultLanguage: 'English' | 'Tamil' | 'Bilingual';
  negativeMarking: number; // e.g., 0.25, 0.33, or 0
  positiveMarking: number; // e.g., 1 or 2
  warnOnTabLeave: boolean;
  enableSoundAlerts: boolean;
  timeLimitPerQuestion: number; // in seconds
}

export interface ExamSession {
  id: string;
  userId?: string;
  username?: string;
  title: string;
  questions: Question[];
  timeLimit: number; // in seconds
  startedAt: number; // timestamp
  answers: { [questionId: string]: any }; // option index OR match map { A: "3", B: "2" }
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
  answers: { [questionId: string]: any };
}

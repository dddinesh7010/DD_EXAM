export interface User {
  id: string; // Normalized ID, e.g., 'DINESH D' or 'DAYANA'
  username: string; // Display username
  name: string;
}

export type QuestionType = 
  | 'mcq' 
  | 'match_following' 
  | 'match' 
  | 'passage_mcq' 
  | 'passage' 
  | 'true_false' 
  | 'fill_blank' 
  | 'statement_based' 
  | 'assertion_reason';

export interface MatchColumnItem {
  id: string;
  text: string;
  tamilText?: string;
}

export interface MatchItem {
  id: string;
  text_en: string;
  text_ta: string;
}

export interface MatchQuestion {
  id: string | number;
  type: 'match' | 'match_following';
  questionType?: 'match' | 'match_following';
  question_en?: string;
  question_ta?: string;
  questionText?: string;
  questionTamilText?: string;
  displayMode?: 'interactive' | 'static' | string;
  interactionType?: 'dropdown' | 'drag' | 'line' | string;
  leftItems: MatchItem[];
  rightItems: MatchItem[];
  leftColumn?: MatchColumnItem[];
  rightColumn?: MatchColumnItem[];
  correctAnswer: { [leftId: string]: string }; // e.g. { "A": "2", "B": "1", "C": "3", "D": "4" }
  correctMatches?: { [leftId: string]: string };
  marks?: number;
  negativeMarks?: number;
  difficulty?: 'Easy' | 'Moderate' | 'Hard' | 'Medium' | string;
  year?: string;
  topic?: string;
  explanation_en?: string;
  explanation_ta?: string;
  explanation?: string;
  tamilExplanation?: string;
  correctOptionIndex?: number;
}

export interface MCQQuestion {
  id: string | number;
  type?: QuestionType;
  questionType?: QuestionType;
  question_en?: string;
  question_ta?: string;
  questionText?: string;
  questionTamilText?: string;
  options_en?: string[];
  options_ta?: string[];
  options?: string[];
  tamilOptions?: string[];
  correctOptionIndex?: number;
  correctAnswer_en?: string;
  correctAnswer_ta?: string;
  marks?: number;
  negativeMarks?: number;
  difficulty?: 'Easy' | 'Moderate' | 'Hard' | 'Medium' | string;
  year?: string;
  topic?: string;
  explanation_en?: string;
  explanation_ta?: string;
  explanation?: string;
  tamilExplanation?: string;
  
  // Specific format extensions
  passage?: string;
  passageTamilText?: string;
  statements?: string[];
  tamilStatements?: string[];
  assertion?: string;
  assertionTamilText?: string;
  reason?: string;
  reasonTamilText?: string;
}

export interface PassageQuestion {
  id: string | number;
  type: 'passage' | 'passage_mcq';
  questionType?: 'passage' | 'passage_mcq';
  title_en?: string;
  title_ta?: string;
  layout?: 'split' | 'stacked' | string;
  stickyPassage?: boolean;
  passage_en?: string;
  passage_ta?: string;
  passage?: string;
  passageTamilText?: string;
  questions?: MCQQuestion[];
  // For single passage_mcq question items
  questionText?: string;
  questionTamilText?: string;
  question_en?: string;
  question_ta?: string;
  options?: string[];
  tamilOptions?: string[];
  options_en?: string[];
  options_ta?: string[];
  correctOptionIndex?: number;
  explanation?: string;
  tamilExplanation?: string;
  explanation_en?: string;
  explanation_ta?: string;
  marks?: number;
  negativeMarks?: number;
  difficulty?: 'Easy' | 'Moderate' | 'Hard' | 'Medium' | string;
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

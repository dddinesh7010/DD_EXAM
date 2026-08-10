import { Question, MCQQuestion, MatchQuestion, PassageQuestion, QuestionPaperData } from '../types';

export function getQuestionEnText(q: Question): string {
  if ('question_en' in q && q.question_en) return q.question_en;
  if ('questionText' in q && q.questionText) return q.questionText;
  if (q.type === 'passage') return q.title_en || 'Reading Comprehension';
  return '';
}

export function getQuestionTaText(q: Question): string {
  if ('question_ta' in q && q.question_ta) return q.question_ta;
  if ('questionTamilText' in q && q.questionTamilText) return q.questionTamilText;
  if (q.type === 'passage') return q.title_ta || 'படித்துப் புரிதல்';
  return '';
}

export function getMCQOptionsEn(q: MCQQuestion): string[] {
  if (q.options_en && q.options_en.length > 0) return q.options_en;
  if (q.options && q.options.length > 0) return q.options;
  return [];
}

export function getMCQOptionsTa(q: MCQQuestion): string[] {
  if (q.options_ta && q.options_ta.length > 0) return q.options_ta;
  if (q.tamilOptions && q.tamilOptions.length > 0) return q.tamilOptions;
  return [];
}

export function isMatchQuestion(q: Question): q is MatchQuestion {
  return q.type === 'match' || ('leftItems' in q && 'rightItems' in q);
}

export function isPassageQuestion(q: Question): q is PassageQuestion {
  return q.type === 'passage' || ('passage_en' in q && Array.isArray((q as any).questions));
}

export function isMCQQuestion(q: Question): q is MCQQuestion {
  return !isMatchQuestion(q) && !isPassageQuestion(q);
}

export function flattenQuestionsForExam(questions: Question[]): Question[] {
  // If an exam engine requires 1 question per view, passage subquestions can be grouped or kept together.
  // Here we return questions list intact.
  return questions;
}

export function countTotalQuestions(paper: QuestionPaperData): number {
  let count = 0;
  for (const q of paper.questions) {
    if (isPassageQuestion(q)) {
      count += q.questions ? q.questions.length : 1;
    } else {
      count += 1;
    }
  }
  return count;
}

export function calculateTotalMarks(paper: QuestionPaperData): number {
  let marks = 0;
  for (const q of paper.questions) {
    if (isPassageQuestion(q)) {
      if (q.questions) {
        for (const sub of q.questions) {
          marks += sub.marks ?? 1;
        }
      } else {
        marks += q.marks ?? 1;
      }
    } else {
      marks += q.marks ?? 1;
    }
  }
  return marks;
}

import { Question, MatchQuestion, MCQQuestion, PassageQuestion } from '../types';

export interface ParsedJSONExamResult {
  questions: Question[];
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  timeLimit: number;
  pdfName: string;
}

export function parseQuestionsFromJSON(
  json: any,
  fallbackTitle: string = 'Imported Exam'
): ParsedJSONExamResult {
  let rawQuestions: any[] = [];
  let title = fallbackTitle.replace(/\.json$/i, '');
  let difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed' = 'Mixed';
  let timeLimit = 0;
  let pdfName = 'Imported Configuration';

  if (!json) {
    throw new Error('The JSON file is empty or invalid.');
  }

  // 1. Extract metadata if json is object
  if (typeof json === 'object' && !Array.isArray(json)) {
    title = json.title || json.topic || json.name || json.quizTitle || json.examTitle || title;
    pdfName = json.pdfName || json.source || 'Imported Configuration';
    if (typeof json.timeLimit === 'number') {
      timeLimit = json.timeLimit;
    }
    if (json.difficulty && ['Easy', 'Medium', 'Hard', 'Mixed'].includes(json.difficulty)) {
      difficulty = json.difficulty as any;
    }
  }

  // 2. Extract Questions Array
  if (Array.isArray(json)) {
    rawQuestions = json;
  } else if (json && typeof json === 'object') {
    // Check for single question object
    if (
      json.questionType ||
      json.questionText ||
      json.question ||
      json.leftColumn ||
      json.statements ||
      json.assertion ||
      (Array.isArray(json.options) && json.options.length >= 2) ||
      (Array.isArray(json.choices) && json.choices.length >= 2)
    ) {
      rawQuestions = [json];
    }
    // Check known array property names
    else if (Array.isArray(json.questions)) {
      rawQuestions = json.questions;
    } else if (Array.isArray(json.quizQuestions)) {
      rawQuestions = json.quizQuestions;
    } else if (Array.isArray(json.items)) {
      rawQuestions = json.items;
    } else if (Array.isArray(json.data?.questions)) {
      rawQuestions = json.data.questions;
    } else if (Array.isArray(json.data)) {
      rawQuestions = json.data;
    } else if (Array.isArray(json.storedQuestionPapers)) {
      // App DB Backup format
      const all: any[] = [];
      for (const paper of json.storedQuestionPapers) {
        if (Array.isArray(paper.questions)) {
          all.push(...paper.questions);
        }
      }
      rawQuestions = all;
    } else if (Array.isArray(json.resultsHistory)) {
      // History backup format
      const all: any[] = [];
      for (const item of json.resultsHistory) {
        if (Array.isArray(item.questions)) {
          all.push(...item.questions);
        }
      }
      rawQuestions = all;
    } else {
      // Deep inspection of all keys in object
      const keys = Object.keys(json);
      for (const key of keys) {
        const val = json[key];
        if (Array.isArray(val) && val.length > 0) {
          const first = val[0];
          if (first && typeof first === 'object') {
            if (
              first.questionType ||
              first.questionText ||
              first.question ||
              first.leftColumn ||
              first.statements ||
              first.assertion ||
              first.prompt ||
              first.qText ||
              first.stem ||
              first.text ||
              first.title ||
              first.mcq ||
              first.options ||
              first.choices
            ) {
              rawQuestions = val;
              break;
            } else if (Array.isArray(first.questions)) {
              const all: any[] = [];
              for (const p of val) {
                if (Array.isArray(p.questions)) {
                  all.push(...p.questions);
                }
              }
              if (all.length > 0) {
                rawQuestions = all;
                break;
              }
            }
          }
        } else if (val && typeof val === 'object') {
          if (Array.isArray(val.questions)) {
            rawQuestions = val.questions;
            break;
          } else if (Array.isArray(val.items)) {
            rawQuestions = val.items;
            break;
          }
        }
      }
    }
  }

  if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    throw new Error(
      'Could not find any questions list inside this JSON. Ensure the file contains a list of questions in the standard format.'
    );
  }

  // 3. Helper functions for cleaning
  const stripDiagramTags = (text: string | undefined): string => {
    if (!text) return '';
    let cleaned = text;
    cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');
    cleaned = cleaned.replace(/data:image\/[a-zA-Z+-]+;base64,[^\s"']+/gi, '');
    cleaned = cleaned.replace(/\[\s*(?:diagram|image|img|drawing|figure|fig|illustration|pic|picture)\s*\]/gi, '');
    cleaned = cleaned.replace(/<(?:img|image)[\s\S]*?>/gi, '');
    return cleaned;
  };

  const removeOtherLanguages = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(/[\u0900-\u097F\u0D00-\u0D7F\u0C80-\u0CFF\u0C00-\u0C7F\u0600-\u06FF]/g, '').trim();
  };

  // 4. Sanitize and construct each question
  const sanitizedQuestions: Question[] = rawQuestions.map((q: any, index: number) => {
    const id = q.id !== undefined ? q.id : `q_json_${Date.now()}_${index + 1}`;
    const rawType = (q.questionType || q.type || 'mcq').toString().toLowerCase().trim();
    
    const topic = q.topic || q.category || q.subject || 'General Studies';
    const qDifficulty = q.difficulty || difficulty || 'Medium';
    const marks = typeof q.marks === 'number' ? q.marks : 1;
    const negativeMarks = typeof q.negativeMarks === 'number' ? q.negativeMarks : 0.0;

    // Explanations
    let explanation = q.explanation || q.rationale || q.desc || q.solution || q.reasonText || 'No explanation provided.';
    if (typeof explanation !== 'string') explanation = String(explanation);
    explanation = removeOtherLanguages(stripDiagramTags(explanation));
    if (!explanation) explanation = 'No explanation provided.';

    let tamilExplanation = q.tamilExplanation || q.explanationTamil || q.explanation_ta || explanation;
    if (typeof tamilExplanation !== 'string') tamilExplanation = String(tamilExplanation);
    tamilExplanation = stripDiagramTags(tamilExplanation);

    // ==========================================
    // TYPE 2: MATCH THE FOLLOWING (match_following / match)
    // ==========================================
    if (rawType === 'match_following' || rawType === 'match' || q.leftColumn || (q.leftItems && q.rightItems)) {
      let leftItems: any[] = [];
      let rightItems: any[] = [];

      if (Array.isArray(q.leftColumn)) {
        leftItems = q.leftColumn.map((item: any, idx: number) => ({
          id: item.id || String.fromCharCode(65 + idx),
          text_en: item.text || item.text_en || item.en || `Item ${idx + 1}`,
          text_ta: item.tamilText || item.text_ta || item.ta || item.text || `Item ${idx + 1}`
        }));
      } else if (Array.isArray(q.leftItems)) {
        leftItems = q.leftItems.map((item: any, idx: number) => ({
          id: item.id || String.fromCharCode(65 + idx),
          text_en: item.text_en || item.text || `Item ${idx + 1}`,
          text_ta: item.text_ta || item.tamilText || item.text || `Item ${idx + 1}`
        }));
      }

      if (Array.isArray(q.rightColumn)) {
        rightItems = q.rightColumn.map((item: any, idx: number) => ({
          id: item.id || String(idx + 1),
          text_en: item.text || item.text_en || item.en || `Match ${idx + 1}`,
          text_ta: item.tamilText || item.text_ta || item.ta || item.text || `Match ${idx + 1}`
        }));
      } else if (Array.isArray(q.rightItems)) {
        rightItems = q.rightItems.map((item: any, idx: number) => ({
          id: item.id || String(idx + 1),
          text_en: item.text_en || item.text || `Match ${idx + 1}`,
          text_ta: item.text_ta || item.tamilText || item.text || `Match ${idx + 1}`
        }));
      }

      const correctAnswer = q.correctMatches || q.correctAnswer || {};
      const qText = q.questionText || q.question || 'Match the following:';
      const qTaText = q.questionTamilText || q.tamilText || 'பின்வருவனவற்றைப் பொருத்துக:';

      const matchQ: MatchQuestion = {
        id,
        type: 'match',
        questionType: 'match_following',
        question_en: qText,
        questionText: qText,
        question_ta: qTaText,
        questionTamilText: qTaText,
        leftItems,
        rightItems,
        leftColumn: q.leftColumn,
        rightColumn: q.rightColumn,
        correctAnswer,
        correctMatches: correctAnswer,
        explanation_en: explanation,
        explanation,
        explanation_ta: tamilExplanation,
        tamilExplanation,
        marks,
        negativeMarks,
        topic,
        difficulty: qDifficulty as any
      };
      return matchQ;
    }

    // ==========================================
    // TYPE 3: PASSAGE / PARAGRAPH + MCQ (passage_mcq / passage)
    // ==========================================
    const isPassage = rawType === 'passage_mcq' || rawType === 'passage' || Boolean(q.passage || q.passage_en);
    const rawPassageEn = q.passage || q.passage_en || '';
    const rawPassageTa = q.passageTamilText || q.passage_ta || rawPassageEn;

    // ==========================================
    // TYPE 6: STATEMENT-BASED (statement_based)
    // ==========================================
    const isStatementBased = rawType === 'statement_based' || Boolean(q.statements);
    const statements = Array.isArray(q.statements) ? q.statements : undefined;
    const tamilStatements = Array.isArray(q.tamilStatements) ? q.tamilStatements : statements;

    // ==========================================
    // TYPE 7: ASSERTION & REASON (assertion_reason)
    // ==========================================
    const isAssertionReason = rawType === 'assertion_reason' || Boolean(q.assertion);
    const assertion = q.assertion;
    const assertionTamilText = q.assertionTamilText || assertion;
    const reason = q.reason;
    const reasonTamilText = q.reasonTamilText || reason;

    // Extract Question Text
    let rawQText = q.questionText || q.question || q.prompt || q.qText || q.stem || q.title || q.text || '';
    if (typeof rawQText !== 'string') {
      rawQText = String(rawQText);
    }
    rawQText = removeOtherLanguages(stripDiagramTags(rawQText));
    if (!rawQText) {
      if (isAssertionReason) {
        rawQText = 'Read the Assertion (A) and Reason (R) and choose the correct option:';
      } else if (isStatementBased) {
        rawQText = 'Which of the above statements is correct?';
      } else if (isPassage) {
        rawQText = 'Answer the question based on the passage above:';
      } else {
        rawQText = `Question #${index + 1}`;
      }
    }

    // Extract Tamil Question Text
    let rawQTamilText = q.questionTamilText || q.tamilText || q.questionTamil || q.tamil || '';
    if (typeof rawQTamilText !== 'string') {
      rawQTamilText = String(rawQTamilText);
    }
    rawQTamilText = stripDiagramTags(rawQTamilText);
    if (!rawQTamilText) {
      if (isAssertionReason) {
        rawQTamilText = 'கூற்று (A) மற்றும் காரணம் (R) ஆகியவற்றை படித்து சரியான விடையைத் தேர்ந்தெடுக்கவும்:';
      } else if (isStatementBased) {
        rawQTamilText = 'மேற்கண்ட கூற்றுகளில் எது சரியானது?';
      } else if (isPassage) {
        rawQTamilText = 'மேற்கண்ட பத்தியை அடிப்படையாகக் கொண்டு விடையளிக்கவும்:';
      } else {
        rawQTamilText = rawQText;
      }
    }

    // Extract Options
    let options: string[] = [];
    if (Array.isArray(q.options) && q.options.length >= 2) {
      options = q.options.map((o: any) => removeOtherLanguages(stripDiagramTags(String(o))));
    } else if (Array.isArray(q.choices) && q.choices.length >= 2) {
      options = q.choices.map((c: any) => removeOtherLanguages(stripDiagramTags(String(c))));
    } else if (Array.isArray(q.answers) && q.answers.length >= 2) {
      options = q.answers.map((a: any) => removeOtherLanguages(stripDiagramTags(String(a.text || a.choice || a))));
    } else if (rawType === 'true_false') {
      options = ['True', 'False'];
    } else if (q.optionA || q.a || q.option1) {
      const optA = q.optionA || q.a || q.option1 || '';
      const optB = q.optionB || q.b || q.option2 || '';
      const optC = q.optionC || q.c || q.option3 || '';
      const optD = q.optionD || q.d || q.option4 || '';
      const optE = q.optionE || q.e || q.option5 || '';
      const list = [optA, optB, optC, optD, optE].filter(Boolean);
      options = list.map(o => removeOtherLanguages(stripDiagramTags(String(o))));
    }

    // Fallbacks for options count
    if (rawType === 'true_false') {
      if (options.length !== 2) options = ['True', 'False'];
    } else {
      while (options.length < 4) {
        options.push(`Option ${String.fromCharCode(65 + options.length)}`);
      }
      // Keep up to 5 or more options (e.g. TNPSC option E: Answer not known)
    }

    // Extract Tamil Options
    let tamilOptions: string[] = [];
    if (Array.isArray(q.tamilOptions) && q.tamilOptions.length >= 2) {
      tamilOptions = q.tamilOptions.map((o: any) => stripDiagramTags(String(o)));
    } else if (Array.isArray(q.tamilChoices) && q.tamilChoices.length >= 2) {
      tamilOptions = q.tamilChoices.map((c: any) => stripDiagramTags(String(c)));
    } else if (rawType === 'true_false') {
      tamilOptions = ['சரி', 'தவறு'];
    } else {
      tamilOptions = [...options];
    }
    while (tamilOptions.length < options.length) {
      tamilOptions.push(options[tamilOptions.length] || `Option ${String.fromCharCode(65 + tamilOptions.length)}`);
    }
    if (tamilOptions.length > options.length) {
      tamilOptions = tamilOptions.slice(0, options.length);
    }

    // Extract Correct Option Index
    let correctOptionIndex = 0;
    if (typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex < options.length) {
      correctOptionIndex = q.correctOptionIndex;
    } else if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < options.length) {
      correctOptionIndex = q.correctIndex;
    } else if (typeof q.answerIndex === 'number' && q.answerIndex >= 0 && q.answerIndex < options.length) {
      correctOptionIndex = q.answerIndex;
    } else if (typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < options.length) {
      correctOptionIndex = q.correctAnswer;
    } else {
      const rawAns = q.correctAnswer || q.answer || q.correct || q.key || q.correctOpt;
      if (typeof rawAns === 'string') {
        const trimmedAns = rawAns.trim();
        const matchIdx = options.findIndex(o => o.toLowerCase().trim() === trimmedAns.toLowerCase());
        if (matchIdx !== -1) {
          correctOptionIndex = matchIdx;
        } else {
          const letterMap: Record<string, number> = {
            a: 0, A: 0, b: 1, B: 1, c: 2, C: 2, d: 3, D: 3, e: 4, E: 4,
            '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
            true: 0, false: 1, 'சரி': 0, 'தவறு': 1,
            'option a': 0, 'option b': 1, 'option c': 2, 'option d': 3, 'option e': 4
          };
          if (letterMap[trimmedAns.toLowerCase()] !== undefined) {
            correctOptionIndex = letterMap[trimmedAns.toLowerCase()];
          }
        }
      }
    }

    let determinedType = (rawType as any) || 'mcq';
    if (isAssertionReason) determinedType = 'assertion_reason';
    else if (isStatementBased) determinedType = 'statement_based';
    else if (isPassage) determinedType = 'passage_mcq';

    const normalizedQuestion: MCQQuestion = {
      id,
      type: determinedType,
      questionType: determinedType,
      question_en: rawQText,
      questionText: rawQText,
      question_ta: rawQTamilText,
      questionTamilText: rawQTamilText,
      options_en: options,
      options,
      options_ta: tamilOptions,
      tamilOptions,
      correctOptionIndex,
      explanation_en: explanation,
      explanation,
      explanation_ta: tamilExplanation,
      tamilExplanation,
      marks,
      negativeMarks,
      topic,
      difficulty: qDifficulty as any,
      
      // Extended fields
      ...(isPassage ? { passage: rawPassageEn, passageTamilText: rawPassageTa, passage_en: rawPassageEn, passage_ta: rawPassageTa } : {}),
      ...(isStatementBased ? { statements, tamilStatements } : {}),
      ...(isAssertionReason ? { assertion, assertionTamilText, reason, reasonTamilText } : {})
    };

    return normalizedQuestion;
  });

  return {
    questions: sanitizedQuestions,
    title,
    difficulty,
    timeLimit,
    pdfName
  };
}

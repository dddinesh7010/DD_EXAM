import { Question } from '../types';

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
      json.questionText ||
      json.question ||
      json.prompt ||
      json.qText ||
      json.text ||
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
      // Deep/Shallow inspection of all keys in object
      const keys = Object.keys(json);
      for (const key of keys) {
        const val = json[key];
        if (Array.isArray(val) && val.length > 0) {
          const first = val[0];
          if (first && typeof first === 'object') {
            if (
              first.questionText ||
              first.question ||
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
              // Array of paper objects
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
      'Could not find any questions list inside this JSON. Ensure the file contains a list of questions, an exam object, or question pool.'
    );
  }

  // 3. Helper to clean strings and remove non-English/non-Tamil characters or diagram tags
  const stripDiagramTagsAndPhrases = (text: string | undefined): string => {
    if (!text) return '';
    let cleaned = text;
    cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');
    cleaned = cleaned.replace(/data:image\/[a-zA-Z+-]+;base64,[^\s"']+/gi, '');
    cleaned = cleaned.replace(/\[\s*(?:diagram|image|img|drawing|figure|fig|illustration|pic|picture)\s*\]/gi, '');
    cleaned = cleaned.replace(/<(?:img|image)[\s\S]*?>/gi, '');
    cleaned = cleaned.replace(/\{\s*(?:diagram|image|img|drawing|figure|fig|illustration)\s*\}/gi, '');
    cleaned = cleaned.replace(/(?:refer to (?:the )?(?:diagram|figure|illustration|image|fig\.?)(?: below| above)?|as shown in (?:the )?(?:diagram|figure|fig\.?))/gi, '');
    cleaned = cleaned.replace(/\(?(?:diagram|figure|fig|illustration|image)\s*\d*[:.-]?\)?/gi, '');
    return cleaned;
  };

  const removeOtherLanguagesText = (text: string | undefined): string => {
    if (!text) return '';
    return text.replace(/[\u0900-\u097F\u0D00-\u0D7F\u0C80-\u0CFF\u0C00-\u0C7F\u0600-\u06FF]/g, '').trim();
  };

  // 4. Sanitize each question
  const sanitizedQuestions: Question[] = rawQuestions.map((q: any, index: number) => {
    const id = q.id || `q_json_${Date.now()}_${index + 1}`;

    // Extract Question Text
    let rawQText = q.questionText || q.question || q.prompt || q.qText || q.stem || q.title || q.text || q.query || q.mcq || `Question #${index + 1}`;
    if (typeof rawQText !== 'string') {
      rawQText = String(rawQText);
    }
    rawQText = removeOtherLanguagesText(stripDiagramTagsAndPhrases(rawQText));
    if (!rawQText) rawQText = `Question #${index + 1}`;

    // Extract Tamil Question Text
    let rawQTamilText = q.questionTamilText || q.tamilText || q.questionTamil || q.tamil || rawQText;
    if (typeof rawQTamilText !== 'string') {
      rawQTamilText = String(rawQTamilText);
    }
    rawQTamilText = stripDiagramTagsAndPhrases(rawQTamilText);
    if (!rawQTamilText) rawQTamilText = rawQText;

    // Extract Options
    let options: string[] = [];
    if (Array.isArray(q.options) && q.options.length >= 2) {
      options = q.options.map((o: any) => removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(o))));
    } else if (Array.isArray(q.choices) && q.choices.length >= 2) {
      options = q.choices.map((c: any) => removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(c))));
    } else if (Array.isArray(q.answers) && q.answers.length >= 2) {
      options = q.answers.map((a: any) => removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(a.text || a.choice || a))));
    } else if (q.optionA || q.a || q.option1) {
      const optA = q.optionA || q.a || q.option1 || '';
      const optB = q.optionB || q.b || q.option2 || '';
      const optC = q.optionC || q.c || q.option3 || '';
      const optD = q.optionD || q.d || q.option4 || '';
      options = [optA, optB, optC, optD].map(o => removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(o))));
    } else if (q.options && typeof q.options === 'object') {
      options = Object.values(q.options).map(o => removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(o))));
    }

    // Ensure we have 4 options
    while (options.length < 4) {
      options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }
    if (options.length > 4) {
      options = options.slice(0, 4);
    }

    // Extract Tamil Options
    let tamilOptions: string[] = [];
    if (Array.isArray(q.tamilOptions) && q.tamilOptions.length >= 2) {
      tamilOptions = q.tamilOptions.map((o: any) => stripDiagramTagsAndPhrases(String(o)));
    } else if (Array.isArray(q.tamilChoices) && q.tamilChoices.length >= 2) {
      tamilOptions = q.tamilChoices.map((c: any) => stripDiagramTagsAndPhrases(String(c)));
    } else {
      tamilOptions = [...options];
    }
    while (tamilOptions.length < 4) {
      tamilOptions.push(options[tamilOptions.length] || `Option ${String.fromCharCode(65 + tamilOptions.length)}`);
    }
    if (tamilOptions.length > 4) {
      tamilOptions = tamilOptions.slice(0, 4);
    }

    // Extract Correct Option Index
    let correctOptionIndex = 0;
    if (typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex < 4) {
      correctOptionIndex = q.correctOptionIndex;
    } else if (typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4) {
      correctOptionIndex = q.correctIndex;
    } else if (typeof q.answerIndex === 'number' && q.answerIndex >= 0 && q.answerIndex < 4) {
      correctOptionIndex = q.answerIndex;
    } else if (typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4) {
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
            a: 0, A: 0, b: 1, B: 1, c: 2, C: 2, d: 3, D: 3,
            '1': 0, '2': 1, '3': 2, '4': 3,
            'option a': 0, 'option b': 1, 'option c': 2, 'option d': 3
          };
          if (letterMap[trimmedAns.toLowerCase()] !== undefined) {
            correctOptionIndex = letterMap[trimmedAns.toLowerCase()];
          }
        }
      }
    }

    // Extract Explanation
    let explanation = q.explanation || q.rationale || q.desc || q.solution || q.reason || 'No explanation provided.';
    if (typeof explanation !== 'string') explanation = String(explanation);
    explanation = removeOtherLanguagesText(stripDiagramTagsAndPhrases(explanation));
    if (!explanation) explanation = 'No explanation provided.';

    let tamilExplanation = q.tamilExplanation || q.explanationTamil || explanation;
    if (typeof tamilExplanation !== 'string') tamilExplanation = String(tamilExplanation);
    tamilExplanation = stripDiagramTagsAndPhrases(tamilExplanation);

    const topic = q.topic || q.category || q.subject || 'General';
    const qDifficulty = q.difficulty || difficulty || 'Medium';

    return {
      id,
      questionText: rawQText,
      questionTamilText: rawQTamilText,
      options,
      tamilOptions,
      correctOptionIndex,
      explanation,
      tamilExplanation,
      topic,
      difficulty: qDifficulty as any
    };
  });

  return {
    questions: sanitizedQuestions,
    title,
    difficulty,
    timeLimit,
    pdfName
  };
}

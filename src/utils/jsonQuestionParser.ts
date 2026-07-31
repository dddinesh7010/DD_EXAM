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

  // 3. Helper to clean strings, keep \n line breaks, and remove non-English/non-Tamil characters or diagram tags
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

  // 4. Flatten passage containers if rawQuestions contains passage parents with nested questions
  const expandedRawQuestions: any[] = [];
  rawQuestions.forEach((q: any) => {
    if (q && q.type === 'passage' && Array.isArray(q.questions) && q.questions.length > 0) {
      const passageTitle = q.title || q.passageTitle || 'Reading Comprehension';
      const passageEn = q.passage_en || q.passageEn || q.passage || '';
      const passageTa = q.passage_ta || q.passageTa || passageEn;

      q.questions.forEach((subQ: any) => {
        expandedRawQuestions.push({
          ...subQ,
          type: 'passage',
          passageTitle,
          passageEn,
          passageTa,
          topic: subQ.topic || q.topic || 'Reading Comprehension'
        });
      });
    } else {
      expandedRawQuestions.push(q);
    }
  });

  // 5. Sanitize each question
  const sanitizedQuestions: Question[] = expandedRawQuestions.map((q: any, index: number) => {
    const id = q.id || `q_json_${Date.now()}_${index + 1}`;
    const qType = q.type || (q.leftItems ? 'match' : q.passageEn ? 'passage' : 'mcq');

    // Extract Passage details if present
    const passageTitle = q.passageTitle || q.title || (qType === 'passage' ? 'Reading Comprehension' : undefined);
    const passageEn = q.passageEn || q.passage_en || q.passage || undefined;
    const passageTa = q.passageTa || q.passage_ta || passageEn || undefined;

    // Extract Question Text
    let rawQText =
      q.questionText ||
      q.question_en ||
      q.question ||
      q.prompt ||
      q.qText ||
      q.stem ||
      q.title ||
      q.text ||
      q.query ||
      q.mcq ||
      `Question #${index + 1}`;
    if (typeof rawQText !== 'string') {
      rawQText = String(rawQText);
    }
    rawQText = removeOtherLanguagesText(stripDiagramTagsAndPhrases(rawQText));
    if (!rawQText) rawQText = `Question #${index + 1}`;

    // Extract Tamil Question Text
    let rawQTamilText =
      q.questionTamilText ||
      q.question_ta ||
      q.tamilText ||
      q.questionTamil ||
      q.tamil ||
      rawQText;
    if (typeof rawQTamilText !== 'string') {
      rawQTamilText = String(rawQTamilText);
    }
    rawQTamilText = stripDiagramTagsAndPhrases(rawQTamilText);
    if (!rawQTamilText) rawQTamilText = rawQText;

    // Extract Match Items if type is match
    let leftItems = Array.isArray(q.leftItems)
      ? q.leftItems.map((item: any) => ({
          id: String(item.id || ''),
          text: removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(item.text || ''))),
          textTa: item.textTa ? stripDiagramTagsAndPhrases(String(item.textTa)) : undefined
        }))
      : undefined;

    let rightItems = Array.isArray(q.rightItems)
      ? q.rightItems.map((item: any) => ({
          id: String(item.id || ''),
          text: removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(item.text || ''))),
          textTa: item.textTa ? stripDiagramTagsAndPhrases(String(item.textTa)) : undefined
        }))
      : undefined;

    let correctMatchAnswer = q.correctAnswer && typeof q.correctAnswer === 'object' && !Array.isArray(q.correctAnswer)
      ? q.correctAnswer
      : undefined;

    // Extract Options
    let options: string[] = [];
    if (Array.isArray(q.options_en) && q.options_en.length >= 2) {
      options = q.options_en.map((o: any) => removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(o))));
    } else if (Array.isArray(q.options) && q.options.length >= 2) {
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
      const optE = q.optionE || q.e || q.option5 || '';
      options = [optA, optB, optC, optD, optE]
        .filter(Boolean)
        .map(o => removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(o))));
    } else if (q.options && typeof q.options === 'object') {
      options = Object.values(q.options).map(o => removeOtherLanguagesText(stripDiagramTagsAndPhrases(String(o))));
    }

    // Auto generate options for Match question if no options provided
    if (options.length < 2 && qType === 'match' && correctMatchAnswer && leftItems && rightItems) {
      const matchStr = Object.entries(correctMatchAnswer)
        .map(([k, v]) => `${k}-${v}`)
        .join(', ');
      options = [
        matchStr,
        Object.entries(correctMatchAnswer)
          .map(([k, v], idx) => `${k}-${((parseInt(String(v)) % rightItems.length) + 1)}`)
          .join(', '),
        Object.entries(correctMatchAnswer)
          .reverse()
          .map(([k, v]) => `${k}-${v}`)
          .join(', '),
        'Answer not known'
      ];
    }

    // Ensure we have at least 4 options if less than 4 provided
    while (options.length < 4) {
      options.push(`Option ${String.fromCharCode(65 + options.length)}`);
    }

    // Extract Tamil Options
    let tamilOptions: string[] = [];
    if (Array.isArray(q.options_ta) && q.options_ta.length >= 2) {
      tamilOptions = q.options_ta.map((o: any) => stripDiagramTagsAndPhrases(String(o)));
    } else if (Array.isArray(q.tamilOptions) && q.tamilOptions.length >= 2) {
      tamilOptions = q.tamilOptions.map((o: any) => stripDiagramTagsAndPhrases(String(o)));
    } else if (Array.isArray(q.tamilChoices) && q.tamilChoices.length >= 2) {
      tamilOptions = q.tamilChoices.map((c: any) => stripDiagramTagsAndPhrases(String(c)));
    } else {
      tamilOptions = [...options];
    }
    while (tamilOptions.length < options.length) {
      tamilOptions.push(options[tamilOptions.length] || `Option ${String.fromCharCode(65 + tamilOptions.length)}`);
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
            'option a': 0, 'option b': 1, 'option c': 2, 'option d': 3, 'option e': 4
          };
          if (letterMap[trimmedAns.toLowerCase()] !== undefined) {
            correctOptionIndex = letterMap[trimmedAns.toLowerCase()];
          }
        }
      }
    }

    // Extract Explanation
    let explanation = q.explanation || q.rationale || q.desc || q.solution || q.reason || '';
    if (qType === 'match' && correctMatchAnswer && !explanation) {
      explanation = 'Correct Match pairs: ' + Object.entries(correctMatchAnswer).map(([k, v]) => `${k} -> ${v}`).join(', ');
    } else if (!explanation) {
      explanation = 'Correct answer is Option ' + String.fromCharCode(65 + correctOptionIndex);
    }
    if (typeof explanation !== 'string') explanation = String(explanation);
    explanation = removeOtherLanguagesText(stripDiagramTagsAndPhrases(explanation));

    let tamilExplanation = q.tamilExplanation || q.explanationTamil || explanation;
    if (typeof tamilExplanation !== 'string') tamilExplanation = String(tamilExplanation);
    tamilExplanation = stripDiagramTagsAndPhrases(tamilExplanation);

    const topic = q.topic || q.category || q.subject || 'General';
    const qDifficulty = q.difficulty || difficulty || 'Medium';

    return {
      id,
      type: qType,
      questionText: rawQText,
      questionTamilText: rawQTamilText,
      options,
      tamilOptions,
      correctOptionIndex,
      explanation,
      tamilExplanation,
      topic,
      difficulty: qDifficulty as any,
      leftItems,
      rightItems,
      correctMatchAnswer,
      passageTitle,
      passageEn,
      passageTa
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

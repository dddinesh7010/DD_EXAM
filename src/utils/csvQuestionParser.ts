import { Question, MCQQuestion, MatchQuestion, PassageQuestion } from '../types';
import { ParsedJSONExamResult } from './jsonQuestionParser';

/**
 * Parses raw CSV string into 2D string array handling quoted fields, commas inside quotes,
 * escaped quotes (""), and multiline values.
 */
export function parseCSVString(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote ("")
          currentCell += '"';
          i++; // Skip next quote
        } else {
          // End of quoted string
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // Skip \n
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

const stripDiagramTags = (text: string): string => {
  if (!text) return '';
  let cleaned = text;
  cleaned = cleaned.replace(/<svg[\s\S]*?<\/svg>/gi, '');
  cleaned = cleaned.replace(/data:image\/[a-zA-Z+-]+;base64,[^\s"']+/gi, '');
  cleaned = cleaned.replace(/\[\s*(?:diagram|image|img|drawing|figure|fig|illustration|pic|picture)\s*\]/gi, '');
  cleaned = cleaned.replace(/<(?:img|image)[\s\S]*?>/gi, '');
  return cleaned.trim();
};

export function parseQuestionsFromCSV(
  csvText: string,
  filename: string = 'Uploaded Exam'
): ParsedJSONExamResult {
  const rows = parseCSVString(csvText);

  if (!rows || rows.length < 2) {
    throw new Error('CSV file is empty or does not contain header and question rows.');
  }

  const headerRow = rows[0].map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''));
  const dataRows = rows.slice(1);

  // Map cleaned header string to column index
  const headerMap: { [key: string]: number } = {};
  headerRow.forEach((colName, idx) => {
    headerMap[colName] = idx;
  });

  // Helper to get non-empty value from row given list of potential aliases
  const getVal = (row: string[], aliases: string[]): string => {
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const colIdx = headerMap[cleanAlias];
      if (colIdx !== undefined && row[colIdx] !== undefined) {
        const val = row[colIdx].trim();
        if (val) return val;
      }
    }
    return '';
  };

  const passageMap = new Map<string, PassageQuestion>();
  const topLevelQuestions: Question[] = [];

  for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
    const row = dataRows[rowIndex];
    if (row.length === 0 || row.every(cell => !cell)) continue;

    const rowId = getVal(row, ['id']) || `q_csv_${Date.now()}_${rowIndex + 1}`;
    const rawType = getVal(row, ['type']).toLowerCase() || 'mcq';
    const parentId = getVal(row, ['parent_id', 'parentid']);

    const marksNum = Number(getVal(row, ['marks'])) || 2;
    const negMarksNum = Number(getVal(row, ['negative_marks', 'negativemarks'])) || 0.25;
    const difficultyVal = getVal(row, ['difficulty']) || 'Moderate';
    const yearVal = getVal(row, ['year']) || '';

    // CASE 1: PASSAGE CONTAINER ROW
    if (rawType === 'passage' || rawType === 'paragraph') {
      const passageTextEn = stripDiagramTags(getVal(row, ['question_en', 'passage_en', 'question', 'questiontext', 'text_en']));
      const passageTextTa = stripDiagramTags(getVal(row, ['question_ta', 'passage_ta', 'tamilquestion', 'text_ta'])) || passageTextEn;

      const passageObj: PassageQuestion = {
        id: rowId,
        type: 'passage',
        title_en: getVal(row, ['title_en', 'title']) || 'Reading Comprehension',
        title_ta: getVal(row, ['title_ta']) || 'வாசிப்புப் பகுதி',
        passage_en: passageTextEn || 'Read the following passage carefully.',
        passage_ta: passageTextTa,
        questions: [],
        marks: marksNum,
        negativeMarks: negMarksNum,
        difficulty: difficultyVal,
        year: yearVal
      };

      passageMap.set(rowId, passageObj);
      topLevelQuestions.push(passageObj);
      continue;
    }

    // CASE 2: MATCH QUESTION
    if (rawType === 'match') {
      let qText = stripDiagramTags(getVal(row, ['question_en', 'question', 'questiontext', 'stem']));
      if (!qText) qText = `Match the following (Question #${rowIndex + 1})`;
      let qTamilText = stripDiagramTags(getVal(row, ['question_ta', 'tamilquestion', 'questiontamiltext'])) || qText;

      const left_a_en = getVal(row, ['left_a_en', 'left_a', 'lefta']);
      const left_a_ta = getVal(row, ['left_a_ta']) || left_a_en;
      const left_b_en = getVal(row, ['left_b_en', 'left_b', 'leftb']);
      const left_b_ta = getVal(row, ['left_b_ta']) || left_b_en;
      const left_c_en = getVal(row, ['left_c_en', 'left_c', 'leftc']);
      const left_c_ta = getVal(row, ['left_c_ta']) || left_c_en;
      const left_d_en = getVal(row, ['left_d_en', 'left_d', 'leftd']);
      const left_d_ta = getVal(row, ['left_d_ta']) || left_d_en;

      const right_1_en = getVal(row, ['right_1_en', 'right_1', 'right1']);
      const right_1_ta = getVal(row, ['right_1_ta']) || right_1_en;
      const right_2_en = getVal(row, ['right_2_en', 'right_2', 'right2']);
      const right_2_ta = getVal(row, ['right_2_ta']) || right_2_en;
      const right_3_en = getVal(row, ['right_3_en', 'right_3', 'right3']);
      const right_3_ta = getVal(row, ['right_3_ta']) || right_3_en;
      const right_4_en = getVal(row, ['right_4_en', 'right_4', 'right4']);
      const right_4_ta = getVal(row, ['right_4_ta']) || right_4_en;

      const ansA = getVal(row, ['answer_a', 'ans_a']) || '1';
      const ansB = getVal(row, ['answer_b', 'ans_b']) || '2';
      const ansC = getVal(row, ['answer_c', 'ans_c']) || '3';
      const ansD = getVal(row, ['answer_d', 'ans_d']) || '4';

      const leftItems = [
        { id: 'A', text_en: left_a_en || 'Item A', text_ta: left_a_ta || 'Item A' },
        { id: 'B', text_en: left_b_en || 'Item B', text_ta: left_b_ta || 'Item B' },
        { id: 'C', text_en: left_c_en || 'Item C', text_ta: left_c_ta || 'Item C' },
        { id: 'D', text_en: left_d_en || 'Item D', text_ta: left_d_ta || 'Item D' }
      ];

      const rightItems = [
        { id: '1', text_en: right_1_en || 'Match 1', text_ta: right_1_ta || 'Match 1' },
        { id: '2', text_en: right_2_en || 'Match 2', text_ta: right_2_ta || 'Match 2' },
        { id: '3', text_en: right_3_en || 'Match 3', text_ta: right_3_ta || 'Match 3' },
        { id: '4', text_en: right_4_en || 'Match 4', text_ta: right_4_ta || 'Match 4' }
      ];

      const matchObj: MatchQuestion = {
        id: rowId,
        type: 'match',
        question_en: qText,
        question_ta: qTamilText,
        questionText: qText,
        questionTamilText: qTamilText,
        leftItems,
        rightItems,
        correctAnswer: {
          'A': ansA,
          'B': ansB,
          'C': ansC,
          'D': ansD
        },
        explanation_en: getVal(row, ['correct_answer_en', 'explanation_en', 'explanation']),
        explanation_ta: getVal(row, ['correct_answer_ta', 'explanation_ta', 'tamilexplanation']),
        marks: marksNum,
        negativeMarks: negMarksNum,
        difficulty: difficultyVal,
        year: yearVal
      };

      if (parentId) {
        let parentPassage = passageMap.get(parentId);
        if (!parentPassage) {
          parentPassage = {
            id: parentId,
            type: 'passage',
            title_en: 'Reading Comprehension',
            title_ta: 'வாசிப்புப் பகுதி',
            passage_en: 'Read the items carefully and answer the question below.',
            passage_ta: 'வினாக்களுக்கு விடையளிக்கவும்.',
            questions: [],
            marks: marksNum,
            negativeMarks: negMarksNum,
            difficulty: difficultyVal,
            year: yearVal
          };
          passageMap.set(parentId, parentPassage);
          topLevelQuestions.push(parentPassage);
        }
        parentPassage.questions.push(matchObj as any);
      } else {
        topLevelQuestions.push(matchObj);
      }
      continue;
    }

    // CASE 3: STANDARD MCQ QUESTION (or Child Question of Passage)
    let qText = stripDiagramTags(getVal(row, ['question_en', 'question', 'questiontext', 'stem', 'text_en']));
    if (!qText) qText = `Question #${rowIndex + 1}`;
    let qTamilText = stripDiagramTags(getVal(row, ['question_ta', 'tamilquestion', 'questiontamiltext', 'text_ta'])) || qText;

    const optAEn = getVal(row, ['option_a_en', 'optiona', 'option_a', 'choicea', 'choice1', 'a']);
    const optBEn = getVal(row, ['option_b_en', 'optionb', 'option_b', 'choiceb', 'choice2', 'b']);
    const optCEn = getVal(row, ['option_c_en', 'optionc', 'option_c', 'choicec', 'choice3', 'c']);
    const optDEn = getVal(row, ['option_d_en', 'optiond', 'option_d', 'choiced', 'choice4', 'd']);

    const optATa = getVal(row, ['option_a_ta', 'tamiloptiona', 'tamil_a']) || optAEn;
    const optBTa = getVal(row, ['option_b_ta', 'tamiloptionb', 'tamil_b']) || optBEn;
    const optCTa = getVal(row, ['option_c_ta', 'tamiloptionc', 'tamil_c']) || optCEn;
    const optDTa = getVal(row, ['option_d_ta', 'tamiloptiond', 'tamil_d']) || optDEn;

    const optionsEn = [optAEn, optBEn, optCEn, optDEn].map((opt, i) => opt || `Option ${String.fromCharCode(65 + i)}`);
    const optionsTa = [optATa, optBTa, optCTa, optDTa].map((opt, i) => opt || optionsEn[i]);

    // Determine correct option index
    let correctOptionIndex = 0;
    const rawAns = getVal(row, ['correct_option_index', 'correct_option', 'correctindex', 'correct_index', 'answer_key', 'key', 'ans']);
    if (rawAns) {
      const upperAns = rawAns.toUpperCase();
      if (['0', 'A', 'OPTION A', 'OPTION 1'].includes(upperAns)) correctOptionIndex = 0;
      else if (['1', 'B', 'OPTION B', 'OPTION 2'].includes(upperAns)) correctOptionIndex = 1;
      else if (['2', 'C', 'OPTION C', 'OPTION 3'].includes(upperAns)) correctOptionIndex = 2;
      else if (['3', 'D', 'OPTION D', 'OPTION 4'].includes(upperAns)) correctOptionIndex = 3;
      else if (['4', 'E', 'OPTION E', 'OPTION 5'].includes(upperAns)) correctOptionIndex = 4;
      else if (!isNaN(Number(rawAns)) && Number(rawAns) >= 0 && Number(rawAns) < 5) {
        correctOptionIndex = Number(rawAns);
      }
    }

    const expEn = getVal(row, ['correct_answer_en', 'explanation_en', 'explanation', 'rationale']) || 'No explanation provided.';
    const expTa = getVal(row, ['correct_answer_ta', 'explanation_ta', 'tamilexplanation']) || expEn;

    const mcqObj: MCQQuestion = {
      id: rowId,
      type: 'mcq',
      question_en: qText,
      question_ta: qTamilText,
      options_en: optionsEn,
      options_ta: optionsTa,
      correctOptionIndex,
      correctAnswer_en: expEn,
      correctAnswer_ta: expTa,
      explanation_en: expEn,
      explanation_ta: expTa,
      marks: marksNum,
      negativeMarks: negMarksNum,
      difficulty: difficultyVal,
      year: yearVal,
      // Legacy compatibility
      questionText: qText,
      questionTamilText: qTamilText,
      options: optionsEn,
      tamilOptions: optionsTa,
      explanation: expEn,
      tamilExplanation: expTa
    };

    if (parentId) {
      let parentPassage = passageMap.get(parentId);
      if (!parentPassage) {
        parentPassage = {
          id: parentId,
          type: 'passage',
          title_en: 'Reading Comprehension',
          title_ta: 'வாசிப்புப் பகுதி',
          passage_en: 'Read the passage carefully and answer the question below.',
          passage_ta: 'பின்வரும் பத்தியைப் படித்து வினாக்களுக்கு விடையளிக்கவும்.',
          questions: [],
          marks: marksNum,
          negativeMarks: negMarksNum,
          difficulty: difficultyVal,
          year: yearVal
        };
        passageMap.set(parentId, parentPassage);
        topLevelQuestions.push(parentPassage);
      }
      parentPassage.questions.push(mcqObj);
    } else {
      topLevelQuestions.push(mcqObj);
    }
  }

  const title = filename.replace(/\.csv$/i, '').replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    questions: topLevelQuestions,
    title,
    difficulty: 'Mixed',
    timeLimit: topLevelQuestions.length * 60,
    pdfName: filename
  };
}

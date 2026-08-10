import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import { fallbackEnv } from './src/db/env-fallback';
import { extractQuestionsFromText } from './src/ai/ExtractQuestions';
import { generateOfflineQuestions } from './src/ai/OfflineGenerator';
import { cleanQuestionText } from './src/utils/pdfCleaner';
import { 
  getDbStatus, 
  saveExamResult, 
  getExamResults, 
  deleteExamResult, 
  saveQuestionPaper, 
  getQuestionPapers,
  resetConnection,
  deleteQuestionPaper,
  clearAllExamResults,
  updateQuestionPaperTopic
} from './src/db/mongodb';


dotenv.config();

// Fallback to compiled build-time fallback or .env.example if key environment variables are missing
if (!process.env.MONGODB_URI) {
  if (fallbackEnv && fallbackEnv.MONGODB_URI) {
    process.env.MONGODB_URI = fallbackEnv.MONGODB_URI;
  }
}
if (!process.env.GEMINI_API_KEY) {
  if (fallbackEnv && fallbackEnv.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = fallbackEnv.GEMINI_API_KEY;
  }
}

if (!process.env.MONGODB_URI || !process.env.GEMINI_API_KEY) {
  const fallbackPaths = [
    path.join(process.cwd(), '.env.example'),
    path.join(__dirname, '..', '.env.example'),
    path.join(__dirname, '.env.example'),
    path.join(__dirname, '../..', '.env.example'),
  ];
  
  for (const p of fallbackPaths) {
    if (fs.existsSync(p)) {
      try {
        console.log(`[Server] Loading environment fallback from ${p}`);
        const exampleConfig = dotenv.parse(fs.readFileSync(p));
        for (const k in exampleConfig) {
          if (!process.env[k]) {
            process.env[k] = exampleConfig[k];
          }
        }
        break;
      } catch (e) {
        console.warn(`[Server] Failed to parse fallback from ${p}:`, e);
      }
    }
  }
}

/**
 * Programmatically cleans prefix text like "In the scope of JTO LICE 2022," or "Regarding JTO LICE 2022,"
 * from question texts, option texts, and translations, while also ensuring no repeated/duplicate questions are returned.
 * Uses advanced Jaccard token-based similarity and option signature hashes to detect semantic duplicates.
 */
function cleanAndDeduplicateQuestions(questions: any[]): any[] {
  if (!Array.isArray(questions)) return [];

  const result: any[] = [];

  // Stop words for robust semantic token comparison
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'of', 'in', 'are', 'on', 'at', 'to', 'from', 'by', 
    'with', 'for', 'about', 'as', 'that', 'this', 'these', 'those', 'which', 
    'what', 'who', 'how', 'why', 'where', 'when', 'following', 'following:',
    'correct', 'statement', 'about', 'regarding', 'concerning'
  ]);

  // Token extraction utility
  const getTokens = (text: string): Set<string> => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const words = cleaned.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    return new Set(words);
  };

  // Jaccard similarity utility
  const calculateJaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    if (setA.size === 0 || setB.size === 0) return 0;
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return intersection.size / union.size;
  };

  for (const q of questions) {
    if (!q) continue;

    let qText = cleanQuestionText(q.questionText || '');
    let qTamilText = cleanQuestionText(q.questionTamilText || '');

    // Clean options: strip prefixes like "A)", "A.", "(A)", "Option A:", "விடை அ:"
    const cleanOption = (opt: string) => {
      if (typeof opt !== 'string') return String(opt || '').trim();
      let cleaned = opt.trim();
      let prevOpt = '';
      do {
        prevOpt = cleaned;
        // Strip explicit parenthesized letter prefix e.g. "(A)", "(1)", "(a)"
        cleaned = cleaned.replace(/^\(([A-D1-4a-d])\)\s*/i, '').trim();
        // Strip explicit bracketed letter prefix e.g. "[A]", "[1]", "[a]"
        cleaned = cleaned.replace(/^\[([A-D1-4a-d])\]\s*/i, '').trim();
        // Strip prefix with trailing delimiter like "A.", "A)", "A-", "A:", "1.", "1)", "1-"
        cleaned = cleaned.replace(/^([A-D1-4a-d1-4])\s*[\u0029\u002E:-]\s*/i, '').trim();
        // Strip explicit labels like "Option A:", "Option 1:", "Choice A", "விடை அ:", "பதில் அ:", "ஆப்ஷன் அ:" etc.
        cleaned = cleaned.replace(/^(?:Option|Choice|விடை|ஆப்ஷன்|பதில்|விடைத் தொகுதி)\s*[A-D1-4அ-ஊa-d]?\s*[\u002E:-——–]?\s*/gi, '').trim();
        // Use general cleaner to ensure any JTO LICE remnants are also removed from option body
        cleaned = cleanQuestionText(cleaned);
      } while (cleaned !== prevOpt);

      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      return cleaned;
    };

    const cleanTamilOption = (opt: string) => {
      if (typeof opt !== 'string') return String(opt || '').trim();
      let cleaned = opt.trim();
      let prevOpt = '';
      do {
        prevOpt = cleaned;
        // Strip explicit parenthesized Tamil prefix e.g. "(அ)", "(ஆ)"
        cleaned = cleaned.replace(/^\(([அஆஇஈஉஊ])\)\s*/, '').trim();
        // Strip explicit bracketed Tamil prefix e.g. "[அ]"
        cleaned = cleaned.replace(/^\[([அஆஇஈஉஊ])\]\s*/, '').trim();
        // Strip Tamil prefix with trailing delimiter like "அ.", "அ)", "அ-"
        cleaned = cleaned.replace(/^([அஆஇஈஉஊ])\s*[\u0029\u002E:-]\s*/, '').trim();
        
        // Strip English prefixes in Tamil translation
        cleaned = cleaned.replace(/^\(([A-D1-4a-d])\)\s*/i, '').trim();
        cleaned = cleaned.replace(/^\[([A-D1-4a-d])\]\s*/i, '').trim();
        cleaned = cleaned.replace(/^([A-D1-4a-d1-4])\s*[\u0029\u002E:-]\s*/i, '').trim();

        // Strip label formats
        cleaned = cleaned.replace(/^(?:Option|Choice|விடை|ஆப்ஷன்|பதில்|விடைத் தொகுதி)\s*[A-Dஅஆஇஈஉஊ1-4a-d]?\s*[\u002E:-——–]?\s*/gi, '').trim();
        
        // Use general cleaner to ensure any JTO LICE remnants are also removed from option body
        cleaned = cleanQuestionText(cleaned);
      } while (cleaned !== prevOpt);

      if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
      return cleaned;
    };

    const options = (q.options || []).map(cleanOption);
    const tamilOptions = Array.isArray(q.tamilOptions) ? q.tamilOptions.map(cleanTamilOption) : [];

    // Verify option integrity (ensure we have 4 options)
    if (options.length < 4) {
      console.log(`[Deduplicator] Skipping question with less than 4 options: "${qText}"`);
      continue;
    }

    // Check for internal option duplication
    const seenOptions = new Set<string>();
    let hasDuplicateOptions = false;
    for (const opt of options) {
      const normalizedOpt = opt.toLowerCase().trim();
      if (!normalizedOpt) {
        hasDuplicateOptions = true;
        break;
      }
      if (seenOptions.has(normalizedOpt)) {
        hasDuplicateOptions = true;
        break;
      }
      seenOptions.add(normalizedOpt);
    }

    if (hasDuplicateOptions) {
      console.log(`[Deduplicator] Question has empty or duplicate options: "${qText}". Skipping to ensure quality.`);
      continue;
    }

    // Filter out empty or too short questions
    if (qText.length < 10) {
      console.log(`[Deduplicator] Question text too short: "${qText}". Skipping.`);
      continue;
    }

    // Advanced token-based semantic deduplication
    const qTokens = getTokens(qText);
    const qTamilTokens = getTokens(qTamilText);
    let isDuplicate = false;

    for (const existing of result) {
      // 1. Literal Exact Match on clean text
      if (qText.toLowerCase().replace(/[^a-z0-9]/g, '') === existing.questionText.toLowerCase().replace(/[^a-z0-9]/g, '')) {
        console.log(`[Deduplicator] Removing exact text duplicate: "${qText}"`);
        isDuplicate = true;
        break;
      }

      // 2. Token-based Jaccard Similarity (English)
      const existingTokens = getTokens(existing.questionText);
      const similarity = calculateJaccardSimilarity(qTokens, existingTokens);
      if (similarity > 0.65) {
        console.log(`[Deduplicator] Removing semantic duplicate (Jaccard: ${similarity.toFixed(2)}): "${qText}" vs "${existing.questionText}"`);
        isDuplicate = true;
        break;
      }

      // 3. Token-based Jaccard Similarity (Tamil)
      if (qTamilText && existing.questionTamilText) {
        const existingTamilTokens = getTokens(existing.questionTamilText);
        const tamilSimilarity = calculateJaccardSimilarity(qTamilTokens, existingTamilTokens);
        if (tamilSimilarity > 0.65) {
          console.log(`[Deduplicator] Removing Tamil semantic duplicate (Jaccard: ${tamilSimilarity.toFixed(2)}): "${qTamilText}" vs "${existing.questionTamilText}"`);
          isDuplicate = true;
          break;
        }
      }

      // 4. Option Set Overlap Check
      // If 3 or more option strings are exactly identical, it is the same core question
      const existingOptSet = new Set(existing.options.map((o: string) => o.toLowerCase().trim()));
      const commonOpts = options.filter((o: string) => existingOptSet.has(o.toLowerCase().trim())).length;
      if (commonOpts >= 3) {
        console.log(`[Deduplicator] Removing high option-signature duplicate (${commonOpts}/4 matching options): "${qText}"`);
        isDuplicate = true;
        break;
      }
    }

    if (isDuplicate) {
      continue;
    }

    // Sanitize correctOptionIndex
    let correctIdx = parseInt(q.correctOptionIndex);
    if (isNaN(correctIdx) || correctIdx < 0 || correctIdx > 3) {
      correctIdx = 0; // Default fallback
    }

    // Sync up Tamil options length
    const finalTamilOptions = tamilOptions.length === 4 ? tamilOptions : [...options];

    result.push({
      ...q,
      questionText: qText,
      questionTamilText: qTamilText || qText, // Fallback if empty
      options,
      tamilOptions: finalTamilOptions,
      correctOptionIndex: correctIdx
    });
  }

  return result;
}

function sanitizeJSONString(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // Strip code block markers
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([\}\]])/g, '$1');

  // Replace unescaped control characters inside JSON string literals
  cleaned = cleaned.replace(/[\u0000-\u001F]+/g, (match) => {
    if (match.includes('\n') || match.includes('\r')) return ' ';
    if (match.includes('\t')) return ' ';
    return '';
  });

  return cleaned;
}

function tryRegexExtractQuestion(candidate: string, defaultId: string): any | null {
  try {
    const qMatch = candidate.match(/"questionText"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
    const qTamilMatch = candidate.match(/"questionTamilText"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
    const optionsMatch = candidate.match(/"options"\s*:\s*\[([\s\S]*?)\]/i);
    const correctIdxMatch = candidate.match(/"correctOptionIndex"\s*:\s*(\d+)/i);
    const explanationMatch = candidate.match(/"explanation"\s*:\s*"((?:[^"\\]|\\.)*)"/i);
    const tamilExplanationMatch = candidate.match(/"tamilExplanation"\s*:\s*"((?:[^"\\]|\\.)*)"/i);

    if (qMatch) {
      const qText = qMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim();
      const qTamilText = qTamilMatch ? qTamilMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ').trim() : qText;
      
      let options: string[] = [];
      if (optionsMatch) {
        const rawOpts = optionsMatch[1].match(/"((?:[^"\\]|\\.)*)"/g);
        if (rawOpts) {
          options = rawOpts.map(o => o.slice(1, -1).replace(/\\"/g, '"').trim());
        }
      }
      if (options.length < 4) {
        while (options.length < 4) {
          options.push(`Option ${options.length + 1}`);
        }
      }

      const correctOptionIndex = correctIdxMatch ? parseInt(correctIdxMatch[1], 10) : 0;
      const explanation = explanationMatch ? explanationMatch[1].replace(/\\"/g, '"') : 'Correct answer.';
      const tamilExplanation = tamilExplanationMatch ? tamilExplanationMatch[1].replace(/\\"/g, '"') : 'சரியான விடை.';

      return {
        id: defaultId,
        questionText: qText,
        questionTamilText: qTamilText,
        options: options.slice(0, 4),
        tamilOptions: options.slice(0, 4),
        correctOptionIndex: (correctOptionIndex >= 0 && correctOptionIndex < 4) ? correctOptionIndex : 0,
        explanation,
        tamilExplanation,
        topic: 'General Syllabus',
        difficulty: 'Medium'
      };
    }
  } catch (err) {
    // Regex extraction failed
  }
  return null;
}

function extractValidJSONObjects(text: string): any[] {
  const results: any[] = [];
  let braceCount = 0;
  let startIndex = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        if (braceCount === 0) {
          startIndex = i;
        }
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          const candidate = text.substring(startIndex, i + 1);
          let parsedObj: any = null;
          
          try {
            parsedObj = JSON.parse(candidate);
          } catch (e) {
            try {
              parsedObj = JSON.parse(sanitizeJSONString(candidate));
            } catch (e2) {
              parsedObj = tryRegexExtractQuestion(candidate, `q${results.length + 1}`);
            }
          }

          if (parsedObj && typeof parsedObj === 'object' && parsedObj.questionText) {
            results.push(parsedObj);
          }
          startIndex = -1;
        }
      }
    }
  }

  // If we ended mid-object because of output truncation, attempt regex recovery on the tail
  if (startIndex !== -1 && startIndex < text.length) {
    const tailCandidate = text.substring(startIndex);
    const recovered = tryRegexExtractQuestion(tailCandidate, `q${results.length + 1}`);
    if (recovered && recovered.questionText) {
      results.push(recovered);
    }
  }

  return results;
}

function parseRobustJSONArray(text: string): any[] {
  if (!text) return [];
  const cleaned = sanitizeJSONString(text);
  if (!cleaned) return [];

  // 1. Standard JSON parse on sanitized text
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      return [parsed];
    }
  } catch (e) {
    // Standard parse failed
  }

  // 2. Repair truncated JSON array if text starts with '['
  if (cleaned.startsWith('[')) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace !== -1) {
      const repaired = cleaned.substring(0, lastBrace + 1) + ']';
      try {
        const parsed = JSON.parse(repaired);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Repair failed
      }
    }
  }

  // 3. Fallback to resilient object scanner
  try {
    return extractValidJSONObjects(cleaned);
  } catch (e) {
    console.warn("Resilient JSON object extractor fallback:", e);
    return [];
  }
}

const PORT = 3000;

let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please configure it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const app = express();

  // Increase payload size limit to support PDF uploads
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // MongoDB Database Integration APIs
  app.get('/api/db-status', async (req, res) => {
    try {
      const status = await getDbStatus();
      res.json({ success: true, status });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.post('/api/update-db-uri', async (req, res) => {
    try {
      const { uri } = req.body;
      if (!uri) {
        return res.status(400).json({ success: false, error: 'Database URI is required' });
      }

      // 1. Reset and test connection
      const connected = await resetConnection(uri);
      
      // 2. If succeeded, persist to .env
      if (connected) {
        try {
          const envPath = path.join(process.cwd(), '.env');
          let envContent = '';
          if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
          }
          
          if (envContent.includes('MONGODB_URI=')) {
            envContent = envContent.replace(/MONGODB_URI=.*(\r?\n)?/g, `MONGODB_URI="${uri}"\n`);
          } else {
            envContent += `\nMONGODB_URI="${uri}"\n`;
          }
          fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
        } catch (err: any) {
          console.warn('[MongoDB] Failed to write updated URI to .env:', err);
        }
      }

      res.json({ 
        success: true, 
        connected, 
        error: !connected ? 'Handshake/Auth failed. Verify credentials, database exists, and IP whitelist in MongoDB Atlas is configured for 0.0.0.0/0 (allow access from anywhere).' : null 
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.get('/api/results', async (req, res) => {
    try {
      const userId = (req.query.userId || req.query.username) as string;
      const results = await getExamResults(userId);
      res.json({ success: true, results });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.post('/api/save-result', async (req, res) => {
    try {
      const resultDoc = req.body;
      const saved = await saveExamResult(resultDoc);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.delete('/api/results/:id', async (req, res) => {
    try {
      const userId = (req.query.userId || req.query.username) as string;
      const deleted = await deleteExamResult(req.params.id, userId);
      if (deleted) {
        res.json({ success: true, message: 'Result deleted successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Result not found' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.delete('/api/results', async (req, res) => {
    try {
      const userId = (req.query.userId || req.query.username || req.body?.userId) as string;
      await clearAllExamResults(userId);
      res.json({ success: true, message: 'All results deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.get('/api/question-papers', async (req, res) => {
    try {
      const userId = (req.query.userId || req.query.username) as string;
      const papers = await getQuestionPapers(userId);
      res.json({ success: true, papers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.delete('/api/question-papers/:id', async (req, res) => {
    try {
      const userId = (req.query.userId || req.query.username) as string;
      const deleted = await deleteQuestionPaper(req.params.id, userId);
      if (deleted) {
        res.json({ success: true, message: 'Question paper deleted successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Question paper not found' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.put('/api/question-papers/:id', async (req, res) => {
    try {
      const { topic, userId } = req.body;
      if (!topic) {
        return res.status(400).json({ success: false, error: 'Topic is required' });
      }
      const updated = await updateQuestionPaperTopic(req.params.id, topic, userId);
      if (updated) {
        res.json({ success: true, message: 'Question paper renamed successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Question paper not found' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.post('/api/save-question-paper', async (req, res) => {
    try {
      const paperDoc = req.body;
      const saved = await saveQuestionPaper(paperDoc);
      res.json({ success: true, data: saved });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });


  // Extract questions from raw PDF text input
  app.post('/api/analyze-pdf-text', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { rawText, count, difficulty, topic } = req.body;

      if (!rawText) {
        return res.status(400).json({ error: 'Raw text content is required' });
      }

      const ai = getAiClient();
      const targetCount = parseInt(count) || 10;
      const questions = await extractQuestionsFromText(
        ai, 
        rawText, 
        targetCount, 
        difficulty || 'Mixed', 
        topic || 'General Syllabus'
      );
      const rawCount = questions.length;
      let cleanedQuestions = cleanAndDeduplicateQuestions(questions);
      const deduplicatedCount = cleanedQuestions.length;
      const duplicatesRemoved = Math.max(0, rawCount - deduplicatedCount);

      // Backfill if we have duplicates or fewer questions than requested
      if (cleanedQuestions.length < targetCount) {
        const gap = targetCount - cleanedQuestions.length;
        console.log(`[Deduplicator Text] Deduplication resulted in ${cleanedQuestions.length} questions, which is ${gap} short of requested ${targetCount}. Generating non-repetitive fallback fillers...`);
        const filler = generateOfflineQuestions(topic || 'General Syllabus', gap * 2, difficulty || 'Mixed');
        const getQKey = (q: any) => ((q.questionText || q.question_en || '') as string).toLowerCase().replace(/[^a-z0-9]/g, '');
        const existingKeys = new Set(cleanedQuestions.map(getQKey));
        
        for (const f of filler) {
          if (cleanedQuestions.length >= targetCount) break;
          const key = getQKey(f);
          if (!existingKeys.has(key)) {
            cleanedQuestions.push(f);
            existingKeys.add(key);
          }
        }
        
        if (cleanedQuestions.length < targetCount) {
          for (const f of filler) {
            if (cleanedQuestions.length >= targetCount) break;
            cleanedQuestions.push(f);
          }
        }
      }

      if (cleanedQuestions.length > targetCount) {
        cleanedQuestions = cleanedQuestions.slice(0, targetCount);
      }

      const finalizedQuestions = cleanedQuestions.map((q, idx) => ({
        ...q,
        id: `q${idx + 1}`
      }));

      // Auto-save the generated question set to MongoDB
      try {
        await saveQuestionPaper({
          topic: topic || 'General Syllabus (Text)',
          difficulty: difficulty || 'Mixed',
          count: finalizedQuestions.length,
          questions: finalizedQuestions,
          source: 'PDF Text Extraction'
        });
      } catch (e) {
        console.warn('[MongoDB] Auto-save question paper failed:', e);
      }

      res.json({ success: true, questions: finalizedQuestions, duplicatesRemoved });
    } catch (error: any) {
      console.error('PDF Text Extraction Error:', error);
      res.status(500).json({
        error: error.message || 'An error occurred during PDF text processing.',
        details: error.stack
      });
    }
  });

  // Generate CBT Questions from PDF upload
  app.post('/api/analyze-pdf', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { pdfBase64, count, difficulty, topic } = req.body;

      if (!pdfBase64) {
        return res.status(400).json({ error: 'PDF data is required' });
      }

      const ai = getAiClient();
      const isAll = count === 'all' || count === 'All';
      const parsedCount = parseInt(count);
      const questionCount = isAll ? 100 : Math.min(Math.max(parsedCount || 50, 5), 200);

      // Quota Guard Check
      if ((global as any).isGeminiQuotaExhausted) {
        console.info('[Quota Guard] Gemini API Quota is exhausted. Instantly routing to high-performance local offline question generator for PDF.');
        const questions = generateOfflineQuestions(topic || 'General Syllabus', questionCount, difficulty || 'Mixed');
        return res.json({ success: true, questions, offlineFallback: true });
      }

      // Determine batch configuration.
      // To stay safely within output token limits and ensure fast responses, we generate in batches of up to 12 questions each.
      const maxBatchSize = 12;
      const batches: { size: number; startIndex: number; batchNumber: number }[] = [];
      let remaining = questionCount;
      let currentStartIndex = 0;
      let batchNum = 1;

      while (remaining > 0) {
        const size = Math.min(remaining, maxBatchSize);
        batches.push({
          size,
          startIndex: currentStartIndex,
          batchNumber: batchNum
        });
        currentStartIndex += size;
        remaining -= size;
        batchNum++;
      }

      console.log(`Starting batched generation for ${questionCount} questions across ${batches.length} sequential batches...`);

      const allQuestions = [];
      for (const batch of batches) {
        if ((global as any).isGeminiQuotaExhausted) {
          console.warn(`[Quota Guard] Bypassing Gemini API for Batch ${batch.batchNumber} due to active quota exhaustion. Instantly routing to local offline generator.`);
          const offlineQuestions = generateOfflineQuestions(topic || 'General Syllabus', batch.size, difficulty || 'Mixed');
          const batchQuestions = offlineQuestions.map((q, idx) => ({
            ...q,
            id: `q${batch.startIndex + idx + 1}`
          }));
          allQuestions.push(...batchQuestions);
          continue; // Move on to next batch immediately without hitting API or sleeping
        }

        if (batch.batchNumber > 1) {
          console.log(`Sleeping 3.0s before batch ${batch.batchNumber}/${batches.length} to respect API rate limits...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        const startPercent = Math.round((batch.startIndex / questionCount) * 100);
        const endPercent = Math.round(((batch.startIndex + batch.size) / questionCount) * 100);

        let avoidSection = "";
        if (allQuestions.length > 0) {
          const previousTitles = allQuestions.slice(-25).map((q, idx) => `${idx + 1}. ${q.questionText}`).join('\n');
          avoidSection = `\nCRITICAL DUPLICATE PREVENTION:
To guarantee a completely unique exam paper with zero repetition, you MUST NOT generate any questions that cover the same specific items, formulas, definitions, or queries as those already generated in previous batches.
Do NOT generate any questions similar to or duplicate of these questions already created:
${previousTitles}
`;
        }

        const systemPrompt = `You are an expert National CBT Examination Board syllabus analyst, Question Paper Designer, and Exam Question Extractor powered by Gemini Flash AI.
Your absolute highest priority is to search the uploaded PDF document for ALL ACTUAL practice questions, past exam questions (PYQs), or question pools in the document or current section.
When extracting questions from the PDF:
1. Examine the ENTIRE PDF document including any Answer Keys, Solution Sheets, or marked correct answers at the end or inline.
2. Match every extracted question with its 100% ACCURATE correct answer option index (0 for Option A, 1 for Option B, 2 for Option C, 3 for Option D).
3. Extract all 4 options (A, B, C, D) accurately.
4. Translate all questions, options, and explanations into clear English and formal academic Tamil.
5. Provide a clear, concise explanation explaining WHY the correct option is right based on the syllabus or answer key.
6. Strictly remove all extraneous scripts/languages (such as Devanagari, Hindi, Malayalam, Spanish, etc.).

If the PDF does NOT contain pre-existing questions in this section, or if they are insufficient to meet the requested count of ${batch.size} questions, you MUST generate highly accurate, professional, syllabus-rooted bilingual MCQs covering the material in this section.

Each question (extracted or generated) MUST:
1. Have exactly 4 plausible, high-quality, distinct options, with only 1 correct option.
2. Be completely bilingual: provided in both English and Tamil with high linguistic accuracy. Strictly do NOT include other scripts or other languages.
3. Be completely free from repetition, duplicates, or overlap.
4. Feature a very concise explanation for the correct answer, in both English and Tamil only.
5. Identify the precise sub-topic or chapter.
6. Match the requested difficulty level, or distribute naturally based on the material.
7. Be strictly rooted in the facts presented in the document.
8. NEVER prepend the questionText or options with introductory context or meta-phrases. Start the question text directly.
9. REMOVE ALL DIAGRAMS, inline SVGs, image tags, drawings, or placeholders (like [diagram], <img>, Fig 1, or base64 streams). Represent any diagrammatic questions purely in self-contained academic text.

This is Batch #${batch.batchNumber} of the generation. You must output exactly ${batch.size} unique questions.
Focus on the section of the PDF document corresponding to roughly ${startPercent}% to ${endPercent}% of its content depth.
${avoidSection}

CRITICAL TRUNCATION REQUIREMENT: Keep both the "explanation" and "tamilExplanation" fields extremely concise (maximum 1 short sentence or under 15 words each) to avoid running out of token limits.`;

        const contents = [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            text: `Thoroughly analyze this PDF document and scan for all actual questions and answer keys inside. Extract exactly ${batch.size} questions from the portion of the material corresponding to the range ${startPercent}% to ${endPercent}% of the document content, accurately matching each question with its correct option answer and explanation. If insufficient questions exist, generate syllabus-rooted bilingual questions. Topic focus: ${topic || 'General Syllabus'}. Difficulty target: ${difficulty || 'Mixed'}. Ensure all questions are bilingual in English and Tamil with 100% accurate option mapping. Assign sequential IDs starting from q${batch.startIndex + 1}. Ensure explanations are under 15 words. Avoid any duplicates. ${avoidSection}`,
          },
        ];

        const modelsToTry = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite'];
        let responseText = '';
        let success = false;
        let lastError: any = null;

        for (const model of modelsToTry) {
          try {
            console.log(`[Batch ${batch.batchNumber}] Attempting generation using model ${model}...`);
            const response = await ai.models.generateContent({
              model,
              contents,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
                maxOutputTokens: 8192,
                responseSchema: {
                  type: Type.ARRAY,
                  description: `A list of exactly ${batch.size} generated professional bilingual exam questions for batch ${batch.batchNumber}`,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: `Unique question ID starting with q${batch.startIndex + 1}` },
                      questionText: { type: Type.STRING, description: 'Question in clear academic English' },
                      questionTamilText: { type: Type.STRING, description: 'Question in accurate, formal Tamil translation' },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Exactly 4 distinct English options'
                      },
                      tamilOptions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Exactly 4 translated Tamil options corresponding exactly to the English ones'
                      },
                      correctOptionIndex: { type: Type.INTEGER, description: 'Zero-based index (0 to 3) of the correct option' },
                      explanation: { type: Type.STRING, description: 'Extremely concise (under 15 words) explanation of the correct answer and concepts in English' },
                      tamilExplanation: { type: Type.STRING, description: 'Extremely concise (under 15 words) explanation translated into high-quality formal Tamil' },
                      topic: { type: Type.STRING, description: 'Sub-topic or chapter category name' },
                      difficulty: { type: Type.STRING, description: 'Difficulty tier: Easy, Medium, or Hard' }
                    },
                    required: ['id', 'questionText', 'questionTamilText', 'options', 'tamilOptions', 'correctOptionIndex', 'explanation', 'tamilExplanation', 'topic', 'difficulty']
                  }
                }
              }
            });

            if (response.text) {
              responseText = response.text;
              success = true;
              break; // Exit the model loop on success!
            }
          } catch (err: any) {
            const errMsg = String(err?.message || err || '').toLowerCase();
            const is429 = err?.status === 429 || err?.code === 429 || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('resource_exhausted');
            if (is429) {
              console.warn(`[Quota Guard] Gemini API Quota limit reached on Batch ${batch.batchNumber} using model ${model}. Transitioning to offline fallback.`);
              (global as any).isGeminiQuotaExhausted = true;
            } else {
              let displayMsg = err?.message || String(err);
              if (displayMsg.includes('{')) {
                try {
                  const parsed = JSON.parse(displayMsg);
                  displayMsg = parsed?.error?.message || parsed?.message || 'Server-side API issue';
                } catch (_) {
                  displayMsg = displayMsg.substring(0, 100);
                }
              }
              console.warn(`[Batch ${batch.batchNumber}] Model ${model} returned status: ${displayMsg}`);
            }
            lastError = err;
          }
        }

        if (!success) {
          console.warn(`[Batch ${batch.batchNumber}] All Gemini models failed. Activating Offline Bilingual Question Generator fallback!`);
          const offlineQuestions = generateOfflineQuestions(topic || 'General Syllabus', batch.size, difficulty || 'Mixed');
          const batchQuestions = offlineQuestions.map((q, idx) => ({
            ...q,
            id: `q${batch.startIndex + idx + 1}`
          }));
          allQuestions.push(...batchQuestions);
          continue; // Go to the next batch
        }

        let parsedBatch: any[] = [];
        try {
          parsedBatch = parseRobustJSONArray(responseText);
        } catch (e: any) {
          console.warn(`[Batch ${batch.batchNumber}] JSON parse warning:`, e?.message);
        }

        if (parsedBatch.length > 0) {
          allQuestions.push(...parsedBatch);
        }

        if (parsedBatch.length < batch.size) {
          const needed = batch.size - parsedBatch.length;
          console.warn(`[Batch ${batch.batchNumber}] Parsed ${parsedBatch.length}/${batch.size} questions. Filling ${needed} fallback questions.`);
          const offlineQuestions = generateOfflineQuestions(topic || 'General Syllabus', needed * 2, difficulty || 'Mixed');
          const batchQuestions = offlineQuestions.slice(0, needed).map((q, idx) => ({
            ...q,
            id: `q${batch.startIndex + parsedBatch.length + idx + 1}`
          }));
          allQuestions.push(...batchQuestions);
        }
      }

      // Clean and de-duplicate the consolidated questions
      const rawCount = allQuestions.length;
      let cleanedAndDeduplicated = cleanAndDeduplicateQuestions(allQuestions);
      const deduplicatedCount = cleanedAndDeduplicated.length;
      const duplicatesRemoved = Math.max(0, rawCount - deduplicatedCount);

      // Backfill gaps with completely unique questions if deduplication took out some questions
      if (cleanedAndDeduplicated.length < questionCount) {
        const gap = questionCount - cleanedAndDeduplicated.length;
        console.log(`[Deduplicator PDF] Deduplication resulted in ${cleanedAndDeduplicated.length} questions, which is ${gap} short of requested ${questionCount}. Generating non-repetitive fallback fillers...`);
        const filler = generateOfflineQuestions(topic || 'General Syllabus', gap * 2, difficulty || 'Mixed');
        const getQKey = (q: any) => ((q.questionText || q.question_en || '') as string).toLowerCase().replace(/[^a-z0-9]/g, '');
        const existingKeys = new Set(cleanedAndDeduplicated.map(getQKey));
        
        for (const f of filler) {
          if (cleanedAndDeduplicated.length >= questionCount) break;
          const key = getQKey(f);
          if (!existingKeys.has(key)) {
            cleanedAndDeduplicated.push(f);
            existingKeys.add(key);
          }
        }
        
        if (cleanedAndDeduplicated.length < questionCount) {
          for (const f of filler) {
            if (cleanedAndDeduplicated.length >= questionCount) break;
            cleanedAndDeduplicated.push(f);
          }
        }
      }

      // Slice strictly to requested count
      if (cleanedAndDeduplicated.length > questionCount) {
        cleanedAndDeduplicated = cleanedAndDeduplicated.slice(0, questionCount);
      }

      // Standardize the IDs to be strictly unique sequential: q1, q2, q3, ...
      const questions = cleanedAndDeduplicated.map((q, idx) => ({
        ...q,
        id: `q${idx + 1}`
      }));

      // Auto-save the generated question set to MongoDB
      try {
        await saveQuestionPaper({
          topic: topic || 'General Syllabus (PDF)',
          difficulty: difficulty || 'Mixed',
          count: questions.length,
          questions,
          source: 'PDF Parse Extraction'
        });
      } catch (e) {
        console.warn('[MongoDB] Auto-save question paper failed:', e);
      }

      console.log(`Successfully generated, cleaned, and combined ${questions.length} questions.`);
      res.json({ success: true, questions, duplicatesRemoved });
    } catch (error: any) {
      console.error('PDF Analysis Error:', error);
      res.status(500).json({
        error: error.message || 'An error occurred during PDF parsing and question generation.',
        details: error.stack
      });
    }
  });

  // Generate CBT Questions from a Topic / Prompt
  app.post('/api/generate-topic-exam', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { topic, count, difficulty } = req.body;

      if (!topic) {
        return res.status(400).json({ error: 'Topic or subject prompt is required' });
      }

      const ai = getAiClient();
      const questionCount = Math.min(Math.max(parseInt(count) || 10, 5), 25);

      // Quota Guard Check
      if ((global as any).isGeminiQuotaExhausted) {
        console.info('[Quota Guard] Gemini API Quota is exhausted. Instantly routing to high-performance local offline question generator for Topic.');
        const questions = generateOfflineQuestions(topic || 'General Syllabus', questionCount, difficulty || 'Mixed');
        return res.json({ success: true, questions, offlineFallback: true });
      }

      const systemPrompt = `You are an elite National CBT Examination Master.
Your task is to generate exactly ${questionCount} premium, syllabus-grade multiple-choice questions for the requested topic.

Topic of Exam: ${topic}
Target Difficulty: ${difficulty || 'Mixed'}

Each question MUST:
1. Have exactly 4 plausible, high-quality choices with 1 correct option.
2. Be completely bilingual, presenting both high-quality English text and formal, accurate Tamil exam translation.
3. Contain zero duplicate concepts.
4. Have a detailed educational explanation in both English and Tamil justifying the correct answer.
5. Match the targeted difficulty: ${difficulty}.
6. NEVER prepend the questionText or options with introductory context or redundant phrases like "In the scope of JTO LICE 2022,", "Regarding JTO LICE 2022,", "With respect to JTO LICE 2022,", "Concerning JTO LICE 2022," or similar meta-introductory phrases. Start the question directly with the core academic question (e.g., "What is..." or "Which of..."). Keep questions clean, clear, and ensure there are no duplicate/repeated questions.`;

      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
      let responseText = '';
      let success = false;
      let lastError: any = null;

      for (const model of modelsToTry) {
        try {
          console.log(`[generate-topic-exam] Attempting generation using model ${model}...`);
          const response = await ai.models.generateContent({
            model,
            contents: `Generate a CBT question set of ${questionCount} questions for the topic "${topic}". Difficulty target: ${difficulty || 'Mixed'}. Make sure it is highly formal and professional.`,
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                description: 'A list of generated professional bilingual questions based on the topic',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: 'Unique question ID like q1, q2, q3' },
                    questionText: { type: Type.STRING, description: 'Question in clear academic English' },
                    questionTamilText: { type: Type.STRING, description: 'Question in accurate, formal Tamil translation' },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Exactly 4 distinct English options'
                    },
                    tamilOptions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Exactly 4 translated Tamil options corresponding exactly to the English ones'
                    },
                    correctOptionIndex: { type: Type.INTEGER, description: 'Zero-based index (0 to 3) of the correct option' },
                    explanation: { type: Type.STRING, description: 'Thorough explanation of the correct answer and concepts in English' },
                    tamilExplanation: { type: Type.STRING, description: 'Thorough explanation translated into high-quality formal Tamil' },
                    topic: { type: Type.STRING, description: 'Sub-topic or chapter category name' },
                    difficulty: { type: Type.STRING, description: 'Difficulty tier: Easy, Medium, or Hard' }
                  },
                  required: ['id', 'questionText', 'questionTamilText', 'options', 'tamilOptions', 'correctOptionIndex', 'explanation', 'tamilExplanation', 'topic', 'difficulty']
                }
              }
            }
          });

          if (response.text) {
            responseText = response.text;
            success = true;
            break; // Exit the loop on success!
          }
        } catch (err: any) {
          const errMsg = String(err?.message || err || '').toLowerCase();
          const is429 = err?.status === 429 || err?.code === 429 || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('resource_exhausted');
          if (is429) {
            console.warn(`[Quota Guard] Gemini API Quota limit reached on generate-topic-exam using model ${model}. Transitioning to offline fallback.`);
            (global as any).isGeminiQuotaExhausted = true;
          } else {
            let displayMsg = err?.message || String(err);
            if (displayMsg.includes('{')) {
              try {
                const parsed = JSON.parse(displayMsg);
                displayMsg = parsed?.error?.message || parsed?.message || 'Server-side API issue';
              } catch (_) {
                displayMsg = displayMsg.substring(0, 100);
              }
            }
            console.warn(`[generate-topic-exam] Model ${model} returned status: ${displayMsg}`);
          }
          lastError = err;
        }
      }

      if (!success) {
        console.warn(`[generate-topic-exam] All Gemini models failed. Activating Offline Bilingual Question Generator fallback!`);
        const offlineQ = generateOfflineQuestions(topic || 'General Syllabus', questionCount, difficulty || 'Mixed');
        const finalized = offlineQ.slice(0, questionCount).map((q, idx) => ({
          ...q,
          id: `q${idx + 1}`
        }));
        return res.json({ success: true, questions: finalized, offlineFallback: true });
      }

      let questions: any[] = [];
      try {
        questions = parseRobustJSONArray(responseText);
        if (questions.length === 0) {
          throw new Error("Parsed 0 valid question objects");
        }
      } catch (err) {
        console.error("[generate-topic-exam] Failed to parse response JSON:", err);
        console.warn("[generate-topic-exam] Activating Offline fallback due to parse error.");
        const offlineQ = generateOfflineQuestions(topic || 'General Syllabus', questionCount, difficulty || 'Mixed');
        questions = offlineQ.slice(0, questionCount).map((q, idx) => ({
          ...q,
          id: `q${idx + 1}`
        }));
      }
      let cleanedQuestions = cleanAndDeduplicateQuestions(questions);

      // Backfill if we have duplicates or fewer questions than requested
      if (cleanedQuestions.length < questionCount) {
        const gap = questionCount - cleanedQuestions.length;
        console.log(`[Deduplicator Topic] Deduplication resulted in ${cleanedQuestions.length} questions, which is ${gap} short of requested ${questionCount}. Generating non-repetitive fallback fillers...`);
        const filler = generateOfflineQuestions(topic || 'General Syllabus', gap * 2, difficulty || 'Mixed');
        const getQKey = (q: any) => ((q.questionText || q.question_en || '') as string).toLowerCase().replace(/[^a-z0-9]/g, '');
        const existingKeys = new Set(cleanedQuestions.map(getQKey));
        
        for (const f of filler) {
          if (cleanedQuestions.length >= questionCount) break;
          const key = getQKey(f);
          if (!existingKeys.has(key)) {
            cleanedQuestions.push(f);
            existingKeys.add(key);
          }
        }
        
        if (cleanedQuestions.length < questionCount) {
          for (const f of filler) {
            if (cleanedQuestions.length >= questionCount) break;
            cleanedQuestions.push(f);
          }
        }
      }

      if (cleanedQuestions.length > questionCount) {
        cleanedQuestions = cleanedQuestions.slice(0, questionCount);
      }

      const finalizedQuestions = cleanedQuestions.map((q, idx) => ({
        ...q,
        id: `q${idx + 1}`
      }));

      // Auto-save the generated question set to MongoDB
      try {
        await saveQuestionPaper({
          topic: topic,
          difficulty: difficulty || 'Mixed',
          count: finalizedQuestions.length,
          questions: finalizedQuestions,
          source: 'Topic Prompt Generation'
        });
      } catch (e) {
        console.warn('[MongoDB] Auto-save question paper failed:', e);
      }

      res.json({ success: true, questions: finalizedQuestions });
    } catch (error: any) {
      console.error('Topic Exam Generation Error:', error);
      res.status(500).json({
        error: error.message || 'An error occurred during question generation.',
        details: error.stack
      });
    }
  });

  // Serve Frontend Assets & Start Server locally (not on Vercel)
  if (!process.env.VERCEL) {
    (async () => {
      if (process.env.NODE_ENV !== 'production') {
        const { createServer: createViteServer } = await import('vite');
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
      } else {
        const distPath = path.join(process.cwd(), 'dist');
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }

      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${PORT}`);
      });
    })();
  }

  export default app;

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

      // 3. Option Set Overlap Check
      // If 3 or more option strings are exactly identical, it is likely the same core question
      const existingOptSet = new Set(existing.options.map((o: string) => o.toLowerCase().trim()));
      const commonOpts = options.filter((o: string) => existingOptSet.has(o.toLowerCase().trim())).length;
      if (commonOpts >= 3 && similarity > 0.4) {
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
          try {
            const parsedObj = JSON.parse(candidate);
            if (parsedObj && typeof parsedObj === 'object') {
              results.push(parsedObj);
            }
          } catch (e) {
            // Ignore parse errors for nested or invalid sub-blocks
          }
          startIndex = -1;
        }
      }
    }
  }
  return results;
}

function parseRobustJSONArray(text: string): any[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // 1. Try standard JSON parse first
  try {
    let cleaned = trimmed;
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();
    
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      return [parsed];
    }
  } catch (e) {
    // Standard parsing failed, proceed to resilient extraction
  }

  // 2. Fallback to resilient object-by-object scanner
  try {
    return extractValidJSONObjects(trimmed);
  } catch (e) {
    console.error("Resilient JSON object extractor failed:", e);
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
      const results = await getExamResults();
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
      const deleted = await deleteExamResult(req.params.id);
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
      await clearAllExamResults();
      res.json({ success: true, message: 'All results deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.get('/api/question-papers', async (req, res) => {
    try {
      const papers = await getQuestionPapers();
      res.json({ success: true, papers });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message || String(error) });
    }
  });

  app.delete('/api/question-papers/:id', async (req, res) => {
    try {
      const deleted = await deleteQuestionPaper(req.params.id);
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
      const { topic } = req.body;
      if (!topic) {
        return res.status(400).json({ success: false, error: 'Topic is required' });
      }
      const updated = await updateQuestionPaperTopic(req.params.id, topic);
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
        const existingKeys = new Set(cleanedQuestions.map(q => q.questionText.toLowerCase().replace(/[^a-z0-9]/g, '')));
        
        for (const f of filler) {
          if (cleanedQuestions.length >= targetCount) break;
          const key = f.questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
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
      // To stay safely within output token limits, we generate in batches of up to 25 questions each.
      const maxBatchSize = 25;
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

        const systemPrompt = `You are an expert National CBT Examination Board syllabus analyst, Question Paper Designer, and Exam Question Extractor.
Your absolute highest priority is to search the uploaded PDF document for any ACTUAL practice questions, exam questions, or question pools in the current section.
If the PDF contains actual questions, you MUST extract them and parse them faithfully. Preserve their original question text, options (A, B, C, D), correct answers, and explanations. 
Translate all questions, options, and explanations into English and Tamil ONLY. Strictly remove all other languages (such as Devanagari, Hindi, Malayalam, Spanish, etc.) if present anywhere. 
Ensure that you identify the correct option index correctly.

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
            text: `Thoroughly analyze this PDF document and scan for any actual questions inside. If you find actual exam or practice questions, extract exactly ${batch.size} of them from the portion of the material corresponding to the range ${startPercent}% to ${endPercent}% of the document content. Otherwise, generate ${batch.size} highly accurate, syllabus-rooted bilingual questions from that section. Topic focus: ${topic || 'General Syllabus'}. Difficulty target: ${difficulty || 'Mixed'}. Make sure all questions are bilingual with high-quality Tamil and English translation. Assign sequential IDs starting from q${batch.startIndex + 1}. Ensure explanations are under 15 words. Avoid any duplicates. ${avoidSection}`,
          },
        ];

        const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
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

        try {
          const parsed = parseRobustJSONArray(responseText);
          if (parsed.length === 0) {
            throw new Error(`Response for Batch #${batch.batchNumber} parsed 0 valid question objects`);
          }
          allQuestions.push(...parsed);
        } catch (e: any) {
          console.error(`Failed to parse JSON for Batch #${batch.batchNumber}:`, responseText);
          console.warn(`[Batch ${batch.batchNumber}] JSON parse failure (likely due to truncation or token limits). Falling back to offline generated questions for this batch.`);
          const offlineQuestions = generateOfflineQuestions(topic || 'General Syllabus', batch.size, difficulty || 'Mixed');
          const batchQuestions = offlineQuestions.map((q, idx) => ({
            ...q,
            id: `q${batch.startIndex + idx + 1}`
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
        const existingKeys = new Set(cleanedAndDeduplicated.map(q => q.questionText.toLowerCase().replace(/[^a-z0-9]/g, '')));
        
        for (const f of filler) {
          if (cleanedAndDeduplicated.length >= questionCount) break;
          const key = f.questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
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
        const existingKeys = new Set(cleanedQuestions.map(q => q.questionText.toLowerCase().replace(/[^a-z0-9]/g, '')));
        
        for (const f of filler) {
          if (cleanedQuestions.length >= questionCount) break;
          const key = f.questionText.toLowerCase().replace(/[^a-z0-9]/g, '');
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

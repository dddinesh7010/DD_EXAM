import { GoogleGenAI, Type } from '@google/genai';
import { Question } from '../types';
import { generateOfflineQuestions } from './OfflineGenerator';
import { cleanRawPdfText } from '../utils/pdfCleaner';

/**
 * Extracts and structures professional bilingual multiple-choice exam questions 
 * from raw PDF text input using the Gemini API, with a dual-model try-catch and 
 * high-quality offline question generator fallback.
 * 
 * @param aiClient An initialized GoogleGenAI client instance
 * @param rawText The raw text extracted from a PDF document
 * @param count The number of questions to generate (capped between 5 and 25)
 * @param difficulty The target difficulty level ('Easy' | 'Medium' | 'Hard' | 'Mixed')
 * @param topic The topic or name of the document for category metadata tagging
 * @returns Promise resolving to an array of Question objects in the schema required by the CBT Exam engine
 */
export async function extractQuestionsFromText(
  aiClient: GoogleGenAI,
  rawText: string,
  count: number,
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Mixed',
  topic: string
): Promise<Question[]> {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error('Raw text input cannot be empty');
  }

  const cleanedRawText = cleanRawPdfText(rawText);

  const questionCount = Math.min(Math.max(count || 10, 5), 25);
  const targetDifficulty = difficulty === 'Mixed' ? 'Medium' : difficulty;

  // Quota Guard Check
  if ((global as any).isGeminiQuotaExhausted) {
    console.info('[Quota Guard] Gemini API Quota is exhausted. Instantly routing to high-performance local offline question generator.');
    return generateOfflineQuestions(topic || 'General Syllabus', questionCount, difficulty);
  }

  const systemPrompt = `You are an expert National CBT Examination Board syllabus analyst, Question Paper Designer, and Exam Question Extractor.
Your absolute highest priority is to search the provided raw text for any ACTUAL practice questions, exam questions, or question pools.
If the text contains actual questions, you MUST extract them and parse them faithfully. Preserve their original question text, options (A, B, C, D), correct answers, and explanations. If they are only in English, translate the question text and options to Tamil to satisfy the bilingual format. If they are only in Tamil, translate them to English. Ensure that you identify the correct option index correctly.
If the text does NOT contain pre-existing questions, or if they are insufficient to meet the requested count of ${questionCount} questions, you MUST generate highly accurate, professional, syllabus-rooted bilingual MCQs covering the material in the text.

Each question (extracted or generated) MUST:
1. Have exactly 4 plausible, high-quality, distinct options, with only 1 correct option.
2. Be completely bilingual: provided in both English and Tamil with high linguistic accuracy (avoid robotic translation, use proper technical Tamil exam vocabulary).
3. Be completely free from repetition, duplicates, or overlap.
4. Feature a very concise explanation for the correct answer, in both English and Tamil.
5. Identify the precise sub-topic or chapter.
6. Match the requested difficulty level, or distribute naturally based on the material.
7. Be strictly rooted in the facts presented in the text.
8. NEVER prepend the questionText or options with introductory context or meta-phrases. Start the question text directly.`;

  const promptContent = `Raw PDF syllabus/text content:
---
${cleanedRawText}
---

Task: Scan for any actual questions in the raw text above. If actual exam or practice questions are present, extract exactly ${questionCount} of them. Otherwise, generate exactly ${questionCount} highly accurate, syllabus-rooted bilingual questions from the text.
Topic focus/Context: ${topic || 'General Syllabus'}
Difficulty Target: ${targetDifficulty}
Make sure every question and option is bilingual, containing both clear English and precise, formal technical Tamil translation. Avoid any duplicates.`;

  const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`[extractQuestionsFromText] Attempting generation with model ${model}...`);
      const response = await aiClient.models.generateContent({
        model,
        contents: promptContent,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'A list of generated professional bilingual exam questions',
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
              required: [
                'id', 
                'questionText', 
                'questionTamilText', 
                'options', 
                'tamilOptions', 
                'correctOptionIndex', 
                'explanation', 
                'tamilExplanation', 
                'topic', 
                'difficulty'
              ]
            }
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('Gemini API returned an empty text response.');
      }

      const questions = JSON.parse(responseText.trim());
      if (!Array.isArray(questions)) {
        throw new Error('Gemini API response did not parse into an array of questions.');
      }

      console.log(`[extractQuestionsFromText] Successfully generated ${questions.length} questions using ${model}.`);
      return questions as Question[];
    } catch (error: any) {
      const errMsg = String(error?.message || error || '').toLowerCase();
      const is429 = error?.status === 429 || error?.code === 429 || errMsg.includes('quota') || errMsg.includes('limit') || errMsg.includes('resource_exhausted');
      
      if (is429) {
        console.warn(`[Quota Guard] Gemini API Quota limit reached in extractQuestionsFromText using model ${model}. Transitioning to offline fallback.`);
        (global as any).isGeminiQuotaExhausted = true;
      } else {
        let displayMsg = error?.message || String(error);
        if (displayMsg.includes('{')) {
          try {
            const parsed = JSON.parse(displayMsg);
            displayMsg = parsed?.error?.message || parsed?.message || 'Server-side API issue';
          } catch (_) {
            displayMsg = displayMsg.substring(0, 100);
          }
        }
        console.warn(`[extractQuestionsFromText] Model ${model} returned status: ${displayMsg}`);
      }
      lastError = error;
    }
  }

  // If all models fail (e.g. 429 quota reached), return high-quality offline fallback questions
  console.error('[extractQuestionsFromText] All models exhausted. Activating Offline Bilingual Question Generator fallback...');
  return generateOfflineQuestions(topic || 'General Syllabus', questionCount, difficulty);
}

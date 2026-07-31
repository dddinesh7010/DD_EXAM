import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Sparkles, CheckCircle2, AlertCircle, X, HelpCircle, Brain, Eye, EyeOff, Save, Database, Trash2, FolderOpen, Download, FileJson, UploadCloud, Play, ExternalLink } from 'lucide-react';
import { Question } from '../types';

interface SavedPDF {
  id: string;
  userId?: string;
  name: string;
  size: number;
  base64: string;
  uploadedAt: number;
}

interface SavedExamConfig {
  id: string;
  userId?: string;
  title: string;
  questions: Question[];
  timeLimit: number;
  pdfName?: string;
  createdAt: number;
}

const DB_NAME = 'cbt_pdf_library';
const STORE_NAME = 'pdfs';
const EXAMS_STORE_NAME = 'exams';
const DB_VERSION = 2;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(EXAMS_STORE_NAME)) {
        db.createObjectStore(EXAMS_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function savePDFToDB(pdf: Omit<SavedPDF, 'uploadedAt'>, userId?: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const item: SavedPDF = {
        ...pdf,
        userId: userId || pdf.userId,
        uploadedAt: Date.now(),
      };
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function getAllSavedPDFs(userId?: string): Promise<SavedPDF[]> {
  return openDB().then((db) => {
    return new Promise<SavedPDF[]>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        let list = request.result as SavedPDF[];
        if (userId) {
          list = list.filter(p => p.userId === userId);
        }
        list.sort((a, b) => b.uploadedAt - a.uploadedAt);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

function deletePDFFromDB(id: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function saveExamToDB(exam: Omit<SavedExamConfig, 'createdAt'>, userId?: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(EXAMS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(EXAMS_STORE_NAME);
      const item: SavedExamConfig = {
        ...exam,
        userId: userId || exam.userId,
        createdAt: Date.now(),
      };
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function getAllSavedExams(userId?: string): Promise<SavedExamConfig[]> {
  return openDB().then((db) => {
    return new Promise<SavedExamConfig[]>((resolve, reject) => {
      if (!db.objectStoreNames.contains(EXAMS_STORE_NAME)) {
        resolve([]);
        return;
      }
      const transaction = db.transaction(EXAMS_STORE_NAME, 'readonly');
      const store = transaction.objectStore(EXAMS_STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        let list = request.result as SavedExamConfig[];
        if (userId) {
          list = list.filter(e => e.userId === userId);
        }
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  });
}

function deleteExamFromDB(id: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(EXAMS_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(EXAMS_STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function base64ToFile(base64: string, filename: string, mimeType: string = 'application/pdf'): File {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

interface UploadPDFProps {
  onQuestionsGenerated: (questions: Question[], title: string, timeLimit: number) => void;
  onDatabaseUpdated?: () => void;
  defaultCount?: number | 'all';
  defaultDifficulty?: 'Easy' | 'Medium' | 'Hard' | 'Mixed';
  currentUserId?: string;
}

export default function UploadPDF({
  onQuestionsGenerated,
  onDatabaseUpdated,
  defaultCount = 50,
  defaultDifficulty = 'Mixed',
  currentUserId
}: UploadPDFProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewTab, setPreviewTab] = useState<'visual' | 'info'>('visual');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Local settings for this specific upload
  const [count, setCount] = useState<number | 'all'>(defaultCount);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Mixed'>(defaultDifficulty);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // JSON workspace state variables
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonQuestions, setJsonQuestions] = useState<Question[]>([]);
  const [jsonTitle, setJsonTitle] = useState<string>('');
  const [jsonPdfName, setJsonPdfName] = useState<string>('');
  const [jsonTimeLimit, setJsonTimeLimit] = useState<number>(0);
  const [jsonCount, setJsonCount] = useState<number | 'all'>(50);
  const [jsonDifficulty, setJsonDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Mixed'>('Mixed');
  const [jsonSearchQuery, setJsonSearchQuery] = useState<string>('');

  // Saved PDFs Library
  const [savedPDFs, setSavedPDFs] = useState<SavedPDF[]>([]);
  const [isSavingPDF, setIsSavingPDF] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Saved Exam Configurations
  const [savedExams, setSavedExams] = useState<SavedExamConfig[]>([]);

  const loadSavedPDFs = () => {
    getAllSavedPDFs(currentUserId).then((list) => {
      setSavedPDFs(list);
    }).catch(err => {
      console.error('Error loading saved PDFs:', err);
    });
  };

  const loadSavedExams = () => {
    getAllSavedExams(currentUserId).then((list) => {
      setSavedExams(list);
    }).catch(err => {
      console.error('Error loading saved exams:', err);
    });
  };

  useEffect(() => {
    loadSavedPDFs();
    loadSavedExams();
  }, [currentUserId]);

  const downloadExamAsJSON = (exam: SavedExamConfig) => {
    const dataStr = JSON.stringify({
      title: exam.title,
      questions: exam.questions,
      timeLimit: exam.timeLimit,
      pdfName: exam.pdfName,
    }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exam.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_exam.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        
        let parsedQuestions: any[] = [];
        let parsedTitle = 'Imported Exam';
        let parsedTimeLimit = 0;
        let parsedPdfName = 'Imported Configuration';

        if (Array.isArray(json)) {
          parsedQuestions = json;
          parsedTitle = `Imported Exam Set (${new Date().toLocaleDateString()})`;
        } else if (json && typeof json === 'object') {
          parsedTitle = json.title || json.name || json.quizTitle || `Imported Exam (${new Date().toLocaleDateString()})`;
          parsedPdfName = json.pdfName || 'Imported Configuration';
          
          if (Array.isArray(json.questions)) {
            parsedQuestions = json.questions;
          } else if (Array.isArray(json.quizQuestions)) {
            parsedQuestions = json.quizQuestions;
          } else if (Array.isArray(json.items)) {
            parsedQuestions = json.items;
          } else {
            // Check for any key that contains an array
            const keys = Object.keys(json);
            for (const key of keys) {
              if (Array.isArray(json[key]) && json[key].length > 0) {
                const firstItem = json[key][0];
                if (firstItem && typeof firstItem === 'object' && ('questionText' in firstItem || 'question' in firstItem)) {
                  parsedQuestions = json[key];
                  break;
                }
              }
            }
          }
          
          if (typeof json.timeLimit === 'number') {
            parsedTimeLimit = json.timeLimit;
          }
        }

        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
          throw new Error('Could not find any questions array in the uploaded JSON. Ensure it has a "questions" list or is a direct list of questions.');
        }

        // Sanitize and normalize questions to fit the Question type (English and Tamil only, remove diagrams & other languages)
        const sanitizedQuestions: Question[] = parsedQuestions.map((q: any, index: number) => {
          // 1. Delete diagram/drawing properties from object if present
          const cleanQ = { ...q };
          const diagramKeys = ['diagram', 'image', 'imageUrl', 'diagramUrl', 'diagramBase64', 'diagramData', 'drawing', 'img', 'svg'];
          diagramKeys.forEach(key => {
            if (key in cleanQ) {
              delete cleanQ[key];
            }
          });

          // 2. Helper to remove other languages (Devanagari, Malayalam, Telugu, Kannada, Arabic, etc.)
          const removeOtherLanguagesText = (text: string | undefined): string => {
            if (!text) return '';
            return text.replace(/[\u0900-\u097F\u0D00-\u0D7F\u0C80-\u0CFF\u0C00-\u0C7F\u0600-\u06FF]/g, '').trim();
          };

          // 3. Helper to strip diagram reference strings or markings
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

          const processField = (text: string | undefined, isEnglish: boolean): string => {
            let t = text || '';
            t = stripDiagramTagsAndPhrases(t);
            t = removeOtherLanguagesText(t);
            if (isEnglish) {
              // Strip Tamil characters (\u0B80-\u0BFF) from purely English fields
              t = t.replace(/[\u0B80-\u0BFF]/g, '');
            }
            return t.trim();
          };

          const questionText = processField(cleanQ.questionText || cleanQ.question || cleanQ.text || `Question #${index + 1}`, true);
          let questionTamilText = processField(cleanQ.questionTamilText || cleanQ.tamilText || cleanQ.questionTamil || '', false);
          if (!questionTamilText) {
            questionTamilText = questionText; // Fallback to English text
          }

          // Process options
          let rawOptions: string[] = [];
          if (Array.isArray(cleanQ.options)) {
            rawOptions = cleanQ.options.map((o: any) => String(o));
          } else if (Array.isArray(cleanQ.choices)) {
            rawOptions = cleanQ.choices.map((c: any) => String(c));
          } else if (Array.isArray(cleanQ.answers)) {
            rawOptions = cleanQ.answers.map((a: any) => String(a));
          } else {
            rawOptions = ['Option A', 'Option B', 'Option C', 'Option D'];
          }
          const options = rawOptions.map((o: string) => processField(o, true));

          // Process Tamil options
          let rawTamilOptions = Array.isArray(cleanQ.tamilOptions) ? cleanQ.tamilOptions.map((o: any) => String(o)) : [...options];
          const tamilOptions = rawTamilOptions.map((o: string) => processField(o, false));

          // Correct Option Index
          let correctOptionIndex = 0;
          if (typeof cleanQ.correctOptionIndex === 'number' && cleanQ.correctOptionIndex >= 0 && cleanQ.correctOptionIndex < options.length) {
            correctOptionIndex = cleanQ.correctOptionIndex;
          } else if (typeof cleanQ.correctIndex === 'number' && cleanQ.correctIndex >= 0 && cleanQ.correctIndex < options.length) {
            correctOptionIndex = cleanQ.correctIndex;
          } else if (typeof cleanQ.answerIndex === 'number' && cleanQ.answerIndex >= 0 && cleanQ.answerIndex < options.length) {
            correctOptionIndex = cleanQ.answerIndex;
          } else if (typeof cleanQ.correctAnswer === 'number' && cleanQ.correctAnswer >= 0 && cleanQ.correctAnswer < options.length) {
            correctOptionIndex = cleanQ.correctAnswer;
          } else if (typeof cleanQ.correctAnswer === 'string') {
            const matchedIdx = options.findIndex(opt => opt.toLowerCase().trim() === cleanQ.correctAnswer.toLowerCase().trim());
            if (matchedIdx !== -1) {
              correctOptionIndex = matchedIdx;
            } else {
              const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 };
              const mapped = letterMap[cleanQ.correctAnswer.trim()];
              if (mapped !== undefined && mapped < options.length) {
                correctOptionIndex = mapped;
              }
            }
          }

          const explanation = processField(cleanQ.explanation || cleanQ.rationale || cleanQ.desc || 'No explanation provided.', true);
          const tamilExplanation = processField(cleanQ.tamilExplanation || cleanQ.explanationTamil || explanation, false);
          
          const topic = cleanQ.topic || cleanQ.category || cleanQ.subject || 'General';
          
          let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
          if (cleanQ.difficulty && ['Easy', 'Medium', 'Hard'].includes(cleanQ.difficulty)) {
            difficulty = cleanQ.difficulty as 'Easy' | 'Medium' | 'Hard';
          } else if (cleanQ.level) {
            const lvl = String(cleanQ.level).toLowerCase();
            if (lvl.includes('easy')) difficulty = 'Easy';
            else if (lvl.includes('hard') || lvl.includes('diff')) difficulty = 'Hard';
          }

          return {
            id: cleanQ.id || `q_imported_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
            questionText,
            questionTamilText,
            options,
            tamilOptions,
            correctOptionIndex,
            explanation,
            tamilExplanation,
            topic,
            difficulty
          };
        });

        // Set state for professional CBT Configuration instead of immediately running
        setJsonFile(file);
        setJsonQuestions(sanitizedQuestions);
        setJsonTitle(parsedTitle);
        setJsonPdfName(parsedPdfName);
        setJsonTimeLimit(parsedTimeLimit);
        
        // Dynamically cap selection count
        const defaultCountLimit = sanitizedQuestions.length >= 50 ? 50 : sanitizedQuestions.length;
        setJsonCount(defaultCountLimit);
        setJsonDifficulty('Mixed');
        setSuccessMessage(`JSON Configuration "${parsedTitle}" successfully loaded! Set questions and difficulty to start the CBT.`);
        setAnalysisError(null);
        setTimeout(() => setSuccessMessage(null), 3000);

      } catch (err: any) {
        console.error('Error importing JSON:', err);
        setAnalysisError(`Failed to import JSON: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleClearJson = () => {
    setJsonFile(null);
    setJsonQuestions([]);
    setJsonTitle('');
    setJsonPdfName('');
    setJsonTimeLimit(0);
    setAnalysisError(null);
    setSuccessMessage(null);
  };

  const handleStartJsonCbt = async () => {
    if (jsonQuestions.length === 0) return;

    // Filter questions based on selected difficulty
    let filtered = jsonQuestions.filter(q => {
      return jsonDifficulty === 'Mixed' || q.difficulty === jsonDifficulty;
    });

    if (filtered.length === 0) {
      filtered = [...jsonQuestions];
    }

    // Select the count of questions
    const selectedCount = jsonCount === 'all' ? filtered.length : Math.min(filtered.length, jsonCount);
    
    // Shuffle the selected pool to make it unique and engaging
    const shuffled = [...filtered].sort(() => 0.5 - Math.random());
    const finalQuestions = shuffled.slice(0, selectedCount);

    const finalTimeLimit = jsonTimeLimit || (finalQuestions.length * 60);
    const id = 'imported_' + Date.now();

    await saveExamToDB({
      id,
      title: jsonTitle,
      questions: finalQuestions,
      timeLimit: finalTimeLimit,
      pdfName: jsonPdfName,
    }, currentUserId);
    loadSavedExams();

    // Save to MongoDB Database Hub
    try {
      await fetch('/api/save-question-paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          topic: jsonTitle,
          difficulty: jsonDifficulty,
          count: finalQuestions.length,
          questions: finalQuestions,
          source: 'JSON Upload'
        })
      });
      onDatabaseUpdated?.();
    } catch (mongoErr) {
      console.warn('Failed to auto-save selected JSON to MongoDB:', mongoErr);
    }

    setSuccessMessage(`Exam "${jsonTitle}" loaded with ${finalQuestions.length} Qs (${jsonDifficulty}). Starting Computer-Based Test...`);
    setTimeout(() => {
      setSuccessMessage(null);
      // Reset JSON workspace state
      const currentQuestions = [...finalQuestions];
      const currentTitle = jsonTitle;
      const currentTimeLimit = finalTimeLimit;
      handleClearJson();
      onQuestionsGenerated(currentQuestions, currentTitle, currentTimeLimit);
    }, 1200);
  };

  const handleDeleteExam = async (id: string) => {
    try {
      await deleteExamFromDB(id);
      loadSavedExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleSavePDF = async (fileToSave: File) => {
    if (!fileToSave) return;
    setIsSavingPDF(true);
    setSaveSuccess(null);
    try {
      const base64 = await convertFileToBase64(fileToSave);
      const id = fileToSave.name + '_' + fileToSave.size;
      await savePDFToDB({
        id,
        name: fileToSave.name,
        size: fileToSave.size,
        base64,
      }, currentUserId);
      setSaveSuccess('PDF successfully saved to library!');
      loadSavedPDFs();
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving PDF to IndexedDB:', err);
    } finally {
      setIsSavingPDF(false);
    }
  };

  const handleLoadSavedPDF = (saved: SavedPDF) => {
    try {
      const file = base64ToFile(saved.base64, saved.name);
      setPdfFile(file);
      setAnalysisError(null);
      setSuccessMessage(`Loaded from Library: ${saved.name}`);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error loading saved PDF:', err);
      setAnalysisError('Failed to load this saved PDF from local storage.');
    }
  };

  const handleDeleteSavedPDF = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deletePDFFromDB(id);
      loadSavedPDFs();
      // If the currently loaded file was deleted, we don't necessarily clear it, but we can
    } catch (err) {
      console.error('Error deleting PDF:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      if (file.size > 25 * 1024 * 1024) {
        setAnalysisError('File is too large. Max size supported is 25MB.');
        setPdfFile(null);
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
          setPdfUrl(null);
        }
        setSuccessMessage(null);
      } else {
        setPdfFile(file);
        setAnalysisError(null);
        setSuccessMessage(`Selected PDF: ${file.name}`);
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        // Automatically save to the local library
        handleSavePDF(file);
      }
    } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
      handleImportJSON(file);
    } else {
      setAnalysisError('Invalid file type. Please upload a valid PDF document or Exam Configuration JSON.');
      setPdfFile(null);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setSuccessMessage(null);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const triggerAnalyzePdf = async () => {
    if (!pdfFile) {
      setAnalysisError('Please select or upload a PDF syllabus first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setSuccessMessage(null);

    try {
      const base64 = await convertFileToBase64(pdfFile);
      const res = await fetch('/api/analyze-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: base64,
          count,
          difficulty: difficulty === 'Mixed' ? 'Medium' : difficulty,
          topic: pdfFile.name.replace('.pdf', ''),
          userId: currentUserId
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Server returned an error during PDF generation.');
      }

      const dupCount = typeof data.duplicatesRemoved === 'number' ? data.duplicatesRemoved : 0;
      setSuccessMessage(
        `Syllabus analyzed successfully! ${
          dupCount > 0 
            ? `Detected and removed ${dupCount} repeat questions to ensure a balanced mock paper. ` 
            : 'Zero repeat questions detected! '
        }Generating your exam paper...`
      );
      
      const questionCountNum = count === 'all' ? data.questions.length : count;
      const examTimeLimit = questionCountNum * 60; // 1 minute per question
      const examTitle = `Exam: ${pdfFile.name.replace('.pdf', '')}`;

      // Save to saved exams list in IndexedDB
      saveExamToDB({
        id: 'exam_' + Date.now(),
        title: examTitle,
        questions: data.questions,
        timeLimit: examTimeLimit,
        pdfName: pdfFile.name,
      }, currentUserId).then(() => {
        loadSavedExams();
        onDatabaseUpdated?.();
      }).catch(err => console.error('Error auto-saving exam configuration:', err));

      // Delay slightly to allow the user to read the success message
      setTimeout(() => {
        onQuestionsGenerated(data.questions, examTitle, examTimeLimit);
      }, 1200);

    } catch (err: any) {
      console.error(err);
      setAnalysisError(
        err.message || 
        'Failed to connect to the analysis service. Please verify that your Gemini API Key is configured in the Secrets panel.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPdfFile(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setSuccessMessage(null);
    setAnalysisError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" id="upload-pdf-card">
      <div className="border-b border-gray-200 p-5 bg-gray-50/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          <h3 className="font-sans font-bold text-gray-800 text-sm uppercase tracking-wider">
            Syllabus PDF Analyzer & Exam Builder
          </h3>
        </div>
        <span className="text-[10px] text-gray-400 font-mono tracking-widest font-bold bg-white border border-gray-200 px-2 py-0.5 rounded">
          GEMINI 3.5 FLASH
        </span>
      </div>

      <div className="p-6">
        {pdfFile ? (
          <div className="max-w-2xl mx-auto space-y-6" id="pdf-workspace-layout">
            {/* Selected File Details */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-emerald-100/70 rounded-full flex items-center justify-center text-emerald-700 shrink-0 border border-emerald-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate" id="selected-file-name">
                    {pdfFile.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                      {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • PDF
                    </p>
                    {savedPDFs.some(item => item.id === (pdfFile ? pdfFile.name + '_' + pdfFile.size : '')) ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Saved to Library
                      </span>
                    ) : (
                      <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Not Saved
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {!isAnalyzing && (
                <div className="flex items-center gap-2 shrink-0">
                  {pdfUrl && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-bold uppercase tracking-wider bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded hover:bg-blue-100/60 transition-all cursor-pointer inline-flex items-center gap-1"
                      title="Open PDF in a secure full-screen browser tab"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View PDF
                    </a>
                  )}
                  {!savedPDFs.some(item => item.id === (pdfFile ? pdfFile.name + '_' + pdfFile.size : '')) && (
                    <button
                      type="button"
                      onClick={() => handleSavePDF(pdfFile)}
                      disabled={isSavingPDF}
                      className="text-[10px] text-indigo-600 hover:text-indigo-700 font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2 py-1.5 rounded hover:bg-indigo-100/60 transition-all cursor-pointer inline-flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      {isSavingPDF ? 'Saving...' : 'Save'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="text-[10px] text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider bg-rose-50 border border-rose-100 px-2 py-1.5 rounded hover:bg-rose-100/60 transition-all cursor-pointer inline-flex items-center gap-1"
                    id="pdf-remove-btn"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* AI Parsing Specifications */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2.5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Parsing Specifications</p>
              <div className="space-y-2 text-[11px] text-gray-600 font-sans">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Direct Text & Question Extraction:</strong> Scans raw PDF for existing question pools with 100% precise indexing.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Syllabus-Based MCQ Generation:</strong> Synthesizes professional mock questions if existing pool is insufficient.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>English & Tamil Translation:</strong> Strictly validates bilingual output format, filtering out any extraneous scripts.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span><strong>Semantic Deduplication:</strong> Computes Jaccard Similarity coefficients to remove overlapping exam questions.</span>
                </div>
              </div>
            </div>

            {/* Action Buttons & Status Indicators */}
            <div className="space-y-4">
              <button
                type="button"
                disabled={isAnalyzing}
                onClick={triggerAnalyzePdf}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 transition-all text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm animate-pulse"
                style={{ animationDuration: '4s' }}
                id="pdf-submit-btn"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing with Gemini AI (Parsing Syllabus)...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 text-emerald-100 animate-pulse" />
                    Analyze Syllabus & Launch CBT Exam
                  </>
                )}
              </button>

              {analysisError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-lg text-xs flex gap-2.5 items-start leading-relaxed" id="pdf-error-container">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5 text-rose-800">Syllabus Parser Error</p>
                    <p className="font-semibold">{analysisError}</p>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-lg text-xs flex gap-2.5 items-start leading-relaxed" id="pdf-success-container">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5 text-emerald-900">Success</p>
                    <p className="font-semibold">{successMessage}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : jsonFile ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="json-workspace-layout">
            {/* Left Column: CBT Parameters & Actions */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                {/* Selected File Details */}
                <div className="bg-amber-50/40 border border-amber-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-amber-100/70 rounded-full flex items-center justify-center text-amber-700 shrink-0 border border-amber-200">
                      <FileJson className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate" id="selected-json-name">
                        {jsonFile.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-wider">
                          {(jsonFile.size / 1024).toFixed(1)} KB • JSON Config
                        </p>
                        <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          {jsonQuestions.length} Total Qs
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleClearJson}
                      className="text-[10px] text-rose-600 hover:text-rose-700 font-bold uppercase tracking-wider bg-rose-50 border border-rose-100 px-2 py-1.5 rounded hover:bg-rose-100/60 transition-all cursor-pointer inline-flex items-center gap-1"
                      id="json-remove-btn"
                    >
                      <X className="w-3 h-3" />
                      Replace
                    </button>
                  </div>
                </div>

                {/* Question Settings Block */}
                <div className="space-y-4 bg-gray-50/50 border border-gray-150 rounded-xl p-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Questions to Select
                      </label>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-mono">
                        Max available: {jsonQuestions.length}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {([50, 100, 150, 200, 'all'] as const).map((num) => {
                        const isAvailable = num === 'all' || jsonQuestions.length >= num;
                        return (
                          <button
                            key={num}
                            type="button"
                            onClick={() => isAvailable && setJsonCount(num)}
                            disabled={!isAvailable}
                            className={`flex-1 min-w-[44px] py-1.5 px-0.5 sm:px-1 rounded text-[11px] sm:text-xs font-bold border transition-all cursor-pointer whitespace-nowrap text-center ${
                              jsonCount === num
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                : isAvailable
                                ? 'bg-white text-gray-600 border-gray-250 hover:bg-gray-50'
                                : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed opacity-40'
                            }`}
                            id={`json-count-btn-${num}`}
                          >
                            {num === 'all' ? 'All Qs' : `${num} Qs`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                      Target Difficulty
                    </label>
                    <div className="flex gap-1">
                      {(['Easy', 'Medium', 'Hard', 'Mixed'] as const).map((lvl) => {
                        const countOfLvl = lvl === 'Mixed'
                          ? jsonQuestions.length
                          : jsonQuestions.filter(q => q.difficulty === lvl).length;

                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setJsonDifficulty(lvl)}
                            className={`flex-1 py-1.5 px-1 rounded text-xs font-bold border transition-all cursor-pointer flex flex-col items-center ${
                              jsonDifficulty === lvl
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white text-gray-600 border-gray-250 hover:bg-gray-50'
                            }`}
                            id={`json-diff-btn-${lvl}`}
                          >
                            <span>{lvl}</span>
                            <span className={`text-[8px] mt-0.5 font-mono ${jsonDifficulty === lvl ? 'text-blue-100' : 'text-gray-400'}`}>
                              ({countOfLvl})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Status Indicators */}
              <div className="space-y-4 pt-4 lg:pt-0">
                <button
                  type="button"
                  onClick={handleStartJsonCbt}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 transition-all text-white font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer shadow-sm animate-pulse"
                  style={{ animationDuration: '4s' }}
                  id="json-start-cbt-btn"
                >
                  <Play className="w-4 h-4 text-indigo-100 animate-pulse" />
                  Start Professional CBT Exam
                </button>

                {successMessage && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-lg text-xs flex gap-2.5 items-start leading-relaxed" id="json-success-container">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[10px] mb-0.5 text-emerald-900">Success</p>
                      <p className="font-semibold">{successMessage}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: JSON Questions Explorer */}
            <div className="lg:col-span-7 flex flex-col border border-gray-200 rounded-xl bg-slate-50 shadow-sm overflow-hidden h-[420px]">
              <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center justify-between text-xs font-semibold shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-gray-300 font-mono text-[10px] uppercase tracking-wider font-bold">JSON Configuration Explorer</span>
                </div>
                <span className="text-amber-400 text-[10px] font-mono truncate max-w-[200px]" title={jsonTitle}>
                  {jsonTitle}
                </span>
              </div>

              {/* Search filter bar */}
              <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Search questions or topics..."
                  value={jsonSearchQuery}
                  onChange={(e) => setJsonSearchQuery(e.target.value)}
                  className="w-full text-xs border border-gray-250 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              {/* Questions scrollable list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(() => {
                  const filtered = jsonQuestions.filter(q => {
                    const matchesDiff = jsonDifficulty === 'Mixed' || q.difficulty === jsonDifficulty;
                    const matchesSearch = !jsonSearchQuery || 
                      q.questionText.toLowerCase().includes(jsonSearchQuery.toLowerCase()) ||
                      (q.questionTamilText && q.questionTamilText.toLowerCase().includes(jsonSearchQuery.toLowerCase())) ||
                      q.topic.toLowerCase().includes(jsonSearchQuery.toLowerCase());
                    return matchesDiff && matchesSearch;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-400">
                        <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50 animate-bounce" />
                        <p className="text-xs font-bold">No questions match your filter.</p>
                      </div>
                    );
                  }

                  return filtered.map((q, idx) => (
                    <div key={q.id || idx} className="bg-white border border-gray-200 rounded-lg p-3.5 space-y-2 text-left relative shadow-2xs hover:border-blue-200 transition-all">
                      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-1.5">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider font-sans">
                          {q.topic}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700' :
                          q.difficulty === 'Hard' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {q.difficulty}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {/* English Question */}
                        <p className="text-xs font-bold text-gray-800 leading-relaxed">
                          <span className="text-gray-400 mr-1">Q{idx + 1}.</span>
                          {q.questionText}
                        </p>
                        {/* Tamil Question */}
                        {q.questionTamilText && q.questionTamilText !== q.questionText && (
                          <p className="text-xs font-semibold text-blue-950 leading-relaxed bg-blue-50/40 p-2 rounded border border-blue-50">
                            {q.questionTamilText}
                          </p>
                        )}
                      </div>

                      {/* Options Preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10px] font-medium text-gray-600 font-mono">
                        {q.options.map((opt, oIdx) => {
                          const isCorrect = q.correctOptionIndex === oIdx;
                          return (
                            <div 
                              key={oIdx} 
                              className={`p-1.5 rounded border ${
                                isCorrect 
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-bold shadow-2xs' 
                                  : 'bg-gray-50 border-gray-150'
                              } truncate`}
                            >
                              <span className="mr-1">{String.fromCharCode(65 + oIdx)}.</span>
                              {opt}
                              {q.tamilOptions && q.tamilOptions[oIdx] && q.tamilOptions[oIdx] !== opt && (
                                <span className="block text-[9px] text-indigo-900 font-sans mt-0.5 font-medium">
                                  {q.tamilOptions[oIdx]}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Drag-and-drop landing area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isAnalyzing && fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer border-gray-200 hover:border-blue-400 bg-gray-50/20"
              id="pdf-upload-drop-zone"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf,application/json,.json"
                className="hidden"
                disabled={isAnalyzing}
              />

              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                  <Upload className="w-6 h-6 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-gray-800">
                    Drag and drop your syllabus PDF or Exam JSON here
                  </p>
                  <p className="text-xs text-gray-400 font-medium">
                    or click to select a file from your local disk
                  </p>
                </div>
                <div className="mt-1 flex flex-col items-center gap-1.5">
                  <div className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider shadow-2xs">
                    <Database className="w-3.5 h-3.5 animate-pulse" />
                    Upload the document; it will automatically save in database hub
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium font-mono">
                    Supports PDF up to 25MB & standard JSON configs
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}




      </div>
    </div>
  );
}

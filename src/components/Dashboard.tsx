import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Brain, Clock, ChevronRight, Award, Trash2, HelpCircle, 
  FileText, Sparkles, ArrowLeft, Check, SlidersHorizontal, Filter, Play, Info,
  Database, Download, Server, RefreshCw, Edit2, FileJson, AlertCircle, CheckCircle2, Upload
} from 'lucide-react';
import { Question, ExamHistoryLog } from '../types';
import UploadPDF from './UploadPDF';

interface DashboardProps {
  history: ExamHistoryLog[];
  onStartExam: (questions: Question[], title: string, timeLimit: number) => void;
  onViewHistoryDetails: (log: ExamHistoryLog) => void;
  onClearHistory: () => void;
  onDeleteHistoryItem?: (id: string) => void;
}

const durationOptions = [
  { label: '30 min', value: 30 * 60 },
  { label: '1hrs', value: 1 * 60 * 60 },
  { label: '2hrs', value: 2 * 60 * 60 },
  { label: '3 hrs', value: 3 * 60 * 60 },
];

export default function Dashboard({ history, onStartExam, onViewHistoryDetails, onClearHistory, onDeleteHistoryItem }: DashboardProps) {
  // Stats calculation
  const totalTests = history.length;
  const avgScore = totalTests > 0 ? Math.round(history.reduce((acc, log) => acc + log.score, 0) / totalTests) : 0;
  const avgAccuracy = totalTests > 0 ? Math.round(history.reduce((acc, log) => acc + log.accuracy, 0) / totalTests) : 0;
  const totalTimeSec = history.reduce((acc, log) => acc + log.totalTimeSpent, 0);
  const totalTimeSpentFormatted = () => {
    const mins = Math.floor(totalTimeSec / 60);
    if (mins < 60) return `${mins} mins`;
    const hrs = (totalTimeSec / 3600).toFixed(1);
    return `${hrs} hours`;
  };

  // MongoDB connection and stats tracking
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [savedPapers, setSavedPapers] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<string | null>(null);
  const [historyToDelete, setHistoryToDelete] = useState<string | null>(null);

  // Editable paper names & JSON uploading
  const [editingPaperId, setEditingPaperId] = useState<string | null>(null);
  const [editingTopicValue, setEditingTopicValue] = useState<string>('');
  const [mongoUploadError, setMongoUploadError] = useState<string | null>(null);
  const [mongoUploadSuccess, setMongoUploadSuccess] = useState<string | null>(null);

  const fetchDbData = async () => {
    setIsLoadingDb(true);
    try {
      const statusRes = await fetch('/api/db-status');
      const statusData = await statusRes.json();
      if (statusData.success) {
        setDbStatus(statusData.status);
      }

      const papersRes = await fetch('/api/question-papers');
      const papersData = await papersRes.json();
      if (papersData.success && Array.isArray(papersData.papers)) {
        setSavedPapers(papersData.papers);
      }
    } catch (e) {
      console.warn('Failed to fetch MongoDB status & saved collections:', e);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const handleRenameQuestionPaper = async (id: string, newTopic: string) => {
    if (!newTopic.trim()) return;
    try {
      const res = await fetch(`/api/question-papers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: newTopic.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSavedPapers(prev => prev.map(p => {
          const pId = p._id || p.id;
          if (pId === id) {
            return { ...p, topic: newTopic.trim() };
          }
          return p;
        }));
        setEditingPaperId(null);
        fetchDbData();
      } else {
        alert(data.error || 'Failed to rename paper.');
      }
    } catch (e: any) {
      console.warn('Failed to rename question paper:', e);
      alert(e.message || 'An error occurred while renaming.');
    }
  };

  const handleUploadJsonToMongo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    setMongoUploadError(null);
    setMongoUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        let parsedQuestions: any[] = [];
        let parsedTitle = file.name.replace('.json', '');
        let parsedDifficulty = 'Mixed';

        if (Array.isArray(json)) {
          parsedQuestions = json;
        } else if (json && typeof json === 'object') {
          parsedTitle = json.topic || json.title || json.name || json.quizTitle || file.name.replace('.json', '');
          parsedDifficulty = json.difficulty || 'Mixed';
          
          if (Array.isArray(json.questions)) {
            parsedQuestions = json.questions;
          } else if (Array.isArray(json.quizQuestions)) {
            parsedQuestions = json.quizQuestions;
          } else if (Array.isArray(json.items)) {
            parsedQuestions = json.items;
          } else {
            // Find any array inside the object
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
        }

        if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
          throw new Error('Could not find any questions list inside this JSON.');
        }

        // Standardize questions
        const sanitizedQuestions = parsedQuestions.map((q: any, index: number) => {
          const id = q.id || `q_mongo_${Date.now()}_${index}`;
          const questionText = q.questionText || q.question || q.text || `Question #${index + 1}`;
          const questionTamilText = q.questionTamilText || q.tamilText || questionText;
          
          let options = ['Option A', 'Option B', 'Option C', 'Option D'];
          if (Array.isArray(q.options) && q.options.length >= 2) {
            options = q.options.map((o: any) => String(o));
          } else if (Array.isArray(q.choices) && q.choices.length >= 2) {
            options = q.choices.map((c: any) => String(c));
          }

          let correctOptionIndex = 0;
          if (typeof q.correctOptionIndex === 'number') {
            correctOptionIndex = q.correctOptionIndex;
          } else if (typeof q.correctIndex === 'number') {
            correctOptionIndex = q.correctIndex;
          } else if (typeof q.answerIndex === 'number') {
            correctOptionIndex = q.answerIndex;
          } else if (typeof q.correctAnswer === 'number') {
            correctOptionIndex = q.correctAnswer;
          } else if (typeof q.correctAnswer === 'string') {
            const idxMatched = options.findIndex(opt => opt.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim());
            if (idxMatched !== -1) {
              correctOptionIndex = idxMatched;
            } else {
              const letterMap: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, A: 0, B: 1, C: 2, D: 3 };
              const mapped = letterMap[q.correctAnswer.trim()];
              if (mapped !== undefined) correctOptionIndex = mapped;
            }
          }

          const explanation = q.explanation || q.rationale || q.desc || 'No explanation provided.';
          const tamilExplanation = q.tamilExplanation || q.explanationTamil || explanation;
          const topic = q.topic || q.category || q.subject || 'General';
          const difficulty = q.difficulty || 'Medium';
          const tamilOptions = Array.isArray(q.tamilOptions) ? q.tamilOptions.map((o: any) => String(o)) : [...options];

          return {
            id,
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

        // Save to MongoDB via save-question-paper endpoint
        const res = await fetch('/api/save-question-paper', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: parsedTitle,
            difficulty: parsedDifficulty,
            count: sanitizedQuestions.length,
            questions: sanitizedQuestions,
            source: 'JSON Hub Upload'
          })
        });

        const data = await res.json();
        if (data.success) {
          setMongoUploadSuccess(`JSON configuration "${parsedTitle}" successfully saved to MongoDB!`);
          fetchDbData();
          setTimeout(() => setMongoUploadSuccess(null), 4000);
        } else {
          throw new Error(data.error || 'Failed to save to database.');
        }

      } catch (err: any) {
        console.error('Error uploading JSON to MongoDB:', err);
        setMongoUploadError(`JSON Import Error: ${err.message || String(err)}`);
        setTimeout(() => setMongoUploadError(null), 6000);
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const [showUriConfig, setShowUriConfig] = useState(false);
  const [inputUri, setInputUri] = useState('');
  const [uriConfigError, setUriConfigError] = useState<string | null>(null);
  const [isSavingUri, setIsSavingUri] = useState(false);
  const [uriSaveSuccess, setUriSaveSuccess] = useState(false);

  const handleUpdateUri = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUri.trim()) {
      setUriConfigError('Connection string cannot be empty.');
      return;
    }
    setUriConfigError(null);
    setIsSavingUri(true);
    setUriSaveSuccess(false);

    try {
      const res = await fetch('/api/update-db-uri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uri: inputUri.trim() })
      });
      const data = await res.json();
      if (data.success && data.connected) {
        setUriSaveSuccess(true);
        setUriConfigError(null);
        fetchDbData();
        setTimeout(() => {
          setShowUriConfig(false);
          setUriSaveSuccess(false);
        }, 2000);
      } else {
        setUriConfigError(data.error || 'Connection failed. Verify credentials and ensure IP whitelist on MongoDB Atlas is set to 0.0.0.0/0.');
      }
    } catch (err: any) {
      setUriConfigError(err.message || 'An error occurred during verification.');
    } finally {
      setIsSavingUri(false);
    }
  };

  useEffect(() => {
    fetchDbData();
  }, [history]);

  const handleDeleteQuestionPaper = async (id: string) => {
    try {
      const res = await fetch(`/api/question-papers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSavedPapers(prev => prev.filter(p => p._id !== id && p.id !== id));
        fetchDbData();
      }
    } catch (e) {
      console.warn('Failed to delete question paper:', e);
    }
  };

  const handleDownloadPaperJson = (paper: any) => {
    try {
      const cleanPaper = {
        topic: paper.topic,
        difficulty: paper.difficulty,
        count: paper.count,
        source: paper.source,
        questions: paper.questions,
        createdAt: paper.createdAt
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(cleanPaper, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      const filename = `cbt_questions_${paper.topic.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`;
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Failed to export JSON file:', e);
    }
  };

  const handleDownloadDbBackup = () => {
    try {
      const backupData = {
        resultsHistory: history,
        storedQuestionPapers: savedPapers,
        exportedAt: new Date().toISOString(),
        databaseEngine: dbStatus?.connected ? 'MongoDB Cloud Database' : 'Local Storage Fallback'
      };
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupData, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `karka_cbt_full_database_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Failed to export Database Backup:', e);
    }
  };

  // State for intercepted/pending exam filtering
  const [pendingExam, setPendingExam] = useState<{ questions: Question[]; title: string; timeLimit: number } | null>(null);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Record<string, boolean>>({ Easy: true, Medium: true, Hard: true });
  const [selectedTopics, setSelectedTopics] = useState<Record<string, boolean>>({});
  const [customTitle, setCustomTitle] = useState('');
  const [selectedDurationIndex, setSelectedDurationIndex] = useState(0); // index of durationOptions
  const [topicSearch, setTopicSearch] = useState('');
  const [pendingCount, setPendingCount] = useState<number | 'all'>('all');
  const [pendingDifficulty, setPendingDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | 'Mixed'>('Mixed');
  const [pendingCustomTimeMinutes, setPendingCustomTimeMinutes] = useState<string>('');

  // Intercept any exam startup to present the filtering console first
  const handleInterceptStartExam = (questions: Question[], title: string, timeLimit: number) => {
    setPendingExam({ questions, title, timeLimit });
  };

  const handleLaunchDefaultExam = () => {
    import('../data/defaultQuestions').then((module) => {
      handleInterceptStartExam(module.DEFAULT_QUESTIONS, 'General Practice Mock Exam', 600); // 10 minutes default
    });
  };

  // Initialize and synchronize state when a pending exam is set
  useEffect(() => {
    if (pendingExam) {
      setCustomTitle(pendingExam.title);
      
      const topics = Array.from(new Set(pendingExam.questions.map(q => q.topic))).filter(Boolean) as string[];
      const topicMap: Record<string, boolean> = {};
      topics.forEach(t => {
        topicMap[t] = true;
      });
      setSelectedTopics(topicMap);
      setSelectedDifficulties({ Easy: true, Medium: true, Hard: true });
      
      const matchingIdx = durationOptions.findIndex(opt => opt.value === pendingExam.timeLimit);
      setSelectedDurationIndex(matchingIdx !== -1 ? matchingIdx : 0);
      setPendingCustomTimeMinutes('');
      setPendingCount('all');
      setPendingDifficulty('Mixed');
      
      setTopicSearch('');
    }
  }, [pendingExam]);

  // Derived stats for the pending exam
  const topicCounts = useMemo(() => {
    if (!pendingExam) return {};
    const counts: Record<string, number> = {};
    pendingExam.questions.forEach(q => {
      counts[q.topic] = (counts[q.topic] || 0) + 1;
    });
    return counts;
  }, [pendingExam]);

  const difficultyCounts = useMemo(() => {
    if (!pendingExam) return { Easy: 0, Medium: 0, Hard: 0 };
    const counts = { Easy: 0, Medium: 0, Hard: 0 };
    pendingExam.questions.forEach(q => {
      if (q.difficulty === 'Easy') counts.Easy += 1;
      else if (q.difficulty === 'Medium') counts.Medium += 1;
      else if (q.difficulty === 'Hard') counts.Hard += 1;
    });
    return counts;
  }, [pendingExam]);

  const distinctTopics = useMemo(() => {
    if (!pendingExam) return [];
    return Array.from(new Set(pendingExam.questions.map(q => q.topic))).filter(Boolean).sort() as string[];
  }, [pendingExam]);

  const filteredQuestions = useMemo(() => {
    if (!pendingExam) return [];
    let pool = pendingExam.questions;
    if (pendingDifficulty !== 'Mixed') {
      pool = pool.filter(q => q.difficulty === pendingDifficulty);
    }
    if (pool.length === 0) {
      pool = pendingExam.questions;
    }
    if (pendingCount === 'all') {
      return pool;
    }
    const countNum = typeof pendingCount === 'number' ? pendingCount : parseInt(pendingCount, 10);
    return pool.slice(0, countNum);
  }, [pendingExam, pendingDifficulty, pendingCount]);

  const calculatedTimeLimit = useMemo(() => {
    if (pendingCustomTimeMinutes && !isNaN(parseInt(pendingCustomTimeMinutes, 10))) {
      return parseInt(pendingCustomTimeMinutes, 10) * 60;
    }
    return durationOptions[selectedDurationIndex]?.value || 1800;
  }, [selectedDurationIndex, pendingCustomTimeMinutes]);

  // RENDER PENDING EXAM CUSTOMIZATION AND FILTER CONSOLE
  if (pendingExam) {
    return (
      <div className="space-y-8 animate-fadeIn" id="exam-filter-interface">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
          <div className="space-y-1">
            <button
              onClick={() => setPendingExam(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors bg-white hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs mb-2 cursor-pointer"
              id="back-to-dash-btn"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Discard & Return
            </button>
            <h1 className="text-2xl md:text-3xl font-sans font-extrabold text-gray-950 tracking-tight flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              Configure Exam Session
            </h1>
            <p className="text-gray-500 text-sm">
              Review exam details, customize your session title, and select your preferred CBT timing pace before launching.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 flex items-center gap-3 shrink-0">
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-blue-900">Adaptive Exam Loaded</p>
              <p className="text-blue-700 font-medium">Ready: {filteredQuestions.length} of {pendingExam.questions.length} questions</p>
            </div>
          </div>
        </div>

        {/* Centered CBT Session Controller */}
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-xl border border-gray-200 shadow-md p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <Brain className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                CBT Session Controller
              </h3>
            </div>

            {/* Exam Title Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Exam Paper Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Enter custom exam title..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-250 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                id="filter-custom-title"
              />
            </div>

            {/* Question Count Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Questions to Select
                </label>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono">
                  Max available: {pendingExam.questions.length}
                </span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {([50, 100, 150, 200, 'all'] as const).map((num) => {
                  const isAvailable = num === 'all' || pendingExam.questions.length >= num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => isAvailable && setPendingCount(num)}
                      disabled={!isAvailable}
                      className={`flex-1 min-w-[50px] py-1.5 px-1 rounded text-xs font-bold border transition-all cursor-pointer ${
                        pendingCount === num
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : isAvailable
                          ? 'bg-white text-gray-600 border-gray-250 hover:bg-gray-50'
                          : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed opacity-40'
                      }`}
                      id={`pending-count-btn-${num}`}
                    >
                      {num === 'all' ? 'All Qs' : `${num} Qs`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timing Selection */}
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                CBT Session Duration
              </label>

              <div className="grid grid-cols-4 gap-1.5" id="duration-select-grid">
                {durationOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedDurationIndex(idx);
                      setPendingCustomTimeMinutes(''); // Clear custom time when preset clicked
                    }}
                    className={`py-2 px-1 rounded border text-xs font-bold transition-all cursor-pointer text-center ${
                      selectedDurationIndex === idx && !pendingCustomTimeMinutes
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                    id={`time-pace-${idx}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Metric Progress */}
            <div className="bg-blue-50/20 border border-blue-100 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500 font-semibold">Active Exam Set:</span>
                <span className="font-extrabold text-blue-900">
                  {filteredQuestions.length} Questions ({Math.floor(calculatedTimeLimit / 60)} mins)
                </span>
              </div>
              
              <div className="text-[11px] text-gray-500 leading-relaxed font-medium">
                All questions will be packaged into a secure, browser-monitored CBT exam sheet. Click launch below to begin.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={filteredQuestions.length === 0}
                onClick={() => {
                  onStartExam(filteredQuestions, customTitle || 'Practice Mock Exam', calculatedTimeLimit);
                  setPendingExam(null);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-450 disabled:cursor-not-allowed transition-all text-white font-bold text-xs uppercase tracking-wider py-4 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                id="confirm-launch-filtered-exam"
              >
                <Play className="w-4 h-4 fill-white" />
                Launch Secure Exam Engine
              </button>

              <button
                type="button"
                onClick={() => setPendingExam(null)}
                className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-bold text-xs uppercase tracking-wider py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                Cancel Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD DASHBOARD RENDER FLOW
  return (
    <div className="space-y-6" id="dashboard-container">
      {/* Compact Header Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl p-4 border border-gray-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
          <div>
            <h2 className="text-sm font-bold text-gray-900">Computer-Based Testing Simulator</h2>
            <p className="text-xs text-gray-500">Practice with preset examinations or upload a study syllabus below.</p>
          </div>
        </div>
        <button
          onClick={handleLaunchDefaultExam}
          className="bg-blue-600 hover:bg-blue-700 transition-colors text-white text-xs font-bold px-4 py-2 rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          id="start-demo-btn"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          Launch Mock Preset Exam
        </button>
      </div>

      {/* Overview Analytics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between" id="metric-tests">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Exams Practiced</p>
            <h3 className="text-2.5xl font-extrabold text-gray-900 mt-1">{totalTests}</h3>
          </div>
          <div className="w-11 h-11 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 border border-blue-100">
            <HelpCircle className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between" id="metric-score">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Average Score</p>
            <h3 className="text-2.5xl font-extrabold text-gray-900 mt-1">{avgScore}%</h3>
          </div>
          <div className="w-11 h-11 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 border border-emerald-100">
            <Award className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between" id="metric-accuracy">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Average Accuracy</p>
            <h3 className="text-2.5xl font-extrabold text-gray-900 mt-1">{avgAccuracy}%</h3>
          </div>
          <div className="w-11 h-11 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 border border-indigo-100">
            <Brain className="w-5.5 h-5.5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex items-center justify-between" id="metric-time">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Total Practice Time</p>
            <h3 className="text-2.5xl font-extrabold text-gray-900 mt-1">{totalTimeSpentFormatted()}</h3>
          </div>
          <div className="w-11 h-11 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 border border-amber-100">
            <Clock className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="generate-section">
        {/* Creation Wizards */}
        <div className="lg:col-span-8 space-y-6">
          {/* Method A: Dedicated PDF Syllabus Upload Component */}
          <UploadPDF 
            onQuestionsGenerated={handleInterceptStartExam} 
            onDatabaseUpdated={fetchDbData}
          />

          {/* MongoDB Full-Stack Database Hub */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5" id="mongodb-db-hub">
            <div className="flex flex-wrap items-center justify-between border-b border-gray-150 pb-3 gap-2">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <h2 className="font-sans font-bold text-gray-800 text-sm uppercase tracking-wider">
                    MongoDB Full-Stack Database Hub
                  </h2>
                  <p className="text-[10px] text-gray-400 font-medium">
                    Manage persistent examination records, PDF papers, and JSON data
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-all cursor-pointer inline-flex items-center gap-1 text-[11px] font-bold">
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  Upload JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleUploadJsonToMongo}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={fetchDbData}
                  disabled={isLoadingDb}
                  className="p-1.5 bg-gray-50 text-gray-500 hover:text-blue-600 border border-gray-200 hover:border-blue-200 rounded-md hover:bg-blue-50/50 transition-all cursor-pointer inline-flex items-center gap-1 text-[11px]"
                  title="Reload MongoDB connection and retrieve updated statistics"
                >
                  <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isLoadingDb ? 'animate-spin text-blue-600' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            {mongoUploadSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] rounded-lg flex items-center gap-2 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 animate-bounce" />
                <span className="font-semibold">{mongoUploadSuccess}</span>
              </div>
            )}
            {mongoUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-[11px] rounded-lg flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{mongoUploadError}</span>
              </div>
            )}

            {/* Saved Question Papers Collections List */}
            <div className="space-y-3 flex flex-col items-center justify-center text-center w-full">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 border-b border-gray-100 pb-2 w-full text-center">
                <h3 className="font-bold text-gray-700 text-xs uppercase tracking-wider flex items-center gap-1.5 justify-center">
                  <Server className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  Stored Databases & Extraction Sets
                </h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                  {savedPapers.length} available
                </span>
              </div>

              {savedPapers.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50/50 w-full max-w-lg">
                  <FileText className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                  <p className="text-xs text-gray-400 font-medium">No question sets currently saved on database.</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Upload a PDF or a JSON configuration file to automatically store practice papers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-5xl mx-auto">
                  {savedPapers.map((paper, idx) => (
                    <div 
                      key={paper._id || idx}
                      className="flex flex-col items-stretch justify-between bg-slate-50/70 border border-slate-100 rounded-lg p-3 hover:bg-slate-50 transition-all gap-3 text-left w-full"
                    >
                      <div className="space-y-1 flex flex-col items-start w-full">
                        <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {paper.source || 'AI Extraction'}
                        </span>
                        {editingPaperId === (paper._id || paper.id) ? (
                          <div className="flex items-center gap-1 mt-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingTopicValue}
                              onChange={(e) => setEditingTopicValue(e.target.value)}
                              className="text-xs font-bold text-slate-800 border border-blue-300 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-full min-w-0"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameQuestionPaper(paper._id || paper.id, editingTopicValue)}
                              className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded cursor-pointer shrink-0"
                              title="Save new name"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingPaperId(null)}
                              className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded cursor-pointer text-[9px] font-bold shrink-0 px-1"
                              title="Cancel"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group max-w-full justify-start w-full">
                            <h4 className="text-xs font-extrabold text-slate-800 truncate w-full" title={paper.topic}>
                              {paper.topic}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingPaperId(paper._id || paper.id);
                                setEditingTopicValue(paper.topic);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded transition-all cursor-pointer opacity-80"
                              title="Rename this practice paper"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium font-mono">
                          <span>{paper.count} Qs</span>
                          <span>•</span>
                          <span>{paper.difficulty}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 border-t border-slate-100/80 pt-2 mt-auto w-full">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleInterceptStartExam(paper.questions, `Replay: ${paper.topic}`, paper.count * 60)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded inline-flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                            title="Start CBT simulation"
                          >
                            <Play className="w-3 h-3 fill-current shrink-0" />
                            Start
                          </button>
                          <button
                            onClick={() => handleDownloadPaperJson(paper)}
                            className="p-1.5 bg-white text-gray-600 hover:text-blue-600 border border-gray-200 hover:border-blue-200 rounded hover:bg-blue-50 transition-colors cursor-pointer inline-flex items-center gap-1 text-[10px]"
                            title="Export JSON"
                          >
                            <Download className="w-3 h-3" />
                            JSON
                          </button>
                        </div>

                        {paperToDelete === (paper._id || paper.id) ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded uppercase">Sure?</span>
                            <button
                              onClick={() => {
                                handleDeleteQuestionPaper(paper._id || paper.id);
                                setPaperToDelete(null);
                              }}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded transition-all cursor-pointer font-bold text-[10px] uppercase shadow-xs shrink-0 font-sans"
                              id={`delete-paper-${paper._id || paper.id}`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setPaperToDelete(null)}
                              className="p-1.5 bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 rounded transition-all cursor-pointer font-bold text-[10px] uppercase shadow-xs shrink-0 font-sans"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setPaperToDelete(paper._id || paper.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded transition-all cursor-pointer shrink-0 inline-flex items-center gap-1 text-[10px] font-bold shadow-xs"
                            title="Delete this stored exam paper from the database"
                            id={`delete-paper-${paper._id || paper.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Connection status section */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-center space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Database Engine State</span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-tight">
                    {dbStatus?.connected ? 'MongoDB Connected' : 'Local Memory Storage'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                  {dbStatus?.connected 
                    ? 'Successfully integrated with Cloud MongoDB instance. All exam sessions, results, and generated questions auto-sync permanently.'
                    : 'Working in high-reliability local offline fallback mode. All results and papers are safely buffered in local memory.'
                  }
                </p>

                {/* Display connection error details in-place */}
                {dbStatus?.error && (
                  <div className="mt-1 bg-red-50 border border-red-100 rounded p-2.5 text-[10px] text-red-600 font-mono leading-relaxed">
                    <span className="font-bold text-red-800 block mb-0.5">⚠️ Database Connection Issue:</span>
                    <span className="block break-all bg-red-100/50 p-1 rounded mb-2 text-[9.5px] font-mono">{dbStatus.error}</span>
                    
                    {dbStatus.error.toLowerCase().includes('auth') || dbStatus.error.toLowerCase().includes('credential') ? (
                      <div className="mt-2 pt-2 border-t border-red-200 text-slate-700 font-sans text-[11px] space-y-1.5">
                        <span className="font-bold text-red-700 block">How to resolve Authentication failure:</span>
                        <ol className="list-decimal pl-4 space-y-1 text-slate-600">
                          <li>Go to your <a href="https://cloud.mongodb.com/" target="_blank" rel="noreferrer" className="text-blue-600 underline hover:text-blue-800">MongoDB Atlas Console</a>.</li>
                          <li>Navigate to <strong>Security &gt; Database Access</strong> on the left-side menu.</li>
                          <li>Click <strong>Add New Database User</strong> (or update user <code className="bg-slate-100 px-1 rounded text-red-600 font-mono">dddinesh7010</code>).</li>
                          <li>Choose <strong>Password</strong> authentication, and enter <code className="bg-slate-100 px-1 rounded text-red-600 font-mono">7305351660</code> as the password.</li>
                          <li>Under <strong>Database User Privileges</strong>, assign <strong>Read and write to any database</strong> or <strong>Atlas Admin</strong>.</li>
                          <li>Click <strong>Add User</strong> / <strong>Update User</strong>.</li>
                          <li>Ensure access is allowed from anywhere by going to <strong>Security &gt; Network Access</strong> and adding IP Address <code className="bg-slate-100 px-1 rounded font-mono text-xs">0.0.0.0/0</code>.</li>
                        </ol>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 font-sans mt-1">
                        Please verify that your database URL is correct and your database server is running.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="md:col-span-8 grid grid-cols-2 gap-4">
                <div className="border border-gray-150 rounded-lg p-4 bg-gray-50/40 text-center">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Total Saved Audits</span>
                  <span className="text-2xl font-black text-slate-800">{dbStatus?.resultsCount ?? history.length}</span>
                  <span className="text-[9.5px] text-slate-400 block mt-1">exam performance scripts</span>
                </div>
                <div className="border border-gray-150 rounded-lg p-4 bg-gray-50/40 text-center">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Stored Exam Papers</span>
                  <span className="text-2xl font-black text-slate-800">{dbStatus?.papersCount ?? savedPapers.length}</span>
                  <span className="text-[9.5px] text-gray-400 block mt-1">extracted / generated sets</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Exams Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="font-sans font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Clock className="w-4 h-4 text-indigo-600" />
                Exam Attempt History
              </h2>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-400">
                <FileText className="w-10 h-10 mx-auto text-gray-200 mb-2" />
                <p className="text-sm">No exam logs found.</p>
                <p className="text-xs mt-1">Complete a practice mock exam to generate instant analytics.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {history.map((log) => (
                  <div
                    key={log.id || log._id}
                    className="group bg-gray-50 hover:bg-gray-100/80 transition-colors p-3.5 rounded-lg border border-gray-100 flex justify-between items-center overflow-hidden"
                  >
                    <div 
                      onClick={() => onViewHistoryDetails(log)}
                      className="space-y-1 max-w-[70%] cursor-pointer"
                    >
                      <p className="text-sm font-bold text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                        {log.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                        <span>{log.date}</span>
                        <span>•</span>
                        <span>{log.totalQuestions} Questions</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right mr-1">
                        <span className={`text-sm font-extrabold ${
                          log.accuracy >= 75 ? 'text-emerald-600' : log.accuracy >= 50 ? 'text-indigo-600' : 'text-amber-600'
                        }`}>
                          {log.score}%
                        </span>
                        <p className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Score</p>
                      </div>
                      
                      {onDeleteHistoryItem && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistoryItem(log.id || log._id);
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded transition-all cursor-pointer shrink-0 inline-flex items-center gap-1 text-[10px] font-bold shadow-xs"
                          title="Delete this result record from the database"
                          id={`delete-history-${log.id || log._id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete from Database
                        </button>
                      )}
                      
                      <ChevronRight 
                        onClick={() => onViewHistoryDetails(log)}
                        className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform cursor-pointer" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick instructions reminder */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider">CBT System Protocol</h3>
            <ul className="text-xs text-gray-500 space-y-2 list-disc list-inside">
              <li>Timing is active. The clock counts down continuously.</li>
              <li>A warning triggers if you attempt to leave the browser tab (anti-cheating trigger).</li>
              <li>Toggle between English and Tamil per-question at any time.</li>
              <li>The question palette displays interactive states: answered, bookmarked, visited.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

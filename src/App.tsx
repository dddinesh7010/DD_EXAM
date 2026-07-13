import React, { useState, useEffect } from 'react';
import { BookOpen, Settings as SettingsIcon, BrainCircuit, History, ShieldCheck } from 'lucide-react';
import { Question, ExamSettings, ExamSession, ExamHistoryLog } from './types';
import Dashboard from './components/Dashboard';
import Instructions from './components/Instructions';
import ExamEngine from './components/ExamEngine';
import ResultAnalytics from './components/ResultAnalytics';
import Settings from './components/Settings';

const DEFAULT_SETTINGS: ExamSettings = {
  defaultLanguage: 'English',
  negativeMarking: 0.25,
  positiveMarking: 2,
  warnOnTabLeave: true,
  enableSoundAlerts: true,
  timeLimitPerQuestion: 60, // 60 seconds per question standard
};

export default function App() {
  const [view, setView] = useState<'dashboard' | 'instructions' | 'exam' | 'review' | 'settings'>('dashboard');
  const [history, setHistory] = useState<ExamHistoryLog[]>([]);
  const [settings, setSettings] = useState<ExamSettings>(DEFAULT_SETTINGS);
  
  // Active exam states
  const [activeExam, setActiveExam] = useState<ExamSession | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeTimeLimit, setActiveTimeLimit] = useState(600); // 10 minutes default
  
  // Review log
  const [activeHistoryLog, setActiveHistoryLog] = useState<ExamHistoryLog | null>(null);

  // Load from local storage
  useEffect(() => {
    // Load Settings
    const savedSettings = localStorage.getItem('cbt_exam_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed parsing settings, restoring defaults', e);
      }
    }

    // Load History
    const savedHistory = localStorage.getItem('cbt_exam_history');
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((item: any) => ({
            ...item,
            id: item.id || item._id
          }));
          setHistory(normalized);
        }
      } catch (e) {
        console.error('Failed parsing exam history', e);
      }
    }

    // Async sync with MongoDB
    const fetchHistoryFromDb = async () => {
      try {
        const res = await fetch('/api/results');
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          const normalized = data.results.map((item: any) => ({
            ...item,
            id: item.id || item._id
          }));
          setHistory(normalized);
          localStorage.setItem('cbt_exam_history', JSON.stringify(normalized));
        }
      } catch (e) {
        console.warn('[MongoDB] Live database sync failed, using local history backup:', e);
      }
    };
    fetchHistoryFromDb();

    // Load unfinished active session (Auto-Save Recovery)
    const savedSession = localStorage.getItem('cbt_active_session');
    if (savedSession) {
      try {
        const parsedSession: ExamSession = JSON.parse(savedSession);
        // Verify session didn't expire completely
        const timeElapsed = Math.floor((Date.now() - parsedSession.startedAt) / 1000);
        if (timeElapsed < parsedSession.timeLimit) {
          setActiveExam(parsedSession);
          setSelectedQuestions(parsedSession.questions);
          setView('exam');
        } else {
          // expired while away, clear it
          localStorage.removeItem('cbt_active_session');
        }
      } catch (e) {
        console.error('Failed restoring active session', e);
      }
    }
  }, []);

  // Save active exam session to localStorage on modifications
  const handleUpdateSession = (updater: ExamSession | ((prev: ExamSession | null) => ExamSession | null)) => {
    setActiveExam((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next) {
        localStorage.setItem('cbt_active_session', JSON.stringify(next));
      } else {
        localStorage.removeItem('cbt_active_session');
      }
      return next;
    });
  };

  const handleStartExamFlow = (questions: Question[], title: string, timeLimit: number) => {
    setSelectedQuestions(questions);
    setActiveTitle(title);
    setActiveTimeLimit(timeLimit);
    setView('instructions');
  };

  const handleAgreeAndLaunchExam = () => {
    const freshSession: ExamSession = {
      id: 'session_' + Date.now(),
      title: activeTitle,
      questions: selectedQuestions,
      timeLimit: activeTimeLimit,
      startedAt: Date.now(),
      answers: {},
      bookmarks: {},
      visited: {},
      timeSpent: {},
    };

    // Mark first question as visited
    if (selectedQuestions.length > 0) {
      freshSession.visited[selectedQuestions[0].id] = true;
    }

    setActiveExam(freshSession);
    localStorage.setItem('cbt_active_session', JSON.stringify(freshSession));
    setView('exam');
  };

  const handleCancelExamLaunch = () => {
    setView('dashboard');
  };

  const handleSubmitActiveExam = () => {
    if (!activeExam) return;

    // Evaluate answers
    const answers = activeExam.answers;
    const totalQuestions = selectedQuestions.length;
    let correctCount = 0;
    let incorrectCount = 0;
    let answeredCount = 0;

    const topicBreakdown: { [topic: string]: { correct: number; total: number } } = {};

    selectedQuestions.forEach((q) => {
      if (!topicBreakdown[q.topic]) {
        topicBreakdown[q.topic] = { correct: 0, total: 0 };
      }
      topicBreakdown[q.topic].total += 1;

      const chosenOption = answers[q.id];
      if (chosenOption !== undefined && chosenOption !== -1) {
        answeredCount += 1;
        if (chosenOption === q.correctOptionIndex) {
          correctCount += 1;
          topicBreakdown[q.topic].correct += 1;
        } else {
          incorrectCount += 1;
        }
      }
    });

    const maxScore = totalQuestions * settings.positiveMarking;
    const scoreRaw = (correctCount * settings.positiveMarking) - (incorrectCount * settings.negativeMarking);
    const scorePercent = Math.max(0, Math.round((scoreRaw / maxScore) * 100));

    const totalSecondsSpent = Math.min(
      activeExam.timeLimit,
      Math.floor((Date.now() - activeExam.startedAt) / 1000)
    );

    const logRecord: ExamHistoryLog = {
      id: 'log_' + Date.now(),
      title: activeExam.title,
      totalQuestions,
      answeredCount,
      correctCount,
      incorrectCount,
      score: scorePercent,
      accuracy: answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0,
      totalTimeSpent: totalSecondsSpent,
      date: new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      topicStats: Object.keys(topicBreakdown).map((t) => ({
        topic: t,
        correct: topicBreakdown[t].correct,
        total: topicBreakdown[t].total,
      })),
      questions: selectedQuestions,
      answers: { ...answers },
    };

    const updatedHistory = [logRecord, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('cbt_exam_history', JSON.stringify(updatedHistory));

    // Save exam result to MongoDB
    fetch('/api/save-result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logRecord)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success && data.data && data.data._id) {
        // Sync MongoDB-assigned _id back to local history item
        setHistory(prev => prev.map(item => item.id === logRecord.id ? { ...item, id: data.data._id } : item));
      }
    })
    .catch(err => {
      console.warn('[MongoDB] Save result failed, operating in local-only fallback mode:', err);
    });

    // Clear session
    setActiveExam(null);
    localStorage.removeItem('cbt_active_session');

    // Display result dashboard
    setActiveHistoryLog(logRecord);
    setView('review');
  };

  const handleRetakeExam = (questions: Question[], title: string) => {
    // Re-launch the exam
    setSelectedQuestions(questions);
    setActiveTitle(title);
    setActiveTimeLimit(questions.length * settings.timeLimitPerQuestion);
    setView('instructions');
  };

  const handleSaveSettings = (updated: ExamSettings) => {
    setSettings(updated);
    localStorage.setItem('cbt_exam_settings', JSON.stringify(updated));
  };

  const handleClearHistory = async () => {
    setHistory([]);
    localStorage.removeItem('cbt_exam_history');
    setView('dashboard');
    try {
      await fetch('/api/results', { method: 'DELETE' });
    } catch (e) {
      console.warn('[MongoDB] Clear history failed:', e);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    const updated = history.filter((item) => item.id !== id && item._id !== id);
    setHistory(updated);
    localStorage.setItem('cbt_exam_history', JSON.stringify(updated));

    try {
      await fetch(`/api/results/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[MongoDB] Delete single result failed:', e);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937] flex flex-col font-sans" id="app-root-container">
      {/* Clean Minimalism Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between flex-wrap gap-4 transition-all duration-300">
          <div className="flex items-center">
            <div className="bg-blue-600 text-white px-3 py-1.5 rounded font-bold tracking-tighter text-sm">DD-CBT</div>
            <div className="h-6 w-px bg-gray-300 mx-4"></div>
            <div>
              <h1 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                {activeExam ? activeExam.title : 'Examination & Practice Workspace'}
              </h1>
              <p className="text-[11px] text-gray-500 font-sans">
                {activeExam ? 'Proctored Exam Workspace' : 'Syllabus-Based Practice System'}
              </p>
            </div>
          </div>

          {!activeExam && (
            <nav className="flex items-center gap-2" id="header-nav">
              <button
                onClick={() => setView('dashboard')}
                className={`px-4 py-2 border rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  view === 'dashboard' || view === 'instructions' || view === 'review'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-xs'
                }`}
                id="nav-dashboard-tab"
              >
                <History className="w-3.5 h-3.5" />
                Workspace
              </button>
              <button
                onClick={() => setView('settings')}
                className={`px-4 py-2 border rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  view === 'settings'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-xs'
                }`}
                id="nav-settings-tab"
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                Settings
              </button>
            </nav>
          )}

          {activeExam && (
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-750 px-3.5 py-1.5 rounded-md border border-blue-200 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
              Proctored Exam
            </div>
          )}
        </div>
      </header>

      {/* Main Body Stage */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-12 py-8 transition-all duration-300 max-w-none">
        {view === 'dashboard' && (
          <Dashboard
            history={history}
            onStartExam={handleStartExamFlow}
            onViewHistoryDetails={(log) => {
              setActiveHistoryLog(log);
              setView('review');
            }}
            onClearHistory={handleClearHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
          />
        )}

        {view === 'instructions' && (
          <Instructions
            title={activeTitle}
            questions={selectedQuestions}
            timeLimit={activeTimeLimit}
            settings={settings}
            onAgreeAndStart={handleAgreeAndLaunchExam}
            onCancel={handleCancelExamLaunch}
          />
        )}

        {view === 'exam' && activeExam && (
          <ExamEngine
            session={activeExam}
            settings={settings}
            onUpdateSession={handleUpdateSession}
            onSubmitExam={handleSubmitActiveExam}
          />
        )}

        {view === 'review' && activeHistoryLog && (
          <ResultAnalytics
            log={activeHistoryLog}
            onReturnToDashboard={() => setView('dashboard')}
            onRetakeExam={handleRetakeExam}
          />
        )}

        {view === 'settings' && (
          <Settings
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* Page Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 transition-all duration-300">
          <p>© 2026 DD-CBT Exam System. Built for high-reliability academic examinations.</p>
          <p className="font-sans font-semibold text-emerald-600">Secure CBT Platform</p>
        </div>
      </footer>
    </div>
  );
}

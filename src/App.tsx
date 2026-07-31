import React, { useState, useEffect } from 'react';
import { BookOpen, Settings as SettingsIcon, BrainCircuit, History, ShieldCheck, User as UserIcon, LogOut } from 'lucide-react';
import { Question, ExamSettings, ExamSession, ExamHistoryLog, User } from './types';
import Dashboard from './components/Dashboard';
import Instructions from './components/Instructions';
import ExamEngine from './components/ExamEngine';
import ResultAnalytics from './components/ResultAnalytics';
import Settings from './components/Settings';
import Login from './components/Login';
import { syncPendingResults, queueOfflineResult } from './utils/offlineManager';

const DEFAULT_SETTINGS: ExamSettings = {
  defaultLanguage: 'English',
  negativeMarking: 0.25,
  positiveMarking: 2,
  warnOnTabLeave: true,
  enableSoundAlerts: true,
  timeLimitPerQuestion: 60, // 60 seconds per question standard
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('cbt_logged_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Failed parsing logged user', e);
      }
    }
    return null;
  });

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

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('cbt_logged_user', JSON.stringify(user));
    setView('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cbt_logged_user');
    setActiveExam(null);
    setSelectedQuestions([]);
    setHistory([]);
    setView('dashboard');
  };

  // Load settings & user-isolated data when currentUser changes
  useEffect(() => {
    if (!currentUser) return;

    // Load Settings
    const savedSettings = localStorage.getItem(`cbt_exam_settings_${currentUser.id}`);
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed parsing settings, restoring defaults', e);
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }

    // Load History scoped to user
    const historyKey = `cbt_exam_history_${currentUser.id}`;
    const savedHistory = localStorage.getItem(historyKey);
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
    } else {
      setHistory([]);
    }

    // Async sync with MongoDB for logged in user
    const fetchHistoryFromDb = async () => {
      try {
        const res = await fetch(`/api/results?userId=${encodeURIComponent(currentUser.id)}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.results)) {
          const normalized = data.results.map((item: any) => ({
            ...item,
            id: item.id || item._id
          }));
          setHistory(normalized);
          localStorage.setItem(historyKey, JSON.stringify(normalized));
        }
      } catch (e) {
        console.warn('[MongoDB] Live database sync failed, using local history backup:', e);
      }
    };
    fetchHistoryFromDb();

    // Load unfinished active session (Auto-Save Recovery)
    const sessionKey = `cbt_active_session_${currentUser.id}`;
    const savedSession = localStorage.getItem(sessionKey);
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
          localStorage.removeItem(sessionKey);
        }
      } catch (e) {
        console.error('Failed restoring active session', e);
      }
    } else {
      setActiveExam(null);
    }
  }, [currentUser]);

  // Network sync trigger: Auto-synchronize pending offline exam submissions when reconnected
  useEffect(() => {
    const handleOnline = async () => {
      console.log('[App] Reconnected to internet. Auto-syncing pending offline exam logs...');
      const res = await syncPendingResults();
      if (res.syncedCount > 0 && currentUser) {
        // Refresh history from MongoDB
        try {
          const apiRes = await fetch(`/api/results?userId=${encodeURIComponent(currentUser.id)}`);
          const data = await apiRes.json();
          if (data.success && Array.isArray(data.results)) {
            const normalized = data.results.map((item: any) => ({
              ...item,
              id: item.id || item._id
            }));
            setHistory(normalized);
            localStorage.setItem(`cbt_exam_history_${currentUser.id}`, JSON.stringify(normalized));
          }
        } catch (_) {}
      }
    };

    window.addEventListener('online', handleOnline);
    // Initial sync check on mount
    syncPendingResults();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUser]);

  // Save active exam session to localStorage on modifications
  const handleUpdateSession = (updater: ExamSession | ((prev: ExamSession | null) => ExamSession | null)) => {
    if (!currentUser) return;
    const sessionKey = `cbt_active_session_${currentUser.id}`;
    setActiveExam((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next) {
        localStorage.setItem(sessionKey, JSON.stringify(next));
      } else {
        localStorage.removeItem(sessionKey);
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
    if (!currentUser) return;
    const freshSession: ExamSession = {
      id: 'session_' + Date.now(),
      userId: currentUser.id,
      username: currentUser.name,
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
    localStorage.setItem(`cbt_active_session_${currentUser.id}`, JSON.stringify(freshSession));
    setView('exam');
  };

  const handleCancelExamLaunch = () => {
    setView('dashboard');
  };

  const handleSubmitActiveExam = () => {
    if (!activeExam || !currentUser) return;

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
      userId: currentUser.id,
      username: currentUser.username,
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
    localStorage.setItem(`cbt_exam_history_${currentUser.id}`, JSON.stringify(updatedHistory));

    // Save exam result to MongoDB with offline queue fallback
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
      } else {
        queueOfflineResult(logRecord);
      }
    })
    .catch(err => {
      console.warn('[MongoDB] Save result failed or offline, queuing for background sync:', err);
      queueOfflineResult(logRecord);
    });

    // Clear session
    setActiveExam(null);
    localStorage.removeItem(`cbt_active_session_${currentUser.id}`);

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
    if (currentUser) {
      localStorage.setItem(`cbt_exam_settings_${currentUser.id}`, JSON.stringify(updated));
    }
  };

  const handleClearHistory = async () => {
    if (!currentUser) return;
    setHistory([]);
    localStorage.removeItem(`cbt_exam_history_${currentUser.id}`);
    setView('dashboard');
    try {
      await fetch(`/api/results?userId=${encodeURIComponent(currentUser.id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[MongoDB] Clear history failed:', e);
    }
  };

  const handleDeleteHistoryItem = async (id: string) => {
    if (!currentUser) return;
    const updated = history.filter((item) => item.id !== id && item._id !== id);
    setHistory(updated);
    localStorage.setItem(`cbt_exam_history_${currentUser.id}`, JSON.stringify(updated));

    try {
      await fetch(`/api/results/${id}?userId=${encodeURIComponent(currentUser.id)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[MongoDB] Delete single result failed:', e);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937] flex flex-col font-sans">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-600 text-white px-3 py-1.5 rounded font-bold tracking-tighter text-sm">DD-CBT</div>
              <div className="h-6 w-px bg-gray-300 mx-4"></div>
              <div>
                <h1 className="text-sm font-extrabold text-gray-900 uppercase tracking-wider">
                  Examination & Practice Workspace
                </h1>
                <p className="text-[11px] text-gray-500 font-sans">
                  Syllabus-Based Multi-Member CBT System
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <Login onLoginSuccess={handleLogin} />
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
          <div className="w-full mx-auto px-4 sm:px-6 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2026 DD-CBT Exam System. Built for high-reliability academic examinations.</p>
            <p className="font-sans font-semibold text-emerald-600">Private CBT Workspace</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#1F2937] flex flex-col font-sans" id="app-root-container">
      {/* Clean Minimalism Responsive Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="w-full mx-auto px-3 sm:px-6 lg:px-12 py-2.5 sm:py-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-4 transition-all duration-300">
          {/* Logo & Workspace Title */}
          <div className="flex items-center justify-between min-w-0 w-full md:w-auto">
            <div className="flex items-center min-w-0 flex-1">
              <div className="bg-blue-600 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded font-bold tracking-tighter text-xs sm:text-sm shrink-0">DD-CBT</div>
              <div className="h-4 sm:h-6 w-px bg-gray-300 mx-2 sm:mx-4 shrink-0"></div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase tracking-wider truncate">
                  {activeExam ? activeExam.title : 'Examination & Practice Workspace'}
                </h1>
                <p className="text-[10px] sm:text-[11px] text-gray-500 font-sans truncate">
                  {activeExam ? 'Proctored Exam Workspace' : 'Syllabus-Based Practice System'}
                </p>
              </div>
            </div>

            {/* Member Badge & Switch User on Mobile */}
            {!activeExam && (
              <div className="flex md:hidden items-center gap-1 bg-blue-50 border border-blue-200 text-blue-900 px-2 py-1 rounded text-xs font-bold shrink-0 ml-2">
                <UserIcon className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate max-w-[80px] text-[11px]">{currentUser.name}</span>
                <button
                  onClick={handleLogout}
                  title="Switch Member Profile"
                  className="ml-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-0.5 shrink-0"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Mobile-only Member Badge if activeExam */}
            {activeExam && (
              <div className="md:hidden flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-900 px-2 py-1 rounded text-[11px] font-bold shrink-0 ml-2">
                <UserIcon className="w-3 h-3 text-blue-600 shrink-0" />
                <span className="truncate max-w-[70px]">{currentUser.name}</span>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          {!activeExam && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              {/* Member Badge on Desktop */}
              <div className="hidden md:flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-2xs shrink-0">
                <UserIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate max-w-[130px]">{currentUser.name}</span>
                <button
                  onClick={handleLogout}
                  title="Switch Member Profile"
                  className="ml-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-0.5 shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>

              <nav className="grid grid-cols-2 md:flex items-center gap-2 w-full md:w-auto" id="header-nav">
                <button
                  onClick={() => setView('dashboard')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 border rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    view === 'dashboard' || view === 'instructions' || view === 'review'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-xs'
                  }`}
                  id="nav-dashboard-tab"
                >
                  <History className="w-3.5 h-3.5 shrink-0" />
                  <span>Workspace</span>
                </button>
                <button
                  onClick={() => setView('settings')}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 border rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                    view === 'settings'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm hover:bg-blue-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-xs'
                  }`}
                  id="nav-settings-tab"
                >
                  <SettingsIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          )}

          {activeExam && (
            <div className="hidden md:flex items-center gap-1.5 bg-blue-50 text-blue-750 px-3.5 py-1.5 rounded-md border border-blue-200 text-xs font-bold uppercase tracking-wider shrink-0">
              <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Proctored Exam</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Body Stage */}
      <main className="flex-1 w-full mx-auto px-2.5 sm:px-6 lg:px-12 py-3 sm:py-8 transition-all duration-300 max-w-none">
        {view === 'dashboard' && (
          <Dashboard
            history={history}
            currentUser={currentUser}
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
            currentUser={currentUser}
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
          <p>© 2026 DD-CBT Exam System. Member: <strong className="text-gray-700">{currentUser.name}</strong></p>
          <p className="font-sans font-semibold text-emerald-600">Secure Isolated CBT Workspace</p>
        </div>
      </footer>
    </div>
  );
}

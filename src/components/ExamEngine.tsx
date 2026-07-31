import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Bookmark, 
  HelpCircle, 
  Eye, 
  EyeOff,
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Minimize2,
  AlertTriangle, 
  Monitor, 
  User, 
  Settings, 
  Info,
  Layers,
  ZoomIn,
  ZoomOut,
  Type as FontIcon,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';
import { Question, ExamSession, ExamSettings, User as UserType } from '../types';
import { isOnline } from '../utils/offlineManager';

interface ExamEngineProps {
  session: ExamSession;
  settings: ExamSettings;
  onUpdateSession: (updater: ExamSession | ((prev: ExamSession | null) => ExamSession | null)) => void;
  onSubmitExam: () => void;
  currentUser?: UserType | null;
}

export default function ExamEngine({ session, settings, onUpdateSession, onSubmitExam, currentUser }: ExamEngineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // High-fidelity CBT visual settings
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'english' | 'tamil'>('bilingual');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showOnlyQuestion, setShowOnlyQuestion] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tabFocusWarnings, setTabFocusWarnings] = useState(0);
  
  // Modals & Network Resilience state
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(isOnline());
  const [showOfflineBanner, setShowOfflineBanner] = useState<boolean>(!isOnline());
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warning5MinPlayedRef = useRef(false);

  const currentQuestion = session.questions[currentIndex];
  const totalQuestions = session.questions.length;

  // Web Audio Synth
  const playSynthesizedSound = (frequency: number, duration: number) => {
    if (!settings.enableSoundAlerts) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.frequency.value = frequency;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio Context not started or blocked by browser policy:', e);
    }
  };

  const playCBTChime = (type: 'start' | 'warning' | 'submit') => {
    if (!settings.enableSoundAlerts) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, startDelay: number, duration: number, typeOfOsc: OscillatorType = 'sine', volume = 0.08) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + startDelay);
        osc.type = typeOfOsc;
        gain.gain.setValueAtTime(0, ctx.currentTime + startDelay);
        gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startDelay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + startDelay + duration);
        osc.start(ctx.currentTime + startDelay);
        osc.stop(ctx.currentTime + startDelay + duration);
      };

      if (type === 'start') {
        // Soft dual ascending chime for exam start
        playTone(523.25, 0.0, 0.3, 'sine', 0.06); // C5
        playTone(659.25, 0.12, 0.35, 'sine', 0.06); // E5
        playTone(783.99, 0.24, 0.45, 'sine', 0.06); // G5
      } else if (type === 'warning') {
        // Dual medium-high distinct alert for 5 minutes remaining
        playTone(587.33, 0.0, 0.25, 'sine', 0.08); // D5
        playTone(587.33, 0.3, 0.4, 'sine', 0.08); // D5
      } else if (type === 'submit') {
        // Resolving rich completion sequence
        playTone(440.00, 0.0, 0.3, 'sine', 0.06); // A4
        playTone(554.37, 0.08, 0.3, 'sine', 0.06); // C#5
        playTone(659.25, 0.16, 0.4, 'sine', 0.06); // E5
        playTone(880.00, 0.24, 0.6, 'sine', 0.05); // A5
      }
    } catch (e) {
      console.warn('CBT Audio context warning:', e);
    }
  };

  // Play exam start chime on mount
  useEffect(() => {
    playCBTChime('start');
  }, []);

  // Timer logic
  const timeLeft = Math.max(0, session.timeLimit - Math.floor((Date.now() - session.startedAt) / 1000));

  useEffect(() => {
    // Mark first question as Visited on load
    markAsVisited(currentQuestion.id);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
      const remaining = Math.max(0, session.timeLimit - elapsed);
      
      // Update time spent per active question safely with functional state update
      onUpdateSession((prev) => {
        if (!prev) return prev;
        const updatedTimeSpent = { ...prev.timeSpent };
        updatedTimeSpent[currentQuestion.id] = (updatedTimeSpent[currentQuestion.id] || 0) + 1;
        return {
          ...prev,
          timeSpent: updatedTimeSpent
        };
      });

      // 5-minute time warning (300 seconds)
      if (remaining <= 300 && remaining > 0 && !warning5MinPlayedRef.current) {
        warning5MinPlayedRef.current = true;
        playCBTChime('warning');
      }

      // Play a subtle double-chime alert at other key minute marks within the final 5 minutes:
      // Exactly at 240s (4m), 180s (3m), 120s (2m), 60s (1m) remaining
      if (remaining <= 300 && remaining > 10 && remaining % 60 === 0) {
        playSynthesizedSound(587.33, 0.08); // High tone D5
        setTimeout(() => playSynthesizedSound(659.25, 0.08), 120); // E5
      }

      // Subtle low ticking pulse every 10 seconds under 60s remaining (excluding final 10s)
      if (remaining < 60 && remaining > 10 && remaining % 10 === 0) {
        playSynthesizedSound(440.00, 0.04); // Quiet tick A4
      }

      // Beep sound on final 10 seconds of timer (every second to increase urgency)
      if (remaining <= 10 && remaining > 0) {
        playSynthesizedSound(900, 0.08);
      }

      if (remaining === 0) {
        clearInterval(timerRef.current!);
        playCBTChime('submit');
        onSubmitExam();
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, session.startedAt, session.timeLimit]);

  // Tab Leave (Anti-Cheat) Logic
  useEffect(() => {
    if (!settings.warnOnTabLeave) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerCheatWarning();
      }
    };

    const handleWindowBlur = () => {
      triggerCheatWarning();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [tabFocusWarnings, settings.warnOnTabLeave]);

  // Sync fullscreen state with document.fullscreenElement
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Offline / Online network status listener for active CBT session resilience
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const handleOnline = () => {
      setIsNetworkOnline(true);
      setShowOfflineBanner(true);
      timer = setTimeout(() => setShowOfflineBanner(false), 6000);
    };

    const handleOffline = () => {
      setIsNetworkOnline(false);
      setShowOfflineBanner(true);
      playSynthesizedSound(400, 0.3);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const triggerCheatWarning = () => {
    setTabFocusWarnings((prev) => {
      const updated = prev + 1;
      playSynthesizedSound(350, 0.35); // Warning tone
      setShowWarningModal(true);
      return updated;
    });
  };

  // State Updates helpers using functional state updates to eliminate stale prop closures
  const selectOption = (optionIndex: number) => {
    onUpdateSession((prev) => {
      if (!prev) return prev;
      const updatedAnswers = { ...prev.answers };
      updatedAnswers[currentQuestion.id] = optionIndex;
      return { ...prev, answers: updatedAnswers };
    });
    playSynthesizedSound(650, 0.05); // click sound
  };

  const clearSelection = () => {
    onUpdateSession((prev) => {
      if (!prev) return prev;
      const updatedAnswers = { ...prev.answers };
      updatedAnswers[currentQuestion.id] = -1;
      return { ...prev, answers: updatedAnswers };
    });
    playSynthesizedSound(550, 0.05);
  };

  const toggleBookmark = () => {
    onUpdateSession((prev) => {
      if (!prev) return prev;
      const updatedBookmarks = { ...prev.bookmarks };
      updatedBookmarks[currentQuestion.id] = !updatedBookmarks[currentQuestion.id];
      return { ...prev, bookmarks: updatedBookmarks };
    });
    playSynthesizedSound(800, 0.05);
  };

  const markAsVisited = (qId: string) => {
    onUpdateSession((prev) => {
      if (!prev) return prev;
      if (!prev.visited[qId]) {
        const updatedVisited = { ...prev.visited };
        updatedVisited[qId] = true;
        return { ...prev, visited: updatedVisited };
      }
      return prev;
    });
  };

  // CBT Core Navigations
  const handleSaveAndNext = () => {
    // Classic CBT Save & Next: removes the "marked for review" state if an answer is selected
    onUpdateSession((prev) => {
      if (!prev) return prev;
      const updatedBookmarks = { ...prev.bookmarks };
      updatedBookmarks[currentQuestion.id] = false;
      return { ...prev, bookmarks: updatedBookmarks };
    });

    if (currentIndex < totalQuestions - 1) {
      const nextId = session.questions[currentIndex + 1].id;
      markAsVisited(nextId);
      setCurrentIndex(currentIndex + 1);
    }
    playSynthesizedSound(700, 0.05);
  };

  const handleMarkForReviewAndNext = () => {
    // Flag as review and move to next
    onUpdateSession((prev) => {
      if (!prev) return prev;
      const updatedBookmarks = { ...prev.bookmarks };
      updatedBookmarks[currentQuestion.id] = true;
      return { ...prev, bookmarks: updatedBookmarks };
    });

    if (currentIndex < totalQuestions - 1) {
      const nextId = session.questions[currentIndex + 1].id;
      markAsVisited(nextId);
      setCurrentIndex(currentIndex + 1);
    }
    playSynthesizedSound(800, 0.05);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevId = session.questions[currentIndex - 1].id;
      markAsVisited(prevId);
      setCurrentIndex(currentIndex - 1);
      playSynthesizedSound(650, 0.04);
    }
  };

  const jumpToQuestion = (index: number) => {
    const qId = session.questions[index].id;
    markAsVisited(qId);
    setCurrentIndex(index);
    playSynthesizedSound(700, 0.04);
  };

  // Full Screen Request Button
  const handleToggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
          setIsFullscreen(false);
        }
      }
    } catch (e) {
      console.warn('Fullscreen request blocked', e);
    }
  };

  // Calculate high-fidelity CBT stats (The standard 5 national portal statuses)
  // 1. Answered: answered and NOT review-marked
  // 2. Unanswered: visited, NOT answered, and NOT review-marked
  // 3. Marked for Review: review-marked and NOT answered
  // 4. Answered & Marked for Review: answered AND review-marked (considered for evaluation in many portals)
  // 5. Not Visited: NOT visited
  const stats = session.questions.reduce(
    (acc, q) => {
      const isAnswered = session.answers[q.id] !== undefined && session.answers[q.id] !== -1;
      const isBookmarked = session.bookmarks[q.id] === true;
      const isVisited = session.visited[q.id] === true;

      if (!isVisited) {
        acc.notVisited++;
      } else if (isAnswered && isBookmarked) {
        acc.answeredAndMarked++;
      } else if (isBookmarked) {
        acc.markedForReview++;
      } else if (isAnswered) {
        acc.answered++;
      } else {
        acc.notAnswered++;
      }
      return acc;
    },
    { answered: 0, notAnswered: 0, markedForReview: 0, answeredAndMarked: 0, notVisited: 0 }
  );

  // Helper to determine single button styling in palette grid
  const getPaletteStyle = (qId: string, idx: number) => {
    const isCurrent = idx === currentIndex;
    const isAnswered = session.answers[qId] !== undefined && session.answers[qId] !== -1;
    const isBookmarked = session.bookmarks[qId] === true;
    const isVisited = session.visited[qId] === true;

    let baseClass = "h-8 w-10 text-xs font-mono font-bold flex items-center justify-center border transition-all cursor-pointer relative ";
    
    if (isCurrent) {
      baseClass += "ring-2 ring-blue-500 ring-offset-1 ";
    }

    if (!isVisited) {
      // 5. Not Visited (Classic white box)
      return baseClass + "bg-white text-gray-700 border-gray-300 rounded";
    }
    
    if (isAnswered && isBookmarked) {
      // 4. Answered and Marked for Review (Violet circle with green tick bubble)
      return baseClass + "bg-indigo-600 text-white border-indigo-700 rounded-full shadow-inner after:content-[''] after:absolute after:-bottom-0.5 after:-right-0.5 after:w-3 after:after:h-3 after:bg-emerald-500 after:rounded-full after:border after:border-white";
    }
    
    if (isBookmarked) {
      // 3. Marked for Review (Violet/Purple circular shape)
      return baseClass + "bg-indigo-600 text-white border-indigo-700 rounded-full";
    }
    
    if (isAnswered) {
      // 1. Answered (Classic Green trapezoid/curved shape - styled here with rounded-b-lg rounded-t-xs)
      return baseClass + "bg-emerald-600 text-white border-emerald-700 rounded-t-xs rounded-b-xl";
    }
    
    // 2. Not Answered (Classic Red box - styled here with rounded-t-xl rounded-b-xs)
    return baseClass + "bg-red-500 text-white border-red-600 rounded-t-xl rounded-b-xs";
  };

  // Format Timer text (HH:MM:SS)
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColorClass = () => {
    if (timeLeft <= 120) {
      // Critical under 2 minutes (120 seconds) - rapid crimson/white flash
      return 'animate-timer-critical font-black';
    }
    if (timeLeft <= 300) {
      // Warning under 5 minutes (300 seconds) - amber pulsing state
      return 'animate-timer-warn font-bold';
    }
    // Normal state - premium dark glowing theme
    return 'text-slate-200 bg-slate-900 border-slate-700';
  };

  // Font size mapper
  const getQuestionFontSize = () => {
    if (fontSize === 'sm') return 'text-sm';
    if (fontSize === 'lg') return 'text-lg';
    return 'text-base';
  };

  const getOptionsFontSize = () => {
    if (fontSize === 'sm') return 'text-xs';
    if (fontSize === 'lg') return 'text-base';
    return 'text-sm';
  };

  return (
    <div className="space-y-4 font-sans select-none" id="exam-engine-root">
      {/* Offline Resilience Toast/Banner */}
      {showOfflineBanner && (
        <div className={`p-3 rounded-lg border flex items-start justify-between gap-3 text-xs shadow-md transition-all ${
          isNetworkOnline 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-start gap-2.5">
            {isNetworkOnline ? (
              <Wifi className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <WifiOff className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            )}
            <div>
              <span className="font-extrabold uppercase tracking-wide block mb-0.5 text-[11px]">
                {isNetworkOnline ? '🟢 Connection Restored' : '⚡ Offline Mode Active — Session Protected'}
              </span>
              <p className="text-[11px] leading-relaxed">
                {isNetworkOnline ? (
                  'Network connection re-established. Cloud sync is active.'
                ) : (
                  'Internet connection lost, but your test is 100% unaffected! All answers, bookmarks, time spent, and timer ticks are continuously auto-saved in local memory and will safely submit.'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOfflineBanner(false)}
            className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1 cursor-pointer shrink-0"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Protocol Status Bar */}
      <div className="bg-slate-800 text-white rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md border-b-4 border-blue-600">
        <div className="flex items-center gap-2.5">
          <Monitor className="w-5 h-5 text-blue-400 shrink-0" />
          <div>
            <h2 className="text-xs font-extrabold tracking-wider text-blue-300 uppercase leading-none">Online Assessment Console</h2>
            <p className="text-sm font-bold text-white mt-1 font-sans">{session.title}</p>
          </div>
        </div>

        {/* Live Information Strip */}
        <div className="hidden md:flex items-center gap-4 text-[10px] uppercase font-mono tracking-wider font-semibold text-gray-300 bg-slate-900/60 px-3.5 py-1.5 rounded border border-slate-700/60">
          <div>Subject: <span className="text-white font-bold">{currentQuestion.topic}</span></div>
          <div className="h-3 w-[1px] bg-slate-700"></div>
          <div>Paper Code: <span className="text-white font-bold">CBT-S1-{totalQuestions}Q</span></div>
          <div className="h-3 w-[1px] bg-slate-700"></div>
          {/* Real-time Network Resilience Badge */}
          {isNetworkOnline ? (
            <div className="flex items-center gap-1 text-emerald-400 font-bold" title="Connected to cloud server">
              <Wifi className="w-3.5 h-3.5" />
              <span>Live Sync</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40" title="Offline mode - Responses saved locally">
              <WifiOff className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>Offline Protection</span>
            </div>
          )}
        </div>

        {/* Action Controls & Live Countdown */}
        <div className="flex items-center gap-3">
          {/* Real-time Countdown Timer */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded border text-sm font-black font-mono tracking-widest shadow-inner transition-all ${getTimerColorClass()}`}>
            <Clock className="w-4 h-4 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{formatTime(timeLeft)}</span>
          </div>

          {/* Help Manual Button */}
          <button
            onClick={() => { setShowHelpModal(true); playSynthesizedSound(750, 0.04); }}
            className="p-2 bg-slate-700 hover:bg-slate-650 border border-slate-650 rounded text-gray-200 hover:text-white transition-all cursor-pointer shadow-sm"
            title="Syllabus CBT Legend Instructions"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Full Screen Request Button */}
          <button
            onClick={handleToggleFullscreen}
            className={`p-2 rounded border transition-all cursor-pointer shadow-sm ${
              isFullscreen 
                ? 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' 
                : 'bg-slate-700 hover:bg-slate-650 border-slate-650 text-gray-200 hover:text-white'
            }`}
            title={isFullscreen ? "Exit fullscreen examination screen" : "Enter fullscreen examination screen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Core CBT Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-[calc(100vh-170px)] lg:min-h-[580px] lg:overflow-hidden overflow-visible">
        {/* LEFT COMPARTMENT (9/12 Columns): Interactive Exam Board & Controls */}
        <div className="lg:col-span-9 flex flex-col justify-between bg-white rounded-lg border border-slate-200 shadow-sm lg:overflow-hidden overflow-visible lg:h-full h-auto">
          
          {/* Left Panel Menu Strip */}
          <div className="px-3 sm:px-5 py-2.5 sm:py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700 select-none">
            <div className="flex items-center gap-2">
              <span className="bg-slate-700 text-white font-mono text-[11px] font-bold py-1 px-2.5 sm:px-3 rounded uppercase tracking-wide">
                Question No. {currentIndex + 1}
              </span>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 py-0.5 px-2 rounded font-medium text-[11px]">
                Marks: <span className="text-emerald-600 font-bold">+{settings.positiveMarking || 1}</span> 
                {settings.negativeMarking > 0 && <span className="text-red-500 font-bold">, -{settings.negativeMarking}</span>}
              </span>
            </div>

            {/* Live CBT Utility Controls (Layout Mode + Font Zoom) */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end mt-1 sm:mt-0">
              {/* Show Only Question Toggle */}
              <button
                type="button"
                onClick={() => { setShowOnlyQuestion(!showOnlyQuestion); playSynthesizedSound(700, 0.03); }}
                className={`px-2 sm:px-2.5 py-1.5 rounded-xs border font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 ${
                  showOnlyQuestion 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Toggle Question Only Mode"
                id="toggle-question-only-mode"
              >
                {showOnlyQuestion ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0" />}
                <span className="hidden xs:inline sm:inline">{showOnlyQuestion ? "Question Only" : "Show Only Question"}</span>
                <span className="xs:hidden sm:hidden">{showOnlyQuestion ? "Q-Only" : "Q-Only"}</span>
              </button>

              {/* Display Language Controller Dropdown (CBT Standard) */}
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white border border-slate-300 rounded px-1.5 sm:px-2.5 py-1 shadow-xs max-w-[160px] sm:max-w-none">
                <span className="hidden sm:inline text-[10px] font-black text-slate-500 uppercase tracking-wide shrink-0">View In:</span>
                <select
                  value={displayMode}
                  onChange={(e) => { setDisplayMode(e.target.value as any); playSynthesizedSound(700, 0.03); }}
                  className="bg-transparent border-0 font-bold text-[10px] sm:text-[11px] text-slate-800 focus:outline-none focus:ring-0 cursor-pointer py-0.5 truncate w-full"
                >
                  <option value="bilingual">Bilingual (English & Tamil)</option>
                  <option value="english">English Only</option>
                  <option value="tamil">Tamil Only (தமிழ்)</option>
                </select>
              </div>

              {/* Text Font-size controller */}
              <div className="flex items-center bg-white border border-slate-200 rounded p-0.5 shadow-xs shrink-0">
                <button
                  type="button"
                  onClick={() => { setFontSize('sm'); playSynthesizedSound(700, 0.03); }}
                  className={`p-1 sm:p-1.5 rounded-xs font-bold text-[10px] transition-all cursor-pointer ${
                    fontSize === 'sm' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-800'
                  }`}
                  title="Zoom Out Font"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setFontSize('md'); playSynthesizedSound(700, 0.03); }}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-xs font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer ${
                    fontSize === 'md' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-800'
                  }`}
                  title="Default Font Size"
                >
                  Normal
                </button>
                <button
                  type="button"
                  onClick={() => { setFontSize('lg'); playSynthesizedSound(700, 0.03); }}
                  className={`p-1 sm:p-1.5 rounded-xs font-bold text-[10px] transition-all cursor-pointer ${
                    fontSize === 'lg' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-800'
                  }`}
                  title="Zoom In Font"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Actual Active Question Sheet Container */}
          <div className="p-3.5 sm:p-5 md:p-6 flex-1 overflow-y-auto" id="cbt-question-workspace">
            <div className={`grid gap-6 ${
              displayMode === 'bilingual' 
                ? 'grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-slate-200 lg:gap-8' 
                : 'grid-cols-1'
            }`}>
              
              {/* Left Column / English Panel */}
              {(displayMode === 'bilingual' || displayMode === 'english') && (
                <div className={`space-y-5 ${displayMode === 'bilingual' ? '' : 'max-w-4xl mx-auto w-full'}`}>
                  {/* English Question Text */}
                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-mono">
                        English Column
                      </span>
                    </div>
                    <h3 className={`font-sans font-extrabold text-slate-800 leading-relaxed ${getQuestionFontSize()}`}>
                      {currentQuestion.questionText}
                    </h3>
                  </div>

                  {/* English Options */}
                  {showOnlyQuestion ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-center space-y-3" id="english-only-question-placeholder">
                      <p className="text-xs text-slate-500 font-semibold">Options are hidden in Question Only Mode.</p>
                      <button
                        type="button"
                        onClick={() => { setShowOnlyQuestion(false); playSynthesizedSound(700, 0.03); }}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Reveal Options to Answer
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, idx) => {
                        const isSelected = session.answers[currentQuestion.id] === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => selectOption(idx)}
                            className={`flex items-center gap-3.5 p-3.5 rounded-lg border transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/30 text-blue-950 shadow-xs ring-1 ring-blue-500'
                                : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 bg-white'
                            }`}
                          >
                            {/* Radio Input & Alphabet Circle */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <input
                                type="radio"
                                checked={isSelected}
                                readOnly
                                className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer shrink-0"
                              />
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-mono font-bold transition-all ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                                  : 'bg-slate-50 text-slate-500 border-slate-300'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                            </div>
                            <span className={`font-bold text-slate-800 leading-tight ${getOptionsFontSize()}`}>
                              {option}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Right Column / Tamil Panel */}
              {(displayMode === 'bilingual' || displayMode === 'tamil') && (
                <div className={`space-y-5 ${displayMode === 'bilingual' ? 'lg:pl-8' : 'max-w-4xl mx-auto w-full'}`}>
                  {/* Tamil Question Text */}
                  <div className="space-y-2 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                        தமிழ் வடிவம் (Tamil)
                      </span>
                    </div>
                    <h3 className={`font-sans font-bold text-slate-800 leading-relaxed ${getQuestionFontSize()}`}>
                      {currentQuestion.questionTamilText || currentQuestion.questionText}
                    </h3>
                  </div>

                  {/* Tamil Options */}
                  {showOnlyQuestion ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 text-center space-y-3" id="tamil-only-question-placeholder">
                      <p className="text-xs text-slate-500 font-semibold">கேள்வி மட்டும் பயன்முறையில் விடைகள் மறைக்கப்பட்டுள்ளன.</p>
                      <button
                        type="button"
                        onClick={() => { setShowOnlyQuestion(false); playSynthesizedSound(700, 0.03); }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-all cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        விடைகளைக் காட்டு
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, idx) => {
                        const isSelected = session.answers[currentQuestion.id] === idx;
                        const optionTamil = currentQuestion.tamilOptions?.[idx] || option;
                        return (
                          <div
                            key={idx}
                            onClick={() => selectOption(idx)}
                            className={`flex items-center gap-3.5 p-3.5 rounded-lg border transition-all cursor-pointer select-none ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/25 text-emerald-950 shadow-xs ring-1 ring-emerald-500'
                                : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-slate-700 bg-white'
                            }`}
                          >
                            {/* Radio Input & Alphabet Circle */}
                            <div className="flex items-center gap-2.5 shrink-0">
                              <input
                                type="radio"
                                checked={isSelected}
                                readOnly
                                className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer shrink-0"
                              />
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-mono font-bold transition-all ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                                  : 'bg-slate-50 text-slate-500 border-slate-300'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                            </div>
                            <span className={`font-bold text-slate-800 leading-tight ${getOptionsFontSize()}`}>
                              {optionTamil}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Exam Bottom Navigation Panel (Real NTA CBT Layout matches) */}
          <div className="bg-slate-100 border-t border-slate-200 p-2.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 select-none">
            
            {/* Left buttons: Actions on current question */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleMarkForReviewAndNext}
                className="flex-1 sm:flex-none px-2.5 sm:px-4 py-2 sm:py-2.5 text-[10.5px] sm:text-xs font-black uppercase tracking-wider bg-white border border-slate-300 text-indigo-700 hover:bg-slate-50 hover:border-slate-400 rounded transition-all cursor-pointer shadow-xs text-center"
                id="bookmark-btn"
                title="Mark this question for review and proceed to next"
              >
                Mark Review & Next
              </button>
              
              <button
                type="button"
                onClick={clearSelection}
                disabled={session.answers[currentQuestion.id] === undefined || session.answers[currentQuestion.id] === -1}
                className="px-2.5 sm:px-4 py-2 sm:py-2.5 text-[10.5px] sm:text-xs font-bold uppercase tracking-wider bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 disabled:opacity-40 disabled:pointer-events-none rounded transition-all cursor-pointer shadow-xs text-center"
                id="clear-btn"
                title="Deselect the chosen option"
              >
                Clear
              </button>
            </div>

            {/* Right buttons: Navigations and evaluation saves */}
            <div className="flex items-center gap-1.5 sm:gap-2 justify-between sm:justify-end">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-[10.5px] sm:text-xs font-bold uppercase tracking-wider border border-slate-300 rounded text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer inline-flex items-center justify-center gap-0.5 sm:gap-1 shadow-xs"
                id="prev-question-btn"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                Back
              </button>

              <button
                type="button"
                onClick={handleSaveAndNext}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 transition-all text-white font-extrabold text-[10.5px] sm:text-xs rounded shadow-sm uppercase tracking-widest border border-emerald-600 flex items-center justify-center gap-1 cursor-pointer"
                id="save-next-btn"
                title="Save chosen option and proceed to next question"
              >
                Save & Next
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COMPARTMENT (3/12 Columns): Candidate Details, Palette, Legends & Submits */}
        <div className="lg:col-span-3 flex flex-col lg:h-full h-auto lg:overflow-hidden overflow-visible">
          
          {/* Box Container */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col lg:h-full h-auto lg:overflow-hidden overflow-visible gap-4 shadow-sm select-none">
            
            {/* Candidate Identity Frame */}
            <div className="bg-white border border-slate-200 p-3 rounded-md flex items-center gap-3 shrink-0">
              <div className="w-12 h-12 bg-slate-100 rounded border-2 border-slate-200 flex items-center justify-center text-slate-400 shrink-0 relative overflow-hidden">
                <User className="w-7 h-7 text-slate-400" />
                <div className="absolute bottom-0 inset-x-0 bg-blue-600 text-[8px] text-white font-black uppercase text-center py-0.5 leading-none tracking-widest font-mono">CBT</div>
              </div>
              <div className="min-w-0">
                <h4 className="text-[10px] font-extrabold text-blue-600 leading-none uppercase tracking-widest">Candidate Profile</h4>
                <p className="text-xs font-black text-slate-800 mt-1 truncate" id="candidate-username">
                  {currentUser?.name || session.username || session.userId || 'Candidate'}
                </p>
                <p className="text-[9px] text-slate-500 font-mono font-bold mt-1 uppercase tracking-wide">
                  ROLL: CBT-2026-9B9B
                </p>
              </div>
            </div>

            {/* Authentic CBT Legend Indicators */}
            <div className="bg-white border border-slate-200 p-3 rounded-md space-y-3 shrink-0">
              <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5">Legends</h5>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-700">
                
                {/* 1. Answered */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-5 bg-emerald-600 border border-emerald-700 text-white rounded-t-xs rounded-b-lg text-[9px] font-mono font-bold flex items-center justify-center shrink-0 shadow-xs">
                    {stats.answered}
                  </span>
                  <span>Answered</span>
                </div>

                {/* 2. Not Answered */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-5 bg-red-500 border border-red-600 text-white rounded-t-lg rounded-b-xs text-[9px] font-mono font-bold flex items-center justify-center shrink-0 shadow-xs">
                    {stats.notAnswered}
                  </span>
                  <span>Not Answered</span>
                </div>

                {/* 3. Marked for Review */}
                <div className="flex items-center gap-2">
                  <span className="w-6 h-5 bg-indigo-600 border border-indigo-700 text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center shrink-0 shadow-xs">
                    {stats.markedForReview}
                  </span>
                  <span>Marked Review</span>
                </div>

                {/* 4. Answered and Marked for Review */}
                <div className="flex items-center gap-2" title="These questions will be evaluated for scoring">
                  <span className="w-6 h-5 bg-indigo-600 border border-indigo-700 text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center shrink-0 shadow-xs relative after:content-[''] after:absolute after:-bottom-0.5 after:-right-0.5 after:w-2 after:h-2 after:bg-emerald-500 after:rounded-full">
                    {stats.answeredAndMarked}
                  </span>
                  <span className="leading-tight text-[9px]">Answered & Review</span>
                </div>

                {/* 5. Not Visited */}
                <div className="flex items-center gap-2 col-span-2 border-t border-slate-100 pt-1.5 mt-1">
                  <span className="w-6 h-5 bg-white border border-slate-300 text-slate-600 rounded text-[9px] font-mono font-bold flex items-center justify-center shrink-0 shadow-xs">
                    {stats.notVisited}
                  </span>
                  <span>Not Visited</span>
                </div>
              </div>
            </div>

            {/* Dynamic Interactive Palette Grid */}
            <div className="bg-white border border-slate-200 p-3 rounded-md space-y-2.5 lg:flex-1 flex flex-col lg:overflow-hidden overflow-visible">
              <div className="flex items-center justify-between shrink-0">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Question Palette</h5>
                <span className="text-[9px] text-slate-400 font-mono font-semibold">Click to Jump</span>
              </div>
              
              <div className="grid grid-cols-5 gap-1.5 overflow-y-auto pr-0.5 flex-1 max-h-[160px] lg:max-h-none">
                {session.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => jumpToQuestion(idx)}
                    className={getPaletteStyle(q.id, idx)}
                    title={`Jump directly to question ${idx + 1}`}
                  >
                    {(idx + 1).toString().padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* Submission triggers */}
            <div className="pt-2 shrink-0">
              <button
                type="button"
                onClick={() => { setShowSubmitConfirm(true); playSynthesizedSound(500, 0.15); }}
                className="w-full bg-slate-800 hover:bg-slate-900 border-b-4 border-slate-950 text-white font-extrabold text-xs py-3.5 px-4 rounded flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm uppercase tracking-wider"
                id="submit-exam-btn"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Submit Test Paper
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* CBT POPUP MODAL (Focus Loss / Focus Switching Warns) */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full border-t-8 border-red-600 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <ShieldAlert className="w-8 h-8 shrink-0 animate-bounce" />
              <div>
                <h3 className="font-sans font-black text-lg text-slate-900 leading-none">Security Alert</h3>
                <p className="text-[10px] text-red-500 uppercase font-black tracking-widest mt-1">CBT Anti-Cheat Mechanism Activated</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed font-semibold">
              <p className="text-slate-800 font-bold">You toggled focus away from the online test window.</p>
              <p>Standard exam regulations prohibit closing the fullscreen focus or switching tabs/applications. All window shifts are logged for final grading audits.</p>
              <p className="text-xs text-red-600 font-extrabold bg-red-50 p-3 rounded border border-red-100 font-mono text-center">
                WARNING COUNT REGISTERED: {tabFocusWarnings}
              </p>
            </div>

            <button
              onClick={() => { setShowWarningModal(false); playSynthesizedSound(800, 0.05); }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs py-3 rounded transition-all cursor-pointer uppercase tracking-wider"
            >
              Understand & Return to Exam
            </button>
          </div>
        </div>
      )}

      {/* CBT PALETTE EXPLANATORY HELP MODAL */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-slate-800 border-b border-slate-100 pb-3">
              <Info className="w-6 h-6 text-blue-600 shrink-0" />
              <div>
                <h3 className="font-sans font-extrabold text-md text-slate-800 leading-none">CBT Candidate Instruction Manual</h3>
                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mt-1">Understanding Symbols and States</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p className="font-semibold text-slate-700">The question palette on the right side of the screen shows the status of each question using one of five styles:</p>
              
              <div className="space-y-2.5 bg-slate-50 p-3.5 rounded border border-slate-100">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-6 bg-white border border-slate-300 text-slate-600 text-[10px] font-mono font-bold rounded flex items-center justify-center shrink-0">01</span>
                  <div>
                    <p className="font-extrabold text-slate-800">White Box (Not Visited)</p>
                    <p className="text-[11px] text-slate-500 font-medium">You have not visited or seen this question yet.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-8 h-6 bg-red-500 border border-red-600 text-white text-[10px] font-mono font-bold rounded-t-xl rounded-b-xs flex items-center justify-center shrink-0">02</span>
                  <div>
                    <p className="font-extrabold text-slate-800">Red Box (Not Answered)</p>
                    <p className="text-[11px] text-slate-500 font-medium">You have visited this question but have not selected any option.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-8 h-6 bg-emerald-600 border border-emerald-700 text-white text-[10px] font-mono font-bold rounded-t-xs rounded-b-xl flex items-center justify-center shrink-0">03</span>
                  <div>
                    <p className="font-extrabold text-slate-800">Green Box (Answered)</p>
                    <p className="text-[11px] text-slate-500 font-medium">You have selected an option and saved the response. This is ready for scoring.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-8 h-6 bg-indigo-600 border border-indigo-700 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center shrink-0">04</span>
                  <div>
                    <p className="font-extrabold text-slate-800">Purple Circle (Marked for Review)</p>
                    <p className="text-[11px] text-slate-500 font-medium">You have flagged this question for review without selecting any option.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-8 h-6 bg-indigo-600 border border-indigo-700 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center shrink-0 relative after:content-[''] after:absolute after:-bottom-0.5 after:-right-0.5 after:w-2.5 after:after:h-2.5 after:bg-emerald-500 after:rounded-full">05</span>
                  <div>
                    <p className="font-extrabold text-slate-800">Purple Circle with Green Indicator (Answered & Marked for Review)</p>
                    <p className="text-[11px] text-slate-500 font-medium">You have answered the question but kept it flagged for review. This response WILL be evaluated for scoring if not modified.</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-medium leading-normal">Tip: You can change your chosen option any time by clicking "Clear Response" or simply selecting another card. Always click "Save & Next" to lock in your final option choice.</p>
            </div>

            <button
              onClick={() => { setShowHelpModal(false); playSynthesizedSound(800, 0.05); }}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs py-3 rounded transition-all cursor-pointer uppercase tracking-wider shadow-sm"
            >
              Close Manual
            </button>
          </div>
        </div>
      )}

      {/* FINAL SUBMIT CONFIRMATION MODAL */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg max-w-md w-full border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-8 h-8 shrink-0 text-amber-500 animate-pulse" />
              <div>
                <h3 className="font-sans font-black text-lg text-slate-800 leading-none">Confirm Submission</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">End Exam Session</p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p className="font-bold text-slate-700">Are you sure you want to finalize and lock in your CBT answers?</p>
              
              <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs space-y-1.5 font-mono font-bold">
                <div className="flex justify-between text-slate-600">
                  <span>Total Questions:</span> 
                  <span>{totalQuestions}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Answered Responses:</span> 
                  <span>{stats.answered + stats.answeredAndMarked}</span>
                </div>
                <div className="flex justify-between text-indigo-600">
                  <span>Marked for Review:</span> 
                  <span>{stats.markedForReview}</span>
                </div>
                <div className="flex justify-between text-red-500 border-t border-slate-200 pt-1.5 mt-1">
                  <span>Not Visited / Empty:</span> 
                  <span>{stats.notVisited + stats.notAnswered}</span>
                </div>
              </div>
              
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">Once submitted, your practice session will complete, and you will proceed instantly to the performance analysis board with detailed correct/incorrect statistics.</p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => { setShowSubmitConfirm(false); playSynthesizedSound(750, 0.04); }}
                className="flex-1 py-2.5 text-xs font-bold border border-slate-300 rounded text-slate-600 hover:bg-slate-50 transition-all cursor-pointer uppercase tracking-wider shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSubmitConfirm(false); playCBTChime('submit'); onSubmitExam(); }}
                className="flex-1 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 text-white rounded transition-all cursor-pointer uppercase tracking-widest shadow-sm font-black"
                id="confirm-submit-btn"
              >
                Submit & Grade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

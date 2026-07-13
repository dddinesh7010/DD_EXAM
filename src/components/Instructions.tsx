import React, { useState } from 'react';
import { ShieldCheck, Clock, BookOpen, AlertTriangle, ArrowRight, CornerDownRight, Maximize2, Minimize2 } from 'lucide-react';
import { Question, ExamSettings } from '../types';

interface InstructionsProps {
  title: string;
  questions: Question[];
  timeLimit: number; // seconds
  settings: ExamSettings;
  onAgreeAndStart: () => void;
  onCancel: () => void;
}

export default function Instructions({ title, questions, timeLimit, settings, onAgreeAndStart, onCancel }: InstructionsProps) {
  const [hasAgreed, setHasAgreed] = useState(false);
  const [launchInFullscreen, setLaunchInFullscreen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  // Sync fullscreen state
  React.useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const handleToggleFs = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request rejected', err);
        });
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    } catch (e) {
      console.warn('Fullscreen API error', e);
    }
  };

  const handleStartExamClick = () => {
    if (launchInFullscreen && !document.fullscreenElement) {
      try {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Fullscreen request on launch was rejected/blocked', err);
        });
      } catch (e) {
        console.warn('Fullscreen request failed on launch', e);
      }
    }
    onAgreeAndStart();
  };

  const durationMins = Math.floor(timeLimit / 60);

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" id="instructions-container">
      {/* Header Banner - Clean Minimalism Style */}
      <div className="bg-white p-6 border-b border-gray-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-blue-700 font-mono tracking-widest uppercase font-bold">CBT Examination Protocol Gateway</span>
            <h1 className="text-xl font-extrabold mt-1 text-gray-900 uppercase tracking-wide">{title}</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-8 space-y-6">
        {/* Test Parameters Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Questions</p>
            <div className="flex items-center justify-center gap-1.5 text-gray-800">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-lg font-extrabold">{questions.length}</span>
            </div>
          </div>

          <div className="space-y-1 border-y sm:border-y-0 sm:border-x border-gray-200 py-3 sm:py-0">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Time Allowed</p>
            <div className="flex items-center justify-center gap-1.5 text-gray-800">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-lg font-extrabold">{durationMins} minutes</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Marking Scheme</p>
            <div className="flex flex-col items-center justify-center text-gray-800 text-sm">
              <span className="font-extrabold text-emerald-600">+{settings.positiveMarking} per Correct</span>
              {settings.negativeMarking > 0 ? (
                <span className="text-red-500 font-bold text-xs font-mono">-{settings.negativeMarking} Negative Mark</span>
              ) : (
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wider text-[10px]">No Negative Marking</span>
              )}
            </div>
          </div>
        </div>

        {/* Instructions Body */}
        <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
          <h2 className="font-sans font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-2">
            General Candidate Guidelines
          </h2>

          <div className="space-y-3.5 pl-2 border-l-2 border-gray-200">
            <div className="flex items-start gap-2">
              <CornerDownRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p>The countdown timer on the top-right corner of the screen will display the remaining time available for you to complete the examination.</p>
            </div>

            <div className="flex items-start gap-2">
              <CornerDownRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p>When the timer reaches zero, the system will **automatically submit** your answers and close the exam panel immediately. Unsaved changes will be logged automatically.</p>
            </div>

            <div className="flex items-start gap-2">
              <CornerDownRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p>You can toggle the language of individual questions between **English** and **Tamil** at any time during the test.</p>
            </div>

            <div className="flex items-start gap-2">
              <CornerDownRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p>The interactive **Question Palette** on the right side of the screen will indicate the status of each question using color codes:</p>
            </div>

            {/* Color Palette Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-6 py-3 bg-slate-50 border border-slate-150 rounded-lg">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-5.5 bg-white border border-slate-300 text-slate-700 text-[10px] font-mono font-bold rounded flex items-center justify-center shadow-xs">01</span>
                <span className="text-xs font-bold text-slate-700">Not Visited</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-5.5 bg-red-500 border border-red-600 text-white text-[10px] font-mono font-bold rounded-t-xl rounded-b-xs flex items-center justify-center shadow-xs">02</span>
                <span className="text-xs font-bold text-slate-700">Not Answered</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-5.5 bg-emerald-600 border border-emerald-700 text-white text-[10px] font-mono font-bold rounded-t-xs rounded-b-xl flex items-center justify-center shadow-xs">03</span>
                <span className="text-xs font-bold text-slate-700">Answered</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-5.5 bg-indigo-600 border border-indigo-700 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center shadow-xs">04</span>
                <span className="text-xs font-bold text-slate-700">Marked Review</span>
              </div>
              <div className="flex items-center gap-2.5 col-span-1 md:col-span-2">
                <span className="w-7 h-5.5 bg-indigo-600 border border-indigo-700 text-white text-[10px] font-mono font-bold rounded-full flex items-center justify-center shadow-xs relative after:content-[''] after:absolute after:-bottom-0.5 after:-right-0.5 after:w-2 after:after:h-2 after:bg-emerald-500 after:rounded-full">05</span>
                <span className="text-xs font-bold text-slate-700">Answered & Marked for Review</span>
              </div>
            </div>

            {settings.warnOnTabLeave && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-amber-800 text-xs mt-3">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold uppercase tracking-wider text-[10px]">Anti-Cheating Tracking Protocol Enabled</p>
                  <p>Attempting to switch browser tabs, minimize window, or leave the full-screen mode will trigger a system warning event. Multiple violations may lock the test console.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secure CBT Proctoring Environment Settings */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-xs font-black uppercase text-blue-900 tracking-wider">
                Proctoring & Display Environment
              </h3>
            </div>
            <button
              type="button"
              onClick={handleToggleFs}
              className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 rounded shadow-xs cursor-pointer flex items-center gap-1 transition-all"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  Enter Fullscreen Now
                </>
              )}
            </button>
          </div>
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="fullscreen-toggle"
              checked={launchInFullscreen}
              onChange={(e) => setLaunchInFullscreen(e.target.checked)}
              className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="fullscreen-toggle" className="text-xs text-blue-950 font-medium cursor-pointer leading-tight">
              <span className="font-extrabold block text-blue-900">Auto-Launch Exam in Secure Fullscreen Mode</span>
              <span className="text-slate-500 font-normal text-[11px] block mt-0.5">
                Highly recommended. This maximizes coverage to prevent distractions, minimizes accidental tab exits, and secures the CBT testing environment.
              </span>
            </label>
          </div>
        </div>

        {/* Declaration Confirmation */}
        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={(e) => setHasAgreed(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
              id="agree-checkbox"
            />
            <span className="text-xs text-gray-500 leading-normal">
              I have read, understood, and agreed to all specified rules and examination instructions. I certify that I will conduct this exam with academic honesty and will not attempt to bypass security measures.
            </span>
          </label>
        </div>

        {/* Submission Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 bg-white hover:bg-gray-50 rounded-md transition-all cursor-pointer border border-gray-300 shadow-xs"
          >
            Cancel and Return
          </button>
          <button
            type="button"
            disabled={!hasAgreed}
            onClick={handleStartExamClick}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200 transition-all text-white font-bold text-xs py-2 px-5 rounded-md flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider border border-blue-600"
            id="start-exam-btn"
          >
            Start Exam
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

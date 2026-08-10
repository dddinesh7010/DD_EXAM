import React, { useState } from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface CountdownTimerProps {
  timeLeft: number;           // Remaining time in seconds
  totalDuration: number;      // Total time limit in seconds
  answeredCount?: number;     // Number of questions answered so far
  totalQuestions?: number;    // Total questions in exam
  compact?: boolean;          // Compact header mode vs expanded sidebar mode
  className?: string;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  timeLeft,
  totalDuration,
  answeredCount = 0,
  totalQuestions = 0,
  compact = true,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Time calculations
  const safeTotal = totalDuration > 0 ? totalDuration : 1;
  const timeElapsed = Math.max(0, safeTotal - timeLeft);
  const remainingPercent = Math.min(100, Math.max(0, (timeLeft / safeTotal) * 100));

  // Determine state level
  const isCritical = timeLeft <= 120; // Under 2 minutes
  const isWarning = !isCritical && timeLeft <= 300; // Under 5 minutes

  // Format HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Color classes for container and progress indicators
  const getSeverityTheme = () => {
    if (isCritical) {
      return {
        bg: 'bg-rose-950/90 border-rose-600 text-rose-100 shadow-rose-950/50',
        ringColor: '#ef4444',
        barGradient: 'from-rose-600 to-red-500',
        badgeBg: 'bg-rose-600 text-white animate-pulse',
        badgeText: 'Critical Low Time!',
        icon: <AlertCircle className="w-4 h-4 text-rose-400 animate-bounce" />,
        statusBorder: 'border-rose-500'
      };
    }
    if (isWarning) {
      return {
        bg: 'bg-amber-950/90 border-amber-500 text-amber-100 shadow-amber-950/50',
        ringColor: '#f59e0b',
        barGradient: 'from-amber-500 to-yellow-400',
        badgeBg: 'bg-amber-500 text-slate-950 font-black',
        badgeText: '5 Mins Remaining',
        icon: <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />,
        statusBorder: 'border-amber-500'
      };
    }
    return {
      bg: 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-slate-950/40',
      ringColor: '#3b82f6',
      barGradient: 'from-blue-600 to-cyan-400',
      badgeBg: 'bg-blue-600/30 text-blue-300 border border-blue-500/40',
      badgeText: 'Time Normal',
      icon: <Clock className="w-4 h-4 text-blue-400 animate-spin" style={{ animationDuration: '8s' }} />,
      statusBorder: 'border-slate-700'
    };
  };

  const theme = getSeverityTheme();

  // SVG Circular Progress Calculations
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (remainingPercent / 100) * circumference;

  // Pace metric calculation
  const avgTimePerAnswer = answeredCount > 0 ? Math.round(timeElapsed / answeredCount) : 0;

  return (
    <div className={`relative inline-block ${className}`} id="visual-countdown-timer">
      {compact ? (
        /* COMPACT HEADER MODE */
        <div className="flex items-center gap-2">
          <div
            onClick={() => setShowDetails(!showDetails)}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border shadow-sm transition-all cursor-pointer select-none hover:brightness-110 ${theme.bg} ${isCritical ? 'animate-timer-critical' : isWarning ? 'animate-timer-warn' : ''}`}
            title="Click to view detailed exam duration analytics"
          >
            {/* SVG Circular Ring */}
            <div className="relative w-7 h-7 flex items-center justify-center shrink-0">
              <svg className="w-7 h-7 transform -rotate-90">
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-slate-700/60"
                  fill="transparent"
                />
                <circle
                  cx="14"
                  cy="14"
                  r={radius}
                  stroke={theme.ringColor}
                  strokeWidth="3"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                {theme.icon}
              </div>
            </div>

            {/* Time Text */}
            <div className="flex flex-col">
              <span className="text-xs uppercase font-mono font-bold tracking-wider opacity-75 leading-none">
                Time Left
              </span>
              <span className="text-sm font-mono font-black tracking-widest leading-tight">
                {formatTime(timeLeft)}
              </span>
            </div>

            {/* Quick Status Badge */}
            <span className={`hidden sm:inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${theme.badgeBg}`}>
              {Math.round(remainingPercent)}%
            </span>

            <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </div>
        </div>
      ) : (
        /* EXPANDED SIDEBAR / CARD MODE */
        <div className={`p-4 rounded-xl border bg-slate-900 text-white space-y-3.5 shadow-md ${theme.statusBorder} ${isCritical ? 'animate-timer-critical' : isWarning ? 'animate-timer-warn' : ''}`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              {theme.icon}
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Session Timer
              </span>
            </div>
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${theme.badgeBg}`}>
              {theme.badgeText}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-mono font-black tracking-widest text-white">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs font-mono font-bold text-slate-400">
              {Math.round(remainingPercent)}% remaining
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1">
            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${theme.barGradient} transition-all duration-500`}
                style={{ width: `${remainingPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
              <span>Elapsed: {formatTime(timeElapsed)}</span>
              <span>Total: {formatTime(safeTotal)}</span>
            </div>
          </div>

          {/* Pace & Answer Stats */}
          {totalQuestions > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-xs">
              <div className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Answered</span>
                <span className="font-bold text-white font-mono">{answeredCount} / {totalQuestions}</span>
              </div>
              <div className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Avg Speed</span>
                <span className="font-bold text-white font-mono">{avgTimePerAnswer > 0 ? `${avgTimePerAnswer}s / Q` : 'N/A'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAILED STATS POPOVER MODAL */}
      {showDetails && compact && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-700 text-white rounded-xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3 font-sans text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span className="font-bold text-sm text-slate-100">Exam Duration Tracker</span>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="text-slate-400 hover:text-white font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Alert Status Banner */}
          <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
            isCritical 
              ? 'bg-rose-950/80 border-rose-600 text-rose-200'
              : isWarning
              ? 'bg-amber-950/80 border-amber-500 text-amber-200'
              : 'bg-blue-950/60 border-blue-800 text-blue-200'
          }`}>
            {theme.icon}
            <div>
              <p className="font-bold text-[11px] uppercase tracking-wide">{theme.badgeText}</p>
              <p className="text-[10px] opacity-90">
                {isCritical
                  ? 'High urgency! Review unanswered questions and submit before auto-timer expires.'
                  : isWarning
                  ? 'Final 5 minutes. Chime alerts will notify you at key minute intervals.'
                  : 'Sufficient time available. Maintain a steady solving pace.'}
              </p>
            </div>
          </div>

          {/* Time Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
            <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60">
              <span className="text-[9px] uppercase text-slate-400 block font-sans">Time Remaining</span>
              <span className="text-sm font-bold text-white">{formatTime(timeLeft)}</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60">
              <span className="text-[9px] uppercase text-slate-400 block font-sans">Time Elapsed</span>
              <span className="text-sm font-bold text-slate-200">{formatTime(timeElapsed)}</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60">
              <span className="text-[9px] uppercase text-slate-400 block font-sans">Total Allocated</span>
              <span className="text-sm font-bold text-slate-200">{formatTime(safeTotal)}</span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded border border-slate-700/60">
              <span className="text-[9px] uppercase text-slate-400 block font-sans">Time Used</span>
              <span className="text-sm font-bold text-cyan-400">{Math.round(100 - remainingPercent)}%</span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0%</span>
              <span className="text-white font-bold">{Math.round(remainingPercent)}% Remaining</span>
              <span>100%</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div
                className={`h-full bg-gradient-to-r ${theme.barGradient} transition-all duration-500`}
                style={{ width: `${remainingPercent}%` }}
              />
            </div>
          </div>

          {/* Question Pace metric */}
          {totalQuestions > 0 && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                <span>Answering Pace:</span>
              </div>
              <span className="font-mono font-bold text-white">
                {avgTimePerAnswer > 0 ? `${avgTimePerAnswer}s / question` : 'Calculating...'}
              </span>
            </div>
          )}

          <div className="text-[9px] text-slate-400 italic text-center pt-1 border-t border-slate-800/60">
            Auto-submits session when countdown reaches 00:00.
          </div>
        </div>
      )}
    </div>
  );
};

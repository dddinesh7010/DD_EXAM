import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, AlertCircle, Clock, BookOpen, BarChart3, ChevronDown, ChevronUp, ArrowLeft, RefreshCw, Eye, EyeOff, Printer, Settings } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import { ExamHistoryLog, Question, MCQQuestion } from '../types';
import { getQuestionEnText, getQuestionTaText, getMCQOptionsEn, getMCQOptionsTa, isMCQQuestion, isMatchQuestion, isPassageQuestion } from '../utils/questionHelpers';

interface ResultAnalyticsProps {
  log: ExamHistoryLog;
  onReturnToDashboard: () => void;
  onRetakeExam: (questions: Question[], title: string) => void;
}

export default function ResultAnalytics({ log, onReturnToDashboard, onRetakeExam }: ResultAnalyticsProps) {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [activeReviewLang, setActiveReviewLang] = useState<'English' | 'Tamil'>('English');
  const [showOnlyQuestions, setShowOnlyQuestions] = useState(false);

  // Custom states for report customization
  const [candidateName, setCandidateName] = useState(log.username || log.userId || 'Candidate');
  const [institutionName, setInstitutionName] = useState('Self-Administered CBT Portal');
  const [showReportConfig, setShowReportConfig] = useState(false);

  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Browser printing API error', e);
    }
  };

  const toggleQuestionExpand = (qId: string) => {
    setExpandedQuestionId(expandedQuestionId === qId ? null : qId);
  };

  const scoreColorClass = () => {
    if (log.accuracy >= 75) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (log.accuracy >= 50) return 'text-blue-600 bg-blue-50 border-blue-100';
    return 'text-rose-600 bg-rose-50 border-rose-100';
  };

  const getAccuracyStatusText = () => {
    if (log.accuracy >= 90) return 'Outstanding Achievement';
    if (log.accuracy >= 75) return 'Excellent Work';
    if (log.accuracy >= 50) return 'Good Practice. Needs Focus';
    return 'Re-study Recommended';
  };

  // Convert time to human readable format
  const formatTimeSpent = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} seconds`;
    return `${mins}m ${secs}s`;
  };

  // Prepare chart data for Topic breakdown
  const topicChartData = log.topicStats.map(stat => ({
    name: stat.topic,
    Accuracy: Math.round((stat.correct / stat.total) * 100),
    Correct: stat.correct,
    Total: stat.total
  }));

  // Prepare chart data for overall category responses
  const categoryData = [
    { name: 'Correct', value: log.correctCount, color: '#10b981' },
    { name: 'Incorrect', value: log.incorrectCount, color: '#ef4444' },
    { name: 'Unanswered', value: log.totalQuestions - log.answeredCount, color: '#94a3b8' }
  ].filter(item => item.value > 0);

  const handleRetake = () => {
    onRetakeExam(log.questions, log.title);
  };

  return (
    <div className="space-y-8" id="result-analytics-root">
      {/* Top Banner Navigation (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-5 print:hidden">
        <button
          onClick={onReturnToDashboard}
          className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-gray-800 transition-colors cursor-pointer inline-flex items-center gap-1.5"
          id="back-to-dashboard-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Practice Dashboard
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Settings Customizer */}
          <button
            onClick={() => setShowReportConfig(!showReportConfig)}
            className={`transition-all font-bold text-xs py-2 px-3.5 rounded-md inline-flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider border ${
              showReportConfig 
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300' 
                : 'bg-white hover:bg-gray-50 text-gray-650 border-gray-200'
            }`}
            id="configure-report-btn"
            title="Configure examinee or exam center metadata before PDF export"
          >
            <Settings className="w-4 h-4 shrink-0" />
            Report Customizer
          </button>

          {/* Printable PDF Trigger */}
          <button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 border border-emerald-600 transition-all text-white font-bold text-xs py-2 px-4 rounded-md inline-flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider"
            id="print-pdf-report-btn"
            title="Download, save or print your exam report as a PDF"
          >
            <Printer className="w-4 h-4 shrink-0" />
            Print / Save PDF
          </button>

          <button
            onClick={handleRetake}
            className="bg-blue-600 hover:bg-blue-700 border border-blue-600 transition-all text-white font-bold text-xs py-2 px-4 rounded-md inline-flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider"
            id="retake-exam-btn"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            Retake Examination
          </button>
        </div>
      </div>

      {/* Expandable Configuration Inputs */}
      {showReportConfig && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs animate-fade-in print:hidden">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-amber-600 shrink-0" />
              Customize PDF Report Headers
            </h4>
            <button
              onClick={() => setShowReportConfig(false)}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase cursor-pointer"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="cand-name-input">
                Examinee / Candidate Name
              </label>
              <input
                id="cand-name-input"
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-blue-500 outline-hidden"
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider" htmlFor="inst-name-input">
                Host Center / Assessment Authority
              </label>
              <input
                id="inst-name-input"
                type="text"
                value={institutionName}
                onChange={(e) => setInstitutionName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-blue-500 outline-hidden"
                placeholder="e.g., CBT Testing Academy"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">
            * Changes here will automatically override header fields on the generated PDF document. All graphical indicators and question keys will render live.
          </p>
        </div>
      )}

      {/* SCREEN VIEW (Completely hidden when printing) */}
      <div className="print:hidden space-y-8">
        {/* Main Grading Scorecard Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Visual Grade Section */}
        <div className={`p-8 text-center border-b md:border-b-0 md:border-r border-gray-200 md:col-span-4 flex flex-col justify-center items-center space-y-4 ${scoreColorClass()}`}>
          <div className="w-20 h-20 bg-white/80 rounded-full border border-gray-200 shadow-xs flex items-center justify-center text-gray-800">
            <Award className="w-10 h-10 text-gray-800 shrink-0" />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tight font-sans leading-none">{log.score}%</h1>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 mt-2">Final Score Grade</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-700">{getAccuracyStatusText()}</p>
            <p className="text-[11px] font-mono font-bold text-gray-400">{log.date}</p>
          </div>
        </div>

        {/* Right Metric Details Section */}
        <div className="p-8 md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1" id="stat-total-qs">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Questions</p>
            <div className="flex items-center gap-1.5 text-gray-800 pt-0.5">
              <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="text-xl font-bold font-sans">{log.totalQuestions}</span>
            </div>
          </div>

          <div className="space-y-1 text-emerald-600" id="stat-correct">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Correct</p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="text-xl font-bold font-sans">{log.correctCount}</span>
            </div>
          </div>

          <div className="space-y-1 text-rose-500" id="stat-incorrect">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Incorrect</p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <XCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span className="text-xl font-bold font-sans">{log.incorrectCount}</span>
            </div>
          </div>

          <div className="space-y-1 text-gray-600" id="stat-time">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Time Spent</p>
            <div className="flex items-center gap-1.5 text-gray-800 pt-0.5">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-lg font-bold font-sans">{formatTimeSpent(log.totalTimeSpent)}</span>
            </div>
          </div>

          <div className="space-y-1 col-span-2 border-t border-gray-200 pt-4" id="stat-avg-time">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Time Per Question</p>
            <p className="text-sm font-bold text-gray-700 font-sans pt-0.5">
              {formatTimeSpent(Math.round(log.totalTimeSpent / log.totalQuestions))}
            </p>
          </div>

          <div className="space-y-1 col-span-2 border-t border-gray-200 pt-4" id="stat-accuracy">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Response Accuracy</p>
            <p className="text-sm font-bold text-gray-700 font-sans pt-0.5">
              {log.accuracy}% of answers answered correctly
            </p>
          </div>
        </div>
      </div>

      {/* Recharts Analytics Displays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="charts-panel">
        {/* Chart A: Topic-wise Performance breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h3 className="font-sans font-bold text-gray-800 text-xs uppercase tracking-wider">Topic Performance Accuracy (%)</h3>
          </div>
          {topicChartData.length === 0 ? (
            <p className="text-xs text-gray-450 text-center py-10 font-bold">No categorical metadata available for topics.</p>
          ) : (
            <div className="h-64" id="topic-accuracy-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', color: '#f8fafc', fontSize: '11px', fontWeight: 'bold' }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value) => [`${value}% Accuracy`]}
                  />
                  <Bar dataKey="Accuracy" radius={[3, 3, 0, 0]}>
                    {topicChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.Accuracy >= 75 ? '#10b981' : entry.Accuracy >= 50 ? '#3b82f6' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart B: Category Allocation Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-150 pb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="font-sans font-bold text-gray-800 text-xs uppercase tracking-wider">Response Distribution Ratio</h3>
          </div>
          {categoryData.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">No answer logs detected.</p>
          ) : (
            <div className="h-64 flex items-center justify-between" id="distribution-ratio-chart">
              <div className="w-3/5 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} questions`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-2/5 space-y-2">
                {categoryData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-650">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                    <span className="text-gray-500">{item.name}:</span>
                    <span className="text-gray-800 ml-auto">{item.value} Qs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GRANULAR REVIEW OF QUESTIONS AND BILINGUAL ANNOTATIONS */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 space-y-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-150 pb-3.5">
          <div className="space-y-1">
            <h3 className="font-sans font-bold text-gray-800 text-base uppercase tracking-wider">Bilingual Question-by-Question Review</h3>
            <p className="text-xs text-gray-400 font-medium">Click on any question row to view option audits and Tamil translations.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Show Only Questions toggle */}
            <button
              type="button"
              onClick={() => setShowOnlyQuestions(!showOnlyQuestions)}
              className={`px-3 py-1.5 text-xs rounded-md font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                showOnlyQuestions
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              title="Toggle to show only question and multiple-choice options"
              id="review-show-only-questions"
            >
              {showOnlyQuestions ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showOnlyQuestions ? "Questions & Options Only" : "Show Only Questions & Options"}</span>
            </button>

            {/* Bilingual Selector for review explanations */}
            <div className="flex items-center bg-gray-100 border border-gray-200 rounded-md p-0.5">
              <button
                onClick={() => setActiveReviewLang('English')}
                className={`px-3 py-1 text-xs rounded-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeReviewLang === 'English' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                English Explanations
              </button>
              <button
                onClick={() => setActiveReviewLang('Tamil')}
                className={`px-3 py-1 text-xs rounded-sm font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeReviewLang === 'Tamil' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                தமிழ் விளக்கங்கள்
              </button>
            </div>
          </div>
        </div>

        {/* Question Review Rows */}
        <div className="space-y-4" id="review-rows-container">
          {log.questions.map((q, idx) => {
            const userAnswerIdx = log.answers[q.id];
            const correctIdx = 'correctOptionIndex' in q ? (q as any).correctOptionIndex : undefined;
            const isCorrect = correctIdx !== undefined ? userAnswerIdx === correctIdx : true;
            const isSkipped = userAnswerIdx === undefined || userAnswerIdx === -1;
            const isExpanded = expandedQuestionId === q.id;
            const qEn = getQuestionEnText(q);
            const qTa = getQuestionTaText(q);
            const optionsEn = isMCQQuestion(q) ? getMCQOptionsEn(q) : [];
            const optionsTa = isMCQQuestion(q) ? getMCQOptionsTa(q) : [];

            return (
              <div
                key={q.id}
                className={`border rounded-lg overflow-hidden transition-all ${
                  isExpanded && !showOnlyQuestions ? 'border-gray-400 bg-white shadow-xs' : 'border-gray-200 hover:bg-gray-50/30'
                }`}
              >
                {/* Expand Header */}
                <div
                  onClick={() => !showOnlyQuestions && toggleQuestionExpand(q.id)}
                  className={`p-4 flex items-center justify-between gap-4 select-none ${showOnlyQuestions ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start gap-3 max-w-[85%]">
                    {isSkipped ? (
                      <AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    ) : isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 leading-normal">
                        Question {idx + 1}: {activeReviewLang === 'English' ? qEn : (qTa || qEn)}
                      </h4>
                    </div>
                  </div>

                  {!showOnlyQuestions && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-sm ${
                        isSkipped
                          ? 'bg-gray-100 text-gray-600 border border-gray-200'
                          : isCorrect
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isSkipped ? 'Skipped' : isCorrect ? 'Correct' : 'Wrong'}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  )}
                </div>

                {/* Options list for "Question & Options Only" mode */}
                {showOnlyQuestions && optionsEn.length > 0 && (
                  <div className="p-4 pt-0 border-t-0 bg-white/50 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                      {optionsEn.map((option, oIdx) => {
                        const optionTamil = optionsTa[oIdx];
                        const isOptionCorrect = oIdx === correctIdx;
                        const isOptionSelected = oIdx === userAnswerIdx;
                        
                        let cardStyle = 'border-slate-200 bg-slate-50/50 text-slate-700';
                        if (isOptionCorrect) {
                          cardStyle = 'border-emerald-400 bg-emerald-50/30 text-emerald-950 font-bold';
                        } else if (isOptionSelected) {
                          cardStyle = 'border-rose-400 bg-rose-50/20 text-rose-950 font-bold';
                        }
                        
                        return (
                          <div key={oIdx} className={`p-2.5 rounded-lg text-xs border flex items-center gap-2.5 ${cardStyle}`}>
                            <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-mono font-bold ${
                              isOptionCorrect
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : isOptionSelected
                                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                                : 'bg-white text-slate-400 border-slate-300'
                            }`}>
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <span className="truncate leading-tight">
                              {activeReviewLang === 'English' ? option : (optionTamil || option)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expanded Details Body */}
                {isExpanded && !showOnlyQuestions && (
                  <div className="p-5 bg-gray-50/50 border-t border-gray-200 space-y-4 text-sm">
                    {/* Options Audit Table */}
                    {optionsEn.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Options Audit</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {optionsEn.map((option, oIdx) => {
                            const isOptionCorrect = oIdx === correctIdx;
                            const isOptionSelected = oIdx === userAnswerIdx;
                            const optionTamil = optionsTa[oIdx];

                            let cardBorder = 'border-gray-200 bg-white text-gray-600';
                            if (isOptionCorrect) {
                              cardBorder = 'border-emerald-500 bg-emerald-50/20 text-emerald-950 ring-1 ring-emerald-500 border-2';
                            } else if (isOptionSelected) {
                              cardBorder = 'border-rose-400 bg-rose-50/20 text-rose-950 ring-1 ring-rose-400 border-2';
                            }

                            return (
                              <div key={oIdx} className={`p-3.5 rounded-lg text-xs flex items-start gap-2.5 transition-all ${cardBorder}`}>
                                <span className={`w-5.5 h-5.5 rounded-full flex items-center justify-center shrink-0 border font-mono font-bold ${
                                  isOptionCorrect
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : isOptionSelected
                                    ? 'bg-rose-500 text-white border-rose-500'
                                    : 'bg-gray-100 text-gray-400 border-gray-300'
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <div className="space-y-1">
                                  <p className="font-bold text-gray-850">
                                    {activeReviewLang === 'English' ? option : (optionTamil || option)}
                                  </p>
                                  <div className="flex gap-1.5 pt-0.5">
                                    {isOptionCorrect && <span className="text-[9px] font-bold text-emerald-700 uppercase bg-emerald-100/60 px-1 rounded-sm">Correct Choice</span>}
                                    {isOptionSelected && <span className="text-[9px] font-bold text-gray-500 uppercase bg-gray-200/60 px-1 rounded-sm">Your Selection</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Explanations Display */}
                    <div className="bg-white border border-gray-200 rounded-md p-4 space-y-2">
                      <div className="flex items-center gap-1.5 border-b border-gray-150 pb-2">
                        <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
                        <h5 className="font-bold text-[10px] text-gray-400 uppercase tracking-wider">Syllabus Explanation Notes</h5>
                      </div>

                      {activeReviewLang === 'English' ? (
                        <div className="space-y-1 leading-relaxed text-gray-650 font-medium">
                          <p>{(q as any).explanation_en || (q as any).explanation || 'No explanation provided.'}</p>
                        </div>
                      ) : (
                        <div className="space-y-1 leading-relaxed text-gray-650 font-medium">
                          <p>{(q as any).explanation_ta || (q as any).tamilExplanation || (q as any).explanation || 'விளக்கம் வழங்கப்படவில்லை.'}</p>
                        </div>
                      )}
                    </div>

                    {/* Tags Display */}
                    <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-bold text-gray-450 uppercase tracking-widest">
                      <span>Category: <strong className="text-gray-700 font-bold">{q.topic}</strong></span>
                      <span>•</span>
                      <span>Difficulty Audit: <strong className="text-gray-700 font-bold">{q.difficulty}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>

      {/* ============================================================== */}
      {/* PRINT-ONLY ASSESSMENT REPORT TEMPLATE (Visible during print)   */}
      {/* ============================================================== */}
      <div className="hidden print:block print-exact bg-white text-black p-2 w-full font-sans">
        
        {/* Header Block */}
        <div className="border-b-4 border-double border-slate-800 pb-4 mb-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase">Computer-Based Testing Environment</p>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">EXAMINATION PERFORMANCE AUDIT REPORT</h1>
            </div>
            <div className="text-right">
              <span className="inline-block bg-slate-900 text-white font-mono text-[9px] font-black px-2 py-0.5 rounded">
                OFFICIAL RECORD
              </span>
            </div>
          </div>
        </div>

        {/* Metadata Details table */}
        <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs mb-6 border-b border-slate-200 pb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Candidate Examinee</span>
            <span className="text-sm font-extrabold text-slate-900">{candidateName}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Examination Date</span>
            <span className="text-sm font-extrabold text-slate-900">{log.date}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Test/CBT Title</span>
            <span className="text-sm font-extrabold text-slate-900">{log.title}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Assessment Authority</span>
            <span className="text-sm font-extrabold text-slate-900">{institutionName}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Verification Reference ID</span>
            <span className="text-xs font-mono font-bold text-slate-600">{log.id || `CBT-VERIFY-${Date.now().toString(36).toUpperCase()}`}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Cumulative Performance Status</span>
            <span className="text-sm font-extrabold text-slate-900">
              {log.score}% Score — <strong className="text-slate-800 uppercase font-black">{getAccuracyStatusText()}</strong>
            </span>
          </div>
        </div>

        {/* Core Stats Bento Layout */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-slate-300 rounded p-3 text-center bg-slate-50/50 print-exact">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Total Questions</span>
            <span className="text-xl font-black text-slate-900">{log.totalQuestions}</span>
          </div>
          <div className="border border-slate-300 rounded p-3 text-center bg-emerald-50/40 print-exact">
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Correct Responses</span>
            <span className="text-xl font-black text-emerald-800">{log.correctCount}</span>
          </div>
          <div className="border border-slate-300 rounded p-3 text-center bg-red-50/40 print-exact">
            <span className="text-[9px] font-black text-rose-700 uppercase tracking-wider block mb-1">Wrong Responses</span>
            <span className="text-xl font-black text-rose-800">{log.incorrectCount}</span>
          </div>
          <div className="border border-slate-300 rounded p-3 text-center bg-slate-50/50 print-exact">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">Avg Time Spent</span>
            <span className="text-sm font-extrabold text-slate-900 block mt-1.5 font-mono">
              {formatTimeSpent(Math.round(log.totalTimeSpent / log.totalQuestions))} / Q
            </span>
          </div>
        </div>

        {/* Topic Breakdown Progresses */}
        <div className="border border-slate-300 rounded-lg p-4 mb-8 print-exact bg-white">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-200 pb-1.5 mb-3.5">
            I. Syllabus Category Performance Audits
          </h3>
          <div className="space-y-4">
            {log.topicStats.map((stat, idx) => {
              const accuracy = Math.round((stat.correct / stat.total) * 100);
              let barColor = 'bg-rose-500';
              if (accuracy >= 75) barColor = 'bg-emerald-600';
              else if (accuracy >= 50) barColor = 'bg-blue-600';

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">{stat.topic}</span>
                    <span className="text-slate-900">{stat.correct} Correct of {stat.total} Total ({accuracy}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 border border-slate-200 h-2.5 rounded overflow-hidden">
                    <div 
                      className={`h-full ${barColor}`} 
                      style={{ width: `${accuracy}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Logs list */}
        <div className="space-y-5">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b-2 border-slate-800 pb-1.5 mb-2.5">
            II. Candidate Exam Script Logs (Bilingual)
          </h3>

          {log.questions.map((q, idx) => {
            const userAnswerIdx = log.answers[q.id];
            const correctIdx = 'correctOptionIndex' in q ? (q as any).correctOptionIndex : undefined;
            const isCorrect = correctIdx !== undefined ? userAnswerIdx === correctIdx : true;
            const isSkipped = userAnswerIdx === undefined || userAnswerIdx === -1;
            const qEn = getQuestionEnText(q);
            const qTa = getQuestionTaText(q);
            const optionsEn = isMCQQuestion(q) ? getMCQOptionsEn(q) : [];
            const optionsTa = isMCQQuestion(q) ? getMCQOptionsTa(q) : [];
            const expEn = (q as any).explanation_en || (q as any).explanation || 'No explanation provided.';
            const expTa = (q as any).explanation_ta || (q as any).tamilExplanation;

            return (
              <div 
                key={q.id} 
                className="border border-slate-300 rounded-lg p-4 bg-white print-avoid-break"
              >
                {/* Header question and bilingual description */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-2 mb-3">
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-slate-900 leading-tight">
                      Question {idx + 1}: {qEn}
                    </h4>
                    {qTa && (
                      <p className="text-[11px] text-slate-500 font-sans italic leading-relaxed">
                        தமிழ்: {qTa}
                      </p>
                    )}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider py-0.5 px-2.5 rounded border shrink-0 ${
                    isSkipped
                      ? 'bg-slate-100 text-slate-600 border-slate-300'
                      : isCorrect
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    {isSkipped ? 'Skipped' : isCorrect ? 'Correct' : 'Wrong'}
                  </span>
                </div>

                {/* Audit option cells */}
                {optionsEn.length > 0 && (
                  <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                    {optionsEn.map((option, oIdx) => {
                      const isOptionCorrect = oIdx === correctIdx;
                      const isOptionSelected = oIdx === userAnswerIdx;
                      const optionTamil = optionsTa[oIdx];

                      let optionBorder = 'border-slate-200 text-slate-600';
                      let flagLabel = '';
                      if (isOptionCorrect) {
                        optionBorder = 'border-emerald-600 bg-emerald-50/20 text-emerald-950 font-extrabold print-exact';
                        flagLabel = '✓ Correct';
                      } else if (isOptionSelected) {
                        optionBorder = 'border-rose-400 bg-rose-50/20 text-rose-950 font-semibold print-exact';
                        flagLabel = '✗ Selected';
                      }

                      return (
                        <div key={oIdx} className={`border p-2 rounded text-[11px] flex items-center justify-between leading-tight ${optionBorder}`}>
                          <div>
                            <span className="font-mono font-black mr-1.5">{String.fromCharCode(65 + oIdx)}.</span>
                            <span>{option}</span>
                            {optionTamil && (
                              <span className="block text-[9.5px] text-slate-450 font-normal italic">
                                ({optionTamil})
                              </span>
                            )}
                          </div>
                          {flagLabel && (
                            <span className="text-[8px] font-black uppercase tracking-widest shrink-0 ml-1.5 px-1 bg-white/80 border rounded border-slate-300">
                              {flagLabel}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Question syllabus explanation */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[10.5px] text-slate-700 leading-relaxed print-exact">
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Syllabus Assessment Explanations:
                  </span>
                  <p className="font-medium text-slate-700">{expEn}</p>
                  {expTa && (
                    <p className="mt-1.5 pt-1.5 border-t border-slate-200 italic font-sans text-slate-500 leading-normal">
                      தமிழ் விளக்கம்: {expTa}
                    </p>
                  )}
                </div>

                {/* Categories */}
                <div className="flex gap-4 mt-2.5 text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Topic Stream: <strong className="text-slate-600">{q.topic}</strong></span>
                  <span>•</span>
                  <span>Difficulty Audit: <strong className="text-slate-600">{q.difficulty}</strong></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Report Footer */}
        <div className="mt-12 pt-6 border-t-2 border-slate-800 text-[10px] text-slate-400 flex justify-between items-end print-avoid-break">
          <div>
            <p className="font-bold uppercase tracking-wider">CBT Verification Statement</p>
            <p className="leading-relaxed mt-1">
              This digital assessment record is generated automatically by the CBT examination environment.<br />
              All integrity protocols and tab tracking checks were evaluated during session runtime.
            </p>
          </div>
          <div className="text-right border-t border-slate-300 pt-6 w-48">
            <p className="text-[9px] uppercase tracking-widest text-slate-400">Authorized Signatory</p>
          </div>
        </div>

      </div>
    </div>
  );
}

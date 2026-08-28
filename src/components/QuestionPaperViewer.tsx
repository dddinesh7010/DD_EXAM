import React, { useState } from 'react';
import { QuestionPaperData, Question } from '../types';
import { MCQQuestionView } from './questionViews/MCQQuestionView';
import { MatchQuestionView } from './questionViews/MatchQuestionView';
import { PassageQuestionView } from './questionViews/PassageQuestionView';
import { CCSEIVGT_2025_PAPER } from '../data/defaultQuestions';
import { 
  FileText, 
  Code2, 
  Play, 
  Eye, 
  EyeOff, 
  Globe, 
  CheckCircle2, 
  Copy, 
  Download, 
  RotateCcw, 
  Search, 
  SlidersHorizontal,
  Award,
  Layers,
  Sparkles,
  Printer,
  Check
} from 'lucide-react';
import { isMCQQuestion, isMatchQuestion, isPassageQuestion, calculateTotalMarks, countTotalQuestions } from '../utils/questionHelpers';

interface QuestionPaperViewerProps {
  paperData?: QuestionPaperData;
  onPaperUpdate?: (newPaper: QuestionPaperData) => void;
  onStartExamFromPaper?: (paper: QuestionPaperData) => void;
}

export const QuestionPaperViewer: React.FC<QuestionPaperViewerProps> = ({
  paperData = CCSEIVGT_2025_PAPER,
  onPaperUpdate,
  onStartExamFromPaper,
}) => {
  const [activeTab, setActiveTab] = useState<'view' | 'json' | 'answers'>('view');
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'english' | 'tamil'>('bilingual');
  const [showSolutions, setShowSolutions] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'mcq' | 'match' | 'passage'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Local user interactive state for practice testing
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: any }>({});

  // JSON Editor state
  const [jsonInput, setJsonInput] = useState<string>(JSON.stringify(paperData, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleJsonChange = (val: string) => {
    setJsonInput(val);
    try {
      const parsed = JSON.parse(val);
      if (parsed && Array.isArray(parsed.questions)) {
        setJsonError(null);
        if (onPaperUpdate) {
          onPaperUpdate(parsed);
        }
      } else {
        setJsonError('JSON must contain a "questions" array.');
      }
    } catch (e: any) {
      setJsonError('Invalid JSON syntax: ' + e.message);
    }
  };

  const handleResetToDefaultPaper = () => {
    const formatted = JSON.stringify(CCSEIVGT_2025_PAPER, null, 2);
    setJsonInput(formatted);
    setJsonError(null);
    if (onPaperUpdate) {
      onPaperUpdate(CCSEIVGT_2025_PAPER);
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonInput);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonInput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${paperData.title_en.toLowerCase().replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleMCQSelect = (qId: string | number, optIdx: number) => {
    setUserAnswers((prev) => ({ ...prev, [qId]: optIdx }));
  };

  const handleMatchSelect = (matchQId: string | number, leftId: string, rightId: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [matchQId]: {
        ...(prev[matchQId] || {}),
        [leftId]: rightId,
      },
    }));
  };

  // Filter questions based on search & filter tabs
  const filteredQuestions = paperData.questions.filter((q) => {
    if (filterType === 'mcq' && !isMCQQuestion(q)) return false;
    if (filterType === 'match' && !isMatchQuestion(q)) return false;
    if (filterType === 'passage' && !isPassageQuestion(q)) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const qEn = ((q as any).question_en || (q as any).title_en || (q as any).questionText || '').toLowerCase();
      const qTa = ((q as any).question_ta || (q as any).title_ta || (q as any).questionTamilText || '').toLowerCase();
      return qEn.includes(query) || qTa.includes(query);
    }
    return true;
  });

  const totalQuestions = countTotalQuestions(paperData);
  const totalMarks = calculateTotalMarks(paperData);

  return (
    <div className="w-full space-y-6" id="question-paper-viewer-root">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-md tracking-wider uppercase inline-flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                CCSEIVGT 2025 Paper
              </span>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                TNPSC / Competitive Exam Format
              </span>
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Bilingual (English & தமிழ்)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {paperData.title_en}
            </h1>
            {paperData.title_ta && (
              <p className="text-base sm:text-lg font-bold text-slate-700 font-sans">
                {paperData.title_ta}
              </p>
            )}
          </div>

          {/* Quick Actions & Stats */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="text-center px-3 border-r border-slate-200">
                <span className="text-xs font-semibold text-slate-400 block uppercase">Questions</span>
                <span className="text-lg font-black text-slate-800">{totalQuestions}</span>
              </div>
              <div className="text-center px-3">
                <span className="text-xs font-semibold text-slate-400 block uppercase">Total Marks</span>
                <span className="text-lg font-black text-blue-600">{totalMarks}</span>
              </div>
            </div>

            {onStartExamFromPaper && (
              <button
                type="button"
                onClick={() => onStartExamFromPaper(paperData)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm px-5 py-3 rounded-xl shadow-md transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
                id="btn-launch-cbt-exam"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Launch Timed CBT Exam</span>
              </button>
            )}
          </div>
        </div>

        {/* View Tabs & Language Toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-extrabold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'view'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Question Paper View</span>
            </button>

            <button
              onClick={() => setActiveTab('json')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-extrabold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-white text-purple-700 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-4 h-4 text-purple-600" />
              <span>JSON Editor & Schema</span>
            </button>
          </div>

          {activeTab === 'view' && (
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              {/* Language Selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
                <button
                  onClick={() => setDisplayMode('bilingual')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    displayMode === 'bilingual' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Both
                </button>
                <button
                  onClick={() => setDisplayMode('english')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    displayMode === 'english' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => setDisplayMode('tamil')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    displayMode === 'tamil' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  தமிழ்
                </button>
              </div>

              {/* Show Solutions Toggle */}
              <button
                onClick={() => setShowSolutions(!showSolutions)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                  showSolutions
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {showSolutions ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                <span>{showSolutions ? 'Hide Answer Keys' : 'Show Answer Keys'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: QUESTION PAPER VIEW */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search questions in EN/TA..."
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold w-full sm:w-auto overflow-x-auto">
              <span className="text-[11px] text-slate-400 font-semibold px-2">Type:</span>
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
              >
                All ({paperData.questions.length})
              </button>
              <button
                onClick={() => setFilterType('mcq')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  filterType === 'mcq' ? 'bg-white text-blue-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
              >
                MCQ
              </button>
              <button
                onClick={() => setFilterType('match')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  filterType === 'match' ? 'bg-white text-purple-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
              >
                Match
              </button>
              <button
                onClick={() => setFilterType('passage')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  filterType === 'passage' ? 'bg-white text-indigo-700 shadow-2xs font-extrabold' : 'text-slate-600'
                }`}
              >
                Passage
              </button>
            </div>
          </div>

          {/* Question List Render */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <p className="text-slate-500 text-sm font-semibold">No questions match your filter or search criteria.</p>
              <button
                onClick={() => { setFilterType('all'); setSearchQuery(''); }}
                className="mt-3 text-xs font-bold text-blue-600 hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filteredQuestions.map((q, idx) => {
              if (isMatchQuestion(q)) {
                return (
                  <MatchQuestionView
                    key={q.id}
                    question={q}
                    index={idx}
                    displayMode={displayMode}
                    userMatchAnswer={userAnswers[q.id]}
                    onMatchChange={(leftId, rightId) => handleMatchSelect(q.id, leftId, rightId)}
                    showSolution={showSolutions}
                  />
                );
              }

              if (isPassageQuestion(q)) {
                return (
                  <PassageQuestionView
                    key={q.id}
                    passageQuestion={q}
                    index={idx}
                    displayMode={displayMode}
                    userAnswers={userAnswers}
                    onSelectSubOption={(subQId, optIdx) => handleMCQSelect(subQId, optIdx)}
                    showSolution={showSolutions}
                  />
                );
              }

              return (
                <MCQQuestionView
                  key={q.id}
                  question={q as any}
                  index={idx}
                  displayMode={displayMode}
                  userAnswer={userAnswers[q.id]}
                  onSelectOption={(optIdx) => handleMCQSelect(q.id, optIdx)}
                  showSolution={showSolutions}
                />
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: JSON EDITOR & LIVE CODE INSPECTOR */}
      {activeTab === 'json' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-600" />
                <span>Live JSON Question Paper Schema</span>
              </h3>
              <p className="text-xs text-slate-500">
                Inspect, edit, copy, or paste custom question paper JSON structures in real-time.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyJson}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copySuccess ? 'Copied!' : 'Copy JSON'}</span>
              </button>

              <button
                onClick={handleDownloadJson}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download</span>
              </button>

              <button
                onClick={handleResetToDefaultPaper}
                className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
                <span>Reload CCSEIVGT 2025</span>
              </button>
            </div>
          </div>

          {jsonError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-bold">
              {jsonError}
            </div>
          )}

          <div className="relative">
            <textarea
              value={jsonInput}
              onChange={(e) => handleJsonChange(e.target.value)}
              rows={22}
              className="w-full font-mono text-xs sm:text-sm p-4 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 leading-relaxed shadow-inner"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

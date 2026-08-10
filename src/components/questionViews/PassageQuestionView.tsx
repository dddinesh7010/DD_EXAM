import React, { useState } from 'react';
import { PassageQuestion } from '../../types';
import { MCQQuestionView } from './MCQQuestionView';
import { BookOpen, Award, Calendar, Layers, Split, Tag, Eye } from 'lucide-react';

interface PassageQuestionViewProps {
  passageQuestion: PassageQuestion;
  index: number;
  displayMode?: 'bilingual' | 'english' | 'tamil';
  userAnswers?: { [subQuestionId: string]: number };
  onSelectSubOption?: (subQuestionId: string, optionIndex: number) => void;
  showSolution?: boolean;
  isReadOnly?: boolean;
}

export const PassageQuestionView: React.FC<PassageQuestionViewProps> = ({
  passageQuestion,
  index,
  displayMode = 'bilingual',
  userAnswers = {},
  onSelectSubOption,
  showSolution = false,
  isReadOnly = false,
}) => {
  const [passageLayout, setPassageLayout] = useState<'split' | 'stacked'>(
    (passageQuestion.layout as 'split' | 'stacked') || 'split'
  );

  const subQuestions = passageQuestion.questions || [];
  const totalSubMarks = subQuestions.reduce((sum, q) => sum + (q.marks ?? 1), 0);

  return (
    <div className="bg-white rounded-2xl border border-blue-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden mb-8" id={`passage-card-${passageQuestion.id}`}>
      {/* Passage Header Bar */}
      <div className="bg-linear-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-500 text-white text-[11px] font-black px-2 py-0.5 rounded tracking-wide uppercase">
                Passage Q{index + 1}
              </span>
              <span className="text-xs text-blue-200 font-medium">
                {subQuestions.length} {subQuestions.length === 1 ? 'Sub-Question' : 'Sub-Questions'}
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-extrabold text-white leading-tight mt-0.5">
              {passageQuestion.title_en} {passageQuestion.title_ta ? `| ${passageQuestion.title_ta}` : ''}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPassageLayout(passageLayout === 'split' ? 'stacked' : 'split')}
            className="text-xs font-bold bg-white/10 hover:bg-white/20 text-blue-100 px-3 py-1.5 rounded-lg border border-white/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Toggle Split / Stacked Passage Layout"
          >
            <Split className="w-3.5 h-3.5 text-blue-300" />
            <span className="hidden sm:inline">{passageLayout === 'split' ? 'Split View' : 'Stacked View'}</span>
          </button>

          <span className="text-xs font-black text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            {totalSubMarks} Marks
          </span>
        </div>
      </div>

      {/* Main Content Layout Container */}
      <div className={passageLayout === 'split' ? 'grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-200' : 'block p-4 sm:p-6 space-y-6'}>
        {/* Left Column: Passage Box */}
        <div className={passageLayout === 'split' ? 'lg:col-span-5 p-5 bg-slate-50/80 sticky top-16 max-h-[80vh] overflow-y-auto space-y-4' : 'bg-slate-50 p-5 rounded-xl border border-slate-200/80 space-y-4'}>
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Comprehension Passage</span>
            </h4>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
              Sticky Passage
            </span>
          </div>

          <div className="space-y-4 text-slate-800">
            {(displayMode === 'english' || displayMode === 'bilingual') && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block mb-1">
                  English Passage
                </span>
                <p className="text-sm sm:text-base leading-relaxed text-slate-800 font-medium">
                  {passageQuestion.passage_en}
                </p>
              </div>
            )}

            {(displayMode === 'tamil' || displayMode === 'bilingual') && passageQuestion.passage_ta && (
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-widest block mb-1">
                  தமிழ் உரைநடை
                </span>
                <p className="text-sm sm:text-base leading-relaxed text-slate-800 font-semibold font-sans">
                  {passageQuestion.passage_ta}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sub-Questions List */}
        <div className={passageLayout === 'split' ? 'lg:col-span-7 p-5 bg-white space-y-6' : 'space-y-6'}>
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Questions Based on Above Passage
            </h4>
            <span className="text-xs text-slate-500 font-semibold">
              Select correct option for each
            </span>
          </div>

          <div className="space-y-6">
            {subQuestions.map((subQ, subIdx) => {
              const subAnswer = userAnswers[subQ.id];

              return (
                <MCQQuestionView
                  key={subQ.id}
                  question={subQ}
                  index={subIdx}
                  displayMode={displayMode}
                  userAnswer={subAnswer}
                  onSelectOption={(optIdx) => onSelectSubOption && onSelectSubOption(subQ.id, optIdx)}
                  showSolution={showSolution}
                  isReadOnly={isReadOnly}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { MatchQuestion } from '../../types';
import { Award, Calendar, CheckCircle2, ArrowRight, Tag, HelpCircle, RefreshCw } from 'lucide-react';

interface MatchQuestionViewProps {
  question: MatchQuestion;
  index: number;
  displayMode?: 'bilingual' | 'english' | 'tamil';
  userMatchAnswer?: { [leftId: string]: string }; // e.g., { "A": "3", "B": "2" }
  onMatchChange?: (leftId: string, rightId: string) => void;
  showSolution?: boolean;
  isReadOnly?: boolean;
}

export const MatchQuestionView: React.FC<MatchQuestionViewProps> = ({
  question,
  index,
  displayMode = 'bilingual',
  userMatchAnswer = {},
  onMatchChange,
  showSolution = false,
  isReadOnly = false,
}) => {
  const leftItems = question.leftItems || [];
  const rightItems = question.rightItems || [];

  // Determine if full answer is complete and correct
  const isFullyMatched = leftItems.every((item) => !!userMatchAnswer[item.id]);
  const isCorrect = leftItems.every((item) => userMatchAnswer[item.id] === question.correctAnswer[item.id]);

  const handleSelectChange = (leftId: string, rightId: string) => {
    if (onMatchChange && !isReadOnly) {
      onMatchChange(leftId, rightId);
    }
  };

  const handleResetMatches = () => {
    if (onMatchChange && !isReadOnly) {
      leftItems.forEach((item) => onMatchChange(item.id, ''));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden mb-8 p-6 sm:p-8" id={`match-card-${question.id}`}>
      {/* Header Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="bg-purple-600 text-white text-xs font-black px-3 py-1 rounded-lg tracking-wide uppercase shadow-2xs">
            Q{index + 1}
          </span>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-200">
            Match The Following
          </span>
          {question.topic && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
              <Tag className="w-3.5 h-3.5 text-purple-600" />
              {question.topic}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {question.year && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {question.year}
            </span>
          )}
          {question.difficulty && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-amber-50 text-amber-700 border-amber-200">
              {question.difficulty}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            +{question.marks ?? 2} {question.marks === 1 ? 'Mark' : 'Marks'}
          </span>
        </div>
      </div>

      {/* Question Title */}
      <div className="space-y-3 mb-6">
        {(displayMode === 'english' || displayMode === 'bilingual') && (
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 leading-relaxed tracking-normal">
            {question.question_en}
          </h3>
        )}
        {(displayMode === 'tamil' || displayMode === 'bilingual') && question.question_ta && (
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/70">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-1">
              தமிழ் வடிவம் (Tamil)
            </span>
            <p className="text-sm sm:text-base font-semibold text-slate-800 font-sans leading-relaxed">
              {question.question_ta}
            </p>
          </div>
        )}
      </div>

      {/* Columns Reference Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 mb-6">
        {/* Column A (Left) */}
        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
              Column A (வரிசை A)
            </h4>
            <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">{leftItems.length} Items</span>
          </div>
          <div className="space-y-3">
            {leftItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center shrink-0">
                  {item.id}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  {(displayMode === 'english' || displayMode === 'bilingual') && (
                    <span className="text-sm font-semibold text-slate-900 block leading-snug">
                      {item.text_en}
                    </span>
                  )}
                  {(displayMode === 'tamil' || displayMode === 'bilingual') && item.text_ta && (
                    <span className="text-xs text-slate-600 block font-sans leading-snug">
                      {item.text_ta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column B (Right) */}
        <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-200/90">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider">
              Column B (வரிசை B)
            </h4>
            <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">{rightItems.length} Items</span>
          </div>
          <div className="space-y-3">
            {rightItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3.5 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-black flex items-center justify-center shrink-0">
                  {item.id}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  {(displayMode === 'english' || displayMode === 'bilingual') && (
                    <span className="text-sm font-semibold text-slate-900 block leading-snug">
                      {item.text_en}
                    </span>
                  )}
                  {(displayMode === 'tamil' || displayMode === 'bilingual') && item.text_ta && (
                    <span className="text-xs text-slate-600 block font-sans leading-snug">
                      {item.text_ta}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Match Selector Box */}
      <div className="bg-purple-50/50 border border-purple-200/80 p-5 sm:p-6 rounded-2xl mb-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-purple-200/60">
          <h4 className="text-xs sm:text-sm font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
            <span>Select Matching Pairs (பொருந்தும் இணைகளைத் தேர்ந்தெடுக்கவும்)</span>
          </h4>
          {!isReadOnly && isFullyMatched && (
            <button
              onClick={handleResetMatches}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-purple-200 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Selection
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {leftItems.map((leftItem) => {
            const selectedRightId = userMatchAnswer[leftItem.id] || '';
            const correctRightId = question.correctAnswer[leftItem.id];
            const isMatchCorrect = selectedRightId === correctRightId;

            let selectorBorder = 'border-slate-300 focus:border-purple-500';
            if (showSolution || isReadOnly) {
              if (isMatchCorrect) selectorBorder = 'border-emerald-500 bg-emerald-50/50 font-semibold text-emerald-900';
              else if (selectedRightId) selectorBorder = 'border-rose-400 bg-rose-50/50 text-rose-900';
            }

            return (
              <div key={leftItem.id} className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                <span className="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                  {leftItem.id}
                </span>

                <span className="text-xs sm:text-sm font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[120px]">
                  {leftItem.text_en}
                </span>

                <ArrowRight className="w-4 h-4 text-purple-400 shrink-0" />

                <select
                  disabled={isReadOnly}
                  value={selectedRightId}
                  onChange={(e) => handleSelectChange(leftItem.id, e.target.value)}
                  className={`flex-1 text-xs sm:text-sm py-2 px-2.5 rounded-lg border font-bold bg-white text-slate-800 transition-colors focus:outline-hidden ${selectorBorder} ${
                    !isReadOnly ? 'cursor-pointer' : 'cursor-default'
                  }`}
                  id={`match-select-${question.id}-${leftItem.id}`}
                >
                  <option value="">-- Choose Match --</option>
                  {rightItems.map((rItem) => (
                    <option key={rItem.id} value={rItem.id}>
                      {rItem.id} - {rItem.text_en}
                    </option>
                  ))}
                </select>

                {(showSolution || isReadOnly) && selectedRightId && (
                  <span className="shrink-0">
                    {isMatchCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <span className="text-xs font-black text-rose-600">✕</span>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Solution & Correct Match Matrix */}
      {showSolution && (
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 text-slate-800 text-xs sm:text-sm space-y-3.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-black text-emerald-800 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Correct Answer Key:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {leftItems.map((lItem) => {
              const matchedRId = question.correctAnswer[lItem.id];
              const matchedRItem = rightItems.find((r) => r.id === matchedRId);

              return (
                <div key={lItem.id} className="bg-white p-3 rounded-xl border border-emerald-200 text-emerald-950 flex items-center gap-2 shadow-2xs">
                  <span className="font-extrabold text-purple-700">{lItem.id} ({lItem.text_en})</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-bold text-indigo-700">{matchedRId} ({matchedRItem?.text_en})</span>
                </div>
              );
            })}
          </div>

          {(question.explanation_en || question.explanation_ta) && (
            <div className="pt-3 border-t border-emerald-200/60 text-slate-700 space-y-1 leading-relaxed">
              {question.explanation_en && <p className="font-medium">{question.explanation_en}</p>}
              {question.explanation_ta && <p className="font-sans text-xs text-slate-600 mt-1">{question.explanation_ta}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { MCQQuestion } from '../../types';
import { CheckCircle2, XCircle, Award, Calendar, HelpCircle, Tag } from 'lucide-react';
import { getMCQOptionsEn, getMCQOptionsTa } from '../../utils/questionHelpers';

interface MCQQuestionViewProps {
  question: MCQQuestion;
  index: number;
  displayMode?: 'bilingual' | 'english' | 'tamil';
  userAnswer?: number;
  onSelectOption?: (optionIndex: number) => void;
  showSolution?: boolean;
  isReadOnly?: boolean;
}

export const MCQQuestionView: React.FC<MCQQuestionViewProps> = ({
  question,
  index,
  displayMode = 'bilingual',
  userAnswer,
  onSelectOption,
  showSolution = false,
  isReadOnly = false,
}) => {
  const optionsEn = getMCQOptionsEn(question);
  const optionsTa = getMCQOptionsTa(question);
  const totalOptionsCount = Math.max(optionsEn.length, optionsTa.length);

  const isCorrect = userAnswer === question.correctOptionIndex;
  const isAnswered = userAnswer !== undefined && userAnswer !== -1;

  const getDifficultyBadgeColor = (diff?: string) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'moderate':
      case 'medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'hard':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden mb-8 p-6 sm:p-8" id={`mcq-card-${question.id}`}>
      {/* Question Header Meta */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-lg tracking-wide uppercase shadow-2xs">
            Q{index + 1}
          </span>
          <span className={`text-xs font-black px-3 py-1 rounded-lg border ${
            question.questionType === 'assertion_reason' || Boolean(question.assertion)
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : question.questionType === 'statement_based' || Boolean(question.statements)
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : question.questionType === 'passage_mcq' || Boolean(question.passage)
              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
              : question.questionType === 'true_false'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {question.questionType === 'assertion_reason' || Boolean(question.assertion)
              ? 'Assertion & Reason'
              : question.questionType === 'statement_based' || Boolean(question.statements)
              ? 'Statement Based'
              : question.questionType === 'passage_mcq' || Boolean(question.passage)
              ? 'Passage MCQ'
              : question.questionType === 'true_false'
              ? 'True / False'
              : question.questionType === 'fill_blank'
              ? 'Fill in Blank'
              : 'MCQ'}
          </span>
          {question.topic && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-blue-50/70 px-3 py-1 rounded-lg border border-blue-100">
              <Tag className="w-3.5 h-3.5 text-blue-600" />
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
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${getDifficultyBadgeColor(question.difficulty)}`}>
              {question.difficulty}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
            <Award className="w-3.5 h-3.5 text-blue-600" />
            +{question.marks ?? 1} {question.marks === 1 ? 'Mark' : 'Marks'}
          </span>
        </div>
      </div>

      {/* Optional Passage Block */}
      {(question.passage || question.passageTamilText) && (
        <div className="mb-6 p-5 sm:p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded">
            Reading Comprehension Passage
          </span>
          {(displayMode === 'english' || displayMode === 'bilingual') && question.passage && (
            <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-serif">
              {question.passage}
            </p>
          )}
          {(displayMode === 'tamil' || displayMode === 'bilingual') && question.passageTamilText && (
            <p className="text-sm sm:text-base text-slate-800 leading-relaxed font-sans pt-2 border-t border-slate-200/60">
              {question.passageTamilText}
            </p>
          )}
        </div>
      )}

      {/* Question Body Text */}
      <div className="space-y-4 mb-6">
        {(displayMode === 'english' || displayMode === 'bilingual') && (
          <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 leading-relaxed tracking-normal">
            {question.question_en || question.questionText}
          </h3>
        )}

        {(displayMode === 'tamil' || displayMode === 'bilingual') && (question.question_ta || question.questionTamilText) && (
          <div className="bg-amber-50/50 p-4 sm:p-5 rounded-xl border border-amber-200/70">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block mb-1">
              தமிழ் வடிவம் (Tamil)
            </span>
            <p className="text-sm sm:text-base lg:text-lg font-semibold text-slate-800 leading-relaxed font-sans">
              {question.question_ta || question.questionTamilText}
            </p>
          </div>
        )}
      </div>

      {/* Dedicated Assertion & Reason Cards: Side-by-side on desktop/tablet (md:grid-cols-2), vertical stack on mobile (grid-cols-1) */}
      {(question.assertion || question.reason || question.assertionTamilText || question.reasonTamilText) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 items-stretch">
          {/* Assertion (A) */}
          {(question.assertion || question.assertionTamilText) && (
            <div className="bg-indigo-50/70 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-indigo-200/60 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-indigo-800 bg-indigo-100/90 px-2.5 py-0.5 rounded-md font-mono">
                    Assertion (A) / கூற்று (A)
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-white/90 px-2 py-0.5 rounded-full border border-indigo-200/80">
                    Statement
                  </span>
                </div>
                {(displayMode === 'english' || displayMode === 'bilingual') && question.assertion && (
                  <p className="text-sm sm:text-base font-bold text-indigo-950 leading-relaxed">
                    {question.assertion}
                  </p>
                )}
                {(displayMode === 'tamil' || displayMode === 'bilingual') && question.assertionTamilText && (
                  <p className="text-sm sm:text-base font-bold text-indigo-950 leading-relaxed font-sans pt-2 border-t border-indigo-200/50">
                    {question.assertionTamilText}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Reason (R) */}
          {(question.reason || question.reasonTamilText) && (
            <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-2xs">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-md font-mono">
                    Reason (R) / காரணம் (R)
                  </span>
                  <span className="text-[10px] font-bold text-amber-600 bg-white/90 px-2 py-0.5 rounded-full border border-amber-200/80">
                    Explanation
                  </span>
                </div>
                {(displayMode === 'english' || displayMode === 'bilingual') && question.reason && (
                  <p className="text-sm sm:text-base font-bold text-amber-950 leading-relaxed">
                    {question.reason}
                  </p>
                )}
                {(displayMode === 'tamil' || displayMode === 'bilingual') && question.reasonTamilText && (
                  <p className="text-sm sm:text-base font-bold text-amber-950 leading-relaxed font-sans pt-2 border-t border-amber-200/50">
                    {question.reasonTamilText}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dedicated Statement-Based Cards */}
      {(Array.isArray(question.statements) && question.statements.length > 0) && (
        <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 mb-6">
          <span className="text-[10.5px] font-black uppercase tracking-widest text-slate-600 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md font-mono">
            Statements / கூற்றுகள்
          </span>
          <div className="space-y-2">
            {question.statements.map((stmt, sIdx) => {
              const stmtTa = question.tamilStatements?.[sIdx];
              return (
                <div key={sIdx} className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-1">
                  {(displayMode === 'english' || displayMode === 'bilingual') && (
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-relaxed">
                      <span className="font-mono text-blue-600 font-black mr-2">({sIdx + 1})</span>
                      {stmt}
                    </p>
                  )}
                  {(displayMode === 'tamil' || displayMode === 'bilingual') && stmtTa && (
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 font-sans leading-relaxed">
                      <span className="font-mono text-emerald-600 font-black mr-2">({sIdx + 1})</span>
                      {stmtTa}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-3.5 mb-6">
        {Array.from({ length: totalOptionsCount }).map((_, optIdx) => {
          const optEn = optionsEn[optIdx] || '';
          const optTa = optionsTa[optIdx] || '';
          const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D

          const isSelected = userAnswer === optIdx;
          const isCorrectOption = question.correctOptionIndex === optIdx;

          let optionStyle = 'bg-white border-slate-200/90 text-slate-800 hover:bg-blue-50/40 hover:border-blue-300 shadow-2xs';
          let circleStyle = 'bg-slate-100 border-slate-300 text-slate-700';

          if (isReadOnly || showSolution) {
            if (isCorrectOption) {
              optionStyle = 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-semibold ring-2 ring-emerald-400/20';
              circleStyle = 'bg-emerald-600 border-emerald-600 text-white';
            } else if (isSelected && !isCorrectOption) {
              optionStyle = 'bg-rose-50/90 border-rose-400 text-rose-950 font-medium ring-2 ring-rose-400/20';
              circleStyle = 'bg-rose-500 border-rose-500 text-white';
            }
          } else if (isSelected) {
            optionStyle = 'bg-blue-50/90 border-blue-600 text-blue-950 font-semibold ring-2 ring-blue-500/25';
            circleStyle = 'bg-blue-600 border-blue-600 text-white';
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={isReadOnly}
              onClick={() => onSelectOption && onSelectOption(optIdx)}
              className={`w-full text-left p-4 sm:p-4.5 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between gap-4 ${optionStyle} ${
                !isReadOnly ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
              }`}
              id={`option-${question.id}-${optIdx}`}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm border shrink-0 transition-all ${circleStyle}`}>
                  {optionLetter}
                </span>

                <div className="min-w-0 flex-1 space-y-0.5">
                  {(displayMode === 'english' || displayMode === 'bilingual') && (
                    <span className="text-sm sm:text-base block font-medium text-slate-900 leading-relaxed">
                      {optEn}
                    </span>
                  )}
                  {(displayMode === 'tamil' || displayMode === 'bilingual') && optTa && (
                    <span className="text-xs sm:text-sm block text-slate-600 font-sans leading-relaxed">
                      {optTa}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Icons */}
              {(showSolution || isReadOnly) && (
                <div className="shrink-0 pl-2">
                  {isCorrectOption && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Solution & Answer Revealer Box */}
      {showSolution && (
        <div className="mt-6 p-5 sm:p-6 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 text-slate-800 text-xs sm:text-sm space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-black text-emerald-800 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Correct Answer: Option {String.fromCharCode(65 + question.correctOptionIndex)} ({question.correctAnswer_en || optionsEn[question.correctOptionIndex] || ''})</span>
          </div>
          {(question.correctAnswer_ta || optionsTa[question.correctOptionIndex]) && (
            <p className="text-xs sm:text-sm font-bold text-emerald-900 font-sans pl-6">
              சரியான விடை: {question.correctAnswer_ta || optionsTa[question.correctOptionIndex]}
            </p>
          )}

          {(question.explanation_en || question.explanation) && (
            <div className="pt-3 border-t border-emerald-200/60 text-slate-700 space-y-1.5 leading-relaxed">
              <span className="font-black text-slate-800 block uppercase tracking-wider text-[10.5px]">Explanation:</span>
              <p className="text-slate-700 leading-relaxed font-medium">{question.explanation_en || question.explanation}</p>
              {(question.explanation_ta || question.tamilExplanation) && (
                <p className="text-xs sm:text-sm text-slate-600 font-sans leading-relaxed pt-1">
                  {question.explanation_ta || question.tamilExplanation}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

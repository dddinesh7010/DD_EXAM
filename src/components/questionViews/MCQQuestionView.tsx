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
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden mb-6 p-5 sm:p-6" id={`mcq-card-${question.id}`}>
      {/* Question Header Meta */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white text-xs font-black px-2.5 py-1 rounded-md tracking-wide">
            Q{index + 1}
          </span>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            MCQ
          </span>
          {question.topic && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-blue-50/60 px-2.5 py-0.5 rounded-md border border-blue-100">
              <Tag className="w-3 h-3 text-blue-500" />
              {question.topic}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {question.year && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <Calendar className="w-3 h-3 text-slate-400" />
              {question.year}
            </span>
          )}
          {question.difficulty && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${getDifficultyBadgeColor(question.difficulty)}`}>
              {question.difficulty}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <Award className="w-3 h-3 text-blue-600" />
            +{question.marks ?? 1} {question.marks === 1 ? 'Mark' : 'Marks'}
          </span>
        </div>
      </div>

      {/* Question Body Text */}
      <div className="space-y-2 mb-5">
        {(displayMode === 'english' || displayMode === 'bilingual') && (
          <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {question.question_en || question.questionText}
          </h3>
        )}

        {(displayMode === 'tamil' || displayMode === 'bilingual') && (question.question_ta || question.questionTamilText) && (
          <p className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed font-sans bg-amber-50/40 p-2.5 rounded-lg border border-amber-100/60">
            {question.question_ta || question.questionTamilText}
          </p>
        )}
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 gap-2.5 sm:gap-3 mb-4">
        {Array.from({ length: totalOptionsCount }).map((_, optIdx) => {
          const optEn = optionsEn[optIdx] || '';
          const optTa = optionsTa[optIdx] || '';
          const optionLetter = String.fromCharCode(65 + optIdx); // A, B, C, D

          const isSelected = userAnswer === optIdx;
          const isCorrectOption = question.correctOptionIndex === optIdx;

          let optionStyle = 'bg-slate-50/70 border-slate-200 text-slate-800 hover:bg-blue-50/50 hover:border-blue-300';
          let circleStyle = 'bg-white border-slate-300 text-slate-600';

          if (isReadOnly || showSolution) {
            if (isCorrectOption) {
              optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold ring-1 ring-emerald-300';
              circleStyle = 'bg-emerald-600 border-emerald-600 text-white';
            } else if (isSelected && !isCorrectOption) {
              optionStyle = 'bg-rose-50 border-rose-300 text-rose-900 font-medium';
              circleStyle = 'bg-rose-500 border-rose-500 text-white';
            }
          } else if (isSelected) {
            optionStyle = 'bg-blue-50/90 border-blue-500 text-blue-950 font-semibold ring-2 ring-blue-400/30';
            circleStyle = 'bg-blue-600 border-blue-600 text-white';
          }

          return (
            <button
              key={optIdx}
              type="button"
              disabled={isReadOnly}
              onClick={() => onSelectOption && onSelectOption(optIdx)}
              className={`w-full text-left p-3 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${optionStyle} ${
                !isReadOnly ? 'cursor-pointer active:scale-[0.99]' : 'cursor-default'
              }`}
              id={`option-${question.id}-${optIdx}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm border shrink-0 transition-colors ${circleStyle}`}>
                  {optionLetter}
                </span>

                <div className="min-w-0 flex-1">
                  {(displayMode === 'english' || displayMode === 'bilingual') && (
                    <span className="text-sm sm:text-base block font-medium leading-snug">
                      {optEn}
                    </span>
                  )}
                  {(displayMode === 'tamil' || displayMode === 'bilingual') && optTa && (
                    <span className="text-xs sm:text-sm block text-slate-600 font-sans mt-0.5">
                      {optTa}
                    </span>
                  )}
                </div>
              </div>

              {/* Status Icons */}
              {(showSolution || isReadOnly) && (
                <div className="shrink-0">
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
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs sm:text-sm space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 font-bold text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>Correct Answer: Option {String.fromCharCode(65 + question.correctOptionIndex)} ({question.correctAnswer_en || optionsEn[question.correctOptionIndex] || ''})</span>
          </div>
          {(question.correctAnswer_ta || optionsTa[question.correctOptionIndex]) && (
            <p className="text-xs font-semibold text-emerald-800 font-sans pl-6">
              சரியான விடை: {question.correctAnswer_ta || optionsTa[question.correctOptionIndex]}
            </p>
          )}

          {(question.explanation_en || question.explanation) && (
            <div className="pt-2 border-t border-slate-200/80 text-slate-600 space-y-1">
              <span className="font-bold text-slate-700 block">Explanation:</span>
              <p className="leading-relaxed">{question.explanation_en || question.explanation}</p>
              {(question.explanation_ta || question.tamilExplanation) && (
                <p className="text-xs text-slate-600 font-sans leading-relaxed pt-1">
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

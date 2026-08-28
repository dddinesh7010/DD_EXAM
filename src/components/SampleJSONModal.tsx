import React, { useState } from 'react';
import { X, Copy, Check, Download, FileCode, Play, Sparkles, BookOpen, Layers, CheckSquare, HelpCircle, Columns, AlignLeft } from 'lucide-react';
import { SAMPLE_EXAM_JSON, QUESTION_TYPES_DOCUMENTATION, downloadSampleJSONFile } from '../data/sampleExamJSON';
import { Question } from '../types';
import { parseQuestionsFromJSON } from '../utils/jsonQuestionParser';

interface SampleJSONModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSampleExam?: (questions: Question[], title: string, timeLimit: number) => void;
  onUseSample?: (questions: Question[], title: string, timeLimit: number) => void;
}

export default function SampleJSONModal({ isOpen, onClose, onLoadSampleExam, onUseSample }: SampleJSONModalProps) {
  const [activeTab, setActiveTab] = useState<'all' | string>('all');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getActiveCode = () => {
    if (activeTab === 'all') {
      return JSON.stringify(SAMPLE_EXAM_JSON, null, 2);
    }
    const doc = QUESTION_TYPES_DOCUMENTATION.find(d => d.type === activeTab);
    return doc ? JSON.stringify(doc.sample, null, 2) : '';
  };

  const handleCopy = () => {
    const code = getActiveCode();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadSample = () => {
    try {
      const parsed = parseQuestionsFromJSON(SAMPLE_EXAM_JSON, 'Sample 7-Type Standard Exam');
      if (onUseSample) {
        onUseSample(parsed.questions, 'Sample 7-Type Standard Exam', parsed.questions.length * 60);
      } else if (onLoadSampleExam) {
        onLoadSampleExam(parsed.questions, 'Sample 7-Type Standard Exam', parsed.questions.length * 60);
      }
      onClose();
    } catch (e) {
      console.error('Failed to load sample exam:', e);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return <CheckSquare className="w-4 h-4 text-blue-500" />;
      case 'match_following': return <Columns className="w-4 h-4 text-emerald-500" />;
      case 'passage_mcq': return <BookOpen className="w-4 h-4 text-amber-500" />;
      case 'true_false': return <Check className="w-4 h-4 text-purple-500" />;
      case 'fill_blank': return <AlignLeft className="w-4 h-4 text-cyan-500" />;
      case 'statement_based': return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'assertion_reason': return <Sparkles className="w-4 h-4 text-rose-500" />;
      default: return <FileCode className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200/60">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                Standard Question JSON Schema & Sample
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Support for 7 standardized bilingual English + Tamil question structures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-200 bg-slate-100/70 overflow-x-auto select-none no-scrollbar">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Complete Exam Array (All 7 Types)
          </button>

          {QUESTION_TYPES_DOCUMENTATION.map(doc => (
            <button
              key={doc.type}
              onClick={() => setActiveTab(doc.type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === doc.type
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {getTypeIcon(doc.type)}
              {doc.title.split('—')[0].trim()}
            </button>
          ))}
        </div>

        {/* Code Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900 text-slate-100 font-mono text-xs relative select-text">
          <div className="flex items-center justify-between mb-3 text-slate-400 border-b border-slate-800 pb-2">
            <span className="text-[11px] font-bold text-slate-400">
              {activeTab === 'all' 
                ? 'Complete Dataset (7 Questions Array)' 
                : QUESTION_TYPES_DOCUMENTATION.find(d => d.type === activeTab)?.desc}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>

          <pre className="overflow-x-auto leading-relaxed text-slate-200 p-2 rounded bg-slate-950/60 border border-slate-800/80">
            <code>{getActiveCode()}</code>
          </pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadSampleJSONFile}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-blue-600" />
              Download sample_exam_questions.json
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {onLoadSampleExam && (
              <button
                type="button"
                onClick={handleLoadSample}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Play className="w-4 h-4" />
                Load & Test Sample Exam
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

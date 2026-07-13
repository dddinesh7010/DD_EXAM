import React, { useState } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Volume2, Globe, HelpCircle, Save, Trash2, Check, Percent } from 'lucide-react';
import { ExamSettings } from '../types';

interface SettingsProps {
  settings: ExamSettings;
  onSaveSettings: (updated: ExamSettings) => void;
  onClearHistory: () => void;
}

export default function Settings({ settings, onSaveSettings, onClearHistory }: SettingsProps) {
  const [defaultLanguage, setDefaultLanguage] = useState<'English' | 'Tamil'>(settings.defaultLanguage);
  const [positiveMarking, setPositiveMarking] = useState<number>(settings.positiveMarking);
  const [negativeMarking, setNegativeMarking] = useState<number>(settings.negativeMarking);
  const [warnOnTabLeave, setWarnOnTabLeave] = useState<boolean>(settings.warnOnTabLeave);
  const [enableSoundAlerts, setEnableSoundAlerts] = useState<boolean>(settings.enableSoundAlerts);
  const [timeLimitPerQuestion, setTimeLimitPerQuestion] = useState<number>(settings.timeLimitPerQuestion);

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      defaultLanguage,
      positiveMarking: Number(positiveMarking),
      negativeMarking: Number(negativeMarking),
      warnOnTabLeave,
      enableSoundAlerts,
      timeLimitPerQuestion: Number(timeLimitPerQuestion)
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6" id="settings-container">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header Header */}
        <div className="border-b border-gray-200 p-5 bg-gray-50/50 flex items-center gap-2">
          <SettingsIcon className="w-4.5 h-4.5 text-gray-700" />
          <h2 className="font-sans font-bold text-gray-800 text-sm uppercase tracking-wider">CBT System Administration Settings</h2>
        </div>

        {/* Configuration Panel Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6 text-sm text-gray-600">
          {/* Default Language Preference */}
          <div className="space-y-2">
            <label className="block font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-500" />
              Default Examination Language
            </label>
            <p className="text-xs text-gray-400 font-medium">Specify the default presentation language loaded when initializing examination question cards.</p>
            <div className="flex gap-3 pt-1">
              {(['English'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setDefaultLanguage(lang)}
                  className={`flex-1 py-2.5 px-4 rounded-md border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    defaultLanguage === lang
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {lang === 'English' ? 'English (default)' : 'தமிழ் (இயல்புநிலை)'}
                </button>
              ))}
            </div>
          </div>

          {/* Exam Marking Scheme Constraints */}
          <div className="border-t border-gray-200 pt-5 space-y-4">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-emerald-500" />
              Evaluation & Marking Scheme
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Positive Marks (per correct answer)</label>
                <select
                  value={positiveMarking}
                  onChange={(e) => setPositiveMarking(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 px-3 text-xs focus:outline-none focus:border-blue-500 font-semibold text-gray-700 cursor-pointer"
                >
                  <option value={1}>+1 Mark</option>
                  <option value={2}>+2 Marks (standard)</option>
                  <option value={3}>+3 Marks</option>
                  <option value={4}>+4 Marks (engineering grade)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Negative Marks (per incorrect answer)</label>
                <select
                  value={negativeMarking}
                  onChange={(e) => setNegativeMarking(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-md py-2 px-3 text-xs focus:outline-none focus:border-blue-500 font-semibold text-gray-700 cursor-pointer"
                >
                  <option value={0}>0 (No penalty)</option>
                  <option value={0.25}>-0.25 Marks (1/4 penalty)</option>
                  <option value={0.33}>-0.33 Marks (1/3 penalty)</option>
                  <option value={0.5}>-0.5 Marks (1/2 penalty)</option>
                  <option value={1}>-1 Mark (severe penalty)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Exam Timing Configurations */}
          <div className="border-t border-gray-200 pt-5 space-y-1.5">
            <label className="block font-bold text-gray-800 text-xs uppercase tracking-wider">Question Duration Standard (seconds)</label>
            <p className="text-xs text-gray-400 font-medium">Specifies the length of time granted per question when compiling dynamic timer limits (e.g. 60 seconds = 10 minutes for 10 questions).</p>
            <input
              type="number"
              min={30}
              max={180}
              value={timeLimitPerQuestion}
              onChange={(e) => setTimeLimitPerQuestion(Number(e.target.value))}
              className="w-full max-w-xs bg-gray-50 border border-gray-200 rounded-md py-2 px-3 text-xs focus:outline-none focus:border-blue-500 font-mono font-bold text-gray-700"
            />
          </div>

          {/* Security and Accessibility Switches */}
          <div className="border-t border-gray-200 pt-5 space-y-4">
            <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Proctoring & System Integrity
            </h3>

            <div className="space-y-4">
              {/* Warn on tab Switch */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={warnOnTabLeave}
                  onChange={(e) => setWarnOnTabLeave(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">Enable Focus Monitoring Proctor</span>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">Logs violations and triggers alarm dialogs immediately if focus shifts away from the exam browser window.</p>
                </div>
              </label>

              {/* Sound Alerts switch */}
              <label className="flex items-start gap-3 cursor-pointer select-none border-t border-gray-100 pt-4">
                <input
                  type="checkbox"
                  checked={enableSoundAlerts}
                  onChange={(e) => setEnableSoundAlerts(e.target.checked)}
                  className="mt-0.5 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <div>
                  <span className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    Enable Sound Synthesizer Warnings
                    <Volume2 className="w-4 h-4 text-gray-400" />
                  </span>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">Emits custom beeps and notifications for timer limits (final 10 seconds) and integrity infringements.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Submission and saved status */}
          <div className="border-t border-gray-200 pt-6 flex items-center justify-end gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-pulse font-mono">
                <Check className="w-4 h-4" />
                PREFERENCES UPDATED
              </span>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 border border-blue-600 transition-all text-white font-bold text-xs py-2 px-5 rounded-md inline-flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider"
              id="save-settings-btn"
            >
              <Save className="w-4 h-4" />
              Save Preferences
            </button>
          </div>
        </form>
      </div>

      {/* Dangerous Administrative Clears */}
      <div className="bg-red-50/50 border border-red-200 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-xs font-bold text-red-800 uppercase tracking-widest">Administrative Actions</h3>
          <p className="text-xs text-red-600/70 mt-1 font-medium">These processes are destructive and cannot be undone once executed.</p>
        </div>

        {showClearConfirm ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-red-700">Are you absolutely sure? This deletes ALL cumulative scores, practice session logs, and history sheets from your local storage.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onClearHistory()}
                className="bg-red-650 hover:bg-red-700 transition-colors text-white text-xs font-bold py-1.5 px-3.5 rounded-md cursor-pointer uppercase tracking-wider border border-red-650"
                id="confirm-delete-history"
              >
                Yes, Delete Everything
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="bg-white border border-gray-300 text-gray-600 text-xs font-bold py-1.5 px-3 rounded-md cursor-pointer uppercase tracking-wider hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 transition-all text-xs font-bold py-2 px-4 rounded-md inline-flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            id="trigger-clear-history"
          >
            <Trash2 className="w-4 h-4" />
            Delete All Practice History logs
          </button>
        )}
      </div>
    </div>
  );
}

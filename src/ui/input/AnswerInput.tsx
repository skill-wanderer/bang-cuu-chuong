import React, { useEffect } from 'react';
import { useInputStore } from '../../store/useInputStore';
import { Numpad } from './Numpad';

interface AnswerInputProps {
  showNumpad?: boolean;
}

export const AnswerInput: React.FC<AnswerInputProps> = ({ showNumpad = true }) => {
  const { buffer, appendDigit, backspace, clear, submit, locked } = useInputStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (locked) return;

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [locked, appendDigit, backspace, submit, clear]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto">
      {/* Answer Box */}
      <div className="relative flex items-center justify-center min-w-[140px] h-20 px-6 my-4 bg-surface rounded-2xl border-2 border-brand-500/40 shadow-inner">
        <span className="text-4xl font-black font-mono tracking-wider text-slate-50 min-h-[40px] flex items-center">
          {buffer || <span className="text-slate-600 opacity-60">?</span>}
        </span>
        <span className="inline-block w-1 h-8 ml-1 bg-brand-400 animate-pulse-subtle rounded" />
      </div>

      {/* Desktop Hint */}
      <div className="hidden sm:block text-xs text-slate-500 mb-2 font-mono">
        Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">0-9</kbd> and <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">Enter</kbd>
      </div>

      {/* Touch Numpad */}
      {showNumpad && <Numpad />}
    </div>
  );
};

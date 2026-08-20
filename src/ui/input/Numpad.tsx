import React from 'react';
import { Delete, Check } from 'lucide-react';
import { useInputStore } from '../../store/useInputStore';

export const Numpad: React.FC = () => {
  const { appendDigit, backspace, submit, locked } = useInputStore();

  const handleKey = (digit: string) => {
    if (locked) return;
    appendDigit(digit);
  };

  const handleBackspace = () => {
    if (locked) return;
    backspace();
  };

  const handleSubmit = () => {
    if (locked) return;
    submit();
  };

  return (
    <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-2.5 p-3 select-none">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          type="button"
          disabled={locked}
          onClick={() => handleKey(num.toString())}
          className="h-16 rounded-2xl bg-surface-elevated active:bg-brand-700 active:scale-95 text-2xl font-bold text-slate-100 shadow-md border border-slate-700/50 transition-all flex items-center justify-center disabled:opacity-40"
        >
          {num}
        </button>
      ))}
      <button
        type="button"
        disabled={locked}
        onClick={handleBackspace}
        aria-label="Backspace"
        className="h-16 rounded-2xl bg-surface-elevated/80 active:bg-rose-900/60 active:scale-95 text-slate-300 shadow-md border border-slate-700/50 transition-all flex items-center justify-center disabled:opacity-40 hover:text-rose-400"
      >
        <Delete className="w-7 h-7" />
      </button>
      <button
        type="button"
        disabled={locked}
        onClick={() => handleKey('0')}
        className="h-16 rounded-2xl bg-surface-elevated active:bg-brand-700 active:scale-95 text-2xl font-bold text-slate-100 shadow-md border border-slate-700/50 transition-all flex items-center justify-center disabled:opacity-40"
      >
        0
      </button>
      <button
        type="button"
        disabled={locked}
        onClick={handleSubmit}
        aria-label="Submit"
        className="h-16 rounded-2xl bg-brand-600 active:bg-brand-500 active:scale-95 text-white shadow-lg shadow-brand-600/30 border border-brand-400/30 transition-all flex items-center justify-center disabled:opacity-40 font-bold"
      >
        <Check className="w-8 h-8 stroke-[3]" />
      </button>
    </div>
  );
};

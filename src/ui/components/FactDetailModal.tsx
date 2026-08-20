import React from 'react';
import { X, Zap, Brain } from 'lucide-react';
import { FactState } from '../../core/types';
import { LevelBadge } from './LevelBadge';
import { strings } from '../../strings/en';

interface FactDetailModalProps {
  fact: FactState | null;
  onClose: () => void;
  onPracticeFact?: (familyId: string) => void;
}

export const FactDetailModal: React.FC<FactDetailModalProps> = ({ fact, onClose, onPracticeFact }) => {
  if (!fact) return null;

  const { a, b, familyId, mul, div, level, effective, totalAttempts } = fact;
  const product = a * b;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-surface border border-slate-700/80 rounded-3xl p-6 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-white font-mono">
                {a} × {b}
              </h2>
              <LevelBadge level={level} />
            </div>
            <p className="text-sm text-slate-400 font-mono mt-1">
              {product} ÷ {a} = {b} {a !== b && `· ${product} ÷ ${b} = ${a}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overall Mastery Gauge */}
        <div className="p-4 bg-surface-elevated/70 rounded-2xl border border-slate-700/50 mb-5">
          <div className="flex justify-between items-center text-sm font-semibold mb-2">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-brand-400" /> Overall Mastery
            </span>
            <span className="text-brand-300 font-mono font-bold">{Math.round(effective * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, Math.min(100, effective * 100))}%` }}
            />
          </div>
        </div>

        {/* Stats Grid: Mul vs Div */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Multiplication */}
          <div className="p-3.5 bg-surface-elevated/50 rounded-2xl border border-slate-700/40">
            <h3 className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-2">
              Multiplication (×)
            </h3>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Strength:</span>
                <span className="font-mono font-bold text-slate-100">{Math.round(mul.effectiveStrength * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Best Speed:</span>
                <span className="font-mono text-emerald-400 font-medium">
                  {mul.bestThinkMs ? `${(mul.bestThinkMs / 1000).toFixed(2)}s` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fast Streak:</span>
                <span className="font-mono text-amber-400">{mul.consecutiveGood}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Retention:</span>
                <span className="font-mono text-slate-200">~{Math.round(mul.halfLifeDays)}d</span>
              </div>
            </div>
          </div>

          {/* Division */}
          <div className="p-3.5 bg-surface-elevated/50 rounded-2xl border border-slate-700/40">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">
              Division (÷)
            </h3>
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Strength:</span>
                <span className="font-mono font-bold text-slate-100">{Math.round(div.effectiveStrength * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Best Speed:</span>
                <span className="font-mono text-emerald-400 font-medium">
                  {div.bestThinkMs ? `${(div.bestThinkMs / 1000).toFixed(2)}s` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fast Streak:</span>
                <span className="font-mono text-amber-400">{div.consecutiveGood}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Retention:</span>
                <span className="font-mono text-slate-200">~{Math.round(div.halfLifeDays)}d</span>
              </div>
            </div>
          </div>
        </div>

        {/* Total stats summary */}
        <div className="text-xs text-slate-400 flex items-center justify-between px-2 mb-5">
          <span>Total attempts: <strong className="text-slate-200 font-mono">{totalAttempts}</strong></span>
          <span>Correct answers: <strong className="text-slate-200 font-mono">{mul.correctCount + div.correctCount}</strong></span>
        </div>

        {/* Action Button */}
        {onPracticeFact && (
          <button
            onClick={() => onPracticeFact(familyId)}
            className="w-full py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-98 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all"
          >
            <Zap className="w-5 h-5 fill-current" />
            {strings.progress.modal.practiceNow}
          </button>
        )}
      </div>
    </div>
  );
};

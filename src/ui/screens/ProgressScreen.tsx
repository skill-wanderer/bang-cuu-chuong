import React, { useState } from 'react';
import { DirectionGroup, FactState, MasteryLevel } from '../../core/types';
import { getCanonicalFamilyId } from '../../core/facts';
import { deriveMasteryLevel } from '../../core/mastery';
import { useMasteryStore } from '../../store/useMasteryStore';
import { useAppStore } from '../../store/useAppStore';
import { FactDetailModal } from '../components/FactDetailModal';
import { strings } from '../../strings/en';

export const ProgressScreen: React.FC = () => {
  const { factStateMap } = useMasteryStore();
  const { setScreen } = useAppStore();

  const [activeGroup, setActiveGroup] = useState<DirectionGroup>('mul');
  const [selectedFact, setSelectedFact] = useState<FactState | null>(null);

  // Helper to get color and level for a given cell (row 1-10, col 1-10)
  const getCellData = (row: number, col: number) => {
    const familyId = getCanonicalFamilyId(row, col, '*');
    const fact = factStateMap.get(familyId);

    if (!fact) {
      return {
        familyId,
        fact: null,
        level: 'unseen' as MasteryLevel,
        strength: 0,
        text: activeGroup === 'mul' ? `${row * col}` : `${col}`
      };
    }

    const groupState = activeGroup === 'mul' ? fact.mul : fact.div;
    const isUnseen = groupState.attemptCount === 0;
    const level: MasteryLevel = isUnseen
      ? 'unseen'
      : deriveMasteryLevel(groupState.effectiveStrength, groupState.recentAttempts, groupState.attemptCount);

    return {
      familyId,
      fact,
      level,
      strength: groupState.effectiveStrength,
      text: activeGroup === 'mul' ? `${row * col}` : `${col}`
    };
  };

  const getLevelColorClass = (level: MasteryLevel) => {
    switch (level) {
      case 'automatic':
        return 'bg-emerald-500/90 text-slate-950 font-black shadow-sm shadow-emerald-500/30 border-emerald-400';
      case 'solid':
        return 'bg-amber-500/85 text-slate-950 font-bold border-amber-400/80';
      case 'getting_there':
        return 'bg-indigo-600/70 text-indigo-100 font-semibold border-indigo-500/50';
      case 'shaky':
        return 'bg-sky-700/60 text-sky-100 border-sky-500/40';
      case 'unseen':
      default:
        return 'bg-surface-elevated/60 text-slate-400 border-slate-800';
    }
  };

  const handleCellClick = (row: number, col: number) => {
    const familyId = getCanonicalFamilyId(row, col, '*');
    const fact = factStateMap.get(familyId) || null;
    setSelectedFact(fact);
  };

  const handlePracticeFact = (_familyId: string) => {
    setSelectedFact(null);
    setScreen('practice');
  };

  // Compute counts for active group
  let automaticCount = 0;
  let solidCount = 0;
  let gettingThereCount = 0;
  let shakyCount = 0;
  let unseenCount = 0;

  for (let r = 1; r <= 10; r++) {
    for (let c = 1; c <= 10; c++) {
      const data = getCellData(r, c);
      if (data.level === 'automatic') automaticCount++;
      else if (data.level === 'solid') solidCount++;
      else if (data.level === 'getting_there') gettingThereCount++;
      else if (data.level === 'shaky') shakyCount++;
      else unseenCount++;
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Top Header & Mul/Div Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">{strings.progress.title}</h2>
          <p className="text-xs text-slate-400">{strings.progress.subtitle}</p>
        </div>

        {/* Operation Toggle Button Group */}
        <div className="inline-flex p-1 rounded-2xl bg-surface border border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveGroup('mul')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeGroup === 'mul'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {strings.progress.multiplication}
          </button>
          <button
            onClick={() => setActiveGroup('div')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeGroup === 'div'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {strings.progress.division}
          </button>
        </div>
      </div>

      {/* 10x10 Grid Matrix */}
      <div className="p-3 sm:p-5 rounded-3xl bg-surface border border-slate-800 shadow-xl overflow-x-auto">
        <div className="min-w-[340px] max-w-[540px] mx-auto">
          {/* Column Headers (1 to 10) */}
          <div className="grid grid-cols-11 gap-1 mb-1 text-center text-[10px] sm:text-xs font-mono font-bold text-slate-400">
            <div className="flex items-center justify-center text-brand-400">
              {activeGroup === 'mul' ? '×' : '÷'}
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => (
              <div key={c} className="py-1">
                {c}
              </div>
            ))}
          </div>

          {/* Rows 1 to 10 */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
            <div key={r} className="grid grid-cols-11 gap-1 mb-1">
              {/* Row Header */}
              <div className="flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold text-slate-400 py-1">
                {r}
              </div>

              {/* 10 Cells */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(c => {
                const cell = getCellData(r, c);
                const colorClass = getLevelColorClass(cell.level);

                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    className={`aspect-square rounded-lg sm:rounded-xl border flex items-center justify-center text-[11px] sm:text-xs font-mono transition-transform active:scale-90 hover:scale-105 ${colorClass}`}
                    title={`${activeGroup === 'mul' ? `${r} × ${c} = ${r * c}` : `${r * c} ÷ ${r} = ${c}`} (${cell.level})`}
                  >
                    {cell.text}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="p-4 rounded-2xl bg-surface border border-slate-800 text-xs space-y-3">
        <h4 className="font-bold text-slate-300">Mastery Levels (100 total facts)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500 shadow-sm" />
            <span className="text-slate-300">Auto: <strong>{automaticCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-500" />
            <span className="text-slate-300">Solid: <strong>{solidCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-indigo-600" />
            <span className="text-slate-300">Mid: <strong>{gettingThereCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-sky-700" />
            <span className="text-slate-300">Shaky: <strong>{shakyCount}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-700" />
            <span className="text-slate-400">Unseen: <strong>{unseenCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <FactDetailModal
        fact={selectedFact}
        onClose={() => setSelectedFact(null)}
        onPracticeFact={handlePracticeFact}
      />
    </div>
  );
};

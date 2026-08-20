import React, { useState, useEffect } from 'react';
import { Table, RotateCcw, CheckCircle } from 'lucide-react';
import { Prompt, Attempt, SessionMeta, SessionSummary } from '../../core/types';
import { getPromptsForTable } from '../../core/facts';
import { getNextPrompt } from '../../core/scheduler';
import { calculateSessionSummary } from '../../core/session';
import { useMasteryStore } from '../../store/useMasteryStore';
import { useInputStore } from '../../store/useInputStore';
import { AnswerInput } from '../input/AnswerInput';
import { soundBus } from '../../audio/soundBus';
import { repository } from '../../data/repository';
import { fireConfetti } from '../components/ConfettiEffect';

export const TableFocusScreen: React.FC = () => {
  const { factStateMap, recordAttempt, streakDays, loadAll } = useMasteryStore();
  const { startPrompt, setLocked } = useInputStore();

  const [activeTable, setActiveTable] = useState<number | null>(null);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [history, setHistory] = useState<Prompt[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; expected?: number } | null>(null);

  const startTableDrill = (tableNum: number) => {
    setActiveTable(tableNum);
    const meta: SessionMeta = {
      id: `table_${tableNum}_${Date.now()}`,
      profileId: 'default',
      mode: 'table_focus',
      startedAt: Date.now(),
      tableNumber: tableNum
    };
    setSessionMeta(meta);
    setHistory([]);
    setAttempts([]);
    setSummary(null);
    setFeedback(null);

    const first = getNextPrompt(factStateMap, [], { allowedTable: tableNum });
    setCurrentPrompt(first);
  };

  useEffect(() => {
    if (!currentPrompt || summary || !activeTable) return;

    startPrompt(async (given, thinkMs, totalMs) => {
      const isCorrect = given === currentPrompt.expected;

      const attempt: Attempt = {
        id: `att_tbl_${Date.now()}_${attempts.length}`,
        profileId: 'default',
        sessionId: sessionMeta?.id || 'session',
        familyId: currentPrompt.familyId,
        direction: currentPrompt.direction,
        group: currentPrompt.group,
        expected: currentPrompt.expected,
        given,
        correct: isCorrect,
        thinkMs,
        totalMs,
        inputMode: 'typed',
        mode: 'table_focus',
        at: Date.now(),
        schemaVersion: 1
      };

      const nextAttempts = [...attempts, attempt];
      setAttempts(nextAttempts);
      await recordAttempt(attempt);

      if (isCorrect) {
        soundBus.play('correct');
        setFeedback({ type: 'correct' });

        if (nextAttempts.length >= 15) {
          // Finish Table Focus
          await loadAll();
          const finalMap = await repository.getFactState();
          const sSummary = calculateSessionSummary(sessionMeta!, nextAttempts, Date.now(), undefined, finalMap, streakDays);
          await repository.endSession(sessionMeta!.id, sSummary);
          setSummary(sSummary);
          soundBus.play('victory');
          fireConfetti();
        } else {
          setHistory(prev => [...prev, currentPrompt]);
          const nextP = getNextPrompt(factStateMap, [...history, currentPrompt], { allowedTable: activeTable });
          setCurrentPrompt(nextP);
          setTimeout(() => setFeedback(null), 300);
        }
      } else {
        soundBus.play('wrongSoft');
        setLocked(true);
        setFeedback({ type: 'wrong', expected: currentPrompt.expected });

        setTimeout(() => {
          setFeedback(null);
          setLocked(false);

          if (nextAttempts.length >= 15) {
            loadAll().then(async () => {
              const finalMap = await repository.getFactState();
              const sSummary = calculateSessionSummary(sessionMeta!, nextAttempts, Date.now(), undefined, finalMap, streakDays);
              await repository.endSession(sessionMeta!.id, sSummary);
              setSummary(sSummary);
              soundBus.play('victory');
              fireConfetti();
            });
          } else {
            setHistory(prev => [...prev, currentPrompt]);
            const nextP = getNextPrompt(factStateMap, [...history, currentPrompt], { allowedTable: activeTable });
            setCurrentPrompt(nextP);
          }
        }, 1500);
      }
    });
  }, [currentPrompt, summary, activeTable, attempts, history, factStateMap, sessionMeta, recordAttempt, setLocked, startPrompt, loadAll, streakDays]);

  // Results Screen
  if (summary && activeTable) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 pb-24 text-center animate-in zoom-in-95 duration-300">
        <div className="p-6 rounded-3xl bg-surface border border-slate-800 shadow-2xl space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
            <CheckCircle className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Table of {activeTable} Completed!</h2>
            <p className="text-xs text-slate-400 mt-1">Accuracy: {Math.round(summary.accuracy * 100)}% · Speed: {(summary.medianThinkMs / 1000).toFixed(2)}s</p>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => startTableDrill(activeTable)}
              className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Practice Again
            </button>
            <button
              onClick={() => {
                setActiveTable(null);
                setSummary(null);
              }}
              className="w-full py-3.5 rounded-2xl bg-surface-elevated hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-sm border border-slate-700 transition-all"
            >
              Choose Another Table
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Drill Mode
  if (activeTable && currentPrompt) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-5 pb-20 flex flex-col items-center justify-between min-h-[82vh]">
        <div className="w-full">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-sky-400 font-bold">
              <Table className="w-4 h-4" /> Table of {activeTable}
            </span>
            <span className="font-mono">{attempts.length + 1} / 15</span>
          </div>
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${(attempts.length / 15) * 100}%` }}
            />
          </div>
        </div>

        <div className="my-auto text-center relative py-6">
          <div className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tight drop-shadow-md">
            {currentPrompt.display}
          </div>
          {feedback?.type === 'wrong' && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-base font-bold animate-bounce-short">
              <span>The answer is {feedback.expected}</span>
            </div>
          )}
        </div>

        <div className="w-full">
          <AnswerInput showNumpad={true} />
        </div>
      </div>
    );
  }

  // Table Selector Grid
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-white">Table Focus</h2>
        <p className="text-xs text-slate-400">Choose a specific number to drill both multiplication and division.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
          const prompts = getPromptsForTable(num);
          let totalScore = 0;
          prompts.forEach(p => {
            const f = factStateMap.get(p.familyId);
            if (f) totalScore += f.effective;
          });
          const avgMastery = Math.round((totalScore / prompts.length) * 100);

          return (
            <button
              key={num}
              onClick={() => startTableDrill(num)}
              className="p-4 rounded-3xl bg-surface hover:bg-surface-elevated active:scale-95 text-left border border-slate-800 transition-all shadow-md group flex flex-col justify-between h-32"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black font-mono text-white group-hover:text-brand-400 transition-colors">
                  {num}×
                </span>
                <span className="text-xs font-bold text-slate-400 font-mono">{avgMastery}%</span>
              </div>
              <div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full"
                    style={{ width: `${Math.max(5, avgMastery)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 font-medium">Table of {num}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

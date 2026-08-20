import React, { useState, useEffect } from 'react';
import { Trophy, ShieldCheck, XCircle, RotateCcw } from 'lucide-react';
import { Prompt, Attempt, SessionMeta, SessionSummary } from '../../core/types';
import { buildBossRunPrompts, calculateSessionSummary } from '../../core/session';
import { useMasteryStore } from '../../store/useMasteryStore';
import { useInputStore } from '../../store/useInputStore';
import { AnswerInput } from '../input/AnswerInput';
import { soundBus } from '../../audio/soundBus';
import { repository } from '../../data/repository';
import { strings } from '../../strings/en';
import { fireConfetti } from '../components/ConfettiEffect';

export const BossRunScreen: React.FC = () => {
  const { recordAttempt, streakDays, unlockKey, loadAll } = useMasteryStore();
  const { startPrompt, setLocked } = useInputStore();

  const [activeBossTable, setActiveBossTable] = useState<number | null>(null);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; expected?: number } | null>(null);

  const startBossRun = (tableNum: number) => {
    setActiveBossTable(tableNum);
    const bossPrompts = buildBossRunPrompts(tableNum);
    setPrompts(bossPrompts);
    setCurrentIndex(0);
    setAttempts([]);
    setSummary(null);
    setFeedback(null);

    const meta: SessionMeta = {
      id: `boss_${tableNum}_${Date.now()}`,
      profileId: 'default',
      mode: 'boss',
      startedAt: Date.now(),
      tableNumber: tableNum
    };
    setSessionMeta(meta);
  };

  const activePrompt = prompts[currentIndex];

  useEffect(() => {
    if (!activePrompt || summary || !activeBossTable) return;

    startPrompt(async (given, thinkMs, totalMs) => {
      const isCorrect = given === activePrompt.expected;

      const attempt: Attempt = {
        id: `att_boss_${Date.now()}_${currentIndex}`,
        profileId: 'default',
        sessionId: sessionMeta?.id || 'boss',
        familyId: activePrompt.familyId,
        direction: activePrompt.direction,
        group: activePrompt.group,
        expected: activePrompt.expected,
        given,
        correct: isCorrect,
        thinkMs,
        totalMs,
        inputMode: 'typed',
        mode: 'boss',
        at: Date.now(),
        schemaVersion: 1
      };

      const nextAttempts = [...attempts, attempt];
      setAttempts(nextAttempts);
      await recordAttempt(attempt);

      if (isCorrect) {
        soundBus.play('correct');
        setFeedback({ type: 'correct' });

        if (currentIndex + 1 < prompts.length) {
          setCurrentIndex(prev => prev + 1);
          setTimeout(() => setFeedback(null), 300);
        } else {
          // Boss run complete
          finishBoss(nextAttempts);
        }
      } else {
        soundBus.play('wrongSoft');
        setLocked(true);
        setFeedback({ type: 'wrong', expected: activePrompt.expected });

        setTimeout(() => {
          setFeedback(null);
          setLocked(false);

          if (currentIndex + 1 < prompts.length) {
            setCurrentIndex(prev => prev + 1);
          } else {
            finishBoss(nextAttempts);
          }
        }, 1200);
      }
    });
  }, [currentIndex, activePrompt, summary, activeBossTable, attempts, prompts.length, sessionMeta, recordAttempt, setLocked, startPrompt]);

  const finishBoss = async (allAttempts: Attempt[]) => {
    await loadAll();
    const finalMap = await repository.getFactState();
    const sSummary = calculateSessionSummary(sessionMeta!, allAttempts, Date.now(), undefined, finalMap, streakDays);
    await repository.endSession(sessionMeta!.id, sSummary);

    if (sSummary.clearedBoss) {
      await unlockKey(`boss_table_${activeBossTable}`);
      soundBus.play('victory');
      fireConfetti();
    } else {
      soundBus.play('shieldLoss');
    }

    setSummary(sSummary);
  };

  // Results screen
  if (summary && activeBossTable) {
    const isWin = summary.clearedBoss;

    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 pb-24 text-center animate-in zoom-in-95 duration-300">
        <div className="p-6 rounded-3xl bg-surface border border-slate-800 shadow-2xl space-y-6">
          <div
            className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center border shadow-xl ${
              isWin
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-amber-500/10'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
            }`}
          >
            {isWin ? <Trophy className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">
              {isWin ? strings.boss.clearedTitle : strings.boss.failedTitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isWin ? strings.boss.clearedDesc : strings.boss.failedDesc}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            <div className="p-3.5 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-semibold text-slate-400">Score</span>
              <div className="text-xl font-mono font-black text-slate-100 mt-1">
                {summary.correctCount} / {summary.totalPrompts}
              </div>
            </div>
            <div className="p-3.5 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-semibold text-slate-400">Median Speed</span>
              <div
                className={`text-xl font-mono font-black mt-1 ${
                  summary.medianThinkMs <= 2500 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {(summary.medianThinkMs / 1000).toFixed(2)}s
                <span className="text-[10px] text-slate-500 ml-1">(bar: 2.5s)</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => startBossRun(activeBossTable)}
              className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> {strings.boss.retry}
            </button>
            <button
              onClick={() => {
                setActiveBossTable(null);
                setSummary(null);
              }}
              className="w-full py-3.5 rounded-2xl bg-surface-elevated hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-sm border border-slate-700 transition-all"
            >
              Back to Boss Selection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Run
  if (activeBossTable && activePrompt) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-5 pb-20 flex flex-col items-center justify-between min-h-[82vh]">
        <div className="w-full">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
            <span className="flex items-center gap-1.5 text-purple-400 font-bold">
              <Trophy className="w-4 h-4" /> Boss Trial: Table of {activeBossTable}
            </span>
            <span className="font-mono">{currentIndex + 1} / {prompts.length}</span>
          </div>
          <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-brand-500 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex) / prompts.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="my-auto text-center relative py-6">
          <div className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tight drop-shadow-md">
            {activePrompt.display}
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

  // Boss Selection List
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-white">{strings.boss.title}</h2>
        <p className="text-xs text-slate-400">{strings.boss.subtitle}</p>
      </div>

      <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-xs text-purple-200">
        <span className="font-bold flex items-center gap-1.5 mb-1">
          <ShieldCheck className="w-4 h-4 text-purple-400" /> Trial Rules:
        </span>
        {strings.boss.rules}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
          <button
            key={num}
            onClick={() => startBossRun(num)}
            className="p-5 rounded-3xl bg-surface hover:bg-surface-elevated active:scale-[0.98] text-left border border-slate-800 shadow-md transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 flex items-center justify-center text-purple-400 font-mono font-black text-lg">
                {num}×
              </div>
              <div>
                <h4 className="font-bold text-base text-white">Table {num} Boss</h4>
                <p className="text-xs text-slate-400">12 speed prompts</p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all">
              <span className="text-xs font-bold font-mono">GO</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

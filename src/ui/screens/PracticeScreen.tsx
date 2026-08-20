import React, { useState, useEffect, useRef } from 'react';
import { Zap, Clock, Award, Flame, TrendingUp, CheckCircle, RotateCcw } from 'lucide-react';
import { Prompt, Attempt, SessionMeta, SessionSummary, FactState } from '../../core/types';
import { getNextPrompt } from '../../core/scheduler';
import { calculateSessionSummary } from '../../core/session';
import { useInputStore } from '../../store/useInputStore';
import { useMasteryStore } from '../../store/useMasteryStore';
import { useAppStore } from '../../store/useAppStore';
import { AnswerInput } from '../input/AnswerInput';
import { soundBus } from '../../audio/soundBus';
import { repository } from '../../data/repository';
import { strings } from '../../strings/en';
import { fireConfetti } from '../components/ConfettiEffect';

const SESSION_PROMPT_LIMIT = 20;
const SESSION_TIME_LIMIT_MS = 5 * 60 * 1000; // 5 minutes

export const PracticeScreen: React.FC = () => {
  const { setScreen, operationMode } = useAppStore();
  const { factStateMap, recordAttempt, streakDays, loadAll } = useMasteryStore();
  const { startPrompt, setLocked } = useInputStore();

  const [sessionMeta, setSessionMeta] = useState<SessionMeta | null>(null);
  const [initialFactMap, setInitialFactMap] = useState<Map<string, FactState> | null>(null);
  const [history, setHistory] = useState<Prompt[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong'; expected?: number } | null>(null);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  // Requeued families on miss (insert ~4 prompts later)
  const requeueRef = useRef<{ familyId: string; insertAtCount: number }[]>([]);
  const sessionStartRef = useRef<number>(Date.now());

  // Initialize Session
  const initSession = () => {
    const meta: SessionMeta = {
      id: `practice_${Date.now()}`,
      profileId: 'default',
      mode: 'practice',
      startedAt: Date.now()
    };
    sessionStartRef.current = Date.now();
    setSessionMeta(meta);
    setInitialFactMap(new Map(factStateMap));
    setHistory([]);
    setAttempts([]);
    setFeedback(null);
    setSummary(null);
    requeueRef.current = [];

    const first = getNextPrompt(factStateMap, [], { operationMode });
    setCurrentPrompt(first);
  };

  useEffect(() => {
    initSession();
  }, []);

  // Check timeout limit
  useEffect(() => {
    if (summary) return;
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStartRef.current;
      if (elapsed >= SESSION_TIME_LIMIT_MS && attempts.length > 0) {
        finishSession(attempts);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [summary, attempts]);

  const finishSession = async (completedAttempts: Attempt[]) => {
    if (!sessionMeta) return;

    await loadAll();
    const finalMap = await repository.getFactState();
    const sessionSummary = calculateSessionSummary(
      sessionMeta,
      completedAttempts,
      Date.now(),
      initialFactMap || undefined,
      finalMap,
      streakDays
    );

    await repository.endSession(sessionMeta.id, sessionSummary);
    setSummary(sessionSummary);
    soundBus.play('victory');
    fireConfetti();
  };

  // Wire up prompt answering
  useEffect(() => {
    if (!currentPrompt || summary) return;

    startPrompt(async (given, thinkMs, totalMs) => {
      const isCorrect = given === currentPrompt.expected;

      const attempt: Attempt = {
        id: `att_${Date.now()}_${attempts.length}`,
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
        mode: 'practice',
        at: Date.now(),
        schemaVersion: 1
      };

      const nextAttempts = [...attempts, attempt];
      setAttempts(nextAttempts);
      await recordAttempt(attempt);

      if (isCorrect) {
        soundBus.play('correct');
        setFeedback({ type: 'correct' });

        // Advance to next prompt or finish
        if (nextAttempts.length >= SESSION_PROMPT_LIMIT) {
          await finishSession(nextAttempts);
        } else {
          setHistory(prev => [...prev, currentPrompt]);
          const nextP = getNextPrompt(factStateMap, [...history, currentPrompt], { operationMode });
          setCurrentPrompt(nextP);
          setTimeout(() => setFeedback(null), 300);
        }
      } else {
        // Soft error correction: Show answer for 1.5s, pause input, requeue family ~4 prompts later
        soundBus.play('wrongSoft');
        setLocked(true);
        setFeedback({ type: 'wrong', expected: currentPrompt.expected });

        requeueRef.current.push({
          familyId: currentPrompt.familyId,
          insertAtCount: nextAttempts.length + 4
        });

        setTimeout(async () => {
          setFeedback(null);
          setLocked(false);

          if (nextAttempts.length >= SESSION_PROMPT_LIMIT) {
            await finishSession(nextAttempts);
          } else {
            setHistory(prev => [...prev, currentPrompt]);
            const nextP = getNextPrompt(factStateMap, [...history, currentPrompt], { operationMode });
            setCurrentPrompt(nextP);
          }
        }, 1500);
      }
    });
  }, [currentPrompt, summary, attempts, history, factStateMap, sessionMeta, operationMode, recordAttempt, setLocked, startPrompt]);

  // Results Card Screen
  if (summary) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-8 pb-24 animate-in zoom-in-95 duration-300">
        <div className="p-6 rounded-3xl bg-surface border border-slate-800 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center text-brand-400">
            <CheckCircle className="w-9 h-9" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white">{strings.practice.sessionComplete}</h2>
            <p className="text-xs text-slate-400 mt-1">Great practice session today.</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 text-left">
            {/* Accuracy */}
            <div className="p-3.5 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-400" /> {strings.practice.accuracy}
              </span>
              <div className="text-2xl font-black font-mono text-slate-100 mt-1">
                {Math.round(summary.accuracy * 100)}%
                <span className="text-xs text-slate-500 font-normal ml-1.5">
                  ({summary.correctCount}/{summary.totalPrompts})
                </span>
              </div>
            </div>

            {/* Median Latency */}
            <div className="p-3.5 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" /> {strings.practice.speed}
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
                {(summary.medianThinkMs / 1000).toFixed(2)}s
              </div>
            </div>

            {/* Fastest Recall */}
            <div className="p-3.5 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-indigo-400" /> {strings.practice.bestTime}
              </span>
              <div className="text-2xl font-black font-mono text-indigo-300 mt-1">
                {(summary.bestThinkMs / 1000).toFixed(2)}s
              </div>
            </div>

            {/* Streak */}
            <div className="p-3.5 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> {strings.home.streak}
              </span>
              <div className="text-2xl font-black font-mono text-amber-400 mt-1">
                {summary.streakDays} <span className="text-xs text-slate-400 font-normal">days</span>
              </div>
            </div>
          </div>

          {/* Facts Improved List */}
          {summary.factsImproved.length > 0 && (
            <div className="p-4 bg-brand-950/40 rounded-2xl border border-brand-500/30 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-brand-300 mb-2">
                <TrendingUp className="w-4 h-4" /> {strings.practice.factsImproved}
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.factsImproved.map(f => (
                  <span
                    key={f}
                    className="px-2.5 py-1 rounded-xl bg-brand-500/20 text-brand-200 font-mono text-xs font-bold border border-brand-400/30"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={initSession}
              className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> {strings.practice.practiceAgain}
            </button>
            <button
              onClick={() => setScreen('home')}
              className="w-full py-3.5 rounded-2xl bg-surface-elevated hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-sm border border-slate-700 transition-all"
            >
              {strings.practice.continueHome}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentPrompt) return null;

  const currentCount = attempts.length + 1;
  const progressPercent = (attempts.length / SESSION_PROMPT_LIMIT) * 100;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-5 pb-20 flex flex-col items-center justify-between min-h-[82vh]">
      {/* Top Header & Progress */}
      <div className="w-full">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-brand-300">
            <Zap className="w-4 h-4 fill-brand-400" /> Practice
          </span>
          <span className="font-mono">
            {currentCount} / {SESSION_PROMPT_LIMIT}
          </span>
        </div>
        <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Prompt Area with Soft Correction */}
      <div className="my-auto text-center relative py-6">
        <div className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tight drop-shadow-md">
          {currentPrompt.display}
        </div>

        {/* Soft correction display overlay */}
        {feedback?.type === 'wrong' && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-base font-bold animate-bounce-short">
            <span>The answer is {feedback.expected}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="w-full">
        <AnswerInput showNumpad={true} />
      </div>
    </div>
  );
};

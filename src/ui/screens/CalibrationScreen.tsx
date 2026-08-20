import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Prompt, Attempt } from '../../core/types';
import { buildCalibrationPrompts } from '../../core/session';
import { useInputStore } from '../../store/useInputStore';
import { useMasteryStore } from '../../store/useMasteryStore';
import { useAppStore } from '../../store/useAppStore';
import { AnswerInput } from '../input/AnswerInput';
import { soundBus } from '../../audio/soundBus';
import { repository } from '../../data/repository';
import { strings } from '../../strings/en';
import { fireConfetti } from '../components/ConfettiEffect';

export const CalibrationScreen: React.FC = () => {
  const { setScreen } = useAppStore();
  const { recordAttempt, loadAll } = useMasteryStore();
  const { startPrompt } = useInputStore();

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [sessionId] = useState<string>(() => `calib_${Date.now()}`);

  const activePrompt = prompts[currentIndex];

  useEffect(() => {
    const list = buildCalibrationPrompts();
    setPrompts(list);
    setCurrentIndex(0);
    setCompleted(false);
  }, []);

  useEffect(() => {
    if (!activePrompt || completed) return;

    startPrompt(async (given, thinkMs, totalMs) => {
      const isCorrect = given === activePrompt.expected;

      if (isCorrect) {
        soundBus.play('correct');
      } else {
        soundBus.play('wrongSoft');
      }

      const attempt: Attempt = {
        id: `att_calib_${Date.now()}_${currentIndex}`,
        profileId: 'default',
        sessionId,
        familyId: activePrompt.familyId,
        direction: activePrompt.direction,
        group: activePrompt.group,
        expected: activePrompt.expected,
        given,
        correct: isCorrect,
        thinkMs,
        totalMs,
        inputMode: 'typed',
        mode: 'calibration',
        at: Date.now(),
        schemaVersion: 1
      };

      await recordAttempt(attempt);

      if (currentIndex + 1 < prompts.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Calibration finished
        await repository.setSetting('isCalibrated', true);
        await loadAll();
        setCompleted(true);
        soundBus.play('victory');
        fireConfetti();
      }
    });
  }, [currentIndex, activePrompt, completed, prompts.length, recordAttempt, sessionId, startPrompt, loadAll]);

  if (completed) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 text-center animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-black text-white mb-2">{strings.calibration.completeTitle}</h2>
        <p className="text-sm text-slate-400 mb-8">{strings.calibration.completeSubtitle}</p>

        <div className="space-y-3">
          <button
            onClick={() => setScreen('practice')}
            className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-95 text-white font-extrabold text-base shadow-lg shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
          >
            {strings.calibration.startPracticing} <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => setScreen('progress')}
            className="w-full py-3.5 rounded-2xl bg-surface hover:bg-surface-elevated active:scale-95 text-slate-300 font-bold text-sm border border-slate-700/60 transition-all"
          >
            {strings.calibration.viewProgress}
          </button>
        </div>
      </div>
    );
  }

  if (!activePrompt) {
    return null;
  }

  const progressPercent = ((currentIndex) / prompts.length) * 100;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 pb-20 flex flex-col items-center justify-between min-h-[80vh]">
      {/* Top progress bar */}
      <div className="w-full">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-brand-300">
            <Sparkles className="w-4 h-4" /> Calibration Warm-Up
          </span>
          <span>
            {currentIndex + 1} / {prompts.length}
          </span>
        </div>
        <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-brand-500 to-indigo-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Math Prompt Display */}
      <div className="my-auto text-center">
        <div className="text-6xl sm:text-7xl font-black text-white font-mono tracking-tight drop-shadow-md py-4">
          {activePrompt.display}
        </div>
        <div className="text-xs text-slate-500 font-medium">Answer naturally — no timer shown</div>
      </div>

      {/* Answer Input & Numpad */}
      <div className="w-full">
        <AnswerInput showNumpad={true} />
      </div>
    </div>
  );
};

import React from 'react';
import { Zap, Gamepad2, Grid, Table, Trophy, Sparkles, Flame, Clock, Award, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useMasteryStore } from '../../store/useMasteryStore';
import { strings } from '../../strings/en';

export const HomeScreen: React.FC = () => {
  const { setScreen } = useAppStore();
  const { streakDays, dueTodayCount, automaticCount, isCalibrated, totalAttempts } = useMasteryStore();

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Calibration Banner (if first time or uncalibrated) */}
      {!isCalibrated && totalAttempts === 0 && (
        <div className="relative overflow-hidden p-5 rounded-3xl bg-gradient-to-r from-indigo-900/80 via-brand-900/70 to-purple-900/80 border border-brand-500/50 shadow-xl">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-black text-white">First Time Warm-Up</h2>
              </div>
              <p className="text-sm text-indigo-200/90">{strings.home.calibrationPrompt}</p>
            </div>
            <button
              onClick={() => setScreen('calibration')}
              className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-sm flex items-center gap-1.5 shadow-lg shadow-amber-500/30 transition-all whitespace-nowrap"
            >
              {strings.home.startCalibration} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hero Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {/* Streak */}
        <div className="p-4 rounded-3xl bg-surface border border-slate-800/80 shadow-md flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-2">
            <Flame className="w-6 h-6 fill-amber-400/20" />
          </div>
          <span className="text-2xl font-black font-mono text-slate-100">{streakDays}</span>
          <span className="text-[11px] font-semibold text-slate-400">{strings.home.streak}</span>
        </div>

        {/* Due Facts */}
        <div className="p-4 rounded-3xl bg-surface border border-slate-800/80 shadow-md flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400 mb-2">
            <Clock className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black font-mono text-slate-100">{dueTodayCount}</span>
          <span className="text-[11px] font-semibold text-slate-400">{strings.home.dueToday}</span>
        </div>

        {/* Automatic Recall */}
        <div className="p-4 rounded-3xl bg-surface border border-slate-800/80 shadow-md flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
            <Award className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black font-mono text-slate-100">{automaticCount}<span className="text-xs text-slate-500 font-normal">/55</span></span>
          <span className="text-[11px] font-semibold text-slate-400">{strings.home.automaticCount}</span>
        </div>
      </div>

      {/* Main Entry Points */}
      <div className="space-y-3.5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          {strings.home.quickStart}
        </h3>

        {/* 1. Practice (Primary Drill) */}
        <button
          onClick={() => setScreen('practice')}
          className="w-full text-left p-5 rounded-3xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 active:scale-[0.98] text-white shadow-xl shadow-brand-600/20 border border-brand-400/30 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Zap className="w-7 h-7 fill-white" />
            </div>
            <div>
              <h4 className="text-xl font-black">{strings.nav.practice}</h4>
              <p className="text-xs text-indigo-100/80 mt-0.5">{strings.home.practiceDesc}</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <ArrowRight className="w-5 h-5 text-white" />
          </div>
        </button>

        {/* 2. Arcade Mode */}
        <button
          onClick={() => setScreen('arcade')}
          className="w-full text-left p-5 rounded-3xl bg-surface hover:bg-surface-elevated active:scale-[0.98] text-slate-100 shadow-md border border-slate-700/60 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-extrabold text-white">{strings.nav.arcade}</h4>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                  Game
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{strings.home.arcadeDesc}</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:translate-x-1 transition-all">
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>

        {/* Secondary Modes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Progress 10x10 Matrix */}
          <button
            onClick={() => setScreen('progress')}
            className="text-left p-4 rounded-3xl bg-surface hover:bg-surface-elevated active:scale-95 text-slate-100 shadow-sm border border-slate-800 transition-all flex sm:flex-col justify-between items-center sm:items-start gap-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-white">{strings.nav.progress}</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">10×10 matrix</p>
            </div>
          </button>

          {/* Table Focus */}
          <button
            onClick={() => setScreen('tables')}
            className="text-left p-4 rounded-3xl bg-surface hover:bg-surface-elevated active:scale-95 text-slate-100 shadow-sm border border-slate-800 transition-all flex sm:flex-col justify-between items-center sm:items-start gap-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-sky-500/15 flex items-center justify-center text-sky-400">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-white">{strings.nav.tables}</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Drill 1–10 tables</p>
            </div>
          </button>

          {/* Boss Run */}
          <button
            onClick={() => setScreen('boss')}
            className="text-left p-4 rounded-3xl bg-surface hover:bg-surface-elevated active:scale-95 text-slate-100 shadow-sm border border-slate-800 transition-all flex sm:flex-col justify-between items-center sm:items-start gap-2"
          >
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 flex items-center justify-center text-purple-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h5 className="font-bold text-sm text-white">{strings.nav.boss}</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Speed trial & skins</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  Upload,
  Check,
  Lock,
  Zap,
  Sparkles,
  Gamepad2,
  SlidersHorizontal,
  Play,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useMasteryStore } from '../../store/useMasteryStore';
import { repository } from '../../data/repository';
import { strings } from '../../strings/en';
import { OperationMode } from '../../core/types';

export const SettingsScreen: React.FC = () => {
  const {
    soundEnabled,
    setSoundEnabled,
    activeSkinId,
    setActiveSkinId,
    gameSpeed,
    setGameSpeed,
    operationMode,
    setOperationMode,
    setScreen
  } = useAppStore();
  const { rebuildAll, unlocks, solidCount } = useMasteryStore();

  const [message, setMessage] = useState<string | null>(null);
  const [showDevTools, setShowDevTools] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRebuild = async () => {
    await rebuildAll();
    showToast(strings.settings.rebuildSuccess);
  };

  const handleExport = async () => {
    const json = await repository.exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ten-by-ten-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonStr = event.target?.result as string;
        await repository.importJson(jsonStr);
        await rebuildAll();
        showToast(strings.settings.importSuccess);
      } catch (err) {
        showToast('Failed to import backup file.');
      }
    };
    reader.readAsText(file);
  };

  const speedOptions = [
    { value: 0.7, label: '0.7× Relaxed', tag: 'Beginner', desc: 'Slower falling speed and longer intervals — great for practicing accuracy.' },
    { value: 1.0, label: '1.0× Normal', tag: 'Balanced', desc: 'Standard balanced arcade pace.' },
    { value: 1.3, label: '1.3× Fast', tag: 'Challenging', desc: 'Brisk pace for sharpening quick reflexes.' },
    { value: 1.6, label: '1.6× Turbo', tag: 'Expert', desc: 'Maximum speed challenge for expert mental recall.' }
  ];

  const operationOptions: { mode: OperationMode; label: string; formula: string; desc: string; badge: string }[] = [
    {
      mode: 'both',
      label: 'Both Operations',
      formula: '7 × 8 = 56 & 56 ÷ 7 = 8',
      desc: 'Interleaved multiplication and division for true arithmetic automaticity.',
      badge: 'Recommended'
    },
    {
      mode: 'mul',
      label: 'Multiplication Only',
      formula: 'e.g. 6 × 7 = 42, 9 × 8 = 72',
      desc: 'Focus solely on times tables multiplication facts (1–10).',
      badge: 'Tables (×)'
    },
    {
      mode: 'div',
      label: 'Division Only',
      formula: 'e.g. 42 ÷ 6 = 7, 72 ÷ 9 = 8',
      desc: 'Focus on dividends and quotient division facts (1–10).',
      badge: 'Division (÷)'
    }
  ];

  const skinsList = [
    {
      id: 'star_patrol',
      name: strings.skins.star_patrol.name,
      theme: 'Deep Space Theme',
      desc: strings.skins.star_patrol.desc,
      unlocked: true,
      condition: strings.skins.star_patrol.unlocked
    },
    {
      id: 'reef_guard',
      name: strings.skins.reef_guard.name,
      theme: 'Ocean Reef Theme',
      desc: strings.skins.reef_guard.desc,
      unlocked: unlocks.has('reef_guard') || solidCount >= 30,
      condition: strings.skins.reef_guard.unlocked
    },
    {
      id: 'bone_valley',
      name: strings.skins.bone_valley.name,
      theme: 'Prehistoric Valley',
      desc: strings.skins.bone_valley.desc,
      unlocked: unlocks.has('bone_valley') || solidCount >= 60,
      condition: strings.skins.bone_valley.unlocked
    }
  ];

  const activeSkin = skinsList.find(s => s.id === activeSkinId) || skinsList[0];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-5 pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Call to action */}
      <div className="relative overflow-hidden p-6 rounded-3xl bg-gradient-to-br from-brand-950 via-slate-900 to-indigo-950 border border-brand-500/30 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-bold font-mono">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Pre-Game Setup
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Configure & Play
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md">
              Choose your math mode, game speed, and world theme before launching into Arcade Defense.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setScreen('arcade')}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/30 transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Launch Arcade</span>
          </button>
        </div>

        {/* Current Configuration Quick Summary Badge */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="font-semibold text-slate-400">Current Setup:</span>
          <span className="px-2.5 py-0.5 rounded-lg bg-surface-elevated font-mono font-bold text-brand-300 border border-slate-700/60">
            {operationMode === 'mul' ? 'Multiplication (×)' : operationMode === 'div' ? 'Division (÷)' : 'Both (× & ÷)'}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-surface-elevated font-mono font-bold text-amber-300 border border-slate-700/60">
            {gameSpeed.toFixed(1)}× Speed
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-surface-elevated font-bold text-slate-200 border border-slate-700/60">
            World: {activeSkin.name}
          </span>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" /> {message}
        </div>
      )}

      {/* 1. Math Operations Config */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/20 text-brand-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">1. Math Operations</h3>
              <p className="text-xs text-slate-400">Select which math facts to generate in the game</p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {operationOptions.map(opt => {
            const isSelected = operationMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setOperationMode(opt.mode);
                  showToast(`Math mode set to: ${opt.label}`);
                }}
                className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-brand-950/80 border-brand-500 shadow-md shadow-brand-500/20 scale-[1.01]'
                    : 'bg-surface-elevated/70 border-slate-700/60 hover:border-slate-500 hover:bg-surface-elevated'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-white">{opt.label}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-brand-500/30 text-brand-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {opt.badge}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-300">{opt.formula}</div>
                  <p className="text-[11px] text-slate-400">{opt.desc}</p>
                </div>
                {isSelected && (
                  <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white shrink-0 ml-3 shadow-md shadow-brand-500/40">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Game Speed Config */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">2. Game Speed</h3>
              <p className="text-xs text-slate-400">Control descending speed and reaction window</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/30">
            {gameSpeed.toFixed(1)}× Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {speedOptions.map(opt => {
            const isSelected = Math.abs(gameSpeed - opt.value) < 0.05;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setGameSpeed(opt.value);
                  showToast(`Game speed set to ${opt.label}`);
                }}
                className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/20 scale-[1.01]'
                    : 'bg-surface-elevated/70 border-slate-700/60 hover:border-slate-500 hover:bg-surface-elevated'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-extrabold text-sm text-white">{opt.label}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">({opt.tag})</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Arcade Skins / Worlds */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4 shadow-md">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">3. Arcade World</h3>
              <p className="text-xs text-slate-400">Select visuals and theme environment</p>
            </div>
          </div>
          <span className="text-xs text-brand-400 font-mono font-bold">Solid Facts: {solidCount}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {skinsList.map(skin => {
            const isSelected = activeSkinId === skin.id;

            return (
              <button
                key={skin.id}
                disabled={!skin.unlocked}
                onClick={() => {
                  if (skin.unlocked) {
                    setActiveSkinId(skin.id);
                    showToast(`World set to: ${skin.name}`);
                  }
                }}
                className={`p-4 rounded-2xl text-left border transition-all relative ${
                  isSelected
                    ? 'bg-brand-950/70 border-brand-500 shadow-md shadow-brand-500/20'
                    : skin.unlocked
                    ? 'bg-surface-elevated/70 border-slate-700/60 hover:border-slate-500 cursor-pointer'
                    : 'bg-surface-elevated/30 border-slate-800/60 opacity-50 cursor-not-allowed'
                }`}
              >
                {!skin.unlocked && (
                  <div className="absolute top-3 right-3 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-3 right-3 text-brand-400">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{skin.theme}</div>
                <h4 className="font-extrabold text-sm text-white mt-0.5">{skin.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 mb-2 leading-relaxed">{skin.desc}</p>
                <div className="text-[10px] font-mono text-slate-500">{skin.condition}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Audio Preferences */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">4. Sound & Audio</h3>
            <p className="text-xs text-slate-400">{strings.settings.soundDesc}</p>
          </div>
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl transition-all border cursor-pointer ${
              soundEnabled
                ? 'bg-brand-600 text-white border-brand-400/40 shadow-lg shadow-brand-600/30'
                : 'bg-surface-elevated text-slate-400 border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Big Launch Play CTA */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 shadow-2xl text-center space-y-3">
        <h3 className="text-xl font-black text-white">All Configured & Ready?</h3>
        <p className="text-xs text-indigo-100 max-w-md mx-auto">
          Start typing digits to lock onto targets and defend the base with your customized configuration!
        </p>
        <button
          type="button"
          onClick={() => setScreen('arcade')}
          className="w-full py-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-98 text-slate-950 font-black text-base shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>Launch Arcade Defense Now</span>
        </button>
      </div>

      {/* 5. Data & Backup Tools (Toggleable) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowDevTools(!showDevTools)}
          className="w-full py-2.5 px-4 rounded-2xl bg-surface/50 hover:bg-surface border border-slate-800/80 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all flex items-center justify-between cursor-pointer"
        >
          <span>Data Backup & Advanced Tools</span>
          <ChevronRight className={`w-4 h-4 transition-transform ${showDevTools ? 'rotate-90' : ''}`} />
        </button>

        {showDevTools && (
          <div className="mt-3 p-5 rounded-3xl bg-surface border border-slate-800 space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{strings.settings.devTools}</h3>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-elevated/50 rounded-2xl border border-slate-700/40">
                <div>
                  <h4 className="text-sm font-bold text-white">{strings.settings.rebuildLog}</h4>
                  <p className="text-xs text-slate-400">{strings.settings.rebuildLogDesc}</p>
                </div>
                <button
                  onClick={handleRebuild}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Rebuild
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-elevated/50 rounded-2xl border border-slate-700/40">
                <div>
                  <h4 className="text-sm font-bold text-white">{strings.settings.exportData}</h4>
                  <p className="text-xs text-slate-400">Save all attempts and progress to a local JSON file.</p>
                </div>
                <button
                  onClick={handleExport}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-elevated/50 rounded-2xl border border-slate-700/40">
                <div>
                  <h4 className="text-sm font-bold text-white">{strings.settings.importData}</h4>
                  <p className="text-xs text-slate-400">Restore your progress from a previous JSON export.</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

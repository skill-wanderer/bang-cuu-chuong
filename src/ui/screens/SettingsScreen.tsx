import React, { useState, useRef } from 'react';
import { Volume2, VolumeX, RefreshCw, Download, Upload, Check, Lock, Zap, Sparkles } from 'lucide-react';
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
    { value: 0.7, label: '0.7× Relaxed', desc: 'Slower falling speed and longer intervals — great for beginners.' },
    { value: 1.0, label: '1.0× Normal', desc: 'Standard balanced arcade pace.' },
    { value: 1.3, label: '1.3× Fast', desc: 'Brisk pace for sharpening quick reflexes.' },
    { value: 1.6, label: '1.6× Turbo', desc: 'Maximum speed challenge for expert mental recall.' }
  ];

  const operationOptions: { mode: OperationMode; label: string; desc: string; icon: string }[] = [
    { mode: 'both', label: '✖➗ Both Operations', desc: 'Interleaved multiplication and division (Recommended for complete mastery).', icon: '✖➗' },
    { mode: 'mul', label: '✖ Multiplication Only', desc: 'Practice multiplication tables exclusively (e.g. 7 × 8 = 56).', icon: '✖' },
    { mode: 'div', label: '➗ Division Only', desc: 'Practice dividend and division facts exclusively (e.g. 56 ÷ 7 = 8).', icon: '➗' }
  ];

  const skinsList = [
    {
      id: 'star_patrol',
      name: strings.skins.star_patrol.name,
      desc: strings.skins.star_patrol.desc,
      unlocked: true,
      condition: strings.skins.star_patrol.unlocked
    },
    {
      id: 'reef_guard',
      name: strings.skins.reef_guard.name,
      desc: strings.skins.reef_guard.desc,
      unlocked: unlocks.has('reef_guard') || solidCount >= 30,
      condition: strings.skins.reef_guard.unlocked
    },
    {
      id: 'bone_valley',
      name: strings.skins.bone_valley.name,
      desc: strings.skins.bone_valley.desc,
      unlocked: unlocks.has('bone_valley') || solidCount >= 60,
      condition: strings.skins.bone_valley.unlocked
    }
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-28 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-black text-white">{strings.settings.title}</h2>
        <p className="text-xs text-slate-400">Preferences, game speed, math operations, and skins.</p>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4" /> {message}
        </div>
      )}

      {/* Game Speed Config */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Game Speed</h3>
          </div>
          <span className="text-xs font-mono font-bold text-brand-400">{gameSpeed.toFixed(1)}× Active</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                    ? 'bg-brand-950/70 border-brand-500 shadow-md shadow-brand-500/20'
                    : 'bg-surface-elevated/70 border-slate-700/60 hover:border-slate-500 hover:bg-surface-elevated'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-white">{opt.label}</h4>
                  {isSelected && <Check className="w-4 h-4 text-brand-400 stroke-[3]" />}
                </div>
                <p className="text-xs text-slate-400 mt-1">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Math Operations Config */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Math Operations</h3>
          </div>
          <span className="text-xs font-mono font-bold text-brand-400">
            {operationMode === 'mul' ? 'Multiplication (×)' : operationMode === 'div' ? 'Division (÷)' : 'Both (× & ÷)'}
          </span>
        </div>

        <div className="space-y-2">
          {operationOptions.map(opt => {
            const isSelected = operationMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setOperationMode(opt.mode);
                  showToast(`Math mode set to ${opt.label}`);
                }}
                className={`w-full p-3.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-brand-950/70 border-brand-500 shadow-md shadow-brand-500/20'
                    : 'bg-surface-elevated/70 border-slate-700/60 hover:border-slate-500 hover:bg-surface-elevated'
                }`}
              >
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-sm text-white">{opt.label}</h4>
                  <p className="text-xs text-slate-400">{opt.desc}</p>
                </div>
                {isSelected && <Check className="w-5 h-5 text-brand-400 stroke-[3] ml-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Audio & Preferences */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Audio & Preferences</h3>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">{strings.settings.sound}</h4>
            <p className="text-xs text-slate-400">{strings.settings.soundDesc}</p>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-3 rounded-2xl transition-all border ${
              soundEnabled
                ? 'bg-brand-600 text-white border-brand-400/40 shadow-lg shadow-brand-600/30'
                : 'bg-surface-elevated text-slate-400 border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">{strings.settings.rerunCalibration}</h4>
            <p className="text-xs text-slate-400">{strings.settings.rerunCalibrationDesc}</p>
          </div>
          <button
            onClick={() => setScreen('calibration')}
            className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
          >
            Start
          </button>
        </div>
      </div>

      {/* Arcade Skins Picker */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{strings.settings.skinSelect}</h3>
          <span className="text-xs text-brand-400 font-mono font-bold">Solid Facts: {solidCount}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {skinsList.map(skin => {
            const isSelected = activeSkinId === skin.id;

            return (
              <button
                key={skin.id}
                disabled={!skin.unlocked}
                onClick={() => skin.unlocked && setActiveSkinId(skin.id)}
                className={`p-4 rounded-2xl text-left border transition-all relative ${
                  isSelected
                    ? 'bg-brand-950/60 border-brand-500 shadow-md shadow-brand-500/20'
                    : skin.unlocked
                    ? 'bg-surface-elevated/70 border-slate-700/60 hover:border-slate-500'
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
                <h4 className="font-extrabold text-sm text-white">{skin.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 mb-2 leading-relaxed">{skin.desc}</p>
                <div className="text-[10px] font-mono text-slate-500">{skin.condition}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dev Tools & Backup */}
      <div className="p-5 rounded-3xl bg-surface border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">{strings.settings.devTools}</h3>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-surface-elevated/50 rounded-2xl border border-slate-700/40">
            <div>
              <h4 className="text-sm font-bold text-white">{strings.settings.rebuildLog}</h4>
              <p className="text-xs text-slate-400">{strings.settings.rebuildLogDesc}</p>
            </div>
            <button
              onClick={handleRebuild}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto"
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
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto"
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
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

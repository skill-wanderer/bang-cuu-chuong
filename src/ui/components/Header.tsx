import React from 'react';
import { Volume2, VolumeX, Sparkles, Gamepad2, SlidersHorizontal } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Ten by Ten',
  subtitle
}) => {
  const { currentScreen, setScreen, soundEnabled, setSoundEnabled } = useAppStore();

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-background/85 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-md shadow-brand-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>

          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-md">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick tab toggle button */}
          <button
            onClick={() => setScreen(currentScreen === 'arcade' ? 'settings' : 'arcade')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              currentScreen === 'settings'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-surface hover:bg-surface-elevated border-slate-700/60 text-slate-300 hover:text-white'
            }`}
          >
            {currentScreen === 'arcade' ? (
              <>
                <SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />
                <span className="hidden xs:inline">⚙ Config</span>
              </>
            ) : (
              <>
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>▶ Play Arcade</span>
              </>
            )}
          </button>

          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
            className={`p-2 rounded-xl transition-all border cursor-pointer ${
              soundEnabled
                ? 'bg-surface hover:bg-surface-elevated text-brand-400 border-slate-700/50 shadow-sm'
                : 'bg-surface/50 text-slate-500 border-transparent'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>
    </header>
  );
};

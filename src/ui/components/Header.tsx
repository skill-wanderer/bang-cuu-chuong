import React from 'react';
import { ArrowLeft, Volume2, VolumeX, Settings, Sparkles } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSettings?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Ten by Ten',
  subtitle,
  showBack = false,
  showSettings = false
}) => {
  const { currentScreen, setScreen, soundEnabled, setSoundEnabled } = useAppStore();

  const handleBack = () => {
    setScreen('home');
  };

  const toggleSound = () => {
    setSoundEnabled(!soundEnabled);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && currentScreen !== 'home' ? (
            <button
              onClick={handleBack}
              aria-label="Go back"
              className="p-2 rounded-xl bg-surface hover:bg-surface-elevated text-slate-300 hover:text-white transition-colors border border-slate-700/50"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          )}

          <div>
            <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
              {title}
            </h1>
            {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
            className={`p-2 rounded-xl transition-all border ${
              soundEnabled
                ? 'bg-surface hover:bg-surface-elevated text-brand-400 border-slate-700/50'
                : 'bg-surface/50 text-slate-500 border-transparent'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {showSettings && currentScreen !== 'settings' && (
            <button
              onClick={() => setScreen('settings')}
              aria-label="Settings"
              className="p-2 rounded-xl bg-surface hover:bg-surface-elevated text-slate-300 hover:text-white transition-colors border border-slate-700/50"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

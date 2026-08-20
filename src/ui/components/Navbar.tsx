import React from 'react';
import { Home, Zap, Gamepad2, Grid, Table, Trophy } from 'lucide-react';
import { ScreenName, useAppStore } from '../../store/useAppStore';

export const Navbar: React.FC = () => {
  const { currentScreen, setScreen } = useAppStore();

  const navItems: { screen: ScreenName; label: string; icon: React.ReactNode }[] = [
    { screen: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { screen: 'practice', label: 'Practice', icon: <Zap className="w-5 h-5" /> },
    { screen: 'arcade', label: 'Arcade', icon: <Gamepad2 className="w-5 h-5" /> },
    { screen: 'progress', label: 'Grid', icon: <Grid className="w-5 h-5" /> },
    { screen: 'tables', label: 'Tables', icon: <Table className="w-5 h-5" /> },
    { screen: 'boss', label: 'Boss', icon: <Trophy className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map(item => {
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setScreen(item.screen)}
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-brand-400 font-bold scale-105 bg-brand-500/10'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              {item.icon}
              <span className="text-[11px] mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

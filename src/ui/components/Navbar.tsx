import React from 'react';
import { Gamepad2, SlidersHorizontal } from 'lucide-react';
import { ScreenName, useAppStore } from '../../store/useAppStore';

export const Navbar: React.FC = () => {
  const { currentScreen, setScreen } = useAppStore();

  const navItems: { screen: ScreenName; label: string; icon: React.ReactNode }[] = [
    { screen: 'settings', label: 'Config', icon: <SlidersHorizontal className="w-5 h-5" /> },
    { screen: 'arcade', label: 'Arcade', icon: <Gamepad2 className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/90 backdrop-blur-lg border-t border-slate-800/80 px-4 py-2 safe-area-bottom">
      <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
        {navItems.map(item => {
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.screen}
              onClick={() => setScreen(item.screen)}
              className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl font-bold transition-all cursor-pointer ${
                isActive
                  ? 'text-white bg-gradient-to-r from-brand-600 to-indigo-600 shadow-lg shadow-brand-500/25 scale-[1.02]'
                  : 'text-slate-400 bg-surface/60 hover:text-slate-200 hover:bg-surface-elevated active:scale-98'
              }`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

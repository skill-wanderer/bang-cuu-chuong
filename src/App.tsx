import React, { useEffect } from 'react';
import { Header } from './ui/components/Header';
import { Navbar } from './ui/components/Navbar';
import { ArcadeScreen } from './ui/screens/ArcadeScreen';
import { SettingsScreen } from './ui/screens/SettingsScreen';
import { OperationMode } from './core/types';
import { ScreenName, useAppStore } from './store/useAppStore';
import { useMasteryStore } from './store/useMasteryStore';
import { repository } from './data/repository';

const screenInfo: Record<ScreenName, { title: string; subtitle: string }> = {
  settings: { title: 'Game Configuration', subtitle: 'Customize speed, math mode & world before playing' },
  arcade: { title: 'Arcade Defense', subtitle: 'Defend the base with fast mental math!' },
  home: { title: 'Ten by Ten', subtitle: 'Turn times tables into automatic reflexes.' },
  practice: { title: 'Daily Practice', subtitle: 'Focused silent drills to build speed' },
  progress: { title: 'Mastery Matrix', subtitle: '10×10 Grid of Fact Strength' },
  tables: { title: 'Table Focus', subtitle: 'Drill a specific 1–10 table' },
  boss: { title: 'Boss Run', subtitle: 'Beat the speed bar to unlock worlds' },
  calibration: { title: 'Warm-Up', subtitle: 'Quick calibration profile' }
};

export const App: React.FC = () => {
  const { currentScreen, setSoundEnabled, setActiveSkinId, setGameSpeed, setOperationMode } = useAppStore();
  const { loadAll } = useMasteryStore();

  useEffect(() => {
    // Load stored settings and mastery records
    const init = async () => {
      const soundSetting = await repository.getSetting<boolean>('soundEnabled', true);
      const skinSetting = await repository.getSetting<string>('activeSkinId', 'star_patrol');
      const speedSetting = await repository.getSetting<number>('gameSpeed', 1.0);
      const opSetting = await repository.getSetting<OperationMode>('operationMode', 'both');
      setSoundEnabled(soundSetting);
      setActiveSkinId(skinSetting);
      setGameSpeed(speedSetting);
      setOperationMode(opSetting);
      await loadAll();
    };
    init();
  }, [loadAll, setSoundEnabled, setActiveSkinId, setGameSpeed, setOperationMode]);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'settings':
        return <SettingsScreen />;
      case 'arcade':
      default:
        return <ArcadeScreen />;
    }
  };

  const currentInfo = screenInfo[currentScreen] || screenInfo.settings;

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans selection:bg-brand-500 selection:text-white pb-20">
      <Header
        title={currentInfo.title}
        subtitle={currentInfo.subtitle}
      />

      <main className="flex-1 w-full max-w-4xl mx-auto flex flex-col justify-start">
        {renderScreen()}
      </main>

      <Navbar />
    </div>
  );
};

export default App;

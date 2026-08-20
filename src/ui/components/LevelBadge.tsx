import React from 'react';
import { MasteryLevel } from '../../core/types';

interface LevelBadgeProps {
  level: MasteryLevel;
  className?: string;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, className = '' }) => {
  const configs: Record<MasteryLevel, { label: string; bg: string; text: string; dot: string }> = {
    unseen: {
      label: 'Unseen',
      bg: 'bg-slate-800/80 border-slate-700',
      text: 'text-slate-400',
      dot: 'bg-slate-500'
    },
    shaky: {
      label: 'Shaky',
      bg: 'bg-sky-950/70 border-sky-600/40',
      text: 'text-sky-300',
      dot: 'bg-sky-400'
    },
    getting_there: {
      label: 'Getting There',
      bg: 'bg-indigo-950/70 border-indigo-500/40',
      text: 'text-indigo-300',
      dot: 'bg-indigo-400'
    },
    solid: {
      label: 'Solid',
      bg: 'bg-amber-950/70 border-amber-500/40',
      text: 'text-amber-300',
      dot: 'bg-amber-400'
    },
    automatic: {
      label: 'Automatic',
      bg: 'bg-emerald-950/80 border-emerald-500/50 shadow-sm shadow-emerald-500/20',
      text: 'text-emerald-300 font-bold',
      dot: 'bg-emerald-400 animate-pulse'
    }
  };

  const config = configs[level] || configs.unseen;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

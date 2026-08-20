import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

const LazyArcadeContainer = lazy(() =>
  import('../../games/engine/ArcadeContainer').then(mod => ({ default: mod.ArcadeContainer }))
);

export const ArcadeScreen: React.FC = () => {
  return (
    <div className="w-full px-2 py-4 animate-in fade-in duration-300">
      <Suspense
        fallback={
          <div className="w-full h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            <p className="text-xs font-semibold">Loading Arcade Engine...</p>
          </div>
        }
      >
        <LazyArcadeContainer />
      </Suspense>
    </div>
  );
};

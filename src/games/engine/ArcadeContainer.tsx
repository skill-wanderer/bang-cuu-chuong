import React, { useEffect, useRef, useState } from 'react';
import * as Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { arcadeBridge, ArcadeResults } from '../bridge';
import { useMasteryStore } from '../../store/useMasteryStore';
import { useAppStore } from '../../store/useAppStore';
import { repository } from '../../data/repository';
import { strings } from '../../strings/en';
import { Shield, Flame, RotateCcw, Trophy, Delete, Crown, Target, Zap } from 'lucide-react';
import { fireConfetti } from '../../ui/components/ConfettiEffect';

export const ArcadeContainer: React.FC = () => {
  const { activeSkinId, gameSpeed, operationMode, setGameSpeed, setOperationMode } = useAppStore();
  const { factStateMap, recordAttempt, loadAll } = useMasteryStore();

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const gameSceneRef = useRef<GameScene | null>(null);

  // Keep references to latest values so Phaser callbacks never need to re-bind
  const activeSkinIdRef = useRef(activeSkinId);
  activeSkinIdRef.current = activeSkinId;

  const gameSpeedRef = useRef(gameSpeed);
  gameSpeedRef.current = gameSpeed;

  const operationModeRef = useRef(operationMode);
  operationModeRef.current = operationMode;

  const factStateMapRef = useRef(factStateMap);
  factStateMapRef.current = factStateMap;

  const recordAttemptRef = useRef(recordAttempt);
  recordAttemptRef.current = recordAttempt;

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;

  // Sync speed changes into active scene
  useEffect(() => {
    gameSceneRef.current?.setGameSpeed(gameSpeed);
  }, [gameSpeed]);

  // Sync operation mode changes into active scene
  useEffect(() => {
    gameSceneRef.current?.setOperationMode(operationMode);
  }, [operationMode]);

  // High score tracking (localStorage + Dexie setting)
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('arcade_high_score');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  const [hud, setHud] = useState({
    score: 0,
    combo: 0,
    shields: 3,
    wave: 1,
    lockedPrompt: null as string | null
  });

  const [gameOverResults, setGameOverResults] = useState<(ArcadeResults & { isNewHighScore?: boolean; previousHighScore?: number }) | null>(null);

  // Load persistent high score from repository on mount
  useEffect(() => {
    const loadSavedHighScore = async () => {
      try {
        const repoScore = await repository.getSetting<number>('arcadeHighScore', 0);
        const localScore = (() => {
          try {
            const saved = localStorage.getItem('arcade_high_score');
            return saved ? parseInt(saved, 10) : 0;
          } catch {
            return 0;
          }
        })();
        const best = Math.max(repoScore, localScore);
        setHighScore(best);
        highScoreRef.current = best;
      } catch (e) {
        console.error('Failed to load high score', e);
      }
    };
    loadSavedHighScore();
  }, []);

  // Update high score whenever current score exceeds it
  useEffect(() => {
    if (hud.score > highScore) {
      setHighScore(hud.score);
      highScoreRef.current = hud.score;
      try {
        localStorage.setItem('arcade_high_score', hud.score.toString());
      } catch {}
      repository.setSetting('arcadeHighScore', hud.score).catch(() => {});
    }
  }, [hud.score, highScore]);

  // Set up bridge once
  useEffect(() => {
    arcadeBridge.setBridge({
      onAttempt: async (attempt) => {
        // Record attempt asynchronously without recreating Phaser
        await recordAttemptRef.current(attempt);
      },
      onStateUpdate: (data) => {
        setHud(data);
      },
      onGameOver: (results) => {
        const currentBest = highScoreRef.current;
        const isNewHighScore = results.score > currentBest && results.score > 0;
        const finalHighScore = Math.max(currentBest, results.score);

        if (isNewHighScore) {
          setHighScore(finalHighScore);
          highScoreRef.current = finalHighScore;
          try {
            localStorage.setItem('arcade_high_score', finalHighScore.toString());
          } catch {}
          repository.setSetting('arcadeHighScore', finalHighScore).catch(() => {});
        }

        setGameOverResults({
          ...results,
          isNewHighScore,
          previousHighScore: currentBest
        });

        if (results.survived || isNewHighScore) {
          fireConfetti();
        }

        // Refresh mastery store in background
        loadAllRef.current();
      }
    });

    return () => {
      arcadeBridge.clearBridge();
    };
  }, []);

  // Initialize Phaser canvas ONCE on mount
  useEffect(() => {
    if (!gameContainerRef.current) return;
    if (phaserGameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: gameContainerRef.current,
      width: Math.min(window.innerWidth, 560),
      height: 480,
      transparent: true,
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 }, debug: false }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [GameScene]
    };

    const game = new Phaser.Game(config);
    phaserGameRef.current = game;

    game.events.once('ready', () => {
      const scene = game.scene.getScene('GameScene') as GameScene;
      gameSceneRef.current = scene;
      scene.scene.restart({
        skinId: activeSkinIdRef.current,
        factStateMap: factStateMapRef.current,
        gameSpeed: gameSpeedRef.current,
        operationMode: operationModeRef.current
      });
    });

    return () => {
      game.destroy(true);
      phaserGameRef.current = null;
      gameSceneRef.current = null;
    };
  }, []);

  const restartGame = () => {
    setGameOverResults(null);
    setHud({
      score: 0,
      combo: 0,
      shields: 3,
      wave: 1,
      lockedPrompt: null
    });
    if (gameSceneRef.current) {
      gameSceneRef.current.scene.restart({
        skinId: activeSkinIdRef.current,
        factStateMap: factStateMapRef.current,
        gameSpeed: gameSpeedRef.current,
        operationMode: operationModeRef.current
      });
    }
  };

  const handleTouchDigit = (digit: string) => {
    gameSceneRef.current?.feedDigit(digit);
  };

  const handleTouchBackspace = () => {
    gameSceneRef.current?.feedBackspace();
  };

  const currentDisplayHighScore = Math.max(highScore, hud.score);

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col items-center select-none animate-in fade-in pb-12">
      {/* Top HUD */}
      <div className="w-full px-4 py-2.5 flex items-center justify-between bg-surface/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-md mb-2">
        {/* Shields indicator */}
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 transition-colors ${hud.shields > 1 ? 'text-brand-400' : 'text-rose-500 animate-pulse'}`} />
          <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
              <span
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                  i <= hud.shields
                    ? 'bg-brand-400 shadow-sm shadow-brand-400/60 scale-100'
                    : 'bg-slate-700/60 opacity-30 scale-90'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Center: Combo Pill */}
        {hud.combo > 1 ? (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono font-bold text-xs shadow-sm shadow-amber-500/20 animate-pulse">
            <Flame className="w-3.5 h-3.5 fill-amber-400" /> {hud.combo}× COMBO
          </div>
        ) : (
          <div className="text-[11px] font-semibold text-slate-500 font-mono uppercase tracking-wider">
            Wave {hud.wave}
          </div>
        )}

        {/* Right: High Score & Current Score */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-amber-400/90 font-bold uppercase tracking-wider flex items-center justify-end gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> High
            </div>
            <div className="text-sm font-black font-mono text-amber-300">{currentDisplayHighScore}</div>
          </div>

          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Score</div>
            <div className="text-base font-black font-mono text-slate-100">{hud.score}</div>
          </div>
        </div>
      </div>

      {/* Quick Config Bar: Speed & Operation Mode */}
      <div className="w-full px-3 py-2 bg-surface/90 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-md mb-2 flex flex-wrap items-center justify-between gap-2">
        {/* Speed Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Speed:
          </span>
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
            {[
              { value: 0.7, label: '0.7×', tip: 'Slow' },
              { value: 1.0, label: '1.0×', tip: 'Normal' },
              { value: 1.3, label: '1.3×', tip: 'Fast' },
              { value: 1.6, label: '1.6×', tip: 'Turbo' }
            ].map(s => {
              const isSelected = Math.abs(gameSpeed - s.value) < 0.05;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setGameSpeed(s.value)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/40 scale-105'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  title={`${s.tip} Speed (${s.label})`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Operation Mode Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Mode:
          </span>
          <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-xl border border-slate-800">
            {[
              { mode: 'mul' as const, label: '✖ Multi' },
              { mode: 'div' as const, label: '➗ Div' },
              { mode: 'both' as const, label: '✖➗ Both' }
            ].map(m => {
              const isSelected = operationMode === m.mode;
              return (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => setOperationMode(m.mode)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/40 scale-105'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phaser Canvas Wrapper */}
      <div className="relative w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-black">
        <div ref={gameContainerRef} className="w-full flex justify-center items-center" />

        {/* Lock-on hint overlay */}
        {hud.lockedPrompt && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/60 backdrop-blur-sm text-amber-300 font-mono font-bold text-xs animate-pulse shadow-lg shadow-amber-500/20 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-amber-400" /> Target: {hud.lockedPrompt}
          </div>
        )}
      </div>

      {/* On-Screen Touch Numpad for mobile / mouse play */}
      <div className="w-full max-w-sm grid grid-cols-3 gap-2 p-2 mt-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => handleTouchDigit(num.toString())}
            className="h-12 rounded-xl bg-surface-elevated hover:bg-slate-700 active:bg-brand-600 text-xl font-bold text-slate-100 shadow border border-slate-700/50 flex items-center justify-center active:scale-95 transition-all"
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={handleTouchBackspace}
          aria-label="Clear input"
          className="h-12 rounded-xl bg-surface-elevated hover:bg-rose-950/40 active:bg-rose-900 text-slate-300 hover:text-rose-300 shadow border border-slate-700/50 flex items-center justify-center active:scale-95 transition-all"
        >
          <Delete className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => handleTouchDigit('0')}
          className="h-12 rounded-xl bg-surface-elevated hover:bg-slate-700 active:bg-brand-600 text-xl font-bold text-slate-100 shadow border border-slate-700/50 flex items-center justify-center active:scale-95 transition-all"
        >
          0
        </button>
        <div className="h-12 rounded-xl flex items-center justify-center text-[10px] text-slate-500 font-mono text-center">
          Keyboard: 0-9
        </div>
      </div>

      {/* Game Over Results Modal */}
      {gameOverResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm bg-surface border border-slate-700 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            {/* Header Icon */}
            <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center shadow-lg ${
              gameOverResults.isNewHighScore
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 shadow-amber-500/20'
                : 'bg-brand-500/20 border border-brand-500/40 text-brand-400 shadow-brand-500/10'
            }`}>
              {gameOverResults.isNewHighScore ? (
                <Crown className="w-9 h-9 animate-bounce" />
              ) : (
                <Trophy className="w-9 h-9" />
              )}
            </div>

            <div>
              {gameOverResults.isNewHighScore && (
                <div className="inline-block px-3 py-1 mb-2 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-mono font-black text-xs uppercase tracking-wider animate-pulse">
                  🎉 New High Score! 🎉
                </div>
              )}
              <h3 className="text-2xl font-black text-white">
                {gameOverResults.survived ? strings.arcade.waveCleared : strings.arcade.stationLost}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {gameOverResults.survived
                  ? 'All hostile targets neutralized!'
                  : strings.arcade.stationLostDesc}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-left">
              <div className="p-3 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Final Score</span>
                <div className="text-xl font-black font-mono text-slate-100 mt-0.5">
                  {gameOverResults.score}
                </div>
              </div>

              <div className="p-3 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] font-semibold text-amber-400/90 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" /> High Score
                </span>
                <div className="text-xl font-black font-mono text-amber-300 mt-0.5">
                  {Math.max(highScore, gameOverResults.score)}
                </div>
              </div>

              <div className="p-3 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Best Combo</span>
                <div className="text-xl font-black font-mono text-emerald-400 mt-0.5">
                  {gameOverResults.bestCombo}×
                </div>
              </div>

              <div className="p-3 bg-surface-elevated/70 rounded-2xl border border-slate-700/50">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Accuracy</span>
                <div className="text-xl font-black font-mono text-brand-300 mt-0.5">
                  {Math.round(gameOverResults.accuracy * 100)}%
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
              <button
                type="button"
                onClick={restartGame}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 active:scale-95 text-white font-extrabold text-sm shadow-xl shadow-brand-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> {strings.arcade.playAgain}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

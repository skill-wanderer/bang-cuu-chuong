import { Attempt } from '../core/types';

export interface ArcadeResults {
  score: number;
  wave: number;
  kills: number;
  accuracy: number;
  bestCombo: number;
  fastKills: number;
  survived: boolean;
}

export interface GameBridge {
  onAttempt: (attempt: Attempt) => void;
  onStateUpdate: (data: { score: number; combo: number; shields: number; wave: number; lockedPrompt: string | null }) => void;
  onGameOver: (results: ArcadeResults) => void;
}

class ArcadeBridgeManager {
  private bridge: GameBridge | null = null;

  setBridge(bridge: GameBridge) {
    this.bridge = bridge;
  }

  clearBridge() {
    this.bridge = null;
  }

  recordAttempt(attempt: Attempt) {
    this.bridge?.onAttempt(attempt);
  }

  updateState(data: { score: number; combo: number; shields: number; wave: number; lockedPrompt: string | null }) {
    this.bridge?.onStateUpdate(data);
  }

  gameOver(results: ArcadeResults) {
    this.bridge?.onGameOver(results);
  }
}

export const arcadeBridge = new ArcadeBridgeManager();

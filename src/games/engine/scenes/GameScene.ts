import * as Phaser from 'phaser';
import { Prompt, Attempt, FactState, OperationMode } from '../../../core/types';
import { getNextPrompt } from '../../../core/scheduler';
import { getSkin } from '../../skins/manifests';
import { SkinManifest } from '../../skins/types';
import { arcadeBridge } from '../../bridge';
import { soundBus } from '../../../audio/soundBus';

interface ActiveEntity {
  id: string;
  prompt: Prompt;
  container: Phaser.GameObjects.Container;
  spawnTime: number;
  firstKeyTime: number | null;
  speed: number;
  expectedStr: string;
}

export class GameScene extends Phaser.Scene {
  private skin!: SkinManifest;
  private factStateMap!: Map<string, FactState>;
  private history: Prompt[] = [];

  private entities: ActiveEntity[] = [];
  private lockedEntity: ActiveEntity | null = null;
  private inputBuffer: string = '';

  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private shields: number = 3;
  private wave: number = 1;
  private waveSpawnCount: number = 0;
  private readonly WAVE_TOTAL = 12;

  private baseSpeedSetting: number = 1.0;
  private operationMode: OperationMode = 'both';
  private speedMultiplier: number = 1.0;
  private rollingResults: boolean[] = [];
  private isSpawningPaused: boolean = false;
  private isGameOver: boolean = false;

  private spawnTimer!: Phaser.Time.TimerEvent;
  private baseLineY!: number;
  private sessionId!: string;

  constructor() {
    super('GameScene');
  }

  init(data: {
    skinId?: string;
    factStateMap?: Map<string, FactState>;
    gameSpeed?: number;
    operationMode?: OperationMode;
  }) {
    this.skin = getSkin(data.skinId || 'star_patrol');
    this.factStateMap = data.factStateMap || new Map();
    this.baseSpeedSetting = data.gameSpeed ?? 1.0;
    this.operationMode = data.operationMode ?? 'both';
    this.sessionId = `arcade_${Date.now()}`;
    this.history = [];
    this.entities = [];
    this.lockedEntity = null;
    this.inputBuffer = '';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.shields = 3;
    this.wave = 1;
    this.waveSpawnCount = 0;
    this.speedMultiplier = 1.0;
    this.rollingResults = [];
    this.isSpawningPaused = false;
    this.isGameOver = false;
  }

  public setGameSpeed(speed: number) {
    this.baseSpeedSetting = speed;
    const effectiveSpeed = 38 * this.baseSpeedSetting * this.speedMultiplier;
    for (const e of this.entities) {
      e.speed = effectiveSpeed;
    }
  }

  public setOperationMode(mode: OperationMode) {
    this.operationMode = mode;
  }

  create() {
    const { width, height } = this.scale;
    this.baseLineY = height - 120;

    // 1. Draw dynamic background
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      Phaser.Display.Color.HexStringToColor(this.skin.theme.bgGradient[0]).color,
      Phaser.Display.Color.HexStringToColor(this.skin.theme.bgGradient[0]).color,
      Phaser.Display.Color.HexStringToColor(this.skin.theme.bgGradient[1]).color,
      Phaser.Display.Color.HexStringToColor(this.skin.theme.bgGradient[1]).color,
      1
    );
    bg.fillRect(0, 0, width, height);

    // Subtle starfield or particle ambient
    for (let i = 0; i < 30; i++) {
      const star = this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.FloatBetween(1, 2.5),
        Phaser.Display.Color.HexStringToColor(this.skin.theme.baseColor).color,
        Phaser.Math.FloatBetween(0.2, 0.7)
      );
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.8 },
        duration: Phaser.Math.Between(1500, 3000),
        yoyo: true,
        repeat: -1
      });
    }

    // 2. Base Defense Line
    const baseGfx = this.add.graphics();
    baseGfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.skin.theme.baseColor).color, 0.8);
    baseGfx.lineBetween(0, this.baseLineY, width, this.baseLineY);

    const baseFill = this.add.graphics();
    baseFill.fillStyle(Phaser.Display.Color.HexStringToColor(this.skin.theme.baseColor).color, 0.08);
    baseFill.fillRect(0, this.baseLineY, width, height - this.baseLineY);

    // Base Station label
    this.add.text(width / 2, this.baseLineY + 20, this.skin.theme.baseName.toUpperCase(), {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      color: this.skin.theme.baseColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // 3. Setup Keyboard listener
    this.input.keyboard?.off('keydown', this.handleKeyDown, this);
    this.input.keyboard?.on('keydown', this.handleKeyDown, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown', this.handleKeyDown, this);
      if (this.spawnTimer) {
        this.spawnTimer.destroy();
      }
    });

    // 4. Spawner timer (adjusts interval based on speed)
    this.scheduleNextSpawn();

    this.syncBridge();
  }

  private scheduleNextSpawn() {
    if (this.isGameOver) return;
    const effectiveSpeed = this.baseSpeedSetting * this.speedMultiplier;
    const baseInterval = 3200;
    const interval = Math.max(1000, baseInterval / effectiveSpeed);

    this.spawnTimer = this.time.delayedCall(interval, () => {
      this.spawnEntity();
      this.scheduleNextSpawn();
    });
  }

  private spawnEntity() {
    if (this.isGameOver || this.isSpawningPaused) return;
    if (this.entities.length >= 4) return;
    if (this.waveSpawnCount >= this.WAVE_TOTAL) return;

    // Spawner constraint: pick a prompt whose answer first digit is not already on screen
    const existingFirstDigits = new Set(this.entities.map(e => e.expectedStr[0]));

    let candidatePrompt = getNextPrompt(this.factStateMap, this.history, { operationMode: this.operationMode });
    let candidateExpectedStr = candidatePrompt.expected.toString();

    // If collision on first digit, retry up to 10 times to find distinct initial digit
    for (let tryCount = 0; tryCount < 10; tryCount++) {
      if (!existingFirstDigits.has(candidateExpectedStr[0])) {
        break;
      }
      candidatePrompt = getNextPrompt(this.factStateMap, this.history, { operationMode: this.operationMode });
      candidateExpectedStr = candidatePrompt.expected.toString();
    }

    this.history.push(candidatePrompt);
    this.waveSpawnCount++;

    // Compute spawn position
    const { width } = this.scale;
    const padding = 70;
    const spawnX = Phaser.Math.Between(padding, width - padding);
    const spawnY = -40;

    // Create visual entity container
    const container = this.add.container(spawnX, spawnY);

    const bgGfx = this.add.graphics();
    bgGfx.fillStyle(Phaser.Display.Color.HexStringToColor(this.skin.theme.entityBg).color, 0.95);
    bgGfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.skin.theme.entityBorder).color, 1);
    bgGfx.fillRoundedRect(-55, -24, 110, 48, 14);
    bgGfx.strokeRoundedRect(-55, -24, 110, 48, 14);
    container.add(bgGfx);

    const text = this.add.text(0, 0, candidatePrompt.display, {
      fontFamily: 'Outfit, monospace, sans-serif',
      fontSize: '18px',
      color: this.skin.theme.entityTextColor,
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(text);

    // Base speed: around 38 px/sec scaled by difficulty and user speed config
    const speed = 38 * this.baseSpeedSetting * this.speedMultiplier;

    const entity: ActiveEntity = {
      id: `ent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      prompt: candidatePrompt,
      container,
      spawnTime: Date.now(),
      firstKeyTime: null,
      speed,
      expectedStr: candidateExpectedStr
    };

    this.entities.push(entity);
  }

  update(_time: number, delta: number) {
    if (this.isGameOver || this.isSpawningPaused) return;

    const deltaSec = delta / 1000;

    // Move entities downward
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const entity = this.entities[i];
      entity.container.y += entity.speed * deltaSec;

      // Check if crossed defense line
      if (entity.container.y >= this.baseLineY) {
        this.handleEntityReachedBase(entity);
      }
    }

    // Check if wave is cleared
    if (this.waveSpawnCount >= this.WAVE_TOTAL && this.entities.length === 0 && !this.isGameOver) {
      this.handleWaveClear();
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.isGameOver || this.isSpawningPaused) return;

    const key = event.key;

    if (key >= '0' && key <= '9') {
      this.processDigitInput(key);
    } else if (key === 'Backspace' || key === 'Escape') {
      this.clearLockAndBuffer();
    }
  }

  // Public method so touch numpad in UI can feed digits
  public feedDigit(digit: string) {
    if (this.isGameOver || this.isSpawningPaused) return;
    this.processDigitInput(digit);
  }

  public feedBackspace() {
    this.clearLockAndBuffer();
  }

  private processDigitInput(digit: string) {
    const now = Date.now();

    if (!this.lockedEntity) {
      // Step 2: Lock onto lowest matching entity
      const matching = this.entities
        .filter(e => e.expectedStr.startsWith(digit))
        .sort((a, b) => b.container.y - a.container.y); // Lowest (highest Y) first

      if (matching.length > 0) {
        this.lockedEntity = matching[0];
        this.lockedEntity.firstKeyTime = now;
        this.inputBuffer = digit;
        this.highlightLockedEntity(this.lockedEntity);
        soundBus.play('lock');
        this.checkMatchComplete(this.lockedEntity);
      } else {
        // Step 4: No match => Flash buffer
        soundBus.play('click');
      }
    } else {
      // Step 3: Locked entity continues matching
      const targetStr = this.lockedEntity.expectedStr;
      const nextBuffer = this.inputBuffer + digit;

      if (targetStr.startsWith(nextBuffer)) {
        this.inputBuffer = nextBuffer;
        soundBus.play('laser');
        this.checkMatchComplete(this.lockedEntity);
      } else {
        // Mistype: reset lock
        this.clearLockAndBuffer();
      }
    }

    this.syncBridge();
  }

  private highlightLockedEntity(entity: ActiveEntity) {
    // Redraw border with glowing lock color
    const bgGfx = entity.container.getAt(0) as Phaser.GameObjects.Graphics;
    if (bgGfx) {
      bgGfx.clear();
      bgGfx.fillStyle(Phaser.Display.Color.HexStringToColor(this.skin.theme.entityBg).color, 0.95);
      bgGfx.lineStyle(3, Phaser.Display.Color.HexStringToColor(this.skin.theme.lockBorder).color, 1);
      bgGfx.fillRoundedRect(-55, -24, 110, 48, 14);
      bgGfx.strokeRoundedRect(-55, -24, 110, 48, 14);
    }
  }

  private checkMatchComplete(entity: ActiveEntity) {
    if (this.inputBuffer === entity.expectedStr) {
      this.destroyEntity(entity);
    }
  }

  private destroyEntity(entity: ActiveEntity) {
    const now = Date.now();
    const thinkMs = entity.firstKeyTime ? entity.firstKeyTime - entity.spawnTime : now - entity.spawnTime;
    const totalMs = now - entity.spawnTime;
    const isFast = thinkMs <= 2000;

    // 1. Scoring & Combo
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    let multiplier = 1;
    if (this.combo >= 10) multiplier = 3;
    else if (this.combo >= 5) multiplier = 2;

    const speedBonus = isFast ? 50 : 0;
    const points = (100 * multiplier) + speedBonus;
    this.score += points;

    if (this.combo % 5 === 0) {
      soundBus.play('combo');
    } else {
      soundBus.play('hit');
    }

    // 2. Adjust Difficulty (rolling accuracy target 85%)
    this.updateDifficulty(true);

    // 3. Record attempt into immutable log
    const attempt: Attempt = {
      id: `att_arc_${Date.now()}_${this.history.length}`,
      profileId: 'default',
      sessionId: this.sessionId,
      familyId: entity.prompt.familyId,
      direction: entity.prompt.direction,
      group: entity.prompt.group,
      expected: entity.prompt.expected,
      given: parseInt(entity.expectedStr, 10),
      correct: true,
      thinkMs: Math.max(50, thinkMs),
      totalMs: Math.max(50, totalMs),
      inputMode: 'typed',
      mode: 'arcade',
      skinId: this.skin.id,
      at: now,
      schemaVersion: 1
    };
    arcadeBridge.recordAttempt(attempt);

    // 4. Particle explosion effect
    this.createExplosion(entity.container.x, entity.container.y);

    // 5. Remove entity
    entity.container.destroy();
    this.entities = this.entities.filter(e => e.id !== entity.id);
    this.lockedEntity = null;
    this.inputBuffer = '';

    this.syncBridge();
  }

  private handleEntityReachedBase(entity: ActiveEntity) {
    soundBus.play('shieldLoss');
    this.shields--;
    this.combo = 0; // Shield loss resets combo

    // Screen shake on crash
    this.cameras.main.shake(250, 0.012);

    // Record failed attempt (given: null)
    const attempt: Attempt = {
      id: `att_arc_miss_${Date.now()}`,
      profileId: 'default',
      sessionId: this.sessionId,
      familyId: entity.prompt.familyId,
      direction: entity.prompt.direction,
      group: entity.prompt.group,
      expected: entity.prompt.expected,
      given: null,
      correct: false,
      thinkMs: 5000,
      totalMs: 5000,
      inputMode: 'typed',
      mode: 'arcade',
      skinId: this.skin.id,
      at: Date.now(),
      schemaVersion: 1
    };
    arcadeBridge.recordAttempt(attempt);

    this.updateDifficulty(false);

    // Flash correct answer prominently and pause spawning
    this.isSpawningPaused = true;
    const { width } = this.scale;
    const crashX = Phaser.Math.Clamp(entity.container.x, 145, width - 145);
    const crashY = this.baseLineY - 50;

    const crashBanner = this.add.container(crashX, crashY);

    const bannerGfx = this.add.graphics();
    // Outer glow
    bannerGfx.fillStyle(0xF43F5E, 0.25);
    bannerGfx.fillRoundedRect(-140, -42, 280, 84, 20);
    // Background box
    bannerGfx.fillStyle(0x0F172A, 0.96);
    bannerGfx.lineStyle(3, 0xF43F5E, 1);
    bannerGfx.fillRoundedRect(-135, -38, 270, 76, 16);
    bannerGfx.strokeRoundedRect(-135, -38, 270, 76, 16);
    crashBanner.add(bannerGfx);

    // Header tag
    const tagText = this.add.text(0, -20, '💥 MISSED!', {
      fontFamily: 'Outfit, sans-serif',
      fontSize: '12px',
      color: '#FDA4AF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    crashBanner.add(tagText);

    // Big equation & answer: e.g. "7 × 8 = 56"
    const equationText = this.add.text(0, 10, `${entity.prompt.display} = ${entity.expectedStr}`, {
      fontFamily: 'Outfit, monospace, sans-serif',
      fontSize: '32px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    crashBanner.add(equationText);

    // Pop-in bounce animation
    crashBanner.setScale(0.5);
    this.tweens.add({
      targets: crashBanner,
      scale: 1.0,
      ease: 'Back.easeOut',
      duration: 250
    });

    // Subtle pulsing of equation text
    this.tweens.add({
      targets: equationText,
      scale: { from: 1, to: 1.08 },
      yoyo: true,
      duration: 350,
      repeat: 3
    });

    entity.container.destroy();
    this.entities = this.entities.filter(e => e.id !== entity.id);
    this.clearLockAndBuffer();

    this.time.delayedCall(1600, () => {
      this.tweens.add({
        targets: crashBanner,
        alpha: 0,
        scale: 0.8,
        duration: 200,
        onComplete: () => {
          crashBanner.destroy();
          this.isSpawningPaused = false;

          if (this.shields <= 0) {
            this.endGame(false);
          }
        }
      });
    });

    this.syncBridge();
  }

  private updateDifficulty(wasCorrect: boolean) {
    this.rollingResults.push(wasCorrect);
    if (this.rollingResults.length > 10) {
      this.rollingResults.shift();
    }

    const accuracy = this.rollingResults.filter(Boolean).length / this.rollingResults.length;
    if (accuracy > 0.85) {
      this.speedMultiplier = Math.min(2.2, this.speedMultiplier * 1.10);
    } else if (accuracy < 0.85) {
      this.speedMultiplier = Math.max(0.6, this.speedMultiplier * 0.90);
    }
  }

  private handleWaveClear() {
    soundBus.play('victory');
    this.wave++;
    this.waveSpawnCount = 0;
    this.endGame(true);
  }

  private clearLockAndBuffer() {
    if (this.lockedEntity) {
      // Revert border
      const bgGfx = this.lockedEntity.container.getAt(0) as Phaser.GameObjects.Graphics;
      if (bgGfx) {
        bgGfx.clear();
        bgGfx.fillStyle(Phaser.Display.Color.HexStringToColor(this.skin.theme.entityBg).color, 0.95);
        bgGfx.lineStyle(2, Phaser.Display.Color.HexStringToColor(this.skin.theme.entityBorder).color, 1);
        bgGfx.fillRoundedRect(-55, -24, 110, 48, 14);
        bgGfx.strokeRoundedRect(-55, -24, 110, 48, 14);
      }
    }
    this.lockedEntity = null;
    this.inputBuffer = '';
    this.syncBridge();
  }

  private createExplosion(x: number, y: number) {
    if (!this.textures.exists('spark')) {
      const pGfx = this.add.graphics();
      pGfx.fillStyle(this.skin.theme.particleColor, 1);
      pGfx.fillCircle(4, 4, 4);
      pGfx.generateTexture('spark', 8, 8);
      pGfx.destroy();
    }

    const emitter = this.add.particles(x, y, 'spark', {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      blendMode: 'ADD',
      lifespan: 350,
      quantity: 16
    });

    this.time.delayedCall(400, () => emitter.destroy());
  }

  private endGame(survived: boolean) {
    this.isGameOver = true;
    if (this.spawnTimer) this.spawnTimer.destroy();

    const accuracy = this.rollingResults.length > 0
      ? this.rollingResults.filter(Boolean).length / this.rollingResults.length
      : 1.0;

    arcadeBridge.gameOver({
      score: this.score,
      wave: this.wave,
      kills: this.history.length,
      accuracy,
      bestCombo: this.maxCombo,
      fastKills: 0,
      survived
    });
  }

  private syncBridge() {
    arcadeBridge.updateState({
      score: this.score,
      combo: this.combo,
      shields: this.shields,
      wave: this.wave,
      lockedPrompt: this.lockedEntity ? `${this.lockedEntity.prompt.display} (${this.inputBuffer})` : null
    });
  }
}

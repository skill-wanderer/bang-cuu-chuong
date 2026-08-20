# Ten by Ten — Product & Technical Spec

*Working name; change freely. Repo: `bang-cuu-chuong`.*

A web-first practice app that turns multiplication and division facts from **computed** into **recalled**, wrapped in an arcade game the player actually wants to open.

**Status:** Spec v1, ready for implementation. No code written yet.
**Audience:** the engineer picking this up. Assumes no prior context on the project.

---

## 1. Who this is for

One player: a 9-year-old who already knows his times tables but **works them out** rather than remembering them. He can tell you 7×8 is 56 — after two seconds of visible effort.

That single fact drives the entire design. The goal is not accuracy, which he mostly has. The goal is **latency**. Every algorithm below is speed-aware, and the app measures how long he thinks before he answers, not just whether he was right.

Design constraints that follow:

- **Boring is fatal.** He will abandon a worksheet. The arcade mode is not a reward layer bolted on top; it is a primary practice mode that happens to be fun.
- **Don't re-teach what he knows.** Starting every fact at zero and drilling 2× and 5× would insult him. The app calibrates first (§6).
- **No anxiety mechanics.** No countdown clocks in practice, no buzzer, no losing earned progress. Timing happens silently.

### Non-goals for v1

No accounts, no ads, no social leaderboards, no server, no parent dashboard, no multi-profile UI. All of these are anticipated in the data model (§8) and none are built.

---

## 2. Scope

| | v1 | Later |
|---|---|---|
| Facts | 1–10 (55 families, 200 prompts) | 11–12 as an unlockable expansion |
| Operations | Multiplication **and** division, interleaved from day one | — |
| Language | English only | i18n if ever needed |
| Devices | Phone, tablet, laptop, desktop — equal priority | — |
| Data | Local only, single implicit profile | Multi-profile, cloud sync |

---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Build | Vite + TypeScript | Strict mode on. Code-splitting is required, not optional — see Phaser. |
| UI | React 19 | |
| Styling | Tailwind CSS | |
| State | Zustand | Chosen over Context specifically because Phaser scenes read from it outside the React tree. |
| Storage | Dexie (IndexedDB) | |
| Arcade | Phaser 3 | Lazy-loaded route. ~1MB; must never be in the initial bundle. |
| UI motion | Motion (framer-motion) | Non-game screens only. |
| Audio | Howler.js | One shared sound bus for both React and Phaser. |
| PWA | vite-plugin-pwa | Offline + home-screen install. Treat as a v1 requirement, not a nicety. |
| Tests | Vitest | Core engine only. No component tests in v1. |
| Hosting | Cloudflare Pages | Auto-deploy from `main`. |

### The one hard architectural rule

**`src/core/` imports nothing from React, Phaser, Dexie, or the DOM.** It is pure TypeScript: given a state and an event, return a new state. Everything visual is a skin over it.

This is what lets the quiz screen and three different arcade games share one brain, and what makes the engine testable without a browser. A PR that adds a React import to `src/core/` should be rejected.

```
src/
  core/            pure TS — no framework imports, ever
    facts.ts       the fact universe; families, prompts, difficulty priors
    mastery.ts     attempt -> strength; decay; levels
    scheduler.ts   what to ask next
    session.ts     session lifecycle, scoring, combos
    rng.ts         seeded PRNG (determinism for tests)
  data/
    db.ts          Dexie schema
    repository.ts  ProgressRepository interface + local implementation
    rebuild.ts     fold attempts -> factState
  strings/
    en.ts          every user-facing string
  ui/              React screens, Tailwind
    input/         AnswerInput: numpad + keyboard, one store
  games/
    engine/        Phaser scenes, skin-agnostic
    skins/         data-only skin manifests
    bridge.ts      Zustand <-> Phaser
```

**On strings:** English only, but no user-facing literal goes in a component. All copy lives in `src/strings/en.ts`. This costs nothing now and means adding a language later is a file, not a refactor.

---

## 4. The fact model

A **family** is an unordered pair `(a, b)` where `1 ≤ a ≤ b ≤ 10`. That's **55 families**.

Family id: `${a}x${b}` with `a ≤ b` — e.g. `7x8`. Canonical, so `8×7` and `56÷7` both resolve to `7x8`.

Each family generates up to four **prompts**:

| Direction | Prompt | Answer |
|---|---|---|
| `MUL_AB` | `7 × 8` | 56 |
| `MUL_BA` | `8 × 7` | 56 |
| `DIV_A` | `56 ÷ 7` | 8 |
| `DIV_B` | `56 ÷ 8` | 7 |

Squares (`a === b`) collapse to two prompts. Total: `45 × 4 + 10 × 2 = 200` prompts, matching 100 multiplication facts + 100 division facts.

### Strength is tracked per direction-group, not per prompt

Two strength values per family: **`mul`** and **`div`**. 110 values total.

Rationale: commutativity is understood at this age, so `7×8` and `8×7` are one memory. Division is a genuinely separate retrieval path and consistently the weaker one — it gets its own score and its own scheduling boost (§7).

### Difficulty priors

Used to seed unseen facts so calibration converges fast. Each family gets a prior difficulty `d ∈ [0,1]`:

| Condition | `d` |
|---|---|
| `a` or `b` in {1, 2, 5, 10} | 0.15 |
| `a === b` (squares) | 0.35 |
| both `a` and `b` in {6, 7, 8, 9} | 0.85 |
| everything else | 0.50 |

Seed strength for an unseen family: `initialStrength = 0.75 − 0.5 × d`. Easy facts start at 0.675, the hard core (6×7, 6×8, 7×8, 7×9, 8×9 …) at 0.325.

---

## 5. Mastery model

The heart of the app. Implemented in `core/mastery.ts` as a pure fold over attempts.

### Measure thinking, not typing

`thinkMs` = time from prompt render to **first keypress or tap** — *not* to submission.

This matters. Submission time includes typing, which is motor speed, not recall. First-keystroke latency isolates the retrieval itself, and it is the primary signal this whole app is built on. Log `totalMs` too, but never score on it.

### Attempt quality

```
q(attempt):
  if !correct                    -> 0
  if thinkMs <= 2000             -> 1.0
  if thinkMs <= 5000             -> 1.0 - 0.6 * (thinkMs - 2000) / 3000    // 1.0 down to 0.4
  else                           -> 0.3
```

Under 2s reads as retrieval. Over 5s reads as computing it out — correct, but not the skill we're building, so it earns little credit.

### Strength update

```
alpha  = correct ? 0.30 : 0.50
weight = inputMode === 'typed' ? 1.0 : 0.4
strength = clamp01(strength + alpha * weight * (q - strength))
```

Two deliberate asymmetries:

1. **Misses bite harder than hits heal** (`0.50` vs `0.30`). A fact he just got wrong should come back soon.
2. **Multiple-choice counts for 40% of a typed answer.** Recognition is a weaker form of retrieval than production — he can eliminate by magnitude or last digit without ever recalling the fact. If MC attempts counted fully, a few arcade rounds would mark facts "mastered" that he can't actually produce, and the scheduler would stop showing them. This weight is the safeguard. **Do not remove it.**

### Streak and decay

```
consecutiveGood = count of trailing attempts with q >= 0.7   // reset to 0 on any q < 0.7
halfLifeDays    = min(60, 1.5 * 2^consecutiveGood)
effective       = strength * 0.5^(daysSinceLast / halfLifeDays)
```

A fact answered fast three times running holds for ~12 days before it starts fading; a shaky one fades in under two. **All scheduling and all display use `effective`, never raw `strength`.**

### Levels

Computed from `effective`:

| Level | Condition | Grid colour |
|---|---|---|
| Unseen | no attempts | neutral |
| Shaky | `< 0.45` | cool / pale |
| Getting there | `0.45 – 0.74` | mid |
| Solid | `0.75 – 0.89` | warm |
| Automatic | `≥ 0.90` **and** last 3 attempts all `q ≥ 0.7` | hot / gold |

---

## 6. Calibration (first run)

Before any practice, a one-time **24-prompt calibration**. Framed to the player as a warm-up, not a test — no score shown, no "you got 14/24".

- Stratified sample: every table 1–10 appears at least twice; weighted toward high-`d` families.
- Mixed directions, roughly 60% multiplication / 40% division.
- Typed input only (production, so the readings are clean).
- Logged with `mode: 'calibration'`, updated through the normal mastery pipeline starting from difficulty priors.

Output: a seeded strength map, so his first real session targets 6×7 and 56÷8 instead of 2×3. Re-runnable from Settings.

---

## 7. Scheduler

`core/scheduler.ts`. Given fact state + recent history + a seeded RNG, return the next prompt.

### Urgency

For each (family, direction-group):

```
base       = 1 - effective
dueBoost   = daysSinceLast > halfLifeDays ? 1.30 : 1.0
divBoost   = group === 'div' ? 1.15 : 1.0
errorBoost = 1 + 0.5 * errorRate(last 5 attempts on this group)
urgency    = base * dueBoost * divBoost * errorBoost
```

`divBoost` exists because division is both weaker and, left to itself, under-sampled.

### Selection mix

Weighted sample, **not** strict "always hardest first" — predictable ordering kills engagement and blocked practice retains worse than interleaved.

| Share | Pool | Weight |
|---|---|---|
| 75% | everything | `urgency²` (sharpened) |
| 20% | Solid / Automatic only | `daysSinceLast` — maintenance, and reliable wins |
| 5% | uniform random | variety |

### Hard constraints

Applied after sampling; resample on violation, max 20 tries then relax in listed order.

1. No family repeated within the last **3** prompts.
2. No identical prompt within the last **8**.
3. No more than **2 consecutive** prompts of the same operation (forces interleaving).
4. At most **6 families below "Getting there"** in active rotation at once. Rarely binds for this player; protects against flooding after a long gap.

### Determinism

The scheduler takes an injected seeded RNG (`core/rng.ts`). Same seed + same state ⇒ same sequence. Non-negotiable — it is the only way the tests in §11 can exist.

---

## 8. Data model

### Attempts are the source of truth

Every answer writes one **immutable** record. Nothing is ever updated or deleted.

```ts
interface Attempt {
  id: string;              // uuid
  profileId: string;       // 'default' in v1 — present for later multi-profile
  sessionId: string;
  familyId: string;        // '7x8'
  direction: 'MUL_AB' | 'MUL_BA' | 'DIV_A' | 'DIV_B';
  group: 'mul' | 'div';
  expected: number;
  given: number | null;    // null = timed out / entity reached base
  correct: boolean;
  thinkMs: number;         // prompt render -> first keypress
  totalMs: number;         // prompt render -> submit
  inputMode: 'typed' | 'choice';
  mode: 'calibration' | 'practice' | 'arcade' | 'boss';
  skinId?: string;
  at: number;              // epoch ms
  schemaVersion: 1;
}
```

`factState` is a **derived cache**, rebuildable at any time:

```ts
rebuildFactState(attempts: Attempt[]): Map<string, FactState>
```

This is the most important decision in the data layer. Because mastery is a pure fold over an append-only log:

- Changing the mastery algorithm in three months recomputes his entire history instead of discarding it.
- Multi-profile is just a new `profileId`.
- Cloud sync becomes "push rows where `at > cursor`" — append-only logs sync without conflict resolution.
- You can answer empirically whether arcade-mode practice retains as well as quiz-mode practice, on his real data, because `mode` and `inputMode` are on every row.

Ship a dev-only "Rebuild from log" button. It should be a no-op.

### Dexie schema (v1)

```
profiles:   id, createdAt, displayName
attempts:   id, [profileId+at], familyId, sessionId, mode
factState:  [profileId+familyId], level, effective      // cache
sessions:   id, [profileId+startedAt], mode
unlocks:    [profileId+key]
settings:   key
```

### Repository boundary

All persistence goes through one interface so the eventual Supabase swap touches one file:

```ts
interface ProgressRepository {
  recordAttempt(a: Attempt): Promise<void>;
  getFactState(profileId: string): Promise<Map<string, FactState>>;
  getRecentAttempts(profileId: string, limit: number): Promise<Attempt[]>;
  startSession(s: SessionMeta): Promise<string>;
  endSession(id: string, summary: SessionSummary): Promise<void>;
}
```

No React component and nothing in `core/` touches Dexie directly.

---

## 9. Screens

### 9.1 Home
Current streak (days practised), what's due today, three big entry points: **Practice**, **Arcade**, **Progress**. One tap to start; never more than two taps from launch to first prompt.

### 9.2 Practice (core drill)
Typed answers only. One prompt at a time, large. Numpad on touch, physical keyboard on desktop — both write into the same `AnswerInput` store, and layout is the only thing that branches on device.

- **Explicit submit** (Enter, or ✓ on the numpad). Do *not* auto-submit when the digit count matches — that leaks the answer's length.
- Correct: brief affirmative, next prompt.
- Wrong: soft correction, **show the correct answer for ~1.5s**, requeue the family ~4 prompts later. Never a red X and a buzzer.
- **No visible timer.** Timing is silent.
- Session = 20 prompts or 5 minutes, whichever first, then a results card: facts improved, fastest answer, streak.

### 9.3 Arcade
See §10.

### 9.4 Progress
A **10×10 grid** of all 100 facts, coloured by level, with a mul/div toggle. Filling in the grid is the retention mechanic — kids will drill specifically to turn the last cold cells warm.

Tap a cell for that family's history: strength over time, best time, attempt count.

### 9.5 Table Focus
Drill one table (`the 7s`) end to end, both directions. Useful when school is on a specific table.

### 9.6 Boss Run
Mastery check for one table: 12 prompts, typed, both directions, must clear a latency bar. Clearing unlocks skins and expansion content. This is where multiple-choice results are *not* accepted — bosses are production-only.

### 9.7 Settings
Sound, re-run calibration, skin picker, dev tools (rebuild, export JSON).

---

## 10. Arcade mode

One engine. Multiple skins. Skins are **data, not code** — an implementer adding a fourth skin should write zero game logic.

### The core mechanic: typing *is* firing

Entities descend toward a base, each carrying a **problem** (`7 × 8`). The player types the **answer**. Typing is what fires.

**No multiple choice on screen.** This is the point. Multiple choice lets him eliminate by magnitude or last digit and score well without recalling anything, and showing wrong answers can leave a residue of familiarity for them. Production keeps the retrieval path honest, and it delivers full arcade feel at the same time.

### The attention rule

**Typing is the only control.** No movement, no aiming, no dodging, no second input.

If the player must dodge obstacles while recalling 7×8, the dodging consumes the working memory that should be doing the recall — the game gets harder without the learning getting better. Difficulty scales through *pace*, never through *added simultaneous demands*. Reject any feature request that adds a second thing to do with the hands.

### Loop

1. Entities spawn at intervals and descend.
2. First digit typed **locks on** to the lowest (closest to base) entity whose answer starts with that digit; lock is visibly indicated.
3. Subsequent digits must continue matching. Complete match ⇒ destroyed, combo++.
4. First digit matching nothing ⇒ buffer flashes and clears. No damage.
5. Backspace or Esc clears the buffer and unlocks.
6. Entity reaches the base ⇒ one shield lost, **correct answer flashes for 1.2s** with spawning paused. Logged as an attempt with `given: null`.
7. Wave = 12 entities. Base has 3 shields.

**Spawner constraint:** never spawn an entity whose answer shares a first digit with one already on screen, where the scheduler offers an alternative. Ambiguous lock-on feels broken.

*Accepted tradeoff:* lock-on confirms the first digit was right, which is a small hint. That's immediate feedback, which we want. It stays.

### Difficulty controller

Rolling accuracy over the last 10 entities, targeting **85%**. Above target, descent speed +10%; below, −10%. Clamp to [0.6×, 2.2×] base. Spawn interval follows speed. Never adjust by adding entities beyond 4 on screen.

### Scoring

Combo on consecutive kills: ×2 at 5, ×3 at 10. Kills under 2s earn a speed bonus. Combo resets on a shield loss, **not** on a mistyped first digit.

### Run end

Shields exhausted ⇒ results card. **No "game over" that erases anything.** Every attempt in the run is already recorded and mastery still moves. Losing a run costs nothing but the run.

### Skins

```ts
interface Skin {
  id: string;
  displayName: string;
  atlas: string;          // sprite sheet
  palette: Record<string, string>;
  sfx: Record<SfxKey, string>;
  background: string;
  unlock: UnlockCondition;
}
```

v1 ships three:

| Skin | World | Unlock |
|---|---|---|
| Star Patrol | ships descending toward a station | default |
| Reef Guard | sea creatures drifting toward a reef | 30 facts at Solid+ |
| Bone Valley | dinosaurs approaching a camp | 60 facts at Solid+ |

Letting him choose is itself motivating, and unlocks give the progress grid a second payoff.

---

## 11. Testing

Vitest, `src/core/` only. No component tests in v1.

**`facts.ts`**
- Exactly 55 families; exactly 200 distinct prompts.
- Every prompt's answer is arithmetically correct.
- `8×7`, `7×8`, `56÷7`, `56÷8` all canonicalise to `7x8`.
- Squares yield 2 prompts, not 4.

**`mastery.ts`**
- `q` is monotonically non-increasing in `thinkMs`.
- A correct fast attempt never decreases strength; an incorrect attempt never increases it.
- Strength stays in [0, 1] across 10,000 random attempts.
- 10 typed correct attempts reach Automatic; 10 `choice` attempts with identical timings do **not**.
- Decay: strength after `halfLifeDays` is within ε of half.

**`scheduler.ts`**
- Over 1,000 prompts, constraints 1–3 are never violated.
- Same seed + same state ⇒ identical sequence.
- A family forced to strength 0 appears within the next 10 prompts.
- Direction mix lands within 10 points of the configured target over 500 prompts.

**`rebuild.ts`**
- `rebuildFactState(attempts)` equals the incrementally-maintained state, for a 5,000-attempt random log. This is the guarantee that the log is genuinely the source of truth.

---

## 12. Phases

**P0 — Engine and drill.** `core/` complete and tested, Dexie layer, calibration, Practice screen with dual input, Progress grid, PWA install. *Usable and useful on its own.*

**P1 — Arcade.** Phaser route lazy-loaded, engine + Star Patrol skin, difficulty controller, results card.

**P2 — Motivation.** Reef Guard and Bone Valley, Boss Runs, unlocks, Table Focus, streaks.

**P3 — Expansion.** 11s and 12s, multi-profile UI, then Supabase sync behind the existing repository interface.

Ship P0 before starting P1. A working drill with no game beats a game with no engine.

---

## 13. Decisions worth not re-litigating

These were argued through already; each has a reason that isn't obvious from the code.

1. **`core/` stays framework-free.** It's what makes three game skins share one brain.
2. **`thinkMs` is first-keystroke, not submit.** Submit time measures typing speed.
3. **Multiple-choice attempts weigh 0.4.** Without it, recognition inflates mastery and the scheduler abandons facts he can't actually produce.
4. **Attempts are append-only; mastery is derived.** Buys algorithm changes, multi-profile, sync, and analysis — all later, all cheap.
5. **Arcade uses typed production, never on-screen options.** Recognition is the weaker drill and distractors can stick.
6. **Typing is the only game control.** Anything else spends working memory the recall needs.
7. **No timers in Practice.** Timing is measured silently; visible clocks add anxiety without adding learning.

---

## 14. Open questions

- Does he prefer number-row or numpad on the laptop? Instrument both, decide from data.
- Boss Run latency bar: fixed threshold, or personal-best relative? Start fixed at 2.5s median, revisit.
- Should Practice offer an easy multiple-choice mode at all? Currently no. If added later: 3 options max, options appear ~1.5s *after* the problem so a retrieval attempt happens first, distractors sometimes share the last digit to defeat last-digit shortcuts, and always flash the correct answer on a miss.

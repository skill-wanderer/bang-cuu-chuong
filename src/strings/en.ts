export const strings = {
  app: {
    title: 'Ten by Ten',
    subtitle: 'Fast Math Recall & Arcade Mastery',
    tagline: 'Turn times tables into automatic reflexes.'
  },
  nav: {
    home: 'Home',
    practice: 'Practice',
    arcade: 'Arcade',
    progress: 'Progress',
    tables: 'Tables',
    boss: 'Boss Run',
    settings: 'Settings'
  },
  home: {
    welcome: 'Ready to train?',
    calibrationPrompt: 'Welcome! Take a quick warm-up to customize your training.',
    startCalibration: 'Start Warm-Up',
    streak: 'Day Streak',
    streakKeepGoing: 'Keep your rhythm going today!',
    dueToday: 'Due for Review',
    allGood: 'All caught up! Great job.',
    automaticCount: 'Automatic Facts',
    quickStart: 'Quick Launch',
    practiceDesc: 'Focused silent drills to build speed',
    arcadeDesc: 'Defend the station — typing is firing!',
    progressDesc: 'Explore your 10×10 mastery matrix',
    tableFocusDesc: 'Drill one specific table 1–10',
    bossRunDesc: 'Beat the speed bar to unlock skins'
  },
  calibration: {
    title: 'Calibration Warm-Up',
    subtitle: 'Answer naturally. This helps find what to practice first.',
    progress: 'Question {current} of {total}',
    completeTitle: 'Calibration Complete!',
    completeSubtitle: 'Your personalized times table profile is ready.',
    startPracticing: 'Jump to Practice',
    viewProgress: 'View Mastery Grid'
  },
  practice: {
    title: 'Daily Practice',
    progress: 'Fact {current} of {total}',
    typeAnswer: 'Type your answer...',
    submit: 'Enter',
    correct: 'Fast!',
    softCorrection: 'The answer is {expected}',
    sessionComplete: 'Session Complete!',
    factsPracticed: 'Facts Practiced',
    accuracy: 'Accuracy',
    speed: 'Median Latency',
    bestTime: 'Fastest Recall',
    factsImproved: 'Facts Improved',
    continueHome: 'Done',
    practiceAgain: 'Practice Again'
  },
  arcade: {
    title: 'Arcade Defense',
    instructions: 'Type the answer to fire at descending targets. First digit locks on!',
    score: 'Score',
    wave: 'Wave {wave}',
    shields: 'Shields',
    combo: '{count}× Combo!',
    speedBonus: 'FAST! +50',
    waveCleared: 'Wave Cleared!',
    stationLost: 'Station Down!',
    stationLostDesc: 'Good effort! Every attempt is saved to your mastery grid.',
    playAgain: 'Play Again',
    changeSkin: 'Change World',
    lockOnHint: 'Type the first digit to lock on',
    lockedOn: 'Target Locked'
  },
  progress: {
    title: 'Mastery Matrix (10×10)',
    subtitle: 'Turn every cell gold by mastering speed and accuracy.',
    multiplication: 'Multiplication (×)',
    division: 'Division (÷)',
    legend: {
      unseen: 'Unseen',
      shaky: 'Shaky (<0.45)',
      gettingThere: 'Getting There (0.45–0.74)',
      solid: 'Solid (0.75–0.89)',
      automatic: 'Automatic (≥0.90 & Fast)'
    },
    modal: {
      familyTitle: 'Fact Family {family}',
      prompts: 'Prompts in this family',
      multiplicationStats: 'Multiplication Recall',
      divisionStats: 'Division Recall',
      effectiveStrength: 'Effective Mastery',
      bestRecallTime: 'Best Latency',
      totalAttempts: 'Total Answers',
      consecutiveFast: 'Consecutive Fast',
      halfLife: 'Memory Retention',
      practiceNow: 'Practice This Fact'
    }
  },
  tables: {
    title: 'Table Focus',
    subtitle: 'Choose a specific number to drill both multiplication and division.',
    drillTable: 'Drill Table of {num}',
    factsCount: '19 facts'
  },
  boss: {
    title: 'Boss Run',
    subtitle: 'Test your speed! 12 prompts with a 2.5s median latency bar to unlock skins.',
    selectBoss: 'Choose Table Boss',
    rules: 'Pass with ≥ 11/12 correct and < 2.5s median recall time.',
    clearedTitle: 'Boss Defeated!',
    clearedDesc: 'Awesome speed! You unlocked new rewards.',
    failedTitle: 'Close!',
    failedDesc: 'Keep practicing to bring your median latency under 2.5s.',
    retry: 'Try Again'
  },
  settings: {
    title: 'Settings & Tools',
    sound: 'Sound Effects',
    soundDesc: 'Synthesized audio and arcade cues',
    rerunCalibration: 'Re-run Calibration',
    rerunCalibrationDesc: 'Reset seed priors with a fresh warm-up',
    skinSelect: 'Arcade World',
    devTools: 'Developer & Data Tools',
    rebuildLog: 'Rebuild Cache from Log',
    rebuildLogDesc: 'Replays all attempts to verify data integrity',
    rebuildSuccess: 'Successfully rebuilt mastery cache from attempt log!',
    exportData: 'Export Backup (JSON)',
    importData: 'Import Backup (JSON)',
    importSuccess: 'Backup imported and cache rebuilt successfully!'
  },
  skins: {
    star_patrol: {
      name: 'Star Patrol',
      desc: 'Defend your starbase against incoming space cruisers.',
      unlocked: 'Default'
    },
    reef_guard: {
      name: 'Reef Guard',
      desc: 'Protect the coral reef from rogue deep-sea gliders.',
      unlocked: 'Unlock at 30 Solid+ facts'
    },
    bone_valley: {
      name: 'Bone Valley',
      desc: 'Defend your camp from roaming prehistoric dinos.',
      unlocked: 'Unlock at 60 Solid+ facts'
    }
  }
};

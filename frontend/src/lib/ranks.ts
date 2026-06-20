// Internal array used for scoring math
const ALL_RANKS = [
  { name: "Novice", threshold: 0 },
  { name: "Apprentice", threshold: 100 },
  { name: "Adept", threshold: 300 },
  { name: "Expert", threshold: 600 },
  { name: "Master", threshold: 1000 },
  { name: "Grandmaster", threshold: 1500 },
];

// Exported as a function
export function RANKS() {
  return ALL_RANKS;
}

export function getRank(score: number): string {
  for (let i = ALL_RANKS.length - 1; i >= 0; i--) {
    if (score >= ALL_RANKS[i].threshold) {
      return ALL_RANKS[i].name;
    }
  }
  return ALL_RANKS[0].name;
}

export function rankProgress(score: number) {
  let currentRankIndex = 0;
  
  for (let i = ALL_RANKS.length - 1; i >= 0; i--) {
    if (score >= ALL_RANKS[i].threshold) {
      currentRankIndex = i;
      break;
    }
  }

  if (currentRankIndex === ALL_RANKS.length - 1) {
    return { currentScore: score, nextThreshold: score, progressPercentage: 100 };
  }

  const currentThreshold = ALL_RANKS[currentRankIndex].threshold;
  const nextThreshold = ALL_RANKS[currentRankIndex + 1].threshold;
  
  const pointsIntoRank = score - currentThreshold;
  const pointsNeeded = nextThreshold - currentThreshold;
  const progressPercentage = Math.min(100, Math.max(0, (pointsIntoRank / pointsNeeded) * 100));

  return {
    currentScore: score,
    nextThreshold,
    progressPercentage
  };
}
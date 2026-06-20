export const RANKS = [
  { name: "Novice", threshold: 0 },
  { name: "Apprentice", threshold: 100 },
  { name: "Adept", threshold: 300 },
  { name: "Expert", threshold: 600 },
  { name: "Master", threshold: 1000 },
  { name: "Grandmaster", threshold: 1500 },
];

export function getRank(score: number): string {
  // Loop backwards to find the highest rank achieved
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) {
      return RANKS[i].name;
    }
  }
  return RANKS[0].name;
}

export function rankProgress(score: number) {
  let currentRankIndex = 0;
  
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) {
      currentRankIndex = i;
      break;
    }
  }

  // If they hit the max rank
  if (currentRankIndex === RANKS.length - 1) {
    return { currentScore: score, nextThreshold: score, progressPercentage: 100 };
  }

  const currentThreshold = RANKS[currentRankIndex].threshold;
  const nextThreshold = RANKS[currentRankIndex + 1].threshold;
  
  const pointsIntoRank = score - currentThreshold;
  const pointsNeeded = nextThreshold - currentThreshold;
  const progressPercentage = Math.min(100, Math.max(0, (pointsIntoRank / pointsNeeded) * 100));

  return {
    currentScore: score,
    nextThreshold,
    progressPercentage
  };
}
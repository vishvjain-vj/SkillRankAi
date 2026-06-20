export const RANKS = [
  { name: "Novice", threshold: 0, color: "#9ca3af" },        // Gray
  { name: "Apprentice", threshold: 100, color: "#3b82f6" },  // Blue
  { name: "Adept", threshold: 300, color: "#22c55e" },       // Green
  { name: "Expert", threshold: 600, color: "#a855f7" },      // Purple
  { name: "Master", threshold: 1000, color: "#f97316" },     // Orange
  { name: "Grandmaster", threshold: 1500, color: "#ef4444" },// Red
];

// Notice we removed ': string' and now return the whole object
export function getRank(score: number) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) {
      return RANKS[i]; 
    }
  }
  return RANKS[0];
}

export function rankProgress(score: number) {
  let currentRankIndex = 0;
  
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].threshold) {
      currentRankIndex = i;
      break;
    }
  }

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
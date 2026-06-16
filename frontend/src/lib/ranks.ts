export const RANKS = [
  { threshold: 0,    name: "NOVICE",     color: "#64748b" },
  { threshold: 150,  name: "APPRENTICE", color: "#22d3ee" },
  { threshold: 350,  name: "SCHOLAR",    color: "#a78bfa" },
  { threshold: 600,  name: "EXPERT",     color: "#f59e0b" },
  { threshold: 900,  name: "MASTER",     color: "#ef4444" },
  { threshold: 1200, name: "LEGEND",     color: "#ffd700" },
] as const;

export function getRank(score: number) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (score >= r.threshold) rank = r;
  }
  return rank;
}

export function rankProgress(score: number): number {
  let ci = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (score >= RANKS[i].threshold) ci = i;
  }
  if (ci === RANKS.length - 1) return 100;
  return Math.round(
    ((score - RANKS[ci].threshold) / (RANKS[ci + 1].threshold - RANKS[ci].threshold)) * 100
  );
}
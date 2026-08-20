export function calculateLevel(totalXP: number, xpPerLevel: number = 100): { level: number; xp: number } {
  const level = Math.floor(totalXP / xpPerLevel) + 1;
  const xp = totalXP % xpPerLevel;
  return { level, xp };
}

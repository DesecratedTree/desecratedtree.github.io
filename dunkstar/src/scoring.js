import { SCORE } from './config.js';

/** Clean-shot streak multiplier. First swish is 1x, each extra adds 0.5x. */
export function streakMultiplier(streak) {
  if (streak <= 0) return 1;
  return Math.min(1 + (streak - 1) * SCORE.streakStep, SCORE.maxMult);
}

export function basketValue(clean, streak, doubleActive) {
  const base = SCORE.basket + (clean ? SCORE.cleanBonus : 0);
  const mult = clean ? streakMultiplier(streak) : 1;
  const power = doubleActive ? SCORE.doubleMult : 1;
  return {
    points: Math.round(base * mult * power),
    mult,
    power,
  };
}

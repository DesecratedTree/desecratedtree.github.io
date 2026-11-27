import { SCORE, difficultyFor } from './config.js';

/** Basket streak multiplier. First make is 1x, each extra adds 0.5x. */
export function streakMultiplier(streak) {
  if (streak <= 0) return 1;
  return Math.min(1 + (streak - 1) * SCORE.streakStep, SCORE.maxMult);
}

/** Apply the difficulty's score modifier to any award (baskets, panels). */
export function adjustScore(points, difficulty = 'normal') {
  return Math.round(points * difficultyFor(difficulty).scoreMult);
}

export function basketValue(clean, streak, doubleActive, difficulty = 'normal') {
  const base = clean ? SCORE.swish : SCORE.rimBasket;
  const mult = streakMultiplier(streak);
  const power = doubleActive ? SCORE.doubleMult : 1;
  const points = Math.round(base * mult * power * difficultyFor(difficulty).scoreMult);
  return { points, base, mult, power };
}

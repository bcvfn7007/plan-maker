import { getExercise, WARMUP_ID, type Exercise } from '../data/exercises';

/** One finished set: reps (or seconds for timed exercises) and the weight per hand, if any. */
export type SetLog = { amount: number; kg?: number };

/** What the user did in one exercise on one day. */
export type ExerciseSession = {
  date: string;
  /** The target per set that day. */
  target: number;
  timed: boolean;
  sets: SetLog[];
  /** How many sets the plan asked for; fewer done means the exercise was not finished. */
  planned?: number;
};

/** Per exercise id, newest session first. */
export type ExerciseLog = Record<string, ExerciseSession[]>;

export const LOG_LIMIT = 40;

/** What today's plan asks for, based on the last time. */
export type Suggestion = {
  amount: number;
  kg?: number;
  /** A short line for the plan, e.g. "+1 кг к прошлому разу". Empty the first time. */
  hint?: string;
  /** Whether the load went up compared with the last time. */
  up?: boolean;
};

/** How far reps and seconds may grow from the plan's base before we stop adding. */
const MAX_GROWTH = 2;
/** Weighted exercises add reps up to base + this, then add weight and drop back to base. */
const REP_RANGE = 3;

/** The weight the user worked with: the one used in most sets (the heavier one on a tie). */
export function workingKg(sets: SetLog[]): number | undefined {
  const counts = new Map<number, number>();
  for (const s of sets) if (s.kg !== undefined) counts.set(s.kg, (counts.get(s.kg) ?? 0) + 1);
  let best: number | undefined;
  for (const [kg, n] of counts) if (best === undefined || n > counts.get(best)! || (n === counts.get(best)! && kg > best)) best = kg;
  return best;
}

/**
 * Progressive load, without AI: a simple coach's rule ("double progression").
 * - All sets done in full: a bit more next time (+1 rep, +5 seconds, or +weight once the reps reach the top of the range).
 * - Clearly missed (a set under 60% of the target): a bit less, so the next workout is doable.
 * - Otherwise: the same again, until it is done in full.
 */
export function suggest(exercise: Exercise, base: number, startKg: number | undefined, sessions: ExerciseSession[] | undefined): Suggestion {
  const last = sessions?.[0];
  if (exercise.id === WARMUP_ID || !last || last.sets.length === 0) return { amount: base, kg: startKg };

  const all = last.sets.length >= (last.planned ?? 0) && last.sets.every((s) => s.amount >= last.target);
  const failed = last.sets.some((s) => s.amount < last.target * 0.6);
  const cap = Math.round(base * MAX_GROWTH);

  if (exercise.timed) {
    if (all && last.target < cap) return { amount: Math.min(cap, last.target + 5), hint: '+5 сек к прошлому разу', up: true };
    if (failed) return { amount: Math.max(10, last.target - 5), hint: 'Чуть легче, чем в прошлый раз' };
    return { amount: last.target, hint: all ? 'Держишь максимум' : 'Как в прошлый раз' };
  }

  if (exercise.weight) {
    const step = exercise.weight.step;
    const kg = workingKg(last.sets) ?? startKg ?? exercise.weight.start.beginner;
    if (all && last.target >= base + REP_RANGE) return { amount: base, kg: kg + step, hint: `+${step} кг к прошлому разу`, up: true };
    if (all) return { amount: last.target + 1, kg, hint: '+1 повтор к прошлому разу', up: true };
    if (failed) {
      if (kg - step >= step) return { amount: base, kg: kg - step, hint: `−${step} кг, чтобы сделать все повторы` };
      return { amount: Math.max(5, last.target - 2), kg, hint: 'Чуть легче, чем в прошлый раз' };
    }
    return { amount: last.target, kg, hint: 'Как в прошлый раз' };
  }

  if (all && last.target < cap) return { amount: last.target + 1, hint: '+1 повтор к прошлому разу', up: true };
  if (failed) return { amount: Math.max(5, last.target - 2), hint: 'Чуть легче, чем в прошлый раз' };
  return { amount: last.target, hint: all ? 'Держишь максимум' : 'Как в прошлый раз' };
}

/**
 * Adds today's sessions to the log. A second go on the same day replaces the first one,
 * unless it has fewer sets (a workout stopped halfway should not wipe a full one).
 */
export function addSessions(log: ExerciseLog, entries: { exerciseId: string; session: ExerciseSession }[]): ExerciseLog {
  const next: ExerciseLog = { ...log };
  for (const { exerciseId, session } of entries) {
    if (session.sets.length === 0) continue;
    const list = next[exerciseId] ?? [];
    const sameDay = list.find((s) => s.date === session.date);
    if (sameDay && sameDay.sets.length > session.sets.length) continue;
    next[exerciseId] = [session, ...list.filter((s) => s !== sameDay)].slice(0, LOG_LIMIT);
  }
  return next;
}

/** The single number that shows progress for an exercise: kg for weighted, else the best set. */
export function bestOf(session: ExerciseSession, weighted: boolean): number {
  if (weighted) return workingKg(session.sets) ?? 0;
  return Math.max(0, ...session.sets.map((s) => s.amount));
}

/** "12 · 12 · 10 × 6 кг" or "30 · 30 сек". */
export function setsLabel(sets: SetLog[], timed: boolean): string {
  if (sets.length === 0) return '—';
  const nums = sets.map((s) => s.amount).join(' · ');
  if (timed) return `${nums} сек`;
  const kg = workingKg(sets);
  return kg !== undefined ? `${nums} × ${kgLabel(kg)} кг` : `${nums} раз`;
}

export function kgLabel(kg: number): string {
  return Number.isInteger(kg) ? String(kg) : kg.toFixed(1).replace('.', ',');
}

/** Exercises the user beat their best in today, compared with all earlier sessions. */
export function records(before: ExerciseLog, today: { exerciseId: string; session: ExerciseSession }[]): string[] {
  const out: string[] = [];
  for (const { exerciseId, session } of today) {
    const ex = getExercise(exerciseId);
    if (!ex || ex.id === WARMUP_ID || session.sets.length === 0) continue;
    const earlier = (before[exerciseId] ?? []).filter((s) => s.date !== session.date);
    if (earlier.length === 0) continue;
    const weighted = !!ex.weight;
    const prev = Math.max(...earlier.map((s) => bestOf(s, weighted)));
    if (bestOf(session, weighted) > prev) out.push(exerciseId);
  }
  return out;
}

/** Total weight lifted in a workout: reps × kg per hand × 2 hands. */
export function volumeKg(entries: { sets: SetLog[]; timed: boolean }[]): number {
  let v = 0;
  for (const e of entries) if (!e.timed) for (const s of e.sets) if (s.kg) v += s.amount * s.kg * 2;
  return Math.round(v);
}

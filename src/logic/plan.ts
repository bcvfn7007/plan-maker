import { suggest, type ExerciseLog } from './progress';
import { EXERCISES, WARMUP_ID, type Exercise, type Focus, type Level, type Place } from '../data/exercises';

export type Goal = 'strength' | 'weightloss' | 'fit';

/** Who demonstrates the exercises. */
export type Coach = 'male' | 'female';

export type Profile = {
  goal: Goal;
  level: Level;
  place: Place;
  minutes: 20 | 30 | 45;
  /** Missing in profiles saved before the choice existed. */
  coach?: Coach;
  /** Exercises the user swapped out: the plan avoids them next time. */
  disliked: string[];
};

export type PlanItem = {
  exerciseId: string;
  sets: number;
  amount: number;
  timed: boolean;
  restSeconds: number;
  /** Weight per hand for dumbbell exercises. */
  kg?: number;
  /** Why the amount changed since last time, e.g. "+1 повтор к прошлому разу". */
  hint?: string;
  /** The load went up since last time. */
  up?: boolean;
};

export type DayPlan = {
  date: string;
  title: string;
  items: PlanItem[];
};

// Day types rotate so the same muscles get a rest day in between.
const ROTATION: { title: string; focus: Focus[] }[] = [
  { title: 'Ноги и грудь', focus: ['legs', 'push', 'core', 'legs', 'push', 'cardio', 'core'] },
  { title: 'Спина, руки и кардио', focus: ['pull', 'cardio', 'core', 'pull', 'push', 'cardio', 'legs'] },
  { title: 'Всё тело', focus: ['legs', 'push', 'pull', 'core', 'cardio', 'legs', 'core'] },
];

const EXERCISE_COUNT: Record<Profile['minutes'], number> = { 20: 4, 30: 5, 45: 7 };

export function dateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function dayNumber(date: string): number {
  return Math.floor(Date.parse(date) / 86_400_000);
}

function candidates(profile: Profile, focus: Focus, used: Set<string>): Exercise[] {
  const fits = EXERCISES.filter(
    (e) =>
      e.id !== WARMUP_ID &&
      e.focus === focus &&
      e.places.includes(profile.place) &&
      e.levels.includes(profile.level) &&
      !used.has(e.id),
  );
  // Disliked exercises go last instead of disappearing, so a plan is never empty.
  return [...fits.filter((e) => !profile.disliked.includes(e.id)), ...fits.filter((e) => profile.disliked.includes(e.id))];
}

/** The starting amount for this person, before any history. */
export function baseAmount(profile: Profile, exercise: Exercise): number {
  let amount = exercise.amount;
  if (profile.level === 'intermediate') amount = Math.round(amount * 1.3);
  if (profile.goal === 'strength' && !exercise.timed) amount = Math.max(6, Math.round(amount * 0.7));
  return amount;
}

/** One plan line. With a log, the amount and weight follow the last time (progressive load). */
export function planItem(profile: Profile, exercise: Exercise, log: ExerciseLog = {}): PlanItem {
  const sets = profile.level === 'beginner' ? 2 : 3;
  const restSeconds = profile.goal === 'weightloss' ? 30 : profile.goal === 'strength' ? 90 : 60;
  const startKg = exercise.weight?.start[profile.level];
  const s = suggest(exercise, baseAmount(profile, exercise), startKg, log[exercise.id]);
  const item: PlanItem = { exerciseId: exercise.id, sets, amount: s.amount, timed: !!exercise.timed, restSeconds };
  if (s.kg !== undefined) item.kg = s.kg;
  if (s.hint) item.hint = s.hint;
  if (s.up) item.up = true;
  return item;
}

export function buildDayPlan(profile: Profile, date: string = dateKey(), log: ExerciseLog = {}): DayPlan {
  const day = ROTATION[dayNumber(date) % ROTATION.length];
  const count = EXERCISE_COUNT[profile.minutes];
  const focusList = profile.goal === 'weightloss' ? withMoreCardio(day.focus) : day.focus;

  const used = new Set<string>();
  const items: PlanItem[] = [];
  const warmup = EXERCISES.find((e) => e.id === WARMUP_ID)!;
  items.push({ exerciseId: warmup.id, sets: 1, amount: warmup.amount, timed: true, restSeconds: 15 });

  for (const focus of focusList) {
    if (items.length - 1 >= count) break;
    const pick = candidates(profile, focus, used)[0];
    if (!pick) continue;
    used.add(pick.id);
    items.push(planItem(profile, pick, log));
  }
  return { date, title: day.title, items };
}

/** Another exercise for the same muscles, for the "replace" button. */
export function replacement(profile: Profile, plan: DayPlan, index: number): Exercise | undefined {
  const current = EXERCISES.find((e) => e.id === plan.items[index].exerciseId);
  if (!current) return undefined;
  const used = new Set(plan.items.map((i) => i.exerciseId));
  return candidates({ ...profile, disliked: [...profile.disliked, current.id] }, current.focus, used)[0];
}

function withMoreCardio(focus: Focus[]): Focus[] {
  return focus.flatMap((f, i) => (i % 2 === 1 ? [f, 'cardio' as Focus] : [f]));
}

export function amountLabel(item: PlanItem) {
  const per = item.timed ? `${item.amount} сек` : `${item.amount} раз`;
  const kg = item.kg !== undefined ? ` · ${String(item.kg).replace('.', ',')} кг` : '';
  return (item.sets > 1 ? `${item.sets} × ${per}` : per) + kg;
}

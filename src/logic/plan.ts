import { EXERCISES, WARMUP_ID, type Exercise, type Focus, type Level, type Place } from '../data/exercises';

export type Goal = 'strength' | 'weightloss' | 'fit';

export type Profile = {
  goal: Goal;
  level: Level;
  place: Place;
  minutes: 20 | 30 | 45;
  /** Exercises the user swapped out: the plan avoids them next time. */
  disliked: string[];
};

export type PlanItem = {
  exerciseId: string;
  sets: number;
  amount: number;
  timed: boolean;
  restSeconds: number;
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

export function planItem(profile: Profile, exercise: Exercise): PlanItem {
  const sets = profile.level === 'beginner' ? 2 : 3;
  let amount = exercise.amount;
  if (profile.level === 'intermediate') amount = Math.round(amount * 1.3);
  if (profile.goal === 'strength' && !exercise.timed) amount = Math.max(6, Math.round(amount * 0.7));
  const restSeconds = profile.goal === 'weightloss' ? 30 : profile.goal === 'strength' ? 90 : 60;
  return { exerciseId: exercise.id, sets, amount, timed: !!exercise.timed, restSeconds };
}

export function buildDayPlan(profile: Profile, date: string = dateKey()): DayPlan {
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
    items.push(planItem(profile, pick));
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
  return item.sets > 1 ? `${item.sets} × ${per}` : per;
}

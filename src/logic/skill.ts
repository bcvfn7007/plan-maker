import type { SportIconName } from '../ui';

/** 20 hours of practice, the goal of the method. */
export const GOAL_MINUTES = 20 * 60;

export type SkillPart = { id: string; name: string; minutes: number };

export type SkillSession = {
  date: string;
  minutes: number;
  partId: string;
  /** What went wrong and what to fix next time (step 2: correct yourself). */
  note?: string;
};

export type Skill = {
  presetId: string;
  name: string;
  icon: SportIconName;
  basics: string[];
  parts: SkillPart[];
  sessions: SkillSession[];
  startedAt: string;
  /** Date (YYYY-MM-DD) to reach 20 hours by. Missing in skills saved before deadlines existed. */
  deadline?: string;
};

export function newSkill(presetId: string, name: string, icon: SportIconName, parts: string[], basics: string[], deadline?: string): Skill {
  return {
    deadline,
    presetId,
    name: name.trim(),
    icon,
    basics,
    parts: parts.map((p, i) => ({ id: `p${i}`, name: p.trim(), minutes: 0 })),
    sessions: [],
    startedAt: new Date().toISOString(),
  };
}

export function totalMinutes(skill: Skill): number {
  return skill.parts.reduce((s, p) => s + p.minutes, 0);
}

/** "3 ч 20 мин", "45 мин", "20 ч". */
export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} мин`;
  if (m === 0) return `${h} ч`;
  return `${h} ч ${m} мин`;
}

/**
 * The part to practise next. Earlier parts matter more, so they get a bigger share of the time:
 * the part furthest behind its share is suggested.
 */
export function suggestedPart(skill: Skill): SkillPart | undefined {
  const n = skill.parts.length;
  let best: SkillPart | undefined;
  let bestScore = Infinity;
  skill.parts.forEach((p, i) => {
    const weight = n - i;
    const score = p.minutes / weight;
    if (score < bestScore) {
      best = p;
      bestScore = score;
    }
  });
  return best;
}

export function addSession(skill: Skill, session: SkillSession): Skill {
  return {
    ...skill,
    parts: skill.parts.map((p) => (p.id === session.partId ? { ...p, minutes: p.minutes + session.minutes } : p)),
    sessions: [session, ...skill.sessions].slice(0, 300),
  };
}

/** The latest note the user left for themselves, if any. */
export function lastNote(skill: Skill): SkillSession | undefined {
  return skill.sessions.find((s) => !!s.note?.trim());
}

/** Days in a row (ending today or yesterday) with at least one session. */
export function streak(skill: Skill, today: string): number {
  const days = new Set(skill.sessions.map((s) => s.date));
  const d = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let count = 0;
  while (days.has(d.toISOString().slice(0, 10))) {
    count++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return count;
}

/* ── Goal + deadline + plan + consistent action ── */

export const DEADLINE_OPTIONS = [
  { days: 14, label: '2 недели' },
  { days: 30, label: 'Месяц' },
  { days: 60, label: '2 месяца' },
  { days: 90, label: '3 месяца' },
];

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Days left including today; 0 once the deadline has passed. */
export function daysLeft(deadline: string, today: string): number {
  const ms = Date.parse(`${deadline}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000) + 1);
}

export function minutesOn(skill: Skill, date: string): number {
  return skill.sessions.filter((s) => s.date === date).reduce((s, x) => s + x.minutes, 0);
}

/** Minutes a day needed to reach 20 hours by the deadline (what was left at the start of today, spread evenly). */
export function dailyMinutes(skill: Skill, today: string): number | undefined {
  if (!skill.deadline) return undefined;
  const left = daysLeft(skill.deadline, today);
  if (left === 0) return undefined;
  const remaining = GOAL_MINUTES - (totalMinutes(skill) - minutesOn(skill, today));
  return Math.max(0, Math.ceil(remaining / left));
}

/** Minutes a day for a fresh skill with this many days. */
export function dailyFor(days: number): number {
  return Math.ceil(GOAL_MINUTES / days);
}

export function deadlineLabel(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

/**
 * Where the user is on the ladder: fantasy (goal only) → objective (+deadline) →
 * strategy (+plan) → success (+consistent action: 3+ days in a row).
 */
export function ladderLevel(skill: Skill, today: string): 0 | 1 | 2 | 3 {
  const hasDeadline = !!skill.deadline && daysLeft(skill.deadline, today) > 0;
  if (!hasDeadline) return 0;
  if (skill.parts.length === 0) return 1;
  return streak(skill, today) >= 3 ? 3 : 2;
}

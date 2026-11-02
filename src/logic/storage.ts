import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DayPlan, Profile } from './plan';
import type { ExerciseLog, SetLog } from './progress';
import type { Skill } from './skill';

// Everything lives on the phone for now. Cloud sync (accounts) comes with Supabase later.
const KEYS = {
  profile: 'pm.profile',
  plan: 'pm.plan',
  history: 'pm.history',
  skill: 'pm.skill',
  log: 'pm.log',
};

export type FinishedItem = { exerciseId: string; timed: boolean; sets: SetLog[] };

export type Finished = {
  date: string;
  title: string;
  exercises: number;
  minutes: number;
  /** When it ended (ms). Missing in entries saved before v0.2. */
  at?: number;
  /** What was done, set by set. Missing in entries saved before v0.2. */
  items?: FinishedItem[];
  /** Stopped before the end: shown in history, but the day does not count as done. */
  partial?: boolean;
};

async function read<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

function write(key: string, value: unknown) {
  return AsyncStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getProfile: () => read<Profile>(KEYS.profile),
  saveProfile: (p: Profile) => write(KEYS.profile, p),
  getPlan: () => read<DayPlan>(KEYS.plan),
  savePlan: (p: DayPlan) => write(KEYS.plan, p),
  getHistory: async () => (await read<Finished[]>(KEYS.history)) ?? [],
  addFinished: async (f: Finished) => {
    const history = (await read<Finished[]>(KEYS.history)) ?? [];
    await write(KEYS.history, [f, ...history].slice(0, 200));
  },
  getLog: async () => (await read<ExerciseLog>(KEYS.log)) ?? {},
  saveLog: (l: ExerciseLog) => write(KEYS.log, l),
  getSkill: () => read<Skill>(KEYS.skill),
  saveSkill: (s: Skill) => write(KEYS.skill, s),
  removeSkill: () => AsyncStorage.removeItem(KEYS.skill),
  reset: () => AsyncStorage.multiRemove(Object.values(KEYS)),
};

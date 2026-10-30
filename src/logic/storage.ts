import AsyncStorage from '@react-native-async-storage/async-storage';

import type { DayPlan, Profile } from './plan';

// Everything lives on the phone for now. Cloud sync (accounts) comes with Supabase later.
const KEYS = {
  profile: 'pm.profile',
  plan: 'pm.plan',
  history: 'pm.history',
};

export type Finished = { date: string; title: string; exercises: number; minutes: number };

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
  reset: () => AsyncStorage.multiRemove(Object.values(KEYS)),
};

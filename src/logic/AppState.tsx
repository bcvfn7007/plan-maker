import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { buildDayPlan, dateKey, type DayPlan, type Profile } from './plan';
import { storage } from './storage';

type AppState = {
  ready: boolean;
  profile: Profile | null;
  plan: DayPlan | null;
  saveProfile: (p: Profile) => Promise<void>;
  setPlan: (p: DayPlan) => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlanState] = useState<DayPlan | null>(null);

  useEffect(() => {
    (async () => {
      const p = await storage.getProfile();
      let saved = await storage.getPlan();
      // A new day gets a fresh plan.
      if (p && (!saved || saved.date !== dateKey())) {
        saved = buildDayPlan(p);
        await storage.savePlan(saved);
      }
      setProfile(p);
      setPlanState(saved);
      setReady(true);
    })();
  }, []);

  const saveProfile = useCallback(async (p: Profile) => {
    const fresh = buildDayPlan(p);
    await Promise.all([storage.saveProfile(p), storage.savePlan(fresh)]);
    setProfile(p);
    setPlanState(fresh);
  }, []);

  const setPlan = useCallback(async (p: DayPlan) => {
    await storage.savePlan(p);
    setPlanState(p);
  }, []);

  return <Ctx.Provider value={{ ready, profile, plan, saveProfile, setPlan }}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside AppStateProvider');
  return v;
}

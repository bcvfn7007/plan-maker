import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { buildDayPlan, dateKey, type DayPlan, type Profile } from './plan';
import { addSessions, type ExerciseLog, type ExerciseSession } from './progress';
import { storage, type Finished } from './storage';

type AppState = {
  ready: boolean;
  profile: Profile | null;
  plan: DayPlan | null;
  /** Weights and reps per exercise, newest first: the base for progressive load. */
  log: ExerciseLog;
  saveProfile: (p: Profile) => Promise<void>;
  setPlan: (p: DayPlan) => Promise<void>;
  /** Saves a finished (or stopped) workout to the history and every exercise's log. */
  recordWorkout: (f: Finished, sessions: { exerciseId: string; session: ExerciseSession }[]) => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [plan, setPlanState] = useState<DayPlan | null>(null);
  const [log, setLog] = useState<ExerciseLog>({});

  useEffect(() => {
    (async () => {
      const [p, l] = await Promise.all([storage.getProfile(), storage.getLog()]);
      let saved = await storage.getPlan();
      // A new day gets a fresh plan, with loads that follow the last workouts.
      if (p && (!saved || saved.date !== dateKey())) {
        saved = buildDayPlan(p, dateKey(), l);
        await storage.savePlan(saved);
      }
      setProfile(p);
      setLog(l);
      setPlanState(saved);
      setReady(true);
    })();
  }, []);

  const saveProfile = useCallback(
    async (p: Profile) => {
      const fresh = buildDayPlan(p, dateKey(), log);
      await Promise.all([storage.saveProfile(p), storage.savePlan(fresh)]);
      setProfile(p);
      setPlanState(fresh);
    },
    [log],
  );

  const setPlan = useCallback(async (p: DayPlan) => {
    await storage.savePlan(p);
    setPlanState(p);
  }, []);

  const recordWorkout = useCallback(
    async (f: Finished, sessions: { exerciseId: string; session: ExerciseSession }[]) => {
      const next = addSessions(log, sessions);
      await Promise.all([storage.addFinished(f), storage.saveLog(next)]);
      setLog(next);
    },
    [log],
  );

  return <Ctx.Provider value={{ ready, profile, plan, log, saveProfile, setPlan, recordWorkout }}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside AppStateProvider');
  return v;
}

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseTips, ExerciseViewer } from '../components/ExercisePanel';
import { Ring } from '../components/Ring';
import { Stepper } from '../components/Stepper';
import { getExercise, WARMUP_ID } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import type { DayPlan } from '../logic/plan';
import { records, setsLabel, volumeKg, type ExerciseSession, type SetLog } from '../logic/progress';
import { Button, colors, Eyebrow, FOCUS, fonts, IconButton, IconTile, Ionicons, MaterialCommunityIcons, Tag, tap, text } from '../ui';

type Phase = 'ready' | 'work' | 'rest' | 'done';

export default function Workout() {
  const { plan, log, recordWorkout } = useAppState();
  const { height: screenH } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [set, setSet] = useState(1);
  const [phase, setPhase] = useState<Phase>('ready');
  const [showTips, setShowTips] = useState(false);
  const startedAt = useRef(Date.now());
  const [finishedMinutes, setFinishedMinutes] = useState(0);
  // What was actually done, set by set, for every plan line.
  const done = useRef<SetLog[][]>([]);
  const saved = useRef(false);
  const [summary, setSummary] = useState<{ records: string[]; volume: number }>({ records: [], volume: 0 });

  const item = plan?.items[index];
  const exercise = item ? getExercise(item.exerciseId) : undefined;

  // The reps and weight about to be logged: the plan's numbers first, then whatever the previous set was.
  const [reps, setReps] = useState(item?.amount ?? 0);
  const [kg, setKg] = useState<number | undefined>(item?.kg);
  useEffect(() => {
    if (!item) return;
    const prev = done.current[index]?.[set - 2];
    setReps(prev && !item.timed ? prev.amount : item.amount);
    setKg(prev?.kg ?? item.kg);
  }, [index, set, item]);

  const save = (partial: boolean) => {
    if (!plan || saved.current) return;
    const sessions = sessionsOf(plan, done.current);
    // Stopped before any real exercise (only the warm-up or nothing): nothing to remember.
    if (partial && !sessions.some((s) => s.exerciseId !== WARMUP_ID)) return;
    saved.current = true;
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
    setFinishedMinutes(minutes);
    setSummary({ records: records(log, sessions), volume: volumeKg(sessions.map((s) => s.session)) });
    recordWorkout(
      {
        date: plan.date,
        title: plan.title,
        exercises: sessions.length,
        minutes,
        at: Date.now(),
        items: sessions.map((s) => ({ exerciseId: s.exerciseId, timed: s.session.timed, sets: s.session.sets })),
        ...(partial ? { partial: true } : {}),
      },
      sessions,
    );
  };

  const finishSet = (timerEnded = false) => {
    if (!plan || !item) return;
    const entry: SetLog = item.timed
      ? { amount: timerEnded || phase !== 'work' ? item.amount : Math.max(1, item.amount - workSeconds) }
      : { amount: reps, ...(kg !== undefined ? { kg } : {}) };
    (done.current[index] ??= [])[set - 1] = entry;

    const lastSet = set >= item.sets;
    const lastItem = index >= plan.items.length - 1;
    if (lastSet && lastItem) {
      save(false);
      setPhase('done');
      tap('success');
      return;
    }
    setPhase('rest');
  };

  const next = () => {
    if (!plan || !item) return;
    if (set < item.sets) {
      setSet(set + 1);
    } else {
      setIndex(index + 1);
      setSet(1);
      setShowTips(false);
    }
    setPhase('ready');
  };

  const workSeconds = useCountdown(phase === 'work' && !!item?.timed ? item.amount : 0, () => finishSet(true));
  const restSeconds = useCountdown(phase === 'rest' && item ? item.restSeconds : 0, next);

  if (!plan || !item || !exercise) return null;

  const close = () => {
    save(true);
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  };

  if (phase === 'done') {
    const sets = plan.items.reduce((s, it) => s + it.sets, 0);
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.page, styles.donePage]}>
          <View style={styles.trophy}>
            <MaterialCommunityIcons name="trophy" size={56} color={colors.onAccent} />
          </View>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Text style={[text.h1, { textAlign: 'center' }]}>Тренировка готова!</Text>
            <Text style={[text.muted, { textAlign: 'center' }]}>Веса и повторы сохранены. Где ты справился, в следующий раз будет чуть больше.</Text>
          </View>
          <View style={styles.doneStats}>
            <DoneStat icon="dumbbell" value={String(plan.items.length)} label="упражнений" />
            <DoneStat icon="repeat" value={String(sets)} label="подходов" />
            <DoneStat icon="timer-outline" value={String(finishedMinutes)} label="минут" />
          </View>
          {summary.records.length > 0 && (
            <View style={styles.records}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="medal" size={20} color={colors.accent} />
                <Text style={text.h3}>Новый рекорд</Text>
              </View>
              {summary.records.map((id) => (
                <Text key={id} style={text.body}>
                  {getExercise(id)?.name}
                </Text>
              ))}
            </View>
          )}
          {summary.volume > 0 && (
            <Text style={[text.muted, { textAlign: 'center' }]}>
              Поднято за тренировку: <Text style={{ color: colors.text, fontFamily: fonts.bodyBold }}>{summary.volume} кг</Text>
            </Text>
          )}
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Button title="На главную" icon="home" onPress={() => router.replace('/today')} />
            <Button kind="secondary" title="История и прогресс" icon="stats-chart" onPress={() => router.replace('/history')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const nextItem = plan.items[index + 1];
  const nextExercise = nextItem ? getExercise(nextItem.exerciseId) : undefined;
  const stageH = Math.round(Math.min(440, Math.max(300, screenH * 0.46)));
  const last = log[exercise.id]?.find((s) => s.date !== plan.date) ?? log[exercise.id]?.[0];
  const logging = phase !== 'rest' && !item.timed;

  let ringValue: string;
  let ringLabel: string;
  let progress: number;
  if (phase === 'rest') {
    ringValue = String(restSeconds);
    ringLabel = 'сек отдыха';
    progress = restSeconds / item.restSeconds;
  } else if (item.timed) {
    ringValue = String(phase === 'work' ? workSeconds : item.amount);
    ringLabel = 'секунд';
    progress = phase === 'work' ? workSeconds / item.amount : 1;
  } else {
    ringValue = String(reps);
    ringLabel = 'повторений';
    progress = Math.min(1, reps / item.amount);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton icon="close" label="Закончить" onPress={close} />
        <View style={styles.segments}>
          {plan.items.map((_, i) => (
            <View key={i} style={styles.segment}>
              <View style={[styles.segmentFill, { width: i < index ? '100%' : i === index ? `${((set - 1 + (phase === 'rest' ? 1 : 0)) / item.sets) * 100}%` : '0%' }]} />
            </View>
          ))}
        </View>
        <Text style={styles.counter}>
          {index + 1}/{plan.items.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <ExerciseViewer exercise={exercise} height={stageH} />

        <View style={{ gap: 10 }}>
          <Eyebrow>
            {index === 0 ? 'Разминка' : FOCUS[exercise.focus].label} · {item.sets > 1 ? `подход ${set} из ${item.sets}` : 'один подход'}
          </Eyebrow>
          <Text style={text.h1}>{exercise.name}</Text>
          <View style={styles.tags}>
            {exercise.targets.map((t) => (
              <Tag key={t} label={t} strong />
            ))}
          </View>
        </View>

        {index > 0 && (item.hint || last) && (
          <View style={[styles.hint, item.up && styles.hintUp]}>
            <MaterialCommunityIcons name={item.up ? 'trending-up' : 'history'} size={20} color={item.up ? colors.accent : colors.muted} />
            <View style={{ flex: 1, gap: 1 }}>
              {item.hint && <Text style={[text.h3, { fontSize: 14, lineHeight: 19 }, item.up && { color: colors.accent }]}>{item.hint}</Text>}
              {last && (
                <Text style={[text.muted, { fontSize: 13 }]}>
                  Прошлый раз: {setsLabel(last.sets, last.timed)}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.counterCard}>
          <Ring size={132} progress={progress} color={phase === 'rest' ? '#7aa7ff' : colors.accent}>
            <Text style={styles.ringValue}>{ringValue}</Text>
            <Text style={styles.ringLabel}>{ringLabel}</Text>
          </Ring>
          <View style={{ flex: 1, gap: 12 }}>
            <SetDots total={item.sets} current={set} resting={phase === 'rest'} />
            {phase === 'rest' ? (
              <View style={{ gap: 2 }}>
                <Text style={[text.muted, { fontSize: 13 }]}>Дальше</Text>
                <Text style={text.h3}>{set >= item.sets && nextExercise ? nextExercise.name : `Подход ${set + 1}`}</Text>
              </View>
            ) : (
              <View style={{ gap: 2 }}>
                <Text style={[text.muted, { fontSize: 13 }]}>{item.timed ? 'Потом отдых' : `Цель: ${item.amount} раз${item.kg !== undefined ? ` · ${String(item.kg).replace('.', ',')} кг` : ''}`}</Text>
                <Text style={text.h3}>{item.timed ? `${item.restSeconds} секунд` : `Отдых ${item.restSeconds} сек`}</Text>
              </View>
            )}
          </View>
        </View>

        {logging && (
          <View style={styles.logCard}>
            <Text style={[text.muted, { fontSize: 13 }]}>Сколько сделал в этом подходе</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Stepper label="Повторы" value={reps} step={1} min={0} max={200} onChange={setReps} />
              {kg !== undefined && exercise.weight && (
                <Stepper label="Вес, кг" value={kg} step={exercise.weight.step >= 2 ? 1 : 0.5} min={0} max={200} onChange={setKg} />
              )}
            </View>
          </View>
        )}

        {phase === 'rest' && <Button kind="secondary" icon="play-skip-forward" title="Пропустить отдых" onPress={next} />}
        {phase !== 'rest' && item.timed && phase === 'ready' && <Button title="Старт" icon="play" onPress={() => setPhase('work')} />}
        {phase !== 'rest' && item.timed && phase === 'work' && <Button kind="secondary" icon="stop" title="Закончить раньше" onPress={() => finishSet()} />}
        {phase !== 'rest' && !item.timed && <Button title="Подход сделан" icon="checkmark" onPress={() => finishSet()} />}

        {phase === 'rest' && nextExercise && set >= item.sets && (
          <View style={styles.nextCard}>
            <IconTile icon={FOCUS[nextExercise.focus].icon} />
            <View style={{ flex: 1 }}>
              <Text style={[text.muted, { fontSize: 12 }]}>Следующее упражнение</Text>
              <Text style={text.h3}>{nextExercise.name}</Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={() => {
            tap();
            setShowTips(!showTips);
          }}
          style={({ pressed }) => [styles.tipsToggle, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="school-outline" size={20} color={colors.accent} />
          <Text style={[text.h3, { flex: 1 }]}>Как делать правильно</Text>
          <Ionicons name={showTips ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        </Pressable>
        {showTips && <ExerciseTips exercise={exercise} />}
      </ScrollView>
    </SafeAreaView>
  );
}

/** The plan lines that have at least one finished set, as log entries. */
function sessionsOf(plan: DayPlan, done: SetLog[][]): { exerciseId: string; session: ExerciseSession }[] {
  return plan.items.flatMap((it, i) => {
    const sets = (done[i] ?? []).filter(Boolean);
    if (sets.length === 0) return [];
    return [{ exerciseId: it.exerciseId, session: { date: plan.date, target: it.amount, timed: it.timed, sets, planned: it.sets } }];
  });
}

function SetDots({ total, current, resting }: { total: number; current: number; resting: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => {
        const isDone = i < current - 1 || (resting && i === current - 1);
        const active = i === current - 1 && !resting;
        return <View key={i} style={[styles.setDot, isDone && { backgroundColor: colors.accent }, active && { backgroundColor: colors.accent, opacity: 0.45 }]} />;
      })}
    </View>
  );
}

function DoneStat({ icon, value, label }: { icon: 'dumbbell' | 'repeat' | 'timer-outline'; value: string; label: string }) {
  return (
    <View style={styles.doneStat}>
      <MaterialCommunityIcons name={icon} size={20} color={colors.accent} />
      <Text style={styles.doneValue}>{value}</Text>
      <Text style={[text.muted, { fontSize: 12 }]}>{label}</Text>
    </View>
  );
}

/** Counts down from `seconds` while it is above zero; calls `onEnd` at zero. */
function useCountdown(seconds: number, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  end.current = onEnd;

  useEffect(() => {
    setLeft(seconds);
    if (seconds <= 0) return;
    const until = Date.now() + seconds * 1000;
    let shown = seconds;
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLeft(remaining);
      // A tick in the hand for the last three seconds.
      if (remaining !== shown && remaining <= 3 && remaining > 0) tap();
      shown = remaining;
      if (remaining === 0) {
        clearInterval(id);
        end.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [seconds]);

  return left;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, maxWidth: 560, width: '100%', alignSelf: 'center' },
  counter: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 13, minWidth: 28, textAlign: 'right' },
  page: { padding: 20, paddingTop: 8, paddingBottom: 40, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  donePage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', gap: 22, paddingTop: 32 },
  segments: { flex: 1, flexDirection: 'row', gap: 5 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.card2, overflow: 'hidden' },
  segmentFill: { height: 4, backgroundColor: colors.accent },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  hintUp: { backgroundColor: colors.accentSoft, borderColor: colors.accentLine },
  counterCard: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 16, borderRadius: 26, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  logCard: { gap: 10, padding: 14, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  ringValue: { color: colors.text, fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 46, letterSpacing: -1.5 },
  ringLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12 },
  setDot: { flex: 1, maxWidth: 36, height: 6, borderRadius: 3, backgroundColor: colors.card2 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tipsToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  trophy: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 40 },
  doneStats: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  doneStat: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  doneValue: { color: colors.text, fontFamily: fonts.display, fontSize: 24 },
  records: { alignSelf: 'stretch', gap: 6, padding: 16, borderRadius: 20, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accentLine },
});

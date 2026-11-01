import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseTips, ExerciseViewer } from '../components/ExercisePanel';
import { Ring } from '../components/Ring';
import { getExercise } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import { storage } from '../logic/storage';
import { Button, colors, Eyebrow, FOCUS, fonts, IconButton, IconTile, Ionicons, MaterialCommunityIcons, Tag, tap, text } from '../ui';

type Phase = 'ready' | 'work' | 'rest' | 'done';

export default function Workout() {
  const { plan } = useAppState();
  const { height: screenH } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [set, setSet] = useState(1);
  const [phase, setPhase] = useState<Phase>('ready');
  const [showTips, setShowTips] = useState(false);
  const startedAt = useRef(Date.now());
  const [finishedMinutes, setFinishedMinutes] = useState(0);

  const item = plan?.items[index];
  const exercise = item ? getExercise(item.exerciseId) : undefined;

  const finishSet = () => {
    if (!plan || !item) return;
    const lastSet = set >= item.sets;
    const lastItem = index >= plan.items.length - 1;
    if (lastSet && lastItem) {
      const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60000));
      setFinishedMinutes(minutes);
      setPhase('done');
      tap('success');
      storage.addFinished({ date: plan.date, title: plan.title, exercises: plan.items.length, minutes });
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

  const workSeconds = useCountdown(phase === 'work' && !!item?.timed ? item.amount : 0, finishSet);
  const restSeconds = useCountdown(phase === 'rest' && item ? item.restSeconds : 0, next);

  if (!plan || !item || !exercise) return null;

  const close = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  if (phase === 'done') {
    const sets = plan.items.reduce((s, it) => s + it.sets, 0);
    return (
      <SafeAreaView style={[styles.screen, { justifyContent: 'center' }]}>
        <View style={[styles.page, { alignItems: 'center', gap: 22 }]}>
          <View style={styles.trophy}>
            <MaterialCommunityIcons name="trophy" size={56} color={colors.onAccent} />
          </View>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Text style={[text.h1, { textAlign: 'center' }]}>Тренировка готова!</Text>
            <Text style={[text.muted, { textAlign: 'center' }]}>Отличная работа. Завтра будет новый план.</Text>
          </View>
          <View style={styles.doneStats}>
            <DoneStat icon="dumbbell" value={String(plan.items.length)} label="упражнений" />
            <DoneStat icon="repeat" value={String(sets)} label="подходов" />
            <DoneStat icon="timer-outline" value={String(finishedMinutes)} label="минут" />
          </View>
          <Button title="На главную" icon="home" onPress={() => router.replace('/today')} style={{ alignSelf: 'stretch' }} />
        </View>
      </SafeAreaView>
    );
  }

  const nextItem = plan.items[index + 1];
  const nextExercise = nextItem ? getExercise(nextItem.exerciseId) : undefined;
  const stageH = Math.round(Math.min(440, Math.max(300, screenH * 0.46)));

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
    ringValue = String(item.amount);
    ringLabel = 'повторений';
    progress = 1;
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
                <Text style={[text.muted, { fontSize: 13 }]}>Потом отдых</Text>
                <Text style={text.h3}>{item.restSeconds} секунд</Text>
              </View>
            )}
          </View>
        </View>

        {phase === 'rest' && <Button kind="secondary" icon="play-skip-forward" title="Пропустить отдых" onPress={next} />}
        {phase !== 'rest' && item.timed && phase === 'ready' && <Button title="Старт" icon="play" onPress={() => setPhase('work')} />}
        {phase !== 'rest' && item.timed && phase === 'work' && <Button kind="secondary" icon="stop" title="Закончить раньше" onPress={finishSet} />}
        {phase !== 'rest' && !item.timed && <Button title="Подход сделан" icon="checkmark" onPress={finishSet} />}

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

function SetDots({ total, current, resting }: { total: number; current: number; resting: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < current - 1 || (resting && i === current - 1);
        const active = i === current - 1 && !resting;
        return <View key={i} style={[styles.setDot, done && { backgroundColor: colors.accent }, active && { backgroundColor: colors.accent, opacity: 0.45 }]} />;
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
  segments: { flex: 1, flexDirection: 'row', gap: 5 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.card2, overflow: 'hidden' },
  segmentFill: { height: 4, backgroundColor: colors.accent },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counterCard: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 16, borderRadius: 26, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  ringValue: { color: colors.text, fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 46, letterSpacing: -1.5 },
  ringLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12 },
  setDot: { flex: 1, maxWidth: 36, height: 6, borderRadius: 3, backgroundColor: colors.card2 },
  nextCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  tipsToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  trophy: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 40 },
  doneStats: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  doneStat: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  doneValue: { color: colors.text, fontFamily: fonts.display, fontSize: 24 },
});

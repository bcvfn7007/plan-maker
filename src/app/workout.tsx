import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExerciseTips, ExerciseViewer } from '../components/ExercisePanel';
import { getExercise } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import { storage } from '../logic/storage';
import { Button, Card, colors, text } from '../ui';

type Phase = 'ready' | 'work' | 'rest' | 'done';

export default function Workout() {
  const { plan } = useAppState();
  const [index, setIndex] = useState(0);
  const [set, setSet] = useState(1);
  const [phase, setPhase] = useState<Phase>('ready');
  const [showTips, setShowTips] = useState(false);
  const startedAt = useRef(Date.now());

  const item = plan?.items[index];
  const exercise = item ? getExercise(item.exerciseId) : undefined;

  const finishSet = () => {
    if (!plan || !item) return;
    const lastSet = set >= item.sets;
    const lastItem = index >= plan.items.length - 1;
    if (lastSet && lastItem) {
      setPhase('done');
      storage.addFinished({
        date: plan.date,
        title: plan.title,
        exercises: plan.items.length,
        minutes: Math.max(1, Math.round((Date.now() - startedAt.current) / 60000)),
      });
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
    }
    setPhase('ready');
    setShowTips(false);
  };

  const workSeconds = useCountdown(phase === 'work' && !!item?.timed ? item.amount : 0, finishSet);
  const restSeconds = useCountdown(phase === 'rest' && item ? item.restSeconds : 0, next);

  if (!plan || !item || !exercise) return null;

  if (phase === 'done') {
    return (
      <View style={[styles.page, { flex: 1, justifyContent: 'center' }]}>
        <Text style={[text.h1, { textAlign: 'center' }]}>Тренировка готова!</Text>
        <Text style={[text.muted, { textAlign: 'center' }]}>
          {plan.items.length} упражнений за {Math.max(1, Math.round((Date.now() - startedAt.current) / 60000))} мин. Завтра будет новый план.
        </Text>
        <Button title="На главную" onPress={() => router.replace('/today')} />
      </View>
    );
  }

  const nextItem = plan.items[index + 1];
  const nextExercise = nextItem ? getExercise(nextItem.exerciseId) : undefined;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(index / plan.items.length) * 100}%` }]} />
      </View>
      <Text style={text.muted}>
        Упражнение {index + 1} из {plan.items.length}
        {item.sets > 1 ? ` · подход ${set} из ${item.sets}` : ''}
      </Text>
      <Text style={text.h1}>{exercise.name}</Text>

      <ExerciseViewer exercise={exercise} height={340} />

      {phase === 'rest' ? (
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Text style={text.muted}>Отдых</Text>
          <Text style={styles.big}>{restSeconds}</Text>
          {set >= item.sets && nextExercise && <Text style={text.muted}>Дальше: {nextExercise.name}</Text>}
          <Button kind="secondary" title="Пропустить отдых" onPress={next} style={{ alignSelf: 'stretch', marginTop: 6 }} />
        </Card>
      ) : (
        <Card style={{ alignItems: 'center', gap: 6 }}>
          <Text style={text.muted}>{item.timed ? 'Держи' : 'Сделай'}</Text>
          <Text style={styles.big}>{item.timed ? (phase === 'work' ? workSeconds : item.amount) : item.amount}</Text>
          <Text style={text.muted}>{item.timed ? 'секунд' : 'повторений'}</Text>
          {item.timed && phase === 'ready' && (
            <Button title="Старт" onPress={() => setPhase('work')} style={{ alignSelf: 'stretch', marginTop: 6 }} />
          )}
          {item.timed && phase === 'work' && (
            <Button kind="secondary" title="Закончить раньше" onPress={finishSet} style={{ alignSelf: 'stretch', marginTop: 6 }} />
          )}
          {!item.timed && <Button title="Подход сделан" onPress={finishSet} style={{ alignSelf: 'stretch', marginTop: 6 }} />}
        </Card>
      )}

      <Button kind="ghost" title={showTips ? 'Скрыть подсказки' : 'Как делать правильно'} onPress={() => setShowTips(!showTips)} />
      {showTips && <ExerciseTips exercise={exercise} />}
    </ScrollView>
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
    const id = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLeft(remaining);
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
  page: { padding: 20, gap: 14, maxWidth: 560, width: '100%', alignSelf: 'center' },
  big: { fontSize: 56, fontWeight: '800', color: colors.accent },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.accent },
});

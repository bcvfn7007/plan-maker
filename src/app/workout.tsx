import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ExerciseTips, ExerciseViewer } from '../components/ExercisePanel';
import { getExercise } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import { storage } from '../logic/storage';
import { Button, colors, Tag, text } from '../ui';

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
      <View style={styles.segments}>
        {plan.items.map((_, i) => (
          <View
            key={i}
            style={[styles.segment, i < index && { backgroundColor: colors.accent }, i === index && { backgroundColor: colors.accent, opacity: 0.55 }]}
          />
        ))}
      </View>
      <Text style={text.muted}>
        Упражнение {index + 1} из {plan.items.length}
      </Text>
      <Text style={text.h1}>{exercise.name}</Text>
      <View style={styles.tags}>
        {exercise.targets.map((t) => (
          <Tag key={t} label={t} strong />
        ))}
      </View>

      <ExerciseViewer exercise={exercise} height={320} />

      {phase === 'rest' ? (
        <View style={styles.counter}>
          <View>
            <Text style={text.muted}>Отдых</Text>
            <Text style={text.big}>{restSeconds}</Text>
          </View>
          <Text style={[text.muted, { textAlign: 'right' }]}>
            {set >= item.sets && nextExercise ? `Дальше:\n${nextExercise.name}` : `Дальше:\nподход ${set + 1}`}
          </Text>
        </View>
      ) : (
        <View style={styles.counter}>
          <View>
            <Text style={text.muted}>{item.sets > 1 ? `Подход ${set} из ${item.sets}` : 'Один подход'}</Text>
            <Text style={text.big}>{item.timed ? (phase === 'work' ? workSeconds : item.amount) : item.amount}</Text>
          </View>
          <Text style={[text.muted, { textAlign: 'right' }]}>
            {item.timed ? 'секунд' : 'повторений'}
            {'\n'}отдых {item.restSeconds} сек
          </Text>
        </View>
      )}

      {phase === 'rest' && <Button kind="secondary" title="Пропустить отдых" onPress={next} />}
      {phase !== 'rest' && item.timed && phase === 'ready' && <Button title="Старт" onPress={() => setPhase('work')} />}
      {phase !== 'rest' && item.timed && phase === 'work' && <Button kind="secondary" title="Закончить раньше" onPress={finishSet} />}
      {phase !== 'rest' && !item.timed && <Button title="Подход сделан" onPress={finishSet} />}

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
  segments: { flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.line },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});

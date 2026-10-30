import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getExercise } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import { amountLabel, planItem, replacement } from '../logic/plan';
import { storage, type Finished } from '../logic/storage';
import { Button, Card, colors, text } from '../ui';

export default function Today() {
  const { profile, plan, setPlan, saveProfile } = useAppState();
  const [history, setHistory] = useState<Finished[]>([]);

  useFocusEffect(
    useCallback(() => {
      storage.getHistory().then(setHistory);
    }, []),
  );

  if (!profile || !plan) return null;
  const doneToday = history.some((h) => h.date === plan.date);

  const replace = async (index: number) => {
    const next = replacement(profile, plan, index);
    if (!next) return;
    const swapped = plan.items[index].exerciseId;
    // Remember what the user swapped out, so later plans offer it less.
    await saveProfile({ ...profile, disliked: [...new Set([...profile.disliked, swapped])] });
    const items = plan.items.map((it, i) => (i === index ? planItem(profile, next) : it));
    await setPlan({ ...plan, items });
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={{ gap: 4 }}>
        <Text style={text.muted}>Сегодня</Text>
        <Text style={text.h1}>{plan.title}</Text>
        <Text style={text.muted}>
          {plan.items.length} упражнений · около {profile.minutes} минут
          {history.length > 0 ? ` · тренировок всего: ${history.length}` : ''}
        </Text>
      </View>

      {doneToday && (
        <Card style={{ backgroundColor: '#e3f5ec' }}>
          <Text style={[text.body, { color: colors.good, fontWeight: '700' }]}>Сегодня уже сделано. Отлично!</Text>
        </Card>
      )}

      <View style={{ gap: 10 }}>
        {plan.items.map((item, i) => {
          const ex = getExercise(item.exerciseId);
          if (!ex) return null;
          const canReplace = i > 0 && !!replacement(profile, plan, i);
          return (
            <Card key={`${item.exerciseId}-${i}`} style={styles.item}>
              <Pressable style={{ flex: 1 }} onPress={() => router.push(`/exercise/${ex.id}`)}>
                <Text style={text.body}>
                  {i === 0 ? 'Разминка: ' : ''}
                  <Text style={{ fontWeight: '700' }}>{ex.name}</Text>
                </Text>
                <Text style={text.muted}>{amountLabel(item)}</Text>
              </Pressable>
              {canReplace && (
                <Pressable onPress={() => replace(i)} hitSlop={8}>
                  <Text style={styles.replace}>Заменить</Text>
                </Pressable>
              )}
            </Card>
          );
        })}
      </View>

      <Button title={doneToday ? 'Пройти ещё раз' : 'Начать тренировку'} onPress={() => router.push('/workout')} />
      <View style={styles.links}>
        <Button kind="secondary" title="Все упражнения" onPress={() => router.push('/library')} style={{ flex: 1 }} />
        <Button kind="secondary" title="Изменить ответы" onPress={() => router.push('/onboarding')} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  replace: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  links: { flexDirection: 'row', gap: 10 },
});

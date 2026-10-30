import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Level, Place } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import type { Coach, Goal, Profile } from '../logic/plan';
import { Button, Chip, text } from '../ui';

type Question<T> = { title: string; options: { value: T; label: string }[] };

const GOAL: Question<Goal> = {
  title: 'Какая цель?',
  options: [
    { value: 'fit', label: 'Быть в форме' },
    { value: 'weightloss', label: 'Похудеть' },
    { value: 'strength', label: 'Стать сильнее' },
  ],
};
const LEVEL: Question<Level> = {
  title: 'Какой опыт?',
  options: [
    { value: 'beginner', label: 'Новичок' },
    { value: 'intermediate', label: 'Уже тренируюсь' },
  ],
};
const PLACE: Question<Place> = {
  title: 'Где занимаешься?',
  options: [
    { value: 'home', label: 'Дома' },
    { value: 'gym', label: 'В зале' },
  ],
};
const MINUTES: Question<Profile['minutes']> = {
  title: 'Сколько времени на тренировку?',
  options: [
    { value: 20, label: '20 мин' },
    { value: 30, label: '30 мин' },
    { value: 45, label: '45 мин' },
  ],
};

const COACH: Question<Coach> = {
  title: 'Кто будет показывать упражнения?',
  options: [
    { value: 'male', label: 'Парень' },
    { value: 'female', label: 'Девушка' },
  ],
};

export default function Onboarding() {
  const { profile, saveProfile } = useAppState();
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'fit');
  const [level, setLevel] = useState<Level>(profile?.level ?? 'beginner');
  const [place, setPlace] = useState<Place>(profile?.place ?? 'home');
  const [minutes, setMinutes] = useState<Profile['minutes']>(profile?.minutes ?? 30);
  const [coach, setCoach] = useState<Coach>(profile?.coach ?? 'male');

  const save = async () => {
    await saveProfile({ goal, level, place, minutes, coach, disliked: profile?.disliked ?? [] });
    router.replace('/today');
  };

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Text style={text.h1}>Давай познакомимся</Text>
      <Text style={text.muted}>По ответам я составлю план тренировки на каждый день.</Text>
      <Choice q={GOAL} value={goal} onChange={setGoal} />
      <Choice q={LEVEL} value={level} onChange={setLevel} />
      <Choice q={PLACE} value={place} onChange={setPlace} />
      <Choice q={MINUTES} value={minutes} onChange={setMinutes} />
      <Choice q={COACH} value={coach} onChange={setCoach} />
      <Button title="Готово, составить план" onPress={save} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}

function Choice<T>({ q, value, onChange }: { q: Question<T>; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={text.h2}>{q.title}</Text>
      <View style={styles.row}>
        {q.options.map((o) => (
          <Chip key={String(o.value)} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 22, maxWidth: 560, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});

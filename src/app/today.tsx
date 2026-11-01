import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getExercise } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import { amountLabel, dateKey, planItem, replacement } from '../logic/plan';
import { storage, type Finished } from '../logic/storage';
import { Button, colors, Eyebrow, FOCUS, fonts, IconButton, IconTile, Ionicons, MaterialCommunityIcons, tap, text } from '../ui';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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
    tap();
    const swapped = plan.items[index].exerciseId;
    // Remember what the user swapped out, so later plans offer it less.
    await saveProfile({ ...profile, disliked: [...new Set([...profile.disliked, swapped])] });
    const items = plan.items.map((it, i) => (i === index ? planItem(profile, next) : it));
    await setPlan({ ...plan, items });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={{ flex: 1, gap: 4 }}>
            <Eyebrow>{longDate()}</Eyebrow>
            <Text style={text.h1}>{greeting()}</Text>
          </View>
          <IconButton icon="options-outline" label="Изменить ответы" onPress={() => router.push('/onboarding')} />
        </View>

        <Week history={history} />

        <LinearGradient colors={['#1d2a0c', '#141a10', colors.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={{ gap: 6 }}>
            <View style={styles.heroBadge}>
              <MaterialCommunityIcons name={doneToday ? 'check-decagram' : 'lightning-bolt'} size={14} color={colors.onAccent} />
              <Text style={styles.heroBadgeText}>{doneToday ? 'Сделано сегодня' : 'План на сегодня'}</Text>
            </View>
            <Text style={[text.h1, { fontSize: 30, lineHeight: 36 }]}>{plan.title}</Text>
          </View>
          <View style={styles.stats}>
            <Stat value={String(plan.items.length)} label="упражнений" />
            <View style={styles.statLine} />
            <Stat value={`~${profile.minutes}`} label="минут" />
            <View style={styles.statLine} />
            <Stat value={String(history.length)} label="тренировок" />
          </View>
          <Button title={doneToday ? 'Пройти ещё раз' : 'Начать тренировку'} icon="play" onPress={() => router.push('/workout')} />
        </LinearGradient>

        <View style={styles.sectionHead}>
          <Text style={text.h2}>Упражнения</Text>
          <Text style={text.muted}>Нажми, чтобы посмотреть в 3D</Text>
        </View>

        <View style={styles.list}>
          {plan.items.map((item, i, all) => {
            const ex = getExercise(item.exerciseId);
            if (!ex) return null;
            const canReplace = i > 0 && !!replacement(profile, plan, i);
            return (
              <Pressable
                key={`${item.exerciseId}-${i}`}
                onPress={() => router.push(`/exercise/${ex.id}`)}
                style={({ pressed }) => [styles.row, i === all.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.card2 }]}
              >
                <IconTile icon={FOCUS[ex.focus].icon} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={text.h3} numberOfLines={1}>
                    {ex.name}
                  </Text>
                  <Text style={[text.muted, { fontSize: 13 }]} numberOfLines={1}>
                    {i === 0 ? 'Разминка · ' : ''}
                    <Text style={{ color: colors.text, fontFamily: fonts.bodyBold }}>{amountLabel(item)}</Text>
                    {'  ·  '}
                    {ex.targets.join(', ')}
                  </Text>
                </View>
                {canReplace ? (
                  <Pressable accessibilityLabel="Заменить упражнение" hitSlop={8} onPress={() => replace(i)} style={({ pressed }) => [styles.swap, pressed && { opacity: 0.6 }]}>
                    <Ionicons name="swap-horizontal" size={18} color={colors.accent} />
                  </Pressable>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => router.push('/library')} style={({ pressed }) => [styles.libraryLink, pressed && { opacity: 0.8 }]}>
          <IconTile icon="bookshelf" />
          <View style={{ flex: 1 }}>
            <Text style={text.h3}>Все упражнения</Text>
            <Text style={[text.muted, { fontSize: 13 }]}>Библиотека с 3D-демонстрациями</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[text.muted, { fontSize: 12 }]}>{label}</Text>
    </View>
  );
}

/** This week Monday to Sunday; days with a finished workout are lit. */
function Week({ history }: { history: Finished[] }) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const done = new Set(history.map((h) => h.date));
  const today = dateKey(now);
  return (
    <View style={styles.week}>
      {WEEKDAYS.map((name, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const key = dateKey(d);
        const isDone = done.has(key);
        const isToday = key === today;
        return (
          <View key={name} style={styles.day}>
            <Text style={[styles.dayName, isToday && { color: colors.text }]}>{name}</Text>
            <View style={[styles.dayDot, isToday && styles.dayToday, isDone && styles.dayDone]}>
              {isDone ? (
                <Ionicons name="checkmark" size={16} color={colors.onAccent} />
              ) : (
                <Text style={[styles.dayNum, isToday && { color: colors.text }]}>{d.getDate()}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function longDate() {
  return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 20, paddingBottom: 40, gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 8 },
  dayName: { color: colors.faint, fontFamily: fonts.bodyBold, fontSize: 12 },
  dayDot: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  dayToday: { borderColor: colors.accent, borderWidth: 1.5 },
  dayDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayNum: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 14 },
  hero: { borderRadius: 28, padding: 20, gap: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(198,255,61,0.18)' },
  heroBadge: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, backgroundColor: colors.accent, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  heroBadgeText: { color: colors.onAccent, fontFamily: fonts.bodyHeavy, fontSize: 12 },
  stats: { flexDirection: 'row', alignItems: 'center' },
  statLine: { width: 1, height: 32, backgroundColor: colors.line, marginHorizontal: 14 },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  sectionHead: { gap: 2, marginTop: 4 },
  list: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  swap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  libraryLink: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
});

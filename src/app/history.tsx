import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { plural, ProgressCard } from '../components/ProgressCard';
import { getExercise, WARMUP_ID } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import { dateKey } from '../logic/plan';
import { setsLabel, volumeKg } from '../logic/progress';
import { storage, type Finished } from '../logic/storage';
import { Button, colors, Eyebrow, fonts, IconButton, IconTile, Ionicons, MaterialCommunityIcons, tap, text } from '../ui';

export default function History() {
  const { log } = useAppState();
  const [history, setHistory] = useState<Finished[] | null>(null);
  const [open, setOpen] = useState<number | null>(0);

  useFocusEffect(
    useCallback(() => {
      storage.getHistory().then(setHistory);
    }, []),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));
  if (!history) return null;

  const full = history.filter((h) => !h.partial);
  const monthAgo = dateKey(new Date(Date.now() - 30 * 86_400_000));
  const lastMonth = full.filter((h) => h.date >= monthAgo).length;
  const minutes = history.reduce((s, h) => s + h.minutes, 0);
  const progress = Object.entries(log)
    .filter(([id, sessions]) => id !== WARMUP_ID && sessions.length > 0 && getExercise(id))
    .sort(([, a], [, b]) => (a[0].date < b[0].date ? 1 : a[0].date > b[0].date ? -1 : b.length - a.length));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <IconButton icon="chevron-back" label="Назад" onPress={back} />
        <Text style={[text.h3, { flex: 1 }]}>История и прогресс</Text>
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.stats}>
          <Stat icon="check-decagram" value={String(full.length)} label={plural(full.length, 'тренировка', 'тренировки', 'тренировок')} />
          <Stat icon="calendar-month" value={String(lastMonth)} label="за 30 дней" />
          <Stat icon="timer-outline" value={String(minutes)} label="минут всего" />
        </View>

        {history.length === 0 ? (
          <View style={styles.empty}>
            <IconTile icon="chart-line" size={64} />
            <Text style={[text.h2, { textAlign: 'center' }]}>Здесь появится твой прогресс</Text>
            <Text style={[text.muted, { textAlign: 'center' }]}>
              Пройди первую тренировку. Приложение запомнит веса и повторы и в следующий раз само предложит чуть больше.
            </Text>
            <Button title="К тренировке" icon="play" onPress={() => router.replace('/today')} style={{ alignSelf: 'stretch' }} />
          </View>
        ) : (
          <>
            {progress.length > 0 && (
              <View style={{ gap: 12 }}>
                <View style={{ gap: 2 }}>
                  <Text style={text.h2}>Прогресс</Text>
                  <Text style={text.muted}>Как растут вес и повторы в каждом упражнении</Text>
                </View>
                {progress.map(([id, sessions]) => (
                  <ProgressCard key={id} exercise={getExercise(id)!} sessions={sessions} />
                ))}
              </View>
            )}

            <View style={{ gap: 12 }}>
              <Text style={text.h2}>Тренировки</Text>
              {history.map((h, i) => (
                <WorkoutRow
                  key={`${h.date}-${h.at ?? i}`}
                  entry={h}
                  open={open === i}
                  onPress={() => {
                    tap();
                    setOpen(open === i ? null : i);
                  }}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WorkoutRow({ entry, open, onPress }: { entry: Finished; open: boolean; onPress: () => void }) {
  const items = entry.items ?? [];
  const volume = volumeKg(items);
  return (
    <View style={styles.workout}>
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.workoutHead, pressed && { opacity: 0.85 }]}>
        <View style={[styles.dateBox, entry.partial && { backgroundColor: colors.card2 }]}>
          <Text style={[styles.dateDay, entry.partial && { color: colors.text }]}>{Number(entry.date.slice(8, 10))}</Text>
          <Text style={[styles.dateMonth, entry.partial && { color: colors.muted }]}>{monthShort(entry.date)}</Text>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={text.h3} numberOfLines={1}>
            {entry.title}
          </Text>
          <Text style={[text.muted, { fontSize: 13 }]} numberOfLines={1}>
            {entry.partial ? 'Не до конца · ' : ''}
            {entry.exercises} упр. · {entry.minutes} мин{volume > 0 ? ` · ${volume} кг` : ''}
          </Text>
        </View>
        {items.length > 0 && <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />}
      </Pressable>
      {open && items.length > 0 && (
        <View style={styles.items}>
          {items.map((it, i) => {
            const ex = getExercise(it.exerciseId);
            return (
              <View key={`${it.exerciseId}-${i}`} style={styles.itemRow}>
                <Text style={[text.body, { flex: 1 }]} numberOfLines={1}>
                  {ex?.name ?? it.exerciseId}
                </Text>
                <Text style={styles.itemSets}>{setsLabel(it.sets, it.timed)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function Stat({ icon, value, label }: { icon: 'check-decagram' | 'calendar-month' | 'timer-outline'; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <MaterialCommunityIcons name={icon} size={18} color={colors.accent} />
      <Text style={styles.statValue}>{value}</Text>
      <Eyebrow style={{ fontSize: 10, letterSpacing: 0.6, textAlign: 'center' }}>{label}</Eyebrow>
    </View>
  );
}

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
function monthShort(date: string) {
  return MONTHS[Number(date.slice(5, 7)) - 1] ?? '';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, maxWidth: 560, width: '100%', alignSelf: 'center' },
  page: { padding: 20, paddingTop: 12, paddingBottom: 40, gap: 24, maxWidth: 560, width: '100%', alignSelf: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 24 },
  empty: { alignItems: 'center', gap: 14, paddingVertical: 24 },
  workout: { borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  workoutHead: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  dateBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  dateDay: { color: colors.onAccent, fontFamily: fonts.display, fontSize: 18, lineHeight: 20 },
  dateMonth: { color: colors.onAccent, fontFamily: fonts.bodyBold, fontSize: 11 },
  items: { borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 14, paddingVertical: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  itemSets: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13 },
});

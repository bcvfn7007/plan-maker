import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HoursGrid, MethodSteps } from '../../components/HoursGrid';
import { Ring } from '../../components/Ring';
import { dateKey } from '../../logic/plan';
import { addSession, dailyMinutes, GOAL_MINUTES, hoursLabel, lastNote, minutesOn, suggestedPart, totalMinutes, type Skill } from '../../logic/skill';
import { storage } from '../../logic/storage';
import { Button, Chip, colors, Eyebrow, fonts, IconButton, Ionicons, MaterialCommunityIcons, type SportIconName, tap, text } from '../../ui';

type Phase = 'prepare' | 'focus' | 'review' | 'done';

const DURATIONS = [15, 25, 45, 60];

const CHECKLIST: { icon: SportIconName; label: string }[] = [
  { icon: 'cellphone-off', label: 'Телефон в беззвучном режиме' },
  { icon: 'bell-off-outline', label: 'Уведомления и соцсети выключены' },
  { icon: 'bag-checked', label: 'Всё нужное для практики под рукой' },
];

export default function SkillSession() {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [phase, setPhase] = useState<Phase>('prepare');
  const [checked, setChecked] = useState<boolean[]>(CHECKLIST.map(() => false));
  const [partId, setPartId] = useState<string>('');
  const [duration, setDuration] = useState(25);
  const [minutes, setMinutes] = useState(0);
  const [note, setNote] = useState('');
  const [before, setBefore] = useState(0);

  useEffect(() => {
    storage.getSkill().then((s) => {
      if (!s) return router.replace('/skill');
      setSkill(s);
      setPartId(suggestedPart(s)?.id ?? s.parts[0]?.id ?? '');
      // Offer the length closest to what is left of today's plan.
      const daily = dailyMinutes(s, dateKey());
      if (daily !== undefined) {
        const want = Math.max(15, daily - minutesOn(s, dateKey()));
        setDuration(DURATIONS.reduce((best, d) => (Math.abs(d - want) < Math.abs(best - want) ? d : best), DURATIONS[0]));
      }
    });
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/skill'));

  if (!skill) return null;
  const part = skill.parts.find((p) => p.id === partId) ?? skill.parts[0];
  const ready = checked.every(Boolean);

  const finishFocus = (elapsedMs: number) => {
    const m = Math.round(elapsedMs / 60000);
    if (m < 1) {
      // Under a minute is not worth a record; just leave.
      close();
      return;
    }
    tap('success');
    setMinutes(m);
    setPhase('review');
  };

  const save = async (withNote: string) => {
    const updated = addSession(skill, { date: dateKey(), minutes, partId: part.id, note: withNote.trim() || undefined });
    setBefore(totalMinutes(skill));
    await storage.saveSkill(updated);
    setSkill(updated);
    setPhase('done');
  };

  if (phase === 'focus') {
    return <Focus partName={part.name} skillName={skill.name} durationMin={duration} onFinish={finishFocus} />;
  }

  if (phase === 'review') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <MethodSteps current={1} />
          <View style={{ gap: 6 }}>
            <Eyebrow>+{hoursLabel(minutes)} · {part.name}</Eyebrow>
            <Text style={text.h1}>Найди свою ошибку</Text>
            <Text style={text.muted}>Что сегодня получалось хуже всего? Что исправишь в следующий раз? Так ты учишься сам себя поправлять.</Text>
          </View>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Например: сбиваюсь при смене G на C, играть медленнее"
            placeholderTextColor={colors.faint}
            style={styles.noteInput}
            multiline
            maxLength={160}
            autoFocus
          />
          <Button title="Сохранить" icon="checkmark" onPress={() => save(note)} />
          <Button kind="ghost" title="Пропустить" onPress={() => save('')} style={{ minHeight: 44 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'done') {
    const total = totalMinutes(skill);
    const newHours = Math.floor(total / 60) - Math.floor(before / 60);
    const daily = dailyMinutes(skill, dateKey());
    const todayMin = minutesOn(skill, dateKey());
    return (
      <SafeAreaView style={[styles.screen, { justifyContent: 'center' }]}>
        <View style={[styles.page, { gap: 22 }]}>
          <View style={{ alignItems: 'center', gap: 14 }}>
            <View style={styles.badge}>
              <MaterialCommunityIcons name={total >= GOAL_MINUTES ? 'trophy' : 'check-bold'} size={48} color={colors.onAccent} />
            </View>
            <Text style={[text.h1, { textAlign: 'center' }]}>{total >= GOAL_MINUTES ? '20 часов пройдено!' : `+${hoursLabel(minutes)} практики`}</Text>
            <Text style={[text.muted, { textAlign: 'center' }]}>
              {newHours > 0 ? `Закрыт ${Math.floor(total / 60)}-й час из 20. ` : ''}
              Всего {hoursLabel(total)}
              {total < GOAL_MINUTES ? `, осталось ${hoursLabel(GOAL_MINUTES - total)}.` : '.'}
            </Text>
            {daily !== undefined && total < GOAL_MINUTES && (
              <View style={[styles.planPill, todayMin >= daily && { backgroundColor: colors.accentSoft }]}>
                <MaterialCommunityIcons name={todayMin >= daily ? 'calendar-check' : 'calendar-clock'} size={16} color={todayMin >= daily ? colors.accent : colors.muted} />
                <Text style={[styles.planText, todayMin >= daily && { color: colors.accent }]}>
                  {todayMin >= daily ? 'План на сегодня выполнен' : `План на сегодня: ${todayMin} из ${daily} мин`}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.card}>
            <HoursGrid minutes={total} />
          </View>
          <Button title="Готово" icon="checkmark" onPress={close} />
        </View>
      </SafeAreaView>
    );
  }

  // prepare
  const note0 = lastNote(skill);
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <IconButton icon="close" label="Закрыть" onPress={close} />
        <Text style={[text.h3, { flex: 1 }]} numberOfLines={1}>
          {skill.name}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <MethodSteps current={2} />
        <View style={{ gap: 6 }}>
          <Eyebrow>Перед практикой</Eyebrow>
          <Text style={text.h1}>Убери отвлечения</Text>
          <Text style={text.muted}>Сделай так, чтобы ничего не мешало просто сесть и заниматься.</Text>
        </View>

        <View style={styles.list}>
          {CHECKLIST.map((c, i) => (
            <Pressable
              key={c.label}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: checked[i] }}
              onPress={() => {
                tap();
                setChecked(checked.map((v, j) => (j === i ? !v : v)));
              }}
              style={({ pressed }) => [styles.checkRow, i === CHECKLIST.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.card2 }]}
            >
              <MaterialCommunityIcons name={c.icon} size={22} color={checked[i] ? colors.accent : colors.muted} />
              <Text style={[text.h3, { flex: 1, fontSize: 15 }, !checked[i] && { color: colors.muted }]}>{c.label}</Text>
              <View style={[styles.box, checked[i] && styles.boxOn]}>{checked[i] && <Ionicons name="checkmark" size={16} color={colors.onAccent} />}</View>
            </Pressable>
          ))}
        </View>

        {note0 && (
          <View style={styles.noteCard}>
            <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.warn} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[text.muted, { fontSize: 12 }]}>Сегодня исправляешь</Text>
              <Text style={text.body}>{note0.note}</Text>
            </View>
          </View>
        )}

        <View style={{ gap: 10 }}>
          <Text style={text.h3}>Над чем работаешь</Text>
          <View style={styles.chips}>
            {skill.parts.map((p) => (
              <Chip key={p.id} label={p.name} selected={p.id === part.id} onPress={() => setPartId(p.id)} />
            ))}
          </View>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={text.h3}>Сколько минут</Text>
          <View style={styles.chips}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} мин`} selected={d === duration} onPress={() => setDuration(d)} />
            ))}
          </View>
        </View>

        <Button
          title={ready ? 'Начать фокус' : 'Отметь все три пункта'}
          icon={ready ? 'play' : undefined}
          kind={ready ? 'primary' : 'secondary'}
          onPress={() => ready && setPhase('focus')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/** The focus timer. Counts wall-clock time, so it stays right if the screen sleeps. */
function Focus({ partName, skillName, durationMin, onFinish }: { partName: string; skillName: string; durationMin: number; onFinish: (elapsedMs: number) => void }) {
  const total = durationMin * 60_000;
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const acc = useRef(0);
  const since = useRef<number | null>(Date.now());
  const finished = useRef(false);
  const done = useRef(onFinish);
  done.current = onFinish;

  const now = () => acc.current + (since.current ? Date.now() - since.current : 0);

  useEffect(() => {
    const id = setInterval(() => {
      const e = now();
      setElapsed(e);
      if (e >= total && !finished.current) {
        finished.current = true;
        clearInterval(id);
        done.current(total);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const togglePause = () => {
    if (paused) {
      since.current = Date.now();
    } else {
      acc.current = now();
      since.current = null;
    }
    setPaused(!paused);
  };

  const stop = () => {
    if (finished.current) return;
    finished.current = true;
    done.current(now());
  };

  const left = Math.max(0, total - elapsed);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={[styles.page, { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 28 }]}>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Eyebrow>{skillName} · фокус</Eyebrow>
          <Text style={[text.h2, { textAlign: 'center' }]}>{partName}</Text>
        </View>
        <Ring size={260} progress={left / total} color={paused ? colors.warn : colors.accent}>
          <Text style={styles.timer}>
            {mm}:{String(ss).padStart(2, '0')}
          </Text>
          <Text style={[text.muted, { fontSize: 13 }]}>{paused ? 'пауза' : 'осталось'}</Text>
        </Ring>
        <Text style={[text.muted, { textAlign: 'center', maxWidth: 300 }]}>Только практика. Ошибаешься — замечай, что не так, и пробуй снова.</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
          <Button kind="secondary" icon={paused ? 'play' : 'pause'} title={paused ? 'Дальше' : 'Пауза'} onPress={togglePause} style={{ flex: 1 }} />
          <Button kind="secondary" icon="stop" title="Закончить" onPress={stop} style={{ flex: 1 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, maxWidth: 560, width: '100%', alignSelf: 'center' },
  page: { padding: 20, paddingBottom: 40, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  list: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.warnSoft, borderWidth: 1, borderColor: 'rgba(255,181,71,0.25)' },
  noteInput: { minHeight: 120, padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15, textAlignVertical: 'top' },
  timer: { color: colors.text, fontFamily: fonts.displayHeavy, fontSize: 60, lineHeight: 68, letterSpacing: -2 },
  badge: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOpacity: 0.5, shadowRadius: 40 },
  planPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.card2 },
  planText: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 13 },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.line },
});

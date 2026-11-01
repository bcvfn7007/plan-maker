import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HoursGrid, METHOD_STEPS, MethodSteps } from '../../components/HoursGrid';
import { SuccessFormula } from '../../components/SuccessFormula';
import { CUSTOM_SKILL_ID, getPreset, SKILL_PRESETS } from '../../data/skills';
import { dateKey } from '../../logic/plan';
import {
  addDays,
  dailyFor,
  dailyMinutes,
  daysLeft,
  DEADLINE_OPTIONS,
  deadlineLabel,
  GOAL_MINUTES,
  hoursLabel,
  ladderLevel,
  lastNote,
  minutesOn,
  newSkill,
  streak,
  suggestedPart,
  totalMinutes,
  type Skill,
} from '../../logic/skill';
import { storage } from '../../logic/storage';
import { Button, colors, Eyebrow, fonts, IconButton, IconTile, Ionicons, MaterialCommunityIcons, tap, text } from '../../ui';

export default function SkillScreen() {
  const [skill, setSkill] = useState<Skill | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      storage.getSkill().then(setSkill);
    }, []),
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  if (skill === undefined) return null;
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.top}>
        <IconButton icon="chevron-back" label="Назад" onPress={close} />
        <Text style={[text.h3, { flex: 1 }]}>Навык за 20 часов</Text>
      </View>
      {skill ? (
        <Dashboard
          skill={skill}
          onChange={async (s) => {
            await storage.saveSkill(s);
            setSkill(s);
          }}
          onReset={async () => {
            await storage.removeSkill();
            setSkill(null);
          }}
        />
      ) : (
        <Setup
          onStart={async (s) => {
            await storage.saveSkill(s);
            setSkill(s);
          }}
        />
      )}
    </SafeAreaView>
  );
}

/* ───────────────────────── Setup: pick a skill, break it into parts ───────────────────────── */

function Setup({ onStart }: { onStart: (s: Skill) => void }) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [days, setDays] = useState(30);
  const [presetId, setPresetId] = useState<string>('guitar');
  const [customName, setCustomName] = useState('');
  const [parts, setParts] = useState<string[]>(getPreset('guitar')!.parts);
  const [newPart, setNewPart] = useState('');

  const preset = getPreset(presetId);
  const isCustom = presetId === CUSTOM_SKILL_ID;
  const name = isCustom ? customName.trim() : preset!.name;

  const choose = (id: string) => {
    setPresetId(id);
    setParts(getPreset(id)?.parts ?? []);
  };

  const addPart = () => {
    const p = newPart.trim();
    if (!p) return;
    tap();
    setParts((prev) => [...prev, p]);
    setNewPart('');
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    tap();
    const next = [...parts];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setParts(next);
  };

  if (step === 0) {
    return (
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={[text.h1, { fontSize: 26, lineHeight: 32 }]}>Выучи любой навык за 20 часов</Text>
          <Text style={text.muted}>Не нужны годы. Нужны 20 часов честной практики по четырём шагам:</Text>
          <View style={{ gap: 10, marginTop: 4 }}>
            {METHOD_STEPS.map((s, i) => (
              <View key={s.short} style={styles.methodRow}>
                <View style={styles.methodNum}>
                  <Text style={styles.methodNumText}>{i + 1}</Text>
                </View>
                <Text style={[text.body, { flex: 1 }]}>{s.title}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={text.h2}>Что хочешь выучить?</Text>
        <View style={styles.presetGrid}>
          {SKILL_PRESETS.map((p) => (
            <PresetTile key={p.id} icon={p.icon} label={p.name} selected={presetId === p.id} onPress={() => choose(p.id)} />
          ))}
          <PresetTile icon="star-four-points" label="Свой навык" selected={isCustom} onPress={() => choose(CUSTOM_SKILL_ID)} />
        </View>
        {isCustom && (
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="Например: жонглирование"
            placeholderTextColor={colors.faint}
            style={styles.input}
            autoFocus
            maxLength={40}
          />
        )}
        <Button title="Дальше" icon="arrow-forward" onPress={() => name && setStep(1)} style={!name && { opacity: 0.4 }} />
      </ScrollView>
    );
  }

  if (step === 2) {
    return (
      <DeadlineStep
        name={name}
        days={days}
        setDays={setDays}
        onBack={() => setStep(1)}
        onStart={() => onStart(newSkill(presetId, name, preset?.icon ?? 'star-four-points', parts, preset?.basics ?? [], addDays(dateKey(), days - 1)))}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <MethodSteps current={0} />
      <View style={{ gap: 6 }}>
        <Eyebrow>Шаг 1 · {name}</Eyebrow>
        <Text style={text.h2}>Разбей на части</Text>
        <Text style={text.muted}>Любой навык состоит из маленьких навыков. Самое важное поставь наверх: на него уйдёт больше времени.</Text>
      </View>

      <View style={styles.list}>
        {parts.map((p, i) => (
          <View key={`${p}-${i}`} style={[styles.partRow, i === parts.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.rank, i === 0 && { backgroundColor: colors.accent }]}>
              <Text style={[styles.rankText, i === 0 && { color: colors.onAccent }]}>{i + 1}</Text>
            </View>
            <Text style={[text.h3, { flex: 1 }]} numberOfLines={2}>
              {p}
            </Text>
            {i > 0 && (
              <Pressable accessibilityLabel="Поднять выше" hitSlop={6} onPress={() => moveUp(i)} style={({ pressed }) => [styles.smallBtn, pressed && { opacity: 0.6 }]}>
                <Ionicons name="arrow-up" size={16} color={colors.accent} />
              </Pressable>
            )}
            <Pressable
              accessibilityLabel="Убрать"
              hitSlop={6}
              onPress={() => {
                tap();
                setParts(parts.filter((_, j) => j !== i));
              }}
              style={({ pressed }) => [styles.smallBtn, { backgroundColor: colors.card2 }, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>
        ))}
        {parts.length === 0 && <Text style={[text.muted, { padding: 16 }]}>Добавь хотя бы одну часть навыка.</Text>}
      </View>

      <View style={styles.addRow}>
        <TextInput
          value={newPart}
          onChangeText={setNewPart}
          onSubmitEditing={addPart}
          placeholder="Добавить свою часть"
          placeholderTextColor={colors.faint}
          style={[styles.input, { flex: 1 }]}
          maxLength={40}
          returnKeyType="done"
        />
        <Pressable accessibilityLabel="Добавить" onPress={addPart} style={({ pressed }) => [styles.addBtn, !newPart.trim() && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}>
          <Ionicons name="add" size={24} color={colors.onAccent} />
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button kind="secondary" title="Назад" onPress={() => setStep(0)} style={{ flex: 1 }} />
        <Button title="Дальше" icon="arrow-forward" style={[{ flex: 2 }, parts.length === 0 && { opacity: 0.4 }]} onPress={() => parts.length > 0 && setStep(2)} />
      </View>
    </ScrollView>
  );
}

/** Last setup step: a deadline turns the goal into an objective, and the daily minutes into a plan. */
function DeadlineStep({ name, days, setDays, onBack, onStart }: { name: string; days: number; setDays: (d: number) => void; onBack: () => void; onStart: () => void }) {
  const deadline = addDays(dateKey(), days - 1);
  const daily = dailyFor(days);
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={{ gap: 6 }}>
        <Eyebrow>{name}</Eyebrow>
        <Text style={text.h2}>Поставь срок</Text>
        <Text style={text.muted}>Цель без срока — это просто мечта. Выбери, за сколько пройдёшь 20 часов, и план на каждый день посчитается сам.</Text>
      </View>
      <View style={styles.deadlineGrid}>
        {DEADLINE_OPTIONS.map((o) => (
          <Pressable
            key={o.days}
            accessibilityRole="button"
            onPress={() => {
              tap();
              setDays(o.days);
            }}
            style={({ pressed }) => [styles.deadline, days === o.days && styles.presetOn, pressed && { opacity: 0.85 }]}
          >
            <Text style={[text.h3, days === o.days && { color: colors.accent }]}>{o.label}</Text>
            <Text style={[text.muted, { fontSize: 13 }]}>{dailyFor(o.days)} мин в день</Text>
          </Pressable>
        ))}
      </View>
      <SuccessFormula
        goal={name}
        deadline={`до ${deadlineLabel(deadline)}`}
        plan={`${daily} мин в день`}
        consistency={{ value: 'Каждый день', done: false }}
        level={2}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button kind="secondary" title="Назад" onPress={onBack} style={{ flex: 1 }} />
        <Button title="Начать путь" icon="flag" style={{ flex: 2 }} onPress={onStart} />
      </View>
    </ScrollView>
  );
}

function PresetTile({ icon, label, selected, onPress }: { icon: React.ComponentProps<typeof IconTile>['icon']; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.preset, selected && styles.presetOn, pressed && { opacity: 0.85 }]}
    >
      <IconTile icon={icon} size={40} active={selected} />
      <Text style={[text.h3, { fontSize: 14, lineHeight: 18, flex: 1 }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ───────────────────────── Dashboard: the 20 blocks and the parts ───────────────────────── */

function Dashboard({ skill, onChange, onReset }: { skill: Skill; onChange: (s: Skill) => void; onReset: () => void }) {
  const [showBasics, setShowBasics] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const total = totalMinutes(skill);
  const done = total >= GOAL_MINUTES;
  const next = suggestedPart(skill);
  const note = lastNote(skill);
  const today = dateKey();
  const days = streak(skill, today);
  const daily = dailyMinutes(skill, today);
  const todayMin = minutesOn(skill, today);
  const validDeadline = skill.deadline && daysLeft(skill.deadline, today) > 0 ? skill.deadline : undefined;
  const maxPart = Math.max(1, ...skill.parts.map((p) => p.minutes));

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.hero}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconTile icon={skill.icon} size={48} active />
          <View style={{ flex: 1 }}>
            <Eyebrow>{done ? 'Цель достигнута' : 'Мой навык'}</Eyebrow>
            <Text style={[text.h2, { fontSize: 18, lineHeight: 24 }]} numberOfLines={2}>
              {skill.name}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Text style={styles.bigHours}>{Math.floor(total / 60)}</Text>
          <Text style={[text.muted, { marginBottom: 8 }]}>
            {total % 60 ? `ч ${Math.round(total % 60)} мин` : 'ч'} из 20
          </Text>
          <View style={{ flex: 1 }} />
          {days > 0 && (
            <View style={[styles.streak, { marginBottom: 8 }]} accessibilityLabel={`${days} дн. подряд`}>
              <MaterialCommunityIcons name="fire" size={16} color={colors.warn} />
              <Text style={styles.streakText}>{days} дн.</Text>
            </View>
          )}
        </View>
        <HoursGrid minutes={total} />
        <Text style={[text.muted, { fontSize: 13 }]}>
          {done ? '20 часов практики позади. Можно взять следующий навык.' : `Осталось ${hoursLabel(GOAL_MINUTES - total)}. Каждый квадрат — один час.`}
        </Text>
      </View>

      {daily !== undefined && !done && (
        <View style={styles.todayPlan}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[text.muted, { fontSize: 12 }]}>План на сегодня</Text>
            <Text style={text.h3}>{todayMin >= daily ? `Сделано: ${todayMin} из ${daily} мин` : `${todayMin} из ${daily} мин`}</Text>
          </View>
          <View style={styles.todayBar}>
            <View style={[styles.todayFill, { width: `${Math.min(1, daily ? todayMin / daily : 1) * 100}%` }]} />
          </View>
        </View>
      )}

      <Button title={total === 0 ? 'Первая практика' : 'Начать практику'} icon="play" onPress={() => router.push('/skill/session')} />

      {note && (
        <View style={styles.noteCard}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.warn} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[text.muted, { fontSize: 12 }]}>Заметка с прошлого раза: что исправить</Text>
            <Text style={text.body}>{note.note}</Text>
          </View>
        </View>
      )}

      <View style={styles.sectionHead}>
        <Text style={text.h2}>Части навыка</Text>
        <Text style={text.muted}>Самое важное сверху</Text>
      </View>
      <View style={styles.list}>
        {skill.parts.map((p, i) => (
          <View key={p.id} style={[styles.partRow, i === skill.parts.length - 1 && { borderBottomWidth: 0 }]}>
            <View style={[styles.rank, p.id === next?.id && !done && { backgroundColor: colors.accent }]}>
              <Text style={[styles.rankText, p.id === next?.id && !done && { color: colors.onAccent }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[text.h3, { flex: 1 }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.partTime}>{p.minutes ? hoursLabel(p.minutes) : '—'}</Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${(p.minutes / maxPart) * 100}%` }]} />
              </View>
              {p.id === next?.id && !done && <Text style={[styles.nextLabel]}>Следующая практика</Text>}
            </View>
          </View>
        ))}
      </View>

      {!done && (
        <SuccessFormula
          goal={skill.name}
          deadline={validDeadline ? `${deadlineLabel(validDeadline)} · ${daysLeft(validDeadline, today)} дн.` : skill.deadline ? 'Срок прошёл' : undefined}
          plan={daily !== undefined ? `${daily} мин в день` : undefined}
          consistency={{ value: days > 0 ? `${days} дн. подряд` : 'Начни сегодня', done: days >= 3 }}
          level={ladderLevel(skill, today)}
          onPickDeadline={(d) => {
            tap();
            onChange({ ...skill, deadline: addDays(today, d - 1) });
          }}
        />
      )}

      {skill.basics.length > 0 && (
        <>
          <Pressable
            onPress={() => {
              tap();
              setShowBasics(!showBasics);
            }}
            style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.8 }]}
          >
            <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={text.h3}>Минимум теории</Text>
              <Text style={[text.muted, { fontSize: 13 }]}>Ровно столько, чтобы видеть свои ошибки</Text>
            </View>
            <Ionicons name={showBasics ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
          </Pressable>
          {showBasics && (
            <View style={[styles.list, { padding: 16, gap: 12 }]}>
              {skill.basics.map((b) => (
                <View key={b} style={{ flexDirection: 'row', gap: 10 }}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
                  <Text style={[text.body, { flex: 1 }]}>{b}</Text>
                </View>
              ))}
              <Text style={[text.muted, { fontSize: 13 }]}>Не сиди неделями в уроках. Узнал основу — сразу практикуйся.</Text>
            </View>
          )}
        </>
      )}

      <Button
        kind="ghost"
        title={confirmReset ? 'Точно? Прогресс удалится. Нажми ещё раз' : 'Выбрать другой навык'}
        onPress={() => (confirmReset ? onReset() : setConfirmReset(true))}
        style={{ minHeight: 44 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, maxWidth: 560, width: '100%', alignSelf: 'center' },
  page: { padding: 20, paddingBottom: 40, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
  intro: { gap: 10, padding: 18, borderRadius: 26, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(198,255,61,0.18)' },
  methodRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  methodNumText: { color: colors.onAccent, fontFamily: fonts.display, fontSize: 13 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preset: { width: '48%', flexGrow: 1, flexBasis: '40%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  presetOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  input: { minHeight: 52, paddingHorizontal: 16, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, color: colors.text, fontFamily: fonts.bodyMedium, fontSize: 15 },
  list: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rank: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: colors.muted, fontFamily: fonts.display, fontSize: 13 },
  smallBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addBtn: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  hero: { gap: 14, padding: 18, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: 'rgba(198,255,61,0.18)' },
  bigHours: { color: colors.text, fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 60, letterSpacing: -2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.warnSoft },
  streakText: { color: colors.warn, fontFamily: fonts.bodyHeavy, fontSize: 14 },
  noteCard: { flexDirection: 'row', gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.warnSoft, borderWidth: 1, borderColor: 'rgba(255,181,71,0.25)' },
  sectionHead: { gap: 2, marginTop: 4 },
  partTime: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 13 },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.card2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2, backgroundColor: colors.accent },
  nextLabel: { color: colors.accent, fontFamily: fonts.bodyBold, fontSize: 12 },
  deadlineGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  deadline: { flexBasis: '40%', flexGrow: 1, gap: 2, padding: 14, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  todayPlan: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  todayBar: { width: 96, height: 8, borderRadius: 4, backgroundColor: colors.card2, overflow: 'hidden' },
  todayFill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
});

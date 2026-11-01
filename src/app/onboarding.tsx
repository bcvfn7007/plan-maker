import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Level, Place } from '../data/exercises';
import { useAppState } from '../logic/AppState';
import type { Coach, Goal, Profile } from '../logic/plan';
import { Button, colors, Eyebrow, fonts, IconButton, MaterialCommunityIcons, tap, text, type SportIconName } from '../ui';

type Option<T> = { value: T; label: string; hint: string; icon: SportIconName };
type Step<T> = { title: string; subtitle: string; options: Option<T>[]; columns?: 2 };

const GOAL: Step<Goal> = {
  title: 'Какая у тебя цель?',
  subtitle: 'От цели зависят повторения и отдых между подходами.',
  options: [
    { value: 'fit', label: 'Быть в форме', hint: 'Сила, выносливость и бодрость', icon: 'run' },
    { value: 'weightloss', label: 'Похудеть', hint: 'Больше кардио, короткий отдых', icon: 'fire' },
    { value: 'strength', label: 'Стать сильнее', hint: 'Меньше повторений, длинный отдых', icon: 'weight-lifter' },
  ],
};
const LEVEL: Step<Level> = {
  title: 'Какой у тебя опыт?',
  subtitle: 'Новичкам дам меньше подходов и простые упражнения.',
  options: [
    { value: 'beginner', label: 'Новичок', hint: 'Только начинаю или был долгий перерыв', icon: 'sprout' },
    { value: 'intermediate', label: 'Уже тренируюсь', hint: 'Занимаюсь регулярно хотя бы пару месяцев', icon: 'arm-flex' },
  ],
};
const PLACE: Step<Place> = {
  title: 'Где будешь заниматься?',
  subtitle: 'Дома подберу упражнения без тренажёров.',
  options: [
    { value: 'home', label: 'Дома', hint: 'Свой вес, без оборудования', icon: 'home-outline' },
    { value: 'gym', label: 'В зале', hint: 'Гантели и тренажёры', icon: 'dumbbell' },
  ],
};
const MINUTES: Step<Profile['minutes']> = {
  title: 'Сколько есть времени?',
  subtitle: 'На одну тренировку. Можно поменять в любой момент.',
  options: [
    { value: 20, label: '20 минут', hint: '4 упражнения, быстро и бодро', icon: 'timer-sand' },
    { value: 30, label: '30 минут', hint: '5 упражнений, золотая середина', icon: 'timer-outline' },
    { value: 45, label: '45 минут', hint: '7 упражнений, полноценная тренировка', icon: 'clock-outline' },
  ],
};
const COACH: Step<Coach> = {
  title: 'Кто будет показывать?',
  subtitle: '3D-тренер покажет каждое упражнение со всех сторон.',
  columns: 2,
  options: [
    { value: 'male', label: 'Парень', hint: 'Тренер Макс', icon: 'face-man-profile' },
    { value: 'female', label: 'Девушка', hint: 'Тренер Алина', icon: 'face-woman-profile' },
  ],
};

export default function Onboarding() {
  const { profile, saveProfile } = useAppState();
  const [answers, setAnswers] = useState({
    goal: profile?.goal ?? ('fit' as Goal),
    level: profile?.level ?? ('beginner' as Level),
    place: profile?.place ?? ('home' as Place),
    minutes: profile?.minutes ?? (30 as Profile['minutes']),
    coach: profile?.coach ?? ('male' as Coach),
  });
  const [step, setStep] = useState(0);

  const steps = [
    { key: 'goal', q: GOAL },
    { key: 'level', q: LEVEL },
    { key: 'place', q: PLACE },
    { key: 'minutes', q: MINUTES },
    { key: 'coach', q: COACH },
  ] as const;
  const current = steps[step];
  const last = step === steps.length - 1;

  // Each step slides in softly.
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, [step, appear]);

  const save = async () => {
    tap('success');
    await saveProfile({ ...answers, disliked: profile?.disliked ?? [] });
    router.replace('/today');
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
    else if (router.canGoBack()) router.back();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.top}>
        {step > 0 || router.canGoBack() ? <IconButton icon="chevron-back" label="Назад" onPress={back} /> : <View style={{ width: 44 }} />}
        <View style={styles.progress}>
          {steps.map((s, i) => (
            <View key={s.key} style={[styles.progressPart, i <= step && { backgroundColor: colors.accent }]} />
          ))}
        </View>
        <Text style={styles.counter}>
          {step + 1}/{steps.length}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <Animated.View
          style={{
            gap: 24,
            opacity: appear,
            transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <View style={{ gap: 8 }}>
            <Eyebrow>{step === 0 ? 'Давай познакомимся' : `Вопрос ${step + 1}`}</Eyebrow>
            <Text style={text.h1}>{current.q.title}</Text>
            <Text style={text.muted}>{current.q.subtitle}</Text>
          </View>
          <View style={[styles.options, current.q.columns === 2 && styles.optionsRow]}>
            {(current.q.options as Option<unknown>[]).map((o) => (
              <OptionCard
                key={String(o.value)}
                option={o}
                tall={current.q.columns === 2}
                selected={answers[current.key] === o.value}
                onPress={() => setAnswers({ ...answers, [current.key]: o.value })}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={styles.bottom}>
        <Button title={last ? 'Составить мой план' : 'Дальше'} icon={last ? 'sparkles' : 'arrow-forward'} onPress={last ? save : () => setStep(step + 1)} />
      </View>
    </SafeAreaView>
  );
}

function OptionCard({ option, selected, onPress, tall }: { option: Option<unknown>; selected: boolean; onPress: () => void; tall?: boolean }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.option, tall && styles.optionTall, selected && styles.optionOn, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.optionIcon, tall && styles.optionIconTall, selected && { backgroundColor: colors.accent }]}>
        <MaterialCommunityIcons name={option.icon} size={tall ? 44 : 24} color={selected ? colors.onAccent : colors.accent} />
      </View>
      <View style={{ flex: tall ? undefined : 1, gap: 2, alignItems: tall ? 'center' : 'flex-start' }}>
        <Text style={styles.optionLabel}>{option.label}</Text>
        <Text style={[text.muted, { fontSize: 13 }, tall && { textAlign: 'center' }]}>{option.hint}</Text>
      </View>
      {!tall && <View style={[styles.radio, selected && styles.radioOn]}>{selected && <View style={styles.radioDot} />}</View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4, maxWidth: 560, width: '100%', alignSelf: 'center' },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  progressPart: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.card2 },
  counter: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 13, minWidth: 28, textAlign: 'right' },
  page: { padding: 20, paddingTop: 28, maxWidth: 560, width: '100%', alignSelf: 'center' },
  options: { gap: 12 },
  optionsRow: { flexDirection: 'row' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  optionTall: { flex: 1, flexDirection: 'column', paddingVertical: 28, gap: 16 },
  optionOn: { borderColor: colors.accent, backgroundColor: '#151a10' },
  optionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  optionIconTall: { width: 88, height: 88, borderRadius: 44 },
  optionLabel: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 17 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
  bottom: { padding: 20, paddingTop: 8, maxWidth: 560, width: '100%', alignSelf: 'center' },
});

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Focus } from './data/exercises';

// "Night gym" style: dark stage, one neon accent, calm type with bold numbers.
export const colors = {
  bg: '#0a0b0d',
  card: '#14161a',
  card2: '#1b1e23',
  stage: '#0f1114',
  text: '#f5f6f8',
  muted: '#8d95a3',
  faint: '#5a616d',
  accent: '#c6ff3d',
  onAccent: '#0a0b0d',
  accentSoft: 'rgba(198,255,61,0.12)',
  accentLine: 'rgba(198,255,61,0.35)',
  line: 'rgba(255,255,255,0.07)',
  good: '#c6ff3d',
  warn: '#ffb547',
  warnSoft: 'rgba(255,181,71,0.10)',
  bad: '#ff6b6b',
  badSoft: 'rgba(255,107,107,0.12)',
};

export const fonts = {
  display: 'Unbounded_700Bold',
  displayHeavy: 'Unbounded_800ExtraBold',
  displayMedium: 'Unbounded_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
  bodyHeavy: 'Inter_700Bold',
};

export const space = { page: 20, gap: 12 };

/** A light tap on phones; nothing on the web. */
export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type SportIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export { Ionicons, MaterialCommunityIcons };

export const FOCUS: Record<Focus, { label: string; icon: SportIconName }> = {
  legs: { label: 'Ноги', icon: 'karate' },
  push: { label: 'Грудь и плечи', icon: 'arm-flex' },
  pull: { label: 'Спина и руки', icon: 'weight-lifter' },
  core: { label: 'Пресс', icon: 'yoga' },
  cardio: { label: 'Кардио', icon: 'heart-pulse' },
};

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const color = kind === 'primary' ? colors.onAccent : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap(kind === 'primary' ? 'medium' : 'light');
        onPress();
      }}
      style={({ pressed }) => [styles.button, styles[kind], pressed && styles.pressed, style]}
    >
      {icon && <Ionicons name={icon} size={20} color={color} />}
      <Text style={[styles.buttonText, { color }, kind === 'primary' && styles.buttonTextPrimary]}>{title}</Text>
    </Pressable>
  );
}

/** A round button with just an icon, e.g. close or settings. */
export function IconButton({ icon, onPress, label, style }: { icon: IconName; onPress: () => void; label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed, style]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, icon }: { label: string; selected: boolean; onPress: () => void; icon?: SportIconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, selected && styles.chipOn, pressed && styles.pressed]}
    >
      {icon && <MaterialCommunityIcons name={icon} size={16} color={selected ? colors.onAccent : colors.muted} />}
      <Text style={[styles.chipText, selected && { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

/** A small rounded label, e.g. a muscle group. */
export function Tag({ label, strong }: { label: string; strong?: boolean }) {
  return (
    <View style={[styles.tag, strong && { backgroundColor: colors.accentSoft }]}>
      {strong && <View style={styles.tagDot} />}
      <Text style={[styles.tagText, strong && { color: colors.accent }]}>{label}</Text>
    </View>
  );
}

/** A rounded square with a sport icon, used in lists. */
export function IconTile({ icon, size = 44, active }: { icon: SportIconName; size?: number; active?: boolean }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size * 0.32 }, active && { backgroundColor: colors.accent }]}>
      <MaterialCommunityIcons name={icon} size={size * 0.5} color={active ? colors.onAccent : colors.accent} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** Small uppercase label above a section. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: StyleProp<any> }) {
  return <Text style={[text.eyebrow, style]}>{children}</Text>;
}

export const text = StyleSheet.create({
  h1: { fontSize: 28, lineHeight: 34, fontFamily: fonts.display, color: colors.text, letterSpacing: -0.6 },
  h2: { fontSize: 20, lineHeight: 26, fontFamily: fonts.display, color: colors.text, letterSpacing: -0.3 },
  h3: { fontSize: 16, lineHeight: 22, fontFamily: fonts.bodyBold, color: colors.text },
  eyebrow: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.muted, textTransform: 'uppercase', letterSpacing: 1.4 },
  body: { fontSize: 15, fontFamily: fonts.body, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 14, fontFamily: fonts.body, color: colors.muted, lineHeight: 20 },
  big: { fontSize: 56, fontFamily: fonts.displayHeavy, color: colors.text, lineHeight: 62, letterSpacing: -2 },
});

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 18,
    minHeight: 58,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  secondary: { backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  buttonText: { fontSize: 15, fontFamily: fonts.bodyBold, textAlign: 'center' },
  buttonTextPrimary: { fontSize: 16, fontFamily: fonts.bodyHeavy, letterSpacing: 0.2 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chip: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 14, color: colors.text, fontFamily: fonts.bodyBold },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.card2 },
  tagDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  tagText: { fontSize: 12, color: colors.muted, fontFamily: fonts.bodyBold },
  tile: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  card: { backgroundColor: colors.card, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.line },
});

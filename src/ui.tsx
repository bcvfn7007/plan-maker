import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

// "Night gym" style: dark stage, one neon accent, bold display type.
export const colors = {
  bg: '#0c0e11',
  card: '#15181d',
  stage: '#121519',
  text: '#f2f4f7',
  muted: '#9aa3b2',
  accent: '#c6ff3d',
  onAccent: '#0c0e11',
  accentSoft: '#1b2414',
  line: '#262b33',
  good: '#c6ff3d',
};

export const fonts = {
  display: 'Unbounded_800ExtraBold',
  displayMedium: 'Unbounded_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyBold: 'Inter_600SemiBold',
};

export function Button({
  title,
  onPress,
  kind = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[kind], pressed && { opacity: 0.75 }, style]}
    >
      <Text style={[styles.buttonText, kind === 'primary' ? styles.buttonTextPrimary : { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && { color: colors.onAccent }]}>{label}</Text>
    </Pressable>
  );
}

/** A small rounded label, e.g. a muscle group. */
export function Tag({ label, strong }: { label: string; strong?: boolean }) {
  return (
    <View style={[styles.tag, strong && { backgroundColor: colors.accentSoft }]}>
      <Text style={[styles.tagText, strong && { color: colors.accent, fontFamily: fonts.bodyBold }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const text = StyleSheet.create({
  h1: { fontSize: 28, fontFamily: fonts.display, color: colors.text, textTransform: 'uppercase', letterSpacing: -0.3 },
  h2: { fontSize: 17, fontFamily: fonts.displayMedium, color: colors.text, textTransform: 'uppercase' },
  body: { fontSize: 16, fontFamily: fonts.body, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 14, fontFamily: fonts.body, color: colors.muted, lineHeight: 20 },
  big: { fontSize: 56, fontFamily: fonts.display, color: colors.accent, lineHeight: 62 },
});

const styles = StyleSheet.create({
  button: { borderRadius: 18, minHeight: 56, paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  ghost: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 15, fontFamily: fonts.bodyBold, textAlign: 'center' },
  buttonTextPrimary: { color: colors.onAccent, fontFamily: fonts.display, textTransform: 'uppercase', letterSpacing: 0.3 },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 15, color: colors.text, fontFamily: fonts.bodyBold },
  tag: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.card },
  tagText: { fontSize: 13, color: colors.muted, fontFamily: fonts.bodyMedium },
  card: { backgroundColor: colors.card, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.line },
});

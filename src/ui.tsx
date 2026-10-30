import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

export const colors = {
  bg: '#f4f6fa',
  card: '#ffffff',
  text: '#172033',
  muted: '#64708a',
  accent: '#e8693c',
  accentSoft: '#fde8df',
  line: '#e3e8f0',
  good: '#2f9e6b',
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
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[kind], pressed && { opacity: 0.75 }, style]}
    >
      <Text style={[styles.buttonText, kind !== 'primary' && { color: colors.accent }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const text = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  body: { fontSize: 16, color: colors.text, lineHeight: 22 },
  muted: { fontSize: 14, color: colors.muted, lineHeight: 20 },
});

const styles = StyleSheet.create({
  button: { borderRadius: 14, paddingVertical: 15, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.accentSoft },
  ghost: { backgroundColor: 'transparent' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 16 },
});

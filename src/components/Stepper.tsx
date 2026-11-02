import { Pressable, StyleSheet, Text, View } from 'react-native';

import { kgLabel } from '../logic/progress';
import { colors, fonts, Ionicons, tap } from '../ui';

/** A number with − and + buttons, for reps and weight during a workout. */
export function Stepper({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const change = (d: number) => {
    const v = Math.round((value + d) * 10) / 10;
    if (v < min || v > max) return;
    tap();
    onChange(v);
  };
  return (
    <View style={styles.box}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Round icon="remove" label={`${label}: меньше`} disabled={value - step < min} onPress={() => change(-step)} />
        <Text style={styles.value} accessibilityLabel={`${label}: ${kgLabel(value)}`}>
          {kgLabel(value)}
        </Text>
        <Round icon="add" label={`${label}: больше`} disabled={value + step > max} onPress={() => change(step)} />
      </View>
    </View>
  );
}

function Round({ icon, label, disabled, onPress }: { icon: 'add' | 'remove'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.round, disabled && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.92 }], backgroundColor: colors.accentSoft }]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, gap: 8, padding: 10, borderRadius: 18, backgroundColor: colors.card2 },
  label: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 12, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  value: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: 24, textAlign: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
});

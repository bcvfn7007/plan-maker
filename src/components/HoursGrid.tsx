import { StyleSheet, Text, View } from 'react-native';

import { GOAL_MINUTES } from '../logic/skill';
import { colors, fonts } from '../ui';

/** 20 blocks, one per hour of practice, filling up left to right (5 per row). */
export function HoursGrid({ minutes, size = 'big' }: { minutes: number; size?: 'big' | 'small' }) {
  const hours = Math.min(minutes, GOAL_MINUTES) / 60;
  const small = size === 'small';
  const gap = small ? 4 : 6;
  return (
    <View style={{ gap }} accessibilityLabel={`${Math.floor(hours)} из 20 часов`}>
      {[0, 1, 2, 3].map((row) => (
        <View key={row} style={{ flexDirection: 'row', gap }}>
          {[0, 1, 2, 3, 4].map((col) => {
            const i = row * 5 + col;
            const fill = Math.max(0, Math.min(1, hours - i));
            const full = fill >= 1;
            return (
              <View key={i} style={[styles.cell, small ? styles.cellSmall : styles.cellBig, full && styles.cellFull]}>
                {!full && fill > 0 && <View style={[styles.partial, { width: `${fill * 100}%` }]} />}
                {!small && <Text style={[styles.num, full && { color: colors.onAccent }]}>{i + 1}</Text>}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** The four steps of the method, the current one lit. */
export const METHOD_STEPS = [
  { short: 'Разбить', title: 'Разбей навык на части' },
  { short: 'Исправлять', title: 'Узнай минимум, чтобы видеть ошибки' },
  { short: 'Фокус', title: 'Убери всё, что отвлекает' },
  { short: '20 часов', title: 'Практикуйся 20 часов' },
];

export function MethodSteps({ current }: { current?: number }) {
  return (
    <View style={styles.steps}>
      {METHOD_STEPS.map((s, i) => {
        const on = current === undefined || i <= current;
        return (
          <View key={s.short} style={styles.step}>
            <View style={[styles.stepBar, on && { backgroundColor: colors.accent }]} />
            <Text style={[styles.stepText, on && { color: colors.text }]} numberOfLines={1}>
              {i + 1} {s.short}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1, overflow: 'hidden', backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  cellBig: { height: 40, borderRadius: 10 },
  cellSmall: { height: 8, borderRadius: 3 },
  cellFull: { backgroundColor: colors.accent, borderColor: colors.accent },
  partial: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.accentLine },
  num: { color: colors.faint, fontFamily: fonts.bodyBold, fontSize: 12 },
  steps: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, gap: 6 },
  stepBar: { height: 4, borderRadius: 2, backgroundColor: colors.card2 },
  stepText: { color: colors.faint, fontFamily: fonts.bodyBold, fontSize: 11 },
});

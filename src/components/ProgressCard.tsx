import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import type { Exercise } from '../data/exercises';
import { bestOf, kgLabel, setsLabel, type ExerciseSession } from '../logic/progress';
import { colors, FOCUS, fonts, IconTile, text } from '../ui';

const CHART_H = 64;
const POINTS = 12;

/** One exercise's progress: the latest result, the change since the start and a small chart. */
export function ProgressCard({ exercise, sessions, compact }: { exercise: Exercise; sessions: ExerciseSession[]; compact?: boolean }) {
  const weighted = !!exercise.weight;
  const timed = !!exercise.timed;
  const series = sessions.slice(0, POINTS).reverse();
  const values = series.map((s) => bestOf(s, weighted));
  const latest = sessions[0];
  const delta = values.length > 1 ? values[values.length - 1] - values[0] : 0;
  const unit = weighted ? 'кг' : timed ? 'сек' : 'повт.';

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        {!compact && <IconTile icon={FOCUS[exercise.focus].icon} size={40} />}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={text.h3} numberOfLines={1}>
            {compact ? 'Твой прогресс' : exercise.name}
          </Text>
          <Text style={[text.muted, { fontSize: 13 }]} numberOfLines={1}>
            {sessions.length} {plural(sessions.length, 'тренировка', 'тренировки', 'тренировок')}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.value}>
            {kgLabel(values[values.length - 1] ?? 0)}
            <Text style={styles.unit}> {unit}</Text>
          </Text>
          <Text style={[styles.delta, { color: delta > 0 ? colors.accent : delta < 0 ? colors.warn : colors.muted }]}>
            {values.length < 2 ? 'первый раз' : delta === 0 ? 'без изменений' : `${delta > 0 ? '+' : '−'}${kgLabel(Math.abs(delta))} ${unit} с начала`}
          </Text>
        </View>
      </View>
      {values.length > 1 && <Spark values={values} />}
      <Text style={[text.muted, { fontSize: 13 }]}>
        Последний раз: <Text style={{ color: colors.text, fontFamily: fonts.bodyBold }}>{setsLabel(latest.sets, latest.timed)}</Text>
      </Text>
    </View>
  );
}

function Spark({ values }: { values: number[] }) {
  // Drawn at the real width, so the dots stay round.
  const [width, setWidth] = useState(0);
  return (
    <View style={{ height: CHART_H }} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      {width > 0 && <SparkSvg values={values} width={width} />}
    </View>
  );
}

function SparkSvg({ values, width }: { values: number[]; width: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 10;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = max === min ? CHART_H / 2 : pad + (1 - (v - min) / span) * (CHART_H - pad * 2);
    return [x, y] as const;
  });
  const lastPt = pts[pts.length - 1];
  return (
    <Svg width={width} height={CHART_H}>
      <Line x1={0} y1={CHART_H - 1} x2={width} y2={CHART_H - 1} stroke={colors.line} strokeWidth={1} />
      <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={lastPt[0]} cy={lastPt[1]} r={9} fill={colors.accent} opacity={0.18} />
      {pts.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 4.5 : 2.5} fill={i === pts.length - 1 ? colors.accent : colors.card} stroke={colors.accent} strokeWidth={1.5} />
      ))}
    </Svg>
  );
}

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 14, borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  value: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  unit: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 12 },
  delta: { fontFamily: fonts.bodyBold, fontSize: 12 },
});

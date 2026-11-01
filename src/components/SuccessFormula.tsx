import { StyleSheet, Text, View } from 'react-native';

import { DEADLINE_OPTIONS } from '../logic/skill';
import { Chip, colors, fonts, Ionicons, text } from '../ui';

const RESULT = ['Пока это мечта', 'Это уже задача', 'Это стратегия', 'Это путь к успеху'];
const RESULT_HINT = [
  'Цель без срока остаётся мечтой. Поставь срок.',
  'Есть цель и срок. Нужен план на каждый день.',
  'Есть цель, срок и план. Осталось заниматься регулярно: 3 дня подряд.',
  'Цель, срок, план и регулярные действия. Так и приходят к результату.',
];

type Row = { title: string; value: string; done: boolean };

/**
 * Goal + deadline + plan + consistent action = success.
 * Each part lights up once the user has it; the bottom line says what they have so far.
 */
export function SuccessFormula({
  goal,
  deadline,
  plan,
  consistency,
  level,
  onPickDeadline,
}: {
  goal: string;
  deadline?: string;
  plan?: string;
  consistency: { value: string; done: boolean };
  level: 0 | 1 | 2 | 3;
  /** When given and there is no deadline, the deadline row offers choices. */
  onPickDeadline?: (days: number) => void;
}) {
  const rows: Row[] = [
    { title: 'Цель', value: goal, done: true },
    { title: 'Срок', value: deadline ?? 'Не задан', done: !!deadline },
    { title: 'План', value: plan ?? 'Появится со сроком', done: !!plan },
    { title: 'Регулярность', value: consistency.value, done: consistency.done },
  ];
  return (
    <View style={styles.card}>
      <View style={{ gap: 4 }}>
        <Text style={text.h2}>Формула успеха</Text>
        <Text style={[text.muted, { fontSize: 13 }]}>Цель + срок + план + регулярность</Text>
      </View>
      <View style={{ gap: 2 }}>
        {rows.map((r, i) => (
          <View key={r.title}>
            <View style={styles.row}>
              <View style={[styles.mark, r.done && styles.markOn]}>
                {r.done ? <Ionicons name="checkmark" size={15} color={colors.onAccent} /> : <Text style={styles.markNum}>{i + 1}</Text>}
              </View>
              <Text style={styles.rowTitle}>{r.title}</Text>
              <Text style={[styles.rowValue, !r.done && { color: colors.faint }]} numberOfLines={2}>
                {r.value}
              </Text>
            </View>
            {i === 1 && !r.done && onPickDeadline && (
              <View style={styles.pick}>
                {DEADLINE_OPTIONS.map((o) => (
                  <Chip key={o.days} label={o.label} selected={false} onPress={() => onPickDeadline(o.days)} />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
      <View style={[styles.result, level === 3 && { backgroundColor: colors.accent }]}>
        <Text style={[styles.resultTitle, level === 3 && { color: colors.onAccent }]}>= {RESULT[level]}</Text>
        <Text style={[styles.resultHint, level === 3 && { color: colors.onAccent }]}>{RESULT_HINT[level]}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: 18, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  mark: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  markOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  markNum: { color: colors.faint, fontFamily: fonts.bodyBold, fontSize: 12 },
  rowTitle: { width: 104, color: colors.text, fontFamily: fonts.bodyBold, fontSize: 15 },
  rowValue: { flex: 1, color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 14, textAlign: 'right' },
  pick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 38, paddingBottom: 8 },
  result: { gap: 4, padding: 14, borderRadius: 16, backgroundColor: colors.accentSoft },
  resultTitle: { color: colors.accent, fontFamily: fonts.display, fontSize: 16 },
  resultHint: { color: colors.text, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
});

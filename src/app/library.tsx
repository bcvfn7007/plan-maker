import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXERCISES, type Focus } from '../data/exercises';
import { Chip, colors, FOCUS, IconTile, Ionicons, text } from '../ui';

const PLACE = { home: 'Дома', gym: 'Зал' } as const;

export default function Library() {
  const [focus, setFocus] = useState<Focus | 'all'>('all');
  const list = EXERCISES.filter((e) => focus === 'all' || e.focus === focus);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip label="Все" selected={focus === 'all'} onPress={() => setFocus('all')} />
        {(Object.keys(FOCUS) as Focus[]).map((f) => (
          <Chip key={f} icon={FOCUS[f].icon} label={FOCUS[f].label} selected={focus === f} onPress={() => setFocus(f)} />
        ))}
      </ScrollView>

      <Text style={text.muted}>{list.length} упражнений с 3D-демонстрацией</Text>

      <View style={styles.list}>
        {list.map((e, i) => (
          <Pressable
            key={e.id}
            onPress={() => router.push(`/exercise/${e.id}`)}
            style={({ pressed }) => [styles.row, i === list.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.card2 }]}
          >
            <IconTile icon={FOCUS[e.focus].icon} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={text.h3}>{e.name}</Text>
              <Text style={[text.muted, { fontSize: 13 }]} numberOfLines={1}>
                {e.targets.join(', ')} · {e.places.map((p) => PLACE[p]).join(' и ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  filters: { gap: 8, paddingRight: 20 },
  list: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
});

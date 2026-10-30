import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { EXERCISES, type Focus } from '../data/exercises';
import { Card, colors, fonts, text } from '../ui';

const FOCUS: Record<Focus, string> = {
  legs: 'Ноги',
  push: 'Грудь и плечи',
  pull: 'Спина и руки',
  core: 'Пресс',
  cardio: 'Кардио',
};

export default function Library() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      {EXERCISES.map((e) => (
        <Pressable key={e.id} onPress={() => router.push(`/exercise/${e.id}`)}>
          <Card style={styles.row}>
            <Text style={[text.body, { fontFamily: fonts.bodyBold, flex: 1 }]}>{e.name}</Text>
            <Text style={styles.tag}>{FOCUS[e.focus]}</Text>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 10, maxWidth: 560, width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  tag: { color: colors.muted, fontSize: 13, fontFamily: fonts.body },
});

import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { ExerciseTips, ExerciseViewer } from '../../components/ExercisePanel';
import { getExercise } from '../../data/exercises';
import { text } from '../../ui';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);
  if (!exercise) return <Text style={[text.body, { padding: 20 }]}>Упражнение не найдено.</Text>;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: exercise.name }} />
      <ExerciseViewer exercise={exercise} height={380} />
      <ExerciseTips exercise={exercise} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 18, maxWidth: 560, width: '100%', alignSelf: 'center' },
});

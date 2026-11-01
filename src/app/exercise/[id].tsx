import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseTips, ExerciseViewer } from '../../components/ExercisePanel';
import { getExercise } from '../../data/exercises';
import { colors, Eyebrow, FOCUS, IconButton, Tag, text } from '../../ui';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { height } = useWindowDimensions();
  const exercise = getExercise(id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  if (!exercise) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.page}>
          <IconButton icon="chevron-back" label="Назад" onPress={back} />
          <Text style={text.body}>Упражнение не найдено.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.top}>
          <IconButton icon="chevron-back" label="Назад" onPress={back} />
        </View>
        <ExerciseViewer exercise={exercise} height={Math.round(Math.min(480, Math.max(320, height * 0.52)))} />
        <View style={{ gap: 10 }}>
          <Eyebrow>{FOCUS[exercise.focus].label}</Eyebrow>
          <Text style={text.h1}>{exercise.name}</Text>
          <View style={styles.tags}>
            {exercise.targets.map((t) => (
              <Tag key={t} label={t} strong />
            ))}
          </View>
        </View>
        <ExerciseTips exercise={exercise} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  page: { padding: 20, paddingTop: 8, paddingBottom: 40, gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  top: { flexDirection: 'row' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '../data/exercises';
import { animationView } from '../three/animations';
import type { View as CameraView } from '../three/ExerciseScene';
import { Viewer3D } from '../three/Viewer3D';
import { colors, fonts, text } from '../ui';

/** The 3D demonstration with a button to look from another side. */
export function ExerciseViewer({ exercise, height }: { exercise: Exercise; height: number }) {
  const [view, setView] = useState<CameraView>(animationView(exercise.animation));
  const [playing, setPlaying] = useState(true);
  useEffect(() => setView(animationView(exercise.animation)), [exercise.animation]);

  return (
    <View>
      <Viewer3D animation={exercise.animation} view={view} playing={playing} height={height} muscles={exercise.muscles} />
      <View style={styles.controls}>
        <Pressable style={styles.control} onPress={() => setView(view === 'front' ? 'side' : 'front')}>
          <Text style={styles.controlText}>{view === 'front' ? 'Вид сбоку' : 'Вид спереди'}</Text>
        </Pressable>
        <Pressable style={styles.control} onPress={() => setPlaying(!playing)}>
          <Text style={styles.controlText}>{playing ? 'Пауза' : 'Играть'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** How to do it, common mistakes and when not to do it. */
export function ExerciseTips({ exercise }: { exercise: Exercise }) {
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 6 }}>
        <Text style={text.h2}>Как делать</Text>
        {exercise.steps.map((s, i) => (
          <Text key={i} style={text.body}>
            {i + 1}. {s}
          </Text>
        ))}
      </View>
      <View style={{ gap: 6 }}>
        <Text style={text.h2}>Частые ошибки</Text>
        {exercise.mistakes.map((m, i) => (
          <Text key={i} style={text.body}>
            • {m}
          </Text>
        ))}
      </View>
      {exercise.avoidIf && (
        <View style={styles.warning}>
          <Text style={[text.body, { color: '#ffc58a' }]}>Осторожно: {exercise.avoidIf}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', left: 12, bottom: 12, flexDirection: 'row', gap: 8 },
  control: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.line, borderRadius: 999, minHeight: 36, justifyContent: 'center', paddingHorizontal: 14 },
  controlText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  warning: { backgroundColor: '#2a1d0e', borderRadius: 12, padding: 12 },
});

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '../data/exercises';
import { animationView } from '../three/animations';
import type { View as CameraView } from '../three/ExerciseScene';
import { Viewer3D } from '../three/Viewer3D';
import { colors, text } from '../ui';

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
          <Text style={[text.body, { color: '#8a4b12' }]}>Осторожно: {exercise.avoidIf}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', gap: 8 },
  control: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  controlText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  warning: { backgroundColor: '#fff3e0', borderRadius: 12, padding: 12 },
});

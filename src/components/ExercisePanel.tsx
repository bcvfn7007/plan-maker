import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Exercise } from '../data/exercises';
import { animationView } from '../three/animations';
import type { View as CameraView } from '../three/ExerciseScene';
import { Viewer3D } from '../three/Viewer3D';
import { colors, fonts, Ionicons, tap, text, type IconName } from '../ui';

/** The 3D demonstration: drag to turn around the coach, buttons for the side view and pause. */
export function ExerciseViewer({ exercise, height, rounded = true }: { exercise: Exercise; height: number; rounded?: boolean }) {
  const [view, setView] = useState<CameraView>(animationView(exercise.animation));
  const [playing, setPlaying] = useState(true);
  const [hint, setHint] = useState(true);
  const yaw = useRef(0);
  const start = useRef(0);
  // Horizontal drags turn the camera; vertical ones still scroll the page.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderGrant: () => {
          start.current = yaw.current;
          setHint(false);
        },
        onPanResponderMove: (_, g) => {
          yaw.current = start.current - g.dx * 0.45;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [],
  );

  useEffect(() => {
    setView(animationView(exercise.animation));
    yaw.current = 0;
  }, [exercise.animation]);

  return (
    <View style={[styles.stage, { height }, rounded && styles.rounded]} {...pan.panHandlers}>
      <Viewer3D animation={exercise.animation} view={view} playing={playing} height={height} muscles={exercise.muscles} yaw={yaw} />

      <LinearGradient pointerEvents="none" colors={['rgba(7,8,10,0)', 'rgba(7,8,10,0.85)']} style={styles.fade} />

      {hint && (
        <View pointerEvents="none" style={styles.hint}>
          <Ionicons name="hand-left-outline" size={13} color={colors.muted} />
          <Text style={styles.hintText}>Крути пальцем</Text>
        </View>
      )}

      <View style={styles.controls}>
        <Control
          icon={view === 'front' ? 'body-outline' : 'person-outline'}
          label={view === 'front' ? 'Сбоку' : 'Спереди'}
          onPress={() => {
            yaw.current = 0;
            setView(view === 'front' ? 'side' : 'front');
          }}
        />
        <Control icon={playing ? 'pause' : 'play'} label={playing ? 'Пауза' : 'Играть'} onPress={() => setPlaying(!playing)} />
      </View>
    </View>
  );
}

function Control({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.control, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <Ionicons name={icon} size={15} color={colors.text} />
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

/** How to do it, common mistakes and when not to do it. */
export function ExerciseTips({ exercise }: { exercise: Exercise }) {
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 12 }}>
        <Text style={text.h2}>Техника</Text>
        {exercise.steps.map((s, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <Text style={[text.body, { flex: 1, paddingTop: 3 }]}>{s}</Text>
          </View>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        <Text style={text.h2}>Частые ошибки</Text>
        {exercise.mistakes.map((m, i) => (
          <View key={i} style={styles.step}>
            <View style={[styles.stepNum, { backgroundColor: colors.badSoft }]}>
              <Ionicons name="close" size={16} color={colors.bad} />
            </View>
            <Text style={[text.body, { flex: 1, paddingTop: 3 }]}>{m}</Text>
          </View>
        ))}
      </View>
      {exercise.avoidIf && (
        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={20} color={colors.warn} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[text.h3, { color: colors.warn, fontSize: 14 }]}>Осторожно</Text>
            <Text style={[text.body, { color: '#f3d7ad' }]}>{exercise.avoidIf}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { overflow: 'hidden', backgroundColor: colors.stage },
  rounded: { borderRadius: 28, borderWidth: 1, borderColor: colors.line },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  hint: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(10,11,13,0.6)',
  },
  hintText: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12 },
  controls: { position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', gap: 8 },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(28,31,36,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    minHeight: 38,
    paddingHorizontal: 14,
  },
  controlText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 13 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: colors.accent, fontFamily: fonts.bodyHeavy, fontSize: 13 },
  warning: { flexDirection: 'row', gap: 12, backgroundColor: colors.warnSoft, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,181,71,0.2)' },
});

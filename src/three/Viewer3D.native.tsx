import { Canvas } from '@react-three/fiber/native';
import { Suspense } from 'react';
import { View as RNView } from 'react-native';

import { useAppState } from '../logic/AppState';
import type { Coach } from '../logic/plan';
import type { AnimationId } from './animations';
import { ExerciseScene, type View } from './ExerciseScene';

// On phones the fiber loader understands bundled asset modules directly.
const MODELS: Record<Coach, number> = {
  male: require('../../assets/models/coach-male.glb'),
  female: require('../../assets/models/coach-female.glb'),
};

type Props = { animation: AnimationId; view: View; playing?: boolean; height: number; muscles?: string[] };

export function Viewer3D({ animation, view, playing = true, height, muscles = [] }: Props) {
  const { profile } = useAppState();
  const source = MODELS[profile?.coach ?? 'male'];
  return (
    <RNView style={{ height, borderRadius: 20, overflow: 'hidden' }}>
      <Canvas camera={{ fov: 40, near: 0.1, far: 50, position: [1.6, 1.5, 3.3] }}>
        <Suspense fallback={null}>
          <ExerciseScene source={source} animation={animation} view={view} playing={playing} muscles={muscles} />
        </Suspense>
      </Canvas>
    </RNView>
  );
}

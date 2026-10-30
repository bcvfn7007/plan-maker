import { Canvas } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import { Suspense } from 'react';
import { View as RNView } from 'react-native';

import { useAppState } from '../logic/AppState';
import type { Coach } from '../logic/plan';
import type { AnimationId } from './animations';
import { ExerciseScene, type View } from './ExerciseScene';

const MODELS: Record<Coach, string> = {
  male: Asset.fromModule(require('../../assets/models/coach-male.glb')).uri,
  female: Asset.fromModule(require('../../assets/models/coach-female.glb')).uri,
};

type Props = { animation: AnimationId; view: View; playing?: boolean; height: number; muscles?: string[] };

export function Viewer3D({ animation, view, playing = true, height, muscles = [] }: Props) {
  const { profile } = useAppState();
  const source = MODELS[profile?.coach ?? 'male'];
  return (
    <RNView style={{ height, borderRadius: 20, overflow: 'hidden' }}>
      <Canvas camera={{ fov: 40, near: 0.1, far: 50, position: [1.6, 1.5, 3.3] }} gl={{ preserveDrawingBuffer: true }}>
        <Suspense fallback={null}>
          <ExerciseScene source={source} animation={animation} view={view} playing={playing} muscles={muscles} />
        </Suspense>
      </Canvas>
    </RNView>
  );
}

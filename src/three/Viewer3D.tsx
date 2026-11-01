import { Canvas } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import { Suspense } from 'react';
import { View as RNView } from 'react-native';

import { useAppState } from '../logic/AppState';
import type { Coach } from '../logic/plan';
import type { AnimationId } from './animations';
import { ExerciseScene, type View } from './ExerciseScene';
import { Loading } from './Loading';

const MODELS: Record<Coach, string> = {
  male: Asset.fromModule(require('../../assets/models/coach-male.glb')).uri,
  female: Asset.fromModule(require('../../assets/models/coach-female.glb')).uri,
};

type Props = { animation: AnimationId; view: View; playing?: boolean; height: number; muscles?: string[]; yaw?: { current: number } };

export function Viewer3D({ animation, view, playing = true, height, muscles = [], yaw }: Props) {
  const { profile } = useAppState();
  const source = MODELS[profile?.coach ?? 'male'];
  return (
    <RNView style={{ height }}>
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 36, near: 0.1, far: 60, position: [1.4, 1.3, 3] }} gl={{ preserveDrawingBuffer: true }}>
        <Suspense fallback={<Loading />}>
          <ExerciseScene source={source} animation={animation} view={view} playing={playing} muscles={muscles} yaw={yaw} />
        </Suspense>
      </Canvas>
    </RNView>
  );
}

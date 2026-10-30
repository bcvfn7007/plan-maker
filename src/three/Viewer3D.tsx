import { Canvas } from '@react-three/fiber';
import { Asset } from 'expo-asset';
import { Suspense } from 'react';
import { View as RNView } from 'react-native';

import type { AnimationId } from './animations';
import { ExerciseScene, type View } from './ExerciseScene';

const MODEL = Asset.fromModule(require('../../assets/models/Xbot.glb')).uri;

type Props = { animation: AnimationId; view: View; playing?: boolean; height: number };

export function Viewer3D({ animation, view, playing = true, height }: Props) {
  return (
    <RNView style={{ height, borderRadius: 20, overflow: 'hidden' }}>
      <Canvas camera={{ fov: 40, near: 0.1, far: 50, position: [1.6, 1.5, 3.3] }} gl={{ preserveDrawingBuffer: true }}>
        <Suspense fallback={null}>
          <ExerciseScene source={MODEL} animation={animation} view={view} playing={playing} />
        </Suspense>
      </Canvas>
    </RNView>
  );
}

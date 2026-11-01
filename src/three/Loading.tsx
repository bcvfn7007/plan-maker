import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';

import { colors } from '../ui';

/** A spinning neon arc while the coach model loads. */
export function Loading() {
  const arc = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (arc.current) arc.current.rotation.z -= dt * 4;
  });
  return (
    <>
      <color attach="background" args={[colors.stage]} />
      <mesh ref={arc} position={[0, 0.95, 0]}>
        <torusGeometry args={[0.18, 0.012, 8, 48, Math.PI * 1.4]} />
        <meshBasicMaterial color={colors.accent} />
      </mesh>
    </>
  );
}

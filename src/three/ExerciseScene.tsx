import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { PosePlayer, type AnimationId } from './animations';

export type View = 'front' | 'side';

const CAMERA_OFFSET: Record<View, Vector3> = {
  front: new Vector3(1.6, 0.55, 3.3),
  side: new Vector3(3.6, 0.9, 0.4),
};

type Props = {
  /** Whatever the platform's GLTF loader accepts: a URL on web, an asset module on phones. */
  source: string | number;
  animation: AnimationId;
  view: View;
  playing: boolean;
};

export function ExerciseScene({ source, animation, view, playing }: Props) {
  return (
    <>
      <color attach="background" args={['#eef2f7']} />
      <hemisphereLight args={['#ffffff', '#8a99b0', 1.6]} />
      <directionalLight position={[3, 5, 4]} intensity={2.2} />
      <directionalLight position={[-3, 2, -2]} intensity={0.6} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[2.6, 48]} />
        <meshStandardMaterial color="#d9e1ec" />
      </mesh>
      <Character source={source} animation={animation} view={view} playing={playing} />
    </>
  );
}

function Character({ source, animation, view, playing }: Props) {
  // The loader caches by source; every viewer gets its own copy of the skeleton.
  const gltf = useLoader(GLTFLoader, source as string);
  const model = useMemo(() => {
    const m = clone(gltf.scene);
    m.traverse((o) => {
      if ((o as Mesh).isMesh) {
        const mesh = o as Mesh;
        mesh.frustumCulled = false;
        const old = mesh.material as MeshStandardMaterial;
        const joints = old.name?.toLowerCase().includes('joint');
        mesh.material = new MeshStandardMaterial({
          color: new Color(joints ? '#2b3445' : '#e8835a'),
          roughness: 0.55,
          metalness: 0.05,
        });
      }
    });
    return m;
  }, [gltf]);
  const player = useMemo(() => new PosePlayer(model), [model]);
  const hips = useMemo(() => findHips(model), [model]);

  const time = useRef(0);
  useEffect(() => {
    time.current = 0;
  }, [animation]);

  const camera = useThree((s) => s.camera);
  const target = useRef(new Vector3(0, 0.9, 0));
  const tmp = useMemo(() => new Vector3(), []);

  useFrame((_, dt) => {
    if (playing) time.current += Math.min(dt, 0.1);
    player.update(animation, time.current);
    // Follow the hips gently so lying exercises stay in frame.
    hips.getWorldPosition(tmp);
    tmp.set(0, Math.max(tmp.y, 0.45), tmp.z);
    target.current.lerp(tmp, 0.08);
    camera.position.copy(target.current).add(CAMERA_OFFSET[view]);
    camera.lookAt(target.current);
  });

  return <primitive object={model} />;
}

function findHips(model: Object3D): Object3D {
  let hips: Object3D = model;
  model.traverse((o) => {
    if (/^mixamorig:?Hips$/.test(o.name)) hips = o;
  });
  return hips;
}

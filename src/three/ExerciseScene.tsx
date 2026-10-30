import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, Color, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { colors } from '../ui';
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
  /** Bones whose muscles light up. */
  muscles: string[];
};

const BODY = new Color('#d9dde5');
const JOINTS = new Color('#1b1f27');
const WORKING = new Color(colors.accent);

export function ExerciseScene({ source, animation, view, playing, muscles }: Props) {
  return (
    <>
      <color attach="background" args={[colors.stage]} />
      <hemisphereLight args={['#ffffff', '#445566', 1.6]} />
      <directionalLight position={[2.5, 4, 3]} intensity={3} />
      {/* Neon rim light from behind outlines the figure against the dark stage. */}
      <directionalLight position={[-3, 2.5, -3]} intensity={3.2} color={colors.accent} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
        <circleGeometry args={[1.5, 64]} />
        <meshBasicMaterial color={colors.accent} transparent opacity={0.12} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4, 64]} />
        <meshBasicMaterial color="#171b20" />
      </mesh>
      <Character source={source} animation={animation} view={view} playing={playing} muscles={muscles} />
    </>
  );
}

function Character({ source, animation, view, playing, muscles }: Props) {
  // The loader caches by source; every viewer gets its own copy of the skeleton.
  const gltf = useLoader(GLTFLoader, source as string);
  const model = useMemo(() => {
    const m = clone(gltf.scene);
    m.traverse((o) => {
      if ((o as Mesh).isMesh) {
        const mesh = o as Mesh;
        mesh.frustumCulled = false;
        // Own geometry per viewer: the muscle colours are written into it.
        mesh.geometry = mesh.geometry.clone();
        const joints = (mesh.material as MeshStandardMaterial).name?.toLowerCase().includes('joint');
        mesh.userData.joints = joints;
        // Characters may bring their own colours (skin, clothes); keep them as the base.
        const own = mesh.geometry.attributes.color;
        if (own) mesh.userData.base = Float32Array.from({ length: own.count * 3 }, (_, i) => own.getComponent(Math.floor(i / 3), i % 3));
        mesh.material = new MeshStandardMaterial({ vertexColors: true, roughness: own ? 0.6 : 0.35, metalness: own ? 0 : 0.05 });
      }
    });
    return m;
  }, [gltf]);

  useEffect(() => paintMuscles(model, muscles), [model, muscles]);

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

/** Tints the body towards the accent by how strongly each vertex follows the working bones. */
function paintMuscles(model: Object3D, muscles: string[]) {
  const wanted = new Set(muscles);
  const c = new Color();
  model.traverse((o) => {
    const mesh = o as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const geo = mesh.geometry;
    const count = geo.attributes.position.count;
    const colors = new Float32Array(count * 3);
    if (mesh.userData.joints) {
      for (let v = 0; v < count; v++) colors.set([JOINTS.r, JOINTS.g, JOINTS.b], v * 3);
    } else {
      const hot = new Set<number>();
      mesh.skeleton.bones.forEach((b, i) => wanted.has(b.name.replace(/^mixamorig:?/, '')) && hot.add(i));
      const index = geo.attributes.skinIndex;
      const weight = geo.attributes.skinWeight;
      for (let v = 0; v < count; v++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (hot.has(index.getComponent(v, k))) w += weight.getComponent(v, k);
        const base: Float32Array | undefined = mesh.userData.base;
        if (base) c.setRGB(base[v * 3], base[v * 3 + 1], base[v * 3 + 2]);
        else c.copy(BODY);
        c.lerp(WORKING, Math.min(1, w * 1.3));
        colors.set([c.r, c.g, c.b], v * 3);
      }
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3));
  });
}

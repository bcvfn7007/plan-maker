import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { BufferAttribute, Color, Mesh, MeshStandardMaterial, Object3D, SkinnedMesh, Vector3 } from 'three';
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
  /** Bones whose muscles light up. */
  muscles: string[];
};

const BODY = new Color('#e9ecf1');
const JOINTS = new Color('#2b3445');
const WORKING = new Color('#ff6a3d');

export function ExerciseScene({ source, animation, view, playing, muscles }: Props) {
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
        mesh.material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.05 });
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

/** Colours the skin by how strongly each vertex follows the working bones. */
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
        c.copy(BODY).lerp(WORKING, Math.min(1, w * 1.3));
        colors.set([c.r, c.g, c.b], v * 3);
      }
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3));
  });
}

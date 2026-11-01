import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  Color,
  DirectionalLight,
  Fog,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PMREMGenerator,
  ShaderMaterial,
  SkinnedMesh,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { colors } from '../ui';
import { PosePlayer, type AnimationId } from './animations';

export type View = 'front' | 'side';

/** Where the camera sits around the figure: angle from the front (degrees), distance, height above the target. */
const CAMERA: Record<View, { angle: number; distance: number; height: number }> = {
  front: { angle: 24, distance: 3.9, height: 0.4 },
  side: { angle: 80, distance: 4.1, height: 0.75 },
};

type Props = {
  /** Whatever the platform's GLTF loader accepts: a URL on web, an asset module on phones. */
  source: string | number;
  animation: AnimationId;
  view: View;
  playing: boolean;
  /** Bones whose muscles light up. */
  muscles: string[];
  /** Extra turn around the figure from dragging, in degrees. */
  yaw?: { current: number };
};

const ACCENT = new Color(colors.accent);
const BG_TOP = new Color('#161a20');
const BG_BOTTOM = new Color('#07080a');
const FLOOR = new Color('#20242a');

export function ExerciseScene({ source, animation, view, playing, muscles, yaw }: Props) {
  return (
    <>
      <Studio />
      <Character source={source} animation={animation} view={view} playing={playing} muscles={muscles} yaw={yaw} />
    </>
  );
}

/** A photo-studio look: gradient backdrop melting into the floor, soft key light with shadows, coloured rims. */
function Studio() {
  const { gl, scene } = useThree();
  const key = useRef<DirectionalLight>(null);

  useLayoutEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFShadowMap;
    gl.toneMappingExposure = 1.05;
    scene.fog = new Fog(BG_BOTTOM, 6, 13);
    // Soft studio reflections on skin and clothes. Some phone GPUs cannot build it; the lights alone still work.
    let pmrem: PMREMGenerator | null = null;
    try {
      pmrem = new PMREMGenerator(gl);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environmentIntensity = 0.35;
    } catch {
      scene.environment = null;
    }
    return () => {
      scene.fog = null;
      scene.environment?.dispose();
      scene.environment = null;
      pmrem?.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    const light = key.current;
    if (!light) return;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -2.2;
    light.shadow.camera.right = 2.2;
    light.shadow.camera.top = 2.6;
    light.shadow.camera.bottom = -1;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 14;
    light.shadow.bias = -0.0005;
    light.shadow.normalBias = 0.02;
    light.shadow.radius = 6;
    light.shadow.camera.updateProjectionMatrix();
  }, []);

  const backdrop = useMemo(
    () =>
      new ShaderMaterial({
        side: BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: BG_TOP }, bottom: { value: BG_BOTTOM }, glow: { value: ACCENT } },
        vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 bottom; uniform vec3 glow; varying vec3 vPos;
          void main(){
            vec3 d = normalize(vPos);
            float h = clamp(d.y * 1.4, 0.0, 1.0);
            vec3 c = mix(bottom, top, h);
            // A faint neon haze behind the figure, like a lit gym wall.
            float behind = smoothstep(0.2, 1.0, -d.z) * (1.0 - abs(d.y - 0.12) * 2.2);
            c += glow * 0.012 * max(behind, 0.0);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );

  const floor = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        fog: false,
        uniforms: { center: { value: FLOOR }, edge: { value: BG_BOTTOM } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 center; uniform vec3 edge; varying vec2 vUv;
          void main(){
            float r = length(vUv - 0.5) * 2.0;
            vec3 c = mix(center, edge, smoothstep(0.0, 0.75, r));
            gl_FragColor = vec4(c, 1.0 - smoothstep(0.55, 1.0, r));
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );

  const ring = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { color: { value: ACCENT }, time: { value: 0 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 color; uniform float time; varying vec2 vUv;
          void main(){
            float r = length(vUv - 0.5) * 2.0;
            float line = smoothstep(0.012, 0.0, abs(r - 0.82));
            float glow = smoothstep(0.82, 0.3, r) * 0.10;
            float pulse = 0.75 + 0.25 * sin(time * 1.6);
            gl_FragColor = vec4(color, (line * 0.55 * pulse + glow) * smoothstep(1.0, 0.9, r));
          }`,
      }),
    [],
  );
  useFrame((_, dt) => {
    ring.uniforms.time.value += dt;
  });

  return (
    <>
      <mesh material={backdrop}>
        <sphereGeometry args={[20, 32, 16]} />
      </mesh>

      <hemisphereLight args={['#cfd8ff', '#0b0c0e', 0.7]} />
      <directionalLight ref={key} castShadow position={[2.2, 4.5, 3]} intensity={2.6} color="#fff4e8" />
      <directionalLight position={[-3, 1.8, 2]} intensity={0.45} color="#9fb4ff" />
      {/* Rim lights from behind outline the figure against the dark stage. */}
      {/* Kept low so they skim the body and barely touch the floor. */}
      <directionalLight position={[-2.8, 1.3, -3.5]} intensity={2.4} color={colors.accent} />
      <directionalLight position={[3, 1.6, -3]} intensity={1.6} color="#ffffff" />

      {/* The floor is a pool of light that fades into the dark, so there is no horizon line.
          It ignores the scene lights (the coloured rims would tint it); a shadow catcher on top takes the shadows. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={floor}>
        <circleGeometry args={[6, 64]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <circleGeometry args={[3, 64]} />
        <shadowMaterial transparent opacity={0.55} color="#000000" depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} material={ring}>
        <planeGeometry args={[3.2, 3.2]} />
      </mesh>
    </>
  );
}

/** Adds a pulsing glow on the working muscles to a standard material. */
function withMuscleGlow(material: MeshStandardMaterial, pulse: { value: number }) {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.heatColor = { value: ACCENT };
    shader.uniforms.heatPulse = pulse;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float heat;\nvarying float vHeat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = heat;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 heatColor;\nuniform float heatPulse;\nvarying float vHeat;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        // Glow stronger where the surface turns away from the camera: reads as light under the skin.
        float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
        totalEmissiveRadiance += heatColor * vHeat * (0.06 + 0.42 * rim * rim * rim) * heatPulse;`,
      );
  };
  material.customProgramCacheKey = () => 'muscle-glow';
  return material;
}

function Character({ source, animation, view, playing, muscles, yaw }: Props) {
  // The loader caches by source; every viewer gets its own copy of the skeleton.
  const gltf = useLoader(GLTFLoader, source as string);
  const pulse = useMemo(() => ({ value: 1 }), []);
  const model = useMemo(() => {
    const m = clone(gltf.scene);
    m.traverse((o) => {
      if ((o as Mesh).isMesh) {
        const mesh = o as Mesh;
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Own geometry per viewer: the muscle glow is written into it.
        mesh.geometry = mesh.geometry.clone();
        const joints = (mesh.material as MeshStandardMaterial).name?.toLowerCase().includes('joint');
        mesh.userData.joints = joints;
        // Characters may bring their own colours (skin, clothes); keep them as the base.
        const own = mesh.geometry.attributes.color;
        if (own) mesh.userData.base = Float32Array.from({ length: own.count * 3 }, (_, i) => own.getComponent(Math.floor(i / 3), i % 3));
        mesh.material = withMuscleGlow(new MeshStandardMaterial({ vertexColors: true, roughness: own ? 0.62 : 0.35, metalness: 0, envMapIntensity: 0.8 }), pulse);
      }
    });
    return m;
  }, [gltf, pulse]);

  useEffect(() => paintMuscles(model, muscles), [model, muscles]);

  const player = useMemo(() => new PosePlayer(model), [model]);
  const hips = useMemo(() => findHips(model), [model]);

  const time = useRef(0);
  useEffect(() => {
    time.current = 0;
  }, [animation]);

  const camera = useThree((s) => s.camera);
  const target = useRef(new Vector3(0, 0.95, 0));
  const orbit = useRef({ ...CAMERA[view] });
  const tmp = useMemo(() => new Vector3(), []);
  const clock = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    clock.current += dt;
    if (playing) time.current += dt;
    pulse.value = 0.75 + 0.25 * Math.sin(clock.current * 2.4);
    player.update(animation, time.current);

    // Follow the hips gently so lying exercises stay in frame.
    hips.getWorldPosition(tmp);
    tmp.set(0, Math.min(Math.max(tmp.y, 0.55), 0.95), tmp.z);
    target.current.lerp(tmp, 1 - Math.exp(-dt * 4));

    // Glide to the chosen view instead of jumping.
    const want = CAMERA[view];
    const k = 1 - Math.exp(-dt * 3.5);
    const o = orbit.current;
    o.angle += (want.angle + (yaw?.current ?? 0) - o.angle) * k;
    o.distance += (want.distance - o.distance) * k;
    o.height += (want.height - o.height) * k;
    const a = (o.angle * Math.PI) / 180;
    camera.position.set(target.current.x + Math.sin(a) * o.distance, target.current.y + o.height, target.current.z + Math.cos(a) * o.distance);
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

/** Marks how strongly each vertex follows the working bones; the shader turns it into glow. */
function paintMuscles(model: Object3D, muscles: string[]) {
  const wanted = new Set(muscles);
  const c = new Color();
  const tint = new Color(colors.accent);
  model.traverse((o) => {
    const mesh = o as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const geo = mesh.geometry;
    const count = geo.attributes.position.count;
    const vertexColors = new Float32Array(count * 3);
    const heat = new Float32Array(count);
    const base: Float32Array | undefined = mesh.userData.base;
    if (mesh.userData.joints) {
      for (let v = 0; v < count; v++) vertexColors.set([0.1, 0.11, 0.14], v * 3);
    } else {
      const hot = new Set<number>();
      mesh.skeleton.bones.forEach((b, i) => wanted.has(b.name.replace(/^mixamorig:?/, '')) && hot.add(i));
      const index = geo.attributes.skinIndex;
      const weight = geo.attributes.skinWeight;
      for (let v = 0; v < count; v++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (hot.has(index.getComponent(v, k))) w += weight.getComponent(v, k);
        w = Math.min(1, w * 1.2);
        heat[v] = w;
        if (base) c.setRGB(base[v * 3], base[v * 3 + 1], base[v * 3 + 2]);
        else c.set('#d9dde5');
        // Only a light tint: the clothes and skin stay recognisable, the glow does the rest.
        c.lerp(tint, w * 0.1);
        vertexColors.set([c.r, c.g, c.b], v * 3);
      }
    }
    geo.setAttribute('color', new BufferAttribute(vertexColors, 3));
    geo.setAttribute('heat', new BufferAttribute(heat, 1));
  });
}


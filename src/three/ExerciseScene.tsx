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
  Quaternion,
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
      <directionalLight position={[-2.8, 0.5, -3.5]} intensity={1.2} color={colors.accent} />
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

/** Body measurements (mesh space, metres) that place the clothes edges. */
type Outfit = {
  /** Height of the neck, waist, shorts hem; x of the shoulder joint; z just in front of the face. */
  neck: number;
  waist: number;
  hem: number;
  shoulder: number;
  armpit: number;
  front: number;
};

/** Clothes colours: sRGB like the rest of the UI. */
const TOP = new Color('#2b313d');
const SHORTS = new Color('#16191f');
const TRIM = new Color(colors.accent);

/**
 * The coach's material: clothes are drawn per pixel from the rest pose (crisp, smooth edges
 * instead of the jagged per-vertex paint), skin is a bit glossier than fabric,
 * and the working muscles glow and pulse.
 */
function bodyMaterial(original: MeshStandardMaterial, own: boolean, pulse: { value: number }, outfit: Outfit | null) {
  // Garments, hair and shoes are separate meshes on the pro coach: they get a soft, even tint instead of the skin glow.
  const surface = /eye/i.test(original.name) ? 0 : /tee|shirt|short|shoe|sole|stripe|hair|pony|tie/i.test(original.name) ? 1 : 2;
  // Textured characters (e.g. from Mixamo) keep their own skin and clothes textures.
  // Characters that bring finished materials (textures or plain colours, e.g. Mixamo or the pro coach) keep them;
  // only vertex-coloured ones and the bare mannequin get the generated material.
  const finished = !own && (!!original.map || original.name !== '' && !/joint/i.test(original.name));
  const material = finished
    ? (original.clone() as MeshStandardMaterial)
    : new MeshStandardMaterial({ vertexColors: true, roughness: own ? 0.55 : 0.35, metalness: 0, envMapIntensity: 0.8 });
  if (finished) {
    material.vertexColors = false;
    material.envMapIntensity = 0.8;
    // Hair and fabric are matte: studio reflections on them read as grey plastic patches.
    if (/hair|pony/i.test(original.name)) {
      material.roughness = Math.max(material.roughness, 0.92);
      material.envMapIntensity = 0.2;
    } else if (/tee|shirt|short/i.test(original.name)) {
      material.envMapIntensity = 0.45;
    }
  }
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    shader.uniforms.heatColor = { value: ACCENT };
    shader.uniforms.heatPulse = pulse;
    shader.uniforms.surface = { value: surface };
    const o = outfit ?? { neck: 99, waist: 99, hem: 99, shoulder: 0, armpit: 99, front: 0 };
    shader.uniforms.outfit = { value: [o.neck, o.waist, o.hem, o.shoulder, o.armpit, o.front] };
    shader.uniforms.topColor = { value: TOP };
    shader.uniforms.shortsColor = { value: SHORTS };
    shader.uniforms.trimColor = { value: TRIM };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float heat;\nvarying float vHeat;\nvarying vec3 vRest;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHeat = heat;\nvRest = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 heatColor; uniform float heatPulse; uniform int surface; varying float vHeat; varying vec3 vRest;
        uniform float outfit[6]; uniform vec3 topColor; uniform vec3 shortsColor; uniform vec3 trimColor;
        float clothMask; float trimMask; float hairish;
        // 1 above the line, 0 below, anti-aliased over one pixel.
        float edge(float v, float line) { float w = max(fwidth(v), 0.0006); return smoothstep(line - w, line + w, v); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Hair and brows painted on the skin are near black-brown: they must stay matte, not shine like skin.
        hairish = surface == 2 ? 1.0 - smoothstep(0.04, 0.12, dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))) : 0.0;
        {
          float neck = outfit[0], waist = outfit[1], hem = outfit[2], shoulder = outfit[3], armpit = outfit[4], frontZ = outfit[5];
          float ax = abs(vRest.x), y = vRest.y;
          // Tank top: a scoop neck at the front, armholes that narrow towards the shoulder.
          float front = smoothstep(frontZ - 0.02, frontZ + 0.02, vRest.z);
          float neckLine = neck - 0.04 - 0.07 * front * (1.0 - smoothstep(0.0, 0.1, ax));
          // Under the armpit the top follows the ribs; above it the armhole cuts in and narrows to a strap.
          float strap = shoulder - 0.045 * smoothstep(armpit - 0.07, armpit, y) - clamp(y - armpit, 0.0, 1.0) * 0.6;
          float top = edge(y, waist) * (1.0 - edge(y, neckLine)) * (1.0 - edge(ax, y > waist ? strap : 9.0));
          // Shorts: from the waist to mid-thigh, legs wider apart than the hands are from the hips.
          float shorts = (1.0 - edge(y, waist)) * edge(y, hem) * (1.0 - edge(ax, shoulder + 0.03));
          clothMask = max(top, shorts);
          vec3 cloth = mix(shortsColor, topColor, top);
          // Thin neon piping on the shorts hem and the waistband.
          trimMask = shorts * ((1.0 - edge(y, hem + 0.008)) + edge(y, waist - 0.008));
          cloth = mix(cloth, trimColor * 0.55, trimMask);
          diffuseColor.rgb = mix(diffuseColor.rgb, cloth, clothMask);
        }`,
      )
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.92, max(clothMask, hairish));')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectSpecular *= 1.0 - 0.85 * hairish;\nreflectedLight.directSpecular *= 1.0 - 0.7 * hairish;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += trimColor * trimMask * 0.25;
        if (surface == 2) {
          // Skin: glow stronger where the surface turns away from the camera, like light under the skin.
          // The rim fades out right at the silhouette, where it would flicker from pixel to pixel.
          float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float rim = (1.0 - facing) * smoothstep(0.0, 0.25, facing);
          totalEmissiveRadiance += heatColor * vHeat * (0.06 + 1.1 * rim * rim) * heatPulse * (1.0 - 0.45 * clothMask);
        } else if (surface == 1 && gl_FrontFacing) {
          // Fabric: a soft glow over the core of the working muscles, never on the inside of the clothes.
          // Faint weights are left out, so the shirt does not get a blotchy tint.
          float facing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float rim = (1.0 - facing) * smoothstep(0.0, 0.3, facing);
          float core = smoothstep(0.35, 0.85, vHeat);
          totalEmissiveRadiance += heatColor * core * (0.02 + 0.45 * rim * rim) * heatPulse;
        }`,
      );
  };
  material.customProgramCacheKey = () => `coach-body-${surface}`;
  return material;
}

/**
 * Reads where the clothes go from the skeleton, and paints the old per-vertex clothes back to skin
 * so the shader can draw them cleanly. Null for characters without a Mixamo skeleton.
 */
function prepareOutfit(mesh: SkinnedMesh, base: Float32Array | undefined): Outfit | null {
  if (!mesh.isSkinnedMesh || !base) return null;
  const at = (name: string) => {
    const bone = mesh.skeleton.bones.find((b) => b.name.replace(/^mixamorig:?/, '') === name);
    return bone ? bone.getWorldPosition(new Vector3()).applyMatrix4(mesh.bindMatrixInverse) : null;
  };
  const neck = at('Neck'), head = at('Head'), arm = at('LeftArm'), upLeg = at('LeftUpLeg'), leg = at('LeftLeg');
  if (!neck || !head || !arm || !upLeg || !leg) return null;
  const outfit: Outfit = {
    neck: neck.y,
    waist: upLeg.y + 0.11,
    hem: leg.y + (upLeg.y - leg.y) * 0.42,
    shoulder: Math.abs(arm.x),
    armpit: arm.y - 0.08,
    front: head.z + 0.03,
  };
  // Skin colour: the most common vertex colour (the body is mostly skin).
  const counts = new Map<string, number>();
  for (let v = 0; v < base.length / 3; v += 7) {
    const key = `${base[v * 3].toFixed(3)},${base[v * 3 + 1].toFixed(3)},${base[v * 3 + 2].toFixed(3)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const skin = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(',').map(Number);
  const pos = mesh.geometry.attributes.position;
  for (let v = 0; v < pos.count; v++) {
    const y = pos.getY(v);
    if (y < outfit.hem - 0.05 || y > outfit.neck + 0.02) continue;
    // Hair stays (long hair can reach the neck); everything else in the clothes zone becomes skin.
    const r = base[v * 3], g = base[v * 3 + 1], b = base[v * 3 + 2];
    const hairish = r < 0.05 && r > g && g > b;
    if (!hairish) base.set(skin, v * 3);
  }
  return outfit;
}

function Character({ source, animation, view, playing, muscles, yaw }: Props) {
  // The loader caches by source; every viewer gets its own copy of the skeleton.
  const gltf = useLoader(GLTFLoader, source as string);
  const pulse = useMemo(() => ({ value: 1 }), []);
  const model = useMemo(() => {
    const m = clone(gltf.scene);
    // Poses assume the figure faces +z; some exports face the other way, so turn their contents around.
    if (facesBackwards(m)) {
      const turn = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
      for (const c of m.children) {
        c.position.applyQuaternion(turn);
        c.quaternion.premultiply(turn);
      }
    }
    m.updateMatrixWorld(true);
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
        const outfit = own ? prepareOutfit(mesh as SkinnedMesh, mesh.userData.base) : null;
        mesh.material = bodyMaterial(mesh.material as MeshStandardMaterial, !!own, pulse, outfit);
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

/** True when the toes point to -z in the rest pose. */
function facesBackwards(model: Object3D): boolean {
  let foot: Object3D | undefined;
  let toe: Object3D | undefined;
  model.traverse((o) => {
    if (/^mixamorig:?LeftFoot$/.test(o.name)) foot = o;
    if (/^mixamorig:?LeftToeBase$/.test(o.name)) toe = o;
  });
  if (!foot || !toe) return false;
  model.updateMatrixWorld(true);
  return toe.getWorldPosition(new Vector3()).z < foot.getWorldPosition(new Vector3()).z;
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
        vertexColors.set([c.r, c.g, c.b], v * 3);
      }
    }
    geo.setAttribute('color', new BufferAttribute(vertexColors, 3));
    geo.setAttribute('heat', new BufferAttribute(smoothAlongSurface(geo, heat, 4), 1));
  });
}


/**
 * Averages a per-vertex value with its neighbours a few times, so the glow fades softly
 * instead of following the blocky edges of the skin weights. Neighbours come from the triangles
 * and from vertices at the same spot (UV seams split vertices).
 */
function smoothAlongSurface(geo: SkinnedMesh['geometry'], values: Float32Array, rounds: number): Float32Array {
  const count = values.length;
  let neighbours: Int32Array[] | undefined = geo.userData.neighbours;
  if (!neighbours) {
    const pos = geo.attributes.position;
    // Vertices at the same spot share one id.
    const ids = new Int32Array(count);
    const seen = new Map<string, number>();
    for (let v = 0; v < count; v++) {
      const key = `${pos.getX(v).toFixed(4)},${pos.getY(v).toFixed(4)},${pos.getZ(v).toFixed(4)}`;
      const id = seen.get(key);
      if (id === undefined) seen.set(key, (ids[v] = seen.size));
      else ids[v] = id;
    }
    const sets: Set<number>[] = Array.from({ length: seen.size }, () => new Set());
    const index = geo.index;
    const tri = index ? index.count : count;
    for (let t = 0; t < tri; t += 3) {
      const a = ids[index ? index.getX(t) : t], b = ids[index ? index.getX(t + 1) : t + 1], c = ids[index ? index.getX(t + 2) : t + 2];
      sets[a].add(b).add(c);
      sets[b].add(a).add(c);
      sets[c].add(a).add(b);
    }
    neighbours = sets.map((n) => Int32Array.from(n));
    geo.userData.neighbours = neighbours;
    geo.userData.ids = ids;
  }
  const ids: Int32Array = geo.userData.ids;
  let cur = new Float32Array(neighbours.length);
  const n = new Float32Array(neighbours.length);
  for (let v = 0; v < count; v++) {
    cur[ids[v]] += values[v];
    n[ids[v]] += 1;
  }
  for (let i = 0; i < cur.length; i++) cur[i] /= n[i] || 1;
  for (let r = 0; r < rounds; r++) {
    const next = new Float32Array(cur.length);
    for (let i = 0; i < cur.length; i++) {
      const list = neighbours[i];
      let sum = cur[i];
      for (let k = 0; k < list.length; k++) sum += cur[list[k]];
      next[i] = sum / (list.length + 1);
    }
    cur = next;
  }
  const out = new Float32Array(count);
  for (let v = 0; v < count; v++) out[v] = cur[ids[v]];
  return out;
}

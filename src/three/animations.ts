import { Matrix4, Object3D, Quaternion, Vector3 } from 'three';

// Exercise animations are built from a few key poses of the Mixamo skeleton.
// A pose says where a bone points, as a direction in the room
// (+x = the figure's left, +y = up, +z = where the figure faces when standing).
// The player turns the bones to point there and blends between poses in a loop,
// then puts the body back on the floor.

const CHAIN = [
  ['Hips', 'Spine'],
  ['Spine', 'Spine1'],
  ['Spine1', 'Spine2'],
  ['Spine2', 'Neck'],
  ['Neck', 'Head'],
  ['Head', 'HeadTop_End'],
  ['LeftShoulder', 'LeftArm'],
  ['LeftArm', 'LeftForeArm'],
  ['LeftForeArm', 'LeftHand'],
  ['LeftHand', 'LeftHandMiddle1'],
  ['RightShoulder', 'RightArm'],
  ['RightArm', 'RightForeArm'],
  ['RightForeArm', 'RightHand'],
  ['RightHand', 'RightHandMiddle1'],
  ['LeftUpLeg', 'LeftLeg'],
  ['LeftLeg', 'LeftFoot'],
  ['LeftFoot', 'LeftToeBase'],
  ['RightUpLeg', 'RightLeg'],
  ['RightLeg', 'RightFoot'],
  ['RightFoot', 'RightToeBase'],
] as const;

type Bone = (typeof CHAIN)[number][0];
type Dir = [number, number, number];

export type Pose = {
  bones: Partial<Record<Bone, Dir>>;
  /** Whole-body forward tilt in degrees (90 = lying face down, -90 = on the back). */
  tilt?: number;
  /** Lift off the floor in metres (jumps). */
  lift?: number;
};

export type Animation = {
  /** Poses visited in order, then back to the first. */
  poses: Pose[];
  /** Seconds for one full repetition. */
  seconds: number;
  /** Lying exercises read better from the side. */
  view?: 'front' | 'side';
};

const ARMS_DOWN = { LeftArm: [0.18, -1, 0], RightArm: [-0.18, -1, 0] } satisfies Pose['bones'];
const STAND: Pose = { bones: { ...ARMS_DOWN } };

const LYING_LEGS_BENT = {
  LeftUpLeg: [0.05, 0.8, 0.6],
  RightUpLeg: [-0.05, 0.8, 0.6],
  LeftLeg: [0, -1, 0.25],
  RightLeg: [0, -1, 0.25],
  LeftFoot: [0, -0.15, 1],
  RightFoot: [0, -0.15, 1],
} satisfies Pose['bones'];

const ARMS_ALONG_BODY = { LeftArm: [0.2, -0.25, 1], RightArm: [-0.2, -0.25, 1] } satisfies Pose['bones'];

const TOES_DOWN = { LeftFoot: [0, -1, 0.25], RightFoot: [0, -1, 0.25] } satisfies Pose['bones'];

const BENT_OVER = {
  Hips: [0, 0.75, 1],
  Neck: [0, 0.4, 1],
  LeftUpLeg: [0.08, -1, 0.15],
  RightUpLeg: [-0.08, -1, 0.15],
  LeftLeg: [0, -1, -0.12],
  RightLeg: [0, -1, -0.12],
  LeftFoot: [0, -0.4, 1],
  RightFoot: [0, -0.4, 1],
} satisfies Pose['bones'];

const ANIMATIONS = {
  idle: {
    seconds: 3.5,
    poses: [STAND, { bones: { ...ARMS_DOWN, Spine1: [0, 1, -0.04] } }],
  },
  squat: {
    seconds: 3,
    poses: [
      { bones: { LeftArm: [0.15, -0.1, 1], RightArm: [-0.15, -0.1, 1] } },
      {
        bones: {
          Hips: [0, 1, 0.55],
          LeftArm: [0.15, 0, 1],
          RightArm: [-0.15, 0, 1],
          LeftUpLeg: [0.25, -0.12, 1],
          RightUpLeg: [-0.25, -0.12, 1],
          LeftLeg: [0.05, -1, -0.3],
          RightLeg: [-0.05, -1, -0.3],
          LeftFoot: [0.1, -0.35, 1],
          RightFoot: [-0.1, -0.35, 1],
        },
      },
    ],
  },
  lunge: {
    seconds: 3.2,
    poses: [
      { bones: { ...ARMS_DOWN, RightUpLeg: [0, -1, -0.15], RightFoot: [0, -0.6, 1] } },
      {
        bones: {
          ...ARMS_DOWN,
          LeftUpLeg: [0.05, -0.12, 1],
          LeftLeg: [0, -1, -0.05],
          LeftFoot: [0, -0.35, 1],
          RightUpLeg: [-0.05, -1, -0.45],
          RightLeg: [0, -0.2, -1],
          RightFoot: [0, -1, 0.15],
        },
      },
    ],
  },
  bridge: {
    seconds: 3,
    view: 'side',
    poses: [
      { tilt: -90, bones: { ...LYING_LEGS_BENT, ...ARMS_ALONG_BODY } },
      {
        tilt: -90,
        bones: {
          ...LYING_LEGS_BENT,
          ...ARMS_ALONG_BODY,
          Hips: [0, -0.75, -0.7],
          LeftUpLeg: [0.05, 0.1, 1],
          RightUpLeg: [-0.05, 0.1, 1],
          LeftLeg: [0, -1, 0.05],
          RightLeg: [0, -1, 0.05],
        },
      },
    ],
  },
  pushup: {
    seconds: 2.6,
    view: 'side',
    poses: [
      {
        tilt: 70,
        bones: { ...TOES_DOWN, LeftArm: [0.15, -1, 0], RightArm: [-0.15, -1, 0], Neck: [0, 0.3, 1] },
      },
      {
        tilt: 80,
        bones: {
          ...TOES_DOWN,
          LeftArm: [0.65, -0.25, -0.5],
          RightArm: [-0.65, -0.25, -0.5],
          LeftForeArm: [-0.1, -1, 0.15],
          RightForeArm: [0.1, -1, 0.15],
          Neck: [0, 0.2, 1],
        },
      },
    ],
  },
  plank: {
    seconds: 4,
    view: 'side',
    poses: [
      {
        tilt: 80,
        bones: {
          ...TOES_DOWN,
          LeftArm: [0.05, -1, 0],
          RightArm: [-0.05, -1, 0],
          LeftForeArm: [0, 0, 1],
          RightForeArm: [0, 0, 1],
          Neck: [0, 0.25, 1],
        },
      },
      {
        tilt: 79,
        bones: {
          ...TOES_DOWN,
          LeftArm: [0.05, -1, 0],
          RightArm: [-0.05, -1, 0],
          LeftForeArm: [0, 0, 1],
          RightForeArm: [0, 0, 1],
          Neck: [0, 0.3, 1],
        },
      },
    ],
  },
  crunch: {
    seconds: 2.6,
    view: 'side',
    poses: [
      {
        tilt: -90,
        bones: {
          ...LYING_LEGS_BENT,
          LeftArm: [0.9, 0.2, -0.4],
          RightArm: [-0.9, 0.2, -0.4],
          LeftForeArm: [-0.7, 0.2, -0.7],
          RightForeArm: [0.7, 0.2, -0.7],
        },
      },
      {
        tilt: -90,
        bones: {
          ...LYING_LEGS_BENT,
          Spine: [0, 0.35, -1],
          Spine1: [0, 0.6, -1],
          Spine2: [0, 0.7, -1],
          LeftArm: [0.9, 0.5, -0.3],
          RightArm: [-0.9, 0.5, -0.3],
          LeftForeArm: [-0.7, 0.5, -0.6],
          RightForeArm: [0.7, 0.5, -0.6],
        },
      },
    ],
  },
  shoulderPress: {
    seconds: 2.6,
    poses: [
      { bones: { LeftArm: [1, -0.1, 0.1], RightArm: [-1, -0.1, 0.1], LeftForeArm: [0, 1, 0.1], RightForeArm: [0, 1, 0.1] } },
      { bones: { LeftArm: [0.35, 1, 0.05], RightArm: [-0.35, 1, 0.05], LeftForeArm: [0.1, 1, 0], RightForeArm: [-0.1, 1, 0] } },
    ],
  },
  curl: {
    seconds: 2.6,
    poses: [
      { bones: { LeftArm: [0.12, -1, 0], RightArm: [-0.12, -1, 0] } },
      { bones: { LeftArm: [0.12, -1, 0.05], RightArm: [-0.12, -1, 0.05], LeftForeArm: [0, 1, 0.45], RightForeArm: [0, 1, 0.45] } },
    ],
  },
  row: {
    seconds: 2.6,
    view: 'side',
    poses: [
      { bones: { ...BENT_OVER, LeftArm: [0.12, -1, 0.05], RightArm: [-0.12, -1, 0.05] } },
      {
        bones: {
          ...BENT_OVER,
          LeftArm: [0.25, 0.6, -0.75],
          RightArm: [-0.25, 0.6, -0.75],
          LeftForeArm: [0, -1, 0.1],
          RightForeArm: [0, -1, 0.1],
        },
      },
    ],
  },
  jumpingJack: {
    seconds: 1.2,
    poses: [
      { bones: { ...ARMS_DOWN } },
      {
        lift: 0.08,
        bones: { LeftArm: [0.55, 1, 0], RightArm: [-0.55, 1, 0], LeftUpLeg: [0.3, -1, 0], RightUpLeg: [-0.3, -1, 0] },
      },
    ],
  },
  march: {
    seconds: 1.6,
    poses: [
      {
        bones: {
          LeftUpLeg: [0, -0.35, 1],
          LeftLeg: [0, -1, 0],
          LeftArm: [0.18, -1, -0.6],
          RightArm: [-0.18, -1, 0.6],
        },
      },
      STAND,
      {
        bones: {
          RightUpLeg: [0, -0.35, 1],
          RightLeg: [0, -1, 0],
          RightArm: [-0.18, -1, -0.6],
          LeftArm: [0.18, -1, 0.6],
        },
      },
      STAND,
    ],
  },
} satisfies Record<string, Animation>;

export type AnimationId = keyof typeof ANIMATIONS;

export function animationView(id: AnimationId): 'front' | 'side' {
  return (ANIMATIONS[id] as Animation).view ?? 'front';
}

type Joint = {
  name: Bone;
  bone: Object3D;
  parent: Joint | null;
  restLocal: Quaternion;
  /** Direction to the child joint, in the bone's own space. */
  localDir: Vector3;
};

const DEG = Math.PI / 180;
const X_AXIS = new Vector3(1, 0, 0);
const FLOOR_MARGIN = 0.04;

/** Drives one skinned character through an exercise animation. */
export class PosePlayer {
  private joints: Joint[] = [];
  /** Model-space rotation of whatever sits above the Hips (the armature). */
  private baseQuat = new Quaternion();
  private feet: Object3D[] = [];
  private contacts: Object3D[] = [];
  private restFeetZ = 0;
  private cache = new WeakMap<Pose, Quaternion[]>();
  private v = new Vector3();
  private box = new Vector3();

  constructor(private model: Object3D) {
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.updateMatrixWorld(true);
    const nodes = new Map<string, Object3D>();
    model.traverse((o) => nodes.set(o.name.replace(/^mixamorig:?/, ''), o));

    const toModel = new Matrix4().copy(model.matrixWorld).invert();
    // Decompose: the Mixamo armature is scaled, so the matrices are not pure rotations.
    const modelQuat = (o: Object3D) => {
      const q = new Quaternion();
      new Matrix4().multiplyMatrices(toModel, o.matrixWorld).decompose(new Vector3(), q, new Vector3());
      return q;
    };
    const modelPos = (o: Object3D) => o.getWorldPosition(new Vector3()).applyMatrix4(toModel);

    for (const [name, childName] of CHAIN) {
      const bone = nodes.get(name);
      const child = nodes.get(childName);
      if (!bone || !child) continue;
      const dir = modelPos(child).sub(modelPos(bone)).normalize();
      const localDir = dir.applyQuaternion(modelQuat(bone).invert());
      const parentName = bone.parent?.name.replace(/^mixamorig:?/, '');
      const parent = this.joints.find((j) => j.name === parentName) ?? null;
      this.joints.push({ name, bone, parent, restLocal: bone.quaternion.clone(), localDir });
      if (name === 'Hips' && bone.parent) this.baseQuat = modelQuat(bone.parent);
    }

    this.feet = ['LeftFoot', 'RightFoot'].map((n) => nodes.get(n)).filter((o): o is Object3D => !!o);
    this.contacts = ['LeftToeBase', 'RightToeBase', 'LeftToe_End', 'RightToe_End', 'LeftFoot', 'RightFoot', 'LeftHand', 'RightHand', 'LeftForeArm', 'RightForeArm', 'LeftLeg', 'RightLeg', 'Hips', 'Spine2', 'Head', 'HeadTop_End']
      .map((n) => nodes.get(n))
      .filter((o): o is Object3D => !!o);
    this.restFeetZ = this.feetZ();
  }

  /** `t` is time in seconds since the animation started. */
  update(id: AnimationId, t: number) {
    const anim: Animation = ANIMATIONS[id];
    const n = anim.poses.length;
    const phase = ((t / anim.seconds) % 1) * n;
    const i = Math.floor(phase);
    const a = anim.poses[i];
    const b = anim.poses[(i + 1) % n];
    const k = smooth(phase - i);

    const qa = this.locals(a);
    const qb = this.locals(b);
    this.joints.forEach((j, idx) => j.bone.quaternion.copy(qa[idx]).slerp(qb[idx], k));

    // Tilt the whole body, then stand it on the floor with the feet where they started.
    this.model.position.set(0, 0, 0);
    this.model.rotation.set(lerp(a.tilt ?? 0, b.tilt ?? 0, k) * DEG, 0, 0);
    this.model.updateMatrixWorld(true);
    let minY = Infinity;
    for (const c of this.contacts) minY = Math.min(minY, c.getWorldPosition(this.box).y);
    this.model.position.y = -minY + FLOOR_MARGIN + lerp(a.lift ?? 0, b.lift ?? 0, k);
    this.model.position.z = this.restFeetZ - this.feetZ();
    this.model.updateMatrixWorld(true);
  }

  /** Bone-local rotations that make the bones point where the pose says. */
  private locals(pose: Pose): Quaternion[] {
    const cached = this.cache.get(pose);
    if (cached) return cached;

    // Directions are given in the room; undo the body tilt to get model space.
    const untilt = new Quaternion().setFromAxisAngle(X_AXIS, -(pose.tilt ?? 0) * DEG);
    const modelQ = new Map<Joint, Quaternion>();
    const out = this.joints.map((j) => {
      const parentQ = j.parent ? modelQ.get(j.parent)! : this.baseQuat;
      const q = parentQ.clone().multiply(j.restLocal);
      const target = pose.bones[j.name];
      if (target) {
        const want = new Vector3(...target).normalize().applyQuaternion(untilt);
        const have = j.localDir.clone().applyQuaternion(q);
        q.premultiply(new Quaternion().setFromUnitVectors(have, want));
      }
      modelQ.set(j, q);
      return parentQ.clone().invert().multiply(q);
    });
    this.cache.set(pose, out);
    return out;
  }

  private feetZ() {
    if (!this.feet.length) return 0;
    let z = 0;
    for (const f of this.feet) z += f.getWorldPosition(this.v).z;
    return z / this.feet.length;
  }
}

function smooth(x: number) {
  return x * x * (3 - 2 * x);
}

function lerp(a: number, b: number, k: number) {
  return a + (b - a) * k;
}

/** Seconds one repetition takes, and how many key poses it has. */
export function animationTiming(id: AnimationId) {
  const anim: Animation = ANIMATIONS[id];
  return { seconds: anim.seconds, poses: anim.poses.length };
}

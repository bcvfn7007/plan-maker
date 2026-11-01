"""Build the "pro" coach: a MakeHuman CC0 body with its own face, real cloth meshes, a haircut,
eyebrows, eyes with irises and a painted skin texture, rigged for Mixamo bone names.

DATA_DIR is the data folder of MPFB (github.com/makehumancommunity/mpfb2, src/mpfb/data); only its CC0
assets are read (base mesh, targets, mixamo rig and weights, skin region masks).
    python build_pro.py DATA_DIR OUT.glb [male|female]
"""
import gzip, json, math, os, sys

import bpy  # noqa: I001  (bpy must come before bmesh)
import bmesh
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
DATA, OUT = ARGS[0], ARGS[1]
SEX = ARGS[2] if len(ARGS) > 2 else 'male'
MALE = SEX == 'male'
TEX = 2048
rng = np.random.default_rng(7)

# ------------------------------------------------------------------ base mesh + shape
verts, uvs, faces, fgroups = [], [], [], []
group = None
for line in open(os.path.join(DATA, '3dobjs', 'base.obj')):
    p = line.split()
    if not p:
        continue
    if p[0] == 'v':
        verts.append([float(x) for x in p[1:4]])
    elif p[0] == 'vt':
        uvs.append([float(x) for x in p[1:3]])
    elif p[0] == 'g':
        group = p[1]
    elif p[0] == 'f':
        faces.append([tuple(int(i) - 1 for i in c.split('/')[:2]) for c in p[1:]])
        fgroups.append(group)
V0 = np.array(verts)
UV = np.array(uvs)


def target(rel, weight=1.0):
    path = os.path.join(DATA, 'targets', rel + '.target.gz')
    off = np.zeros_like(V0)
    for l in gzip.open(path).read().decode().splitlines():
        if not l or l.startswith('#'):
            continue
        i, x, y, z = l.split()
        off[int(i)] = (float(x), float(y), float(z))
    return off * weight


def split(value, low, mid, high):
    if value < 0.5:
        return {low: (0.5 - value) * 2, mid: value * 2}
    return {mid: (1 - value) * 2, high: (value - 0.5) * 2}


gn = 'male' if MALE else 'female'
off = np.zeros_like(V0)
# Own mix of ethnic shapes, so the face is not the MakeHuman average.
for race, w in ({'caucasian': 0.62, 'african': 0.18, 'asian': 0.20} if MALE else {'caucasian': 0.55, 'african': 0.15, 'asian': 0.30}).items():
    off += target(f'macrodetails/{race}-{gn}-young', w)
muscle = split(0.74 if MALE else 0.62, 'minmuscle', 'averagemuscle', 'maxmuscle')
weight = split(0.42, 'minweight', 'averageweight', 'maxweight')
for mn, mw in muscle.items():
    for wn, ww in weight.items():
        w = mw * ww
        if w <= 1e-4:
            continue
        off += target(f'macrodetails/universal-{gn}-young-{mn}-{wn}', w)
        off += target(f'macrodetails/proportions/{gn}-young-{mn}-{wn}-idealproportions', w)
        off += target(f'macrodetails/height/{gn}-young-{mn}-{wn}-maxheight', w * 0.25)

# A distinctive, athletic face and build.
SHAPE = {
    'male': {
        'head/head-square': 0.35, 'chin/chin-width-incr': 0.35, 'chin/chin-prominent-incr': 0.25, 'chin/chin-bones-incr': 0.3,
        'cheek/l-cheek-bones-incr': 0.4, 'cheek/r-cheek-bones-incr': 0.4, 'cheek/l-cheek-volume-decr': 0.3, 'cheek/r-cheek-volume-decr': 0.3,
        'nose/nose-hump-decr': 0.4, 'nose/nose-point-width-decr': 0.35, 'nose/nose-scale-horiz-decr': 0.15, 'nose/nose-greek-incr': 0.2,
        'eyebrows/eyebrows-trans-down': 0.25, 'eyebrows/eyebrows-angle-down': 0.2, 'forehead/forehead-temple-decr': 0.2,
        'mouth/mouth-scale-horiz-incr': 0.15, 'mouth/mouth-lowerlip-volume-incr': 0.15, 'neck/measure-neck-circ-incr': 0.45,
        'eyes/l-eye-height2-incr': 0.4, 'eyes/r-eye-height2-incr': 0.4,
        'torso/torso-vshape-incr': 0.6, 'torso/torso-muscle-pectoral-incr': 0.35, 'torso/torso-muscle-dorsi-incr': 0.4,
        'torso/measure-shoulder-dist-incr': 0.25, 'torso/measure-waist-circ-decr': 0.25,
    },
    'female': {
        'head/head-oval': 0.45, 'chin/chin-width-decr': 0.2, 'chin/chin-prominent-incr': 0.15,
        'cheek/l-cheek-bones-incr': 0.45, 'cheek/r-cheek-bones-incr': 0.45, 'cheek/l-cheek-volume-decr': 0.25, 'cheek/r-cheek-volume-decr': 0.25,
        'nose/nose-hump-decr': 0.4, 'nose/nose-point-width-decr': 0.4, 'nose/nose-scale-horiz-decr': 0.25, 'nose/nose-point-up': 0.2,
        'mouth/mouth-upperlip-volume-incr': 0.3, 'mouth/mouth-lowerlip-volume-incr': 0.3, 'mouth/mouth-cupidsbow-incr': 0.3,
        'eyes/l-eye-scale-incr': 0.15, 'eyes/r-eye-scale-incr': 0.15, 'eyes/l-eye-height2-incr': 0.35, 'eyes/r-eye-height2-incr': 0.35, 'eyebrows/eyebrows-angle-up': 0.2,
        'torso/torso-vshape-incr': 0.2, 'torso/measure-waist-circ-decr': 0.35, 'neck/neck-scale-vert-incr': 0.2,
    },
}[SEX]
for rel, w in SHAPE.items():
    off += target(rel, w)
V = V0 + off
V = np.stack([V[:, 0], -V[:, 2], V[:, 1]], 1) * 0.1  # MakeHuman dm, Y up -> metres, Z up, facing -Y

GROUPS = json.load(open(os.path.join(DATA, 'mesh_metadata', 'basemesh_vertex_groups.json')))


def group_idx(name):
    return [i for a, b in GROUPS[name] for i in range(a, b + 1)]


def joint(name):
    return Vector(V[group_idx(name)].mean(0).tolist())


body_faces = [f for f, g in zip(faces, fgroups) if g == 'body']
V[:, 2] -= V[np.unique([c[0] for f in body_faces for c in f])][:, 2].min()

# ------------------------------------------------------------------ scene, rig
bpy.ops.wm.read_factory_settings(use_empty=True)
rig = json.load(open(os.path.join(DATA, 'rigs', 'standard', 'rig.mixamo.json')))['bones']


def rig_pos(spec):
    idx = group_idx(spec['cube_name']) if spec['strategy'] == 'CUBE' else spec['vertex_indices']
    return Vector(V[idx].mean(0).tolist())


arm = bpy.data.armatures.new('Armature')
ao = bpy.data.objects.new('Armature', arm)
bpy.context.scene.collection.objects.link(ao)
bpy.context.view_layer.objects.active = ao
bpy.ops.object.mode_set(mode='EDIT')
for name, b in rig.items():
    eb = arm.edit_bones.new(name)
    eb.head, eb.tail, eb.roll = rig_pos(b['head']), rig_pos(b['tail']), b['roll']
for name, b in rig.items():
    if b.get('parent'):
        arm.edit_bones[name].parent = arm.edit_bones[b['parent']]
        arm.edit_bones[name].use_connect = b.get('use_connect', False)
bpy.ops.object.mode_set(mode='OBJECT')
BONE = {n: (rig_pos(b['head']), rig_pos(b['tail'])) for n, b in rig.items()}
W = json.load(open(os.path.join(DATA, 'rigs', 'standard', 'weights.mixamo.json')))['weights']
BONE_NAMES = list(W.keys())


def make_object(name, face_list, weights=None, fixed_bone=None):
    """Mesh from base-mesh faces, with UVs and Mixamo vertex groups."""
    used = sorted({c[0] for f in face_list for c in f})
    remap = {o: n for n, o in enumerate(used)}
    me = bpy.data.meshes.new(name)
    me.from_pydata(V[used].tolist(), [], [[remap[c[0]] for c in f] for f in face_list])
    uvl = me.uv_layers.new(name='UVMap')
    li = 0
    for f in face_list:
        for c in f:
            uvl.data[li].uv = UV[c[1]]
            li += 1
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for bn in BONE_NAMES:
        ob.vertex_groups.new(name=bn)
    if fixed_bone:
        ob.vertex_groups[fixed_bone].add(list(range(len(used))), 1.0, 'REPLACE')
    else:
        for bn, lst in W.items():
            g = ob.vertex_groups[bn]
            for i, w in lst:
                if i in remap:
                    g.add([remap[i]], w, 'REPLACE')
    ob['src_index'] = used
    return ob


body = make_object('Body', body_faces)


def make_eyes():
    """Smooth eyeballs in place of the low-poly helper eyes, UV-mapped around the gaze for a crisp iris."""
    bm = bmesh.new()
    for grp in ('helper-l-eye', 'helper-r-eye'):
        pts = V[group_idx(grp)]
        c = pts.mean(0)
        r = float(np.linalg.norm(pts - c, axis=1).mean())
        part = bmesh.new()
        bmesh.ops.create_uvsphere(part, u_segments=40, v_segments=24, radius=r)
        for v in part.verts:
            v.co += Vector(c.tolist())
        tmp = bpy.data.meshes.new('tmp_eye')
        part.to_mesh(tmp)
        part.free()
        bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
        bm.verts.ensure_lookup_table()
        eye_centres.append((Vector(c.tolist()), r))
    uvl = bm.loops.layers.uv.new('UVMap')
    for f in bm.faces:
        for lp in f.loops:
            c, r = min(eye_centres, key=lambda e: (lp.vert.co - e[0]).length)
            d = (lp.vert.co - c).normalized()
            th = math.acos(max(-1.0, min(1.0, -d.y)))  # 0 = looking straight ahead
            ph = math.atan2(d.z, d.x)
            lp[uvl].uv = (0.5 + 0.5 * th / math.pi * math.cos(ph), 0.5 + 0.5 * th / math.pi * math.sin(ph))
    for f in bm.faces:
        f.smooth = True
    me = bpy.data.meshes.new('Eyes')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('Eyes', me)
    bpy.context.scene.collection.objects.link(ob)
    for bn in BONE_NAMES:
        ob.vertex_groups.new(name=bn)
    ob.vertex_groups['mixamorig:Head'].add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    return ob


eye_centres = []
eyes = make_eyes()
lashes = make_object('Lashes', [f for f, g in zip(faces, fgroups) if g.startswith('helper-') and 'eyelashes' in g], fixed_bone='mixamorig:Head')
hair_src = [f for f, g in zip(faces, fgroups) if g == 'helper-hair']

# ------------------------------------------------------------------ landmarks
neck_z = BONE['mixamorig:Neck'][0].z
hip_z = BONE['mixamorig:LeftUpLeg'][0].z
knee_z = BONE['mixamorig:LeftLeg'][0].z
eyeL, eyeR = joint('joint-l-eye'), joint('joint-r-eye')
eye_c = (eyeL + eyeR) / 2
head_top = V[group_idx('joint-head-2')].mean(0) if 'joint-head-2' in GROUPS else None


def weights_of(ob):
    n = len(ob.data.vertices)
    out = {}
    gi = {g.index: g.name for g in ob.vertex_groups}
    for v in ob.data.vertices:
        for ge in v.groups:
            out.setdefault(gi[ge.group], np.zeros(n))[v.index] = ge.weight
    # MakeHuman weights are not normalised; make them sum to 1 per vertex.
    total = sum((w for k, w in out.items() if k.startswith('mixamorig:')), np.zeros(n)) + 1e-9
    return {k: (w / total if k.startswith('mixamorig:') else w) for k, w in out.items()}


def bw(wmap, n, *names):
    return sum((wmap.get('mixamorig:' + b, np.zeros(n)) for b in names), np.zeros(n))


# ------------------------------------------------------------------ clothes
def cloth(name, keep, cuts, push, thick, color, rough=0.85, extra=None):
    """Copy the body faces where `keep` holds, cut clean straight edges with planes, push out, give thickness."""
    me = body.data
    n = len(me.vertices)
    co = np.array([v.co[:] for v in me.vertices])
    k = keep(co, weights_of(body), n)
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if not all(k[v.index] for v in f.verts)], context='FACES')
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    # Smooth first, cut after: subdividing the cut n-gons would make the hems zig-zag.
    tmp_me = bpy.data.meshes.new(name + '_tmp')
    bm.to_mesh(tmp_me)
    bm.free()
    tmp = bpy.data.objects.new(name + '_tmp', tmp_me)
    bpy.context.scene.collection.objects.link(tmp)
    for g in body.vertex_groups:
        tmp.vertex_groups.new(name=g.name)
    bpy.context.view_layer.objects.active = tmp
    sub = tmp.modifiers.new('Sub', 'SUBSURF')
    sub.levels = 1
    bpy.ops.object.modifier_apply(modifier='Sub')
    bm = bmesh.new()
    bm.from_mesh(tmp.data)
    bpy.data.objects.remove(tmp)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)  # the body's mirror seam
    # Fabric bridges small bumps of the body (nipples, navel): relax the front of the torso only.
    chest = [v for v in bm.verts if not v.is_boundary and v.co.y < 0.0 and hip_z + 0.05 < v.co.z < neck_z - 0.06]
    if not MALE and chest and name == "Tee":
        # A sports top holds the bust in one soft shape: flatten the very front of each breast.
        for sx in (1, -1):
            side = [v for v in chest if v.co.x * sx > 0.02]
            tip = min(v.co.y for v in side)
            for v in side:
                v.co.y = max(v.co.y, tip + 0.03)
    for _ in range(12):
        bmesh.ops.smooth_vert(bm, verts=chest, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * (push + extra(v.co) if extra else push)
    for plane_co, plane_no, only in cuts:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        if only is not None:
            dl = bm.verts.layers.deform.active
            names = {g.index: g.name for g in body.vertex_groups}
            sel = set()
            def share(v):
                tot = sum(w for gi_, w in v[dl].items() if names[gi_].startswith('mixamorig:')) + 1e-9
                return sum(w for gi_, w in v[dl].items() if names[gi_] in only) / tot
            for f in bm.faces:
                if sum(share(v) for v in f.verts) / len(f.verts) > 0.5:
                    sel.add(f)
            geom = list({v for f in sel for v in f.verts}) + list({e for f in sel for e in f.edges}) + list(sel)
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=plane_co, plane_no=plane_no, clear_outer=True)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    m2 = bpy.data.meshes.new(name)
    bm.to_mesh(m2)
    bm.free()
    ob = bpy.data.objects.new(name, m2)
    bpy.context.scene.collection.objects.link(ob)
    for g in body.vertex_groups:
        ob.vertex_groups.new(name=g.name)
    for p in m2.polygons:
        p.use_smooth = True
    bpy.context.view_layer.objects.active = ob
    sol = ob.modifiers.new('Sol', 'SOLIDIFY')
    sol.thickness = thick
    sol.offset = 1
    sol.use_rim = True
    sol.use_even_offset = True
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = rough
    ob.data.materials.append(mat)
    return ob


def lin(hex_):
    c = np.array([int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return tuple(float(x) for x in np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4))


ARM_L = ('LeftArm', 'LeftForeArm', 'LeftHand')
ARM_R = ('RightArm', 'RightForeArm', 'RightHand')
HANDS = ('LeftForeArm', 'RightForeArm', 'LeftHand', 'RightHand')


def hand_share(wm, n):
    """Forearms, hands and every finger bone."""
    return sum((w for k, w in wm.items() if 'ForeArm' in k or 'Hand' in k), np.zeros(n))


def arm_axis(side):
    h, t = BONE[f'mixamorig:{side}Arm']
    return h, (t - h)


tee_hem = hip_z + (0.02 if MALE else 0.06)
sleeve = 0.42 if MALE else 0.3  # share of the upper arm the sleeve covers
neck_cut_co = Vector((0, 0, neck_z + 0.004))
neck_cut_no = Vector((0, -0.6, 1)).normalized()  # lower at the front: a crew neck
cuts = [((0, 0, tee_hem), (0, 0, -1), None), (tuple(neck_cut_co), tuple(neck_cut_no), None)]
for side, names in (('Left', ARM_L), ('Right', ARM_R)):
    h, d = arm_axis(side)
    cuts.append((tuple(h + d * sleeve), tuple(d.normalized()), {'mixamorig:' + n for n in names}))


def tee_keep(co, wm, n):
    hands = hand_share(wm, n)
    return (co[:, 2] > tee_hem - 0.05) & (hands < 0.3)


shorts_waist = hip_z + 0.085
shorts_hem = knee_z + (hip_z - knee_z) * (0.45 if MALE else 0.6)


def shorts_keep(co, wm, n):
    hands = hand_share(wm, n) + bw(wm, n, 'LeftArm', 'RightArm')
    return (co[:, 2] < shorts_waist + 0.05) & (co[:, 2] > shorts_hem - 0.05) & (hands < 0.3)


TEE_COL = lin('#22262d') if MALE else lin('#2a2f38')
SHORTS_COL = lin('#15171b')
def collar_extra(c):
    d = (Vector(c) - neck_cut_co).dot(neck_cut_no)  # 0 at the collar, negative below it
    return 0.0035 * max(0.0, 1 - abs(d) / 0.05)


tee = cloth('Tee', tee_keep, cuts, 0.0055, 0.0025, TEE_COL, extra=collar_extra)
shorts = cloth('Shorts', shorts_keep, [((0, 0, shorts_waist), (0, 0, 1), None), ((0, 0, shorts_hem), (0, 0, -1), None)], 0.0045, 0.0025, SHORTS_COL)

# Hide the body under the clothes: drop faces well inside both garments (stops skin poking through).
me = body.data
n = len(me.vertices)
co = np.array([v.co[:] for v in me.vertices])
wm = weights_of(body)
inside = np.zeros(n, bool)
under_tee = (co[:, 2] > tee_hem + 0.03) & ((co - np.array(neck_cut_co)) @ np.array(neck_cut_no) < -0.02) & (hand_share(wm, n) < 0.05)
for side, names in (('Left', ARM_L), ('Right', ARM_R)):
    h, d = arm_axis(side)
    armw = bw(wm, n, *names)
    along = (co - np.array(h)) @ np.array(d.normalized())
    under_tee &= ~((armw > 0.05) & (along > d.length * sleeve - 0.035))
under_shorts = (co[:, 2] < shorts_waist - 0.03) & (co[:, 2] > shorts_hem + 0.03) & (hand_share(wm, n) + bw(wm, n, 'LeftArm', 'RightArm') < 0.05)
inside = under_tee | under_shorts
bm = bmesh.new()
bm.from_mesh(me)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(inside[v.index] for v in f.verts)], context='FACES')
bm.to_mesh(me)
bm.free()

# ------------------------------------------------------------------ sneakers (rounded shells around the feet)
ankle_z = V[group_idx('joint-l-ankle')][:, 2].mean()
gi0 = {g.index: g.name for g in body.vertex_groups}
src = [(v.co.copy(), {gi0[g.group]: g.weight for g in v.groups}) for v in body.data.vertices]
shoes = []
for sx in (1, -1):
    pts = [i for i, (c, gw) in enumerate(src) if c.x * sx > 0.02 and c.z < ankle_z + 0.03 and any('Foot' in k or 'Toe' in k for k in gw)]
    bm = bmesh.new()
    for i in pts:
        bm.verts.new(src[i][0])
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=2, use_grid_fill=True)
    for _ in range(4):
        bmesh.ops.smooth_vert(bm, verts=bm.verts[:], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * 0.006
    sm = bpy.data.meshes.new('Shoe')
    bm.to_mesh(sm)
    bm.free()
    so = bpy.data.objects.new('Shoe', sm)
    bpy.context.scene.collection.objects.link(so)
    P = np.array([src[i][0][:] for i in pts])
    for g in body.vertex_groups:
        so.vertex_groups.new(name=g.name)
    for v in sm.vertices:
        j = pts[int(np.argmin(((P - np.array(v.co[:])) ** 2).sum(1)))]
        for kname, w in src[j][1].items():
            so.vertex_groups[kname].add([v.index], w, 'REPLACE')
    for p_ in sm.polygons:
        p_.use_smooth = True
    # Two-tone: white upper, dark sole, a neon stripe along the side.
    upper, sole, stripe = [bpy.data.materials.new(x) for x in ('ShoeUpper', 'ShoeSole', 'ShoeStripe')]
    for m, c, r in ((upper, lin('#e9ecef'), 0.6), (sole, lin('#202328'), 0.8), (stripe, lin('#c6ff3d'), 0.5)):
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*c, 1)
        m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = r
        sm.materials.append(m)
    zs = np.array([v.co.z for v in sm.vertices])
    for p_ in sm.polygons:
        cz = zs[list(p_.vertices)].mean()
        cx = abs(np.mean([sm.vertices[i].co.x for i in p_.vertices]))
        outer = cx > abs(P[:, 0]).mean() + 0.025
        p_.material_index = 1 if cz < 0.022 else (2 if (0.03 < cz < 0.045 and outer) else 0)
    shoes.append(so)

def mask(name):
    path = os.path.join(DATA, 'textures', f'mpfb_{name}.jpg')
    img = bpy.data.images.load(path)
    a = np.array(img.pixels[:], np.float32).reshape(img.size[1], img.size[0], 4)[::-1, :, 0]
    if a.shape[0] != TEX:
        idx = (np.arange(TEX) * a.shape[0] / TEX).astype(int)
        a = a[idx][:, idx]
    return a


# ------------------------------------------------------------------ hair: a cap grown from the scalp, thinning to nothing at the hairline
def hairline_z(x, y):
    """Height of the hairline above (x, y): low at the nape, above the ears at the sides, high on the forehead."""
    d = y - eye_c.y  # > 0 towards the back of the head
    zf = eye_c.z + (0.088 if MALE else 0.1) + (0.008 if MALE else 0) * np.exp(-((np.abs(x) - 0.045) / 0.012) ** 2)
    zs = eye_c.z + (0.04 if MALE else 0.048)
    zb = eye_c.z - (0.075 if MALE else 0.1)
    t1 = np.clip((d + 0.05) / 0.05, 0, 1)
    t2 = np.clip((d - 0.04) / 0.06, 0, 1)
    t1, t2 = t1 * t1 * (3 - 2 * t1), t2 * t2 * (3 - 2 * t2)
    return zf + (zs - zf) * t1 + (zb - zs) * t2


def _sm(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def make_hair():
    wm = {k: np.zeros(len(V)) for k in ('head', 'all')}
    for bn, lst in W.items():
        for i, w in lst:
            wm['all'][i] += w
            if bn == 'mixamorig:Head':
                wm['head'][i] += w
    head_share = wm['head'] / (wm['all'] + 1e-9)
    above = V[:, 2] > hairline_z(V[:, 0], V[:, 1]) + 0.009  # mesh starts inside the painted hair: no z-fighting at the edge
    ears = mask('ears')
    def ear(t):
        return ears[int((1 - UV[t][1]) * (TEX - 1)), int(UV[t][0] * (TEX - 1))] > 0.5
    sel = [f for f in body_faces if all(above[c[0]] and head_share[c[0]] > 0.5 and not ear(c[1]) for c in f)]
    ob = make_object('Hair', sel, fixed_bone='mixamorig:Head')
    me = ob.data
    bm = bmesh.new()
    bm.from_mesh(me)
    bm.normal_update()
    top = max(v.co.z for v in bm.verts)
    up = Vector((0, 0.35, 1)).normalized()  # up and a little back
    for v in bm.verts:
        c = v.co
        rise = c.z - float(hairline_z(np.array(c.x), np.array(c.y)))
        h = max(0.0, (c.z - eye_c.z) / max(1e-3, top - eye_c.z))
        if MALE:
            # Short tapered sides and back, a textured crop on top.
            topness = float(_sm(h, 0.45, 0.85))
            full = 0.0025 + 0.013 * topness
        else:
            full = 0.004 + 0.006 * h  # pulled back into the ponytail
        clump = math.sin(c.x * 260 + math.sin(c.y * 40) * 2) * 0.5 + math.sin(c.x * 610 + c.y * 90) * 0.25
        amount = min(full * (1 + 0.25 * clump), max(-0.003, (rise - 0.022) * (0.3 if MALE else 0.18)))  # grows from zero along the hairline, not along face edges
        front = float(np.clip((eye_c.y - c.y) / 0.06, 0, 1))  # forehead side of the head
        k = 0.6 * front if MALE else 0.0
        d = (v.normal * (1 - k) + up * k).normalized()
        if v.is_boundary:
            amount = -0.003  # the edge hides under the painted scalp, so the cap rises out of it
        v.co += d * amount
    bm.to_mesh(me)
    bm.free()
    bpy.context.view_layer.objects.active = ob
    sub = ob.modifiers.new('Sub', 'SUBSURF')
    sub.levels = 1
    bpy.ops.object.modifier_apply(modifier='Sub')
    return ob


hair = make_hair()
parts = [hair]

def tube_object(name, rings_list, cap_tips=True):
    """Mesh object from lists of rings (each ring a list of points), weighted fully to the head."""
    bm = bmesh.new()
    for rings in rings_list:
        vr = [[bm.verts.new(p) for p in ring] for ring in rings]
        n = len(vr[0])
        for ra, rb in zip(vr, vr[1:]):
            for j in range(n):
                bm.faces.new((ra[j], ra[(j + 1) % n], rb[(j + 1) % n], rb[j]))
        if cap_tips:
            bm.faces.new(vr[0][::-1])
            bm.faces.new(vr[-1])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for g in body.vertex_groups:
        ob.vertex_groups.new(name=g.name)
    ob.vertex_groups['mixamorig:Head'].add(list(range(len(me.vertices))), 1.0, 'REPLACE')
    for p_ in me.polygons:
        p_.use_smooth = True
    return ob


if not MALE:
    # Ponytail: a bundle of twisting, tapering strands gathered by a hair tie at the back of the head.
    bz = eye_c.z - 0.005
    VB = V[list(body['src_index'])]
    back = VB[(np.abs(VB[:, 0]) < 0.012) & (np.abs(VB[:, 2] - bz) < 0.012)]
    base = Vector((0, float(back[:, 1].max()) + 0.006, bz))

    def axis(t):
        return base + Vector((0, 0.03 * t - 0.012 * t * t, -0.22 * t))

    def bundle_r(t):
        return 0.013 + 0.022 * math.sin(math.pi * min(1.0, t / 0.6) * 0.5) * (1 - t) ** 0.6 + 0.004 * (1 - t)

    rng_p = np.random.default_rng(7)
    strands = []
    for k in range(11):
        a0 = 2 * math.pi * k / 11 + rng_p.uniform(-0.25, 0.25)
        length = rng_p.uniform(0.82, 1.0)
        spread = rng_p.uniform(0.45, 0.7)
        rings = []
        for i, t in enumerate(np.linspace(0, length, 22)):
            ang = a0 + 0.9 * t
            br = bundle_r(t)
            off = Vector((math.cos(ang), math.sin(ang) * 0.85, 0)) * br * spread
            rs = br * 0.55 * (1 - (t / length) ** 3) + 0.0008
            c = axis(t) + off
            rings.append([c + Vector((math.cos(q) * rs, math.sin(q) * rs * 0.8, 0)) for q in np.linspace(0, 2 * math.pi, 8, endpoint=False)])
        strands.append(rings)
    pt = tube_object('Ponytail', strands)
    sub = pt.modifiers.new('Sub', 'SUBSURF')
    sub.levels = 1
    bpy.context.view_layer.objects.active = pt
    bpy.ops.object.modifier_apply(modifier='Sub')
    parts.append(pt)
    # Hair tie: a small ring around the gathered hair.
    tc, R, rr = axis(0.035), bundle_r(0.035) * 0.75 + 0.004, 0.0045
    tie_rings = [[tc + Vector((math.cos(u) * (R + rr * math.cos(q)), math.sin(u) * 0.85 * (R + rr * math.cos(q)), rr * math.sin(q)))
                  for q in np.linspace(0, 2 * math.pi, 8, endpoint=False)] for u in np.linspace(0, 2 * math.pi, 25)[:-1]]
    tie_rings.append(tie_rings[0])
    tie = tube_object('HairTie', [tie_rings], cap_tips=False)
    parts.append(tie)

# ------------------------------------------------------------------ smoother body
bpy.context.view_layer.objects.active = body
sub = body.modifiers.new('Sub', 'SUBSURF')
sub.levels = 1
bpy.ops.object.modifier_apply(modifier='Sub')

# ------------------------------------------------------------------ the texture atlas (skin, lips, brows, eyes, lashes, hair)
def raster(objs):
    """Per texel: 3D rest position and which object it belongs to."""
    P = np.zeros((TEX, TEX, 3), np.float32)
    O = np.full((TEX, TEX), -1, np.int8)
    for oi, ob in enumerate(objs):
        me = ob.data
        me.calc_loop_triangles()
        uvd = me.uv_layers.active.data
        co = np.array([v.co[:] for v in me.vertices])
        for tri in me.loop_triangles:
            uv = np.array([uvd[l].uv[:] for l in tri.loops]) * (TEX - 1)
            uv[:, 1] = (TEX - 1) - uv[:, 1]
            pts = co[list(tri.vertices)]
            x0, y0 = np.floor(uv.min(0)).astype(int)
            x1, y1 = np.ceil(uv.max(0)).astype(int) + 1
            xs, ys = np.meshgrid(np.arange(max(0, x0 - 1), min(TEX, x1 + 1)), np.arange(max(0, y0 - 1), min(TEX, y1 + 1)))
            px = np.stack([xs.ravel() + 0.5, ys.ravel() + 0.5], 1)
            a, b, c = uv
            m = np.array([[b[0] - a[0], c[0] - a[0]], [b[1] - a[1], c[1] - a[1]]])
            det = np.linalg.det(m)
            if abs(det) < 1e-9:
                continue
            l12 = np.linalg.solve(m, (px - a).T).T
            l0 = 1 - l12.sum(1)
            pad = 1.5 / max(1.0, math.sqrt(abs(det)))
            ok = (l0 > -pad) & (l12[:, 0] > -pad) & (l12[:, 1] > -pad)
            bary = np.stack([l0, l12[:, 0], l12[:, 1]], 1)[ok]
            X, Y = xs.ravel()[ok], ys.ravel()[ok]
            P[Y, X] = bary @ pts
            O[Y, X] = oi
    return P, O


def noise3(p, scale, octaves=3):
    """Cheap smooth value noise from a few random sine waves (deterministic)."""
    out = np.zeros(p.shape[:-1], np.float32)
    amp = 1.0
    for o in range(octaves):
        for _ in range(4):
            d = rng.normal(size=3)
            d /= np.linalg.norm(d)
            ph = rng.uniform(0, 6.28)
            out += amp * np.sin((p @ d) * scale * (2 ** o) + ph)
        amp *= 0.5
    return out / 6


def sm(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


P, O = raster([body])
x, y, z = P[..., 0], P[..., 1], P[..., 2]
img = np.zeros((TEX, TEX, 3), np.float32)

# Skin (sRGB values, converted at the end).
SKIN = np.array([0.80, 0.58, 0.46]) if MALE else np.array([0.88, 0.67, 0.56])
RED = np.array([0.80, 0.45, 0.40])
skin = np.broadcast_to(SKIN, img.shape).copy()
skin *= (1 + 0.05 * noise3(P, 40)[..., None] + 0.025 * noise3(P, 400, 2)[..., None])
# Warmer, redder: ears, nose tip, cheeks, knuckles, elbows, knees.
redness = 0.6 * mask('ears')
for jn, r, s in (('joint-l-knee', 0.07, 0.35), ('joint-r-knee', 0.07, 0.35), ('joint-l-elbow', 0.05, 0.3), ('joint-r-elbow', 0.05, 0.3)):
    j = joint(jn)
    redness = np.maximum(redness, s * (1 - sm(np.linalg.norm(P - np.array(j), axis=-1), 0, r)))
nose = Vector((0, eye_c.y - 0.09, eye_c.z - 0.045))
redness = np.maximum(redness, 0.35 * (1 - sm(np.linalg.norm(P - np.array(nose), axis=-1), 0, 0.03)))
for sx in (1, -1):
    ck = Vector((sx * 0.042, eye_c.y - 0.05, eye_c.z - 0.04))
    redness = np.maximum(redness, 0.22 * (1 - sm(np.linalg.norm(P - np.array(ck), axis=-1), 0, 0.035)))
skin = skin * (1 - redness[..., None] * 0.35) + RED * redness[..., None] * 0.35
face_front_early = sm(-(y - eye_c.y), -0.02, 0.03)
lips = mask('lips')
skin = skin * (1 - lips[..., None] * 0.5) + np.array([0.68, 0.44, 0.40] if MALE else [0.72, 0.38, 0.40])[None, None] * lips[..., None] * 0.5
for e in (eyeL, eyeR):
    socket = (1 - sm(np.linalg.norm((P - np.array(e)) * np.array([0.8, 1, 1.25]), axis=-1), 0.012, 0.032)) * face_front_early
    skin = skin * (1 - (0.13 * socket)[..., None] * np.array([0.8, 1.0, 0.95]))
lids = mask('eyelids')
skin *= (1 - 0.18 * lids[..., None] * np.array([0.6, 1, 1]))
nails = np.maximum(mask('fingernails'), mask('toenails'))
skin = skin * (1 - nails[..., None] * 0.6) + np.array([0.93, 0.78, 0.72]) * nails[..., None] * 0.6
face_front = sm(-(y - eye_c.y), -0.02, 0.03)
if MALE:
    # Light stubble on the jaw, chin and upper lip.
    jaw = face_front * sm(eye_c.z - 0.04 - z, 0, 0.02) * sm(z, eye_c.z - 0.17, eye_c.z - 0.13) * (1 - lips)
    speck = rng.random(z.shape).astype(np.float32)
    skin = skin * (1 - (jaw * (0.18 + 0.12 * speck))[..., None]) + np.array([0.35, 0.30, 0.28]) * (jaw * (0.18 + 0.12 * speck))[..., None]
# Eyebrows: a soft arc above each eye, denser near the nose, with hair-like streaks.
brow = np.zeros(z.shape, np.float32)
for e, sx in ((eyeL, 1), (eyeR, -1)):
    u = (x - e.x) * sx  # outwards
    arc = e.z + 0.022 + 0.006 * np.exp(-((u - 0.008) / 0.02) ** 2) - 0.004 * sm(u, 0.01, 0.035)
    half = (0.0042 if MALE else 0.0028) * (1 - 0.5 * sm(u, 0.0, 0.035))
    inside = (1 - sm(np.abs(z - arc), half * 0.6, half * 1.3)) * sm(u, -0.022, -0.016) * (1 - sm(u, 0.03, 0.037))
    brow = np.maximum(brow, inside * face_front)
streak = 0.65 + 0.35 * rng.random(z.shape).astype(np.float32)
BROW = np.array([0.16, 0.11, 0.08])
skin = skin * (1 - (brow * streak * 0.9)[..., None]) + BROW * (brow * streak * 0.9)[..., None]
img = np.where((O == 0)[..., None], skin, img)

# Eyes: sclera, iris with radial detail, dark limbal ring, pupil.
eye_img = np.zeros_like(img)
for e in (eyeL, eyeR):
    d = P - np.array(e)
    r = np.linalg.norm(d, axis=-1) + 1e-9
    ang = np.arccos(np.clip(-d[..., 1] / r, -1, 1))  # 0 = looking forward
    iris_r = 0.5
    iris_col = np.array([0.30, 0.20, 0.11]) if MALE else np.array([0.24, 0.33, 0.27])
    rad = np.arctan2(d[..., 2], d[..., 0])
    fib = 0.8 + 0.2 * np.sin(rad * 40) * np.sin(rad * 13 + 1)
    col = np.array([0.93, 0.91, 0.88])[None, None] * np.ones_like(img)
    col = np.where((ang < iris_r)[..., None], iris_col * fib[..., None] * (0.7 + 0.6 * (ang / iris_r))[..., None], col)
    col = np.where(((ang > iris_r - 0.06) & (ang < iris_r))[..., None], np.array([0.08, 0.06, 0.05]), col)
    col = np.where((ang < 0.2)[..., None], np.array([0.02, 0.02, 0.02]), col)
    near = (np.abs(x - e.x) < 0.02)[..., None]
    eye_img = np.where(near, col, eye_img)
img = np.where((O == 1)[..., None], eye_img, img)
img = np.where((O == 2)[..., None], np.array([0.22, 0.16, 0.13]), img)
# Hair: dark brown with fine strands running front to back.
HAIR = np.array([0.17, 0.12, 0.09]) if MALE else np.array([0.30, 0.19, 0.12])
strands = 0.85 + 0.15 * rng.random(z.shape).astype(np.float32) + 0.1 * noise3(P, 60, 2)
on_scalp = sm(z - hairline_z(x, y) + 0.0012 * noise3(P, 300, 2), -0.005, 0.006) * (z > eye_c.z - 0.12) * (np.abs(y - eye_c.y) < 0.2) * (1 - sm(mask('ears'), 0.4, 0.8) * (z < eye_c.z + 0.01))
img = np.where((O == 0)[..., None], img * (1 - on_scalp[..., None]) + (HAIR * strands[..., None]) * on_scalp[..., None], img)

# Fill gaps around UV islands (stops dark seams when mipmapped).
filled = O >= 0
for _ in range(6):
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
        sh = np.roll(np.roll(img, dy, 0), dx, 1)
        shf = np.roll(np.roll(filled, dy, 0), dx, 1)
        take = ~filled & shf
        img[take] = sh[take]
        filled |= take

atlas = bpy.data.images.new('Atlas', TEX, TEX, alpha=False)
rgba = np.concatenate([np.clip(img, 0, 1), np.ones((TEX, TEX, 1), np.float32)], -1)[::-1]
atlas.pixels = rgba.ravel()
atlas.file_format = 'JPEG'
atlas.filepath_raw = os.path.join(os.path.dirname(os.path.abspath(OUT)), f'atlas-{SEX}.jpg')
atlas.save()


def tex_material(name, rough, spec=0.5):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    t = nt.nodes.new('ShaderNodeTexImage')
    t.image = atlas
    nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = rough
    return m


body.data.materials.append(tex_material('Skin', 0.5))
# Eye texture in gaze-polar coordinates: centre = front of the eye, up = up.
EN = 512
gv, gu = np.meshgrid((np.arange(EN) + 0.5) / EN, (np.arange(EN) + 0.5) / EN, indexing='ij')  # rows = v from the bottom
du, dv = gu - 0.5, gv - 0.5
th = np.sqrt(du ** 2 + dv ** 2) * 2 * math.pi  # angle from the gaze
ph = np.arctan2(dv, du)
upness = np.sin(th) * np.sin(ph)  # height on the eyeball, -1..1
IRIS = np.array([0.27, 0.18, 0.11]) if MALE else np.array([0.30, 0.36, 0.30])
iris_r, pupil_r = 0.49, 0.17
t = np.clip((th - pupil_r) / (iris_r - pupil_r), 0, 1)
fib = 0.78 + 0.22 * np.sin(ph * 47) * np.sin(ph * 17 + 1.3) + 0.08 * np.sin(ph * 113)
iris = IRIS * fib[..., None] * (1.25 - 0.65 * t ** 1.5)[..., None]
iris = iris * (1 + 0.5 * np.exp(-((t - 0.18) / 0.08) ** 2))[..., None]  # bright collarette round the pupil
sclera = np.array([0.90, 0.87, 0.84]) * np.ones_like(iris)
sclera = sclera * (1 - 0.12 * sm(np.abs(np.cos(ph)) * np.sin(th), 0.5, 0.95))[..., None] + np.array([0.12, 0.02, 0.02]) * sm(np.abs(np.cos(ph)) * np.sin(th), 0.6, 0.95)[..., None]
col = np.where((th < iris_r)[..., None], iris, sclera)
ring = sm(th, iris_r - 0.09, iris_r) * (1 - sm(th, iris_r, iris_r + 0.03))
col = col * (1 - 0.75 * ring)[..., None]  # dark limbal ring
col = np.where((th < pupil_r)[..., None], np.array([0.015, 0.012, 0.012]), col)
col = col * (1 - 0.45 * sm(upness, 0.05, 0.55))[..., None]  # shadow of the upper lid
eimg = bpy.data.images.new('EyeTex', EN, EN, alpha=False)
eimg.pixels = np.concatenate([np.clip(col, 0, 1), np.ones((EN, EN, 1))], -1).astype(np.float32).ravel()
eimg.file_format = 'JPEG'
eimg.filepath_raw = os.path.join(os.path.dirname(os.path.abspath(OUT)), f'eye-{SEX}.jpg')
eimg.save()
em = bpy.data.materials.new('Eyes')
em.use_nodes = True
et = em.node_tree.nodes.new('ShaderNodeTexImage')
et.image = eimg
em.node_tree.links.new(et.outputs['Color'], em.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
em.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.06
eyes.data.materials.append(em)
# The MakeHuman lash cards need alpha; solid they read as heavy eyeliner, so they are left out.
bpy.data.objects.remove(lashes)
hair.data.materials.append(tex_material('Hair', 0.82))
if not MALE:
    pm = bpy.data.materials.new('Ponytail')
    pm.use_nodes = True
    pm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin('#4a3020'), 1)
    pm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.7
    pt.data.materials.append(pm)
    tm = bpy.data.materials.new('HairTie')
    tm.use_nodes = True
    tm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*lin('#c6ff3d'), 1)
    tm.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.5
    tie.data.materials.append(tm)

# ------------------------------------------------------------------ assemble + export
for ob in [body, eyes, tee, shorts, *shoes, *parts]:
    for g in [g for g in ob.vertex_groups if not g.name.startswith('mixamorig:')]:
        ob.vertex_groups.remove(g)
    ob.parent = ao
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = ao
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_skins=True, export_animations=False,
                          export_image_format='JPEG', export_jpeg_quality=88, export_apply=False, export_yup=True)
print('OK', OUT, {ob.name: len(ob.data.vertices) for ob in bpy.data.objects if ob.type == 'MESH'})

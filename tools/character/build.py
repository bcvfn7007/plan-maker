"""Build a rigged coach GLB from MakeHuman CC0 data (base mesh, macro targets, mixamo rig + weights).

DATA_DIR is the data folder of MPFB (github.com/makehumancommunity/mpfb2, src/mpfb/data); only its CC0 assets are read.
Runs with the bpy module (pip install bpy) or Blender itself:
    python build.py DATA_DIR OUT.glb [male|female]
    blender -b -P build.py -- DATA_DIR OUT.glb [male|female]"""
import sys, json, gzip, os, math
import numpy as np
import bpy
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
DATA, OUT = ARGS[0], ARGS[1]
SEX = ARGS[2] if len(ARGS) > 2 else 'male'
MD = os.path.join(DATA, 'targets', 'macrodetails')

# ---------- base mesh ----------
verts, uvs, faces, fgroups = [], [], [], []
group = None
for line in open(os.path.join(DATA, '3dobjs', 'base.obj')):
    p = line.split()
    if not p: continue
    if p[0] == 'v': verts.append([float(x) for x in p[1:4]])
    elif p[0] == 'vt': uvs.append([float(x) for x in p[1:3]])
    elif p[0] == 'g': group = p[1]
    elif p[0] == 'f':
        faces.append([tuple(int(i) - 1 if i else -1 for i in (c.split('/') + [''])[:2]) for c in p[1:]])
        fgroups.append(group)
V = np.array(verts)

def target(path):
    off = np.zeros_like(V)
    for l in gzip.open(path).read().decode().splitlines():
        if not l or l.startswith('#'): continue
        i, x, y, z = l.split()
        off[int(i)] = (float(x), float(y), float(z))
    return off

def split(value, low, mid, high):
    """MakeHuman-style 3-point interpolation -> {name: weight}."""
    if value < 0.5: return {low: (0.5 - value) * 2, mid: value * 2}
    return {mid: (1 - value) * 2, high: (value - 0.5) * 2}

g = 1.0 if SEX == 'male' else 0.0
genders = {'male': g, 'female': 1 - g}
muscle = split(0.68 if SEX == 'male' else 0.6, 'minmuscle', 'averagemuscle', 'maxmuscle')
weight = split(0.45, 'minweight', 'averageweight', 'maxweight')
off = np.zeros_like(V)
for gn, gw in genders.items():
    if gw <= 0: continue
    for race in ('african', 'asian', 'caucasian'):
        off += target(os.path.join(MD, f'{race}-{gn}-young.target.gz')) * gw / 3
    for mn, mw in muscle.items():
        for wn, ww in weight.items():
            w = gw * mw * ww
            if w <= 1e-4: continue
            off += target(os.path.join(MD, f'universal-{gn}-young-{mn}-{wn}.target.gz')) * w
            off += target(os.path.join(MD, 'proportions', f'{gn}-young-{mn}-{wn}-idealproportions.target.gz')) * w
            off += target(os.path.join(MD, 'height', f'{gn}-young-{mn}-{wn}-maxheight.target.gz')) * w * 0.2
V = V + off
# MakeHuman: decimetres, Y up -> Blender metres, Z up
V = np.stack([V[:, 0], -V[:, 2], V[:, 1]], 1) * 0.1

# ---------- which geometry to keep ----------
KEEP = {'body', 'helper-l-eye', 'helper-r-eye'}
keep_faces = [f for f, gname in zip(faces, fgroups) if gname in KEEP]
V[:, 2] -= V[np.unique([c[0] for f in keep_faces for c in f])][:, 2].min()

# ---------- mesh ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
used = sorted({c[0] for f in keep_faces for c in f})
remap = {o: n for n, o in enumerate(used)}
me = bpy.data.meshes.new('Human')
me.from_pydata(V[used].tolist(), [], [[remap[c[0]] for c in f] for f in keep_faces])
uvl = me.uv_layers.new(name='UVMap')
li = 0
for f in keep_faces:
    for c in f:
        uvl.data[li].uv = uvs[c[1]] if c[1] >= 0 else (0, 0)
        li += 1
for p in me.polygons: p.use_smooth = True
obj = bpy.data.objects.new('Human', me)
bpy.context.scene.collection.objects.link(obj)

# ---------- rig ----------
rig = json.load(open(os.path.join(DATA, 'rigs', 'standard', 'rig.mixamo.json')))['bones']
GROUPS = json.load(open(os.path.join(DATA, 'mesh_metadata', 'basemesh_vertex_groups.json')))
def group_idx(name): return [i for a, b in GROUPS[name] for i in range(a, b + 1)]
def pos(spec):
    idx = group_idx(spec['cube_name']) if spec['strategy'] == 'CUBE' else spec['vertex_indices']
    return Vector(V[idx].mean(0).tolist())
arm = bpy.data.armatures.new('Armature')
ao = bpy.data.objects.new('Armature', arm)
bpy.context.scene.collection.objects.link(ao)
bpy.context.view_layer.objects.active = ao
bpy.ops.object.mode_set(mode='EDIT')
for name, b in rig.items():
    eb = arm.edit_bones.new(name)
    eb.head, eb.tail, eb.roll = pos(b['head']), pos(b['tail']), b['roll']
for name, b in rig.items():
    if b.get('parent'):
        arm.edit_bones[name].parent = arm.edit_bones[b['parent']]
        arm.edit_bones[name].use_connect = b.get('use_connect', False)
bpy.ops.object.mode_set(mode='OBJECT')

# ---------- weights ----------
W = json.load(open(os.path.join(DATA, 'rigs', 'standard', 'weights.mixamo.json')))['weights']
for bone, lst in W.items():
    vg = obj.vertex_groups.new(name=bone)
    for i, w in lst:
        if i in remap: vg.add([remap[i]], w, 'REPLACE')
eye_vg = obj.vertex_groups.new(name='_eyes')
eye_vg.add(sorted({remap[c[0]] for f, gname in zip(faces, fgroups) if gname in ('helper-l-eye', 'helper-r-eye') for c in f}), 1.0, 'REPLACE')

# sneakers: a rounded convex shell around each foot, skinned like the nearest foot vertex
import bmesh
ankle_z = V[group_idx('joint-l-ankle')][:, 2].mean()
gi0 = {g.index: g.name for g in obj.vertex_groups}
src = [(v.co.copy(), {gi0[g.group]: g.weight for g in v.groups}) for v in me.vertices]
for sx in (1, -1):
    pts = [i for i, (co, gw) in enumerate(src) if co.x * sx > 0.02 and co.z < ankle_z + 0.025
           and any('Foot' in k or 'Toe' in k for k in gw)]
    bm = bmesh.new()
    for i in pts: bm.verts.new(src[i][0])
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context='VERTS')
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
    for _ in range(3): bmesh.ops.smooth_vert(bm, verts=bm.verts[:], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * 0.004
    sm_ = bpy.data.meshes.new('Shoe'); bm.to_mesh(sm_); bm.free()
    so = bpy.data.objects.new('Shoe', sm_); bpy.context.scene.collection.objects.link(so)
    P = np.array([src[i][0][:] for i in pts])
    for v in sm_.vertices:
        j = pts[int(np.argmin(((P - np.array(v.co[:])) ** 2).sum(1)))]
        for k, w in src[j][1].items():
            g = so.vertex_groups.get(k) or so.vertex_groups.new(name=k)
            g.add([v.index], w, 'REPLACE')
        (so.vertex_groups.get('_shoe') or so.vertex_groups.new(name='_shoe')).add([v.index], 1.0, 'REPLACE')
    for p_ in sm_.polygons: p_.use_smooth = True
    bpy.ops.object.select_all(action='DESELECT')
    so.select_set(True); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.join()
me = obj.data

# smoother body: one level of subdivision, applied (vertex groups are interpolated)
bpy.context.view_layer.objects.active = obj
sub = obj.modifiers.new('Sub', 'SUBSURF'); sub.levels = 1
bpy.ops.object.modifier_apply(modifier='Sub')
me = obj.data
obj.parent = ao
mod = obj.modifiers.new('Armature', 'ARMATURE'); mod.object = ao

# ---------- colours (vertex colours: skin, clothes, shoes, hair, eyes) ----------
n = len(me.vertices)
Vu = np.array([v.co[:] for v in me.vertices])
gi = {g.index: g.name for g in obj.vertex_groups}
bone_w = {}
for v in me.vertices:
    for ge in v.groups:
        bone_w.setdefault(gi[ge.group], np.zeros(n))[v.index] = ge.weight
total = sum(w for k, w in bone_w.items() if k.startswith('mixamorig:')) + 1e-9
for k in list(bone_w):
    if k.startswith('mixamorig:'): bone_w[k] = bone_w[k] / total
def bw(*names): return sum(bone_w.get('mixamorig:' + b, np.zeros(n)) for b in names)
def bw_match(*parts): return sum(w for k, w in bone_w.items() if any(p in k for p in parts))
def lin(hex_):
    c = np.array([int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)])
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
SKIN = lin('#c99476' if SEX == 'male' else '#d9a488')
TOP, SHORTS = lin('#3a4252'), lin('#1d2128')
SHOE, SOLE, HAIR = lin('#e4e7eb'), lin('#30343b'), lin('#2a1f18')
col = np.tile(SKIN, (n, 1))
z, y = Vu[:, 2], Vu[:, 1]
knee_z = pos(rig['mixamorig:LeftLeg']['head']).z
hip_z = pos(rig['mixamorig:LeftUpLeg']['head']).z
neck_z = pos(rig['mixamorig:Neck']['head']).z
limbs = bw_match('Arm', 'Hand', 'Neck', 'Head')
waist_z = hip_z + 0.11
def ss(x, a, b): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def paint(mask, c): col[:] = col * (1 - mask[:, None]) + np.asarray(c) * mask[:, None]
E = 0.006  # soft hem width (m)
cloth = (1 - ss(limbs, 0.25, 0.45)) * ss(z, knee_z + (hip_z - knee_z) * 0.42 - E, knee_z + (hip_z - knee_z) * 0.42 + E)
eye_y = V[group_idx('joint-l-eye')][:, 1].mean() + 0.06
sh = pos(rig['mixamorig:LeftArm']['head'])
pit_z = sh.z - 0.08
ax_ = np.abs(Vu[:, 0])
strap = sh.x - 0.035 - np.clip(z - pit_z, 0, None) * 0.55   # armhole edge narrows towards the shoulder
neck_line = neck_z - 0.045 - 0.05 * np.clip(1 - ax_ / 0.09, 0, 1) * (Vu[:, 1] < eye_y)
upper = (1 - ss(ax_ - strap, -E, E) * ss(z, pit_z - 0.06, pit_z - 0.03)) * (1 - ss(z - neck_line, -E, E))
paint(cloth * upper, SHORTS)
paint(cloth * upper * ss(z, waist_z - E, waist_z + E), TOP)
feet = bw('LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase')
shoe = bone_w.get('_shoe', np.zeros(n))
paint(shoe, SHOE)
paint(shoe * (1 - ss(z, 0.016, 0.024)), SOLE)
eye = Vector(V[group_idx('joint-l-eye')].mean(0).tolist())
head = ss(bw('Head'), 0.5, 0.7)
d, ax = y - eye.y, np.abs(Vu[:, 0])
nape = eye.z - (0.11 if SEX == 'female' else 0.06)
thr = np.maximum(nape, eye.z + 0.075 - 0.45 * ax - 0.9 * np.clip(d - 0.035, 0, None))
ears = (ax > 0.068) & (z < eye.z + 0.025) & (d < 0.11)
scalp = np.maximum(head, ss(bw('Neck', 'Head'), 0.5, 0.7) * (SEX == 'female'))
paint(scalp * ss(z - thr, -0.004, 0.004) * ~ears, HAIR)
eye_idx = np.nonzero(bone_w['_eyes'] > 0.99)[0]
col[eye_idx] = lin('#eeeeee')
for sx in (1, -1):
    side = eye_idx[Vu[eye_idx, 0] * sx > 0]
    col[side[Vu[side, 1] < Vu[side, 1].min() + 0.006]] = lin('#2b1d14')
obj.vertex_groups.remove(obj.vertex_groups['_eyes']); obj.vertex_groups.remove(obj.vertex_groups['_shoe'])
attr = me.color_attributes.new('Col', 'FLOAT_COLOR', 'POINT')
for i, c in enumerate(col): attr.data[i].color = (*[float(x) for x in c], 1.0)

mat = bpy.data.materials.new('Body')
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes['Principled BSDF']
vc = nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name = 'Col'
nt.links.new(vc.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.6
me.materials.append(mat)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_skins=True, export_animations=False,
                          export_vertex_color='ACTIVE', export_apply=False, export_yup=True)
print('OK', OUT, n, 'verts; height', round(float(Vu[:, 2].max()), 3))

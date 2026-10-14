"""Humanoid armature + skin weights for the character (run inside Blender).

Weights come from the same shapes the body was sculpted with: each vertex
is softly assigned to the body parts whose surface is closest (torso, legs,
arms, head...), and inside a part to the bones of that part by distance to
the bone segments.  Hair, coat tails and props get dedicated rules.
"""

import numpy as np
import bpy

import body as B
import outfit as O
from rig import J
from sdf import normalize


def bone_table():
    t = O._TORSO
    c = lambda z: np.array([t.prof('cx', z), t.prof('cy', z), z])
    nb, nt = J['neck_base'], J['neck_top']
    bones = {}
    bones['Hips'] = (c(0.975), c(1.07), None)
    bones['Spine'] = (c(1.07), c(1.19), 'Hips')
    bones['Chest'] = (c(1.19), c(1.31), 'Spine')
    bones['UpperChest'] = (c(1.31), np.array([nb[0], nb[1], 1.415]), 'Chest')
    bones['Neck'] = (np.array([nb[0], nb[1], 1.415]), nt, 'UpperChest')
    bones['Head'] = (nt, np.array([B.HX, 0.012, 1.68]), 'Neck')
    for s in ('R', 'L'):
        sg = -1 if s == 'R' else 1
        sh, el, wr = J['shoulder_' + s], J['elbow_' + s], J['wrist_' + s]
        bones['Shoulder.' + s] = (np.array([nb[0] + sg * 0.018, nb[1], 1.405]), sh,
                                  'UpperChest')
        bones['UpperArm.' + s] = (sh, el, 'Shoulder.' + s)
        bones['LowerArm.' + s] = (el, wr, 'UpperArm.' + s)
        bones['Hand.' + s] = (wr, wr + normalize(wr - el) * 0.085, 'LowerArm.' + s)
        hip, kn, an, toe = J['hip_' + s], J['knee_' + s], J['ankle_' + s], J['toe_' + s]
        fwd = toe - an
        fwd[2] = 0
        fwd = normalize(fwd)
        ball = an + fwd * 0.10
        ball[2] = 0.03
        bones['UpperLeg.' + s] = (hip, kn, 'Hips')
        bones['LowerLeg.' + s] = (kn, an, 'UpperLeg.' + s)
        bones['Foot.' + s] = (an, ball, 'LowerLeg.' + s)
        bones['Toes.' + s] = (ball, ball + fwd * 0.05, 'Foot.' + s)
    return bones


def make_armature(bones):
    arm_data = bpy.data.armatures.new('Armature')
    arm = bpy.data.objects.new('Armature', arm_data)
    root = bpy.data.collections['Personagem']
    root.objects.link(arm)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm_data.edit_bones
    for name, (h, t, parent) in bones.items():
        b = eb.new(name)
        b.head = tuple(h)
        b.tail = tuple(t)
        b.roll = 0.0
    for name, (h, t, parent) in bones.items():
        if parent:
            eb[name].parent = eb[parent]
            eb[name].use_connect = np.linalg.norm(np.asarray(eb[parent].tail) - np.asarray(h)) < 1e-4
    bpy.ops.object.mode_set(mode='OBJECT')
    arm_data.display_type = 'STICK'
    arm.show_in_front = True
    return arm


def seg_dist(P, a, b):
    ab = b - a
    t = np.clip(((P - a) @ ab) / (ab @ ab), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * ab), axis=1)


def sstep(v, e0, e1):
    q = np.clip((v - e0) / (e1 - e0), 0, 1)
    return q * q * (3 - 2 * q)


def part_list():
    """(sdf, [bones]) used for the soft segmentation."""
    parts = [(B.torso(), ['Hips', 'Spine', 'Chest', 'UpperChest'])]
    for b in B.breasts():
        parts.append((b, ['Chest', 'UpperChest']))
    parts.append((B.neck(), ['Neck', 'UpperChest']))
    sh = B.shoulders()
    parts.append((sh[0], ['Shoulder.R', 'UpperChest']))
    parts.append((sh[1], ['Shoulder.R', 'UpperArm.R']))
    parts.append((sh[2], ['Shoulder.L', 'UpperChest']))
    parts.append((sh[3], ['Shoulder.L', 'UpperArm.L']))
    for g in B.glutes():
        parts.append((g, ['Hips']))
    for s in ('R', 'L'):
        parts.append((B.leg(s), ['UpperLeg.' + s, 'LowerLeg.' + s]))
        parts.append((B.arm(s), ['UpperArm.' + s, 'LowerArm.' + s]))
        foot, _, _ = O.foot_loft(s)
        parts.append((foot, ['Foot.' + s, 'Toes.' + s]))
        parts.append((_SphereFn(J['wrist_' + s] + normalize(J['wrist_' + s] - J['elbow_' + s]) * 0.05,
                                0.035), ['Hand.' + s]))
    parts.append((B.skull(), ['Head']))
    return parts


class _SphereFn:
    def __init__(self, c, r):
        self.c, self.r = np.asarray(c), r

    def __call__(self, P):
        return np.linalg.norm(P - self.c, axis=-1) - self.r


def body_weights(P, bones, names, sigma_part=0.010, sigma_bone=0.025):
    parts = part_list()
    D = np.stack([p(P) for p, _ in parts], axis=1)
    dmin = D.min(axis=1, keepdims=True)
    A = np.exp(-(D - dmin) / sigma_part)
    A[A < 1e-3] = 0
    W = np.zeros((len(P), len(names)))
    idx = {n: i for i, n in enumerate(names)}
    for k, (_, bl) in enumerate(parts):
        if not A[:, k].any():
            continue
        dist = np.stack([seg_dist(P, bones[b][0], bones[b][1]) for b in bl], axis=1)
        Bw = np.exp(-(dist - dist.min(axis=1, keepdims=True)) / sigma_bone)
        Bw /= Bw.sum(axis=1, keepdims=True)
        for j, b in enumerate(bl):
            W[:, idx[b]] += A[:, k] * Bw[:, j]
    return W


def hair_weights(P, names):
    idx = {n: i for i, n in enumerate(names)}
    z = P[:, 2]
    W = np.zeros((len(P), len(names)))
    wh = sstep(z, 1.38, 1.50)
    rest = 1 - wh
    wu = rest * sstep(z, 1.15, 1.32)
    wc = rest * (1 - sstep(z, 1.15, 1.32)) * sstep(z, 0.95, 1.10)
    ws = rest - wu - wc
    W[:, idx['Head']] = wh
    W[:, idx['UpperChest']] = wu
    W[:, idx['Chest']] = wc
    W[:, idx['Spine']] = ws
    return W


def coat_weights(P, bones, names):
    W = body_weights(P, bones, names, sigma_part=0.02)
    idx = {n: i for i, n in enumerate(names)}
    z = P[:, 2]
    low = 1 - sstep(z, 0.92, 1.02)          # hanging part
    x = P[:, 0] - O.PCX
    hang = np.zeros_like(W)
    hang[:, idx['Hips']] = 0.75
    side = sstep(np.abs(x), 0.03, 0.12) * 0.25
    hang[:, idx['Hips']] += 0.25 - side
    hang[:, idx['UpperLeg.R']] = np.where(x < 0, side, 0)
    hang[:, idx['UpperLeg.L']] = np.where(x >= 0, side, 0)
    return W * (1 - low[:, None]) + hang * low[:, None]


HEAD_RIGID = ('Head', 'HairCap', 'HairBangs', 'HairCrown', 'HairOrnament', 'HairRibbons',
              'HairClips')


def rule(name):
    """How an object is skinned, from its name: ('rigid', bone) or a mode."""
    base = name[:-len('_Outline')] if name.endswith('_Outline') else name
    if base in HEAD_RIGID:
        return ('rigid', 'Head')
    if base.startswith('Hair'):
        return ('hair', None)
    if base.startswith('Coat') and 'Collar' not in base:
        return ('coat', None)
    if base.startswith('Hand') or base.startswith('Fingers'):
        return ('rigid', 'Hand.' + ('R' if base.endswith('R') else 'L'))
    if base.startswith('Sword'):
        # the long scabbard rests in her right hand, the others ride on the hip
        return ('rigid', 'Hand.R' if base.startswith(('SwordR', 'SwordBig', 'SwordNightblaze', 'Sword1'))
                else 'Hips')
    if 'Goggle' in base:
        return ('rigid', 'UpperChest')
    if 'Collar' in base and not base.startswith('Coat'):
        return ('rigid', 'Neck')
    if 'HangingStrap' in base or 'Pouch' in base:
        return ('rigid', 'Hips')
    return ('body', None)


def assign(ob, W, names, top=4):
    me = ob.data
    order = np.argsort(-W, axis=1)[:, :top]
    rows = np.arange(len(W))[:, None]
    Wt = W[rows, order]
    s = Wt.sum(axis=1, keepdims=True)
    s[s == 0] = 1
    Wt = Wt / s
    groups = {}
    for v in range(len(W)):
        for j in range(top):
            w = Wt[v, j]
            if w < 0.01:
                continue
            bi = order[v, j]
            groups.setdefault(bi, ([], []))
            groups[bi][0].append(v)
            groups[bi][1].append(w)
    for bi, (vs, ws) in groups.items():
        vg = ob.vertex_groups.get(names[bi]) or ob.vertex_groups.new(name=names[bi])
        # group vertices by (rounded) weight to keep the API calls few
        ws = np.round(np.asarray(ws), 3)
        vs = np.asarray(vs)
        for w in np.unique(ws):
            vg.add(vs[ws == w].tolist(), float(w), 'REPLACE')


def rig_character(objects):
    bones = bone_table()
    names = list(bones)
    arm = make_armature(bones)
    for ob in objects:
        me = ob.data
        P = np.zeros(len(me.vertices) * 3)
        me.vertices.foreach_get('co', P)
        P = P.reshape(-1, 3) @ np.asarray(ob.matrix_world)[:3, :3].T + np.asarray(ob.matrix_world)[:3, 3]
        mode, bone = rule(ob.name)
        if mode == 'rigid':
            vg = ob.vertex_groups.new(name=bone)
            vg.add(list(range(len(me.vertices))), 1.0, 'REPLACE')
        else:
            if mode == 'hair':
                W = hair_weights(P, names)
            elif mode == 'coat':
                W = coat_weights(P, bones, names)
            else:
                W = body_weights(P, bones, names)
            assign(ob, W, names)
        mod = ob.modifiers.new('Armature', 'ARMATURE')
        mod.object = arm
        # armature first in the stack (before subdivision / outline)
        with bpy.context.temp_override(object=ob):
            bpy.ops.object.modifier_move_to_index(modifier='Armature', index=0)
        ob.parent = arm
    return arm

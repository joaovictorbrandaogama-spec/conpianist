"""Gloved hands built from capsules in a canonical hand frame.

Canonical right hand: wrist at the origin, fingers along -Z, palm facing +Y,
thumb on the +X side.  Left hands mirror X.
"""

import numpy as np

from sdf import Grid, RoundCone, Box, Ellipsoid, smin, normalize, rot_x, rot_y, rot_z
from meshutil import MeshData
from rig import J

FINGERS = {
    #          base x, base z, lengths,                 radius
    'index':  (0.0205, -0.084, (0.037, 0.023, 0.018), 0.0074),
    'middle': (0.0068, -0.087, (0.041, 0.026, 0.019), 0.0076),
    'ring':   (-0.0070, -0.085, (0.038, 0.024, 0.018), 0.0072),
    'pinky':  (-0.0205, -0.079, (0.030, 0.020, 0.016), 0.0065),
}


def finger_points(base, lengths, curls, spread):
    """Joint positions of a finger.  Curls bend towards the palm (+Y)."""
    pts = [np.array(base, dtype=float)]
    d = np.array([0, 0, -1.0])
    d = rot_y(np.radians(spread)) @ d
    ang = 0.0
    for L, c in zip(lengths, curls):
        ang += np.radians(c)
        dd = rot_x(-ang) @ d          # rotate -Z towards +Y
        pts.append(pts[-1] + dd * L)
    return pts


def hand_prims(curls, spread, thumb, mirror=False):
    """Primitives of a canonical hand.  Returns (palm_prims, finger_prims)."""
    sx = -1.0 if mirror else 1.0
    palm = [
        Box([0, 0.0, -0.050], [0.031, 0.0105, 0.036], None, 0.008),
        RoundCone([0, 0, -0.005], [0, 0, -0.030], 0.020, 0.024, ell=(0.62, 1.3), front=(0, 1, 0)),
    ]
    fingers = []
    for i, (name, (bx, bz, lens, r)) in enumerate(FINGERS.items()):
        base = np.array([bx * sx, 0.0, bz])
        pts = finger_points(base, lens, curls[name], spread[name] * sx)
        radii = [r, r * 0.95, r * 0.88, r * 0.80]
        for a, b, r1, r2 in zip(pts[:-1], pts[1:], radii[:-1], radii[1:]):
            fingers.append(RoundCone(a, b, r1, r2))
    # thumb: from the base of the palm out to the side
    tb = np.array([0.026 * sx, 0.006, -0.028])
    d = normalize(np.array([0.55 * sx, thumb[0], -1.0]))
    p1 = tb + d * 0.030
    d2 = normalize(np.array([0.25 * sx, thumb[1], -1.0]))
    p2 = p1 + d2 * 0.026
    d3 = normalize(np.array([0.05 * sx, thumb[2], -1.0]))
    p3 = p2 + d3 * 0.021
    for a, b, r1, r2 in ((tb, p1, 0.011, 0.0088), (p1, p2, 0.0088, 0.0080), (p2, p3, 0.0080, 0.0068)):
        fingers.append(RoundCone(a, b, r1, r2))
    return palm, fingers


class Placed:
    """Primitive transformed by rotation M (local->world) and translation t."""

    def __init__(self, prim, M, t):
        self.p, self.M, self.t = prim, np.asarray(M), np.asarray(t)

    def bounds(self):
        lo, hi = self.p.bounds()
        c = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1])
                      for z in (lo[2], hi[2])])
        w = c @ self.M.T + self.t
        return w.min(axis=0), w.max(axis=0)

    def __call__(self, P):
        return self.p((P - self.t) @ self.M)


def hand_frame(side, palm_dir, extra_twist=0.0):
    el, wr = J['elbow_' + side], J['wrist_' + side]
    z = normalize(el - wr)                       # local +Z = up the forearm
    y = np.asarray(palm_dir, dtype=float)
    y = normalize(y - z * np.dot(y, z))
    x = np.cross(y, z)
    M = np.stack([x, y, z], axis=1)
    if extra_twist:
        M = M @ rot_z(np.radians(extra_twist))
    return M


def build_hand(side, curls, spread, thumb, palm_dir, twist=0.0, h=0.0006,
               palm_mat='white', finger_mat='white'):
    mirror = side == 'L'
    palm, fingers = hand_prims(curls, spread, thumb, mirror)
    M = hand_frame(side, palm_dir, twist)
    t = J['wrist_' + side] + M @ np.array([0, 0, 0.012])
    P1 = [Placed(p, M, t) for p in palm]
    P2 = [Placed(p, M, t) for p in fingers]
    allp = P1 + P2
    lo = np.min([p.bounds()[0] for p in allp], axis=0) - 0.01
    hi = np.max([p.bounds()[1] for p in allp], axis=0) + 0.01
    out = {}
    if palm_mat == finger_mat:
        g = Grid(lo, hi, h)
        for p in P1:
            g.union(p, 0.008)
        for p in P2:
            g.union(p, 0.004)
        v, f = g.mesh()
        out['Hand' + side] = MeshData(v, f, mat=palm_mat, decimate=12000, outline_w=0.6)
    else:
        g = Grid(lo, hi, h)
        for p in P1:
            g.union(p, 0.008)
        v, f = g.mesh()
        out['Hand' + side] = MeshData(v, f, mat=palm_mat, decimate=6000, outline_w=0.6)
        g = Grid(lo, hi, h)
        for p in P2:
            g.union(p, 0.004)
        v, f = g.mesh()
        out['Fingers' + side] = MeshData(v, f, mat=finger_mat, decimate=10000, outline_w=0.6)
    return out, M, t


def hands():
    out = {}
    # right hand: fist around the sword grip, palm towards the thigh
    fist = {'index': (80, 95, 60), 'middle': (85, 95, 60), 'ring': (88, 95, 58),
            'pinky': (90, 92, 55)}
    sp = {'index': 4, 'middle': 0, 'ring': -3, 'pinky': -7}
    o, M, t = build_hand('R', fist, sp, (0.9, 1.1, 0.8), (1.0, 0.25, 0.0), twist=0.0)
    out.update(o)
    # left hand: relaxed, slightly clawed fingers
    relaxed = {'index': (18, 32, 22), 'middle': (16, 30, 22), 'ring': (20, 34, 24),
               'pinky': (26, 38, 26)}
    sp = {'index': 9, 'middle': 2, 'ring': -6, 'pinky': -14}
    o, M, t = build_hand('L', relaxed, sp, (0.35, 0.45, 0.4), (-1.0, 0.15, 0.0),
                         palm_mat='white', finger_mat='red')
    out.update(o)
    return out

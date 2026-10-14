"""Slender anime hands as explicit lofted polygon meshes.

Every digit and the palm is a *tube*: rounded-square cross sections
(superellipses, wider than deep, a flatter back) lofted along a straight
rest axis and then posed by hinge rotations at the joints (the rotation
angle is blended over a few millimetres around each joint, about a hinge
that sits on the palm side, so knuckles round off on the back and crease on
the palm side).  Shading normals come from the clean analytic surfaces, so
the toon terminator stays smooth.

Canonical (rest) hand frame of a RIGHT hand: wrist centre at the origin,
fingers along -Z, palm facing +Y, thumb on the +X side.  Left hands are the
mirror image (x -> -x).  ``hand_frame`` maps canonical to world.

Objects (all names start with Hand/Fingers and end with the side letter):
  HandR        palm + digits, white glove / skin (multi-material)
  HandWrapsR   bandage wraps of the right hand (white strips)
  HandL        palm + digits, white glove with red finger ends
  HandStripesL red graphic panels on the back of the left glove
"""

import numpy as np

import clothing_geo as G
from meshutil import MeshData
from rig import J


# ------------------------------------------------------------------ math

def nrm(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def rodrigues(P, axis, ang):
    """Rotate points P (N,3) about unit axis by per-point angles ang (N,)."""
    k = nrm(axis)
    c, s = np.cos(ang)[:, None], np.sin(ang)[:, None]
    kxp = np.cross(k[None, :], P)
    kdp = (P @ k)[:, None]
    return P * c + kxp * s + k[None, :] * kdp * (1 - c)


def rot(axis, ang):
    return rodrigues(np.eye(3), axis, np.full(3, ang)).T


def sstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def interp_rows(rows, s):
    """rows: list of (s, v0, v1, ...) -> per-s interpolated arrays (pchip)."""
    from scipy.interpolate import PchipInterpolator
    R = np.array(rows, dtype=np.float64)
    return PchipInterpolator(R[:, 0], R[:, 1:], axis=0, extrapolate=True)(np.clip(s, R[0, 0], R[-1, 0]))


# ------------------------------------------------------------------ tubes

class Tube:
    """Lofted tube in a local frame (columns of R: x lateral, y palm side,
    t along the digit).  ``prof`` rows: (s, a, bb, bf, eb, ef, xc, yc)
    a = half width, bb/bf = half depth to the back / palm side, eb/ef =
    superellipse exponents of the back / palm halves, (xc, yc) = section
    centre offset.  ``joints``: (s_j, angle_deg, blend_halfwidth, hinge_y).
    The tube runs from s0 to s1 with rounded caps of length c0 / c1."""

    def __init__(self, origin, R, s0, s1, prof, joints=(), c0=0.006, c1=0.006):
        self.o = np.asarray(origin, dtype=np.float64)
        self.R = np.asarray(R, dtype=np.float64)
        self.s0, self.s1 = s0, s1
        self.prof = prof
        self.joints = list(joints)
        self.c0, self.c1 = c0, c1

    # rest surface in local coordinates
    def section(self, s):
        p = interp_rows(self.prof, s)
        return [p[..., i] for i in range(7)]

    def cap_scale(self, s):
        f = np.ones_like(s)
        if self.c1 > 0:
            t = np.clip((s - (self.s1 - self.c1)) / self.c1, 0, 1)
            if getattr(self, 'claw', False):
                f = f * np.maximum(1 - t ** 1.5, 0) ** 0.72      # pointed claw tip
            else:
                f = f * np.sqrt(np.maximum(1 - t ** 2, 0))
        if self.c0 > 0:
            t = np.clip(((self.s0 + self.c0) - s) / self.c0, 0, 1)
            f = f * np.sqrt(np.maximum(1 - t ** 2, 0))
        return f

    def rest(self, th, s, off=0.0):
        th = np.asarray(th, dtype=np.float64)
        s = np.asarray(s, dtype=np.float64)
        th, s = np.broadcast_arrays(th, s)
        th, s = th.ravel(), s.ravel()
        a, bb, bf, eb, ef, xc, yc = self.section(s)
        f = self.cap_scale(s)
        c, sn = np.cos(th), np.sin(th)
        e = np.where(sn > 0, ef, eb)
        b = np.where(sn > 0, bf, bb)
        x = a * f * np.sign(c) * np.abs(c) ** (2 / e)
        y = b * f * np.sign(sn) * np.abs(sn) ** (2 / e)
        P = np.stack([x + xc, y + yc, s], axis=1)
        if np.any(np.asarray(off) != 0):
            N = self.rest_normal(th, s)
            P = P + N * np.broadcast_to(np.asarray(off, dtype=np.float64), s.shape)[:, None]
        return P

    def back_theta(self, x, s):
        """Angle of the point on the back half (y < 0) whose x equals x."""
        a, bb, bf, eb, ef, xc, yc = self.section(np.asarray(s, dtype=np.float64))
        f = self.cap_scale(np.asarray(s, dtype=np.float64))
        q = np.clip((np.asarray(x) - xc) / (a * f), -0.999, 0.999)
        c = np.sign(q) * np.abs(q) ** (eb / 2)
        return -np.arccos(c)

    def rest_normal(self, th, s, eps=1e-4):
        # cross-section normal (ignores the slow change along s except at caps)
        Pa = self.rest(th + eps, s)
        Pb = self.rest(th - eps, s)
        Pc = self.rest(th, s + eps * 0.05)
        Pd = self.rest(th, s - eps * 0.05)
        return nrm(np.cross(Pa - Pb, Pc - Pd))

    def deform(self, L, s):
        """Pose rest-local points (hinge rotations about local x)."""
        P = np.array(L, dtype=np.float64)
        s = np.asarray(s, dtype=np.float64).ravel()
        for sj, ang, w, hy in reversed(self.joints):
            if abs(ang) < 1e-9:
                continue
            wgt = sstep((s - (sj - w)) / (2 * w))
            H = np.array([0.0, hy, sj])
            P = rodrigues(P - H, np.array([-1.0, 0.0, 0.0]), np.radians(ang) * wgt) + H
        return P

    def world(self, L):
        return L @ self.R.T + self.o

    def point(self, th, s, off=0.0):
        th, s = np.broadcast_arrays(np.asarray(th, dtype=np.float64),
                                    np.asarray(s, dtype=np.float64))
        L = self.rest(th, s, off)
        return self.world(self.deform(L, s.ravel()))

    def mesh(self, nth=16, step=0.002, tip_rings=6):
        """Quad mesh of the posed tube with apex vertices at both caps."""
        s0, s1, c0, c1 = self.s0, self.s1, self.c0, self.c1
        mid = np.linspace(s0 + c0, s1 - c1, max(2, int(np.ceil((s1 - c1 - s0 - c0) / step)) + 1))
        # extra rings around the joints
        for sj, ang, w, hy in self.joints:
            if s0 + c0 < sj < s1 - c1 and abs(ang) > 1e-6:
                mid = np.concatenate([mid, sj + np.linspace(-w, w, 5)])
        mid = np.unique(np.round(mid, 7))
        cap0 = s0 + c0 * (1 - np.sin(np.linspace(0, np.pi / 2, tip_rings + 1)[1:-1]))[::-1]
        cap1 = s1 - c1 * (1 - np.sin(np.linspace(0, np.pi / 2, tip_rings + 1)[1:-1]))
        cap0 = np.sort(cap0)
        cap1 = np.sort(cap1)
        ss = np.unique(np.concatenate([cap0[cap0 < mid[0]], mid, cap1[cap1 > mid[-1]]]))
        th = np.linspace(0, 2 * np.pi, nth, endpoint=False) + np.pi / nth
        TH, SS = np.meshgrid(th, ss)
        V = self.point(TH, SS).reshape(len(ss), nth, 3)
        A = self.point(np.zeros(1), np.array([s0]))[0]
        B = self.point(np.zeros(1), np.array([s1]))[0]
        verts = np.concatenate([V.reshape(-1, 3), A[None], B[None]])
        ia, ib = len(ss) * nth, len(ss) * nth + 1
        F = []
        for i in range(len(ss) - 1):
            for j in range(nth):
                j2 = (j + 1) % nth
                F.append([i * nth + j, i * nth + j2, (i + 1) * nth + j2, (i + 1) * nth + j])
        for j in range(nth):
            j2 = (j + 1) % nth
            F.append([ia, j2, j])
            n0 = (len(ss) - 1) * nth
            F.append([ib, n0 + j, n0 + j2])
        F = orient_outward(verts, F)
        ring_s = np.concatenate([SS.ravel(), [s0, s1]])
        return verts, F, ring_s


def orient_outward(V, F):
    """Flip all faces if the closed mesh has negative signed volume."""
    vol = 0.0
    for f in F:
        a = V[f[0]]
        for k in range(1, len(f) - 1):
            vol += np.dot(a, np.cross(V[f[k]], V[f[k + 1]]))
    if vol < 0:
        F = [list(f)[::-1] for f in F]
    return F


def vertex_normals(V, F):
    N = np.zeros_like(V)
    for f in F:
        f = list(f)
        for k in range(1, len(f) - 1):
            a, b, c = V[f[0]], V[f[k]], V[f[k + 1]]
            n = np.cross(b - a, c - a)
            for i in (f[0], f[k], f[k + 1]):
                N[i] += n
    return nrm(N)


# ------------------------------------------------------------------ hand anatomy (canonical right hand)

# name: (MCP x, MCP z, half width, lengths (prox, mid, dist), spread deg)
FINGERS = {
    'index':  (0.0215, -0.0835, 0.0076, (0.039, 0.023, 0.020)),
    'middle': (0.0072, -0.0870, 0.0078, (0.043, 0.026, 0.021)),
    'ring':   (-0.0074, -0.0850, 0.0073, (0.040, 0.024, 0.020)),
    'pinky':  (-0.0212, -0.0790, 0.0064, (0.031, 0.019, 0.018)),
}
NARROW = 0.85          # each phalanx ~15 % narrower than the previous one
DEPTH = 0.80           # depth / width of a finger section (wider than deep)


def palm_tube():
    """Palm loft from inside the sleeve (z = +0.03) to the knuckle line."""
    R = np.stack([np.array([1.0, 0, 0]), np.array([0, 1.0, 0]), np.array([0, 0, -1.0])], axis=1)
    #        s       a       bb      bf      eb   ef   xc       yc
    prof = [(-0.030, 0.0170, 0.0125, 0.0125, 2.2, 2.2, 0.0, 0.0),
            (0.000, 0.0172, 0.0118, 0.0122, 2.4, 2.3, 0.0, 0.0),
            (0.020, 0.0240, 0.0105, 0.0128, 2.8, 2.4, 0.0010, 0.0),
            (0.045, 0.0300, 0.0098, 0.0120, 3.2, 2.5, 0.0005, 0.0),
            (0.070, 0.0306, 0.0093, 0.0102, 3.4, 2.6, 0.0, 0.0),
            (0.092, 0.0304, 0.0090, 0.0092, 3.4, 2.6, 0.0, 0.0)]
    return Tube([0, 0, 0], R, -0.030, 0.092, prof, c0=0.004, c1=0.012)


def finger_tube(name, curls, spread, side_sign=1.0, claw=False):
    x, z, w, L = FINGERS[name]
    L1, L2, L3 = L
    w2, w3 = w * NARROW, w * NARROW ** 2
    d1, d2, d3 = w * DEPTH, w2 * DEPTH, w3 * DEPTH
    s_in = -0.013
    e = 2.9
    prof = [(s_in, w * 1.02, d1 * 1.05, d1 * 1.05, e, e, 0, 0),
            (0.000, w * 1.04, d1 * 1.10, d1 * 1.00, e, e, 0, 0),      # MCP knuckle
            (L1 * 0.5, w * 0.97, d1 * 0.98, d1 * 1.00, e, e, 0, 0),
            (L1 - 0.003, w2 * 1.04, d2 * 1.02, d2 * 1.02, e, e, 0, 0),
            (L1, w2 * 1.07, d2 * 1.10, d2 * 0.92, e, e, 0, 0),         # PIP
            (L1 + L2 * 0.5, w2 * 0.98, d2 * 0.98, d2 * 1.00, e, e, 0, 0),
            (L1 + L2, w3 * 1.05, d3 * 1.08, d3 * 0.92, e, e, 0, 0),    # DIP
            (L1 + L2 + L3 * 0.55, w3 * 0.98, d3 * 0.95, d3 * 1.05, e, e, 0, 0),
            (L1 + L2 + L3, w3 * 0.90, d3 * 0.85, d3 * 0.95, e, e, 0, 0)]
    c1, c2, c3 = curls
    joints = [(0.0, c1, 0.0050, d1 * 0.55),
              (L1, c2, 0.0035, d2 * 0.55),
              (L1 + L2, c3, 0.0030, d3 * 0.55)]
    # finger frame: base at the MCP joint, along -Z spread about the palm normal
    t = rot([0, 1.0, 0], -np.radians(spread * side_sign)) @ np.array([0, 0, -1.0])
    y = np.array([0, 1.0, 0])
    xax = np.cross(y, t)
    R = np.stack([xax, y, t], axis=1)
    origin = np.array([x, 0.0010, z])
    tb = Tube(origin, R, s_in, L1 + L2 + L3, prof, joints, c0=0.004,
              c1=w3 * (1.9 if claw else 0.95))
    tb.claw = claw
    tb.seg = (L1, L1 + L2)
    return tb


def thumb_tube(curls, abduct=0.0, roll=0.0, claw=False):
    """Thumb from the carpus (inside the palm) to the tip.  The metacarpal
    tube is fat on its palm side: that is the thenar pad."""
    c1, c2, c3 = curls
    base = np.array([0.0135, 0.0045, -0.010])
    t = nrm([0.50, 0.42, -0.76])
    t = rot([0, 0, 1.0], np.radians(abduct)) @ t
    yp = nrm(np.array([-0.85, 0.55, -0.15]))          # pad faces the fingers
    yp = nrm(yp - t * np.dot(yp, t))
    yp = rot(t, np.radians(roll)) @ yp
    xax = np.cross(yp, t)
    R = np.stack([xax, yp, t], axis=1)
    L0, L1, L2 = 0.040, 0.029, 0.025
    e = 2.6
    prof = [(-0.004, 0.0105, 0.0090, 0.0110, 2.2, 2.2, 0, 0.0005),
            (0.014, 0.0118, 0.0088, 0.0135, 2.4, 2.3, 0, 0.0025),      # thenar
            (0.030, 0.0102, 0.0080, 0.0098, e, e, 0, 0.0010),
            (L0, 0.0088, 0.0074, 0.0072, e, e, 0, 0),                  # MCP
            (L0 + L1 * 0.5, 0.0077, 0.0063, 0.0065, e, e, 0, 0),
            (L0 + L1, 0.0075, 0.0061, 0.0057, e, e, 0, 0),             # IP
            (L0 + L1 + L2 * 0.55, 0.0067, 0.0051, 0.0058, e, e, 0, 0),
            (L0 + L1 + L2, 0.0058, 0.0044, 0.0049, e, e, 0, 0)]
    joints = [(0.006, c1, 0.008, 0.004), (L0, c2, 0.004, 0.0040), (L0 + L1, c3, 0.0035, 0.0035)]
    tb = Tube(base, R, -0.004, L0 + L1 + L2, prof, joints, c0=0.008,
              c1=0.0062 * (1.7 if claw else 1.0))
    tb.claw = claw
    tb.seg = (L0, L0 + L1)
    return tb


class Hand:
    """A posed canonical hand: palm + 4 fingers + thumb, mapped to world by
    (M, wrist) with a smooth wrist bend towards the forearm direction."""

    def __init__(self, side, curls, spread, thumb, M, wrist, fore_dir, scale=1.0, claw=False):
        self.side = side
        self.scale = scale
        self.sx = 1.0 if side == 'R' else -1.0
        self.M = np.asarray(M, dtype=np.float64)
        self.wrist = np.asarray(wrist, dtype=np.float64)
        self.palm = palm_tube()
        self.fingers = {n: finger_tube(n, curls[n], spread[n], claw=claw) for n in FINGERS}
        self.thumb = thumb_tube(*thumb, claw=claw)
        # wrist bend: canonical +Z (towards the elbow) should become -fore_dir
        up_c = self.to_world_dir(np.array([0, 0, 1.0]))
        want = -nrm(fore_dir)
        ax = np.cross(up_c, want)
        self.wb_axis = nrm(ax) if np.linalg.norm(ax) > 1e-9 else np.array([1.0, 0, 0])
        self.wb_ang = float(np.arccos(np.clip(np.dot(up_c, want), -1, 1)))

    def to_world_dir(self, d):
        d = np.array(d, dtype=np.float64)
        d[..., 0] *= self.sx
        return d @ self.M.T

    def to_world(self, P):
        """Canonical points -> world (mirror for the left hand, wrist bend)."""
        P = np.array(P, dtype=np.float64).reshape(-1, 3)
        z = P[:, 2].copy()
        P = P * self.scale
        P[:, 0] *= self.sx
        W = P @ self.M.T
        # blend towards the forearm for the part above the wrist crease
        wgt = sstep((z - (-0.006)) / 0.022)
        if self.wb_ang > 1e-6:
            W = rodrigues(W, self.wb_axis, self.wb_ang * wgt)
        return W + self.wrist

    def parts(self):
        out = [('palm', self.palm)]
        out += [(n, f) for n, f in self.fingers.items()]
        out.append(('thumb', self.thumb))
        return out


def tube_world_mesh(hand, tube, nth, step, mat_fn):
    """Mesh one tube in world space.  mat_fn(s) -> material per face."""
    V, F, ring_s = tube.mesh(nth=nth, step=step)
    # tube.point gives canonical coordinates (tube local -> canonical)
    W = hand.to_world(V)
    if hand.sx < 0:
        F = [f[::-1] for f in F]
    fs = np.array([ring_s[list(f)].mean() for f in F])
    mats = [mat_fn(s) for s in fs]
    return W, F, mats


def merge_parts(parts):
    V, F, M, off = [], [], [], 0
    for v, f, m in parts:
        V.append(v)
        F += [[int(i) + off for i in face] for face in f]
        M += list(m)
        off += len(v)
    return np.concatenate(V), F, M


def hand_mesh(hand, mats):
    """mats: dict part -> callable(s) -> material name."""
    items = []
    for name, tube in hand.parts():
        nth = 20 if name == 'palm' else 14
        step = 0.004 if name == 'palm' else 0.0028
        items.append(tube_world_mesh(hand, tube, nth, step, mats[name]))
    V, F, M = merge_parts(items)
    N = vertex_normals(V, F)
    md = MeshData(V, F, mats=M, outline_w=0.55)
    md.normals = N
    return md


# ------------------------------------------------------------------ strips on tubes

def strip_on_tube(hand, tube, centre_fn, half_w, t_range, n_along, n_across=3,
                  off=0.0004, thick=0.0005):
    """Thin band lying on a tube: centre_fn(t) -> (theta, s) in the tube's
    rest parameters; the band spans +-half_w along s.  Returns world (V, F)."""
    t = np.linspace(t_range[0], t_range[1], n_along)
    th, s = centre_fn(t)
    q = np.linspace(-1, 1, n_across)
    TH = np.repeat(th[:, None], n_across, axis=1)
    hw = np.broadcast_to(np.asarray(half_w, dtype=np.float64), t.shape).copy()
    u = (t - t_range[0]) / (t_range[1] - t_range[0])
    hw *= 0.55 + 0.45 * sstep(np.minimum(u, 1 - u) / 0.06)       # tapered strip ends
    SS = s[:, None] + q[None, :] * hw[:, None]
    offs = off + np.zeros_like(TH)
    if np.ndim(off) == 0:
        offs = np.full_like(TH, off)
    outer = tube.rest(TH.ravel(), SS.ravel(), offs.ravel() + thick)
    inner = tube.rest(TH.ravel(), SS.ravel(), offs.ravel())
    Lo = tube.world(tube.deform(outer, SS.ravel()))
    Li = tube.world(tube.deform(inner, SS.ravel()))
    Wo, Wi = hand.to_world(Lo), hand.to_world(Li)
    n = n_along * n_across
    V = np.concatenate([Wo, Wi])
    F = []
    idx = lambda i, j: i * n_across + j
    for i in range(n_along - 1):
        for j in range(n_across - 1):
            a, b, c, d = idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)
            F.append([a, b, c, d])
            F.append([d + n, c + n, b + n, a + n])
    # rims
    for i in range(n_along - 1):
        for j in (0, n_across - 1):
            a, b = idx(i, j), idx(i + 1, j)
            F.append([a, a + n, b + n, b] if j == 0 else [b, b + n, a + n, a])
    for i in (0, n_along - 1):
        for j in range(n_across - 1):
            a, b = idx(i, j), idx(i, j + 1)
            F.append([b, b + n, a + n, a] if i == 0 else [a, a + n, b + n, b])
    return V, F


def finish_strips(items, mat, outline_w=0.4, outline=True):
    """Closed thin shells -> one MeshData with outward faces and smooth
    shading normals (the shells are thin, so rims take the surface normal)."""
    V, F = [], []
    off = 0
    for v, f in items:
        f = orient_outward(np.asarray(v), [list(x) for x in f])
        V.append(v)
        F += [[int(i) + off for i in face] for face in f]
        off += len(v)
    V = np.concatenate(V)
    md = MeshData(V, F, mat=mat, outline_w=outline_w, outline=outline)
    md.normals = vertex_normals(V, F)
    return md


def decal_on_back(hand, tube, poly_xs, off=0.00025, thick=0.00025, h=0.0028):
    """Flat graphic panel on the back of a tube: poly_xs is a 2D polygon in
    (x, s) rest coordinates (x across the back, s along the tube)."""
    Q, F = G.tri_region([np.asarray(poly_xs, dtype=np.float64)], h)
    th = tube.back_theta(Q[:, 0], Q[:, 1])
    P = tube.rest(th, Q[:, 1])
    N = tube.rest_normal(th, Q[:, 1])
    F = G.orient(P, N, F)
    V, Fs = G.shell(P, N, F, thick, off)
    ss = np.concatenate([Q[:, 1], Q[:, 1]])
    W = hand.to_world(tube.world(tube.deform(V, ss)))
    if hand.sx < 0:
        Fs = [f[::-1] for f in Fs]
    return W, Fs


# ------------------------------------------------------------------ world frames

def hand_frame(hand_dir, palm_dir):
    """Rotation canonical -> world from the hand direction (wrist ->
    knuckles) and the palm normal (for the right hand; the left hand mirrors
    x in canonical space first)."""
    z = -nrm(hand_dir)
    y = nrm(np.asarray(palm_dir, dtype=np.float64))
    y = nrm(y - z * np.dot(y, z))
    x = np.cross(y, z)
    return np.stack([x, y, z], axis=1)


def hand_frame_L(hand_dir, palm_dir):
    """Same for a left hand: canonical x is mirrored, so the frame's x is
    built for the mirrored geometry (keeps M a proper rotation)."""
    z = -nrm(hand_dir)
    y = nrm(np.asarray(palm_dir, dtype=np.float64))
    y = nrm(y - z * np.dot(y, z))
    return hand_frame(hand_dir, palm_dir)


# ------------------------------------------------------------------ the two hands

def scabbard_frame():
    """Centre, axis (towards the hand), width and depth axes of the big
    scabbard where the right hand holds it."""
    try:
        import swords as S
        _, info = S.upper_sword()
        sw = S.scabbard_sword(info)
        d = 236.0
        L = sw.to_local(np.array([[d, 0.0, 0.0]]))
        C, T, V, W = sw.path.frame_at(L[:, 0])
        Cn = sw.path.map(L)[0]
        return Cn, T[0], V[0], W[0], sw
    except Exception:      # fall back to the values measured on the current sword
        return (np.array([-0.1802, 0.0127, 0.8241]), nrm([0.727, 0.314, 0.611]),
                nrm([-0.643, 0.0, 0.766]), nrm([0.24, -0.95, 0.202]), None)


RPOSE = dict(fwd=1.1, side=0.3, roll=15.0, palm=None, scale=0.92,
             curls={'index': (44, 56, 34), 'middle': (44, 56, 34), 'ring': (44, 54, 32),
                    'pinky': (44, 50, 30)},
             spread={'index': 2, 'middle': 0, 'ring': -2, 'pinky': -5},
             thumb=((10, 25, 25), -20.0, 0.0))


def right_hand(p=None):
    """Right hand in front of the scabbard: back of the hand towards the
    camera, palm towards the scabbard, fingers hooked over its outer edge
    with the bare fingertips resting on the front face."""
    p = dict(RPOSE, **(p or {}))
    C, T, V, W, sw = scabbard_frame()
    fore = nrm(J['wrist_R'] - J['elbow_R'])
    wrist = J['wrist_R'] + fore * 0.004
    hand_dir = nrm(fore + p['fwd'] * W + p['side'] * np.array([-1.0, 0, 0]))
    palm_dir = nrm(p['palm']) if p.get('palm') is not None else -W
    palm_dir = rot(hand_dir, np.radians(p['roll'])) @ palm_dir
    M = hand_frame(hand_dir, palm_dir)
    return Hand('R', p['curls'], p['spread'], p['thumb'], M, wrist, fore, scale=p['scale'])


LPOSE = dict(palm=(-0.45, 0.89, 0.0), tilt=(0.0, 0.0, 0.0), scale=0.92,
             curls={'index': (20, 55, 50), 'middle': (18, 52, 50), 'ring': (14, 46, 46),
                    'pinky': (10, 40, 40)},
             spread={'index': 8, 'middle': 0, 'ring': -8, 'pinky': -18},
             thumb=((0, 15, 20), 40.0, 0.0))


def left_hand(p=None):
    """Relaxed left hand hanging below the wrist ring, fingers slightly
    spread and curled like claws."""
    p = dict(LPOSE, **(p or {}))
    fore = nrm(J['wrist_L'] - J['elbow_L'])
    wrist = J['wrist_L'] + fore * 0.004
    hand_dir = nrm(fore + np.asarray(p['tilt']))
    M = hand_frame(hand_dir, nrm(p['palm']))
    return Hand('L', p['curls'], p['spread'], p['thumb'], M, wrist, fore, scale=p['scale'],
                claw=True)


# ------------------------------------------------------------------ materials / details

def wrap_turn(tube, th0, s_a, s_b, turns=1.0, off0=0.00035, rise=0.0005):
    """Centre line of one helical bandage turn around a tube."""
    def fn(t):
        th = th0 + t * 2 * np.pi * turns
        return th, s_a + (s_b - s_a) * t
    def offs(n):
        return (off0 + rise * np.linspace(0, 1, n))[:, None]
    return fn, offs


def bandage(hand, tube, th0, s_a, s_b, half_w, turns=1.0, n=48, off0=0.00035):
    fn, offs = wrap_turn(tube, th0, s_a, s_b, turns, off0, rise=0.0005 * turns)
    n = max(12, int(n * turns))
    return strip_on_tube(hand, tube, fn, half_w, (0.0, 1.0), n, 3, off=offs(n), thick=0.00045)


def build_right():
    """White fingerless glove (palm and proximal phalanges) under bandage
    wraps; bare skin fingertips."""
    hand = right_hand()
    GLOVE = 0.80                    # glove / wraps cover this fraction of the proximal phalanx

    def finger_mat(tube):
        L1 = tube.seg[0]
        return lambda s: 'white' if s < GLOVE * L1 + 0.0015 else 'skin'

    mats = {'palm': lambda s: 'white',
            'thumb': lambda s: 'white' if s < hand.thumb.seg[0] + 0.004 else 'skin'}
    for n, f in hand.fingers.items():
        mats[n] = finger_mat(f)
    out = {'HandR': hand_mesh(hand, mats)}
    P = hand.palm
    PALM = np.pi / 2                # wrap ends are tucked on the palm side
    wraps = [bandage(hand, P, PALM, -0.010, 0.016, 0.0090),
             bandage(hand, P, PALM + 0.5, 0.040, 0.014, 0.0085, off0=0.0009),
             bandage(hand, P, PALM - 0.3, 0.030, 0.056, 0.0090),
             bandage(hand, P, PALM + 0.2, 0.078, 0.058, 0.0090, off0=0.0009)]
    for n, f in hand.fingers.items():
        L1 = f.seg[0]
        wraps.append(bandage(hand, f, PALM, 0.000, GLOVE * L1 - 0.004, 0.0050, turns=2.0, n=36,
                             off0=0.0003))
    t = hand.thumb
    wraps.append(bandage(hand, t, PALM, 0.006, t.seg[0] - 0.004, 0.0075, turns=1.5, n=40))
    out['HandWrapsR'] = finish_strips(wraps, 'white', outline_w=0.35)
    return out


# graphic panels on the back of the left glove, (u, v): u = 0 thumb side ..
# 1 little-finger side, v = 0 wrist .. 1 knuckles
LEFT_PANELS = [
    [(0.30, -0.12), (0.84, -0.12), (0.60, 0.34)],
    [(0.18, 0.28), (0.42, 0.28), (0.68, 0.80), (0.44, 0.82)],
    [(0.70, 0.44), (0.95, 0.36), (0.95, 0.98), (0.80, 0.98)],
]


def build_left():
    hand = left_hand()

    def finger_mat(tube):
        L1 = tube.seg[0]
        return lambda s: 'white' if s < 0.72 * L1 else 'hands_red'

    mats = {'palm': lambda s: 'white'}
    for n, f in hand.fingers.items():
        mats[n] = finger_mat(f)
    mats['thumb'] = lambda s: 'white' if s < hand.thumb.seg[0] - 0.006 else 'hands_red'
    out = {'HandL': hand_mesh(hand, mats)}
    P = hand.palm
    panels = []
    for poly in LEFT_PANELS:
        xs = []
        for u, v in poly:
            sv = 0.004 + v * 0.078
            a = P.section(np.array([sv]))[0][0]
            xs.append((a * 0.97 * (1 - 2 * u), sv))
        panels.append(decal_on_back(hand, P, np.array(xs)))
    out['HandStripesL'] = finish_strips(panels, 'hands_red', outline=False)
    return out


def hands():
    out = {}
    out.update(build_right())
    out.update(build_left())
    return out

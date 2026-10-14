"""Slender anime hands as explicit lofted polygon meshes.

Every digit and the palm is a *tube*: rounded-square cross sections
(superellipses, wider than deep, a flatter back) lofted along a straight
rest axis and then posed by hinge rotations at the joints (the rotation
angle is blended over a few millimetres around each joint, about a hinge
that sits on the palm side, so knuckles round off on the back and crease on
the palm side).

Shading normals do NOT come from the modelled surface: every digit is also
evaluated as a "normal tube" (same parameters, no knuckle bumps / creases and
wider joint blends) and the custom normals are taken from that smooth twin,
so the toon terminator stays clean over the joints.  Bandage strips and the
printed panels take the normals of the surface they lie on.

Canonical (rest) hand frame of a RIGHT hand: wrist centre at the origin,
fingers along -Z, palm facing +Y, thumb on the +X side.  Left hands are the
mirror image (x -> -x).  ``hand_frame`` maps canonical to world.

Both hands hang palm-to-thigh and are seen from the thumb side in 3/4 (as in
the reference and the official art), so they read narrow from the front.

Objects (all names start with Hand and end with the side letter):
  HandR        palm + digits, white glove / skin (multi-material)
  HandWrapsR   bandage wraps of the right hand (figure-8 X over the back)
  HandL        palm + digits, white glove with red thumb and red claws
  HandStripesL red panels printed on the back of the left glove
  HandRivetsL  two small metal rivets near the left knuckles
"""

import numpy as np

import clothing_geo as G
import hardsurf as hs
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
    The tube runs from s0 to s1 with caps of length c0 / c1; ``tip`` is the
    cap shape at s1: 'round', 'soft' (slightly pointed) or 'claw' (cone)."""

    def __init__(self, origin, R, s0, s1, prof, joints=(), c0=0.006, c1=0.006, tip='round'):
        self.o = np.asarray(origin, dtype=np.float64)
        self.R = np.asarray(R, dtype=np.float64)
        self.s0, self.s1 = s0, s1
        self.prof = prof
        self.joints = list(joints)
        self.c0, self.c1 = c0, c1
        self.tip = tip
        self.twin = None          # smooth twin used for the shading normals

    # rest surface in local coordinates
    def section(self, s):
        p = interp_rows(self.prof, s)
        return [p[..., i] for i in range(7)]

    def cap_scale(self, s):
        f = np.ones_like(s)
        if self.c1 > 0:
            t = np.clip((s - (self.s1 - self.c1)) / self.c1, 0, 1)
            if self.tip == 'claw':
                f = f * np.maximum(1 - t, 0) ** 0.85 * (1 + 0.35 * t * (1 - t))
            elif self.tip == 'soft':
                f = f * np.maximum(1 - t ** 1.7, 0) ** 0.6
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

    def centre(self, s):
        """Posed section centre (for orienting normals)."""
        s = np.asarray(s, dtype=np.float64).ravel()
        a, bb, bf, eb, ef, xc, yc = self.section(s)
        return self.world(self.deform(np.stack([xc, yc, s], axis=1), s))

    def mesh(self, nth=12, step=0.003, tip_rings=5):
        """Quad mesh of the posed tube with apex vertices at both caps.
        Returns (verts, faces, ring_s, twin_verts)."""
        s0, s1, c0, c1 = self.s0, self.s1, self.c0, self.c1
        mid = np.linspace(s0 + c0, s1 - c1, max(2, int(np.ceil((s1 - c1 - s0 - c0) / step)) + 1))
        # extra rings around the joints
        for sj, ang, w, hy in self.joints:
            if s0 + c0 < sj < s1 - c1 and abs(ang) > 1e-6:
                mid = np.concatenate([mid, sj + np.linspace(-w, w, 3)])
        mid = np.unique(np.round(mid, 7))
        # drop rings closer than 0.6 mm
        keep = np.concatenate([[True], np.diff(mid) > 0.0006])
        mid = mid[keep]
        k = np.linspace(0, np.pi / 2, tip_rings + 1)[1:-1]
        cap0 = np.sort(s0 + c0 * (1 - np.sin(k))[::-1])
        cap1 = np.sort(s1 - c1 * (1 - np.sin(k)))
        ss = np.unique(np.concatenate([cap0[cap0 < mid[0] - 1e-5], mid, cap1[cap1 > mid[-1] + 1e-5]]))
        th = np.linspace(0, 2 * np.pi, nth, endpoint=False) + np.pi / nth
        TH, SS = np.meshgrid(th, ss)
        F = []
        for i in range(len(ss) - 1):
            for j in range(nth):
                j2 = (j + 1) % nth
                F.append([i * nth + j, i * nth + j2, (i + 1) * nth + j2, (i + 1) * nth + j])
        ia, ib = len(ss) * nth, len(ss) * nth + 1
        for j in range(nth):
            j2 = (j + 1) % nth
            F.append([ia, j2, j])
            n0 = (len(ss) - 1) * nth
            F.append([ib, n0 + j, n0 + j2])

        def verts_of(tb):
            V = tb.point(TH, SS).reshape(-1, 3)
            A = tb.point(np.zeros(1), np.array([s0]))[0]
            B = tb.point(np.zeros(1), np.array([s1]))[0]
            return np.concatenate([V, A[None], B[None]])

        verts = verts_of(self)
        F = orient_outward(verts, F)
        twin = verts_of(self.twin) if self.twin is not None else verts
        ring_s = np.concatenate([SS.ravel(), [s0, s1]])
        return verts, F, ring_s, twin


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

# name: (MCP x, MCP z, half width, lengths (prox, mid, dist))
FINGERS = {
    'index':  (0.0190, -0.0835, 0.0067, (0.039, 0.023, 0.020)),
    'middle': (0.0064, -0.0870, 0.0069, (0.043, 0.026, 0.021)),
    'ring':   (-0.0066, -0.0850, 0.0064, (0.040, 0.024, 0.020)),
    'pinky':  (-0.0188, -0.0790, 0.0056, (0.031, 0.019, 0.018)),
}
NARROW = 0.85          # each phalanx ~15 % narrower than the previous one
DEPTH = 0.80           # depth / width of a finger section (wider than deep)


def palm_tube():
    """Palm loft from inside the sleeve (z = +0.03) to the knuckle line.  The
    thumb side (+x) swells into the thenar pad between s = 0.01 and 0.06
    (width added on +x only: a and xc grow together), fuller on the palm
    side, so the thumb grows out of the palm instead of the wrist."""
    R = np.stack([np.array([1.0, 0, 0]), np.array([0, 1.0, 0]), np.array([0, 0, -1.0])], axis=1)
    #        s       a       bb      bf      eb   ef   xc       yc
    prof = [(-0.030, 0.0165, 0.0122, 0.0122, 2.2, 2.2, 0.0, 0.0),
            (0.000, 0.0168, 0.0115, 0.0120, 2.4, 2.3, 0.0, 0.0),
            (0.018, 0.0228, 0.0102, 0.0136, 2.8, 2.3, 0.0030, 0.0008),
            (0.036, 0.0272, 0.0096, 0.0140, 3.1, 2.4, 0.0034, 0.0010),
            (0.054, 0.0278, 0.0092, 0.0118, 3.3, 2.5, 0.0018, 0.0),
            (0.072, 0.0274, 0.0089, 0.0098, 3.4, 2.6, 0.0, 0.0),
            (0.092, 0.0272, 0.0087, 0.0090, 3.4, 2.6, 0.0, 0.0)]
    return Tube([0, 0, 0], R, -0.030, 0.092, prof, c0=0.004, c1=0.012)


def finger_tube(name, curls, spread, claw=False, bump=1.0, blend=1.0, length=1.0):
    """bump = 1 for the modelled surface (knuckles / creases), 0 for the
    smooth twin used for the shading normals (with blend > 1)."""
    x, z, w, L = FINGERS[name]
    L1, L2, L3 = L
    if claw:
        L3 = L3 * 1.25
    L1, L2, L3 = L1 * length, L2 * length, L3 * length
    w2, w3 = w * NARROW, w * NARROW ** 2
    d1, d2, d3 = w * DEPTH, w2 * DEPTH, w3 * DEPTH
    m = lambda k: 1.0 + bump * (k - 1.0)
    s_in = -0.013
    e = 2.9
    prof = [(s_in, w * 1.02, d1 * 1.05, d1 * 1.05, e, e, 0, 0),
            (0.000, w * m(1.04), d1 * m(1.10), d1 * 1.00, e, e, 0, 0),      # MCP knuckle
            (L1 * 0.5, w * 0.95, d1 * 0.97, d1 * 1.00, e, e, 0, 0),
            (L1 - 0.003, w2 * 1.02, d2 * 1.02, d2 * 1.02, e, e, 0, 0),
            (L1, w2 * m(1.05), d2 * m(1.08), d2 * m(0.94), e, e, 0, 0),    # PIP
            (L1 + L2 * 0.5, w2 * 0.96, d2 * 0.97, d2 * 1.00, e, e, 0, 0),
            (L1 + L2, w3 * m(1.04), d3 * m(1.06), d3 * m(0.94), e, e, 0, 0)]  # DIP
    if claw:
        # long tapered claw: the last 40 % of the distal segment narrows to a point
        prof += [(L1 + L2 + L3 * 0.35, w3 * 0.94, d3 * 0.90, d3 * 0.95, e, e, 0, 0),
                 (L1 + L2 + L3 * 0.62, w3 * 0.74, d3 * 0.74, d3 * 0.78, e, 2.6, 0, 0),
                 (L1 + L2 + L3 * 0.84, w3 * 0.46, d3 * 0.52, d3 * 0.52, 2.6, 2.4, 0, 0),
                 (L1 + L2 + L3, w3 * 0.25, d3 * 0.30, d3 * 0.30, 2.4, 2.2, 0, 0)]
        c1 = w3 * 0.45
        tip = 'claw'
    else:
        prof += [(L1 + L2 + L3 * 0.55, w3 * 0.93, d3 * 0.93, d3 * 1.02, e, e, 0, 0),
                 (L1 + L2 + L3, w3 * 0.84, d3 * 0.82, d3 * 0.92, e, e, 0, 0)]
        c1 = w3 * 1.05
        tip = 'soft'
    c1_, c2, c3 = curls
    joints = [(0.0, c1_, 0.0050 * blend, d1 * 0.55),
              (L1, c2, 0.0035 * blend, d2 * 0.55),
              (L1 + L2, c3, 0.0030 * blend, d3 * 0.55)]
    # finger frame: base at the MCP joint, along -Z spread about the palm normal
    t = rot([0, 1.0, 0], -np.radians(spread)) @ np.array([0, 0, -1.0])
    y = np.array([0, 1.0, 0])
    xax = np.cross(y, t)
    R = np.stack([xax, y, t], axis=1)
    origin = np.array([x, 0.0010, z])
    tb = Tube(origin, R, s_in, L1 + L2 + L3, prof, joints, c0=0.004, c1=c1, tip=tip)
    tb.seg = (L1, L1 + L2)
    return tb


def thumb_tube(curls, opp=45.0, abduct=0.0, claw=False, bump=1.0, blend=1.0, tlen=1.0, dz=0.0):
    """Thumb from inside the thenar pad to the tip.  The metacarpal is buried
    in the palm's thenar swell, so the free thumb starts ~40 % down the palm.
    ``opp`` turns the thumb towards the palm side (opposition)."""
    c1, c2, c3 = curls
    base = np.array([0.0150, 0.0050, -0.016 - dz])
    t = nrm([0.40, 0.10, -0.91])
    yp = nrm([-0.88, 0.47, -0.05])                   # pad faces the fingers
    Ro = rot([0, 0, 1.0], np.radians(opp)) @ rot([0, 1.0, 0], np.radians(abduct))
    t, yp = Ro @ t, Ro @ yp
    yp = nrm(yp - t * np.dot(yp, t))
    xax = np.cross(yp, t)
    R = np.stack([xax, yp, t], axis=1)
    L0, L1, L2 = 0.034, 0.026 * tlen, 0.022 * tlen
    if claw:
        L2 *= 1.15
    m = lambda k: 1.0 + bump * (k - 1.0)
    e = 2.6
    prof = [(-0.004, 0.0098, 0.0085, 0.0100, 2.2, 2.2, 0, 0.0005),
            (0.016, 0.0102, 0.0080, 0.0110, 2.4, 2.3, 0, 0.0015),
            (L0 - 0.004, 0.0085, 0.0070, 0.0074, e, e, 0, 0.0004),
            (L0, 0.0080 * m(1.04), 0.0066 * m(1.06), 0.0064, e, e, 0, 0),     # MCP
            (L0 + L1 * 0.5, 0.0070, 0.0057, 0.0060, e, e, 0, 0),
            (L0 + L1, 0.0068 * m(1.04), 0.0055 * m(1.05), 0.0052, e, e, 0, 0),  # IP
            (L0 + L1 + L2 * 0.55, 0.0061, 0.0047, 0.0053, e, e, 0, 0)]
    if claw:
        prof += [(L0 + L1 + L2 * 0.80, 0.0046, 0.0038, 0.0040, e, 2.4, 0, 0),
                 (L0 + L1 + L2, 0.0020, 0.0018, 0.0018, 2.4, 2.2, 0, 0)]
        c1t, tip = 0.0030, 'claw'
    else:
        prof += [(L0 + L1 + L2, 0.0054, 0.0042, 0.0046, e, e, 0, 0)]
        c1t, tip = 0.0060, 'soft'
    joints = [(0.010, c1, 0.008 * blend, 0.004), (L0, c2, 0.004 * blend, 0.0040),
              (L0 + L1, c3, 0.0035 * blend, 0.0035)]
    tb = Tube(base, R, -0.004, L0 + L1 + L2, prof, joints, c0=0.008, c1=c1t, tip=tip)
    tb.seg = (L0, L0 + L1)
    return tb


class Hand:
    """A posed canonical hand: palm + 4 fingers + thumb, mapped to world by
    (M, wrist) with a smooth wrist bend towards the forearm direction."""

    def __init__(self, side, curls, spread, thumb, M, wrist, fore_dir, scale=1.0, claw=False,
                 length=1.0, thumb_len=1.0, thumb_dz=0.0):
        self.side = side
        self.scale = scale
        self.sx = 1.0 if side == 'R' else -1.0
        self.M = np.asarray(M, dtype=np.float64)
        self.wrist = np.asarray(wrist, dtype=np.float64)
        self.palm = palm_tube()
        self.fingers = {}
        for n in FINGERS:
            f = finger_tube(n, curls[n], spread[n], claw=claw, length=length)
            f.twin = finger_tube(n, curls[n], spread[n], claw=claw, length=length,
                                 bump=0.0, blend=2.2)
            self.fingers[n] = f
        self.thumb = thumb_tube(*thumb[:3], claw=claw, tlen=thumb_len, dz=thumb_dz)
        self.thumb.twin = thumb_tube(*thumb[:3], claw=claw, bump=0.0, blend=2.0, tlen=thumb_len, dz=thumb_dz)
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

    def surface(self, tube, th, s, off=0.0):
        """World points on a tube (rest parameters th, s, normal offset)."""
        th, s = np.broadcast_arrays(np.asarray(th, dtype=np.float64),
                                    np.asarray(s, dtype=np.float64))
        return self.to_world(tube.point(th.ravel(), s.ravel(), off))

    def surface_normal(self, tube, th, s, eps=0.02, ds=0.0008):
        """Outward world normal of the posed (smooth twin) tube surface."""
        tb = tube.twin if tube.twin is not None else tube
        th = np.asarray(th, dtype=np.float64).ravel()
        s = np.asarray(s, dtype=np.float64).ravel()
        Pa, Pb = self.surface(tb, th + eps, s), self.surface(tb, th - eps, s)
        Pc, Pd = self.surface(tb, th, s + ds), self.surface(tb, th, s - ds)
        N = nrm(np.cross(Pa - Pb, Pc - Pd))
        P = self.surface(tb, th, s)
        C = self.to_world(tb.centre(s))
        flip = np.einsum('ij,ij->i', N, P - C) < 0
        N[flip] *= -1
        return N


def tube_world_mesh(hand, tube, nth, step, mat_fn):
    """Mesh one tube in world space.  mat_fn(s) -> material per face.
    Returns (V, F, mats, shading normals from the smooth twin)."""
    V, F, ring_s, VT = tube.mesh(nth=nth, step=step)
    W = hand.to_world(V)
    WT = hand.to_world(VT)
    if hand.sx < 0:
        F = [f[::-1] for f in F]
    fs = np.array([ring_s[list(f)].mean() for f in F])
    mats = [mat_fn(s) for s in fs]
    N = vertex_normals(WT, F)
    return W, F, mats, N


def hand_mesh(hand, mats, outline_w=0.55):
    """mats: dict part -> callable(s) -> material name."""
    V, F, M, N, off = [], [], [], [], 0
    for name, tube in hand.parts():
        nth = 16 if name == 'palm' else 12
        step = 0.005 if name == 'palm' else 0.004
        v, f, m, n = tube_world_mesh(hand, tube, nth, step, mats[name])
        V.append(v)
        N.append(n)
        F += [[int(i) + off for i in face] for face in f]
        M += list(m)
        off += len(v)
    md = MeshData(np.concatenate(V), F, mats=M, outline_w=outline_w)
    md.normals = np.concatenate(N)
    return md


# ------------------------------------------------------------------ strips on tubes

def strip_on_tube(hand, tube, centre_fn, half_w, n_along, off, thick=0.0005, taper=0.06):
    """Thin band lying on a tube: centre_fn(t) -> (theta, s) in the tube's
    rest parameters (t in 0..1); the band spans +-half_w along s.  ``off``
    is the per-sample lift above the surface.  Shading normals are the
    normals of the surface underneath.  Returns world (V, F, N)."""
    n_across = 3
    t = np.linspace(0.0, 1.0, n_along)
    th, s = centre_fn(t)
    q = np.linspace(-1, 1, n_across)
    TH = np.repeat(th[:, None], n_across, axis=1)
    hw = np.broadcast_to(np.asarray(half_w, dtype=np.float64), t.shape).copy()
    if taper > 0:
        hw *= 0.55 + 0.45 * sstep(np.minimum(t, 1 - t) / taper)       # tapered strip ends
    SS = s[:, None] + q[None, :] * hw[:, None]
    offs = np.broadcast_to(np.asarray(off, dtype=np.float64).reshape(-1, 1), TH.shape)
    Wo = hand.surface(tube, TH.ravel(), SS.ravel(), offs.ravel() + thick)
    Wi = hand.surface(tube, TH.ravel(), SS.ravel(), offs.ravel())
    Nn = hand.surface_normal(tube, TH.ravel(), SS.ravel())
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
    return V, F, np.concatenate([Nn, Nn])


def finish_shells(items, mat, outline_w=0.4, outline=True):
    """Closed thin shells (V, F, N) -> one MeshData with outward faces; the
    shading normals are the ones given (those of the surface underneath)."""
    V, F, N = [], [], []
    off = 0
    for v, f, nn in items:
        f = orient_outward(np.asarray(v), [list(x) for x in f])
        V.append(v)
        N.append(nn)
        F += [[int(i) + off for i in face] for face in f]
        off += len(v)
    md = MeshData(np.concatenate(V), F, mat=mat, outline_w=outline_w, outline=outline)
    md.normals = np.concatenate(N)
    return md


def decal_on_back(hand, tube, poly_xs, off=0.0004, thick=0.00025, h=0.0024):
    """Flat graphic panel on the back of a tube: poly_xs is a 2D polygon in
    (x, s) rest coordinates (x across the back, s along the tube).  Returns
    (V, F, N) with the normals of the glove surface underneath."""
    Q, F = G.tri_region([np.asarray(poly_xs, dtype=np.float64)], h)
    th = tube.back_theta(Q[:, 0], Q[:, 1])
    P = tube.rest(th, Q[:, 1])
    Nr = tube.rest_normal(th, Q[:, 1])
    F = G.orient(P, Nr, F)
    E = G.boundary_edges(np.asarray(F))
    n = len(Q)
    Fs = [list(f) for f in F] + [list(f) for f in (np.asarray(F)[:, ::-1] + n)] + \
         [[a, b, b + n, a + n][::-1] for a, b in E]
    Wo = hand.surface(tube, th, Q[:, 1], off + thick)
    Wi = hand.surface(tube, th, Q[:, 1], off)
    Nw = hand.surface_normal(tube, th, Q[:, 1])
    if hand.sx < 0:
        Fs = [f[::-1] for f in Fs]
    return np.concatenate([Wo, Wi]), Fs, np.concatenate([Nw, Nw])


# ------------------------------------------------------------------ world frames

def hand_frame(hand_dir, palm_dir):
    """Rotation canonical -> world from the hand direction (wrist ->
    knuckles) and the palm normal.  For a left hand canonical x is mirrored
    first, so the same frame puts its thumb on the other side."""
    z = -nrm(hand_dir)
    y = nrm(np.asarray(palm_dir, dtype=np.float64))
    y = nrm(y - z * np.dot(y, z))
    x = np.cross(y, z)
    return np.stack([x, y, z], axis=1)


# ------------------------------------------------------------------ the two hands

def scabbard_frame():
    """Centre, axis (towards the hand), across and thickness axes of the big
    scabbard where it passes the right hand, plus the Sword (or None)."""
    try:
        import swords as S
        sw = S.scabbard_sword()
        d = getattr(S, 'SCAB_D_HAND', 240.0)
        L = sw.to_local(np.array([[d, 0.0, 0.0]]))
        C, T, V, W = sw.path.frame_at(L[:, 0])
        Cn = sw.path.map(L)[0]
        return Cn, T[0], V[0], W[0], sw
    except Exception:      # fall back to the values measured on the current sword
        return (np.array([-0.1802, 0.0127, 0.8241]), nrm([0.727, 0.314, 0.611]),
                nrm([-0.643, 0.0, 0.766]), nrm([0.24, -0.95, 0.202]), None)


# Right hand: hangs from the wrist, palm turned to the thigh, thumb / index
# edge towards the camera, fingers loosely curled (a relaxed fist whose
# knuckle line runs along the scabbard's direction in the front view).
RPOSE = dict(palm=(0.65, 0.76, 0.0), tilt=(-0.50, 0.0, 0.0), wrist_off=-0.010, scale=0.86,
             glove=0.25,
             curls={'index': (24, 16, 10), 'middle': (28, 18, 10), 'ring': (32, 20, 12),
                    'pinky': (36, 22, 12)},
             spread={'index': 5, 'middle': 1, 'ring': -4, 'pinky': -9},
             thumb=((12, 28, 30), 40.0, 0.0))


def right_hand(p=None):
    p = dict(RPOSE, **(p or {}))
    fore = nrm(J['wrist_R'] - J['elbow_R'])
    wrist = J['wrist_R'] + fore * p['wrist_off']
    hand_dir = nrm(fore + np.asarray(p['tilt'], dtype=np.float64))
    M = hand_frame(hand_dir, nrm(p['palm']))
    return Hand('R', p['curls'], p['spread'], p['thumb'], M, wrist, fore, scale=p['scale'],
                length=p.get('length', 1.0), thumb_len=p.get('thumb_len', 1.0),
                thumb_dz=p.get('thumb_dz', 0.0))


# Left hand: relaxed, palm to the thigh and a little back, so the back of the
# hand shows in 3/4 with the red thumb on the body side; the red claws hook
# down and inwards in an uneven fan.
LPOSE = dict(palm=(-0.88, 0.40, 0.0), tilt=(0.05, 0.0, 0.0), wrist_off=0.014, scale=0.95,
             curls={'index': (20, 35, 38), 'middle': (12, 30, 42), 'ring': (8, 26, 40),
                    'pinky': (6, 22, 36)},
             spread={'index': 16, 'middle': 4, 'ring': -6, 'pinky': -14},
             thumb=((10, 15, 15), 5.0, -10.0), thumb_len=1.2, thumb_dz=0.016)


def left_hand(p=None):
    p = dict(LPOSE, **(p or {}))
    fore = nrm(J['wrist_L'] - J['elbow_L'])
    wrist = J['wrist_L'] + fore * p['wrist_off']
    hand_dir = nrm(fore + np.asarray(p['tilt'], dtype=np.float64))
    M = hand_frame(hand_dir, nrm(p['palm']))
    return Hand('L', p['curls'], p['spread'], p['thumb'], M, wrist, fore, scale=p['scale'],
                claw=True, length=p.get('length', 1.0), thumb_len=p.get('thumb_len', 1.0),
                thumb_dz=p.get('thumb_dz', 0.0))


# ------------------------------------------------------------------ clearance

_BODY = None


def body_clearance(P):
    """Signed distance of world points to the thighs / hips / torso (the arms
    are left out: the hand's wrist end sits inside the forearm on purpose)."""
    global _BODY
    if _BODY is None:
        import body as B
        _BODY = [B.leg('R'), B.leg('L'), B.torso()] + list(B.glutes())
    P = np.asarray(P, dtype=np.float64)
    return np.min([f(P) for f in _BODY], axis=0)


def push_clear(hand, objs, min_gap=0.002):
    """Move the hand objects out of the body (along the mean SDF gradient at
    the offending vertices) until the gap is >= min_gap; returns the shift."""
    V = np.concatenate([m.verts for m in objs])
    # only the part below the wrist counts (above it the hand is inside the sleeve)
    V = V[V[:, 2] < hand.wrist[2] - 0.012]
    d = body_clearance(V)
    worst = d.min()
    if worst >= min_gap:
        return 0.0, worst
    bad = V[d < min_gap]
    e = 1e-4
    g = np.stack([(body_clearance(bad + e * np.eye(3)[k]) - body_clearance(bad - e * np.eye(3)[k]))
                  / (2 * e) for k in range(3)], axis=1)
    gdir = nrm(g.mean(axis=0))
    shift = 0.0
    for _ in range(40):
        shift += 0.0005
        if body_clearance(V + gdir * shift).min() >= min_gap:
            break
    for m in objs:
        m.verts = m.verts + gdir * shift
    return shift, worst


# ------------------------------------------------------------------ right hand

def _path_fn(keys):
    """Piecewise-linear (theta, s) path through key points, smoothed."""
    K = np.array(keys, dtype=np.float64)
    seg = np.r_[0, np.cumsum(np.hypot(np.diff(K[:, 0]) * 0.02, np.diff(K[:, 1])))]
    u = seg / seg[-1]

    def fn(t):
        from scipy.interpolate import PchipInterpolator
        return (PchipInterpolator(u, K[:, 0])(t), PchipInterpolator(u, K[:, 1])(t))
    return fn


def build_right():
    """White fingerless glove (palm and proximal phalanges) under a
    figure-8 bandage that crosses in an X over the back of the hand; bare
    skin fingertips."""
    hand = right_hand()
    GLOVE = float(RPOSE.get("glove", 0.72))                   # glove covers this fraction of the proximal phalanx

    def finger_mat(tube):
        L1 = tube.seg[0]
        return lambda s: 'white' if s < GLOVE * L1 else 'skin'

    mats = {'palm': lambda s: 'white',
            'thumb': lambda s: 'white' if s < hand.thumb.seg[0] + 0.003 else 'skin'}
    for n, f in hand.fingers.items():
        mats[n] = finger_mat(f)
    body = hand_mesh(hand, mats)
    P = hand.palm
    pi = np.pi
    wraps = []
    # wrist turn (under the X), ends tucked on the palm side
    fn = _path_fn([(pi / 2, -0.010), (pi / 2 + 2.4 * pi, 0.002)])
    wraps.append(strip_on_tube(hand, P, fn, 0.0055, 60, 0.0003 + 0.0004 * np.linspace(0, 1, 60)))
    # figure 8: pinky side of the wrist -> across the back -> index knuckle,
    # round the knuckles on the palm side, back across to the thumb side of
    # the wrist: an X on the back of the hand
    fn = _path_fn([(pi + 0.05, 0.004), (1.5 * pi, 0.036), (2 * pi - 0.05, 0.070),
                   (2.5 * pi, 0.079), (3 * pi + 0.05, 0.074),
                   (3.5 * pi, 0.040), (4 * pi - 0.05, 0.008), (4.45 * pi, 0.004)])
    n = 90
    lift = 0.0008 + 0.0007 * sstep((np.linspace(0, 1, n) - 0.55) / 0.15)
    wraps.append(strip_on_tube(hand, P, fn, 0.0068, n, lift, taper=0.03))
    # one band round the knuckles on top of everything
    fn = _path_fn([(pi * 0.6, 0.083), (pi * 2.7, 0.084)])
    wraps.append(strip_on_tube(hand, P, fn, 0.0046, 56, 0.0019))
    # one bandage turn on each finger base, covering the glove's edge
    for nm, f in hand.fingers.items():
        L1 = f.seg[0]
        sc = GLOVE * L1
        fn = _path_fn([(pi / 2, sc - 0.0012), (pi / 2 + 2 * pi, sc + 0.0012)])
        wraps.append(strip_on_tube(hand, f, fn, 0.0032, 26, 0.0004, taper=0.12))
    # thumb: two narrow turns round the base of the free thumb
    t = hand.thumb
    fn = _path_fn([(pi / 2, t.seg[0] - 0.012), (pi / 2 + 4 * pi, t.seg[0] - 0.001)])
    wraps.append(strip_on_tube(hand, t, fn, 0.0032, 64, 0.0003 + 0.0006 * np.linspace(0, 1, 64),
                               taper=0.05))
    wr = finish_shells(wraps, 'white', outline_w=0.25)
    shift, worst = push_clear(hand, [body, wr])
    print(f'hands: right hand body clearance {worst * 1000:.1f} mm, pushed {shift * 1000:.1f} mm')
    return {'HandR': body, 'HandWrapsR': wr}


# ------------------------------------------------------------------ left hand

# printed red panels on the back of the left glove, (u, v): u = 0 thumb side
# .. 1 little-finger side, v = 0 wrist .. 1 knuckles.  Between them a white
# diagonal strap crosses the back from the thumb side of the cuff down to the
# little-finger side.
LEFT_PANELS = [
    # cuff, little-finger side (above the strap)
    [(0.36, -0.30), (1.08, -0.30), (1.08, 0.40), (0.86, 0.33), (0.46, 0.13)],
    # wide diagonal stripe below the strap, down to the index / middle knuckles
    [(0.48, 0.30), (0.90, 0.47), (0.62, 1.04), (0.12, 1.04), (0.12, 0.86)],
    # thumb edge, from the cuff to the thumb root
    [(-0.08, -0.30), (0.16, -0.30), (0.10, 0.02), (-0.08, 0.10)],
]
LEFT_RIVETS = [(0.78, 0.66), (0.86, 0.82)]


def build_left():
    hand = left_hand()

    def finger_mat(tube):
        L1 = tube.seg[0]
        return lambda s: 'white' if s < 0.80 * L1 else 'hands_red'

    mats = {'palm': lambda s: 'white'}
    for n, f in hand.fingers.items():
        mats[n] = finger_mat(f)
    mats['thumb'] = lambda s: 'white' if s < 0.020 else 'hands_red'
    body = hand_mesh(hand, mats)
    P = hand.palm

    def uv_to_xs(u, v):
        sv = 0.002 + v * 0.082
        a, bb, bf, eb, ef, xc, yc = P.section(np.array([sv]))
        return (xc[0] + a[0] * 0.995 * (1 - 2 * u), sv)

    panels = []
    for poly in LEFT_PANELS:
        # densify the outline so its edges follow the curved back
        pts = []
        for k in range(len(poly)):
            a, b = np.array(poly[k]), np.array(poly[(k + 1) % len(poly)])
            for t in np.linspace(0, 1, 6, endpoint=False):
                pts.append(uv_to_xs(*(a + (b - a) * t)))
        panels.append(decal_on_back(hand, P, np.array(pts)))
    out = {'HandL': body, 'HandStripesL': finish_shells(panels, 'hands_red', outline=False)}
    rivets = []
    for u, v in LEFT_RIVETS:
        x, sv = uv_to_xs(u, v)
        th = P.back_theta(np.array([x]), np.array([sv]))
        C = hand.surface(P, th, np.array([sv]), 0.0002)[0]
        N = hand.surface_normal(P, th, np.array([sv]))[0]
        R = hs.frame_from(y=np.array([0.0, 0.0, 1.0]), z=N)
        rivets.append(hs.lathe([(0, 0), (0.0011, 0), (0.0011, 0.0005), (0.0007, 0.0009),
                                (0, 0.0009)], 12, C, R))
    out['HandRivetsL'] = hs.hard_mesh(rivets, 'metal', bevel=0.0, outline_w=0.3)
    shift, worst = push_clear(hand, [body, out['HandStripesL'], out['HandRivetsL']])
    print(f'hands: left hand body clearance {worst * 1000:.1f} mm, pushed {shift * 1000:.1f} mm')
    return out


def hands():
    out = {}
    out.update(build_right())
    out.update(build_left())
    return out

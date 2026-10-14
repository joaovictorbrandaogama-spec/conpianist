"""Accessories (part "acc"): tech collar, goggles, arm rings, buckles, clasps,
leg tabs, hanging straps and the hip pouch.

Everything here is a hard-surface polygon mesh (hardsurf.py conventions:
flat faces, sharp edges by angle, small Bevel in Blender).  Pieces that sit
on a garment are modelled flat in a local frame (x along the strap / belt,
y across it, z out of the surface) and then *bent* onto the garment with a
:class:`Strip`, a moving frame that follows a curve lifted onto the body
surface, so they hug the curvature without intersecting it.

build() -> {object_name: MeshData}; every name starts with "Acc" (the rig
maps 'Collar' -> Neck, 'Goggle' -> UpperChest, 'HangingStrap'/'Pouch' ->
Hips and other Acc* objects rigidly to their dominant bone).
"""

import numpy as np

from hardsurf import (rounded_rect, chamfer_rect, prism, frame_prism, box, merge_vf,
                      hard_mesh, frame_from, place, lathe)
import clothing_geo as G
import outfit as O
import body as B
from rig import J, S, PX0, PY0
from meshutil import catmull


def nrm(v):
    return G.nrm(v)


# ====================================================================== bending

class Strip:
    """Moving frame along a curve P (n, 3) with surface normals N.

    Local coordinates: x = arc length from the point nearest ``centre``,
    y = across (B = N x T, oriented along ``up``), z = along the normal."""

    def __init__(self, P, N, centre, up):
        P = np.asarray(P, dtype=np.float64)
        N = nrm(N)
        k = int(np.argmin(np.linalg.norm(P - centre, axis=1)))
        T = nrm(np.gradient(P, axis=0))
        if np.dot(np.cross(N[k], T[k]), up) < 0:
            P, N = P[::-1].copy(), N[::-1].copy()
            k = len(P) - 1 - k
        self.P, self.N = P, N
        self.L = np.r_[0.0, np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]
        self.T = nrm(np.gradient(P, self.L, axis=0))
        self.u0 = self.L[k]

    def at(self, u):
        uu = np.clip(np.asarray(u, dtype=np.float64) + self.u0, 0.0, self.L[-1])
        C = np.stack([np.interp(uu, self.L, self.P[:, i]) for i in range(3)], -1)
        T = nrm(np.stack([np.interp(uu, self.L, self.T[:, i]) for i in range(3)], -1))
        N = np.stack([np.interp(uu, self.L, self.N[:, i]) for i in range(3)], -1)
        N = nrm(N - T * np.sum(N * T, axis=-1, keepdims=True))
        Bv = np.cross(N, T)
        return C, T, Bv, N

    def __call__(self, V):
        V = np.asarray(V, dtype=np.float64)
        C, T, Bv, N = self.at(V[:, 0])
        return C + Bv * V[:, 1:2] + N * V[:, 2:3]

    def bend(self, items):
        return [(self(v), f) for v, f in items]

    def frame(self, u=0.0):
        C, T, Bv, N = self.at(np.array([u]))
        return C[0], np.stack([T[0], Bv[0], N[0]], axis=1)


def limb_strip(loft, fn, s, level, th_c, span=np.radians(80), n=161, R0=0.05):
    """Strip around a limb at distance s down it (x grows with the angle)."""
    ch = G.LimbChart(loft, fn, R0=R0)
    th = np.linspace(th_c - span, th_c + span, n)
    lev = level(th, np.full_like(th, s)) if callable(level) else level
    P, N = ch.lift(th * R0, np.full_like(th, s), lev)
    Pc, _ = ch.lift(np.array([th_c * R0]), np.array([s]),
                    level(np.array([th_c]), np.array([s])) if callable(level) else level)
    up = -loft.R[:, 2]
    return Strip(P, N, Pc[0], up)


def torso_strip(fn, zfun, level, th_c, span=np.radians(40), n=121, R0=0.12):
    ch = G.TorsoChart(fn, O._TORSO, R0=R0)
    th = np.linspace(th_c - span, th_c + span, n)
    P, N = ch.lift(th * R0, zfun(th), level)
    Pc, _ = ch.lift(np.array([th_c * R0]), zfun(np.array([th_c])), level)
    return Strip(P, N, Pc[0], np.array([0.0, 0.0, 1.0]))


# ====================================================================== primitives

def strap_mesh(L, w, t, u0=0.0, end='point', tip=0.010, du=0.006, start='flat'):
    """Flat strap along local x from u0 to u0 + L (width w along y,
    thickness t along z from 0 to t), subdivided so it can be bent."""
    body_end = L - (tip if end in ('point', 'round') else 0.0)
    us = np.linspace(0.0, body_end, max(2, int(np.ceil(body_end / du)) + 1)) + u0
    V = []
    for u in us:
        V += [(u, -w / 2, 0.0), (u, w / 2, 0.0), (u, w / 2, t), (u, -w / 2, t)]
    n = len(us)
    F = []
    for k in range(n - 1):
        a, b = 4 * k, 4 * (k + 1)
        F += [[a + 0, b + 0, b + 1, a + 1],      # bottom
              [a + 3, a + 2, b + 2, b + 3],      # top
              [a + 1, b + 1, b + 2, a + 2],      # side +y
              [a + 0, a + 3, b + 3, b + 0]]      # side -y
    F.append([0, 1, 2, 3][::-1])
    last = 4 * (n - 1)
    if end == 'point':
        V += [(u0 + L, 0.0, 0.0), (u0 + L, 0.0, t)]
        p0, p1 = len(V) - 2, len(V) - 1
        F += [[last + 0, p0, last + 1][::-1], [last + 3, last + 2, p1][::-1],
              [last + 1, p0, p1, last + 2], [last + 0, last + 3, p1, p0]]
    elif end == 'round':
        ang = np.linspace(-np.pi / 2, np.pi / 2, 7)[1:-1]
        ring_b, ring_t = [last + 0], [last + 3]
        for a in ang:
            x, y = u0 + body_end + tip * np.cos(a), (w / 2) * np.sin(a)
            V += [(x, y, 0.0), (x, y, t)]
            ring_b.append(len(V) - 2)
            ring_t.append(len(V) - 1)
        ring_b.append(last + 1)
        ring_t.append(last + 2)
        F.append(ring_b)
        F.append(ring_t[::-1])
        for i in range(len(ring_b) - 1):
            F.append([ring_b[i], ring_t[i], ring_t[i + 1], ring_b[i + 1]])
    else:
        F.append([last + 0, last + 1, last + 2, last + 3])
    return np.array(V, dtype=np.float64), F


def tapered_prism(poly, depth, scale_top=0.85, z0=0.0):
    """Extrude a 2D polygon along z with the top face shrunk (a chamfered
    plate / button)."""
    from hardsurf import ccw
    P = ccw(np.asarray(poly, dtype=np.float64))
    n = len(P)
    c = P.mean(axis=0)
    top = c + (P - c) * scale_top
    V = np.concatenate([np.c_[P, np.full(n, z0)], np.c_[top, np.full(n, z0 + depth)]])
    F = [list(range(n))[::-1], list(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        F.append([i, j, n + j, n + i])
    return V, F


def buckle_parts(Lx, Wy, bar, depth, z0, prong_dir=-1, rnd=0.0025, centre=True,
                 prong=True, prong_w=0.0024, xc=0.0):
    """Rectangular buckle in the local strap frame: frame + centre bar +
    prong (pointing along prong_dir * x).  Returns list of (V, F)."""
    outer = rounded_rect(Lx, Wy, rnd, seg=3)
    inner = rounded_rect(Lx - 2 * bar, Wy - 2 * bar, max(rnd - bar * 0.6, 0.0006), seg=3)
    out = [frame_prism(outer, inner, depth, origin=(xc, 0, z0 + depth / 2))]
    if centre:
        out.append(box((bar * 0.8, Wy - 2 * bar + 0.0008, depth * 0.8),
                       origin=(xc, 0, z0 + depth * 0.45)))
    if prong:
        x0 = xc
        x1 = xc + prong_dir * (Lx / 2 - bar * 0.35)
        tipl = 0.003
        poly = [(x0, -prong_w / 2), (x1 - prong_dir * tipl, -prong_w / 2), (x1, 0.0),
                (x1 - prong_dir * tipl, prong_w / 2), (x0, prong_w / 2)]
        out.append(prism(poly, depth * 0.45, z0=z0 + depth * 0.62))
    return out


def rivet(r, h, seg=12, origin=(0, 0, 0), R=np.eye(3)):
    return lathe([(0, 0), (r, 0), (r, h * 0.6), (r * 0.7, h), (0, h)], seg, origin, R)


# ====================================================================== tech collar

NB, NT = J['neck_base'], J['neck_top']
COLLAR_Z = (1.425, 1.476)
SEG_Z = [(1.4250, 1.4378), (1.4384, 1.4508), (1.4514, 1.4636), (1.4642, 1.4760)]
COL_T, COL_LIP, COL_C = 0.0040, 0.0014, 0.0011
COL_CLR = 0.0012          # clearance from the neck
COL_CAP = 0.0440          # trapezius may poke through below this radius
FRONT = -np.pi / 2        # polar angle of the front (-Y)
_RB = None


def neck_centre(z):
    t = (np.asarray(z) - NB[2]) / (NT[2] - NB[2])
    return NB[0] + (NT[0] - NB[0]) * t, NB[1] + (NT[1] - NB[1]) * t


def _neck_table():
    """Polar radius of the body + head around the neck axis, rb(phi, z)."""
    global _RB
    if _RB is not None:
        return _RB
    head = B.HeadSDF()
    fn = lambda P: np.minimum(O.body_fn(P), head(P))
    phis = np.linspace(-np.pi, np.pi, 145)[:-1]
    zs = np.arange(1.418, 1.4825, 0.001)
    Ph, Z = np.meshgrid(phis, zs)
    cx, cy = neck_centre(Z)
    Ori = np.stack([cx, cy, Z], -1).reshape(-1, 3)
    D = np.stack([np.cos(Ph), np.sin(Ph), np.zeros_like(Ph)], -1).reshape(-1, 3)
    t, ok = G.ray_hit(fn, Ori, D, 0.0, 0.12, n=120, mode='exit')
    r = t.reshape(Z.shape)
    # circular smoothing in phi, light smoothing in z
    for _ in range(3):
        r = 0.25 * np.roll(r, 1, axis=1) + 0.5 * r + 0.25 * np.roll(r, -1, axis=1)
    r = np.minimum(r, COL_CAP)
    # never narrower than the top ring (keeps the collar a rigid tube)
    r = np.maximum(r, 0.0290)
    _RB = (phis, zs, r)
    return _RB


def rb(phi, z):
    phis, zs, r = _neck_table()
    phi = np.asarray(phi, dtype=np.float64)
    z = np.asarray(z, dtype=np.float64)
    p = (phi + np.pi) % (2 * np.pi) - np.pi
    fi = (p - phis[0]) / (phis[1] - phis[0])
    i0 = np.floor(fi).astype(int)
    a = fi - i0
    n = len(phis)
    zi = np.clip((z - zs[0]) / (zs[1] - zs[0]), 0, len(zs) - 1.0001)
    j0 = np.floor(zi).astype(int)
    b = zi - j0
    def g(i, j):
        return r[j, i % n]
    return ((1 - a) * (1 - b) * g(i0, j0) + a * (1 - b) * g(i0 + 1, j0) +
            (1 - a) * b * g(i0, j0 + 1) + a * b * g(i0 + 1, j0 + 1))


def polar_point(phi, z, dr):
    cx, cy = neck_centre(z)
    r = rb(phi, z) + dr
    return np.stack([cx + r * np.cos(phi), cy + r * np.sin(phi), np.broadcast_to(z, np.shape(r))],
                    -1)


def polar_lathe(profile, phis, closed=True):
    """Ring around the neck: profile = closed loop of (dr, z, mat) points
    (dr = offset from the neck radius rb); phis = polar angles.  The face
    from profile point j to j+1 gets material j.  Returns (V, F, mats)."""
    prof = list(profile)
    m, n = len(prof), len(phis)
    V = []
    for dr, z, _ in prof:
        V.append(polar_point(phis, np.full(n, z), dr))
    V = np.concatenate(V)
    F, M = [], []
    ncol = n if closed else n - 1
    for j in range(m):
        j2 = (j + 1) % m
        for i in range(ncol):
            i2 = (i + 1) % n
            F.append([j * n + i, j2 * n + i, j2 * n + i2, j * n + i2])
            M.append(prof[j][2])
    if not closed:
        F.append([j * n for j in range(m)])
        M.append(prof[0][2])
        F.append([j * n + n - 1 for j in range(m)][::-1])
        M.append(prof[0][2])
    return V, F, M


def seg_outer(k):
    """Outer profile points (dr, z) of collar segment k, bottom to top."""
    za, zb = SEG_Z[k]
    t, lip, c = COL_T, COL_LIP, COL_C
    return [(t + lip - c, za), (t + lip, za + c), (t + 0.25 * lip, zb - c),
            (t + 0.25 * lip - c, zb)]


def collar_outer_dr(z):
    """Outer offset of the collar plates at height z (max lip)."""
    return COL_T + COL_LIP


def collar():
    out = {}
    phis = np.linspace(-np.pi, np.pi, 97)[:-1]
    parts, mats = [], []
    for k in range(len(SEG_Z)):
        za, zb = SEG_Z[k]
        o = seg_outer(k)
        # the inner part of each plate reaches down into the one below (no
        # see-through slit at the grooves)
        tuck = 0.0022 if k > 0 else 0.0
        prof = [(o[0][0], o[0][1], 'acc_matte'), (o[1][0], o[1][1], 'acc_matte'),
                (o[2][0], o[2][1], 'acc_edge'), (o[3][0], o[3][1], 'acc_matte'),
                (0.0006, zb, 'acc_matte'), (0.0006, za - tuck, 'acc_matte'),
                (COL_T - 0.0014, za - tuck, 'acc_matte'), (COL_T - 0.0014, za, 'acc_matte')]
        V, F, M = polar_lathe(prof, phis)
        parts.append((V, F))
        mats += M
    # vertical posts either side of the front label
    def strip_prof(d_out, d_in, z0, z1, mat_top='acc_edge'):
        pts = [(d_out - 0.0008, z0, 'acc_matte'), (d_out, z0 + 0.0008, 'acc_matte')]
        for k in range(len(SEG_Z)):
            for dr, z in seg_outer(k)[1:3]:
                if z0 + 0.001 < z < z1 - 0.001:
                    pts.append((dr + (d_out - COL_T - COL_LIP), z, 'acc_matte'))
        pts += [(d_out, z1 - 0.0008, mat_top), (d_out - 0.0008, z1, 'acc_matte'),
                (d_in, z1, 'acc_matte'), (d_in, z0, 'acc_matte')]
        return pts
    post_mats = []
    for sgn in (-1, 1):
        pc = FRONT + sgn * np.radians(40.0)
        hw = 0.0028 / 0.040
        ph = np.linspace(pc - hw, pc + hw, 4)
        V, F, M = polar_lathe(strip_prof(COL_T + COL_LIP + 0.0012, COL_T - 0.0010,
                                         SEG_Z[0][0] + 0.0015, SEG_Z[-1][1] - 0.0008),
                              ph, closed=False)
        parts.append((V, F))
        mats += M
    # label plate across the front of the third segment
    za, zb = SEG_Z[2]
    hw = 0.0215 / 0.036
    ph = np.linspace(FRONT - hw, FRONT + hw, 15)
    d = COL_T + COL_LIP + 0.0012
    prof = [(d - 0.0008, za + 0.0006, 'acc_matte'), (d, za + 0.0014, 'acc_matte'),
            (d, zb - 0.0014, 'acc_edge'), (d - 0.0008, zb - 0.0006, 'acc_matte'),
            (COL_T - 0.001, zb - 0.0006, 'acc_matte'), (COL_T - 0.001, za + 0.0006, 'acc_matte')]
    V, F, M = polar_lathe(prof, ph, closed=False)
    parts.append((V, F))
    mats += M
    Vc, Fc = merge_vf(parts)
    # small round bolts near the bottom of the posts
    bolts = []
    for sgn in (-1, 1):
        pc = FRONT + sgn * np.radians(40.0)
        zb_ = 0.5 * (SEG_Z[0][0] + SEG_Z[0][1]) + 0.0010
        cx, cy = neck_centre(zb_)
        r0 = rb(pc, zb_) + COL_T + COL_LIP + 0.0012
        nn = np.array([np.cos(pc), np.sin(pc), 0.0])
        org = np.array([cx, cy, zb_]) + nn * (r0 - 0.0003)
        bolts.append(rivet(0.0017, 0.0012, 12, origin=org, R=frame_from(x=np.array([0, 0, 1.0]), z=nn)))
    out['AccCollarBolts'] = hard_mesh(bolts, 'metal', bevel=0.0002, angle=35, outline_w=0.35)
    out['AccCollar'] = hard_mesh((Vc, Fc), 'acc_matte', bevel=0.0005, angle=35, outline_w=0.8)
    out['AccCollar'].mats = mats

    # red stripe down the front centre (over the plates, under the label)
    hw = 0.0046 / 0.036
    ph = np.linspace(FRONT - hw, FRONT + hw, 3)
    pts = []
    for k in range(len(SEG_Z)):
        for dr, z in seg_outer(k):
            pts.append((dr + 0.00035, z, 'acc_red'))
    pts += [(COL_T - 0.0008, SEG_Z[-1][1], 'acc_red'), (COL_T - 0.0008, SEG_Z[0][0], 'acc_red')]
    V, F, M = polar_lathe(pts, ph, closed=False)
    out['AccCollarStripe'] = hard_mesh((V, F), 'acc_red', bevel=0.0002, angle=35, outline_w=0.35)

    # small white printed label on the plate: two rows of text bars
    rng = np.random.default_rng(11)
    bars = []
    zc = 0.5 * (za + zb)
    rr = rb(FRONT, zc) + d
    for row, (z0, h, length) in enumerate(((zc + 0.0002, 0.0017, 0.030), (zc - 0.0024, 0.0012, 0.020))):
        u = -length / 2
        while u < length / 2:
            ln = rng.uniform(0.0008, 0.0026) if row == 0 else rng.uniform(0.0006, 0.0018)
            ln = min(ln, length / 2 - u)
            if ln > 0.0004:
                p0, p1 = FRONT + u / rr, FRONT + (u + ln) / rr
                cs = []
                for ph_, zz in ((p0, z0), (p1, z0), (p1, z0 + h), (p0, z0 + h)):
                    cs.append(polar_point(np.array([ph_]), np.array([zz]), d - 0.0001)[0])
                cs = np.array(cs)
                nn = nrm(cs[0] - np.r_[neck_centre(zc), zc])
                nn[2] = 0
                nn = nrm(nn)
                V = np.concatenate([cs, cs + nn * 0.00025])
                F = [[0, 1, 2, 3][::-1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6],
                     [3, 0, 4, 7]]
                bars.append((V, F))
            u += ln + rng.uniform(0.0005, 0.0011)
    out['AccCollarLabel'] = hard_mesh(bars, 'decal_white', bevel=0.0, outline=False)
    return out


# ====================================================================== goggles

LENS_W, LENS_H, LENS_R = 0.034, 0.021, 0.0075
FRAME_W = 0.0055


def domed_lens(w, h, r, t, dome, seg=4, rings=5):
    """Rounded-rectangle lens, flat back at z=0, front domed up to t + dome
    (a curved glossy surface gives a small specular spot instead of a flat
    sheet that lights up all at once)."""
    base = rounded_rect(w, h, r, seg)
    n = len(base)
    V = [np.c_[base, np.zeros(n)], np.c_[base, np.full(n, t)]]
    for k in range(1, rings):
        f = 1.0 - k / rings
        z = t + dome * (1.0 - f ** 2)
        V.append(np.c_[base * f, np.full(n, z)])
    V.append(np.array([[0.0, 0.0, t + dome]]))
    V = np.concatenate(V)
    F = [list(range(n))[::-1]]
    for i in range(n):                     # side wall
        j = (i + 1) % n
        F.append([i, j, n + j, n + i])
    for k in range(1, rings):              # dome rings
        a0, a1 = k * n, (k + 1) * n
        for i in range(n):
            j = (i + 1) % n
            F.append([a0 + i, a0 + j, a1 + j, a1 + i])
    c = len(V) - 1
    a0 = rings * n
    for i in range(n):
        F.append([a0 + i, a0 + (i + 1) % n, c])
    return V, F


def lens_frame_parts(sgn):
    """One goggle eye-piece in its local frame (z = lens normal, x towards
    her left; sgn = -1 for the piece on her right)."""
    seg = 4
    inner = rounded_rect(LENS_W, LENS_H, LENS_R, seg)
    cup_o = rounded_rect(LENS_W + 2 * FRAME_W + 0.0016, LENS_H + 2 * FRAME_W + 0.0016,
                         LENS_R + FRAME_W + 0.0008, seg)
    bez_o = rounded_rect(LENS_W + 2 * FRAME_W, LENS_H + 2 * FRAME_W, LENS_R + FRAME_W, seg)
    bez_i = rounded_rect(LENS_W + 0.0012, LENS_H + 0.0012, LENS_R + 0.0006, seg)
    rubber = [frame_prism(cup_o, inner, 0.0062, origin=(0, 0, -0.0044)),     # back cup
              frame_prism(bez_o, bez_i, 0.0034, origin=(0, 0, 0.0021))]      # front bezel
    # strap lug on the outer side
    lx = sgn * (LENS_W / 2 + FRAME_W + 0.0035)
    lug = chamfer_rect(0.0085, 0.0125, 0.002)
    rubber.append(prism(lug + np.array([lx, 0.0]), 0.0052, z0=-0.0068))
    lens = [domed_lens(LENS_W + 0.0006, LENS_H + 0.0006, LENS_R + 0.0003, 0.0016, 0.0016)]
    lens = [(lens[0][0] + np.array([0.0, 0.0, -0.0022]), lens[0][1])]
    # highlight: one slanted streak and a small dot, upper inner corner
    shine = []
    cx0 = -sgn * 0.0060
    for (cx, cy, w, h, sl) in ((cx0, 0.0010, 0.0030, 0.0110, 0.0045),
                               (cx0 + 0.0048, 0.0030, 0.0012, 0.0060, 0.0025)):
        poly = [(cx - w / 2 - sl / 2, cy - h / 2), (cx + w / 2 - sl / 2, cy - h / 2),
                (cx + w / 2 + sl / 2, cy + h / 2), (cx - w / 2 + sl / 2, cy + h / 2)]
        shine.append(prism(np.array(poly), 0.0003, z0=0.0002))
    metal = [rivet(0.0016, 0.0012, 10, origin=(lx, 0.0, -0.0016))]
    return rubber, lens, shine, metal


def goggles(collar_front_y):
    out = {}
    cL = np.array([(325 - PX0) * S, 0.0, (PY0 - 191) * S])
    cR = np.array([(357 - PX0) * S, 0.0, (PY0 - 188) * S])
    M = 0.5 * (cL + cR)
    M[1] = collar_front_y - 0.0105
    tilt = np.radians(24.0)
    n_g = nrm(np.array([0.0, -np.cos(tilt), np.sin(tilt)]))
    x_g = nrm(cR - cL)
    Rg = frame_from(x=x_g, z=n_g)
    x_g, y_g, n_g = Rg[:, 0], Rg[:, 1], Rg[:, 2]
    half = 0.5 * np.linalg.norm(cR - cL)
    rub, lns, shn, met, lugs = [], [], [], [], []
    for sgn, yaw in ((-1, np.radians(24.0)), (1, np.radians(12.0))):
        a = yaw
        n_i = np.cos(a) * n_g + sgn * np.sin(a) * x_g
        x_i = np.cos(a) * x_g - sgn * np.sin(a) * n_g
        Ri = frame_from(x=x_i, z=n_i)
        c = M + sgn * x_g * half - n_g * 0.0040 * np.sin(a) / np.sin(np.radians(24))
        r, l, s, m = lens_frame_parts(sgn)
        rub += [(place(v, c, Ri), f) for v, f in r]
        lns += [(place(v, c, Ri), f) for v, f in l]
        shn += [(place(v, c, Ri), f) for v, f in s]
        met += [(place(v, c, Ri), f) for v, f in m]
        lugs.append(place(np.array([[sgn * (LENS_W / 2 + FRAME_W + 0.0060), 0.0, -0.0042]]),
                          c, Ri)[0])
    # rubber nose piece: a U hanging between the cups, plus a top bar
    gap = 2 * half - LENS_W - 2 * FRAME_W           # clear gap between bezels
    xi = gap / 2 + 0.0030                           # reach into the bezels
    yb = -(LENS_H / 2 + FRAME_W) + 0.0010
    path2 = [(-xi, 0.0040), (-gap / 2 + 0.0005, -0.0030), (-0.0040, yb + 0.0015),
             (0.0, yb), (0.0040, yb + 0.0015), (gap / 2 - 0.0005, -0.0030), (xi, 0.0040)]
    P2, _ = catmull(np.array([(x, y, 0.0) for x, y in path2]), 40)
    from hardsurf import sweep
    Vn, Fn = sweep(chamfer_rect(0.0050, 0.0050, 0.0008), P2, np.array([0.0, 0.0, 1.0]))
    dz = 0.0035                                     # cups wrap forward at the inner side
    rub.append((place(Vn + np.array([0.0, 0.0, dz - 0.0003]), M, Rg), Fn))
    ytop = LENS_H / 2 + FRAME_W - 0.0030
    rub.append(box((gap + 0.0050, 0.0050, 0.0042), origin=M + y_g * ytop + n_g * (dz - 0.0004), R=Rg))
    # silver triangular bridge clasp on the top bar, pointing down
    tri = [(-0.0078, ytop + 0.0034), (0.0078, ytop + 0.0034), (0.0, ytop - 0.0085)]
    met.append(tapered_prism(tri, 0.0020, 0.80, z0=dz + 0.0016))
    met[-1] = (place(met[-1][0], M, Rg), met[-1][1])
    met.append(rivet(0.0011, 0.0009, 10, origin=M + y_g * (ytop + 0.0005) + n_g * (dz + 0.0034), R=Rg))
    out['AccGoggles'] = hard_mesh(rub, 'acc_matte', bevel=0.0005, angle=35, outline_w=0.7)
    out['AccGogglesLens'] = hard_mesh(lns, 'lens', bevel=0.0004, angle=35, outline_w=0.4)
    out['AccGogglesShine'] = hard_mesh(shn, 'white', bevel=0.0, outline=False)
    out['AccGogglesMetal'] = hard_mesh(met, 'chrome', bevel=0.0003, angle=35, outline_w=0.4)
    # strap: from each lug around the back of the collar
    zs = 1.4335
    phL = np.arctan2(lugs[0][1] - neck_centre(zs)[1], lugs[0][0] - neck_centre(zs)[0])
    phR = np.arctan2(lugs[1][1] - neck_centre(zs)[1], lugs[1][0] - neck_centre(zs)[0])
    phL = phL % (2 * np.pi)                      # ~ 220 deg
    phR = phR % (2 * np.pi) - 2 * np.pi          # ~ -60 deg
    ph = np.linspace(phL - np.radians(18), phR + np.radians(18), 40)
    zz = zs + 0.004 * np.cos(ph - np.pi / 2) ** 2 * (np.sin(ph) > 0)
    head = B.HeadSDF()
    pts = []
    for p, z in zip(ph, zz):
        r0 = rb(p, z) + COL_T + COL_LIP + 0.0012
        cx, cy = neck_centre(z)
        d = np.array([np.cos(p), np.sin(p), 0.0])
        # push out of the shoulders where they rise above the collar base
        r = r0
        for _ in range(40):
            q = np.array([cx, cy, z]) + d * r
            if O.body_fn(q[None])[0] > 0.0020:
                break
            r += 0.001
        pts.append(np.array([cx, cy, z]) + d * r)
    ctrl = [lugs[0]] + pts + [lugs[1]]
    P, T = catmull(np.array(ctrl), 90)
    up = np.tile(np.array([0.0, 0.0, 1.0]), (len(P), 1))
    V, F = sweep(rounded_rect(0.0018, 0.0090, 0.0006, seg=1), P, up)
    out['AccGogglesStrap'] = hard_mesh((V, F), 'acc_matte', bevel=0.0003, angle=40,
                                       outline_w=0.5)
    return out


# ====================================================================== arm rings

def closed_lathe(profile, seg, origin, R):
    """Revolve a closed (r, z) loop (counter-clockwise in the r-z plane)."""
    prof = np.asarray(profile, dtype=np.float64)
    m = len(prof)
    ang = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    V = np.array([(r * np.cos(a), r * np.sin(a), z) for r, z in prof for a in ang])
    F = []
    for j in range(m):
        j2 = (j + 1) % m
        for i in range(seg):
            i2 = (i + 1) % seg
            F.append([j * seg + i, j * seg + i2, j2 * seg + i2, j2 * seg + i])
    return place(V, origin, R), F


def limb_axis(ch, s, e=0.004):
    C, _ = ch.frame(np.array([0.0]), np.array([s]))
    C0, _ = ch.frame(np.array([0.0]), np.array([s - e]))
    C1, _ = ch.frame(np.array([0.0]), np.array([s + e]))
    return C[0], nrm(C0[0] - C1[0])           # centre, direction up the limb


def limb_radius(ch, s0, s1, level, C, ax):
    th = np.linspace(0, 2 * np.pi, 48, endpoint=False)
    r = 0.0
    for s in np.linspace(s0, s1, 6):
        P, _ = ch.lift(th * ch.R0, np.full_like(th, s), level)
        d = P - C
        d = d - np.outer(d @ ax, ax)
        r = max(r, float(np.linalg.norm(d, axis=1).max()))
    return r


def ring_parts(C, ax, xref, ri, rbody, rflange, H, seg=56):
    """Flanged ring: silver flange on top (towards the shoulder) with a glowing
    band under its rim, a grooved metal body below.  Returns (metal, glow)."""
    R = frame_from(x=xref - ax * np.dot(xref, ax), z=ax)
    c = 0.0007
    rb_, rf = rbody, rflange
    prof = [(ri, -H), (rb_ - c, -H), (rb_, -H + c), (rb_, -H + 0.0045),
            (rb_ - 0.0012, -H + 0.0057), (rb_ - 0.0012, -H + 0.0073), (rb_, -H + 0.0085),
            (rb_, -0.0074), (rf - 0.0030, -0.0074), (rf - 0.0030, -0.0030),
            (rf - c, -0.0030), (rf, -0.0030 + c), (rf, -c), (rf - c, 0.0),
            (ri + 0.0016, 0.0), (ri, -0.0016)]
    metal = closed_lathe(prof, seg, C, R)
    glow = closed_lathe([(rf - 0.0040, -0.0053), (rf - 0.0009, -0.0053),
                         (rf - 0.0009, -0.0031), (rf - 0.0040, -0.0031)], seg, C, R)
    return metal, glow


def arm_rings():
    out = {}
    arm = B.arm('L')
    ch = G.LimbChart(arm, G.body_subset(['deltL', 'armL']), R0=O.ARM_R0)
    wrap = 0.0012 + 0.0024 + 0.0015 + 0.0012      # red wrap + crossing straps
    xref = arm.R[:, 0]
    END = O.SK_L - 0.036
    # elbow: just below the sleeve hem
    s_top = END + 0.0015
    H = 0.020
    C, ax = limb_axis(ch, s_top)
    ri = limb_radius(ch, s_top - 0.002, s_top + H, wrap, C, ax) + 0.0010
    m1, g1 = ring_parts(C, ax, xref, ri, ri + 0.0042, ri + 0.0135, H)
    # wrist: ring + white cuff towards the hand
    s_top = O.L_L - 0.025
    H = 0.017
    C, ax = limb_axis(ch, s_top)
    ri = limb_radius(ch, s_top, s_top + H, wrap, C, ax) + 0.0010
    m2, g2 = ring_parts(C, ax, xref, ri, ri + 0.0040, ri + 0.0125, H)
    Rw = frame_from(x=xref - ax * np.dot(xref, ax), z=ax)
    rc = ri + 0.0026
    c = 0.0008
    cuff = closed_lathe([(ri - 0.0004, -H - 0.0135), (rc - c, -H - 0.0135), (rc, -H - 0.0135 + c),
                         (rc, -H - c), (rc - c, -H + 0.0004), (ri - 0.0004, -H + 0.0004)],
                        48, C, Rw)
    out['AccRingElbow'] = hard_mesh([m1], 'chrome', bevel=0.0004, angle=35, outline_w=0.6)
    out['AccRingElbowGlow'] = hard_mesh([g1], 'glow_blue', bevel=0.0, outline=False)
    out['AccRingWrist'] = hard_mesh([m2], 'chrome', bevel=0.0004, angle=35, outline_w=0.6)
    out['AccRingWristGlow'] = hard_mesh([g2], 'glow_blue', bevel=0.0, outline=False)
    out['AccWristCuff'] = hard_mesh([cuff], 'white', bevel=0.0005, angle=35, outline_w=0.6)
    return out


# ====================================================================== buckles

def strip_sign(st, ch_lift_fn=None):
    """+1 if the strip's local x grows with the chart angle."""
    return 1.0


def belt_buckle():
    tb = np.radians(-38.0)
    lev = O.WBELT_LEV + O.WBELT_T
    st = torso_strip(O.hips_fn(), lambda th: O.zc_of('white', th), lev, tb)
    sx = _dir_sign(st, O.hips_fn(), lambda th: O.zc_of('white', th), lev, tb, torso=True)
    tongue = 0.0028           # tongue sits this much above the belt top
    parts = buckle_parts(0.029, 0.036, 0.0043, 0.0050, -0.0016, prong_dir=-sx,
                         rnd=0.0035, prong=False)
    # prong lying on the tongue, pointing to the tongue's free end
    x1 = -sx * (0.029 / 2 - 0.0012)
    poly = [(0.0, -0.0013), (x1 + sx * 0.003, -0.0013), (x1, 0.0), (x1 + sx * 0.003, 0.0013),
            (0.0, 0.0013)]
    parts.append(prism(poly, 0.0014, z0=tongue - 0.0001))
    return {'AccBeltBuckle': hard_mesh(st.bend(parts), 'chrome', bevel=0.0005, angle=35,
                                       outline_w=0.7)}


def _dir_sign(st, fn, zfun_or_s, level, th_c, torso=False, loft=None):
    """Sign relating the strip's local +x to increasing chart angle."""
    d = np.radians(2.0)
    if torso:
        ch = G.TorsoChart(fn, O._TORSO, R0=0.12)
        P, _ = ch.lift(np.array([th_c - d, th_c + d]) * 0.12, zfun_or_s(np.array([th_c - d, th_c + d])),
                       level)
    else:
        ch = G.LimbChart(loft, fn, R0=0.05)
        lv = level(np.array([th_c - d, th_c + d]), np.full(2, zfun_or_s)) if callable(level) \
            else level
        P, _ = ch.lift(np.array([th_c - d, th_c + d]) * 0.05, np.full(2, zfun_or_s), lv)
    C, R = st.frame(0.0)
    return 1.0 if np.dot(R[:, 0], P[1] - P[0]) > 0 else -1.0


THIGH_TH = np.radians(36.0)


def thigh_buckles():
    """Big chrome buckles on the two left-thigh straps.  The frame is rigid
    (flat, placed on the tangent plane at the strap); the tail and keeper are
    bent onto the strap so they follow the thigh."""
    fn = G.body_subset(['gluteL', 'legL'])
    th_c = THIGH_TH
    metal, tails, dark = [], [], []
    Lx, Wy, bar, dep = 0.030, 0.040, 0.0056, 0.0052
    for sc in O.STRAP_S:
        lv0 = O.strap_level(sc)
        lev = lambda T, Sv, lv0=lv0: lv0(T, Sv) + O.STRAP_T
        st = limb_strip(O.LEG_L, fn, sc, lev, th_c)
        sx = _dir_sign(st, fn, sc, lev, th_c, loft=O.LEG_L)     # +x*sx = outwards
        C, R = st.frame(0.0)
        tail_t = 0.0022
        # rigid frame + centre bar, prong lying on the tail pointing outwards
        m = buckle_parts(Lx, Wy, bar, dep, -0.0013, prong=False, rnd=0.0032)
        x1 = sx * (Lx / 2 - 0.0012)
        poly = [(0.0, -0.0015), (x1 - sx * 0.0035, -0.0015), (x1, 0.0),
                (x1 - sx * 0.0035, 0.0015), (0.0, 0.0015)]
        m.append(prism(poly, 0.0015, z0=tail_t))
        metal += [(place(v, C, R), f) for v, f in m]
        # strap tail: from under the centre bar outwards, round end, eyelets
        L = 0.046
        V, F = strap_mesh(L, O.STRAP_W - 0.003, tail_t, end='round', tip=0.010, du=0.004)
        V[:, 0] = sx * (V[:, 0] - 0.002)
        V[:, 2] -= 0.0002
        tails.append((st(V), F))
        ey = []
        for k in range(3):
            u = sx * (Lx / 2 + 0.0105 + 0.0075 * k)
            ey.append(rivet(0.0014, 0.0007, 10, origin=(u, 0.0, tail_t - 0.0002)))
        metal += st.bend(ey)
        # leather keeper loop just past the buckle
        kx = sx * (Lx / 2 + 0.0042)
        dark += st.bend([box((0.0055, O.STRAP_W + 0.0024, 0.0016),
                             origin=(kx, 0.0, tail_t + 0.0006))])
    return {'AccThighBuckles': hard_mesh(metal, 'chrome', bevel=0.0005, angle=35, outline_w=0.7),
            'AccThighStrapTails': hard_mesh(tails + dark, 'acc_matte', bevel=0.0004, angle=40,
                                            outline_w=0.6)}


def garter_buckle():
    fn = G.body_subset(['gluteR', 'legR'])
    th_c = np.radians(-80.0)
    lev = 0.0004 + 0.0024
    st = limb_strip(O.LEG_R, fn, O.GARTER_S, lev, th_c)
    parts = buckle_parts(0.015, 0.036, 0.0032, 0.0034, -0.0010, prong=False, rnd=0.0022)
    # short slide bar through the middle
    return {'AccGarterBuckle': hard_mesh(st.bend(parts), 'metal', bevel=0.0004, angle=35,
                                         outline_w=0.6)}


def bikini_clasp():
    z0, z1 = O.BAND_Z
    zt = z0 + 0.0055
    zm = 0.5 * (zt + z1)
    lev = O.BAND_LEV + O.BAND_T
    st = torso_strip(O.top_fn(), lambda th: np.full_like(th, zm), lev, np.radians(-35.0))
    parts = [tapered_prism(chamfer_rect(0.017, 0.0145, 0.0020), 0.0020, 0.93, z0=-0.0004)]
    for k in range(4):
        y = -0.0045 + k * 0.0030
        parts.append(tapered_prism(chamfer_rect(0.0145, 0.0016, 0.0004), 0.0011, 0.85,
                                   z0=0.0014))
        parts[-1] = (parts[-1][0] + np.array([0.0, y, 0.0]), parts[-1][1])
    return {'AccBikiniClasp': hard_mesh(st.bend(parts), 'chrome', bevel=0.0003, angle=35,
                                        outline_w=0.5)}


# ====================================================================== leg tabs

TAB_S = (0.230, 0.325, 0.417, 0.510, 0.590)
TAB_TH = np.radians(66.0)


def leg_tabs():
    fn = G.body_subset(['gluteL', 'legL'])
    lev = lambda T, Sv: O.armor_level(T, Sv) + O.ARMOR_T
    res = {}
    for name, sel in (('Upper', lambda s: s < O.LK_L), ('Lower', lambda s: s >= O.LK_L)):
        blk, met = [], []
        for s in TAB_S:
            if not sel(s):
                continue
            st = limb_strip(O.LEG_L, fn, s, lev, TAB_TH, span=np.radians(40))
            sx = _dir_sign(st, fn, s, lev, TAB_TH, loft=O.LEG_L)
            b = [tapered_prism(chamfer_rect(0.0115, 0.026, 0.0022), 0.0034, 0.86, z0=-0.0006)]
            m = [tapered_prism(chamfer_rect(0.0085, 0.0075, 0.0014), 0.0013, 0.8, z0=0.0026)]
            m[0] = (m[0][0] + np.array([0.0, -0.0065, 0.0]), m[0][1])
            # silver edge strip on the outer side of the tab
            m.append(box((0.0013, 0.022, 0.0030), origin=(sx * 0.0058, 0.0, 0.0010)))
            blk += st.bend(b)
            met += st.bend(m)
        res['AccLegTabs' + name] = hard_mesh(blk, 'acc_matte', bevel=0.0005, angle=35,
                                             outline_w=0.6)
        res['AccLegTabsMetal' + name] = hard_mesh(met, 'chrome', bevel=0.0003, angle=35,
                                                  outline_w=0.4)
    return res


# ====================================================================== hanging straps

def back_surface_y(x, z, off=0.008):
    ys = np.linspace(0.30, -0.10, 800)
    P = np.stack([np.full_like(ys, x), ys, np.full_like(ys, z)], 1)
    d = O.body_fn(P) - off
    i = int(np.argmax(d < 0))
    return ys[i] if d[i] < 0 else -1.0


def hang_path(x0, x1, ztop, zend, ymin, n=48):
    zs = np.linspace(ztop, zend, n)
    xs = np.linspace(x0, x1, n)
    yb = np.array([back_surface_y(x, z) for x, z in zip(xs, zs)])
    y = np.maximum.accumulate(np.maximum(yb + 0.002, ymin))
    # soften the drape corner
    for _ in range(4):
        y[1:-1] = np.maximum(y[1:-1], 0.5 * (y[:-2] + y[2:]))
    return np.stack([xs, y, zs], 1)


STRAPS = [  # x top, x bottom, z top, z end, width, y min
    (-0.014, -0.012, 1.000, 0.585, 0.022, 0.095),
    (0.003, 0.004, 0.995, 0.640, 0.016, 0.101),
    (0.205, 0.222, 0.975, 0.590, 0.020, 0.060),
    (0.165, 0.150, 0.985, 0.640, 0.016, 0.080),
]


def hanging_straps():
    black, metal = [], []
    for x0, x1, zt, ze, w, ymin in STRAPS:
        P = hang_path(x0, x1, zt, ze, ymin)
        N = np.tile(np.array([0.0, -1.0, 0.0]), (len(P), 1))
        st = Strip(P, N, P[0], np.array([1.0, 0.0, 0.0]))
        sx = 1.0 if np.dot(st.T[0], P[1] - P[0]) * (1 if st.u0 == 0 else -1) > 0 else -1.0
        L = float(st.L[-1])
        down = 1.0 if st.u0 < 1e-9 else -1.0
        V, F = strap_mesh(L, w, 0.0024, end='flat', du=0.010)
        V[:, 0] *= down
        black.append((st(V), F))
        # stitched end: a thin grey seam line a little above the cut
        sv, sf = box((0.0010, w - 0.004, 0.0004), origin=(down * (L - 0.012), 0.0, 0.0025))
        metal.append((st(sv), sf))
    return {'AccHangingStraps': hard_mesh(black, 'acc_matte', bevel=0.0004, angle=40,
                                          outline_w=0.7),
            'AccHangingStrapsSeam': hard_mesh(metal, 'acc_edge', bevel=0.0, outline=False)}


# ====================================================================== hip pouch

def hip_pouch():
    fn = O.hips_fn()
    ch = G.TorsoChart(fn, O._TORSO, R0=0.12)
    th = np.radians(-118.0)
    zc = 1.000
    P, N = ch.lift(np.array([th * 0.12]), np.array([zc]), O.SHORTS_LEVEL + O.SHORTS_T)
    P, N = P[0], N[0]
    N[2] = 0.0
    N = nrm(N)
    R = frame_from(y=np.array([0.0, 0.0, 1.0]), z=N)
    o = P + N * 0.0035
    W, Hh, D = 0.050, 0.068, 0.024
    white = [tapered_prism(chamfer_rect(W, Hh, 0.006), D, 0.95)]
    flap = np.array([(-W / 2 - 0.0012, Hh / 2 + 0.0012), (-W / 2 - 0.0012, Hh / 2 - 0.022),
                     (-W / 2 + 0.010, Hh / 2 - 0.030), (W / 2 - 0.010, Hh / 2 - 0.030),
                     (W / 2 + 0.0012, Hh / 2 - 0.022), (W / 2 + 0.0012, Hh / 2 + 0.0012)])
    white.append(tapered_prism(flap, 0.0030, 0.97, z0=D - 0.0012))
    dark = [tapered_prism(chamfer_rect(0.012, 0.011, 0.0025), 0.0024, 0.85, z0=D + 0.0016)]
    dark[0] = (dark[0][0] + np.array([0.0, Hh / 2 - 0.026, 0.0]), dark[0][1])
    # belt loop strap at the back, up to the belt
    dark.append(box((0.022, 0.050, 0.0020), origin=(0.0, Hh / 2 + 0.006, -0.0010)))
    # grey seam lines on the sides of the box
    seams = [box((0.0008, Hh - 0.016, 0.0006), origin=(sg * (W / 2 - 0.0045), -0.006, D + 0.0002))
             for sg in (-1, 1)]
    met = [rivet(0.0018, 0.0010, 12, origin=(0.0, Hh / 2 - 0.026, D + 0.0038))]
    pl = lambda items: [(place(v, o, R), f) for v, f in items]
    return {'AccHipPouch': hard_mesh(pl(white), 'white', bevel=0.0007, angle=35, outline_w=0.8),
            'AccHipPouchStrap': hard_mesh(pl(dark), 'acc_matte', bevel=0.0004, angle=35,
                                          outline_w=0.6),
            'AccHipPouchSeams': hard_mesh(pl(seams), 'gray', bevel=0.0, outline=False),
            'AccHipPouchMetal': hard_mesh(pl(met), 'chrome', bevel=0.0003, angle=35,
                                          outline_w=0.4)}


# ====================================================================== build

def build():
    out = {}
    out.update(collar())
    cx, cy = neck_centre(1.430)
    front_y = cy - (rb(FRONT, 1.430) + COL_T + COL_LIP)
    out.update(goggles(front_y))
    out.update(arm_rings())
    out.update(belt_buckle())
    out.update(thigh_buckles())
    out.update(garter_buckle())
    out.update(bikini_clasp())
    out.update(leg_tabs())
    out.update(hanging_straps())
    out.update(hip_pouch())
    return out

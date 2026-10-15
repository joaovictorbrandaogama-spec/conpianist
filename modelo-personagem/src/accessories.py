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
#
# A rigid tube (fixed elliptical section around the neck axis, not derived
# from the body) in three bands: a thin top band, a main band carrying the
# gunmetal label plate framed by two chunky posts, and a bottom band.  The
# body's neck widens strongly below z ~ 1.457, so the bottom band opens into a
# shallow cone and then sinks into the shoulders (only its top shows).

NB, NT = J['neck_base'], J['neck_top']
COLLAR_Z = (1.4250, 1.4810)
BANDS = [(1.4250, 1.4562), (1.4570, 1.4728), (1.4736, 1.4810)]    # bottom, main, top
BAND_DW = [0.0005, 0.0, 0.0005]      # small step of the bottom / top band over the main band
COL_RX, COL_RY = 0.0297, 0.0292      # inner radii of the straight tube (neck ~28-29 mm)
COL_W = 0.0026                       # wall thickness (outer = inner + COL_W)
FLARE_Z, FLARE_K = 1.4572, 0.42      # below FLARE_Z the tube opens into a shallow cone
COL_C = 0.0007                       # chamfer of the band edges
FRONT = -np.pi / 2                   # polar angle of the front (-Y)
POST_PHI = np.radians(40.0)          # posts either side of the front label
POST_HW = 0.0046                     # post half width (arc length)
POST_OUT = 0.0020                    # post stands this much proud of the main band
PLATE_Z = (1.4584, 1.4688)
PLATE_OUT = 0.0021
STRIPE_HW = 0.0042


def neck_centre(z):
    t = (np.asarray(z) - NB[2]) / (NT[2] - NB[2])
    return NB[0] + (NT[0] - NB[0]) * t, NB[1] + (NT[1] - NB[1]) * t


def r_in(phi, z):
    """Inner radius of the collar tube at polar angle phi and height z."""
    phi = np.asarray(phi, dtype=np.float64)
    z = np.asarray(z, dtype=np.float64)
    re = 1.0 / np.sqrt((np.cos(phi) / COL_RX) ** 2 + (np.sin(phi) / COL_RY) ** 2)
    return re + FLARE_K * np.maximum(FLARE_Z - z, 0.0)


# backwards compatible name (other helpers below use it)
def rb(phi, z):
    return r_in(phi, z)


def polar_point(phi, z, dr):
    phi = np.asarray(phi, dtype=np.float64)
    z = np.broadcast_to(np.asarray(z, dtype=np.float64), phi.shape)
    cx, cy = neck_centre(z)
    r = r_in(phi, z) + dr
    return np.stack([cx + r * np.cos(phi), cy + r * np.sin(phi), z], -1)


def polar_lathe(profile, phis, closed=True):
    """Ring around the neck: profile = closed loop of (dr, z, mat) points
    (dr = offset from the collar's inner radius); phis = polar angles.  The
    face from profile point j to j+1 gets material j.  Returns (V, F, mats)."""
    prof = list(profile)
    m, n = len(prof), len(phis)
    V = np.concatenate([polar_point(phis, np.full(n, z), dr) for dr, z, _ in prof])
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


def band_profile(k, tuck=0.0012):
    """Closed (dr, z, mat) section of band k: chamfered outer wall with a grey
    highlight on the upper chamfer; the inner wall reaches a little below
    the band so the grooves between bands are never see-through."""
    za, zb = BANDS[k]
    w = COL_W + BAND_DW[k]
    c = COL_C
    top_mat = 'acc_red' if k == len(BANDS) - 1 else 'acc_matte'
    zlo = za - (tuck if k > 0 else 0.0)
    return [(w - c, za, 'acc_matte'), (w, za + c, 'acc_matte'), (w, zb - c, 'acc_edge'),
            (w - c, zb, 'acc_matte'), (0.0013, zb, top_mat), (0.0004, zb - 0.0009, 'acc_matte'),
            (0.0004, zlo, 'acc_matte'), (COL_W - 0.0012, zlo, 'acc_matte'),
            (COL_W - 0.0012, za, 'acc_matte')]


def arc_phis(pc, half_len, r, n):
    hw = half_len / r
    return np.linspace(pc - hw, pc + hw, n)


def raised_block(pc, half_len, z0, z1, d_out, d_in, n=4, c=0.0007, mats=('acc_matte',) * 6):
    """A block standing on the collar between angles pc +- half_len (arc
    length) and heights z0..z1, its front at offset d_out with chamfers."""
    ph = arc_phis(pc, half_len, 0.032, n)
    prof = [(d_out - c, z0, mats[0]), (d_out, z0 + c, mats[1]), (d_out, z1 - c, mats[2]),
            (d_out - c, z1, mats[3]), (d_in, z1, mats[4]), (d_in, z0, mats[5])]
    return polar_lathe(prof, ph, closed=False)


def print_bars(pc, zc, d, rows, seed, mat_h=0.00025):
    """Small white 'printed text' bars on the collar surface at offset d.
    rows = [(dz, height, length)]"""
    rng = np.random.default_rng(seed)
    bars = []
    rr = float(r_in(pc, zc)) + d
    for dz, h, length in rows:
        u = -length / 2
        while u < length / 2:
            ln = min(rng.uniform(0.0007, 0.0024), length / 2 - u)
            if ln > 0.0004:
                p0, p1 = pc + u / rr, pc + (u + ln) / rr
                z0 = zc + dz
                cs = polar_point(np.array([p0, p1, p1, p0]), np.array([z0, z0, z0 + h, z0 + h]), d)
                nn = np.array([np.cos(pc), np.sin(pc), 0.0])
                V = np.concatenate([cs, cs + nn * mat_h])
                F = [[0, 1, 2, 3][::-1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6],
                     [3, 0, 4, 7]]
                bars.append((V, F))
            u += ln + rng.uniform(0.0004, 0.0010)
    return bars


def collar():
    out = {}
    phis = np.linspace(-np.pi, np.pi, 97)[:-1]
    parts, mats = [], []

    def add(vfm):
        V, F, M = vfm
        parts.append((V, F))
        mats.extend(M)

    for k in range(len(BANDS)):
        add(polar_lathe(band_profile(k), phis))
    # chunky posts either side of the label plate, full collar height
    z0p, z1p = BANDS[0][1] - 0.0080, BANDS[-1][1] - 0.0004
    pm = ('acc_matte', 'acc_matte', 'acc_edge', 'acc_matte', 'acc_matte', 'acc_matte')
    for sgn in (-1, 1):
        add(raised_block(FRONT + sgn * POST_PHI, POST_HW, z0p, z1p, COL_W + POST_OUT,
                         COL_W - 0.0010, n=4, c=0.0008, mats=pm))
    Vc, Fc = merge_vf(parts)
    out['AccCollar'] = hard_mesh((Vc, Fc), 'acc_matte', bevel=0.0004, angle=35, outline_w=0.8)
    out['AccCollar'].mats = mats

    # gunmetal label plate between the posts (stands in front of the stripe)
    r_mid = float(r_in(FRONT, 0.5 * sum(PLATE_Z)))
    half = (POST_PHI * r_mid - POST_HW) - 0.0004
    V, F, M = raised_block(FRONT, half, PLATE_Z[0], PLATE_Z[1], COL_W + PLATE_OUT,
                           COL_W - 0.0010, n=15, c=0.0008)
    out['AccCollarPlate'] = hard_mesh((V, F), 'gunmetal', bevel=0.0003, angle=35, outline_w=0.6)

    # red stripe down the front centre: above the plate (through the top band)
    # and below it (through the bottom band); the plate covers the middle
    stripe = []
    for zlo, zhi, ks, hl in ((PLATE_Z[1] - 0.0010, BANDS[1][1], (1,), half),
                             (BANDS[0][0], PLATE_Z[0] + 0.0010, (0, 1), STRIPE_HW)):
        ph = arc_phis(FRONT, hl, 0.032, 3 if hl < 0.006 else 15)
        pts = []
        for k in ks:
            za, zb = BANDS[k]
            w = COL_W + BAND_DW[k] + 0.0003
            for z in (za, zb):
                zc_ = min(max(z, zlo), zhi)
                pts.append((w, zc_, 'acc_red'))
        pts = [p for i, p in enumerate(pts) if i == 0 or abs(p[1] - pts[i - 1][1]) > 1e-6]
        pts += [(COL_W - 0.0008, zhi, 'acc_red'), (COL_W - 0.0008, zlo, 'acc_red')]
        V, F, _ = polar_lathe(pts, ph, closed=False)
        stripe.append((V, F))
    out['AccCollarStripe'] = hard_mesh(stripe, 'acc_red', bevel=0.0002, angle=35, outline_w=0.35)

    # white print: two centred lines on the plate
    zc = 0.5 * sum(PLATE_Z)
    bars = print_bars(FRONT, zc, COL_W + PLATE_OUT, [(0.0006, 0.0018, 0.026),
                                                     (-0.0026, 0.0013, 0.018)], 11)
    out['AccCollarLabel'] = hard_mesh(bars, 'decal_white', bevel=0.0, outline=False)

    # small bolts near the bottom of the posts
    bolts = []
    for sgn in (-1, 1):
        pc = FRONT + sgn * POST_PHI
        zb_ = z0p + 0.0042
        org = polar_point(np.array([pc]), np.array([zb_]), COL_W + POST_OUT - 0.0002)[0]
        nn = np.array([np.cos(pc), np.sin(pc), 0.0])
        bolts.append(rivet(0.0016, 0.0010, 12, origin=org,
                           R=frame_from(x=np.array([0, 0, 1.0]), z=nn)))
    out['AccCollarBolts'] = hard_mesh(bolts, 'metal', bevel=0.0002, angle=35, outline_w=0.35)
    return out


def collar_outer(phi, z):
    """Outer radius of the collar (main band) for straps routed around it."""
    return r_in(phi, z) + COL_W + 0.0006


# ====================================================================== goggles
#
# Two chunky tactical eye-cups: an octagonal (cut-corner) lens opening in a
# thick bevelled rubber frame, a faceted crimson lens (flat-shaded facets in
# dark / mid / bright red + sharp white glints), a short wide rubber bridge,
# a chrome brow plate over the bridge and her right cup, small white print.
# Her right cup is tilted down and turned partly edge-on, the other faces
# forward, as in the reference.

def round_poly(base, d, seg):
    """Outward offset of a convex CCW polygon by d with round corners
    (seg + 1 points per corner, so loops of any d match vertex for vertex)."""
    from hardsurf import ccw
    P = ccw(np.asarray(base, dtype=np.float64))
    n = len(P)
    out = []
    for i in range(n):
        a, b, c = P[i - 1], P[i], P[(i + 1) % n]
        e1, e2 = b - a, c - b
        a1 = np.arctan2(-e1[0], e1[1])
        a2 = np.arctan2(-e2[0], e2[1])
        if a2 < a1:
            a2 += 2 * np.pi
        for t in np.linspace(a1, a2, seg + 1):
            out.append(b + d * np.array([np.cos(t), np.sin(t)]))
    return np.array(out)


def ring_loft(base, prof, seg=3):
    """Revolve-like loft of a closed (d, z) section around a convex outline."""
    loops = [np.c_[round_poly(base, d, seg), np.full(len(base) * (seg + 1), z)] for d, z in prof]
    m = len(loops[0])
    V = np.concatenate(loops)
    F = []
    for k in range(len(prof)):
        k2 = (k + 1) % len(prof)
        for i in range(m):
            j = (i + 1) % m
            F.append([k * m + i, k * m + j, k2 * m + j, k2 * m + i])
    return V, F


CUP_BASE = chamfer_rect(0.0340, 0.0185, 0.0062)    # core outline (lens = +2.5 mm)
LENS_D, FRAME_D = 0.0025, 0.0105                   # lens opening / frame outer offsets
FRAME_Z0, FRAME_Z1 = -0.0068, 0.0024               # back / front face of the frame
CUP_W = 0.0340 + 2 * FRAME_D                       # 55 mm
CUP_H = 0.0185 + 2 * FRAME_D                       # 39.5 mm


def faceted_lens():
    """Low-poly domed lens: 16-gon rim, 8-gon mid ring, apex.  Returns
    (V, F, mats, facets) in the cup frame; facet materials by orientation."""
    rim = round_poly(CUP_BASE, LENS_D + 0.0004, 1)                 # 16 points
    n = len(rim)
    core = np.asarray(CUP_BASE)
    from hardsurf import ccw
    core = ccw(core)
    mid = core * np.array([0.62, 0.58]) + np.array([0.0, 0.0012])
    apex = np.array([0.0015, 0.0022])
    zr, zm, za, zb = -0.0010, 0.0012, 0.0020, -0.0030
    V = np.concatenate([np.c_[rim, np.full(n, zb)], np.c_[rim, np.full(n, zr)],
                        np.c_[mid, np.full(len(mid), zm)], [[apex[0], apex[1], za]]])
    B0, R0, M0, A = 0, n, 2 * n, 2 * n + len(mid)
    F = [list(range(n))[::-1]]
    for i in range(n):
        j = (i + 1) % n
        F.append([B0 + i, B0 + j, R0 + j, R0 + i])
    for i in range(len(mid)):
        i2 = (i + 1) % len(mid)
        F.append([R0 + 2 * i, R0 + 2 * i + 1, M0 + i])                        # corner tri
        F.append([R0 + 2 * i + 1, R0 + (2 * i + 2) % n, M0 + i2, M0 + i])      # side quad
        F.append([M0 + i, M0 + i2, A])                                         # top tri
    mats = []
    for f in F:
        p = V[f]
        nv = np.cross(p[1] - p[0], p[2] - p[0])
        nv = nv / (np.linalg.norm(nv) + 1e-12)
        if nv[2] < 0.2:
            mats.append('acc_lens_dark')
        elif nv[1] > 0.30:
            mats.append('acc_lens_hi')
        elif nv[1] < -0.22:
            mats.append('acc_lens_dark')
        else:
            mats.append('acc_lens')
    return V, F, mats


def quad_patch(Q, uv, lift):
    """Polygon inside quad/tri Q (bilinear / barycentric uv), lifted along
    its normal: a thin plate for glints and prints."""
    Q = np.asarray(Q)
    if len(Q) == 3:
        Q = np.array([Q[0], Q[1], Q[2], Q[2]])
    nv = np.cross(Q[1] - Q[0], Q[3] - Q[0] if np.linalg.norm(Q[3] - Q[2]) > 1e-9 else Q[2] - Q[0])
    nv /= np.linalg.norm(nv)
    pts = []
    for u, v in uv:
        p = (1 - u) * (1 - v) * Q[0] + u * (1 - v) * Q[1] + u * v * Q[2] + (1 - u) * v * Q[3]
        pts.append(p + nv * lift)
    pts = np.array(pts)
    k = len(pts)
    V = np.concatenate([pts, pts + nv * 0.0002])
    F = [list(range(k))[::-1], list(range(k, 2 * k))]
    for i in range(k):
        j = (i + 1) % k
        F.append([i, j, k + j, k + i])
    return V, F


def cup_parts(sgn):
    """One eye-cup in its local frame (x towards her left, y up, z out of the
    lens).  Returns dict of lists of (V, F) (+ lens mats)."""
    prof = [(LENS_D - 0.0004, FRAME_Z0), (FRAME_D, FRAME_Z0), (FRAME_D, 0.0002),
            (FRAME_D - 0.0013, FRAME_Z1), (LENS_D + 0.0022, FRAME_Z1),
            (LENS_D, FRAME_Z1 - 0.0016)]
    rubber = [ring_loft(CUP_BASE, prof, seg=3)]
    # strap lug on the outer side
    lx = sgn * (CUP_W / 2 + 0.0030)
    lug = tapered_prism(chamfer_rect(0.0090, 0.0150, 0.0024) + np.array([lx, -0.0010]),
                        0.0070, 0.86, z0=FRAME_Z0 + 0.0004)
    rubber.append(lug)
    V, F, lm = faceted_lens()
    # glints: a slanted sliver and a small chip on the upper outer facets
    glint = []
    rim = round_poly(CUP_BASE, LENS_D + 0.0004, 1)
    n = len(rim)
    from hardsurf import ccw
    core = ccw(np.asarray(CUP_BASE))
    mid = core * np.array([0.62, 0.58]) + np.array([0.0, 0.0012])
    # pick the side quad whose midpoint is most 'up and towards -sgn x' (inner top)
    best, bq = -9, None
    for i in range(len(mid)):
        i2 = (i + 1) % len(mid)
        Q = [np.r_[rim[2 * i + 1], -0.0010], np.r_[rim[(2 * i + 2) % n], -0.0010],
             np.r_[mid[i2], 0.0012], np.r_[mid[i], 0.0012]]
        c = np.mean(Q, axis=0)
        sc = c[1] / CUP_H + 0.6 * (-sgn) * c[0] / CUP_W
        if sc > best:
            best, bq = sc, Q
    glint.append(quad_patch(bq, [(0.30, 0.10), (0.42, 0.10), (0.30, 0.85), (0.18, 0.85)], 0.00015))
    glint.append(quad_patch(bq, [(0.58, 0.20), (0.66, 0.20), (0.62, 0.55)], 0.00015))
    # small white print on the frame's front face (upper outer corner + lower)
    prints = []
    rng = np.random.default_rng(5 + sgn)
    for (x0, y0, length, h) in ((sgn * 0.0040, CUP_H / 2 - 0.0034, 0.0120, 0.0009),
                                (sgn * 0.0060, CUP_H / 2 - 0.0050, 0.0080, 0.0007),
                                (sgn * 0.0090, -CUP_H / 2 + 0.0032, 0.0070, 0.0008)):
        u = 0.0
        while u < length:
            ln = min(rng.uniform(0.0006, 0.0018), length - u)
            if ln > 0.0004:
                xa = x0 + sgn * u - (ln if sgn < 0 else 0.0) * 0
                poly = np.array([(xa, y0), (xa + sgn * ln, y0), (xa + sgn * ln, y0 + h), (xa, y0 + h)])
                prints.append(prism(poly, 0.00025, z0=FRAME_Z1))
            u += ln + rng.uniform(0.0004, 0.0008)
    metal = [rivet(0.0017, 0.0012, 10, origin=(lx, -0.0010, FRAME_Z0 + 0.0074))]
    return dict(rubber=rubber, lens=[(V, F)], lens_mats=lm, glint=glint, prints=prints,
                metal=metal)


GOG_PX = ((326.0, 191.0), (354.0, 187.5))     # her right / her left cup centres (reference px)
_OBST = None


def _obstacles():
    """Vertices of the garments the goggles rest on (coat lapels, top), read
    from the other parts' caches, with their shell thickness."""
    global _OBST
    if _OBST is None:
        pts = []
        try:
            import cache
            for part in ('coat', 'top'):
                try:
                    ms = cache.load(part)
                except Exception:
                    continue
                for m in ms.values():
                    v = m['verts']
                    keep = (np.abs(v[:, 0]) < 0.09) & (v[:, 2] > 1.36) & (v[:, 2] < 1.47) & \
                        (v[:, 1] < 0.03)
                    th = float(m['props'].get('solidify') or 0.0)
                    if keep.any():
                        pts.append(np.c_[v[keep], np.full(int(keep.sum()), th)])
        except Exception:
            pass
        _OBST = np.concatenate(pts) if pts else np.zeros((0, 4))
    return _OBST


def _clear_shift(c, R, margin=0.0008, frac=0.6):
    """Move a cup at (c, R) towards the camera (-Y, so it keeps its place in
    the front view) until nothing of the coat / top lies in front of its back
    face inside the central part of its outline (the rubber rim may press
    into a lapel).  Returns the new centre."""
    Q = _obstacles()
    if not len(Q):
        return c
    d = np.array([0.0, -1.0, 0.0])
    dn = float(np.dot(d, R[:, 2]))
    for _ in range(3):
        q = (Q[:, :3] - c) @ R
        inside = (np.abs(q[:, 0]) < frac * CUP_W / 2) & (np.abs(q[:, 1]) < frac * CUP_H / 2)
        if not inside.any():
            break
        need = float((q[inside, 2] + Q[inside, 3] + margin - FRAME_Z0).max())
        if need <= 1e-5:
            break
        c = c + d * need / dn
    return c


def goggles(collar_front_y=None):
    out = {}
    cR_ = np.array([(GOG_PX[0][0] - PX0) * S, 0.0, (PY0 - GOG_PX[0][1]) * S])
    cL_ = np.array([(GOG_PX[1][0] - PX0) * S, 0.0, (PY0 - GOG_PX[1][1]) * S])
    tilt = np.radians(16.0)
    n_g = nrm(np.array([0.0, -np.cos(tilt), np.sin(tilt)]))
    x_g = nrm(cL_ - cR_)
    Rg = frame_from(x=x_g, z=n_g)
    x_g, y_g, n_g = Rg[:, 0], Rg[:, 1], Rg[:, 2]
    rub, lns, lmats, gl, pr, met = [], [], [], [], [], []
    frames, lugs = {}, {}
    for sgn, c0, yaw, roll in ((-1, cR_, np.radians(36.0), np.radians(18.0)),
                               (1, cL_, np.radians(10.0), np.radians(-4.0))):
        # roll about the view axis (her right cup: outer end down), then yaw outwards
        xr = np.cos(roll) * x_g + np.sin(roll) * y_g
        yr = np.cross(n_g, xr)
        n_i = np.cos(yaw) * n_g + sgn * np.sin(yaw) * xr
        x_i = np.cos(yaw) * xr - sgn * np.sin(yaw) * n_g
        Ri = frame_from(x=x_i, z=n_i)
        # rest the back of the cup on the body / chest, then in front of the
        # coat lapels and the top if they are under its footprint
        sp = O.surface_point(O.body_fn, c0[0], c0[2])
        c = sp + Ri[:, 2] * (-FRAME_Z0 + 0.0012) + np.array([0.0, -0.0015, 0.0])
        c = _clear_shift(c, Ri)
        frames[sgn] = (c, Ri)
        p = cup_parts(sgn)
        pl = lambda items: [(place(v, c, Ri), f) for v, f in items]
        rub += pl(p['rubber'])
        lns += pl(p['lens'])
        lmats += p['lens_mats']
        gl += pl(p['glint'])
        pr += pl(p['prints'])
        met += pl(p['metal'])
        lugs[sgn] = place(np.array([[sgn * (CUP_W / 2 + 0.0060), -0.0010, FRAME_Z0 + 0.0040]]),
                          c, Ri)[0]
    # short wide rubber bridge block joining the inner edges of the cups
    (cA, RA), (cB, RB) = frames[-1], frames[1]
    pA = place(np.array([[CUP_W / 2 - 0.0050, 0.0040, -0.0018]]), cA, RA)[0]
    pB = place(np.array([[-CUP_W / 2 + 0.0050, 0.0040, -0.0018]]), cB, RB)[0]
    xb = nrm(pB - pA)
    zb = nrm(RA[:, 2] + RB[:, 2])
    Rb = frame_from(x=xb, z=zb)
    Lb = float(np.linalg.norm(pB - pA))
    bv, bf = tapered_prism(chamfer_rect(Lb, 0.0095, 0.0022), 0.0080, 0.88, z0=-0.0040)
    rub.append((place(bv, 0.5 * (pA + pB), Rb), bf))
    # chrome brow plate: spans the bridge and the top of her right cup
    yt = CUP_H / 2
    trap = np.array([(0.0040, yt - 0.0004), (CUP_W / 2 + 0.0080, yt - 0.0004),
                     (CUP_W / 2 + 0.0050, yt - 0.0080), (0.0085, yt - 0.0080)])
    tv, tf = tapered_prism(trap, 0.0022, 0.84, z0=FRAME_Z1 - 0.0004)
    met.append((place(tv, cA, RA), tf))
    out['AccGoggles'] = hard_mesh(rub, 'acc_matte', bevel=0.0005, angle=35, outline_w=0.75)
    out['AccGogglesLens'] = hard_mesh(lns, 'acc_lens', bevel=0.0, angle=8.0, outline_w=0.4)
    out['AccGogglesLens'].mats = lmats
    out['AccGogglesShine'] = hard_mesh(gl, 'white', bevel=0.0, outline=False)
    out['AccGogglesPrint'] = hard_mesh(pr, 'decal_white', bevel=0.0, outline=False)
    out['AccGogglesMetal'] = hard_mesh(met, 'metal', bevel=0.0003, angle=35, outline_w=0.45)
    out['AccGogglesStrap'] = goggle_strap(lugs, frames)
    return out


def goggle_strap(lugs, frames):
    """Strap from each lug round the back of the collar.  Built in polar
    coordinates about the neck axis: radius and height blend smoothly from
    each lug to a ring just outside the collar at the back (no corners), then
    the path is pushed just clear of the body and smoothed."""
    from hardsurf import sweep
    zs = 1.4535
    cx, cy = neck_centre(zs)
    ctr = np.array([cx, cy])

    def pol(p):
        d = p[:2] - ctr
        return np.arctan2(d[1], d[0]), float(np.linalg.norm(d)), p[2]

    aR, rR, zR = pol(lugs[-1])          # her right lug, ~ 200-230 deg
    aL, rL, zL = pol(lugs[1])           # her left lug, ~ -30 deg
    aR = aR % (2 * np.pi)
    aL = aL % (2 * np.pi) - 2 * np.pi
    ph = np.linspace(aR, aL, 160)       # decreasing, through the back (+90 deg)
    blend = np.radians(75.0)
    wR = np.clip((aR - ph) / blend, 0, 1)
    wL = np.clip((ph - aL) / blend, 0, 1)
    w = np.minimum(wR, wL)
    w = w * w * (3 - 2 * w)
    r_ring = r_in(ph, zs) + COL_W + 0.0016
    end_r = np.where(ph > 0.5 * (aR + aL), rR, rL)
    end_z = np.where(ph > 0.5 * (aR + aL), zR, zL)
    r = (1 - w) * end_r + w * r_ring
    z = (1 - w) * end_z + w * zs
    P = np.stack([cx + r * np.cos(ph), cy + r * np.sin(ph), z], 1)
    # push out of the body (radially), keep the ends on the lugs
    for _ in range(3):
        off = np.zeros(len(P))
        for i, q in enumerate(P):
            d = np.r_[q[:2] - ctr, 0.0]
            d = nrm(d)
            rr = 0.0
            while O.body_fn((q + d * rr)[None])[0] < 0.0016 and rr < 0.03:
                rr += 0.0005
            off[i] = rr
        off[:3] = 0.0
        off[-3:] = 0.0
        for _ in range(8):
            off[1:-1] = np.maximum(off[1:-1], 0.5 * (off[:-2] + off[2:]))
        for i, q in enumerate(P):
            d = nrm(np.r_[q[:2] - ctr, 0.0])
            P[i] = q + d * off[i]
        for _ in range(6):
            P[1:-1] = 0.25 * P[:-2] + 0.5 * P[1:-1] + 0.25 * P[2:]
    up = np.tile(np.array([0.0, 0.0, 1.0]), (len(P), 1))
    V, F = sweep(rounded_rect(0.0018, 0.0090, 0.0006, seg=1), P, up)
    return hard_mesh((V, F), 'acc_matte', bevel=0.0003, angle=40, outline_w=0.5)


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


def ring_parts(C, ax, xref, ri, rbody, rflange, H, seg=64):
    """Flanged ring: a wide chamfered chrome flange on top (towards the
    shoulder), a recessed glowing band right under it, then a tall straight
    chrome body with a fine groove.  Returns (metal, glow, R)."""
    R = frame_from(x=xref - ax * np.dot(xref, ax), z=ax)
    rb_, rf = rbody, rflange
    zg0, zg1 = -0.0052, -0.0078          # glow groove
    zm = -0.5 * (H + 0.0078) - 0.0010     # fine groove on the body
    prof = [(ri, -H), (rb_ - 0.0008, -H), (rb_, -H + 0.0008),
            (rb_, zm - 0.0006), (rb_ - 0.0006, zm), (rb_, zm + 0.0006),
            (rb_, zg1), (rb_ - 0.0010, zg1), (rb_ - 0.0010, zg0),
            (rf - 0.0010, zg0), (rf, zg0 + 0.0008), (rf, -0.0012), (rf - 0.0012, 0.0),
            (ri - 0.0010, 0.0), (ri - 0.0025, -0.0012), (ri - 0.0025, -0.0030), (ri, -0.0045)]
    metal = closed_lathe(prof, seg, C, R)
    glow = closed_lathe([(rb_ - 0.0011, zg1 + 0.0001), (rb_ - 0.0002, zg1 + 0.0001),
                         (rb_ - 0.0002, zg0 - 0.0001), (rb_ - 0.0011, zg0 - 0.0001)], seg, C, R)
    return metal, glow, R


def ring_print(C, ax, R, rbody, z0, seed):
    """A few small dark printed marks on the ring body, facing the camera."""
    rng = np.random.default_rng(seed)
    fw = np.array([0.0, -1.0, 0.0])
    fw = fw - ax * np.dot(fw, ax)
    a0 = np.arctan2(np.dot(fw, R[:, 1]), np.dot(fw, R[:, 0]))
    out = []
    for row, (dz, h, L) in enumerate(((0.0, 0.0013, 0.020), (-0.0024, 0.0010, 0.013))):
        u = -L / 2 + (0.003 if row else 0.0)
        while u < L / 2:
            ln = min(rng.uniform(0.0008, 0.0022), L / 2 - u)
            if ln > 0.0004:
                a, b = a0 + u / rbody, a0 + (u + ln) / rbody
                pts = []
                for ang, z in ((a, z0 + dz), (b, z0 + dz), (b, z0 + dz + h), (a, z0 + dz + h)):
                    pts.append((rbody * np.cos(ang), rbody * np.sin(ang), z))
                pts = np.array(pts)
                nn = np.c_[np.cos([a, b, b, a]), np.sin([a, b, b, a]), np.zeros(4)]
                V = np.concatenate([pts - nn * 0.0001, pts + nn * 0.00018])
                F = [[0, 1, 2, 3][::-1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6],
                     [3, 0, 4, 7]]
                out.append((place(V, C, R), F))
            u += ln + rng.uniform(0.0004, 0.0009)
    return out


def arm_rings():
    out = {}
    arm = B.arm('L')
    ch = G.LimbChart(arm, G.body_subset(['deltL', 'armL']), R0=O.ARM_R0)
    wrap = 0.0012 + 0.0024 + 0.0015 + 0.0012      # red wrap + crossing straps
    xref = arm.R[:, 0]
    END = O.SK_L - 0.036
    # elbow: right under the sleeve hem (the hem tucks into the flange)
    s_top = END - 0.0085
    H = 0.030
    C, ax = limb_axis(ch, s_top)
    ri = limb_radius(ch, s_top - 0.002, s_top + H, wrap, C, ax) + 0.0010
    m1, g1, R1 = ring_parts(C, ax, xref, ri, ri + 0.0045, ri + 0.0140, H)
    p1 = ring_print(C, ax, R1, ri + 0.0045, -0.5 * (H + 0.0078) + 0.0030, 3)
    # wrist: ring, a dark band, then the white cuff towards the hand
    s_top = O.L_L - 0.036
    H = 0.024
    C, ax = limb_axis(ch, s_top)
    ri = limb_radius(ch, s_top, s_top + H, wrap, C, ax) + 0.0010
    m2, g2, Rw = ring_parts(C, ax, xref, ri, ri + 0.0042, ri + 0.0120, H)
    p2 = ring_print(C, ax, Rw, ri + 0.0042, -0.5 * (H + 0.0078) + 0.0025, 4)
    c = 0.0008
    rd = ri + 0.0030
    dark = closed_lathe([(ri - 0.0004, -H - 0.0060), (rd - c, -H - 0.0060), (rd, -H - 0.0060 + c),
                         (rd, -H - c), (rd - c, -H + 0.0004), (ri - 0.0004, -H + 0.0004)],
                        48, C, Rw)
    rc = ri + 0.0026
    z0 = -H - 0.0062
    cuff = closed_lathe([(ri - 0.0004, z0 - 0.0120), (rc - c, z0 - 0.0120), (rc, z0 - 0.0120 + c),
                         (rc, z0 - c), (rc - c, z0 + 0.0002), (ri - 0.0004, z0 + 0.0002)],
                        48, C, Rw)
    out['AccRingElbow'] = hard_mesh([m1], 'chrome', bevel=0.0004, angle=35, outline_w=0.6)
    out['AccRingElbowGlow'] = hard_mesh([g1], 'glow_blue', bevel=0.0, outline=False)
    out['AccRingWrist'] = hard_mesh([m2], 'chrome', bevel=0.0004, angle=35, outline_w=0.6)
    out['AccRingWristGlow'] = hard_mesh([g2], 'glow_blue', bevel=0.0, outline=False)
    out['AccRingElbowPrint'] = hard_mesh(p1, 'acc_matte', bevel=0.0, outline=False)
    out['AccRingWristPrint'] = hard_mesh(p2, 'acc_matte', bevel=0.0, outline=False)
    out['AccWristBand'] = hard_mesh([dark], 'acc_matte', bevel=0.0004, angle=35, outline_w=0.6)
    out['AccWristCuff'] = hard_mesh([cuff], 'white', bevel=0.0005, angle=35, outline_w=0.6)
    return out


# ====================================================================== buckles

def strip_sign(st, ch_lift_fn=None):
    """+1 if the strip's local x grows with the chart angle."""
    return 1.0


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


def bevel_frame(core, d_in, d_out, z0, h, ch=0.0008, seg=3):
    """Flat buckle frame around a convex core outline: inner loop offset d_in,
    outer d_out, from z0 to z0 + h with chamfered top edges."""
    prof = [(d_in, z0), (d_out, z0), (d_out, z0 + h - ch), (d_out - ch, z0 + h),
            (d_in + ch, z0 + h), (d_in, z0 + h - ch)]
    return ring_loft(core, prof, seg)


def belt_buckle():
    """Large metal belt buckle: a D / hexagon frame (corners on the tip side
    cut at 45 degrees), a heavy cross bar at 40 % of its width, and an oval
    metal-rimmed slot in the tongue.  Bent onto the belt."""
    tb = np.radians(-38.0)
    lev = O.WBELT_LEV + O.WBELT_T
    st = torso_strip(O.hips_fn(), lambda th: O.zc_of('white', th), lev, tb)
    sx = _dir_sign(st, O.hips_fn(), lambda th: O.zc_of('white', th), lev, tb, torso=True)
    W, Hh, bar, dep = 0.044, 0.036, 0.0056, 0.0055
    ci, cw, chh = 0.0006, W - 2 * bar, Hh - 2 * bar
    # core outline (local x = -sx is the belt tip side; chamfer those corners)
    t = -sx
    c = 0.0068
    core = np.array([(t * (cw / 2 - c), chh / 2), (-t * cw / 2, chh / 2), (-t * cw / 2, -chh / 2),
                     (t * (cw / 2 - c), -chh / 2), (t * cw / 2, -chh / 2 + c),
                     (t * cw / 2, chh / 2 - c)]) * np.array([1.0, 1.0])
    core = core - np.sign(core) * ci       # so that the inner loop (offset ci) is the opening
    z0 = -0.0016
    parts = [bevel_frame(core, ci, ci + bar, z0, dep, ch=0.0010, seg=3)]
    # heavy cross bar at ~40 % of the width from the tip side
    xb = t * (W / 2 - 0.40 * W)
    parts.append(tapered_prism(chamfer_rect(0.0062, chh + 0.0016, 0.0010) + np.array([xb, 0.0]),
                               dep - 0.0004, 0.80, z0=z0))
    metal = st.bend(parts)
    # oval metal-rimmed slot in the tongue, beyond the bar
    zt = O.TONGUE_LEV + 0.0025 - lev
    xs = -t * 0.0080
    oval_o = rounded_rect(0.0090, 0.0040, 0.00199, seg=4) + np.array([xs, 0.0])
    oval_i = rounded_rect(0.0066, 0.0020, 0.00099, seg=4) + np.array([xs, 0.0])
    metal += st.bend([frame_prism(oval_o, oval_i, 0.0007, origin=(0, 0, zt + 0.00025))])
    hole = st.bend([prism(oval_i * np.array([1.0, 1.0]), 0.0004, z0=zt - 0.0001)])
    return {'AccBeltBuckle': hard_mesh(metal, 'metal', bevel=0.0005, angle=35, outline_w=0.8),
            'AccBeltBuckleSlot': hard_mesh(hole, 'clothing_seam', bevel=0.0, outline=False)}


THIGH_TH = np.radians(36.0)


def thigh_buckles():
    """Watch-strap pin buckles on the two left-thigh straps: a heavy chrome
    C-bow on the outer side (its ends dive under the strap at the hinge), a
    long pin from a hole in the strap over the bow, a short strap end tucked
    under the bow and a flat tapered chrome keeper further in."""
    from hardsurf import sweep
    fn = G.body_subset(['gluteL', 'legL'])
    th_c = THIGH_TH
    bows, small, tails, holes = [], [], [], []
    hb = 0.0185                 # bow half height (outer centre line)
    for sc in O.STRAP_S:
        lv0 = O.strap_level(sc)
        lev = lambda T, Sv, lv0=lv0: lv0(T, Sv) + O.STRAP_T
        st = limb_strip(O.LEG_L, fn, sc, lev, th_c)
        sx = _dir_sign(st, fn, sc, lev, th_c, loft=O.LEG_L)     # +x*sx = outwards
        u0 = -0.012                                             # hinge position (outer = +)
        zb = 0.0016                                             # bow underside over the strap
        # C-bow: centre line from under the strap at the hinge, round the outside
        ctrl = [(u0 - 0.003, -hb + 0.001, -0.0024), (u0 + 0.004, -hb, zb), (u0 + 0.015, -hb, zb),
                (u0 + 0.0215, -hb + 0.0012, zb), (u0 + 0.0250, -hb + 0.0060, zb),
                (u0 + 0.0262, -0.0050, zb), (u0 + 0.0262, 0.0050, zb),
                (u0 + 0.0250, hb - 0.0060, zb), (u0 + 0.0215, hb - 0.0012, zb),
                (u0 + 0.015, hb, zb), (u0 + 0.004, hb, zb), (u0 - 0.003, hb - 0.001, -0.0024)]
        ctrl = np.array([(sx * u, y, z) for u, y, z in ctrl])
        Pc, _ = catmull(ctrl, 60)
        prof = np.array([(-0.0030, 0.0), (0.0030, 0.0), (0.0030, 0.0028), (0.0013, 0.0046),
                         (-0.0013, 0.0046), (-0.0030, 0.0028)])
        up = np.tile(np.array([0.0, 0.0, 1.0]), (len(Pc), 1))
        Vb, Fb = sweep(prof, Pc, up)
        C, R = st.frame(sx * (u0 + 0.012))
        Vb = Vb - np.array([sx * (u0 + 0.012), 0.0, 0.0])
        bows.append((place(Vb, C, R), Fb))
        # pin: from a hole near the hinge up onto the outer bar of the bow
        pa = np.array([sx * (u0 + 0.0035), 0.0, 0.0012])
        pb = np.array([sx * (u0 + 0.0280), 0.0, zb + 0.0049])
        path = np.array([pa + (pb - pa) * k for k in np.linspace(0, 1, 6)])
        Vp, Fp = sweep(chamfer_rect(0.0034, 0.0022, 0.0006), path,
                       np.tile(np.array([0.0, 0.0, 1.0]), (6, 1)))
        Vp[:, 2] -= Vp[:, 0] * 0.0       # (straight)
        small.append((place(Vp - np.array([sx * (u0 + 0.012), 0.0, 0.0]), C, R), Fp))
        holes += st.bend([prism(rounded_rect(0.0040, 0.0030, 0.0012, seg=3) +
                                np.array([sx * (u0 + 0.0040), 0.0]), 0.0003, z0=0.00005)])
        # short strap end tucked under the bow, 9 mm past its outer edge
        L = 0.030
        Vt, Ft = strap_mesh(L, O.STRAP_W - 0.0030, 0.0015, end='round', tip=0.006, du=0.003)
        Vt[:, 0] = sx * (Vt[:, 0] + u0 + 0.0060)
        Vt[:, 2] -= 0.0001
        tails.append((st(Vt), Ft))
        # flat tapered chrome keeper further in
        kx = sx * (u0 - 0.030)
        kv, kf = tapered_prism(chamfer_rect(0.0072, O.STRAP_W + 0.0034, 0.0012), 0.0021, 0.78,
                               z0=-0.0002)
        small += st.bend([(kv + np.array([kx, 0.0, 0.0]), kf)])
    return {'AccThighBuckles': hard_mesh(bows + small, 'chrome', bevel=0.0005, angle=35,
                                         outline_w=0.7),
            'AccThighStrapTails': hard_mesh(tails, 'acc_matte', bevel=0.0004, angle=40,
                                            outline_w=0.6),
            'AccThighBuckleHoles': hard_mesh(holes, 'clothing_seam', bevel=0.0, outline=False)}


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
    th_c = np.radians(-35.0)
    zf = lambda th: np.full_like(th, zm)
    st = torso_strip(O.top_fn(), zf, lev, th_c)
    sx = _dir_sign(st, O.top_fn(), zf, lev, th_c, torso=True)
    xc = -sx * 0.006                     # a little towards her right
    parts = [tapered_prism(chamfer_rect(0.024, 0.011, 0.0016) + np.array([xc, 0.0]), 0.0015, 0.94,
                           z0=-0.0002)]
    for k in range(4):
        y = -0.0036 + k * 0.0024
        parts.append(tapered_prism(chamfer_rect(0.0215, 0.0013, 0.0004) + np.array([xc, y]),
                                   0.0009, 0.80, z0=0.0012))
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


def hang_path(x0, x1, ztop, zend, amp, n=60):
    """Strap centre line: starts under the base belt at the back, follows the
    shorts over the buttock, then hangs; a gentle sideways S."""
    t = np.linspace(0.0, 1.0, n)
    zs = ztop + (zend - ztop) * t
    xs = x0 + (x1 - x0) * t + amp * np.sin(1.5 * np.pi * t)
    yb = np.array([back_surface_y(x, z, 0.0062) for x, z in zip(xs, zs)])
    y = np.maximum.accumulate(np.maximum(yb + 0.0006, yb[0]))
    for _ in range(6):
        y[1:-1] = np.maximum(y[1:-1], 0.5 * (y[:-2] + y[2:]))
    return np.stack([xs, y, zs], 1), t


STRAPS = [  # x top, x bottom, z top, z end, width, S amplitude, twist (deg)
    (-0.015, -0.012, 1.090, 0.585, 0.022, 0.006, 16.0),
    (0.004, 0.008, 1.088, 0.640, 0.016, -0.005, -12.0),
    (0.088, 0.104, 1.070, 0.600, 0.020, 0.006, 14.0),
    (0.070, 0.080, 1.076, 0.650, 0.016, -0.004, -18.0),
]


def hanging_straps():
    black, seam = [], []
    for x0, x1, zt, ze, w, amp, tw in STRAPS:
        P, t = hang_path(x0, x1, zt, ze, amp)
        a = np.radians(tw) * np.sin(np.pi * np.clip(1.3 * t - 0.15, 0, 1))
        N = np.stack([np.sin(a), -np.cos(a), np.zeros_like(a)], 1)
        st = Strip(P, N, P[0], np.array([1.0, 0.0, 0.0]))
        L = float(st.L[-1])
        down = 1.0 if st.u0 < 1e-9 else -1.0
        V, F = strap_mesh(L, w, 0.0022, end='flat', du=0.008)
        V[:, 0] *= down
        V[:, 2] -= 0.0011
        black.append((st(V), F))
        # keeper loop just under the belt, and a stitched end above the cut
        kv, kf = box((0.0070, w + 0.0030, 0.0026), origin=(down * 0.020, 0.0, 0.0014))
        black.append((st(kv), kf))
        sv, sf = box((0.0010, w - 0.004, 0.0004), origin=(down * (L - 0.012), 0.0, 0.0012))
        seam.append((st(sv), sf))
    return {'AccHangingStraps': hard_mesh(black, 'acc_matte', bevel=0.0004, angle=40,
                                          outline_w=0.7),
            'AccHangingStrapsSeam': hard_mesh(seam, 'acc_edge', bevel=0.0, outline=False)}


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
    out.update(goggles())
    out.update(arm_rings())
    out.update(belt_buckle())
    out.update(thigh_buckles())
    out.update(garter_buckle())
    out.update(bikini_clasp())
    out.update(leg_tabs())
    out.update(hanging_straps())
    out.update(hip_pouch())
    return out

"""Hair: a sculpted cap plus many tapered locks.

Each lock is a tube with a lens shaped cross section swept along a spline.
Locks are pushed out of a collider (skull + hair cap + body + coat) so they
rest on the surfaces below them, and their flat side faces that surface.
"""

import numpy as np

import sdf
from sdf import Grid, Loft, smin, smax, Ellipsoid, RoundCone
from meshutil import MeshData, catmull, loft_tube, merge
from rig import J, px, S
import body as B

HX = B.HX
HY = 0.012          # skull centre y
CAP = 0.011         # hair cap thickness over the skull


# ------------------------------------------------------------- colliders

_skull = B.skull()
_body = B.BodySDF()


def skull_d(P):
    return _skull(P)


def cap_d(P):
    """Outer surface of the hair cap (approximate)."""
    return _skull(P) - CAP


def collider(P):
    """Everything hair must stay outside of."""
    P = np.asarray(P, dtype=np.float64)
    d = cap_d(P)
    # body + coat thickness; the coat collar stands around the neck
    d = smin(d, _body(P) - 0.020, 0.02)
    return d


def push_out(pts, coll, margin, iters=6):
    pts = pts.copy()
    for _ in range(iters):
        d = coll(pts)
        need = margin - d
        if np.all(need <= 0):
            break
        g = sdf.gradient(coll, pts, 2e-4)
        pts += g * np.clip(need, 0, None)[:, None]
    return pts


def smooth_curve(pts, iters=3, keep=1):
    p = pts.copy()
    for _ in range(iters):
        q = p.copy()
        q[keep:-1] = 0.25 * p[keep - 1:-2] + 0.5 * p[keep:-1] + 0.25 * p[keep + 1:]
        p = q
    return p


def lens(ph):
    # flattened lens: sharp edges at the sides, slightly fuller on top
    c, s = np.cos(ph), np.sin(ph)
    return c, s * (1.0 if s > 0 else 0.7)


def lock(ctrl, w0, th0, n=28, coll=collider, margin_extra=0.002,
         wprof=None, tprof=None, rings=8, out_dir=None, push=True):
    """Build one lock.

    ctrl  : control points from root to tip
    w0    : half width at the root, th0 : half thickness
    wprof : function t -> width factor (default: taper to a point)
    """
    pts, tan = catmull(ctrl, n)
    t = np.linspace(0, 1, n)
    if wprof is None:
        wprof = lambda t: (1.0 - t ** 1.8) ** 0.8 * (0.85 + 0.3 * np.sin(np.pi * np.clip(t * 1.3, 0, 1)))
    if tprof is None:
        tprof = lambda t: (1.0 - t ** 2.0) ** 0.6 + 0.08
    w = w0 * wprof(t)
    th = th0 * tprof(t)
    if push:
        pts = push_out(pts, coll, th + margin_extra)
        pts = smooth_curve(pts, 2)
        pts = push_out(pts, coll, th + margin_extra, iters=3)
    # recompute tangents
    tan = np.gradient(pts, axis=0)
    tan /= np.maximum(np.linalg.norm(tan, axis=1, keepdims=True), 1e-9)
    if out_dir is None:
        outs = sdf.gradient(coll, pts, 2e-4)
    else:
        outs = np.tile(np.asarray(out_dir, dtype=float), (n, 1))
    # smooth the out vectors along the lock to avoid twisting
    for _ in range(4):
        outs[1:-1] = 0.25 * outs[:-2] + 0.5 * outs[1:-1] + 0.25 * outs[2:]
        outs /= np.linalg.norm(outs, axis=1, keepdims=True)
    w[-1] = 0.0004
    th[-1] = 0.0003
    V, F = loft_tube(pts, tan, outs, w, th, n_ring=rings, cap_start=True,
                     cap_end=False, shape=lens)
    # close the tip: collapse last ring
    return V, F


# ------------------------------------------------------------- the cap

def hair_cap():
    g = Grid([-0.075, -0.10, 1.46], [0.10, 0.13, 1.70], 0.0012)
    g.union(_skull)

    def shell(d, P):
        outer = d - CAP
        inner = -(d + 0.004)
        sh = np.maximum(outer, inner)
        x, y, z = P[..., 0] - HX, P[..., 1] - HY, P[..., 2]
        th = np.degrees(np.arctan2(x, -y))          # 0 = front, +-180 = back
        a = np.abs(th)

        def sstep(v, e0, e1):
            q = np.clip((v - e0) / (e1 - e0), 0, 1)
            return q * q * (3 - 2 * q)
        zcut = 1.618 - 0.105 * sstep(a, 35, 75) - 0.045 * sstep(a, 95, 150)
        mask = zcut - z
        return np.maximum(sh, mask)
    g.map(shell)
    v, f = g.mesh()
    return MeshData(v, f, mat='hair', decimate=26000, outline_w=0.8)


# ------------------------------------------------------------- lock specs

def P(x_px, y_px, depth):
    return px(x_px, y_px, depth)


def wave(ctrl, amp, freq=1.0, phase=0.0, axis=(1, 0, 0)):
    """Add a gentle lateral wave to control points (root untouched)."""
    ctrl = [np.asarray(c, dtype=float) for c in ctrl]
    n = len(ctrl)
    out = [ctrl[0]]
    for i in range(1, n):
        t = i / (n - 1)
        out.append(ctrl[i] + np.asarray(axis) * amp * np.sin(np.pi * freq * t + phase) * t)
    return out


PART = np.array([0.016, -0.012, 1.682])    # hair parting on the crown


def bangs():
    out = []
    specs = [
        # mid points (x, y, z) ..., tip px (x, y), tip depth, half width
        ([(-0.005, -0.066, 1.650), (-0.030, -0.086, 1.600)], (318, 128), -0.074, 0.017),
        ([(0.012, -0.073, 1.645), (0.004, -0.090, 1.590)], (346, 137), -0.090, 0.013),
        ([(-0.012, -0.072, 1.645)], (330, 113), -0.086, 0.013),
        ([(-0.040, -0.060, 1.640), (-0.058, -0.072, 1.590)], (308, 142), -0.056, 0.015),
        ([(0.040, -0.070, 1.645), (0.055, -0.080, 1.595)], (382, 126), -0.072, 0.016),
        ([(0.025, -0.075, 1.645)], (362, 113), -0.087, 0.012),
        ([(0.065, -0.055, 1.635), (0.078, -0.062, 1.585)], (396, 140), -0.046, 0.015),
        ([(0.035, -0.076, 1.640)], (356, 101), -0.084, 0.011),
        ([(-0.020, -0.074, 1.640)], (322, 101), -0.080, 0.012),
    ]
    for i, (mids, tip, d, w) in enumerate(specs):
        tip = P(tip[0], tip[1], d)
        root = PART + np.array([(-1) ** i * 0.004, 0.004 * (i % 3), 0.0])
        ctrl = [root] + [np.array(m) for m in mids] + [tip]
        out.append(lock(ctrl, w, 0.0042, n=28))
    return out


def crown_locks():
    """Locks radiating from the parting over the cap (gives the top its
    structure and volume)."""
    out = []
    for ph in np.linspace(-150, 150, 15):
        a = np.radians(ph)
        sa, ca = np.sin(a), -np.cos(a)      # 0 = front
        if abs(ph) < 40:
            continue
        p1 = np.array([HX + 0.050 * sa, HY + 0.060 * ca, 1.660])
        p2 = np.array([HX + 0.075 * sa, HY + 0.088 * ca, 1.600])
        p3 = np.array([HX + 0.083 * sa, HY + 0.098 * ca, 1.540])
        w = 0.024 if abs(ph) > 90 else 0.020
        out.append(lock([PART, p1, p2, p3], w, 0.0055, n=22,
                        wprof=lambda t: (1 - t ** 2.5) ** 0.7 + 0.05))
    return out


def side_locks():
    out = []
    # her right (viewer left)
    out.append(lock(wave([(-0.030, -0.030, 1.668), (-0.058, -0.064, 1.610),
                          (-0.068, -0.062, 1.540), P(305, 152, -0.052), P(299, 200, -0.068),
                          P(292, 265, -0.100), P(288, 340, -0.088), P(291, 420, -0.072),
                          P(297, 470, -0.062)], 0.006, 2.0),
                    0.017, 0.0050, n=44))
    out.append(lock(wave([(-0.042, -0.012, 1.668), (-0.070, -0.045, 1.600),
                          (-0.076, -0.040, 1.530), P(300, 175, -0.035), P(289, 230, -0.045),
                          P(276, 300, -0.040), P(262, 360, -0.035), P(255, 410, -0.030)],
                         0.008, 1.5), 0.016, 0.0048, n=40))
    out.append(lock(wave([(-0.050, 0.010, 1.665), (-0.078, -0.010, 1.590),
                          (-0.085, 0.000, 1.500), P(290, 210, 0.010), P(270, 260, 0.010),
                          P(248, 300, 0.000), P(232, 340, -0.010), P(222, 375, -0.015)],
                         0.010, 1.5, 0.5), 0.016, 0.0048, n=40))
    # her left (viewer right)
    out.append(lock(wave([(0.055, -0.030, 1.668), (0.080, -0.062, 1.610),
                          (0.088, -0.058, 1.540), P(398, 152, -0.048), P(404, 200, -0.052),
                          P(411, 260, -0.064), P(426, 330, -0.054), P(440, 400, -0.044),
                          P(452, 452, -0.034)], 0.006, 2.0, 1.0),
                    0.017, 0.0050, n=44))
    out.append(lock(wave([(0.064, -0.012, 1.668), (0.090, -0.045, 1.600),
                          (0.096, -0.040, 1.530), P(402, 175, -0.030), P(414, 230, -0.034),
                          P(430, 290, -0.026), P(448, 350, -0.018), P(463, 420, -0.010),
                          P(471, 472, -0.005)], 0.008, 1.5), 0.016, 0.0048, n=44))
    out.append(lock(wave([(0.070, 0.010, 1.665), (0.098, -0.010, 1.590),
                          (0.104, 0.000, 1.500), P(412, 210, 0.012), P(432, 260, 0.012),
                          P(458, 320, 0.008), P(478, 380, 0.004), P(490, 440, 0.000)],
                         0.010, 1.5, 0.5), 0.016, 0.0048, n=40))
    return out


def back_locks():
    out = []
    phis = np.linspace(-100, 100, 15)
    for i, ph in enumerate(phis):
        a = np.radians(ph)
        sa, ca = np.sin(a), np.cos(a)
        c = abs(ph) / 100.0
        tipz = 0.70 + 0.30 * c ** 1.6 + 0.04 * np.sin(i * 2.3)
        xs = HX + np.sin(a) * (0.08 + 0.13 * c)
        root = np.array([HX + 0.040 * sa, HY + 0.050 * ca, 1.672])
        p1 = np.array([HX + 0.072 * sa, HY + 0.088 * ca, 1.625])
        p2 = np.array([HX + 0.082 * sa, HY + 0.096 * ca + 0.004, 1.535])
        p3 = np.array([HX + 0.095 * sa * 1.1, 0.085 + 0.03 * ca, 1.415])
        p4 = np.array([(p3[0] + xs) * 0.5, 0.100 + 0.02 * ca, 1.200])
        p5 = np.array([xs, 0.110 + 0.02 * ca, (1.20 + tipz) / 2])
        tip = np.array([xs * 1.06, 0.115 + 0.02 * ca, tipz])
        ctrl = wave([root, p1, p2, p3, p4, p5, tip], 0.010 * (0.5 + c), 1.2, i * 0.9)
        w = 0.034 if abs(ph) < 85 else 0.026
        out.append(lock(ctrl, w, 0.0070, n=48, rings=10))
    for i, ph in enumerate([-70, -40, -10, 20, 50, 80]):
        a = np.radians(ph)
        sa, ca = np.sin(a), np.cos(a)
        root = np.array([HX + 0.03 * sa, HY + 0.05 * ca, 1.665])
        p1 = np.array([HX + 0.065 * sa, HY + 0.085 * ca, 1.590])
        p2 = np.array([HX + 0.072 * sa, HY + 0.082 * ca, 1.500])
        p3 = np.array([HX + 0.09 * sa, 0.080, 1.380])
        tip = np.array([HX + 0.14 * sa, 0.092, 1.08 - 0.05 * (i % 2)])
        out.append(lock([root, p1, p2, p3, tip], 0.034, 0.0070, n=32))
    return out


def side_tufts():
    """The little pointed tufts sticking out at both sides of the head."""
    out = []
    for s in (-1, 1):
        root = np.array([HX + s * 0.055, 0.0, 1.600])
        mid = np.array([HX + s * 0.080, -0.004, 1.585])
        tip = np.array([HX + s * 0.100, -0.006, 1.560])
        out.append(lock([root, mid, tip], 0.010, 0.004, n=12,
                        wprof=lambda t: (1 - t) ** 0.9 + 0.02))
    return out


def crown():
    """Ahoge spikes on top."""
    out = []
    specs = [
        [(-0.010, 0.010, 1.665), (-0.022, 0.012, 1.690), P(322, 43, 0.012)],
        [(0.008, 0.012, 1.665), (0.010, 0.012, 1.695), P(352, 40, 0.014)],
        [(0.020, 0.012, 1.665), (0.026, 0.012, 1.685), P(366, 52, 0.012)],
    ]
    for c in specs:
        out.append(lock(c, 0.006, 0.003, n=12, push=False,
                        wprof=lambda t: (1 - t) ** 1.1 + 0.02, out_dir=(0, -1, 0)))
    return out


def ornament():
    """Red crescent hair ornament standing on top of the head."""
    ctrl = [P(334, 52, 0.016), P(333, 42, 0.016), P(338, 33, 0.016),
            P(347, 27, 0.016), P(358, 24, 0.016)]
    V, F = lock(ctrl, 0.0075, 0.0028, n=20, push=False,
                wprof=lambda t: np.sin(np.pi * np.clip(t * 0.85 + 0.15, 0, 1)) ** 0.8 + 0.02,
                out_dir=(0, -1, 0))
    return V, F


def ribbons():
    """Red ribbons tied to the hair at both sides of the face."""
    out = []
    for s, xs in ((-1, (301, 304)), (1, (394, 392))):
        top = P(xs[0], 126, 0.0)
        bot = P(xs[1], 156, 0.0)
        top[1] = bot[1] = -0.010
        mid = (top + bot) / 2 + np.array([s * 0.004, 0, 0])
        V, F = lock([top, mid, bot], 0.0055, 0.0020, n=10, push=True,
                    wprof=lambda t: np.ones_like(t) * 0.9, margin_extra=0.006)
        out.append((V, F))
    return out


def as_mesh(vf_list, mat, subsurf=1, **kw):
    ms = [MeshData(V, F, mat=mat, subsurf=subsurf, **kw) for V, F in vf_list]
    m = merge(ms)
    m.props = {'recalc': True}
    return m


def build():
    objs = {}
    objs['HairCap'] = hair_cap()
    objs['HairBangs'] = as_mesh(bangs() + side_tufts() + crown(), 'hair', outline_w=0.7)
    objs['HairCrown'] = as_mesh(crown_locks(), 'hair', outline_w=0.7)
    objs['HairSide'] = as_mesh(side_locks(), 'hair', outline_w=0.8)
    objs['HairBack'] = as_mesh(back_locks(), 'hair', outline_w=1.0)
    objs['HairOrnament'] = as_mesh([ornament()], 'red', outline_w=0.7)
    objs['HairRibbons'] = as_mesh(ribbons(), 'red', outline_w=0.6)
    return objs

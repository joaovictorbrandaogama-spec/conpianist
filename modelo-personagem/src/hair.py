"""Hair: high ponytail, pulled-back crown, bangs, long side locks.

Design taken from the official art and in-game frames of Alpha (PGR):
the hair is pulled smoothly from the temples and the nape up to a very high
ponytail tie at the back of the crown, where the red crescent ornament and a
small white loop stand up.  The ponytail is voluminous and falls down the
back to about the top of the thighs, fading to pink and red at the tips.
Asymmetric bangs fall over the forehead, long side locks hang in front of
the shoulders and split into thin pointed strands, white fin clips stick out
backwards above the ears and narrow red ribbons hang behind them.

Every lock is a "crescent" clump: convex outer arc, flatter inner arc, razor
sharp side edges, pointed tip.  Locks are pushed out of a collider (skull,
cap, body + coat) so they rest on what lies below them.  Their shading
normals are blended with the normal of the surface they lie on, so a group
of locks shades as one mass instead of a bundle of tubes.
"""

import numpy as np

import sdf
from sdf import Grid, smin
from meshutil import MeshData, catmull, merge
from rig import J, px
import body as B
import hardsurf as H

HX = B.HX
HY = 0.012          # skull centre y
CAP = 0.010         # hair cap thickness over the skull
TIE = np.array([HX + 0.002, 0.062, 1.664])   # ponytail tie (back of the crown)


# ------------------------------------------------------------- colliders

_skull = B.skull()
_body = B.BodySDF()


def cap_d(P):
    return _skull(P) - CAP


def collider(P):
    """Everything hair must stay outside of (skull + cap, body + coat)."""
    P = np.asarray(P, dtype=np.float64)
    return smin(cap_d(P), _body(P) - 0.020, 0.02)


def push_out(pts, coll, margin, iters=6):
    pts = pts.copy()
    margin = np.broadcast_to(margin, (len(pts),))
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


# ------------------------------------------------------------- lock mesher

def crescent_mesh(pts, tan, outs, w, h_out, h_in, n_ring=12, mass=0.6):
    """Lock with a crescent cross section.  Returns (V, F, UV, N).

    UV: u runs around the section (outer arc 0..0.5, inner 0.5..1), v is the
    relative position from root (0) to tip (1).  N are shading normals: the
    outer arc blends its own normal with the surface normal below the lock
    (``mass``) so neighbouring locks share one light/shadow shape."""
    n = len(pts)
    phis = np.linspace(0, 2 * np.pi, n_ring + 1)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    v = np.concatenate([[0], np.cumsum(seg)])
    v = v / max(v[-1], 1e-9)
    V, UV, NN = [], [], []
    for i in range(n):
        T = tan[i]
        Nn = outs[i] - T * np.dot(outs[i], T)
        Nn /= max(np.linalg.norm(Nn), 1e-9)
        Bv = np.cross(T, Nn)
        for k, ph in enumerate(phis):
            c, s = np.cos(ph), np.sin(ph)
            if s >= 0:
                y = s * h_out[i]
                ng = Bv * c * h_out[i] + Nn * s * max(w[i], 1e-5)
                ng /= max(np.linalg.norm(ng), 1e-9)
                nn = ng * (1 - mass) + Nn * mass
            else:
                y = -s * h_in[i]
                ng = Bv * c * h_in[i] - Nn * (-s) * max(w[i], 1e-5)
                ng /= max(np.linalg.norm(ng), 1e-9)
                nn = ng
            V.append(pts[i] + Bv * w[i] * c + Nn * y)
            UV.append((k / n_ring, v[i]))
            NN.append(nn / max(np.linalg.norm(nn), 1e-9))
    R = n_ring + 1
    F = []
    for i in range(n - 1):
        for k in range(n_ring):
            a = i * R + k
            F.append([a, (i + 1) * R + k, (i + 1) * R + k + 1, a + 1])
    V.append(pts[0] - tan[0] * 0.0004)
    UV.append((0.25, 0.0))
    NN.append(-tan[0])
    ci = len(V) - 1
    for k in range(n_ring):
        F.append([ci, k, k + 1])
    return np.array(V), F, np.array(UV), np.array(NN)


def default_w(t):
    return (1.0 - t) ** 0.65 * (1.0 + 0.18 * np.sin(np.pi * t))


def default_th(t):
    return (1.0 - t) ** 0.9 + 0.03


def lock(ctrl, w0, th0, n=32, coll=collider, margin=0.0012, wprof=None, tprof=None,
         rings=12, out_dir=None, push=True, cup=0.55, mass=0.6, twist=0.0):
    """One crescent lock along a spline through ``ctrl`` (root -> tip).

    w0: half width at the root, th0: outer bulge at the root, cup: inner
    arc bulge relative to the outer one (0 = flat inner face)."""
    pts, tan = catmull(ctrl, n)
    t = np.linspace(0, 1, n)
    w = w0 * (wprof or default_w)(t)
    th = th0 * (tprof or default_th)(t)
    if push:
        pts = push_out(pts, coll, th * 0.5 + margin)
        pts = smooth_curve(pts, 2)
        pts = push_out(pts, coll, th * 0.5 + margin, iters=3)
    tan = np.gradient(pts, axis=0)
    tan /= np.maximum(np.linalg.norm(tan, axis=1, keepdims=True), 1e-9)
    if out_dir is None:
        outs = sdf.gradient(coll, pts, 2e-4)
    else:
        outs = np.tile(np.asarray(out_dir, dtype=float), (n, 1))
    for _ in range(6):
        outs[1:-1] = 0.25 * outs[:-2] + 0.5 * outs[1:-1] + 0.25 * outs[2:]
        outs /= np.linalg.norm(outs, axis=1, keepdims=True)
    if twist:
        # rotate the out vector around the tangent towards the tip
        for i in range(n):
            a = twist * t[i] ** 1.5
            b = np.cross(tan[i], outs[i])
            outs[i] = outs[i] * np.cos(a) + b * np.sin(a)
    w[-1] = 0.0002
    th[-1] = 0.0001
    return crescent_mesh(pts, tan, outs, w, th, th * cup, n_ring=rings, mass=mass)


def P(x_px, y_px, depth):
    return px(x_px, y_px, depth)


def wave(ctrl, amp, freq=1.0, phase=0.0, axis=(1, 0, 0)):
    """Gentle lateral wave on the control points (root untouched)."""
    ctrl = [np.asarray(c, dtype=float) for c in ctrl]
    n = len(ctrl)
    out = [ctrl[0]]
    for i in range(1, n):
        t = i / (n - 1)
        out.append(ctrl[i] + np.asarray(axis) * amp * np.sin(np.pi * freq * t + phase) * t)
    return out


def on_cap(x, y, z, lift=0.0):
    """Project a point radially (from the skull centre) onto the cap surface."""
    c = np.array([HX, HY, 1.565])
    p = np.array([x, y, z], dtype=float)
    d = p - c
    d /= np.linalg.norm(d)
    for r in np.linspace(0.05, 0.16, 400):
        q = c + d * r
        if cap_d(q[None])[0] > lift:
            return q
    return p


# ------------------------------------------------------------- the cap

def hair_cap():
    """Dark under-layer: the skull offset, open over the face."""
    g = Grid([-0.075, -0.10, 1.46], [0.10, 0.13, 1.70], 0.0012)
    g.union(_skull)

    def shell(d, P):
        outer = d - CAP
        inner = -(d + 0.004)
        sh = np.maximum(outer, inner)
        x, y, z = P[..., 0] - HX, P[..., 1] - HY, P[..., 2]
        th = np.degrees(np.arctan2(x, -y))
        a = np.abs(th)

        def sstep(v, e0, e1):
            q = np.clip((v - e0) / (e1 - e0), 0, 1)
            return q * q * (3 - 2 * q)
        zcut = 1.618 - 0.105 * sstep(a, 35, 75) - 0.045 * sstep(a, 95, 150)
        return np.maximum(sh, zcut - z)
    g.map(shell)
    v, f = g.mesh()
    return MeshData(v, f, mat='hair_dark', decimate=20000, outline_w=0.8,
                    props={'normals': 'smooth'})


# ------------------------------------------------------------- locks

def pulled_locks():
    """Hair pulled from the hairline (temples, sides, nape) up to the tie."""
    out = []
    starts = []
    for a in np.linspace(-150, 150, 17):          # around the head, 0 = front
        if abs(a) < 30:
            continue
        r = np.radians(a)
        # hairline height: high at the temples, low at the nape
        z = 1.600 - 0.050 * min(abs(a) - 30, 80) / 80 - 0.050 * max(abs(a) - 110, 0) / 40
        starts.append((r, z))
    for r, z in starts:
        sx, sy = np.sin(r), -np.cos(r)
        p0 = on_cap(HX + 0.08 * sx, HY + 0.09 * sy, z, lift=0.0005)
        mid = (p0 + TIE) / 2 + np.array([0, 0, 0.012])
        mid = on_cap(*mid, lift=0.0015)
        end = TIE + (p0 - TIE) * 0.08
        out.append(lock([p0, mid, end], 0.024, 0.0034, n=20, cup=0.3, mass=0.75,
                        wprof=lambda t: 0.75 + 0.35 * np.sin(np.pi * np.clip(t, 0, 1)) * (1 - t) + 0.1,
                        tprof=lambda t: 0.7 + 0.3 * np.sin(np.pi * t)))
    return out


def ponytail():
    """Voluminous ponytail from the tie down the back to the upper thighs."""
    out = []
    n_cl = 13
    for i in range(n_cl):
        f = (i - (n_cl - 1) / 2) / ((n_cl - 1) / 2)       # -1 .. 1 across
        ang = f * 1.25
        root = TIE + np.array([0.016 * np.sin(ang), 0.010 + 0.008 * np.cos(ang), 0.004])
        up = TIE + np.array([0.030 * np.sin(ang), 0.042, -0.004 - 0.004 * abs(f)])
        over = np.array([HX + 0.052 * np.sin(ang), 0.118, 1.605])
        nape = np.array([HX + 0.070 * np.sin(ang), 0.135, 1.480])
        back = np.array([HX + 0.110 * f, 0.140, 1.300])
        low = np.array([HX + 0.150 * f, 0.150, 1.080])
        tipz = 0.86 + 0.13 * abs(f) ** 1.4 + 0.035 * np.sin(i * 2.7)
        tip = np.array([HX + 0.175 * f + 0.012 * np.sin(i * 1.9), 0.150, tipz])
        ctrl = wave([root, up, over, nape, back, low, tip], 0.008, 1.3, i * 0.8)
        w = 0.030 - 0.006 * abs(f)
        out.append(lock(ctrl, w, 0.0085, n=64, rings=14, cup=0.5, mass=0.65,
                        twist=0.25 * f, margin=0.004))
    # inner, darker volume layer (shorter)
    for i, f in enumerate(np.linspace(-0.8, 0.8, 6)):
        root = TIE + np.array([0.012 * f, 0.008, 0.0])
        up = TIE + np.array([0.020 * f, 0.036, -0.006])
        over = np.array([HX + 0.035 * f, 0.108, 1.590])
        back = np.array([HX + 0.070 * f, 0.120, 1.380])
        tip = np.array([HX + 0.110 * f, 0.128, 1.02 + 0.04 * (i % 2)])
        out.append(lock([root, up, over, back, tip], 0.034, 0.010, n=48, cup=0.5,
                        mass=0.7, margin=0.002))
    # a few loose strands swinging out sideways
    for s, (dx, tz) in ((-1, (0.20, 1.02)), (1, (0.21, 0.98)), (-1, (0.23, 1.10))):
        root = TIE + np.array([0.012 * s, 0.012, 0.002])
        up = TIE + np.array([0.030 * s, 0.045, -0.004])
        over = np.array([HX + 0.075 * s, 0.11, 1.58])
        mid = np.array([HX + 0.14 * s, 0.10, 1.30])
        tip = np.array([HX + dx * s, 0.07, tz])
        out.append(lock(wave([root, up, over, mid, tip], 0.01, 1.5), 0.010, 0.004, n=48,
                        cup=0.4, mass=0.5, margin=0.004))
    return out


def bangs():
    """Asymmetric bangs: four main clumps and thinner wisps."""
    out = []
    specs = [
        # root (x, y, z), mids..., tip px, tip depth, half width
        ((0.006, -0.050, 1.662), [(-0.006, -0.074, 1.630), (-0.026, -0.088, 1.585)], (318, 129), -0.074, 0.020),
        ((0.016, -0.054, 1.660), [(0.012, -0.080, 1.625), (0.004, -0.092, 1.575)], (346, 138), -0.090, 0.016),
        ((0.032, -0.050, 1.660), [(0.044, -0.078, 1.625), (0.056, -0.084, 1.580)], (383, 127), -0.072, 0.019),
        ((-0.012, -0.040, 1.660), [(-0.040, -0.066, 1.630), (-0.058, -0.074, 1.580)], (307, 145), -0.054, 0.017),
        # wisps
        ((0.048, -0.040, 1.658), [(0.068, -0.062, 1.625), (0.080, -0.066, 1.580)], (396, 141), -0.046, 0.011),
        ((0.000, -0.056, 1.662), [(-0.016, -0.080, 1.625)], (330, 112), -0.088, 0.009),
        ((0.024, -0.056, 1.662), [(0.026, -0.082, 1.625)], (362, 113), -0.088, 0.009),
        ((0.010, -0.058, 1.664), [(0.016, -0.082, 1.630)], (352, 101), -0.086, 0.008),
        ((-0.004, -0.052, 1.664), [(-0.024, -0.078, 1.630)], (322, 102), -0.082, 0.008),
    ]
    for root, mids, tip_px, d, w in specs:
        tip = P(tip_px[0], tip_px[1], d)
        ctrl = [np.array(root)] + [np.array(m) for m in mids] + [tip]
        out.append(lock(ctrl, w, 0.0045, n=34, cup=0.55, mass=0.55))
    return out


def side_locks():
    """Long locks in front of the ears that split into pointed strands."""
    out = []
    for side in (-1, 1):
        sx = side
        top = [np.array([HX + 0.040 * sx, -0.040, 1.655]),
               np.array([HX + 0.064 * sx, -0.058, 1.600]),
               np.array([HX + 0.072 * sx, -0.054, 1.530])]
        if side < 0:
            mids = [P(305, 152, -0.052), P(299, 205, -0.068), P(292, 265, -0.100)]
            tips = [(P(288, 350, -0.090), P(292, 430, -0.074), P(297, 472, -0.064)),
                    (P(282, 345, -0.085), P(279, 410, -0.068), P(283, 452, -0.060)),
                    (P(296, 340, -0.092), P(303, 395, -0.080), P(309, 430, -0.072)),
                    (P(276, 330, -0.080), P(268, 380, -0.064), P(266, 405, -0.058))]
        else:
            mids = [P(398, 152, -0.048), P(404, 205, -0.052), P(412, 262, -0.064)]
            tips = [(P(428, 335, -0.054), P(442, 405, -0.044), P(453, 455, -0.034)),
                    (P(420, 330, -0.056), P(430, 390, -0.048), P(436, 428, -0.040)),
                    (P(436, 325, -0.050), P(452, 380, -0.040), P(462, 418, -0.032)),
                    (P(414, 320, -0.058), P(418, 370, -0.052), P(420, 398, -0.048))]
        widths = [0.011, 0.009, 0.008, 0.007]
        for k, (a, b, c) in enumerate(tips):
            off = np.array([sx * 0.003 * (k - 1.5), 0.0015 * k, 0])
            ctrl = [p + off * (j / 6) for j, p in enumerate(top + mids)] + [a, b, c]
            out.append(lock(wave(ctrl, 0.004, 2.0, k), widths[k], 0.0042, n=56,
                            cup=0.5, mass=0.55, twist=0.4 * sx))
        # a wider outer layer behind them (behind the ear down the shoulder)
        ctrl = [np.array([HX + 0.055 * sx, 0.000, 1.655]), np.array([HX + 0.080 * sx, -0.010, 1.590]),
                np.array([HX + 0.088 * sx, -0.005, 1.500]),
                P(300 if side < 0 else 402, 190, 0.00), P(290 if side < 0 else 414, 240, 0.0),
                P(282 if side < 0 else 426, 300, -0.005)]
        out.append(lock(ctrl, 0.016, 0.005, n=40, cup=0.5, mass=0.6))
    return out


# ------------------------------------------------------------- accessories

def fin_clips():
    """White angular fin clips above and behind the ears, pointing back."""
    items = []
    for s in (-1, 1):
        base = np.array([HX + 0.070 * s, 0.006, 1.588])
        d = H.normalize(np.array([0.42 * s, 0.84, 0.34]))
        # wedge outline in its own plane: base width 0.020, length 0.056
        poly = np.array([(0.0, -0.010), (0.056, -0.0015), (0.058, 0.001), (0.0, 0.010)])
        R = H.frame_from(x=d, z=np.array([s * 1.0, -0.25, 0.10]))
        items.append(H.prism(poly, 0.005, origin=base, R=R))
    return H.hard_mesh(items, 'decal_white', bevel=0.0006, outline_w=0.6)


def ribbons():
    """Narrow stiff red ribbons hanging behind the fins to collar level."""
    items = []
    for s in (-1, 1):
        x = HX + 0.083 * s
        path = np.array([[x, -0.004, 1.572], [x + 0.002 * s, -0.008, 1.52], [x + 0.004 * s, -0.010, 1.468]])
        prof = H.rounded_rect(0.016, 0.0024, 0.0008, seg=2)
        items.append(H.sweep(prof, path, up=np.array([s * 1.0, 0.0, 0.0])))
    return H.hard_mesh(items, 'red', bevel=0.0003, outline_w=0.5)


def ornament():
    """Flat blade-like red crescent rising from the ponytail tie.

    Seen from the front (reference px (333-340, 50) -> tip (358, 24)) it is
    a sickle about 5 cm tall, ~1.2 cm wide at the middle, curving up and to
    her left with the convex side outwards."""
    t = np.linspace(0, 1, 40)
    p0, p1, p2 = np.array([0.0, 0.0]), np.array([-0.012, 0.040]), np.array([0.042, 0.064])
    c = ((1 - t) ** 2)[:, None] * p0 + (2 * (1 - t) * t)[:, None] * p1 + (t ** 2)[:, None] * p2
    d = np.gradient(c, axis=0)
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    nrm = np.stack([-d[:, 1], d[:, 0]], axis=1)
    w = 0.0160 * np.sin(np.pi * (0.18 + 0.82 * t)) ** 0.8 * (1 - t) ** 0.25 + 0.0003
    # convex (outer) side wider than the inner one: a sickle, not a lens
    left = c + nrm * (w * 0.65)[:, None]
    right = c - nrm * (w * 0.35)[:, None]
    poly = np.concatenate([right, left[::-1]])
    R = H.frame_from(x=H.normalize(np.array([1.0, 0.18, 0.0])), y=np.array([0.0, 0.0, 1.0]))
    base = np.array([HX - 0.027, TIE[1] - 0.012, TIE[2] + 0.004])
    v, f = H.prism(poly, 0.0042, origin=base, R=R)
    return H.hard_mesh([(v, f)], 'red', bevel=0.0006, outline_w=0.6)


def tie():
    """Small white spiky tufts standing up at the ponytail tie."""
    out = []
    for dx, dy, h, w in ((-0.016, 0.004, 0.030, 0.006), (-0.004, -0.002, 0.040, 0.007),
                         (0.012, 0.004, 0.026, 0.005), (0.020, 0.010, 0.018, 0.004)):
        sp = [TIE + np.array([dx * 0.4, dy, -0.002]), TIE + np.array([dx * 0.8, dy - 0.004, h * 0.55]),
              TIE + np.array([dx * 1.3, dy - 0.006, h])]
        out.append(lock(sp, w, 0.0024, n=14, push=False, out_dir=(0, -1, 0), cup=0.25,
                        wprof=lambda t: (1 - t) ** 1.1 + 0.02, mass=0.3))
    return out


# ------------------------------------------------------------- assembly

def as_mesh(items, mat, **kw):
    ms, uvs, nrm = [], [], []
    for V, F, UV, N in items:
        ms.append(MeshData(V, F, mat=mat, **kw))
        uvs.append(UV)
        nrm.append(N)
    m = merge(ms)
    m.uv = np.concatenate(uvs)
    m.normals = np.concatenate(nrm)
    return m


def build():
    objs = {}
    objs['HairCap'] = hair_cap()
    objs['HairCrown'] = as_mesh(pulled_locks(), 'hair', outline_w=0.6)
    objs['HairBangs'] = as_mesh(bangs() + tie(), 'hair', outline_w=0.7)
    objs['HairSide'] = as_mesh(side_locks(), 'hair', outline_w=0.7)
    objs['HairTail'] = as_mesh(ponytail(), 'hair_tail', outline_w=0.9)
    objs['HairOrnament'] = ornament()
    objs['HairRibbons'] = ribbons()
    objs['HairClips'] = fin_clips()
    return objs

"""Clothing built as layered shells over the body SDF.

Most garments are ``offset band of the body SDF  ∩  region mask``.  Regions
are traced on the reference picture (front projection) or given by planes
and angles.  Each coloured region is its own closed shell so materials stay
crisp after decimation.
"""

import numpy as np

import sdf
from sdf import (Grid, smin, smax, Box, Torus, Ellipsoid, RoundCone, Cylinder,
                 euler, normalize, loft_radius, v3)
from meshutil import MeshData, polygon_sd, merge, clip_mesh, grid_surface
from rig import J, px, S, PX0, PY0, lerp
import body as B

_TORSO = B.torso()


def P2M(pts):
    """Reference pixels -> model (x, z) pairs."""
    return [((x - PX0) * S, (PY0 - y) * S) for x, y in pts]


def sstep(v, e0, e1):
    q = np.clip((v - e0) / (e1 - e0), 0, 1)
    return q * q * (3 - 2 * q)


# ------------------------------------------------------------ helpers

def body_parts(names=None):
    """Subset of the body SDF parts (by index groups)."""
    parts = B.body_sdf_parts()
    return parts


def region_grid(lo, hi, h, parts=None):
    g = Grid(lo, hi, h)
    for prim, k in (parts if parts is not None else B.body_sdf_parts()):
        g.union(prim, k)
    return g


def band(inner, outer):
    return lambda d: np.maximum(inner - d, d - outer)


def piece(g, inner, outer, mask, mat, decimate=0, shell_mat=None, **kw):
    """Garment layer between offsets [inner, outer] over the field in ``g``,
    restricted to mask(P) < 0.

    The iso-surface at ``inner`` is extracted, clipped exactly along the
    mask boundary and given its thickness later by a Solidify modifier in
    Blender (outward).  ``shell_mat`` colours the outer side differently
    from the inner one (e.g. coat outside / lining inside)."""
    surf = max(inner, 0.0004)
    thick = max(outer - surf, 0.0008)
    v, f = g.mesh(level=surf)
    if len(f) == 0:
        print('warning: empty piece', mat)
        return MeshData(v, f, mat=mat)
    v, f = clip_mesh(v, f, mask(v))
    if len(f) == 0:
        print('warning: empty piece after clip', mat)
    props = {'solidify': thick}
    if shell_mat:
        props['shell_mat'] = shell_mat
    if decimate:
        decimate = int(decimate * 0.6)
    return MeshData(v, f, mat=mat, decimate=decimate, props=props, **kw)


def front_poly(poly_px, ycut=0.0, rot=None):
    poly = P2M(poly_px)

    def m(P):
        d = polygon_sd(P[..., 0], P[..., 2], poly)
        y = P[..., 1]
        if rot is not None:
            # "front" measured in the rotated torso frame
            cx = _TORSO.prof('cx', P[..., 2])
            cy = _TORSO.prof('cy', P[..., 2])
            r = np.radians(_TORSO.prof('rot', P[..., 2]))
            y = -(P[..., 0] - cx) * np.sin(r) + (P[..., 1] - cy) * np.cos(r)
        return np.maximum(d, y - ycut)
    return m


def slab(n, p0, half):
    n = normalize(n)
    p0 = v3(p0)
    return lambda P: np.abs((P - p0) @ n) - half


def inter(*ms):
    def m(P):
        d = ms[0](P)
        for f in ms[1:]:
            d = np.maximum(d, f(P))
        return d
    return m


def union(*ms):
    def m(P):
        d = ms[0](P)
        for f in ms[1:]:
            d = np.minimum(d, f(P))
        return d
    return m


def minus(a, b):
    return lambda P: np.maximum(a(P), -b(P))


def zrange(z0, z1):
    return lambda P: np.maximum(z0 - P[..., 2], P[..., 2] - z1)


def surface_point(fn, x, z, y0=-0.4, y1=0.3, offset=0.0):
    """First point along +Y (from the front) where fn < offset."""
    ys = np.linspace(y0, y1, 2000)
    Pq = np.stack([np.full_like(ys, x), ys, np.full_like(ys, z)], axis=1)
    d = fn(Pq) - offset
    i = int(np.argmax(d < 0))
    return np.array([x, ys[i], z])


_BODY = B.BodySDF()


def body_fn(P):
    return _BODY(np.asarray(P, dtype=np.float64))


def limb_local(loft, P):
    """Local coordinates (x, y, s) of P in a limb loft frame; s = distance
    down the limb from its top joint."""
    q = (P - loft.origin) @ loft.R
    return q[..., 0], q[..., 1], -q[..., 2]


def oriented_box(c, size, n, up, rad=0.001):
    """Box centred at c, size (w, h, d) with its depth along normal n and
    height along ``up``."""
    n = normalize(n)
    up = normalize(v3(up) - n * np.dot(up, n))
    side = np.cross(up, n)
    R = np.stack([side, up, n], axis=1)
    return Box(c, np.asarray(size) / 2, R, rad)


def sdf_mesh(prims, lo, hi, h, mat, k=0.0, decimate=0, ops=None, **kw):
    g = Grid(lo, hi, h)
    for p in prims:
        g.union(p, k)
    if ops:
        for op in ops:
            op(g)
    v, f = g.mesh()
    return MeshData(v, f, mat=mat, decimate=decimate, **kw)


# ------------------------------------------------------------ bikini

def bikini():
    g = region_grid([-0.15, -0.14, 1.20], [0.13, 0.10, 1.42], 0.001)
    out = {}
    cupL = [(350, 211), (360, 222), (368, 236), (372, 250), (371, 263), (322, 264),
            (326, 246), (334, 229), (343, 217)]
    cupR = [(297, 220), (306, 236), (313, 250), (318, 263), (281, 264), (279, 250),
            (283, 236), (290, 226)]
    cups = union(front_poly(cupL, -0.015), front_poly(cupR, 0.03))
    bandz = zrange((PY0 - 268) * S, (PY0 - 252) * S)
    out['BikiniTop'] = piece(g, -0.0015, 0.0035, union(cups, bandz), 'black',
                             decimate=16000)
    trim = zrange((PY0 - 268) * S, (PY0 - 264) * S)
    out['BikiniTrim'] = piece(g, -0.0015, 0.0045, trim, 'white', decimate=5000,
                              outline_w=0.6)
    # little clasp under the right cup
    c = surface_point(body_fn, (318 - PX0) * S, (PY0 - 259) * S, offset=0.004)
    clasp = oriented_box(c, (0.012, 0.008, 0.004), (0, -1, 0), (0, 0, 1), 0.001)
    pass  # moved to accessories.py
    return out


# ------------------------------------------------------------ hips: shorts, belt

BELT_K = 0.216


def belt_z(x):
    return 1.075 + BELT_K * (x + 0.009)


def hem_z(x):
    xr = np.clip(x, -0.3, -0.02)
    zr = 0.944 + (-0.02 - xr) * 0.3
    t = np.clip((x + 0.02) / 0.05, 0, 1)
    return zr * (1 - t) + 0.90 * t


SHEER = [(289, 393), (330, 388), (366, 384), (363, 402), (350, 414), (330, 420),
         (305, 418), (292, 408)]


def shorts_old():
    g = region_grid([-0.17, -0.12, 0.84], [0.17, 0.15, 1.16], 0.0012)
    top = lambda P: P[..., 2] - belt_z(P[..., 0])
    hem = lambda P: hem_z(P[..., 0]) - P[..., 2]
    sheer = front_poly(SHEER, -0.01)
    out = {}
    out['Shorts'] = piece(g, -0.0015, 0.0045, minus(inter(top, hem), sheer), 'leather',
                          decimate=22000)
    out['ShortsSheer'] = piece(g, -0.0015, 0.0030, inter(sheer, top), 'sheer',
                               decimate=4000, outline_w=0.5)
    # belt: tilted band; red on the front-left
    n = np.array([-BELT_K, 0, 1.0])
    p0 = np.array([-0.009, 0, belt_z(-0.009)])
    bl = slab(n, p0, 0.011)
    red = front_poly([(349, 360), (430, 330), (430, 420), (349, 420)], 0.0)
    out['BeltWhite'] = piece(g, 0.004, 0.0105, minus(bl, red), 'white', decimate=9000)
    out['BeltRed'] = piece(g, 0.004, 0.0105, inter(bl, red), 'red', decimate=4000)
    # buckle frame
    bx, bz = (312 - PX0) * S, (PY0 - 385) * S
    c = surface_point(body_fn, bx, bz, offset=0.012)
    nrm = sdf.gradient(body_fn, c[None])[0]
    up = normalize(n)
    outer = oriented_box(c, (0.036, 0.034, 0.005), nrm, up, 0.0015)
    inner = oriented_box(c, (0.024, 0.020, 0.02), nrm, up, 0.001)
    prong = oriented_box(c + 0.0, (0.004, 0.024, 0.006), nrm, up, 0.001)

    def cut(g2):
        g2.subtract(inner)
        g2.union(prong)
    pass  # moved to accessories.py
    return out


def thigh_strap_old():
    g = region_grid([-0.17, -0.10, 0.80], [0.02, 0.10, 0.88], 0.001,
                    [(B.leg('R'), 0.0)])
    zb = zrange((PY0 - 512) * S, (PY0 - 498) * S)
    return {'ThighStrap': piece(g, -0.001, 0.0045, zb, 'white', decimate=5000,
                                outline_w=0.7)}


# ------------------------------------------------------------ neck

def collar():
    neck = B.neck()
    g = Grid([-0.05, -0.04, 1.41], [0.07, 0.08, 1.50], 0.0007)
    g.union(neck)
    z0, z1 = (PY0 - 186) * S, (PY0 - 160) * S
    out = {}
    out['Collar'] = piece(g, -0.001, 0.0065, zrange(z0, z1), 'black', decimate=8000,
                          outline_w=0.8)
    ny = J['neck_base'][1]
    front = lambda P: P[..., 1] - (ny - 0.012)
    r1 = zrange((PY0 - 171) * S, (PY0 - 167) * S)
    r2 = zrange((PY0 - 182) * S, (PY0 - 179) * S)
    out['CollarRed'] = piece(g, 0.004, 0.0078, inter(union(r1, r2), front), 'red',
                             decimate=3000, outline_w=0.5)
    return out


# coat: see coat.py
PCX, PCY = -0.009, 0.016          # pelvis centre for the hanging coat part


# ------------------------------------------------------------ sleeves & arms

def arm_grid(side, h=0.0012, pad=0.05):
    arm = B.arm(side)
    lo, hi = arm.bounds()
    g = Grid(lo - pad, hi + pad, h)
    g.union(arm)
    return arm, g


def sleeves():
    out = {}
    # right: full sleeve to the wrist, glowing stripes on the forearm
    arm, g = arm_grid('R')
    L = np.linalg.norm(J['shoulder_R'] - J['wrist_R'])

    def s_of(P):
        return limb_local(arm, P)[2]
    cut = lambda P: s_of(P) - (L - 0.035)
    top = lambda P: -0.06 - s_of(P)
    out['SleeveR'] = piece(g, 0.004, 0.0090, inter(cut, top), 'coat', decimate=12000)

    def stripes(P):
        x, y, s = limb_local(arm, P)
        ang = np.arctan2(x, -y)          # 0 = front of the arm
        st = np.abs(np.sin(ang * 6.0)) - 0.62
        front = np.abs(ang + 0.35) - 1.5
        sr = np.maximum(0.225 - s, s - 0.355)
        return np.maximum(np.maximum(st * 0.02, front), sr)
    out['SleeveRGlow'] = piece(g, 0.0080, 0.0105, stripes, 'glow_red', decimate=8000,
                               outline_w=0.4)
    cuff = lambda P: np.maximum((L - 0.075) - s_of(P), s_of(P) - (L - 0.035))
    out['SleeveRCuff'] = piece(g, 0.0070, 0.0120, cuff, 'coat_trim', decimate=4000)

    # left: sleeve to above the elbow, black band, rings, bandaged forearm
    arm, g = arm_grid('L')
    sk = np.linalg.norm(J['shoulder_L'] - J['elbow_L'])
    L = np.linalg.norm(J['shoulder_L'] - J['wrist_L'])

    def s_of(P):
        return limb_local(arm, P)[2]
    sh_, el_ = J['shoulder_L'], J['elbow_L']
    axis = normalize(el_ - sh_)
    sleeve = RoundCone(sh_ + axis * 0.005 + np.array([0.004, 0, 0.004]), el_ - axis * 0.030,
                       0.035, 0.034)
    sg = g.copy()
    sg.union(sleeve, 0.012)
    sl_s = lambda P: np.maximum(s_of(P) - (sk - 0.035), -0.04 - s_of(P))
    out['SleeveL'] = piece(sg, -0.002, 0.0035, sl_s, 'coat', decimate=10000)
    g = sg
    bandz = lambda P: np.maximum(0.075 - s_of(P), s_of(P) - 0.100)
    out['SleeveLBand'] = piece(g, 0.0025, 0.0065, bandz, 'black', decimate=3000)
    lower = lambda P: np.maximum(s_of(P) - (sk - 0.040), (sk - 0.085) - s_of(P))
    out['SleeveLPanel'] = piece(g, 0.0025, 0.0050, lower, 'coat_trim', decimate=3000)
    # forearm: red wrap with black bandage straps
    fa = lambda P: np.maximum((sk - 0.01) - s_of(P), s_of(P) - (L - 0.02))
    out['ArmWrapRed'] = piece(g, 0.001, 0.0090, fa, 'red', decimate=8000)

    def straps(P):
        x, y, s = limb_local(arm, P)
        ang = np.arctan2(x, -y)
        k = 2 * np.pi / 0.045
        a1 = np.abs(np.sin((s * k + ang * 1.0) / 2)) - 0.30
        a2 = np.abs(np.sin((s * k - ang * 1.0) / 2 + 0.9)) - 0.22
        st = np.minimum(a1, a2) * 0.02
        return np.maximum(st, fa(P) + 0.003)
    out['ArmWrapBlack'] = piece(g, 0.006, 0.0120, straps, 'black', decimate=12000,
                                outline_w=0.6)
    return out


def rings():
    """Silver rings with a blue glow at the left elbow and wrist."""
    out = []
    glow = []
    arm = B.arm('L')
    sk = np.linalg.norm(J['shoulder_L'] - J['elbow_L'])
    L = np.linalg.norm(J['shoulder_L'] - J['wrist_L'])
    ax = -arm.R[:, 2]                      # down the arm
    for s, rad in ((sk - 0.030, 0.043), (L - 0.010, 0.032)):
        c = arm.origin + ax * s
        # centre line passes through the bent loft; correct with the local offset
        q = (c - arm.origin) @ arm.R
        cxl, cyl = arm.prof('cx', q[2]), arm.prof('cy', q[2])
        c = arm.origin + arm.R @ np.array([cxl, cyl, q[2]])
        Rm = np.stack([arm.R[:, 0], arm.R[:, 1], arm.R[:, 2]], axis=1)
        out.append(Torus(c, rad, 0.007, Rm, squash=1.6))
        glow.append(Torus(c + ax * 0.004, rad + 0.0035, 0.0028, Rm, squash=1.0))
    lo = np.min([t.bounds()[0] for t in out], axis=0)
    hi = np.max([t.bounds()[1] for t in out], axis=0)
    res = {'ArmRings': sdf_mesh(out, lo, hi, 0.0007, 'metal', decimate=6000, outline_w=0.6),
           'ArmRingsGlow': sdf_mesh(glow, lo, hi, 0.0007, 'glow_blue', decimate=4000,
                                    outline=False)}
    return res


# ------------------------------------------------------------ legs

def leg_armor_old():
    out = {}
    leg = B.leg('L')
    lo, hi = leg.bounds()
    g = Grid(lo - 0.04, hi + 0.04, 0.0013)
    g.union(leg)

    def s_of(P):
        return limb_local(leg, P)[2]
    Lk = np.linalg.norm(J['hip_L'] - J['knee_L'])
    L = np.linalg.norm(J['hip_L'] - J['ankle_L'])
    zr = lambda P: np.maximum(P[..., 2] - 0.985, 0.25 - P[..., 2])
    out['LegArmor'] = piece(g, 0.0, 0.0075, zr, 'leather', decimate=22000)
    # knee guard
    def knee(P):
        x, y, s = limb_local(leg, P)
        return np.maximum(np.abs(s - Lk - 0.01) - 0.055, y + 0.012)
    out['KneeGuard'] = piece(g, 0.006, 0.0115, knee, 'leather', decimate=4000)
    # white band above the boot
    wb = zrange((PY0 - 781) * S, (PY0 - 769) * S)
    out['LegBand'] = piece(g, 0.006, 0.0105, wb, 'white', decimate=3000)
    # two thigh straps with buckles
    st = union(lambda P: np.abs(s_of(P) - 0.045) - 0.0105,
               lambda P: np.abs(s_of(P) - 0.105) - 0.0105)
    out['LegStraps'] = piece(g, 0.0065, 0.0120, st, 'black', decimate=6000)
    buckles = []
    for s, ypx in ((0.045, 462), (0.105, 492)):
        c = surface_point(lambda P: leg(P), (418 - PX0) * S, (PY0 - ypx) * S,
                          offset=0.0125)
        nrm = sdf.gradient(lambda P: leg(P), c[None])[0]
        fr = oriented_box(c, (0.030, 0.024, 0.004), nrm, (0, 0, 1), 0.0012)
        buckles.append(fr)
    lo = np.min([b.bounds()[0] for b in buckles], axis=0)
    hi = np.max([b.bounds()[1] for b in buckles], axis=0)

    def holes(g2):
        for b in buckles:
            g2.subtract(Box(b.c, b.hs * np.array([0.62, 0.55, 3.0]), b.R, 0.0006))
    pass  # moved to accessories.py
    # side clips
    clips = []
    for ypx in (540, 600, 700, 735):
        zz = (PY0 - ypx) * S
        t = (J['hip_L'][2] - zz) / (J['hip_L'][2] - J['ankle_L'][2])
        c0 = J['hip_L'] + (J['ankle_L'] - J['hip_L']) * t
        side = normalize(np.cross(leg.R[:, 2], (0, 1, 0)))
        if side[0] < 0:
            side = -side
        pfun = lambda P: leg(P)
        # march from outside towards the leg along -side
        best = c0
        for dist in np.linspace(0.12, 0.0, 300):
            q = c0 + side * dist
            if leg(q[None])[0] < 0.009:
                best = q
                break
        clips.append(oriented_box(best, (0.010, 0.022, 0.008), side, leg.R[:, 2], 0.0015))
    lo = np.min([b.bounds()[0] for b in clips], axis=0)
    hi = np.max([b.bounds()[1] for b in clips], axis=0)
    pass  # moved to accessories.py
    return out


FOOT_KNOTS = [
    # s (from heel), half width, up, down
    (-0.008, 0.018, 0.028, 0.022),
    (0.010, 0.030, 0.048, 0.026),
    (0.040, 0.034, 0.058, 0.027),
    (0.080, 0.037, 0.046, 0.027),
    (0.115, 0.038, 0.034, 0.027),
    (0.145, 0.036, 0.026, 0.027),
    (0.170, 0.031, 0.020, 0.026),
    (0.188, 0.019, 0.013, 0.021),
]


def foot_loft(side, grow=0.0):
    ank, toe = J['ankle_' + side], J['toe_' + side]
    fwd = toe - ank
    fwd[2] = 0
    fwd = normalize(fwd)
    up = np.array([0, 0, 1.0])
    heel = ank - fwd * 0.045
    heel[2] = 0.036
    R = np.stack([np.cross(up, fwd), up, fwd], axis=1)
    knots = {'a': [], 'bf': [], 'bb': [], 'cx': [(0.0, 0.0)], 'cy': [(0.0, 0.0)]}
    for s_, a_, u_, d_ in FOOT_KNOTS:
        knots['a'].append((s_, a_ + grow))
        knots['bb'].append((s_, u_ + grow))
        knots['bf'].append((s_, d_ + grow))
    lo = sdf.Loft(knots, zmin=FOOT_KNOTS[0][0], zmax=FOOT_KNOTS[-1][0], origin=heel, R=R,
                  cap_round=0.012)
    return lo, heel, fwd


def boot(side):
    """One chunky high-top boot.  Returns dict of meshes."""
    s = side
    leg = B.leg(s)
    ank = J['ankle_' + s]
    foot, heel, fwd = foot_loft(s)
    lat = np.cross(fwd, (0, 0, 1))
    extra = 0.0 if s == 'R' else 0.0065           # left boot goes over the armour
    shaft_top = (PY0 - 797) * S if s == 'R' else (PY0 - 805) * S
    toe_end = heel + fwd * 0.22
    lo = np.minimum(heel, toe_end) - 0.08
    lo[2] = -0.01
    hi = np.maximum(heel, toe_end) + 0.08
    hi[2] = shaft_top + 0.03
    g = Grid(lo, hi, 0.0011)
    g.union(leg)
    axis = normalize(J['knee_' + s] - ank)
    rb = 0.032 if s == 'R' else 0.026
    shaft = RoundCone(ank + axis * 0.01, ank + axis * (shaft_top - ank[2] + 0.01) / axis[2],
                      rb, rb + 0.002, ell=(1.12, 1.0))
    g.union(shaft, 0.01)
    g.union(foot, 0.025)

    def zr(P):
        return np.maximum(P[..., 2] - shaft_top, 0.020 - P[..., 2])
    out = {}
    out['Boot' + s] = piece(g, -0.002, 0.008 + extra, zr, 'leather', decimate=14000)
    # sole following the foot outline
    sole_f, _, _ = foot_loft(s, grow=0.006 + extra)
    sg = Grid(lo, hi, 0.0011)
    sg.union(sole_f)
    sg.map(lambda d, P: np.maximum(d, np.maximum(P[..., 2] - 0.027, -P[..., 2])))
    v, f = sg.mesh()
    out['Sole' + s] = MeshData(v, f, mat='sole', decimate=5000)

    def along(P):
        return (P - heel) @ fwd
    cap = lambda P: np.maximum(0.140 - along(P), P[..., 2] - 0.060)
    out['ToeCap' + s] = piece(g, 0.006 + extra, 0.0105 + extra, cap, 'sole', decimate=4000)
    zt = shaft_top

    def zb(a, b):
        return zrange(zt - b, zt - a)
    out['BootRed' + s] = piece(g, 0.006 + extra, 0.0105 + extra,
                               union(zb(0.004, 0.013), zb(0.031, 0.041)), 'red',
                               decimate=4000)
    out['BootPlate' + s] = piece(g, 0.006 + extra, 0.0115 + extra,
                                 inter(zb(0.015, 0.029), lambda P: -((P - ank) @ fwd) + 0.0),
                                 'metal', decimate=3000, outline_w=0.6)

    # white "C" shaped side panels around the ankle
    def panels(P):
        a = along(P) - 0.055
        l = (P - heel) @ lat
        z = P[..., 2]
        outer = np.maximum(np.abs(a) - 0.030, np.maximum(0.072 - z, z - 0.150))
        hollow = np.maximum(np.abs(a - 0.004) - 0.014, np.maximum(0.090 - z, z - 0.160))
        side_only = 0.012 - np.abs(l)
        return np.maximum(np.maximum(outer, -hollow), side_only)
    out['BootPanels' + s] = piece(g, 0.0065 + extra, 0.0100 + extra, panels, 'white',
                                  decimate=5000, outline_w=0.6)

    # black straps across the instep
    def straps(P):
        a = along(P)
        z = P[..., 2]
        s1 = np.abs(z - 0.118) - 0.009
        s2 = np.abs(z + 0.30 * (a - 0.09) - 0.072) - 0.0105
        return np.maximum(np.minimum(s1, s2), 0.040 - a)
    out['BootStraps' + s] = piece(g, 0.0075 + extra, 0.0135 + extra, straps, 'black',
                                  decimate=5000)
    return out


def boots():
    out = {}
    out.update(boot('R'))
    out.update(boot('L'))
    return out


# =====================================================================
# Clothing rebuilt as explicit shells (see clothing_geo.py)
# =====================================================================

import clothing_geo as G     # noqa: E402

LEG_L = B.leg('L')
LEG_R = B.leg('R')
LK_L = float(np.linalg.norm(J['hip_L'] - J['knee_L']))
LL_L = float(np.linalg.norm(J['hip_L'] - J['ankle_L']))

# left leg armour layers (offsets from the skin)
ARMOR_T = 0.0025              # armour shell thickness
STRAP_S = (0.045, 0.105)      # thigh strap centres (s down the left leg)
STRAP_W = 0.030               # thigh strap width
STRAP_LEVEL = 0.0080          # inner offset of the thigh straps
STRAP_T = 0.0026
# outer seam ladder: windows between rungs on the outer side of the leg
WIN_TH = (np.radians(67.0), np.radians(123.0))
WIN_TOP = 0.21                # the open slit above this is bridged only by the straps
RUNG_PITCH, RUNG_W = 0.07, 0.022
N_RUNGS = 7
RUNGS = [(WIN_TOP + k * RUNG_PITCH, WIN_TOP + k * RUNG_PITCH + RUNG_W) for k in range(N_RUNGS)]
WIN_END = RUNGS[-1][0]
LEG_BAND_S = 0.670            # white band at mid calf (centre, on the front)
LEG_BAND_W = 0.021


def armor_level(th, s):
    """Offset of the armour from the skin: thin where it tucks under the
    shorts, knee bulge in front, calf swell at the back, ankle pinch."""
    lev = 0.0012 + 0.0009 * sstep(s, 0.05, 0.12)
    knee = 0.0065 * np.exp(-((s - (LK_L - 0.012)) / 0.048) ** 2) * \
        np.clip(np.cos(th), 0, None) ** 1.5
    calf = 0.0040 * np.exp(-((s - (LK_L + 0.15)) / 0.075) ** 2) * \
        np.clip(-np.cos(th - 0.35), 0, None) ** 1.2
    shin = 0.0012 * np.exp(-((s - (LK_L + 0.13)) / 0.09) ** 2) * \
        np.clip(np.cos(th), 0, None)
    ankle = -0.0008 * sstep(s, 0.70, 0.76)
    return lev + knee + calf + shin + ankle


def holster_level(th, s):
    return armor_level(th, s) + ARMOR_T + 0.0002


HOLSTER_TH = np.radians(-37.0)    # front-inner side of the thigh
HOLSTER_W = 0.032


def leg_armor():
    out = {}
    fn = G.body_subset(['gluteL', 'legL'])
    ch = G.LimbChart(LEG_L, fn, R0=0.05)
    s_top, s_bot = 0.035, 0.775
    t0, t1 = WIN_TH
    # --- main shell with the ladder of windows on the outer side
    edges_s = [WIN_TOP, WIN_END] + [v for r in RUNGS for v in r]
    ss = G.rows(s_top, s_bot, 0.0055, edges_s)
    th = G.snap_cols(112, [t0, t1])

    def keep(tc, sc):
        inwin = (tc > t0) & (tc < t1)
        rung = np.zeros_like(sc, dtype=bool)
        for a, b in RUNGS:
            rung |= (sc > a) & (sc < b)
        hole = inwin & (sc < WIN_END) & ~rung
        return ~hole
    V, F = G.band_shell(ch, th, ss, armor_level, ARMOR_T, keep)
    out['LegArmor'] = G.solid([(V, F)], 'leather', bevel=0.0005, angle=45)

    # --- white trim framing every window
    trims = []
    wins = [(s_top - 0.01, RUNGS[0][0])] + \
        [(RUNGS[k][1], RUNGS[k + 1][0]) for k in range(N_RUNGS - 1)]
    tw = 0.0028
    for (a, b) in wins[1:]:
        r = 0.5 * (LEG_L.prof('a', -(a + b) / 2) + LEG_L.prof('bb', -(a + b) / 2))
        dth = tw / max(r, 0.03)
        lev = lambda T, S: armor_level(T, S) + ARMOR_T + 0.0001
        ss2 = G.rows(a - tw, b + tw, 0.004, [a, b])
        th2 = np.linspace(t0 - dth, t1 + dth, 24)
        th2 = np.sort(np.concatenate([th2, [t0, t1]]))

        def kp(tc, sc, a=a, b=b):
            inside = (tc > t0) & (tc < t1) & (sc > a) & (sc < b)
            return ~inside
        P, N, Ft = G.tube(ch, th2, ss2, lev, kp, closed=False)
        trims.append(G.shell(P, N, Ft, 0.0011))
    # the long slit above the first rung: trim along its two edges only
    a, b = s_top + 0.005, RUNGS[0][0]
    for e0, e1 in ((t0 - 0.05, t0), (t1, t1 + 0.05)):
        lev = lambda T, S: armor_level(T, S) + ARMOR_T + 0.0001
        P, N, Ft = G.tube(ch, np.linspace(e0, e1, 3), G.rows(a, b, 0.006), lev,
                          closed=False)
        trims.append(G.shell(P, N, Ft, 0.0011))
    out['LegWindowTrim'] = G.solid(trims, 'white', bevel=0.0003, outline_w=0.4)

    # --- knee plate (shield) with a small white emblem
    sk0 = LK_L - 0.080
    shield = np.array([(-0.031, sk0), (0.031, sk0), (0.033, sk0 + 0.020),
                       (0.029, LK_L + 0.005), (0.012, LK_L + 0.036), (0.0, LK_L + 0.045),
                       (-0.012, LK_L + 0.036), (-0.029, LK_L + 0.005), (-0.033, sk0 + 0.020)])
    Q, Ft = G.tri_region([shield], 0.004)
    plate_lev = lambda a, s: armor_level(a / ch.R0, s) + ARMOR_T + 0.0002
    V, F = G.lift_region(ch, Q, Ft, plate_lev, 0.0030)
    out['KneePlate'] = G.solid([(V, F)], 'leather', bevel=0.0007, angle=40)
    crown = np.array([(-0.0085, sk0 + 0.020), (0.0085, sk0 + 0.020), (0.0095, sk0 + 0.011),
                      (0.0045, sk0 + 0.015), (0.0, sk0 + 0.010), (-0.0045, sk0 + 0.015),
                      (-0.0095, sk0 + 0.011)])
    Q, Ft = G.tri_region([crown], 0.0015)
    em_lev = lambda a, s: armor_level(a / ch.R0, s) + ARMOR_T + 0.0002 + 0.0030
    V, F = G.lift_region(ch, Q, Ft, em_lev, 0.0005)
    out['KneeEmblem'] = G.solid([(V, F)], 'white', bevel=0.0, outline=False)

    # --- white band at mid calf (slightly higher on the outer side)
    def band_s(T, v):
        return LEG_BAND_S - 0.010 * np.sin(T) + (v - 0.5) * LEG_BAND_W
    thb = np.linspace(0, 2 * np.pi, 120, endpoint=False)
    vv = np.linspace(0, 1, 6)
    T, Vv = np.meshgrid(thb, vv)
    Sb = band_s(T, Vv)
    lev = armor_level(T, Sb) + ARMOR_T + 0.0001
    P, N = ch.lift(T * ch.R0, Sb, lev)
    P, N = P.reshape(-1, 3), N.reshape(-1, 3)
    Fb = G.orient(P, N, G.grid_tris(len(thb), len(vv), closed_u=True))
    out['LegBand'] = G.solid([G.shell(P, N, Fb, 0.0018)], 'white', bevel=0.0004,
                             outline_w=0.7)

    # --- vertical holster strip on the front-inner thigh (under the straps)
    r_th = 0.068
    da = HOLSTER_W / 2 * ch.R0 / r_th
    ac = HOLSTER_TH * ch.R0
    strip = np.array([(ac - da, 0.010), (ac + da, 0.010), (ac + da, 0.168),
                      (ac + da * 0.7, 0.176), (ac - da * 0.7, 0.176), (ac - da, 0.168)])
    Q, Ft = G.tri_region([strip], 0.004)
    hl = lambda a, s: holster_level(a / ch.R0, s)
    V, F = G.lift_region(ch, Q, Ft, hl, 0.0030)
    # small flap at the bottom of the holster
    flap = np.array([(ac - da * 0.8, 0.140), (ac + da * 0.8, 0.140),
                     (ac + da * 0.8, 0.170), (ac - da * 0.8, 0.170)])
    Q2, F2 = G.tri_region([flap], 0.003)
    V2, F2b = G.lift_region(ch, Q2, F2, lambda a, s: holster_level(a / ch.R0, s) + 0.0030,
                            0.0012)
    out['LegHolster'] = G.solid([(V, F), (V2, F2b)], 'black', bevel=0.0005)

    # --- the two thigh straps (buckles: accessories)
    straps = []
    for sc in STRAP_S:
        ss2 = np.linspace(sc - STRAP_W / 2, sc + STRAP_W / 2, 7)
        th2 = np.linspace(0, 2 * np.pi, 128, endpoint=False)
        straps.append(G.band_shell(ch, th2, ss2, STRAP_LEVEL, STRAP_T))
    out['LegStraps'] = G.solid(straps, 'black', bevel=0.0005)
    return out


# ------------------------------------------------------------ right thigh garter

GARTER_S, GARTER_W = 0.148, 0.030


def thigh_strap():
    fn = G.body_subset(['gluteR', 'legR'])
    ch = G.LimbChart(LEG_R, fn, R0=0.05)
    th = np.linspace(0, 2 * np.pi, 120, endpoint=False)
    ss = np.linspace(GARTER_S - GARTER_W / 2, GARTER_S + GARTER_W / 2, 9)
    lev = 0.0004
    T = 0.0024
    out = {'ThighStrap': G.solid([G.band_shell(ch, th, ss, lev, T)], 'white', bevel=0.0005,
                                 outline_w=0.7)}
    # segment seams and edge piping (thin grey lines on the band)
    lines = []
    lv2 = lev + T + 0.00005
    for e in (GARTER_S - GARTER_W / 2 + 0.0035, GARTER_S + GARTER_W / 2 - 0.0035):
        lines.append(G.band_shell(ch, th, np.array([e - 0.0006, e + 0.0006]), lv2, 0.0003))
    for a in np.radians([-150, -95, -40, 15, 70, 125]):
        th2 = np.array([a - 0.012, a + 0.012])
        ss2 = np.linspace(GARTER_S - GARTER_W / 2 + 0.0045, GARTER_S + GARTER_W / 2 - 0.0045, 4)
        P, N, F = G.tube(ch, th2, ss2, lv2, closed=False)
        lines.append(G.shell(P, N, F, 0.0003))
    out['ThighStrapSeams'] = G.solid(lines, 'gray', bevel=0.0, outline=False)
    return out


# ------------------------------------------------------------ hips: shorts, belts

HIPS_FN = None


def hips_fn():
    global HIPS_FN
    if HIPS_FN is None:
        HIPS_FN = G.body_subset(['torso', 'gluteR', 'gluteL', 'legR', 'legL'])
    return HIPS_FN


SHORTS_LEVEL, SHORTS_T = 0.0030, 0.0022
# hem of the leg openings: s down each leg as a function of the leg angle
HEM_R = [(0, 0.022), (45, 0.040), (90, 0.057), (135, 0.068), (180, 0.072), (225, 0.056),
         (260, 0.004), (285, -0.012), (320, 0.004)]
HEM_L = [(0, 0.042), (45, 0.046), (90, 0.052), (135, 0.070), (180, 0.076), (225, 0.070),
         (270, 0.058), (315, 0.048)]
SLIT_TH = (np.radians(64.0), np.radians(128.0))      # skin slit on her left hip


def base_belt_z(P):
    """Centre height of the black base belt (tilted: low at the front)."""
    return 1.074 - 0.12 * P[..., 0] + 0.35 * P[..., 1]


BASE_BELT_W = 0.024
SCOOP = [(284, 330), (287, 398), (293, 407), (303, 415), (316, 419), (330, 421), (343, 419),
         (353, 414), (361, 405), (366, 396), (370, 330)]


def leg_side_mask(P, hem_r, hem_l, off_r=0.0, off_l=0.0):
    """< 0 above the hem lines (inside the shorts)."""
    thR, sR = G.limb_coords(LEG_R, P)
    thL, sL = G.limb_coords(LEG_L, P)
    mr = sR - (G.periodic(thR, hem_r) + off_r)
    ml = sL - (G.periodic(thL, hem_l) + off_l)
    return np.where(P[..., 0] < PCX, mr, ml)


def slit_mask(P, grow=0.0):
    """> 0 inside the skin slit on the outer left hip (from the belt down)."""
    thL, sL = G.limb_coords(LEG_L, P)
    t0, t1 = SLIT_TH
    c, h = 0.5 * (t0 + t1), 0.5 * (t1 - t0) + grow
    d = h - np.abs(G.wrap_angle(thL, c))
    return np.where(P[..., 0] > 0.02, d, -1.0)


def front_mask(poly_px, ymax=0.0):
    poly = P2M(poly_px)

    def m(P):
        d = polygon_sd(P[..., 0], P[..., 2], poly)
        return np.maximum(d, P[..., 1] - ymax)
    return m


def shorts_masks():
    top = lambda P: P[..., 2] - base_belt_z(P)
    legs = lambda P: leg_side_mask(P, HEM_R, HEM_L)
    slit = lambda P: slit_mask(P)
    body = lambda P: np.maximum(np.maximum(top(P), legs(P)), slit(P))
    sheer = front_mask(SCOOP, 0.0)
    return body, sheer


def shorts():
    out = {}
    fn = hips_fn()
    lev = SHORTS_LEVEL
    V, F = G.mc_surface(fn, lev, [-0.19, -0.14, 0.86], [0.19, 0.17, 1.13], 0.0026)
    body, sheer = shorts_masks()
    parts = [G.clip_shell(fn, lev, V, F, lambda P: np.maximum(body(P), -sheer(P)), SHORTS_T)]
    out['Shorts'] = G.solid(parts, 'leather', bevel=0.0005, angle=50)
    out['ShortsSheer'] = G.solid([G.clip_shell(fn, lev, V, F,
                                               lambda P: np.maximum(body(P), sheer(P)),
                                               0.0012)],
                                 'sheer', bevel=0.0, outline_w=0.4)
    # thin black trim along the scoop edge of the mesh panel
    trim = lambda P: np.maximum(np.maximum(body(P), np.abs(sheer(P) - 0.0018) - 0.0018),
                                P[..., 2] - base_belt_z(P) + 0.004)
    out['ShortsTrim'] = G.solid([G.clip_shell(fn, lev, V, F, trim, 0.0009, SHORTS_T)],
                                'black', bevel=0.0003, outline_w=0.4)
    # hem bands on the leg openings and seams
    hem = lambda P: np.maximum(np.maximum(body(P), -leg_side_mask(P, HEM_R, HEM_L, -0.011,
                                                                  -0.011)), -sheer(P))
    out['ShortsHem'] = G.solid([G.clip_shell(fn, lev, V, F, hem, 0.0008, SHORTS_T)],
                               'leather', bevel=0.0003, outline_w=0.5)
    seams = []
    # centre front (double) seam and centre back seam
    for xo in (-0.0035, 0.0035):
        cf = lambda P, xo=xo: np.maximum(np.maximum(body(P), np.abs(P[..., 0] - (PCX + xo + 0.004 * (P[..., 2] - 0.95) / 0.05)) - 0.0006),
                                         np.maximum(P[..., 1] + 0.0, sheer(P) * -1 - 0.0))
        seams.append(G.clip_shell(fn, lev, V, F, lambda P, cf=cf: np.maximum(cf(P), -sheer(P) * 1.0 - 0.0), 0.0005, SHORTS_T))
    cb = lambda P: np.maximum(np.maximum(body(P), np.abs(P[..., 0] - PCX) - 0.0006), -P[..., 1])
    seams.append(G.clip_shell(fn, lev, V, F, cb, 0.0005, SHORTS_T))
    # side seams running from the slit / outer hip to the hem
    out['ShortsSeams'] = G.solid(seams, 'black', bevel=0.0, outline_w=0.25)
    out.update(zippers(fn))
    out.update(belts())
    return out


ZIPPERS = [((403, 406), (364, 430)), ((405, 425), (383, 442))]


def zippers(fn):
    """Two diagonal silver zips on her left front hip: dark tape + teeth."""
    from hardsurf import box, frame_from
    fc = G.FrontChart(fn)
    tapes, teeth = [], []
    base = SHORTS_LEVEL + SHORTS_T
    for a, b in ZIPPERS:
        A = np.array(P2M([a])[0])
        Bp = np.array(P2M([b])[0])
        d = Bp - A
        L = np.linalg.norm(d)
        u = d / L
        nv = np.array([-u[1], u[0]])
        w = 0.0036
        poly = [A + nv * w - u * 0.002, Bp + nv * w + u * 0.002, Bp - nv * w + u * 0.002,
                A - nv * w - u * 0.002]
        Q, Ft = G.tri_region([np.array(poly)], 0.0025)
        P, N = fc.lift(Q[:, 0], Q[:, 1], base + 0.0001)
        Ft = G.orient(P, N, Ft)
        tapes.append(G.shell(P, N, Ft, 0.0007))
        n = int(L / 0.0021)
        for k in range(n):
            q = A + u * (k + 0.5) * L / n
            P1, N1 = fc.lift(np.array([q[0]]), np.array([q[1]]), base + 0.0008)
            tan3 = np.array([u[0], 0.0, u[1]])
            off = (0.0011 if k % 2 else -0.0011)
            side = np.cross(N1[0], tan3)
            side /= np.linalg.norm(side)
            R = frame_from(x=tan3 - N1[0] * np.dot(tan3, N1[0]), z=N1[0])
            teeth.append(box((0.0015, 0.0034, 0.0011), P1[0] + side * off * 0.35, R))
    out = {'ShortsZipTape': G.solid(tapes, 'black', bevel=0.0002, outline_w=0.3)}
    out['ShortsZipTeeth'] = G.solid(teeth, 'chrome', bevel=0.0002, outline=False, angle=30)
    return out


def belts():
    return {}

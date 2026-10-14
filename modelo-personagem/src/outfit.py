"""Clothing (bikini, shorts, belts, garter, sleeves, left leg armour) and
shared garment helpers.

The garments themselves are explicit polygon shells built with
clothing_geo.py (exact offset surfaces of the body SDF, hard rims, no
marching-cubes noise); the older SDF helpers below are kept because other
modules (coat, accessories, boots, rigging) still use them.

Original notes: clothing built as layered shells over the body SDF.

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
import clothing_geo as G

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


LEG_L = B.leg('L')
LEG_R = B.leg('R')
LK_L = float(np.linalg.norm(J['hip_L'] - J['knee_L']))
LL_L = float(np.linalg.norm(J['hip_L'] - J['ankle_L']))

# left leg armour layers (offsets from the skin)
ARMOR_T = 0.0025              # armour shell thickness
STRAP_S = (0.045, 0.105)      # thigh strap centres (s down the left leg)
STRAP_W = 0.030               # thigh strap width
STRAP_T = 0.0026
# outer seam ladder: windows between rungs on the outer side of the leg
WIN_TH = (np.radians(68.0), np.radians(150.0))
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
    lev = 0.0004 + 0.0017 * sstep(s, 0.08, 0.14)
    knee = 0.0065 * np.exp(-((s - (LK_L - 0.012)) / 0.048) ** 2) * \
        np.clip(np.cos(th), 0, None) ** 1.5
    calf = 0.0040 * np.exp(-((s - (LK_L + 0.15)) / 0.075) ** 2) * \
        np.clip(-np.cos(th - 0.35), 0, None) ** 1.2
    shin = 0.0012 * np.exp(-((s - (LK_L + 0.13)) / 0.09) ** 2) * \
        np.clip(np.cos(th), 0, None)
    ankle = -0.0008 * sstep(s, 0.70, 0.76)
    return lev + knee + calf + shin + ankle


def armor_top(th):
    """Top edge (s) of the leg armour: 3.5 cm down the leg, 5.8 cm inside."""
    inner = np.clip(-np.sin(th), 0, 1) ** 2
    return 0.035 + 0.023 * inner


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
    ss = G.rows(s_top, s_bot, 0.0070, edges_s)
    th = G.snap_cols(92, [t0, t1])

    def keep(tc, sc):
        inwin = (tc > t0) & (tc < t1)
        rung = np.zeros_like(sc, dtype=bool)
        for a, b in RUNGS:
            rung |= (sc > a) & (sc < b)
        hole = inwin & (sc < WIN_END) & ~rung
        return ~hole
    from meshutil import clip_mesh
    Pm, Nm, Fm = G.tube(ch, th, ss, armor_level, keep)
    # the top edge drops on the inner side so it stays clear of the crotch
    # crease (it still tucks under the shorts hem)
    thm, sm = G.limb_coords(LEG_L, Pm)
    Pm, Fm = clip_mesh(Pm, Fm, armor_top(thm) - sm)
    Nm = G.grad(fn, Pm)
    Fm = G.orient(Pm, Nm, Fm)
    V, F = G.shell(Pm, Nm, Fm, ARMOR_T)
    out['LegArmor'] = G.solid([(V, F)], 'clothing_gloss', bevel=0.0005, angle=45)

    # --- trim framing every window: white on the back half, dark grey on
    # the front-facing jambs (from the front only dark tabs should show)
    split = np.radians(104.0)
    trims_w, trims_d = [], []
    tw = 0.0028
    lev_t = lambda T, S: armor_level(T, S) + ARMOR_T + 0.0001
    wins = [(RUNGS[k][1], RUNGS[k + 1][0]) for k in range(N_RUNGS - 1)]
    for (a, b) in wins:
        r = 0.5 * (LEG_L.prof('a', -(a + b) / 2) + LEG_L.prof('bb', -(a + b) / 2))
        dth = tw / max(r, 0.03)
        ss2 = G.rows(a - tw, b + tw, 0.004, [a, b])
        th2 = np.linspace(t0 - dth, t1 + dth, 26)
        th2 = np.sort(np.concatenate([th2, [t0, t1, split]]))

        for front, dst in ((True, trims_d), (False, trims_w)):
            def kp(tc, sc, a=a, b=b, front=front):
                inside = (tc > t0) & (tc < t1) & (sc > a) & (sc < b)
                side = (tc < split) if front else (tc >= split)
                return ~inside & side
            P, N, Ft = G.tube(ch, th2, ss2, lev_t, kp, closed=False)
            if len(Ft):
                dst.append(G.shell(P, N, Ft, 0.0011))
    # the long slit above the first rung: trim along its two edges only
    a, b = armor_top(t0) + 0.005, RUNGS[0][0]
    for e0, e1, dst in ((t0 - 0.05, t0, trims_d), (t1, t1 + 0.05, trims_w)):
        P, N, Ft = G.tube(ch, np.linspace(e0, e1, 3), G.rows(a, b, 0.006), lev_t,
                          closed=False)
        dst.append(G.shell(P, N, Ft, 0.0011))
    out['LegWindowTrim'] = G.solid(trims_w, 'white', bevel=0.0003, outline_w=0.4)
    out['LegWindowJamb'] = G.solid(trims_d, 'clothing_jamb', bevel=0.0003, outline_w=0.4)

    # --- knee plate (shield) with a small white emblem
    sk0 = LK_L - 0.080
    shield = np.array([(-0.031, sk0), (0.031, sk0), (0.033, sk0 + 0.020),
                       (0.029, LK_L + 0.005), (0.012, LK_L + 0.036), (0.0, LK_L + 0.045),
                       (-0.012, LK_L + 0.036), (-0.029, LK_L + 0.005), (-0.033, sk0 + 0.020)])
    Q, Ft = G.tri_region([shield], 0.004)
    plate_lev = lambda a, s: armor_level(a / ch.R0, s) + ARMOR_T + 0.0002
    V, F = G.lift_region(ch, Q, Ft, plate_lev, 0.0030)
    out['KneePlate'] = G.solid([(V, F)], 'clothing_gloss', bevel=0.0007, angle=40)
    # small white splash mark on the plate (irregular star blot)
    rng = np.random.default_rng(11)
    ang = np.linspace(0, 2 * np.pi, 22, endpoint=False)
    rad = np.where(np.arange(22) % 2 == 0, 1.0, 0.45) * rng.uniform(0.75, 1.15, 22)
    rad[[0, 6, 14]] *= 1.45
    em_c = np.array([0.0, sk0 + 0.030])
    splash = np.stack([em_c[0] + 0.0080 * rad * np.cos(ang),
                       em_c[1] + 0.0085 * rad * np.sin(ang)], axis=1)
    Q, Ft = G.tri_region([splash], 0.0010)
    em_lev = lambda a, s: armor_level(a / ch.R0, s) + ARMOR_T + 0.0002 + 0.0030
    V, F = G.lift_region(ch, Q, Ft, em_lev, 0.0004)
    emb = [(V, F)]
    # printed text: a block above the knee plate and one at mid thigh
    txt_lev = lambda a, s: armor_level(a / ch.R0, s) + ARMOR_T + 0.00005
    for a0, s0, rows_, ln in ((-0.012, sk0 - 0.022, 3, 0.024), (-0.016, 0.262, 2, 0.020)):
        emb += _text_bars(ch, a0, s0, rows_, txt_lev, rng, ln, h=0.0010, step=0.0026)
    out['KneeEmblem'] = G.solid(emb, 'decal_white', bevel=0.0, outline=False)

    # --- painted gloss streaks down the front of the thigh and shin
    def leg_streak(thc, s0, s1, w, lev_add, n=30):
        ss_ = np.linspace(s0, s1, n)
        wid = w * np.sin(np.pi * np.linspace(0, 1, n)) ** 0.5
        r = 0.5 * (LEG_L.prof('a', -ss_) + LEG_L.prof('bf', -ss_))
        L_ = np.stack([(thc - wid / 2 / r) * ch.R0, ss_], axis=1)
        R_ = np.stack([(thc + wid / 2 / r) * ch.R0, ss_], axis=1)
        loop = np.concatenate([L_, R_[::-1][1:-1]])
        Q, Ft = G.tri_region([loop], 0.0025)
        lv = lambda a, s: armor_level(a / ch.R0, s) + ARMOR_T + lev_add
        return G.lift_region(ch, Q, Ft, lv, 0.00015)
    sheen = [leg_streak(np.radians(-28), 0.17, 0.37, 0.009, 0.00005),
             leg_streak(np.radians(38), 0.19, 0.33, 0.005, 0.00005),
             leg_streak(np.radians(-6), LK_L + 0.05, LK_L + 0.21, 0.007, 0.00005),
             leg_streak(np.radians(-34), LK_L + 0.07, LK_L + 0.17, 0.004, 0.00005)]
    hi = [leg_streak(np.radians(-28), 0.20, 0.33, 0.0022, 0.00012),
          leg_streak(np.radians(-6), LK_L + 0.08, LK_L + 0.18, 0.0018, 0.00012)]
    out['LegSheen'] = G.solid(sheen, 'clothing_sheen', bevel=0.0, outline=False)
    out['LegSheenHi'] = G.solid(hi, 'clothing_sheen_hi', bevel=0.0, outline=False)

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
    strip = np.array([(ac - da, 0.054), (ac + da, 0.054), (ac + da, 0.168),
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
    out['LegHolster'] = G.solid([(V, F), (V2, F2b)], 'clothing_fabric', bevel=0.0005)

    # --- the two thigh straps (buckles: accessories)
    straps = []
    for sc in STRAP_S:
        ss2 = np.linspace(sc - STRAP_W / 2, sc + STRAP_W / 2, 7)
        th2 = np.linspace(0, 2 * np.pi, 128, endpoint=False)
        straps.append(G.band_shell(ch, th2, ss2, strap_level(sc), STRAP_T))
    out['LegStraps'] = G.solid(straps, 'clothing_fabric', bevel=0.0005)
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
HEM_L = [(0, 0.042), (45, 0.046), (90, 0.052), (135, 0.072), (180, 0.084), (225, 0.088),
         (270, 0.066), (315, 0.050)]
SLIT_TH = (np.radians(68.0), np.radians(128.0))      # skin slit on her left hip


def base_belt_z(P):
    """Centre height of the black base belt (tilted: low at the front),
    raised on her left front hip so it runs right under the red segment."""
    x, y = P[..., 0], P[..., 1]
    lift = 0.017 * sstep(x, 0.025, 0.085) * (1 - sstep(y, 0.0, 0.07))
    return 1.074 - 0.12 * x + 0.35 * y + lift


BASE_BELT_W = 0.024
def _smooth_scoop():
    from meshutil import catmull
    curve = [(287, 396), (292, 406), (302, 414), (316, 419), (330, 421), (343, 419),
             (353, 414), (361, 405), (367, 395)]
    pts, _ = catmull(np.array(curve, dtype=np.float64), 48)
    return [(284, 330)] + [tuple(p) for p in pts] + [(370, 330)]


SCOOP = _smooth_scoop()


def leg_side_mask(P, hem_r, hem_l, off_r=0.0, off_l=0.0):
    """< 0 above the hem lines (inside the shorts)."""
    thR, sR = G.limb_coords(LEG_R, P)
    thL, sL = G.limb_coords(LEG_L, P)
    mr = sR - (G.periodic(thR, hem_r) + off_r)
    ml = sL - (G.periodic(thL, hem_l) + off_l)
    # continuous blend across the centre line (a hard switch left a step)
    w = sstep(P[..., 0], PCX - 0.014, PCX + 0.014)
    return mr * (1 - w) + ml * w


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


def gusset(P, off=0.0):
    """> 0 below the crotch line: closes the shorts between the legs with a
    smooth gusset instead of the step where the two leg hems meet."""
    zg = 0.921 - 0.040 * sstep(np.abs(P[..., 0] - PCX), 0.015, 0.065)
    return zg - off - P[..., 2]


def shorts_masks():
    """Region of the shorts as a list of smooth masks (inside: all < 0) and
    the sheer panel field (< 0 inside the scoop)."""
    top = lambda P: P[..., 2] - base_belt_z(P)
    legs = lambda P: leg_side_mask(P, HEM_R, HEM_L)
    slit = lambda P: slit_mask(P)
    body = [top, legs, gusset, slit]
    sheer = front_mask(SCOOP, 0.0)
    return body, sheer


SHORTS_H = 0.0042          # base surface resolution


def front_lift(fn, poly_m, level, t, h=0.002, t0=0.0):
    """2D polygon in front view (model x, z) lifted onto fn == level."""
    fc = G.FrontChart(fn)
    Q, Ft = G.tri_region([np.asarray(poly_m)], h)
    P, N = fc.lift(Q[:, 0], Q[:, 1], level)
    Ft = G.orient(P, N, Ft)
    return G.shell(P, N, Ft, t, t0)


def streak(p0, p1, w, n=14, bend=0.0):
    """Tapered highlight streak polygon (model x, z) from p0 to p1."""
    p0, p1 = np.asarray(p0, dtype=np.float64), np.asarray(p1, dtype=np.float64)
    d = p1 - p0
    nv = np.array([-d[1], d[0]]) / np.linalg.norm(d)
    ts = np.linspace(0, 1, n)
    wid = w * np.sin(np.pi * ts) ** 0.55
    c = p0[None] + d[None] * ts[:, None] + nv[None] * (bend * np.sin(np.pi * ts))[:, None]
    left = c + nv * wid[:, None] / 2
    right = c - nv * wid[:, None] / 2
    return np.concatenate([left, right[::-1][1:-1]])


def sheer_panel(fn, level, t, masks, inset=0.0015):
    """Sheer mesh panel: the scoop polygon (inset) lifted straight from the
    front view (clean even triangulation, no marching-cubes slivers), cut by
    the shorts masks (belt line, hems)."""
    from meshutil import clip_mesh
    poly = np.array(P2M(SCOOP), dtype=np.float64)
    poly = G.resample(poly, 0.002)
    # inward offset (polygon is counter-clockwise or not: test with area)
    area = 0.5 * np.sum(poly[:, 0] * np.roll(poly[:, 1], -1) - np.roll(poly[:, 0], -1) * poly[:, 1])
    tan = np.roll(poly, -1, axis=0) - np.roll(poly, 1, axis=0)
    tan /= np.linalg.norm(tan, axis=1, keepdims=True)
    nin = np.stack([-tan[:, 1], tan[:, 0]], axis=1) * np.sign(area)
    poly = poly + nin * inset
    Q, Ft = G.tri_region([poly], 0.0022)
    fc = G.FrontChart(fn)
    P, N = fc.lift(Q[:, 0], Q[:, 1], level)
    Ft = np.asarray(Ft, dtype=np.int64)
    for m in masks:
        P, Ft = clip_mesh(P, Ft, m(P))
    used = np.unique(Ft)
    remap = -np.ones(len(P), dtype=np.int64)
    remap[used] = np.arange(len(used))
    P, Ft = P[used], remap[Ft]
    P = G.project(fn, P, level, 3)
    N = G.grad(fn, P)
    Ft = G.orient(P, N, Ft)
    return G.shell(P, N, Ft, t)


def shorts():
    out = {}
    fn = hips_fn()
    lev = SHORTS_LEVEL
    V, F = G.mc_surface(fn, lev, [-0.19, -0.14, 0.86], [0.19, 0.17, 1.13], SHORTS_H)
    body, sheer = shorts_masks()
    top_lev = lev + SHORTS_T
    out['Shorts'] = G.solid([G.clip_multi_shell(fn, lev, V, F, body + [lambda P: -sheer(P)],
                                                SHORTS_T)],
                            'clothing_gloss', bevel=0.0005, angle=50)
    # sheer mesh panel: slightly sunk and stopping short of the trim
    out['ShortsSheer'] = G.solid([sheer_panel(fn, lev - 0.0005, 0.0011, body)],
                                 'sheer', bevel=0.0, outline_w=0.4)
    # thin black trim along the scoop edge (two smooth cuts -> clean rims)
    trim = body + [lambda P: sheer(P) - 0.0030, lambda P: -(sheer(P) + 0.0025),
                   lambda P: P[..., 2] - base_belt_z(P) + 0.004]
    out['ShortsTrim'] = G.solid([G.clip_multi_shell(fn, lev, V, F, trim, 0.0019, 0.0013)],
                                'black', bevel=0.0003, outline_w=0.45)
    # hem band along the leg openings and the gusset
    HB = 0.010
    hem = body + [lambda P: -np.maximum(leg_side_mask(P, HEM_R, HEM_L, -HB, -HB),
                                        gusset(P, -HB)),
                  lambda P: -sheer(P)]
    out['ShortsHem'] = G.solid([G.clip_multi_shell(fn, lev, V, F, hem, 0.0008, SHORTS_T)],
                               'clothing_gloss', bevel=0.0003, outline_w=0.5)
    # seams: continuous thin ribbons (double centre front, centre back)
    seams = []
    sl = top_lev + 0.00015
    zs = np.linspace(0.990, 0.900, 46)
    inside = lambda Q: np.max([m(Q) for m in body] + [-sheer(Q) - 0.002], axis=0) < -0.0015
    fcf = G.FrontChart(fn)
    for xo in (-0.0034, 0.0034):
        xs = PCX + xo + 0.08 * (zs - 0.95)
        Pp, _ = fcf.lift(xs, zs, sl)
        Pp = Pp[inside(Pp)]
        if len(Pp) > 3:
            seams.append(G.ribbon(fn, Pp, sl, 0.0011, 0.0003))
    fcb = G.FrontChart(fn, y0=0.40, view=(0.0, -1.0, 0.0))
    zb = np.linspace(1.12, 0.90, 80)
    Pb, _ = fcb.lift(np.full_like(zb, PCX), zb, sl)
    Pb = Pb[inside(Pb)]
    if len(Pb) > 3:
        seams.append(G.ribbon(fn, Pb, sl, 0.0011, 0.0003))
    out['ShortsSeams'] = G.solid(seams, 'clothing_seam', bevel=0.0, outline=False)
    # painted gloss streaks (instead of blob speculars)
    st = [streak(P2M([(283, 423)])[0], P2M([(321, 438)])[0], 0.0042, bend=-0.002),
          streak(P2M([(292, 431)])[0], P2M([(309, 437)])[0], 0.0022),
          streak(P2M([(371, 433)])[0], P2M([(351, 443)])[0], 0.0030)]
    out['ShortsSheen'] = G.solid([front_lift(fn, q, top_lev + 0.0001, 0.0002) for q in st],
                                 'clothing_sheen', bevel=0.0, outline=False)
    out.update(zippers(fn))
    out.update(belts())
    return out


# two parallel diagonal zips on her left front hip (~6.3 and 5.3 cm, 1.7 cm apart)
ZIPPERS = [((404, 406), (374, 422)), ((405, 416), (380, 429))]


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
        # pull tab at the upper end
        P1, N1 = fc.lift(np.array([A[0]]), np.array([A[1]]), base + 0.0008)
        tan3 = np.array([u[0], 0.0, u[1]])
        R = frame_from(x=tan3 - N1[0] * np.dot(tan3, N1[0]), z=N1[0])
        teeth.append(box((0.0050, 0.0042, 0.0013), P1[0] - R[:, 0] * 0.0012, R))
    out = {'ShortsZipTape': G.solid(tapes, 'black', bevel=0.0002, outline_w=0.3)}
    out['ShortsZipTeeth'] = G.solid(teeth, 'chrome', bevel=0.0002, outline=False, angle=30)
    return out


def strap_level(sc):
    """Inner offset of a thigh strap: hugs the armour, rises over the
    holster and over the shorts where they reach below the strap."""
    s0, s1 = sc - STRAP_W / 2, sc + STRAP_W / 2

    def lev(T, S):
        ss = np.linspace(s0, s1, 7)
        arm = np.max([armor_level(T, s) for s in ss], axis=0) + ARMOR_T
        dh = np.abs(G.wrap_angle(T, HOLSTER_TH))
        hw = HOLSTER_W / 2 / 0.068 + 0.06
        hol = (holster_level(T, sc) + 0.0030) * (1 - sstep(dh, hw, hw + 0.25))
        hem = G.periodic(T, HEM_L) + 0.004
        cover = sstep(hem - s0, -0.004, 0.006)
        ds = np.abs(G.wrap_angle(T, 0.5 * (SLIT_TH[0] + SLIT_TH[1])))
        cover = cover * sstep(ds, 0.5 * (SLIT_TH[1] - SLIT_TH[0]) - 0.05,
                              0.5 * (SLIT_TH[1] - SLIT_TH[0]) + 0.15)
        sho = (SHORTS_LEVEL + SHORTS_T + 0.0008) * cover
        return np.maximum(np.maximum(arm, hol), sho) + 0.0003
    return lev


# white diagonal belt / black base belt / flap / hanging straps
BASEBELT_LEV, BASEBELT_T = 0.0056, 0.0028
FLAP_LEV, FLAP_T = 0.0087, 0.0014
WBELT_LEV, WBELT_T, WBELT_W = 0.0104, 0.0030, 0.024
TONGUE_LEV = WBELT_LEV + WBELT_T + 0.0003
_CL = {}


def belt_centre(kind):
    """Centre line z_c(theta) of a belt on the hip hull (table, smoothed)."""
    if kind in _CL:
        return _CL[kind]
    ch = G.TorsoChart(hips_fn(), _TORSO, R0=0.12)
    th = np.linspace(-np.pi, np.pi, 720, endpoint=False)
    lev = BASEBELT_LEV if kind == 'base' else WBELT_LEV
    z = np.full_like(th, 1.07)
    for _ in range(4):
        P, N = ch.lift(th * ch.R0, z, lev)
        z = base_belt_z(P) if kind == 'base' else belt_z(P[:, 0])
    z = G.smooth_periodic(z, 4, 2)
    P, N = ch.lift(th * ch.R0, z, lev)
    _CL[kind] = (th, z, P)
    return _CL[kind]


def zc_of(kind, th):
    t, z, _ = belt_centre(kind)
    tt = np.concatenate([t - 2 * np.pi, t, t + 2 * np.pi])
    return np.interp(th, tt, np.tile(z, 3))


def theta_at_px(kind, xpx):
    """Belt angle (front side) where the centre line is at reference x."""
    t, z, P = belt_centre(kind)
    front = P[:, 1] < -0.02
    x = (xpx - PX0) * S
    i = np.nonzero(front)[0]
    j = i[np.argmin(np.abs(P[i, 0] - x))]
    return t[j]


def belt_region(kind, loops_av, level, t, t0=0.0, h=0.003, kz=1.0):
    """Lift a region given in (a = theta*R0, v = height across the belt)."""
    ch = G.TorsoChart(hips_fn(), _TORSO, R0=0.12)
    Q, F = G.tri_region(loops_av, h)

    def to_param(Q):
        th = Q[:, 0] / ch.R0
        return np.stack([Q[:, 0], zc_of(kind, th) + Q[:, 1] * kz], axis=1)
    return G.lift_region(ch, Q, F, level, t, t0, to_param)


def belt_loop(kind, th0, th1, w, level, t, holes=(), h=0.003, ends=('flat', 'flat'), tip=0.02):
    R0 = 0.12
    a0, a1 = th0 * R0, th1 * R0
    hw = w / 2
    loop = []
    if ends[0] == 'point':
        loop += [(a0, 0.0), (a0 + tip, -hw)]
    else:
        loop += [(a0, hw), (a0, -hw)]
    if ends[1] == 'point':
        loop += [(a1 - tip, -hw), (a1, 0.0), (a1 - tip, hw)]
    else:
        loop += [(a1, -hw), (a1, hw)]
    if ends[0] == 'point':
        loop += [(a0 + tip, hw)]
    loops = [np.array(loop)] + [np.array(hl) for hl in holes]
    return belt_region(kind, loops, level, t, h=h)


def ellipse(c, rx, ry, n=14):
    a = np.linspace(0, 2 * np.pi, n, endpoint=False)
    return np.stack([c[0] + rx * np.cos(a), c[1] + ry * np.sin(a)], axis=1)


def belt_dashes(kind, th0, th1, w, level, inset=0.0019, dash=0.0028, gap=0.0020,
                width=0.0007):
    """Stitching: short dashes along both edges of a belt piece."""
    R0 = 0.12
    a0, a1 = th0 * R0, th1 * R0
    loops = []
    a = a0 + 0.004
    while a + dash < a1 - 0.004:
        for v in (w / 2 - inset, -w / 2 + inset):
            loops.append(np.array([(a, v - width / 2), (a + dash, v - width / 2),
                                   (a + dash, v + width / 2), (a, v + width / 2)]))
        a += dash + gap
    parts = []
    for lp in loops:
        parts.append(belt_region(kind, [lp], level, 0.0003, h=0.002))
    return parts


def belts():
    out = {}
    R0 = 0.12
    # ---- black base belt (closed ring at the top of the shorts)
    ch = G.TorsoChart(hips_fn(), _TORSO, R0=R0)
    th = np.linspace(-np.pi, np.pi, 240, endpoint=False)
    vv = np.linspace(-BASE_BELT_W / 2, BASE_BELT_W / 2, 7)
    T, Vv = np.meshgrid(th, vv)
    Z = zc_of('base', T) + Vv
    P, N = ch.lift(T * R0, Z, BASEBELT_LEV)
    P, N = P.reshape(-1, 3), N.reshape(-1, 3)
    Fb = G.orient(P, N, G.grid_tris(len(th), len(vv), closed_u=True))
    out['BeltBase'] = G.solid([G.shell(P, N, Fb, BASEBELT_T)], 'clothing_fabric', bevel=0.0005)

    # ---- white belt with a red segment towards her left hip
    tb = np.radians(-38.0)                      # buckle (accessories)
    tr0, tr1 = theta_at_px('white', 348), theta_at_px('white', 389)
    holes = [ellipse((theta_at_px('white', x) * R0, 0.0), 0.0032, 0.0019)
             for x in (323, 334)]
    w1 = belt_loop('white', tb, tr0, WBELT_W, WBELT_LEV, WBELT_T, holes)
    w2 = belt_loop('white', tr1, tb + 2 * np.pi, WBELT_W, WBELT_LEV, WBELT_T, h=0.004)
    tongue = belt_loop('white', tb - np.radians(31.0), tb + np.radians(4.0), WBELT_W * 0.92,
                       TONGUE_LEV, 0.0025, ends=('point', 'flat'), tip=0.011)
    out['BeltWhite'] = G.solid([w1, w2, tongue], 'white', bevel=0.0005, outline_w=0.8)
    out['BeltRed'] = G.solid([belt_loop('white', tr0, tr1, WBELT_W, WBELT_LEV, WBELT_T)],
                             'red', bevel=0.0005, outline_w=0.8)
    top = WBELT_LEV + WBELT_T
    dashes = belt_dashes('white', tb + 0.02, tr0, WBELT_W, top) + \
        belt_dashes('white', tr1, tr1 + np.radians(60), WBELT_W, top) + \
        belt_dashes('white', tb - np.radians(28.0), tb, WBELT_W * 0.92, top + 0.0028)
    out['BeltStitch'] = G.solid(dashes, 'gray', bevel=0.0, outline=False)
    # small white "text" on the red segment
    txt = []
    rng = np.random.default_rng(3)
    for row, v in enumerate((0.0030, -0.0005)):
        a = tr0 * R0 + 0.010
        while a < tr1 * R0 - 0.022 - row * 0.012:
            ln = rng.uniform(0.0008, 0.0026)
            txt.append(belt_region('white', [np.array([(a, v - 0.0006), (a + ln, v - 0.0006),
                                                       (a + ln, v + 0.0006), (a, v + 0.0006)])],
                                   top, 0.0002, h=0.0015))
            a += ln + rng.uniform(0.0006, 0.0014)
    out['BeltRedText'] = G.solid(txt, 'decal_white', bevel=0.0, outline=False)

    # ---- white triangular flap over her right front hip
    tA, tB, tC = np.radians(-43.0), np.radians(-97.0), np.radians(-84.0)
    ts = np.linspace(tA, tB, 12)
    loop = [(t * R0, zc_of('white', t) + 0.006) for t in ts]
    loop += [(tC * R0, 0.982)]
    Q, F = G.tri_region([np.array(loop)], 0.004)

    def flap_lev(a, z):
        th = a / R0
        drop = np.clip((zc_of('white', th) - z) / 0.08, 0, 1)
        return FLAP_LEV + 0.004 * drop ** 1.5
    V, Ff = G.lift_region(ch, Q, F, flap_lev, FLAP_T)
    out['BeltFlap'] = G.solid([(V, Ff)], 'white', bevel=0.0004, outline_w=0.8)

    # ---- two loose white straps hanging from the right hip to the knee
    out['HipStrapsWhite'] = hanging_straps()
    return out


def hanging_straps():
    from hardsurf import sweep, rounded_rect
    from meshutil import catmull
    parts = []
    for dx, dz, zend in ((0.0, 0.0, 0.600), (-0.013, -0.006, 0.640)):
        ctrl = np.array([[-0.136 + dx, -0.010, 1.000 + dz],
                         [-0.160 + dx, 0.000, 0.930 + dz],
                         [-0.168 + dx, 0.036, 0.840],
                         [-0.176 + dx, 0.026, 0.740],
                         [-0.182 + dx, 0.012, zend]])
        pts, tan = catmull(ctrl, 60)
        up = np.tile(np.array([1.0, 0.25, 0.0]), (len(pts), 1))   # width across, faces front
        prof = rounded_rect(0.0018, 0.0115, 0.0006, seg=1)
        V, F = sweep(prof, pts, up)
        parts.append((V, F))
    return G.solid(parts, 'white', bevel=0.0003, angle=35, outline_w=0.7)


# ------------------------------------------------------------ bikini top

TOP_FN = None


def top_fn():
    global TOP_FN
    if TOP_FN is None:
        TOP_FN = G.body_subset(['torso', 'breastR', 'breastL', 'neck', 'clavR', 'deltR',
                                'clavL', 'deltL'])
    return TOP_FN


# cups traced on the reference, widened towards the side of each breast
# (the outer edge of her right cup runs past the silhouette and wraps round)
CUP_L = [(351, 204), (358, 209), (366, 216), (374, 225), (380, 234), (385, 243),
         (388, 251), (389, 257), (355, 258), (321, 258), (324, 247), (330, 236),
         (337, 224), (344, 212)]
# her right cup is turned away from the camera: it is given directly in torso
# chart coordinates (angle in degrees, reference row) so it wraps the breast
CUP_R_CH = [(-78.9, 208), (-84, 214), (-90, 224), (-95, 236), (-98, 248), (-99, 258),
            (-70, 259), (-34.4, 259), (-41, 249), (-48, 238), (-56, 228), (-66, 217)]
# inner edges (apex -> inner bottom) used for the grey lining strips
CUP_L_INNER = [(351, 204), (344, 212), (337, 224), (330, 236), (324, 247), (321, 258)]
CUP_R_INNER = [(-76, 207), (-66, 217), (-56, 228), (-48, 238), (-41, 249), (-35, 259)]
BAND_Z = ((PY0 - 268) * S, (PY0 - 252) * S)
CUP_LEV, CUP_T = 0.0012, 0.0022
BAND_LEV, BAND_T = 0.0010, 0.0026
CUP_WRAP = 0.05


def front_patch(fn, poly_px, level, t, t0=0.0, h=0.0025):
    """Region traced on the reference, mapped onto the torso hull through
    the torso chart (wraps round the side past the silhouette)."""
    return front_patch_m(fn, np.array(P2M(poly_px)), level, t, h)


def front_patch_m(fn, loop_m, level, t, h=0.0015):
    ch = G.TorsoChart(fn, _TORSO, R0=0.12)
    lev0 = level if not callable(level) else 0.0
    loop = G.resample(np.asarray(loop_m), 0.003)
    Q = G.torso_params_for_front(ch, loop, lev0, wrap_r=CUP_WRAP)
    # drop consecutive duplicates
    keep = np.r_[True, np.linalg.norm(np.diff(Q, axis=0), axis=1) > 1e-5]
    Q = Q[keep]
    Q2, F = G.tri_region([Q], h)
    return G.lift_region(ch, Q2, F, level, t)


def chart_px(loop):
    """(angle deg, reference row) -> torso chart parameters (a, z)."""
    L = np.asarray(loop, dtype=np.float64)
    return np.stack([np.radians(L[:, 0]) * 0.12, (PY0 - L[:, 1]) * S], axis=1)


def chart_patch(fn, loop_az, level, t, h=0.0025, res=0.003):
    """Region given in torso chart parameters (a, z), lifted onto the hull."""
    ch = G.TorsoChart(fn, _TORSO, R0=0.12)
    Q = G.resample(np.asarray(loop_az), res)
    Q2, F = G.tri_region([Q], h)
    return G.lift_region(ch, Q2, F, level, t)


def stroke(p0, p1, w0, w1, n=8):
    """Brush stroke polygon (model x, z) tapering from w0 to w1."""
    p0, p1 = np.asarray(p0), np.asarray(p1)
    d = p1 - p0
    nv = np.array([-d[1], d[0]]) / np.linalg.norm(d)
    ts = np.linspace(0, 1, n)
    w = w0 + (w1 - w0) * ts
    w = w * (0.80 + 0.20 * np.sin(np.pi * ts))
    left = [p0 + d * t + nv * wi / 2 for t, wi in zip(ts, w)]
    right = [p0 + d * t - nv * wi / 2 for t, wi in zip(ts, w)]
    return np.array(left + right[::-1])


def lining_strip(edge, cup, frac=0.62, w=0.0045, start=0.07, inset=0.0004):
    """Thin strip inside a cup along the upper part of its inner edge,
    tapering to a point at its lower end (2D polygon in the edge's space)."""
    E = np.asarray(edge, dtype=np.float64)
    seg = np.linalg.norm(np.diff(E, axis=0), axis=1)
    L = np.concatenate([[0], np.cumsum(seg)])
    cen = np.mean(np.asarray(cup, dtype=np.float64), axis=0)
    ts = np.linspace(start, frac, 14) * L[-1]
    pts = np.stack([np.interp(ts, L, E[:, 0]), np.interp(ts, L, E[:, 1])], axis=1)
    tan = np.gradient(pts, axis=0)
    tan /= np.linalg.norm(tan, axis=1, keepdims=True)
    nv = np.stack([-tan[:, 1], tan[:, 0]], axis=1)
    if np.dot(nv.mean(axis=0), cen - pts.mean(axis=0)) < 0:
        nv = -nv
    u = (ts - ts[0]) / (ts[-1] - ts[0])
    wid = w * np.clip(1.0 - u ** 2.2, 0.0, 1.0) * np.clip(u / 0.12 + 0.35, 0, 1)
    a = pts + nv * inset
    b = pts + nv * (inset + np.maximum(wid, 0.0002))[:, None]
    return np.concatenate([a, b[::-1]])


# the inner edge of her right cup is a straight line in the front view
CUP_R_INNER_PX = ((305.0, 208.0), (319.0, 259.0))


def cup_r_chart(fn):
    """Right cup outline in chart params: the outer edge given in chart
    coordinates (wraps the breast), the inner edge straight in front view."""
    ch = G.TorsoChart(fn, _TORSO, R0=0.12)
    (x0, y0), (x1, y1) = CUP_R_INNER_PX
    t = np.linspace(0, 1, 15)
    px = np.stack([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], axis=1)
    inner = G.torso_params_for_front(ch, np.array(P2M(px)), CUP_LEV + CUP_T)
    outer = chart_px(CUP_R_CH[:7])            # apex -> outer side -> bottom
    loop = np.concatenate([outer, inner[::-1][:-1]])
    return loop, inner


def bikini():
    out = {}
    fn = top_fn()
    cupR, innerR = cup_r_chart(fn)
    cups = [front_patch(fn, CUP_L, CUP_LEV, CUP_T),
            chart_patch(fn, cupR, CUP_LEV, CUP_T, h=0.0016, res=0.0008)]
    # halter straps: one straight sweep from each cup apex up to the collar
    apex = cupR[0]
    collar_r = chart_px([(-33, 188)])[0]
    d = collar_r - apex
    nv = np.array([-d[1], d[0]]) / np.linalg.norm(d) * 0.0055
    strapR = np.array([apex - nv * 0.45 - d * 0.10, apex + nv * 0.45 - d * 0.10,
                       apex + nv * 0.8 + d * 0.12, collar_r + nv * 0.95, collar_r - nv * 0.95,
                       apex - nv * 0.8 + d * 0.12])
    straps = [front_patch(fn, [(348, 207), (355, 207), (362, 186), (356, 185)], CUP_LEV,
                          CUP_T, h=0.002),
              chart_patch(fn, strapR, CUP_LEV, CUP_T, h=0.002)]
    out['BikiniTop'] = G.solid(cups + straps, 'clothing_fabric', bevel=0.0005, outline_w=0.8)
    top = CUP_LEV + CUP_T
    lin = [front_patch_m(fn, lining_strip(P2M(CUP_L_INNER), P2M(CUP_L)), top + 0.0001,
                         0.0006, h=0.0012),
           front_patch_m(fn, lining_strip(P2M(CUP_R_INNER_PX), P2M([(292, 236)])),
                         top + 0.0001, 0.0006, h=0.0012)]
    out['BikiniLining'] = G.solid(lin, 'clothing_lining', bevel=0.0, outline_w=0.3)
    # soft round highlight (painted, like the reference's grey disc)
    hl = [front_patch_m(fn, ellipse(np.array(P2M([(349, 236)])[0]), 0.0118, 0.0132, 28),
                        top + 0.00005, 0.0003, h=0.0015),
          chart_patch(fn, ellipse(chart_px([(-77, 242)])[0], 0.0085, 0.0095, 24),
                      top + 0.00005, 0.0003, h=0.0015)]
    out['BikiniHighlight'] = G.solid(hl, 'clothing_cuphl', bevel=0.0, outline=False)
    # under-bust band (black) with a white lower trim, closed ring
    ch = G.TorsoChart(fn, _TORSO, R0=0.12)
    z0, z1 = BAND_Z
    zt = z0 + 0.0055
    th = np.linspace(-np.pi, np.pi, 200, endpoint=False)

    def ring(za, zb, lev, t, nv=5):
        T, Z = np.meshgrid(th, np.linspace(za, zb, nv))
        P, N = ch.lift(T * ch.R0, Z, lev)
        P, N = P.reshape(-1, 3), N.reshape(-1, 3)
        F = G.orient(P, N, G.grid_tris(len(th), nv, closed_u=True))
        return G.shell(P, N, F, t)
    out['BikiniBand'] = G.solid([ring(zt, z1, BAND_LEV, BAND_T, 6)], 'clothing_fabric',
                                bevel=0.0005, outline_w=0.8)
    out['BikiniTrim'] = G.solid([ring(z0, zt, BAND_LEV, BAND_T + 0.0003, 3)], 'white',
                                bevel=0.0004, outline_w=0.6)
    # painted red X on the upper centre of her right cup: two straight strokes
    # (~2.5 cm long, 3-4 mm wide) crossing at their midpoints
    c = chart_px([(-55, 237)])[0]
    a = 0.0088
    xs = [stroke(c + (-a, a), c + (a, -a), 0.0040, 0.0030),
          stroke(c + (a, a), c + (-a, -a), 0.0036, 0.0028)]
    red = [chart_patch(fn, x, top + 0.00012 + 0.0001 * i, 0.0003, h=0.0012)
           for i, x in enumerate(xs)]
    out['BikiniMarkX'] = G.solid(red, 'clothing_red', bevel=0.0, outline=False)
    return out


# ------------------------------------------------------------ sleeves and forearm wraps

ARM_R0 = 0.025
SK_R = float(np.linalg.norm(J['shoulder_R'] - J['elbow_R']))
L_R = float(np.linalg.norm(J['shoulder_R'] - J['wrist_R']))
SK_L = float(np.linalg.norm(J['shoulder_L'] - J['elbow_L']))
L_L = float(np.linalg.norm(J['shoulder_L'] - J['wrist_L']))
SLEEVE_T = 0.0018


def _ring(ch, s0, s1, level, t, n=64, nv=None):
    th = np.linspace(0, 2 * np.pi, n, endpoint=False)
    nv = nv or max(2, int(np.ceil((s1 - s0) / 0.006)) + 1)
    return G.band_shell(ch, th, np.linspace(s0, s1, nv), level, t)


def _patch(ch, th0, th1, s0, s1, level, t, corner=0.0, h=0.0025):
    """Rectangle in (angle, s) on a limb, optional chamfered corners."""
    a0, a1 = th0 * ch.R0, th1 * ch.R0
    c = corner
    if c > 0:
        loop = [(a0 + c, s0), (a1 - c, s0), (a1, s0 + c), (a1, s1 - c), (a1 - c, s1),
                (a0 + c, s1), (a0, s1 - c), (a0, s0 + c)]
    else:
        loop = [(a0, s0), (a1, s0), (a1, s1), (a0, s1)]
    Q, F = G.tri_region([np.array(loop)], h)
    return G.lift_region(ch, Q, F, level, t)


def _text_bars(ch, a0, s0, rows, level, rng, length, h=0.0009, step=0.0018, vertical=False):
    """Pseudo printed text: rows of short bars starting at (a0, s0)."""
    out = []
    for r in range(rows):
        a = 0.0
        while a < length * (1.0 - 0.25 * r):
            ln = rng.uniform(0.0007, 0.0024)
            if vertical:
                loop = [(a0 + r * step, s0 + a), (a0 + r * step + h, s0 + a),
                        (a0 + r * step + h, s0 + a + ln), (a0 + r * step, s0 + a + ln)]
            else:
                loop = [(a0 + a, s0 + r * step), (a0 + a + ln, s0 + r * step),
                        (a0 + a + ln, s0 + r * step + h), (a0 + a, s0 + r * step + h)]
            Q, F = G.tri_region([np.array(loop)], 0.0008)
            out.append(G.lift_region(ch, Q, F, level, 0.00015))
            a += ln + rng.uniform(0.0004, 0.0010)
    return out


def _radius_table(ch, s0, s1, level, n=40):
    """Mean radius of the lifted surface around a limb, as a function of s."""
    ss = np.linspace(s0, s1, n)
    th = np.linspace(0, 2 * np.pi, 16, endpoint=False)
    T, Ss = np.meshgrid(th, ss)
    P, N = ch.lift(T * ch.R0, Ss, np.full(T.shape, level))
    C, D = ch.frame(T * ch.R0, Ss)
    r = np.linalg.norm(P - C, axis=-1).mean(axis=1)
    return lambda sv: np.interp(sv, ss, r)


def _helix(ch, rfun, sa, sb, pitch, hand, th0, width, level, t, step=0.004, nv=5):
    """Flat strap wound around a limb as a helix between s = sa and sb.
    ``width`` is measured perpendicular to the strap on the surface;
    ``level(th, s)`` gives the inner offset.  Returns (shell, centre fn)."""
    sm = 0.5 * (sa + sb)
    r = rfun(sm)
    k = hand * 2 * np.pi / pitch                       # dtheta / ds
    nrm_ = np.sqrt(1 + (k * r) ** 2)
    ds_end = width / 2 * abs(k) * r / nrm_             # keep the square ends inside [sa, sb]
    arc = (sb - sa - 2 * ds_end) * nrm_
    n = max(4, int(np.ceil(arc / step)) + 1)
    sc = np.linspace(sa + ds_end, sb - ds_end, n)
    vv = np.linspace(-1, 1, nv)
    Sc, Vg = np.meshgrid(sc, vv, indexing='ij')
    rr = rfun(Sc)
    kr = k * rr
    nn = np.sqrt(1 + kr ** 2)
    # offset perpendicular to the strap in the unrolled (u = r theta, s) plane
    Sg = Sc - Vg * width / 2 * kr / nn
    Tg = th0 + k * (Sc - sa) + Vg * width / 2 / nn / rr
    lev = level(Tg, Sg)
    P, N = ch.lift(Tg * ch.R0, Sg, lev)
    P, N = P.reshape(-1, 3), N.reshape(-1, 3)
    F = G.orient(P, N, G.grid_tris(nv, n))
    centre = lambda S_: th0 + k * (S_ - sa)
    return G.shell(P, N, F, t), centre, k


def sleeves():
    out = {}
    rng = np.random.default_rng(7)
    # ================= right arm: full sleeve
    arm = B.arm('R')
    ch = G.LimbChart(arm, G.body_subset(['deltR', 'armR']), R0=ARM_R0)
    sl_lev = lambda T, Sv: 0.0030 + 0.0015 * np.exp(-((Sv - 0.10) / 0.08) ** 2)
    th = np.linspace(0, 2 * np.pi, 72, endpoint=False)
    # the sleeve starts at the shoulder joint (the coat covers the shoulder);
    # starting higher made the tube poke through the deltoid skin
    ss = G.rows(0.004, L_R - 0.012, 0.007)
    out['SleeveR'] = G.solid([G.band_shell(ch, th, ss, sl_lev, SLEEVE_T)], 'coat',
                             bevel=0.0005, outline_w=0.9)
    lvl = lambda add: (lambda T, Sv: sl_lev(T, Sv) + SLEEVE_T + add)
    # two black bands on the upper arm with small silver tags
    BANDS_R = ((0.068, 0.088), (0.126, 0.146))
    bands = [_ring(ch, a_, b_, lvl(0.0002), 0.0022) for a_, b_ in BANDS_R]
    tags = []
    tag_th = np.radians(-72.0)
    for a_, b_ in BANDS_R:
        c = 0.5 * (a_ + b_)
        r = 0.040
        dth = 0.0040 / r
        tags.append(_patch(ch, tag_th - dth, tag_th + dth, c - 0.0060, c + 0.0060,
                           lvl(0.0026), 0.0012, corner=0.0010, h=0.0012))
    # striped panel around the elbow (front-outer side)
    thc = np.radians(-25.0)
    hw = np.radians(58.0)
    PAN0, PAN1 = 0.168, 0.296
    panel = _patch(ch, thc - hw, thc + hw, PAN0, PAN1, lvl(0.0002), 0.0010, corner=0.002)
    halo, stripes, cores = [], [], []
    for k in (-1, 0, 1):
        c = thc + k * np.radians(27.0)
        halo.append(_patch(ch, c - np.radians(8.5), c + np.radians(8.5), PAN0 + 0.003,
                           PAN1 - 0.003, lvl(0.0013), 0.0002, h=0.002))
        stripes.append(_patch(ch, c - np.radians(5.0), c + np.radians(5.0), PAN0 + 0.004,
                              PAN1 - 0.004, lvl(0.0016), 0.0002, h=0.002))
        cores.append(_patch(ch, c - np.radians(1.0), c + np.radians(1.0), PAN0 + 0.007,
                            PAN1 - 0.007, lvl(0.0019), 0.0002, h=0.0015))
    # one black strap over the striped panel, white plate on the lower
    # forearm and the black wristband at the cuff
    bands += [_ring(ch, 0.233, 0.247, lvl(0.0022), 0.0020)]
    gaunt = _patch(ch, thc - np.radians(62), thc + np.radians(62), 0.300, 0.432, lvl(0.0002),
                   0.0020, corner=0.004)
    label = _patch(ch, thc - np.radians(14), thc + np.radians(14), 0.308, 0.322,
                   lvl(0.0023), 0.0004, h=0.0015)
    bands += [_ring(ch, 0.440, L_R - 0.008, lvl(0.0002), 0.0034)]
    out['SleeveRPanels'] = G.solid([panel, gaunt], 'coat', bevel=0.0005, outline_w=0.6)
    out['SleeveRGlowHalo'] = G.solid(halo, 'clothing_glow_halo', bevel=0.0, outline=False)
    out['SleeveRStripes'] = G.solid(stripes, 'glow_red', bevel=0.0, outline=False)
    out['SleeveRGlowCore'] = G.solid(cores, 'clothing_glow_core', bevel=0.0, outline=False)
    out['SleeveRBands'] = G.solid(bands, 'black', bevel=0.0005, outline_w=0.7)
    out['SleeveRTags'] = G.solid(tags, 'metal', bevel=0.0003, outline_w=0.4)
    out['SleeveRLabel'] = G.solid([label], 'gray', bevel=0.0, outline=False)

    # ================= left arm: sleeve cut above the elbow
    arm = B.arm('L')
    ch = G.LimbChart(arm, G.body_subset(['deltL', 'armL']), R0=ARM_R0)
    sl_lev = lambda T, Sv: 0.0030 + 0.0060 * sstep(Sv, 0.0, 0.13)
    lvl = lambda add: (lambda T, Sv: sl_lev(T, Sv) + SLEEVE_T + add)
    END = SK_L - 0.036
    ss = G.rows(0.004, END, 0.007)
    out['SleeveL'] = G.solid([G.band_shell(ch, th, ss, sl_lev, SLEEVE_T)], 'coat',
                             bevel=0.0005, outline_w=0.9)
    bl = [_ring(ch, 0.036, 0.048, lvl(0.0002), 0.0020),
          _ring(ch, 0.054, 0.097, lvl(0.0002), 0.0030)]
    out['SleeveLBand'] = G.solid(bl, 'black', bevel=0.0005, outline_w=0.7)
    out['SleeveLHem'] = G.solid([_ring(ch, END - 0.013, END, lvl(0.0002), 0.0016)],
                                'coat_trim', bevel=0.0004, outline_w=0.6)
    # silver label on the front-outer face of the white segment
    lc = np.radians(35.0)
    lab = _patch(ch, lc - np.radians(26), lc + np.radians(26), 0.104, 0.128, lvl(0.0002),
                 0.0010, corner=0.0015, h=0.0015)
    out['SleeveLLabel'] = G.solid([lab], 'metal', bevel=0.0003, outline_w=0.4)
    txt = _text_bars(ch, (lc - np.radians(20)) * ARM_R0, 0.110, 3, lvl(0.0013), rng, 0.016)
    out['SleeveLLabelText'] = G.solid(txt, 'black', bevel=0.0, outline=False)

    # forearm: smooth matte red base (tucked under the sleeve hem, slightly
    # fuller towards the elbow) wound with wide flat black bandage straps:
    # one dominant spiral (~4 turns) and a counter spiral (2 turns)
    W0, W1 = END - 0.022, L_L - 0.006
    RED_T = 0.0024
    red_lev = lambda T, Sv: 0.0007 + 0.0005 * (1 - sstep(Sv, END + 0.03, L_L - 0.04))
    thr = np.linspace(0, 2 * np.pi, 96, endpoint=False)
    out['ArmWrapRed'] = G.solid([G.band_shell(ch, thr, G.rows(W0, W1, 0.004), red_lev, RED_T)],
                                'clothing_red', bevel=0.0004, outline_w=0.8, angle=60)
    rfun = _radius_table(ch, W0, W1, 0.0040)
    # wide black band with printed text right under the elbow ring (as in the
    # reference), the straps start under it and end under the wrist ring
    WB0, WB1 = END + 0.027, END + 0.055
    sa, sb = WB0 + 0.020, L_L - 0.012
    base = lambda T, Sv: red_lev(T, Sv) + RED_T + 0.0002
    WIDTH = 0.020
    s1, c1, k1 = _helix(ch, rfun, sa, sb, (sb - sa) / 4.5, 1, np.radians(20), WIDTH, base,
                        0.0012)
    r_m = rfun(0.5 * (sa + sb))
    hw1 = WIDTH / 2

    def lev2(T, Sv):
        d = np.abs(G.wrap_angle(T, c1(Sv))) * rfun(Sv) / np.sqrt(1 + (k1 * rfun(Sv)) ** 2)
        over = 1 - sstep(d, hw1 + 0.0005, hw1 + 0.0065)
        return base(T, Sv) + 0.0013 * over
    s2, c2, k2 = _helix(ch, rfun, sa + 0.006, sb - 0.030, (sb - sa - 0.036) / 1.6, -1,
                        np.radians(200), WIDTH * 0.95, lev2, 0.0012)
    wb_lev = lambda T, Sv: red_lev(T, Sv) + RED_T + 0.0029
    wband = _ring(ch, WB0, WB1, wb_lev, 0.0018, n=96)
    wband2 = _ring(ch, L_L - 0.046, L_L - 0.030, wb_lev, 0.0016, n=96)   # above the wrist ring
    out['ArmWrapBlack'] = G.solid([s1, s2, wband, wband2], 'clothing_fabric', bevel=0.0004, outline_w=0.6,
                                  angle=50)
    tag_lev = lambda T, Sv: wb_lev(T, Sv) + 0.0018 + 0.0001
    tg = _text_bars(ch, np.radians(-5) * ARM_R0, WB0 + 0.009, 2, tag_lev, rng, 0.020,
                    h=0.0010, step=0.0035)
    out['ArmWrapText'] = G.solid(tg, 'decal_white', bevel=0.0, outline=False)
    return out

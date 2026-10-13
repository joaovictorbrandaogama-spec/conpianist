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
    out['BikiniClasp'] = sdf_mesh([clasp], c - 0.02, c + 0.02, 0.0006, 'metal',
                                  decimate=1500, outline_w=0.5)
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


def shorts():
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
    out['BeltBuckle'] = sdf_mesh([outer], c - 0.03, c + 0.03, 0.0006, 'metal',
                                 ops=[cut], decimate=3000, outline_w=0.5)
    return out


def thigh_strap():
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


# ------------------------------------------------------------ coat

COAT_OFF = 0.011
COAT_OPEN = [(338, 185), (325, 198), (312, 212), (298, 225), (288, 240), (285, 262),
             (287, 300), (289, 340), (291, 370), (289, 420), (277, 480), (265, 560),
             (257, 640), (250, 1000), (640, 1000), (585, 800), (522, 680), (472, 560),
             (442, 480), (426, 440), (411, 400), (401, 370), (393, 340), (385, 300),
             (376, 262), (372, 240), (369, 215), (366, 200), (360, 185), (350, 178)]
PCX, PCY = -0.009, 0.016          # pelvis centre for the hanging part


def wrap_interp(theta_deg, knots):
    k = sorted(knots)
    xs = np.array([a for a, _ in k])
    ys = np.array([b for _, b in k])
    xs = np.concatenate([xs - 360, xs, xs + 360])
    ys = np.concatenate([ys, ys, ys])
    return np.interp(theta_deg, xs, ys)


HEM = [(-40, 0.60), (-70, 0.60), (-95, 0.57), (-118, 0.31), (-150, 0.29),
       (-160, 0.33), (-168, 0.75), (180, 0.73), (168, 0.70), (158, 0.66),
       (150, 0.30), (100, 0.28), (60, 0.29), (30, 0.30), (0, 0.45)]
FLARE = [(-40, 0.06), (-80, 0.065), (-110, 0.085), (-150, 0.09), (180, 0.08),
         (150, 0.14), (115, 0.25), (80, 0.31), (50, 0.30), (20, 0.15), (0, 0.10)]


def lower_field(P):
    """rho - r(theta, z) around the pelvis axis (hanging part of the coat)."""
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    dx, dy = x - PCX, y - PCY
    rho = np.sqrt(dx * dx + dy * dy)
    th = np.arctan2(dx, -dy)
    return rho - coat_radius(th, z)


def coat_radius(th, z):
    zc = np.maximum(z, 0.975)
    base = loft_radius(_TORSO, th, zc) + COAT_OFF
    f = np.clip((0.985 - z) / 0.70, 0, None) ** 1.25
    return base + wrap_interp(np.degrees(th), FLARE) * f


def coat_masks(P):
    x, y, z = P[..., 0], P[..., 1], P[..., 2]
    th = np.degrees(np.arctan2(x - PCX, -(y - PCY)))
    hem = wrap_interp(th, HEM) - z
    nb = J['neck_base']
    neck = 0.050 - np.sqrt((x - nb[0]) ** 2 + (y - nb[1]) ** 2)
    neck = np.where(z > 1.37, neck, -1.0)
    zc = np.clip(z, 0.93, 1.40)
    cx = _TORSO.prof('cx', zc)
    cy = _TORSO.prof('cy', zc)
    r = np.radians(_TORSO.prof('rot', zc))
    yl = -(x - cx) * np.sin(r) + (y - cy) * np.cos(r)
    op = polygon_sd(x, z, P2M(COAT_OPEN))
    opening = np.maximum(op, yl)
    return np.maximum(np.maximum(hem, neck), -opening)


Z_SEAM = 0.986


COAT_T = 0.0045
Z_JOIN = 0.95


def coat():
    """Coat mid-surface: MC of the blended field above Z_JOIN, explicit
    parametric surface below; clipped by the masks; lining inside (red),
    white outside via Solidify."""
    upper = [(B.torso(), 0.0)] + [(b, 0.02) for b in B.breasts()] + \
            [(p, 0.03) for p in B.shoulders()] + [(gl, 0.03) for gl in B.glutes()]
    g = Grid([-0.21, -0.18, Z_JOIN - 0.03], [0.25, 0.17, 1.47], 0.0016)
    for prim, k in upper:
        g.union(prim, k)

    def blend(d, P):
        s = sstep(P[..., 2], 0.97, 1.08)
        return ((d - COAT_OFF) * s + lower_field(P) * (1 - s)).astype(np.float32)
    g.map(blend)
    v, f = g.mesh(level=0.0)
    v, f = clip_mesh(v, f, np.maximum(coat_masks(v), Z_JOIN - v[:, 2]))
    v2, f2 = coat_lower_surface()
    V = np.concatenate([v, v2])
    F = np.concatenate([f, f2 + len(v)])
    return {'Coat': MeshData(V, F, mat='coat', decimate=70000,
                             props={'solidify': COAT_T, 'shell_mat': 'lining',
                                    'solid_offset': 0.0})}


def coat_lower_surface():
    """Hanging part: explicit grid in (theta, z), clipped by the masks."""
    th = np.radians(np.linspace(0.0, 360.0, 721))
    th = np.where(th > np.pi, th - 2 * np.pi, th)
    zs = np.linspace(0.20, Z_JOIN, 301)
    T, Z = np.meshgrid(np.unwrap(th), zs, indexing='ij')
    R = coat_radius(T, Z)
    P = np.stack([PCX + R * np.sin(T), PCY - R * np.cos(T), Z], axis=-1)
    V, F = grid_surface(P)
    F = np.asarray(F)
    # quads -> triangles, oriented outwards (away from the axis)
    tri = np.concatenate([F[:, [0, 1, 2]], F[:, [0, 2, 3]]])
    n = np.cross(V[tri[:, 1]] - V[tri[:, 0]], V[tri[:, 2]] - V[tri[:, 0]])
    c = V[tri].mean(axis=1)
    radial = c[:, :2] - np.array([PCX, PCY])
    if np.sum(n[:, 0] * radial[:, 0] + n[:, 1] * radial[:, 1]) < 0:
        tri = tri[:, ::-1]
    m = np.maximum(coat_masks(V), V[:, 2] - Z_JOIN - 1e-6)
    return clip_mesh(V, tri, m)


def coat_collar():
    nb = J['neck_base']
    th = np.radians(np.linspace(-180, 180, 241))
    zs = np.linspace(1.375, 1.47, 49)
    T, Z = np.meshgrid(th, zs, indexing='ij')
    R = 0.047 + (Z - 1.40) * 0.20
    P = np.stack([nb[0] + R * np.sin(T), nb[1] + 0.010 - R * np.cos(T), Z], axis=-1)
    V, F = grid_surface(P)
    F = np.asarray(F)
    tri = np.concatenate([F[:, [0, 1, 2]], F[:, [0, 2, 3]]])
    n = np.cross(V[tri[:, 1]] - V[tri[:, 0]], V[tri[:, 2]] - V[tri[:, 0]])
    radial = V[tri].mean(axis=1)[:, :2] - np.array([nb[0], nb[1]])
    if np.sum(n[:, 0] * radial[:, 0] + n[:, 1] * radial[:, 1]) < 0:
        tri = tri[:, ::-1]
    thd = np.degrees(np.arctan2(V[:, 0] - nb[0], -(V[:, 1] - nb[1] - 0.010)))
    top = 1.448 - 0.022 * np.cos(np.radians(thd))
    m = np.maximum(np.maximum(1.385 - V[:, 2], V[:, 2] - top), 92 - np.abs(thd))
    V, F = clip_mesh(V, tri, m)
    return {'CoatCollar': MeshData(V, F, mat='coat', outline_w=0.8,
                                   props={'solidify': 0.004, 'shell_mat': 'lining',
                                          'solid_offset': 0.0})}


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

def leg_armor():
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
    out['LegBuckles'] = sdf_mesh(buckles, lo, hi, 0.0006, 'metal', ops=[holes],
                                 decimate=3000, outline_w=0.5)
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
    out['LegClips'] = sdf_mesh(clips, lo, hi, 0.0008, 'black', decimate=2000, outline_w=0.6)
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

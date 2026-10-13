"""Body, head and hand shapes (signed distance functions)."""

import numpy as np

from sdf import (Loft, Ellipsoid, RoundCone, Chain, Sphere, Union, Box,
                 euler, smin, normalize, v3, limb_frame)
from rig import J, lerp


# ------------------------------------------------------------------ torso

TORSO_KNOTS = {
    #        z      value
    'cx': [(1.405, 0.012), (1.370, 0.012), (1.340, 0.011), (1.300, 0.007),
           (1.270, 0.002), (1.235, -0.006), (1.205, -0.012), (1.170, -0.017),
           (1.140, -0.019), (1.100, -0.017), (1.060, -0.013), (1.020, -0.010),
           (0.990, -0.009), (0.960, -0.009), (0.930, -0.009)],
    'cy': [(1.405, 0.024), (1.370, 0.014), (1.340, 0.008), (1.300, 0.006),
           (1.270, 0.006), (1.235, 0.007), (1.205, 0.009), (1.170, 0.010),
           (1.140, 0.010), (1.100, 0.010), (1.060, 0.012), (1.020, 0.014),
           (0.990, 0.016), (0.960, 0.016), (0.930, 0.014)],
    'a': [(1.405, 0.050), (1.370, 0.088), (1.340, 0.094), (1.300, 0.091),
          (1.270, 0.087), (1.235, 0.083), (1.205, 0.081), (1.170, 0.083),
          (1.140, 0.088), (1.100, 0.100), (1.060, 0.113), (1.020, 0.122),
          (0.990, 0.122), (0.960, 0.108), (0.930, 0.080)],
    'bf': [(1.405, 0.040), (1.370, 0.058), (1.340, 0.066), (1.300, 0.068),
           (1.270, 0.066), (1.235, 0.061), (1.205, 0.058), (1.170, 0.058),
           (1.140, 0.060), (1.100, 0.063), (1.060, 0.064), (1.020, 0.062),
           (0.990, 0.058), (0.960, 0.052), (0.930, 0.040)],
    'rot': [(1.405, -12.0), (1.36, -20.0), (1.30, -22.0), (1.24, -21.0), (1.16, -18.0),
            (1.06, -15.0), (0.98, -13.0), (0.93, -12.0)],
    'bb': [(1.405, 0.042), (1.370, 0.056), (1.340, 0.060), (1.300, 0.060),
           (1.270, 0.058), (1.235, 0.055), (1.205, 0.052), (1.170, 0.051),
           (1.140, 0.053), (1.100, 0.059), (1.060, 0.068), (1.020, 0.080),
           (0.990, 0.084), (0.960, 0.074), (0.930, 0.052)],
}


def torso():
    return Loft(TORSO_KNOTS, zmin=0.925, zmax=1.41, cap_round=0.02)


CHEST_ROT = -22.0
PELVIS_ROT = -14.0


def rotz_about(p, centre, deg):
    R = euler(z=deg)
    return centre + R @ (np.asarray(p, dtype=float) - centre)


def breasts():
    out = []
    centre = np.array([0.007, 0.006, 1.312])
    for side in (-1, 1):
        c = centre + np.array([side * 0.046, -0.052, 0.0])
        c = rotz_about(c, centre, CHEST_ROT)
        R = euler(z=CHEST_ROT) @ euler(x=12, z=side * 12)
        out.append(Ellipsoid(c, (0.051, 0.047, 0.047), R))
    return out


def neck():
    return RoundCone(J['neck_base'] + [0, 0.0, -0.02], J['neck_top'] + [0, 0, 0.02],
                     0.031, 0.026)


def shoulders():
    """Clavicle / trapezius slopes and deltoids."""
    out = []
    nb = J['neck_base'] + np.array([0, 0.004, -0.012])
    for s in ('R', 'L'):
        sh = J['shoulder_' + s]
        sign = -1 if s == 'R' else 1
        out.append(RoundCone(nb, sh + [0, 0.0, 0.004], 0.038, 0.031, ell=(1.0, 1.0)))
        out.append(Ellipsoid(sh + [sign * 0.002, 0.0, -0.014], (0.026, 0.031, 0.036)))
    return out


def limb_loft(top, mid, bottom, prof, back=(0, 1, 0), cap=0.015):
    """Loft along top->bottom whose centre line bends through ``mid``.

    ``prof`` rows are (u, a, bf, bb) with u in [0,1] from top to mid and
    [1,2] from mid to bottom (u < 0 extends above the top joint)."""
    top, mid, bottom = (np.asarray(x, dtype=np.float64) for x in (top, mid, bottom))
    R = limb_frame(top, bottom, back)
    m = (mid - top) @ R
    L = float(np.linalg.norm(top - bottom))
    sk = -m[2]

    def zof(u):
        return -(u * sk) if u <= 1 else -(sk + (u - 1) * (L - sk))

    knots = {'a': [], 'bf': [], 'bb': []}
    for u, a, bf, bb in prof:
        z = zof(u)
        knots['a'].append((z, a))
        knots['bf'].append((z, bf))
        knots['bb'].append((z, bb))
    zs = [k[0] for k in knots['a']]
    knots['cx'] = [(max(zs), 0.0), (0.0, 0.0), (-sk, m[0]), (-L, 0.0), (min(zs), 0.0)]
    knots['cy'] = [(max(zs), 0.0), (0.0, 0.0), (-sk, m[1]), (-L, 0.0), (min(zs), 0.0)]
    # pchip needs strictly increasing unique z
    for k in ('cx', 'cy'):
        d = {}
        for z, v in knots[k]:
            d[round(z, 6)] = v
        knots[k] = sorted(d.items())
    return Loft(knots, zmin=min(zs), zmax=max(zs), origin=top, R=R, cap_round=cap)


LEG_PROFILE = [
    (-0.12, 0.050, 0.050, 0.052),
    (0.00, 0.066, 0.066, 0.068),
    (0.18, 0.071, 0.069, 0.068),
    (0.35, 0.069, 0.066, 0.064),
    (0.58, 0.058, 0.058, 0.054),
    (0.77, 0.047, 0.049, 0.045),
    (0.93, 0.040, 0.044, 0.040),
    (1.00, 0.038, 0.042, 0.038),
    (1.09, 0.037, 0.038, 0.042),
    (1.23, 0.035, 0.033, 0.051),
    (1.38, 0.031, 0.030, 0.046),
    (1.57, 0.028, 0.027, 0.036),
    (1.76, 0.025, 0.024, 0.029),
    (1.92, 0.023, 0.022, 0.025),
    (2.00, 0.023, 0.023, 0.025),
]

ARM_PROFILE = [
    (-0.15, 0.027, 0.029, 0.029),
    (0.00, 0.029, 0.031, 0.031),
    (0.30, 0.026, 0.028, 0.027),
    (0.70, 0.023, 0.024, 0.023),
    (1.00, 0.021, 0.022, 0.023),
    (1.20, 0.023, 0.024, 0.023),
    (1.50, 0.020, 0.020, 0.019),
    (2.00, 0.016, 0.013, 0.013),
]


def arm(side):
    s = side
    return limb_loft(J['shoulder_' + s], J['elbow_' + s], J['wrist_' + s], ARM_PROFILE)


def leg(side):
    s = side
    return limb_loft(J['hip_' + s], J['knee_' + s], J['ankle_' + s], LEG_PROFILE)


def glutes():
    out = []
    centre = np.array([-0.009, 0.016, 0.975])
    for side in (-1, 1):
        c = rotz_about(centre + np.array([side * 0.052, 0.034, 0.0]), centre, PELVIS_ROT)
        out.append(Ellipsoid(c, (0.060, 0.050, 0.068), euler(z=PELVIS_ROT)))
    return out


def body_sdf_parts():
    """Return list of (prim, k) to union in order."""
    parts = [(torso(), 0.0)]
    for b in breasts():
        parts.append((b, 0.03))
    parts.append((neck(), 0.02))
    for p in shoulders():
        parts.append((p, 0.03))
    for g in glutes():
        parts.append((g, 0.03))
    for s in ('R', 'L'):
        parts.append((leg(s), 0.035))
    for s in ('R', 'L'):
        parts.append((arm(s), 0.008))
    return parts


def body_sdf_ops():
    """Subtractions applied after the unions: (prim, k)."""
    return [(navel(), 0.004)]


def navel():
    """Small dimple subtracted from the belly."""
    from rig import px
    t = torso()
    p = px(327, 341, 0.0)
    ys = np.linspace(-0.2, 0.1, 3000)
    Pq = np.stack([np.full_like(ys, p[0]), ys, np.full_like(ys, p[2])], axis=1)
    y0 = ys[int(np.argmax(t(Pq) < 0))]
    return Ellipsoid([p[0], y0 - 0.0005, p[2]], (0.0035, 0.0045, 0.0065))


class BodySDF:
    """Callable full body SDF (no head, no hands)."""

    def __init__(self):
        self.parts = body_sdf_parts()

    def __call__(self, P):
        d = None
        for prim, k in self.parts:
            e = prim(P)
            d = e if d is None else smin(d, e, k)
        return d


# ------------------------------------------------------------------ head

HX = 0.011           # head centre line x
HEAD_KNOTS = {
    'cx': [(1.47, HX)],
    'cy': [(1.474, -0.052), (1.485, -0.043), (1.500, -0.031), (1.515, -0.019),
           (1.530, -0.009), (1.550, 0.000), (1.575, 0.004), (1.600, 0.006),
           (1.625, 0.008), (1.643, 0.010), (1.655, 0.012), (1.662, 0.014)],
    'a': [(1.474, 0.008), (1.485, 0.024), (1.500, 0.038), (1.515, 0.048),
          (1.530, 0.055), (1.550, 0.061), (1.575, 0.066), (1.600, 0.067),
          (1.625, 0.064), (1.643, 0.056), (1.655, 0.043), (1.662, 0.025)],
    'bf': [(1.474, 0.010), (1.485, 0.019), (1.500, 0.033), (1.515, 0.047),
           (1.530, 0.061), (1.550, 0.072), (1.575, 0.076), (1.600, 0.076),
           (1.625, 0.070), (1.643, 0.058), (1.655, 0.043), (1.662, 0.022)],
    'bb': [(1.474, 0.008), (1.485, 0.030), (1.500, 0.062), (1.515, 0.080),
           (1.530, 0.090), (1.550, 0.094), (1.575, 0.098), (1.600, 0.097),
           (1.625, 0.091), (1.643, 0.080), (1.655, 0.062), (1.662, 0.035)],
}


def skull():
    return Loft(HEAD_KNOTS, zmin=1.472, zmax=1.664, power=2.25, cap_round=0.012)


def head_sdf_parts():
    parts = [(skull(), 0.0)]
    # nose (tiny, anime style)
    parts.append((Ellipsoid([HX, -0.0715, 1.529], (0.0038, 0.0065, 0.0085),
                            euler(x=-20)), 0.005))
    # neck
    parts.append((RoundCone(J['neck_top'] + [0, 0, -0.06], J['neck_top'] + [0, 0.004, 0.03],
                            0.027, 0.026), 0.018))
    return parts


class HeadSDF:
    def __init__(self):
        self.parts = head_sdf_parts()

    def __call__(self, P):
        d = None
        for prim, k in self.parts:
            e = prim(P)
            d = e if d is None else smin(d, e, k)
        return d

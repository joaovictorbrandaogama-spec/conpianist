"""Boots: a pair of mid-calf heeled boots built as explicit polygon meshes
(no marching cubes).

Construction
------------
* Every boot lives in a local foot frame: origin on the ground under the
  ankle joint, local y = foot direction, z = up, x = towards the OUTSIDE of
  that foot (mirrored for the left boot).  Above the ankle a smooth shear
  makes the shaft follow the lower-leg axis (rig.J ankle -> knee).
* The last is heeled: the sole slab (``sole_bot``) sits on a tapered heel
  block under the raised heel seat, runs down an S-shaped shank to the ball
  and lifts slightly at the toe.
* The upper is one lofted shell.  Its cross sections lie on a family of
  section lines in the sagittal (y, z) plane: horizontal lines up the shaft,
  a fan of lines through a pivot ``P`` in front of the instep (ankle, heel),
  and vertical lines along the forefoot.  Each line is cut by the designed
  front outline ``F`` and back / bottom outline ``K``; across the foot the
  section is a stadium (two super-elliptic caps + a straight middle).  The
  surface is a function ``S(u, t)``: u around (0 front / instep, 0.25 outer
  side, 0.5 back / sole, 0.75 inner side), t along (0 top, 1 pivot height,
  2 start of forefoot, 3 toe).  The shaft is pushed out where needed so it
  clears the leg (body.B.leg) or the left-leg armour.
* Everything on the upper (collar, red bands, name plate, wrap straps,
  white U panel, centre strip, ankle and instep straps, edge lines, toe
  cap, perforations, heel counter) is a separate hard shell lifted from
  S(u, t) over a 2D polygon of a chart (a = around, v = down the front line,
  or (u, t) directly).
* Sole pieces: thin dark sole slab (plan outline of the upper, concentric
  caps following the shank), heel block, and an angular toe guard swept along
  a circumscribed polyline of the toe (miter offsets keep the facets sharp)
  with a grey lip, a screw head and a slot.
"""

import numpy as np
from scipy.interpolate import PchipInterpolator, splprep, splev
from scipy.spatial import Delaunay

from meshutil import MeshData, polygon_sd, clean_mesh
import hardsurf as HS
from rig import J, S as PXS, PY0
import body as Bd

# ------------------------------------------------------------------ design constants

Z_TOP = {'R': (PY0 - 797) * PXS, 'L': (PY0 - 805) * PXS}
FOOT_YAW = {'R': 4.0, 'L': -6.0}   # extra outward turn of the foot (deg, < 0 = inwards)
Z_TOP_DESIGN = 0.298            # heights above Z_LOW are scaled to the real top
Z_LOW = 0.19

PIV = np.array([0.074, 0.150])  # fan pivot (y, z), outside the boot in front of the instep
Y_TIP = 0.1770                  # toe tip
Y_END = Y_TIP - 0.005           # last section of the forefoot


def fy(y):
    """Forefoot y of the design outlines (drawn for a 0.185 tip) -> this last."""
    return y if y <= 0.06 else 0.06 + (y - 0.06) * (Y_TIP - 0.06) / (0.185 - 0.06)

# heeled last: the heel block lifts the heel seat, the forefoot sole is a thin slab
HEEL_H = 0.050                  # bottom of the sole slab under the heel seat
SOLE_T = 0.0060                 # thickness of the sole slab
Y_SHANK0, Y_BALL = -0.004, 0.096
Y_SPRING = 0.142


def sole_bot(y):
    """Bottom of the sole slab (local z) along the foot: raised heel seat,
    S-shaped shank, flat ball, toe spring."""
    y = np.asarray(y, dtype=np.float64)
    q = np.clip((y - Y_SHANK0) / (Y_BALL - Y_SHANK0), 0, 1)
    z = HEEL_H * 0.5 * (1 + np.cos(np.pi * q))
    r = np.clip((y - Y_SPRING) / (Y_TIP + 0.004 - Y_SPRING), 0, 1)
    return z + 0.008 * r ** 2


def z_floor(y):
    """Top of the sole slab = bottom of the upper."""
    return sole_bot(y) + SOLE_T


# sagittal outline of the upper (y forward, z up), before the shaft shear
F_PTS = [(fy(y), z) for y, z in (
         (0.037, 0.330), (0.036, 0.290), (0.034, 0.240), (0.032, 0.195),
         (0.033, 0.168), (0.036, 0.148), (0.043, 0.128), (0.053, 0.108),
         (0.065, 0.090), (0.080, 0.076), (0.100, 0.066), (0.124, 0.058),
         (0.146, 0.051), (0.163, 0.045), (0.175, 0.039), (0.1815, 0.032))] + \
    [(Y_TIP, 0.024), (Y_TIP + 0.0002, z_floor(Y_TIP) + 0.001)]
_KY = np.linspace(-0.030, Y_TIP - 0.004, 24)
K_PTS = [(-0.042, 0.330), (-0.041, 0.290), (-0.038, 0.240), (-0.035, 0.195),
         (-0.034, 0.160), (-0.036, 0.130), (-0.041, 0.105), (-0.046, 0.086),
         (-0.049, 0.072), (-0.0495, z_floor(-0.05) + 0.010), (-0.046, z_floor(-0.05) + 0.003),
         (-0.038, z_floor(-0.04))] + \
    [(float(y), float(z_floor(y))) for y in _KY] + [(Y_TIP + 0.0002, z_floor(Y_TIP) + 0.001)]


def smoothstep(x, a, b):
    q = np.clip((np.asarray(x, dtype=np.float64) - a) / (b - a), 0, 1)
    return q * q * (3 - 2 * q)


def smax(a, b, k):
    return 0.5 * (a + b + np.sqrt((a - b) ** 2 + k * k))


def nrm(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def dense_curve(pts, n=1500):
    P = np.asarray(pts, dtype=np.float64)
    d = np.linalg.norm(np.diff(P, axis=0), axis=1)
    u = np.concatenate([[0], np.cumsum(d)])
    u /= u[-1]
    tck, _ = splprep([P[:, 0], P[:, 1]], u=u, s=0, k=3)
    q = np.linspace(0, 1, n)
    y, z = splev(q, tck)
    return np.stack([y, z], axis=1)


FC = dense_curve(F_PTS)
KC = dense_curve(K_PTS)


def hit(curve, O, D, first=True):
    """Intersection of lines O + s D (N,2) with a polyline: smallest (first)
    or largest s.  Returns the points (N,2)."""
    A = curve[:-1][None]
    E = (curve[1:] - curve[:-1])[None]
    O = O[:, None]
    D = D[:, None]
    den = D[..., 0] * E[..., 1] - D[..., 1] * E[..., 0]
    den = np.where(np.abs(den) < 1e-14, 1e-14, den)
    W = A - O
    s = (W[..., 0] * E[..., 1] - W[..., 1] * E[..., 0]) / den
    w = (W[..., 0] * D[..., 1] - W[..., 1] * D[..., 0]) / den
    ok = (w >= -1e-9) & (w <= 1 + 1e-9)
    if first:
        s = np.where(ok, s, np.inf).min(axis=1)
    else:
        s = np.where(ok, s, -np.inf).max(axis=1)
    if not np.all(np.isfinite(s)):
        raise ValueError('section line misses the outline')
    return O[:, 0] + D[:, 0] * s[:, None]


# half widths of the forefoot (outer, inner) along y
_FW_Y = [fy(y) for y in (0.06, 0.074, 0.100, 0.130, 0.155, 0.175)]
_FW_LAT = PchipInterpolator(_FW_Y, [0.0330, 0.0338, 0.0356, 0.0362, 0.0352, 0.0330])
_FW_MED = PchipInterpolator(_FW_Y, [0.0312, 0.0316, 0.0328, 0.0334, 0.0326, 0.0306])
# shaft half width along z (design, before the leg fit)
_SH_Z = [0.10, 0.148, 0.175, 0.205, 0.240, 0.280, 0.340]
_SH_A = PchipInterpolator(_SH_Z, [0.0345, 0.0330, 0.0300, 0.0290, 0.0310, 0.0330, 0.0340])


def toe_taper(y):
    q = np.clip((y - fy(0.135)) / (Y_TIP - fy(0.135)), 0, 1)
    return (1 - q ** 3.4) ** (1 / 3.4)


class Boot:
    def __init__(self, side):
        self.side = side
        s = side
        ank, toe, knee = J['ankle_' + s], J['toe_' + s], J['knee_' + s]
        f = toe - ank
        f[2] = 0
        # turn the toe a little further out than the rig's toe joint (the
        # reference shows the toes pointing outwards more strongly)
        yaw = np.radians(FOOT_YAW[s]) * (-1 if s == 'R' else 1)
        c, sn = np.cos(yaw), np.sin(yaw)
        f = np.array([c * f[0] - sn * f[1], sn * f[0] + c * f[1], 0.0])
        self.fwd = nrm(f)
        self.up = np.array([0, 0, 1.0])
        lat = np.cross(self.fwd, self.up)
        self.lat = lat if s == 'R' else -lat       # towards the outside of that foot
        self.O = np.array([ank[0], ank[1], 0.0])
        self.z_ank = float(ank[2])
        a = nrm(knee - ank)
        self.kx = float(a @ self.lat) / a[2]
        self.ky = float(a @ self.fwd) / a[2]
        self.ztop = Z_TOP[s]
        # the reference draws the left foot a little further out than the rig's
        # ankle: slide the foot (not the shaft) outwards
        self.foot_dx = -0.004 if s == 'R' else 0.019
        self.leg = Bd.leg(s)
        # clearance of the shaft over the skin (the left leg wears the armour)
        self.clr = 0.0030 if s == 'R' else 0.0085
        self._front_tab()

    # -------------------------------------------------------------- frames
    def zmap(self, z):
        """Design heights (right boot top = 0.298) -> this boot."""
        z = np.asarray(z, dtype=np.float64)
        k = (self.ztop - Z_LOW) / (Z_TOP_DESIGN - Z_LOW)
        return np.where(z > Z_LOW, Z_LOW + (z - Z_LOW) * k, z)

    def shear(self, z):
        z0, z1 = self.z_ank - 0.035, self.z_ank + 0.035
        z = np.asarray(z, dtype=np.float64)
        g = np.where(z < z0, 0.0, np.where(z < z1, (z - z0) ** 2 / (2 * (z1 - z0)),
                                             (z - z0) - (z1 - z0) / 2))
        return g

    def world(self, L):
        L = np.asarray(L, dtype=np.float64)
        g = self.shear(L[..., 2])
        x = L[..., 0] + self.kx * g + self.foot_dx * (1 - smoothstep(L[..., 2], 0.09, 0.17))
        y = L[..., 1] + self.ky * g
        return (self.O + x[..., None] * self.lat + y[..., None] * self.fwd +
                L[..., 2:3] * self.up)

    def local(self, W):
        W = np.asarray(W, dtype=np.float64) - self.O
        z = W[..., 2]
        g = self.shear(z)
        x = W @ self.lat - self.kx * g - self.foot_dx * (1 - smoothstep(z, 0.09, 0.17))
        y = W @ self.fwd - self.ky * g
        return np.stack([x, y, z], axis=-1)

    def axis_point(self, z):
        z = np.asarray(z, dtype=np.float64)
        return self.world(np.stack([np.zeros_like(z), np.zeros_like(z), z], axis=-1))

    # -------------------------------------------------------------- sections
    def sections(self, t):
        t = np.atleast_1d(np.asarray(t, dtype=np.float64))
        n = len(t)
        zt = max(self.ztop + 0.002, PIV[1] + 0.01)
        O = np.zeros((n, 2))
        D = np.zeros((n, 2))
        m0 = t < 1
        m2 = t > 2
        m1 = ~m0 & ~m2
        z0 = zt + (PIV[1] - zt) * np.clip(t, 0, 1)
        O[m0] = np.stack([np.full(m0.sum(), 0.4), z0[m0]], 1)
        D[m0] = (-1.0, 0.0)
        ph = (np.clip(t, 1, 2) - 1) * np.pi / 2
        O[m1] = PIV
        D[m1] = np.stack([-np.cos(ph[m1]), -np.sin(ph[m1])], 1)
        y2 = PIV[0] + (Y_END - PIV[0]) * (np.clip(t, 2, 3) - 2)
        O[m2] = np.stack([y2[m2], np.full(m2.sum(), 0.4)], 1)
        D[m2] = (0.0, -1.0)
        Fp = hit(FC, O, D, True)
        Kp = hit(KC, O, D, False)
        e = nrm(Kp - Fp)
        L = np.linalg.norm(Kp - Fp, axis=1)

        # shaft params at a given height
        def shaft(z, Fy, Ln):
            A = _SH_A(z)
            Df = Fy                        # leg axis at local y = 0
            return A, A, Df, Ln - Df, 2.25, 2.25
        # forefoot params at a given y
        def foot(y, Fz, Kz):
            tp = toe_taper(y)
            Al = _FW_LAT(np.clip(y, _FW_Y[0], _FW_Y[-1])) * tp
            Am = _FW_MED(np.clip(y, _FW_Y[0], _FW_Y[-1])) * tp
            zc = z_floor(y) + 0.007
            return Al, Am, Fz - zc, zc - Kz, 2.7, 4.0

        Al, Am, Df, Db, nf, nb = (np.zeros(n) for _ in range(6))
        if m0.any():
            r = shaft(z0[m0], Fp[m0, 0], L[m0])
            for arr, v in zip((Al, Am, Df, Db, nf, nb), r):
                arr[m0] = v
        if m2.any():
            r = foot(y2[m2], Fp[m2, 1], Kp[m2, 1])
            for arr, v in zip((Al, Am, Df, Db, nf, nb), r):
                arr[m2] = v
        if m1.any():
            # end sections of the fan
            a0 = np.array([PIV[1]]); b0 = np.array([PIV[0]])
            Fa = hit(FC, np.array([[0.4, PIV[1]]]), np.array([[-1.0, 0]]), True)
            Ka = hit(KC, np.array([[0.4, PIV[1]]]), np.array([[-1.0, 0]]), False)
            ra = shaft(a0, Fa[:, 0], np.linalg.norm(Ka - Fa, axis=1))
            Fb = hit(FC, np.array([[PIV[0], 0.4]]), np.array([[0, -1.0]]), True)
            Kb = hit(KC, np.array([[PIV[0], 0.4]]), np.array([[0, -1.0]]), False)
            rb = foot(b0, Fb[:, 1], Kb[:, 1])
            w = smoothstep(ph[m1] / (np.pi / 2), 0, 1)
            bump = np.sin(np.pi * w) ** 2
            ank = np.sin(np.pi * np.clip(w / 0.5, 0, 1)) ** 2      # ankle bones, not the heel
            Al[m1] = ra[0] + (rb[0] - ra[0]) * w + 0.0020 * ank - 0.0025 * bump
            Am[m1] = ra[1] + (rb[1] - ra[1]) * w + 0.0020 * ank - 0.0025 * bump
            # instep arch radius ~ A^2 / Df, heel cap depth ~ heel half width
            Df[m1] = ra[2] + (rb[2] - ra[2]) * w
            Db[m1] = ra[3] + (rb[3] - ra[3]) * w
            Df[m1] = np.minimum(Df[m1], ra[2] + (rb[2] - ra[2]) * w)
            Db[m1] = np.minimum(Db[m1], 0.040 + 0.0 * w) * bump + Db[m1] * (1 - bump)
            nf[m1] = ra[4] + (rb[4] - ra[4]) * w
            nb[m1] = ra[5] + (rb[5] - ra[5]) * w + 0.6 * bump
        sc = np.minimum(1.0, L / np.maximum(Df + Db, 1e-9))
        Df, Db = Df * sc, Db * sc
        return dict(Fp=Fp, e=e, L=L, Al=Al, Am=Am, Df=Df, Db=Db, nf=nf, nb=nb,
                    z0=z0, shaft=m0)

    # -------------------------------------------------------------- surface
    NCAP = 28

    def S_local(self, u, t, arc=False):
        """u: loop parameter (0 front, .25 outer side, .5 back, .75 inner)
        or, with arc=True, the signed arc length from the front line (m,
        positive towards the outer side)."""
        t = np.asarray(t, dtype=np.float64).ravel()
        sc = self.sections(t)
        if arc:
            a = np.asarray(u, dtype=np.float64).ravel()
            lat = a >= 0
        else:
            u = np.mod(np.asarray(u, dtype=np.float64).ravel(), 1.0)
            lat = u < 0.5
        n = len(t)
        sig = np.where(lat, 1.0, -1.0)
        A = np.where(lat, sc['Al'], sc['Am'])
        k = self.NCAP
        th = np.linspace(0, np.pi / 2, k)[None]
        nf, nb = sc['nf'][:, None], sc['nb'][:, None]
        Df, Db, Lh = sc['Df'][:, None], sc['Db'][:, None], sc['L'][:, None]
        xf = A[:, None] * np.sin(th) ** (2 / nf)
        sf = Df * (1 - np.cos(th) ** (2 / nf))
        th2 = th[:, ::-1]
        xb = A[:, None] * np.sin(th2) ** (2 / nb)
        sb = Lh - Db * (1 - np.cos(th2) ** (2 / nb))
        X = np.concatenate([xf, xb], axis=1)
        Sx = np.concatenate([sf, sb], axis=1)
        seg = np.hypot(np.diff(X, axis=1), np.diff(Sx, axis=1))
        cum = np.concatenate([np.zeros((n, 1)), np.cumsum(seg, axis=1)], axis=1)
        tot = cum[:, -1:]
        if arc:
            frac = np.clip(np.abs(a) / tot[:, 0], 0, 1)
        else:
            frac = np.where(lat, u / 0.5, (1.0 - u) / 0.5)      # 0 front -> 1 back
        q = frac[:, None] * tot
        idx = np.clip((cum <= q).sum(axis=1) - 1, 0, 2 * k - 2)
        c0 = np.take_along_axis(cum, idx[:, None], 1)[:, 0]
        c1 = np.take_along_axis(cum, idx[:, None] + 1, 1)[:, 0]
        w = np.clip((q[:, 0] - c0) / np.maximum(c1 - c0, 1e-12), 0, 1)
        x = (np.take_along_axis(X, idx[:, None], 1)[:, 0] * (1 - w) +
             np.take_along_axis(X, idx[:, None] + 1, 1)[:, 0] * w)
        s = (np.take_along_axis(Sx, idx[:, None], 1)[:, 0] * (1 - w) +
             np.take_along_axis(Sx, idx[:, None] + 1, 1)[:, 0] * w)
        yz = sc['Fp'] + sc['e'] * s[:, None]
        Lc = np.stack([sig * x, yz[:, 0], yz[:, 1]], axis=1)
        return Lc, sc

    def S(self, u, t, arc=False):
        u = np.asarray(u, dtype=np.float64)
        shp = np.broadcast(u, np.asarray(t)).shape
        uu = np.broadcast_to(u, shp).ravel()
        tt = np.broadcast_to(np.asarray(t, dtype=np.float64), shp).ravel()
        Lc, sc = self.S_local(uu, tt, arc)
        P = self.world(Lc)
        # leg fit on the shaft: push radially so the leg (+ clearance) stays inside
        z = Lc[:, 2]
        wfit = np.where(sc['shaft'], smoothstep(z, PIV[1] + 0.004, PIV[1] + 0.030), 0.0)
        m = wfit > 0
        if m.any():
            C = self.axis_point(z[m])
            d = P[m] - C
            r = np.linalg.norm(d, axis=1)
            dn = d / r[:, None]
            rl = self.leg_radius(C, dn)
            clr = self.clr * smoothstep(z[m], 0.20, 0.235) + 0.0045 * (1 - smoothstep(z[m], 0.20, 0.235)) \
                if self.side == 'L' else self.clr
            rn = smax(r, rl + clr, 0.006)
            rn = r + (rn - r) * wfit[m]
            P[m] = C + dn * rn[:, None]
        return P.reshape(shp + (3,))

    def leg_radius(self, C, dn, rmax=0.09):
        lo = np.zeros(len(C))
        hi = np.full(len(C), rmax)
        inside0 = self.leg(C) < 0
        for _ in range(26):
            mid = 0.5 * (lo + hi)
            ins = self.leg(C + dn * mid[:, None]) < 0
            lo = np.where(ins, mid, lo)
            hi = np.where(ins, hi, mid)
        return np.where(inside0, lo, 0.0)

    def N(self, u, t, h=4e-4, arc=False):
        u = np.asarray(u, dtype=np.float64)
        t = np.asarray(t, dtype=np.float64)
        Pu = self.S(u + h, t, arc) - self.S(u - h, t, arc)
        t1 = np.clip(t + h, 0, 3)
        t0 = np.clip(t - h, 0, 3)
        Pt = self.S(u, t1, arc) - self.S(u, t0, arc)
        n = nrm(np.cross(Pt, Pu))
        return n * self.nsign

    def _front_tab(self):
        """Arc length of the front line (u = 0) from the top, for the chart."""
        self.nsign = 1.0
        tt = np.linspace(0, 3, 1201)
        P = self.S(np.zeros_like(tt), tt)
        d = np.linalg.norm(np.diff(P, axis=0), axis=1)
        self.tab_t = tt
        self.tab_v = np.concatenate([[0], np.cumsum(d)])
        Lc, _ = self.S_local(np.zeros_like(tt), tt)
        self.tab_fz = Lc[:, 2]
        self.tab_fy = Lc[:, 1]
        # orientation of the normals: at the shin front they must point forward
        n = self.N(np.array([0.0]), np.array([0.5]))
        self.nsign = 1.0 if float(n[0] @ self.fwd) > 0 else -1.0

    # chart: a = around (m, u * PREF), v = arc length down the front line
    PREF = 0.215

    def t_of_v(self, v):
        return np.interp(v, self.tab_v, self.tab_t)

    def v_front_z(self, z):
        """v of the front line at local height z (shin / instep, z decreasing)."""
        return np.interp(-np.asarray(z, dtype=np.float64), -self.tab_fz, self.tab_v)

    def v_front_y(self, y):
        m = self.tab_t >= 1.0
        return np.interp(y, self.tab_fy[m], self.tab_v[m])

    def t_of_z(self, z):
        zt = max(self.ztop + 0.002, PIV[1] + 0.01)
        return np.clip((zt - np.asarray(z, dtype=np.float64)) / (zt - PIV[1]), 0, 1)

    def chart(self, Q):
        Q = np.asarray(Q, dtype=np.float64)
        return Q[..., 0], self.t_of_v(Q[..., 1])


# ------------------------------------------------------------------ mesh helpers

def grid_quads(ni, nj, closed_j=False, closed_i=False):
    F = []
    for i in range(ni if closed_i else ni - 1):
        i2 = (i + 1) % ni
        for j in range(nj if closed_j else nj - 1):
            j2 = (j + 1) % nj
            F.append([i * nj + j, i * nj + j2, i2 * nj + j2, i2 * nj + j])
    return F


def tri_faces(F):
    out = []
    for f in F:
        for k in range(1, len(f) - 1):
            out.append([f[0], f[k], f[k + 1]])
    return np.array(out, dtype=np.int64)


def signed_volume(V, F):
    T = tri_faces(F)
    a, b, c = V[T[:, 0]], V[T[:, 1]], V[T[:, 2]]
    return float(np.einsum('ij,ij->i', a, np.cross(b, c)).sum() / 6.0)


def orient_closed(V, F):
    if signed_volume(V, F) < 0:
        F = [list(f)[::-1] for f in F]
    return V, F


def orient_tris(P, N, F):
    F = np.asarray(F, dtype=np.int64)
    n = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    d = np.einsum('ij,ij->i', n, N[F].mean(axis=1))
    F = F.copy()
    F[d < 0] = F[d < 0][:, ::-1]
    return F


def boundary_edges(F):
    F = np.asarray(F)
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    key = np.sort(E, axis=1)
    _, inv, cnt = np.unique(key, axis=0, return_inverse=True, return_counts=True)
    return E[cnt[inv.ravel()] == 1]


def shell(P, N, F, t, t0=0.0):
    """Closed solid between P + N t0 and P + N (t0 + t); F oriented along N."""
    P = np.asarray(P, dtype=np.float64)
    N = np.asarray(N, dtype=np.float64)
    n = len(P)
    t = np.broadcast_to(np.asarray(t, dtype=np.float64), (n,))
    t0 = np.broadcast_to(np.asarray(t0, dtype=np.float64), (n,))
    outer = P + N * (t0 + t)[:, None]
    inner = P + N * t0[:, None]
    V = np.concatenate([outer, inner])
    E = boundary_edges(F)
    rim = np.stack([E[:, 0], E[:, 0] + n, E[:, 1] + n, E[:, 1]], axis=1)
    faces = [list(f) for f in F] + [list(f) for f in (np.asarray(F)[:, ::-1] + n)] + \
            [list(r) for r in rim]
    return V, faces


def resample(loop, h, closed=True):
    L = np.asarray(loop, dtype=np.float64)
    pts = []
    n = len(L)
    m = n if closed else n - 1
    for i in range(m):
        a, b = L[i], L[(i + 1) % n]
        k = max(1, int(np.ceil(np.linalg.norm(b - a) / h)))
        for j in range(k):
            pts.append(a + (b - a) * j / k)
    if not closed:
        pts.append(L[-1])
    return np.array(pts)


def region_sd(P, loops):
    d = polygon_sd(P[..., 0], P[..., 1], loops[0])
    for hole in loops[1:]:
        d = np.maximum(d, -polygon_sd(P[..., 0], P[..., 1], hole))
    return d


def tri_region(loops, h):
    """Near-equilateral triangulation of a 2D region whose boundary follows
    the loops exactly (outer loop + holes)."""
    loops = [np.asarray(l, dtype=np.float64) for l in loops]
    B = np.concatenate([resample(l, h * 0.7) for l in loops])
    lo, hi = loops[0].min(axis=0), loops[0].max(axis=0)
    dy = h * np.sqrt(3) / 2
    ys = np.arange(lo[1] - h, hi[1] + h, dy)
    G = []
    for k, y in enumerate(ys):
        xs = np.arange(lo[0] - h, hi[0] + h, h) + (h / 2 if k % 2 else 0)
        G.append(np.stack([xs, np.full_like(xs, y)], axis=1))
    G = np.concatenate(G)
    G = G[region_sd(G, loops) < -0.5 * h]
    P = np.concatenate([B, G])
    key = np.round(P / (h * 1e-3)).astype(np.int64)
    _, first = np.unique(key, axis=0, return_index=True)
    P = P[np.sort(first)]
    T = Delaunay(P).simplices
    keep = region_sd(P[T].mean(axis=1), loops) < 0
    for i, j in ((0, 1), (1, 2), (2, 0)):
        mid = 0.5 * (P[T[:, i]] + P[T[:, j]])
        keep &= region_sd(mid, loops) < 0.02 * h
    T = T[keep]
    a = np.cross(P[T[:, 1]] - P[T[:, 0]], P[T[:, 2]] - P[T[:, 0]])
    good = np.abs(a) > 1e-14
    T, a = T[good], a[good]
    T[a < 0] = T[a < 0][:, ::-1]
    used = np.unique(T)
    remap = np.full(len(P), -1)
    remap[used] = np.arange(len(used))
    return P[used], remap[T]


def clip_tris(V, F, s):
    """Keep the part of a triangle mesh where s < 0 (exact cut)."""
    from meshutil import clip_mesh
    return clip_mesh(V, F, s)


def solid(parts, mat, bevel=0.0005, angle=35.0, outline_w=0.7, **kw):
    V, F = HS.merge_vf(parts)
    return HS.hard_mesh((V, F), mat, bevel=bevel, angle=angle, outline_w=outline_w, **kw)


# ------------------------------------------------------------------ the upper

NU = 64


def t_samples(b, step=0.0062):
    """Section parameters spaced ~step along the front and back lines."""
    tt = np.linspace(0, 3, 3001)
    pf = b.S(np.zeros_like(tt), tt)
    pb = b.S(np.full_like(tt, 0.5), tt)
    ps = b.S(np.full_like(tt, 0.25), tt)
    d = np.maximum.reduce([np.linalg.norm(np.diff(p, axis=0), axis=1) for p in (pf, pb, ps)])
    c = np.concatenate([[0], np.cumsum(d)])
    n = int(np.ceil(c[-1] / step))
    ts = np.interp(np.linspace(0, c[-1], n + 1), c, tt)
    return ts


def upper_mesh(b):
    ts = t_samples(b)
    us = np.arange(NU) / NU
    U, T = np.meshgrid(us, ts)
    P = b.S(U, T).reshape(-1, 3)
    ni = len(ts)
    F = grid_quads(ni, NU, closed_j=True)
    V = [P]
    off = len(P)
    # rolled top rim + inner lining going down 3 cm, closed by a disc
    zin = b.v_front_z(b.ztop - 0.030)
    tin = ts[ts <= b.t_of_v(zin)]
    Ui, Ti = np.meshgrid(us, tin)
    Pi = (b.S(Ui, Ti) - b.N(Ui, Ti) * 0.0045).reshape(-1, 3)
    V.append(Pi)
    for j in range(NU):
        j2 = (j + 1) % NU
        F.append([j2, j, off + j, off + j2])
    Fi = grid_quads(len(tin), NU, closed_j=True)
    F += [[off + k for k in f[::-1]] for f in Fi]
    last = off + (len(tin) - 1) * NU
    cen = Pi[-NU:].mean(axis=0)
    V.append(cen[None])
    ci = off + len(Pi)
    for j in range(NU):
        F.append([last + (j + 1) % NU, last + j, ci])
    # toe end: domed cap (concentric rings pushed forward)
    lastrow = (ni - 1) * NU
    rim = P[lastrow:lastrow + NU]
    tc = rim.mean(axis=0)
    nr = 5
    base = ci + 1
    prev = list(range(lastrow, lastrow + NU))
    for k in range(1, nr):
        f = 1 - k / nr
        dome = 0.0045 * (1 - f ** 2)
        R = tc + (rim - tc) * f + b.fwd * dome
        V.append(R)
        cur = list(range(base, base + NU))
        for j in range(NU):
            j2 = (j + 1) % NU
            F.append([prev[j], prev[j2], cur[j2], cur[j]])
        prev = cur
        base += NU
    V.append((tc + b.fwd * 0.0045)[None])
    for j in range(NU):
        F.append([prev[j], prev[(j + 1) % NU], base])
    V = np.concatenate(V)
    return orient_closed(V, F), ts


def vertex_normals(V, T):
    n = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    N = np.zeros_like(V)
    for k in range(3):
        np.add.at(N, T[:, k], n)
    return nrm(N)


# ------------------------------------------------------------------ sole, heel, toe guard

PLAN_C = np.array([0.0, 0.070])


def plan_outline(b, V, F, levels, n=128, smooth=4):
    """Plan outline (local x, y) of the upper: points where its surface crosses
    the heights z_floor(y) + level (for each level), max radius per polar bin
    around PLAN_C, then smoothed."""
    T = tri_faces(F) if not isinstance(F, np.ndarray) else F
    Lc = b.local(V)
    E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    pts = []
    for lv in levels:
        s = Lc[:, 2] - z_floor(Lc[:, 1]) - lv
        sa, sb = s[E[:, 0]], s[E[:, 1]]
        m = (sa < 0) != (sb < 0)
        w = sa[m] / (sa[m] - sb[m])
        pts.append(Lc[E[m, 0]] * (1 - w[:, None]) + Lc[E[m, 1]] * w[:, None])
    Q = np.concatenate(pts)
    d = Q[:, :2] - PLAN_C
    ang = np.arctan2(d[:, 1], d[:, 0])
    rad = np.hypot(d[:, 0], d[:, 1])
    bins = np.linspace(-np.pi, np.pi, n + 1)
    k = np.clip(np.digitize(ang, bins) - 1, 0, n - 1)
    r = np.zeros(n)
    np.maximum.at(r, k, rad)
    a = 0.5 * (bins[:-1] + bins[1:])
    good = r > 0
    r = np.interp(a, np.concatenate([a[good] - 2 * np.pi, a[good], a[good] + 2 * np.pi]),
                  np.tile(r[good], 3))
    r0 = r.copy()
    for _ in range(smooth * 3):                   # smooth upper envelope of r0
        r = np.maximum(r0, 0.25 * np.roll(r, 1) + 0.5 * r + 0.25 * np.roll(r, -1))
    for _ in range(2):
        r = 0.25 * np.roll(r, 1) + 0.5 * r + 0.25 * np.roll(r, -1)
    P = PLAN_C + np.stack([np.cos(a), np.sin(a)], 1) * r[:, None]
    return P


def outline_normals(P):
    t = np.roll(P, -1, axis=0) - np.roll(P, 1, axis=0)
    n = nrm(np.stack([t[:, 1], -t[:, 0]], 1))
    if HS.polygon_area(P) < 0:
        n = -n
    return n


def ring_solid(b, P, rings, ncap=4):
    """Closed solid from a star-shaped plan outline P (local x, y) and rings
    [(offset, z(x, y))]; the first and last ring are closed by concentric caps
    that follow their z function (so the slab can follow the shank)."""
    n = len(P)
    Nn = outline_normals(P)
    V, F = [], []
    for off, zf in rings:
        Q = P + Nn * off
        V.append(np.c_[Q, zf(Q[:, 0], Q[:, 1])])
    nr = len(rings)
    F = grid_quads(nr, n, closed_j=True)
    base = nr * n
    for which, (off, zf) in ((0, rings[0]), (nr - 1, rings[-1])):
        Q0 = P + Nn * off
        prev = list(range(which * n, which * n + n))
        for k in range(1, ncap):
            f = 1 - k / ncap
            Q = PLAN_C + (Q0 - PLAN_C) * f
            V.append(np.c_[Q, zf(Q[:, 0], Q[:, 1])])
            cur = list(range(base, base + n))
            for j in range(n):
                j2 = (j + 1) % n
                F.append([prev[j], prev[j2], cur[j2], cur[j]])
            prev = cur
            base += n
        V.append(np.array([[PLAN_C[0], PLAN_C[1], float(zf(PLAN_C[:1], PLAN_C[1:])[0])]]))
        for j in range(n):
            F.append([prev[j], prev[(j + 1) % n], base])
        base += 1
    V = np.concatenate(V)
    return orient_closed(b.world(V), F)


def loft_solid(b, rings):
    """Closed solid between equal-length closed loops of local points
    (rings[k] (n,3)); the two end loops are capped by flat n-gons."""
    n = len(rings[0])
    V = np.concatenate(rings)
    F = grid_quads(len(rings), n, closed_j=True)
    F.append(list(range(n)))
    F.append([(len(rings) - 1) * n + j for j in range(n)])
    return orient_closed(b.world(V), F)


def chamfer_poly(x0, x1, y0, y1, c):
    return np.array([(x0 + c, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1 - c), (x1 - c, y1),
                     (x0 + c, y1), (x0, y1 - c), (x0, y0 + c)])


def tangent_polygon(P, ks, clr):
    """Circumscribed polyline of a dense convex curve P: tangent lines (offset
    by clr) at the indices ks, consecutive lines intersected."""
    T = nrm(np.roll(P, -1, 0) - np.roll(P, 1, 0))
    Nn = outline_normals(P)
    pts = []
    L = [(P[k] + Nn[k] * clr, T[k]) for k in ks]
    for (p0, t0), (p1, t1) in zip(L[:-1], L[1:]):
        A = np.array([[t0[0], -t1[0]], [t0[1], -t1[1]]])
        s = np.linalg.solve(A, p1 - p0)
        pts.append(p0 + t0 * s[0])
    return np.array([L[0][0]] + pts + [L[-1][0]])


def sweep_open(b, C, prof, h=0.0016):
    """Solid swept along an open plan polyline C (local x, y corners).  prof =
    [(d, zfn)]: each profile vertex is the miter offset of C by d (outwards)
    at height zfn(y of the base point).  Corners stay sharp and walls keep
    their thickness; the two ends are capped."""
    C = np.asarray(C, dtype=np.float64)
    tg = nrm(np.diff(C, axis=0))
    nn = np.stack([tg[:, 1], -tg[:, 0]], 1)
    if np.mean(np.einsum('ij,ij->i', nn, 0.5 * (C[1:] + C[:-1]) - PLAN_C)) < 0:
        nn = -nn

    def miter(d):
        pts = [C[0] + nn[0] * d]
        for j in range(1, len(C) - 1):
            p0, t0 = C[j] + nn[j - 1] * d, tg[j - 1]
            p1, t1 = C[j] + nn[j] * d, tg[j]
            A = np.array([[t0[0], -t1[0]], [t0[1], -t1[1]]])
            s = np.linalg.solve(A, p1 - p0)
            pts.append(p0 + t0 * s[0])
        pts.append(C[-1] + nn[-1] * d)
        return np.array(pts)

    ks = [max(1, int(np.ceil(np.linalg.norm(C[j + 1] - C[j]) / h))) for j in range(len(C) - 1)]

    def dense(M):
        out = []
        for j in range(len(C) - 1):
            for i in range(ks[j]):
                out.append(M[j] + (M[j + 1] - M[j]) * i / ks[j])
        out.append(M[-1])
        return np.array(out)
    base = dense(C)
    segn = np.concatenate([np.repeat(nn, ks, axis=0), nn[-1:]])
    cols = []
    for d, zf in prof:
        Q = dense(miter(d))
        cols.append(np.c_[Q, zf(base[:, 1])])
    m = len(prof)
    V = np.stack(cols, axis=1).reshape(-1, 3)       # ring i = profile at base point i
    F = grid_quads(len(base), m, closed_j=True)
    F.append(list(range(m)))
    F.append([(len(base) - 1) * m + j for j in range(m)])
    q = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(base, axis=0), axis=1))])
    return orient_closed(b.world(V), F), base, segn, q / q[-1]


def sole_parts(b, V, F):
    out = {}
    # --- sole slab: thin dark rubber, follows the heel seat, shank and ball
    P = plan_outline(b, V, F, (0.0015, 0.004, 0.007))
    if HS.polygon_area(P) < 0:
        P = P[::-1]
    sbz = lambda x, y: sole_bot(y)
    out['Sole'] = ring_solid(b, P, [
        (0.0000, lambda x, y: sole_bot(y)),
        (0.0016, lambda x, y: sole_bot(y) + 0.0012),
        (0.0018, lambda x, y: sole_bot(y) + SOLE_T - 0.0012),
        (0.0004, lambda x, y: sole_bot(y) + SOLE_T + 0.0004),
        (-0.0040, lambda x, y: sole_bot(y) + SOLE_T + 0.0004)])
    # --- heel block: tapered prism under the heel seat, set back from the instep
    yb = P[:, 1]
    sel = (yb > -0.034) & (yb < -0.026)
    xc = 0.5 * (P[sel, 0].min() + P[sel, 0].max()) if sel.any() else 0.0
    ytop0, ytop1 = float(P[:, 1].min()) + 0.0030, -0.006
    hw_top = 0.0165
    top = chamfer_poly(xc - hw_top, xc + hw_top, ytop0, ytop1, 0.0060)
    bot = chamfer_poly(xc - 0.0115, xc + 0.0115, ytop0 + 0.0040, ytop0 + 0.0260, 0.0040)
    mid = 0.55 * top + 0.45 * bot
    ztop = HEEL_H + 0.0010
    rings = [np.c_[bot, np.zeros(len(bot))],
             np.c_[bot + (mid - bot) * 0.03, np.full(len(bot), 0.0045)],
             np.c_[top, np.full(len(top), ztop)]]
    hb = [loft_solid(b, rings)]
    out['SoleHeel'] = hb
    # --- angular toe guard (front 4.5 cm of the toe) + grey lip trim, screw, slot
    PG = plan_outline(b, V, F, (0.002, 0.008, 0.014, 0.020, 0.026), smooth=5)
    if HS.polygon_area(PG) < 0:
        PG = PG[::-1]
    yg0 = Y_TIP - 0.046
    idx = np.where(PG[:, 1] > yg0)[0]
    # order: outer side (x > 0) -> tip -> inner side, following the CCW loop
    start = idx[np.argmin(np.where(PG[idx, 0] > 0, PG[idx, 1], 9.0))]
    order = [(start + k) % len(PG) for k in range(len(PG))]
    arc = []
    for i in order:
        if PG[i, 1] <= yg0:
            break
        arc.append(i)
    ks = [arc[int(round(f * (len(arc) - 1)))] for f in (0.0, 0.22, 0.40, 0.60, 0.78, 1.0)]
    C = tangent_polygon(PG, ks, 0.0008)

    def zt(y):
        return 0.0170 + 0.0115 * np.clip((y - yg0) / (Y_TIP - yg0), 0, 1)

    # the guard's bottom edge runs down to the sole bottom found just behind it
    zb = lambda y: sole_bot(y - 0.014) - 0.0002
    ztop = lambda y: sole_bot(y) + zt(y)
    gprof = [(-0.0140, lambda y: zb(y) + 0.0008), (0.0016, zb),
             (0.0032, lambda y: zb(y) + 0.0014), (0.0032, lambda y: ztop(y) - 0.0065),
             (0.0000, ztop), (-0.0140, ztop)]
    # grey lip on the upper part of the guard's chamfer facet
    nf = nrm(np.array([0.0065, 0.0032]))
    A_, B_ = np.array([0.0032, -0.0065]), np.array([0.0, 0.0])
    p0 = A_ + (B_ - A_) * 0.55
    tq = [p0 - nf * 0.0002, B_ + (-0.0030, -0.0002), B_ + (-0.0030, 0.0007),
          B_ + nf * 0.0006 + (-0.0004, 0.0), p0 + nf * 0.0006]
    tprof = [(float(dq[0]), (lambda dz: (lambda y: ztop(y) + dz))(float(dq[1]))) for dq in tq]
    g, gp, gn, gq = sweep_open(b, C, gprof)
    out['SoleGuard'] = [g]
    out['SoleTrim'] = [sweep_open(b, C, tprof)[0]]
    # screw head (inner front) and slot decal (outer front) on the front wall
    deco_s, deco_k = [], []
    for qq, kind in ((0.30, 'slot'), (0.70, 'screw')):
        i = int(np.argmin(np.abs(gq - qq)))
        y = gp[i, 1]
        zc = float(sole_bot(y)) + 0.40 * float(zt(y))
        c = np.r_[gp[i] + gn[i] * 0.0030, zc]
        tng = nrm(np.r_[np.gradient(gp, axis=0)[i], 0.0])
        R = HS.frame_from(x=tng, z=np.r_[gn[i], 0.0])
        if kind == 'screw':
            V_, F_ = HS.prism(HS.circle(0.0011, 12), 0.0011, c, R, z0=-0.0004)
            deco_s.append((b.world(V_), F_))
        else:
            V_, F_ = HS.prism(HS.rounded_rect(0.0052, 0.0016, 0.0007, 3), 0.0005, c, R,
                              z0=-0.0003)
            deco_k.append((b.world(V_), F_))
    out['SoleScrew'] = deco_s
    out['SoleSlot'] = deco_k
    return out, P


# ------------------------------------------------------------------ pieces on the upper

def patch(b, poly, off0, thick, h=0.0025, lift=None, holes=()):
    """Hard shell over a 2D polygon of the chart (a = around, v = down the
    front line).  ``lift(Q)`` adds a per-vertex extra offset."""
    loops = [np.asarray(poly, dtype=np.float64)] + [np.asarray(hh, dtype=np.float64) for hh in holes]
    Q, T = tri_region(loops, h)
    a, t = b.chart(Q)
    P = b.S(a, t, arc=True)
    N = b.N(a, t, arc=True)
    T = orient_tris(P, N, T)
    t0 = off0 + (lift(Q) if lift is not None else 0.0)
    return shell(P, N, T, thick, t0)


SU, ST = 0.21, 0.09     # metric scale of the (u, t) parameters for patch_ut


def patch_ut(b, poly, off0, thick, h=0.003):
    """Hard shell over a polygon given in the surface parameters (u, t)."""
    poly = np.asarray(poly, dtype=np.float64) * (SU, ST)
    Q, T = tri_region([poly], h)
    u, t = Q[:, 0] / SU, Q[:, 1] / ST
    P = b.S(u, t)
    N = b.N(u, t)
    T = orient_tris(P, N, T)
    return shell(P, N, T, thick, off0)


def t_back_z(b, z, u=0.5):
    """Surface parameter t where the line u (default: the back) reaches local
    height z (first crossing going down)."""
    tt = np.linspace(0, 2.6, 1301)
    Lc, _ = b.S_local(np.full_like(tt, u), tt)
    zz = Lc[:, 2]
    k = int(np.argmax(zz < z))
    w = (zz[k - 1] - z) / (zz[k - 1] - zz[k])
    return float(tt[k - 1] + (tt[k] - tt[k - 1]) * w)


def u_of_arc(b, z, a):
    """Loop parameter u of the point at signed arc a (m, + outer side) from the
    front line, on the shaft section at local height z."""
    us = np.linspace(0, 1, 1441)
    t = float(b.t_of_z(z))
    P = b.S(us, np.full_like(us, t))
    d = np.linalg.norm(np.diff(P, axis=0), axis=1)
    c = np.concatenate([[0], np.cumsum(d)])
    if a >= 0:
        return float(np.interp(a, c, us))
    cm = c[-1] - c
    return float(np.interp(-a, cm[::-1], us[::-1]))


def ring(b, zc, w, off0, thick, nu=72, nr=4, tilt=0.0, phase=0.0, u0=0.0, u1=1.0):
    """Band around the shaft between z = zc(u) -+ w/2 (local heights)."""
    closed = (u1 - u0) >= 1.0 - 1e-9
    us = np.linspace(u0, u1, nu, endpoint=not closed)
    zcu = zc + tilt * np.sin(2 * np.pi * us + phase)
    rows = np.linspace(-0.5, 0.5, nr)
    Z = zcu[None, :] + rows[:, None] * w
    U = np.broadcast_to(us[None, :], Z.shape)
    T_ = b.t_of_z(Z)
    P = b.S(U, T_).reshape(-1, 3)
    N = b.N(U, T_).reshape(-1, 3)
    F = tri_faces(grid_quads(nr, nu, closed_j=closed))
    F = orient_tris(P, N, F)
    return shell(P, N, F, thick, off0)


def arc_poly(cx, cy, r, a0, a1, n=10):
    a = np.radians(np.linspace(a0, a1, n))
    return np.stack([cx + r * np.cos(a), cy + r * np.sin(a)], 1)


def edge_strip(pts, w):
    """Thin band of width w under a polyline of chart points (v grows down)."""
    pts = np.asarray(pts, dtype=np.float64)
    return np.concatenate([pts, (pts + (0.0, w))[::-1]])


def details(b):
    s = b.side
    zm = b.zmap
    vz = lambda z: float(b.v_front_z(zm(z)))
    out = {}
    ztop = b.ztop
    # --- padded collar at the top
    zc0 = zm(0.2895)
    out['BootCollar'] = [ring(b, 0.5 * (zc0 + ztop + 0.002), ztop + 0.002 - zc0, 0.0, 0.0020)]
    # --- name plate on black, red band around the rest of the cuff, red strip below
    vp0, vp1 = vz(0.2870), vz(0.2655)
    pa0, pa1 = (-0.0050, 0.0350) if s == 'R' else (-0.0190, 0.0190)
    zr0, zr1 = zm(0.2640), zm(0.2885)
    zrc = 0.5 * (zr0 + zr1)
    ua = u_of_arc(b, zrc, pa1 + 0.0035)
    ub = u_of_arc(b, zrc, pa0 - 0.0035)
    out['BootRed'] = [ring(b, zrc, zr1 - zr0, 0.0002, 0.0019, nu=72, u0=ua, u1=ub)]
    vr0, vr1 = vz(0.2615), vz(0.2515)
    ra0, ra1 = (-0.008, 0.040) if s == 'R' else (-0.012, 0.034)
    out['BootRed'].append(patch(b, [(ra0, vr0), (ra1, vr0), (ra1, vr1), (ra0, vr1)],
                                0.0002, 0.0019))
    c = 0.0018
    plate = [(pa0 + c, vp0), (pa1 - c, vp0), (pa1, vp0 + c), (pa1, vp1 - c), (pa1 - c, vp1),
             (pa0 + c, vp1), (pa0, vp1 - c), (pa0, vp0 + c)]
    out["BootPlate"] = [patch(b, plate, 0.0004, 0.0016, h=0.0026)]
    eng = []
    for va, vb, aa, ab in ((0.32, 0.42, 0.25, 0.75), (0.55, 0.64, 0.30, 0.70)):
        y0 = vp0 + (vp1 - vp0) * va
        y1 = vp0 + (vp1 - vp0) * vb
        x0 = pa0 + (pa1 - pa0) * aa
        x1 = pa0 + (pa1 - pa0) * ab
        eng.append(patch(b, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 0.0020, 0.00025,
                         h=0.0008))
    for ax in (pa0 + 0.0028, pa1 - 0.0028):
        vm = 0.5 * (vp0 + vp1)
        eng.append(patch(b, arc_poly(ax, vm, 0.0011, 0, 360, 10)[:-1], 0.0020, 0.0004,
                         h=0.0008))
    out['BootPlateText'] = eng
    # --- three wrap straps under the cuff (slightly helical, overlapping)
    wr = []
    for k, (zc, ph) in enumerate(((0.2425, 0.4), (0.2295, 2.2), (0.2165, 4.1))):
        z0, z1 = zm(zc - 0.0072), zm(zc + 0.0072)
        wr.append(ring(b, 0.5 * (z0 + z1), z1 - z0, 0.0002 + 0.0006 * (2 - k), 0.0022,
                       tilt=0.0018, phase=ph))
    out['BootWraps'] = wr
    # --- white inverted-U panel on the shin and the black centre strip
    zt0, zt1, zb = 0.2110, 0.1955, 0.106
    U = [(-0.0330, vz(zt0)), (0.0330, vz(zt0)), (0.0345, vz(zt1)), (0.0400, vz(zb)),
         (0.0130, vz(zb)), (0.0120, vz(zt1)), (-0.0120, vz(zt1)), (-0.0130, vz(zb)),
         (-0.0400, vz(zb)), (-0.0345, vz(zt1))]
    out['BootPanel'] = [patch(b, U, 0.0002, 0.0014, h=0.0040)]
    vt = vz(0.1945)
    rs = 0.0080
    strip = [(rs, vz(0.100)), (rs, vt + rs)] + \
        [tuple(p) for p in arc_poly(0.0, vt + rs, rs, 0, -180, 12)[1:-1]] + \
        [(-rs, vt + rs), (-rs, vz(0.100))]
    out['BootTongue'] = [patch(b, strip, 0.0002, 0.0026, h=0.003)]
    # tiny dark print centred on the white top bar of the U
    vq = vz(0.2045)
    out['BootPrint'] = [patch(b, [(-0.012, vq), (0.006, vq), (0.006, vq + 0.0012),
                                  (-0.012, vq + 0.0012)], 0.0016, 0.0002, h=0.0008),
                        patch(b, [(-0.009, vq + 0.0024), (0.002, vq + 0.0024),
                                  (0.002, vq + 0.0033), (-0.009, vq + 0.0033)], 0.0016,
                              0.0002, h=0.0008)]
    # --- ankle strap with two side keepers
    za0, za1 = 0.1665, 0.1805
    ank = [ring(b, 0.5 * (za0 + za1), za1 - za0, 0.0018, 0.0026, nu=96)]
    for uc in (0.25, 0.75):
        ac = 0.052 if uc < 0.5 else -0.052
        k0, k1 = vz(za1 + 0.0035), vz(za0 - 0.0035)
        ank.append(patch(b, [(ac - 0.0065, k0), (ac + 0.0065, k0), (ac + 0.0065, k1),
                             (ac - 0.0065, k1)], 0.0040, 0.0034, h=0.0016))
    out['BootAnkleStrap'] = ank
    # --- the wide instep straps (velcro): upper flap with a pointed tab, lower strap
    vA0 = vz(0.149)
    vA1 = vA0 + 0.044
    vB0 = vA1 - 0.006
    vB1 = vB0 + 0.044
    am, al = -0.068, 0.070
    o_low, o_flap, th = 0.0006, 0.0044, 0.0030
    lower = [(am, vB0 + 0.003), (0.0, vB0 - 0.002), (al, vB0 + 0.003), (al, vB1 - 0.004),
             (0.0, vB1), (am, vB1 - 0.004)]
    flap_top = [(am - 0.002, vA0 + 0.006), (-0.024, vA0 + 0.0012), (0.0, vA0 - 0.0016),
                (0.024, vA0 + 0.0012), (al - 0.002, vA0 + 0.006)]
    flap = flap_top + [(al + 0.020, vA1 - 0.006), (al + 0.004, vA1 + 0.002), (0.0, vA1),
                       (am - 0.002, vA1 + 0.002)]

    def tab_lift(Q):
        return 0.0040 * smoothstep(Q[:, 0], al - 0.008, al + 0.020)
    out['BootInstep'] = [patch(b, lower, o_low, th, h=0.0045),
                         patch(b, flap, o_flap, th, h=0.0045, lift=tab_lift)]
    # light bevel edge lines along the top edge of the flap and the lower strap's hem
    hem = [(am, vB1 - 0.004 - 0.0013), (0.0, vB1 - 0.0013), (al, vB1 - 0.004 - 0.0013)]
    flap_bot = [(am, vA1 + 0.002 - 0.0012), (0.0, vA1 - 0.0012), (al + 0.004, vA1 + 0.002 - 0.0012)]
    out['BootEdge'] = [patch(b, edge_strip(flap_top, 0.0013), o_flap + th + 0.0001, 0.0002,
                             h=0.0022, lift=tab_lift),
                       patch(b, edge_strip(flap_bot, 0.0010), o_flap + th + 0.0001, 0.0002,
                             h=0.0022, lift=tab_lift),
                       patch(b, edge_strip(hem, 0.0011), o_low + th + 0.0001, 0.0002,
                             h=0.0022)]
    # velcro print: two rows of tiny white "words" on the flap
    txt = []
    vm = 0.5 * (vA0 + vA1)
    rows = [(vm - 0.0035, [(-0.016, -0.010), (-0.008, -0.001), (0.001, 0.012), (0.014, 0.019)]),
            (vm + 0.0002, [(-0.011, -0.004), (-0.002, 0.009)])]
    for vr, words in rows:
        for x0, x1 in words:
            txt.append(patch(b, [(x0, vr), (x1, vr), (x1, vr + 0.0015), (x0, vr + 0.0015)],
                             o_flap + th + 0.0001, 0.0002, h=0.0008))
    out['BootPrintW'] = txt
    # --- flat black toe cap (its lower part runs under the toe guard)
    vc0 = vB1 + 0.003
    vend = float(b.tab_v[-1]) - 1e-4
    cap = [(-0.095, vc0 + 0.008), (-0.030, vc0 + 0.001), (0.0, vc0), (0.030, vc0 + 0.001),
           (0.095, vc0 + 0.008), (0.095, vend), (-0.095, vend)]
    out['BootToe'] = [patch(b, cap, 0.0002, 0.0012, h=0.006)]
    # perforations: 6 light-rimmed holes in an arc on the vamp
    vh = vc0 + 0.0095
    holes = []
    for ax in np.linspace(-0.020, 0.020, 6):
        vv = vh - 0.0030 * (ax / 0.020) ** 2
        holes.append(patch(b, arc_poly(ax, vv, 0.0015, 0, 360, 13)[:-1], 0.0014, 0.0003,
                           h=0.0010, holes=[arc_poly(ax, vv, 0.0008, 360, 0, 9)[:-1]]))
    out['BootHoles'] = holes
    # --- grey heel counter column on the back (heel seat up to the ankle strap)
    tb = t_back_z(b, z_floor(-0.05) + 0.004)
    tt = t_back_z(b, 0.163)
    out['BootHeelBack'] = [patch_ut(b, [(0.5 - 0.042, tb), (0.5 + 0.042, tb),
                                        (0.5 + 0.026, tt), (0.5 - 0.026, tt)], 0.0002, 0.0022)]
    return out


MATS = {'BootCollar': 'leather', 'BootRed': 'boots_red', 'BootPlate': 'chrome',
        'BootPlateText': 'gunmetal', 'BootWraps': 'black', 'BootPanel': 'white',
        'BootTongue': 'black', 'BootPrint': 'gunmetal', 'BootAnkleStrap': 'black',
        'BootInstep': 'black', 'BootEdge': 'boots_edge', 'BootPrintW': 'decal_white',
        'BootToe': 'rubber', 'BootHoles': 'gray', 'BootHeelBack': 'boots_rubber'}


def build_side(s):
    b = Boot(s)
    out = {}
    (V, F), ts = upper_mesh(b)
    out['BootUpper' + s] = HS.hard_mesh((V, F), 'leather', bevel=0.0004, angle=38.0,
                                        outline_w=0.8)
    sp, P = sole_parts(b, V, F)
    out['Sole' + s] = HS.hard_mesh(sp['Sole'], 'rubber', bevel=0.0005, angle=35, outline_w=0.7)
    out['SoleHeel' + s] = solid(sp['SoleHeel'], 'boots_rubber', bevel=0.0006, angle=30)
    out['SoleGuard' + s] = solid(sp['SoleGuard'], 'boots_sole', bevel=0.0005, angle=28)
    out['SoleTrim' + s] = solid(sp['SoleTrim'], 'boots_rubber', bevel=0.0003, angle=28,
                                outline_w=0.5)
    out['SoleScrew' + s] = solid(sp['SoleScrew'], 'gunmetal', bevel=0.0002, angle=35,
                                 outline=False)
    out['SoleSlot' + s] = solid(sp['SoleSlot'], 'rubber', bevel=0.0, angle=35, outline=False)
    for name, parts in details(b).items():
        small = name in ('BootPlateText', 'BootPrint', 'BootPrintW', 'BootHoles', 'BootEdge')
        out[name + s] = solid(parts, MATS[name], bevel=0.0 if small else 0.0004, angle=35,
                              outline=not small, outline_w=0.5)
    return out, b


def build():
    out = {}
    for s in ('R', 'L'):
        o, _ = build_side(s)
        out.update(o)
    return out

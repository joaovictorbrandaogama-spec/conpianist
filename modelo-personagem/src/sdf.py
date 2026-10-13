"""Small signed-distance-field toolkit used to sculpt the character.

Every primitive is a callable ``prim(P) -> d`` where ``P`` is an array of
points with shape (..., 3) and ``d`` the (approximate) signed distance,
negative inside.  Each primitive also reports an axis aligned bounding box so
that a :class:`Grid` only evaluates it where it matters.

Coordinates are Blender's: metres, Z up, the character looks towards -Y.
"""

import numpy as np
from scipy.interpolate import PchipInterpolator

F = np.float32


def v3(*a):
    if len(a) == 1:
        return np.asarray(a[0], dtype=np.float64)
    return np.asarray(a, dtype=np.float64)


def normalize(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.linalg.norm(v)


# ---------------------------------------------------------------- operators

def smin(a, b, k):
    """Polynomial smooth minimum (union)."""
    if k <= 0:
        return np.minimum(a, b)
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0.0, 1.0)
    return b * (1.0 - h) + a * h - k * h * (1.0 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def frame_from_axis(axis, up_hint=(0, -1, 0)):
    """Orthonormal frame (u, v, w) with w along ``axis``.

    ``u`` is the component of ``up_hint`` perpendicular to the axis (for limbs
    the hint is "front", so u = front direction and v = side direction)."""
    w = normalize(axis)
    h = np.asarray(up_hint, dtype=np.float64)
    u = h - w * np.dot(h, w)
    if np.linalg.norm(u) < 1e-6:
        h = np.array([1.0, 0, 0]) if abs(w[0]) < 0.9 else np.array([0, 0, 1.0])
        u = h - w * np.dot(h, w)
    u = normalize(u)
    v = np.cross(w, u)
    return u, v, w


def rot_x(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def rot_y(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rot_z(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def euler(x=0.0, y=0.0, z=0.0):
    """Rotation matrix (local -> world), XYZ order in degrees."""
    return rot_z(np.radians(z)) @ rot_y(np.radians(y)) @ rot_x(np.radians(x))


# --------------------------------------------------------------- primitives

class Prim:
    pad = 0.0

    def bounds(self):
        raise NotImplementedError

    def __call__(self, P):
        raise NotImplementedError


class Sphere(Prim):
    def __init__(self, c, r):
        self.c, self.r = v3(c), float(r)

    def bounds(self):
        return self.c - self.r, self.c + self.r

    def __call__(self, P):
        return np.linalg.norm(P - self.c, axis=-1) - self.r


class Ellipsoid(Prim):
    """Ellipsoid with radii ``r`` in a local frame ``R`` (columns = axes)."""

    def __init__(self, c, r, R=None):
        self.c, self.r = v3(c), v3(r)
        self.R = np.eye(3) if R is None else np.asarray(R, dtype=np.float64)

    def bounds(self):
        ext = np.abs(self.R) @ self.r
        return self.c - ext, self.c + ext

    def __call__(self, P):
        q = (P - self.c) @ self.R
        k0 = np.linalg.norm(q / self.r, axis=-1)
        k1 = np.linalg.norm(q / (self.r * self.r), axis=-1)
        return k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)


class RoundCone(Prim):
    """Capsule with different radii at both ends (exact, by I. Quilez).

    ``ell`` = (sx, sy) scales the cross section along the frame's u (front) and
    v (side) directions which gives elliptical limbs."""

    def __init__(self, a, b, r1, r2, ell=(1.0, 1.0), front=(0, -1, 0)):
        self.a, self.b = v3(a), v3(b)
        self.r1, self.r2 = float(r1), float(r2)
        self.ell = (float(ell[0]), float(ell[1]))
        self.L = float(np.linalg.norm(self.b - self.a))
        self.u, self.v, self.w = frame_from_axis(self.b - self.a, front)

    def bounds(self):
        r = max(self.r1, self.r2) * max(self.ell)
        lo = np.minimum(self.a, self.b) - r
        hi = np.maximum(self.a, self.b) + r
        return lo, hi

    def __call__(self, P):
        d = P - self.a
        sx, sy = self.ell
        x = (d @ self.u) / sx
        y = (d @ self.v) / sy
        z = d @ self.w
        # 2D problem: radial distance in the scaled cross section, axial z
        q = np.sqrt(x * x + y * y)
        r1, r2, h = self.r1, self.r2, self.L
        b = (r1 - r2) / h
        a = np.sqrt(max(1.0 - b * b, 1e-9))
        k = -b * q + a * z  # dot(q2, vec2(-b, a))
        out = np.where(
            k < 0.0,
            np.sqrt(q * q + z * z) - r1,
            np.where(k > a * h,
                     np.sqrt(q * q + (z - h) ** 2) - r2,
                     q * a + z * b - r1))
        return out * min(sx, sy)


class Box(Prim):
    """Rounded box, half size ``hs``, rotation ``R`` (local -> world)."""

    def __init__(self, c, hs, R=None, rad=0.0):
        self.c, self.hs = v3(c), v3(hs)
        self.R = np.eye(3) if R is None else np.asarray(R, dtype=np.float64)
        self.rad = float(rad)

    def bounds(self):
        ext = np.abs(self.R) @ (self.hs + self.rad)
        return self.c - ext, self.c + ext

    def __call__(self, P):
        q = np.abs((P - self.c) @ self.R) - self.hs
        out = np.linalg.norm(np.maximum(q, 0.0), axis=-1)
        ins = np.minimum(np.max(q, axis=-1), 0.0)
        return out + ins - self.rad


class Torus(Prim):
    """Torus in the local XY plane of ``R`` (axis = local Z)."""

    def __init__(self, c, R_major, r_minor, R=None, squash=1.0):
        self.c = v3(c)
        self.Rm, self.rm = float(R_major), float(r_minor)
        self.R = np.eye(3) if R is None else np.asarray(R, dtype=np.float64)
        self.squash = squash  # >1 stretches the tube along the axis

    def bounds(self):
        e = self.Rm + self.rm * max(1, self.squash)
        return self.c - e, self.c + e

    def __call__(self, P):
        q = (P - self.c) @ self.R
        xy = np.sqrt(q[..., 0] ** 2 + q[..., 1] ** 2) - self.Rm
        z = q[..., 2] / self.squash
        return (np.sqrt(xy * xy + z * z) - self.rm) * min(1.0, 1.0 / self.squash)


class Cylinder(Prim):
    """Capped cylinder between a and b with radius r and edge rounding."""

    def __init__(self, a, b, r, rad=0.0):
        self.a, self.b, self.r, self.rad = v3(a), v3(b), float(r), float(rad)
        self.L = float(np.linalg.norm(self.b - self.a))
        self.ax = (self.b - self.a) / self.L

    def bounds(self):
        r = self.r + self.rad
        return np.minimum(self.a, self.b) - r, np.maximum(self.a, self.b) + r

    def __call__(self, P):
        d = P - (self.a + self.b) * 0.5
        z = d @ self.ax
        rr = np.linalg.norm(d - z[..., None] * self.ax, axis=-1)
        qx = rr - (self.r - self.rad)
        qz = np.abs(z) - (self.L * 0.5 - self.rad)
        out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qz, 0) ** 2)
        return out + np.minimum(np.maximum(qx, qz), 0) - self.rad


class Loft(Prim):
    """Vertical generalized cylinder.

    The cross section at height z is an (asymmetric) super-ellipse centred at
    (cx(z), cy(z)) with half width a(z), front depth bf(z) (towards -Y) and
    back depth bb(z).  Profiles are given as lists of (z, value) knots and
    interpolated monotonically.  The shape is capped at zmin / zmax."""

    def __init__(self, knots, zmin=None, zmax=None, power=2.0, cap_round=0.0,
                 origin=None, R=None):
        # knots: dict name -> list of (z, value)
        # origin / R: optional local frame (columns of R = local x, y, z axes)
        self.origin = None if origin is None else v3(origin)
        self.R = None if R is None else np.asarray(R, dtype=np.float64)
        self.f = {}
        zs = []
        for name, pts in knots.items():
            pts = sorted(pts)
            z = np.array([p[0] for p in pts])
            val = np.array([p[1] for p in pts])
            zs += list(z)
            if len(z) == 1:
                self.f[name] = (lambda c: (lambda q: np.full_like(q, c)))(val[0])
            else:
                self.f[name] = PchipInterpolator(z, val, extrapolate=True)
        self.zmin = min(zs) if zmin is None else zmin
        self.zmax = max(zs) if zmax is None else zmax
        self.power = power
        self.cap_round = cap_round
        # table for fast lookups
        self.tz = np.linspace(self.zmin - 0.05, self.zmax + 0.05, 2048)
        self.tab = {k: np.asarray(fn(np.clip(self.tz, self.zmin, self.zmax)), dtype=np.float64)
                    for k, fn in self.f.items()}

    def prof(self, name, z):
        return np.interp(z, self.tz, self.tab[name])

    def bounds(self):
        t = self.tab
        lo = np.array([(t['cx'] - t['a']).min(), (t['cy'] - t['bf']).min(), self.zmin])
        hi = np.array([(t['cx'] + t['a']).max(), (t['cy'] + t['bb']).max(), self.zmax])
        if 'rot' in t:
            m = max(t['a'].max(), t['bf'].max(), t['bb'].max())
            lo[:2] = [(t['cx']).min() - m, (t['cy']).min() - m]
            hi[:2] = [(t['cx']).max() + m, (t['cy']).max() + m]
        if self.R is None:
            return lo, hi
        corners = np.array([[x, y, z] for x in (lo[0], hi[0]) for y in (lo[1], hi[1])
                            for z in (lo[2], hi[2])])
        w = corners @ self.R.T + self.origin
        return w.min(axis=0), w.max(axis=0)

    def __call__(self, P):
        if self.R is not None:
            P = (P - self.origin) @ self.R
        x, y, z = P[..., 0], P[..., 1], P[..., 2]
        cx, cy = self.prof('cx', z), self.prof('cy', z)
        a, bf, bb = self.prof('a', z), self.prof('bf', z), self.prof('bb', z)
        dx = x - cx
        dy = y - cy
        if 'rot' in self.tab:
            r = np.radians(self.prof('rot', z))
            c, sn = np.cos(r), np.sin(r)
            dx, dy = dx * c + dy * sn, -dx * sn + dy * c
        b = np.where(dy < 0, bf, bb)
        p = self.power
        if p == 2.0:
            k0 = np.sqrt((dx / a) ** 2 + (dy / b) ** 2)
            k1 = np.sqrt((dx / (a * a)) ** 2 + (dy / (b * b)) ** 2)
            d2 = k0 * (k0 - 1.0) / np.maximum(k1, 1e-9)
        else:
            k0 = ((np.abs(dx) / a) ** p + (np.abs(dy) / b) ** p) ** (1.0 / p)
            d2 = (k0 - 1.0) * np.minimum(a, b)
        dz = np.maximum(self.zmin - z, z - self.zmax)
        if self.cap_round > 0:
            return smax(d2, dz, self.cap_round)
        return np.maximum(d2, dz)


def limb_frame(top, bottom, back=(0, 1, 0)):
    """Frame for a limb loft: local z points from ``bottom`` to ``top``,
    local y towards ``back``.  Returns R (columns = local axes)."""
    z = normalize(v3(top) - v3(bottom))
    y = v3(back) - z * np.dot(v3(back), z)
    y = normalize(y)
    x = np.cross(y, z)
    return np.stack([x, y, z], axis=1)


class Chain(Prim):
    """Union of round cones through points with radii (a limb)."""

    def __init__(self, pts, radii, ell=(1.0, 1.0), front=(0, -1, 0), k=0.0):
        self.cones = []
        ells = ell if isinstance(ell[0], (tuple, list)) else [ell] * (len(pts) - 1)
        fronts = front if isinstance(front[0], (tuple, list, np.ndarray)) else [front] * (len(pts) - 1)
        for i in range(len(pts) - 1):
            self.cones.append(RoundCone(pts[i], pts[i + 1], radii[i], radii[i + 1],
                                        ells[i], fronts[i]))
        self.k = k

    def bounds(self):
        lo = np.min([c.bounds()[0] for c in self.cones], axis=0)
        hi = np.max([c.bounds()[1] for c in self.cones], axis=0)
        return lo, hi

    def __call__(self, P):
        d = self.cones[0](P)
        for c in self.cones[1:]:
            d = smin(d, c(P), self.k)
        return d


class Union(Prim):
    def __init__(self, prims, k=0.0):
        self.prims, self.k = prims, k

    def bounds(self):
        lo = np.min([p.bounds()[0] for p in self.prims], axis=0) - self.k
        hi = np.max([p.bounds()[1] for p in self.prims], axis=0) + self.k
        return lo, hi

    def __call__(self, P):
        d = self.prims[0](P)
        for p in self.prims[1:]:
            d = smin(d, p(P), self.k)
        return d


class Func(Prim):
    """Wrap an arbitrary function with explicit bounds."""

    def __init__(self, fn, lo, hi):
        self.fn, self.lo, self.hi = fn, v3(lo), v3(hi)

    def bounds(self):
        return self.lo, self.hi

    def __call__(self, P):
        return self.fn(P)


# ---------------------------------------------------------------- grid

class Grid:
    """Dense SDF sample grid with sparse (bounding box) updates."""

    def __init__(self, lo, hi, h, fill=1.0):
        self.h = float(h)
        self.lo = v3(lo) - 3 * h
        hi = v3(hi) + 3 * h
        self.shape = tuple(int(np.ceil(s)) + 1 for s in (hi - self.lo) / h)
        self.d = np.full(self.shape, fill, dtype=F)

    def axis(self, i):
        return (self.lo[i] + np.arange(self.shape[i]) * self.h)

    def _slices(self, lo, hi):
        i0 = np.floor((v3(lo) - self.lo) / self.h).astype(int)
        i1 = np.ceil((v3(hi) - self.lo) / self.h).astype(int) + 1
        i0 = np.clip(i0, 0, self.shape)
        i1 = np.clip(i1, 0, self.shape)
        if np.any(i1 <= i0):
            return None
        return tuple(slice(a, b) for a, b in zip(i0, i1))

    def points(self, sl):
        xs = self.axis(0)[sl[0]]
        ys = self.axis(1)[sl[1]]
        zs = self.axis(2)[sl[2]]
        X, Y, Z = np.meshgrid(xs, ys, zs, indexing='ij')
        return np.stack([X, Y, Z], axis=-1)

    def _iter_chunks(self, sl, max_pts=4_000_000):
        nx = sl[0].stop - sl[0].start
        ny = sl[1].stop - sl[1].start
        nz = sl[2].stop - sl[2].start
        step = max(1, int(max_pts // max(1, nx * ny)))
        for z0 in range(sl[2].start, sl[2].stop, step):
            yield (sl[0], sl[1], slice(z0, min(z0 + step, sl[2].stop)))

    def union(self, prim, k=0.0):
        lo, hi = prim.bounds()
        sl = self._slices(lo - k - 2 * self.h, hi + k + 2 * self.h)
        if sl is None:
            return self
        for s in self._iter_chunks(sl):
            P = self.points(s)
            self.d[s] = smin(self.d[s], prim(P), k)
        return self

    def subtract(self, prim, k=0.0):
        lo, hi = prim.bounds()
        sl = self._slices(lo - k - 2 * self.h, hi + k + 2 * self.h)
        if sl is None:
            return self
        for s in self._iter_chunks(sl):
            P = self.points(s)
            self.d[s] = smax(self.d[s], -prim(P), k)
        return self

    def intersect(self, fn, k=0.0):
        """Intersect with an arbitrary function evaluated on the whole grid."""
        full = tuple(slice(0, n) for n in self.shape)
        for s in self._iter_chunks(full):
            P = self.points(s)
            self.d[s] = smax(self.d[s], fn(P), k)
        return self

    def map(self, fn):
        """d <- fn(d, P) over the whole grid."""
        full = tuple(slice(0, n) for n in self.shape)
        for s in self._iter_chunks(full):
            P = self.points(s)
            self.d[s] = fn(self.d[s], P)
        return self

    def copy(self):
        g = Grid.__new__(Grid)
        g.h, g.lo, g.shape, g.d = self.h, self.lo.copy(), self.shape, self.d.copy()
        return g

    def sample(self, P):
        """Trilinear sample of the grid at points P (N,3)."""
        from scipy.ndimage import map_coordinates
        idx = ((np.asarray(P) - self.lo) / self.h).T
        return map_coordinates(self.d, idx, order=1, mode='nearest')

    def mesh(self, level=0.0):
        from skimage.measure import marching_cubes
        if self.d.min() >= level or self.d.max() <= level:
            return np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64)
        verts, faces, _n, _v = marching_cubes(self.d, level=level,
                                              spacing=(self.h,) * 3,
                                              allow_degenerate=False)
        verts = verts.astype(np.float64) + self.lo
        return verts, faces.astype(np.int64)


def gradient(fn, P, eps=1e-4):
    P = np.asarray(P, dtype=np.float64)
    g = np.zeros_like(P)
    for i in range(3):
        e = np.zeros(3)
        e[i] = eps
        g[:, i] = (fn(P + e) - fn(P - e)) / (2 * eps)
    n = np.linalg.norm(g, axis=-1, keepdims=True)
    return g / np.maximum(n, 1e-12)


def loft_radius(loft, theta, z):
    """Distance from the loft centre to its surface in direction theta
    (radians, 0 = front (-Y), +pi/2 = +X) at height z."""
    theta = np.asarray(theta, dtype=np.float64)
    z = np.asarray(z, dtype=np.float64)
    a, bf, bb = loft.prof('a', z), loft.prof('bf', z), loft.prof('bb', z)
    ux, uy = np.sin(theta), -np.cos(theta)
    if 'rot' in loft.tab:
        r = np.radians(loft.prof('rot', z))
        c, sn = np.cos(r), np.sin(r)
        ux, uy = ux * c + uy * sn, -ux * sn + uy * c
    b = np.where(uy < 0, bf, bb)
    return 1.0 / np.sqrt((ux / a) ** 2 + (uy / b) ** 2)

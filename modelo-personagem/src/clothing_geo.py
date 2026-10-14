"""Geometry helpers for the clothing part (bikini, shorts, belts, garter,
sleeves, leg armour).

Garments are explicit polygon shells instead of marching-cubes iso-surfaces:

1. a 2D region is described in the coordinates of a *chart* (limb
   (angle, length), torso (angle, height) or the front view (x, z));
2. it is tessellated cleanly (boundary samples + hexagonal interior points,
   Delaunay) or built as a structured grid;
3. every 2D point is *lifted* onto an offset surface of the body SDF by ray
   casting + bisection (exact: no grid noise, so no toon speckles);
4. the surface is extruded along the SDF gradient into a closed shell with
   rim faces on every boundary edge.  The shells are flagged ``hard`` so
   Blender shades them smooth with sharp rims and a tiny bevel.

Chart parameters are *metric*: angles are multiplied by a reference radius
``R0`` so 2D shapes keep their real proportions.
"""

import numpy as np
from scipy.spatial import Delaunay

from meshutil import MeshData, polygon_sd


# ------------------------------------------------------------------ basics

def nrm(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-12)


def grad(fn, P, eps=1.5e-4):
    P = np.asarray(P, dtype=np.float64)
    sh = P.shape
    Q = P.reshape(-1, 3)
    g = np.zeros_like(Q)
    for i in range(3):
        e = np.zeros(3)
        e[i] = eps
        g[:, i] = fn(Q + e) - fn(Q - e)
    return nrm(g).reshape(sh)


def ray_hit(fn, O, D, level, t1, n=72, mode='enter', iters=28, t0=0.0):
    """First crossing of fn == level along rays O + t D, t in [t0, t1].

    mode 'enter': rays start outside (fn > level) -> first t with fn < level.
    mode 'exit' : rays start inside -> first t with fn > level.
    Returns (t, ok)."""
    O = np.asarray(O, dtype=np.float64).reshape(-1, 3)
    D = np.asarray(D, dtype=np.float64).reshape(-1, 3)
    N = len(O)
    level = np.asarray(level, dtype=np.float64)
    level = level.ravel() if level.size == N else np.broadcast_to(level, (N,))
    ts = np.linspace(t0, t1, n)
    sgn = 1.0 if mode == 'enter' else -1.0
    hit = np.zeros(N, dtype=bool)
    idx = np.zeros(N, dtype=np.int64)
    for k in range(n):
        todo = ~hit
        if not todo.any():
            break
        f = fn(O[todo] + D[todo] * ts[k]) - level[todo]
        h = (f * sgn) < 0
        ii = np.nonzero(todo)[0][h]
        hit[ii] = True
        idx[ii] = k
    a = ts[np.maximum(idx - 1, 0)]
    b = ts[idx]
    for _ in range(iters):
        m = 0.5 * (a + b)
        f = fn(O + D * m[:, None]) - level
        ins = (f * sgn) < 0
        b = np.where(ins, m, b)
        a = np.where(ins, a, m)
    return 0.5 * (a + b), hit


# ------------------------------------------------------------------ charts

class LimbChart:
    """(a, s) -> surface; a = angle * R0 around the limb axis (0 = front,
    +R0*pi/2 = local +x), s = distance down the limb from its top joint."""

    def __init__(self, loft, fn, R0=0.05):
        self.loft, self.fn, self.R0 = loft, fn, R0

    def frame(self, a, s):
        a = np.asarray(a, dtype=np.float64)
        s = np.asarray(s, dtype=np.float64)
        lo = self.loft
        z = -s
        loc = np.stack([lo.prof('cx', z), lo.prof('cy', z), z], axis=-1)
        C = lo.origin + loc @ lo.R.T
        th = a / self.R0
        dl = np.stack([np.sin(th), -np.cos(th), np.zeros_like(th)], axis=-1)
        D = dl @ lo.R.T
        return C, D

    def lift(self, a, s, level, rmax=0.16):
        C, D = self.frame(a, s)
        sh = C.shape
        t, ok = ray_hit(self.fn, C, D, level, rmax, mode='exit')
        P = C.reshape(-1, 3) + D.reshape(-1, 3) * t[:, None]
        return P.reshape(sh), grad(self.fn, P).reshape(sh)

    def axis_dir(self):
        return -self.loft.R[:, 2]


class TorsoChart:
    """(a, z) -> torso hull; a = angle * R0 around the torso centre line
    (0 = front -Y, + towards +X).  Rays come from outside, so the surface
    bridges small concavities like a garment would."""

    def __init__(self, fn, torso, R0=0.12, rmax=0.30):
        self.fn, self.t, self.R0, self.rmax = fn, torso, R0, rmax

    def frame(self, a, z):
        a = np.asarray(a, dtype=np.float64)
        z = np.asarray(z, dtype=np.float64)
        C = np.stack([self.t.prof('cx', z), self.t.prof('cy', z), z], axis=-1)
        th = a / self.R0
        D = np.stack([np.sin(th), -np.cos(th), np.zeros_like(th)], axis=-1)
        return C, D

    def lift(self, a, z, level):
        C, D = self.frame(a, z)
        sh = C.shape
        C, D = C.reshape(-1, 3), D.reshape(-1, 3)
        t, ok = ray_hit(self.fn, C + D * self.rmax, -D, level, self.rmax, mode='enter')
        P = C + D * (self.rmax - t)[:, None]
        return P.reshape(sh), grad(self.fn, P).reshape(sh)


class FrontChart:
    """(x, z) -> first surface point seen from the front (rays along +Y),
    optionally along a tilted view direction."""

    def __init__(self, fn, y0=-0.40, depth=0.7, view=(0.0, 1.0, 0.0)):
        self.fn, self.y0, self.depth = fn, y0, depth
        self.view = nrm(view)

    def lift(self, x, z, level):
        x = np.asarray(x, dtype=np.float64)
        z = np.asarray(z, dtype=np.float64)
        sh = x.shape + (3,)
        O = np.stack([x.ravel(), np.full(x.size, self.y0), z.ravel()], axis=-1)
        O = O - self.view * 0.0
        D = np.broadcast_to(self.view, O.shape)
        t, ok = ray_hit(self.fn, O, D, level, self.depth, n=140, mode='enter')
        P = O + D * t[:, None]
        return P.reshape(sh), grad(self.fn, P).reshape(sh)


# ------------------------------------------------------------------ 2D regions

def resample(loop, h, closed=True):
    """Points along a polyline, spacing <= h, keeping the original vertices."""
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
    """Triangulate a 2D region (outer loop + hole loops) with near-equilateral
    triangles of size ~h whose boundary follows the loops exactly."""
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
    # remove duplicates
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
    T = T[np.abs(a) > 1e-14]
    T[a[np.abs(a) > 1e-14] < 0] = T[a[np.abs(a) > 1e-14] < 0][:, ::-1]
    used = np.unique(T)
    remap = np.full(len(P), -1)
    remap[used] = np.arange(len(used))
    return P[used], remap[T]


def grid_tris(nu, nv, closed_u=False):
    """Triangles of a (nv, nu) structured grid (row-major), CCW in (u, v)."""
    F = []
    for i in range(nv - 1):
        for j in range(nu if closed_u else nu - 1):
            j2 = (j + 1) % nu
            a, b = i * nu + j, i * nu + j2
            c, d = (i + 1) * nu + j2, (i + 1) * nu + j
            F.append((a, b, c))
            F.append((a, c, d))
    return np.array(F, dtype=np.int64)


# ------------------------------------------------------------------ shells

def orient(P, N, F):
    """Flip triangles so that their geometric normals agree with N."""
    F = np.asarray(F, dtype=np.int64)
    n = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    d = np.einsum('ij,ij->i', n, N[F].mean(axis=1))
    if np.sum(d < 0) > np.sum(d > 0):
        F = F[:, ::-1]
    return F


def boundary_edges(F):
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    key = np.sort(E, axis=1)
    _, inv, cnt = np.unique(key, axis=0, return_inverse=True, return_counts=True)
    return E[cnt[inv.ravel()] == 1]


def shell(P, N, F, t, t0=0.0):
    """Closed solid between P + N*t0 and P + N*(t0 + t) (t, t0 scalars or
    per-vertex).  F must be oriented along N.  Returns (V, faces)."""
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
    faces = [list(f) for f in F] + [list(f) for f in (F[:, ::-1] + n)] + \
            [list(r) for r in rim]
    return V, faces


def solid(parts, mat, bevel=0.0004, angle=40.0, outline_w=0.7, mats=None, normals=False,
          **kw):
    """MeshData from a list of (V, faces[, mat]) shells, flagged hard."""
    V, Fs, M, off = [], [], [], 0
    for p in parts:
        v, f = p[0], p[1]
        m = p[2] if len(p) > 2 else mat
        V.append(v)
        Fs += [[int(i) + off for i in face] for face in f]
        M += [m] * len(f)
        off += len(v)
    props = {'hard': True, 'bevel': bevel, 'bevel_seg': 2, 'sharp_angle': angle,
             'recalc': True}
    if bevel <= 0:
        props['bevel'] = 0.0
    props.update(kw.pop('props', {}))
    return MeshData(np.concatenate(V), Fs, mats=M, outline_w=outline_w, props=props, **kw)


# ------------------------------------------------------------------ lifting

def lift_region(chart, Q, F, level, t, t0=0.0, to_param=None):
    """Lift a 2D tessellation (Q, F) through ``to_param`` (Q -> chart (u, v))
    and extrude it.  ``level``, ``t`` and ``t0`` may be callables of the
    chart parameters (u, v)."""
    U = to_param(Q) if to_param else Q
    u, v = U[:, 0], U[:, 1]
    lev = level(u, v) if callable(level) else level
    P, N = chart.lift(u, v, lev)
    tt = t(u, v) if callable(t) else t
    t00 = t0(u, v) if callable(t0) else t0
    F = orient(P, N, F)
    return shell(P, N, F, tt, t00)


def path_map(path, closed=False):
    """Map strip coordinates (along, across) to 2D points of a polyline path
    (in chart parameter space).  Returns (fn, length)."""
    path = np.asarray(path, dtype=np.float64)
    seg = np.diff(path, axis=0)
    L = np.concatenate([[0], np.cumsum(np.linalg.norm(seg, axis=1))])
    tan = np.gradient(path, L, axis=0)
    tan = tan / np.linalg.norm(tan, axis=1, keepdims=True)
    side = np.stack([-tan[:, 1], tan[:, 0]], axis=1)

    def fn(Q):
        q = np.clip(Q[:, 0], 0, L[-1])
        p = np.stack([np.interp(q, L, path[:, 0]), np.interp(q, L, path[:, 1])], axis=1)
        sd = np.stack([np.interp(q, L, side[:, 0]), np.interp(q, L, side[:, 1])], axis=1)
        sd = sd / np.linalg.norm(sd, axis=1, keepdims=True)
        return p + sd * Q[:, 1:2]
    return fn, L[-1]


# ------------------------------------------------------------------ body subsets

_PART_NAMES = ['torso', 'breastR', 'breastL', 'neck', 'clavR', 'deltR', 'clavL', 'deltL',
               'gluteR', 'gluteL', 'legR', 'legL', 'armR', 'armL']


def body_subset(names):
    """SDF of a subset of the body primitives (same blend order and radii
    as the body), e.g. body_subset(['gluteL', 'legL'])."""
    import body as B
    from sdf import smin
    parts = B.body_sdf_parts()
    assert len(parts) == len(_PART_NAMES)
    sel = [parts[_PART_NAMES.index(n)] for n in names]

    def fn(P):
        d = None
        for prim, k in sel:
            e = prim(P)
            d = e if d is None else smin(d, e, k)
        return d
    return fn


# ------------------------------------------------------------------ structured tubes

def snap_cols(n, edges, closed=True, lo=0.0, hi=2 * np.pi):
    """n roughly uniform values in [lo, hi) that contain every value of
    ``edges`` exactly (nearest sample moved onto it)."""
    th = np.linspace(lo, hi, n, endpoint=not closed)
    for e in edges:
        e = lo + (e - lo) % (hi - lo) if closed else e
        i = int(np.argmin(np.abs(th - e)))
        th[i] = e
    return np.sort(th)


def rows(a, b, step, extra=()):
    """Increasing samples from a to b (spacing <= step) containing ``extra``."""
    pts = sorted(set([a, b] + [e for e in extra if a < e < b]))
    out = []
    for p, q in zip(pts[:-1], pts[1:]):
        k = max(1, int(np.ceil((q - p) / step)))
        out += list(np.linspace(p, q, k, endpoint=False))
    out.append(b)
    return np.array(out)


def tube(chart, th, ss, level, keep=None, closed=True):
    """Structured grid around a limb (columns = angles ``th`` in radians,
    rows = lengths ``ss``) lifted to ``level(th, s)``.  ``keep(thc, sc)``
    selects cells by their centre.  Returns (P, N, F) with F oriented."""
    T, Ss = np.meshgrid(th, ss)
    lev = level(T, Ss) if callable(level) else np.full(T.shape, level)
    P, N = chart.lift(T * chart.R0, Ss, lev)
    nv, nu = T.shape
    P, N = P.reshape(-1, 3), N.reshape(-1, 3)
    F = grid_tris(nu, nv, closed_u=closed)
    if keep is not None:
        ncol = nu if closed else nu - 1
        th2 = np.append(th, th[0] + 2 * np.pi) if closed else th
        tc = 0.5 * (th2[:-1] + th2[1:])[:ncol]
        sc = 0.5 * (ss[:-1] + ss[1:])
        TC, SC = np.meshgrid(tc, sc)
        k = np.asarray(keep(TC, SC), dtype=bool).ravel()
        F = F[np.repeat(k, 2)]
    F = orient(P, N, F)
    used = np.unique(F)
    remap = np.full(len(P), -1)
    remap[used] = np.arange(len(used))
    return P[used], N[used], remap[F]


def band_shell(chart, th, ss, level, t, keep=None, closed=True):
    P, N, F = tube(chart, th, ss, level, keep, closed)
    return shell(P, N, F, t)


def wrap_angle(th, c):
    """Angle difference th - c wrapped to (-pi, pi]."""
    return (th - c + np.pi) % (2 * np.pi) - np.pi


# ------------------------------------------------------------------ marching-cubes base surfaces

def project(fn, V, level, iters=4):
    """Move points onto fn == level (Newton steps along the gradient)."""
    V = np.asarray(V, dtype=np.float64).copy()
    for _ in range(iters):
        d = fn(V) - level
        V -= grad(fn, V) * d[:, None]
    return V


def _adjacency(F, n):
    import scipy.sparse as sp
    E = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    A = sp.coo_matrix((np.ones(len(E) * 2), (np.r_[E[:, 0], E[:, 1]], np.r_[E[:, 1], E[:, 0]])),
                      shape=(n, n)).tocsr()
    A.data[:] = 1.0
    return A


def relax(fn, V, F, level, iters=6, lam=0.5, fixed=None):
    """Tangential Laplacian smoothing with re-projection onto the surface."""
    A = _adjacency(F, len(V))
    deg = np.asarray(A.sum(axis=1)).ravel()
    deg[deg == 0] = 1
    for _ in range(iters):
        avg = (A @ V) / deg[:, None]
        d = avg - V
        N = grad(fn, V)
        d -= N * np.einsum('ij,ij->i', d, N)[:, None]
        if fixed is not None:
            d[fixed] = 0
        V = V + lam * d
        V = project(fn, V, level, 2)
    return V


def mc_surface(fn, level, lo, hi, h, smooth=6):
    """Iso-surface fn == level: marching cubes on a grid, then exact
    re-projection and relaxation (removes the grid noise).  Returns (V, F)
    with F oriented along the gradient."""
    from skimage.measure import marching_cubes
    lo = np.asarray(lo, dtype=np.float64) - 2 * h
    hi = np.asarray(hi, dtype=np.float64) + 2 * h
    shape = tuple(int(np.ceil(s)) + 1 for s in (hi - lo) / h)
    xs = [lo[i] + np.arange(shape[i]) * h for i in range(3)]
    D = np.empty(shape, dtype=np.float32)
    for k in range(shape[2]):
        X, Y = np.meshgrid(xs[0], xs[1], indexing='ij')
        P = np.stack([X, Y, np.full_like(X, xs[2][k])], axis=-1).reshape(-1, 3)
        D[:, :, k] = (fn(P) - level).reshape(shape[0], shape[1])
    V, F, _, _ = marching_cubes(D, 0.0, spacing=(h, h, h), allow_degenerate=False)
    V = V.astype(np.float64) + lo
    F = F.astype(np.int64)
    from meshutil import clean_mesh
    V, F = clean_mesh(V, F, weld=h * 0.05)
    V = project(fn, V, level)
    if smooth:
        V = relax(fn, V, F, level, smooth)
    N = grad(fn, V)
    F = orient(V, N, F)
    return V, F


def clip_region(fn, level, V, F, mask, max_edge=None):
    """Part of the surface (V, F) where mask(V) < 0, cut exactly along the
    mask's zero level, re-projected; returns (P, N, F) oriented."""
    from meshutil import clip_mesh
    m = mask(V)
    if not np.any(m < 0):
        return np.zeros((0, 3)), np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64)
    P, Fc = clip_mesh(V, F, m)
    P = project(fn, P, level, 2)
    N = grad(fn, P)
    Fc = orient(P, N, Fc)
    return P, N, Fc


def clip_shell(fn, level, V, F, mask, t, t0=0.0):
    P, N, Fc = clip_region(fn, level, V, F, mask)
    if len(Fc) == 0:
        return np.zeros((0, 3)), []
    return shell(P, N, Fc, t, t0)


def limb_coords(loft, P):
    """(theta, s) of points P around a limb loft (theta 0 = front, + local x)."""
    q = (np.asarray(P, dtype=np.float64) - loft.origin) @ loft.R
    z = q[..., 2]
    x = q[..., 0] - loft.prof('cx', z)
    y = q[..., 1] - loft.prof('cy', z)
    return np.arctan2(x, -y), -z


def periodic(th, knots):
    """Periodic linear interpolation of (angle_deg, value) knots at th (rad)."""
    k = sorted(knots)
    xs = np.array([a for a, _ in k], dtype=np.float64)
    ys = np.array([b for _, b in k], dtype=np.float64)
    xs = np.concatenate([xs - 360, xs, xs + 360])
    ys = np.concatenate([ys, ys, ys])
    d = np.degrees(np.asarray(th)) % 360.0
    return np.interp(d, xs, ys)


def smooth_periodic(v, k=5, it=2):
    for _ in range(it):
        v = sum(np.roll(v, i, axis=-1) for i in range(-k, k + 1)) / (2 * k + 1)
    return v


def torso_params_for_front(chart, xz, level, n=321, span=160.0, wrap_r=0.0):
    """Torso chart parameters (a, z) whose surface point is seen at front
    position (x, z); clamps to the silhouette when x is outside it, or, with
    ``wrap_r`` > 0, continues around the side (excess / wrap_r radians)."""
    xz = np.asarray(xz, dtype=np.float64)
    th = np.radians(np.linspace(-span, span, n))
    out = []
    for x, z in xz:
        P, N = chart.lift(th * chart.R0, np.full_like(th, z), level)
        cy = chart.t.prof('cy', z)
        front = P[:, 1] < cy
        i = np.nonzero(front)[0]
        j = i[np.argmin(np.abs(P[i, 0] - x))]
        tj = th[j]
        if wrap_r > 0:
            xs = P[i, 0]
            if x < xs.min() or x > xs.max():
                k = i[np.argmin(xs)] if x < xs.min() else i[np.argmax(xs)]
                exc = (xs.min() - x) if x < xs.min() else (x - xs.max())
                sg = np.sign(th[k]) if th[k] != 0 else (-1.0 if x < xs.min() else 1.0)
                out.append(((th[k] + sg * exc / wrap_r) * chart.R0, z))
                continue
        # refine between neighbours (x(theta) is locally monotonic)
        for k in (j - 1, j + 1):
            if 0 <= k < n and front[k]:
                x0, x1 = P[j, 0], P[k, 0]
                if (x0 - x) * (x1 - x) <= 0 and abs(x1 - x0) > 1e-12:
                    tj = th[j] + (th[k] - th[j]) * (x - x0) / (x1 - x0)
                    break
        out.append((tj * chart.R0, z))
    return np.array(out)


def clip_multi(fn, level, V, F, masks):
    """Like clip_region, but cuts with each smooth mask in turn (the region
    is the intersection of mask_i < 0).  Exact along every boundary, so a
    narrow band given as two masks (f - a, b - f) has clean straight rims
    instead of the saw teeth that |f - c| - w gives inside big triangles."""
    from meshutil import clip_mesh
    P, Fc = np.asarray(V, dtype=np.float64), np.asarray(F, dtype=np.int64)
    for m in masks:
        if len(Fc) == 0:
            break
        vals = m(P)
        if not np.any(vals < 0):
            return np.zeros((0, 3)), np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64)
        P, Fc = clip_mesh(P, Fc, vals)
    if len(Fc) == 0:
        return np.zeros((0, 3)), np.zeros((0, 3)), np.zeros((0, 3), dtype=np.int64)
    P = project(fn, P, level, 3)
    N = grad(fn, P)
    Fc = orient(P, N, Fc)
    return P, N, Fc


def clip_multi_shell(fn, level, V, F, masks, t, t0=0.0):
    P, N, Fc = clip_multi(fn, level, V, F, masks)
    if len(Fc) == 0:
        return np.zeros((0, 3)), []
    return shell(P, N, Fc, t, t0)


def ribbon(fn, pts, level, width, t, step=0.002):
    """Flat strip of ``width`` lying on fn == level along a 3D polyline
    (resampled and projected), extruded by ``t``.  Returns a shell."""
    pts = resample(np.asarray(pts, dtype=np.float64), step, closed=False)
    pts = project(fn, pts, level, 4)
    N = grad(fn, pts)
    tan = np.gradient(pts, axis=0)
    side = nrm(np.cross(N, tan))
    n = len(pts)
    P = np.concatenate([pts - side * width / 2, pts + side * width / 2])
    P = project(fn, P, level, 3)
    NN = grad(fn, P)
    F = []
    for i in range(n - 1):
        F += [(i, i + 1, n + i + 1), (i, n + i + 1, n + i)]
    F = orient(P, NN, np.array(F))
    return shell(P, NN, F, t)

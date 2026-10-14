"""The long open coat (no sleeves: those live in outfit.sleeves).

Pieces (all object names start with ``Coat`` so the rig gives them the
coat weights, except the collar which follows the chest):

* ``Coat``        cropped jacket: shoulders, chest panels, upper back,
                  cut at the lower ribs on the sides / back, narrow front
                  panels falling to the belt.  White outside, red lining
                  inside, red turned-out facing along the front opening.
* ``CoatLapels``  notched lapels folded back over the chest (red fold
                  edge), ``CoatCollar`` tall stand collar behind the
                  goggles.
* ``CoatSkirt``   long skirt hanging from the belt line: wide flared panel
                  on her right (lining shows from the front, notched hem at
                  mid calf), panel on her left, centre back vent, designed
                  vertical folds, black back graphic (chevron, vent trims).
* ``CoatTail``    long narrow white tail on her left ending in a curved
                  blade-like point at ankle level.
* ``CoatStraps``  red cross straps over the vent (X lattice), red tags.
* ``CoatHarness`` black harness block with a ladder of short straps at the
                  back of the belt.
* ``CoatSnaps``   two black snap buttons, ``CoatTab`` white tab on her left
                  lapel.

Everything cloth-like is an open sheet; Blender gives it thickness with a
Solidify modifier (hard rims, lining on the inner shell).
build() -> {name: MeshData}
"""

import numpy as np

from sdf import Grid
from meshutil import MeshData, polygon_sd, clip_mesh, clean_mesh, catmull
from rig import J, S, PX0, PY0
import body as B
import hardsurf as HS
from outfit import sstep, _TORSO, PCX, PCY


# ------------------------------------------------------------ camera helpers

# reference camera (scene.ref_camera): perspective, 5 m in front
CAM_X = (367.5 - PX0) * S
CAM_Y = -5.0
CAM_Z = 1.0
CENTRE_Z = (PY0 - 515) * S


def project(P):
    """Model points -> reference image pixels (x_px, y_px)."""
    P = np.asarray(P, dtype=np.float64)
    d = (P[..., 1] - CAM_Y) / 5.0
    u = 367.5 + (P[..., 0] - CAM_X) / d / S
    v = 515.0 - ((P[..., 2] - CAM_Z) / d - (CENTRE_Z - CAM_Z)) / S
    return np.stack([u, v], axis=-1)


def unproject(xp, yp, depth):
    """Reference pixel + depth (model Y) -> model point."""
    d = (depth - CAM_Y) / 5.0
    x = CAM_X + (xp - 367.5) * S * d
    z = CAM_Z + ((515.0 - yp) * S + (CENTRE_Z - CAM_Z)) * d
    return np.array([x, depth, z])


def tri_normals(V, F):
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def orient_outward(V, F, centre_fn):
    """Orient a consistently wound sheet so that, on the whole, its normals
    point away from centre_fn(P) (flips all triangles or none: per-face
    flips break the winding where the surface turns sideways)."""
    F = np.asarray(F)
    n = tri_normals(V, F)
    c = V[F].mean(axis=1)
    out = c - centre_fn(c)
    a = np.linalg.norm(np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]), axis=1)
    if np.sum(np.sum(n * out, axis=1) * a) < 0:
        F = F[:, ::-1].copy()
    return F


def grid_tris(nu, nv):
    """Triangles of a (nu, nv) vertex grid (index = i * nv + j)."""
    i, j = np.meshgrid(np.arange(nu - 1), np.arange(nv - 1), indexing='ij')
    a = (i * nv + j).ravel()
    b = ((i + 1) * nv + j).ravel()
    c = ((i + 1) * nv + j + 1).ravel()
    d = (i * nv + j + 1).ravel()
    return np.concatenate([np.stack([a, b, c], 1), np.stack([a, c, d], 1)])


def cloth(V, F, mats, t=0.004, shell='lining', decimate=0, **kw):
    """Open sheet -> MeshData with Solidify (white side out, lining in)."""
    props = {'solidify': t, 'shell_mat': shell, 'solid_offset': 0.0}
    props.update(kw.pop('props', {}))
    return MeshData(V, np.asarray(F), mats=list(mats), decimate=decimate,
                    props=props, **kw)


# ------------------------------------------------------------ jacket

COAT_OFF = 0.0095          # jacket mid-surface offset from the skin
COAT_T = 0.0040            # cloth thickness (Solidify)
HEM_Z = 1.190              # cropped hem at the sides / back (lower ribs)
STRIP_Z = 1.030            # front panels fall to below the belt
DRAPE_K = 0.06             # drape: recedes 0.6 mm per cm below the bust

# front opening, traced on the reference (fold line of the lapels / front
# edges), top to bottom.  Her right is on the viewer's left.
OPEN_R = [(322, 192), (316, 199), (305, 211), (295, 225), (289, 240),
          (285, 262), (283, 300), (282, 340), (281, 380), (280, 420)]
OPEN_L = [(348, 196), (349, 203), (356, 216), (363, 231), (370, 246),
          (375, 262), (377, 300), (378, 340), (379, 380), (380, 420)]
# outer edges of the narrow front panels below the bust
STRIP_R_DEG = 26.0        # her right panel is hidden by the arm: fixed width
STRIP_L_OUT = [(399, 250), (401, 300), (402, 340), (403, 380), (404, 420)]


def torso_axis(z):
    z = np.clip(z, 0.93, 1.40)
    return _TORSO.prof('cx', z), _TORSO.prof('cy', z)


def torso_angle(P):
    """Degrees around the torso axis: 0 front, +90 her left, -90 her right."""
    cx, cy = torso_axis(P[..., 2])
    return np.degrees(np.arctan2(P[..., 0] - cx, -(P[..., 1] - cy)))


def torso_r(P):
    cx, cy = torso_axis(P[..., 2])
    return np.hypot(P[..., 0] - cx, P[..., 1] - cy)


def torso_front_y(P):
    """Signed distance in front of the torso's frontal plane (rotated
    torso frame); negative = in front."""
    z = np.clip(P[..., 2], 0.93, 1.40)
    cx, cy = _TORSO.prof('cx', z), _TORSO.prof('cy', z)
    r = np.radians(_TORSO.prof('rot', z))
    return -(P[..., 0] - cx) * np.sin(r) + (P[..., 1] - cy) * np.cos(r)


def neck_axis_r(P):
    nb, nt = J['neck_base'], J['neck_top']
    a = (nt - nb) / np.linalg.norm(nt - nb)
    q = P - nb
    t = q @ a
    return np.linalg.norm(q - t[..., None] * a, axis=-1)


def arm_cut(side, s0, r_hole=0.056, r_side=0.037):
    """> 0 inside the sleeve region of an arm: beyond the armhole plane and
    near the arm axis (wide at the armhole, sleeve-tight further down so
    the jacket side panels meet the sleeve)."""
    sh, el = J['shoulder_' + side], J['elbow_' + side]
    ax = (el - sh) / np.linalg.norm(el - sh)
    p0 = sh + ax * s0

    def m(P):
        q = P - p0
        t = q @ ax
        r = np.linalg.norm(q - t[..., None] * ax, axis=-1)
        # armhole: a clean ring cut between two planes; further down the
        # jacket side simply tucks under the sleeve (no grazing cut)
        return np.minimum.reduce([t, r_hole - r, 0.065 - t])
    return m


_JACKET_GRID = None


def jacket_grid():
    """Field of the jacket mid-surface (level 0): body offset; the cloth
    falls (almost) straight down from the bust, chest sides and blades."""
    global _JACKET_GRID
    if _JACKET_GRID is not None:
        return _JACKET_GRID
    lo, hi = [-0.20, -0.19, 0.99], [0.23, 0.14, 1.47]
    g = Grid(lo, hi, 0.0018)
    g.union(B.torso(), 0.0)
    for b in B.breasts():
        g.union(b, 0.02)
    D = g.d
    step = np.float32(DRAPE_K * g.h)
    for k in range(D.shape[2] - 2, -1, -1):
        np.minimum(D[:, :, k], D[:, :, k + 1] + step, out=D[:, :, k])
    for p in B.shoulders():
        g.union(p, 0.03)
    from scipy.ndimage import gaussian_filter
    g.d = gaussian_filter(g.d, 1.2).astype(np.float32) - np.float32(COAT_OFF)
    _JACKET_GRID = g
    return g


def ray_hit(g, xp, yp, level=0.0):
    """First crossing of the grid field along the reference camera ray
    through pixel (xp, yp); None if it misses."""
    cam = np.array([CAM_X, CAM_Y, CAM_Z])
    tgt = unproject(xp, yp, 0.0)
    d = (tgt - cam) / np.linalg.norm(tgt - cam)
    t = np.arange(4.55, 5.30, 0.0004)
    P = cam + t[:, None] * d
    lo = g.lo + g.h
    hi = g.lo + (np.array(g.shape) - 2) * g.h
    ok = np.all((P > lo) & (P < hi), axis=1)
    s = np.where(ok, g.sample(P) - level, 1.0)
    i = np.argmax(s < 0)
    if s[i] >= 0 or i == 0:
        return None
    w = s[i - 1] / (s[i - 1] - s[i])
    return P[i - 1] + (P[i] - P[i - 1]) * w


def resample_px(poly, step=1.0):
    p = np.asarray(poly, dtype=np.float64)
    L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])
    s = np.arange(0, L[-1] + 1e-9, step)
    return np.stack([np.interp(s, L, p[:, 0]), np.interp(s, L, p[:, 1])], 1)


def edge_angle(g, poly, smooth=4):
    """theta(z) of an edge traced on the reference, measured on the jacket
    surface.  Returns a function of z (clamped outside the samples)."""
    pts = []
    for xp, yp in resample_px(poly, 1.0):
        P = ray_hit(g, xp, yp)
        if P is not None:
            pts.append(P)
    P = np.array(pts)
    th = torso_angle(P)
    z = P[:, 2]
    o = np.argsort(z)
    z, th = z[o], th[o]
    zz = np.linspace(z[0], z[-1], 200)
    tt = np.interp(zz, z, th)
    k = np.ones(2 * smooth + 1) / (2 * smooth + 1)
    tt = np.convolve(np.pad(tt, smooth, mode='edge'), k, mode='valid')
    return lambda zq: np.interp(zq, zz, tt)


_EDGES = None


def jacket_edges():
    global _EDGES
    if _EDGES is None:
        g = jacket_grid()
        eR = edge_angle(g, OPEN_R)
        _EDGES = {'R': eR, 'L': edge_angle(g, OPEN_L),
                  'R2': lambda z: eR(z) - STRIP_R_DEG, 'L2': edge_angle(g, STRIP_L_OUT)}
    return _EDGES


def deg2m(P):
    return np.radians(1.0) * np.maximum(torso_r(P), 0.03)


def jacket_keep(P):
    """< 0 where the jacket exists (continuous field, metres)."""
    E = jacket_edges()
    z = P[..., 2]
    th = torso_angle(P)
    k = deg2m(P)
    neck = 0.052 - neck_axis_r(P) - np.maximum(0.0, 1.37 - z) * 3.0
    opening = np.minimum(E['L'](z) - th, th - E['R'](z)) * k
    arms = np.maximum(arm_cut('R', 0.010)(P), arm_cut('L', 0.012)(P))
    sl = np.maximum(E['L'](z) - th, th - E['L2'](z)) * k
    sr = np.maximum(E['R2'](z) - th, th - E['R'](z)) * k
    strip = np.minimum(sl, sr)
    hem = np.minimum(HEM_Z - z, np.maximum(strip, STRIP_Z - z))
    return np.maximum.reduce([neck, opening, arms, hem])


FACING_W = 0.0050          # visible red facing along the front edges


def jacket():
    g = jacket_grid()
    E = jacket_edges()
    v, f = g.mesh(0.0)
    v, f = clip_mesh(v, f, jacket_keep(v))
    v, f = largest_components(v, f, min_frac=0.02)
    v = relax(v, f, 6)
    f = orient_outward(v, f, jacket_centre)
    # turned-out red facing along the front opening: its own object that
    # tucks under the white edge (the white part gets decimated)
    th = torso_angle(v)
    k = deg2m(v)
    z = v[:, 2]
    dist = np.where(th > 0, th - E['L'](z), E['R'](z) - th) * k   # >= 0
    front = np.abs(th) < 100
    vw, fw = clip_mesh(v, f, np.where(front, FACING_W - dist, -1.0))
    vr, fr = clip_mesh(v, f, np.where(front, dist - FACING_W - 0.002, 1.0))
    vr = vr - vertex_normals(vr, fr) * 0.0010
    return {'Coat': cloth(vw, fw, ['coat'] * len(fw), COAT_T, decimate=22000),
            'CoatFacing': cloth(vr, fr, ['lining'] * len(fr), COAT_T, outline_w=0.6)}


def relax(V, F, iters=6, lam=0.5):
    """Taubin smoothing of interior vertices (removes marching-cubes creases
    that make the Solidify inner shell poke through); boundary vertices
    stay where the masks cut them."""
    from scipy.sparse import coo_matrix
    n = len(V)
    e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    es = np.sort(e, axis=1)
    ue, cnt = np.unique(es, axis=0, return_counts=True)
    bnd = np.zeros(n, bool)
    bnd[ue[cnt == 1].ravel()] = True
    A = coo_matrix((np.ones(len(ue) * 2), (np.r_[ue[:, 0], ue[:, 1]], np.r_[ue[:, 1], ue[:, 0]])),
                   shape=(n, n)).tocsr()
    deg = np.asarray(A.sum(axis=1)).ravel()
    V = V.copy()
    for _ in range(iters):
        for f in (lam, -0.53):
            L = A @ V / np.maximum(deg, 1)[:, None] - V
            V[~bnd] += f * L[~bnd]
    return V


def vertex_normals(V, F):
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    vn = np.zeros_like(V)
    for k in range(3):
        np.add.at(vn, F[:, k], n)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


def jacket_centre(P):
    z = np.clip(P[..., 2], 0.93, 1.40)
    c = np.stack([_TORSO.prof('cx', z), _TORSO.prof('cy', z), P[..., 2]], axis=-1)
    # shoulders: centre towards the shoulder joints
    for s in ('R', 'L'):
        sh = J['shoulder_' + s]
        near = np.linalg.norm(P - sh, axis=-1) < 0.07
        c = np.where(near[..., None], sh - np.array([0, 0, 0.02]), c)
    return c


def largest_components(V, F, min_frac=0.02):
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import connected_components
    n = len(V)
    e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    A = coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n))
    nc, lab = connected_components(A, directed=False)
    flab = lab[F[:, 0]]
    cnt = np.bincount(flab, minlength=nc)
    keep = cnt[flab] >= cnt.max() * min_frac
    return clean_mesh(V, F[keep])


# ------------------------------------------------------------ lapels

LAPEL_LIFT = 0.0042        # lapel mid-surface above the jacket mid-surface
LAPEL_T = 0.0032
LAPEL_RED_PX = 2.4         # red fold edge seen along the inner edge
# notched lapels traced on the reference (px).  The first points form the
# inner (fold) edge, slightly over the jacket opening.
LAPEL_L = [(371, 249), (362, 232), (355, 217), (347.5, 203.5), (370, 191.5),
           (377, 198), (388, 194.5), (394, 206), (392, 221), (383, 236)]
LAPEL_L_FOLD = 4           # number of fold-edge points at the start
LAPEL_R = [(289.5, 241.5), (294, 225), (304, 210.5), (316, 198.5), (322, 191.5),
           (311, 188), (306, 193.5), (298, 191.5), (293, 201), (290.5, 214), (290.5, 229)]
LAPEL_R_FOLD = 5


def ray_hits(g, xy, level=0.0, t0=4.78, t1=5.06, dt=0.0004):
    """Vectorised ray_hit for many pixels -> (P (N,3), ok (N,))."""
    cam = np.array([CAM_X, CAM_Y, CAM_Z])
    xy = np.asarray(xy, dtype=np.float64)
    out = np.zeros((len(xy), 3))
    ok = np.zeros(len(xy), bool)
    t = np.arange(t0, t1, dt)
    lo = g.lo + g.h
    hi = g.lo + (np.array(g.shape) - 2) * g.h
    for c0 in range(0, len(xy), 800):
        q = xy[c0:c0 + 800]
        tg = np.stack([unproject(a, b, 0.0) for a, b in q])
        d = tg - cam
        d /= np.linalg.norm(d, axis=1, keepdims=True)
        P = cam + t[None, :, None] * d[:, None, :]
        inb = np.all((P > lo) & (P < hi), axis=2)
        s = np.where(inb, g.sample(P.reshape(-1, 3)).reshape(P.shape[:2]) - level, 1.0)
        neg = s < 0
        i = np.argmax(neg, axis=1)
        good = neg[np.arange(len(q)), i] & (i > 0)
        i = np.maximum(i, 1)
        r = np.arange(len(q))
        s0, s1 = s[r, i - 1], s[r, i]
        w = s0 / np.where(np.abs(s0 - s1) > 1e-12, s0 - s1, 1.0)
        Pi = P[r, i - 1] + (P[r, i] - P[r, i - 1]) * w[:, None]
        out[c0:c0 + 800] = Pi
        ok[c0:c0 + 800] = good
    return out, ok


def dist_to_polyline(x, y, line):
    line = np.asarray(line, dtype=np.float64)
    d = np.full(np.shape(x), np.inf)
    for (ax, ay), (bx, by) in zip(line[:-1], line[1:]):
        ex, ey = bx - ax, by - ay
        t = np.clip(((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey), 0, 1)
        d = np.minimum(d, np.hypot(x - ax - ex * t, y - ay - ey * t))
    return d


def px_sheet(g, poly, level, step=0.8, pad=2.0):
    """Sheet over a polygon traced on the reference, laid on the iso-surface
    `level` of grid g (as seen by the reference camera).  Returns (V, F,
    xy) clipped exactly along the polygon."""
    poly = np.asarray(poly, dtype=np.float64)
    x0, y0 = poly.min(axis=0) - pad
    x1, y1 = poly.max(axis=0) + pad
    xs = np.arange(x0, x1 + step, step)
    ys = np.arange(y0, y1 + step, step)
    X, Y = np.meshgrid(xs, ys, indexing='ij')
    xy = np.stack([X.ravel(), Y.ravel()], 1)
    P, ok = ray_hits(g, xy, level)
    F = grid_tris(len(xs), len(ys))
    F = F[ok[F].all(axis=1)]
    e = np.max([np.linalg.norm(P[F[:, i]] - P[F[:, (i + 1) % 3]], axis=1) for i in range(3)], axis=0)
    F = F[e < 0.012]
    sd = polygon_sd(xy[:, 0], xy[:, 1], poly)
    # clip in pixel space, carrying the 3D positions along
    V5 = np.concatenate([P, xy], axis=1)
    V5c, Fc = clip_vec(V5, F, sd)
    return V5c[:, :3], Fc, V5c[:, 3:]


def clip_vec(V, F, s):
    """clip_mesh for vertices with extra columns (linear interpolation)."""
    V = np.asarray(V, dtype=np.float64)
    F = np.asarray(F, dtype=np.int64)
    s = np.where(np.abs(s) < 1e-6, np.where(s < 0, -1e-6, 1e-6), s)
    inside = s < 0
    k = inside[F].sum(axis=1)
    keep = F[k == 3]
    cross = (k == 1) | (k == 2)
    Fc, kc = F[cross], k[cross]
    ins = inside[Fc]
    odd = np.where((kc == 1)[:, None], ins, ~ins)
    r = np.argmax(odd, axis=1)
    idx = (r[:, None] + np.arange(3)[None, :]) % 3
    T = np.take_along_axis(Fc, idx, axis=1)
    a, b, c = T[:, 0], T[:, 1], T[:, 2]
    e = np.concatenate([np.stack([a, b], 1), np.stack([a, c], 1)])
    ue, inv = np.unique(np.sort(e, axis=1), axis=0, return_inverse=True)
    inv = inv.ravel()
    i, j = ue[:, 0], ue[:, 1]
    t = s[i] / (s[i] - s[j])
    newV = V[i] + (V[j] - V[i]) * t[:, None]
    base = len(V)
    pab, pac = base + inv[:len(a)], base + inv[len(a):]
    one = kc == 1
    Fo = np.concatenate([keep, np.stack([a[one], pab[one], pac[one]], 1),
                         np.stack([pab[~one], b[~one], c[~one]], 1),
                         np.stack([pab[~one], c[~one], pac[~one]], 1)])
    Vo = np.concatenate([V, newV])
    used = np.unique(Fo)
    remap = np.full(len(Vo), -1)
    remap[used] = np.arange(len(used))
    return Vo[used], remap[Fo]


def split_vec(V, F, s):
    """Split along s = 0 -> (V, F, side) with shared cut vertices."""
    Va, Fa = clip_vec(V, F, s)
    Vb, Fb = clip_vec(V, F, -np.asarray(s))
    Vm = np.concatenate([Va, Vb])
    Fm = np.concatenate([Fa, Fb + len(Va)])
    side = np.concatenate([np.ones(len(Fa), bool), np.zeros(len(Fb), bool)])
    key = np.round(Vm[:, :3] / 1e-6).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    return Vm[first], inv.ravel()[Fm], side


def lapels():
    g = jacket_grid()
    out_w, out_r = [], []
    for poly, nfold in ((LAPEL_L, LAPEL_L_FOLD), (LAPEL_R, LAPEL_R_FOLD)):
        V, F, xy = px_sheet(g, poly, LAPEL_LIFT)
        F = orient_outward(V, F, jacket_centre)
        d = dist_to_polyline(xy[:, 0], xy[:, 1], poly[:nfold])
        V5, F5, red = split_vec(np.concatenate([V, xy], 1), F, d - LAPEL_RED_PX)
        out_w.append((V5[:, :3], F5[~red]))
        out_r.append((V5[:, :3], F5[red]))

    def pack(parts, mat):
        Vs, Fs, off = [], [], 0
        for V, F in parts:
            used = np.unique(F)
            rm = np.full(len(V), -1)
            rm[used] = np.arange(len(used))
            Vs.append(V[used])
            Fs.append(rm[F] + off)
            off += len(used)
        V, F = np.concatenate(Vs), np.concatenate(Fs)
        return cloth(V, F, [mat] * len(F), LAPEL_T, outline_w=0.8)
    return {'CoatLapels': pack(out_w, 'coat'), 'CoatLapelEdge': pack(out_r, 'lining')}


# ------------------------------------------------------------ stand collar

def collar():
    nb, nt = J['neck_base'], J['neck_top']
    ax = (nt - nb) / np.linalg.norm(nt - nb)
    c0 = nb + np.array([0.0, 0.006, 0.0])
    th = np.radians(np.linspace(-180, 180, 145))
    zs = np.linspace(1.355, 1.49, 34)
    T, Z = np.meshgrid(th, zs, indexing='ij')
    R = 0.0535 + np.maximum(Z - 1.40, 0) * 0.10
    t = (Z - c0[2]) / ax[2]
    base = c0[None, None, :] + t[..., None] * ax[None, None, :]
    P = base + np.stack([R * np.sin(T), -R * np.cos(T), np.zeros_like(T)], -1)
    P[..., 2] = Z
    V = P.reshape(-1, 3)
    F = grid_tris(*T.shape)
    thd = np.degrees(T).ravel()
    z = V[:, 2]
    a = np.abs(thd)
    # front ends slant back as they rise; top higher at the back
    end = 46.0 + np.clip((z - 1.385) / 0.055, 0, 1) * 24.0
    top = 1.437 + 0.034 * sstep(a, 70, 165)
    m = np.maximum.reduce([(end - a) * np.radians(1) * 0.054, z - top, 1.360 - z])
    V, F = clip_mesh(V, F, m)
    F = orient_outward(V, F, lambda Q: c0 + ((Q[:, 2] - c0[2]) / ax[2])[:, None] * ax)
    return {'CoatCollar': cloth(V, F, ['coat'] * len(F), 0.0042, outline_w=0.9)}


# ------------------------------------------------------------ snaps & tab

def snaps_and_tab():
    g = jacket_grid()
    snaps = []
    for xp, yp in ((360.5, 203.0), (365.5, 210.0)):
        P, ok = ray_hits(g, [(xp, yp)], LAPEL_LIFT + LAPEL_T / 2)
        if not ok[0]:
            continue
        c = P[0]
        n = jacket_normal(g, c)
        R = HS.frame_from(z=n, x=np.cross([0, 0, 1.0], n))
        prof = [(0.0, 0.0), (0.0036, 0.0), (0.0036, 0.0010), (0.0031, 0.0019),
                (0.0017, 0.0021), (0.0012, 0.0015), (0.0, 0.0014)]
        snaps.append(HS.lathe(prof, 20, c, R))
    out = {'CoatSnaps': HS.hard_mesh(snaps, 'black', bevel=0.0003, angle=35)}
    # white throat tab: from under the left lapel towards her right shoulder
    a = np.array([352.0, 205.0])
    b = np.array([325.0, 194.5])
    gb = body_grid_fine()
    L = 9
    pts = []
    for k in range(L):
        q = a + (b - a) * k / (L - 1)
        P, ok = ray_hits(gb, [tuple(q)], 0.0045)
        pts.append(P[0])
    pts = np.array(pts)
    pts[0] += jacket_normal(gb, pts[0]) * 0.0015
    w = 0.0105
    nrm = np.array([jacket_normal(gb, p) for p in pts])
    prof = HS.rounded_rect(w, 0.0022, 0.0009, seg=2)
    path, _ = catmull(pts, 14)
    up = np.array([jacket_normal(gb, p) for p in path])
    V, Fq = HS.sweep(prof, path, up)
    # rounded free end: shorten the cap by a disc
    end = HS.cylinder(w / 2, 0.0022, 16, path[-1], HS.frame_from(z=up[-1], x=path[-1] - path[-2]))
    out['CoatTab'] = HS.hard_mesh([(V, Fq), end], 'coat', bevel=0.0004, angle=35,
                                  outline_w=0.6)
    return out


_BODY_FINE = None


def body_grid_fine():
    global _BODY_FINE
    if _BODY_FINE is None:
        g = Grid([-0.07, -0.13, 1.33], [0.09, 0.06, 1.45], 0.0012)
        for prim, k in B.body_sdf_parts()[:12]:
            g.union(prim, k)
        _BODY_FINE = g
    return _BODY_FINE


def jacket_normal(g, p, eps=0.0015):
    e = np.eye(3) * eps
    n = np.array([g.sample((p + e[i])[None])[0] - g.sample((p - e[i])[None])[0]
                  for i in range(3)])
    return n / np.linalg.norm(n)


# ------------------------------------------------------------ skirt

SK_NU, SK_NV = 200, 76
SK_T = 0.0038
TOP_R = (-80.0, 52.0)      # belt-line angles of the front edges (her R, L)
VENT_U = 0.5               # centre back vent (theta ~ 177 deg)

# hem knots over u (0 = her right front edge, 0.5 = vent, 1 = her left
# front edge): theta (deg, continuous), radius from the pelvis axis, z
HEM_KN = np.array([
    # u      theta    r      z
    [0.00, -105.0, 0.250, 0.300],
    [0.12, -123.0, 0.236, 0.352],
    [0.25, -143.0, 0.216, 0.410],
    [0.38, -163.0, 0.200, 0.465],
    [0.47, -178.0, 0.192, 0.500],
    [0.53, -187.0, 0.192, 0.545],
    [0.62, -201.0, 0.202, 0.545],
    [0.75, -220.0, 0.218, 0.535],
    [0.88, -241.0, 0.268, 0.512],
    [1.00, -260.0, 0.390, 0.394]])
# front edges: (z, theta, r) from the hip down to the hem
EDGE_R = np.array([[0.300, -105.0, 0.250], [0.500, -103.0, 0.226],
                   [0.700, -100.0, 0.204], [0.860, -97.0, 0.186]])
EDGE_L = np.array([[0.394, 100.0, 0.390], [0.520, 97.0, 0.318],
                   [0.640, 94.0, 0.268], [0.800, 89.0, 0.212], [0.920, 80.0, 0.175]])
EDGE_L[:, 1] -= 360.0      # same continuous angle range as the u parameter


def pelvis_xy(theta_deg, r):
    t = np.radians(theta_deg)
    return PCX + r * np.sin(t), PCY - r * np.cos(t)


def body_extent(theta_deg, z, clearance=0.0):
    """Radius (from the pelvis axis) of the outermost body point (+legs)
    along direction theta at height z."""
    from outfit import body_fn
    th = np.atleast_1d(theta_deg).astype(np.float64)
    rs = np.linspace(0.40, 0.0, 401)
    T, Rr = np.meshgrid(th, rs, indexing='ij')
    x, y = pelvis_xy(T, Rr)
    P = np.stack([x, y, np.full_like(x, z)], -1)
    d = body_fn(P.reshape(-1, 3)).reshape(T.shape) - clearance
    hit = d < 0
    i = np.argmax(hit, axis=1)
    r = np.where(hit.any(axis=1), rs[i], 0.0)
    return r


def interp_u(u, col):
    return np.interp(u, HEM_KN[:, 0], HEM_KN[:, col])


def skirt_params():
    u = np.linspace(0, 1, SK_NU)
    v = np.linspace(0, 1, SK_NV)
    # top (belt line)
    th_t = TOP_R[0] - u * (360.0 - (TOP_R[1] - TOP_R[0]))
    from outfit import belt_z
    x0, _ = pelvis_xy(th_t, 0.13)
    z_t = belt_z(x0) + 0.006
    rb = np.array([body_extent(t, z - 0.015)[0] for t, z in zip(th_t, z_t)])
    r_t = rb + 0.016                  # snug at the belt, push_out clears the hips
    x_t, _ = pelvis_xy(th_t, r_t)
    z_t = belt_z(x_t) + 0.006
    th_h, r_h, z_h = interp_u(u, 1), interp_u(u, 2), interp_u(u, 3)
    U, Vv = np.meshgrid(u, v, indexing='ij')
    # vertical profile: hug the hip for the first part, then flare
    f = Vv ** 1.15
    TH = th_t[:, None] * (1 - f) + th_h[:, None] * f
    R = r_t[:, None] * (1 - f) + r_h[:, None] * f
    Z = z_t[:, None] * (1 - Vv) + z_h[:, None] * Vv
    # Coons-like correction along both front edges
    for edge, uu, sgn in ((EDGE_R, 0, 1), (EDGE_L, -1, -1)):
        ze = Z[uu]
        th_e = np.interp(ze, edge[:, 0], edge[:, 1])
        r_e = np.interp(ze, edge[:, 0], edge[:, 2])
        top_band = sstep(ze, edge[-1, 0], z_t[uu])      # 1 above the edge knots
        th_e = th_e * (1 - top_band) + TH[uu] * top_band
        r_e = r_e * (1 - top_band) + R[uu] * top_band
        dth, dr = th_e - TH[uu], r_e - R[uu]
        w = np.clip(1 - (U if sgn > 0 else 1 - U) / 0.32, 0, 1) ** 2
        TH = TH + w * dth[None, :]
        R = R + w * dr[None, :]
    return U, Vv, TH, R, Z


def fold_field(U, Vv):
    """Radial displacement: 4 folds on her right panel, 4 on the left,
    rounded ridges, sharp V valleys, growing towards the hem."""
    d = np.zeros_like(U)
    for u0, u1, n, amp in ((0.02, 0.45, 4, 0.030), (0.55, 0.98, 5, 0.030)):
        ph = (U - u0) / (u1 - u0)
        inside = (ph > 0) & (ph < 1)
        prof = np.abs(np.sin(np.pi * n * ph)) - 0.62
        fade = np.sin(np.pi * np.clip(ph, 0, 1)) ** 0.5
        A = amp * np.clip((Vv - 0.06) / 0.94, 0, 1) ** 1.25
        d += np.where(inside, prof * A * fade, 0.0)
    return d


def skirt_surface():
    U, Vv, TH, R, Z = skirt_params()
    R = R + fold_field(U, Vv)
    x, y = pelvis_xy(TH, R)
    P = np.stack([x, y, Z], -1)
    P = push_out(P)
    return U, Vv, P


def push_out(P, iters=6):
    """Keep the skirt outside the body, legs and leg armour."""
    from outfit import body_fn
    sh = P.shape
    Q = P.reshape(-1, 3).copy()
    for _ in range(iters):
        d = body_fn(Q)
        clear = np.where(Q[:, 0] > 0.02, 0.022, 0.012)       # armour on her left leg
        bad = d < clear
        if not bad.any():
            break
        dx, dy = Q[:, 0] - PCX, Q[:, 1] - PCY
        n = np.hypot(dx, dy) + 1e-9
        step = np.where(bad, clear - d, 0.0) * 1.1
        Q[:, 0] += dx / n * step
        Q[:, 1] += dy / n * step
    return Q.reshape(sh)


def vent_half(Vv, Z):
    """Half width of the centre back vent in u units."""
    w = 0.018 + 0.074 * sstep(0.835 - Z, 0.0, 0.21)
    return np.where(Z < 0.835, w, -1.0)


NOTCHES = [(0.085, 0.022, 0.06), (0.20, 0.018, 0.05), (0.33, 0.02, 0.06),
           (0.66, 0.02, 0.06), (0.80, 0.018, 0.05), (0.93, 0.02, 0.05)]


def skirt_keep(U, Vv, Z):
    """< 0 where the skirt exists (param space, u units)."""
    vent = vent_half(Vv, Z) - np.abs(U - VENT_U)
    # ragged hem: V notches cut up from the hem
    hem = Vv - 1.0
    for u0, hw, depth in NOTCHES:
        tri = depth * np.clip(1 - np.abs(U - u0) / hw, 0, 1)
        hem = np.maximum(hem, Vv - (1.0 - tri))
    # pointed vent edges: the hem rises towards the vent
    hem = np.maximum(hem, Vv - (1.0 - 0.10 * sstep(0.06 - np.abs(U - VENT_U) + 0.0, -0.02, 0.06)))
    return np.maximum(vent * 4.0, hem)


def skirt():
    U, Vv, P = skirt_surface()
    V = P.reshape(-1, 3)
    UV = np.stack([U.ravel(), Vv.ravel()], 1)
    F = grid_tris(SK_NU, SK_NV)
    s = skirt_keep(UV[:, 0], UV[:, 1], V[:, 2])
    V5, F5 = clip_vec(np.concatenate([V, UV], 1), F, s)
    V, UV = V5[:, :3], V5[:, 3:]
    F5 = orient_outward(V, F5, lambda Q: np.stack([np.full(len(Q), PCX), np.full(len(Q), PCY), Q[:, 2]], 1))
    # black back graphic (chevron with a white line in it, trims along the
    # vent): a thin appliqué layer laid over the white cloth
    g = back_graphic(UV[:, 0], UV[:, 1], V[:, 2])
    n = vertex_normals(V, F5)
    Vb, Fb = clip_mesh(V + n * (SK_T / 2 + 0.0009), F5, g)
    return {'CoatSkirt': cloth(V, F5, ['coat'] * len(F5), SK_T),
            'CoatSkirtBlack': cloth(Vb, Fb, ['black'] * len(Fb), 0.0012, shell='black',
                                    outline_w=0.5)}


def back_graphic(U, Vv, Z):
    """< 0 on the black graphic (u units)."""
    du = np.abs(U - VENT_U)
    vh = np.maximum(vent_half(Vv, Z), 0.0)
    # chevron arms: from the vent edge at v=0.50 rising outwards to v=0.30
    def arm(off, half):
        line_v = 0.50 - (du - 0.06) * (0.20 / 0.20) + off
        return np.abs(Vv - line_v) - half
    band = arm(0.0, 0.048)
    white = arm(0.0, 0.011)
    chev = np.maximum(band, -white)
    chev = np.maximum(chev, du - 0.27)
    chev = np.maximum(chev, 0.03 - du)
    # trims along the vent edges below the chevron
    trim = np.maximum(du - (vh + 0.030), Vv - 1.5)
    trim = np.maximum(trim, 0.40 - Vv)
    return np.minimum(chev, trim)


# ------------------------------------------------------------ left tail

TAIL_TIP_PX = (591.0, 801.0)
TAIL_W = (0.034, 0.028)    # width at the hip / at the skirt hem point


def tail():
    """Long narrow white tail on her left: lies along the front edge of the
    left skirt panel (outside facing the viewer, lining behind) and runs
    on past the panel to a slightly curved blade point at ankle level."""
    U, Vv, P = skirt_surface()
    edge = P[-1]                                  # u = 1, top -> hem
    edge = edge[edge[:, 2] < 1.075]
    end = edge[-1]
    tip = unproject(TAIL_TIP_PX[0], TAIL_TIP_PX[1], end[1] - 0.01)
    pts = np.concatenate([edge[:-1:4], [end, tip]])
    path, tan = catmull(pts, 90)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
    s_end = s[np.argmin(np.linalg.norm(path - end, axis=1))]
    view = np.array([0.0, 1.0, 0.0])
    side = np.cross(view, tan)
    side /= np.linalg.norm(side, axis=1, keepdims=True)
    side *= np.sign(side[:, :1] + 1e-9)            # towards +X (outwards)
    tilt = np.radians(28.0)
    side = side * np.cos(tilt) + view * np.sin(tilt)
    t = s / s_end
    w = np.interp(t, [0, 1], TAIL_W)
    # blade: taper beyond the panel, the outer edge curving into the point
    q = np.clip((s - s_end) / (s[-1] - s_end), 0, 1)
    w = w * np.sqrt(np.clip(1 - q, 0, 1)) * (1 - 0.25 * q)
    inner = path - side * (0.004 + 0.45 * w * (1 - q))[:, None] + np.array([0, -0.006, 0])
    nw = 7
    k = np.linspace(0, 1, nw)
    V = inner[:, None, :] + side[:, None, :] * (w[:, None] * k[None, :])[..., None]
    # gentle cross curvature (cloth rolls a little at the edges)
    V = V + np.array([0, 1.0, 0]) * (0.003 * (2 * k - 1) ** 2)[None, :, None]
    V = V.reshape(-1, 3)
    F = grid_tris(len(path), nw)
    F = orient_outward(V, F, lambda Qp: Qp + np.array([0, 0.05, 0]))
    V, F = clean_mesh(V, F)
    return {'CoatTail': cloth(V, F, ['coat'] * len(F), 0.0036)}


# ------------------------------------------------------------ straps & harness

_SKIRT_CACHE = None


def skirt_grid():
    global _SKIRT_CACHE
    if _SKIRT_CACHE is None:
        _SKIRT_CACHE = skirt_surface()
    return _SKIRT_CACHE


def surf_at(u, z, off=0.0):
    """Skirt mid-surface point at parameter u and height z, moved `off`
    metres outwards (radially, negative = inwards)."""
    U, Vv, P = skirt_grid()
    uu = U[:, 0]
    i = np.clip(np.searchsorted(uu, u), 1, len(uu) - 1)
    w = (u - uu[i - 1]) / (uu[i] - uu[i - 1])
    col = P[i - 1] * (1 - w) + P[i] * w
    zs = col[::-1, 2]
    p = np.array([np.interp(z, zs, col[::-1, k]) for k in range(3)])
    d = np.array([p[0] - PCX, p[1] - PCY, 0.0])
    return p + d / np.linalg.norm(d) * off


def radial(p):
    d = np.array([p[0] - PCX, p[1] - PCY, 0.0])
    return d / np.linalg.norm(d)


def strap_along(u, z0, z1, off, width, thick, n=14):
    """Strap lying on the skirt surface from z0 down to z1 at parameter u."""
    path = np.array([surf_at(u, z, off) for z in np.linspace(z0, z1, n)])
    up = np.array([radial(p) for p in path])
    prof = HS.rounded_rect(width, thick, thick * 0.45, seg=2)
    return HS.sweep(prof, path, up)


def strap_between(a, b, width, thick, sag=0.0, n=24):
    mid = (a + b) / 2 + np.array([0, 0, -sag])
    path, _ = catmull([a, mid, b], n)
    up = np.array([radial(p) for p in path])
    prof = HS.rounded_rect(width, thick, thick * 0.45, seg=2)
    return HS.sweep(prof, path, up)


def straps():
    """Red X lattice across the vent (inside the back panel) and red tags
    on her right near the belt."""
    items = []
    off = -0.009                       # just inside the lining
    A = (surf_at(0.400, 0.800, off), surf_at(0.625, 0.625, off))
    Bb = (surf_at(0.650, 0.790, off), surf_at(0.385, 0.635, off))
    for a, b in (A, Bb):
        items.append(strap_between(a, b, 0.032, 0.0034, sag=0.006))
    out = {'CoatStraps': HS.hard_mesh(items, 'red_dark', bevel=0.0005, angle=35,
                                      outline_w=0.7)}
    tags = []
    for u, z, h in ((0.30, 1.005, 0.050), (0.335, 1.000, 0.040)):
        tags.append(strap_along(u, z, z - h, 0.0045, 0.022, 0.003, n=6))
    out['CoatTags'] = HS.hard_mesh(tags, 'red', bevel=0.0005, angle=35, outline_w=0.6)
    return out


def harness():
    """Black harness block on the back of the belt with a ladder of short
    vertical straps hanging below it."""
    from outfit import belt_z
    zc = belt_z(PCX) - 0.010
    items = []
    # block: plate following the skirt, 15 cm wide, 4.4 cm tall
    us = np.linspace(0.5 - 0.115, 0.5 + 0.115, 19)
    path = np.array([surf_at(u, zc, 0.0075) for u in us])
    items.append(_curved_plate(path, np.array([radial(p) for p in path]), 0.044, 0.007))
    # ladder: 4 short straps
    for u in (0.5 - 0.078, 0.5 - 0.026, 0.5 + 0.026, 0.5 + 0.078):
        items.append(strap_along(u, zc - 0.012, zc - 0.150, 0.0055, 0.016, 0.003))
    # cross bar holding the ladder
    bar = np.array([surf_at(u, zc - 0.100, 0.0085) for u in np.linspace(0.5 - 0.095, 0.5 + 0.095, 15)])
    items.append(_curved_plate(bar, np.array([radial(p) for p in bar]), 0.011, 0.003))
    return {'CoatHarness': HS.hard_mesh(items, 'black', bevel=0.0006, angle=35,
                                        outline_w=0.7)}


def _curved_plate(path, up, height, thick):
    """Plate following a horizontal path: height along z, thickness along up."""
    n = len(path)
    V, F = [], []
    for p, u in zip(path, up):
        for dz, dt in ((-height / 2, -thick / 2), (height / 2, -thick / 2),
                       (height / 2, thick / 2), (-height / 2, thick / 2)):
            V.append(p + np.array([0, 0, dz]) + u * dt)
    for i in range(n - 1):
        for k in range(4):
            a, b = i * 4 + k, i * 4 + (k + 1) % 4
            F.append([a, b, b + 4, a + 4])
    F.append([3, 2, 1, 0])
    F.append([(n - 1) * 4 + k for k in range(4)])
    return np.array(V), F


# ------------------------------------------------------------ build

def build():
    d = {}
    d.update(jacket())
    d.update(lapels())
    d.update(collar())
    d.update(snaps_and_tab())
    d.update(skirt())
    d.update(tail())
    d.update(straps())
    d.update(harness())
    return d

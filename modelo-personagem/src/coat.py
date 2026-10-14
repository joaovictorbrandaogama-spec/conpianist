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


def poly_mask(poly_px):
    """Signed distance (metres, <0 inside) of the camera projection of P to
    a polygon traced on the reference image."""
    poly = np.asarray(poly_px, dtype=np.float64)

    def m(P):
        q = project(P)
        return polygon_sd(q[..., 0], q[..., 1], poly) * S
    return m


# ------------------------------------------------------------ mesh helpers

def split_mesh(V, F, s):
    """Cut a triangle mesh along s = 0; return (V, F, side) with side True
    where s < 0.  Both halves share the cut vertices (welded)."""
    Va, Fa = clip_mesh(V, F, s)
    Vb, Fb = clip_mesh(V, F, -np.asarray(s))
    Vm = np.concatenate([Va, Vb])
    Fm = np.concatenate([Fa, Fb + len(Va)])
    side = np.concatenate([np.ones(len(Fa), bool), np.zeros(len(Fb), bool)])
    key = np.round(Vm / 2e-5).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel()
    return Vm[first], inv[Fm], side


def tri_normals(V, F):
    n = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def orient_outward(V, F, centre_fn):
    """Flip triangles so that their normals point away from centre_fn(P)."""
    F = np.asarray(F)
    n = tri_normals(V, F)
    c = V[F].mean(axis=1)
    out = c - centre_fn(c)
    flip = np.sum(n * out, axis=1) < 0
    F = F.copy()
    F[flip] = F[flip][:, ::-1]
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


def angle_about(P, cx, cy):
    """Angle around a vertical axis, degrees, 0 = front (-Y), +90 = her
    left (+X), +-180 = back."""
    return np.degrees(np.arctan2(P[..., 0] - cx, -(P[..., 1] - cy)))


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
        rad = r_hole - (r_hole - r_side) * sstep(t, 0.015, 0.06)
        return np.minimum(t, rad - r)
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
    dr = np.where(vr[:, 0] > 0, 0, 0)
    vr = vr - vertex_normals(vr, fr) * 0.0006
    return {'Coat': cloth(vw, fw, ['coat'] * len(fw), COAT_T, decimate=26000),
            'CoatFacing': cloth(vr, fr, ['lining'] * len(fr), COAT_T, outline_w=0.6)}


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
           (305, 186), (298, 192.5), (287, 190), (281, 203), (281, 218), (284, 232)]
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


def px_sheet(g, poly, level, step=0.5, pad=2.0):
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
    th = np.radians(np.linspace(-180, 180, 241))
    zs = np.linspace(1.355, 1.49, 55)
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


# ------------------------------------------------------------ build

def build():
    d = {}
    d.update(jacket())
    d.update(lapels())
    d.update(collar())
    d.update(snaps_and_tab())
    return d

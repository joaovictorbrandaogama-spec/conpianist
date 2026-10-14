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
PULL_Z = (1.255, 1.105)    # drape -> body offset blend below the bust
JACKET_H = 0.0023          # jacket field grid step
BUST_PAD = 0.0030          # extra room over the bikini cups

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


class _ArmTop:
    """Upper-arm loft limited to its top (fades out below ARM_TOP_S)."""
    def __init__(self, side):
        self.arm = B.arm(side)
        self.sh, el = J['shoulder_' + side], J['elbow_' + side]
        self.ax = (el - self.sh) / np.linalg.norm(el - self.sh)

    def bounds(self):
        return self.sh - 0.10, self.sh + 0.10

    def __call__(self, P):
        t = (P - self.sh) @ self.ax
        return self.arm(P) + 2.0 * np.maximum(t - ARM_TOP_S, 0.0)


ARM_TOP_S = 0.080


def sleeve_cut(side, s0):
    """> 0 on the arm beyond the sleeve-top hem (s0 down the arm from the
    shoulder joint) where the cloth is closer to the arm than to the torso."""
    sh, el = J['shoulder_' + side], J['elbow_' + side]
    ax = (el - sh) / np.linalg.norm(el - sh)
    arm = B.arm(side)
    tor = B.torso()
    br = B.breasts()

    def m(P):
        t = (P - sh) @ ax
        dt = np.minimum.reduce([tor(P)] + [b(P) for b in br])
        return np.minimum(t - s0, dt - arm(P))
    return m


def arm_cut(side, s0, r_in=0.036, a_lat=115.0):
    """> 0 in the sleeve region of an arm: beyond the armhole plane (s0
    down the arm from the shoulder joint) on the outer side of the arm,
    and inside the sleeve tube all round.  The jacket side panel next to
    the arm (medial side) is kept, so no skin shows between jacket and
    sleeve."""
    sh, el = J['shoulder_' + side], J['elbow_' + side]
    ax = (el - sh) / np.linalg.norm(el - sh)
    lat = np.array([1.0 if side == 'L' else -1.0, 0.0, 0.0])
    lat = lat - ax * (lat @ ax)
    lat /= np.linalg.norm(lat)
    ca = np.cos(np.radians(a_lat))

    def m(P):
        q = P - sh
        t = q @ ax
        qq = q - t[..., None] * ax
        r = np.linalg.norm(qq, axis=-1)
        sector = qq @ lat - r * ca
        return np.minimum.reduce([t - s0, np.maximum(sector, r_in - r), 0.30 - t])
    return m


_JACKET_GRID = None


def jacket_grid():
    """Field of the jacket mid-surface (level 0): body offset; the cloth
    falls (almost) straight down from the bust, chest sides and blades."""
    global _JACKET_GRID
    if _JACKET_GRID is not None:
        return _JACKET_GRID
    lo, hi = [-0.20, -0.19, 0.99], [0.23, 0.14, 1.47]
    g = Grid(lo, hi, JACKET_H)
    g.union(B.torso(), 0.0)
    from sdf import Ellipsoid
    for b in B.breasts():
        # inflated a little: the bikini cups must stay inside the jacket edge
        g.union(Ellipsoid(b.c, b.r + BUST_PAD, b.R), 0.02)
    D = g.d
    D_body = D.copy()
    step = np.float32(DRAPE_K * g.h)
    for k in range(D.shape[2] - 2, -1, -1):
        np.minimum(D[:, :, k], D[:, :, k + 1] + step, out=D[:, :, k])
    # below the bust the front panels are pulled back onto the body
    zg = g.lo[2] + np.arange(D.shape[2]) * g.h
    w = sstep(zg, PULL_Z[0], PULL_Z[1]).astype(np.float32)[None, None, :]
    g.d = D * (1 - w) + D_body * w
    for p in B.shoulders():
        g.union(p, 0.03)
    # top of the upper arms: the jacket flows into short set-in sleeve
    # tops (bridging the back of the armpit) that cover the sleeves' tops
    for side in ('R', 'L'):
        g.union(_ArmTop(side), 0.022)
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
    arms = np.maximum(sleeve_cut('R', ARM_S0[0])(P), sleeve_cut('L', ARM_S0[1])(P))
    sl = np.maximum(E['L'](z) - th, th - E['L2'](z)) * k
    sr = np.maximum(E['R2'](z) - th, th - E['R'](z)) * k
    strip = np.minimum(sl, sr)
    hem = np.minimum(HEM_Z - z, np.maximum(strip, STRIP_Z - z))
    return np.maximum.reduce([neck, opening, arms, hem])


FACING_W = 0.0050          # visible red facing along the front edges (at the bust)
FACING_Z = (1.195, 1.275)  # ... fading out below the bust
ARM_S0 = (0.040, 0.028)    # sleeve-top hem: distance down the arm from the shoulder


def jacket():
    g = jacket_grid()
    E = jacket_edges()
    v, f = g.mesh(0.0)
    v, f = clip_mesh(v, f, jacket_keep(v))
    v, f = largest_components(v, f, min_frac=0.02)
    v = relax(v, f, 6)
    f = orient_outward(v, f, jacket_centre)
    n = vertex_normals(v, f)
    v = tuck_strips(v, n, E)
    n = vertex_normals(v, f)
    # turned-out red facing along the front opening (only where the lapels
    # roll at the bust): its own object that tucks under the white edge
    th = torso_angle(v)
    k = deg2m(v)
    z = v[:, 2]
    dist = np.where(th > 0, th - E['L'](z), E['R'](z) - th) * k   # >= 0
    front = np.abs(th) < 100
    # (her left edge is plain white below the lapel, as in the art)
    fw = np.where(th > 0, 0.0, FACING_W * sstep(z, *FACING_Z))
    vw, fw_ = clip_mesh(v, f, np.where(front, fw - dist, -1.0))
    vr, fr = clip_mesh(v, f, np.where(front & (fw > 0.0004), dist - fw - 0.002, 1.0))
    vr = vr - vertex_normals(vr, fr) * 0.0010
    # piping on the free edges: crop hem, armholes, front edges below the
    # facing (the neckline hides under the collar, the top of the front
    # edges under the lapels)

    def keep(Q):
        thq = torso_angle(Q)
        zq = Q[:, 2]
        neck = (neck_axis_r(Q) < 0.080) & (zq > 1.33)
        fr_ = (np.abs(thq) < 100) & (zq > np.where(thq > 0, 1.300, 1.212))
        return np.where(neck | fr_, -1.0, 1.0)
    pipe = piping(v, f, keep, width=0.0030, height=COAT_T + 0.0016, normals=n)
    return {'Coat': cloth(vw, fw_, ['coat'] * len(fw_), COAT_T, outline_w=0.85),
            'CoatFacing': cloth(vr, fr, ['lining'] * len(fr), COAT_T, outline_w=0.6),
            'CoatPiping': HS.hard_mesh(pipe + back_seams(), 'coat_trim', bevel=0.0,
                                       angle=70, outline_w=0.5)}


TUCK_W = 0.040             # width of the tucked band along the strips' side edges
TUCK_GAP = 0.0045          # cloth mid-surface to skin at the tucked edge


def tuck_strips(v, n, E):
    """The narrow front strips below the crop hem hang off the body; seen
    from behind their red inside showed through the gap.  Curl their side
    (back) edges in onto the body so the gap closes."""
    z = v[:, 2]
    th = torso_angle(v)
    k = deg2m(v)
    dR = (th - E['R2'](z)) * k
    dL = (E['L2'](z) - th) * k
    d = np.where(th < 0, dR, dL)
    w = (1.0 - sstep(d, 0.0, TUCK_W)) * sstep(HEM_Z + 0.004 - z, 0.0, 0.030)
    w = np.where((np.abs(th) < 110) & (d > -0.01), w, 0.0)
    db = B.torso()(v)
    push = w * np.maximum(db - TUCK_GAP, 0.0)
    return v - n * push[:, None]


def back_seams():
    """Two princess seams on the back of the jacket (raised fine lines),
    from the armholes down to the crop hem."""
    g = jacket_grid()
    items = []
    prof = HS.rounded_rect(0.0018, 0.0011, 0.0005, seg=1)
    for sgn in (-1, 1):
        zs = np.linspace(1.330, HEM_Z + 0.002, 40)
        th = sgn * (148.0 - 26.0 * sstep(zs, 1.27, 1.33))
        pts, nrm = [], []
        for t_, z_ in zip(th, zs):
            cx, cy = torso_axis(z_)
            d = np.array([np.sin(np.radians(t_)), -np.cos(np.radians(t_)), 0.0])
            rr = np.linspace(0.25, 0.0, 600)
            P = np.array([cx, cy, z_])[None, :] + rr[:, None] * d[None, :]
            ok = np.all((P > g.lo + g.h) & (P < g.lo + (np.array(g.shape) - 2) * g.h), axis=1)
            sv = np.where(ok, g.sample(P), 1.0)
            i = int(np.argmax(sv < 0))
            if i == 0:
                continue
            w = sv[i - 1] / (sv[i - 1] - sv[i])
            p = P[i - 1] + (P[i] - P[i - 1]) * w
            nn = jacket_normal(g, p)
            pts.append(p + nn * (COAT_T / 2 + 0.0002))
            nrm.append(nn)
        if len(pts) > 4:
            items.append(HS.sweep(prof, smooth_path(np.array(pts), 2), np.array(nrm)))
    return items


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

LAPEL_LIFT = 0.0033        # lapel mid-surface above the jacket mid-surface
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
    out_w, out_r, pipes = [], [], []
    for poly, nfold in ((LAPEL_L, LAPEL_L_FOLD), (LAPEL_R, LAPEL_R_FOLD)):
        V, F, xy = px_sheet(g, poly, LAPEL_LIFT)
        F = orient_outward(V, F, jacket_centre)
        d = dist_to_polyline(xy[:, 0], xy[:, 1], poly[:nfold])
        V5, F5, red = split_vec(np.concatenate([V, xy], 1), F, d - LAPEL_RED_PX)
        out_w.append((V5[:, :3], F5[~red]))
        out_r.append((V5[:, :3], F5[red]))
        # piping on the outer (notched) edges, not on the roll line
        fold = poly[:nfold]

        def keep(Q, fold=fold):
            p = project(Q)
            return dist_to_polyline(p[:, 0], p[:, 1], fold) - LAPEL_RED_PX - 0.6
        pipes += piping(V, F, keep, width=0.0026, height=LAPEL_T + 0.0014, step=0.0025)

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
        return cloth(V, F, [mat] * len(F), LAPEL_T, outline_w=0.6)
    return {'CoatLapels': pack(out_w, 'coat'), 'CoatLapelEdge': pack(out_r, 'lining'),
            'CoatLapelPiping': HS.hard_mesh(pipes, 'coat_trim', bevel=0.0, angle=70,
                                            outline_w=0.45)}


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
    for xp, yp in ((360.0, 204.0), (366.5, 202.5), (365.0, 210.5)):
        P, ok = ray_hits(g, [(xp, yp)], LAPEL_LIFT + LAPEL_T / 2)
        if not ok[0]:
            continue
        c = P[0]
        n = jacket_normal(g, c)
        R = HS.frame_from(z=n, x=np.cross([0, 0, 1.0], n))
        prof = [(0.0, 0.0), (0.0030, 0.0), (0.0030, 0.0010), (0.0026, 0.0018),
                (0.0014, 0.0020), (0.0010, 0.0014), (0.0, 0.0013)]
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


# ------------------------------------------------------------ edge piping

def boundary_runs(V, F, keep=None, min_len=4):
    """Boundary loops of a triangle sheet as vertex index paths.  With
    keep(P) (> 0 = keep), loops are split into the runs where keep holds."""
    F = np.asarray(F)
    e = np.concatenate([F[:, [0, 1]], F[:, [1, 2]], F[:, [2, 0]]])
    key = np.sort(e, axis=1)
    _, inv, cnt = np.unique(key, axis=0, return_inverse=True, return_counts=True)
    b = e[cnt[inv.ravel()] == 1]
    nxt = {}
    for a, c in b:
        nxt.setdefault(int(a), []).append(int(c))
    seen = set()
    loops = []
    for a0 in list(nxt):
        if a0 in seen:
            continue
        loop = [a0]
        seen.add(a0)
        a = a0
        while True:
            cands = [c for c in nxt.get(a, []) if c not in seen]
            if not cands:
                break
            a = cands[0]
            seen.add(a)
            loop.append(a)
        if len(loop) >= min_len:
            closed = a0 in nxt.get(loop[-1], [])
            loops.append((np.array(loop), closed))
    if keep is None:
        return loops
    runs = []
    for loop, closed in loops:
        k = keep(V[loop]) > 0
        if k.all():
            runs.append((loop, closed))
            continue
        if not k.any():
            continue
        # rotate so the loop starts at a dropped vertex, then split
        s = int(np.argmin(k)) if closed else 0
        lp, kk = np.roll(loop, -s), np.roll(k, -s)
        cur = []
        for i, ok in zip(lp, kk):
            if ok:
                cur.append(i)
            elif cur:
                runs.append((np.array(cur), False))
                cur = []
        if cur:
            runs.append((np.array(cur), False))
    return [(r, c) for r, c in runs if len(r) >= min_len]


def smooth_path(P, iters=4, closed=False):
    P = P.copy()
    for _ in range(iters):
        if closed:
            Q = 0.5 * P + 0.25 * (np.roll(P, 1, 0) + np.roll(P, -1, 0))
        else:
            Q = P.copy()
            Q[1:-1] = 0.5 * P[1:-1] + 0.25 * (P[:-2] + P[2:])
        P = Q
    return P


def resample_path(P, step):
    L = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P[:, :3], axis=0), axis=1))])
    if L[-1] < step * 2:
        return P
    s = np.linspace(0, L[-1], int(np.ceil(L[-1] / step)) + 1)
    return np.stack([np.interp(s, L, P[:, k]) for k in range(P.shape[1])], 1)


def piping(V, F, keep=None, width=0.0030, height=0.0056, step=0.003, lift=0.0,
           normals=None):
    """Rounded bead swept along the free edges of a cloth sheet: covers the
    Solidify rim like a sewn piping.  Returns a list of (V, F) items."""
    N = vertex_normals(V, F) if normals is None else normals
    prof = HS.rounded_rect(width, height, min(width, height) * 0.45, seg=2)
    items = []
    for run, closed in boundary_runs(V, F, keep):
        P = V[run]
        n = N[run]
        if closed:
            P = np.concatenate([P, P[:1]])
            n = np.concatenate([n, n[:1]])
        P = smooth_path(P, 3, closed=False)
        Q = resample_path(np.concatenate([P, n], 1), step)
        if len(Q) < 3:
            continue
        P, n = Q[:, :3], Q[:, 3:]
        n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-9)
        items.append(HS.sweep(prof, P + n * lift, n))
    return items


# ------------------------------------------------------------ skirt

SK_NU, SK_NV = 220, 96
SK_T = 0.0038
SK_LEV = 0.0085            # skirt top: offset from the hip hull, under the belts
SK_TOP_DZ = 0.004          # skirt top above the white belt centre line
TOP_TH = ([0.0, 0.5, 1.0], [-80.0, -181.0, -308.0])   # belt-line angle per column
VENT_U = 0.5
VENT_Z = 0.550             # the centre-back vent opens below the chevron
VENT_K = 0.50              # vent half width growth (m per m down)

# hem polyline over u (0 = her right front edge, 0.5 = back centre, 1 = her
# left front edge): theta (deg, continuous), radius from the pelvis axis, z
HEM_KN = np.array([
    # u      theta    r      z
    [0.00, -105.0, 0.258, 0.290],     # her right: long point at mid calf
    [0.12, -123.0, 0.236, 0.350],
    [0.25, -143.0, 0.214, 0.400],
    [0.38, -163.0, 0.198, 0.430],
    [0.47, -176.0, 0.192, 0.515],     # back centre: hem at the knee
    [0.53, -186.0, 0.192, 0.515],
    [0.62, -200.0, 0.200, 0.450],
    [0.75, -220.0, 0.216, 0.560],
    [0.84, -234.0, 0.245, 0.640],     # her left: short behind the leg ...
    [0.90, -244.0, 0.285, 0.505],
    [0.96, -253.0, 0.345, 0.432],
    [1.00, -260.0, 0.390, 0.394]])    # ... long diagonal down to the tail
# front edges: (z, theta, r) from the hip down to the hem
EDGE_R = np.array([[0.290, -105.0, 0.258], [0.500, -103.0, 0.226],
                   [0.700, -100.0, 0.204], [0.860, -97.0, 0.186]])
EDGE_L = np.array([[0.394, 100.0, 0.390], [0.520, 97.0, 0.318],
                   [0.640, 94.0, 0.268], [0.800, 89.0, 0.212], [0.920, 80.0, 0.175]])
EDGE_L[:, 1] -= 360.0      # same continuous angle range as the u parameter


def pelvis_xy(theta_deg, r):
    t = np.radians(theta_deg)
    return PCX + r * np.sin(t), PCY - r * np.cos(t)


_HIPS = None


def hips_legs_fn():
    """Torso + glutes + legs (no arms: the hands hang beside the skirt)."""
    global _HIPS
    if _HIPS is None:
        from outfit import hips_fn
        _HIPS = hips_fn()
    return _HIPS


def hull_r(th_deg, z, level):
    """Radius from the pelvis axis where the hips/legs field reaches `level`
    along direction theta at height z (outermost crossing)."""
    th = np.atleast_1d(np.asarray(th_deg, dtype=np.float64))
    z = np.broadcast_to(np.asarray(z, dtype=np.float64), th.shape)
    rs = np.linspace(0.42, 0.0, 421)
    x, y = pelvis_xy(th[:, None], rs[None, :])
    P = np.stack([x, y, np.broadcast_to(z[:, None], x.shape)], -1)
    d = hips_legs_fn()(P.reshape(-1, 3)).reshape(x.shape) - level
    hit = d < 0
    i = np.argmax(hit, axis=1)
    ok = hit.any(axis=1) & (i > 0)
    i = np.maximum(i, 1)
    r_ = np.arange(len(th))
    d0, d1 = d[r_, i - 1], d[r_, i]
    w = d0 / np.where(np.abs(d0 - d1) > 1e-12, d0 - d1, 1.0)
    r = rs[i - 1] + (rs[i] - rs[i - 1]) * w
    return np.where(ok, r, 0.0)


def interp_u(u, col):
    return np.interp(u, HEM_KN[:, 0], HEM_KN[:, col])


def skirt_params():
    from outfit import belt_z
    u = np.linspace(0, 1, SK_NU)
    v = np.linspace(0, 1, SK_NV)
    th_t = np.interp(u, *TOP_TH)
    z_t = np.full(SK_NU, 1.075)
    for _ in range(3):
        r_t = hull_r(th_t, z_t, SK_LEV)
        x_t, _ = pelvis_xy(th_t, r_t)
        z_t = belt_z(x_t) + SK_TOP_DZ
    r_t = hull_r(th_t, z_t, SK_LEV)
    th_h, r_h, z_h = interp_u(u, 1), interp_u(u, 2), interp_u(u, 3)
    U, Vv = np.meshgrid(u, v, indexing='ij')
    f = Vv ** 1.15
    g = Vv ** 1.6                    # radius: eases out of the hip, then flares
    TH = th_t[:, None] * (1 - f) + th_h[:, None] * f
    R = r_t[:, None] * (1 - g) + r_h[:, None] * g
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
    """Radial displacement: three long soft folds on each front panel (round
    ridges and valleys, running a little diagonally), one broad fold on each
    back panel; flat at the belt, growing towards the hem."""
    d = np.zeros_like(U)
    A = np.clip((Vv - 0.12) / 0.88, 0, 1) ** 1.35
    for u0, u1, n, amp, skew in ((0.02, 0.40, 3, 0.017, 0.07), (0.60, 0.98, 3, 0.017, -0.07)):
        ph = (U - u0) / (u1 - u0) + skew * Vv
        inside = (ph > 0) & (ph < 1)
        prof = -np.cos(2 * np.pi * n * ph) * 0.5 + 0.15
        fade = np.sin(np.pi * np.clip(ph, 0, 1)) ** 0.7
        d += np.where(inside, prof * amp * A * fade, 0.0)
    for uc in (0.385, 0.615):
        d += 0.011 * A * np.exp(-((U - uc) / 0.035) ** 2)
    return d


def hug(TH, R, Z):
    """Push the skirt out of hips, glutes, legs and leg armour; the push is
    smoothed so the cloth eases off the hip instead of creasing."""
    from scipy.ndimage import maximum_filter, gaussian_filter
    fn = hips_legs_fn()
    R0 = R.copy()
    R = R.copy()

    def push(R, gain):
        x, y = pelvis_xy(TH, R)
        P = np.stack([x, y, Z], -1).reshape(-1, 3)
        leg = np.where(x.ravel() > 0.02, 0.022, 0.013)
        clear = SK_LEV + (leg - SK_LEV) * sstep(0.95 - Z.ravel(), 0.0, 0.10)
        d = fn(P)
        return R + (np.maximum(clear - d, 0.0) * gain).reshape(R.shape)
    for _ in range(6):
        R = push(R, 1.05)
    dl = maximum_filter(R - R0, size=(5, 9), mode='nearest')
    dl = gaussian_filter(dl, (1.6, 3.0), mode='nearest')
    R = R0 + np.maximum(dl, 0.0)
    for _ in range(4):
        R = push(R, 1.0)
    return R


_SKIRT_CACHE = None


def skirt_grid():
    """(U, V, P, TH, R, SX): parameter grids, mid-surface points, polar
    coordinates and SX = arc distance from the back centre line (m,
    positive towards her left)."""
    global _SKIRT_CACHE
    if _SKIRT_CACHE is None:
        U, Vv, TH, R, Z = skirt_params()
        R = R + fold_field(U, Vv)
        R = hug(TH, R, Z)
        x, y = pelvis_xy(TH, R)
        P = np.stack([x, y, Z], -1)
        iv = int(np.argmin(np.abs(U[:, 0] - VENT_U)))
        SX = -np.radians(TH - TH[iv][None, :]) * R
        _SKIRT_CACHE = (U, Vv, P, TH, R, SX)
    return _SKIRT_CACHE


def vent_half(Z):
    """Half width (m) of the centre-back vent: a slit opening into an
    inverted V below VENT_Z; < 0 above it."""
    return np.where(Z < VENT_Z, (VENT_Z - Z) * VENT_K, -1.0)


def skirt():
    U, Vv, P, TH, R, SX = skirt_grid()
    V = P.reshape(-1, 3)
    X = np.stack([U.ravel(), Vv.ravel(), SX.ravel()], 1)
    F = grid_tris(SK_NU, SK_NV)
    s = vent_half(V[:, 2]) - np.abs(X[:, 2])
    V5, F5 = clip_vec(np.concatenate([V, X], 1), F, s)
    V, X = V5[:, :3], V5[:, 3:]
    F5 = orient_outward(V, F5, lambda Q: np.stack([np.full(len(Q), PCX), np.full(len(Q), PCY),
                                                    Q[:, 2]], 1))
    n = vertex_normals(V, F5)
    # black back graphic: a thin layer laid over the white cloth
    g = back_graphic(X[:, 2], V[:, 2])
    Vb, Fb = clip_mesh(V + n * (SK_T / 2 + 0.0008), F5, g)
    # piping on every free edge except the top (under the belts)
    ztop = V[:, 2].max()
    from outfit import belt_z
    pipe = piping(V, F5, keep=lambda Q: belt_z(Q[:, 0]) - 0.012 - Q[:, 2],
                  width=0.0030, height=SK_T + 0.0016, normals=n)
    return {'CoatSkirt': cloth(V, F5, ['coat'] * len(F5), SK_T),
            'CoatSkirtBlack': cloth(Vb, Fb, ['black'] * len(Fb), 0.0012, shell='black',
                                    outline_w=0.5),
            'CoatSkirtPiping': HS.hard_mesh(pipe, 'coat_trim', bevel=0.0, angle=70,
                                            outline_w=0.5)}


BAND = 0.070               # half width of the white back band (edge lines)
LINE = 0.0045              # half width of the black lines
CHEV_Z = 0.566             # lowest point of the chevron
CHEV_K = 1.45              # chevron arm slope (dz / d|sx|)
LADDER_Z = 0.935           # top of the band lines (bottom of the harness)


def back_graphic(sx, z):
    """< 0 on the black graphic: two vertical lines edging the back band
    from the harness to the hem, and three nested chevrons at the knee."""
    a = np.abs(sx)
    lines = np.maximum(np.abs(a - BAND) - LINE, z - LADDER_Z)
    g = lines
    c = np.sqrt(1 + CHEV_K ** 2)
    for k in range(3):
        zk = CHEV_Z + k * 0.034
        dist = (z - zk - a * CHEV_K) / c
        ch = np.maximum(np.abs(dist) - 0.0050, a - BAND)
        g = np.minimum(g, ch)
    return g


# ------------------------------------------------------------ left tail

TAIL_TIP_PX = (591.5, 802.0)
TAIL_W = 0.0105


def tail():
    """Long narrow tail on her left: the rolled front edge of the left skirt
    panel (light trim colour) continuing the panel surface beyond its edge,
    and running on past the panel hem to a fine point at ankle level."""
    U, Vv, P, TH, R, SX = skirt_grid()
    col = P[-1]
    tdir = P[-1] - P[-4]
    tdir /= np.linalg.norm(tdir, axis=1, keepdims=True)
    sel = col[:, 2] < 1.0
    edge, tdir = col[sel], tdir[sel]
    end = edge[-1]
    # straight continuation of the edge direction, bent slightly to the tip
    k = max(6, len(edge) // 6)
    dirn = edge[-1] - edge[-k]
    dirn /= np.linalg.norm(dirn)
    tip = unproject(TAIL_TIP_PX[0], TAIL_TIP_PX[1], end[1] + dirn[1] * 0.12)
    mid = end + dirn * np.linalg.norm(tip - end) * 0.5
    mid = mid * 0.35 + (end + tip) / 2 * 0.65
    pts = np.concatenate([edge[::3], [end], [mid, tip]])
    _, keep = np.unique(np.round(pts, 6), axis=0, return_index=True)
    pts = pts[np.sort(keep)]
    path, tan = catmull(pts, 160)
    s = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(path, axis=0), axis=1))])
    j_end = int(np.argmin(np.linalg.norm(path - end, axis=1)))
    s_end = s[j_end]
    # side direction: the panel surface beyond its edge (then frozen)
    zt = edge[:, 2][::-1]
    side = np.stack([np.interp(np.minimum(path[:, 2], edge[0, 2]), zt, tdir[::-1, c])
                     for c in range(3)], 1)
    side[j_end:] = side[j_end]
    side -= tan * np.sum(side * tan, axis=1, keepdims=True)
    side /= np.linalg.norm(side, axis=1, keepdims=True)
    q = np.clip((s - s_end) / (s[-1] - s_end), 0, 1)
    w = TAIL_W * (1 - q) ** 0.85
    w[0] = w[1]
    nw = 5
    kk = np.linspace(0, 1, nw)
    V = path[:, None, :] + side[:, None, :] * (w[:, None] * kk[None, :])[..., None]
    V = V.reshape(-1, 3)
    F = grid_tris(len(path), nw)
    F = orient_outward(V, F, lambda Qp: Qp + np.array([0, 0.05, 0]))
    V, F = clean_mesh(V, F)
    return {'CoatTail': cloth(V, F, ['coat_trim'] * len(F), 0.0034, shell='coat_trim',
                              outline_w=0.8)}


# ------------------------------------------------------------ straps & harness

def surf_at(u, z, off=0.0):
    """Skirt mid-surface point at parameter u and height z, moved `off`
    metres outwards (radially, negative = inwards)."""
    U, Vv, P, TH, R, SX = skirt_grid()
    uu = U[:, 0]
    i = int(np.clip(np.searchsorted(uu, u), 1, len(uu) - 1))
    w = (u - uu[i - 1]) / (uu[i] - uu[i - 1])
    col = P[i - 1] * (1 - w) + P[i] * w
    zs = col[::-1, 2]
    p = np.array([np.interp(z, zs, col[::-1, k]) for k in range(3)])
    return p + radial(p) * off


_SXI = None


def surf_sx(sx, z, off=0.0):
    """Skirt mid-surface point at back coordinate sx (m from the centre
    line) and height z, moved `off` along the radial direction."""
    global _SXI
    if _SXI is None:
        from scipy.interpolate import LinearNDInterpolator
        U, Vv, P, TH, R, SX = skirt_grid()
        m = (U > 0.2) & (U < 0.8)
        _SXI = LinearNDInterpolator(np.stack([SX[m], P[m][:, 2]], 1), P[m])
    p = _SXI(np.stack([np.atleast_1d(sx), np.atleast_1d(z)], 1))
    out = []
    for q in p:
        out.append(q + radial(q) * off)
    return np.array(out)


def radial(p):
    d = np.array([p[0] - PCX, p[1] - PCY, 0.0])
    return d / np.linalg.norm(d)


def strap_path(path, width, thick):
    up = np.array([radial(p) for p in path])
    prof = HS.rounded_rect(width, thick, thick * 0.45, seg=2)
    return HS.sweep(prof, path, up)


def sx_at(u, z):
    """Back coordinate SX of the skirt at parameter u, height z."""
    U, Vv, P, TH, R, SX = skirt_grid()
    uu = U[:, 0]
    i = int(np.clip(np.searchsorted(uu, u), 1, len(uu) - 1))
    w = (u - uu[i - 1]) / (uu[i] - uu[i - 1])
    zc = (P[i - 1, :, 2] * (1 - w) + P[i, :, 2] * w)[::-1]
    sc = (SX[i - 1] * (1 - w) + SX[i] * w)[::-1]
    return float(np.interp(z, zc, sc))


# X lattice inside the back panels: (u, z) end points, extra depth
# X lattice inside the back panels, in back coordinates (sx, z) traced from
# the reference between the legs (one band enters from behind her right
# thigh at ref px ~(322, 530), the other rises to her left panel at ~(465,
# 535); they cross behind her left leg): end points, extra depth
STRAPS_X = [((-0.075, 0.805), (0.245, 0.625), 0.0026),
            ((0.315, 0.790), (-0.040, 0.615), 0.0)]
STRAP_W = 0.036
# two black straps hanging behind the legs (ref px ~(337, 550-632) and
# ~(450, 555-635)), ending in a slanted point
STRAPS_K = [((-0.012, 0.835), (-0.004, 0.585)), ((0.262, 0.830), (0.252, 0.590))]
STRAPK_W = 0.030


def _band_mask(sx, z, a, b, w, point=0.0):
    a, b = np.asarray(a, float), np.asarray(b, float)
    L = np.linalg.norm(b - a)
    d = (b - a) / L
    qx, qz = sx - a[0], z - a[1]
    along = qx * d[0] + qz * d[1]
    perp = -qx * d[1] + qz * d[0]
    return np.maximum.reduce([np.abs(perp) - w / 2, -along, along - L + point * (perp + w / 2)])


def straps():
    """Broad crimson X lattice sewn inside the back panels (seen between
    the legs from the front), two black straps hanging behind the legs,
    and red tags on her right near the belt.  The bands are offset copies
    of the skirt surface, so they follow its folds without poking
    through."""
    U, Vv, P, TH, R, SX = skirt_grid()
    V = P.reshape(-1, 3)
    F = grid_tris(SK_NU, SK_NV)
    F = orient_outward(V, F, lambda Q: np.stack([np.full(len(Q), PCX), np.full(len(Q), PCY),
                                                  Q[:, 2]], 1))
    n = vertex_normals(V, F)
    sx, z = SX.ravel(), V[:, 2]

    def pack(items):
        Vs, Fs, off = [], [], 0
        for Vc, Fc in items:
            Vs.append(Vc)
            Fs.append(Fc + off)
            off += len(Vc)
        return np.concatenate(Vs), np.concatenate(Fs)
    red, blk = [], []
    for a, b, deep in STRAPS_X:
        m = _band_mask(sx, z, a, b, STRAP_W)
        red.append(clip_mesh(V - n * (SK_T / 2 + 0.0042 + deep), F, m))
    for a, b in STRAPS_K:
        m = _band_mask(sx, z, a, b, STRAPK_W, point=0.9)
        blk.append(clip_mesh(V - n * (SK_T / 2 + 0.0016), F, m))
    Vs, Fs = pack(red)
    out = {'CoatStraps': cloth(Vs, Fs, ['red'] * len(Fs), 0.0024, shell='red', outline_w=1.0)}
    Vs, Fs = pack(blk)
    out['CoatStrapsBlack'] = cloth(Vs, Fs, ['black'] * len(Fs), 0.0020, shell='black',
                                   outline_w=0.8)
    tags = []
    for u, z, h in ((0.30, 0.995, 0.050), (0.335, 0.990, 0.040)):
        path = np.array([surf_at(u, zz, 0.0045) for zz in np.linspace(z, z - h, 6)])
        tags.append(strap_path(path, 0.022, 0.003))
    out['CoatTags'] = HS.hard_mesh(tags, 'red', bevel=0.0005, angle=35, outline_w=0.6)
    return out


def harness():
    """Black harness block on the back of the belt with a ladder of short
    vertical straps hanging below it."""
    from outfit import belt_z
    zc = belt_z(PCX) - 0.010
    items = []
    # block: plate following the skirt, as wide as the back band
    sxs = np.linspace(-BAND - 0.010, BAND + 0.010, 21)
    path = surf_sx(sxs, np.full_like(sxs, zc), 0.0080)
    items.append(_curved_plate(path, np.array([radial(p) for p in path]), 0.044, 0.007))
    # ladder: 4 short straps on the band, a cross bar near their ends
    for sx in (-0.052, -0.018, 0.018, 0.052):
        zz = np.linspace(zc - 0.015, LADDER_Z - 0.012, 14)
        path = surf_sx(np.full_like(zz, sx), zz, 0.0042)
        items.append(strap_path(path, 0.015, 0.0028))
    zb = LADDER_Z + 0.022
    sxs = np.linspace(-0.066, 0.066, 17)
    bar = surf_sx(sxs, np.full_like(sxs, zb), 0.0068)
    items.append(_curved_plate(bar, np.array([radial(p) for p in bar]), 0.011, 0.0026))
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

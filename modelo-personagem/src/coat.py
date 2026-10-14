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

# front opening, traced on the reference (fold line of the lapels / front
# edges).  Her right is on the viewer's left.
OPEN_R = [(323, 150), (322, 190), (316, 199), (305, 211), (295, 225), (289, 240),
          (285, 262), (283, 300), (282, 340), (281, 380), (280, 430)]
OPEN_L = [(347, 150), (347, 190), (349, 203), (356, 216), (363, 231), (370, 246),
          (375, 262), (377, 300), (378, 340), (379, 380), (380, 430)]
OPENING = OPEN_R + OPEN_L[::-1]
# narrow front panels below the bust
STRIP_R = [(258, 250), (292, 250), (285, 262), (283, 300), (282, 340), (281, 380),
           (281, 430), (254, 430), (256, 340), (259, 300)]
STRIP_L = [(370, 246), (402, 246), (402, 300), (403, 340), (404, 380), (405, 430),
           (380, 430), (379, 380), (378, 340), (377, 300), (375, 262)]


def torso_front_y(P):
    """Signed distance in front of the torso's frontal plane (rotated
    torso frame); negative = in front."""
    z = np.clip(P[..., 2], 0.93, 1.40)
    cx, cy = _TORSO.prof('cx', z), _TORSO.prof('cy', z)
    r = np.radians(_TORSO.prof('rot', z))
    return -(P[..., 0] - cx) * np.sin(r) + (P[..., 1] - cy) * np.cos(r)


def torso_lateral(P):
    z = np.clip(P[..., 2], 0.93, 1.40)
    cx, cy = _TORSO.prof('cx', z), _TORSO.prof('cy', z)
    r = np.radians(_TORSO.prof('rot', z))
    return (P[..., 0] - cx) * np.cos(r) + (P[..., 1] - cy) * np.sin(r)


def neck_axis_r(P):
    nb, nt = J['neck_base'], J['neck_top']
    a = (nt - nb) / np.linalg.norm(nt - nb)
    q = P - nb
    t = q @ a
    return np.linalg.norm(q - t[..., None] * a, axis=-1)


def arm_cut(side, s0, rad=0.050):
    """> 0 inside the sleeve region of an arm (beyond the armhole)."""
    sh, el = J['shoulder_' + side], J['elbow_' + side]
    ax = (el - sh) / np.linalg.norm(el - sh)
    p0 = sh + ax * s0

    def m(P):
        q = P - p0
        t = q @ ax
        r = np.linalg.norm(q - t[..., None] * ax, axis=-1)
        return np.minimum(t, rad - r)
    return m


_JACKET_GRID = None


def jacket_grid():
    """Field of the jacket mid-surface (level 0): body offset, with the
    front draping straight down from the bust."""
    global _JACKET_GRID
    if _JACKET_GRID is not None:
        return _JACKET_GRID
    lo, hi = [-0.20, -0.19, 0.99], [0.23, 0.14, 1.47]
    h = 0.0018
    g = Grid(lo, hi, h)
    g.union(B.torso(), 0.0)
    for b in B.breasts():
        g.union(b, 0.02)
    gd = g.copy()                         # torso + bust only: drapes
    for p in B.shoulders():
        g.union(p, 0.03)
    for gl in B.glutes():
        g.union(gl, 0.03)
    # drape: cloth falls straight down from the widest point of the bust
    dd = np.minimum.accumulate(gd.d[:, :, ::-1], axis=2)[:, :, ::-1]
    gd.d = dd

    def blend(d, P):
        fy = torso_front_y(P)
        lat = np.abs(torso_lateral(P))
        w = (1 - sstep(fy, -0.045, -0.015)) * (1 - sstep(lat, 0.085, 0.115))
        w = w * (1 - sstep(P[..., 2], 1.30, 1.34))
        return d
    D = gd.d
    full = tuple(slice(0, n) for n in g.shape)
    for s in g._iter_chunks(full):
        P = g.points(s)
        fy = torso_front_y(P)
        lat = np.abs(torso_lateral(P))
        w = (1 - sstep(fy, -0.040, -0.010)) * (1 - sstep(lat, 0.080, 0.110))
        w = w * (1 - sstep(P[..., 2], 1.29, 1.33))
        drape = D[s] + (1 - w) * 0.05
        g.d[s] = np.minimum(g.d[s], drape).astype(np.float32) - COAT_OFF
    _JACKET_GRID = g
    return g


def front_depth(g):
    """Height map y_front(x, z): first surface crossing seen from the front
    (orthographic approximation of the reference camera)."""
    inside = g.d < 0
    hit = inside.any(axis=1)
    iy = np.argmax(inside, axis=1).astype(np.float64)
    ys = g.axis(1)
    yf = np.where(hit, g.lo[1] + iy * g.h, 10.0)
    from scipy.ndimage import map_coordinates

    def f(P):
        ix = (P[..., 0] - g.lo[0]) / g.h
        iz = (P[..., 2] - g.lo[2]) / g.h
        return map_coordinates(yf, np.stack([ix.ravel(), iz.ravel()]), order=1,
                               mode='nearest').reshape(P.shape[:-1])
    return f


def jacket_keep(P, yfront):
    """< 0 where the jacket exists."""
    z = P[..., 2]
    fy = torso_front_y(P)
    vis = P[..., 1] - (yfront(P) + 0.012)          # < 0: seen from the front
    neck = np.where(z > 1.355, 0.052 - neck_axis_r(P), -1.0)
    op = poly_mask(OPENING)(P)
    opening = np.minimum(-op, -np.maximum(fy + 0.01, vis))
    arms = np.maximum(arm_cut('R', 0.010)(P), arm_cut('L', 0.012)(P))
    strip = np.minimum(poly_mask(STRIP_R)(P), poly_mask(STRIP_L)(P))
    strip = np.maximum(strip, fy + 0.005)
    hem = np.minimum(HEM_Z - z, np.maximum(strip, STRIP_Z - z))
    return np.maximum.reduce([neck, opening, arms, hem])


def jacket():
    g = jacket_grid()
    v, f = g.mesh(0.0)
    yfront = front_depth(g)
    v, f = clip_mesh(v, f, jacket_keep(v, yfront))
    v, f = largest_components(v, f, min_frac=0.02)
    f = orient_outward(v, f, jacket_centre)
    # turned-out red facing along the front opening: its own object that
    # tucks 1.5 mm under the white edge (the white part gets decimated)
    op = poly_mask(OPENING)(v) / S                 # px, > 0 outside opening
    front = (torso_front_y(v) < 0.0) & (v[:, 1] < yfront(v) + 0.012)
    vw, fw = clip_mesh(v, f, np.where(front, 2.6 - op, -1.0))
    vr, fr = clip_mesh(v, f, np.where(front, op - 3.4, 1.0))
    vr = vr - vertex_normals(vr, fr) * 0.0005
    return {'Coat': cloth(vw, fw, ['coat'] * len(fw), COAT_T, decimate=24000),
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


# ------------------------------------------------------------ build

def build():
    d = {}
    d.update(jacket())
    return d

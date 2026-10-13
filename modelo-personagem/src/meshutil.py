"""Mesh helpers shared by the part builders (pure numpy)."""

import numpy as np


class MeshData:
    """Triangle / quad mesh with per-face material names and optional UVs."""

    def __init__(self, verts, faces, mat='default', uv=None, smooth=True,
                 subsurf=0, outline=True, mats=None, decimate=0, outline_w=1.0, props=None):
        self.verts = np.asarray(verts, dtype=np.float64)
        self.faces = faces            # list of index lists or (N,k) array
        if mats is None:
            mats = [mat] * len(faces)
        self.mats = list(mats)        # material name per face
        self.uv = uv                  # (V,2) per vertex uv or None
        self.smooth = smooth
        self.subsurf = subsurf
        self.outline = outline
        self.decimate = decimate      # target face count (0 = keep)
        self.outline_w = outline_w    # outline width multiplier
        self.props = props or {}      # free-form flags for the Blender side

    @property
    def nf(self):
        return len(self.faces)


def merge(meshes, **kw):
    verts, faces, mats = [], [], []
    off = 0
    for m in meshes:
        verts.append(m.verts)
        for f in m.faces:
            faces.append([int(i) + off for i in f])
        mats += m.mats
        off += len(m.verts)
    first = meshes[0]
    args = dict(smooth=first.smooth, subsurf=first.subsurf, outline=first.outline,
                decimate=first.decimate, outline_w=first.outline_w, props=first.props)
    args.update(kw)
    return MeshData(np.concatenate(verts), faces, mats=mats, **args)


def face_centers(verts, faces):
    faces = np.asarray(faces)
    return verts[faces].mean(axis=1)


def face_normals(verts, faces):
    faces = np.asarray(faces)
    a, b, c = verts[faces[:, 0]], verts[faces[:, 1]], verts[faces[:, 2]]
    n = np.cross(b - a, c - a)
    return n / np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-12)


def catmull(points, n):
    """Centripetal-ish Catmull-Rom through points -> n samples (with tangents)."""
    from scipy.interpolate import CubicSpline
    P = np.asarray(points, dtype=np.float64)
    d = np.linalg.norm(np.diff(P, axis=0), axis=1)
    t = np.concatenate([[0], np.cumsum(np.sqrt(np.maximum(d, 1e-9)))])
    t /= t[-1]
    cs = CubicSpline(t, P, bc_type='natural')
    # resample uniformly by arc length
    tt = np.linspace(0, 1, n * 8)
    pp = cs(tt)
    seg = np.linalg.norm(np.diff(pp, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    s /= s[-1]
    ts = np.interp(np.linspace(0, 1, n), s, tt)
    pts = cs(ts)
    tan = cs(ts, 1)
    tan /= np.linalg.norm(tan, axis=1, keepdims=True)
    return pts, tan


def loft_tube(centers, tangents, outs, widths, thicks, n_ring=10,
              cap_start=True, cap_end=True, shape=None):
    """Loft a tube with elliptical (lens) cross sections along a curve.

    ``outs`` are unit vectors giving the "thin" direction per sample.
    widths / thicks are the half sizes along the binormal / out direction."""
    V, Fc = [], []
    n = len(centers)
    phis = np.linspace(0, 2 * np.pi, n_ring, endpoint=False)
    for i in range(n):
        T = tangents[i]
        N = outs[i] - T * np.dot(outs[i], T)
        N /= max(np.linalg.norm(N), 1e-9)
        B = np.cross(T, N)
        for ph in phis:
            cw, sw = np.cos(ph), np.sin(ph)
            if shape is not None:
                cw, sw = shape(ph)
            V.append(centers[i] + B * widths[i] * cw + N * thicks[i] * sw)
    for i in range(n - 1):
        for j in range(n_ring):
            a = i * n_ring + j
            b = i * n_ring + (j + 1) % n_ring
            c = (i + 1) * n_ring + (j + 1) % n_ring
            d = (i + 1) * n_ring + j
            Fc.append([a, d, c, b])
    V = list(V)
    if cap_start:
        V.append(centers[0])
        ci = len(V) - 1
        for j in range(n_ring):
            Fc.append([ci, j, (j + 1) % n_ring])
    if cap_end:
        V.append(centers[-1])
        ci = len(V) - 1
        base = (n - 1) * n_ring
        for j in range(n_ring):
            Fc.append([ci, base + (j + 1) % n_ring, base + j])
    return np.array(V), Fc


def grid_surface(P, closed_u=False):
    """Quad faces for a (nv, nu) grid of points P[v, u]."""
    nv, nu = P.shape[:2]
    V = P.reshape(-1, 3)
    F = []
    for i in range(nv - 1):
        for j in range(nu - (0 if closed_u else 1)):
            j2 = (j + 1) % nu
            F.append([i * nu + j, i * nu + j2, (i + 1) * nu + j2, (i + 1) * nu + j])
    return V, F


def polygon_sd(px, pz, poly):
    """Signed distance (negative inside) to a 2D polygon, vectorised."""
    poly = np.asarray(poly, dtype=np.float64)
    n = len(poly)
    d = np.full(px.shape, np.inf)
    s = np.ones(px.shape)
    for i in range(n):
        ax, az = poly[i - 1]
        bx, bz = poly[i]
        ex, ez = bx - ax, bz - az
        wx, wz = px - ax, pz - az
        t = np.clip((wx * ex + wz * ez) / (ex * ex + ez * ez), 0, 1)
        dx, dz = wx - ex * t, wz - ez * t
        d = np.minimum(d, dx * dx + dz * dz)
        c1 = pz >= az
        c2 = pz < bz
        c3 = ex * wz > ez * wx
        flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
        s = np.where(flip, -s, s)
    return s * np.sqrt(d)


def clip_mesh(V, F, s):
    """Keep the part of a triangle mesh where s < 0, cutting triangles along
    the zero level of s (linear interpolation on edges).  Returns (V, F)."""
    V = np.asarray(V, dtype=np.float64)
    F = np.asarray(F, dtype=np.int64)
    s = np.asarray(s, dtype=np.float64)
    # keep vertices away from the exact cut to avoid slivers
    s = np.where(np.abs(s) < 1e-4, np.where(s < 0, -1e-4, 1e-4), s)
    inside = s < 0
    k = inside[F].sum(axis=1)
    keep = F[k == 3]
    cross = (k == 1) | (k == 2)
    Fc = F[cross]
    kc = k[cross]
    ins = inside[Fc]
    odd = np.where((kc == 1)[:, None], ins, ~ins)
    r = np.argmax(odd, axis=1)
    idx = (r[:, None] + np.arange(3)[None, :]) % 3
    T = np.take_along_axis(Fc, idx, axis=1)
    a, b, c = T[:, 0], T[:, 1], T[:, 2]
    # crossing edges (a,b) and (a,c)
    e = np.concatenate([np.stack([a, b], 1), np.stack([a, c], 1)])
    es = np.sort(e, axis=1)
    ue, inv = np.unique(es, axis=0, return_inverse=True)
    inv = inv.ravel()
    i, j = ue[:, 0], ue[:, 1]
    t = s[i] / (s[i] - s[j])
    newV = V[i] + (V[j] - V[i]) * t[:, None]
    base = len(V)
    pab = base + inv[:len(a)]
    pac = base + inv[len(a):]
    one = kc[:] == 1
    tri1 = np.stack([a[one], pab[one], pac[one]], 1)
    two = ~one
    tri2 = np.stack([pab[two], b[two], c[two]], 1)
    tri3 = np.stack([pab[two], c[two], pac[two]], 1)
    Fo = np.concatenate([keep, tri1, tri2, tri3])
    Vo = np.concatenate([V, newV])
    return clean_mesh(Vo, Fo)


def clean_mesh(V, F, weld=2e-5, min_area=1e-11):
    """Weld nearly coincident vertices, drop degenerate triangles and
    unused vertices."""
    V = np.asarray(V, dtype=np.float64)
    F = np.asarray(F, dtype=np.int64)
    key = np.round(V / weld).astype(np.int64)
    _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
    inv = inv.ravel()
    F = inv[F]
    V = V[first]
    ok = (F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])
    F = F[ok]
    a = 0.5 * np.linalg.norm(np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]]), axis=1)
    F = F[a > min_area]
    used = np.unique(F)
    remap = np.full(len(V), -1, dtype=np.int64)
    remap[used] = np.arange(len(used))
    return V[used], remap[F]

"""Hard-surface primitives as explicit polygon meshes (pure numpy).

Marching cubes rounds every edge, which makes buckles, armour plates,
soles and swords read as soft clay.  These helpers build crisp polygon
meshes instead; in Blender they get a small Bevel (harden normals) and sharp
edges by angle, see ``scene.finish_object`` and the ``hard`` props.

Conventions
-----------
* A *frame* is (origin, R) with R a 3x3 matrix whose columns are the local
  x, y, z axes in world space.  ``frame_from(x=..., z=...)`` builds one.
* Faces may be n-gons (lists of indices), counter-clockwise seen from the
  outside so normals point outwards.
* Every builder returns (V, F) and ``hard_mesh`` wraps it into MeshData.
"""

import numpy as np

from meshutil import MeshData


# ------------------------------------------------------------------ frames

def normalize(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.linalg.norm(v)


def frame_from(x=None, y=None, z=None):
    """Orthonormal frame from two of the three axes (the first given is kept
    exactly, the second is orthogonalised)."""
    if x is not None and z is not None:
        x = normalize(x)
        y = normalize(np.cross(z, x))
        z = np.cross(x, y)
    elif x is not None and y is not None:
        x = normalize(x)
        z = normalize(np.cross(x, y))
        y = np.cross(z, x)
    elif y is not None and z is not None:
        z = normalize(z)
        x = normalize(np.cross(y, z))
        y = np.cross(z, x)
    else:
        raise ValueError('give two axes')
    return np.stack([x, y, z], axis=1)


def place(V, origin, R):
    return np.asarray(V, dtype=np.float64) @ np.asarray(R).T + np.asarray(origin, dtype=np.float64)


# ------------------------------------------------------------------ 2D profiles

def polygon_area(P):
    P = np.asarray(P, dtype=np.float64)
    x, y = P[:, 0], P[:, 1]
    return 0.5 * np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y)


def ccw(P):
    P = np.asarray(P, dtype=np.float64)
    return P if polygon_area(P) > 0 else P[::-1]


def rounded_rect(w, h, r, seg=4, center=(0.0, 0.0)):
    """Rectangle w x h with corner radius r (CCW)."""
    r = min(r, w / 2 - 1e-6, h / 2 - 1e-6)
    cx, cy = center
    pts = []
    corners = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90),
               (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]
    for x0, y0, a0 in corners:
        for k in range(seg + 1):
            a = np.radians(a0 + 90 * k / seg)
            pts.append((cx + x0 + r * np.cos(a), cy + y0 + r * np.sin(a)))
    return np.array(pts)


def circle(r, seg=24, center=(0.0, 0.0)):
    a = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    return np.stack([center[0] + r * np.cos(a), center[1] + r * np.sin(a)], axis=1)


def chamfer_rect(w, h, c):
    """Rectangle with 45 degree chamfered corners (CCW)."""
    return np.array([(w / 2 - c, h / 2), (-w / 2 + c, h / 2), (-w / 2, h / 2 - c),
                     (-w / 2, -h / 2 + c), (-w / 2 + c, -h / 2), (w / 2 - c, -h / 2),
                     (w / 2, -h / 2 + c), (w / 2, h / 2 - c)])


# ------------------------------------------------------------------ solids

def prism(poly, depth, origin=(0, 0, 0), R=np.eye(3), z0=None):
    """Extrude a simple 2D polygon (local x, y) along local z.

    The solid spans z in [z0, z0 + depth] (default centred)."""
    P = ccw(poly)
    n = len(P)
    z0 = -depth / 2 if z0 is None else z0
    bot = np.c_[P, np.full(n, z0)]
    top = np.c_[P, np.full(n, z0 + depth)]
    V = np.concatenate([bot, top])
    F = [list(range(n))[::-1], list(range(n, 2 * n))]
    for i in range(n):
        j = (i + 1) % n
        F.append([i, j, n + j, n + i])
    return place(V, origin, R), F


def frame_prism(outer, inner, depth, origin=(0, 0, 0), R=np.eye(3)):
    """Extruded ring between two 2D loops with the same vertex count
    (e.g. a buckle frame: rounded_rect outer and inner)."""
    O = ccw(outer)
    I = ccw(inner)
    n = len(O)
    assert len(I) == n
    z0, z1 = -depth / 2, depth / 2
    V = np.concatenate([np.c_[O, np.full(n, z0)], np.c_[O, np.full(n, z1)],
                        np.c_[I, np.full(n, z0)], np.c_[I, np.full(n, z1)]])
    ob, ot, ib, it = 0, n, 2 * n, 3 * n
    F = []
    for i in range(n):
        j = (i + 1) % n
        F.append([ob + i, ob + j, ot + j, ot + i])          # outer wall
        F.append([ib + j, ib + i, it + i, it + j])          # inner wall
        F.append([ot + i, ot + j, it + j, it + i])          # top
        F.append([ob + j, ob + i, ib + i, ib + j])          # bottom
    return place(V, origin, R), F


def box(size, origin=(0, 0, 0), R=np.eye(3)):
    w, h, d = size
    return prism([(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)], d, origin, R)


def lathe(profile, seg=32, origin=(0, 0, 0), R=np.eye(3), a0=0.0, a1=2 * np.pi):
    """Revolve a (r, z) profile around local z.  Rings with r == 0 collapse
    to a single vertex.  The profile should run bottom -> top along the
    outside so normals point out."""
    prof = np.asarray(profile, dtype=np.float64)
    full = abs((a1 - a0) - 2 * np.pi) < 1e-9
    ang = np.linspace(a0, a1, seg, endpoint=not full)
    m = len(ang)
    V, idx = [], []
    for r, z in prof:
        if r < 1e-9:
            V.append((0.0, 0.0, z))
            idx.append([len(V) - 1] * m)
        else:
            row = []
            for a in ang:
                V.append((r * np.cos(a), r * np.sin(a), z))
                row.append(len(V) - 1)
            idx.append(row)
    F = []
    for k in range(len(prof) - 1):
        A, B = idx[k], idx[k + 1]
        for i in range(m if full else m - 1):
            j = (i + 1) % m
            q = [A[i], A[j], B[j], B[i]]
            q = [v for t, v in enumerate(q) if v not in q[:t]]
            if len(q) >= 3:
                F.append(q)
    return place(np.array(V), origin, R), F


def cylinder(r, h, seg=24, origin=(0, 0, 0), R=np.eye(3), z0=None):
    z0 = -h / 2 if z0 is None else z0
    return lathe([(0, z0), (r, z0), (r, z0 + h), (0, z0 + h)], seg, origin, R)


def sweep(profile, path, up, closed_profile=True, caps=True):
    """Sweep a 2D profile (local x = side, y = up) along a 3D path."""
    P = ccw(profile)
    path = np.asarray(path, dtype=np.float64)
    n, m = len(path), len(P)
    tan = np.gradient(path, axis=0)
    tan /= np.linalg.norm(tan, axis=1, keepdims=True)
    up = np.asarray(up, dtype=np.float64)
    if up.ndim == 1:
        up = np.tile(up, (n, 1))
    V = []
    for i in range(n):
        u = up[i] - tan[i] * np.dot(up[i], tan[i])
        u /= np.linalg.norm(u)
        s = np.cross(u, tan[i])
        for x, y in P:
            V.append(path[i] + s * x + u * y)
    F = []
    for i in range(n - 1):
        for k in range(m):
            j = (k + 1) % m
            F.append([i * m + k, (i + 1) * m + k, (i + 1) * m + j, i * m + j])
    if caps:
        F.append(list(range(m))[::-1])
        F.append([(n - 1) * m + k for k in range(m)])
    return np.array(V), F


def merge_vf(items):
    V, F, off = [], [], 0
    for v, f in items:
        V.append(np.asarray(v))
        F += [[int(i) + off for i in face] for face in f]
        off += len(v)
    return np.concatenate(V), F


def hard_mesh(items, mat, bevel=0.0008, segments=2, angle=30.0, outline_w=0.7, **kw):
    """Wrap one or more (V, F) parts as a hard-surface MeshData."""
    if isinstance(items, tuple):
        items = [items]
    V, F = merge_vf(items)
    props = {'hard': True, 'bevel': bevel, 'bevel_seg': segments, 'sharp_angle': angle,
             'recalc': True}
    props.update(kw.pop('props', {}))
    return MeshData(V, F, mat=mat, outline_w=outline_w, props=props, **kw)

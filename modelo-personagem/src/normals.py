"""Custom split normals for clean toon shading (run inside Blender).

* ``smooth``: the vertex normal field is diffused over the mesh graph, which
  removes the small bumps marching cubes / decimation leave behind.  Toon
  shading turns every bump into a blotch, so this matters a lot.
* ``face``: the face takes the normals of a simple ellipsoid (a common trick
  in anime models) so the light/shadow split on the face stays clean.
"""

import numpy as np
import scipy.sparse as sp


def _arrays(me):
    nv = len(me.vertices)
    co = np.zeros(nv * 3, dtype=np.float64)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    ne = len(me.edges)
    ev = np.zeros(ne * 2, dtype=np.int64)
    me.edges.foreach_get('vertices', ev)
    ev = ev.reshape(-1, 2)
    vn = np.zeros(nv * 3, dtype=np.float64)
    me.vertices.foreach_get('normal', vn)
    return co, ev, vn.reshape(-1, 3)


def diffuse(values, ev, n, iters, lam=0.5):
    """Laplacian smoothing of per-vertex vectors over the edge graph."""
    i, j = ev[:, 0], ev[:, 1]
    A = sp.coo_matrix((np.ones(len(i) * 2), (np.r_[i, j], np.r_[j, i])), shape=(n, n)).tocsr()
    deg = np.asarray(A.sum(axis=1)).ravel()
    deg[deg == 0] = 1
    v = values.copy()
    for _ in range(iters):
        avg = (A @ v) / deg[:, None]
        v = v * (1 - lam) + avg * lam
        v /= np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-9)
    return v


def apply(ob, mode, iters=8, face=None):
    me = ob.data
    co, ev, vn = _arrays(me)
    if mode in ('smooth', 'face'):
        nrm = diffuse(vn, ev, len(co), iters)
    else:
        return
    if mode == 'face' and face is not None:
        c, r, w_fn = face
        g = (co - c) / (r * r)
        g /= np.linalg.norm(g, axis=1, keepdims=True)
        w = np.clip(w_fn(co), 0, 1)[:, None]
        nrm = nrm * (1 - w) + g * w
        nrm = diffuse(nrm, ev, len(co), 3, lam=0.4)
    nrm /= np.linalg.norm(nrm, axis=1, keepdims=True)
    me.normals_split_custom_set_from_vertices([tuple(x) for x in nrm])

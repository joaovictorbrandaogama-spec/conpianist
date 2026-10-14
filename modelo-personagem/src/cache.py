"""Save / load MeshData lists as .npz files (one file per part)."""

import os
import json
import numpy as np

from meshutil import MeshData

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(os.path.dirname(HERE), 'cache')


def save(name, objects):
    """objects: dict object_name -> MeshData"""
    os.makedirs(CACHE, exist_ok=True)
    arrays = {}
    meta = {}
    for oname, m in objects.items():
        if isinstance(m.faces, np.ndarray):
            counts = np.full(len(m.faces), m.faces.shape[1], dtype=np.int32)
            flat = m.faces.ravel().astype(np.int64)
        else:
            counts = np.array([len(f) for f in m.faces], dtype=np.int32)
            flat = np.fromiter((i for f in m.faces for i in f), dtype=np.int64,
                               count=int(counts.sum()))
        names = sorted(set(m.mats))
        idx = {n: i for i, n in enumerate(names)}
        arrays[oname + '__v'] = m.verts.astype(np.float32)
        arrays[oname + '__c'] = counts
        arrays[oname + '__f'] = flat
        arrays[oname + '__m'] = np.array([idx[n] for n in m.mats], dtype=np.int16)
        if m.uv is not None:
            arrays[oname + '__uv'] = np.asarray(m.uv, dtype=np.float32)
        if getattr(m, 'normals', None) is not None:
            arrays[oname + '__n'] = np.asarray(m.normals, dtype=np.float32)
        meta[oname] = dict(mats=names, smooth=m.smooth, subsurf=m.subsurf,
                           outline=m.outline, decimate=m.decimate,
                           outline_w=m.outline_w, props=m.props)
    arrays['__meta'] = np.frombuffer(json.dumps(meta).encode(), dtype=np.uint8)
    np.savez_compressed(os.path.join(CACHE, name + '.npz'), **arrays)


def load(name):
    z = np.load(os.path.join(CACHE, name + '.npz'))
    meta = json.loads(bytes(z['__meta']).decode())
    out = {}
    for oname, md in meta.items():
        counts = z[oname + '__c']
        flat = z[oname + '__f']
        starts = np.concatenate([[0], np.cumsum(counts)[:-1]])
        mi = z[oname + '__m']
        uv = z[oname + '__uv'] if (oname + '__uv') in z else None
        nrm = z[oname + '__n'] if (oname + '__n') in z else None
        out[oname] = dict(verts=z[oname + '__v'], counts=counts, flat=flat, normals=nrm,
                          starts=starts, mat_index=mi, mats=md['mats'], uv=uv,
                          smooth=md['smooth'], subsurf=md['subsurf'],
                          outline=md['outline'], decimate=md.get('decimate', 0),
                          outline_w=md.get('outline_w', 1.0), props=md.get('props', {}))
    return out


def available():
    if not os.path.isdir(CACHE):
        return []
    return sorted(f[:-4] for f in os.listdir(CACHE) if f.endswith('.npz') and not f.endswith('.dec.npz'))

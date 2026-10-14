"""Part builders.  Each returns {object_name: MeshData}."""

import numpy as np

import sdf
from sdf import Grid
from meshutil import MeshData
import body as B

BUILDERS = {}


def builder(fn):
    BUILDERS[fn.__name__] = fn
    return fn


def mesh_grid(g, mat, **kw):
    v, f = g.mesh()
    return MeshData(v, f, mat=mat, **kw)


# ------------------------------------------------------------------ body

_BODY_GRID = None


def body_grid(h=0.002):
    """Body SDF sampled on a grid (cached in memory for clothing builders)."""
    global _BODY_GRID
    if _BODY_GRID is not None and abs(_BODY_GRID.h - h) < 1e-9:
        return _BODY_GRID
    g = Grid([-0.25, -0.30, 0.08], [0.30, 0.16, 1.52], h)
    for prim, k in B.body_sdf_parts():
        g.union(prim, k)
    for prim, k in B.body_sdf_ops():
        g.subtract(prim, k)
    _BODY_GRID = g
    return g


@builder
def body():
    g = body_grid()
    return {'Body': mesh_grid(g, 'skin', decimate=90000, props={'normals': 'smooth'})}


@builder
def head():
    g = Grid([-0.07, -0.10, 1.44], [0.09, 0.12, 1.68], 0.001)
    for prim, k in B.head_sdf_parts():
        g.union(prim, k)
    v, f = g.mesh()
    # UVs: planar front projection, assigned in Blender after decimation
    return {'Head': MeshData(v, f, mat='face', decimate=45000,
                             props={'uv': 'face_proj', 'normals': 'face'})}


@builder
def hair():
    import hair as H
    return H.build()


@builder
def top():
    import outfit as O
    d = {}
    d.update(O.bikini())
    d.update(O.collar())
    d.update(O.coat_collar())
    return d


@builder
def hips():
    import outfit as O
    d = {}
    d.update(O.shorts())
    d.update(O.thigh_strap())
    return d


@builder
def coat():
    import outfit as O
    return O.coat()


@builder
def arms():
    import outfit as O
    d = {}
    d.update(O.sleeves())
    d.update(O.rings())
    return d


@builder
def legs():
    import outfit as O
    d = {}
    d.update(O.leg_armor())
    d.update(O.boots())
    return d


@builder
def hands():
    import hands as Hd
    return Hd.hands()


@builder
def props():
    import props as Pr
    return Pr.build()


@builder
def swords():
    import props as Pr
    return Pr.build_swords()

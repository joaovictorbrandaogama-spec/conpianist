"""Toon shading v2 for EEVEE plus per-vertex contact occlusion.

* The light is a direction fixed relative to the camera (as in Guilty Gear
  Xrd / the web viewer), not a scene lamp, so every view is lit the same
  flattering way.  ``set_light(camera)`` updates it before each render.
* Three tones per material: lit, shade 1 (designed hue-shifted shadow) and
  shade 2 (contact / deep occlusion).
* Occlusion comes from a colour attribute ``_CTRL`` (R = occlusion 0..1)
  computed by ray casting against the whole character (``bake_ao``), so
  contact areas (under the chin, inside the collar, under bangs and belts)
  get crisp shadows instead of none.
* Specular is a hard band, only where a material asks for it.
"""

import colorsys
import math
import os

import bpy
import numpy as np

import materials as M

L_VIEW = np.array([-0.42, 0.62, 0.66])
L_VIEW = L_VIEW / np.linalg.norm(L_VIEW)
GROUP = 'ToonShade2'


def _hex_rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def _rgb_hex(c):
    return '#' + ''.join('%02X' % int(round(min(max(v, 0), 1) * 255)) for v in c)


def shade2_of(shadow_hex):
    """Deeper shadow: darker and a little more saturated than shade 1."""
    r, g, b = _hex_rgb(shadow_hex)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return _rgb_hex(colorsys.hls_to_rgb(h, l * 0.80, min(1.0, s * 1.15 + 0.03)))


def _group():
    if GROUP in bpy.data.node_groups:
        return bpy.data.node_groups[GROUP]
    g = bpy.data.node_groups.new(GROUP, 'ShaderNodeTree')
    io = g.interface
    for name, st in (('Color', 'NodeSocketColor'), ('Shade1', 'NodeSocketColor'),
                     ('Shade2', 'NodeSocketColor'), ('Threshold', 'NodeSocketFloat'),
                     ('Spec', 'NodeSocketFloat'), ('SpecColor', 'NodeSocketColor'),
                     ('Gloss', 'NodeSocketFloat'), ('Rim', 'NodeSocketFloat'),
                     ('LightDir', 'NodeSocketVector'), ('AO', 'NodeSocketFloat')):
        io.new_socket(name, in_out='INPUT', socket_type=st)
    io.new_socket('Shader', in_out='OUTPUT', socket_type='NodeSocketShader')
    N, L = g.nodes, g.links
    gi = N.new('NodeGroupInput')
    go = N.new('NodeGroupOutput')
    geo = N.new('ShaderNodeNewGeometry')

    def math_(op, a=None, b=None, clamp=False):
        n = N.new('ShaderNodeMath')
        n.operation = op
        n.use_clamp = clamp
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                n.inputs[i].default_value = v
            else:
                L.new(v, n.inputs[i])
        return n.outputs[0]

    def vmath(op, a, b=None):
        n = N.new('ShaderNodeVectorMath')
        n.operation = op
        L.new(a, n.inputs[0])
        if b is not None:
            L.new(b, n.inputs[1])
        return n.outputs['Value'] if op == 'DOT_PRODUCT' else n.outputs['Vector']

    def sstep(v, lo, hi):
        n = N.new('ShaderNodeMapRange')
        n.interpolation_type = 'SMOOTHSTEP'
        L.new(v, n.inputs['Value'])
        for key, x in (('From Min', lo), ('From Max', hi)):
            if isinstance(x, (int, float)):
                n.inputs[key].default_value = x
            else:
                L.new(x, n.inputs[key])
        return n.outputs[0]

    def mix(fac, a, b):
        n = N.new('ShaderNodeMix')
        n.data_type = 'RGBA'
        L.new(fac, n.inputs['Factor'])
        L.new(a, n.inputs[6])
        L.new(b, n.inputs[7])
        return n.outputs[2]

    nrm = geo.outputs['Normal']
    ldir = vmath('NORMALIZE', gi.outputs['LightDir'])
    ndl = math_('MULTIPLY', vmath('DOT_PRODUCT', nrm, ldir), 0.955)
    lo = math_('SUBTRACT', gi.outputs['Threshold'], 0.015)
    hi = math_('ADD', gi.outputs['Threshold'], 0.015)
    lit = sstep(ndl, lo, hi)
    # occlusion from the _CTRL colour attribute (red channel)
    attr = N.new('ShaderNodeAttribute')
    attr.attribute_type = 'GEOMETRY'
    attr.attribute_name = '_CTRL'
    sep = N.new('ShaderNodeSeparateColor')
    L.new(attr.outputs['Color'], sep.inputs[0])
    occ = math_('MULTIPLY', sep.outputs[0], gi.outputs['AO'])
    contact = math_('SUBTRACT', 1.0, sstep(occ, 0.42, 0.52))
    litc = math_('MULTIPLY', lit, contact)
    deep = sstep(occ, 0.66, 0.78)
    col = mix(litc, gi.outputs['Shade1'], gi.outputs['Color'])
    col = mix(deep, col, gi.outputs['Shade2'])
    # hard specular band
    h = vmath('NORMALIZE', vmath('ADD', ldir, geo.outputs['Incoming']))
    nh = math_('MAXIMUM', vmath('DOT_PRODUCT', nrm, h), 0.0)
    shin = math_('SUBTRACT', 160.0, math_('MULTIPLY', math_('MULTIPLY', gi.outputs['Gloss'], 2.5, clamp=True), 148.0))
    sp = math_('POWER', nh, shin)
    spec = math_('MULTIPLY', math_('MULTIPLY', sstep(sp, 0.45, 0.60), gi.outputs['Spec']), litc)
    # thin rim on the lit side (only materials with Rim > 0)
    facing = math_('SUBTRACT', 1.0, math_('ABSOLUTE', vmath('DOT_PRODUCT', nrm, geo.outputs['Incoming'])))
    rim = math_('MULTIPLY', math_('MULTIPLY', sstep(facing, 0.58, 0.68), gi.outputs['Rim']), litc)
    hl = math_('ADD', spec, rim, clamp=True)
    col = mix(hl, col, gi.outputs['SpecColor'])
    em = N.new('ShaderNodeEmission')
    L.new(col, em.inputs['Color'])
    L.new(em.outputs[0], go.inputs['Shader'])
    return g


def make_toon(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    lit, shadow, outline, ex = M.PALETTE[name]
    sh2 = ex.get('shade2', shade2_of(shadow))
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    grp = nt.nodes.new('ShaderNodeGroup')
    grp.node_tree = _group()
    grp.inputs['Color'].default_value = M.hex_lin(lit)
    grp.inputs['Shade1'].default_value = M.hex_lin(shadow)
    grp.inputs['Shade2'].default_value = M.hex_lin(sh2)
    # the camera-relative light reaches fewer surfaces head-on than the old
    # sun did, so thresholds are scaled down a little
    grp.inputs['Threshold'].default_value = ex.get('thr', 0.4) * 0.7
    grp.inputs['Spec'].default_value = ex.get('spec', 0.0)
    grp.inputs['SpecColor'].default_value = M.hex_lin(ex.get('spec_col', '#FFFFFF'))
    grp.inputs['Gloss'].default_value = ex.get('gloss', 0.3)
    grp.inputs['Rim'].default_value = ex.get('rim', 0.0)
    grp.inputs['LightDir'].default_value = (0.0, -0.7, 0.7)
    grp.inputs['AO'].default_value = ex.get('ao', 1.0)
    shader = grp.outputs['Shader']
    if 'tex' in ex:
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(os.path.join(M.TEX_DIR, ex['tex']), check_existing=True)
        tex.interpolation = 'Cubic'
        nt.links.new(tex.outputs['Color'], grp.inputs['Color'])
        l = M.hex_lin(lit)
        for key, hexc in (('Shade1', shadow), ('Shade2', sh2)):
            mul = nt.nodes.new('ShaderNodeMix')
            mul.data_type = 'RGBA'
            mul.blend_type = 'MULTIPLY'
            mul.inputs['Factor'].default_value = 1.0
            nt.links.new(tex.outputs['Color'], mul.inputs[6])
            s = M.hex_lin(hexc)
            mul.inputs[7].default_value = (s[0] / l[0], s[1] / l[1], s[2] / l[2], 1)
            nt.links.new(mul.outputs[2], grp.inputs[key])
    if ex.get('emit'):
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = M.hex_lin(lit)
        shader = em.outputs[0]
    if 'alpha' in ex:
        tr = nt.nodes.new('ShaderNodeBsdfTransparent')
        mx = nt.nodes.new('ShaderNodeMixShader')
        mx.inputs[0].default_value = ex['alpha']
        nt.links.new(tr.outputs[0], mx.inputs[1])
        nt.links.new(shader, mx.inputs[2])
        shader = mx.outputs[0]
        m.surface_render_method = 'BLENDED'
    nt.links.new(shader, out.inputs['Surface'])
    m.diffuse_color = M.hex_lin(lit)
    return m


def set_light(cam_ob):
    """Point every toon material's light along the camera-relative L_VIEW."""
    bpy.context.view_layer.update()
    R = np.array(cam_ob.matrix_world.to_3x3())
    lw = R @ L_VIEW
    for m in bpy.data.materials:
        if not m.node_tree:
            continue
        for nd in m.node_tree.nodes:
            if nd.type == 'GROUP' and nd.node_tree and nd.node_tree.name == GROUP:
                nd.inputs['LightDir'].default_value = tuple(lw)


# ------------------------------------------------------------------ occlusion

def _fib_dirs(n):
    i = np.arange(n) + 0.5
    phi = np.arccos(1 - 2 * i / n)
    th = np.pi * (1 + 5 ** 0.5) * i
    return np.stack([np.cos(th) * np.sin(phi), np.sin(th) * np.sin(phi), np.cos(phi)], axis=1)


def bake_ao(objects, dist=0.05, n_dirs=24, smooth=3, log=print):
    """Write per-vertex occlusion into the ``_CTRL`` colour attribute."""
    from mathutils import Vector
    from mathutils.bvhtree import BVHTree
    import time
    t0 = time.time()
    deps = bpy.context.evaluated_depsgraph_get()
    allv, allt, off = [], [], 0
    for ob in objects:
        ev = ob.evaluated_get(deps)
        me = ev.to_mesh()
        me.calc_loop_triangles()
        nv = len(me.vertices)
        co = np.zeros(nv * 3)
        me.vertices.foreach_get('co', co)
        Mw = np.array(ob.matrix_world)
        co = co.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]
        tri = np.zeros(len(me.loop_triangles) * 3, dtype=np.int64)
        me.loop_triangles.foreach_get('vertices', tri)
        allv.append(co)
        allt.append(tri.reshape(-1, 3) + off)
        off += nv
        ev.to_mesh_clear()
    V = np.concatenate(allv)
    T = np.concatenate(allt)
    bvh = BVHTree.FromPolygons(V.tolist(), T.tolist(), all_triangles=True)
    log(f'AO: bvh {len(T)} tris in {time.time() - t0:.1f}s')
    dirs = _fib_dirs(n_dirs)
    for ob in objects:
        me = ob.data
        nv = len(me.vertices)
        co = np.zeros(nv * 3)
        me.vertices.foreach_get('co', co)
        nr = np.zeros(nv * 3)
        me.vertices.foreach_get('normal', nr)
        Mw = np.array(ob.matrix_world)
        P = co.reshape(-1, 3) @ Mw[:3, :3].T + Mw[:3, 3]
        Nn = nr.reshape(-1, 3) @ Mw[:3, :3].T
        Nn /= np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-9)
        cos = Nn @ dirs.T                     # (nv, n_dirs)
        # start rays outside the object's own Solidify thickness
        lift = float(ob.get('ao_lift', 0.0)) + 0.0015
        occ = np.zeros(nv)
        wsum = np.zeros(nv)
        rc = bvh.ray_cast
        for i in range(nv):
            p = P[i] + Nn[i] * lift
            o = Vector(p)
            acc = 0.0
            ws = 0.0
            for k in np.nonzero(cos[i] > 0.15)[0]:
                c = cos[i, k]
                ws += c
                hit = rc(o, Vector(dirs[k]), dist)
                if hit[0] is not None:
                    acc += c * (1.0 - hit[3] / dist) ** 0.5
            occ[i] = acc / ws if ws > 0 else 0.0
        if smooth:
            ne = len(me.edges)
            ev_ = np.zeros(ne * 2, dtype=np.int64)
            me.edges.foreach_get('vertices', ev_)
            ev_ = ev_.reshape(-1, 2)
            import scipy.sparse as sp
            A = sp.coo_matrix((np.ones(ne * 2), (np.r_[ev_[:, 0], ev_[:, 1]], np.r_[ev_[:, 1], ev_[:, 0]])),
                              shape=(nv, nv)).tocsr()
            deg = np.maximum(np.asarray(A.sum(axis=1)).ravel(), 1)
            for _ in range(smooth):
                occ = 0.5 * occ + 0.5 * (A @ occ) / deg
        att = me.color_attributes.get('_CTRL') or me.color_attributes.new('_CTRL', 'FLOAT_COLOR', 'POINT')
        col = np.zeros((nv, 4))
        col[:, 0] = occ
        col[:, 3] = 1.0
        att.data.foreach_set('color', col.ravel())
    log(f'AO: done in {time.time() - t0:.1f}s')

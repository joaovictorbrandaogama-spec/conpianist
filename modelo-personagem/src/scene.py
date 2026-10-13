"""Assemble the character in Blender from the cached parts and render.

    blender -b -P scene.py -- [--parts a,b] [--engine eevee|workbench]
                              [--views ref,front,side,back,three]
                              [--out DIR] [--res 1.0] [--save file.blend]
"""

import os
import sys
import math
import argparse

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import cache          # noqa: E402
import materials      # noqa: E402
from rig import S, PX0, PY0   # noqa: E402

ROOT = os.path.dirname(HERE)
materials.TEX_DIR = os.path.join(ROOT, 'textures')


def args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--parts', default='')
    ap.add_argument('--engine', default='eevee')
    ap.add_argument('--views', default='ref')
    ap.add_argument('--out', default=os.path.join(ROOT, 'renders'))
    ap.add_argument('--res', type=float, default=1.0)
    ap.add_argument('--save', default='')
    ap.add_argument('--no-outline', action='store_true')
    ap.add_argument('--samples', type=int, default=8)
    ap.add_argument('--hide', default='')
    return ap.parse_args(argv)


def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def get_collection(name):
    if name in bpy.data.collections:
        return bpy.data.collections[name]
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def make_object(name, d, coll):
    verts = d['verts']
    counts = d['counts']
    flat = d['flat']
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set('co', verts.astype(np.float32).ravel())
    me.loops.add(len(flat))
    me.loops.foreach_set('vertex_index', flat.astype(np.int32))
    me.polygons.add(len(counts))
    me.polygons.foreach_set('loop_start', d['starts'].astype(np.int32))
    me.polygons.foreach_set('material_index', d['mat_index'].astype(np.int32))
    me.polygons.foreach_set('use_smooth', np.full(len(counts), d['smooth'], dtype=bool))
    if d.get('uvl') is not None:
        uvl = me.uv_layers.new(name='UVMap')
        uvl.data.foreach_set('uv', d['uvl'].astype(np.float32).ravel())
    elif d['uv'] is not None:
        uvl = me.uv_layers.new(name='UVMap')
        uvl.data.foreach_set('uv', d['uv'][flat].astype(np.float32).ravel())
    me.update()
    me.validate(clean_customdata=False)
    ob = bpy.data.objects.new(name, me)
    coll.objects.link(ob)
    for mname in d['mats']:
        ob.data.materials.append(materials.make_toon(mname))
    return ob


def recalc_normals(ob):
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def process_mesh(ob, d):
    bpy.context.view_layer.objects.active = ob
    if d['decimate'] and len(ob.data.polygons) > d['decimate']:
        mod = ob.modifiers.new('Decimate', 'DECIMATE')
        mod.ratio = d['decimate'] / len(ob.data.polygons)
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    if d['props'].get('recalc'):
        recalc_normals(ob)
    if d['props'].get('uv') == 'face_proj':
        face_uv(ob)


def mesh_arrays(ob):
    me = ob.data
    nv, nl, npl = len(me.vertices), len(me.loops), len(me.polygons)
    co = np.zeros(nv * 3, dtype=np.float32); me.vertices.foreach_get('co', co)
    lv = np.zeros(nl, dtype=np.int64); me.loops.foreach_get('vertex_index', lv)
    ls = np.zeros(npl, dtype=np.int32); me.polygons.foreach_get('loop_start', ls)
    lt = np.zeros(npl, dtype=np.int32); me.polygons.foreach_get('loop_total', lt)
    mi = np.zeros(npl, dtype=np.int16); me.polygons.foreach_get('material_index', mi)
    out = dict(verts=co.reshape(-1, 3), flat=lv, counts=lt, starts=ls, mat_index=mi)
    if me.uv_layers:
        uv = np.zeros(nl * 2, dtype=np.float32); me.uv_layers[0].data.foreach_get('uv', uv)
        out['uvl'] = uv.reshape(-1, 2)
    return out


def load_part(n, coll):
    """Create the objects of part n, reusing decimated meshes when fresh."""
    src = os.path.join(cache.CACHE, n + '.npz')
    dec = os.path.join(cache.CACHE, n + '.dec.npz')
    data = cache.load(n)
    fresh = os.path.exists(dec) and os.path.getmtime(dec) > os.path.getmtime(src)
    obs = []
    store = {}
    z = np.load(dec) if fresh else None
    for oname, d in data.items():
        if fresh:
            dd = dict(d)
            for k in ('verts', 'flat', 'counts', 'starts', 'mat_index'):
                dd[k] = z[oname + '__' + k]
            dd['uvl'] = z[oname + '__uvl'] if (oname + '__uvl') in z else None
            dd['uv'] = None
            ob = make_object(oname, dd, coll)
        else:
            ob = make_object(oname, d, coll)
            process_mesh(ob, d)
            for k, v in mesh_arrays(ob).items():
                store[oname + '__' + k] = v
        obs.append((ob, d))
    if not fresh:
        np.savez(dec, **store)
    return obs


def smooth_by_angle_group(angle_deg=40.0):
    name = 'SmoothByAngle'
    if name in bpy.data.node_groups:
        return bpy.data.node_groups[name]
    ng = bpy.data.node_groups.new(name, 'GeometryNodeTree')
    ng.interface.new_socket('Geometry', in_out='INPUT', socket_type='NodeSocketGeometry')
    ng.interface.new_socket('Geometry', in_out='OUTPUT', socket_type='NodeSocketGeometry')
    N, L = ng.nodes, ng.links
    gi = N.new('NodeGroupInput')
    go = N.new('NodeGroupOutput')
    ea = N.new('GeometryNodeInputMeshEdgeAngle')
    cmp = N.new('FunctionNodeCompare')
    cmp.data_type = 'FLOAT'
    cmp.operation = 'LESS_THAN'
    cmp.inputs[1].default_value = math.radians(angle_deg)
    L.new(ea.outputs['Unsigned Angle'], cmp.inputs[0])
    se = N.new('GeometryNodeSetShadeSmooth')
    se.domain = 'EDGE'
    L.new(gi.outputs[0], se.inputs['Geometry'])
    L.new(cmp.outputs['Result'], se.inputs['Shade Smooth'])
    sf = N.new('GeometryNodeSetShadeSmooth')
    sf.domain = 'FACE'
    L.new(se.outputs['Geometry'], sf.inputs['Geometry'])
    L.new(sf.outputs['Geometry'], go.inputs[0])
    return ng


def finish_object(ob, d, outline=True):
    props = d['props']
    if props.get('solidify'):
        shell = props.get('shell_mat')
        off = 0
        if shell:
            names = [m.name for m in ob.data.materials]
            if shell not in names:
                ob.data.materials.append(materials.make_toon(shell))
                names.append(shell)
            off = names.index(shell)
        mod = ob.modifiers.new('Thickness', 'SOLIDIFY')
        mod.thickness = props['solidify']
        mod.offset = props.get('solid_offset', 1.0)
        mod.use_rim = True
        mod.use_even_offset = False
        mod.use_quality_normals = True
        mod.material_offset = off
        mod.material_offset_rim = 0
        gn = ob.modifiers.new('SmoothByAngle', 'NODES')
        gn.node_group = smooth_by_angle_group()
    if d['subsurf']:
        mod = ob.modifiers.new('Subsurf', 'SUBSURF')
        mod.levels = d['subsurf']
        mod.render_levels = d['subsurf']
    if outline and d['outline']:
        n = len(ob.data.materials)
        for i in range(n):
            ob.data.materials.append(materials.make_outline(ob.data.materials[i].name))
        mod = ob.modifiers.new('Outline', 'SOLIDIFY')
        mod.thickness = -0.0016 * d['outline_w']
        mod.offset = 1.0
        mod.use_flip_normals = True
        mod.use_rim = False
        mod.material_offset = n
        mod.use_even_offset = False
        mod.use_quality_normals = True


def face_uv(ob):
    """Front planar projection for the face texture; faces that do not
    look forward get a constant skin coloured texel."""
    me = ob.data
    if not me.uv_layers:
        me.uv_layers.new(name='UVMap')
    uvl = me.uv_layers[0]
    nl = len(me.loops)
    co = np.zeros(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3)
    lv = np.zeros(nl, dtype=np.int32)
    me.loops.foreach_get('vertex_index', lv)
    npoly = len(me.polygons)
    nrm = np.zeros(npoly * 3, dtype=np.float32)
    me.polygons.foreach_get('normal', nrm)
    nrm = nrm.reshape(-1, 3)
    cen = np.zeros(npoly * 3, dtype=np.float32)
    me.polygons.foreach_get('center', cen)
    cen = cen.reshape(-1, 3)
    ls = np.zeros(npoly, dtype=np.int32)
    me.polygons.foreach_get('loop_start', ls)
    lt = np.zeros(npoly, dtype=np.int32)
    me.polygons.foreach_get('loop_total', lt)
    front = (nrm[:, 1] < -0.2) & (cen[:, 1] < -0.02)
    lp = np.repeat(front, lt)
    p = co[lv]
    hx = 0.011
    uv = np.stack([(p[:, 0] - (hx - 0.075)) / 0.15, (p[:, 2] - 1.465) / 0.15], axis=1)
    uv[~lp] = (0.02, 0.98)
    uvl.data.foreach_set('uv', uv.astype(np.float32).ravel())


def ref_camera(res=1.0):
    """Perspective camera reproducing the framing of the reference image."""
    cam = bpy.data.cameras.new('RefCam')
    ob = bpy.data.objects.new('RefCam', cam)
    bpy.context.scene.collection.objects.link(ob)
    D = 5.0
    cz = 1.0
    ob.location = ((367.5 - PX0) * S, -D, cz)
    ob.rotation_euler = (math.pi / 2, 0, 0)
    cam.sensor_fit = 'VERTICAL'
    cam.sensor_height = 24.0
    span = 1030 * S
    cam.lens = D * 24.0 / span
    centre_z = (PY0 - 515) * S
    cam.shift_y = (centre_z - cz) / span
    cam.clip_start = 0.1
    cam.clip_end = 50
    return ob


def view_camera(name, yaw_deg, height=0.86, dist=5.0, span=1.95, pitch=0.0):
    cam = bpy.data.cameras.new(name)
    ob = bpy.data.objects.new(name, cam)
    bpy.context.scene.collection.objects.link(ob)
    a = math.radians(yaw_deg)
    cx, cy = 0.02, -0.03
    ob.location = (cx + dist * math.sin(a), cy - dist * math.cos(a), height)
    ob.rotation_euler = (math.pi / 2 + math.radians(pitch), 0, a)
    cam.sensor_fit = 'VERTICAL'
    cam.sensor_height = 24.0
    cam.lens = dist * 24.0 / span
    return ob


def lights():
    sun = bpy.data.lights.new('Key', 'SUN')
    sun.energy = 3.0
    sun.angle = math.radians(1.0)
    sun.use_shadow = False
    ob = bpy.data.objects.new('Key', sun)
    bpy.context.scene.collection.objects.link(ob)
    # from the viewer's left, above and in front
    ob.rotation_euler = (math.radians(50), 0, math.radians(-24))
    world = bpy.data.worlds.new('World')
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (1, 1, 1, 1)
    bg.inputs['Strength'].default_value = 0.0
    bpy.context.scene.world = world


def setup_render(engine, res, samples):
    sc = bpy.context.scene
    sc.render.resolution_x = int(735 * res)
    sc.render.resolution_y = int(1030 * res)
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.view_settings.look = 'None'
    if engine == 'workbench':
        sc.render.engine = 'BLENDER_WORKBENCH'
        sh = sc.display.shading
        sh.light = 'STUDIO'
        sh.color_type = 'MATERIAL'
        sh.show_object_outline = True
    else:
        sc.render.engine = 'BLENDER_EEVEE_NEXT'
        sc.eevee.taa_render_samples = samples
        sc.eevee.use_shadows = True
        sc.eevee.shadow_ray_count = 1
        sc.eevee.shadow_step_count = 4


COLLECTIONS = {
    'body': 'Corpo', 'head': 'Corpo', 'hands': 'Corpo',
    'hair': 'Cabelo',
    'top': 'Roupa', 'hips': 'Roupa', 'coat': 'Roupa', 'arms': 'Roupa', 'legs': 'Roupa',
    'props': 'Acessorios', 'swords': 'Espadas',
}


def build(names=None, hide=(), outline=True):
    clear()
    names = names or cache.available()
    root = get_collection('Personagem')
    for n in names:
        cname = COLLECTIONS.get(n, 'Outros')
        if cname in bpy.data.collections:
            coll = bpy.data.collections[cname]
        else:
            coll = bpy.data.collections.new(cname)
            root.children.link(coll)
        for ob, d in load_part(n, coll):
            if ob.name in hide:
                bpy.data.objects.remove(ob)
                continue
            finish_object(ob, d, outline=outline)
    lights()
    cams = {'ref': ref_camera()}
    cams['front'] = view_camera('Front', 0)
    cams['three'] = view_camera('ThreeQuarter', -35)
    cams['side'] = view_camera('Side', -90)
    cams['back'] = view_camera('Back', 180)
    cams['face'] = view_camera('Face', -15, height=1.55, dist=2.0, span=0.32)
    cams['face_front'] = view_camera('FaceFront', 0, height=1.56, dist=2.0, span=0.30)
    cams['upper'] = view_camera('Upper', -25, height=1.25, dist=3.0, span=0.75)
    cams['face_side'] = view_camera('FaceSide', -90, height=1.56, dist=2.0, span=0.30)
    bpy.context.scene.camera = cams['ref']
    return cams


def render_views(cams, views, out, res):
    os.makedirs(out, exist_ok=True)
    sc = bpy.context.scene
    for v in views:
        if not v:
            continue
        sc.camera = cams[v]
        if v.startswith('face'):
            sc.render.resolution_x = sc.render.resolution_y = int(800 * res)
        else:
            sc.render.resolution_x = int(735 * res)
            sc.render.resolution_y = int(1030 * res)
        sc.render.filepath = os.path.join(out, f'{v}.png')
        bpy.ops.render.render(write_still=True)


def main():
    a = args()
    names = a.parts.split(',') if a.parts else None
    hide = set(a.hide.split(',')) if a.hide else set()
    cams = build(names, hide, outline=not a.no_outline)
    setup_render(a.engine, a.res, a.samples)
    render_views(cams, a.views.split(','), a.out, a.res)
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=a.save, compress=True)


if __name__ == '__main__':
    main()

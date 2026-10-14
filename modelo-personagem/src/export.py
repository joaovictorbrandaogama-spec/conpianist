"""Build the final scene and export it.

    blender -b -P export.py -- [--out DIR] [--renders]

Writes
    personagem.blend      editable scene with toon shading, outlines, cameras
    personagem.glb        glTF 2.0 (PBR base colours + face texture)
    personagem_web.glb    lighter Draco-compressed copy used by the web viewer
    personagem.fbx        FBX for game engines / other DCC tools
"""

import os
import sys
import json
import argparse

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import scene       # noqa: E402
import materials   # noqa: E402

ROOT = os.path.dirname(HERE)


def opts():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(ROOT, 'export'))
    ap.add_argument('--renders', action='store_true')
    ap.add_argument('--rig', action='store_true')
    return ap.parse_args(argv)


def character_objects():
    root = bpy.data.collections['Personagem']
    out = []
    for c in root.children:
        out += [o for o in c.objects if o.type == 'MESH']
    return out


def to_pbr():
    """Strip outline modifiers / slots and swap toon materials for PBR ones."""
    for ob in list(bpy.data.objects):
        if ob.name.endswith('_Outline'):
            bpy.data.objects.remove(ob)
    toon_names = set(materials.PALETTE)
    for m in list(bpy.data.materials):
        if m.name in toon_names:
            m.name = m.name + '_toon'
    cache = {}
    for ob in character_objects():
        for mod in list(ob.modifiers):
            if mod.type == 'SOLIDIFY' and mod.name == 'Outline':
                ob.modifiers.remove(mod)
        mats = ob.data.materials
        while len(mats) and mats[-1] is not None and mats[-1].name.endswith('_outline'):
            mats.pop()
        for i, m in enumerate(mats):
            base = m.name[:-5] if m.name.endswith('_toon') else m.name
            if base not in materials.PALETTE:
                continue
            if base not in cache:
                pm = materials.make_pbr(base)
                pm.name = base
                cache[base] = pm
            mats[i] = cache[base]


def select_character():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in character_objects():
        ob.select_set(True)
    arm = bpy.data.objects.get('Armature')
    if arm:
        arm.select_set(True)


def tri_count():
    deps = bpy.context.evaluated_depsgraph_get()
    n = 0
    for ob in character_objects():
        me = ob.evaluated_get(deps).to_mesh()
        me.calc_loop_triangles()
        n += len(me.loop_triangles)
        ob.evaluated_get(deps).to_mesh_clear()
    return n


def export_gltf(path, draco=False):
    select_character()
    kw = dict(filepath=path, export_format='GLB', use_selection=True,
              export_apply=True, export_yup=True, export_texcoords=True,
              export_normals=True, export_materials='EXPORT',
              export_cameras=False, export_lights=False, export_extras=False,
              export_attributes=True, export_vertex_color='NONE')
    if draco:
        kw.update(export_draco_mesh_compression_enable=True,
                  export_draco_mesh_compression_level=7,
                  export_draco_position_quantization=14,
                  export_draco_normal_quantization=10,
                  export_draco_texcoord_quantization=12)
    if bpy.data.objects.get('Armature'):
        kw.update(export_skins=True, export_animations=False)
    bpy.ops.export_scene.gltf(**kw)


def export_fbx(path):
    select_character()
    bpy.ops.export_scene.fbx(filepath=path, use_selection=True, use_mesh_modifiers=True,
                             apply_scale_options='FBX_SCALE_ALL', path_mode='COPY',
                             embed_textures=True, add_leaf_bones=False,
                             bake_anim=False, axis_forward='-Z', axis_up='Y')


def palette_json(path):
    """Palette for the web viewer, in the same terms as toon2 (shade 2 and
    the scaled thresholds included)."""
    import toon2
    data = {}
    for k, (lit, shadow, outline, ex) in materials.PALETTE.items():
        data[k] = dict(lit=lit, shadow=shadow, outline=outline,
                       shade2=ex.get('shade2', toon2.shade2_of(shadow)),
                       thr=round(ex.get('thr', 0.4) * 0.7, 4), spec=ex.get('spec', 0.0),
                       gloss=ex.get('gloss', 0.3), spec_col=ex.get('spec_col', '#FFFFFF'),
                       rim=ex.get('rim', 0.0), emit=1 if ex.get('emit') else 0)
    with open(path, 'w') as f:
        json.dump(data, f, indent=1)


def main():
    o = opts()
    os.makedirs(o.out, exist_ok=True)
    cams = scene.build(outline=True)
    if o.rig:
        import rigging
        rigging.rig_character(character_objects())
    scene.setup_render('eevee', 1.0, 16)
    for img in bpy.data.images:
        if img.filepath:
            img.pack()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(o.out, 'personagem.blend'),
                                compress=True)
    if o.renders:
        scene.render_views(cams, ['ref', 'three', 'side', 'back', 'face'],
                           os.path.join(ROOT, 'renders'), 1.0)
    to_pbr()
    print('triangles:', tri_count())
    export_gltf(os.path.join(o.out, 'personagem.glb'))
    export_fbx(os.path.join(o.out, 'personagem.fbx'))
    # lighter web copy: no subdivision on the hair, decimated, Draco compressed
    deps = bpy.context.evaluated_depsgraph_get()
    for ob in character_objects():
        for mod in ob.modifiers:
            if mod.type == 'SUBSURF':
                mod.levels = 0
        n = len(ob.data.polygons)
        if n > 12000:
            mod = ob.modifiers.new('WebDecimate', 'DECIMATE')
            mod.ratio = 0.5
    print('web triangles:', tri_count())
    export_gltf(os.path.join(o.out, 'personagem_web.glb'), draco=True)
    palette_json(os.path.join(o.out, 'palette.json'))


if __name__ == "__main__":
    main()

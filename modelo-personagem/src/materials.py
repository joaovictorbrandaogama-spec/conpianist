"""Toon (anime) materials for EEVEE plus plain PBR versions for glTF export."""

import bpy

# name: (lit sRGB, shadow sRGB, outline sRGB, extra)
PALETTE = {
    'skin':        ('#FCE9E3', '#EDB9B2', '#9C5A55', dict(thr=0.30)),
    'face':        ('#FCE9E3', '#EDB9B2', '#9C5A55', dict(thr=0.06, tex='face.png')),
    'hair':        ('#F3F2F6', '#C8C5D6', '#77738E', dict(thr=0.30, spec=0.30, gloss=0.35)),
    'hair_dark':   ('#C9C6D6', '#9D99B2', '#5E5A74', dict(thr=0.42)),
    'coat':        ('#F2F2F4', '#C3C5D0', '#6C6E7C', dict(thr=0.40)),
    'coat_trim':   ('#D9DBE3', '#A9ACBA', '#5D606E', dict(thr=0.40)),
    'lining':      ('#A3181E', '#6E0F14', '#3A0508', dict(thr=0.40)),
    'red':         ('#D9262C', '#94161B', '#4A070A', dict(thr=0.40, spec=0.25, gloss=0.3)),
    'black':       ('#2C3039', '#181A20', '#07080A', dict(thr=0.40, spec=0.35, gloss=0.25,
                                                         spec_col='#7A8394')),
    'leather':     ('#323844', '#1A1D24', '#060709', dict(thr=0.40, spec=0.75, gloss=0.18,
                                                         spec_col='#8B95A8', rim=0.35)),
    'metal':       ('#E3E6EC', '#8E939F', '#3B3E46', dict(thr=0.45, spec=1.0, gloss=0.15,
                                                         spec_col='#FFFFFF', metallic=1.0)),
    'white':       ('#EDEDF0', '#B8BAC5', '#5E606C', dict(thr=0.40)),
    'sole':        ('#D6D7DD', '#9D9FAA', '#4E505A', dict(thr=0.40)),
    'sheer':       ('#867A73', '#5E5550', '#2E2826', dict(thr=0.40, alpha=0.85)),
    'glow_blue':   ('#9FD4FF', '#6FA9E8', '#2E5C8E', dict(emit=1.0)),
    'glow_red':    ('#FF5A60', '#E0343A', '#7A0E12', dict(emit=1.0)),
    'lens':        ('#C42A31', '#7E1418', '#2A0406', dict(thr=0.4, spec=1.0, gloss=0.1,
                                                         spec_col='#FFD0D0')),
    'gold':        ('#D8B45A', '#9A7A2E', '#4A3A12', dict(thr=0.45, spec=0.8, gloss=0.2,
                                                         spec_col='#FFF2C0', metallic=1.0)),
    'gray':        ('#8D919C', '#5F636C', '#25272C', dict(thr=0.40, spec=0.3)),
    'blade':       ('#E9EDF3', '#9DA4B2', '#3E4450', dict(thr=0.45, spec=1.0, gloss=0.1,
                                                         spec_col='#FFFFFF', metallic=1.0)),
}


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_lin(h, a=1.0):
    h = h.lstrip('#')
    return (srgb_to_lin(int(h[0:2], 16)), srgb_to_lin(int(h[2:4], 16)),
            srgb_to_lin(int(h[4:6], 16)), a)


def _toon_group():
    if 'ToonShade' in bpy.data.node_groups:
        return bpy.data.node_groups['ToonShade']
    g = bpy.data.node_groups.new('ToonShade', 'ShaderNodeTree')
    io = g.interface
    io.new_socket('Color', in_out='INPUT', socket_type='NodeSocketColor')
    io.new_socket('Shadow', in_out='INPUT', socket_type='NodeSocketColor')
    io.new_socket('Threshold', in_out='INPUT', socket_type='NodeSocketFloat')
    io.new_socket('Spec', in_out='INPUT', socket_type='NodeSocketFloat')
    io.new_socket('SpecColor', in_out='INPUT', socket_type='NodeSocketColor')
    io.new_socket('Gloss', in_out='INPUT', socket_type='NodeSocketFloat')
    io.new_socket('Rim', in_out='INPUT', socket_type='NodeSocketFloat')
    io.new_socket('Shader', in_out='OUTPUT', socket_type='NodeSocketShader')
    N, L = g.nodes, g.links
    gi = N.new('NodeGroupInput')
    go = N.new('NodeGroupOutput')

    dif = N.new('ShaderNodeBsdfDiffuse')
    s2r = N.new('ShaderNodeShaderToRGB')
    L.new(dif.outputs[0], s2r.inputs[0])
    bw = N.new('ShaderNodeRGBToBW')
    L.new(s2r.outputs[0], bw.inputs[0])
    # smooth step around the threshold
    lo = N.new('ShaderNodeMath'); lo.operation = 'SUBTRACT'; lo.inputs[1].default_value = 0.02
    hi = N.new('ShaderNodeMath'); hi.operation = 'ADD'; hi.inputs[1].default_value = 0.02
    L.new(gi.outputs['Threshold'], lo.inputs[0])
    L.new(gi.outputs['Threshold'], hi.inputs[0])
    mr = N.new('ShaderNodeMapRange'); mr.interpolation_type = 'SMOOTHSTEP'
    L.new(bw.outputs[0], mr.inputs['Value'])
    L.new(lo.outputs[0], mr.inputs['From Min'])
    L.new(hi.outputs[0], mr.inputs['From Max'])
    mix = N.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    L.new(mr.outputs[0], mix.inputs['Factor'])
    L.new(gi.outputs['Shadow'], mix.inputs[6])
    L.new(gi.outputs['Color'], mix.inputs[7])

    # specular band
    glo = N.new('ShaderNodeBsdfAnisotropic') if False else N.new('ShaderNodeBsdfGlossy')
    L.new(gi.outputs['Gloss'], glo.inputs['Roughness'])
    s2r2 = N.new('ShaderNodeShaderToRGB')
    L.new(glo.outputs[0], s2r2.inputs[0])
    bw2 = N.new('ShaderNodeRGBToBW')
    L.new(s2r2.outputs[0], bw2.inputs[0])
    mr2 = N.new('ShaderNodeMapRange'); mr2.interpolation_type = 'SMOOTHSTEP'
    mr2.inputs['From Min'].default_value = 0.55
    mr2.inputs['From Max'].default_value = 0.62
    L.new(bw2.outputs[0], mr2.inputs['Value'])
    sm = N.new('ShaderNodeMath'); sm.operation = 'MULTIPLY'
    L.new(mr2.outputs[0], sm.inputs[0])
    L.new(gi.outputs['Spec'], sm.inputs[1])
    # rim light (fresnel-ish, only on lit side)
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    mr3 = N.new('ShaderNodeMapRange'); mr3.interpolation_type = 'SMOOTHSTEP'
    mr3.inputs['From Min'].default_value = 0.55
    mr3.inputs['From Max'].default_value = 0.65
    L.new(lw.outputs['Facing'], mr3.inputs['Value'])
    rm = N.new('ShaderNodeMath'); rm.operation = 'MULTIPLY'
    L.new(mr3.outputs[0], rm.inputs[0])
    L.new(gi.outputs['Rim'], rm.inputs[1])
    rm2 = N.new('ShaderNodeMath'); rm2.operation = 'MULTIPLY'
    L.new(rm.outputs[0], rm2.inputs[0])
    L.new(mr.outputs[0], rm2.inputs[1])
    tot = N.new('ShaderNodeMath'); tot.operation = 'ADD'; tot.use_clamp = True
    L.new(sm.outputs[0], tot.inputs[0])
    L.new(rm2.outputs[0], tot.inputs[1])
    mix2 = N.new('ShaderNodeMix'); mix2.data_type = 'RGBA'
    L.new(tot.outputs[0], mix2.inputs['Factor'])
    L.new(mix.outputs[2], mix2.inputs[6])
    L.new(gi.outputs['SpecColor'], mix2.inputs[7])

    em = N.new('ShaderNodeEmission')
    L.new(mix2.outputs[2], em.inputs['Color'])
    L.new(em.outputs[0], go.inputs['Shader'])
    return g


def make_toon(name):
    if name in bpy.data.materials:
        return bpy.data.materials[name]
    lit, shadow, outline, ex = PALETTE[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    grp = nt.nodes.new('ShaderNodeGroup')
    grp.node_tree = _toon_group()
    grp.inputs['Color'].default_value = hex_lin(lit)
    grp.inputs['Shadow'].default_value = hex_lin(shadow)
    grp.inputs['Threshold'].default_value = ex.get('thr', 0.4)
    grp.inputs['Spec'].default_value = ex.get('spec', 0.0)
    grp.inputs['SpecColor'].default_value = hex_lin(ex.get('spec_col', '#FFFFFF'))
    grp.inputs['Gloss'].default_value = ex.get('gloss', 0.3)
    grp.inputs['Rim'].default_value = ex.get('rim', 0.0)
    shader = grp.outputs['Shader']
    if 'tex' in ex:
        import os
        tex = nt.nodes.new('ShaderNodeTexImage')
        path = os.path.join(TEX_DIR, ex['tex'])
        img = bpy.data.images.load(path, check_existing=True)
        tex.image = img
        tex.interpolation = 'Cubic'
        nt.links.new(tex.outputs['Color'], grp.inputs['Color'])
        # shadow = colour * tint
        mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'
        mul.inputs['Factor'].default_value = 1.0
        nt.links.new(tex.outputs['Color'], mul.inputs[6])
        l = hex_lin(lit); s = hex_lin(shadow)
        mul.inputs[7].default_value = (s[0] / l[0], s[1] / l[1], s[2] / l[2], 1)
        nt.links.new(mul.outputs[2], grp.inputs['Shadow'])
    if ex.get('emit'):
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = hex_lin(lit)
        em.inputs['Strength'].default_value = 1.0
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
    m.diffuse_color = hex_lin(lit)
    return m


def make_outline(name):
    oname = name + '_outline'
    if oname in bpy.data.materials:
        return bpy.data.materials[oname]
    col = PALETTE[name][2]
    m = bpy.data.materials.new(oname)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = hex_lin(col)
    nt.links.new(em.outputs[0], out.inputs['Surface'])
    m.use_backface_culling = True
    m.diffuse_color = hex_lin(col)
    return m


def make_pbr(name):
    """Plain Principled material for glTF export (same name + '_pbr')."""
    lit, shadow, outline, ex = PALETTE[name]
    m = bpy.data.materials.new(name + '_pbr')
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = hex_lin(lit)
    bsdf.inputs['Roughness'].default_value = max(0.25, ex.get('gloss', 0.6)) if ex.get('spec') else 0.75
    bsdf.inputs['Metallic'].default_value = ex.get('metallic', 0.0)
    if ex.get('emit'):
        bsdf.inputs['Emission Color'].default_value = hex_lin(lit)
        bsdf.inputs['Emission Strength'].default_value = 1.0
    if 'alpha' in ex:
        bsdf.inputs['Alpha'].default_value = ex['alpha']
        m.surface_render_method = 'BLENDED'
    if 'tex' in ex:
        import os
        tex = nt.nodes.new('ShaderNodeTexImage')
        tex.image = bpy.data.images.load(os.path.join(TEX_DIR, ex['tex']), check_existing=True)
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    return m


TEX_DIR = ''

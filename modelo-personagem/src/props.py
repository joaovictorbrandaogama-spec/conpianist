"""Accessories: goggles, hanging straps and the three swords."""

import numpy as np

import sdf
from sdf import Grid, Box, Torus, Ellipsoid, RoundCone, Cylinder, normalize, euler, v3
from meshutil import MeshData, loft_tube, catmull
from rig import J, px, S
import body as B


def frame(u, w_hint):
    """Rotation with columns (u, v, w): u along the object, w ~ w_hint."""
    u = normalize(u)
    w = np.asarray(w_hint, dtype=float)
    w = normalize(w - u * np.dot(w, u))
    v = np.cross(w, u)
    return np.stack([u, v, w], axis=1)


def mesh_of(prims, mat, h=0.0007, k=0.0, decimate=0, subtract=(), **kw):
    lo = np.min([p.bounds()[0] for p in prims], axis=0) - 0.01
    hi = np.max([p.bounds()[1] for p in prims], axis=0) + 0.01
    g = Grid(lo, hi, h)
    for p in prims:
        g.union(p, k)
    for p in subtract:
        g.subtract(p)
    v, f = g.mesh()
    return MeshData(v, f, mat=mat, decimate=decimate, **kw)


# ------------------------------------------------------------ goggles

def goggles():
    n = normalize(np.array([0.0, -0.80, 0.60]))      # lens normal (tilted up)
    lenses = [px(325, 191, -0.040), px(357, 188, -0.038)]
    R = frame(np.array([1.0, 0.0, 0.0]), n)          # u = x, w = normal
    Rt = np.stack([R[:, 0], R[:, 1], R[:, 2]], axis=1)
    frames, glass = [], []
    for i, c in enumerate(lenses):
        tilt = euler(z=(-6 if i == 0 else 6))
        Ri = tilt @ Rt
        frames.append(Torus(c, 0.0145, 0.0045, Ri, squash=1.5))
        glass.append(Ellipsoid(c + n * 0.002, (0.0136, 0.0130, 0.0036), Ri))
    # bridge
    mid = (lenses[0] + lenses[1]) / 2
    frames.append(Box(mid + n * 0.002, (0.010, 0.004, 0.004), Rt, 0.002))
    out = {'Goggles': mesh_of(frames, 'black', k=0.003, decimate=6000, outline_w=0.6),
           'GogglesLens': mesh_of(glass, 'lens', decimate=3000, outline_w=0.5)}
    # strap around the back of the neck
    nb = J['neck_base']
    ctrl = [lenses[0] + np.array([-0.020, 0.004, 0.0]),
            np.array([nb[0] - 0.060, nb[1] - 0.005, 1.425]),
            np.array([nb[0] - 0.045, nb[1] + 0.045, 1.432]),
            np.array([nb[0], nb[1] + 0.058, 1.436]),
            np.array([nb[0] + 0.045, nb[1] + 0.045, 1.432]),
            np.array([nb[0] + 0.062, nb[1] - 0.005, 1.425]),
            lenses[1] + np.array([0.020, 0.004, 0.0])]
    pts, tan = catmull(ctrl, 50)
    outs = pts - np.array([nb[0], nb[1], 0])
    outs[:, 2] = 0
    outs /= np.linalg.norm(outs, axis=1, keepdims=True)
    V, F = loft_tube(pts, tan, outs, np.full(50, 0.0055), np.full(50, 0.0016), n_ring=8)
    out['GogglesStrap'] = MeshData(V, F, mat='black', subsurf=1, outline_w=0.5,
                                   props={'recalc': True})
    return out


# ------------------------------------------------------------ hanging straps

def straps():
    prims = []
    for top, bot, w in (((-0.004, 0.095, 0.99), (0.000, 0.110, 0.585), 0.022),
                        ((0.190, 0.060, 0.97), (0.205, 0.075, 0.590), 0.020),
                        ((0.165, 0.080, 0.98), (0.150, 0.095, 0.640), 0.016)):
        top, bot = np.array(top), np.array(bot)
        c = (top + bot) / 2
        R = frame(bot - top, (0, 1, 0))
        L = np.linalg.norm(bot - top)
        prims.append(Box(c, (L / 2, w / 2, 0.0022), R, 0.001))
    return {'HangingStraps': mesh_of(prims, 'black', h=0.0010, decimate=3000, outline_w=0.7)}


# ------------------------------------------------------------ swords

def part(c0, R, u0, u1, hv, hw, rad=0.002, dv=0.0, dw=0.0):
    """Box spanning u in [u0, u1] in the sword frame (centre offset dv, dw)."""
    c = c0 + R[:, 0] * (u0 + u1) / 2 + R[:, 1] * dv + R[:, 2] * dw
    return Box(c, ((u1 - u0) / 2, hv, hw), R, rad)


def blade_tip(c0, R, u0, u1, hv, hw, rad=0.0015):
    """Tapered tip: box cut by a slanted plane (approximated by a rotated box)."""
    length = u1 - u0
    base = part(c0, R, u0, u1, hv, hw, rad)
    ang = np.arctan2(2 * hv, length)
    Rc = R @ euler(z=np.degrees(ang))
    cut_c = c0 + R[:, 0] * (u1) + R[:, 1] * (hv)
    cutter = Box(cut_c + Rc[:, 1] * 0.05, (length * 1.2, 0.05, hw * 3), Rc)
    return base, cutter


def sword_hand():
    """Sword held in her right hand, sheathed, pointing down-left."""
    hand = J['hand_R'] + np.array([0.004, -0.004, -0.004])
    tip = px(62, 668, 0.030)
    u = normalize(tip - hand)
    R = frame(u, (0, -1, 0.15))
    out = {}
    L = np.linalg.norm(tip - hand)
    red = [part(hand, R, 0.05, L - 0.06, 0.021, 0.010, 0.004)]
    black = [part(hand, R, -0.055, -0.02, 0.011, 0.010, 0.004),         # grip
             part(hand, R, L - 0.075, L + 0.012, 0.023, 0.0115, 0.004),  # end cap
             part(hand, R, 0.10, L - 0.07, 0.005, 0.011, 0.002, dv=-0.018)]
    white = [part(hand, R, -0.02, 0.05, 0.025, 0.014, 0.004),          # guard block
             part(hand, R, 0.14, 0.32, 0.007, 0.0115, 0.002, dv=0.006)]
    gold = [part(hand, R, 0.335, 0.345, 0.0225, 0.0120, 0.002),
            part(hand, R, 0.352, 0.362, 0.0225, 0.0120, 0.002)]
    out['SwordR_Red'] = mesh_of(red, 'red', h=0.0012, decimate=4000, outline_w=0.8)
    out['SwordR_Black'] = mesh_of(black, 'black', h=0.0010, decimate=5000, outline_w=0.8)
    out['SwordR_White'] = mesh_of(white, 'white', h=0.0010, decimate=4000, outline_w=0.8)
    out['SwordR_Gold'] = mesh_of(gold, 'gold', h=0.0008, decimate=1500, outline_w=0.5)
    return out


def swords_back():
    """Two long swords slung behind her left hip, sticking out to her left."""
    out = {}
    # red one: hilt hidden behind the hip, long red scabbard rising to the right
    a = px(395, 418, 0.075)
    b = px(690, 290, 0.150)
    u = normalize(b - a)
    R = frame(u, (0, -1, 0))
    L = np.linalg.norm(b - a)
    red = [part(a, R, 0.0, L - 0.04, 0.0175, 0.011, 0.003),
           part(a, R, L - 0.06, L, 0.020, 0.012, 0.004, dv=0.004)]
    black = [part(a, R, 0.10, L - 0.07, 0.0055, 0.0118, 0.0015, dv=-0.008),
             part(a, R, -0.03, 0.06, 0.022, 0.016, 0.004)]
    out['SwordA_Red'] = mesh_of(red, 'red', h=0.0012, decimate=4000, outline_w=0.8)
    out['SwordA_Black'] = mesh_of(black, 'black', h=0.0011, decimate=3000, outline_w=0.8)
    # black one below it, with a white / red tip
    a = px(425, 445, 0.090)
    b = px(615, 372, 0.140)
    u = normalize(b - a)
    R = frame(u, (0, -1, 0))
    L = np.linalg.norm(b - a)
    black = [part(a, R, 0.0, L - 0.03, 0.0150, 0.010, 0.003)]
    white = [part(a, R, L - 0.03, L, 0.0150, 0.0105, 0.004),
             part(a, R, -0.02, 0.05, 0.020, 0.014, 0.004)]
    red = [part(a, R, L - 0.09, L - 0.075, 0.0158, 0.0108, 0.0015)]
    out['SwordB_Black'] = mesh_of(black, 'black', h=0.0011, decimate=3000, outline_w=0.8)
    out['SwordB_White'] = mesh_of(white, 'white', h=0.0010, decimate=2500, outline_w=0.8)
    out['SwordB_Red'] = mesh_of(red, 'glow_red', h=0.0008, decimate=1000, outline_w=0.5)
    return out


def build():
    out = {}
    out.update(goggles())
    out.update(straps())
    return out


def build_swords():
    out = {}
    out.update(sword_hand())
    out.update(swords_back())
    return out

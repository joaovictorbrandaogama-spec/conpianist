"""The three swords of the Nightblaze set, as hard-surface polygon models.

build() -> {name: MeshData}

Layout (front reference, 735x1030 px, see rig.px):

* SwordNightblaze_*  the big red katana scabbard.  Visible from the hand
  (px 249,508) down-left to the black L-shaped end cap (px 60,667); it is
  one straight rigid piece that runs on behind the hand, the coat and the
  buttocks (depth growing linearly) into the mount at her back-left hip.  Outer edge: red with a black sawtooth band (6 teeth,
  white marks in the notches); inner side: raised white plate with two brass
  pins and a pink glow slot, black edge rail.  Rigid on the right hand.
* SwordUpper_*       the red sheathed sword / katana hilt sticking out of the
  mount forward-up (px 410,391 -> 686,280): dark grey edge strip, brass
  screws, white stripe + red block cap, red guard plate + black spike.
* SwordKodachi_*     the black short sword below it (px 434,444 -> 590,368):
  grey inset strip, red/white band, angular black tip cap, white connector
  with a round badge.
* SwordMount_*       one solid bracket behind the back-left hip: white housing
  block (dark front cover), steel scabbard collar and guard hanger, gunmetal
  clamp arm to the belt, black drum connector (gold and light-blue rings).
  The upper sword and kodachi trail slightly backwards from it.

Every piece is a 2D outline (local s = along the sword, v = across) extruded
along the thickness w, with separate raised inset pieces for colour regions.
Coordinates along a sword are measured in reference pixels (d) and mapped to
metres with the local pixel scale, so the shapes line up with the picture.
"""

import numpy as np

import hardsurf as hs
from meshutil import MeshData
from rig import S, PX0, PY0

# reference camera (scene.ref_camera): perspective, 5 m away, centred here
CAM_D = 5.0
CAM_X = (367.5 - PX0) * S
CAM_Z = 1.0


def P(xp, yp, Y):
    """Model point at depth Y that projects onto reference pixel (xp, yp)."""
    f = (CAM_D + Y) / CAM_D
    x = (xp - PX0) * S
    z = (PY0 - yp) * S
    return np.array([CAM_X + (x - CAM_X) * f, Y, CAM_Z + (z - CAM_Z) * f])


def unit(v):
    v = np.asarray(v, dtype=np.float64)
    return v / np.linalg.norm(v)


# ---------------------------------------------------------------- paths

class Path:
    """Dense polyline with an arc-length parameter and a (T, V, W) frame.

    Local coordinates (s, v, w): s = arc length, v = across the sword (the
    'outer' side for v > 0), w = thickness (w > 0 faces the front camera in
    the visible part).  ``map`` turns local points into world points."""

    def __init__(self, pts, v_hint, s0=0.0):
        pts = np.asarray(pts, dtype=np.float64)
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        self.s = np.concatenate([[0.0], np.cumsum(seg)]) + s0
        self.C = pts
        T = np.gradient(pts, axis=0)
        T /= np.linalg.norm(T, axis=1, keepdims=True)
        vh = np.asarray(v_hint, dtype=np.float64)
        if vh.ndim == 1:
            vh = np.tile(vh, (len(pts), 1))
        V = vh - T * np.sum(vh * T, axis=1, keepdims=True)
        V /= np.linalg.norm(V, axis=1, keepdims=True)
        W = np.cross(T, V)
        self.T, self.V, self.W = T, V, W
        self.length = self.s[-1]

    def frame_at(self, s):
        s = np.asarray(s, dtype=np.float64)
        i = np.clip(np.searchsorted(self.s, s) - 1, 0, len(self.s) - 2)
        t = (s - self.s[i]) / (self.s[i + 1] - self.s[i])
        tt = np.clip(t, 0, 1)[..., None]
        C = self.C[i] * (1 - tt) + self.C[i + 1] * tt
        # linear extrapolation beyond the ends
        lo = s < self.s[0]
        hi = s > self.s[-1]
        C = np.where(lo[..., None], self.C[0] + self.T[0] * (s - self.s[0])[..., None], C)
        C = np.where(hi[..., None], self.C[-1] + self.T[-1] * (s - self.s[-1])[..., None], C)
        T = self.T[i] * (1 - tt) + self.T[i + 1] * tt
        V = self.V[i] * (1 - tt) + self.V[i + 1] * tt
        V = V - T * np.sum(V * T, axis=-1, keepdims=True)
        T /= np.linalg.norm(T, axis=-1, keepdims=True)
        V /= np.linalg.norm(V, axis=-1, keepdims=True)
        W = np.cross(T, V)
        return C, T, V, W

    def map(self, L):
        L = np.asarray(L, dtype=np.float64)
        C, T, V, W = self.frame_at(L[:, 0])
        return C + V * L[:, 1:2] + W * L[:, 2:3]


def hermite_path(points, t0, t1, n=120):
    """Smooth curve through points with prescribed end tangents (Catmull-Rom
    inside), sampled densely and roughly uniformly."""
    P_ = [np.asarray(p, dtype=np.float64) for p in points]
    k = len(P_)
    tans = []
    for i in range(k):
        if i == 0:
            tans.append(unit(t0) * np.linalg.norm(P_[1] - P_[0]))
        elif i == k - 1:
            tans.append(unit(t1) * np.linalg.norm(P_[-1] - P_[-2]))
        else:
            tans.append((P_[i + 1] - P_[i - 1]) / 2)
    out = []
    for i in range(k - 1):
        m = max(4, int(n * np.linalg.norm(P_[i + 1] - P_[i]) / 0.3))
        for j in range(m):
            t = j / m
            h00 = 2 * t ** 3 - 3 * t ** 2 + 1
            h10 = t ** 3 - 2 * t ** 2 + t
            h01 = -2 * t ** 3 + 3 * t ** 2
            h11 = t ** 3 - t ** 2
            out.append(h00 * P_[i] + h10 * tans[i] + h01 * P_[i + 1] + h11 * tans[i + 1])
    out.append(P_[-1])
    return np.array(out)


# ---------------------------------------------------------------- local solids
# All builders return (V_local, F) with V_local columns (s, v, w); a Sword
# object converts pixel units and maps them through its path.

def loft(ss, sections):
    """Closed solid swept along s through cross-sections (same vertex count,
    CCW in the (v, w) plane)."""
    ss = np.asarray(ss, dtype=np.float64)
    secs = [hs.ccw(np.asarray(c, dtype=np.float64)) for c in sections]
    m = len(secs[0])
    V = np.concatenate([np.c_[np.full(m, s), c] for s, c in zip(ss, secs)])
    F = []
    for k in range(len(ss) - 1):
        a, b = k * m, (k + 1) * m
        for i in range(m):
            j = (i + 1) % m
            F.append([a + i, a + j, b + j, b + i])
    F.append(list(range(m))[::-1])
    F.append([(len(ss) - 1) * m + i for i in range(m)])
    return V, F


def rect_section(vlo, vhi, w0, w1, c=0.0, cw=None):
    """Rectangle (v in [vlo, vhi], w in [w0, w1]) with optional chamfer c
    on the four long edges (8 points, so lofts keep the same topology)."""
    cw = c if cw is None else cw
    c = min(c, (vhi - vlo) * 0.45)
    cw = min(cw, (w1 - w0) * 0.45)
    return np.array([(vhi - c, w0), (vhi, w0 + cw), (vhi, w1 - cw), (vhi - c, w1),
                     (vlo + c, w1), (vlo, w1 - cw), (vlo, w0 + cw), (vlo + c, w0)])


def band(ds, vlo, vhi, w0, w1, c=0.0, cw=None):
    """Loft of rectangles whose v-extent follows vlo(d), vhi(d) (arrays);
    chamfer c across (pixels) and cw in depth (metres, default 1.2 mm)."""
    cw = min(0.0012, (w1 - w0) * 0.2) if cw is None else cw
    return loft(ds, [rect_section(a, b, w0, w1, c, cw) for a, b in zip(vlo, vhi)])


def prism_l(poly_dv, w0, w1):
    """Extrude a (d, v) polygon along w from w0 to w1."""
    return hs.prism(poly_dv, w1 - w0, z0=w0)


def cyl_l(d, v, w0, w1, r, seg=12):
    """Cylinder with axis along w (screw heads, bosses)."""
    return hs.cylinder(r, w1 - w0, seg=seg, origin=(d, v, 0), z0=w0)


def screw(d, n, wf, k):
    """Screw on both faces: dark recess ring + small brass head.  Returns
    (V, F, tag) triples, tag 'r' (ring) or 'h' (head)."""
    out = []
    for sg in (1, -1):
        ring = cyl_l(d, n, wf - 0.0004, wf + 0.0003, 2.0, seg=12)
        head = cyl_l(d, n, wf - 0.0004, wf + 0.0009, 1.15, seg=8)
        if sg < 0:
            ring, head = mirror_w(ring), mirror_w(head)
        out += [(ring[0], ring[1], 'r'), (head[0], head[1], 'h')]
    return out


def mirror_w(item):
    V, F = item
    V = np.asarray(V, dtype=np.float64).copy()
    V[:, 2] *= -1
    return V, [f[::-1] for f in F]


class Sword:
    """A path plus a pixel scale k (m per reference pixel along the sword):
    local pieces are given with d (px along the axis from the origin), n (px
    across), w (metres) and become world MeshData."""

    def __init__(self, path, k, d0=0.0, n0=0.0):
        self.path = path
        self.k = k
        self.d0 = d0          # pixel d that maps to s = 0
        self.n0 = n0          # pixel n of the centre line

    def to_local(self, V):
        V = np.asarray(V, dtype=np.float64).copy()
        V[:, 0] = (V[:, 0] - self.d0) * self.k
        V[:, 1] = (V[:, 1] - self.n0) * self.k
        return V

    def world(self, items):
        out = []
        for it in items:
            V, F = it[0], it[1]
            out.append((self.path.map(self.to_local(V)), F))
        return out

    def mesh(self, items, mat, mats=None, bevel=0.0006, outline_w=0.6, **kw):
        items = self.world(items)
        md = hs.hard_mesh(items, mat, bevel=bevel, outline_w=outline_w, **kw)
        if mats is not None:
            md.mats = mats
        return md


# ---------------------------------------------------------------- helpers in pixel units
# Inside the pixel-unit builders the w coordinate is in metres while d, n are
# pixels; Sword.to_local scales d and n only.

def rrect_dn(d, n, ld, ln, r=0.6, seg=2):
    return hs.rounded_rect(ld, ln, r, seg=seg, center=(d, n))


def rect_dn(d, n, ld, ln):
    return np.array([(d - ld / 2, n - ln / 2), (d + ld / 2, n - ln / 2),
                     (d + ld / 2, n + ln / 2), (d - ld / 2, n + ln / 2)])


def both_faces(items):
    return list(items) + [mirror_w(it) for it in items]


# ================================================================ Nightblaze scabbard

# Pixel axis of the visible part: centre line through (65.7, 662.5) at 40 deg
# (down-left), d = 0 at the end cap.  The scabbard is ONE straight rigid
# piece: a straight 3D line projects to a straight 2D line, so it keeps the
# visible 40 degree axis in the front view while its depth grows linearly
# from the tip (a little in front of her plane) to the mouth behind her
# back-left hip.  It passes ~9 cm behind the loosely hanging right hand, then
# behind the coat and the buttocks (clearance checked against the cached
# body / coat / shorts meshes) and ends in the hip mount housing.
SCAB_ANG = 40.0
SCAB_E = np.array([65.7, 662.5])
SCAB_Y_TIP, SCAB_Y_FAR, SCAB_D_FAR = 0.02, 0.215, 485.0
SCAB_D_TIP, SCAB_D_HAND, SCAB_D_END = -8.0, 240.0, 428.0


def scab_Y(d):
    return SCAB_Y_TIP + (SCAB_Y_FAR - SCAB_Y_TIP) * (d - SCAB_D_TIP) / (SCAB_D_FAR - SCAB_D_TIP)


def scab_axis():
    ang = np.radians(SCAB_ANG)
    u = np.array([np.cos(ang), -np.sin(ang)])          # towards the hand (px)
    n_out = np.array([-np.sin(ang), -np.cos(ang)])     # outer side (px, up-left)
    return u, n_out


def scabbard_sword():
    u, n_out = scab_axis()
    E = SCAB_E
    p_tip = P(*(E + u * SCAB_D_TIP), scab_Y(SCAB_D_TIP))
    p_far = P(*(E + u * SCAB_D_FAR), scab_Y(SCAB_D_FAR))
    p_hand = P(*(E + u * SCAB_D_HAND), scab_Y(SCAB_D_HAND))
    T = unit(p_far - p_tip)
    # pixel scale measured over the visible part (tip -> hand)
    k = np.linalg.norm(p_hand - p_tip) / (SCAB_D_HAND - SCAB_D_TIP)
    L = (SCAB_D_END - SCAB_D_TIP + 4.0) * k
    pts = np.array([p_tip + T * s for s in np.linspace(0.0, L, 24)])
    v_hint = unit([n_out[0], 0.0, -n_out[1]])
    path = Path(pts, v_hint)
    sw = Sword(path, k, d0=SCAB_D_TIP, n0=2.0)
    sw.d_end = SCAB_D_END
    return sw


def edge_strip(a, b, inward, w0, w1, off=0.3, wid=1.6):
    """Thin highlight strip along the polygon edge a-b (pixel units), set
    ``off`` px inside the edge and ``wid`` px wide, extruded w0..w1."""
    a, b = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
    t = (b - a) / np.linalg.norm(b - a)
    nr = np.array([-t[1], t[0]])
    if nr @ np.asarray(inward, dtype=np.float64) < 0:
        nr = -nr
    poly = [a + nr * off, b + nr * off, b + nr * (off + wid), a + nr * (off + wid)]
    return prism_l(poly, w0, w1)


def nightblaze():
    sw = scabbard_sword()
    k = sw.k
    out = {}
    D2 = 0.011               # half thickness of the scabbard body
    N_IN, N_OUT = -14.0, 18.0
    d_end = sw.d_end
    cpx = 0.0012 / k         # 1.2 mm chamfer in pixels

    # ---- red core (full width): one straight loft from under the end cap to
    # the mouth, so the cross-section stays constant all the way
    ds = np.linspace(6, d_end, 40)
    core = band(ds, np.full(len(ds), N_IN), np.full(len(ds), N_OUT), -D2, D2, c=cpx)
    out['SwordNightblaze_Body'] = sw.mesh([core], 'swords_red', bevel=0.0007, outline_w=0.9)

    # ---- bright bevel highlight line along the outer (upper) edge, both faces
    hi = [prism_l([(19.0, N_OUT - 2.6), (d_end - 14, N_OUT - 2.6), (d_end - 14, N_OUT - 0.9),
                   (19.0, N_OUT - 0.9)], D2 - 0.0002, D2 + 0.0004)]
    out['SwordNightblaze_Edge'] = sw.mesh(both_faces(hi), 'swords_red_hi', bevel=0.0,
                                          outline=False)

    # ---- black rail along the inner edge (wraps the edge, whole length)
    ds = np.linspace(14, d_end - 2, 30)
    rail = band(ds, np.full(len(ds), N_IN - 0.25), np.full(len(ds), N_IN + 3.2),
                -D2 - 0.0006, D2 + 0.0006, c=cpx * 0.8)
    # ---- black inner region near the end (d 14..86), on both faces
    blk = prism_l([(14, N_IN + 1), (80, N_IN + 1), (88, N_IN + 2.6), (88, N_IN + 3.0),
                   (60, 3.4), (14, 3.4)], D2 - 0.0003, D2 + 0.0006)
    # ---- black sawtooth band (outer side of the white plate), ending in a
    # clean angled lead-out past the last tooth
    teeth = [124.0 + 31.4 * i for i in range(6)]
    pts = [(84.0, -1.0), (84.0, 5.5)]
    for t0 in teeth:
        pts += [(t0 - 0.01, 5.5), (t0 + 1.6, 11.2), (t0 + 6.0, 11.2), (t0 + 29.0, 5.6)]
    d_band_end = teeth[-1] + 40
    pts += [(d_band_end - 4, 5.5), (d_band_end, -1.0)]
    saw = prism_l(pts, D2 - 0.0003, D2 + 0.0006)
    black_items = [rail] + both_faces([blk, saw])
    out['SwordNightblaze_Black'] = sw.mesh(black_items, 'black', bevel=0.0004, outline_w=0.45)

    # ---- raised white plate: pointed tip that wraps under the glow slot,
    # step near the hand, bevelled end well before the mouth
    d_plate_end = d_end - 40
    key = [(40.0, -4.4, -3.2), (47.0, -6.4, -1.8), (69.0, -8.6, -1.8), (73.0, -9.0, 2.0),
           (85.0, -10.4, 2.0), (165.0, -10.4, 2.0), (171.0, -5.4, -0.6),
           (d_plate_end - 8, -5.4, -0.6), (d_plate_end, -5.4, -4.0)]
    kd = np.array([p[0] for p in key])
    lo = np.array([p[1] for p in key])
    hi_ = np.array([p[2] for p in key])
    plate_poly = list(zip(kd, lo)) + list(zip(kd[::-1], hi_[::-1]))
    plate = prism_l(plate_poly, D2 - 0.0003, D2 + 0.0017)
    out['SwordNightblaze_Plate'] = sw.mesh(both_faces([plate]), 'white', bevel=0.0005,
                                           outline_w=0.45)

    # ---- glow slot on the red just above the plate tip: dark recess frame,
    # pink light, near-white hot core
    frame = prism_l(rrect_dn(58.5, 1.6, 27.0, 7.6, r=2.8, seg=3), D2 - 0.0003, D2 + 0.0007)
    slot = prism_l(rrect_dn(58.5, 1.6, 24.0, 5.2, r=2.3, seg=3), D2 + 0.0004, D2 + 0.0011)
    core = prism_l(rrect_dn(59.0, 1.7, 19.5, 2.4, r=1.1, seg=2), D2 + 0.0008, D2 + 0.0014)
    out['SwordNightblaze_SlotFrame'] = sw.mesh(both_faces([frame]), 'black', bevel=0.0002,
                                               outline_w=0.3)
    out['SwordNightblaze_Glow'] = sw.mesh(both_faces([slot]), 'glow_pink', bevel=0.0,
                                          outline=False)
    out['SwordNightblaze_GlowCore'] = sw.mesh(both_faces([core]), 'swords_glow_core', bevel=0.0,
                                              outline=False)

    # ---- white marks in the tooth notches + small pale text dashes on the red
    marks, text = [], []
    for t0 in teeth:
        marks.append(prism_l(rrect_dn(t0 + 9.2, 8.6, 6.6, 4.6, r=0.5), D2 + 0.0004, D2 + 0.0010))
        text.append(prism_l(rect_dn(t0 + 2.5, 14.2, 4.2, 0.9), D2 - 0.0002, D2 + 0.0003))
        text.append(prism_l(rect_dn(t0 + 3.2, 15.8, 2.6, 0.9), D2 - 0.0002, D2 + 0.0003))
    # marks near the end cap
    text += [prism_l(rect_dn(25.0, 11.5, 4.0, 0.9), D2 - 0.0002, D2 + 0.0003),
             prism_l(rect_dn(26.0, 13.0, 2.4, 0.9), D2 - 0.0002, D2 + 0.0003),
             prism_l(rect_dn(31.0, 10.0, 1.2, 1.2), D2 - 0.0002, D2 + 0.0003)]
    out['SwordNightblaze_Marks'] = sw.mesh(both_faces(marks), 'decal_white', bevel=0.0,
                                           outline=False)
    out['SwordNightblaze_Text'] = sw.mesh(both_faces(text), 'swords_mark', bevel=0.0,
                                          outline=False)

    # ---- brass pins: straight ferrules with a barrel bulge and flat caps,
    # standing across the plate and sticking out past its inner edge
    pins = []
    for dp in (93.0, 111.5):
        L = 11.5 * k
        r = 0.0047
        prof = [(0, 0), (r * 0.9, 0), (r, L * 0.07), (r, L * 0.32), (r * 1.1, L * 0.40),
                (r * 1.1, L * 0.60), (r, L * 0.68), (r, L * 0.93), (r * 0.9, L), (0, L)]
        Vp, Fp = hs.lathe(prof, seg=12)
        # local cylinder axis z -> sword +n, starting at n = -16.5
        Vl = np.c_[Vp[:, 0] / k + dp, Vp[:, 2] / k - 16.5, Vp[:, 1] + D2 + 0.0010]
        pins.append((Vl, Fp))
    out['SwordNightblaze_Pins'] = sw.mesh(pins, 'brass', bevel=0.0, outline_w=0.35)

    # ---- black L-shaped end cap (thicker than the body)
    cap_poly = [(9.5, 19.6), (1.0, 19.8), (-5.5, 17.0), (-8.0, -21.0), (-6.0, -27.6),
                (4.5, -28.6), (10.5, -18.0), (18.0, -15.2), (18.0, 3.8)]
    cap = prism_l(cap_poly, -D2 - 0.0016, D2 + 0.0016)
    out['SwordNightblaze_Cap'] = sw.mesh([cap], 'black', bevel=0.0009, outline_w=0.9)
    # light grey rim lines on the cap's upper and outer edges (both faces)
    Wc = D2 + 0.0016
    rim = [edge_strip((9.5, 19.6), (1.0, 19.8), (0, -1), Wc - 0.0002, Wc + 0.0004),
           edge_strip((1.0, 19.8), (-5.5, 17.0), (1, -1), Wc - 0.0002, Wc + 0.0004),
           edge_strip((-5.5, 17.0), (-8.0, -21.0), (1, 0), Wc - 0.0002, Wc + 0.0004)]
    out['SwordNightblaze_CapRim'] = sw.mesh(both_faces(rim), 'swords_rim', bevel=0.0,
                                            outline=False)
    lights = [prism_l(rrect_dn(13.6, 8.3, 4.6, 6.0, r=0.6), D2 + 0.0010, D2 + 0.0024)]
    out['SwordNightblaze_CapLight'] = sw.mesh(both_faces(lights), 'decal_white', bevel=0.0003,
                                              outline_w=0.3)
    red_light = [prism_l(rrect_dn(10.5, -2.6, 2.6, 7.0, r=0.8), D2 + 0.0010, D2 + 0.0024)]
    out['SwordNightblaze_CapGlow'] = sw.mesh(both_faces(red_light), 'glow_red', bevel=0.0,
                                             outline=False)
    return out, sw


# ================================================================ upper sword (katana hilt)

# depth of the hip ends of the two hip-hung swords (inside the mount housing
# behind her back-left hip); both trail BACKWARDS towards their far ends
UP_Y0, UP_DY = 0.180, 0.050
KO_Y0, KO_DY = 0.186, 0.030


def screw_hole(d, n, wf, r=1.5, rim=0.45):
    """Dark recessed screw hole with a thin light rim, on both faces.  Returns
    (V, F, tag) triples, tag 'r' (rim ring) or 'h' (dark hole)."""
    out = []
    ring = hs.lathe([(r, 0.0), (r + rim, 0.0), (r + rim, 0.0007), (r, 0.0007)], seg=14)
    hole = hs.lathe([(0, 0.0), (r, 0.0), (r, 0.0005), (0, 0.0005)], seg=14)
    for (V, F), tag in ((ring, 'r'), (hole, 'h')):
        Vl = np.c_[V[:, 0] + d, V[:, 1] + n, V[:, 2] + wf - 0.0003]
        out.append((Vl, F, tag))
        Vm, Fm = mirror_w((Vl, F))
        out.append((Vm, Fm, tag))
    return out


def upper_axis():
    ang = np.radians(21.8)
    u = np.array([np.cos(ang), -np.sin(ang)])
    n = np.array([-np.sin(ang), -np.cos(ang)])
    E = np.array([460.0, 370.5]) + n * (-0.5)
    d_a, d_b = -56.0, 246.0
    Yd = lambda d: UP_Y0 + UP_DY * (d - d_a) / (d_b - d_a)
    pa, pb = P(*(E + u * d_a), Yd(d_a)), P(*(E + u * d_b), Yd(d_b))
    v_hint = unit([n[0], 0.0, -n[1]])
    path = Path(np.array([pa + (pb - pa) * t for t in np.linspace(0, 1, 8)]), v_hint)
    k = np.linalg.norm(pb - pa) / (d_b - d_a)
    sw = Sword(path, k, d0=d_a, n0=0.0)
    d_m = -52.0
    return sw, dict(mouth=P(*(E + u * d_m), Yd(d_m)), dir=unit(pb - pa), E=E, u=u, n=n,
                    Yd=Yd, sw=sw)


def upper_sword():
    sw, info = upper_axis()
    k = sw.k
    out = {}
    W2 = 0.0085
    body_poly = [(-56, -10.5), (156, -10.5), (163, -8.6), (212, -8.6), (212, 8.8),
                 (188, 10.2), (151, 10.2), (148.5, 7.6), (131.5, 7.6), (129, 10.2),
                 (-56, 10.2)]
    body = prism_l(body_poly, -W2, W2)
    out['SwordUpper_Body'] = sw.mesh([body], 'swords_red', bevel=0.0007, outline_w=0.85)
    # bright bevel highlight line along the top edge (both faces)
    hi = [edge_strip((-50, 10.2), (129, 10.2), (0, -1), W2 - 0.0002, W2 + 0.0004, off=0.4,
                     wid=2.0),
          edge_strip((151, 10.2), (188, 10.2), (0, -1), W2 - 0.0002, W2 + 0.0004, off=0.4,
                     wid=2.0),
          edge_strip((188, 10.2), (211, 8.9), (0, -1), W2 - 0.0002, W2 + 0.0004, off=0.4,
                     wid=2.0)]
    out['SwordUpper_Edge'] = sw.mesh(both_faces(hi), 'swords_red_hi', bevel=0.0, outline=False)
    # grey strip along the lower edge (proud on both faces, wraps the edge),
    # plus the short strip on the handle part left of the forearm
    strip_poly = [(14, -10.8), (155.5, -10.8), (159.5, -5.8), (14, -5.8)]
    strip = prism_l(strip_poly, -W2 - 0.0005, W2 + 0.0005)
    hstrip = prism_l([(-50, -8.6), (-22, -8.6), (-19, -5.4), (-50, -5.4)], W2 - 0.0003,
                     W2 + 0.0005)
    # dark recess in the notch of the top edge
    notch = prism_l([(130.5, 6.8), (149.5, 6.8), (149.5, 9.4), (130.5, 9.4)], -W2 + 0.002,
                    W2 - 0.002)
    out['SwordUpper_Strip'] = sw.mesh([strip] + both_faces([hstrip]), 'gray', bevel=0.0004,
                                      outline_w=0.5)
    out['SwordUpper_Notch'] = sw.mesh([notch], 'black', bevel=0.0, outline_w=0.3)
    # white stripe + red block cap at the far end
    stripe = prism_l([(211.5, -11.0), (215.0, -11.6), (215.0, 9.0), (211.5, 9.2)],
                     -W2 - 0.0012, W2 + 0.0012)
    out['SwordUpper_Stripe'] = sw.mesh([stripe], 'decal_white', bevel=0.0004, outline_w=0.5)
    cap_poly = [(215.0, -15.5), (238.0, -15.5), (244.0, -9.5), (244.0, -1.0), (239.0, 6.0),
                (233.5, 8.2), (215.0, 8.2)]
    cap = prism_l(cap_poly, -W2 - 0.0018, W2 + 0.0018)
    out['SwordUpper_Cap'] = sw.mesh([cap], 'swords_red', bevel=0.0008, outline_w=0.85)
    Wc = W2 + 0.0018
    cap_hi = [edge_strip((215.5, 8.2), (233.5, 8.2), (0, -1), Wc - 0.0002, Wc + 0.0004,
                         off=0.4),
              edge_strip((233.5, 8.2), (239.0, 6.0), (-1, -1), Wc - 0.0002, Wc + 0.0004,
                         off=0.4)]
    out['SwordUpper_CapEdge'] = sw.mesh(both_faces(cap_hi), 'swords_red_hi', bevel=0.0,
                                        outline=False)
    # screw holes: dark recesses with light rims (both faces), the row of six
    # small holes near the tip, and two on the cap
    scr = []
    for d, n, wf, r in ((82, 2.0, W2, 1.5), (163.5, 1.0, W2, 1.6), (175.5, 0.4, W2, 1.6),
                        (12, -6.5, 0.0133, 1.5), (226, -3.5, Wc, 1.6), (234, -11.0, Wc, 1.6)):
        scr += screw_hole(d, n, wf, r=r)
    for d, n in ((188, 2.2), (195, 2.0), (202, 1.8), (190.5, -2.6), (197.5, -2.8), (204.5, -3.0)):
        scr += screw_hole(d, n, W2, r=0.85, rim=0.35)
    out['SwordUpper_ScrewHoles'] = sw.mesh([x[:2] for x in scr if x[2] == 'h'], 'black',
                                           bevel=0.0, outline=False)
    out['SwordUpper_ScrewRims'] = sw.mesh([x[:2] for x in scr if x[2] == 'r'], 'swords_steel',
                                          bevel=0.0, outline=False)
    marks = [prism_l(rect_dn(60, 4.0, 7.0, 0.8), W2 - 0.0002, W2 + 0.0003),
             prism_l(rect_dn(58.5, 2.2, 4.0, 0.8), W2 - 0.0002, W2 + 0.0003),
             prism_l(rect_dn(176, 4.6, 6.0, 0.8), W2 - 0.0002, W2 + 0.0003),
             prism_l(rect_dn(174.5, 6.0, 3.0, 0.8), W2 - 0.0002, W2 + 0.0003),
             # pale text on the handle part left of the forearm
             prism_l(rect_dn(-36, -2.4, 9.0, 0.9), W2 - 0.0002, W2 + 0.0003),
             prism_l(rect_dn(-38, -0.6, 5.0, 0.9), W2 - 0.0002, W2 + 0.0003)]
    out['SwordUpper_Marks'] = sw.mesh(both_faces(marks), 'swords_mark', bevel=0.0,
                                      outline=False)
    # hip end: red angular guard plate, metal pivot boss, black trigger spike
    guard_poly = [(6.0, -5.0), (13.0, -12.5), (21.0, -18.0), (31.0, -18.0), (36.5, -11.5),
                  (36.5, 10.6), (27.0, 10.6), (17.0, 6.0), (6.0, 3.0)]
    guard = prism_l(guard_poly, -0.0122, 0.0122)
    out['SwordUpper_Guard'] = sw.mesh([guard], 'swords_red', bevel=0.0008, outline_w=0.85)
    boss = cyl_l(16.0, 6.8, -0.0142, 0.0142, 3.3, seg=16)
    boss_in = cyl_l(16.0, 6.8, -0.0150, 0.0150, 1.6, seg=12)
    out['SwordUpper_Pivot'] = sw.mesh([boss], 'metal', bevel=0.0005, outline_w=0.5)
    out['SwordUpper_PivotPin'] = sw.mesh([boss_in], 'gunmetal', bevel=0.0, outline_w=0.3)
    # bent trigger spike rising up-right above the forearm (tip ~ px 481,338)
    spike_poly = [(3.0, 4.0), (12.5, 4.0), (14.5, 9.5), (19.5, 14.5), (25.5, 18.0),
                  (31.5, 20.5), (31.0, 23.6), (25.0, 22.4), (18.0, 19.6), (11.5, 15.0),
                  (6.0, 9.5)]
    spike = prism_l(spike_poly, -0.0055, 0.0055)
    out['SwordUpper_Spike'] = sw.mesh([spike], 'black', bevel=0.0006, outline_w=0.7)
    return out, info


# ================================================================ kodachi

def kodachi_axis():
    ang = np.radians(26.1)
    u = np.array([np.cos(ang), -np.sin(ang)])
    n = np.array([-np.sin(ang), -np.cos(ang)])
    E = np.array([480.0, 423.8]) + n * 2.5
    d_a, d_b = -58.0, 126.0
    Yd = lambda d: KO_Y0 + KO_DY * (d - d_a) / (d_b - d_a)
    pa, pb = P(*(E + u * d_a), Yd(d_a)), P(*(E + u * d_b), Yd(d_b))
    v_hint = unit([n[0], 0.0, -n[1]])
    path = Path(np.array([pa + (pb - pa) * t for t in np.linspace(0, 1, 6)]), v_hint)
    k = np.linalg.norm(pb - pa) / (d_b - d_a)
    sw = Sword(path, k, d0=d_a, n0=0.0)
    return sw, dict(E=E, u=u, n=n, Yd=Yd, sw=sw)


def kodachi():
    sw, info = kodachi_axis()
    k = sw.k
    out = {}
    W2 = 0.0080
    # stepped lower profile: deeper block next to the connector, step up at d 25
    body_poly = [(8.0, -14.0), (22.5, -14.0), (26.0, -10.4), (91.0, -10.4), (91.0, 10.5),
                 (20.0, 10.5), (17.0, 12.5), (8.0, 12.5)]
    body = prism_l(body_poly, -W2, W2)
    # small raised block on the stepped part (carries the red light)
    blockp = prism_l([(9.5, -12.6), (21.0, -12.6), (21.0, 6.0), (9.5, 6.0)], W2 - 0.0003,
                     W2 + 0.0011)
    out['SwordKodachi_Body'] = sw.mesh([body] + both_faces([blockp]), 'black', bevel=0.0007,
                                       outline_w=0.85)
    # light grey rim line along the top edge (both faces)
    rim = [edge_strip((20.5, 10.5), (90.5, 10.5), (0, -1), W2 - 0.0002, W2 + 0.0004, off=0.4,
                      wid=1.4)]
    # grey inset strip (both faces)
    strip = prism_l(rrect_dn(45.0, -6.9, 38.0, 4.6, r=2.0, seg=3), W2 - 0.0003, W2 + 0.0006)
    out['SwordKodachi_Strip'] = sw.mesh(both_faces([strip]), 'gray', bevel=0.0003,
                                        outline_w=0.35)
    # red / white / red band
    red = [prism_l([(91.0, -10.9), (92.8, -10.9), (92.8, 10.9), (91.0, 10.9)], -W2 - 0.0009,
                   W2 + 0.0009),
           prism_l([(95.4, -10.9), (97.0, -10.9), (97.0, 10.9), (95.4, 10.9)], -W2 - 0.0009,
                   W2 + 0.0009)]
    white = [prism_l([(92.8, -10.9), (95.4, -10.9), (95.4, 10.9), (92.8, 10.9)],
                     -W2 - 0.0009, W2 + 0.0009)]
    out['SwordKodachi_Band'] = sw.mesh(red, 'red', bevel=0.0003, outline_w=0.4)
    out['SwordKodachi_BandWhite'] = sw.mesh(white, 'decal_white', bevel=0.0003, outline_w=0.4)
    # angular tip cap
    cap_poly = [(97.0, -10.5), (103.5, -13.2), (119.0, -13.2), (124.5, -8.0), (124.5, 5.5),
                (119.5, 10.5), (97.0, 10.5)]
    cap = prism_l(cap_poly, -W2 - 0.0012, W2 + 0.0012)
    out['SwordKodachi_Cap'] = sw.mesh([cap], 'black', bevel=0.0008, outline_w=0.85)
    Wc = W2 + 0.0012
    rim += [edge_strip((97.5, 10.5), (119.5, 10.5), (0, -1), Wc - 0.0002, Wc + 0.0004,
                       off=0.4, wid=1.4),
            edge_strip((119.5, 10.5), (124.5, 5.5), (-1, -1), Wc - 0.0002, Wc + 0.0004,
                       off=0.4, wid=1.4)]
    out['SwordKodachi_Rim'] = sw.mesh(both_faces(rim), 'swords_rim', bevel=0.0, outline=False)
    # screws: dark holes with light rims; red lights on the cap and the block
    scr, red_dots = [], []
    for d, n, wf in ((6.0, 4.0, W2 + 0.0035), (68.0, 0.5, W2), (108.0, 2.5, Wc)):
        scr += screw_hole(d, n, wf, r=1.5)
    for d, n, wf in ((116.0, -7.5, Wc), (15.0, 2.0, W2 + 0.0011)):
        red_dots.append(cyl_l(d, n, wf - 0.0004, wf + 0.0010, 1.4, seg=10))
        red_dots.append(mirror_w(cyl_l(d, n, wf - 0.0004, wf + 0.0010, 1.4, seg=10)))
    out['SwordKodachi_ScrewHoles'] = sw.mesh([x[:2] for x in scr if x[2] == 'h'], 'black',
                                             bevel=0.0, outline=False)
    out['SwordKodachi_ScrewRims'] = sw.mesh([x[:2] for x in scr if x[2] == 'r'],
                                            'swords_steel', bevel=0.0, outline=False)
    out['SwordKodachi_Lights'] = sw.mesh(red_dots, 'glow_red', bevel=0.0, outline=False)
    # small red text + three red blocks (both faces)
    txt = [prism_l(rect_dn(74.0, 4.5, 12.0, 0.8), W2 - 0.0002, W2 + 0.0003),
           prism_l(rect_dn(72.0, 2.8, 8.0, 0.8), W2 - 0.0002, W2 + 0.0003)]
    for i in range(3):
        txt.append(prism_l(rect_dn(81.0 + 2.6 * i, 3.6, 1.6, 2.6), W2 - 0.0002, W2 + 0.0003))
    out['SwordKodachi_Text'] = sw.mesh(both_faces(txt), 'red', bevel=0.0, outline=False)
    # white / silver connector at the hip end
    con_poly = [(-24.0, -15.0), (6.0, -15.0), (10.5, -12.0), (10.5, 13.0), (5.0, 15.5),
                (-24.0, 15.5)]
    con = prism_l(con_poly, -0.0118, 0.0118)
    out['SwordKodachi_Connector'] = sw.mesh([con], 'white', bevel=0.0008, outline_w=0.8)
    collar = prism_l([(10.0, -13.0), (13.5, -12.2), (13.5, 13.2), (10.0, 13.8)], -0.0108,
                     0.0108)
    out['SwordKodachi_Collar'] = sw.mesh([collar], 'metal', bevel=0.0005, outline_w=0.6)
    # red trim on the connector (front)
    trim = [prism_l([(-2.0, 3.0), (8.5, 3.0), (8.5, 9.5), (4.0, 9.5)], 0.0114, 0.0124)]
    out['SwordKodachi_ConTrim'] = sw.mesh(both_faces(trim), 'red', bevel=0.0002,
                                          outline_w=0.3)
    # round badge: white disc with a red-black hourglass emblem
    bd, bn = -5.0, -6.5
    rb = 6.0 * k
    ring = hs.lathe([(0, 0.0), (rb, 0.0), (rb, 0.0016), (rb * 0.82, 0.0020), (0, 0.0020)],
                    seg=24)
    ringV = np.c_[ring[0][:, 0] / k + bd, ring[0][:, 1] / k + bn, ring[0][:, 2] + 0.0112]
    out['SwordKodachi_Badge'] = sw.mesh(both_faces([(ringV, ring[1])]), 'metal',
                                        bevel=0.0003, outline_w=0.4)
    hg = 3.6
    emb = [prism_l([(bd - hg, bn - hg * 0.9), (bd + hg, bn - hg * 0.9), (bd, bn)], 0.0128,
                   0.0134),
           prism_l([(bd, bn), (bd + hg, bn + hg * 0.9), (bd - hg, bn + hg * 0.9)], 0.0128,
                   0.0134)]
    out['SwordKodachi_Emblem'] = sw.mesh(both_faces(emb), 'red', bevel=0.0, outline=False)
    inner_ring = hs.lathe([(rb * 0.62, 0.0), (rb * 0.70, 0.0), (rb * 0.70, 0.0005),
                           (rb * 0.62, 0.0005)], seg=24)
    irV = np.c_[inner_ring[0][:, 0] / k + bd, inner_ring[0][:, 1] / k + bn,
                inner_ring[0][:, 2] + 0.0128]
    out['SwordKodachi_BadgeRing'] = sw.mesh(both_faces([(irV, inner_ring[1])]), 'black',
                                            bevel=0.0, outline=False)
    return out, info


# ================================================================ mount at the back-left hip

MOUNT_Y0, MOUNT_Y1 = 0.167, 0.219      # depth range of the housing block


def mount(up, ko, sc):
    """One solid bracket behind her back-left hip: a white housing block that
    swallows the scabbard mouth, the root of the upper sword and the kodachi
    housing; a shaded steel hanger under the upper guard; a gunmetal clamp
    arm that reaches forward to the belt; the black drum connector with gold
    and light-blue rings on the back face.  Hidden in the front view behind
    the coat and the left forearm (except the hanger right of the forearm)."""
    out = {}
    Yc = (MOUNT_Y0 + MOUNT_Y1) / 2
    Yt = MOUNT_Y1 - MOUNT_Y0
    white, grey, red, dark, steel, gun = [], [], [], [], [], []
    # main housing block (pixel outline extruded in depth).  The notch at the
    # top right keeps the red handle of the upper sword visible between the
    # coat edge and the forearm, as in the reference.
    house_px = [(372, 372), (402, 361), (407, 399), (420, 405), (440, 401), (452, 384),
                (464, 380), (466, 424), (454, 446), (438, 460), (398, 460), (376, 436)]
    white.append(px_prism(house_px, Yc, Yt))
    # kodachi housing: white box around the kodachi root, merged into the block
    skd = ko['sw']
    gun += skd.world([prism_l(hs.chamfer_rect(36.0, 33.0, 3.0) + [-41.0, 0.25],
                              -0.0135, 0.0135)])
    # scabbard mouth collar (steel) where the scabbard enters the block
    ssc = sc
    collar = band(np.array([412.0, 415.0, 426.0, 429.0]),
                  np.array([-15.0, -16.2, -16.2, -15.6]), np.array([19.0, 20.2, 20.2, 19.6]),
                  -0.0140, 0.0140, c=1.2)
    steel += ssc.world([collar])
    # steel hanger under the upper guard (visible right of the forearm) with a
    # darker grey face panel, joined to the block and to the kodachi connector
    Yh = up['Yd'](12.0) + 0.004
    hanger_px = [(463, 368), (481, 362), (490, 398), (487, 406), (474, 407), (468, 388)]
    steel.append(px_prism(hanger_px, Yh, 0.018))
    panel_px = [(467, 372), (474, 370), (480, 402), (476, 404)]
    grey.append(px_prism(panel_px, Yh - 0.0095, 0.0016))
    # clamp arm reaching forward from the block to her belt (hidden in front)
    arm_px = [(392, 412), (412, 412), (412, 436), (392, 436)]
    gun.append(px_prism(arm_px, (0.060 + MOUNT_Y0 + 0.004) / 2, MOUNT_Y0 + 0.004 - 0.060))
    clamp_px = [(388, 408), (416, 408), (416, 440), (388, 440)]
    gun.append(px_prism(clamp_px, 0.071, 0.014))
    # dark front cover on the lower part of the block (the reference shows
    # only dark machinery left of the wrist cuff) and the front end of the
    # drum axle: a short black cylinder with a gold ring
    front_px = [(407, 402), (420, 407), (440, 403), (452, 388), (464, 384), (465, 424),
                (453, 445), (438, 458), (408, 458)]
    dark_front = [px_prism(front_px, MOUNT_Y0 - 0.0010, 0.0024)]
    Rf = hs.frame_from(z=[0.0, -1.0, 0.0], x=[1.0, 0.0, 0.0])
    af = P(431, 413, MOUNT_Y0 - 0.002)
    dark_front.append(hs.cylinder(0.0125, 0.024, seg=24, origin=af, R=Rf, z0=0.0))
    dark_front.append(hs.cylinder(0.0060, 0.0262, seg=16, origin=af, R=Rf, z0=0.0))
    gold_front = _ring(0.0118, 0.0138, 0.010, 0.014, af, Rf, seg=24)
    # back face details: grey inset panel, red bars, screws
    yb = MOUNT_Y1
    grey.append(px_prism([(382, 378), (400, 372), (403, 430), (396, 448), (384, 432)],
                         yb + 0.0006, 0.0016))
    for x0 in (441.0, 447.0):
        red.append(px_prism([(x0, 404), (x0 + 3, 403), (x0 + 3, 440), (x0, 441)],
                            yb + 0.0006, 0.0016))
    for (xs, ys) in ((380, 380), (402, 366), (385, 438), (458, 388), (456, 436)):
        dark.append(cyl_y(P(xs, ys, yb), 0.0021, 0.0018))
    # drum connector on the back face: axis along depth (Y)
    dc = P(424, 425, yb + 0.015)
    rd, hd = 0.0235, 0.030
    Rd = hs.frame_from(z=[0.0, 1.0, 0.0], x=[1.0, 0.0, 0.0])
    drum_black = [hs.cylinder(rd, hd, seg=32, origin=dc, R=Rd)]
    gold = _ring(rd - 0.001, rd + 0.0015, -0.009, -0.003, dc, Rd)
    blue = [_ring(rd - 0.001, rd + 0.0012, 0.0015, 0.0055, dc, Rd),
            _ring(rd - 0.001, rd + 0.0012, -0.0145, -0.0115, dc, Rd)]
    zc = hd / 2
    face = [_ring(0.0, rd * 0.78, zc - 0.001, zc + 0.0012, dc, Rd)]
    for ang in (45, 135, 225, 315):
        p = dc + Rd @ np.array([np.cos(np.radians(ang)) * rd * 0.56,
                                np.sin(np.radians(ang)) * rd * 0.56, zc + 0.0012])
        drum_black.append(hs.cylinder(0.0022, 0.0014, seg=8, origin=p, R=Rd))
    drum_black.append(hs.box((rd * 1.5, 0.004, 0.0014), origin=dc + Rd[:, 2] * (zc + 0.0016),
                             R=Rd))
    out['SwordMount_Housing'] = hs.hard_mesh(white, 'white', bevel=0.0009, outline_w=0.8)
    out['SwordMount_Panel'] = hs.hard_mesh(grey, 'gray', bevel=0.0004, outline_w=0.4)
    out['SwordMount_Stripes'] = hs.hard_mesh(red, 'swords_red', bevel=0.0003, outline_w=0.3)
    out['SwordMount_Screws'] = hs.hard_mesh(dark, 'gunmetal', bevel=0.0, outline=False)
    out['SwordMount_Collar'] = hs.hard_mesh(steel, 'swords_steel', bevel=0.0008, outline_w=0.8)
    out['SwordMount_Arm'] = hs.hard_mesh(gun, 'gunmetal', bevel=0.0008, outline_w=0.8)
    out['SwordMount_Drum'] = hs.hard_mesh(drum_black, 'black', bevel=0.0006, outline_w=0.7)
    out['SwordMount_DrumGold'] = hs.hard_mesh([gold, gold_front], 'gold', bevel=0.0003,
                                              outline_w=0.4)
    out['SwordMount_Front'] = hs.hard_mesh(dark_front, 'black', bevel=0.0006, outline_w=0.6)
    out['SwordMount_DrumBlue'] = hs.hard_mesh(blue, 'glow_blue', bevel=0.0, outline=False)
    out['SwordMount_DrumFace'] = hs.hard_mesh(face, 'gray', bevel=0.0003, outline_w=0.4)
    return out


def cyl_y(p, r, h, seg=10):
    """Short cylinder with its axis along +Y starting at p (screw heads on the
    back face of the housing)."""
    R = hs.frame_from(z=[0.0, 1.0, 0.0], x=[1.0, 0.0, 0.0])
    return hs.cylinder(r, h, seg=seg, origin=p, R=R, z0=-0.0006)


def px_prism(poly_px, Y, t):
    """Prism from a polygon traced in reference pixels, centred at depth Y,
    thickness t along the depth axis."""
    poly = hs.ccw(np.asarray(poly_px, dtype=np.float64) * [1, -1]) * [1, -1]
    n = len(poly)
    V = np.array([P(x, y, Y + t / 2) for x, y in poly] + [P(x, y, Y - t / 2) for x, y in poly])
    F = [list(range(n)), list(range(n, 2 * n))[::-1]]
    for i in range(n):
        j = (i + 1) % n
        F.append([i, n + i, n + j, j])
    return V, F


def _ring(r0, r1, z0, z1, origin, R, seg=32):
    """Closed annulus (tube) r in [r0, r1], z in [z0, z1]; r0 = 0 -> disc."""
    if r0 <= 1e-9:
        return hs.lathe([(0, z0), (r1, z0), (r1, z1), (0, z1)], seg=seg, origin=origin, R=R)
    V, F = hs.frame_prism(hs.circle(r1, seg), hs.circle(r0, seg), z1 - z0)
    V[:, 2] += (z0 + z1) / 2
    return hs.place(V, origin, R), F


# ================================================================ build

def build():
    out = {}
    up, info_u = upper_sword()
    ko, info_k = kodachi()
    nb, sc = nightblaze()
    out.update(nb)
    out.update(up)
    out.update(ko)
    out.update(mount(info_u, info_k, sc))
    return out

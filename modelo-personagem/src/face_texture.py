"""Paint the face texture (eyes, brows, mouth) with PIL.

The head mesh gets a planar front projection:
    u = (x - (HX - 0.075)) / 0.15      v = (z - 1.465) / 0.15
so feature positions measured on the reference picture translate directly.
"""

import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rig import S, PX0, PY0  # noqa: E402

HX = 0.011
SIZE = 2048
SS = 2                      # supersampling
N = SIZE * SS
SKIN = (252, 233, 227)


def to_px(x, z):
    u = (x - (HX - 0.075)) / 0.15
    v = (z - 1.465) / 0.15
    return u * N, (1 - v) * N


def bezier(pts, n=60):
    pts = np.asarray(pts, dtype=float)
    out = []
    for t in np.linspace(0, 1, n):
        p = pts.copy()
        while len(p) > 1:
            p = p[:-1] * (1 - t) + p[1:] * t
        out.append(p[0])
    return np.array(out)


def spline(pts, n=80):
    """Catmull-Rom through points."""
    from scipy.interpolate import CubicSpline
    P = np.asarray(pts, dtype=float)
    t = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))])
    cs = CubicSpline(t, P)
    return cs(np.linspace(0, t[-1], n))


def stroke(draw, pts, w0, w1, col, taper_in=0.15, taper_out=0.15):
    """Variable width stroke as a polygon."""
    pts = np.asarray(pts)
    n = len(pts)
    tan = np.gradient(pts, axis=0)
    tan /= np.maximum(np.linalg.norm(tan, axis=1, keepdims=True), 1e-9)
    nor = np.stack([-tan[:, 1], tan[:, 0]], axis=1)
    t = np.linspace(0, 1, n)
    w = w0 + (w1 - w0) * t
    # taper ends
    w = w * np.clip(t / max(taper_in, 1e-6), 0, 1) ** 0.5 * np.clip((1 - t) / max(taper_out, 1e-6), 0, 1) ** 0.5
    left = pts + nor * w[:, None] * 0.5
    right = pts - nor * w[:, None] * 0.5
    poly = np.concatenate([left, right[::-1]])
    draw.polygon([tuple(p) for p in poly], fill=col)


def eye(img, cx, cz, side, iris_cols):
    """side=-1 for her right eye (outer corner towards -X)."""
    hw = 0.0185                      # half eye width (m)
    ex, ey = to_px(cx, cz)
    unit = hw / 0.15 * N             # pixels per eye unit

    def Q(x, y):
        # +x towards the inner corner
        sx = 1 if side < 0 else -1
        return (ex + sx * x * unit, ey - y * unit)

    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)

    upper = spline([(-1.08, 0.10), (-0.70, 0.30), (-0.15, 0.38), (0.40, 0.34),
                    (0.80, 0.21), (1.00, 0.06)])
    lower = spline([(-1.02, 0.02), (-0.75, -0.22), (-0.20, -0.32), (0.40, -0.30),
                    (0.85, -0.13), (1.00, 0.04)])
    # eye opening (sclera)
    opening = np.concatenate([upper, lower[::-1]])
    op_px = [Q(*p) for p in opening]
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).polygon(op_px, fill=255)

    base = Image.new('RGBA', img.size, (0, 0, 0, 0))
    db = ImageDraw.Draw(base)
    db.polygon(op_px, fill=(246, 242, 246, 255))
    # lid shadow on the sclera
    sh = np.concatenate([upper, (upper + [0, -0.22])[::-1]])
    db.polygon([Q(*p) for p in sh], fill=(198, 188, 210, 255))

    # iris rendered per pixel for smooth gradients
    icx, icy, irx, iry = 0.0, -0.03, 0.42, 0.54
    top, mid, bot, ring = (np.array(c, dtype=float) for c in iris_cols)
    x0, y0 = Q(icx - irx * 1.1, icy + iry * 1.1)
    x1, y1 = Q(icx + irx * 1.1, icy - iry * 1.1)
    bx0, bx1 = int(min(x0, x1)), int(max(x0, x1)) + 1
    by0, by1 = int(min(y0, y1)), int(max(y0, y1)) + 1
    X, Y = np.meshgrid(np.arange(bx0, bx1) + 0.5, np.arange(by0, by1) + 0.5)
    sx = 1 if side < 0 else -1
    lx = (X - ex) / unit * sx            # local eye units, +x inner corner
    ly = -(Y - ey) / unit
    rx = (lx - icx) / irx
    ry = (ly - icy) / iry
    r = np.sqrt(rx * rx + ry * ry)
    t = np.clip((icy + iry - ly) / (2 * iry), 0, 1)[..., None]     # 0 top .. 1 bottom
    col = np.where(t < 0.5, top + (mid - top) * (t / 0.5), mid + (bot - mid) * ((t - 0.5) / 0.5))
    # subtle radial streaks
    ang = np.arctan2(ry, rx)
    streak = 0.06 * np.sin(ang * 14) * np.clip((r - 0.35) / 0.4, 0, 1)
    col = col * (1 + streak[..., None])
    # darker rim
    rim = np.clip((r - 0.80) / 0.14, 0, 1)[..., None]
    col = col * (1 - rim) + ring * rim
    # pupil
    pr = np.sqrt(((lx - icx) / 0.15) ** 2 + ((ly - icy - 0.02) / 0.25) ** 2)
    pm = np.clip((1.0 - pr) / 0.08, 0, 1)[..., None]
    col = col * (1 - 0.85 * pm) + ring * 0.85 * pm
    alpha = np.clip((1.0 - r) * irx * unit / 1.5, 0, 1) * 255
    rgba = np.concatenate([np.clip(col, 0, 255), alpha[..., None]], axis=-1).astype(np.uint8)
    iris = Image.new('RGBA', img.size, (0, 0, 0, 0))
    iris.paste(Image.fromarray(rgba, 'RGBA'), (bx0, by0))
    base.alpha_composite(iris)
    # shadow of the upper lid over the iris
    sh2 = np.concatenate([upper, (upper + [0, -0.30])[::-1]])
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon([Q(*p) for p in sh2], fill=(40, 16, 36, 120))
    base.alpha_composite(shadow)
    db = ImageDraw.Draw(base)
    # highlights (same side on both eyes: light from the viewer's left)
    def H(x, y):
        return (ex + x * unit, ey - y * unit)
    hx = -0.16 if side < 0 else -0.20
    h0, h1 = H(hx - 0.13, icy + 0.30), H(hx + 0.07, icy + 0.08)
    db.ellipse([h0[0], h0[1], h1[0], h1[1]], fill=(255, 255, 255, 245))
    h0, h1 = H(0.12, icy - 0.22), H(0.22, icy - 0.32)
    db.ellipse([h0[0], h0[1], h1[0], h1[1]], fill=(255, 255, 255, 210))
    # clip everything to the eye opening
    clipped = Image.new('RGBA', img.size, (0, 0, 0, 0))
    clipped.paste(base, (0, 0), mask)
    layer.alpha_composite(clipped)

    d = ImageDraw.Draw(layer)
    lash = (38, 26, 34, 255)
    # upper lash line, thick at the outer corner
    up_line = spline([(-1.16, 0.02), (-1.0, 0.13), (-0.70, 0.32), (-0.15, 0.40),
                      (0.40, 0.36), (0.80, 0.23), (1.02, 0.07)], 120)
    stroke(d, [Q(*p) for p in up_line], unit * 0.20, unit * 0.06, lash, 0.08, 0.10)
    # outer flick
    flick = spline([(-0.85, 0.24), (-1.10, 0.18), (-1.30, 0.06)], 30)
    stroke(d, [Q(*p) for p in flick], unit * 0.12, unit * 0.02, lash, 0.05, 0.9)
    # lower lash line (outer half only)
    lo_line = spline([(-1.02, 0.02), (-0.80, -0.22), (-0.35, -0.35), (0.10, -0.36)], 60)
    stroke(d, [Q(*p) for p in lo_line], unit * 0.07, unit * 0.02, (90, 60, 70, 255), 0.1, 0.5)
    # double eyelid crease
    crease = spline([(-0.75, 0.52), (-0.20, 0.64), (0.35, 0.60), (0.70, 0.48)], 50)
    stroke(d, [Q(*p) for p in crease], unit * 0.035, unit * 0.02, (196, 140, 140, 255), 0.3, 0.3)
    # eyebrow (light, slightly frowning)
    brow = spline([(-0.95, 1.02), (-0.40, 1.12), (0.20, 1.10), (0.75, 0.98)], 60)
    stroke(d, [Q(*p) for p in brow], unit * 0.10, unit * 0.07, (150, 140, 160, 255), 0.25, 0.15)
    img.alpha_composite(layer)


def main(out):
    img = Image.new('RGBA', (N, N), SKIN + (255,))
    # positions measured on the reference (pixels -> metres)
    rz = (PY0 - 121) * S
    eye(img, (335 - PX0) * S, rz, -1,
        ((80, 8, 20), (178, 24, 40), (255, 110, 110), (60, 6, 14)))
    eye(img, (366 - PX0) * S, rz, +1,
        ((14, 58, 84), (40, 146, 178), (150, 240, 255), (10, 40, 60)))
    d = ImageDraw.Draw(img)
    # nose: tiny shadow
    nx, ny = to_px(HX + 0.0015, 1.5255)
    u = 0.0185 / 0.15 * N
    d.ellipse([nx - 0.06 * u, ny - 0.03 * u, nx + 0.06 * u, ny + 0.03 * u], fill=(226, 170, 165, 255))
    # mouth
    mz = (PY0 - 144) * S
    mx = HX - 0.0015
    pts = spline([(mx - 0.0085, mz + 0.0006), (mx - 0.003, mz + 0.0002),
                  (mx + 0.003, mz + 0.0002), (mx + 0.0085, mz + 0.0008)], 60)
    stroke(d, [to_px(*p) for p in pts], u * 0.07, u * 0.07, (170, 96, 98, 255), 0.25, 0.25)
    lip = spline([(mx - 0.003, mz - 0.0022), (mx + 0.003, mz - 0.0022)], 20)
    stroke(d, [to_px(*p) for p in lip], u * 0.05, u * 0.05, (236, 190, 186, 255), 0.4, 0.4)
    img = img.resize((SIZE, SIZE), Image.LANCZOS).convert('RGB')
    img.save(out)


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main(os.path.join(root, 'textures', 'face.png'))

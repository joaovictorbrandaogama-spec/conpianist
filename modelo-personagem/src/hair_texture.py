"""Paint the hair texture: root-to-tip gradient, strand streaks, a soft
highlight ring near the crown.  u runs around the lock section (outer arc
0..0.5), v is the distance from the root in metres (0..1)."""

import os
import numpy as np
from PIL import Image

W, H = 512, 1024


def lerp_stops(v, stops):
    xs = np.array([s[0] for s in stops])
    cs = np.array([s[1] for s in stops], dtype=float)
    return np.stack([np.interp(v, xs, cs[:, i]) for i in range(3)], axis=-1)


def main(out):
    rng = np.random.default_rng(7)
    u = (np.arange(W) + 0.5) / W
    v = 1.0 - (np.arange(H) + 0.5) / H          # image top = v 1
    U, Vv = np.meshgrid(u, v)
    stops = [(0.0, (196, 190, 214)), (0.025, (232, 230, 240)), (0.06, (247, 246, 251)),
             (0.35, (246, 245, 250)), (0.70, (236, 233, 243)), (1.0, (222, 212, 228))]
    col = lerp_stops(Vv, stops)
    # inner side of the lock a touch darker / cooler
    inner = (U > 0.5).astype(float)[..., None]
    col = col * (1 - 0.06 * inner) + np.array([-4, -4, 2]) * inner
    # strand streaks
    shade = np.ones((H, W))
    for _ in range(140):
        u0 = rng.uniform(0, 1)
        wpx = rng.uniform(0.8, 2.6)
        v0 = rng.uniform(-0.2, 0.9)
        v1 = v0 + rng.uniform(0.15, 0.9)
        k = rng.uniform(0.88, 0.95) if rng.random() < 0.75 else rng.uniform(1.02, 1.05)
        wob = rng.uniform(0, 6.28)
        uu = u0 + 0.01 * np.sin(Vv * 9 + wob)
        d = np.abs((U - uu) * W)
        m = np.clip(1 - d / wpx, 0, 1) * ((Vv > v0) & (Vv < v1))
        fade = np.clip(np.minimum(Vv - v0, v1 - Vv) / 0.05, 0, 1)
        shade *= 1 - (1 - k) * m * fade
    col = col * shade[..., None]
    # highlight ring near the crown (zig-zag lower edge), outer side only
    edge = 0.115 + 0.012 * np.abs(((U * 18) % 2) - 1)
    ring = ((Vv > 0.075) & (Vv < edge) & (U < 0.5)).astype(float)
    col = col * (1 - 0.6 * ring[..., None]) + 255 * 0.6 * ring[..., None]
    img = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB')
    img.save(out)


if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    main(os.path.join(root, 'textures', 'hair.png'))

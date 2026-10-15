"""Paint the hair textures.  u runs around the lock section (outer arc
0..0.5, inner arc 0.5..1), v from root (0) to tip (1).

* hair.png       bangs, side locks, crown: light silver, mauve-grey tips
* hair_tail.png  ponytail: the lower third fades to pink and red tips
"""

import os
import numpy as np
from PIL import Image

W, H = 256, 1024


def lerp_stops(v, stops):
    xs = np.array([s[0] for s in stops])
    cs = np.array([s[1] for s in stops], dtype=float)
    return np.stack([np.interp(v, xs, cs[:, i]) for i in range(3)], axis=-1)


def paint(stops, seed, out):
    rng = np.random.default_rng(seed)
    u = (np.arange(W) + 0.5) / W
    v = 1.0 - (np.arange(H) + 0.5) / H          # image top = v 1 (tip)
    U, V = np.meshgrid(u, v)
    col = lerp_stops(V, stops)
    # inner arc (faces the head) cooler and darker
    inner = (U > 0.5).astype(float)[..., None]
    col = col * (1 - 0.10 * inner) + np.array([-6, -6, 4]) * inner
    # darker towards the sharp side edges of the outer arc
    edge = np.clip(1 - np.abs(U - 0.25) / 0.25, 0, 1)
    col = col * (0.965 + 0.035 * edge[..., None] ** 0.5)
    # strand streaks
    shade = np.ones((H, W))
    for _ in range(90):
        u0 = rng.uniform(0.02, 0.48)
        wpx = rng.uniform(0.8, 2.2)
        v0 = rng.uniform(-0.1, 0.85)
        v1 = v0 + rng.uniform(0.2, 0.8)
        k = rng.uniform(0.93, 0.97) if rng.random() < 0.8 else rng.uniform(1.02, 1.04)
        d = np.abs((U - u0) * W)
        m = np.clip(1 - d / wpx, 0, 1) * ((V > v0) & (V < v1))
        fade = np.clip(np.minimum(V - v0, v1 - V) / 0.06, 0, 1)
        shade *= 1 - (1 - k) * m * fade
    col = col * shade[..., None]
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), 'RGB').save(out)


def main(root):
    tex = os.path.join(root, 'textures')
    paint([(0.0, (200, 197, 214)), (0.05, (236, 235, 242)), (0.20, (248, 247, 251)),
           (0.60, (245, 244, 249)), (0.85, (232, 227, 236)), (1.0, (216, 204, 218))],
          3, os.path.join(tex, 'hair.png'))
    paint([(0.0, (200, 197, 214)), (0.05, (236, 235, 242)), (0.25, (248, 247, 251)),
           (0.55, (244, 241, 247)), (0.70, (238, 212, 222)), (0.85, (222, 148, 164)),
           (1.0, (188, 70, 86))],
          5, os.path.join(tex, 'hair_tail.png'))


if __name__ == '__main__':
    main(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

"""Build the character parts and store them in ../cache/*.npz.

Run with any Python that has numpy, scipy and scikit-image, e.g. Blender's:

    <blender>/4.5/python/bin/python3.11 build_parts.py [part ...]

Without arguments every part is rebuilt.
"""

import sys
import time

import cache
import parts

if __name__ == '__main__':
    names = sys.argv[1:] or list(parts.BUILDERS)
    for n in names:
        t = time.time()
        objs = parts.BUILDERS[n]()
        cache.save(n, objs)
        nv = sum(len(m.verts) for m in objs.values())
        nf = sum(m.nf for m in objs.values())
        print(f'{n:12s} {len(objs):3d} objects {nv:8d} verts {nf:8d} faces  '
              f'{time.time() - t:6.1f}s', flush=True)

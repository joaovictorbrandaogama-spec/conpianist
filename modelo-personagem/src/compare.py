"""Overlay a render on the reference image: compare.py render.png out.png"""
import sys
from PIL import Image, ImageChops, ImageFilter
import os
HERE = os.path.dirname(os.path.abspath(__file__))
ref = Image.open(os.path.join(HERE, '..', 'reference', 'reference.png')).convert('RGBA')
ren = Image.open(sys.argv[1]).convert('RGBA').resize(ref.size)
white = Image.new('RGBA', ref.size, (255, 255, 255, 255))
r = white.copy(); r.alpha_composite(ren)
f = white.copy(); f.alpha_composite(ref)
# side by side + blend
blend = Image.blend(f.convert('RGB'), r.convert('RGB'), 0.5)
# silhouette edge of render in red over reference
a = ren.split()[3].point(lambda v: 255 if v > 128 else 0)
edge = a.filter(ImageFilter.FIND_EDGES)
over = f.convert('RGB').copy()
over.paste((255, 0, 0), mask=edge)
W, H = ref.size
out = Image.new('RGB', (W * 3, H), (255, 255, 255))
out.paste(f.convert('RGB'), (0, 0)); out.paste(r.convert('RGB'), (W, 0)); out.paste(over, (2 * W, 0))
out.save(sys.argv[2])

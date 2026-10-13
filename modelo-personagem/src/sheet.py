"""sheet.py out.png h img1 img2 ... : paste renders side by side (height h)."""
import sys
from PIL import Image
out, h = sys.argv[1], int(sys.argv[2])
ims = []
for p in sys.argv[3:]:
    b = Image.open(p).convert('RGBA')
    w = Image.new('RGBA', b.size, (255, 255, 255, 255)); w.alpha_composite(b)
    w = w.convert('RGB')
    ims.append(w.resize((int(w.width * h / w.height), h), Image.LANCZOS))
W = sum(i.width for i in ims)
o = Image.new('RGB', (W, h), 'white')
x = 0
for i in ims:
    o.paste(i, (x, 0)); x += i.width
o.save(out)

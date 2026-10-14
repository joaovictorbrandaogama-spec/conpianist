"""Refresh the web viewer: inject the palette and embed the web glb.

    python3 viewer_build.py
"""
import base64
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pal = json.load(open(os.path.join(ROOT, 'export', 'palette.json')))
compact = {k: [v['lit'], v['shadow'], v['outline'], v['thr'], v['spec'], v['gloss'],
               v['spec_col'], v['rim'], v['emit'], v['shade2']] for k, v in pal.items()}
page = os.path.join(ROOT, 'viewer', 'index.html')
html = open(page).read()
html = re.sub(r'const PALETTE = \{.*?\};', 'const PALETTE = ' + json.dumps(compact, separators=(',', ':')) + ';',
              html, count=1, flags=re.S)
open(page, 'w').write(html)
glb = open(os.path.join(ROOT, 'export', 'personagem_web.glb'), 'rb').read()
open(os.path.join(ROOT, 'viewer', 'personagem_web.b64.txt'), 'w').write(base64.b64encode(glb).decode())
print('palette entries', len(compact), 'glb bytes', len(glb))

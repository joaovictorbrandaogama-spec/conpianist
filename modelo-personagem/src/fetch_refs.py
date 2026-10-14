"""Download the extra reference images listed in docs/research.json into
reference/extra/ (they are not kept in git).

    python3 fetch_refs.py
"""

import json
import os
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    with open(os.path.join(ROOT, 'docs', 'research.json')) as f:
        images = json.load(f)['refs']['images']
    for im in images:
        dst = os.path.join(ROOT, im['path'])
        if os.path.exists(dst) or not im.get('source_url'):
            continue
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        try:
            req = urllib.request.Request(im['source_url'], headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=60) as r, open(dst, 'wb') as out:
                out.write(r.read())
            print('ok  ', im['path'])
        except Exception as e:  # some hosts block hotlinking; keep going
            print('fail', im['path'], e)


if __name__ == '__main__':
    main()

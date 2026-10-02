"""
Descarga los frames de una animación hecha con animate_image a raw/<nombre>/<i>.png
(el frame 0 es la imagen original).

    PIXELLAB_KEY=... python fetch_frames.py <nombre> <job_id>
"""
import os, re, sys, urllib.request
from pixellab_api import call

HERE = os.path.dirname(os.path.abspath(__file__))
name, job = sys.argv[1], sys.argv[2]
info = call("get_image", job_id=job)
n = int(re.search(r"frames: (\d+)", info).group(1))
out = os.path.join(HERE, "raw", name)
os.makedirs(out, exist_ok=True)
for i in range(n):
    dest = os.path.join(out, f"{i}.png")
    if os.path.exists(dest): continue
    req = urllib.request.Request(f"https://api.pixellab.ai/mcp/images/{job}/download?index={i}", headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
        f.write(r.read())
print(name, n, "frames")

"""
Añade a sources.json el arte del Mundo 4 que ya terminó de generar gen_world4.py
(lee raw/gen_world4_log.json). Se puede relanzar: solo agrega lo que falte.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_P = os.path.join(HERE, "sources.json")
src = json.load(open(SRC_P, encoding="utf-8"))
log = json.load(open(os.path.join(HERE, "raw", "gen_world4_log.json"), encoding="utf-8"))
url = lambda job: f"https://api.pixellab.ai/mcp/images/{job}/download"
job = lambda k: re.search(r"job_id: ([0-9a-f-]{36})", log[k]).group(1)
done = lambda k: k in log and (k + "_wait") in log

IMAGES = {
    "bg_winter": {"crop": False},
    "village": {"key_bg": True, "lights": ["color", "warm"]},
    "xmas_tree": {"lights": ["color"]},
    "candy_cane": {}, "gifts": {}, "lamp": {}, "thin_ice": {}, "icicle": {},
    "sleigh": {}, "snowman": {}, "penguin": {}, "elf": {},
    "house": {"lights": ["color", "warm"]},
    "interior": {"crop": False, "lights": ["color"]},
    "mom_lying": {},
}
for k, extra in IMAGES.items():
    if done(k) and k not in src["images"]:
        src["images"][k] = dict({"url": url(job(k))}, **extra)
        print("+ imagen", k)

if "tiles_winter" not in src["tilesets"] and os.path.exists(os.path.join(HERE, "raw", "tileset_winter.png")):
    src["tilesets"]["tiles_winter"] = {"image": "raw/tileset_winter.png", "meta": "raw/tileset_winter_meta.json"}
    print("+ tileset tiles_winter")


def frames(name):
    d = os.path.join(HERE, "raw", name)
    if not os.path.isdir(d): return None
    return [f"raw/{name}/{f}" for f in sorted(os.listdir(d), key=lambda x: int(x[:-4]))]


FRAME_SETS = {  # animate_image: el frame 0 es la imagen original
    "sleigh_fly": lambda f: {"fly": {"files": f, "fps": 10}},
    "snowman_throw": lambda f: {"idle": {"files": f[:1]}, "throw": {"files": f[1:], "fps": 12}},
    "elf_wave": lambda f: {"wave": {"files": f, "fps": 7}},
}
for name, mk in FRAME_SETS.items():
    f = frames(name)
    if f and name not in src["frame_sets"]:
        src["frame_sets"][name] = {"source": f"animate_image {job(name)}", "anims": mk(f)}
        print("+ animación", name)

# personajes (cuenta 2): el lobo y su cachorro
OWNER2 = "https://backblaze.pixellab.ai/file/pixellab-characters/"
for name, key, anims in (("wolf", "wolf", ("run", "howl", "sad")), ("cub", "cub", ("run",))):
    info = log.get(key + "_info")
    if not info or name in src["characters"]: continue
    cid = re.search(r"^id: ([0-9a-f-]{36})", info, re.M).group(1)
    owner = re.search(r"pixellab-characters/([0-9a-f-]{36})/", info).group(1)
    entry = {"owner_base": OWNER2 + owner, "id": cid, "outline": "#2b2440", "anims": {"idle": {"rotation": "east"}}}
    for a in anims:
        m = re.search(rf"^\s+{a} .*?(\d+)f.*?\n\s+east: \S+/animations/([0-9a-f-]{{36}})/east/0\.png", info, re.M)
        if m: entry["anims"][a] = {"anim_id": m.group(2), "count": int(m.group(1)), "fps": {"run": 14, "howl": 7, "sad": 5}[a] if name == "wolf" else 12,
                                   "align_feet": a != "run"}
    src["characters"][name] = entry
    print("+ personaje", name, list(entry["anims"]))

json.dump(src, open(SRC_P, "w", encoding="utf-8"), indent=1, ensure_ascii=False)

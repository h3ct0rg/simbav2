"""
Descarga los sprites de PixelLab definidos en sources.json, guarda los originales
en raw/ y versiones recortadas (bbox común por personaje, pies alineados) listas
para el juego. Genera manifest.js para que el juego funcione abriendo index.html
directamente (sin servidor).

Uso:  python build_sprites.py
"""
import json, os, urllib.request
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = json.load(open(os.path.join(HERE, "sources.json"), encoding="utf-8"))
OWNER = SRC["owner_base"]


def fetch(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if not os.path.exists(dest):
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as r, open(dest, "wb") as f:
            f.write(r.read())
    return Image.open(dest).convert("RGBA")


def add_outline(im, color):
    """Contorno de 1 px alrededor de la silueta (para que el sprite destaque sobre fondos claros)."""
    rgb = tuple(int(color[i:i + 2], 16) for i in (1, 3, 5))
    mask = im.split()[3].point(lambda a: 255 if a > 40 else 0)
    ring = mask.filter(ImageFilter.MaxFilter(3))
    out = Image.new("RGBA", im.size, rgb + (0,))
    out.putalpha(ring.point(lambda a: 235 if a else 0))
    out.alpha_composite(im)
    return out


def snap_palette(im, ref):
    """Recolorea `im` con los colores exactos de `ref` (mismo personaje, misma paleta).
    Empareja por luminancia y saturación para conservar el sombreado de `im`."""
    pal = sorted({p[:3] for p in ref.getdata() if p[3] > 40})
    lum = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    sat = lambda c: max(c) - min(c)
    cache = {}
    def nearest(c):
        if c not in cache:
            cache[c] = min(pal, key=lambda q: (lum(q) - lum(c)) ** 2 + (sat(q) - sat(c)) ** 2 * 0.6
                           + sum((a - b) ** 2 for a, b in zip(q, c)) * 0.15)
        return cache[c]
    out = Image.new("RGBA", im.size)
    out.putdata([(nearest(p[:3]) + (255,)) if p[3] > 40 else (0, 0, 0, 0) for p in im.getdata()])
    return out


def rel(p):
    return os.path.relpath(p, HERE).replace("\\", "/")


manifest = {}

# ---- Personajes con animaciones ----
for name, ch in SRC.get("characters", {}).items():
    # cada personaje puede venir de otra cuenta de PixelLab (otra carpeta en el servidor)
    OWNER = ch.get("owner_base", SRC["owner_base"])
    frames = {}  # anim -> [Image]
    raw_paths = {}
    for anim, a in ch["anims"].items():
        if "rotation" in a:
            # pose fija: una rotación del personaje usada como animación de 1 frame
            url = f"{OWNER}/{ch['id']}/rotations/{a['rotation']}.png"
            frames[anim] = [fetch(url, os.path.join(HERE, "raw", name, "rotations", f"{a['rotation']}.png"))]
            continue
        imgs = []
        for i in range(a["count"]):
            url = f"{OWNER}/{ch['id']}/animations/{a['anim_id']}/{a.get('dir', 'east')}/{i}.png"
            # la copia local incluye el id de la animación: si se cambia una animación por otra
            # con el mismo nombre, NO se reutilizan los frames viejos
            dest = os.path.join(HERE, "raw", name, anim, a["anim_id"][:8], f"{i}.png")
            imgs.append(fetch(url, dest))
        frames[anim] = imgs
    for rot in ch.get("rotations", ["east", "west", "south"]):
        url = f"{OWNER}/{ch['id']}/rotations/{rot}.png"
        fetch(url, os.path.join(HERE, "raw", name, "rotations", f"{rot}.png"))

    # Las animaciones pueden venir en lienzos de distinto tamaño (p. ej. v3 = 96 px, plantillas = 92 px):
    # se centran todas en un lienzo común para que el personaje no "salte" al cambiar de animación
    CW = max(im.width for imgs in frames.values() for im in imgs)
    CH = max(im.height for imgs in frames.values() for im in imgs)
    for anim, imgs in frames.items():
        for i, im in enumerate(imgs):
            if im.size != (CW, CH):
                canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
                canvas.paste(im, ((CW - im.width) // 2, (CH - im.height) // 2))
                imgs[i] = canvas

    # bbox común a todos los frames del personaje -> todos del mismo tamaño y alineados
    boxes = [im.getbbox() for imgs in frames.values() for im in imgs if im.getbbox()]
    l = min(b[0] for b in boxes); t = min(b[1] for b in boxes)
    r = max(b[2] for b in boxes); b_ = max(b[3] for b in boxes)
    w = r - l
    # centramos horizontalmente respecto al lienzo para no desplazar el pivote
    W = frames[next(iter(frames))][0].width
    cx = W / 2
    half = max(cx - l, r - cx)
    l2, r2 = int(cx - half), int(cx + half + 0.5)
    entry = {"anims": {}}
    outline = ch.get("outline")
    pad = 1 if outline else 0  # margen para que el contorno no se corte (abajo no: los pies apoyan)
    for anim, imgs in frames.items():
        # El borde inferior se ajusta a las patas de ESTA animación (su punto más bajo),
        # así el sprite apoya en el suelo aunque otra animación (p. ej. salto) baje más.
        bottom = max(im.getbbox()[3] for im in imgs if im.getbbox())
        # "align_feet": cada frame se desplaza para que sus patas toquen el mismo borde
        # (corrige animaciones donde el sprite entero sube/baja 1 px entre frames)
        align = ch["anims"][anim].get("align_feet", False)
        paths = []
        for i, im in enumerate(imgs):
            out = os.path.join(HERE, name, anim, f"{i}.png")
            os.makedirs(os.path.dirname(out), exist_ok=True)
            if align and im.getbbox():
                shift = bottom - im.getbbox()[3]
                moved = Image.new("RGBA", im.size, (0, 0, 0, 0))
                moved.paste(im, (0, shift))
                im = moved
            if outline:
                im = add_outline(im, outline)
            im.crop((l2 - pad, t - pad, r2 + pad, bottom)).save(out)
            paths.append(rel(out))
        entry["anims"][anim] = {"fps": ch["anims"][anim].get("fps", 10), "frames": paths}
    entry["size"] = [r2 - l2, b_ - t]
    manifest[name] = entry
    print(f"{name}: {entry['size']} ", {k: len(v) for k, v in frames.items()})

# ---- Animaciones hechas con animate_image (frames sueltos ya descargados en raw/) ----
# Todos los frames del conjunto comparten recorte (bbox común) y apoyan los pies abajo.
for name, sd in SRC.get("frame_sets", {}).items():
    frames = {a: [Image.open(os.path.join(HERE, f)).convert("RGBA") for f in d["files"]] for a, d in sd["anims"].items()}
    boxes = [im.getbbox() for imgs in frames.values() for im in imgs if im.getbbox()]
    l = min(b[0] for b in boxes); t = min(b[1] for b in boxes)
    r = max(b[2] for b in boxes); b_ = max(b[3] for b in boxes)
    entry = {"anims": {}}
    for anim, imgs in frames.items():
        paths = []
        for i, im in enumerate(imgs):
            out = os.path.join(HERE, name, anim, f"{i}.png")
            os.makedirs(os.path.dirname(out), exist_ok=True)
            im.crop((l, t, r, b_)).save(out)
            paths.append(rel(out))
        entry["anims"][anim] = {"fps": sd["anims"][anim].get("fps", 10), "frames": paths}
    manifest[name] = entry
    print(f"{name}: {[r - l, b_ - t]}", {k: len(v) for k, v in frames.items()})

# ---- Imágenes sueltas (enemigos estáticos, fondo) ----
for name, im_def in SRC.get("images", {}).items():
    dest = os.path.join(HERE, "raw", name + ".png")
    im = fetch(im_def["url"], dest)
    out = os.path.join(HERE, name, name + ".png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if im_def.get("palette_from"):
        im = snap_palette(im, Image.open(os.path.join(HERE, im_def["palette_from"])).convert("RGBA"))
    if im_def.get("slim_variants"):
        # Variantes adelgazadas (ver slim.py): de la más flaca a la original
        from slim import slim
        paths = []
        for i, k in enumerate(im_def["slim_variants"] + [1.0]):
            v = slim(im, k) if k < 1 else im
            v = v.crop(v.getbbox())
            vout = os.path.join(HERE, name, f"{name}_{i}.png")
            v.save(vout)
            paths.append(rel(vout))
        manifest[name] = paths
        print(f"{name}: {len(paths)} variantes")
        continue
    if im_def.get("crop", True):
        im = im.crop(im.getbbox())
    im.save(out)
    manifest[name] = rel(out)
    print(f"{name}: {im.size}")

# ---- Tilesets Wang de esquinas (uno por estación) ----
# wang_N: bits SE=1, SW=2, NE=4, NW=8 marcan esquinas "upper" (vacías); "lower" = tierra.
for key, ts in SRC.get("tilesets", {}).items():
    sheet = Image.open(os.path.join(HERE, ts["image"])).convert("RGBA")
    meta = json.load(open(os.path.join(HERE, ts["meta"]), encoding="utf-8"))
    manifest[key] = {}
    for t in meta["tileset_data"]["tiles"]:
        bb = t["bounding_box"]
        out = os.path.join(HERE, key, t["name"] + ".png")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        sheet.crop((bb["x"], bb["y"], bb["x"] + bb["width"], bb["y"] + bb["height"])).save(out)
        manifest[key][t["name"]] = rel(out)
    print(key + ":", len(manifest[key]), "tiles")

with open(os.path.join(HERE, "manifest.js"), "w", encoding="utf-8") as f:
    f.write("// Generado por build_sprites.py — no editar a mano\n")
    f.write("window.SPRITES = " + json.dumps(manifest, indent=1) + ";\n")
print("manifest.js listo")

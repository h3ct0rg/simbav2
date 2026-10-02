"""
Genera en PixelLab el arte del Mundo 3 (Otoño), uno a uno (plan trial = 1 trabajo a la vez).
Guarda las respuestas en raw/gen_world3_log.json. Si se relanza, se salta lo ya hecho.

    PIXELLAB_KEY=... python gen_world3.py
"""
import json, os, re
from pixellab_api import call, wait_jobs

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, "raw", "gen_world3_log.json")
log = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else {}


def save():
    json.dump(log, open(LOG, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


def step(name, fn):
    if name in log:
        print("ya hecho:", name, flush=True); return log[name]
    print(">>", name, flush=True)
    out = fn()
    log[name] = out; save()
    print(out[:240].replace("\n", " | "), flush=True)
    return out


def image(name, **kw):
    out = step(name, lambda: call("create_image_pixflux", **kw))
    step(name + "_wait", wait_jobs)
    return re.search(r"job_id: ([0-9a-f-]{36})", out).group(1)


SIDE = dict(no_background=True, view="side", outline="single color black outline")

image("bg_autumn", description="warm autumn landscape background for a 2D platformer game at golden hour, a calm blue lake in the middle distance reflecting a big low golden sun, forest of orange red and yellow autumn trees, soft hills, a strip of grass with fallen orange leaves along the bottom edge, vivid warm saturated colors, no characters",
      width=400, height=224, no_background=False, view="side", detail="highly detailed")

step("tiles_autumn", lambda: call("create_sidescroller_tileset", lower_description="dark brown forest soil with small roots and pebbles",
                                  transition_description="grass covered with fallen orange and red autumn leaves", transition_size=0.25,
                                  tile_size={"width": 32, "height": 32}, detail="medium detail", shading="basic shading", outline="selective outline"))
step("tiles_autumn_wait", wait_jobs)

image("squirrel", description="mischievous red squirrel enemy standing upright holding an acorn ready to throw, big fluffy tail, side view facing left",
      width=64, height=64, direction="west", **SIDE)
image("boar", description="angry wild boar enemy with small tusks and bristly brown fur, side view facing left, ready to charge",
      width=64, height=64, direction="west", **SIDE)
image("hedgehog", description="friendly cute hedgehog with a tiny red scarf, side view facing left, smiling, standing on the ground",
      width=64, height=64, direction="west", **SIDE)
image("leaf_raft", description="one giant orange autumn leaf floating flat on water, seen from the side, horizontal, game platform",
      width=96, height=32, **SIDE)
boss = image("boss_squirrel", description="giant boss squirrel, plump with a huge fluffy red tail, holding a big acorn, mischievous angry face, side view facing left",
             width=128, height=96, direction="west", **SIDE)

# animación de curación: se come una bellota dorada (con animate_image, mantiene el estilo)
step("boss_squirrel_eat", lambda: call("animate_image", action="the squirrel lifts a glowing golden acorn to its mouth and eats it happily, chewing, regaining energy",
                                       first_frame_url=f"https://api.pixellab.ai/mcp/images/{boss}/download", frame_count=8, no_background=True))
step("boss_squirrel_eat_wait", wait_jobs)

print("== LISTO ==", flush=True)
print(call("get_balance"), flush=True)

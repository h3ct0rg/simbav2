"""
Genera en PixelLab el arte del Mundo 2 (Verano), uno a uno (plan trial = 1 trabajo a la vez).
Guarda las respuestas en raw/gen_world2_log.json. Si se relanza, se salta lo ya hecho.

    PIXELLAB_KEY=... python gen_world2.py
"""
import json, os, re
from pixellab_api import call, wait_jobs

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, "raw", "gen_world2_log.json")
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

# Fondo con cascada (la franja inferior de hierba sirve para anclarlo al suelo, como en primavera)
image("bg_summer", description="bright sunny summer landscape background for a 2D platformer game, a tall white waterfall falling from green rocky cliffs into a turquoise river in the middle distance, palm trees and tropical bushes, blue sky with a few clouds, vivid saturated colors, a strip of green grass with small yellow flowers along the bottom edge, no characters",
      width=400, height=224, no_background=False, view="side", detail="highly detailed")

# Tileset de arena
step("tiles_summer", lambda: call("create_sidescroller_tileset", lower_description="golden beach sand with small shells and pebbles",
                                  transition_description="bright sunny green grass", transition_size=0.25,
                                  tile_size={"width": 32, "height": 32}, detail="medium detail", shading="basic shading", outline="selective outline"))
step("tiles_summer_wait", wait_jobs)

# Enemigos, mensajero y objetos
image("crab", description="small red beach crab enemy walking sideways, side view, two raised claws, angry eyes on stalks", width=64, height=64, **SIDE)
image("bee", description="chubby angry bumblebee enemy flying, side view facing left, yellow and black stripes, small translucent wings, stinger", width=64, height=64, direction="west", **SIDE)
image("urchin", description="round spiky purple sea urchin hazard with long sharp spikes, sitting on the ground, cute eyes", width=48, height=48, **SIDE)
image("turtle", description="friendly green sea turtle wearing a small straw hat, side view facing left, smiling, standing on the sand", width=64, height=64, direction="west", **SIDE)
image("mushroom", description="big bouncy red mushroom springboard with white spots and a short thick white stem, side view game prop", width=64, height=64, **SIDE)
image("log", description="floating wooden log raft platform made of three tied logs, side view, horizontal, game platform", width=96, height=32, **SIDE)

# Jefe: Don Pinzas (dos poses: pinzas arriba / pinzas clavadas en la arena)
crab_up = image("boss_crab_up", description="giant boss crab, huge red armored shell, two enormous claws raised high above its head, angry eyes, side view facing left, menacing",
                width=128, height=96, direction="west", **SIDE)
image("boss_crab_down", description="the same giant red boss crab with both enormous claws slammed down and stuck in the sand, dizzy eyes, side view facing left",
      width=128, height=96, direction="west", init_image_url=f"https://api.pixellab.ai/mcp/images/{crab_up}/download", init_image_strength=180, **SIDE)

print("== LISTO ==", flush=True)
print(call("get_balance"), flush=True)

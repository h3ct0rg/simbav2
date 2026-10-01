"""
Genera en PixelLab el arte nuevo del Mundo 1 (fase 1), uno a uno (plan trial = 1 trabajo a la vez).
Guarda las respuestas completas en raw/gen_world1_log.json para extraer IDs y URLs.

    PIXELLAB_KEY=... python gen_world1.py
"""
import json, os, re, time
from pixellab_api import call, wait_jobs

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, "raw", "gen_world1_log.json")
log = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else {}


def save():
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    json.dump(log, open(LOG, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


def step(name, fn):
    """Ejecuta un paso una sola vez (si el script se relanza, se salta lo ya hecho)."""
    if name in log:
        print("ya hecho:", name); return log[name]
    print(">>", name, flush=True)
    out = fn()
    log[name] = out; save()
    print(out[:300].replace("\n", " | "), flush=True)
    return out


def char_id(text):
    return re.search(r"id: ([0-9a-f-]{36})", text).group(1)


def job_id(text):
    return re.search(r"job_id: ([0-9a-f-]{36})", text).group(1)


# ---- Bruto, jefe del mundo 1 ----
bruto = step("bruto_create", lambda: call(
    "create_character", body_type="quadruped", template="dog", view="side", n_directions=4, size=112,
    detail="high detail", name="Bruto Boss",
    description="huge muscular brown bulldog boss, big spiked red collar, scar on eye, angry face showing teeth, heavy and strong"))
bid = char_id(bruto)
step("bruto_wait", wait_jobs)
step("bruto_run", lambda: call("animate_character", character_id=bid, template_animation_id="running-6-frames",
                               directions=["east"], animation_name="charge"))
step("bruto_run_wait", wait_jobs)
step("bruto_bark", lambda: call("animate_character", character_id=bid, template_animation_id="bark",
                                directions=["east"], animation_name="bark"))
step("bruto_bark_wait", wait_jobs)
step("bruto_info", lambda: call("get_character", character_id=bid, include_preview=False))

# ---- Gatito mensajero ----
kit = step("kitten_create", lambda: call(
    "create_character", body_type="quadruped", template="cat", view="side", n_directions=4, size=48,
    detail="high detail", name="Messenger Kitten",
    description="small cute orange tabby kitten with big green eyes, fluffy, friendly happy face"))
kid = char_id(kit)
step("kitten_wait", wait_jobs)
step("kitten_idle", lambda: call("animate_character", character_id=kid, template_animation_id="sitting",
                                 directions=["east"], animation_name="sit"))
step("kitten_idle_wait", wait_jobs)
step("kitten_info", lambda: call("get_character", character_id=kid, include_preview=False))

# ---- Imágenes sueltas ----
def image(name, **kw):
    out = step(name, lambda: call("create_image_pixflux", **kw))
    step(name + "_wait", wait_jobs)
    return job_id(out)

image("cave_bg", description="cozy underground cave interior background for a platformer, dark blue rock walls, glowing crystals and glowing mushrooms, soft light from above, no characters",
      width=400, height=224, no_background=False, view="side", detail="medium detail")
image("cave_door", description="dark cave entrance opening in a mossy grey rock, arched black hole, grass on top, side view game prop",
      width=96, height=96, no_background=True, view="side", outline="single color black outline")
image("tree_door", description="thick old tree trunk with a dark hollow opening at its base, green leafy crown, side view game prop",
      width=96, height=128, no_background=True, view="side", outline="single color black outline")
image("life_icon", description="extra life pickup icon: cute white cat head with big blue eyes and pink ears, inside a golden glowing circle",
      width=32, height=32, no_background=True, outline="single color black outline")

print("== LISTO ==")
print(call("get_balance"))

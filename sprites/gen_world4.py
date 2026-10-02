"""
Genera en PixelLab el arte del Mundo 4 (Invierno navideño, versión profesional), uno a uno.
Guarda las respuestas en raw/gen_world4_log.json. Si se relanza, se salta lo ya hecho.

    PIXELLAB_KEY=... python gen_world4.py
"""
import json, os, re
from pixellab_api import call, wait_jobs

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, "raw", "gen_world4_log.json")
log = json.load(open(LOG, encoding="utf-8")) if os.path.exists(LOG) else {}


def save():
    json.dump(log, open(LOG, "w", encoding="utf-8"), indent=1, ensure_ascii=False)


def step(name, fn):
    if name in log:
        print("ya hecho:", name, flush=True); return log[name]
    print(">>", name, flush=True)
    try:
        out = fn()
    except Exception as e:  # un paso fallido no detiene el resto
        print("!! fallo en", name, e, flush=True); return None
    log[name] = out; save()
    print(out[:220].replace("\n", " | "), flush=True)
    return out


def jid(out): return re.search(r"job_id: ([0-9a-f-]{36})", out).group(1) if out else None
def cid(out): return re.search(r"id: ([0-9a-f-]{36})", out).group(1) if out else None


def image(name, **kw):
    out = step(name, lambda: call("create_image_pixflux", **kw))
    step(name + "_wait", wait_jobs)
    return jid(out)


def animate(name, src_job, action, frames=8):
    if not src_job: return
    step(name, lambda: call("animate_image", action=action, first_frame_url=f"https://api.pixellab.ai/mcp/images/{src_job}/download",
                             frame_count=frames, no_background=True))
    step(name + "_wait", wait_jobs)


SIDE = dict(no_background=True, view="side", outline="single color black outline")

# ---------- escenario ----------
image("bg_winter", description="magical snowy Christmas evening landscape background for a 2D platformer, distant snowy mountains under a pink and purple sunset sky with first stars, snow covered pine forest, a strip of fresh white snow along the bottom edge, soft and cozy, vivid colors, no characters",
      width=400, height=224, no_background=False, view="side", detail="highly detailed")
image("village", description="row of cozy Christmas village cottages with thick snow on the roofs, warm glowing yellow windows, colorful string lights along the roofs, wreaths on doors, smoke from chimneys, side view, isolated on transparent background",
      width=400, height=128, no_background=True, view="side", detail="highly detailed")
step("tiles_winter", lambda: call("create_sidescroller_tileset", lower_description="frozen dark blue stone and packed ice",
                                  transition_description="thick fresh white snow", transition_size=0.3,
                                  tile_size={"width": 32, "height": 32}, detail="medium detail", shading="basic shading", outline="selective outline"))
step("tiles_winter_wait", wait_jobs)
image("xmas_tree", description="decorated Christmas pine tree with colorful glass ornaments, golden garland, snow on branches and a shining gold star on top, game prop",
      width=64, height=96, **SIDE)
image("candy_cane", description="big red and white striped candy cane stuck in the snow with a green bow, game prop", width=32, height=64, **SIDE)
image("gifts", description="small pile of three wrapped Christmas gift boxes with ribbons and bows, red green and gold, on snow, game prop", width=64, height=48, **SIDE)
image("lamp", description="old victorian street lamp post with warm glowing light, snow on top and a small Christmas wreath, game prop", width=32, height=96, **SIDE)
image("thin_ice", description="thin cracked translucent blue ice platform floating, side view, horizontal game platform", width=96, height=32, **SIDE)
image("icicle", description="sharp hanging icicle cluster, pointing down, translucent light blue ice, game hazard", width=32, height=64, **SIDE)

# ---------- trineo de Papá Noel ----------
sleigh = image("sleigh", description="Santa Claus in his red sleigh full of gifts pulled by two flying reindeer, side view facing left, flying, festive",
               width=128, height=64, direction="west", **SIDE)
animate("sleigh_fly", sleigh, "the reindeer gallop through the air pulling the sleigh, legs moving, flying smoothly")

# ---------- enemigos y mensajero ----------
snowman = image("snowman", description="mischievous snowman enemy with a carrot nose, coal eyes, red scarf and a small top hat, holding a snowball, side view facing left",
                width=64, height=64, direction="west", **SIDE)
animate("snowman_throw", snowman, "the snowman throws the snowball forward with its stick arm", frames=6)
image("penguin", description="cheeky penguin enemy sliding on its belly on ice, side view facing left, wearing a tiny red beanie", width=64, height=64, direction="west", **SIDE)
elf = image("elf", description="friendly Christmas elf with green clothes, pointy ears, red and white striped hat with a bell, smiling and waving, side view facing left",
            width=64, height=64, direction="west", **SIDE)
animate("elf_wave", elf, "the elf waves hello happily and bounces a little", frames=6)

# ---------- Lobo de las nieves (jefe final) y sus cachorros ----------
wolf = step("wolf_create", lambda: call("create_character", body_type="quadruped", template="dog", view="side", n_directions=4, size=112,
                                         detail="high detail", name="Snow Wolf Boss",
                                         description="big majestic snow wolf with thick white and silver grey fur, fierce icy blue eyes, frost on its fur, but thin and hungry"))
wolf_id = cid(wolf)
step("wolf_wait", wait_jobs)
if wolf_id:
    step("wolf_run", lambda: call("animate_character", character_id=wolf_id, template_animation_id="running-6-frames", directions=["east"], animation_name="run"))
    step("wolf_run_wait", wait_jobs)
    step("wolf_howl", lambda: call("animate_character", character_id=wolf_id, mode="v3", directions=["east"], frame_count=6, keep_first_frame=False,
                                    action_description="raises its head to the sky and howls loudly, powerful", animation_name="howl"))
    step("wolf_howl_wait", wait_jobs)
    step("wolf_sad", lambda: call("animate_character", character_id=wolf_id, mode="v3", directions=["east"], frame_count=4, keep_first_frame=False,
                                   action_description="lies down on the ground exhausted, head low, sad and tired", animation_name="sad"))
    step("wolf_sad_wait", wait_jobs)
    step("wolf_info", lambda: call("get_character", character_id=wolf_id, include_preview=False))

cub = step("cub_create", lambda: call("create_character", body_type="quadruped", template="dog", view="side", n_directions=4, size=48,
                                       detail="high detail", name="Wolf Pup",
                                       description="small fluffy grey and white wolf pup, big cute eyes, playful"))
cub_id = cid(cub)
step("cub_wait", wait_jobs)
if cub_id:
    step("cub_run", lambda: call("animate_character", character_id=cub_id, template_animation_id="running-6-frames", directions=["east"], animation_name="run"))
    step("cub_run_wait", wait_jobs)
    step("cub_info", lambda: call("get_character", character_id=cub_id, include_preview=False))

# ---------- final: casita y salón navideño ----------
image("house", description="cozy Christmas cottage seen from the front-side, thick snow on the roof, colorful lights along the roof edge, wreath on the wooden door, warm glowing windows, a brick chimney, game prop",
      width=160, height=160, **SIDE)
image("interior", description="cozy Christmas living room interior, full scene, a big decorated Christmas tree with a shining gold star on top on the right, a stone fireplace with a warm burning fire on the left with stockings hanging, wrapped gifts under the tree, garlands, a window showing falling snow at night, warm golden light, wooden floor, no characters",
      width=400, height=224, no_background=False, view="side", detail="highly detailed")
image("mom_lying", description="the same fluffy gray and white cat lying down curled up resting peacefully, sleepy happy face, side view",
      width=92, height=92, no_background=True, view="side", outline="single color black outline",
      init_image_url="https://backblaze.pixellab.ai/file/pixellab-characters/a3105ed2-7608-4e57-832f-3042d4343a87/71c92b45-c37a-4963-bb07-3260db4f075e/rotations/east.png",
      init_image_strength=110)

print("== LISTO ==", flush=True)
print(call("get_balance"), flush=True)

"""
Crea la pose "pinzas clavadas en la arena" de Don Pinzas a partir de su sprite con las pinzas
en alto (la generación por IA no conseguía bajar las pinzas sin cambiar el dibujo).

Recorta cada pinza (franja superior, a cada lado), la gira alrededor del hombro para que
apunte hacia abajo y la vuelve a pegar sobre el cuerpo, con la punta tocando el suelo.

    python crab_pose.py boss_crab_up/boss_crab_up.png boss_crab_down/boss_crab_down.png
"""
import sys
from PIL import Image

CLAW_BOTTOM = 34          # fila donde terminan las pinzas (por encima está solo la pinza)
LEFT_MAX_X, RIGHT_MIN_X = 46, 58


def claws_down(src):
    im = src.convert("RGBA")
    w, h = im.size
    body = im.copy()
    left = Image.new("RGBA", im.size, (0, 0, 0, 0))
    right = Image.new("RGBA", im.size, (0, 0, 0, 0))
    px, bp, lp, rp = im.load(), body.load(), left.load(), right.load()
    for y in range(CLAW_BOTTOM):
        for x in range(w):
            if px[x, y][3] == 0:
                continue
            if x < LEFT_MAX_X:
                lp[x, y] = px[x, y]; bp[x, y] = (0, 0, 0, 0)
            elif x >= RIGHT_MIN_X:
                rp[x, y] = px[x, y]; bp[x, y] = (0, 0, 0, 0)
    # lienzo más alto: las pinzas bajan por debajo del hombro hasta el suelo
    out = Image.new("RGBA", (w + 24, h), (0, 0, 0, 0))
    out.alpha_composite(body, (12, 0))
    # hombros aproximados (base de cada pinza) y giro hacia abajo y hacia fuera
    lclaw = left.rotate(160, resample=Image.NEAREST, center=(26, CLAW_BOTTOM), expand=False)
    rclaw = right.rotate(-160, resample=Image.NEAREST, center=(w - 26, CLAW_BOTTOM), expand=False)
    # se bajan para que la punta quede clavada justo en el suelo
    def drop(c):
        bb = c.getbbox()
        return 0 if not bb else (h - 2) - bb[3]
    out.alpha_composite(lclaw, (12 - 6, drop(lclaw)))
    out.alpha_composite(rclaw, (12 + 6, drop(rclaw)))
    return out.crop(out.getbbox())


if __name__ == "__main__":
    res = claws_down(Image.open(sys.argv[1]))
    res.save(sys.argv[2])
    print("pose creada:", res.size)

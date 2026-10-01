"""
Adelgaza un sprite de cuadrúpedo visto de lado (mirando a la derecha):
sube la línea de la barriga (cintura metida) y alarga las patas, dejando la cabeza intacta.

Por cada columna se remapea el eje vertical:
  - el torso (desde el lomo hasta la fila `leg_row`) se comprime hacia arriba con factor k
  - las patas (desde `leg_row` hasta el suelo) se estiran para seguir tocando el suelo
k depende de la columna: 1.0 en la cabeza (sin cambio) y `k_min` en el centro del vientre,
con transiciones suaves para que no haya cortes.
"""
from PIL import Image


def slim(im, k_min, leg_row_ratio=0.70, head_start_ratio=0.62, rump_ratio=0.12):
    im = im.convert("RGBA")
    w, h = im.size
    bbox = im.getbbox()
    x0, top_all, x1, bottom = bbox
    bw = x1 - x0
    leg_row = top_all + round((bottom - top_all) * leg_row_ratio)
    head_x = x0 + bw * head_start_ratio
    rump_x = x0 + bw * rump_ratio
    src = im.load()
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    dst = out.load()

    def k_at(x):
        # 1 en la cabeza, k_min en el vientre, algo menos de efecto en la grupa (patas traseras)
        if x >= head_x:
            return 1.0
        if x >= head_x - bw * 0.14:            # transición pecho -> vientre
            t = (head_x - x) / (bw * 0.14)
            return 1.0 - (1.0 - k_min) * t
        if x <= rump_x:
            return k_min + (1.0 - k_min) * 0.35
        return k_min

    for x in range(w):
        col = [src[x, y] for y in range(h)]
        ys = [y for y in range(h) if col[y][3] > 0]
        if not ys:
            continue
        top = ys[0]
        k = k_at(x)
        if k >= 0.999 or top >= leg_row:
            for y in range(h):
                dst[x, y] = col[y]
            continue
        new_leg = top + (leg_row - top) * k          # dónde queda ahora la barriga
        for y in range(top, bottom):
            if y < new_leg:
                sy = top + (y - top) / k             # torso comprimido
            else:
                sy = leg_row + (y - new_leg) * (bottom - leg_row) / max(1e-6, bottom - new_leg)  # patas estiradas
            sy = int(sy)
            if 0 <= sy < h:
                dst[x, y] = col[sy]
    return out


if __name__ == "__main__":
    import sys
    base = Image.open(sys.argv[1])
    ks = [0.55, 0.68, 0.82]
    vs = [slim(base, k) for k in ks]
    W, H = base.size
    sheet = Image.new("RGBA", (W * (len(vs) + 1) + 10, H + 4), (150, 210, 240, 255))
    for i, v in enumerate(vs + [base]):
        sheet.alpha_composite(v, (i * (W + 3), 2))
    sheet.resize((sheet.width * 5, sheet.height * 5), Image.NEAREST).save(sys.argv[2])

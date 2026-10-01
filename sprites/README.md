# Librería de sprites (PixelLab)

Todo en vista lateral (side view) para plataformas. Las animaciones miran a la **derecha (east)**;
para la izquierda se espejan en código.

| Carpeta | Contenido | Tamaño recortado | PixelLab ID |
|---|---|---|---|
| `hero/` | Simba, gato blanco ojos azules: `idle` (8f), `run` (6f), `jump` (8f) | 80×65 | personaje `9cf92fa4-8c5e-47a5-95e2-ff432540f02d` |
| `mother/` | Mamá gata gris peluda: `idle` (8f) | 66×46 | personaje `71c92b45-c37a-4963-bb07-3260db4f075e` |
| `mother_thin/` | Mamá flaquita (estática), con colores ajustados a la paleta de `mother/` mediante `palette_from` | 58×47 | imagen `27e44334-…` |
| `bruto/` | **Bruto**, jefe bulldog del Mundo 1: `charge` (6f), `bark` (6f), `idle` (pose fija) | 148×98 | personaje `b040deee-3a25-4524-9e26-462f8c4b1a87` |
| `kitten/` | Gatito mensajero naranja: `sit` (8f) | 54×35 | personaje `f6c38503-8851-40c6-b1ba-95f3640d9a4d` |
| `cave_bg/` | Fondo de las salas secretas (cueva con hongos) | 400×224 | imagen |
| `cave_door/`, `tree_door/` | Entradas secretas: arco de cueva y árbol con hueco | 94×92, 83×118 | imágenes |
| `life_icon/` | Icono de vida (cara de Simba) | 30×30 | imagen |
| `dog/` | Bulldog enemigo: `walk` (6f) | 70×44 | personaje `ec152885-a328-4486-a0f4-fd3758893b74` |
| `bat/` | Murciélago enemigo (estático) | 56×38 | imagen `495be581-…` |
| `rat/` | Rata enemiga (estática, mira a la derecha) | 54×29 | imagen `9166e9b0-…` |
| `bg/` | Fondo pradera 400×224 | — | imagen `a1628ced-…` |
| `tiles/` | 16 tiles Wang de esquinas 32×32 (tierra + césped) | 32×32 | tileset `f569141d-9d98-4f70-a251-c9bbb740470c` |

- `raw/` guarda los originales sin recortar (incluye las rotaciones `east/west/south` de cada personaje).
- Todos los frames de un personaje comparten el mismo recorte, con los pies alineados abajo:
  dibújalos anclados por el centro inferior.
- **Tiles Wang:** `wang_N`, donde N suma las esquinas *vacías*: SE=1, SW=2, NE=4, NW=8.
  Se dibujan en una rejilla dual (desplazada medio tile); ver `drawTiles` en `../game/game.js`.

## Cuentas de PixelLab
Los sprites del Mundo 1 nuevo (Bruto, gatito, cueva, entradas, icono de vida) se generaron con otra cuenta,
así que en `sources.json` llevan su propio `owner_base`. Para generar arte nuevo sin pasar por Claude:

```bash
PIXELLAB_KEY=tu-api-key python gen_world1.py   # ejemplo: genera el arte del Mundo 1
```

`pixellab_api.py` lee la key de la variable de entorno; nunca se guarda en el repositorio.

## Añadir más sprites
1. Genera en PixelLab (p. ej. otra animación del héroe con `animate_character`).
2. Añade su `anim_id` y nº de frames a `sources.json`.
3. Ejecuta `python build_sprites.py`, que descarga, recorta y regenera `manifest.js`.

Los personajes siguen en tu cuenta de PixelLab, así que puedes animarlos más adelante
(`walk`, `sitting`, `licking`, `yawning`, `angry`… para los gatos; `bark`, `running` para el perro).

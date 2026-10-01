# Librería de sprites (PixelLab)

Todo en vista lateral (side view) para plataformas. Las animaciones miran a la **derecha (east)**;
para la izquierda se espejan en código.

| Carpeta | Contenido | Tamaño recortado | PixelLab ID |
|---|---|---|---|
| `hero/` | Simba, gato blanco ojos azules: `idle` (8f), `run` (6f), `jump` (8f) | 80×65 | personaje `9cf92fa4-8c5e-47a5-95e2-ff432540f02d` |
| `mother/` | Mamá gata gris peluda: `idle` (8f) | 66×46 | personaje `71c92b45-c37a-4963-bb07-3260db4f075e` |
| `mother_thin/` | Mamá flaquita (estática), con colores ajustados a la paleta de `mother/` mediante `palette_from` | 58×47 | imagen `27e44334-…` |
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

## Añadir más sprites
1. Genera en PixelLab (p. ej. otra animación del héroe con `animate_character`).
2. Añade su `anim_id` y nº de frames a `sources.json`.
3. Ejecuta `python build_sprites.py`, que descarga, recorta y regenera `manifest.js`.

Los personajes siguen en tu cuenta de PixelLab, así que puedes animarlos más adelante
(`walk`, `sitting`, `licking`, `yawning`, `angry`… para los gatos; `bark`, `running` para el perro).

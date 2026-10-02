# Librería de sprites (PixelLab)

Todo en vista lateral (side view) para plataformas. Las animaciones miran a la **derecha (east)**;
para la izquierda se espejan en código.

| Carpeta | Contenido | Tamaño recortado | PixelLab ID |
|---|---|---|---|
| `hero/` | Simba, gato blanco ojos azules: `idle` (8f), `run` (8f, modo v3), `jump` (8f), `lying` (10f, echado, para el final) | 80×65 | personaje `9cf92fa4-8c5e-47a5-95e2-ff432540f02d` |
| `mother/` | Mamá gata gris peluda: `idle` (8f) | 66×46 | personaje `71c92b45-c37a-4963-bb07-3260db4f075e` |
| `mother_thin/` | Mamá flaquita (estática), con colores ajustados a la paleta de `mother/` mediante `palette_from` | 58×47 | imagen `27e44334-…` |
| `bruto/` | **Bruto**, jefe bulldog del Mundo 1: `charge` (6f), `bark` (6f), `idle` (pose fija) | 148×98 | personaje `b040deee-3a25-4524-9e26-462f8c4b1a87` |
| `kitten/` | Gatito mensajero naranja: `sit` (8f) | 54×35 | personaje `f6c38503-8851-40c6-b1ba-95f3640d9a4d` |
| `cave_bg/` | Fondo de las salas secretas (cueva con hongos) | 400×224 | imagen |
| `cave_door/`, `tree_door/` | Entradas secretas: arco de cueva y árbol con hueco | 94×92, 83×118 | imágenes |
| `life_icon/` | Icono de vida (cara de Simba) | 30×30 | imagen |
| `bg_summer/` | Fondo de verano con cascada (la cascada se anima por código) | 400×224 | imagen |
| `tiles_summer/` | 16 tiles Wang de arena con césped (mundo 2) | 32×32 | tileset |
| `crab/`, `bee/`, `urchin/` | Enemigos del verano: cangrejo, abeja y erizo de mar | ~41×35 | imágenes |
| `turtle/` | Tortu, mensajero del mundo 2 | 46×48 | imagen |
| `mushroom/`, `log/` | Hongo saltarín y tronco-balsa móvil | 48×54, 80×19 | imágenes |
| `boss_crab/` | **Don Pinzas**: `idle`, `slam` (8f, con `animate_image`), `stuck` | 104×83 | animación de imagen |
| `bg_autumn/` | Fondo de otoño: lago y gran sol dorado | 400×224 | imagen |
| `tiles_autumn/` | Tileset de otoño: **el de primavera recoloreado** (hojas secas). El generado salió con fondo opaco | 32×32 | recolor |
| `squirrel/`, `boar/` | Enemigos de otoño: ardilla lanzadora y jabalí | ~56×52 | imágenes |
| `hedgehog/` | Pincho, mensajero del mundo 3 | 46×49 | imagen |
| `leaf_raft/` | Hoja gigante flotante (se hunde) | 80×25 | imagen |
| `boss_squirrel/`, `boss_squirrel_eat/` | **Doña Bellota** y su animación de comerse la bellota dorada (8f, `animate_image`) | 86×77 | imagen + animación |
| `bg_winter/` | Fondo de invierno: montañas nevadas al atardecer | 400×224 | imagen |
| `village/` | Pueblo navideño (capa de fondo; sus luces se detectan y titilan) | 387×96 | imagen, fondo quitado con `key_bg` |
| `tiles_winter/` | Tileset de invierno: **el de primavera recoloreado** (nieve sobre tierra helada). El generado salió como ladrillos de hielo | 32×32 | recolor |
| `xmas_tree/`, `candy_cane/`, `gifts/`, `lamp/` | Decoración navideña colocada sola sobre el suelo | ~52×82 | imágenes |
| `thin_ice/`, `icicle/` | Hielo fino y carámbano | 80×19, 16×60 | imágenes |
| `sleigh/`, `sleigh_fly/` | Trineo de Papá Noel volando (9f, `animate_image`) | 80×37 | imagen + animación |
| `snowman/`, `snowman_throw/` | Muñeco de nieve y su lanzamiento (6f, `animate_image`) | 50×48 | imagen + animación |
| `penguin/` | Pingüino que se desliza | 50×41 | imagen |
| `elf/`, `elf_wave/` | Cascabel, el duende mensajero del mundo 4 | 27×46 | imagen + animación |
| `wolf/` | **Lobo de las Nieves**: `idle`, `run` (6f), `howl` (6f, v3), `sad` (4f, v3) | 172×115 | personaje (cuenta 2) |
| `cub/` | Cachorro de lobo: `idle`, `run` (6f) | 62×40 | personaje (cuenta 2) |
| `house/`, `interior/` | Casita navideña y su salón (final) | 160×160, 400×224 | imágenes |
| `mom_lying/` | Mamá echada (final), img2img desde su rotación | — | imagen |
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

## Otras herramientas
- `crab_pose.py`: intento de crear por código la pose de pinzas abajo (descartado: se usó `animate_image`).
- `gen_world2.py` / `gen_world3.py`: generan el arte de los mundos 2 y 3 (`PIXELLAB_KEY=... python gen_world3.py`).
- `gen_world4.py`: genera el arte del Mundo 4; `add_world4_sources.py` lo añade a `sources.json` y `fetch_frames.py` descarga los frames de un `animate_image`.
- `recolor_from` en `tilesets` (sources.json): crea un tileset recoloreando otro (`style`: `autumn` u `winter`).
- `key_bg` en `images`: quita un fondo liso generado por error; `lights`: detecta bombillas, adornos y ventanas para que titilen en el juego (`<nombre>_lights` en el manifest).
- `frame_sets` en `sources.json`: animaciones hechas con `animate_image` a partir de frames ya descargados en `raw/`.

## Añadir más sprites
1. Genera en PixelLab (p. ej. otra animación del héroe con `animate_character`).
2. Añade su `anim_id` y nº de frames a `sources.json`.
3. Ejecuta `python build_sprites.py`, que descarga, recorta y regenera `manifest.js`.

Los personajes siguen en tu cuenta de PixelLab, así que puedes animarlos más adelante
(`walk`, `sitting`, `licking`, `yawning`, `angry`… para los gatos; `bark`, `running` para el perro).

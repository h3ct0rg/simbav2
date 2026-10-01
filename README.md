# Simba: el camino a casa 🐱

Juego de plataformas 2D en HTML5 Canvas, sin frameworks ni dependencias. Simba, un gatito blanco de ojos azules, tiene que cruzar precipicios y esquivar enemigos para llegar hasta su mamá, que lo espera flaquita al final del nivel: cada pescado que le lleves la hace engordar un poco más.

Todos los sprites se generaron con [PixelLab](https://pixellab.ai).

## Jugar

- **Local:** abre `game/index.html` en el navegador (no necesita servidor).
- **Docker:**
  ```bash
  docker compose up -d --build
  ```
  y entra a `http://localhost:8080`. Para usar otro puerto: `SIMBA_PORT=80 docker compose up -d --build`.

### Controles

| | PC | Móvil (en horizontal) |
|---|---|---|
| Mover | ← → / A D | Joystick virtual (izquierda) |
| Saltar | Espacio / ↑ / W | Botón SALTAR (derecha) |
| Pausa | P / Esc | Botón II |

## Características

- Un nivel con precipicios, punto de control y 7 enemigos (perros, ratas y murciélagos); se eliminan saltándoles encima.
- Física pensada para que se sienta fluida: perdón de salto al salir de un borde (*coyote time*), salto recordado si pulsas justo antes de aterrizar (*jump buffer*), altura de salto variable y simulación en subpasos.
- 23 pescados para recoger. Al llegar a la meta, Simba se los entrega uno a uno y la mamá pasa por 6 aspectos, de muy flaquita a bien rellenita. Al final ganas de 1 a 3 estrellas.
- Menú principal animado y configuración de brillo, música, efectos, resolución, pantalla completa e idioma (español / inglés). Los ajustes se guardan en el navegador.
- Música chiptune y efectos de sonido generados en el navegador con Web Audio, sin archivos de audio.
- Controles táctiles y aviso para girar el móvil a horizontal.

## Estructura

```
game/            el juego
  index.html
  settings.js    ajustes persistentes e idiomas
  menu.js        menú principal, configuración y pausa
  game.js        motor, nivel, física, enemigos y render
sprites/         librería de sprites (ver sprites/README.md)
  manifest.js    lista de sprites que carga el juego (generada)
  build_sprites.py  descarga y procesa los sprites de PixelLab
  slim.py        genera las variantes delgadas de la mamá
  raw/           originales sin procesar
Dockerfile, docker-compose.yml, nginx.conf
```

Para regenerar los sprites tras añadir o cambiar alguno en `sprites/sources.json`:

```bash
cd sprites && python build_sprites.py
```

Requiere Python 3 con Pillow.

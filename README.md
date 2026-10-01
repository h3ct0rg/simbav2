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
| Entrar en un pasaje secreto | ↓ / S | Joystick hacia abajo |
| Pausa | P / Esc | Botón II |

### Crear o editar niveles

Los niveles están en `game/levels.js` como dibujos de texto de 12 filas (`#` tierra, `=` tablón, `o` pescado, `+` vida, `r d v` enemigos, `1-9` puertas secretas...). La leyenda completa está al principio del archivo.

## Características

- **Mapa de mundos** con 4 estaciones (Primavera, Verano, Otoño, Invierno). El Mundo 1 se puede jugar entero; los otros aparecen como "próximamente".
- **Mundo 1, Primavera:** 4 niveles con dificultad creciente. En los niveles 1 a 3 un gatito mensajero anima a Simba; en el nivel 4 está **Bruto, el gran bulldog**, y después **mamá**.
- **Vidas y salud separadas:** se empieza con 3 vidas, y los corazones son la salud de cada intento. Perder los 3 corazones o caer a un precipicio cuesta 1 vida. Con 0 vidas, game over, y al volver al mapa recuperas 3.
- **Pasajes secretos** en cuevas y troncos huecos (se entra pulsando abajo), con pescados y **vidas extra escondidas**. Cada vida extra solo se puede recoger una vez.
- **Jefe con ciclo de aviso, embestida, choque y mareo:** se le salta encima cuando está mareado. Son 3 golpes, cada fase más rápida, y al final huye.
- **Alimentar a mamá:** al final del mundo se le entregan los pescados de los 4 niveles (cuenta la mejor marca de cada uno). La mamá pasa por 6 aspectos, de muy flaquita a bien rellenita.
- Estrellas por nivel, progreso guardado en el navegador y pantallas de transición ("MUNDO 1-2", con las vidas que te quedan).
- Física fluida: *coyote time*, *jump buffer*, salto variable y simulación en subpasos.
- Menú principal animado, pausa y configuración de brillo, música, efectos, resolución, pantalla completa e idioma (ES/EN).
- Música chiptune y efectos con Web Audio. Controles táctiles y aviso para girar el móvil.

## Estructura

```
game/            el juego
  index.html
  settings.js    ajustes persistentes e idiomas
  save.js        progreso guardado (vidas, niveles, estrellas)
  levels.js      mundos y niveles como mapas de texto (con la leyenda)
  menu.js        menú principal, configuración y pausa
  screens.js     mapa de mundos, transiciones, fin de nivel
  boss.js        jefe Bruto
  game.js        motor, física, enemigos, salas secretas y render
sprites/         librería de sprites (ver sprites/README.md)
  manifest.js    lista de sprites que carga el juego (generada)
  build_sprites.py  descarga y procesa los sprites de PixelLab
  slim.py        genera las variantes delgadas de la mamá
  pixellab_api.py / gen_world1.py  generan el arte nuevo vía la API de PixelLab
                 (necesitan la variable de entorno PIXELLAB_KEY)
  raw/           originales sin procesar
Dockerfile, docker-compose.yml, nginx.conf
```

Para regenerar los sprites tras añadir o cambiar alguno en `sprites/sources.json`:

```bash
cd sprites && python build_sprites.py
```

Requiere Python 3 con Pillow.

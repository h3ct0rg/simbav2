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
| Entrar en un pasaje secreto / bajar de un tablón | ↓ / S | Joystick hacia abajo |
| Pausa | P / Esc | Botón II |

### Crear o editar niveles

Los niveles están en `game/levels.js` como dibujos de texto de 12 filas (`#` tierra, `=` tablón, `o` pescado, `+` vida, `r d v c b x q w` enemigos, `j` hongo, `h u` troncos móviles, `l` hojas que se hunden, `g` géiseres, `I` hielo, `k` hielo fino, `y` carámbanos, `n p` muñeco de nieve y pingüino, `1-9` puertas secretas...). La leyenda completa está al principio del archivo.

## Características

- **Mapa de mundos** con 4 estaciones (Primavera, Verano, Otoño, Invierno), 16 niveles en total.
- **Mundo 1, Primavera:** 4 niveles con dificultad creciente. En los niveles 1 a 3 un gatito mensajero anima a Simba; en el nivel 4 está **Bruto, el gran bulldog**, y después **mamá**.
- **Mundo 2, Verano:** fondo con una cascada animada, agua en los precipicios y música propia. Mecánicas nuevas: **hongos saltarines** y **troncos que se mueven** sobre el río. Enemigos nuevos: cangrejos, abejas y **erizos de mar** (pinchan: hay que saltarlos). El mensajero es **Tortu**, una tortuga, y el jefe es **Don Pinzas**: golpea la arena y lanza ondas que hay que saltar, y cuando se le atascan las pinzas se le salta encima.
- **Mundo 3, Otoño:** un 20 % más difícil, con niveles más largos (200, 250, 220 y 160 columnas) y dos puntos de control. Sol dorado con rayos de luz, hojas cayendo en varias capas y **ráfagas de viento** que empujan a Simba (avisadas con una flecha). Mecánicas nuevas: **hojas gigantes que se hunden** si te quedas encima (tiemblan antes de hundirse y vuelven a flotar) y **géiseres** que hay que cronometrar. Enemigos nuevos: **ardillas** que lanzan bellotas y **jabalíes** que embisten. Las cuevas tienen un **río subterráneo** con murciélagos. El mensajero es **Pincho**, un erizo. La jefa es **Doña Bellota** (4 golpes): se la tira de su rama aterrizando en ella, y cuando le queda 1 golpe intenta comerse una bellota dorada para curarse. Si la interrumpes, no se cura; si no, recupera la mitad de su vida y entra en una fase final.
- **Mundo 4, Invierno navideño:** un 5 % más difícil y más largo que el otoño (210, 262, 231 y 168 columnas). Atardecer nevado con estrellas que titilan, un pueblo de casitas con ventanas encendidas y humo en las chimeneas, nieve en tres capas, **el trineo de Papá Noel** cruzando el cielo, árboles de Navidad con luces que titilan, faroles con guirnaldas, bastones de caramelo, regalos y el **aliento visible** de Simba. Música: *Jingle Bells* en chiptune con cascabeles. Mecánicas nuevas: **hielo resbaladizo**, **hielo fino** que cruje y se rompe si te quedas encima, y **carámbanos** que tiemblan (con su sombra en el suelo) y caen al pasar debajo. Enemigos nuevos: **muñecos de nieve** que lanzan bolas y **pingüinos** que se lanzan de panza (más rápido sobre el hielo). El mensajero es **Cascabel**, un duende.
- **Jefe final, el Lobo de las Nieves** (con "segundo aliento" al estilo souls). En la fase 1 (4 golpes) embiste sobre el hielo, choca contra la pared y hace caer carámbanos del techo de su guarida; cuando queda aturdido se le salta encima. Al llegar a 0 cae rendido, pero aúlla: la pantalla se oscurece, empieza una ventisca y su barra se rellena. En la fase 2 (3 golpes) alterna embestidas y **saltos sobre Simba** (marcados en el suelo), con ráfagas de viento y lluvia de carámbanos. **Si Simba pierde una vida, la pelea vuelve a la fase 1**; el punto de control está justo antes de la guarida y se reaparece con la salud llena.
- **La elección:** vencido, el lobo queda agotado: *"Solo quería algo de comer..."*. Simba puede **darle la mitad de sus pescados** (llegan sus dos cachorros, comparten y se van los tres juntos; mamá recibe menos pescados, pero se gana el logro **Corazón generoso** y la familia de lobos aparece en la ventana del final) o **no darle nada** (el lobo se aleja solo, triste). **Solo cuenta la primera elección de cada partida**: si se repite la pelea, se repite la misma decisión. Si compartiste, en el mapa de esa partida aparece la **insignia del corazón** junto a las estrellas.
- **Final:** tras reencontrarse, Simba y mamá corren a una casita navideña con la chimenea humeante. La cámara entra por la puerta y, dentro, a pantalla completa, el fuego crepita, el gran árbol brilla con su estrella y los dos se echan calentitos bajo el árbol, al son de *Noche de paz*. Después, los créditos y la pantalla **"¿Qué hicieron los demás?"**, con el porcentaje de partidas que compartieron y que no (se ve solo al terminar, para no influir en la decisión). Una vez terminado el juego, **en esa partida el jefe final queda cerrado**: el nodo 4-4 muestra la casita y ya no se puede volver a jugar (los demás niveles sí).
- **Vidas y salud separadas:** se empieza con 3 vidas, y los corazones son la salud de cada intento. Perder los 3 corazones o caer a un precipicio cuesta 1 vida. Con 0 vidas, game over, y al volver al mapa recuperas 3.
- **Barra de pescado:** cada 20 pescados recuperas 1 corazón. Si tienes la salud llena, la barra se queda llena y brillando como reserva, y te cura 1 s después del siguiente golpe.
- **Corazones dorados:** hay uno por mundo, escondido en una sala secreta de los niveles 1 a 3, sorteada al crear cada partida (siempre la misma dentro de esa partida). La entrada de esa sala suelta destellos dorados. Cada uno da **+1 corazón de vida** para siempre en esa partida (máximo 7). El mapa muestra cuántos llevas y en qué mundos ya lo encontraste.
- **Pasajes secretos** en cuevas y troncos huecos (se entra pulsando abajo), con pescados y **vidas extra escondidas**. Cada vida extra solo se puede recoger una vez.
- **Jefes con ciclo de aviso, ataque y momento vulnerable:** se les salta encima cuando están mareados, y cada fase es más rápida.
- **Alimentar a mamá:** al final del mundo se le entregan los pescados de los 4 niveles (cuenta la mejor marca de cada uno). La mamá pasa por 6 aspectos, de muy flaquita a bien rellenita.
- **3 ranuras de partida** independientes con guardado automático (al completar un nivel, recoger una vida o perderla). Cada tarjeta muestra el mundo y nivel alcanzado, las estrellas, las vidas, los pescados, el tiempo jugado, la última fecha y la mamá del último mundo terminado. Para borrar una partida hay que mantener pulsado BORRAR (o la tecla X) 1,5 s.
- Estrellas por nivel y pantallas de transición ("MUNDO 1-2", con las vidas que te quedan).
- Física fluida: *coyote time*, *jump buffer*, salto variable y simulación en subpasos.
- Menú principal animado, pausa y configuración de brillo, música, efectos, resolución, pantalla completa e idioma (ES/EN).
- Música chiptune y efectos con Web Audio. Controles táctiles y aviso para girar el móvil.

## Estadísticas de jugadores (Firebase)

El menú principal muestra **"N jugando ahora · M jugadores"** usando Firebase Realtime Database (`game/stats.js`, vía su API REST):

- `/simba/online/<id>`: cada jugador avisa cada 30 s. Cuentan como "jugando ahora" los que avisaron en los últimos 70 s.
- `/simba/players/<id>`: un registro por navegador, con la primera y la última visita y el nivel más avanzado (`lvl`).
- `/simba/choices/give/<partida>` y `/simba/choices/keep/<partida>`: la elección con el lobo, **una por partida** (la primera). Cada partida tiene su propio id anónimo.
- El id es aleatorio y anónimo: no se guarda ningún dato personal. Si Firebase no responde, el juego funciona igual y el indicador no aparece.

### Reglas de seguridad (recomendado)
La base está abierta para escribir: cualquiera podría borrarla entera. En la consola de Firebase, *Realtime Database → Reglas*, pega el contenido de [`firebase-rules.json`](firebase-rules.json). Esas reglas:
- dejan `scores` (el otro juego) funcionando igual que ahora;
- solo permiten escribir en `/simba` con el formato esperado, y no dejan borrar jugadores;
- en `choices`, una partida solo puede registrar su elección una vez (no se puede cambiar ni votar las dos opciones);
- impiden reemplazar o borrar la base completa desde la raíz.

## Estructura

```
game/            el juego
  index.html
  settings.js    ajustes persistentes e idiomas
  save.js        3 ranuras de partida con guardado automático
  stats.js       contador de jugadores (Firebase)
  levels.js      mundos y niveles como mapas de texto (con la leyenda)
  menu.js        menú principal, configuración y pausa
  screens.js     mapa de mundos, transiciones, fin de nivel
  boss.js        jefes: Bruto, Don Pinzas, Doña Bellota y el Lobo de las Nieves
  winter.js      mundo 4: hielo, hielo fino, carámbanos, muñecos de nieve, pingüinos, decoración navideña, nieve y trineo
  ending.js      la elección con el lobo y el final (casita navideña + créditos)
  game.js        motor, física, enemigos, salas secretas y render
sprites/         librería de sprites (ver sprites/README.md)
  manifest.js    lista de sprites que carga el juego (generada)
  build_sprites.py  descarga y procesa los sprites de PixelLab
  slim.py        genera las variantes delgadas de la mamá
  pixellab_api.py / gen_world1..4.py  generan el arte nuevo vía la API de PixelLab
                 (necesitan la variable de entorno PIXELLAB_KEY)
  raw/           originales sin procesar
Dockerfile, docker-compose.yml, nginx.conf
```

Para regenerar los sprites tras añadir o cambiar alguno en `sprites/sources.json`:

```bash
cd sprites && python build_sprites.py
```

Requiere Python 3 con Pillow.

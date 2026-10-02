'use strict';
// ============================================================
//  Mundos y niveles. Cada nivel es un mapa de texto de 12 filas.
//
//  Leyenda:
//    #  tierra (sólido)              =  tablón (se atraviesa desde abajo)
//    P  inicio de Simba              C  punto de control
//    o  pescado                      +  vida extra: SOLO dentro de salas secretas
//                                       (se guarda: cada una se recoge una única vez)
//    r  rata    d  perro    v  murciélago    c  cangrejo    b  abeja
//    x  erizo de mar (pincha: NO se puede pisar, hay que saltarlo)
//    j  hongo saltarín (lanza a Simba muy alto)
//    h  tronco que se mueve de lado a lado (ocupa 3 casillas; recorre el hueco libre)
//    u  tronco que sube y baja (3 casillas; sube hasta 3 filas)
//    K  mensajero (meta de los niveles 1-3; gatito en primavera, tortuga en verano)
//    M  mamá (meta del nivel 4)      B  jefe del mundo     [ ]  bordes de la arena del jefe
//    1-9  entrada secreta a la sala con ese número (pulsar ↓)
//    0  (dentro de una sala) salida de vuelta al nivel
//
//  Para crear un nivel nuevo basta con copiar uno, editar el dibujo y ajustar `diff`
//  (multiplicador de velocidad de los enemigos).
// ============================================================

const WORLDS = [
  {
    id: 1, season: 'spring', messenger: 'kitten', boss: 'bruto',
    name: { es: 'Primavera', en: 'Spring' },
    levels: [
      {
        id: '1-1', diff: 1.0,
        name: { es: "Pradera florida", en: "Flower Meadow" },
        say: { es: ["¡Hola, Simba! Vi pasar a tu mamá por aquí.", "¡Sigue adelante, está más adelante!"], en: ["Hi, Simba! I saw your mom pass by here.", "Keep going, she's further ahead!"] },
        map: [
          "",
          "",
          "",
          "                                                                           o",
          "                                                                  v       ===",
          "           ooo                                                        ooo                                    ###",
          "           ===                      ooo                 ooo           ===                                    ###",
          "                                    ###                        ooo                                           ###",
          "  P   ooo         r    1            ###     d    C                                         ooo   r      K    ###",
          "############################  ##########################   ##########################   ########################",
          "############################  ##########################   ##########################   ########################",
          "############################  ##########################   ##########################   ########################",
        ],
        rooms: {
          '1': { style: 'tree', map: [
              "####################",
              "#                  #",
              "#                  #",
              "#          o+o     #",
              "#          ===     #",
              "#     ooo          #",
              "#     ===          #",
              "#                  #",
              "# 0            ooo #",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
      {
        id: '1-2', diff: 1.12,
        name: { es: "Colinas del arroyo", en: "Brook Hills" },
        say: { es: ["¡Ánimo, Simba! Tu mamá cruzó estas colinas.", "Dicen que las cuevas esconden sorpresas..."], en: ["Cheer up, Simba! Your mom crossed these hills.", "They say caves hide surprises..."] },
        map: [
          "",
          "",
          "",
          "                                       v                        o          v",
          "                                                               ==",
          "                                   ooo        oooo          oo                                           v                  ooo            ###",
          "                       ooo         ===    ####              ==            ooo        d                                      ===            ###",
          "               ooo  r                     ####                             =        ####                                                   ###",
          "  P  ooo  r   #########        d         1####      C     r        d           ooo  ####      r         oooo      ooo   d       r     K    ###",
          "#######################   ####################    #######################     #######################   ####    ##############################",
          "#######################   ####################    #######################     #######################   ####    ##############################",
          "#######################   ####################    #######################     #######################   ####    ##############################",
        ],
        rooms: {
          '1': { style: 'cave', map: [
              "####################",
              "#                  #",
              "#             +    #",
              "#            ==    #",
              "#        oo        #",
              "#        ==        #",
              "#    ooo           #",
              "#    ###           #",
              "# 0  ###        oo #",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
      {
        id: '1-3', diff: 1.22,
        name: { es: "Bosque de cerezos", en: "Cherry Woods" },
        say: { es: ["Tu mamá está muy cerca, al otro lado del jardín.", "Pero cuidado: un perro enorme, Bruto, vigila la entrada."], en: ["Your mom is very close, past the garden.", "But be careful: a huge dog, Bruto, guards the gate."] },
        map: [
          "",
          "                                                              o",
          "",
          "                                           v                 ooo                                                                    v",
          "                                oooo                         ===                                 ooo                           v",
          "            v                   ####      ooo                          oooo                                    r                                      v ooo            ###",
          "                   oooo         ####                     ===                                2     =           ====                                      ===            ###",
          "                            ########       =                             v                ######                                                                       ###",
          "  P  ooo                 1  ########  r         C     d           d             r      r  ######          d         ooo       oooo       ooo   d                  K    ###",
          "###################    ##################     #########################    #####################     ######################   ####    ####################################",
          "###################    ##################     #########################    #####################     ######################   ####    ####################################",
          "###################    ##################     #########################    #####################     ######################   ####    ####################################",
        ],
        rooms: {
          '1': { style: 'tree', map: [
              "####################",
              "#                  #",
              "#                  #",
              "#         o+o      #",
              "#         ===      #",
              "#    ooo       ooo #",
              "#    ===       === #",
              "#                  #",
              "# 0                #",
              "####################",
              "####################",
              "####################",
            ] },
          '2': { style: 'cave', map: [
              "####################",
              "#                  #",
              "#                  #",
              "#            +     #",
              "#           ###    #",
              "#     ooo   ###    #",
              "#     ###   ###    #",
              "#     ###   ###    #",
              "# 0   ###   ### ooo#",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
      {
        id: '1-4', diff: 1.3,
        name: { es: "El jardín de Bruto", en: "Bruto's Garden" },
        map: [
          "",
          "",
          "",
          "",
          "                      v",
          "                ooo                                                                                                      ###",
          "                ===            ooo                                                                                       ###",
          "                                                                                                                         ###",
          "  P  ooo    r                           d     1      C    [             B    ]                M                          ###",
          "###############################   ##########################################################################################",
          "###############################   ##########################################################################################",
          "###############################   ##########################################################################################",
        ],
        rooms: {
          '1': { style: 'tree', map: [
              "####################",
              "#                  #",
              "#                  #",
              "#          +       #",
              "#         ==       #",
              "#     oo           #",
              "#     ==           #",
              "#                  #",
              "# 0           oooo #",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
    ],
  },
  // Próximamente (se muestran bloqueados en el mapa)
  {
    id: 2, season: 'summer', messenger: 'turtle', boss: 'crab',
    name: { es: 'Verano', en: 'Summer' },
    levels: [
      {
        id: '2-1', diff: 1.2,
        name: { es: "Playa dorada", en: "Golden Beach" },
        say: { es: ["¡Hola, Simba! Soy Tortu. Tu mamá pasó rumbo al río.", "Los hongos rojos te lanzan muy alto. ¡Y no pises los erizos!"], en: ["Hi, Simba! I'm Tortu. Your mom headed to the river.", "Red mushrooms launch you high. And don't step on urchins!"] },
        map: [
          "",
          "                                                                                          oooo",
          "                oooo                                                                      ====",
          "                ====",
          "                                                oooo                                                        b",
          "                                               ######            b     oooo                                                    ###",
          "                         ooo                   ######                                              ooo                         ###",
          "                                               ######                                                                          ###",
          "  P  ooo    c     j              x    1  c   j ######  C  ooo c                 x     c      j                  ooo x     K    ###",
          "#########################   ###########################################    ########################   ############################",
          "#########################   ###########################################    ########################   ############################",
          "#########################   ###########################################    ########################   ############################",
        ],
        rooms: {
          '1': { style: 'cave', map: [
              "####################",
              "#           +      #",
              "#          ===     #",
              "#                  #",
              "#                  #",
              "#                  #",
              "#                  #",
              "#                  #",
              "# 0 ooo j      oo  #",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
      {
        id: '2-2', diff: 1.28,
        name: { es: "Río de la cascada", en: "Waterfall River" },
        say: { es: ["Los troncos flotan y se mueven: espera el momento justo.", "Tu mamá siguió el río hasta la bahía..."], en: ["The logs float and move: wait for the right moment.", "Your mom followed the river to the bay..."] },
        map: [
          "",
          "                                                                                ooo",
          "                                                                                ===",
          "",
          "                                                         ooo                              b",
          "                                      b                                                 ooooo             b                 ooo                    ###",
          "                     oooooo                        ooo                                                                      ===                    ###",
          "                                                                                                                                                   ###",
          "  P  ooo    c                     x         1                  C      c       c    j     h         ooo          x     c           x         K      ###",
          "###################   h      ####################  h     u   #########################        ########################################################",
          "###################          ####################            #########################        ########################################################",
          "###################          ####################            #########################        ########################################################",
        ],
        rooms: {
          '1': { style: 'cave', map: [
              "####################",
              "#                  #",
              "#                  #",
              "#          +       #",
              "#         ===      #",
              "#    ooo           #",
              "#    ===           #",
              "#                  #",
              "# 0           oooo #",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
      {
        id: '2-3', diff: 1.36,
        name: { es: "Acantilados soleados", en: "Sunny Cliffs" },
        say: { es: ["¡Ya casi llegas! Pero en la bahía vive Don Pinzas.", "Cuando sus pinzas se atasquen en la arena, ¡salta sobre él!"], en: ["You're almost there! But Don Pinzas lives in the bay.", "When his claws get stuck in the sand, jump on him!"] },
        map: [
          "",
          "                                                                                                                            oooo",
          "                                                              ooo  ooo  ooo                                                 ====",
          "                                ooo                           ===  ===  ===",
          "                                                    b",
          "          b        oo x    c                                                                           ooooo                                b                          ###",
          "                 ##############      ooo                             b                                    b                                                            ###",
          "                 ##############                                                                                                                                        ###",
          "  P ooo       j  ##############            C   1        c  j                    x   x     c     2                 ooo   c     j      x            c               K    ###",
          "############################### u    h   ####################               #########################   h      ###########################################################",
          "###############################          ####################               #########################          ###########################################################",
          "###############################          ####################               #########################          ###########################################################",
        ],
        rooms: {
          '1': { style: 'tree', map: [
              "####################",
              "#         +        #",
              "#        ===       #",
              "#                  #",
              "#                  #",
              "#                  #",
              "#                  #",
              "#                  #",
              "# 0   j  ooo  ooo  #",
              "####################",
              "####################",
              "####################",
            ] },
          '2': { style: 'cave', map: [
              "####################",
              "#                  #",
              "#                  #",
              "#            +     #",
              "#           ###    #",
              "#     ooo   ###    #",
              "#     ###   ###    #",
              "#     ###   ###    #",
              "# 0   ###   ### ooo#",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
      {
        id: '2-4', diff: 1.42,
        name: { es: "La bahía de Don Pinzas", en: "Don Pinzas' Bay" },
        map: [
          "",
          "",
          "",
          "                    ooo",
          "                    ===",
          "                                        b                                                                                ###",
          "                            oooo                                                                                         ###",
          "                                                                                                                         ###",
          "  P  ooo    c    x     j                      1      C    [             B    ]                M                          ###",
          "###########################  h     #########################################################################################",
          "###########################        #########################################################################################",
          "###########################        #########################################################################################",
        ],
        rooms: {
          '1': { style: 'tree', map: [
              "####################",
              "#                  #",
              "#                  #",
              "#          +       #",
              "#         ==       #",
              "#     oo           #",
              "#     ==           #",
              "#                  #",
              "# 0           oooo #",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
    ],
  },
  { id: 3, season: 'autumn', name: { es: 'Otoño', en: 'Autumn' }, levels: [] },
  { id: 4, season: 'winter', name: { es: 'Invierno', en: 'Winter' }, levels: [] },
];
const LEVELS_PER_WORLD = 4;

// Lista plana de niveles jugables, en orden
const ALL_LEVELS = WORLDS.flatMap(w => w.levels.map((lv, i) => Object.assign(lv, { world: w, index: i })));
const levelById = id => ALL_LEVELS.find(l => l.id === id);

// ---------- Parser: texto -> área jugable ----------
const LV_ROWS = 12;
const T_SOLID = 1, T_ONEWAY = 2;
function parseArea(rows, isRoom) {
  const cols = Math.max(...rows.map(r => r.length));
  const grid = Array.from({ length: LV_ROWS }, () => new Array(cols).fill(0));
  const a = {
    isRoom, cols, rows: LV_ROWS, grid, spawn: null, fish: [], lifes: [], walkers: [], bats: [], urchins: [], mushrooms: [], movers: [],
    doors: [], checkpoint: null, messenger: null, mother: null, boss: null, arena: null, exit: null,
  };
  let arenaL = null;
  for (let r = 0; r < LV_ROWS; r++) {
    const line = rows[r] || '';
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '#') grid[r][c] = T_SOLID;
      else if (ch === '=') grid[r][c] = T_ONEWAY;
      else if (ch === 'P') a.spawn = { c, r };
      else if (ch === 'o') a.fish.push({ c, r });
      else if (ch === '+') a.lifes.push({ c, r });
      else if (ch === 'r' || ch === 'd' || ch === 'c') a.walkers.push({ type: { r: 'rat', d: 'dog', c: 'crab' }[ch], c, r });
      else if (ch === 'v' || ch === 'b') a.bats.push({ type: ch === 'v' ? 'bat' : 'bee', c, r });
      else if (ch === 'x') a.urchins.push({ c, r });
      else if (ch === 'j') a.mushrooms.push({ c, r });
      else if (ch === 'h' || ch === 'u') a.movers.push({ axis: ch === 'h' ? 'x' : 'y', c, r });
      else if (ch === 'C') a.checkpoint = { c, r };
      else if (ch === 'K') a.messenger = { c, r };
      else if (ch === 'M') a.mother = { c, r };
      else if (ch === 'B') a.boss = { c, r };
      else if (ch === '[') arenaL = c;
      else if (ch === ']') a.arena = { left: arenaL, right: c };
      else if (ch === '0') a.exit = { c, r };
      else if (ch >= '1' && ch <= '9') a.doors.push({ id: ch, c, r });
    }
  }
  // fila del suelo más común: ancla el fondo y el abismo
  const tops = {};
  for (let c = 0; c < cols; c++) for (let r = 0; r < LV_ROWS; r++) if (grid[r][c] === T_SOLID) { tops[r] = (tops[r] || 0) + 1; break; }
  a.groundRow = +Object.entries(tops).sort((x, y) => y[1] - x[1])[0][0];
  return a;
}
// Total de pescados de un nivel (incluidas sus salas secretas)
function levelFishTotal(lv) {
  const count = rows => rows.join('').split('o').length - 1;
  return count(lv.map) + Object.values(lv.rooms || {}).reduce((s, r) => s + count(r.map), 0);
}

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
//    l  hoja gigante flotante (3 casillas): se HUNDE si Simba se queda encima y vuelve a flotar
//    g  géiser: dispara un chorro de agua cada pocos segundos que lanza a Simba hacia arriba
//    q  ardilla (lanza bellotas)     w  jabalí (embiste al ver a Simba)
//    C  punto de control (puede haber varios por nivel)
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
  {
    id: 3, season: 'autumn', messenger: 'hedgehog', boss: 'squirrel',
    name: { es: 'Otoño', en: 'Autumn' },
    levels: [
      {
        id: '3-1', diff: 1.5,
        name: { es: "Bosque dorado", en: "Golden Woods" },
        say: { es: ["¡Hola, Simba! Soy Pincho. Tu mamá cruzó el bosque dorado.", "Ojo: las hojas del lago se hunden si te quedas quieto."], en: ["Hi, Simba! I'm Pincho. Your mom crossed the golden woods.", "Careful: lake leaves sink if you stand still."] },
        map: [
          "",
          "",
          "                                                oooo",
          "                                                ====                                                                                 ooo",
          "                                   v                                                                              v                  ===",
          "                                                                                                                                                       q                                             ###",
          "                                ooooooooo                              oooo                       q        ooooooooooooooo                            ===        ooooo                               ###",
          "                                                                                                #####                                                                                                ###",
          "  P  ooo      q         w                   C     g       q     w   q           1   w ooo w     #####                        C         g    q    w          q               w       q   ooo  w  K    ###",
          "###############################  l   l    #############################    ###############################  l   l   l   l  ###################################### h   ##################################",
          "###############################           #############################    ###############################                 ######################################     ##################################",
          "###############################           #############################    ###############################                 ######################################     ##################################",
        ],
        rooms: {
          '1': { style: 'cave', map: [
              "########################################",
              "#                                      #",
              "#                                      #",
              "#                                      #",
              "#               v                      #",
              "#                       v              #",
              "#            ooo     ooo          +    #",
              "#                               #####  #",
              "# 0 ooo                       oo#####  #",
              "############ l   l   l   l  ############",
              "############                ############",
              "############                ############",
            ] },
        },
      },
      {
        id: '3-2', diff: 1.57,
        name: { es: "El gran lago", en: "The Great Lake" },
        say: { es: ["El viento de otoño sopla fuerte: mira cómo vuelan las hojas.", "Los géiseres lanzan agua cada pocos segundos. ¡Espera su chorro!"], en: ["The autumn wind blows hard: watch the leaves fly.", "Geysers shoot water every few seconds. Wait for the jet!"] },
        map: [
          "",
          "                                                                                                                                               oooo",
          "                                                                  oooo                                                                         ====",
          "                                                  v               ====                                                                                                                                        v",
          "                                 v                                                                   v                                                                                       v",
          "                                                                                                                               q                                                                                                                       ###",
          "                           ooooooooooo      ooooooooooooooo                                  ooooooooooooooooo                ===                      oooo                            ooooooooooo      ooooooooooooooo                                ###",
          "                                                                                                                                                                                                                                                       ###",
          "  P  ooow   q       w                   C                           g     w   q   q   1                          C      q           w     w      g              w   ooo w q    q                                              w       q   ooo  w  K    ###",
          "#########################  l   l   l   ###  l   l   l   l    ##############################  h     l   l   l   ########################################    ##########################  l   l   l   ###  l   l   l   l   ##################################",
          "#########################              ###                   ##############################                    ########################################    ##########################              ###                  ##################################",
          "#########################              ###                   ##############################                    ########################################    ##########################              ###                  ##################################",
        ],
        rooms: {
          '1': { style: 'cave', map: [
              "############################################",
              "#                                          #",
              "#                                          #",
              "#                     v                    #",
              "#              v                           #",
              "#                            v             #",
              "#           ooo   ooo   ooo                #",
              "#                                       +  #",
              "# 0 ooo                               #### #",
              "##########  h     l     h         ##########",
              "##########                        ##########",
              "##########                        ##########",
            ] },
        },
      },
      {
        id: '3-3', diff: 1.64,
        name: { es: "Cumbres del viento", en: "Windy Peaks" },
        say: { es: ["Tu mamá está en el gran roble, pero Doña Bellota no deja pasar.", "Si se come su bellota dorada, ¡salta sobre ella para impedirlo!"], en: ["Your mom is at the great oak, but Do\u00f1a Bellota blocks the way.", "If she eats her golden acorn, jump on her to stop it!"] },
        map: [
          "",
          "                                                                          oooo",
          "                                                                          ====                                                                                            oooo",
          "        ooo                                                                                                                       v                                       ====",
          "        ===                                         v                                              q                          v",
          "                        ooo q w      q                                                            ===                                                                                                                    ###",
          "                     ####################  ooooooooooooooo                            oooo                            ooooooooooooooooooooo                                               oooo                           ###",
          "                     ####################                                                                                                                                                                                ###",
          "  P       g     q  g ####################                      C  1   w     g     q          ooo w    w  w    2  q                             C      w    w  q       q     g  w    q               w  qooo q   w   K    ###",
          "#########################################  l   l   l   l     #########################    ##########################  h     l   l   l   l    #############################################    ##############################",
          "#########################################                    #########################    ##########################                         #############################################    ##############################",
          "#########################################                    #########################    ##########################                         #############################################    ##############################",
        ],
        rooms: {
          '1': { style: 'cave', map: [
              "########################################",
              "#                                      #",
              "#                                      #",
              "#                    v                 #",
              "#             v                        #",
              "#                         v            #",
              "#          ooo     ooo                 #",
              "#                                  +   #",
              "# 0 ooo                         o##### #",
              "########## l   l   l   l      ##########",
              "##########                    ##########",
              "##########                    ##########",
            ] },
          '2': { style: 'tree', map: [
              "####################",
              "#         +        #",
              "#        ===       #",
              "#                  #",
              "#                  #",
              "#                  #",
              "#                  #",
              "#                  #",
              "# 0    g ooo  ooo  #",
              "####################",
              "####################",
              "####################",
            ] },
        },
      },
      {
        id: '3-4', diff: 1.7,
        name: { es: "El roble de Doña Bellota", en: "Do\u00f1a Bellota's Oak" },
        map: [
          "",
          "",
          "",
          "                     ooo                                                              B",
          "                     ===                                                         =======",
          "                                                                                                                                                             ###",
          "                             ooooooooooooooo                                                                                                                 ###",
          "                                                                                                                                                             ###",
          "  P  ooo  q       w    g                            w     1       C     [    g           g ]                                                          M      ###",
          "###########################  l   l   l   l   ###################################################################################################################",
          "###########################                  ###################################################################################################################",
          "###########################                  ###################################################################################################################",
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
    isRoom, cols, rows: LV_ROWS, grid, spawn: null, fish: [], lifes: [], walkers: [], bats: [], urchins: [], mushrooms: [], movers: [], leaves: [], geysers: [], squirrels: [], checkpoints: [],
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
      else if ('rdcw'.includes(ch)) a.walkers.push({ type: { r: 'rat', d: 'dog', c: 'crab', w: 'boar' }[ch], c, r });
      else if (ch === 'v' || ch === 'b') a.bats.push({ type: ch === 'v' ? 'bat' : 'bee', c, r });
      else if (ch === 'x') a.urchins.push({ c, r });
      else if (ch === 'l') a.leaves.push({ c, r });
      else if (ch === 'g') a.geysers.push({ c, r });
      else if (ch === 'q') a.squirrels.push({ c, r });
      else if (ch === 'j') a.mushrooms.push({ c, r });
      else if (ch === 'h' || ch === 'u') a.movers.push({ axis: ch === 'h' ? 'x' : 'y', c, r });
      else if (ch === 'C') { a.checkpoints.push({ c, r }); a.checkpoint = a.checkpoint || { c, r }; }
      else if (ch === 'K') a.messenger = { c, r };
      else if (ch === 'M') a.mother = { c, r };
      else if (ch === 'B') a.boss = { c, r };
      else if (ch === '[') arenaL = c;
      else if (ch === ']') a.arena = { left: arenaL, right: c };
      else if (ch === '0') a.exit = { c, r };
      else if (ch >= '1' && ch <= '9') a.doors.push({ id: ch, c, r });
    }
  }
  // fila del suelo más común: ancla el fondo, el agua y el abismo. Se mide DESDE ABAJO
  // (la cima de la columna de tierra que llega al fondo), así el techo de las salas no cuenta.
  const tops = {};
  for (let c = 0; c < cols; c++) {
    if (grid[LV_ROWS - 1][c] !== T_SOLID) continue;
    let r = LV_ROWS - 1;
    while (r > 0 && grid[r - 1][c] === T_SOLID) r--;
    if (r > 0) tops[r] = (tops[r] || 0) + 1;
  }
  if (!Object.keys(tops).length) tops[9] = 1;
  a.groundRow = +Object.entries(tops).sort((x, y) => y[1] - x[1])[0][0];
  return a;
}
// Total de pescados de un nivel (incluidas sus salas secretas)
function levelFishTotal(lv) {
  const count = rows => rows.join('').split('o').length - 1;
  return count(lv.map) + Object.values(lv.rooms || {}).reduce((s, r) => s + count(r.map), 0);
}

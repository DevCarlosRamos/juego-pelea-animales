'use strict';
/* Configuración global de PELEA CON ANIMALES */
(function () {
  // Plantillas de ataque (startup/active/recovery estándar)
  const BASE_PUNCH = { startup: 0.10, active: 0.10, recovery: 0.26 };
  const BASE_KICK = { startup: 0.18, active: 0.12, recovery: 0.36 };
  const P = (damage, range) => Object.assign({}, BASE_PUNCH, { damage: damage, range: range });
  const K = (damage, range) => Object.assign({}, BASE_KICK, { damage: damage, range: range });

  window.CFG = {
    W: 960,
    H: 540,
    GROUND_Y: 0.82,
    GRAVITY: 2600,
    MOVE_SPEED: 330,
    JUMP_VEL: -880,
    MAX_FALL: 1200,

    /* ===== Jugador (el mismo personaje que el juego base) ===== */
    fighter: {
      w: 58,
      h: 128,
      hp: 160,
      punch:  { damage: 10, range: 80, startup: 0.08, active: 0.10, recovery: 0.22 },
      kick:   { damage: 16, range: 96, startup: 0.16, active: 0.12, recovery: 0.34 },
      hitstun: 0.38,
      blockStun: 0.12,
      koTime: 1.4
    },

    colors: {
      player: { body: '#2563eb', dark: '#172554', skin: '#fbc49b', accent: '#38bdf8' }
    },

    /* ===== Reglas de oleadas ===== */
    NEXT_SPAWN_HP_FRAC: 0.35,   // vida restante del animal (%) para que aparezca el siguiente
    KO_HEAL: 30,                // vida que recupera el jugador al vencer a un animal
    PLAYER_START_X: 0.3,
    KO_DELAY: 1.5,              // pausa tras un K.O. (segundos)

    /* ===== Puntuación ===== */
    POINTS_PER_KO: 150,
    DAMAGE_FACTOR: 10,
    WIN_BONUS: 500,

    /* ===== Animales =====
       - El 1º de la lista SIEMPRE es la llama (primera aparición obligatoria).
       - El resto salen en orden aleatorio; el león es siempre el último (jefe).
       - Cada nuevo animal aparece desde un lado aleatorio (izquierda/derecha)
         en un punto aleatorio de ese lado (altura aleatoria si vuela). */
    animals: [
      {
        id: 'llama', name: 'Llama', emoji: '🦙', hp: 90, speed: 240, w: 78, h: 175, fly: false, diff: 0.45,
        punch: P(7, 82), kick: K(11, 98),
        colors: { body: '#e8dcc0', dark: '#8a6f4d', accent: '#c99b63' }
      },
      {
        id: 'lobo', name: 'Lobo', emoji: '🐺', hp: 100, speed: 320, w: 84, h: 150, fly: false, diff: 0.58,
        punch: P(9, 80), kick: K(13, 92),
        colors: { body: '#9aa5b1', dark: '#4b5563', accent: '#d8dee6' }
      },
      {
        id: 'jabali', name: 'Jabalí', emoji: '🐗', hp: 110, speed: 300, w: 88, h: 130, fly: false, diff: 0.62,
        punch: P(10, 84), kick: K(14, 90),
        colors: { body: '#6b4a3a', dark: '#3a261c', accent: '#a0745a' }
      },
      {
        id: 'mono', name: 'Mono', emoji: '🐒', hp: 85, speed: 350, w: 70, h: 120, fly: false, diff: 0.65,
        punch: P(8, 70), kick: K(12, 84),
        colors: { body: '#8a623f', dark: '#5a3d22', accent: '#c9a06b' }
      },
      {
        id: 'canguro', name: 'Canguro', emoji: '🦘', hp: 100, speed: 280, w: 80, h: 170, fly: false, diff: 0.66,
        punch: P(9, 90), kick: K(16, 100),
        colors: { body: '#c07a3d', dark: '#7c4a1d', accent: '#e8b87e' }
      },
      {
        id: 'tigre', name: 'Tigre', emoji: '🐯', hp: 120, speed: 330, w: 90, h: 160, fly: false, diff: 0.72,
        punch: P(11, 88), kick: K(15, 96),
        colors: { body: '#e59b2e', dark: '#8a5a12', accent: '#2c2c2c' }
      },
      {
        id: 'oso', name: 'Oso', emoji: '🐻', hp: 160, speed: 220, w: 100, h: 165, fly: false, diff: 0.70,
        punch: P(13, 86), kick: K(17, 94),
        colors: { body: '#5d4632', dark: '#3a2b1e', accent: '#8a6f4d' }
      },
      {
        id: 'cocodrilo', name: 'Cocodrilo', emoji: '🐊', hp: 130, speed: 260, w: 120, h: 100, fly: false, diff: 0.68,
        punch: P(12, 100), kick: K(15, 84),
        colors: { body: '#3f7d3a', dark: '#24521f', accent: '#b8d99a' }
      },
      {
        id: 'serpiente', name: 'Serpiente', emoji: '🐍', hp: 90, speed: 340, w: 70, h: 80, fly: false, diff: 0.70,
        punch: P(10, 72), kick: K(13, 80),
        colors: { body: '#3d9d4a', dark: '#1f6b2a', accent: '#a7d94e' }
      },
      {
        id: 'aguila', name: 'Águila', emoji: '🦅', hp: 100, speed: 360, w: 110, h: 130, fly: true, diff: 0.75,
        punch: P(10, 90), kick: K(14, 100),
        colors: { body: '#6b4a2a', dark: '#3a2815', accent: '#e8c96a' }
      },
      {
        id: 'rinoceronte', name: 'Rinoceronte', emoji: '🦏', hp: 200, speed: 260, w: 110, h: 150, fly: false, diff: 0.78,
        punch: P(14, 94), kick: K(18, 100),
        colors: { body: '#7d7f85', dark: '#4a4c50', accent: '#b8bac0' }
      },
      {
        id: 'leon', name: 'León', emoji: '🦁', hp: 220, speed: 320, w: 100, h: 170, fly: false, diff: 0.85,
        punch: P(15, 96), kick: K(20, 104),
        colors: { body: '#d9a441', dark: '#8a6a1a', accent: '#8a4a1a' }
      }
    ],

    MAX_ANIMALS: 12,

    // Busca la definición de un animal por su id
    animalById: function (id) {
      for (let i = 0; i < this.animals.length; i++) {
        if (this.animals[i].id === id) return this.animals[i];
      }
      return this.animals[0];
    }
  };
})();

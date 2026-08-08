'use strict';
/* Smoke test headless: ejecuta el juego real con un DOM/canvas simulado.
   Uso: node test/smoke.js
   No forma parte del despliegue de producción. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- Stubs mínimos del navegador ----
let fakeNow = 0;
global.performance = { now: () => fakeNow };
global.localStorage = { getItem: () => null, setItem: () => {} };
let rafCb = null;
global.requestAnimationFrame = (fn) => { rafCb = fn; return 1; };
global.cancelAnimationFrame = () => {};
global.addEventListener = () => {};
global.window = global;

function makeCtx() {
  const grad = { addColorStop: () => {} };
  return {
    setTransform() {}, fillRect() {}, save() {}, restore() {},
    translate() {}, scale() {}, rotate() {}, beginPath() {},
    arc() {}, ellipse() {}, fill() {}, stroke() {}, moveTo() {},
    lineTo() {}, quadraticCurveTo() {}, closePath() {},
    createLinearGradient() { return grad; },
    fillText() {},
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt',
    globalAlpha: 1, font: '', textAlign: 'left', shadowColor: '',
    shadowBlur: 0
  };
}

function makeEl() {
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {},
    getContext: () => makeCtx(),
    querySelectorAll: () => [],
    value: '', textContent: '', innerHTML: '',
    clientWidth: 400, clientHeight: 700, width: 0, height: 0
  };
}

const elements = {};
global.document = {
  getElementById: (id) => { if (!elements[id]) elements[id] = makeEl(); return elements[id]; },
  querySelectorAll: () => [],
  addEventListener: () => {},
  hidden: false
};

// ---- Cargar los JS del juego en el contexto global (como en el navegador) ----
const root = path.join(__dirname, '..', 'web', 'js');
const files = ['config.js', 'audio.js', 'api.js', 'input.js', 'fighter.js', 'animals.js', 'ai.js', 'game.js', 'main.js'];
for (const f of files) {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  vm.runInThisContext(code, { filename: f });
}

// ---- Validar poses del personaje v2 (todos los estados y ataques) ----
(function validatePoses() {
  const scenarios = [
    { state: 'idle' },
    { state: 'walk' },
    { state: 'jump' },
    { state: 'attack', attack: { type: 'punch', t: 0.12, hitDone: false } },
    { state: 'attack', attack: { type: 'kick', t: 0.24, hitDone: false } },
    { state: 'block' },
    { state: 'hit' },
    { state: 'ko' }
  ];
  for (const sc of scenarios) {
    const pf = new Fighter({ name: 'Tú', isPlayer: true, x: 100 });
    pf.state = sc.state;
    if (sc.attack) pf.attack = sc.attack;
    pf.animT = 0.5;
    const parts = pf.buildPose();
    if (parts.length < 12) throw new Error('Pose ' + sc.state + ' muy pobre: ' + parts.length + ' partes');
    for (const p of parts) {
      const vals = [p.x, p.y, p.w, p.h, p.r, p.rx, p.ry, p.x1, p.y1, p.x2, p.y2];
      for (const v of vals) {
        if (v !== undefined && (!isFinite(v) || Math.abs(v) > 2000)) {
          throw new Error('Pose ' + sc.state + ' inválida (valor ' + v + '): ' + JSON.stringify(p));
        }
      }
    }
  }
  console.log('Poses v2 OK (idle, walk, jump, punch, kick, block, hit, ko)');
})();


// ---- Bugfix: ataque en el aire + águila (volador) alcanzable y atacable ----
(function validateAirCombat() {
  // 1) El jugador debe poder puñetear/patadear en pleno salto
  const p = new Fighter({ name: 'Tú', isPlayer: true, x: 100 });
  p.state = 'jump';
  p.onGround = false;
  p.cooldown = 0;
  p.attack = null;
  if (!p.canAct()) throw new Error('No se puede atacar en pleno salto');
  if (!p.startAttack('punch')) throw new Error('El puño en el aire no se ejecutó');
  if (!p.attack) throw new Error('El ataque aéreo no se inició');
  p.attack = { type: 'kick', t: 0.24, hitDone: false };
  p.state = 'attack';
  if (!p.getAttackHitbox()) throw new Error('La patada aérea no genera hitbox');

  // 2) El águila (volador) sí puede atacar (antes nunca podía)
  const def = CFG.animalById('aguila');
  const ag = new Fighter({ name: 'Águila', kind: 'aguila', hp: def.hp, speed: def.speed, w: def.w, h: def.h, fly: def.fly, attacks: def, x: 300 });
  if (!ag.canAct()) throw new Error('El águila no puede atacar');

  // 3) Con la altura acotada (60-160 px) un salto del jugador alcanza al águila
  const gY = CFG.GROUND_Y * CFG.H;
  const jumpTop = (gY - 149) - CFG.fighter.h * 0.78;         // tope del hitbox en el salto máximo
  const jumpBot = jumpTop + CFG.fighter.h * 0.56;
  for (let i = 0; i < 20; i++) {
    const y = gY - (60 + Math.random() * 100);
    const bodyTop = y - def.h;
    const bodyBot = y;
    if (bodyBot > jumpTop && bodyTop < jumpBot) return; // alcanzable
  }
  throw new Error('El águila puede quedar fuera del alcance de un salto');
})();
console.log('Bugfix OK (ataque en el aire y águila alcanzable/atacable)');

// ---- Ejecutar una partida simulada ----
const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);
game.resize();

function pump(dt) {
  fakeNow += (dt === undefined ? 16.7 : dt);
  if (typeof rafCb === 'function') { const cb = rafCb; rafCb = null; cb(fakeNow); }
}

game.start();
// fase intro (la llama entra desde un lado)
for (let i = 0; i < 140; i++) pump();

// el primer animal SIEMPRE debe ser la llama
if (!game.animal || game.animal.kind !== 'llama') throw new Error('El primer animal no es la llama');

console.log('tras intro -> phase=', game.phase, 'animal=', game.animal && game.animal.kind,
            'animal.x=', Math.round(game.animal && game.animal.x), 'enter=', game.animal && game.animal.enter);

// ---- Auto-jugador: persigue, bloquea y ataca al animal activo ----
function autoPlayer() {
  const a = game.animal;
  if (!a) return;
  INPUT.state.right = a.x > game.player.x + 40;
  INPUT.state.left = a.x < game.player.x - 40;
  INPUT.state.block = Math.random() < 0.45;
  if (game.player.canAct()) game.player.startAttack(Math.random() < 0.6 ? 'punch' : 'kick');
}

// ---- Jugar hasta el final (victoria o derrota) ----
let safety = 0;
let queuedDuringFight = false;
let queuedAttacked = false;
while (game.phase !== 'matchEnd' && safety < 40000) {
  if (game.phase === 'fight' && game.queued) {
    queuedDuringFight = true;
    if (game.queued.attack || game.queued.state === 'attack') queuedAttacked = true;
  }
  if (game.phase === 'fight') autoPlayer();
  pump();
  safety++;
}
INPUT.state.right = false; INPUT.state.left = false; INPUT.state.block = false;

if (queuedDuringFight && queuedAttacked) {
  throw new Error('El animal en cola atacó antes de su turno (1 a la vez roto)');
}

console.log('fin de partida -> phase=', game.phase, 'won=', game.won, 'score=', game.score,
            'wave=', game.wave, 'playerHP=', Math.round(game.player.hp));

if (game.phase !== 'matchEnd') throw new Error('La partida no llegó a matchEnd (safety=' + safety + ')');

const kinds = game.order.map((o) => o.id);
const unique = new Set(kinds);
if (unique.size !== CFG.animals.length) throw new Error('La secuencia no incluye todos los animales: ' + kinds.join(','));
if (game.order[0].id !== 'llama') throw new Error('La llama no está primero');
if (game.order[game.order.length - 1].id !== 'leon') throw new Error('El león no está último');
console.log('Secuencia completa:', kinds.join(' → '));
console.log('SMOKE TEST OK (partida completa jugada sin errores)');

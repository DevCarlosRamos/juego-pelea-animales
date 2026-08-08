'use strict';
/* IA del animal: máquina de estados simple con dificultad por animal */
function AI(owner, difficulty) {
  this.owner = owner;
  this.difficulty = difficulty || 0.6;
  this.decisionT = 0.4;
  this.intent = 'idle';
  this.reactT = 0;
}

AI.prototype.reset = function () {
  this.decisionT = 0.4;
  this.intent = 'idle';
};

AI.prototype.update = function (dt, game) {
  const e = this.owner;
  if (e.state === 'ko') { e.moveInput = 0; e.blocking = false; e.swoop = false; return; }
  if (e.enter) return;   // mientras entra desde el borde, NO tocar su movimiento
  const p = game.player;
  const dist = Math.abs(p.x - e.x);
  const dirToP = p.x > e.x ? 1 : -1;
  const chance = this.difficulty;

  this.decisionT -= dt;
  this.reactT -= dt;

  // Reaccionar bloqueando (solo animales capaces de bloquear: simia/cánidos/big cat)
  const canBlock = e.kind !== 'serpiente' && e.kind !== 'cocodrilo' && e.kind !== 'rinoceronte';
  const playerAttacking = p.state === 'attack' && p.attack &&
    p.attack.t < CFG.fighter[p.attack.type].startup + CFG.fighter[p.attack.type].active;
  if (canBlock && playerAttacking && dist < CFG.fighter.kick.range + 40 && this.reactT <= 0 && Math.random() < chance * 0.5) {
    this.intent = 'block';
    this.decisionT = Math.max(this.decisionT, 0.25);
    this.reactT = 0.8;
  }

  if (this.decisionT <= 0) {
    this.decisionT = (0.22 + Math.random() * 0.3) * (1.4 - chance);
    const r = Math.random();
    const close = e.kind === 'cocodrilo' ? 150 : 130;
    if (dist > close) {
      this.intent = r < 0.8 ? 'approach' : (r < 0.92 ? 'jump' : 'idle');
    } else if (dist > 70) {
      this.intent = r < 0.55 ? 'approach' : (r < 0.82 ? 'attack' : 'retreat');
    } else {
      this.intent = r < 0.5 ? 'attack' : (r < 0.72 ? 'block' : 'retreat');
    }
  }

  e.blocking = false;
  e.moveInput = 0;
  e.swoop = false;   // solo baja (pica) cuando ataca de cerca

  switch (this.intent) {
    case 'approach':
      e.moveInput = dirToP;
      break;
    case 'retreat':
      e.moveInput = -dirToP;
      break;
    case 'jump':
      if (!e.fly && e.onGround && Math.random() < 0.1) e.doJump();
      else e.moveInput = dirToP;
      break;
    case 'attack':
      if (dist < 95) {
        e.moveInput = 0;
        if (e.fly) e.swoop = true;
        if (e.canAct()) {
          const type = Math.random() < 0.55 ? 'punch' : 'kick';
          e.startAttack(type);
          if (!e.fly && Math.random() < chance * 0.25) e.doJump();
        }
      } else {
        e.moveInput = dirToP;
      }
      break;
    case 'block':
      e.blocking = true;
      e.moveInput = 0;
      break;
    default:
      break;
  }
};

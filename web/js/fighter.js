'use strict';
/* Peleador: estado, física básica, combate y dibujo procedural.
   El mismo personaje azul del juego base + los animales (vía `kind`). */
function Fighter(opts) {
  this.name = opts.name;
  this.isPlayer = !!opts.isPlayer;
  this.kind = opts.kind || null;          // id del animal (null = humano)
  this.w = opts.w || CFG.fighter.w;
  this.h = opts.h || CFG.fighter.h;
  this.attacks = opts.attacks || CFG.fighter;
  this.hitstun = (opts.hitstun !== undefined) ? opts.hitstun : CFG.fighter.hitstun;
  this.moveSpeed = opts.speed || CFG.MOVE_SPEED;
  this.fly = !!opts.fly;                  // si vuela (no usa gravedad)
  this.anchorY = 0;                       // altura de vuelo (si fly)
  this.swoop = false;                     // el volador se lanza a atacar (baja)
  this.enter = false;                     // está entrando desde un lado
  this.enterTargetX = 0;

  this.x = opts.x;
  this.y = 0;
  this.vx = 0;
  this.vy = 0;
  this.facing = 1;
  this.maxHp = opts.hp || CFG.fighter.hp;
  this.hp = this.maxHp;
  this.state = 'idle';
  this.stateT = 0;
  this.animT = Math.random() * 10;
  this.onGround = true;
  this.stun = 0;
  this.attack = null;
  this.blocking = false;
  this.blockT = 0;
  this.cooldown = 0;
  this.moveInput = 0;
  this.hitFlash = 0;
  this.wins = 0;
  this.damageDealt = 0;
  this.koBonus = 0;
  this.color = opts.color || CFG.colors.player;
}

Fighter.prototype.reset = function (x) {
  this.x = x;
  this.y = this.fly ? this.anchorY : 0;
  this.vx = 0; this.vy = 0;
  this.hp = this.maxHp;
  this.state = 'idle';
  this.stateT = 0;
  this.onGround = !this.fly;
  this.stun = 0;
  this.attack = null;
  this.blocking = false;
  this.blockT = 0;
  this.cooldown = 0;
  this.hitFlash = 0;
};

Fighter.prototype.animalDef = function () {
  return this.kind ? CFG.animalById(this.kind) : null;
};

Fighter.prototype.canAct = function () {
  // Bugfix: permitir atacar en pleno salto (para alcanzar voladores) y
  // que los animales voladores (águila) puedan atacar aunque estén en el aire.
  if (this.cooldown > 0 || this.attack || this.enter || this.state === 'ko' || this.state === 'hit') return false;
  if (this.fly) return true;
  return this.state === 'idle' || this.state === 'walk' || this.state === 'block' || this.state === 'jump';
};

Fighter.prototype.doJump = function () {
  if (this.fly || !this.onGround || this.state === 'ko') return;
  this.vy = CFG.JUMP_VEL;
  this.onGround = false;
  this.state = 'jump';
  this.stateT = 0;
  SFX.jump();
};

Fighter.prototype.startAttack = function (type) {
  if (!this.canAct()) return false;
  this.attack = { type: type, t: 0, hitDone: false };
  this.state = 'attack';
  this.stateT = 0;
  this.cooldown = this.attacks[type].recovery * 1.15;
  SFX.whoosh();
  return true;
};

Fighter.prototype.takeHit = function (damage, dir, fromJump) {
  if (this.state === 'ko') return;
  const blocked = this.blocking && this.blockT > 0 && this.state === 'block';
  if (blocked) {
    this.blockT = 0;
    this.stun = Math.max(this.stun, CFG.fighter.blockStun);
    SFX.block();
    return { blocked: true, damage: 0 };
  }
  const dmg = fromJump ? damage * 1.25 : damage;
  this.hp = Math.max(0, this.hp - dmg);
  this.hitFlash = 1;
  this.attack = null;
  this.state = 'hit';
  this.stateT = 0;
  this.stun = Math.max(this.stun, this.hitstun);
  this.facing = dir > 0 ? 1 : -1;
  this.vx = dir * 180;
  if (!this.fly && !this.onGround) this.vy = Math.min(this.vy, -140);
  if (this.hp <= 0) {
    this.state = 'ko';
    this.stateT = 0;
    SFX.ko();
  } else if (this.isPlayer) {
    SFX.hitPlayer();
  } else {
    SFX.punchHit();
  }
  return { blocked: false, damage: dmg };
};

Fighter.prototype.update = function (dt) {
  this.animT += dt;
  this.stateT += dt;
  if (this.cooldown > 0) this.cooldown -= dt;
  if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt * 4);
  if (this.blockT > 0) this.blockT -= dt;

  if (this.attack) {
    const def = this.attacks[this.attack.type];
    this.attack.t += dt;
    if (this.attack.t >= def.startup + def.active + def.recovery) {
      this.attack = null;
      if (this.state === 'attack') {
        // Bugfix: si el ataque se hizo en el aire, volver a la pose de salto
        this.state = (!this.onGround && !this.fly) ? 'jump' : 'idle';
        this.stateT = 0;
      }
    }
  }

  if (this.state === 'hit' && this.stun <= 0) {
    this.state = 'idle'; this.stateT = 0;
  }
  if (this.stun > 0) this.stun -= dt;

  if (this.blocking && (this.onGround || this.fly) && this.canAct()) {
    this.state = 'block';
    this.blockT = 0.25;
  } else if (this.state === 'block' && !this.blocking) {
    this.state = 'idle'; this.stateT = 0;
  }
  if (this.state === 'walk' && this.moveInput === 0) {
    this.state = 'idle'; this.stateT = 0;
  }
  if (this.onGround && this.state !== 'attack' && this.state !== 'hit' &&
      this.state !== 'ko' && this.state !== 'block' && this.state !== 'walk' && this.moveInput !== 0) {
    this.state = 'walk';
  }
};

/* ============ Dibujo ============ */
Fighter.prototype.draw = function (ctx) {
  const ko = this.state === 'ko';
  const airFrac = ko ? 0 : Math.min(1, (CFG.GROUND_Y * CFG.H - this.y) / (CFG.H * 0.6));
  const halfW = this.w / 2;

  // Sombra en el suelo
  ctx.save();
  ctx.globalAlpha = 0.28 * (1 - airFrac * 0.5);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(this.x, CFG.GROUND_Y * CFG.H + 8, Math.max(22, halfW) * (1 - airFrac * 0.45), 9 * (1 - airFrac * 0.4), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(this.x, this.y);
  if (ko) ctx.rotate(-this.facing * Math.PI / 2);

  if (this.kind) {
    drawAnimal(this, ctx);
  } else {
    const parts = this.buildPose();
    for (const p of parts) drawPart(ctx, p);
  }

  if (this.hitFlash > 0.03) {
    ctx.globalAlpha = Math.min(1, this.hitFlash) * 0.6;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(0, -this.h * 0.5, this.w * 0.62, this.h * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

/* --- Geometría procedural del personaje (v2): política de traje blanco ---
   Figura femenina estilizada (inspiración Keiko Fujimori, genérica, no realista):
   pelo negro liso a los hombros, traje blanco (blazer + pantalón),
   banda presidencial roja/blanca y zapatos negros. Sin rasgos faciales.
   Mismas proporciones del personaje original (w=58, h=128), pivot centrado. */
Fighter.prototype.buildPose = function () {
  const f = this.facing;
  const h = this.h, w = this.w;
  const parts = [];
  const bob = Math.abs(Math.sin(this.animT * 3)) * 4;
  let hipY = -h * 0.40 - bob * 0.4;
  let shY = -h * 0.74 - bob * 0.4;
  let headY = -h * 0.92 - bob * 0.4;
  let lean = 0;
  let leg1 = { x1: f * 6, y1: hipY, x2: f * 9, y2: 0 };
  let leg2 = { x1: -f * 6, y1: hipY, x2: -f * 9, y2: 0 };
  let arm1 = { x1: f * 7, y1: shY + 8, x2: f * 16, y2: shY + 26 };
  let arm2 = { x1: -f * 7, y1: shY + 8, x2: -f * 12, y2: shY + 30 };

  // Paleta del personaje v2
  const C = {
    suit: '#eef2f7',      // blazer blanco
    suitLight: '#ffffff', // pantalones y mangas
    suitDark: '#c6d2de',  // sombreado del traje
    skin: '#f2c29a',      // piel
    hair: '#161b26',      // pelo negro liso
    sash: '#dc2626',      // banda presidencial roja
    sashLight: '#ffffff', // franja blanca de la banda
    shoe: '#0f1420'       // zapatos negros
  };

  if (this.state === 'ko') {
    hipY = -h * 0.30; shY = -h * 0.55; headY = -h * 0.70;
    leg1 = { x1: f * 10, y1: hipY, x2: f * 22, y2: -h * 0.10 };
    leg2 = { x1: -f * 4, y1: hipY, x2: -f * 18, y2: -h * 0.02 };
    arm1 = { x1: f * 6, y1: shY, x2: f * 20, y2: shY + 14 };
    arm2 = { x1: f * 10, y1: shY, x2: f * 2, y2: shY + 24 };
  } else if (this.state === 'walk') {
    const sw = Math.sin(this.animT * 12) * 16;
    leg1 = { x1: f * 6, y1: hipY, x2: f * sw, y2: 0 };
    leg2 = { x1: -f * 6, y1: hipY, x2: -f * sw, y2: 0 };
    arm1 = { x1: f * 7, y1: shY + 8, x2: f * (16 - sw * 0.5), y2: shY + 26 };
    arm2 = { x1: -f * 7, y1: shY + 8, x2: -f * (12 - sw * 0.5), y2: shY + 30 };
  } else if (this.state === 'jump') {
    leg1 = { x1: f * 8, y1: hipY, x2: f * 14, y2: -10 };
    leg2 = { x1: -f * 6, y1: hipY, x2: -f * 12, y2: -16 };
    arm1 = { x1: f * 8, y1: shY, x2: f * 20, y2: shY - 12 };
    arm2 = { x1: -f * 8, y1: shY, x2: -f * 18, y2: shY - 16 };
  } else if (this.state === 'attack') {
    const type = this.attack ? this.attack.type : 'punch';
    const def = this.attacks[type];
    if (type === 'punch') {
      const ext = Math.sin(Math.min(1, this.attack.t / (def.startup + def.active)) * Math.PI);
      arm1 = { x1: f * 8, y1: shY + 4, x2: f * (14 + 60 * ext), y2: shY + 12 };
      parts.push({ t: 'circle', x: f * (14 + 60 * ext), y: shY + 12, r: 8, c: C.skin });
      lean = -f * 10 * ext;
    } else {
      const ext = Math.sin(Math.min(1, this.attack.t / (def.startup + def.active)) * Math.PI);
      leg1 = { x1: f * 8, y1: hipY, x2: f * (10 + 78 * ext), y2: hipY + 34 };
      arm1 = { x1: -f * 6, y1: shY + 6, x2: f * 6, y2: shY + 18 };
      lean = -f * 14 * ext;
    }
    hipY += lean * 0.4; shY += lean * 0.4; headY += lean * 0.4;
  } else if (this.state === 'block') {
    arm1 = { x1: f * 8, y1: shY + 2, x2: f * 22, y2: shY + 18 };
    arm2 = { x1: f * 6, y1: shY + 6, x2: f * 18, y2: shY + 26 };
  } else if (this.state === 'hit') {
    lean = -f * 12;
    leg1 = { x1: f * 2, y1: hipY, x2: f * 4, y2: 0 };
    leg2 = { x1: -f * 12, y1: hipY, x2: -f * 16, y2: 0 };
    arm1 = { x1: f * 2, y1: shY, x2: f * 22, y2: shY - 10 };
    arm2 = { x1: -f * 8, y1: shY, x2: -f * 22, y2: shY + 8 };
    hipY += lean * 0.4; shY += lean * 0.4; headY += lean * 0.4;
  }

  // ============ Dibujo del personaje (femenino, traje blanco) ============
  const midY = (shY + hipY) / 2;   // centro del torso
  const isPunch = this.state === 'attack' && this.attack && this.attack.type === 'punch';

  // Zapatos negros (detrás de los pantalones; se repintan encima abajo)
  parts.push({ t: 'ell', x: leg1.x2, y: leg1.y2, rx: 8, ry: 4.5, c: C.shoe });
  parts.push({ t: 'ell', x: leg2.x2, y: leg2.y2, rx: 8, ry: 4.5, c: C.shoe });

  // Pantalones blancos + sombreado
  parts.push({ t: 'line', x1: leg1.x1, y1: leg1.y1, x2: leg1.x2, y2: leg1.y2, w: 13, c: C.suitLight });
  parts.push({ t: 'line', x1: leg2.x1, y1: leg2.y1, x2: leg2.x2, y2: leg2.y2, w: 13, c: C.suitLight });
  parts.push({ t: 'line', x1: leg1.x1, y1: leg1.y1, x2: leg1.x2, y2: leg1.y2, w: 4, c: C.suitDark });
  parts.push({ t: 'line', x1: leg2.x1, y1: leg2.y1, x2: leg2.x2, y2: leg2.y2, w: 4, c: C.suitDark });
  // Zapatos negros (encima de la pierna para que se distingan)
  parts.push({ t: 'ell', x: leg1.x2, y: leg1.y2 + 1, rx: 10, ry: 6, c: C.shoe });
  parts.push({ t: 'ell', x: leg2.x2, y: leg2.y2 + 1, rx: 10, ry: 6, c: C.shoe });

  // Blazer (torso blanco): un solo bloque limpio (sin "panza doble")
  parts.push({ t: 'ell', x: 0, y: midY, rx: w * 0.46, ry: (hipY - shY) * 0.55, c: C.suit });
  // Sombra sutil solo en el borde inferior (cintura), no al costado
  parts.push({ t: 'ell', x: 0, y: hipY + 2, rx: w * 0.40, ry: 5, c: C.suitDark });
  // Solapas del blazer
  parts.push({ t: 'line', x1: f * 9, y1: shY + 4, x2: f * 2, y2: midY + 4, w: 5, c: C.suitDark });
  parts.push({ t: 'line', x1: -f * 9, y1: shY + 4, x2: -f * 1, y2: midY + 4, w: 5, c: C.suitDark });
  // Botones
  parts.push({ t: 'circle', x: f * 1, y: midY + 4, r: 2, c: C.suitDark });
  parts.push({ t: 'circle', x: f * 1, y: midY - 3, r: 2, c: C.suitDark });

  // Banda presidencial (roja con franja blanca) de hombro a cintura
  parts.push({ t: 'line', x1: f * 9, y1: shY + 10, x2: -f * 10, y2: hipY + 2, w: 11, c: C.sash });
  parts.push({ t: 'line', x1: f * 9, y1: shY + 10, x2: -f * 10, y2: hipY + 2, w: 4, c: C.sashLight });

  // Cinturón
  parts.push({ t: 'line', x1: -f * 9, y1: hipY, x2: f * 9, y2: hipY, w: 5, c: C.suitDark });

  // Cuello
  parts.push({ t: 'rect', x: -5, y: headY + 9, w: 10, h: (shY - 2) - (headY + 9), c: C.skin });

  // Cabeza: pelo negro liso a los hombros (sin rasgos faciales)
  parts.push({ t: 'ell', x: 0, y: headY, rx: 15, ry: 14, c: C.hair });          // pelo trasero
  parts.push({ t: 'ell', x: f * 2, y: headY + 1, rx: 11.5, ry: 11.5, c: C.skin }); // cara
  parts.push({ t: 'ell', x: f * 2, y: headY - 6, rx: 12, ry: 6, c: C.hair });   // flequillo
  // Mechones laterales hasta los hombros
  parts.push({ t: 'rect', x: f * 2 - 14, y: headY - 2, w: 7, h: (shY + 2) - (headY - 2), c: C.hair });
  parts.push({ t: 'rect', x: f * 2 + 7, y: headY - 2, w: 7, h: (shY + 2) - (headY - 2), c: C.hair });

  // Brazos: manga blanca + mano sin dedos
  parts.push({ t: 'line', x1: arm1.x1, y1: arm1.y1, x2: arm1.x2, y2: arm1.y2, w: 10, c: C.suitLight });
  parts.push({ t: 'line', x1: arm2.x1, y1: arm2.y1, x2: arm2.x2, y2: arm2.y2, w: 10, c: C.suitLight });
  if (!isPunch) parts.push({ t: 'circle', x: arm1.x2, y: arm1.y2, r: 6, c: C.skin });
  parts.push({ t: 'circle', x: arm2.x2, y: arm2.y2, r: 6, c: C.skin });

  return parts;
};

function drawPart(ctx, p) {
  ctx.fillStyle = p.c;
  ctx.strokeStyle = p.c;
  if (p.t === 'rect') {
    ctx.fillRect(p.x, p.y, p.w, p.h);
  } else if (p.t === 'circle') {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.t === 'ell') {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.t === 'line') {
    ctx.lineWidth = p.w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x1, p.y1);
    ctx.lineTo(p.x2, p.y2);
    ctx.stroke();
  }
}

Fighter.prototype.getAttackHitbox = function () {
  if (!this.attack) return null;
  const def = this.attacks[this.attack.type];
  const p = this.attack.t;
  if (p < def.startup || p > def.startup + def.active) return null;
  const reach = def.range;
  const startX = this.x + (this.facing < 0 ? -reach : 0);
  return {
    x: startX - 12,
    y: this.y - this.h * 0.78,
    w: reach + 24,
    h: this.h * 0.56
  };
};



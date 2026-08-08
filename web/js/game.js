'use strict';
/* Motor principal: el jugador pelea contra 1 animal a la vez.
   Cuando el animal está por morir (HP <= 35%) aparece el siguiente entrando
   desde un lado aleatorio en un punto aleatorio. */
function Game(canvas) {
  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');
  this.dpr = Math.min(window.devicePixelRatio || 1, 2);
  this.phase = 'idle';            // idle|intro|fight|ko|matchEnd
  this.phaseT = 0;
  this.particles = [];
  this.rings = [];
  this.shake = 0;
  this.running = false;
  this.paused = false;
  this.lastTime = 0;
  this.score = 0;
  this.onMatchEnd = null;

  this.groundY = CFG.GROUND_Y * CFG.H;
  this.player = new Fighter({ name: 'Tú', isPlayer: true, x: CFG.W * CFG.PLAYER_START_X });
  this.player.y = this.groundY;

  this.animal = null;   // animal activo
  this.queued = null;   // siguiente animal (ya entrando en pantalla)
  this.order = [];      // secuencia de animales de la partida
  this.wave = 0;        // índice del animal actual en order[]
  this.won = false;
}

/* Secuencia: la LLAMA SIEMPRE es la 1ª; el resto aleatorio; el LEÓN el último */
Game.prototype.buildOrder = function () {
  const all = CFG.animals.slice();
  const llama = all.shift();
  const leon = all.pop();
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = all[i]; all[i] = all[j]; all[j] = t;
  }
  return [llama].concat(all).concat([leon]);
};

/* Crea un animal. asQueued=true → será el siguiente (entra mientras peleas) */
Game.prototype.spawnAnimal = function (asQueued) {
  const idx = this.wave + (asQueued ? 1 : 0);
  if (idx >= this.order.length) return;
  const def = this.order[idx];
  const side = Math.random() < 0.5 ? -1 : 1;   // lado aleatorio (solo una entrada)
  // Punto de aparición aleatorio del lado elegido:
  //  - terrestres: siempre en el suelo
  //  - voladores: altura aleatoria (puede entrar por arriba)
  const y = def.fly ? this.groundY - (90 + Math.random() * 210) : this.groundY;
  const x = side < 0 ? -90 : CFG.W + 90;

  const f = new Fighter({
    name: def.name, kind: def.id,
    hp: def.hp, speed: def.speed,
    w: def.w, h: def.h, fly: def.fly,
    attacks: def,
    x: x
  });
  f.facing = side < 0 ? 1 : -1;
  f.y = y;
  f.anchorY = y;
  f.enter = true;
  f.enterTargetX = side < 0 ? CFG.W * 0.62 : CFG.W * 0.38;
  f.ai = new AI(f, def.diff);

  this.spawnFlash(x, y - f.h / 2);
  SFX.spawn();

  if (asQueued) this.queued = f;
  else this.animal = f;
};

Game.prototype.start = function () {
  this.player.reset(CFG.W * CFG.PLAYER_START_X);
  this.player.y = this.groundY;
  this.order = this.buildOrder();
  this.wave = 0;
  this.won = false;
  this.score = 0;
  this.particles = [];
  this.rings = [];
  this.queued = null;
  this.animal = null;
  this.spawnAnimal(false);   // la 1ª aparición SIEMPRE es la llama
  this.phase = 'intro';
  this.phaseT = 0;
  this.running = true;
  this.lastTime = performance.now();
  SFX.roundStart();
  requestAnimationFrame((t) => this.loop(t));
};

Game.prototype.loop = function (t) {
  if (!this.running) return;
  const dt = Math.min(0.033, (t - this.lastTime) / 1000);
  this.lastTime = t;
  if (!this.paused) {
    this.updateEffects(dt);
    if (this.phase === 'intro') {
      this.step(dt);
      this.phaseT += dt;
      if (this.phaseT > 2.2) { this.phase = 'fight'; this.phaseT = 0; }
    } else if (this.phase === 'fight') {
      this.step(dt);
      this.combat(dt);
    } else if (this.phase === 'ko') {
      this.step(dt);
      this.phaseT += dt;
      if (this.phaseT >= CFG.KO_DELAY) {
        if (this.won) { this.finishMatch(true); }
        else if (this.player.state === 'ko') { this.finishMatch(false); }
        else { this.promoteNext(); this.phase = 'fight'; this.phaseT = 0; }
      }
    }
  }
  this.draw();
  requestAnimationFrame((tt) => this.loop(tt));
};

Game.prototype.stop = function () {
  this.running = false;
  this.phase = 'idle';
};

/* Física, entradas y orientación de todos los actores en pantalla */
Game.prototype.step = function (dt) {
  const p = this.player, a = this.animal;

  if (p.state !== 'ko') {
    p.moveInput = (INPUT.state.right ? 1 : 0) - (INPUT.state.left ? 1 : 0);
    p.blocking = INPUT.state.block;
  } else {
    p.moveInput = 0; p.blocking = false;
  }

  this.updateEnterFlags(dt);

  // Solo el animal ACTIVO pelea; el que está entrando (cola) espera su turno
  if (a && a.ai) a.ai.update(dt, this);

  this.physics(p, dt);
  if (a) this.physics(a, dt);
  if (this.queued) this.physics(this.queued, dt);

  if (a) this.separate(p, a);
  if (this.queued) this.separate(p, this.queued);

  if (p.state !== 'ko') {
    if (a) p.facing = a.x > p.x ? 1 : -1;
    else if (this.queued) p.facing = this.queued.x > p.x ? 1 : -1;
  }
  if (a && a.state !== 'ko') a.facing = p.x > a.x ? 1 : -1;
  if (this.queued && this.queued.state !== 'ko') this.queued.facing = p.x > this.queued.x ? 1 : -1;
};

/* Quien está entrando camina hacia su posición de combate */
Game.prototype.updateEnterFlags = function (dt) {
  const actors = [this.animal, this.queued];
  for (let i = 0; i < actors.length; i++) {
    const f = actors[i];
    if (f && f.enter) {
      if (Math.abs(f.x - f.enterTargetX) <= 16) {
        f.enter = false;
        f.moveInput = 0;
        if (!f.fly) f.onGround = true;
      } else {
        f.moveInput = f.x < f.enterTargetX ? 1 : -1;
      }
    }
  }
};

Game.prototype.physics = function (f, dt) {
  const g = this.groundY;
  if (f.fly) {
    f.vx = f.moveInput * f.moveSpeed;
    f.vy = 0;
    f.x += f.vx * dt;
    // Picado: cuando ataca baja hasta casi el suelo para golpear (y ser golpeable)
    const baseY = f.swoop ? g - 80 : f.anchorY;
    f.y = baseY + Math.sin(f.animT * 2.2) * 10;
  } else {
    f.vx = f.state === 'ko' ? 0 : f.moveInput * f.moveSpeed;
    f.vy += CFG.GRAVITY * dt;
    if (f.vy > CFG.MAX_FALL) f.vy = CFG.MAX_FALL;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    if (f.y >= g) { f.y = g; f.vy = 0; f.onGround = true; }
    else if (f.vy > 0) f.onGround = false;
  }
  const halfW = f.w / 2;
  f.x = Math.max(halfW + 24, Math.min(CFG.W - halfW - 24, f.x));
  f.update(dt);
};

Game.prototype.separate = function (a, b) {
  const minGap = (a.w + b.w) * 0.45;
  const overlap = minGap - Math.abs(a.x - b.x);
  if (overlap <= 0) return;
  const dir = a.x < b.x ? -1 : 1;
  const aAlive = a.state !== 'ko', bAlive = b.state !== 'ko';
  if (aAlive && bAlive) { a.x += dir * overlap / 2; b.x -= dir * overlap / 2; }
  else if (aAlive) a.x += dir * overlap;
  else if (bAlive) b.x -= dir * overlap;
};

/* Combate: dispara la aparición del siguiente animal si el actual está por morir */
Game.prototype.combat = function (dt) {
  const p = this.player, a = this.animal;
  if (!a) return;

  if (!this.queued && this.wave + 1 < this.order.length &&
      a.hp > 0 && !a.enter && a.hp <= a.maxHp * CFG.NEXT_SPAWN_HP_FRAC) {
    this.spawnAnimal(true);   // el siguiente empieza a aparecer
  }

  this.checkAttack(p, a);
  if (a.hp > 0) this.checkAttack(a, p);
};

Game.prototype.checkAttack = function (att, vic) {
  const hb = att.getAttackHitbox();
  if (!hb || att.attack.hitDone) return;
  const body = {
    x: vic.x - vic.w / 2,
    y: vic.y - vic.h,
    w: vic.w,
    h: vic.h
  };
  if (!rectsOverlap(hb, body)) return;
  att.attack.hitDone = true;
  const dir = att.x < vic.x ? 1 : -1;
  const res = vic.takeHit(att.attacks[att.attack.type].damage, dir, !att.onGround && !att.fly);
  if (res && !res.blocked) {
    att.damageDealt += res.damage;
    this.spawnHit(vic.x - dir * 22, vic.y - vic.h / 2);
    this.shake = Math.max(this.shake, 7);
    if (vic.hp <= 0) {
      att.koBonus += CFG.POINTS_PER_KO;
      if (vic.isPlayer) this.playerKO();
      else this.animalKO();
    }
  } else {
    this.rings.push({ x: vic.x - dir * 24, y: vic.y - vic.h * 0.6, r: 5, life: 0.25 });
  }
};

Game.prototype.playerKO = function () {
  if (this.phase !== 'fight') return;
  this.phase = 'ko';
  this.phaseT = 0;
  this.won = false;
  SFX.lose();
};

Game.prototype.animalKO = function () {
  if (this.phase !== 'fight') return;
  this.phase = 'ko';
  this.phaseT = 0;
  // Al vencer un animal el jugador recupera algo de vida
  this.player.hp = Math.min(this.player.maxHp, this.player.hp + CFG.KO_HEAL);
  this.wave++;
  if (this.wave >= this.order.length) {
    this.won = true;
    SFX.win();
  } else {
    SFX.spawn();
  }
};

Game.prototype.promoteNext = function () {
  if (this.queued) {
    this.animal = this.queued;
    this.queued = null;
    if (this.animal.ai) this.animal.ai.reset();
  } else if (this.wave < this.order.length) {
    this.spawnAnimal(false);
  } else {
    this.animal = null;
  }
};

Game.prototype.finishMatch = function (won) {
  this.phase = 'matchEnd';
  const p = this.player;
  this.score = Math.round(
    p.damageDealt * CFG.DAMAGE_FACTOR +
    p.koBonus +
    (won ? CFG.WIN_BONUS : 0)
  );
  if (this.onMatchEnd) this.onMatchEnd(won, this.score, p);
};


Game.prototype.updateEffects = function (dt) {
  for (let i = this.particles.length - 1; i >= 0; i--) {
    const pt = this.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vy += 500 * dt;
    if (pt.life <= 0) this.particles.splice(i, 1);
  }
  for (let i = this.rings.length - 1; i >= 0; i--) {
    const r = this.rings[i];
    r.life -= dt;
    r.r += 160 * dt;
    if (r.life <= 0) this.rings.splice(i, 1);
  }
  if (this.shake > 0) this.shake = Math.max(0, this.shake - 26 * dt);
};

Game.prototype.spawnHit = function (x, y) {
  const colors = ['#fde047', '#f97316', '#ef4444', '#ffffff'];
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 140 + Math.random() * 280;
    this.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      life: 0.3 + Math.random() * 0.25,
      color: colors[i % 4],
      size: 2 + Math.random() * 3
    });
  }
};

Game.prototype.spawnFlash = function (x, y) {
  const colors = ['#fde047', '#38bdf8', '#ffffff', '#f97316'];
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 120 + Math.random() * 260;
    this.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      life: 0.35 + Math.random() * 0.3,
      color: colors[i % 4],
      size: 2 + Math.random() * 3
    });
  }
};

Game.prototype.resize = function () {
  const c = this.canvas;
  c.width = Math.max(2, Math.floor(c.clientWidth * this.dpr));
  c.height = Math.max(2, Math.floor(c.clientHeight * this.dpr));
};

Game.prototype.draw = function () {
  const ctx = this.ctx;
  const W = CFG.W, H = CFG.H;
  const cw = this.canvas.width / this.dpr;
  const ch = this.canvas.height / this.dpr;
  ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  ctx.fillStyle = '#0b0e1a';
  ctx.fillRect(0, 0, cw, ch);
  const sc = Math.min(cw / W, ch / H);
  const ox = (cw - W * sc) / 2;
  const oy = (ch - H * sc) / 2;
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(sc, sc);
  if (this.shake > 0.5) {
    ctx.translate((Math.random() * 2 - 1) * this.shake, (Math.random() * 2 - 1) * this.shake);
  }
  this.drawBackground(ctx);
  this.player.draw(ctx);
  if (this.animal) this.animal.draw(ctx);
  if (this.queued) this.queued.draw(ctx);
  for (const pt of this.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / 0.55);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
  for (const r of this.rings) {
    ctx.globalAlpha = Math.max(0, r.life / 0.25);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  this.drawPhaseText(ctx);
  ctx.restore();
};

Game.prototype.drawBackground = function (ctx) {
  const W = CFG.W, H = CFG.H, g = this.groundY;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.45, '#1e1b4b');
  grad.addColorStop(0.75, '#4c1d95');
  grad.addColorStop(1, '#7c2d12');
  ctx.fillStyle = grad;
  ctx.fillRect(-40, -40, W + 80, g + 40);
  // Sol
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.40, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(251,191,36,.18)';
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.40, 64, 0, Math.PI * 2);
  ctx.fill();
  // Montañas
  ctx.fillStyle = '#312e81';
  ctx.beginPath();
  ctx.moveTo(0, g);
  ctx.lineTo(W * 0.22, g - 150);
  ctx.lineTo(W * 0.48, g - 30);
  ctx.lineTo(W * 0.76, g - 190);
  ctx.lineTo(W, g - 70);
  ctx.lineTo(W, g);
  ctx.closePath();
  ctx.fill();
  // Suelo de la arena
  ctx.fillStyle = '#3f2b1c';
  ctx.fillRect(0, g, W, H - g);
  ctx.strokeStyle = 'rgba(0,0,0,.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 20; i++) {
    const x = (i / 20) * W;
    ctx.beginPath();
    ctx.moveTo(x, g);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, g + 8);
  ctx.lineTo(W, g + 8);
  ctx.stroke();
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(0, g - 6, W, 6);
};

Game.prototype.drawPhaseText = function (ctx) {
  const W = CFG.W, H = CFG.H;
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 14;
  if (this.phase === 'intro') {
    const t = this.phaseT;
    ctx.font = '800 44px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(252,211,77,' + Math.min(1, Math.min(t, 0.6) / 0.6) + ')';
    ctx.fillText('ANIMAL ' + (this.wave + 1) + ' DE ' + this.order.length, W / 2, H * 0.30);
    if (this.animal) {
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText(this.animal.name, W / 2, H * 0.30 + 44);
    }
    ctx.font = '800 34px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, Math.max(0, (t - 1.4) / 0.6)) + ')';
    ctx.fillText('¡LUCHA!', W / 2, H * 0.46);
  } else if (this.phase === 'ko') {
    ctx.font = '800 54px system-ui, sans-serif';
    ctx.fillStyle = this.won ? '#fcd34d' : '#f87171';
    ctx.fillText(this.won ? '¡VICTORIA!' : (this.player.state === 'ko' ? '¡K.O.!' : '¡K.O.!'), W / 2, H * 0.30);
    if (this.won) {
      ctx.font = '800 26px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('Has vencido a todos los animales', W / 2, H * 0.30 + 46);
    } else if (this.player.state !== 'ko' && this.queued) {
      ctx.font = '800 28px system-ui, sans-serif';
      ctx.fillStyle = '#fff';
      ctx.fillText('Llega: ' + this.queued.name, W / 2, H * 0.30 + 46);
    }
  }
  ctx.shadowBlur = 0;
};

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}


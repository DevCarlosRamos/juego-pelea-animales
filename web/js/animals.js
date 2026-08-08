'use strict';
/* Dibujo procedural de los 12 animales (Canvas puro, sin imágenes).
   Cada animal se dibuja mirando a la derecha; Fighter.draw aplica facing/rotación. */

function aell(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}
function aline(ctx, x1, y1, x2, y2, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Progreso del ataque actual (ext 0..1) para animar el golpe
function attackInfo(f) {
  if (!f.attack) return { attacking: false, ext: 0, type: 'none' };
  const def = f.attacks[f.attack.type];
  const ext = Math.sin(Math.min(1, f.attack.t / (def.startup + def.active)) * Math.PI);
  return { attacking: true, ext: ext, type: f.attack.type };
}

function drawAnimal(f, ctx) {
  const d = f.animalDef();
  if (!d) return;
  const t = f.animT;
  const atk = attackInfo(f);
  const walk = f.state === 'walk';
  const C = d.colors;
  ctx.save();
  ctx.scale(f.facing, 1);
  switch (f.kind) {
    case 'llama': drawLlama(ctx, C, t, atk, walk); break;
    case 'lobo': drawLobo(ctx, C, t, atk, walk); break;
    case 'jabali': drawJabali(ctx, C, t, atk, walk); break;
    case 'mono': drawMono(ctx, C, t, atk, walk); break;
    case 'canguro': drawCanguro(ctx, C, t, atk, walk); break;
    case 'tigre': drawTigre(ctx, C, t, atk, walk); break;
    case 'oso': drawOso(ctx, C, t, atk, walk); break;
    case 'cocodrilo': drawCocodrilo(ctx, C, t, atk, walk); break;
    case 'serpiente': drawSerpiente(ctx, C, t, atk, walk); break;
    case 'aguila': drawAguila(ctx, C, t, atk, walk); break;
    case 'rinoceronte': drawRinoceronte(ctx, C, t, atk, walk); break;
    case 'leon': drawLeon(ctx, C, t, atk, walk); break;
    default: aell(ctx, 0, -40, 26, 18, C.body);
  }
  ctx.restore();
}

/* ================= 1. LLAMA (siempre el primer animal) ================= */
function drawLlama(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 11) * 6 : 0;
  const ext = atk.ext;
  // patas
  aline(ctx, -16, -50 + sw, -18, 0, 12, dc);
  aline(ctx, -2, -50 - sw, 0, 0, 12, dc);
  aline(ctx, 12, -50 + sw, 14, 0, 12, dc);
  aline(ctx, 22, -50 - sw, 24, 0, 12, dc);
  // cuerpo lanudo
  aell(ctx, 0, -64 - sw * 0.3, 30, 22, c);
  aell(ctx, -14, -70 - sw * 0.3, 12, 8, ac);
  aell(ctx, 10, -72 - sw * 0.3, 10, 7, ac);
  // cuello largo
  aline(ctx, -4, -82, 12 + ext * 6, -136, 16, c);
  // cabeza
  aell(ctx, 14 + ext * 6, -144, 13, 9, c);
  // orejas
  aline(ctx, 8, -150, 4, -162, 4, dc);
  aline(ctx, 18, -150, 20, -162, 4, dc);
  // hocico
  aell(ctx, 26 + ext * 6, -142, 7, 5, ac);
  // cola
  aell(ctx, -30, -68, 6, 5, c);
}

/* ================= 2. LOBO ================= */
function drawLobo(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 11) * 7 : 0;
  const ext = atk.ext;
  // patas
  aline(ctx, 10, -30 + sw, 12, 0, 10, dc);
  aline(ctx, -16, -30 - sw, -14, 0, 10, dc);
  aline(ctx, 2, -30 - sw, 4, 0, 10, dc);
  aline(ctx, -8, -30 + sw, -6, 0, 10, dc);
  // cuerpo
  aell(ctx, -2, -58, 36, 20, c);
  // pecho
  aell(ctx, 24, -66, 18, 16, c);
  // cabeza
  aell(ctx, 38 + ext * 8, -90, 14, 11, c);
  // hocico
  aell(ctx, 50 + ext * 8, -84, 9, 6, dc);
  // orejas
  aline(ctx, 32, -98, 28, -112, 5, dc);
  aline(ctx, 42, -98, 46, -112, 5, dc);
  // ojo
  aell(ctx, 42 + ext * 8, -93, 2.5, 2.5, '#fff');
  // cola
  aline(ctx, -36, -62, -46, -76, 8, dc);
  // mancha cuello
  aell(ctx, 30, -74, 8, 8, ac);
}

/* ================= 3. JABALÍ ================= */
function drawJabali(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 11) * 6 : 0;
  const ext = atk.ext;
  // patas cortas
  aline(ctx, 10, -22 + sw, 12, 0, 11, dc);
  aline(ctx, -14, -22 - sw, -12, 0, 11, dc);
  aline(ctx, -2, -22 - sw, 0, 0, 11, dc);
  aline(ctx, 22, -22 + sw, 24, 0, 11, dc);
  // cuerpo robusto
  aell(ctx, 0, -46, 34, 22, c);
  // cabeza baja
  aell(ctx, 32 + ext * 6, -44, 14, 11, c);
  // hocico
  aell(ctx, 44 + ext * 6, -40, 8, 7, ac);
  // colmillos
  aline(ctx, 48 + ext * 6, -38, 50 + ext * 6, -30, 3, '#f5f0e6');
  aline(ctx, 46 + ext * 6, -36, 47 + ext * 6, -29, 3, '#f5f0e6');
  // orejas
  aline(ctx, 26, -52, 24, -60, 4, dc);
  // crin
  aline(ctx, -10, -64, 6, -68, 4, dc);
  // ojo
  aell(ctx, 36 + ext * 6, -47, 2.5, 2.5, '#fff');
}

/* ================= 4. MONO ================= */
function drawMono(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 11) * 8 : 0;
  const ext = atk.ext;
  // brazos largos (nudillos)
  aline(ctx, 10, -44, 16 + sw, 0, 9, dc);
  aline(ctx, -6, -44, -12 - sw, 0, 9, dc);
  // cuerpo
  aell(ctx, 0, -56, 17, 20, c);
  // vientre claro
  aell(ctx, 2, -48, 10, 14, ac);
  // cabeza
  aell(ctx, 6, -82, 12, 11, c);
  // cara
  aell(ctx, 12, -80, 8, 8, '#e8b07a');
  // orejas
  aell(ctx, -2, -84, 4, 5, c);
  aell(ctx, 14, -86, 4, 5, c);
  // cola enroscada
  ctx.strokeStyle = dc; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, -56);
  ctx.quadraticCurveTo(-34, -60, -26, -84);
  ctx.quadraticCurveTo(-22, -96, -12, -90);
  ctx.stroke();
  // piernas cortas
  aline(ctx, -2, -40 + sw, 0, 0, 8, dc);
  aline(ctx, 8, -40 - sw, 10, 0, 8, dc);
  // ojo
  aell(ctx, 14, -82, 2, 2, '#fff');
}

/* ================= 5. CANGURO ================= */
function drawCanguro(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 11) * 5 : 0;
  const ext = atk.ext;
  // cola gruesa
  aline(ctx, -18, -50, -42 - ext * 4, -34, 12, dc);
  // cuerpo
  aell(ctx, 0, -84, 22, 30, c);
  // vientre
  aell(ctx, 6, -74, 12, 20, ac);
  // cabeza
  aell(ctx, 8, -126, 12, 11, c);
  // hocico
  aell(ctx, 18, -122, 7, 6, ac);
  // orejas
  aline(ctx, 4, -134, 2, -150, 4, dc);
  aline(ctx, 12, -134, 14, -150, 4, dc);
  // ojo
  aell(ctx, 12, -129, 2.5, 2.5, '#fff');
  // patas traseras grandes (patada)
  if (atk.type === 'kick') {
    aell(ctx, 10 + ext * 30, -36, 14, 26, dc);
  } else {
    aell(ctx, 4, -36 + sw * 0.5, 14, 26, dc);
    aell(ctx, -8, -36 - sw * 0.5, 12, 24, dc);
  }
  // bracitos
  aline(ctx, -2, -92, 14 + ext * 12, -78, 7, dc);
  aline(ctx, -8, -90, 2, -74, 7, dc);
}


/* ================= 6. TIGRE ================= */
function drawTigre(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 11) * 8 : 0;
  const ext = atk.ext;
  // patas
  aline(ctx, 12, -32 + sw, 14, 0, 11, dc);
  aline(ctx, -16, -32 - sw, -14, 0, 11, dc);
  aline(ctx, 2, -32 - sw, 4, 0, 11, dc);
  aline(ctx, -8, -32 + sw, -6, 0, 11, dc);
  // cuerpo
  aell(ctx, -2, -64, 38, 22, c);
  // rayas
  aline(ctx, -20, -82, -22, -60, 4, ac);
  aline(ctx, -8, -84, -10, -62, 4, ac);
  aline(ctx, 4, -84, 2, -62, 4, ac);
  aline(ctx, 16, -82, 14, -62, 4, ac);
  // cabeza
  aell(ctx, 36 + ext * 8, -92, 15, 13, c);
  // orejas
  aline(ctx, 28, -102, 26, -114, 5, dc);
  aline(ctx, 42, -102, 46, -114, 5, dc);
  // hocico
  aell(ctx, 48 + ext * 8, -86, 8, 6, ac);
  // cola
  aline(ctx, -40, -66, -52, -46, 7, dc);
  aell(ctx, -52, -44, 5, 5, ac);
  // ojo
  aell(ctx, 40 + ext * 8, -95, 3, 2.5, '#fff');
}

/* ================= 7. OSO ================= */
function drawOso(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 10) * 6 : 0;
  const ext = atk.ext;
  // patas gruesas
  aline(ctx, 12, -34 + sw, 14, 0, 14, dc);
  aline(ctx, -16, -34 - sw, -14, 0, 14, dc);
  aline(ctx, -4, -34 - sw, -2, 0, 14, dc);
  aline(ctx, 22, -34 + sw, 24, 0, 14, dc);
  // cuerpo grande
  aell(ctx, 0, -72, 42, 32, c);
  // pecho
  aell(ctx, 22, -78, 16, 18, ac);
  // brazos (puño extiende)
  if (atk.type === 'punch') {
    aline(ctx, 8, -80, 30 + ext * 26, -70, 13, dc);
    aell(ctx, 34 + ext * 26, -68, 8, 7, dc);
  } else {
    aline(ctx, 8, -80, 30, -70, 13, dc);
  }
  // cabeza
  aell(ctx, 26, -106, 16, 14, c);
  // hocico
  aell(ctx, 38, -100, 8, 7, ac);
  // orejas pequeñas
  aell(ctx, 18, -116, 5, 6, c);
  aell(ctx, 32, -118, 5, 6, c);
  // ojo
  aell(ctx, 30, -110, 3, 3, '#fff');
}

/* ================= 8. COCODRILO ================= */
function drawCocodrilo(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 11) * 6 : 0;
  const ext = atk.ext;
  // cola
  aline(ctx, -34, -40, -60 - ext * 4, -28, 12, dc);
  // cuerpo largo
  aell(ctx, -6, -44, 42, 16, c);
  // lomo
  for (let i = 0; i < 5; i++) {
    aline(ctx, -24 + i * 10, -52, -22 + i * 10, -58, 3, dc);
  }
  // patas cortas
  aline(ctx, 2, -30 + sw, 4, 0, 9, dc);
  aline(ctx, -16, -30 - sw, -14, 0, 9, dc);
  // cabeza + hocico largo
  aell(ctx, 26 + ext * 6, -48, 10, 9, c);
  aline(ctx, 34 + ext * 6, -46, 58 + ext * 6, -40, 10, c);
  // dientes
  for (let i = 0; i < 4; i++) {
    aline(ctx, 38 + i * 5 + ext * 6, -42, 39 + i * 5 + ext * 6, -38, 2, '#fff');
  }
  // ojo
  aell(ctx, 28 + ext * 6, -52, 3, 3, '#fff');
  // manchas
  aell(ctx, -14, -48, 6, 5, ac);
  aell(ctx, 6, -46, 6, 5, ac);
}

/* ================= 9. SERPIENTE ================= */
function drawSerpiente(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const w = walk ? Math.sin(t * 14) : 0;
  const ext = atk.ext;
  // cuerpo en S
  ctx.strokeStyle = c; ctx.lineWidth = 16; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-40, -22);
  ctx.quadraticCurveTo(-24, -46 + w * 6, -6, -30);
  ctx.quadraticCurveTo(14, -14, 26, -34);
  ctx.stroke();
  // cabeza
  aell(ctx, 32 + ext * 8, -36, 11, 9, c);
  // lengua
  if (atk.attacking) aline(ctx, 42 + ext * 8, -38, 50 + ext * 8, -36, 2, '#ef4444');
  // ojos
  aell(ctx, 34 + ext * 8, -40, 2.5, 2.5, '#fff');
  // manchas
  aell(ctx, -24, -32, 5, 4, ac);
  aell(ctx, 6, -28, 5, 4, ac);
}


/* ================= 10. ÁGUILA (vuela) ================= */
function drawAguila(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const flap = Math.sin(t * 6) * 0.5;   // batido de alas
  const dip = Math.sin(t * 2.2) * 6;    // vaivén vertical
  const ext = atk.ext;
  // cuerpo
  aell(ctx, 0, -40 + dip, 15, 22, c);
  // pecho claro
  aell(ctx, 6, -44 + dip, 9, 16, ac);
  // ala trasera
  ctx.fillStyle = dc;
  ctx.beginPath();
  ctx.moveTo(-6, -48 + dip);
  ctx.lineTo(-66, -56 - flap * 30 + dip);
  ctx.lineTo(-66, -36 + flap * 26 + dip);
  ctx.lineTo(-4, -34 + dip);
  ctx.closePath();
  ctx.fill();
  // ala delantera
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.moveTo(2, -48 + dip);
  ctx.lineTo(60, -60 - flap * 30 + dip);
  ctx.lineTo(60, -40 + flap * 26 + dip);
  ctx.lineTo(4, -34 + dip);
  ctx.closePath();
  ctx.fill();
  // cabeza
  aell(ctx, 4, -72 + dip, 8, 8, c);
  // pico
  aell(ctx, 12 + ext * 6, -70 + dip, 6, 4, '#e8b23a');
  // ojo
  aell(ctx, 6, -74 + dip, 2, 2, '#fff');
  // cola
  aline(ctx, -14, -26 + dip, -30, -10, 8, dc);
  // garras (patada)
  if (atk.type === 'kick') aline(ctx, 6, -20 + dip, 12, -4 + dip + ext * 8, 4, dc);
}

/* ================= 11. RINOCERONTE ================= */
function drawRinoceronte(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 10) * 5 : 0;
  const ext = atk.ext;
  // patas muy gruesas
  aline(ctx, 12, -26 + sw, 14, 0, 16, dc);
  aline(ctx, -16, -26 - sw, -14, 0, 16, dc);
  aline(ctx, -2, -26 - sw, 0, 0, 16, dc);
  aline(ctx, 24, -26 + sw, 26, 0, 16, dc);
  // cuerpo masivo
  aell(ctx, 0, -62, 44, 30, c);
  // pliegue
  aline(ctx, -6, -88, -6, -40, 3, dc);
  // cabeza baja
  aell(ctx, 34 + ext * 8, -66, 17, 13, c);
  // cuerno
  ctx.fillStyle = '#e8e6df';
  ctx.beginPath();
  ctx.moveTo(44 + ext * 8, -78);
  ctx.lineTo(52 + ext * 8, -64);
  ctx.lineTo(44 + ext * 8, -60);
  ctx.closePath();
  ctx.fill();
  // oreja
  aell(ctx, 26, -76, 5, 6, dc);
  // ojo
  aell(ctx, 38 + ext * 8, -70, 3, 3, '#fff');
  // cola
  aline(ctx, -44, -56, -52, -40, 5, dc);
}

/* ================= 12. LEÓN (jefe final) ================= */
function drawLeon(ctx, C, t, atk, walk) {
  const c = C.body, dc = C.dark, ac = C.accent;
  const sw = walk ? Math.sin(t * 11) * 8 : 0;
  const ext = atk.ext;
  // patas
  aline(ctx, 12, -34 + sw, 14, 0, 11, dc);
  aline(ctx, -16, -34 - sw, -14, 0, 11, dc);
  aline(ctx, 2, -34 - sw, 4, 0, 11, dc);
  aline(ctx, -8, -34 + sw, -6, 0, 11, dc);
  // cuerpo
  aell(ctx, -2, -66, 38, 22, c);
  // melena
  aell(ctx, 30 + ext * 6, -98, 22, 20, ac);
  aell(ctx, 20 + ext * 6, -112, 10, 8, ac);
  aell(ctx, 38 + ext * 6, -112, 10, 8, ac);
  // cabeza
  aell(ctx, 30 + ext * 6, -98, 14, 13, c);
  // hocico
  aell(ctx, 42 + ext * 6, -92, 8, 6, '#e8dcc0');
  // orejas
  aell(ctx, 22 + ext * 6, -108, 5, 6, dc);
  // ojo
  aell(ctx, 34 + ext * 6, -101, 3, 3, '#fff');
  // cola con borla
  aline(ctx, -40, -68, -52, -50, 7, dc);
  aell(ctx, -54, -48, 6, 5, dc);
  // mancha pecho
  aell(ctx, 10, -76, 8, 8, ac);
}


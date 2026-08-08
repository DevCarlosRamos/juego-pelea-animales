'use strict';
/* Entrada: teclado + controles táctiles */
(function () {
  const state = {
    left: false, right: false, jump: false,
    punch: false, kick: false, block: false
  };

  function bindKey(code, key, onDown, onUp) {
    window.addEventListener('keydown', function (e) {
      if (e.code === code) { e.preventDefault(); if (!state[key]) { state[key] = true; if (onDown) onDown(); } }
    });
    window.addEventListener('keyup', function (e) {
      if (e.code === code) { e.preventDefault(); state[key] = false; if (onUp) onUp(); }
    });
  }

  // Combos: A/D mover, W saltar, S bloquear, J puño, K patada
  bindKey('KeyA', 'left'); bindKey('ArrowLeft', 'left');
  bindKey('KeyD', 'right'); bindKey('ArrowRight', 'right');
  bindKey('KeyW', 'jump', function () { if (window.INPUT && window.INPUT.onJumpPress) window.INPUT.onJumpPress(); });
  bindKey('ArrowUp', 'jump', function () { if (window.INPUT && window.INPUT.onJumpPress) window.INPUT.onJumpPress(); });
  bindKey('KeyS', 'block');
  bindKey('ArrowDown', 'block');
  bindKey('KeyJ', 'punch', function () { if (window.INPUT && window.INPUT.onPunchPress) window.INPUT.onPunchPress(); });
  bindKey('KeyK', 'kick', function () { if (window.INPUT && window.INPUT.onKickPress) window.INPUT.onKickPress(); });

  // Botones táctiles
  function bindBtn(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    const press = (e) => {
      e.preventDefault();
      SFX.unlock();
      state[key] = true;
      el.classList.add('pressed');
      if (key === 'jump' && window.INPUT && window.INPUT.onJumpPress) window.INPUT.onJumpPress();
      if (key === 'punch' && window.INPUT && window.INPUT.onPunchPress) window.INPUT.onPunchPress();
      if (key === 'kick' && window.INPUT && window.INPUT.onKickPress) window.INPUT.onKickPress();
    };
    const release = (e) => {
      e.preventDefault();
      state[key] = false;
      el.classList.remove('pressed');
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  window.INPUT = {
    state: state,
    init: function () {
      bindBtn('btnLeft', 'left');
      bindBtn('btnRight', 'right');
      bindBtn('btnJump', 'jump');
      bindBtn('btnBlock', 'block');
      bindBtn('btnPunch', 'punch');
      bindBtn('btnKick', 'kick');
    }
  };
})();

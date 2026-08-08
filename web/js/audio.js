'use strict';
/* Sonido procedural con WebAudio (sin archivos externos) */
(function () {
  let ctx = null;
  let master = null;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }

  function blip(freq, dur, type, vol, slideTo) {
    ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    ensure();
    if (!ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(master);
    src.start(t);
  }

  window.SFX = {
    unlock: function () { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    punchHit: function () { noise(0.12, 0.7, 900); blip(160, 0.1, 'square', 0.3, 60); },
    kickHit:  function () { noise(0.18, 0.8, 700); blip(110, 0.16, 'sawtooth', 0.35, 50); },
    whoosh:   function () { noise(0.12, 0.25, 2400); },
    jump:     function () { blip(220, 0.18, 'sine', 0.3, 480); },
    block:    function () { noise(0.06, 0.5, 3000); blip(520, 0.08, 'square', 0.2, 380); },
    hitPlayer:function () { blip(200, 0.2, 'sawtooth', 0.4, 80); },
    spawn:    function () { blip(330, 0.12, 'triangle', 0.3, 880); },
    ko: function () {
      blip(392, 0.18, 'square', 0.35); setTimeout(() => blip(494, 0.18, 'square', 0.35), 170);
      setTimeout(() => blip(587, 0.4, 'square', 0.4), 340);
      setTimeout(() => noise(0.5, 0.5, 600), 300);
    },
    roundStart: function () { blip(440, 0.12, 'triangle', 0.4); setTimeout(() => blip(660, 0.2, 'triangle', 0.4), 140); },
    win: function () {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.4), i * 150));
    },
    lose: function () {
      [660, 440, 330, 220].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sawtooth', 0.3), i * 180));
    }
  };
})();

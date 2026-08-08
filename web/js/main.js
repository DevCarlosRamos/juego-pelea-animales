'use strict';
/* Arranque y flujo de pantallas */
(function () {
  const canvas = document.getElementById('gameCanvas');
  const game = new Game(canvas);
  INPUT.init();
  let saved = false;

  function hideAllScreens() {
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  }
  function showScreen(id) {
    hideAllScreens();
    document.getElementById(id).classList.remove('hidden');
  }
  function showHud(on) {
    document.getElementById('hud').classList.toggle('hidden', !on);
    document.getElementById('touchControls').classList.toggle('hidden', !on);
  }

  function setBar(id, hp, max, txtId) {
    const el = document.getElementById(id);
    const pct = Math.max(0, (hp / max) * 100);
    el.style.width = pct + '%';
    el.classList.toggle('low', pct <= 25);
    document.getElementById(txtId).textContent = Math.ceil(hp);
  }

  game.onMatchEnd = function (won, score, player) {
    saved = false;
    showHud(false);
    document.getElementById('resultTitle').textContent = won ? '¡VICTORIA!' : 'DERROTA';
    document.getElementById('resultTitle').style.color = won ? '#4ade80' : '#f87171';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('resultDetail').innerHTML =
      'Daño: <b>' + Math.round(player.damageDealt * CFG.DAMAGE_FACTOR) + '</b> · ' +
      'Animales vencidos: <b>' + game.wave + '</b> · ' +
      'Bonus victoria: <b>' + (won ? CFG.WIN_BONUS : 0) + '</b>';
    document.getElementById('playerName').value = localStorage.getItem('pelea_animales_name') || '';
    showScreen('gameOverScreen');
  };

  function hudLoop() {
    if (game.phase === 'fight' || game.phase === 'intro' || game.phase === 'ko') {
      setBar('barP', game.player.hp, game.player.maxHp, 'hpTextP');
      const a = game.animal;
      if (a) {
        setBar('barE', a.hp, a.maxHp, 'hpTextE');
        document.getElementById('hudNameE').textContent = a.name;
      } else {
        document.getElementById('barE').style.width = '0%';
        document.getElementById('hpTextE').textContent = '';
      }
      document.getElementById('roundInfo').textContent =
        'ANIMAL ' + Math.min(game.wave + 1, game.order.length) + '/' + game.order.length +
        (game.queued ? '  ·  llega ' + game.queued.name : '');
    }
    requestAnimationFrame(hudLoop);
  }

  function startGame() {
    SFX.unlock();
    showHud(true);
    game.start();
    hideAllScreens();
  }

  async function renderScores() {
    const tbody = document.getElementById('scoresBody');
    tbody.innerHTML = '<tr><td colspan="3">Cargando…</td></tr>';
    try {
      const data = await API.getScores(10);
      const rows = (data.scores || []);
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3">Sin puntuaciones todavía. ¡Sé el primero!</td></tr>';
        return;
      }
      tbody.innerHTML = rows.map((r, i) =>
        '<tr><td>' + (i + 1) + '</td><td>' + escapeHtml(r.player_name) + '</td><td>' + r.score + '</td></tr>'
      ).join('');
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="3">Error al cargar: ' + escapeHtml(err.message) + '</td></tr>';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function saveScore() {
    if (saved) return;
    saved = true;
    const btn = document.getElementById('btnSaveScore');
    btn.textContent = 'GUARDANDO…';
    let name = document.getElementById('playerName').value.trim() || 'Anónimo';
    name = name.slice(0, 20);
    localStorage.setItem('pelea_animales_name', name);
    try {
      await API.postScore(name, game.score);
    } catch (err) {
      console.warn('No se pudo guardar la puntuación:', err);
    }
    btn.textContent = 'GUARDAR';
    await renderScores();
    showScreen('leaderboardScreen');
  }

  document.getElementById('btnPlay').addEventListener('click', startGame);
  document.getElementById('btnPlayAgain').addEventListener('click', startGame);
  document.getElementById('btnBackMenu').addEventListener('click', function () {
    game.stop();
    showHud(false);
    showScreen('menuScreen');
  });
  document.getElementById('btnScores').addEventListener('click', async function () {
    showScreen('leaderboardScreen');
    await renderScores();
  });
  document.getElementById('btnScoresBack').addEventListener('click', function () {
    showScreen('menuScreen');
  });
  document.getElementById('btnSaveScore').addEventListener('click', saveScore);
  document.getElementById('playerName').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveScore();
  });

  window.INPUT.onJumpPress = function () { if (game.phase === 'fight') game.player.doJump(); };
  window.INPUT.onPunchPress = function () { if (game.phase === 'fight') game.player.startAttack('punch'); };
  window.INPUT.onKickPress = function () { if (game.phase === 'fight') game.player.startAttack('kick'); };

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) game.paused = true;
    else game.paused = false;
  });

  function resize() {
    game.resize();
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 200); });

  resize();
  hudLoop();
  showScreen('menuScreen');
})();

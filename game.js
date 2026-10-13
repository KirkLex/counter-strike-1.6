/* ==========================================================
   Counter-Strike 1.6 — Web Edition (HD)
   game.js  —  текстурированный raycasting-движок
   ========================================================== */
'use strict';

(function () {

  /* ==========================================================
     1. DOM
     ========================================================== */
  const canvas = document.getElementById('game');
  const ctx    = canvas.getContext('2d');

  const buf  = document.createElement('canvas');
  const bctx = buf.getContext('2d');

  const ui = {
    hud:          document.getElementById('hud'),
    crosshair:    document.getElementById('crosshair'),
    hitmarker:    document.getElementById('hitmarker'),
    damageFlash:  document.getElementById('damage-flash'),
    killfeed:     document.getElementById('killfeed'),
    waveBanner:   document.getElementById('wave-banner'),

    hudWave:      document.getElementById('hud-wave'),
    hudEnemies:   document.getElementById('hud-enemies'),
    hudScore:     document.getElementById('hud-score'),
    hudTime:      document.getElementById('hud-time'),
    hudHealth:    document.getElementById('hud-health'),
    hudArmor:     document.getElementById('hud-armor'),
    hudAmmo:      document.getElementById('hud-ammo'),
    hudReserve:   document.getElementById('hud-reserve'),
    hudWeapon:    document.getElementById('hud-weapon'),

    menu:         document.getElementById('menu'),
    bestLine:     document.getElementById('best-line'),

    records:      document.getElementById('records'),
    recordsList:  document.getElementById('records-list'),

    pause:        document.getElementById('pause'),

    gameover:     document.getElementById('gameover'),
    resScore:     document.getElementById('res-score'),
    resKills:     document.getElementById('res-kills'),
    resWave:      document.getElementById('res-wave'),
    resTime:      document.getElementById('res-time'),
    resBest:      document.getElementById('res-best')
  };

  /* ==========================================================
     2. ПРОЦЕДУРНЫЕ ТЕКСТУРЫ
     ========================================================== */
  const TEX_SIZE = 64;

  function newTex() {
    const c = document.createElement('canvas');
    c.width = c.height = TEX_SIZE;
    return c;
  }

  function addNoise(g, amount) {
    const img = g.getImageData(0, 0, TEX_SIZE, TEX_SIZE);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * amount;
      d[i]   = Math.max(0, Math.min(255, d[i]   + n));
      d[i+1] = Math.max(0, Math.min(255, d[i+1] + n));
      d[i+2] = Math.max(0, Math.min(255, d[i+2] + n));
    }
    g.putImageData(img, 0, 0);
  }

  /* ---------- Бетонная стена ---------- */
  function texConcrete() {
    const c = newTex();
    const g = c.getContext('2d');
    g.fillStyle = '#807a6c';
    g.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // крупные пятна
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * TEX_SIZE;
      const y = Math.random() * TEX_SIZE;
      const r = 4 + Math.random() * 14;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const dark = Math.random() > 0.5;
      grad.addColorStop(0, dark ? 'rgba(50,46,38,0.4)' : 'rgba(180,175,160,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // трещины
    g.strokeStyle = 'rgba(30,26,20,0.55)';
    g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      let x = Math.random() * TEX_SIZE;
      let y = Math.random() * TEX_SIZE;
      g.moveTo(x, y);
      for (let j = 0; j < 7; j++) {
        x += (Math.random() - 0.5) * 14;
        y += (Math.random() - 0.5) * 14;
        g.lineTo(x, y);
      }
      g.stroke();
    }

    addNoise(g, 40);
    return c;
  }

  /* ---------- Кирпичная стена ---------- */
  function texBrick() {
    const c = newTex();
    const g = c.getContext('2d');
    // раствор
    g.fillStyle = '#5b5148';
    g.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    const bw = 24, bh = 12;
    for (let row = 0; row < TEX_SIZE / bh; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = -1; col <= TEX_SIZE / bw; col++) {
        const x = col * bw + off + 1;
        const y = row * bh + 1;
        const w = bw - 2, h = bh - 2;

        const rr = 125 + Math.random() * 40;
        const gg = 58  + Math.random() * 25;
        const bb = 42  + Math.random() * 18;
        g.fillStyle = 'rgb(' + (rr|0) + ',' + (gg|0) + ',' + (bb|0) + ')';
        g.fillRect(x, y, w, h);

        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(x, y, w, 1);
        g.fillRect(x, y, 1, h);

        g.fillStyle = 'rgba(0,0,0,0.28)';
        g.fillRect(x, y + h - 1, w, 1);
        g.fillRect(x + w - 1, y, 1, h);
      }
    }
    addNoise(g, 25);
    return c;
  }

  /* ---------- Металлическая стена ---------- */
  function texMetal() {
    const c = newTex();
    const g = c.getContext('2d');
    g.fillStyle = '#3a3f45';
    g.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // панели
    for (let i = 0; i < 4; i++) {
      const x = i * 16;
      g.fillStyle = i % 2 === 0 ? '#454a52' : '#33383e';
      g.fillRect(x, 0, 15, TEX_SIZE);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(x + 15, 0, 1, TEX_SIZE);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      g.fillRect(x, 0, 1, TEX_SIZE);
    }

    // заклёпки
    for (let y = 8; y < TEX_SIZE; y += 16) {
      for (let x = 4; x < TEX_SIZE; x += 16) {
        g.fillStyle = '#1f2328';
        g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.beginPath(); g.arc(x - 0.4, y - 0.4, 0.9, 0, Math.PI * 2); g.fill();
      }
    }

    // ржавчина
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * TEX_SIZE;
      const y = Math.random() * TEX_SIZE;
      const r = 3 + Math.random() * 9;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(130, 65, 20, 0.55)');
      grad.addColorStop(1, 'rgba(130, 65, 20, 0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    addNoise(g, 22);
    return c;
  }

  /* ---------- Пол (бетонные плиты) ---------- */
  function texFloor() {
    const c = newTex();
    const g = c.getContext('2d');
    g.fillStyle = '#3c3831';
    g.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    const tile = 16;
    for (let y = 0; y < TEX_SIZE; y += tile) {
      for (let x = 0; x < TEX_SIZE; x += tile) {
        const v = (Math.random() - 0.5) * 16;
        g.fillStyle = 'rgb(' + ((58+v)|0) + ',' + ((54+v)|0) + ',' + ((47+v)|0) + ')';
        g.fillRect(x + 1, y + 1, tile - 2, tile - 2);

        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.lineWidth = 1;
        g.strokeRect(x + 0.5, y + 0.5, tile - 1, tile - 1);
      }
    }

    // пятна
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * TEX_SIZE;
      const y = Math.random() * TEX_SIZE;
      const r = 3 + Math.random() * 8;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(20,18,15,0.45)');
      grad.addColorStop(1, 'rgba(20,18,15,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    addNoise(g, 28);
    return c;
  }

  /* ---------- Потолок (тёмные панели) ---------- */
  function texCeiling() {
    const c = newTex();
    const g = c.getContext('2d');
    g.fillStyle = '#1c2026';
    g.fillRect(0, 0, TEX_SIZE, TEX_SIZE);

    // панели
    for (let i = 0; i <= TEX_SIZE; i += 32) {
      g.fillStyle = 'rgba(0,0,0,0.7)';
      g.fillRect(i, 0, 2, TEX_SIZE);
      g.fillRect(0, i, TEX_SIZE, 2);
    }
    // блики
    for (let i = 2; i <= TEX_SIZE; i += 32) {
      g.fillStyle = 'rgba(255,255,255,0.04)';
      g.fillRect(i, 0, 1, TEX_SIZE);
      g.fillRect(0, i, TEX_SIZE, 1);
    }
    // лампы
    for (let y = 16; y < TEX_SIZE; y += 32) {
      for (let x = 16; x < TEX_SIZE; x += 32) {
        const grad = g.createRadialGradient(x, y, 0, x, y, 8);
        grad.addColorStop(0, 'rgba(255, 240, 190, 0.55)');
        grad.addColorStop(1, 'rgba(255, 240, 190, 0)');
        g.fillStyle = grad;
        g.fillRect(x - 8, y - 8, 16, 16);
      }
    }

    addNoise(g, 18);
    return c;
  }

  // ---------- Загрузка текстур ----------
  const wallTexs   = [texConcrete(), texBrick(), texMetal()];
  const floorTex   = texFloor();
  const ceilTex    = texCeiling();

  const wallTexData  = wallTexs.map(c => c.getContext('2d').getImageData(0, 0, TEX_SIZE, TEX_SIZE).data);
  const floorTexData = floorTex.getContext('2d').getImageData(0, 0, TEX_SIZE, TEX_SIZE).data;
  const ceilTexData  = ceilTex.getContext('2d').getImageData(0, 0, TEX_SIZE, TEX_SIZE).data;

  /* ==========================================================
     3. КАРТА
     ========================================================== */
  const MAP_STR = [
    "111111111111111111111111",
    "1......................1",
    "1..1111....1111....11..1",
    "1..1..........1....1...1",
    "1..1..1111....1....1...1",
    "1.....1.......1....1...1",
    "1.....1..111111....1...1",
    "1........1.........1...1",
    "1..1111..1....111111...1",
    "1.....1..1.............1",
    "1.....1..1....11111....1",
    "1.....1.......1........1",
    "1.....1111111.1........1",
    "1.............1........1",
    "1...11111.....1...1111.1",
    "1.......1.........1....1",
    "1.......1.........1....1",
    "1...11111....111..1....1",
    "1............1....1....1",
    "1............1....1....1",
    "1...1111111111....1....1",
    "1......................1",
    "1......................1",
    "111111111111111111111111"
  ];
  const MAP_W = 24;
  const MAP_H = 24;
  const map = new Uint8Array(MAP_W * MAP_H);
  for (let y = 0; y < MAP_H; y++) {
    const row = MAP_STR[y];
    for (let x = 0; x < MAP_W; x++) {
      map[y * MAP_W + x] = (row.charCodeAt(x) === 49) ? 1 : 0;
    }
  }

  function isWall(x, y) {
    const mx = x | 0, my = y | 0;
    if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return true;
    return map[my * MAP_W + mx] === 1;
  }

  function canStand(x, y, r) {
    return !isWall(x - r, y - r) && !isWall(x + r, y - r) &&
           !isWall(x - r, y + r) && !isWall(x + r, y + r);
  }

  function hasLineOfSight(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 0.12);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (isWall(x0 + dx * t, y0 + dy * t)) return false;
    }
    return true;
  }

  /* ==========================================================
     4. РАЗМЕРЫ / БУФЕРЫ
     ========================================================== */
  let W = 0, H = 0;
  let bufW = 0, bufH = 0;
  let zBuffer = null;
  let frameImg = null, frameData = null;
  let clearPattern = null;

  const FOV = 0.82; // ~ 79°

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;

    canvas.width  = W;
    canvas.height = H;

    // Ограничиваем разрешение рендера для производительности
    bufW = Math.max(220, Math.min(520, Math.floor(W / 2.8)));
    bufH = Math.max(140, Math.floor(bufW * (H / W)));

    buf.width  = bufW;
    buf.height = bufH;

    bctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled  = false;

    zBuffer = new Float32Array(bufW);

    // ImageData-буфер
    frameImg  = bctx.createImageData(bufW, bufH);
    frameData = frameImg.data;

    // Цвет «дальнего тумана» — заполняем один раз для быстрой очистки
    clearPattern = new Uint8Array(bufW * bufH * 4);
    for (let i = 0; i < clearPattern.length; i += 4) {
      clearPattern[i]     = 8;
      clearPattern[i + 1] = 9;
      clearPattern[i + 2] = 12;
      clearPattern[i + 3] = 255;
    }
  }
  window.addEventListener('resize', resize);
  resize();

  /* ==========================================================
     5. СОСТОЯНИЕ
     ========================================================== */
  const state = {
    mode: 'menu',
    wave: 0,
    score: 0,
    kills: 0,
    elapsed: 0,
    shotsFired: 0,
    shotsHit: 0,
    pendingSpawns: 0,
    spawnTimer: 0,
    waveCooldown: 0,
    betweenWaves: false,
    bannerTimer: 0
  };

  const player = {
    x: 2.5, y: 2.5, angle: 0,
    health: 100, armor: 0, maxHealth: 100,
    radius: 0.26, bob: 0, bobAmount: 0
  };

  /* ---------- Оружие ---------- */
  const WEAPONS = [
    {
      id: 'usp', name: 'USP',
      damage: 26, fireRate: 0.17, magSize: 12, reloadTime: 1.5,
      spread: 0.014, moveSpread: 2.2, range: 22, auto: false,
      recoil: 5, reserveStart: 60
    },
    {
      id: 'ak47', name: 'AK-47',
      damage: 33, fireRate: 0.098, magSize: 30, reloadTime: 2.3,
      spread: 0.024, moveSpread: 2.8, range: 28, auto: true,
      recoil: 9, reserveStart: 90
    }
  ];

  let currentWeapon = 0;
  const ammo = WEAPONS.map(w => ({ mag: w.magSize, reserve: w.reserveStart }));

  let fireCooldown = 0;
  let reloading = false;
  let reloadTimer = 0;
  let recoilKick = 0;
  let muzzleFlash = 0;
  let mouseDown = false;

  const enemies = [];

  /* ==========================================================
     6. СПРАЙТЫ ВРАГОВ
     ========================================================== */
  function makeEnemySprite(hitFlash) {
    const S = 64;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');

    // --- тень под ногами ---
    const shadow = g.createRadialGradient(S/2, S-4, 2, S/2, S-4, 20);
    shadow.addColorStop(0, 'rgba(0,0,0,0.55)');
    shadow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = shadow;
    g.fillRect(0, S - 20, S, 20);

    // --- НОГИ ---
    // левая
    g.fillStyle = '#2b3038';
    g.fillRect(20, 40, 9, 20);
    g.fillStyle = '#363b44';
    g.fillRect(20, 40, 3, 20);  // блик
    // правая
    g.fillStyle = '#2b3038';
    g.fillRect(35, 40, 9, 20);
    g.fillStyle = '#363b44';
    g.fillRect(35, 40, 3, 20);

    // наколенники
    g.fillStyle = '#15181d';
    g.beginPath(); g.ellipse(24.5, 49, 5, 3.5, 0, 0, Math.PI*2); g.fill();
    g.beginPath(); g.ellipse(39.5, 49, 5, 3.5, 0, 0, Math.PI*2); g.fill();

    // ботинки
    g.fillStyle = '#0f1012';
    g.fillRect(18, 58, 12, 6);
    g.fillRect(34, 58, 12, 6);

    // --- ТОРС / БРОНЕЖИЛЕТ ---
    const vestGrad = g.createLinearGradient(0, 18, 0, 42);
    vestGrad.addColorStop(0, '#4d5b3d');
    vestGrad.addColorStop(1, '#374228');
    g.fillStyle = vestGrad;
    g.fillRect(18, 18, 28, 24);

    // плечевые ремни
    g.fillStyle = '#1f2519';
    g.fillRect(23, 18, 4, 24);
    g.fillRect(37, 18, 4, 24);

    // карманы / подсумки
    g.fillStyle = '#2a331e';
    g.fillRect(21, 30, 7, 8);
    g.fillRect(36, 30, 7, 8);
    // молнии
    g.fillStyle = '#0e120a';
    g.fillRect(21, 33, 7, 1);
    g.fillRect(36, 33, 7, 1);
    // кнопки
    g.fillStyle = '#10150a';
    g.fillRect(24, 30, 1, 2);
    g.fillRect(39, 30, 1, 2);

    // центральная планка
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(31, 18, 2, 24);

    // --- РУКИ ---
    // левая (снизу, держит автомат)
    g.fillStyle = '#b98a63';
    g.fillRect(13, 24, 7, 14);
    g.fillStyle = '#8f6845';
    g.fillRect(13, 24, 7, 4); // рукав
    // правая
    g.fillStyle = '#b98a63';
    g.fillRect(44, 24, 7, 14);
    g.fillStyle = '#8f6845';
    g.fillRect(44, 24, 7, 4);

    // кисти в перчатках
    g.fillStyle = '#25272b';
    g.fillRect(13, 36, 7, 4);
    g.fillRect(44, 36, 7, 4);

    // --- ГОЛОВА ---
    // шея
    g.fillStyle = '#a07a55';
    g.fillRect(29, 14, 6, 5);
    // лицо
    g.fillStyle = '#d9a97d';
    g.beginPath(); g.arc(32, 9, 9, 0, Math.PI*2); g.fill();
    // тень на лице
    g.fillStyle = 'rgba(0,0,0,0.15)';
    g.beginPath(); g.arc(34, 10, 8, 0, Math.PI*2); g.fill();
    g.fillStyle = '#d9a97d';
    g.beginPath(); g.arc(31, 8.5, 7, 0, Math.PI*2); g.fill();

    // --- ШЛЕМ ---
    const helmGrad = g.createLinearGradient(0, 0, 0, 14);
    helmGrad.addColorStop(0, '#3a4630');
    helmGrad.addColorStop(1, '#232b1c');
    g.fillStyle = helmGrad;
    g.beginPath();
    g.arc(32, 8, 10, Math.PI, Math.PI * 2);
    g.fill();
    g.fillRect(22, 6, 20, 5);
    // козырёк
    g.fillStyle = '#1a2014';
    g.fillRect(22, 11, 20, 2);

    // --- ОЧКИ / МАСКА ---
    g.fillStyle = '#0d0f0a';
    g.fillRect(25, 11, 6, 3);
    g.fillRect(33, 11, 6, 3);
    // блик на стекле
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(26, 11, 2, 1);
    g.fillRect(34, 11, 2, 1);

    // --- ОРУЖИЕ (автомат) ---
    // ствол
    g.fillStyle = '#15171a';
    g.fillRect(8, 30, 30, 4);
    // цевьё
    g.fillStyle = '#3d2d1c';
    g.fillRect(12, 30, 12, 4);
    // приклад
    g.fillStyle = '#202327';
    g.fillRect(38, 30, 8, 6);
    // магазин
    g.fillStyle = '#0e1013';
    g.fillRect(26, 34, 5, 10);
    // рукоятка
    g.fillStyle = '#1a1c1f';
    g.fillRect(33, 34, 4, 6);
    // мушка
    g.fillStyle = '#464c53';
    g.fillRect(8, 28, 3, 2);

    // --- Попадание (красная вспышка) ---
    if (hitFlash) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(255, 45, 45, 0.7)';
      g.fillRect(0, 0, S, S);
      g.globalCompositeOperation = 'source-over';
    }

    return c;
  }

  const SPRITE_NORMAL = makeEnemySprite(false);
  const SPRITE_HIT    = makeEnemySprite(true);
  const SPRITE_NORMAL_DATA = SPRITE_NORMAL.getContext('2d').getImageData(0, 0, 64, 64).data;
  const SPRITE_HIT_DATA    = SPRITE_HIT.getContext('2d').getImageData(0, 0, 64, 64).data;

  /* ==========================================================
     7. АУДИО
     ========================================================== */
  let audioCtx = null;

  function initAudio() {
    if (audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }

  function noiseBurst(o) {
    if (!audioCtx) return;
    const dur = o.duration || 0.12;
    const vol = o.volume || 0.2;
    const cut = o.cutoff || 1600;
    const dec = o.decay || 3;

    const len = Math.max(1, Math.floor(audioCtx.sampleRate * dur));
    const b = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, dec);

    const src = audioCtx.createBufferSource();
    src.buffer = b;

    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = cut;

    const gain = audioCtx.createGain();
    gain.gain.value = vol;

    src.connect(filt); filt.connect(gain); gain.connect(audioCtx.destination);
    src.start();
  }

  function tone(freq, dur, vol, type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.45), audioCtx.currentTime + dur);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur + 0.02);
  }

  function playSound(name) {
    if (!audioCtx) return;
    switch (name) {
      case 'pistol':   noiseBurst({ duration: 0.11, volume: 0.22, cutoff: 2400, decay: 4 }); break;
      case 'rifle':    noiseBurst({ duration: 0.14, volume: 0.28, cutoff: 1500, decay: 3 }); break;
      case 'enemyShot':noiseBurst({ duration: 0.10, volume: 0.11, cutoff: 900,  decay: 4 }); break;
      case 'hit':      tone(520, 0.05, 0.12, 'square'); break;
      case 'headshot': tone(880, 0.09, 0.16, 'triangle'); break;
      case 'death':    tone(180, 0.28, 0.16, 'sawtooth'); break;
      case 'reload':   tone(260, 0.07, 0.10, 'square'); setTimeout(() => tone(190, 0.09, 0.10, 'square'), 130); break;
      case 'hurt':     tone(140, 0.16, 0.14, 'sawtooth'); break;
      case 'wave':     tone(330, 0.16, 0.13, 'triangle'); setTimeout(() => tone(494, 0.22, 0.13, 'triangle'), 150); break;
      case 'empty':    tone(1100, 0.04, 0.07, 'square'); break;
    }
  }

  /* ==========================================================
     8. ВВОД
     ========================================================== */
  const keys = Object.create(null);
  const SENSITIVITY = 0.0022;

  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (state.mode === 'playing') {
      if (e.code === 'KeyR') reload();
      if (e.code === 'Digit1') switchWeapon(0);
      if (e.code === 'Digit2') switchWeapon(1);
    }
    if (['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  document.addEventListener('mousemove', e => {
    if (state.mode === 'playing' && document.pointerLockElement === canvas) {
      player.angle += e.movementX * SENSITIVITY;
      if (player.angle > Math.PI) player.angle -= Math.PI * 2;
      if (player.angle < -Math.PI) player.angle += Math.PI * 2;
    }
  });

  document.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    if (state.mode === 'playing') {
      mouseDown = true;
      const w = WEAPONS[currentWeapon];
      if (!w.auto) tryShoot();
    }
  });
  document.addEventListener('mouseup', e => { if (e.button === 0) mouseDown = false; });
  document.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('click', () => {
    if (state.mode === 'playing' && document.pointerLockElement !== canvas) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== canvas && state.mode === 'playing') pauseGame();
  });

  /* ==========================================================
     9. ОРУЖИЕ
     ========================================================== */
  function switchWeapon(idx) {
    if (idx === currentWeapon || idx < 0 || idx >= WEAPONS.length) return;
    currentWeapon = idx;
    reloading = false;
    reloadTimer = 0;
    fireCooldown = 0.28;
    recoilKick = 9;
    updateHUD();
  }

  function reload() {
    const w = WEAPONS[currentWeapon];
    const a = ammo[currentWeapon];
    if (reloading || a.mag >= w.magSize || a.reserve <= 0) return;
    reloading = true;
    reloadTimer = w.reloadTime;
    playSound('reload');
  }

  function finishReload() {
    const w = WEAPONS[currentWeapon];
    const a = ammo[currentWeapon];
    const need = w.magSize - a.mag;
    const give = Math.min(need, a.reserve);
    a.mag += give;
    a.reserve -= give;
    reloading = false;
    updateHUD();
  }

  function tryShoot() {
    if (state.mode !== 'playing' || reloading || fireCooldown > 0) return;

    const w = WEAPONS[currentWeapon];
    const a = ammo[currentWeapon];

    if (a.mag <= 0) {
      playSound('empty');
      fireCooldown = 0.25;
      if (a.reserve > 0) reload();
      return;
    }

    a.mag--;
    fireCooldown = w.fireRate;
    state.shotsFired++;

    muzzleFlash = 0.055;
    recoilKick = Math.min(18, recoilKick + w.recoil);
    playSound(w.id === 'ak47' ? 'rifle' : 'pistol');

    const moving = isPlayerMoving();
    let spread = w.spread * (moving ? w.moveSpread : 1) + recoilKick * 0.0009;

    const ang = player.angle + (Math.random() - 0.5) * spread * 2;
    const rdx = Math.cos(ang), rdy = Math.sin(ang);

    let hitEnemy = null;
    let bestT = Infinity;

    for (const e of enemies) {
      if (!e.alive) continue;
      const ex = e.x - player.x;
      const ey = e.y - player.y;
      const t = ex * rdx + ey * rdy;
      if (t < 0.25 || t > w.range) continue;
      const perp = Math.abs(ex * rdy - ey * rdx);
      if (perp > e.radius + 0.10) continue;
      if (!hasLineOfSight(player.x, player.y, e.x, e.y)) continue;
      if (t < bestT) { bestT = t; hitEnemy = e; }
    }

    if (hitEnemy) {
      state.shotsHit++;
      const isHead = Math.random() < 0.16;
      let dmg = w.damage * (0.82 + Math.random() * 0.36);
      if (isHead) dmg *= 2.4;
      damageEnemy(hitEnemy, dmg, isHead);
      showHitmarker(isHead);
    }

    if (a.mag === 0 && a.reserve > 0) {
      setTimeout(() => { if (state.mode === 'playing') reload(); }, 220);
    }

    updateHUD();
  }

  function isPlayerMoving() {
    return !!(keys['KeyW'] || keys['KeyS'] || keys['KeyA'] || keys['KeyD']);
  }

  /* ==========================================================
     10. УРОН
     ========================================================== */
  let hitmarkerTimer = 0;

  function showHitmarker(head) {
    ui.hitmarker.classList.remove('hidden');
    ui.hitmarker.style.filter = head ? 'hue-rotate(0deg) brightness(1.7)' : 'none';
    hitmarkerTimer = 0.12;
    playSound(head ? 'headshot' : 'hit');
  }

  function damageEnemy(e, dmg, head) {
    e.health -= dmg;
    e.hitFlash = 0.12;
    if (e.health <= 0) {
      e.alive = false;
      state.kills++;
      const pts = 100 + state.wave * 12 + (head ? 50 : 0);
      state.score += pts;
      playSound('death');
      addKillFeed(head ? 'ВЫ  ☠  ВРАГ  [HEADSHOT]' : 'ВЫ  ☠  ВРАГ');
      updateHUD();
    }
  }

  function damagePlayer(dmg) {
    if (state.mode !== 'playing') return;
    let remaining = dmg;
    if (player.armor > 0) {
      const absorbed = Math.min(player.armor, remaining * 0.5);
      player.armor -= absorbed;
      remaining -= absorbed;
    }
    player.health -= remaining;
    flashDamage();
    playSound('hurt');
    if (player.health <= 0) { player.health = 0; gameOver(); }
    updateHUD();
  }

  function flashDamage() {
    ui.damageFlash.style.transition = 'none';
    ui.damageFlash.style.opacity = '0.85';
    requestAnimationFrame(() => {
      ui.damageFlash.style.transition = 'opacity 0.4s ease-out';
      ui.damageFlash.style.opacity = '0';
    });
  }

  function addKillFeed(text) {
    const div = document.createElement('div');
    div.className = 'feed-item';
    div.textContent = text;
    ui.killfeed.appendChild(div);
    setTimeout(() => {
      div.style.transition = 'opacity 0.4s';
      div.style.opacity = '0';
      setTimeout(() => div.remove(), 450);
    }, 2200);
    while (ui.killfeed.children.length > 5) ui.killfeed.removeChild(ui.killfeed.firstChild);
  }

  /* ==========================================================
     11. ВРАГИ
     ========================================================== */
  function spawnEnemy() {
    let x = 0, y = 0, tries = 0;
    do {
      x = 1.5 + Math.random() * (MAP_W - 3);
      y = 1.5 + Math.random() * (MAP_H - 3);
      tries++;
    } while (
      (isWall(x, y) || !canStand(x, y, 0.35) || Math.hypot(x - player.x, y - player.y) < 7) &&
      tries < 400
    );

    const wave = state.wave;
    enemies.push({
      x, y,
      radius: 0.32,
      health: 55 + wave * 9,
      maxHealth: 55 + wave * 9,
      speed: Math.min(2.5, 0.95 + wave * 0.07),
      damage: 5 + wave * 0.9,
      fireDelay: Math.max(0.75, 2.1 - wave * 0.08),
      fireCooldown: 0.7 + Math.random() * 1.2,
      alive: true,
      hitFlash: 0,
      angle: 0,
      walkPhase: Math.random() * 10
    });
  }

  function updateEnemies(dt) {
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash -= dt;

      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      e.angle = Math.atan2(dy, dx);
      e.walkPhase += dt * 6;

      const desired = 3.2;
      if (dist > desired) {
        const nx = dx / dist, ny = dy / dist;
        const step = e.speed * dt;
        const tx = e.x + nx * step;
        const ty = e.y + ny * step;
        if (canStand(tx, e.y, e.radius)) e.x = tx;
        if (canStand(e.x, ty, e.radius)) e.y = ty;
      }

      e.fireCooldown -= dt;
      if (e.fireCooldown <= 0 && dist < 15 && hasLineOfSight(e.x, e.y, player.x, player.y)) {
        e.fireCooldown = e.fireDelay * (0.7 + Math.random() * 0.7);
        enemyShoot(e, dist);
      }
    }
  }

  function enemyShoot(e, dist) {
    playSound('enemyShot');
    let chance = Math.max(0.10, Math.min(0.80, 0.80 - dist * 0.045));
    if (Math.random() < chance) damagePlayer(e.damage * (0.75 + Math.random() * 0.6));
  }

  /* ==========================================================
     12. ВОЛНЫ
     ========================================================== */
  function startWave(n) {
    state.wave = n;
    state.betweenWaves = false;
    state.waveCooldown = 0;
    const count = Math.min(24, 3 + Math.floor(n * 1.6));
    state.pendingSpawns = count;
    state.spawnTimer = 0.4;

    if (n > 1) {
      state.score += (n - 1) * 220;
      player.armor = Math.min(100, player.armor + 25);
      player.health = Math.min(player.maxHealth, player.health + 15);
    }
    showWaveBanner('ВОЛНА ' + n);
    playSound('wave');
    updateHUD();
  }

  function showWaveBanner(text) {
    ui.waveBanner.textContent = text;
    ui.waveBanner.classList.remove('hidden');
    ui.waveBanner.style.animation = 'none';
    void ui.waveBanner.offsetWidth;
    ui.waveBanner.style.animation = '';
    state.bannerTimer = 2.0;
  }

  function updateWaves(dt) {
    if (state.pendingSpawns > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        spawnEnemy();
        state.pendingSpawns--;
        state.spawnTimer = Math.max(0.18, 0.65 - state.wave * 0.02);
        updateHUD();
      }
    }
    if (!state.betweenWaves && state.pendingSpawns === 0) {
      if (!enemies.some(e => e.alive)) {
        state.betweenWaves = true;
        state.waveCooldown = 3.0;
        state.score += state.wave * 150;
        showWaveBanner('ВОЛНА ЗАЧИЩЕНА  +' + (state.wave * 150));
        updateHUD();
      }
    }
    if (state.betweenWaves) {
      state.waveCooldown -= dt;
      if (state.waveCooldown <= 0) {
        for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) enemies.splice(i, 1);
        startWave(state.wave + 1);
      }
    }
    if (state.bannerTimer > 0) {
      state.bannerTimer -= dt;
      if (state.bannerTimer <= 0) ui.waveBanner.classList.add('hidden');
    }
  }

  /* ==========================================================
     13. ИГРОК
     ========================================================== */
  function updatePlayer(dt) {
    const forward = (keys['KeyW'] ? 1 : 0) - (keys['KeyS'] ? 1 : 0);
    const strafe  = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
    const running = !!(keys['ShiftLeft'] || keys['ShiftRight']);
    let speed = running ? 4.0 : 2.5;

    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const rightX = -dirY, rightY = dirX;

    let mx = dirX * forward + rightX * strafe;
    let my = dirY * forward + rightY * strafe;
    const len = Math.hypot(mx, my);
    let moving = false;

    if (len > 0.0001) {
      moving = true;
      mx /= len; my /= len;
      const step = speed * dt;
      const r = player.radius;
      const nx = player.x + mx * step;
      const ny = player.y + my * step;
      if (canStand(nx, player.y, r)) player.x = nx;
      if (canStand(player.x, ny, r)) player.y = ny;
    }

    const targetBob = moving ? (running ? 1.4 : 1.0) : 0;
    player.bobAmount += (targetBob - player.bobAmount) * Math.min(1, dt * 8);
    if (moving) player.bob += dt * (running ? 12 : 9);

    if (recoilKick > 0) {
      recoilKick -= dt * 60;
      if (recoilKick < 0) recoilKick = 0;
    }
    if (muzzleFlash > 0) muzzleFlash -= dt;

    if (reloading) {
      reloadTimer -= dt;
      if (reloadTimer <= 0) finishReload();
    }
    if (fireCooldown > 0) fireCooldown -= dt;

    const w = WEAPONS[currentWeapon];
    if (mouseDown && w.auto) tryShoot();
  }

  /* ==========================================================
     14. РЕНДЕР (текстурированный raycasting)
     ========================================================== */
  function render() {
    const dirX = Math.cos(player.angle);
    const dirY = Math.sin(player.angle);
    const planeX = -dirY * FOV;
    const planeY =  dirX * FOV;

    const w = bufW, h = bufH, halfH = h >> 1;
    const data = frameData;

    // Очистка
    data.set(clearPattern);

    /* ---------- ПОЛ И ПОТОЛОК ---------- */
    const rayDirX0 = dirX - planeX;
    const rayDirY0 = dirY - planeY;
    const rayDirX1 = dirX + planeX;
    const rayDirY1 = dirY + planeY;

    for (let y = 0; y < h; y++) {
      const isFloor = y > halfH;
      const p = isFloor ? (y - halfH) : (halfH - y);
      if (p <= 0) continue;

      const rowDistance = (0.5 * h) / p;
      const fogF = Math.min(1, 1 / (1 + rowDistance * rowDistance * 0.045));

      const stepX = rowDistance * (rayDirX1 - rayDirX0) / w;
      const stepY = rowDistance * (rayDirY1 - rayDirY0) / w;

      let fX = player.x + rowDistance * rayDirX0;
      let fY = player.y + rowDistance * rayDirY0;

      const tex = isFloor ? floorTexData : ceilTexData;
      const rowOff = y * w * 4;

      for (let x = 0; x < w; x++) {
        const cx = fX | 0, cy = fY | 0;
        const tx = (((fX - cx) * TEX_SIZE) | 0) & (TEX_SIZE - 1);
        const ty = (((fY - cy) * TEX_SIZE) | 0) & (TEX_SIZE - 1);
        fX += stepX; fY += stepY;

        const ti = (ty * TEX_SIZE + tx) * 4;
        const idx = rowOff + x * 4;

        data[idx]     = (tex[ti]     * fogF) | 0;
        data[idx + 1] = (tex[ti + 1] * fogF) | 0;
        data[idx + 2] = (tex[ti + 2] * fogF) | 0;
        data[idx + 3] = 255;
      }
    }

    /* ---------- СТЕНЫ ---------- */
    for (let x = 0; x < w; x++) {
      const cameraX = 2 * x / w - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);

      const ddX = (rayDirX === 0) ? 1e30 : Math.abs(1 / rayDirX);
      const ddY = (rayDirY === 0) ? 1e30 : Math.abs(1 / rayDirY);

      let stepX, stepY, sdX, sdY;
      if (rayDirX < 0) { stepX = -1; sdX = (player.x - mapX) * ddX; }
      else             { stepX =  1; sdX = (mapX + 1 - player.x) * ddX; }
      if (rayDirY < 0) { stepY = -1; sdY = (player.y - mapY) * ddY; }
      else             { stepY =  1; sdY = (mapY + 1 - player.y) * ddY; }

      let hit = 0, side = 0, guard = 0;
      while (!hit && guard++ < 200) {
        if (sdX < sdY) { sdX += ddX; mapX += stepX; side = 0; }
        else           { sdY += ddY; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= MAP_W || mapY >= MAP_H) { hit = 2; break; }
        if (map[mapY * MAP_W + mapX] === 1) hit = 1;
      }

      let perp;
      if (hit === 2) perp = 40;
      else perp = (side === 0) ? (sdX - ddX) : (sdY - ddY);
      if (perp < 0.0001) perp = 0.0001;

      zBuffer[x] = perp;
      if (hit === 2) continue;

      const lineH = h / perp;
      const drawStart = Math.floor(-lineH / 2 + halfH);
      const drawEnd   = Math.floor( lineH / 2 + halfH);

      // Координата текстуры X
      let wallX;
      if (side === 0) wallX = player.y + perp * rayDirY;
      else            wallX = player.x + perp * rayDirX;
      wallX -= Math.floor(wallX);

      let texX = (wallX * TEX_SIZE) | 0;
      if (side === 0 && rayDirX > 0) texX = TEX_SIZE - texX - 1;
      if (side === 1 && rayDirY < 0) texX = TEX_SIZE - texX - 1;
      if (texX < 0) texX = 0;
      if (texX >= TEX_SIZE) texX = TEX_SIZE - 1;

      // Тип текстуры стены
      const wallType = ((mapX * 7 + mapY * 13) % 3 + 3) % 3;
      const wallTex = wallTexData[wallType];

      const step = TEX_SIZE / lineH;
      let texPos = (drawStart - halfH + lineH / 2) * step;

      const fogF = Math.min(1, 1 / (1 + perp * perp * 0.032));
      const sideShade = side === 1 ? 0.72 : 1.0;
      const shade = fogF * sideShade;

      const y0 = Math.max(0, drawStart);
      const y1 = Math.min(h, drawEnd);

      for (let y = y0; y < y1; y++) {
        const texY = texPos & (TEX_SIZE - 1);
        texPos += step;

        const ti = ((texY | 0) * TEX_SIZE + texX) * 4;
        const idx = (y * w + x) * 4;

        data[idx]     = (wallTex[ti]     * shade) | 0;
        data[idx + 1] = (wallTex[ti + 1] * shade) | 0;
        data[idx + 2] = (wallTex[ti + 2] * shade) | 0;
        data[idx + 3] = 255;
      }
    }

    /* ---------- СПРАЙТЫ ВРАГОВ ---------- */
    drawSprites(dirX, dirY, planeX, planeY);

    // Вывод буфера
    bctx.putImageData(frameImg, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(buf, 0, 0, bufW, bufH, 0, 0, W, H);

    /* ---------- ОРУЖИЕ ---------- */
    drawWeapon();
  }

  function drawSprites(dirX, dirY, planeX, planeY) {
    const w = bufW, h = bufH, halfH = h >> 1;
    const data = frameData;

    const list = [];
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      list.push({ e, d: dx * dx + dy * dy });
    }
    list.sort((a, b) => b.d - a.d);

    const invDet = 1 / (planeX * dirY - dirX * planeY);

    for (const item of list) {
      const e = item.e;
      const spx = e.x - player.x;
      const spy = e.y - player.y;

      const tX = invDet * (dirY * spx - dirX * spy);
      const tY = invDet * (-planeY * spx + planeX * spy);

      if (tY <= 0.18) continue;

      const screenX = ((w / 2) * (1 + tX / tY)) | 0;
      const lineH = h / tY;
      const sprH = lineH * 0.95;
      const sprW = sprH;

      const top  = (halfH - 0.45 * lineH) | 0;
      const left = (screenX - sprW / 2) | 0;

      const startX = Math.max(0, left);
      const endX   = Math.min(w - 1, (left + sprW) | 0);
      if (endX < startX) continue;

      const startY = Math.max(0, top);
      const endY   = Math.min(h - 1, (top + sprH) | 0);
      if (endY < startY) continue;

      const sprData = (e.hitFlash > 0) ? SPRITE_HIT_DATA : SPRITE_NORMAL_DATA;
      const fogF = Math.min(1, Math.max(0, 1 / (1 + tY * tY * 0.028)));

      const invSprH = 64 / sprH;
      const invSprW = 64 / sprW;

      for (let x = startX; x <= endX; x++) {
        if (tY >= zBuffer[x]) continue;
        const texX = ((x - left) * invSprW) | 0;
        if (texX < 0 || texX > 63) continue;

        for (let y = startY; y <= endY; y++) {
          const texY = ((y - top) * invSprH) | 0;
          if (texY < 0 || texY > 63) continue;

          const si = (texY * 64 + texX) * 4;
          if (sprData[si + 3] < 128) continue;

          const idx = (y * w + x) * 4;
          data[idx]     = (sprData[si]     * fogF) | 0;
          data[idx + 1] = (sprData[si + 1] * fogF) | 0;
          data[idx + 2] = (sprData[si + 2] * fogF) | 0;
          data[idx + 3] = 255;
        }
      }
    }
  }

  /* ==========================================================
     15. МОДЕЛЬ ОРУЖИЯ (реалистичнее)
     ========================================================== */
  function drawWeapon() {
    const w = WEAPONS[currentWeapon];
    const s = Math.min(W, H) / 900;

    const bobX = Math.sin(player.bob) * 9 * player.bobAmount * s;
    const bobY = Math.abs(Math.cos(player.bob)) * 7 * player.bobAmount * s;
    const kick = recoilKick * 1.2 * s;

    const baseX = W * 0.70 + bobX;
    const baseY = H + bobY - kick + (reloading ? 60 * s : 0);

    let reloadRot = 0;
    if (reloading) {
      const t = 1 - (reloadTimer / w.reloadTime);
      reloadRot = Math.sin(t * Math.PI) * 0.5;
    }

    ctx.save();
    ctx.translate(baseX, baseY);
    ctx.rotate(reloadRot * 0.5);

    if (w.id === 'ak47') drawRifle(s);
    else drawPistol(s);

    ctx.restore();

    // Muzzle flash
    if (muzzleFlash > 0) {
      const fx = baseX + (w.id === 'ak47' ? 10 * s : 4 * s);
      const fy = baseY - (w.id === 'ak47' ? 250 * s : 190 * s);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const grad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 80 * s);
      grad.addColorStop(0,    'rgba(255,255,220,0.95)');
      grad.addColorStop(0.30, 'rgba(255,200,80,0.75)');
      grad.addColorStop(0.60, 'rgba(255,140,20,0.35)');
      grad.addColorStop(1,    'rgba(255,90,0,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fx, fy, 80 * s, 0, Math.PI * 2);
      ctx.fill();

      // Звезда вспышки
      ctx.fillStyle = 'rgba(255,245,190,0.95)';
      ctx.beginPath();
      ctx.moveTo(fx - 11 * s, fy);
      ctx.lineTo(fx, fy - 30 * s);
      ctx.lineTo(fx + 11 * s, fy);
      ctx.lineTo(fx, fy + 30 * s);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(fx - 18 * s, fy);
      ctx.lineTo(fx, fy - 5 * s);
      ctx.lineTo(fx + 18 * s, fy);
      ctx.lineTo(fx, fy + 5 * s);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  function drawPistol(s) {
    // Рукоять (градиент)
    const gripGrad = ctx.createLinearGradient(-6*s, -30*s, 34*s, 40*s);
    gripGrad.addColorStop(0, '#26292e');
    gripGrad.addColorStop(1, '#0e1013');
    ctx.fillStyle = gripGrad;
    ctx.beginPath();
    ctx.moveTo(-6*s, -30*s);
    ctx.lineTo(26*s, -30*s);
    ctx.lineTo(34*s, 40*s);
    ctx.lineTo(2*s, 40*s);
    ctx.closePath();
    ctx.fill();

    // Текстура рукояти
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1 * s;
    for (let i = -20; i < 40; i += 6) {
      ctx.beginPath();
      ctx.moveTo(-2*s, i*s);
      ctx.lineTo(28*s, i*s);
      ctx.stroke();
    }

    // Затвор
    const slideGrad = ctx.createLinearGradient(-34*s, 0, 12*s, 0);
    slideGrad.addColorStop(0, '#15181c');
    slideGrad.addColorStop(0.5, '#3a3f45');
    slideGrad.addColorStop(1, '#22262b');
    ctx.fillStyle = slideGrad;
    ctx.fillRect(-34*s, -170*s, 46*s, 145*s);

    // Насчки на затворе
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(-30*s, -160*s + i * 10*s, 30*s, 3*s);
    }

    // Ствол
    ctx.fillStyle = '#101215';
    ctx.fillRect(-24*s, -215*s, 26*s, 60*s);

    // Мушка
    ctx.fillStyle = '#3d4248';
    ctx.fillRect(-20*s, -228*s, 8*s, 14*s);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-20*s, -228*s, 8*s, 2*s);

    // Рука
    const handGrad = ctx.createLinearGradient(-8*s, -30*s, 46*s, 50*s);
    handGrad.addColorStop(0, '#d3a67d');
    handGrad.addColorStop(1, '#a87a52');
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(-2*s, -30*s);
    ctx.lineTo(38*s, -20*s);
    ctx.lineTo(46*s, 50*s);
    ctx.lineTo(-8*s, 46*s);
    ctx.closePath();
    ctx.fill();

    // Пальцы
    ctx.fillStyle = '#b98a63';
    ctx.fillRect(-4*s, -74*s, 26*s, 14*s);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-4*s, -74*s, 26*s, 1*s);
    ctx.fillRect(-4*s, -61*s, 26*s, 1*s);
  }

  function drawRifle(s) {
    // Приклад
    const stockGrad = ctx.createLinearGradient(-10*s, 0, 58*s, 0);
    stockGrad.addColorStop(0, '#2b2f34');
    stockGrad.addColorStop(1, '#15181b');
    ctx.fillStyle = stockGrad;
    ctx.beginPath();
    ctx.moveTo(-10*s, -20*s);
    ctx.lineTo(44*s, -20*s);
    ctx.lineTo(58*s, 60*s);
    ctx.lineTo(0*s, 60*s);
    ctx.closePath();
    ctx.fill();

    // Магазин
    const magGrad = ctx.createLinearGradient(-8*s, 0, 34*s, 0);
    magGrad.addColorStop(0, '#1f2328');
    magGrad.addColorStop(0.5, '#41464d');
    magGrad.addColorStop(1, '#23272c');
    ctx.fillStyle = magGrad;
    ctx.beginPath();
    ctx.moveTo(-2*s, -96*s);
    ctx.lineTo(34*s, -92*s);
    ctx.lineTo(28*s, 10*s);
    ctx.lineTo(-8*s, 6*s);
    ctx.closePath();
    ctx.fill();

    // Ребра магазина
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1 * s;
    for (let i = -80; i < 0; i += 14) {
      ctx.beginPath();
      ctx.moveTo(-2*s, i*s);
      ctx.lineTo(32*s, i*s);
      ctx.stroke();
    }

    // Ствольная коробка
    const boxGrad = ctx.createLinearGradient(-46*s, 0, 14*s, 0);
    boxGrad.addColorStop(0, '#1e2227');
    boxGrad.addColorStop(0.5, '#454a51');
    boxGrad.addColorStop(1, '#292d33');
    ctx.fillStyle = boxGrad;
    ctx.fillRect(-46*s, -200*s, 60*s, 120*s);

    // Панель
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-40*s, -180*s, 22*s, 60*s);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(-40*s, -180*s, 22*s, 2*s);

    // Цевьё (дерево)
    const woodGrad = ctx.createLinearGradient(-40*s, 0, 0, 0);
    woodGrad.addColorStop(0, '#3a2b1a');
    woodGrad.addColorStop(0.5, '#5a4126');
    woodGrad.addColorStop(1, '#4a3420');
    ctx.fillStyle = woodGrad;
    ctx.fillRect(-40*s, -278*s, 40*s, 90*s);

    // Волокна дерева
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1 * s;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(-40*s, (-270 + i * 14) * s);
      ctx.lineTo(0, (-270 + i * 14) * s);
      ctx.stroke();
    }

    // Ствол
    const barrelGrad = ctx.createLinearGradient(-30*s, 0, -10*s, 0);
    barrelGrad.addColorStop(0, '#0d0f12');
    barrelGrad.addColorStop(0.5, '#2a2e34');
    barrelGrad.addColorStop(1, '#16181c');
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(-30*s, -352*s, 20*s, 80*s);

    // Газовая трубка
    ctx.fillStyle = '#22262b';
    ctx.fillRect(-4*s, -340*s, 10*s, 70*s);

    // Мушка
    ctx.fillStyle = '#464c53';
    ctx.fillRect(-30*s, -366*s, 20*s, 14*s);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(-30*s, -366*s, 20*s, 2*s);

    // Рука
    const handGrad = ctx.createLinearGradient(-6*s, -30*s, 56*s, 62*s);
    handGrad.addColorStop(0, '#d3a67d');
    handGrad.addColorStop(1, '#a87a52');
    ctx.fillStyle = handGrad;
    ctx.beginPath();
    ctx.moveTo(-4*s, -30*s);
    ctx.lineTo(42*s, -18*s);
    ctx.lineTo(56*s, 62*s);
    ctx.lineTo(-6*s, 56*s);
    ctx.closePath();
    ctx.fill();

    // Пальцы
    ctx.fillStyle = '#b98a63';
    ctx.fillRect(-4*s, -88*s, 30*s, 16*s);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(-4*s, -88*s, 30*s, 1*s);
    ctx.fillRect(-4*s, -73*s, 30*s, 1*s);
  }

  /* ==========================================================
     16. HUD
     ========================================================== */
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateHUD() {
    const w = WEAPONS[currentWeapon];
    const a = ammo[currentWeapon];

    ui.hudWave.textContent    = state.wave;
    ui.hudScore.textContent   = state.score;
    ui.hudHealth.textContent  = Math.ceil(player.health);
    ui.hudArmor.textContent   = Math.ceil(player.armor);
    ui.hudWeapon.textContent  = w.name;
    ui.hudAmmo.textContent    = a.mag;
    ui.hudReserve.textContent = a.reserve;

    const aliveCount = enemies.filter(e => e.alive).length + state.pendingSpawns;
    ui.hudEnemies.textContent = aliveCount;

    ui.hudAmmo.classList.toggle('low', a.mag <= Math.max(1, Math.floor(w.magSize * 0.2)));

    if (player.health > 60)      ui.hudHealth.style.color = '#ffb703';
    else if (player.health > 30) ui.hudHealth.style.color = '#ff8c1a';
    else                          ui.hudHealth.style.color = '#ff3b3b';

    ui.hudTime.textContent = formatTime(state.elapsed);
  }

  /* ==========================================================
     17. РЕКОРДЫ
     ========================================================== */
  const RECORDS_KEY = 'cs16_web_records_hd_v1';
  const MAX_RECORDS = 10;

  function loadRecords() {
    try {
      const raw = localStorage.getItem(RECORDS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(r => r && typeof r.score === 'number');
    } catch (e) { return []; }
  }

  function saveRecord(rec) {
    let list = loadRecords();
    list.push(rec);
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, MAX_RECORDS);
    try { localStorage.setItem(RECORDS_KEY, JSON.stringify(list)); } catch (e) {}
    return list;
  }

  function clearRecords() {
    try { localStorage.removeItem(RECORDS_KEY); } catch (e) {}
  }

  function bestScore() {
    const list = loadRecords();
    return list.length ? list[0].score : 0;
  }

  function renderRecords() {
    const list = loadRecords();
    ui.recordsList.innerHTML = '';
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'Пока нет записей. Сыграйте партию!';
      ui.recordsList.appendChild(li);
      return;
    }
    list.forEach(r => {
      const li = document.createElement('li');
      const main = document.createElement('span');
      main.className = 'r-main';
      main.textContent = r.score + ' очк.';
      const sub = document.createElement('span');
      sub.className = 'r-sub';
      sub.textContent = 'волна ' + r.wave + ' · ' + r.kills + ' убийств · ' + formatTime(r.time);
      li.appendChild(main);
      li.appendChild(sub);
      ui.recordsList.appendChild(li);
    });
  }

  function updateBestLine() {
    const b = bestScore();
    ui.bestLine.textContent = b > 0 ? ('ЛУЧШИЙ РЕЗУЛЬТАТ: ' + b) : '';
  }

  /* ==========================================================
     18. УПРАВЛЕНИЕ ИГРОЙ
     ========================================================== */
  function resetGame() {
    player.x = 2.5; player.y = 2.5; player.angle = 0;
    player.health = player.maxHealth;
    player.armor = 0;
    player.bob = 0; player.bobAmount = 0;

    currentWeapon = 0;
    WEAPONS.forEach((w, i) => { ammo[i].mag = w.magSize; ammo[i].reserve = w.reserveStart; });

    fireCooldown = 0; reloading = false; reloadTimer = 0;
    recoilKick = 0; muzzleFlash = 0; mouseDown = false;

    enemies.length = 0;

    state.wave = 0; state.score = 0; state.kills = 0; state.elapsed = 0;
    state.shotsFired = 0; state.shotsHit = 0;
    state.pendingSpawns = 0; state.spawnTimer = 0;
    state.waveCooldown = 0; state.betweenWaves = false; state.bannerTimer = 0;

    ui.killfeed.innerHTML = '';
  }

  function startGame() {
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

    resetGame();
    state.mode = 'playing';

    ui.menu.classList.add('hidden');
    ui.records.classList.add('hidden');
    ui.pause.classList.add('hidden');
    ui.gameover.classList.add('hidden');

    ui.hud.classList.remove('hidden');
    ui.crosshair.classList.remove('hidden');

    startWave(1);
    updateHUD();

    if (canvas.requestPointerLock) canvas.requestPointerLock();
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    state.mode = 'paused';
    mouseDown = false;
    ui.pause.classList.remove('hidden');
    ui.crosshair.classList.add('hidden');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    state.mode = 'playing';
    ui.pause.classList.add('hidden');
    ui.crosshair.classList.remove('hidden');
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  }

  function goToMenu() {
    state.mode = 'menu';
    mouseDown = false;
    ui.pause.classList.add('hidden');
    ui.gameover.classList.add('hidden');
    ui.records.classList.add('hidden');
    ui.hud.classList.add('hidden');
    ui.crosshair.classList.add('hidden');
    ui.menu.classList.remove('hidden');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    updateBestLine();
  }

  function gameOver() {
    state.mode = 'dead';
    mouseDown = false;
    if (document.pointerLockElement === canvas) document.exitPointerLock();

    ui.crosshair.classList.add('hidden');
    ui.hud.classList.add('hidden');
    ui.gameover.classList.remove('hidden');

    const acc = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;

    ui.resScore.textContent = state.score;
    ui.resKills.textContent = state.kills;
    ui.resWave.textContent  = state.wave;
    ui.resTime.textContent  = formatTime(state.elapsed);

    const prevBest = bestScore();
    saveRecord({
      score: state.score,
      kills: state.kills,
      wave: state.wave,
      time: Math.floor(state.elapsed),
      acc: acc,
      date: new Date().toISOString()
    });

    if (state.score > prevBest && prevBest > 0) {
      ui.resBest.textContent = '★ НОВЫЙ РЕКОРД! (+' + (state.score - prevBest) + ')';
      ui.resBest.style.color = '#ffd75e';
    } else if (prevBest === 0) {
      ui.resBest.textContent = '★ Первый результат сохранён!';
      ui.resBest.style.color = '#ffd75e';
    } else {
      ui.resBest.textContent = 'Лучший результат: ' + prevBest;
      ui.resBest.style.color = '#8de08d';
    }

    for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) enemies.splice(i, 1);
  }

  /* ==========================================================
     19. КНОПКИ
     ========================================================== */
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-again').addEventListener('click', startGame);
  document.getElementById('btn-restart').addEventListener('click', startGame);

  document.getElementById('btn-records').addEventListener('click', () => {
    renderRecords();
    ui.menu.classList.add('hidden');
    ui.records.classList.remove('hidden');
  });

  document.getElementById('btn-records-back').addEventListener('click', () => {
    ui.records.classList.add('hidden');
    ui.menu.classList.remove('hidden');
    updateBestLine();
  });

  document.getElementById('btn-records-clear').addEventListener('click', () => {
    clearRecords();
    renderRecords();
    updateBestLine();
  });

  document.getElementById('btn-resume').addEventListener('click', resumeGame);
  document.getElementById('btn-menu').addEventListener('click', goToMenu);
  document.getElementById('btn-go-menu').addEventListener('click', goToMenu);

  /* ==========================================================
     20. ГЛАВНЫЙ ЦИКЛ
     ========================================================== */
  let lastTime = performance.now();

  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;
    if (dt < 0) dt = 0;

    if (state.mode === 'playing') {
      state.elapsed += dt;
      updatePlayer(dt);
      updateEnemies(dt);
      updateWaves(dt);

      if (hitmarkerTimer > 0) {
        hitmarkerTimer -= dt;
        if (hitmarkerTimer <= 0) ui.hitmarker.classList.add('hidden');
      }

      ui.hudTime.textContent = formatTime(state.elapsed);

      const aliveCount = enemies.filter(e => e.alive).length + state.pendingSpawns;
      if (ui.hudEnemies.textContent !== String(aliveCount)) {
        ui.hudEnemies.textContent = aliveCount;
      }
    }

    render();
    requestAnimationFrame(loop);
  }

  /* ==========================================================
     21. ИНИЦИАЛИЗАЦИЯ
     ========================================================== */
  updateBestLine();
  updateHUD();
  requestAnimationFrame(loop);

})();
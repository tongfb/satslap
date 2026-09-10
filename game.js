(() => {
  'use strict';

  const cfg = window.SATSLAP_CONFIG;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const el = {
    title: $('#gameTitle'), subtitle: $('#gameSubtitle'), stage: $('#stage'),
    hudName: $('#hudName'), hudScore: $('#hudScore'), hudTime: $('#hudTime'),
    hudTimeChip: $('.hud-time'), startPanel: $('#startPanel'), resultPanel: $('#resultPanel'),
    countdownPanel: $('#countdownPanel'), countdownText: $('#countdownText'),
    startForm: $('#startForm'), playerName: $('#playerName'), nameError: $('#nameError'),
    playAgain: $('#playAgain'), resultName: $('#resultName'), resultScore: $('#resultScore'),
    resultDate: $('#resultDate'), resultMessage: $('#resultMessage'), paw: $('#paw'),
    floatText: $('#floatText'), soundToggle: $('#soundToggle'), holes: $$('.hole'),
    bgMusic: $('#bgMusic'), baa: $('#sfxBaa'), finish: $('#sfxFinish'),
    openWallet: $('#openWallet'), copyDonate: $('#copyDonate'), copyStatus: $('#copyStatus'), donateAddress: $('#donateAddress')
  };

  const sheepSources = {
    black: { normal: 'assets/images/fiat-sheep-head.png', hit: 'assets/images/fiat-sheep-hit-head.png', label: 'FIAT Sheep หน้าดำ' },
    white: { normal: 'assets/images/white-sheep-head.png', hit: 'assets/images/white-sheep-hit-head.png', label: 'แกะหน้าขาว' }
  };

  let running = false;
  let score = 0;
  let player = '';
  let startTime = 0;
  let endTime = 0;
  let spawnTimer = null;
  let clockTimer = null;
  let countdownTimer = null;
  let active = new Map();
  let soundOn = true;
  let audioCtx = null;
  let finishCueTimer = null;

  el.title.textContent = cfg.gameTitle;
  el.subtitle.textContent = cfg.subtitle;
  el.playerName.maxLength = cfg.maxNameLength;
  el.bgMusic.volume = cfg.backgroundMusicVolume;
  el.baa.volume = cfg.sfxVolume;
  el.finish.volume = Math.min(1, cfg.sfxVolume);
  if (el.donateAddress) el.donateAddress.textContent = cfg.donateAddress;
  if (el.openWallet) el.openWallet.href = `lightning:${cfg.donateAddress}`;

  function safePlay(audio, { restart = true } = {}) {
    if (!soundOn || !audio) return;
    try {
      if (restart) audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) {}
  }

  function ensureAudioContext() {
    if (!soundOn) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function playStrongSlap() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.78 * cfg.sfxVolume, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    master.connect(ctx.destination);

    const frames = Math.max(1, Math.floor(ctx.sampleRate * 0.045));
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      const decay = Math.exp(-i / (frames * 0.19));
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(1850, now);
    band.frequency.exponentialRampToValueAtTime(620, now + 0.045);
    band.Q.value = 1.6;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(1, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    noise.connect(band);
    band.connect(crackGain);
    crackGain.connect(master);
    noise.start(now);
    noise.stop(now + 0.05);

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(175, now);
    thump.frequency.exponentialRampToValueAtTime(48, now + 0.17);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(0.9, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    thump.connect(thumpGain);
    thumpGain.connect(master);
    thump.start(now);
    thump.stop(now + 0.20);
  }

  function playCoin() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.42 * cfg.sfxVolume, now);
    master.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    master.connect(ctx.destination);

    const chirp = ctx.createOscillator();
    chirp.type = 'sine';
    chirp.frequency.setValueAtTime(860, now);
    chirp.frequency.linearRampToValueAtTime(1320, now + 0.085);
    chirp.frequency.exponentialRampToValueAtTime(1120, now + 0.22);
    const chirpGain = ctx.createGain();
    chirpGain.gain.setValueAtTime(0.001, now);
    chirpGain.gain.linearRampToValueAtTime(1, now + 0.012);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    chirp.connect(chirpGain);
    chirpGain.connect(master);
    chirp.start(now);
    chirp.stop(now + 0.27);

    const sparkle = ctx.createOscillator();
    sparkle.type = 'triangle';
    sparkle.frequency.setValueAtTime(1720, now + 0.055);
    sparkle.frequency.linearRampToValueAtTime(2050, now + 0.12);
    const sparkleGain = ctx.createGain();
    sparkleGain.gain.setValueAtTime(0.001, now);
    sparkleGain.gain.setValueAtTime(0.45, now + 0.055);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    sparkle.connect(sparkleGain);
    sparkleGain.connect(master);
    sparkle.start(now + 0.055);
    sparkle.stop(now + 0.19);
  }

  function setSound(on) {
    soundOn = Boolean(on);
    el.soundToggle.setAttribute('aria-pressed', String(!soundOn));
    el.soundToggle.setAttribute('aria-label', soundOn ? 'ปิดเสียง' : 'เปิดเสียง');
    el.soundToggle.textContent = soundOn ? '🔊 เสียง' : '🔇 ปิดเสียง';
    if (!soundOn) {
      el.bgMusic.pause();
      if (el.baa) el.baa.pause();
    } else {
      ensureAudioContext();
      if (running) safePlay(el.bgMusic, { restart: false });
    }
  }

  function updateScore() {
    el.hudScore.textContent = score.toLocaleString('en-US');
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function setHoleState(index, type = null, hit = false) {
    const hole = el.holes[index];
    const img = hole.querySelector('.sheep');
    if (!type) {
      hole.classList.remove('is-active', 'is-hit');
      delete hole.dataset.type;
      img.removeAttribute('src');
      img.alt = '';
      return;
    }
    hole.dataset.type = type;
    hole.classList.add('is-active');
    hole.classList.toggle('is-hit', hit);
    img.src = hit ? sheepSources[type].hit : sheepSources[type].normal;
    img.alt = sheepSources[type].label;
  }

  function clearActive() {
    for (const entry of active.values()) clearTimeout(entry.timeoutId);
    active.clear();
    el.holes.forEach((_, i) => setHoleState(i));
  }

  function hideSheep(index, token) {
    const entry = active.get(index);
    if (!entry || entry.token !== token) return;
    active.delete(index);
    setHoleState(index);
  }

  function popSheep(index, type, lifeMs) {
    const token = `${Date.now()}-${Math.random()}`;
    setHoleState(index, type, false);
    const timeoutId = setTimeout(() => hideSheep(index, token), lifeMs);
    active.set(index, { type, token, timeoutId, hit: false });
  }

  function currentProgress() {
    if (!running || !startTime) return 0;
    return Math.min(1, Math.max(0, (Date.now() - startTime) / (cfg.durationSeconds * 1000)));
  }

  function chooseWaveSize(progress) {
    if (progress < .28) return 1;
    if (progress < .68) return Math.random() < .42 ? 2 : 1;
    return Math.random() < .58 ? 2 : 1;
  }

  function spawnWave() {
    if (!running) return;
    const progress = currentProgress();
    const free = el.holes.map((_, i) => i).filter(i => !active.has(i));
    if (free.length) {
      const count = Math.min(chooseWaveSize(progress), free.length);
      for (let k = 0; k < count; k += 1) {
        const pickAt = Math.floor(Math.random() * free.length);
        const index = free.splice(pickAt, 1)[0];
        const type = Math.random() < cfg.blackSheepProbability ? 'black' : 'white';
        const lifeMs = Math.round(cfg.startPopMs + (cfg.endPopMs - cfg.startPopMs) * progress);
        popSheep(index, type, lifeMs);
      }
    }
    const nextMs = Math.max(300, 720 - progress * 250 + Math.random() * 190);
    spawnTimer = setTimeout(spawnWave, nextMs);
  }

  function showPaw(event, hole) {
    const stageRect = el.stage.getBoundingClientRect();
    const holeRect = hole.getBoundingClientRect();
    const x = event.clientX ? event.clientX - stageRect.left : holeRect.left + holeRect.width / 2 - stageRect.left;
    const y = event.clientY ? event.clientY - stageRect.top : holeRect.top + holeRect.height / 2 - stageRect.top;
    el.paw.style.left = `${x}px`;
    el.paw.style.top = `${y}px`;
    el.paw.classList.remove('is-slapping');
    void el.paw.offsetWidth;
    el.paw.classList.add('is-slapping');
  }

  function showFloat(event, hole, text, good) {
    const stageRect = el.stage.getBoundingClientRect();
    const holeRect = hole.getBoundingClientRect();
    const x = event.clientX ? event.clientX - stageRect.left : holeRect.left + holeRect.width / 2 - stageRect.left;
    const y = event.clientY ? event.clientY - stageRect.top : holeRect.top + holeRect.height * .25 - stageRect.top;
    el.floatText.style.left = `${x}px`;
    el.floatText.style.top = `${y}px`;
    el.floatText.textContent = text;
    el.floatText.className = `float-text ${good ? 'good' : 'bad'}`;
    void el.floatText.offsetWidth;
    el.floatText.classList.add('is-showing');
  }

  function hitHole(event, index) {
    if (!running) return;
    const entry = active.get(index);
    if (!entry || entry.hit) return;

    const hole = el.holes[index];
    entry.hit = true;
    clearTimeout(entry.timeoutId);
    setHoleState(index, entry.type, true);
    showPaw(event, hole);
    playStrongSlap();

    if (entry.type === 'black') {
      score += cfg.blackSheepReward;
      showFloat(event, hole, `+${cfg.blackSheepReward} sats`, true);
      setTimeout(playCoin, 55);
    } else {
      score = Math.max(0, score - cfg.whiteSheepPenalty);
      showFloat(event, hole, `−${cfg.whiteSheepPenalty} sats`, false);
      setTimeout(() => safePlay(el.baa), 65);
    }
    updateScore();

    const token = entry.token;
    entry.timeoutId = setTimeout(() => hideSheep(index, token), 300);
  }

  function updateClock() {
    if (!running) return;
    const remain = endTime - Date.now();
    el.hudTime.textContent = formatTime(remain);
    el.hudTimeChip.classList.toggle('is-urgent', remain <= 10000);
    if (remain <= 0) {
      finishGame();
      return;
    }
    clockTimer = setTimeout(updateClock, 80);
  }

  function stopTimers() {
    clearTimeout(spawnTimer);
    clearTimeout(clockTimer);
    clearTimeout(countdownTimer);
    clearTimeout(finishCueTimer);
    spawnTimer = clockTimer = countdownTimer = finishCueTimer = null;
  }

  function fadeOutMusic(durationMs = 280) {
    if (!el.bgMusic) return;
    const startVolume = el.bgMusic.volume;
    const steps = 8;
    const stepMs = Math.max(20, Math.round(durationMs / steps));
    let count = 0;
    const iv = setInterval(() => {
      count += 1;
      const remain = 1 - count / steps;
      el.bgMusic.volume = Math.max(0, startVolume * remain);
      if (count >= steps) {
        clearInterval(iv);
        el.bgMusic.pause();
        el.bgMusic.currentTime = 0;
        el.bgMusic.volume = cfg.backgroundMusicVolume;
      }
    }, stepMs);
  }

  function playFinishJingle() {
    safePlay(el.finish);
  }

  function showFinishCueAndResult() {
    el.countdownPanel.classList.add('is-visible', 'finish');
    el.countdownPanel.setAttribute('aria-hidden', 'false');
    el.countdownText.textContent = 'TIME UP!';
    playFinishJingle();
    finishCueTimer = setTimeout(() => {
      el.countdownPanel.classList.remove('is-visible', 'finish');
      el.countdownPanel.setAttribute('aria-hidden', 'true');
      el.resultPanel.classList.add('is-visible');
      el.resultPanel.setAttribute('aria-hidden', 'false');
    }, 2850);
  }

  function finishGame() {
    if (!running) return;
    running = false;
    stopTimers();
    clearActive();
    el.hudTime.textContent = '00:00';
    el.hudTimeChip.classList.remove('is-urgent');
    fadeOutMusic(320);

    el.resultName.textContent = player;
    el.resultScore.textContent = score.toLocaleString('en-US');
    el.resultDate.textContent = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date());
    el.resultMessage.textContent = score >= 5000 ? 'LEGENDARY PAW. HODL WHITE APPROVES.' : score >= 3000 ? 'SOLID STACK. KEEP SLAPPING.' : 'STACK HARDER. TRY AGAIN.';
    showFinishCueAndResult();
  }

  function beginRound() {
    score = 0;
    updateScore();
    el.hudName.textContent = player;
    el.hudTime.textContent = '01:00';
    el.resultPanel.classList.remove('is-visible');
    el.resultPanel.setAttribute('aria-hidden', 'true');
    clearActive();

    running = true;
    startTime = Date.now();
    endTime = startTime + cfg.durationSeconds * 1000;
    if (soundOn) {
      ensureAudioContext();
      el.bgMusic.currentTime = 0;
      safePlay(el.bgMusic, { restart: false });
    }
    spawnWave();
    updateClock();
  }

  function runCountdown() {
    let n = 3;
    el.countdownText.textContent = String(n);
    el.countdownPanel.classList.add('is-visible');
    el.countdownPanel.setAttribute('aria-hidden', 'false');

    const step = () => {
      n -= 1;
      if (n > 0) {
        el.countdownText.textContent = String(n);
        countdownTimer = setTimeout(step, 650);
      } else if (n === 0) {
        el.countdownText.textContent = 'GO!';
        countdownTimer = setTimeout(() => {
          el.countdownPanel.classList.remove('is-visible');
          el.countdownPanel.setAttribute('aria-hidden', 'true');
          beginRound();
        }, 480);
      }
    };
    countdownTimer = setTimeout(step, 650);
  }

  function prepareStart(name) {
    stopTimers();
    clearActive();
    running = false;
    player = name;
    ensureAudioContext();
    el.startPanel.classList.remove('is-visible');
    runCountdown();
  }

  async function copyDonateAddress() {
    const value = cfg.donateAddress;
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        copied = true;
      }
    } catch (_) {}

    if (!copied) {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
      ta.remove();
    }

    if (el.copyStatus) {
      el.copyStatus.textContent = copied ? 'คัดลอก Lightning Address แล้ว' : `คัดลอกไม่สำเร็จ — ${value}`;
      setTimeout(() => { if (el.copyStatus) el.copyStatus.textContent = ''; }, 2200);
    }
  }

  el.startForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = el.playerName.value.trim().replace(/\s+/g, ' ');
    if (!name) {
      el.nameError.textContent = 'ใส่ชื่อก่อนเริ่มเกมจ้า';
      el.playerName.focus();
      return;
    }
    if (name.length > cfg.maxNameLength) {
      el.nameError.textContent = `ชื่อยาวได้ไม่เกิน ${cfg.maxNameLength} ตัวอักษร`;
      return;
    }
    el.nameError.textContent = '';
    prepareStart(name);
  });

  el.playerName.addEventListener('input', () => { el.nameError.textContent = ''; });
  el.holes.forEach((hole, index) => {
    hole.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      ensureAudioContext();
      hitHole(event, index);
    });
  });

  el.playAgain.addEventListener('click', () => {
    el.resultPanel.classList.remove('is-visible');
    el.resultPanel.setAttribute('aria-hidden', 'true');
    ensureAudioContext();
    runCountdown();
  });

  if (el.copyDonate) el.copyDonate.addEventListener('click', copyDonateAddress);
  el.soundToggle.addEventListener('click', () => setSound(!soundOn));

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) el.bgMusic.pause();
    if (!document.hidden && running && soundOn) safePlay(el.bgMusic, { restart: false });
  });
})();

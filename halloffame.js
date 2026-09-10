(() => {
  'use strict';

  const init = () => {
    const stage = document.querySelector('#stage');
    const topbar = document.querySelector('.topbar');
    const soundToggle = document.querySelector('#soundToggle');
    const resultPanel = document.querySelector('#resultPanel');
    const resultName = document.querySelector('#resultName');
    const resultScore = document.querySelector('#resultScore');
    const playAgain = document.querySelector('#playAgain');

    if (!stage || !topbar || !resultPanel || !resultName || !resultScore) return;

    if (!document.querySelector('link[data-hof-style]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'halloffame.css';
      link.dataset.hofStyle = '1';
      document.head.appendChild(link);
    }

    const topActions = document.createElement('div');
    topActions.style.display = 'flex';
    topActions.style.gap = '8px';
    topActions.style.alignItems = 'center';

    if (soundToggle?.parentNode === topbar) {
      topbar.insertBefore(topActions, soundToggle);
      topActions.appendChild(soundToggle);
    } else {
      topbar.appendChild(topActions);
    }

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'hof-trigger';
    openButton.textContent = '🏆 HALL OF FAME';
    topActions.insertBefore(openButton, soundToggle || null);

    const overlay = document.createElement('div');
    overlay.className = 'hof-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="hof-card" role="dialog" aria-modal="true" aria-labelledby="hofTitle">
        <div class="hof-head">
          <h2 id="hofTitle">🏆 HALL OF FAME</h2>
          <button class="hof-close" type="button" aria-label="ปิด Hall of Fame">×</button>
        </div>
        <p class="hof-subtitle">10 อันดับคะแนนสูงสุด · ชื่อเดียวเก็บคะแนนที่ดีที่สุด</p>
        <div class="hof-state">กำลังโหลด...</div>
        <ol class="hof-list" hidden></ol>
      </section>
    `;
    stage.appendChild(overlay);

    const list = overlay.querySelector('.hof-list');
    const state = overlay.querySelector('.hof-state');
    const closeButton = overlay.querySelector('.hof-close');

    const resultButton = document.createElement('button');
    resultButton.type = 'button';
    resultButton.className = 'hof-result-btn';
    resultButton.textContent = '🏆 ดู HALL OF FAME';

    const saveStatus = document.createElement('p');
    saveStatus.className = 'hof-save-status';
    saveStatus.setAttribute('aria-live', 'polite');

    if (playAgain?.parentNode) {
      playAgain.parentNode.insertBefore(saveStatus, playAgain);
      playAgain.parentNode.insertBefore(resultButton, playAgain);
    }

    function showOverlay() {
      overlay.classList.add('is-visible');
      overlay.setAttribute('aria-hidden', 'false');
      loadScores();
      setTimeout(() => closeButton.focus(), 0);
    }

    function hideOverlay() {
      overlay.classList.remove('is-visible');
      overlay.setAttribute('aria-hidden', 'true');
    }

    function renderScores(scores) {
      list.textContent = '';
      if (!scores.length) {
        state.textContent = 'ยังไม่มีคะแนน เป็นคนแรกได้เลย!';
        state.hidden = false;
        list.hidden = true;
        return;
      }

      const medals = ['🥇', '🥈', '🥉'];
      scores.forEach((entry, index) => {
        const row = document.createElement('li');
        row.className = 'hof-row';

        const rank = document.createElement('span');
        rank.className = 'hof-rank';
        rank.textContent = medals[index] || `#${index + 1}`;

        const name = document.createElement('span');
        name.className = 'hof-name';
        name.textContent = entry.name;

        const score = document.createElement('span');
        score.className = 'hof-score';
        score.textContent = `${Number(entry.score).toLocaleString('en-US')} sats`;

        row.append(rank, name, score);
        list.appendChild(row);
      });

      state.hidden = true;
      list.hidden = false;
    }

    async function loadScores() {
      state.hidden = false;
      state.textContent = 'กำลังโหลด...';
      list.hidden = true;

      try {
        const response = await fetch('/api/hall-of-fame', {
          headers: { accept: 'application/json' },
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        renderScores(Array.isArray(data.scores) ? data.scores : []);
      } catch {
        state.textContent = 'Hall of Fame ยังเชื่อมต่อไม่ได้';
        state.hidden = false;
      }
    }

    async function submitCurrentScore() {
      const name = resultName.textContent.trim();
      const score = Number(resultScore.textContent.replace(/[^0-9]/g, ''));
      if (!name || !Number.isInteger(score)) return;

      saveStatus.textContent = 'กำลังบันทึกคะแนน...';

      try {
        const response = await fetch('/api/score', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json'
          },
          body: JSON.stringify({ name, score })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const best = Number(data?.entry?.score ?? score);
        saveStatus.textContent = best > score
          ? `🏆 คะแนนดีที่สุดของ ${name}: ${best.toLocaleString('en-US')} sats`
          : '🏆 บันทึกคะแนนเข้า Hall of Fame แล้ว';
      } catch {
        saveStatus.textContent = 'บันทึก Hall of Fame ไม่สำเร็จ ลองเล่นใหม่ภายหลังได้';
      }
    }

    let submittedForThisResult = false;
    const observer = new MutationObserver(() => {
      const visible = resultPanel.classList.contains('is-visible');
      if (visible && !submittedForThisResult) {
        submittedForThisResult = true;
        submitCurrentScore();
      }
      if (!visible) {
        submittedForThisResult = false;
        saveStatus.textContent = '';
      }
    });
    observer.observe(resultPanel, { attributes: true, attributeFilter: ['class'] });

    openButton.addEventListener('click', showOverlay);
    resultButton.addEventListener('click', showOverlay);
    closeButton.addEventListener('click', hideOverlay);
    overlay.addEventListener('pointerdown', (event) => {
      if (event.target === overlay) hideOverlay();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && overlay.classList.contains('is-visible')) hideOverlay();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

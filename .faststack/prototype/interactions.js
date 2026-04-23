/* KlipSync · prototype interactions (vanilla JS, no build) */

(() => {
  const html = document.documentElement;

  /* ---------- theme ---------- */
  const THEME_KEY = 'klipsync:theme';
  const applyTheme = (t) => {
    html.setAttribute('data-theme', t);
    const label = document.querySelector('[data-theme-label]');
    if (label) label.textContent = t === 'dark' ? '深色' : '浅色';
  };
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) {
    applyTheme(stored);
  } else if (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) {
    applyTheme('dark');
  } else {
    applyTheme('light');
  }
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-toggle-theme]');
    if (!btn) return;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  /* ---------- modal ---------- */
  const openModal = (id) => {
    const m = document.getElementById(id);
    if (m) m.style.display = 'grid';
  };
  const closeModal = (el) => {
    const m = el.closest('.modal-backdrop');
    if (m) m.style.display = 'none';
  };
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-open-modal]');
    if (open) { openModal(open.getAttribute('data-open-modal')); return; }
    const close = e.target.closest('[data-close-modal]');
    if (close) { closeModal(close); return; }
    if (e.target.classList && e.target.classList.contains('modal-backdrop')) {
      e.target.style.display = 'none';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.style.display = 'none');
    }
  });

  /* ---------- QR popover 切换 ---------- */
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-qr-toggle]');
    if (toggle) {
      const targetId = toggle.getAttribute('data-qr-toggle');
      const pop = document.getElementById(targetId);
      if (pop) {
        const willOpen = !pop.classList.contains('open');
        pop.classList.toggle('open', willOpen);
        toggle.classList.toggle('is-open', willOpen);
      }
      return;
    }
    if (!e.target.closest('.qr-popover')) {
      document.querySelectorAll('.qr-popover.open').forEach(p => p.classList.remove('open'));
      document.querySelectorAll('[data-qr-toggle].is-open').forEach(b => b.classList.remove('is-open'));
    }
  });

  /* ---------- 附件抽屉切换 ---------- */
  const closeAllDrawers = () => {
    document.querySelectorAll('.att-drawer.open').forEach(d => {
      d.classList.remove('open');
      const t = document.querySelector(`[data-drawer-toggle="${d.id}"]`);
      if (t) t.classList.remove('is-open');
    });
  };
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-drawer-toggle]');
    if (toggle) {
      const targetId = toggle.getAttribute('data-drawer-toggle');
      const drawer = document.getElementById(targetId);
      if (drawer) {
        const willOpen = !drawer.classList.contains('open');
        closeAllDrawers();
        if (willOpen) {
          drawer.classList.add('open');
          toggle.classList.add('is-open');
        }
      }
      return;
    }
    if (e.target.closest('[data-drawer-close]')) { closeAllDrawers(); return; }
    if (!e.target.closest('.att-drawer') && !e.target.closest('[data-drawer-toggle]')) {
      closeAllDrawers();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllDrawers();
  });

  /* ---------- cliplist 单选激活 ---------- */
  document.addEventListener('click', (e) => {
    const item = e.target.closest('.clip-item');
    if (!item) return;
    const list = item.parentElement;
    if (!list) return;
    list.querySelectorAll('.clip-item.active').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
  });

  /* ---------- 移动端栈式切换 ---------- */
  document.addEventListener('click', (e) => {
    const toEditor = e.target.closest('[data-mobile="to-editor"]');
    const toList = e.target.closest('[data-mobile="to-list"]');
    if (!toEditor && !toList) return;
    const listCol = document.querySelector('.cliplist-col');
    const editorCol = document.querySelector('.editor-col');
    if (!listCol || !editorCol) return;
    if (toEditor && window.matchMedia('(max-width: 900px)').matches) {
      listCol.classList.add('hide-on-mobile');
      editorCol.classList.remove('hide-on-mobile');
    }
    if (toList && window.matchMedia('(max-width: 900px)').matches) {
      listCol.classList.remove('hide-on-mobile');
      editorCol.classList.add('hide-on-mobile');
    }
  });

  /* ---------- copy button 反馈 ---------- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.innerHTML = '✓ 已复制';
    btn.classList.add('btn-accent');
    btn.classList.remove('btn-ghost', 'btn-secondary');
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove('btn-accent');
      btn.classList.add('btn-ghost');
    }, 1600);
  });

  /* ---------- toast 简易 API ---------- */
  window.klipsyncToast = (text, variant = 'accent') => {
    let area = document.querySelector('.toast-area');
    if (!area) {
      area = document.createElement('div');
      area.className = 'toast-area';
      document.body.appendChild(area);
    }
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span class="dot" style="background:var(--c-${variant})"></span><span>${text}</span>`;
    area.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 200ms'; }, 2200);
    setTimeout(() => { t.remove(); }, 2600);
  };
})();

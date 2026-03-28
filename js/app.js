// ─── Theme ───────────────────────────────────────────────────────────────────
const ThemeManager = {
  init() {
    const saved = localStorage.getItem('theme') || 'dark';
    this.set(saved);
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    this.set(current === 'dark' ? 'light' : 'dark');
  },
  set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const btn = document.getElementById('themeToggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
};

// ─── Toast ────────────────────────────────────────────────────────────────────
const Toast = {
  container: null,
  init() {
    this.container = document.createElement('div');
    this.container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;';
    document.body.appendChild(this.container);
  },
  show(message, type = 'info', duration = 4000) {
    const colors = { info:'#6366f1', success:'#10b981', warning:'#f59e0b', error:'#ef4444' };
    const icons = { info:'ℹ️', success:'✅', warning:'⚠️', error:'❌' };
    const toast = document.createElement('div');
    toast.style.cssText = `
      background:var(--bg-card);border:1px solid ${colors[type]}44;border-left:3px solid ${colors[type]};
      border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;
      font-size:13px;color:var(--text-primary);box-shadow:0 8px 24px rgba(0,0,0,0.3);
      animation:slideInRight 0.3s ease;max-width:320px;backdrop-filter:blur(10px);pointer-events:all;
    `;
    toast.innerHTML = `<span>${icons[type]}</span><span style="flex:1;">${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ─── Modal ────────────────────────────────────────────────────────────────────
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// ─── Particles ────────────────────────────────────────────────────────────────
function initParticles(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${Math.random()*100}%;animation-duration:${6+Math.random()*10}s;animation-delay:${Math.random()*6}s;width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;`;
    container.appendChild(p);
  }
}

// ─── Animate numbers ──────────────────────────────────────────────────────────
function animateNumber(el, target, duration = 1400) {
  const startTime = performance.now();
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ─── Scroll animations ────────────────────────────────────────────────────────
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fadeInUp');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.card, .stat-card, .feature-card, .step-card').forEach(el => observer.observe(el));
}

// ─── Nav active ───────────────────────────────────────────────────────────────
function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .sidebar-nav a').forEach(a => {
    const href = a.getAttribute('href') || '';
    a.classList.toggle('active', href === path || href.endsWith('/' + path));
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  Toast.init();
  setActiveNav();
  initScrollAnimations();

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', () => ThemeManager.toggle());

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });

  document.querySelectorAll('[data-count]').forEach(el => {
    animateNumber(el, parseInt(el.dataset.count));
  });

  // Symptom chips
  document.querySelectorAll('.symptom-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = chip.dataset.symptom;
        input.focus();
      }
    });
  });
});

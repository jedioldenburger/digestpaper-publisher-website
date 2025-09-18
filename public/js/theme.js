(() => {
  const STORAGE_KEY = 'dp_theme'; // values: 'light' | 'dark' | 'system'
  const root = document.documentElement;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function calcTheme(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    return prefersDark.matches ? 'dark' : 'light';
  }

  function applyTheme(mode) {
    const resolved = calcTheme(mode);
    root.setAttribute('data-theme', resolved);
    updateToggleLabel(mode, resolved);
  }

  function updateToggleLabel(mode, resolved) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
    const icon = resolved === 'dark' ? '🌙' : '☀️';
    btn.textContent = `${icon} Thema (${mode})`;
    btn.setAttribute('aria-label', `Thema wisselen (huidig: ${mode})`);
    btn.dataset.next = next;
  }

  function ensureFloatingButton() {
    if (document.getElementById('theme-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.type = 'button';
    btn.style.cssText = 'position:fixed;right:1rem;bottom:1rem;z-index:60;padding:.5rem .75rem;border-radius:.75rem;background:#0b1220;color:#e5e7eb;border:1px solid rgba(56,189,248,.25)';
    btn.addEventListener('click', onToggleClick);
    document.body.appendChild(btn);
  }

  function onToggleClick() {
    const btn = document.getElementById('theme-toggle');
    const next = btn?.dataset.next || 'system';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY) || 'system';
    applyTheme(saved);
    prefersDark.addEventListener('change', () => {
      const mode = localStorage.getItem(STORAGE_KEY) || 'system';
      if (mode === 'system') applyTheme('system');
    });

    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', onToggleClick);
    else ensureFloatingButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


async function inject(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(url, { cache: "no-store" });
    el.innerHTML = await res.text();
  } catch (e) { console.error("Include failed:", url, e); }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Implement DevTools-like behavior: toggle prefers-color-scheme via override class
  // We simulate it by setting a data attribute read by Tailwind darkMode:'media' via CSS override
  try {
    const saved = localStorage.getItem('theme') || localStorage.theme; // 'dark' | 'light' | undefined
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
  } catch (e) {}

  await inject("#site-header", "/assets/header.html");
  await inject("#site-footer", "/assets/footer.html");

  // Generic partial includes: <div data-include="/path/to/file.html"></div>
  try {
    const includeNodes = Array.prototype.slice.call(document.querySelectorAll('[data-include]'));
    await Promise.all(includeNodes.map(async (node) => {
      const url = node.getAttribute('data-include');
      if (!url) return;
      try {
        const res = await fetch(url, { cache: 'no-store' });
        node.innerHTML = await res.text();
      } catch (e) { console.error('Include failed:', url, e); }
    }));
  } catch (e) { console.error(e); }

  // Labels renderer: <div data-labels-for="key"></div> pulls from /assets/labels.json
  try {
    const labelTargets = Array.prototype.slice.call(document.querySelectorAll('[data-labels-for]'));
    if (labelTargets.length) {
      let labelsData = null;
      try {
        const res = await fetch('/assets/labels.json', { cache: 'no-store' });
        labelsData = await res.json();
      } catch (e) { console.error('labels.json load failed', e); }
      if (labelsData) {
        labelTargets.forEach((el) => {
          const key = el.getAttribute('data-labels-for');
          const values = labelsData[key] || labelsData['site'] || [];
          const ul = document.createElement('ul');
          ul.className = 'mt-6 flex flex-wrap gap-3 text-sm text-zinc-500 dark:text-zinc-400';
          values.forEach((t) => {
            const li = document.createElement('li');
            li.className = 'rounded-full border border-zinc-300 dark:border-zinc-700 px-3 py-1';
            li.textContent = t;
            ul.appendChild(li);
          });
          el.innerHTML = '';
          el.appendChild(ul);
        });
      }
    }
  } catch (e) { console.error('labels render failed', e); }

  // Bind theme toggle
  const updateToggleIcon = () => {
    const btn = document.getElementById('themeToggle');
    const forced = document.documentElement.getAttribute('data-theme');
    const isDark = forced ? (forced === 'dark') : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (btn) btn.textContent = isDark ? '🌞' : '🌓';
  };
  updateToggleIcon();
  if (!window.__themeToggleBound) {
    document.addEventListener('click', (e) => {
      const t = e.target && e.target.closest ? e.target.closest('#themeToggle') : null;
      if (!t) return;
      e.preventDefault();
      // Flip forced theme like DevTools: set data-theme to 'dark' or 'light'
      const forced = document.documentElement.getAttribute('data-theme');
      const isDark = forced ? (forced === 'dark') : window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next = isDark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try {
        const val = next;
        localStorage.setItem('theme', val);
        localStorage.theme = val;
      } catch (e) {}
      updateToggleIcon();
    });
    window.__themeToggleBound = true;
  }

  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
});
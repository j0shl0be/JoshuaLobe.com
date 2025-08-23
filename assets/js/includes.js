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
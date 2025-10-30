async function inject(selector, url) {
  const el = document.querySelector(selector);
  if (!el) return;
  try {
    const res = await fetch(url, { cache: "no-store" });
    el.innerHTML = await res.text();
  } catch (e) { console.error("Include failed:", url, e); }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Ensure favicon links exist on all pages
  try {
    const head = document.head;
    const ensureLink = (rel, href, type, sizes) => {
      let link = head.querySelector(`link[rel="${rel}"]${type ? `[type="${type}"]` : ''}${sizes ? `[sizes="${sizes}"]` : ''}`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        if (type) link.type = type;
        if (sizes) link.sizes = sizes;
        head.appendChild(link);
      }
      link.href = href;
    };
    // Primary SVG favicon
    ensureLink('icon', '/assets/favicon.svg', 'image/svg+xml');
    // Register a web app manifest to avoid 404s
    ensureLink('manifest', '/site.webmanifest');
    // Optional: provide an Apple touch icon. Using SVG as a placeholder keeps requests off root.
    // For best results provide a PNG at /apple-touch-icon.png, but this reduces 404 noise.
    ensureLink('apple-touch-icon', '/assets/favicon.svg', 'image/svg+xml', '180x180');
  } catch (e) {}
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
  const renderLabels = async () => {
    try {
      const labelTargets = Array.prototype.slice.call(document.querySelectorAll('[data-labels-for]'));
      if (!labelTargets.length) return;
      let labelsData = null;
      try {
        const res = await fetch('/assets/labels.json', { cache: 'no-store' });
        labelsData = await res.json();
      } catch (e) { console.error('labels.json load failed', e); }
      if (!labelsData) return;
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
    } catch (e) {
      console.error('labels render failed', e);
    }
  };

  // Helper: choose a best-effort image from known assets when p.image is missing
  const pickProjectImage = (p) => {
    if (p && p.image) return p.image;
    if (!p || !p.slug) return '';
    switch (p.slug) {
      case 'kb2040-macropad':
        return '/assets/Images/kb2040/22FCB75C-FBFF-48E4-AC0D-4F8636B1E984.jpg';
      case 'measurement-bot':
        return '/assets/Images/measurement/IMG_0440.jpg';
      case 'robotics-sensing':
        return '/assets/Images/robotics/IMG_4388.jpg';
      case 'mycrofleet':
        return '/assets/Images/mycrofleet/IMG_4249.jpg';
      case 'sonos-controller':
        return '/assets/Images/Sonos/IMG_5203.jpg';
      case 'geotab-intern':
        return '/assets/Images/geotab/card.webp';
      case 'hotdog-robot':
        return '/assets/Images/hotdog/hero.jpg';
      default:
        return '';
    }
  };

  // Projects grid renderer: <div data-projects-grid [data-limit="3"]></div>
  try {
    const gridTargets = Array.prototype.slice.call(document.querySelectorAll('[data-projects-grid]'));
    if (gridTargets.length) {
      let projects = [];
      let site = null;
      try {
        const res = await fetch('/assets/projects.json', { cache: 'no-store' });
        projects = await res.json();
      } catch (e) { console.error('projects.json load failed', e); }
      try {
        const sres = await fetch('/assets/site.json', { cache: 'no-store' });
        site = await sres.json();
      } catch (e) { /* optional */ }
      gridTargets.forEach((el) => {
        const limitAttr = el.getAttribute('data-limit');
        const limit = limitAttr ? parseInt(limitAttr, 10) : undefined;
        let list = [];
        if (el.hasAttribute('data-home-selection') && site && Array.isArray(site.home)) {
          const bySlug = Object.fromEntries(projects.map(p => [p.slug, p]));
          list = site.home.map(slug => bySlug[slug]).filter(Boolean);
        } else {
          list = Array.isArray(projects) ? projects.slice(0, limit || projects.length) : [];
        }
        const container = document.createElement('div');
        container.className = 'mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6';
        list.forEach((p) => {
          const article = document.createElement('article');
          article.className = 'rounded-3xl glow p-5 bg-white dark:bg-zinc-950';

          const media = document.createElement('div');
          media.className = 'aspect-video rounded-2xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden';
          const chosen = pickProjectImage(p);
          if (chosen) {
            const img = document.createElement('img');
            img.src = chosen; img.alt = p.title || '';
            img.loading = 'lazy';
            img.className = 'w-full h-full object-cover';
            // Fallback to .jpg if .webp fails
            img.onerror = function() {
              try {
                if (this.src.endsWith('.webp')) {
                  this.onerror = null;
                  this.src = this.src.replace(/\.webp$/i, '.jpg');
                }
              } catch (e) {}
            };
            media.appendChild(img);
          }
          article.appendChild(media);

          const h3 = document.createElement('h3');
          h3.className = 'mt-4 text-xl font-semibold';
          h3.textContent = p.title || '';
          article.appendChild(h3);

          if (p.description) {
            const d = document.createElement('p');
            d.className = 'mt-2 text-zinc-600 dark:text-zinc-300';
            d.textContent = p.description;
            article.appendChild(d);
          }

          const labels = document.createElement('div');
          labels.setAttribute('data-labels-for', p.labels || 'site');
          article.appendChild(labels);

          if (p.url) {
            const a = document.createElement('a');
            a.className = 'mt-3 inline-block text-blue-600 dark:text-blue-400 hover:underline';
            a.href = p.url; a.textContent = 'Read more';
            article.appendChild(a);
          }

          container.appendChild(article);
        });
        el.innerHTML = '';
        el.appendChild(container);
      });
    }
  } catch (e) { console.error('projects render failed', e); }

  // Render labels last so dynamically created grids get their labels
  await renderLabels();

  // Featured project renderer (index hero):
  try {
    const featureEl = document.querySelector('[data-featured-project]');
    if (featureEl) {
      const [proRes, siteRes] = await Promise.all([
        fetch('/assets/projects.json', { cache: 'no-store' }),
        fetch('/assets/site.json', { cache: 'no-store' })
      ]);
      const pro = await proRes.json();
      const site = await siteRes.json();
      const featuredSlug = featureEl.getAttribute('data-featured-project') || (site && site.featured);
      const item = (Array.isArray(pro) ? pro : []).find(p => p.slug === featuredSlug) || (Array.isArray(pro) ? pro[0] : null);
      if (item) {
        const card = document.createElement('div');
        card.className = 'glow bg-white dark:bg-zinc-950 rounded-3xl p-6 md:p-8 mb-0 flex flex-col gap-8 items-stretch';
        // 1. Info block
        const info = document.createElement('div');
        const k = document.createElement('p'); k.className = 'text-sm uppercase tracking-widest text-zinc-500 mb-1'; k.textContent = 'Featured Build';
        const h = document.createElement('h3'); h.className = 'text-2xl md:text-3xl font-bold mb-2 text-zinc-900 dark:text-zinc-100'; h.textContent = item.title || '';
        const d = document.createElement('p'); d.className = 'mb-3 text-zinc-600 dark:text-zinc-300'; d.textContent = item.description || '';
        info.appendChild(k); info.appendChild(h); info.appendChild(d);
        const a = document.createElement('a'); a.href = item.url || '#'; a.className = 'inline-block text-blue-600 dark:text-blue-400 hover:underline font-semibold'; a.textContent = 'Read more';
        info.appendChild(a);
        card.appendChild(info);
        // 2. Image block
        const chosen = pickProjectImage(item);
        if (chosen) {
          const imageWrap = document.createElement('div');
          imageWrap.className = 'aspect-video rounded-2xl overflow-hidden mt-4';
          const img = document.createElement('img');
          img.src = chosen; img.alt = item.title || '';
          img.loading = 'lazy';
          img.className = 'w-full h-full object-cover';
          // Fallback to .jpg if .webp fails
          img.onerror = function() {
            try {
              if (this.src.endsWith('.webp')) {
                this.onerror = null;
                this.src = this.src.replace(/\.webp$/i, '.jpg');
              }
            } catch (e) {}
          };
          imageWrap.appendChild(img);
          card.appendChild(imageWrap);
        }
        featureEl.innerHTML = '';
        featureEl.appendChild(card);
      }
    }
  } catch (e) { console.error('featured render failed', e); }

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

/**
 * wiki.js — Core JavaScript for the Wiki Engine
 * Handles: routing, search, TOC, tabs, collapsibles,
 *          Desmos embeds, KaTeX rendering, and more.
 */

'use strict';

/* ================================================================
   WIKI CONFIGURATION
   Edit this object to customize your wiki's global settings.
   ================================================================ */
const WIKI_CONFIG = {
  title:        'MyWiki',
  tagline:      'A personal knowledge base',
  rootUrl:      './',           // Relative root (change for subdirectory deploys)
  pagesDir:     'pages/',
  indexPage:    'index.html',
  defaultTheme: 'light',        // 'light' | 'dark' (dark theme: future extension)
  searchIndex:  null,           // Populated by buildSearchIndex()
  sidebarLinks: [
    // { label: 'Section Title', links: [{ text: 'Page Name', href: 'pages/page.html' }] }
    // Populated dynamically or defined per-page via data attribute
  ],
};

/* ================================================================
   PAGE DATA — Each page can expose this via a <script> tag.
   Example (in a page file):
     window.WIKI_PAGE = {
       title: 'My Article',
       category: 'Science',
       tags: ['physics','math'],
       lastEdited: '2024-03-15',
       author: 'Jane Doe',
     };
   ================================================================ */

/* ================================================================
   UTILITY HELPERS
   ================================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ================================================================
   LAYOUT BUILDER — Injects header, sidebar, footer if not present.
   Call Wiki.init() in each page, or let the loader handle it.
   ================================================================ */
const Wiki = {

  /* ── Init ──────────────────────────────────────────────── */
  init() {
    this.buildLayout();
    this.buildTOC();
    this.initTabs();
    this.initCollapsibles();
    this.initSearch();
    this.initMobileMenu();
    this.highlightSidebar();
    this.renderMath();
    this.initDesmosEmbeds();
    this.initGalleryLightbox();
    this.initScrollSpy();
    this.initTheme();
    this.markExternalLinks();
  },

  /* ── Build Layout Shell ────────────────────────────────── */
  buildLayout() {
    // Header
    if (!$('#wiki-header')) {
      const header = document.createElement('header');
      header.id = 'wiki-header';
      header.innerHTML = this._headerHTML();
      document.body.insertBefore(header, document.body.firstChild);
    }

    // Footer
    if (!$('#wiki-footer')) {
      const footer = document.createElement('footer');
      footer.id = 'wiki-footer';
      footer.innerHTML = this._footerHTML();
      document.body.appendChild(footer);
    }

    // Wrap content in layout if not already wrapped
    if (!$('#wiki-layout')) {
      const mainContent = $('#wiki-content');
      if (!mainContent) return;

      const layout = document.createElement('div');
      layout.id = 'wiki-layout';

      // Left sidebar
      const sidebar = document.createElement('nav');
      sidebar.id = 'wiki-sidebar';
      sidebar.setAttribute('aria-label', 'Site Navigation');
      sidebar.innerHTML = this._sidebarHTML();

      // Right TOC sidebar
      const tocSidebar = document.createElement('aside');
      tocSidebar.id = 'wiki-toc-sidebar';
      tocSidebar.setAttribute('aria-label', 'Table of Contents');

      mainContent.parentNode.insertBefore(layout, mainContent);
      layout.appendChild(sidebar);
      layout.appendChild(mainContent);
      layout.appendChild(tocSidebar);
    }

    // Update page title
    const pageData = window.WIKI_PAGE || {};
    if (pageData.title) {
      document.title = `${pageData.title} — ${WIKI_CONFIG.title}`;
    }
  },

  _headerHTML() {
    return `
      <div class="header-inner">
        <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Toggle navigation">☰</button>
        <a class="site-title" href="${WIKI_CONFIG.rootUrl}${WIKI_CONFIG.indexPage}">
          ${escapeHtml(WIKI_CONFIG.title)}<span>.</span>
        </a>
        <div class="header-search">
          <div class="wiki-search-bar">
            <input type="search" id="header-search-input" placeholder="Search articles…" autocomplete="off" aria-label="Search">
            <button id="header-search-btn" aria-label="Submit search">⌕</button>
          </div>
        </div>
        <nav aria-label="Header navigation">
          <a href="${WIKI_CONFIG.rootUrl}${WIKI_CONFIG.indexPage}">Home</a>
          <a href="${WIKI_CONFIG.rootUrl}pages/categories.html">Categories</a>
          <a href="${WIKI_CONFIG.rootUrl}pages/recent.html">Recent</a>
          <a href="${WIKI_CONFIG.rootUrl}pages/about.html">About</a>
        </nav>
      </div>`;
  },

  _footerHTML() {
    const year = new Date().getFullYear();
    return `
      <p>${escapeHtml(WIKI_CONFIG.title)} &mdash; ${escapeHtml(WIKI_CONFIG.tagline)}</p>
      <p>&copy; ${year} &middot; Built with <a href="https://github.com">GitHub Pages</a></p>`;
  },

  _sidebarHTML() {
    // Pages can override WIKI_CONFIG.sidebarLinks
    const sections = window.WIKI_SIDEBAR || WIKI_CONFIG.sidebarLinks;
    if (!sections || sections.length === 0) return '<p style="color:var(--text-light);font-size:0.8rem;padding:0.5rem">No sidebar defined.</p>';

    return sections.map(sec => `
      <div class="sidebar-section">
        <div class="sidebar-section-title">${escapeHtml(sec.label)}</div>
        <ul class="sidebar-nav">
          ${sec.links.map(l => `
            <li><a href="${l.href}" ${l.href === window.location.pathname.split('/').pop() ? 'class="active"' : ''}>${escapeHtml(l.text)}</a></li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  },

  /* ── Sidebar highlight ─────────────────────────────────── */
  highlightSidebar() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    $$('#wiki-sidebar .sidebar-nav a').forEach(a => {
      const href = a.getAttribute('href').split('/').pop();
      if (href === currentPage) a.classList.add('active');
    });
  },

  /* ── Table of Contents ─────────────────────────────────── */
  buildTOC() {
    const content = $('#wiki-content');
    if (!content) return;

    const headings = $$('h2, h3, h4', content);
    if (headings.length < 3) return;

    const items = headings.map((h, i) => {
      // Auto-generate IDs
      if (!h.id) h.id = slugify(h.textContent) + '-' + i;
      return { id: h.id, text: h.textContent.replace(/\[.*?\]/g, '').trim(), level: parseInt(h.tagName[1]) };
    });

    // Build floating TOC (inside content)
    const floatingTocEl = $('.wiki-toc.floating', content);
    if (floatingTocEl) {
      floatingTocEl.innerHTML = this._tocHTML(items, true);
      this._initTocToggle(floatingTocEl);
    }

    // Build sidebar TOC
    const tocSidebar = $('#wiki-toc-sidebar');
    if (tocSidebar) {
      tocSidebar.innerHTML = `
        <div class="toc-sidebar-title">On This Page</div>
        <ul class="toc-sidebar-list">${this._tocSidebarItems(items)}</ul>`;
    }
  },

  _tocHTML(items, collapsible = false) {
    const list = this._buildNestedTOC(items);
    return `
      <div class="wiki-toc-title">Contents</div>
      ${list}`;
  },

  _buildNestedTOC(items) {
    let html = '<ol>';
    let prevLevel = 2;
    items.forEach(item => {
      if (item.level > prevLevel) html += '<ol>'.repeat(item.level - prevLevel);
      else if (item.level < prevLevel) html += '</ol>'.repeat(prevLevel - item.level);
      html += `<li class="toc-h${item.level}"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`;
      prevLevel = item.level;
    });
    html += '</ol>'.repeat(Math.max(prevLevel - 1, 1));
    return html;
  },

  _tocSidebarItems(items) {
    return items.map(item =>
      `<li><a href="#${item.id}" class="toc-h${item.level}">${escapeHtml(item.text)}</a></li>`
    ).join('');
  },

  _initTocToggle(tocEl) {
    const title = $('.wiki-toc-title', tocEl);
    if (title) {
      title.addEventListener('click', () => tocEl.classList.toggle('collapsed'));
    }
  },

  /* ── Scroll Spy ────────────────────────────────────────── */
  initScrollSpy() {
    const links = $$('.toc-sidebar-list a');
    if (!links.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(l => l.classList.remove('active'));
          const active = links.find(l => l.getAttribute('href') === '#' + entry.target.id);
          if (active) active.classList.add('active');
        }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });

    $$('h2[id], h3[id], h4[id]').forEach(h => observer.observe(h));
  },

  /* ── Tabs ──────────────────────────────────────────────── */
  initTabs() {
    $$('.wiki-tabs').forEach(tabContainer => {
      const buttons = $$('.wiki-tab-btn', tabContainer);
      const panels  = $$('.wiki-tab-panel', tabContainer);

      // Activate first tab
      if (buttons[0]) { buttons[0].classList.add('active'); }
      if (panels[0])  { panels[0].classList.add('active'); }

      buttons.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => b.classList.remove('active'));
          panels.forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          if (panels[i]) panels[i].classList.add('active');
        });
      });
    });
  },

  /* ── Collapsibles ──────────────────────────────────────── */
  initCollapsibles() {
    $$('.wiki-collapsible').forEach(col => {
      const header = $('.wiki-collapsible-header', col);
      if (!header) return;

      // Add icon if not present
      if (!$('.wiki-collapsible-icon', header)) {
        const icon = document.createElement('span');
        icon.className = 'wiki-collapsible-icon';
        icon.textContent = '▼';
        header.appendChild(icon);
      }

      header.addEventListener('click', () => col.classList.toggle('open'));
    });
  },

  /* ── Search ────────────────────────────────────────────── */
  initSearch() {
    this.buildSearchIndex();

    const input = $('#header-search-input');
    const btn   = $('#header-search-btn');

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-box" role="dialog" aria-label="Search">
        <div class="search-box-input">
          <input type="search" id="search-overlay-input" placeholder="Search articles…" autocomplete="off" autofocus>
          <button class="search-box-close" id="search-close-btn" aria-label="Close search">✕</button>
        </div>
        <div class="search-results" id="search-results" role="listbox"></div>
      </div>`;
    document.body.appendChild(overlay);

    const overlayInput = $('#search-overlay-input');
    const results      = $('#search-results');
    const closeBtn     = $('#search-close-btn');

    const openSearch = () => {
      overlay.classList.add('active');
      overlayInput.value = input ? input.value : '';
      overlayInput.focus();
      this._runSearch(overlayInput.value, results);
    };

    const closeSearch = () => {
      overlay.classList.remove('active');
      if (input) input.value = '';
    };

    if (input)  input.addEventListener('focus', openSearch);
    if (btn)    btn.addEventListener('click', openSearch);
    closeBtn.addEventListener('click', closeSearch);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
    overlayInput.addEventListener('input', () => this._runSearch(overlayInput.value, results));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });
  },

  buildSearchIndex() {
    // Pages define their search data via window.WIKI_SEARCH_PAGES
    // Format: [{ title, url, desc, tags }]
    WIKI_CONFIG.searchIndex = window.WIKI_SEARCH_PAGES || [];
  },

  _runSearch(query, resultsEl) {
    if (!query.trim()) {
      resultsEl.innerHTML = '<div class="search-empty">Start typing to search…</div>';
      return;
    }
    const q = query.toLowerCase();
    const matches = (WIKI_CONFIG.searchIndex || []).filter(p =>
      (p.title + ' ' + (p.desc || '') + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(q)
    ).slice(0, 10);

    if (!matches.length) {
      resultsEl.innerHTML = `<div class="search-empty">No results for "<strong>${escapeHtml(query)}</strong>".</div>`;
      return;
    }

    resultsEl.innerHTML = matches.map(m => `
      <div class="search-result-item" role="option" tabindex="0" data-url="${escapeHtml(m.url)}">
        <div class="search-result-title">${escapeHtml(m.title)}</div>
        ${m.desc ? `<div class="search-result-desc">${escapeHtml(m.desc)}</div>` : ''}
      </div>`).join('');

    $$('.search-result-item', resultsEl).forEach(item => {
      item.addEventListener('click', () => { window.location.href = item.dataset.url; });
      item.addEventListener('keydown', e => { if (e.key === 'Enter') window.location.href = item.dataset.url; });
    });
  },

  /* ── Mobile Menu ───────────────────────────────────────── */
  initMobileMenu() {
    const btn     = $('#mobile-menu-btn');
    const sidebar = $('#wiki-sidebar');
    if (!btn || !sidebar) return;

    btn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', e => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== btn) {
        sidebar.classList.remove('open');
      }
    });
  },

  /* ── KaTeX / LaTeX ─────────────────────────────────────── */
  renderMath() {
    if (typeof renderMathInElement === 'undefined') return;
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$',  right: '$$',  display: true  },
        { left: '\\[', right: '\\]', display: true  },
        { left: '$',   right: '$',   display: false },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
      trust: false,
    });
  },

  /* ── Desmos Embeds ─────────────────────────────────────── */
  initDesmosEmbeds() {
    if (typeof Desmos === 'undefined') return;

    $$('.wiki-desmos[data-exprs]').forEach(container => {
      const iframeEl = $('iframe', container);
      if (!iframeEl) return;

      // If Desmos JS is loaded, replace iframe with live calculator
      try {
        const exprs = JSON.parse(container.dataset.exprs || '[]');
        const opts = JSON.parse(container.dataset.opts || '{}');
        const calc = Desmos.GraphingCalculator(iframeEl, {
          lockViewport: false,
          expressions: true,
          keypad: true,
          ...opts,
        });
        exprs.forEach((expr, i) => {
          calc.setExpression({ id: 'e' + i, latex: expr.latex || expr, color: expr.color });
        });
        iframeEl.style.border = 'none';
      } catch (e) {
        console.warn('Desmos embed error:', e);
      }
    });
  },

  /* ── Gallery Lightbox ──────────────────────────────────── */
  initGalleryLightbox() {
    const images = $$('.wiki-gallery-item img, .wiki-figure img');
    if (!images.length) return;

    const lb = document.createElement('div');
    lb.id = 'wiki-lightbox';
    lb.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;align-items:center;justify-content:center;cursor:zoom-out;';
    lb.innerHTML = `
      <img id="lb-img" style="max-width:90vw;max-height:90vh;object-fit:contain;border-radius:3px;box-shadow:0 4px 40px rgba(0,0,0,0.5);">
      <p id="lb-cap" style="position:absolute;bottom:1.5rem;left:50%;transform:translateX(-50%);color:#ccc;font-size:0.85rem;font-style:italic;text-align:center;max-width:60ch;"></p>`;
    document.body.appendChild(lb);

    const lbImg = $('#lb-img');
    const lbCap = $('#lb-cap');

    images.forEach(img => {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', () => {
        lbImg.src = img.src;
        lbCap.textContent = img.alt || img.closest('figure')?.querySelector('figcaption')?.textContent || '';
        lb.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      });
    });

    lb.addEventListener('click', () => {
      lb.style.display = 'none';
      document.body.style.overflow = '';
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lb.style.display === 'flex') {
        lb.style.display = 'none';
        document.body.style.overflow = '';
      }
    });
  },

  /* ── Theme ─────────────────────────────────────────────── */
  initTheme() {
    const saved = localStorage.getItem('wiki-theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
  },

  toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('wiki-theme', isDark ? 'dark' : 'light');
  },

  /* ── External Links ────────────────────────────────────── */
  markExternalLinks() {
    $$('a[href^="http"]').forEach(a => {
      if (!a.hostname || a.hostname === window.location.hostname) return;
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
      if (!a.querySelector('.ext-icon')) {
        a.insertAdjacentHTML('beforeend', ' <sup style="font-size:0.65em;opacity:0.6">↗</sup>');
      }
    });
  },
};

/* ================================================================
   COMPONENT HELPERS — Call these from page scripts.
   ================================================================ */

/**
 * Create a Desmos embed element.
 * @param {string} containerId - ID of the div to embed into
 * @param {Array}  expressions  - Array of { latex, color } objects or raw latex strings
 * @param {Object} options      - Desmos calculator options
 */
function wikiDesmos(containerId, expressions = [], options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof Desmos !== 'undefined') {
    const calc = Desmos.GraphingCalculator(container, {
      lockViewport: false,
      expressions: true,
      keypad: false,
      ...options,
    });
    expressions.forEach((expr, i) => {
      calc.setExpression({
        id: 'eq' + i,
        latex: typeof expr === 'string' ? expr : expr.latex,
        color: expr.color || Desmos.Colors.BLUE,
      });
    });
    return calc;
  } else {
    // Fallback: show a link to Desmos
    const latex = expressions.map(e => typeof e === 'string' ? e : e.latex).join(', ');
    container.innerHTML = `<div style="padding:1rem;color:var(--text-muted);font-size:0.9rem">
      📈 <strong>Desmos graph:</strong> ${escapeHtml(latex)}<br>
      <a href="https://www.desmos.com/calculator" target="_blank" rel="noopener">Open in Desmos ↗</a>
    </div>`;
  }
}

/**
 * Render an inline Desmos calculator from a block element.
 * Usage in HTML:
 * <div class="wiki-desmos" data-height="400"
 *      data-exprs='[{"latex":"y=x^2","color":"#c74440"}]'>
 *   <iframe height="400" style="width:100%"></iframe>
 * </div>
 */
function wikiInitAllDesmos() {
  $$('.wiki-desmos[data-exprs]').forEach(el => {
    const height  = el.dataset.height || 400;
    const exprs   = JSON.parse(el.dataset.exprs || '[]');
    const opts    = JSON.parse(el.dataset.opts   || '{}');

    el.style.height = height + 'px';
    el.style.minHeight = height + 'px';

    if (typeof Desmos !== 'undefined') {
      // Clear iframe, use div directly
      el.innerHTML = '';
      const calc = Desmos.GraphingCalculator(el, opts);
      exprs.forEach((expr, i) => {
        calc.setExpression({ id: 'e' + i, latex: expr.latex || expr, color: expr.color });
      });
    }
  });
}

/* ================================================================
   AUTO-INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  Wiki.init();

  // Init any Desmos blocks not caught in init (in case Desmos loaded late)
  if (typeof Desmos !== 'undefined') {
    wikiInitAllDesmos();
  } else {
    // Desmos loads async; wait for it
    window.addEventListener('load', () => {
      if (typeof Desmos !== 'undefined') wikiInitAllDesmos();
    });
  }
});

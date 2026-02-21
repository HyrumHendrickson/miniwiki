# MyWiki

A personal static wiki built with plain HTML, CSS, and JavaScript.  
No server, no database, no build step — just files.  
Deploy to GitHub Pages in minutes.

---

## Features

- **LaTeX mathematics** via [KaTeX](https://katex.org) — inline `$...$` and display `$$...$$`
- **Interactive Desmos graphs** via the [Desmos API](https://www.desmos.com/api)
- **Rich components** — infoboxes, callouts, tabs, collapsibles, timelines, galleries, comparison tables, card grids, floating TOC, and more
- **Client-side search** — no backend required
- **Responsive layout** — three-column (sidebar + content + TOC) that collapses on mobile
- **Auto lightbox** — click any image to view full-size
- **Scroll spy TOC** — highlights your current section as you scroll
- **Print-friendly** — dedicated print stylesheet

---

## Directory Structure

```
wiki/
├── index.html                  ← Homepage
├── README.md
├── assets/
│   ├── css/
│   │   └── wiki.css            ← All styles (one file)
│   ├── js/
│   │   └── wiki.js             ← All JavaScript (one file)
│   └── media/
│       └── placeholder.svg     ← Put images, videos, PDFs here
├── pages/                      ← All article pages
│   ├── article-template.html   ← Copy this for new articles
│   ├── math-demo.html          ← LaTeX examples
│   ├── desmos-demo.html        ← Desmos examples
│   ├── components.html         ← All components demo
│   ├── science-example.html    ← Example: physics article
│   ├── history-example.html    ← Example: history article
│   ├── categories.html
│   ├── recent.html
│   └── about.html
└── templates/
    └── components-snippets.html ← Copy-paste component HTML
```

---

## Getting Started

### 1. Clone or download

```bash
git clone https://github.com/yourusername/wiki.git
cd wiki
```

### 2. Open locally

Open `index.html` in a browser. Everything works from the file system.  
For Desmos and search to work fully, serve with a local HTTP server:

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then visit `http://localhost:8080`.

### 3. Add an article

1. Copy `pages/article-template.html` to `pages/my-article.html`
2. Replace the title, content, sidebar, and page meta
3. Add the page to `window.WIKI_SEARCH_PAGES` in `index.html`
4. Link it from the sidebar of related pages

### 4. Deploy to GitHub Pages

1. Push the entire `wiki/` folder to a GitHub repository
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch → main → / (root)**
4. Your site will be live at `https://yourusername.github.io/wiki/`

---

## Writing Math

Include the KaTeX CDN links (already in all templates):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
```

Then write LaTeX anywhere in content:

```html
<p>Inline: $E = mc^2$</p>

<p>Display:</p>
$$\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$$
```

---

## Embedding Desmos

Include the Desmos API (already in templates):

```html
<script src="https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
```

**Declarative** (simplest):

```html
<div class="wiki-desmos"
     data-exprs='[{"latex":"y=\\sin(x)","color":"#c74440"}]'
     style="height:400px;">
</div>
```

**Programmatic** (more control, sliders, etc.):

```html
<div id="my-graph" style="height:400px;"></div>
<script>
document.addEventListener('DOMContentLoaded', () => {
  const calc = wikiDesmos('my-graph', [], { keypad: false });
  calc.setExpression({ id: 'a', latex: 'a=1', sliderBounds: { min:-3, max:3 } });
  calc.setExpression({ id: 'f', latex: 'y = a*sin(x)' });
});
</script>
```

---

## Sidebar Configuration

Each page defines its own sidebar via `window.WIKI_SIDEBAR`:

```javascript
window.WIKI_SIDEBAR = [
  {
    label: 'Navigation',
    links: [
      { text: '🏠 Home',       href: '../index.html' },
      { text: '📚 Categories', href: 'categories.html' },
    ]
  },
  {
    label: 'This Section',
    links: [
      { text: 'My Article',    href: 'my-article.html' },
    ]
  }
];
```

---

## Search Index

Register pages for search in `index.html`:

```javascript
window.WIKI_SEARCH_PAGES = [
  {
    title: 'My Article',
    url:   'pages/my-article.html',
    desc:  'Brief description shown in results.',
    tags:  ['keyword', 'another-keyword']
  },
  // ... more pages
];
```

---

## Component Quick Reference

| Component          | Class / Usage                              |
|--------------------|--------------------------------------------|
| Infobox            | `.wiki-infobox`                            |
| Callout            | `.wiki-callout.note/info/warning/danger`   |
| Table              | `.wiki-table` in `.wiki-table-wrap`        |
| Tabs               | `.wiki-tabs` > `.wiki-tab-nav` + panels    |
| Collapsible        | `.wiki-collapsible`                        |
| Timeline           | `.wiki-timeline` > `.wiki-timeline-item`   |
| Comparison table   | `.wiki-comparison`                         |
| Gallery            | `.wiki-gallery.cols-2/3/4`                 |
| Card grid          | `.wiki-card-grid.cols-2/3`                 |
| Figure (float)     | `.wiki-figure.right` / `.wiki-figure.left` |
| Floating TOC       | `.wiki-toc.floating`                       |
| Hatnote            | `.wiki-hatnote`                            |
| Stub notice        | `.wiki-stub`                               |
| Redirect notice    | `.wiki-redirect-notice`                    |
| Inline citation    | `<a class="wiki-ref" href="#ref-N">[N]</a>`|
| Tags               | `.wiki-tags` > `.wiki-tag`                 |
| Breadcrumb         | `.wiki-breadcrumb`                         |
| Page meta          | `.wiki-page-meta`                          |

See `templates/components-snippets.html` for copy-paste HTML for each component.  
See `pages/components.html` for a live demo of all components.

---

## API Key Note

The Desmos API key in the templates (`dcb31709b452b1cf9dc26972add0fda6`) is the public demo key provided by Desmos, suitable for personal/non-commercial wikis. For a high-traffic or commercial site, register for your own key at [desmos.com/api](https://www.desmos.com/api).

---

## License

MIT License — use freely, attribute appreciated.

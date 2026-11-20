// Generates one static, indexable page per lesson and public-domain song, plus sitemap.xml and robots.txt.
//   node tools/seo.mjs https://<your-username>.github.io/concentric
// Re-run whenever lessons change. Copyrighted songs, anthems and Create templates get no page.
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { CURRICULUM } from '../js/content.js';

const BASE = (process.argv[2] || process.env.SITE_URL || 'https://sunboo.github.io/musiconwheels').replace(/\/$/, '');
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = id => id.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const items = CURRICULUM.filter(i => !i.isCreate && !i.locked && i.shareable !== false && (!i.isFamousSong || i.rights === 'pd'));

rmSync('learn', { recursive: true, force: true });
mkdirSync('learn', { recursive: true });
const page = it => {
  const title = `${it.title.replace(/^\d+(\.\d+)?\s*/, '')} — see it on a circle | Concentric`;
  const desc = (it.hook || '').slice(0, 155);
  const scenes = (it.scenes || []).map(s => `<li><strong>${esc(s.label)}:</strong> ${esc(s.hook)}</li>`).join('');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${BASE}/learn/${slug(it.id)}.html">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${BASE}/icons/og.jpg">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'LearningResource', name: it.title, description: it.hook, educationalLevel: 'Beginner', learningResourceType: 'Interactive', isAccessibleForFree: true, url: `${BASE}/learn/${slug(it.id)}.html` })}</script>
<style>body{font:17px/1.6 Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0b0d11;color:#e5e7eb;max-width:760px;margin:0 auto;padding:28px 20px}h1{color:#fff;line-height:1.2}a{color:#fbbf24}.cta{display:inline-block;background:#fbbf24;color:#0b0d11;font-weight:700;padding:12px 18px;border-radius:12px;text-decoration:none;margin:12px 0}iframe{width:100%;height:560px;border:0;border-radius:16px;background:#111}small{color:#9ca3af}</style></head>
<body>
<p><a href="../">Concentric</a> · <small>${esc(it.group)}</small></p>
<h1>${esc(it.title)}</h1>
<p>${esc(it.hook)}</p>
<a class="cta" href="../?item=${encodeURIComponent(it.id)}">▶ Open it on the circle</a>
<iframe src="../?item=${encodeURIComponent(it.id)}&amp;embed=1" title="${esc(it.title)} — interactive" loading="lazy" allow="autoplay"></iframe>
${it.behindSound ? `<h2>Why it works</h2><p>${esc(it.behindSound)}</p>` : ''}
${scenes ? `<h2>Compare</h2><ul>${scenes}</ul>` : ''}
${it.tryPrompt ? `<h2>Try it</h2><p>${esc(it.tryPrompt)}</p>` : ''}
<p><small>Source: ${esc(it.source)}</small></p>
</body></html>`;
};
items.forEach(it => writeFileSync(`learn/${slug(it.id)}.html`, page(it)));
writeFileSync('learn/index.html', `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>All lessons and songs | Concentric</title><meta name="description" content="Music theory lessons and public-domain songs you can see, hear and edit on a circle."><link rel="canonical" href="${BASE}/learn/"><style>body{font:17px/1.6 system-ui,sans-serif;background:#0b0d11;color:#e5e7eb;max-width:760px;margin:0 auto;padding:28px 20px}a{color:#fbbf24}h2{color:#fff}</style></head><body><h1 style="color:#fff">Concentric: every lesson and song</h1>${[...new Set(items.map(i => i.group))].map(g => `<h2>${esc(g)}</h2><ul>${items.filter(i => i.group === g).map(i => `<li><a href="${slug(i.id)}.html">${esc(i.title)}</a></li>`).join('')}</ul>`).join('')}<p><a href="../">Open the app →</a></p></body></html>`);
const urls = [`${BASE}/`, `${BASE}/learn/`, ...items.map(i => `${BASE}/learn/${slug(i.id)}.html`), `${BASE}/privacy.html`, `${BASE}/terms.html`];
writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
console.log(`${items.length} pages → learn/, sitemap.xml (${urls.length} URLs), robots.txt · base ${BASE}`);

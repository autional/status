/**
 * 构建期「按路由出静态 HTML」的头部改写工具（2026-10-30）。
 *
 * 为什么需要：本仓是纯 SPA，所有路径都回同一份 index.html。于是
 *   - `<link rel="canonical">` 在**每一页**都写着首页 URL；
 *   - `<meta property="og:url">` 同理；
 *   - 不跑 JS 的抓取器（社交/IM/AI/部分 SEO 工具）看到的就是「所有页面都是首页」。
 * Googlebot 会执行 JS 并在运行期由 page-meta 改正，但其它抓取器不会 —— 这是
 * 「sitemap 说这页是 X，HTML 说这页是首页」的直接矛盾。
 *
 * 做法：构建后把 dist/index.html 复制成 dist/<route>/index.html，逐页改写头部；
 * 另出一份 dist/spa.html 供动态路由兜底（**去掉** canonical / og:url，
 * 「没有 canonical」远比「错误 canonical」安全）。
 *
 * 所有改写都 fail-closed：匹配不到即抛错，防止模板演进后静默漏改。
 */

/** 区域兄弟站：.cn ↔ .com（同源码双区，hreflang 互指）。 */
export function siblingSiteUrl(siteUrl) {
  const u = new URL(siteUrl);
  const host = u.host;
  if (host.endsWith('.cn')) return siteUrl.replace(/\.cn(\/|$)/, '.com$1');
  if (host.endsWith('.com')) return siteUrl.replace(/\.com(\/|$)/, '.cn$1');
  return siteUrl;
}

function replaceOnce(html, re, repl, label) {
  if (!re.test(html)) {
    throw new Error(`[route-html] 未匹配到 ${label}（index.html 结构变了？）`);
  }
  return html.replace(re, repl);
}

const RX = {
  title: /<title>[\s\S]*?<\/title>/,
  description: /(<meta name="description" content=")[^"]*(")/,
  canonical: /(<link rel="canonical" href=")[^"]*(")/,
  rss: /(<link rel="alternate" type="application\/rss\+xml" title=")[^"]*(" href=")[^"]*(")/,
  ogTitle: /(<meta property="og:title" content=")[^"]*(")/,
  ogDescription: /(<meta property="og:description" content=")[^"]*(")/,
  ogUrl: /(<meta property="og:url" content=")[^"]*(")/,
  twitterTitle: /(<meta name="twitter:title" content=")[^"]*(")/,
  twitterDescription: /(<meta name="twitter:description" content=")[^"]*(")/,
};

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * hreflang 三行：zh-CN / en-US / x-default。
 * x-default 指 .com（全球面；.cn 面向中国大陆客户群体）。
 */
function hreflangLinks(siteUrl, siblingUrl, path) {
  // 首页必须带尾斜杠，与 canonical 逐字一致（hreflang 指向的 URL 应与 canonical 相同）。
  const suffix = path === '/' ? '/' : path;
  const self = `${siteUrl}${suffix}`;
  const sibling = `${siblingUrl}${suffix}`;
  const zh = siteUrl.includes('.cn') ? self : sibling;
  const en = siteUrl.includes('.cn') ? sibling : self;
  return [
    `<link rel="alternate" hreflang="zh-CN" href="${zh}" />`,
    `<link rel="alternate" hreflang="en-US" href="${en}" />`,
    `<link rel="alternate" hreflang="x-default" href="${en}" />`,
  ].join('\n    ');
}

/**
 * 按路由改写首页头部。
 *
 * @param {string} html dist/index.html 原文
 * @param {object} opts
 * @param {string} opts.siteUrl  本站基址（无尾斜杠）
 * @param {string} opts.siblingUrl 兄弟站基址（无尾斜杠）
 * @param {string} opts.path     路由路径（'/' 或 '/incidents'）
 * @param {string} [opts.title]  页面标题（空则保留区域默认）
 * @param {string} [opts.description] 页面描述（空则保留区域默认）
 * @param {string} opts.rssTitle RSS 自动发现链接 title
 */
export function applyRouteHead(html, { siteUrl, siblingUrl, path, title, description, rssTitle }) {
  const url = `${siteUrl}${path === '/' ? '/' : path}`;
  let out = html;

  if (title) {
    out = replaceOnce(out, RX.title, `<title>${escapeAttr(title)}</title>`, 'title');
    out = replaceOnce(out, RX.ogTitle, `$1${escapeAttr(title)}$2`, 'og:title');
    out = replaceOnce(out, RX.twitterTitle, `$1${escapeAttr(title)}$2`, 'twitter:title');
  }
  if (description) {
    out = replaceOnce(out, RX.description, `$1${escapeAttr(description)}$2`, 'description');
    out = replaceOnce(out, RX.ogDescription, `$1${escapeAttr(description)}$2`, 'og:description');
    out = replaceOnce(out, RX.twitterDescription, `$1${escapeAttr(description)}$2`, 'twitter:description');
  }

  out = replaceOnce(out, RX.canonical, `$1${url}$2`, 'canonical');
  out = replaceOnce(out, RX.ogUrl, `$1${url}$2`, 'og:url');
  // RSS 自动发现：有 feed 的站点（status）按区域改标题与地址；无 feed 的站点（trust）跳过。
  if (rssTitle && RX.rss.test(out)) {
    out = replaceOnce(out, RX.rss, `$1${escapeAttr(rssTitle)}$2/feed.xml$3`, 'rss alternate');
  }

  // hreflang 紧跟在 canonical 之后（顺序无规范要求，但便于人读与 diff）。
  out = out.replace(
    /(\s*<link rel="canonical" href="[^"]*" \/>)/,
    `$1\n    ${hreflangLinks(siteUrl, siblingUrl, path)}`,
  );

  return out;
}

/**
 * 动态路由兜底壳：去掉「只对首页成立」的 canonical / og:url，
 * 以及 hreflang（它必须按具体路径生成，静态壳里无法知道路径）。
 * 保留 title/description（区域默认，运行期会覆盖）与 RSS alternate（对每页都成立）。
 */
export function stripRouteIdentity(html) {
  return html
    .replace(/\s*<link rel="canonical" href="[^"]*" \/>/, '')
    .replace(/\s*<meta property="og:url" content="[^"]*" \/>/, '')
    .replace(/\s*<link rel="alternate" hreflang="[^"]*" href="[^"]*" \/>/g, '');
}

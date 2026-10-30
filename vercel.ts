import { routes, type Rewrite, type VercelConfig } from '@vercel/config/v1';

/**
 * 门户入口（status.autional.com / status.autional.cn）的**唯一源站**（B3 单源双区）。
 *
 * 上游 API origin 值 **不写入本仓**，取自 Vercel 项目环境变量 `API_ORIGIN`
 * （cn 项目 = https://api.autional.cn，com 项目 = https://api.autional.com）。
 * 未设置时 **故意抛错**（fail-closed），避免静默产出坏路由。
 *
 * rewrites 承接原 vercel.json 全集；`/ready` 与 `/feed.xml` 为 com 线旧版缺失的两条
 * （cn 形态为准，支线 #24 回正）。SPA 兜底指向 `/spa.html`、放行 text/html 与 * / *、
 * 并排除资产/带扩展名路径（缺失资产仍是真 404）——详见 spaFallback 上方注释。
 */
const rawOrigin = process.env.API_ORIGIN;

if (!rawOrigin) {
  throw new Error(
    '[status] 缺少环境变量 API_ORIGIN（Vercel 项目设置里配置后重新部署）',
  );
}

const ORIGIN = rawOrigin.replace(/\/+$/, '');

const NO_CACHE = 'public, max-age=0, must-revalidate';
const IMMUTABLE = 'public, max-age=31536000, immutable';

/**
 * SPA 兜底（2026-10-30 修订，两处必读）。
 *
 * 1) 目的文件 `/index.html` → `/spa.html`。
 *    构建期已按路由生成 `dist/<route>/index.html`（vite.config.ts staticRouteHtmlPlugin），
 *    sitemap 里的公开路由由文件系统直接命中；本兜底只服务**动态路由**
 *    （/incidents/:id、/maintenance/:id、/services/:id）与未知路径。
 *    `spa.html` 不含 canonical / og:url —— 静态壳不知道真实路径，
 *    「没有 canonical」远好过「错误 canonical（每页都指首页）」。
 *
 * 2) Accept 条件从 `text/html` 放宽到 `text/html` 或 `* / *`，并排除资产/带扩展名的路径。
 *    旧条件只认 text/html ⇒ 社交/IM/AI 抓取器（facebookexternalhit / Twitterbot / Slack，
 *    以及 curl 默认）请求深链一律 404 text/plain，分享卡片全挂（实测线上）。
 *    排除正则保证缺失的 `/assets/*.js`（浏览器请求带 `* / *`）仍是真 404，
 *    不会被兜成 200 的 HTML —— 这正是旧条件原本要防的事。
 */
const spaFallback: Rewrite = {
  // 排除「任一段带点」的路径（/assets/*.js、/sitemap.xml、/favicon.ico…），其余交给 SPA 壳。
  //
  // ⚠ 不要用负向前瞻：`^/(?!assets/|.*\.[a-z0-9]+$).*$` 会被 @vercel/config 拒绝 ——
  //   `Invalid path-to-regexp pattern: Negative lookaheads must be wrapped in a group`，
  //   而「包一层」的写法在 path-to-regexp v6 里又匹配不到普通路径（实测全 skip）。
  //   正确做法 = 用参数内联正则表达「非点段」：`(?:[^./]+/)*[^./]*`。
  source: '/:path((?:[^./]+/)*[^./]*)',
  destination: '/spa.html',
  has: [{ type: 'header', key: 'accept', value: { re: 'text/html|\\*/\\*' } }],
};

// 守卫自证：兜底必须排最后、必须排除「带点的段」、必须放行非 text/html 抓取器。
// 改这三行之前先读上面的注释（线上分享卡片曾因此整片 404；负向前瞻会被平台拒绝）。
if (!String(spaFallback.source ?? '').includes('[^./]')) {
  throw new Error('[status] SPA 兜底 source 必须排除「带点的段」（见 spaFallback 注释）');
}
if (spaFallback.destination !== '/spa.html') {
  throw new Error('[status] SPA 兜底必须指向 /spa.html（不含 canonical 的壳）');
}
const acceptRule = JSON.stringify(spaFallback.has ?? []);
if (!acceptRule.includes('text/html') || !acceptRule.includes('*')) {
  throw new Error('[status] SPA 兜底必须同时放行 text/html 与 */*（否则社交抓取器 404）');
}

export const config: VercelConfig = {
  framework: 'vite',
  installCommand: 'pnpm install --frozen-lockfile',
  buildCommand: 'pnpm --filter @autional/status-page... build',
  outputDirectory: 'apps/status-page/dist',
  headers: [
    routes.header('/assets/(.*)', [{ key: 'Cache-Control', value: IMMUTABLE }]),
    routes.header('/workbox-(.*).js', [{ key: 'Cache-Control', value: IMMUTABLE }]),
    routes.header('/', [{ key: 'Cache-Control', value: NO_CACHE }]),
    routes.header('/index.html', [{ key: 'Cache-Control', value: NO_CACHE }]),
    routes.header('/sw.js', [{ key: 'Cache-Control', value: NO_CACHE }]),
    routes.header('/registerSW.js', [{ key: 'Cache-Control', value: NO_CACHE }]),
    routes.header('/manifest.webmanifest', [{ key: 'Cache-Control', value: NO_CACHE }]),
    routes.header('/env.js', [{ key: 'Cache-Control', value: NO_CACHE }]),
  ],
  rewrites: [
    routes.rewrite('/bff/:path*', `${ORIGIN}/bff/:path*`),
    routes.rewrite('/api/v1/:path*', `${ORIGIN}/api/v1/:path*`),
    routes.rewrite('/oauth/:path*', `${ORIGIN}/oauth/:path*`),
    routes.rewrite('/ready', `${ORIGIN}/ready`),
    routes.rewrite('/feed.xml', `${ORIGIN}/bff/status/api/v1/status/rss`),
    spaFallback,
  ],
};

/**
 * 公开可索引路由单点（2026-10-30）。
 *
 * 一份路由表同时驱动三件事，避免三处手写漂移：
 *   1. `scripts/gen-env.mjs`  → public/sitemap.xml 的 `<loc>` 列表；
 *   2. `apps/status-page/vite.config.ts` → 构建期按路由生成静态 HTML
 *      （每页自带正确的 canonical / og:url / hreflang，不靠 JS 事后改）；
 *   3. 测试/e2e 的路由清单。
 *
 * 新增公开页 = 这里加一行（titleKey 指向 i18n 的标题键，供静态 HTML 用；
 * `sitemap: false` = 只出静态 HTML、不进 sitemap）。
 * 动态路由（`/incidents/:id`、`/maintenance/:id`、`/services/:id`）不进本表：
 * 它们由 SPA 兜底 + 运行期 page-meta 处理。
 */
export const PUBLIC_ROUTES = [
  { path: '/', titleKey: null, descriptionKey: null },
  { path: '/incidents', titleKey: 'incidents.title', descriptionKey: 'incidents.subtitle' },
  { path: '/maintenance', titleKey: 'maintenance.title', descriptionKey: 'maintenance.subtitle' },
  // 订阅页：公开可索引，进 sitemap。
  { path: '/subscribe', titleKey: 'subscribe.title', descriptionKey: 'subscribe.desc' },
  // RSS 展示页：给出静态 canonical/标题（否则只能落无 canonical 的兜底壳），
  // 但**不进 sitemap** —— 内容是 XML 预览，属薄页面。
  { path: '/rss', titleKey: 'rss.pageTitle', descriptionKey: 'rss.desc', sitemap: false },
];

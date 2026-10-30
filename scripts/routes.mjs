/**
 * 公开可索引路由单点（2026-10-30）。
 *
 * 一份路由表同时驱动三件事，避免三处手写漂移：
 *   1. `scripts/gen-env.mjs`  → public/sitemap.xml 的 `<loc>` 列表；
 *   2. `apps/status-page/vite.config.ts` → 构建期按路由生成静态 HTML
 *      （每页自带正确的 canonical / og:url / hreflang，不靠 JS 事后改）；
 *   3. 测试/e2e 的路由清单。
 *
 * 新增公开页 = 这里加一行（titleKey 指向 i18n 的标题键，供静态 HTML 用）。
 * 动态路由（`/incidents/:id`、`/maintenance/:id`、`/services/:id`）不进本表：
 * 它们由 SPA 兜底 + 运行期 page-meta 处理。
 */
export const PUBLIC_ROUTES = [
  { path: '/', titleKey: null, descriptionKey: null },
  { path: '/incidents', titleKey: 'incidents.title', descriptionKey: 'incidents.subtitle' },
  { path: '/maintenance', titleKey: 'maintenance.title', descriptionKey: 'maintenance.subtitle' },
];

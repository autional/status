# Autional 服务状态

**域名**：[status.autional.cn](https://status.autional.cn)（cn）· [status.autional.com](https://status.autional.com)（com）
**技术栈**：Vite + React 19 + TypeScript + Tailwind CSS
**仓库**：[github.com/autional/status](https://github.com/autional/status)

各微服务的实时可用性与历史事件。

## 开发

```bash
pnpm install
pnpm dev      # http://localhost:13106（构建前自动生成 env.js/robots/sitemap/security.txt）
pnpm build    # 构建产物：apps/status-page/dist/
pnpm test     # Vitest 单元测试
pnpm test:e2e # Playwright 生产只读回归（默认 com；BASE_URL 可指 cn 或本地）
```

E2E 覆盖四条审计断言：订阅 tabs 键盘语义、路由级 page meta（含 EN）、
404 未找到三态、RSS `?lang` 频道语言。只读，不写入任何接口。首次运行前需
`pnpm --filter @autional/status-page exec playwright install chromium`。

## 部署（单源双区）

`main` → `status`（com）自动部署；`main` → `cn-status`（cn）自动部署。两区**同一份源**，
区域差异全部由 Vercel 项目环境变量在构建期注入（见 `docs/positioning/24`）：

| 变量 | com | cn |
| --- | --- | --- |
| `REGION` | `com` | `cn` |
| `SITE_URL` | `https://status.autional.com` | `https://status.autional.cn` |
| `DEFAULT_LANG` / `FALLBACK_LANG` | `en` | `zh` |
| `API_ORIGIN` | `https://api.autional.com` | `https://api.autional.cn` |
| `CDN_HOST` | `https://cdn.autional.com` | `https://cdn.autional.cn` |

- 路由/重写：`vercel.ts`（fail-closed：`API_ORIGIN` 缺失即构建失败）；含 `/ready` 与 `/feed.xml`（RSS 端点代理）。
- 生成物（勿手改、勿入库）：`apps/status-page/public/{env.js,robots.txt,sitemap.xml,.well-known/security.txt}` ← `scripts/gen-env.mjs`；区域文案在 `scripts/region-copy.mjs`。
- 本地无 env 时兜底 cn 值（与迁移前基线一致）。

## PWA

- **外壳缓存**：`vite-plugin-pwa` injectManifest + Workbox precache；manifest 按区域在构建期生成。
- **数据面永不缓存**：`/ready`、`/feed.xml`、`/bff`、`/api/v1`、`/status`、`/tenant`、`/oauth` 走 `NetworkOnly`；在线导航先网络（4s 超时），离线才回退预缓存 `index.html`。离线或刷新失败时页面显示“无法获取实时状态”，不拿旧数据冒充实时。
- **更新**：新 SW `skipWaiting` + `clients.claim` 立即接管；`src/lib/pwa-lifecycle.ts` 在接管后整页重载一次。首访、`/subscribe/verify` 一次性令牌页、未提交输入、60 秒防循环不重载；`vite:preloadError` 同样有守卫。
- **部署注意**：`vercel.ts` 对 `/sw.js`、`/index.html`、`/manifest.webmanifest`、`/registerSW.js` 设 `max-age=0`；`/assets/*`、`/workbox-*.js` 长缓存。SPA 兜底只在 `Accept: text/html` 时生效，缺失的静态资源返回 404。
- **验收**：SW 受控、Cache Storage 只有 Workbox precache、`/ready` 与 `data` 不在缓存、离线壳可用且状态显示为未知。

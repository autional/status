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
```

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

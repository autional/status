import { routes, type VercelConfig } from '@vercel/config/v1';

/**
 * 门户入口（status.autional.com / status.autional.cn）的**唯一源站**（B3 单源双区）。
 *
 * 上游 API origin 值 **不写入本仓**，取自 Vercel 项目环境变量 `API_ORIGIN`
 * （cn 项目 = https://api.autional.cn，com 项目 = https://api.autional.com）。
 * 未设置时 **故意抛错**（fail-closed），避免静默产出坏路由。
 *
 * rewrites 承接原 vercel.json 全集；`/ready` 与 `/feed.xml` 为 com 线旧版缺失的两条
 * （cn 形态为准，支线 #24 回正）。`/(.*)` 兜底保持 SPA 语义（rewrites 在文件系统检查后
 * 生效，静态资源不受影响——与迁移前线上行为一致）。
 */
const rawOrigin = process.env.API_ORIGIN;

if (!rawOrigin) {
  throw new Error(
    '[status] 缺少环境变量 API_ORIGIN（Vercel 项目设置里配置后重新部署）',
  );
}

const ORIGIN = rawOrigin.replace(/\/+$/, '');

export const config: VercelConfig = {
  framework: 'vite',
  installCommand: 'pnpm install --frozen-lockfile',
  buildCommand: 'pnpm --filter @autional/status-page... build',
  outputDirectory: 'apps/status-page/dist',
  rewrites: [
    routes.rewrite('/bff/:path*', `${ORIGIN}/bff/:path*`),
    routes.rewrite('/api/v1/:path*', `${ORIGIN}/api/v1/:path*`),
    routes.rewrite('/oauth/:path*', `${ORIGIN}/oauth/:path*`),
    routes.rewrite('/tenant/:path*', `${ORIGIN}/tenant/:path*`),
    routes.rewrite('/ready', `${ORIGIN}/ready`),
    routes.rewrite('/feed.xml', `${ORIGIN}/bff/status/api/v1/status/rss`),
    routes.rewrite('/(.*)', '/index.html'),
  ],
};

#!/usr/bin/env node
/**
 * gen-env.mjs —— B3 构建前生成物（执行卡 §1.2；写进 apps/status-page/public/，
 * Vite 构建时随 public 拷进 dist/）：
 *
 *   public/env.js                    ← window.__APP_CONFIG__（@autional/shared 运行时配置形状）
 *   public/robots.txt                ← SITE_URL + 区域注释
 *   public/sitemap.xml               ← SITE_URL × 3 条公开路由
 *   public/.well-known/security.txt  ← RFC 9116（区域 Preferred-Languages；Policy 指向 trust 站 VDP）
 *
 * 纪律：均为生成物（已 gitignore + git rm --cached）——勿手改、勿入库；幂等（同 env 输出一致）。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBuildEnv } from './env.mjs';
import { REGION_COPY } from './region-copy.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const buildEnv = readBuildEnv();
const copy = REGION_COPY[buildEnv.defaultLang];
const publicDir = join(root, 'apps', 'status-page', 'public');

const write = (rel, content) => {
  const file = join(publicDir, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
};

// ── 1. env.js（@autional/shared getEnv 读取形状，勿改键名）────────────────────
const PORTALS = [
  ['landing', 'www'],
  ['auth', 'auth'],
  ['user', 'user'],
  ['authenticator', 'authenticator'],
  ['admin', 'admin'],
  ['developer', 'developer'],
  ['security', 'security'],
  ['platform', 'platform'],
  ['status', 'status'],
  ['trust', 'trust'],
];
const portalConfig = PORTALS.map(([name, host]) => `    ${name}: { host: "${host}", base: "" }`).join(',\n');
write(
  'env.js',
  `window.__APP_CONFIG__ = {
  BASE_PATH: "/",
  VITE_ROOT_DOMAIN: "${buildEnv.rootDomain}",
  VITE_PORTAL_CONFIG: {
${portalConfig}
  },
  VITE_COOKIE_DOMAIN: ".${buildEnv.rootDomain}",
  VITE_API_BASE_URL: "/bff"
};
`,
);

// ── 2. robots.txt ────────────────────────────────────────────────────────────
write(
  'robots.txt',
  `# ${buildEnv.siteHost} — ${copy.robotsComment}\nUser-agent: *\nAllow: /\n\nSitemap: ${buildEnv.siteUrl}/sitemap.xml\n`,
);

// ── 3. sitemap.xml（3 条公开路由；/rss 展示页不入 sitemap）───────────────────
const ROUTES = ['/', '/incidents', '/maintenance'];
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ROUTES.map(
    (p) => `  <url><loc>${buildEnv.siteUrl}${p}</loc></url>`,
  ).join('\n')}\n</urlset>\n`,
);

// ── 4. .well-known/security.txt（RFC 9116）───────────────────────────────────
write(
  '.well-known/security.txt',
  `# Autional security.txt (RFC 9116)\nContact: mailto:security@autional.net\nExpires: 2027-10-05T00:00:00.000Z\nPreferred-Languages: ${copy.preferredLanguages}\nCanonical: ${buildEnv.siteUrl}/.well-known/security.txt\nPolicy: https://trust.${buildEnv.rootDomain}/vulnerability-disclosure\n`,
);

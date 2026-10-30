import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'path';
import { CDN_PIN, readBuildEnv } from '../../scripts/env.mjs';
import { cdnHeadPlugin } from '../../scripts/vite-cdn.mjs';
import { REGION_COPY } from '../../scripts/region-copy.mjs';
import { PUBLIC_ROUTES } from '../../scripts/routes.mjs';
import { applyRouteHead, siblingSiteUrl, stripRouteIdentity } from '../../scripts/route-html.mjs';

const buildEnv = readBuildEnv();
const copy = REGION_COPY[buildEnv.defaultLang];
const CDN_ASSET_BASE = `${buildEnv.cdnHost}/ui/${CDN_PIN}`;
const ROOT_URL = `https://www.${buildEnv.rootDomain}`;

/**
 * 构建期「按路由出静态 HTML」（2026-10-30）。
 *
 * 纯 SPA 的所有路径都回同一份 index.html ⇒ 每页静态 canonical/og:url 都是首页，
 * 与 sitemap 声明的 URL 直接冲突，且不跑 JS 的抓取器（社交/IM/AI）只能看到首页身份。
 * 本插件在构建后生成：
 *   - dist/<route>/index.html：sitemap 里的每条公开路由各一份，头部（canonical /
 *     og:url / hreflang / title / description / RSS alternate）逐页正确；
 *   - dist/spa.html：动态路由（/incidents/:id 等）兜底壳，**不含** canonical / og:url
 *     （「没有 canonical」比「错误 canonical」安全），运行期由 page-meta 补。
 * 路由单点 = scripts/routes.mjs（与 sitemap 生成共用）。
 */
function staticRouteHtmlPlugin(): Plugin {
  return {
    name: 'static-route-html',
    apply: 'build',
    // 放在最后：PWA 插件已在先前的 closeBundle 里写完 sw.js/manifest，
    // 我们要读的是最终 dist/index.html。
    closeBundle() {
      const outDir = path.resolve(__dirname, 'dist');
      const indexPath = path.join(outDir, 'index.html');
      if (!existsSync(indexPath)) {
        throw new Error('[status] 构建产物缺少 dist/index.html，静态路由 HTML 无法生成');
      }
      const base = readFileSync(indexPath, 'utf8');
      const localePath = path.resolve(__dirname, `src/i18n/locales/${copy.locale}.json`);
      const locale = JSON.parse(readFileSync(localePath, 'utf8')) as Record<string, string>;
      const siteUrl = buildEnv.siteUrl;
      const siblingUrl = siblingSiteUrl(siteUrl);
      const rssTitle = copy.rssTitle;

      const home = applyRouteHead(base, { siteUrl, siblingUrl, path: '/', rssTitle });
      writeFileSync(indexPath, home);

      let generated = 1;
      for (const route of PUBLIC_ROUTES) {
        if (route.path === '/') continue;
        const html = applyRouteHead(base, {
          siteUrl,
          siblingUrl,
          path: route.path,
          title: route.titleKey ? locale[route.titleKey] : undefined,
          description: route.descriptionKey ? locale[route.descriptionKey] : undefined,
          rssTitle,
        });
        const dir = path.join(outDir, route.path);
        mkdirSync(dir, { recursive: true });
        writeFileSync(path.join(dir, 'index.html'), html);
        generated += 1;
      }

      writeFileSync(path.join(outDir, 'spa.html'), stripRouteIdentity(home));

      console.log(`[status] static route html: ${generated} pages (+ spa.html)`);
    },
  };
}

function normalizeViteBase(p: string | undefined): string {
  if (!p || p === '/') return '/';
  if (p.includes('Program Files')) {
    throw new Error('MSYS2 path corruption detected on BASE_PATH: ' + p + '. Use PowerShell to build.');
  }
  return p.replace(/\/$/, '') + '/';
}

/**
 * index.html 区域占位符（{{TOKEN}}）替换单点——值全部来自 scripts/env.mjs + region-copy.mjs。
 * 未知占位符 fail-closed（防拼写错误静默漏替）。
 */
function regionPlugin(): Plugin {
  const tokens: Record<string, string> = {
    LANG: copy.locale,
    TITLE: copy.title,
    DESCRIPTION: copy.description,
    KEYWORDS: copy.keywords,
    OG_TITLE: copy.ogTitle,
    OG_DESCRIPTION: copy.ogDescription,
    OG_LOCALE: copy.ogLocale,
    SITE_NAME: copy.siteName,
    OG_IMAGE: `${ROOT_URL}/og-default.png`,
    SITE_URL: buildEnv.siteUrl,
    ROOT_URL,
    CDN_ASSET_BASE,
    RSS_TITLE: copy.rssTitle,
  };
  return {
    name: 'region-plugin',
    enforce: 'pre',
    transformIndexHtml(html) {
      return html.replace(/\{\{(\w+)\}\}/g, (raw, key: string) => {
        if (!(key in tokens)) {
          throw new Error(`[status] index.html 未知区域占位符: {{${key}}}`);
        }
        return tokens[key];
      });
    },
  };
}

/**
 * 把 gen-env.mjs 生成的 public/env.js 内联进 index.html：
 * 省掉一次阻塞式外部脚本往返，也避免运行时配置被 SW 预缓存成旧值。
 * 生成物缺失即抛错（fail-closed），防止静默产出没有 __APP_CONFIG__ 的站点。
 */
function inlineEnvPlugin(): Plugin {
  return {
    name: 'inline-env-config',
    enforce: 'pre',
    transformIndexHtml(html) {
      const marker = /[ \t]*<script src="\/env\.js"><\/script>/;
      if (!marker.test(html)) {
        throw new Error('[status] index.html 缺少 /env.js 脚本标记');
      }
      let envJs: string;
      try {
        envJs = readFileSync(path.resolve(__dirname, 'public/env.js'), 'utf8').trim();
      } catch {
        throw new Error('[status] 缺少 public/env.js，请先运行 scripts/gen-env.mjs');
      }
      return html.replace(marker, `    <script>\n${envJs}\n    </script>`);
    },
  };
}

const BASE = normalizeViteBase(process.env.BASE_PATH);
const API_PROXY_TARGET = process.env.VITE_API_PROXY_URL || 'http://localhost:11080';

export default defineConfig({
  define: {
    'import.meta.env.VITE_REGION': JSON.stringify(buildEnv.region),
    'import.meta.env.VITE_SITE_URL': JSON.stringify(buildEnv.siteUrl),
    'import.meta.env.VITE_DEFAULT_LANG': JSON.stringify(buildEnv.defaultLang),
    'import.meta.env.VITE_FALLBACK_LANG': JSON.stringify(buildEnv.fallbackLang),
  },
  base: BASE,
  plugins: [
    react(),
    cdnHeadPlugin({ cdnHost: buildEnv.cdnHost }),
    inlineEnvPlugin(),
    regionPlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'pwa',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        id: BASE,
        name: copy.siteName,
        short_name: buildEnv.defaultLang === 'zh' ? '服务状态' : 'Status',
        description: copy.manifestDescription,
        lang: copy.locale,
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#f8fbfe',
        theme_color: '#003153',
        icons: [
          {
            src: `${BASE}android-chrome-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${BASE}android-chrome-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          { src: `${BASE}favicon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      injectManifest: {
        // index.html 是离线壳，必须进预缓存；env.js 已内联进页面，不再作为独立缓存项。
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // 安装图标不参与离线壳；includeManifestIcons:false 才能关掉插件对 manifest.icons
        // 的强制注入（它绕过 globIgnores）。
        globIgnores: ['**/env.js', '**/android-chrome-*.png', '**/apple-touch-icon.png'],
      },
      includeManifestIcons: false,
      devOptions: {
        enabled: false,
      },
    }),
    // 必须最后：读取 PWA 处理完的 dist/index.html，再派生静态路由 HTML。
    staticRouteHtmlPlugin(),
  ],
  worker: {
    format: 'es',
  },
  resolve: {
    extensions: ['.mjs', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {'@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 13106,
    proxy: {
      '/health': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/ready': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/bff': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 13106,
    proxy: {
      '/health': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/ready': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/bff': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

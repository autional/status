/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

type PrecacheEntry = { url: string; revision: string | null };
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

/** 直通上游的路径：状态数据必须实时取，绝不进 Cache Storage。 */
const API_PATH = /^\/(?:bff|api\/v1|status|tenant|oauth)\//;
/** 单条实时数据端点：/ready 与 RSS（/feed.xml 由 Vercel 重写到状态服务）。 */
const API_EXACT_PATH = new Set(['/ready', '/feed.xml']);

function isApiPath(pathname: string): boolean {
  return API_EXACT_PATH.has(pathname) || API_PATH.test(pathname);
}

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

const NETWORK_TIMEOUT_MS = 4000;

// 离线/超时兜底：随版本预缓存的应用壳。在线导航始终先取网络，HTML 不进运行时缓存。
const offlineShell = createHandlerBoundToURL('index.html');

registerRoute(
  ({ request, url }) =>
    request.mode === 'navigate' && url.origin === self.location.origin && !isApiPath(url.pathname),
  async (options) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
    try {
      return await fetch(options.request, { signal: controller.signal });
    } catch {
      return offlineShell(options);
    } finally {
      clearTimeout(timer);
    }
  },
);

// 状态数据 NetworkOnly：离线时请求直接失败，页面据 isError 显示"取不到"，
// 绝不用缓存里的旧状态冒充实时（假绿比不可用更危险）。
registerRoute(
  ({ url }) => url.origin === self.location.origin && isApiPath(url.pathname),
  new NetworkOnly(),
);

self.skipWaiting();
// claim 必须挂到 activate 事件；安装期直接调 self.clients.claim() 会被丢弃。
clientsClaim();

import { test, expect } from '@playwright/test';

/**
 * 部署自证（2026-10-30）。
 *
 * 这三条是「线上看起来没坏、其实坏了」的典型：
 *   ① 深链对非浏览器抓取器 404 —— SPA 兜底的 Accept 条件写窄了；
 *   ② 缺失资产被兜成 200 HTML —— 兜底没排除带点的路径（浏览器会把 HTML 当 JS 解析）；
 *   ③ sitemap 说「这页是 X」，页面 canonical 却说「这页是首页」。
 *
 * 之所以放在 e2e（而不是单测）：它们只有在**真实部署**上才可能失真
 * （构建产物对、路由规则错、平台没发新版，单测全绿）。
 * 也可用于「确认新版本真的上线了」——任一条红就说明当前域名还是旧部署。
 */

const BASE = process.env.BASE_URL ?? 'https://status.autional.com';

test('深链对非浏览器抓取器可读（Accept: */*）', async ({ request }) => {
	for (const path of ['/', '/incidents', '/maintenance', '/subscribe']) {
		const res = await request.get(path, { headers: { Accept: '*/*' } });
		expect(res.status(), `${path} 应对 Accept: */* 返回 200`).toBe(200);
		expect(res.headers()['content-type'], path).toContain('text/html');
	}
});

test('缺失资产仍是 404（不被兜成 200 HTML）', async ({ request }) => {
	const res = await request.get('/assets/__no_such_chunk__.js', { headers: { Accept: '*/*' } });
	expect(res.status(), '缺失 chunk 必须真 404，否则浏览器会把 HTML 当 JS').toBe(404);
});

test('sitemap 每条 URL 的静态 canonical 自指', async ({ request }) => {
	const sitemap = await (await request.get('/sitemap.xml')).text();
	const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
	expect(locs.length, 'sitemap 不应为空').toBeGreaterThan(0);

	for (const loc of locs) {
		const html = await (await request.get(loc, { headers: { Accept: 'text/html' } })).text();
		expect(html, `${loc} 的 canonical 必须等于自身`).toContain(`<link rel="canonical" href="${loc}" />`);
		expect(html, `${loc} 必须带区域 hreflang`).toContain('hreflang="x-default"');
	}
});

test('兜底壳不被收录（/spa.html 带 X-Robots-Tag）', async ({ request }) => {
	const res = await request.get('/spa.html', { headers: { Accept: 'text/html' } });
	expect(res.headers()['x-robots-tag'] ?? '', 'spa.html 应带 noindex').toContain('noindex');
});

test('BASE_URL 与 sitemap 同域（防跨区串台）', async ({ request }) => {
	const sitemap = await (await request.get('/sitemap.xml')).text();
	const host = new URL(BASE).host;
	for (const m of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
		expect(new URL(m[1]).host, 'sitemap 不得出现兄弟域').toBe(host);
	}
});

import { test, expect } from '@playwright/test';

/**
 * RSS 区域隔离回归（2026-10-30）。
 *
 * 旧断言的问题：默认打 `.com` 生产，却断言 `<language>zh-CN</language>` ——
 * 等于把 bug 断言成正确（正确修复后反而会红）。且只查语言与 self 后缀，
 * 不查域名，所以「.com 的 feed 链接全指 .cn」这条线上 bug 一直测不出来。
 *
 * 现在的判据：
 *   1) 频道语言 = 当前区域（.cn → zh-CN，.com → en）；
 *   2) feed 内**所有**绝对链接的 host = 当前访问域（channel/link、atom self、item）；
 *   3) `?lang=` 只切语言、不改宿主。
 */

const BASE = process.env.BASE_URL ?? 'https://status.autional.com';
const BASE_HOST = new URL(BASE).host;
const IS_COM = BASE_HOST.endsWith('.com');

function hostsIn(xml: string): string[] {
	return [...xml.matchAll(/https:\/\/[^"'<\s]+/g)].map((m) => new URL(m[0]).host);
}

test('RSS 默认频道 = 当前区域，且所有链接宿主 = 当前域', async ({ request }) => {
	const response = await request.get('/feed.xml');
	expect(response.ok()).toBeTruthy();
	expect(response.headers()['content-type']).toContain('application/rss+xml');

	const xml = await response.text();

	if (IS_COM) {
		expect(xml).toContain('<language>en</language>');
		expect(xml).toContain('System Event Notifications');
		expect(xml).not.toContain('系统事件通知');
	} else {
		expect(xml).toContain('<language>zh-CN</language>');
		expect(xml).toContain('系统事件通知');
	}

	// 自链必须指自己（聚合器据此判断 feed 归属）
	const selfHref = xml.match(/<atom:link href="([^"]+)"/)?.[1];
	expect(selfHref, 'feed 必须带 atom:link rel=self').toBeTruthy();
	expect(new URL(selfHref!).host).toBe(BASE_HOST);
	expect(new URL(selfHref!).pathname).toBe('/feed.xml');
	expect(new URL(selfHref!).search).toBe('');

	// 所有绝对链接（含条目链接）同域——跨区泄漏即 FAIL
	for (const host of hostsIn(xml)) {
		expect(host, `feed 出现跨区链接：${host}`).toBe(BASE_HOST);
	}
});

test('RSS lang 覆盖：只切语言，不改链接宿主', async ({ request }) => {
	const override = IS_COM ? 'zh' : 'en';
	const response = await request.get(`/feed.xml?lang=${override}`);
	expect(response.ok()).toBeTruthy();

	const xml = await response.text();
	if (override === 'en') {
		expect(xml).toContain('<language>en</language>');
	} else {
		expect(xml).toContain('<language>zh-CN</language>');
	}

	const selfHref = xml.match(/<atom:link href="([^"]+)"/)?.[1];
	expect(new URL(selfHref!).host).toBe(BASE_HOST);
	for (const host of hostsIn(xml)) {
		expect(host, `覆盖语言时不得改宿主：${host}`).toBe(BASE_HOST);
	}
});

import { test, expect } from '@playwright/test';

test('RSS 默认中文频道', async ({ request }) => {
	const response = await request.get('/feed.xml');
	expect(response.ok()).toBeTruthy();

	const xml = await response.text();
	expect(xml).toContain('<language>zh-CN</language>');
	expect(xml).toContain('<title>Autional Status — 系统事件通知</title>');
	expect(xml).toContain('/feed.xml" rel="self"');
	expect(xml).not.toContain('/feed.xml?lang=en" rel="self"');
});

test('RSS lang=en：英文频道与 self 链接', async ({ request }) => {
	const response = await request.get('/feed.xml?lang=en');
	expect(response.ok()).toBeTruthy();

	const xml = await response.text();
	expect(xml).toContain('<language>en</language>');
	expect(xml).toContain('<title>Autional Status — System Event Notifications</title>');
	expect(xml).toContain('/feed.xml?lang=en" rel="self"');
});

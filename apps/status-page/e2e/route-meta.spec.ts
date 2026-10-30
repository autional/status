import { test, expect } from '@playwright/test';
import { useLang } from './helpers';

test('服务详情：路由级 title / canonical / robots', async ({ page }) => {
	await useLang(page, 'zh-CN');
	await page.goto('/services/identity-service');

	await expect(page).toHaveTitle(/身份认证服务/);

	const canonical = page.locator('link[rel="canonical"]');
	await expect(canonical).toHaveCount(1);
	const href = await canonical.getAttribute('href');
	expect(href).toBeTruthy();
	expect(new URL(href!).pathname).toBe('/services/identity-service');

	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
});

test('EN：OG / Twitter / JSON-LD / og:locale / RSS alternate 全英文', async ({ page }) => {
	await useLang(page, 'en-US');
	await page.goto('/');

	await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
	await expect(page).toHaveTitle('Autional System Status');
	await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Autional System Status');
	await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', 'Autional System Status');
	await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
	await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Autional Status');

	const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
	const jsonLd = JSON.parse(structuredData ?? '{}');
	expect(jsonLd.inLanguage).toBe('en-US');
	expect(jsonLd.name).toBe('Autional System Status');

	// RSS 自动发现链接：区域决定语言，URL 恒为本站 /feed.xml（不再拼 ?lang）。
	await expect(
		page.locator('link[rel="alternate"][type="application/rss+xml"]'),
	).toHaveAttribute('href', /\/feed\.xml$/);

	// hreflang：必须同时声明 zh-CN / en-US / x-default，且互指两区同名路径。
	for (const code of ['zh-CN', 'en-US', 'x-default']) {
		await expect(page.locator(`link[rel="alternate"][hreflang="${code}"]`)).toHaveCount(1);
	}
	const zhHref = await page.locator('link[rel="alternate"][hreflang="zh-CN"]').getAttribute('href');
	const enHref = await page.locator('link[rel="alternate"][hreflang="en-US"]').getAttribute('href');
	expect(new URL(zhHref!).host).toMatch(/\.cn$/);
	expect(new URL(enHref!).host).toMatch(/\.com$/);
});

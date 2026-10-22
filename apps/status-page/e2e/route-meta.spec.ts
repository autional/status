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

	await expect(
		page.locator('link[rel="alternate"][type="application/rss+xml"]'),
	).toHaveAttribute('href', /[?&]lang=en$/);
});

import { test, expect } from '@playwright/test';
import { useLang } from './helpers';

test.beforeEach(async ({ page }) => {
	await useLang(page, 'zh-CN');
});

test('事件 404：未找到态、noindex、canonical 保留路径、无重试', async ({ page }) => {
	await page.goto('/incidents/nonexistent-id');

	await expect(page.getByRole('heading', { name: '事件未找到' })).toBeVisible();
	await expect(page.getByText('该事件不存在或已被移除。')).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
	await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
		'href',
		/\/incidents\/nonexistent-id$/,
	);
	await expect(page.getByRole('button', { name: /重试|再试/ })).toHaveCount(0);
});

test('维护 404：未找到态与返回入口', async ({ page }) => {
	await page.goto('/maintenance/nonexistent-id');

	await expect(page.getByRole('heading', { name: '维护记录未找到' })).toBeVisible();
	await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
	await expect(page.getByRole('link', { name: /返回维护/ })).toBeVisible();
});

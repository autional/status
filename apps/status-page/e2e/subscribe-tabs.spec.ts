import { test, expect } from '@playwright/test';
import { useLang } from './helpers';

test.beforeEach(async ({ page }) => {
	await useLang(page, 'zh-CN');
});

test('订阅 tabs：方向键、roving tabindex、panel 引用完整', async ({ page }) => {
	await page.goto('/subscribe');

	const subscribe = page.locator('#tab-subscribe');
	const unsubscribe = page.locator('#tab-unsubscribe');
	const preferences = page.locator('#tab-preferences');

	await expect(page.getByRole('tab')).toHaveCount(3);
	await expect(subscribe).toHaveAttribute('aria-selected', 'true');

	await subscribe.focus();
	await page.keyboard.press('ArrowRight');
	await expect(unsubscribe).toBeFocused();
	await expect(unsubscribe).toHaveAttribute('aria-selected', 'true');
	await expect(unsubscribe).toHaveAttribute('tabindex', '0');
	await expect(subscribe).toHaveAttribute('tabindex', '-1');
	await expect(page.locator('#panel-unsubscribe')).toBeVisible();
	await expect(page.locator('#panel-subscribe')).toBeHidden();

	await page.keyboard.press('End');
	await expect(preferences).toBeFocused();
	await expect(preferences).toHaveAttribute('aria-selected', 'true');

	await page.keyboard.press('Home');
	await expect(subscribe).toBeFocused();
	await expect(subscribe).toHaveAttribute('aria-selected', 'true');

	for (const tab of [subscribe, unsubscribe, preferences]) {
		const panelId = await tab.getAttribute('aria-controls');
		expect(panelId).toBeTruthy();
		await expect(page.locator(`#${panelId}`)).toHaveCount(1);
	}
});

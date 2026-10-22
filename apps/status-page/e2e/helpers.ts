import type { Page } from '@playwright/test';

export async function useLang(page: Page, lang: 'zh-CN' | 'en-US') {
	await page.addInitScript((value) => {
		window.localStorage.setItem('status-page-lang', value);
	}, lang);
}

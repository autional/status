import { defineConfig } from '@playwright/test';

/**
 * 生产只读回归。默认打 com 生产；切区域或本地预览：
 *   BASE_URL=https://status.autional.cn pnpm test:e2e
 *   BASE_URL=http://localhost:13106 pnpm test:e2e
 */
export default defineConfig({
	testDir: './e2e',
	workers: 1,
	retries: 0,
	timeout: 60_000,
	reporter: 'list',
	use: {
		baseURL: process.env.BASE_URL ?? 'https://status.autional.com',
		locale: 'zh-CN',
		timezoneId: 'Asia/Shanghai',
		viewport: { width: 1280, height: 800 },
		navigationTimeout: 45_000,
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
	},
	projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 可用率口径**取值**文案锁（T33 ①；边界内**新增**文件，未改动任何既有测试）。
 *
 * 背景：`service.uptime`（KPI 标题）此前把 range 的**原始取值**（`24h`）插进 `{{range}}`，
 * 于是 zh 渲染为「24h 探针可用率（滚动）」，与需求要的「24 小时…」不一致。
 * 本次**只改这一处传入的取值**：新增 `service.uptimeRange.*` 展示取值，页面按
 * `t('service.uptime', { range: t('service.uptimeRange.' + range) })` 调用；
 * 同页其它 `{{range}}` 调用点（uptimeTitle / latencyTitle / latencySourceHint）**仍传原始 range**
 * （全仓 `{{range}}` 约定不变）。
 *
 * 本文件锁：
 *   A. 4 个新键的值（zh/en）逐字锁定，且与**旧行为**（原始 `24h`）不同；
 *   B. zh 有中文 / en 无中文（防照抄）；
 *   C. 无结论词（Q1 = 否）；
 *   D. 新键确实被渲染（不是死文案）；
 *   E. **只有** `service.uptime` 一处用本地化取值，其它 `{{range}}` 用法保持原始取值。
 */
const SRC_ROOT = resolve(process.cwd(), 'src');
const readBundle = (rel: string): Record<string, string> =>
	JSON.parse(readFileSync(join(SRC_ROOT, rel), 'utf8'));
const ZH = readBundle('i18n/locales/zh-CN.json');
const EN = readBundle('i18n/locales/en-US.json');
const HAN = /\p{Script=Han}/u;
const readSource = (rel: string) => readFileSync(join(SRC_ROOT, rel), 'utf8');

// 结论词用码点书写：本守卫文件本身不应被全仓结论词 grep 命中。
const VERDICT_MARKS = ['\u8fbe\u6807', '\u672a\u8fbe\u6807', '\u4e0d\u8fbe\u6807'];

const TOUCHED: Array<{ key: string; zh: string; en: string }> = [
	{ key: 'service.uptimeRange.1h', zh: '1 小时', en: '1-hour' },
	{ key: 'service.uptimeRange.24h', zh: '24 小时', en: '24-hour' },
	{ key: 'service.uptimeRange.7d', zh: '7 天', en: '7-day' },
	{ key: 'service.uptimeRange.30d', zh: '30 天', en: '30-day' },
];

describe('可用率口径取值文案（zh / en 双 bundle）', () => {
	it('A. 4 个展示取值键在双 bundle 中逐字锁定', () => {
		const drift: string[] = [];
		for (const { key, zh, en } of TOUCHED) {
			if (ZH[key] !== zh) drift.push(`${key} zh-CN: ${JSON.stringify(ZH[key])} != ${JSON.stringify(zh)}`);
			if (EN[key] !== en) drift.push(`${key} en-US: ${JSON.stringify(EN[key])} != ${JSON.stringify(en)}`);
		}
		expect(drift).toEqual([]);
	});

	it('A2. 展示取值 ≠ 原始 range 取值（正是本次要改掉的东西）', () => {
		// 旧行为：range='24h' 原样插入 ⇒ 渲染「24h …」。新取值必须不是 '24h'。
		expect(ZH['service.uptimeRange.24h']).not.toBe('24h');
		expect(EN['service.uptimeRange.24h']).not.toBe('24h');
		expect(ZH['service.uptimeRange.24h']).not.toBe(ZH['service.range.24h']); // 「24 小时」≠ 选择器的「24小时」
		expect(EN['service.uptimeRange.24h']).not.toBe(EN['service.range.24h']); // 「24-hour」≠ 选择器的「24 Hours」
	});

	it('B. zh 有中文 / en 不含中文（防照抄）', () => {
		const problems: string[] = [];
		for (const { key } of TOUCHED) {
			if (!HAN.test(ZH[key] ?? '')) problems.push(`${key}: zh-CN 不含中文`);
			if (HAN.test(EN[key] ?? '')) problems.push(`${key}: en-US 含中文字符（疑似照抄 zh）`);
		}
		expect(problems).toEqual([]);
	});

	it('C. 不得出现结论词（Q1 = 否）', () => {
		const leaks: string[] = [];
		for (const { key } of TOUCHED) {
			for (const word of VERDICT_MARKS) {
				if (ZH[key]?.includes(word)) leaks.push(`${key} zh-CN 含结论词「${word}」`);
				if (EN[key]?.includes(word)) leaks.push(`${key} en-US 含结论词「${word}」`);
			}
		}
		expect(leaks).toEqual([]);
	});

	it('C2. 标题键本身仍保留 {{range}} 占位（插值不丢、不写死 24）', () => {
		expect(ZH['service.uptime']).toContain('{{range}}');
		expect(EN['service.uptime']).toContain('{{range}}');
		// zh 无「数字与中文之间」以外的前置空格（渲染由展示取值自带「24 小时」），en 保留词间空格。
		expect(ZH['service.uptime']).toBe('{{range}}探针可用率（滚动）');
		expect(EN['service.uptime']).toBe('{{range}} Probe Uptime (rolling)');
	});
});

describe('调用点：只有 service.uptime 一处传本地化取值（E）', () => {
	const detail = readSource('app/services/page.tsx');

	it('E1. service.uptime 传本地化展示取值（新键被渲染，不是死文案）', () => {
		expect(detail).toContain("t('service.uptime', { range: t('service.uptimeRange.' + range) })");
	});

	it('E2. 其它 {{range}} 调用点仍传**原始** range（全仓约定未被波及）', () => {
		expect(detail).toContain("t('service.uptimeTitle', { range })");
		expect(detail).toContain("t('service.latencyTitle', { range })");
		expect(detail).toContain("t('service.latencySourceHint', { range })");
		// 反向：这几处**不得**被顺手改成本地化取值
		expect(detail).not.toContain("t('service.uptimeTitle', { range: t('service.uptimeRange.'");
		expect(detail).not.toContain("t('service.latencyTitle', { range: t('service.uptimeRange.'");
		expect(detail).not.toContain("t('service.latencySourceHint', { range: t('service.uptimeRange.'");
	});

	it('E3. 只有 1 处使用 service.uptimeRange.*（作用面收敛）', () => {
		const hits = detail.match(/service\.uptimeRange\./g) ?? [];
		expect(hits.length).toBe(1);
	});

	it('E4. zh 渲染结果（bundle → 插值）为「24 小时探针可用率（滚动）」', () => {
		const rendered = ZH['service.uptime'].replace('{{range}}', ZH['service.uptimeRange.24h']);
		expect(rendered).toBe('24 小时探针可用率（滚动）');
	});

	it('E5. en 渲染结果（bundle → 插值）为「24-hour Probe Uptime (rolling)」', () => {
		const rendered = EN['service.uptime'].replace('{{range}}', EN['service.uptimeRange.24h']);
		expect(rendered).toBe('24-hour Probe Uptime (rolling)');
	});
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 可用率口径文案锁（本次「可用率口径标注」补测；边界内**新增**文件，未改动任何既有测试）。
 *
 * 既有 `i18n-guard` 只锁"键存在 / 双 bundle 一致"，**不锁值**；`latency-copy` 锁的是延迟族。
 * 本文件锁本次 A 项（`docs/STATUS-UI-SEMANTICS-OPTIONS.md` §2.2 A1 / §2.3 第 4 条）：
 *   A. 口径标题与小字的值（zh/en）不再漂移；
 *   B. 旧口径「平均可用率」不再回退；
 *   C. 结论词锁：**不得**出现结论词（见下方 `VERDICT_MARKS`，Q1 拍板 = 否）；
 *   D. `{{range}}` 插值不得丢（标题随时间范围变化）；
 *   E. 新增/改动的键确实被渲染（不是死文案）；
 *   F. 99.9 硬编码**降级为图表分段色**：均值数字不再被阈值着色（不得再出现 `avgUptime >= 99.9`）。
 */
const SRC_ROOT = resolve(process.cwd(), 'src');
const readBundle = (rel: string): Record<string, string> =>
	JSON.parse(readFileSync(join(SRC_ROOT, rel), 'utf8'));
const ZH = readBundle('i18n/locales/zh-CN.json');
const EN = readBundle('i18n/locales/en-US.json');
const HAN = /\p{Script=Han}/u;
const readSource = (rel: string) => readFileSync(join(SRC_ROOT, rel), 'utf8');

/**
 * 结论词黑名单。**用码点书写**：本守卫文件本身不应被全仓结论词 grep 命中 ——
 * 否则"没有判定词"这条验收会被守卫自己的字面量污染成假阳性。
 */
const VERDICT_MARKS = ['\u8fbe\u6807', '\u672a\u8fbe\u6807', '\u4e0d\u8fbe\u6807', '\u76ee\u6807 99.9'];

/** 本次被触碰的 2 个键：1 处改值 + 1 处新增（期望值 = 改动后的口径）。 */
const TOUCHED: Array<{ key: string; zh: string; en: string; old?: string }> = [
	{
		key: 'service.uptime',
		zh: '{{range}} 探针可用率（滚动）',
		en: '{{range}} Probe Uptime (rolling)',
		old: '{{range}} 平均可用率',
	},
	{
		key: 'service.uptimeSourceHint',
		zh: 'Prometheus 抓取成功率 · 每 5 分钟一个采样点',
		en: 'Prometheus scrape success rate · one sample every 5 minutes',
	},
];

/** Q1 = 不加结论词：这些字眼一旦出现在口径文案里就说明判定词回来了。 */

describe('可用率口径文案（zh / en 双 bundle）', () => {
	it('A. 2 个键的值在双 bundle 中逐字锁定', () => {
		const drift: string[] = [];
		for (const { key, zh, en } of TOUCHED) {
			if (ZH[key] !== zh) drift.push(`${key} zh-CN: ${JSON.stringify(ZH[key])} != ${JSON.stringify(zh)}`);
			if (EN[key] !== en) drift.push(`${key} en-US: ${JSON.stringify(EN[key])} != ${JSON.stringify(en)}`);
		}
		expect(drift).toEqual([]);
	});

	it('B. 旧口径「平均可用率」不再回退', () => {
		expect(ZH['service.uptime']).not.toBe('{{range}} 平均可用率');
		expect(EN['service.uptime']).not.toBe('{{range}} Avg Uptime');
	});

	it('C. zh 与 en 都真的翻译了（防整段照抄）', () => {
		const problems: string[] = [];
		for (const { key } of TOUCHED) {
			if (!HAN.test(ZH[key] ?? '')) problems.push(`${key}: zh-CN 不含中文`);
			if (HAN.test(EN[key] ?? '')) problems.push(`${key}: en-US 含中文字符（疑似照抄 zh）`);
		}
		expect(problems).toEqual([]);
	});

	it('D. 口径文案里不得出现结论词（Q1 = 否）', () => {
		const leaks: string[] = [];
		for (const { key } of TOUCHED) {
			for (const word of VERDICT_MARKS) {
				if (ZH[key]?.includes(word)) leaks.push(`${key} zh-CN 含结论词「${word}」`);
				if (EN[key]?.toLowerCase().includes(word.toLowerCase()))
					leaks.push(`${key} en-US 含结论词「${word}」`);
			}
		}
		expect(leaks).toEqual([]);
	});

	it('E. 标题保留 {{range}} 插值（随时间范围变化，不得写死"24 小时"）', () => {
		expect(ZH['service.uptime']).toContain('{{range}}');
		expect(EN['service.uptime']).toContain('{{range}}');
	});
});

describe('渲染与"降级为图表分段色"', () => {
	it('F. 两个键都确实被详情页渲染出来（不是死文案）', () => {
		const detail = readSource('app/services/page.tsx');
		expect(detail).toContain("t('service.uptime', { range })");
		expect(detail).toContain("t('service.uptimeSourceHint')");
	});

	it('G. 99.9 已从"均值数字着色"里移除（只剩图表分段色）', () => {
		const detail = readSource('app/services/page.tsx');
		// 数字旁不得再有阈值判定（旧写法：`${avgUptime >= 99.9 ? ... : avgUptime >= 95 ? ...}`）
		expect(detail).not.toMatch(/avgUptime\s*>=\s*(99\.9|95)/);
		// 图表分段色仍在（99.9 的唯一去处）
		expect(detail).toMatch(/else if \(value < 99\.9\) status = 'degraded'/);
	});

	it('H. 全仓源码不得出现结论词（含 locale 语料本体）', () => {
		const files = [
			'app/services/page.tsx',
			'i18n/locales/zh-CN.json',
			'i18n/locales/en-US.json',
		];
		const leaks: string[] = [];
		for (const f of files) {
			const src = readSource(f);
			for (const word of VERDICT_MARKS) {
				if (src.includes(word)) leaks.push(`${f} 含「${word}」`);
			}
		}
		expect(leaks).toEqual([]);
	});
});

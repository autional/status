import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 事件空态文案锁（本次 B 项补测；边界内**新增**文件，未改动任何既有测试）。
 *
 * `i18n-guard` 只锁"键存在 / 双 bundle 一致"，**不锁值**；本文件锁本次空态三分诊用到的文案：
 *   A. 4 个新增/改动键的值（zh/en）逐字锁定；
 *   B. `incidents.empty`（"筛掉了"分支的标题）保持原样，防误改；
 *   C. **不得**再出现任何时间窗断言（§4.1 事实纠错：接口/仓储无 90 天窗口，"90 天"必须不存在）；
 *   D. 不得出现结论词；
 *   E. 键确实被渲染（不是死文案）。
 */
const SRC_ROOT = resolve(process.cwd(), 'src');
const readBundle = (rel: string): Record<string, string> =>
	JSON.parse(readFileSync(join(SRC_ROOT, rel), 'utf8'));
const ZH = readBundle('i18n/locales/zh-CN.json');
const EN = readBundle('i18n/locales/en-US.json');
const HAN = /\p{Script=Han}/u;
const readSource = (rel: string) => readFileSync(join(SRC_ROOT, rel), 'utf8');

// 结论词用码点书写：本文件不应被全仓结论词 grep 命中。
const VERDICT_MARKS = ['\u8fbe\u6807', '\u672a\u8fbe\u6807'];

const TOUCHED: Array<{ key: string; zh: string; en: string }> = [
	{
		key: 'incidents.filteredEmptyHint',
		zh: '共 {{total}} 条事件记录，当前筛选无匹配。',
		en: '{{total}} incident records in total — none match the current filter.',
	},
	{
		key: 'incidents.noneYet',
		zh: '尚无事件记录',
		en: 'No incidents recorded yet',
	},
	{
		key: 'incidents.noneYetHint',
		zh: '我们尚未在此公告过任何事件。',
		en: 'We have not posted any incidents here so far.',
	},
	{
		key: 'filter.clear',
		zh: '清除筛选',
		en: 'Clear filters',
	},
];

describe('事件空态文案（zh / en 双 bundle）', () => {
	it('A. 4 个键的值在双 bundle 中逐字锁定', () => {
		const drift: string[] = [];
		for (const { key, zh, en } of TOUCHED) {
			if (ZH[key] !== zh) drift.push(`${key} zh-CN: ${JSON.stringify(ZH[key])} != ${JSON.stringify(zh)}`);
			if (EN[key] !== en) drift.push(`${key} en-US: ${JSON.stringify(EN[key])} != ${JSON.stringify(en)}`);
		}
		expect(drift).toEqual([]);
	});

	it('A2. 新增键都真的翻译了（防整段照抄）', () => {
		const problems: string[] = [];
		for (const { key } of TOUCHED) {
			if (!HAN.test(ZH[key] ?? '')) problems.push(`${key}: zh-CN 不含中文`);
			if (HAN.test(EN[key] ?? '')) problems.push(`${key}: en-US 含中文字符（疑似照抄 zh）`);
		}
		expect(problems).toEqual([]);
	});

	it('B. 「筛掉了」分支的标题仍是原样（未被误改）', () => {
		expect(ZH['incidents.empty']).toBe('没有符合条件的事件');
		expect(EN['incidents.empty']).toBe('No matching incidents');
		// 旧的、在"筛掉了"场景里会误导的提示语已退役
		expect(ZH['incidents.emptyHint']).toBeUndefined();
		expect(EN['incidents.emptyHint']).toBeUndefined();
	});

	it('C. 事件/筛选键族里不得再出现任何时间窗断言（"90 天"事实纠错不得回退）', () => {
		const leaks: string[] = [];
		for (const [bundle, name] of [
			[ZH, 'zh-CN'],
			[EN, 'en-US'],
		] as const) {
			for (const [k, v] of Object.entries(bundle)) {
				if (!k.startsWith('incidents.') && !k.startsWith('filter.')) continue;
				if (/90/.test(v) || /\d+\s*(天|days?)/i.test(v)) leaks.push(`${name} ${k}: ${v}`);
			}
		}
		expect(leaks).toEqual([]);
	});

	it('D. 空态文案里不得出现结论词', () => {
		const leaks: string[] = [];
		for (const { key } of TOUCHED) {
			for (const word of VERDICT_MARKS) {
				if (ZH[key]?.includes(word) || EN[key]?.includes(word)) leaks.push(`${key} 含「${word}」`);
			}
		}
		expect(leaks).toEqual([]);
	});

	it('E. 4 个键都确实被 /incidents 页渲染（不是死文案）', () => {
		const page = readSource('app/incidents/page.tsx');
		expect(page).toContain("t('incidents.empty')");
		expect(page).toContain("t('incidents.filteredEmptyHint', { total: datasetTotal })");
		expect(page).toContain("t('incidents.noneYet')");
		expect(page).toContain("t('incidents.noneYetHint')");
		expect(page).toContain("t('filter.clear')");
	});
});

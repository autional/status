import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * 延迟口径文案锁（本次「延迟改名」补测；§1.5 边界内**新增**文件，未改动任何既有测试）。
 *
 * 既有 src/lib/__tests__/i18n-guard.test.ts 只锁三件事：
 *   ① 源码（注释外）无中文字面量；② t() 键在双 bundle 存在；③ 双 bundle 键集合一致。
 * 它**不锁「值」**，因此下面这些缺陷它能全绿放过：
 *   A. 键在、值改错 / 被回退成旧文案；
 *   B. 只改 zh 忘改 en（或反之）；
 *   C. 把 zh 整段抄进 en（键集合仍一致）；
 *   D. 丢插值 {{range}}（页面 t(key,{range}) 后标签不再随时间范围变化）；
 *   E. 键进了 bundle 却从未渲染（死文案）。
 * 本文件对本次被触碰的 5 个键逐条补上 A–E。
 */
const SRC_ROOT = resolve(process.cwd(), 'src');
const readBundle = (rel: string): Record<string, string> =>
	JSON.parse(readFileSync(join(SRC_ROOT, rel), 'utf8'));
const ZH = readBundle('i18n/locales/zh-CN.json');
const EN = readBundle('i18n/locales/en-US.json');
const HAN = /\p{Script=Han}/u;

/** 本次被触碰的 5 个键：3 处改值 + 2 处新增（期望值 = 改动后的口径）。 */
const TOUCHED: Array<{ key: string; zh: string; en: string; old?: string }> = [
	{
		key: 'service.latency',
		zh: '网关探测延迟',
		en: 'Probe Latency (gateway)',
		old: '响应延迟',
	},
	{
		key: 'service.latencyTitle',
		zh: '{{range}} 服务端 P95 延迟趋势',
		en: '{{range}} Server P95 Latency Trend',
		old: '{{range}} 延迟趋势 (P95)',
	},
	{
		key: 'service.latencyP95',
		zh: '服务端 P95 延迟',
		en: 'Server P95 Latency',
		old: 'P95 延迟',
	},
	{
		key: 'service.latencyProbeHint',
		zh: '网关 → 上游健康检查往返（单次实测）',
		en: 'Gateway → upstream health-check round trip (single sample)',
	},
	{
		key: 'service.latencySourceHint',
		zh: '{{range}} P95 · Prometheus 直方图',
		en: '{{range}} P95 · Prometheus histogram',
	},
];

describe('延迟口径文案（zh / en 双 bundle）', () => {
	it('A. 5 个键的值在双 bundle 中逐字锁定', () => {
		const drift: string[] = [];
		for (const { key, zh, en } of TOUCHED) {
			if (ZH[key] !== zh) drift.push(`${key} zh-CN: ${JSON.stringify(ZH[key])} != ${JSON.stringify(zh)}`);
			if (EN[key] !== en) drift.push(`${key} en-US: ${JSON.stringify(EN[key])} != ${JSON.stringify(en)}`);
		}
		expect(drift).toEqual([]);
	});

	it('C. zh 与 en 都真的翻译了（防整段照抄）', () => {
		const problems: string[] = [];
		for (const { key } of TOUCHED) {
			if (!HAN.test(ZH[key] ?? '')) problems.push(`${key}: zh-CN 不含中文`);
			if (HAN.test(EN[key] ?? '')) problems.push(`${key}: en-US 含中文字符（疑似照抄 zh）`);
		}
		expect(problems).toEqual([]);
	});
});

describe('旧口径残留（防回退）', () => {
	it('B. 被改的 3 个键不再等于旧文案（双 bundle）', () => {
		const regressed: string[] = [];
		for (const { key, old } of TOUCHED.filter((t) => t.old)) {
			if (ZH[key] === old) regressed.push(`${key} zh-CN 回退为旧文案 ${JSON.stringify(old)}`);
			if (EN[key] === old) regressed.push(`${key} en-US 回退为旧文案 ${JSON.stringify(old)}`);
		}
		expect(regressed).toEqual([]);
	});

	it('旧的「响应延迟」已不在 zh bundle 的延迟键族里', () => {
		const stale = Object.entries(ZH)
			.filter(([k]) => k.startsWith('service.latency'))
			.filter(([, v]) => v === '响应延迟')
			.map(([k]) => k);
		expect(stale).toEqual([]);
	});
});

describe('插值口径（range 不得丢）', () => {
	it('D. 页面按 t(key, { range }) 调用的键必须保留 {{range}} 占位符', () => {
		const broken: string[] = [];
		for (const key of ['service.latencyTitle', 'service.latencySourceHint']) {
			if (!ZH[key]?.includes('{{range}}')) broken.push(`${key} zh-CN 缺 {{range}}`);
			if (!EN[key]?.includes('{{range}}')) broken.push(`${key} en-US 缺 {{range}}`);
		}
		expect(broken).toEqual([]);
	});
});

describe('新增键不是死文案（E）', () => {
	const readSource = (rel: string) => readFileSync(join(SRC_ROOT, rel), 'utf8');

	it('两个新增口径小字键都确实被渲染出来', () => {
		const detail = readSource('app/services/page.tsx');
		expect(detail).toContain("t('service.latencyProbeHint')");
		expect(detail).toContain("t('service.latencySourceHint', { range })");
	});

	it('service.latency 同时被详情页头部与磁贴浮层渲染（冠名）', () => {
		expect(readSource('app/services/page.tsx')).toContain("t('service.latency')");
		expect(readSource('components/ServiceTile.tsx')).toContain("t('service.latency')");
	});
});

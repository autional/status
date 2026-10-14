import { describe, it, expect } from 'vitest';
import { buildServiceStatuses } from '../api';

/**
 * 回归锁：把「未接入监控」与「健康源不可达」分开。
 *
 * 背景：两者此前都是 status='unknown' 且都显示"无监控探针"，导致
 *   · 网关抓不到时应说"状态未知"，却在说"这服务没监控"（把数据源问题说成服务问题）；
 *   · 反过来也让人以为"没监控"是暂时的。
 * 现在 noProbe 只在"健康源可达 + 该服务无探针条目"时为 true。
 */
const catalog = {
	groups: [],
	allServices: [
		{ id: 'identity-service', name: 'n', description: 'd', port: 11001, category: 'authentication' },
		{ id: 'hash-service-standard', name: 'n', description: 'd', port: 11026, category: 'access-control' },
		{ id: 'gateway-service', name: 'n', description: 'd', port: 11080, category: 'infrastructure' },
	],
	totalCount: 3,
	lastUpdated: '2026-10-14T00:00:00Z',
};

const healthOk = {
	status: 'healthy' as const,
	service: 'gateway-service',
	checks: { 'identity-service:11001': 'healthy' as const },
	checks_latency: { 'identity-service:11001': '2.901104ms' },
	timestamp: '2026-10-14T06:00:00Z',
};

describe('buildServiceStatuses · 未接入监控 vs 状态未知', () => {
	it('有探针的服务：用 checks 的状态，noProbe=false，延迟已带上', () => {
		const [s] = buildServiceStatuses(catalog as any, healthOk as any);
		expect(s).toMatchObject({ id: 'identity-service', status: 'healthy', noProbe: false, latency: '2.901104ms' });
	});

	it('健康源可达但无探针条目 → status=unknown 且 noProbe=true（未接入监控）', () => {
		const list = buildServiceStatuses(catalog as any, healthOk as any);
		const hash = list.find((s) => s.id === 'hash-service-standard')!;
		expect(hash.status).toBe('unknown');
		expect(hash.noProbe).toBe(true);
	});

	it('gateway-service 无自检探针但视为 healthy，且不算"未接入监控"', () => {
		const gw = buildServiceStatuses(catalog as any, healthOk as any).find((s) => s.id === 'gateway-service')!;
		expect(gw.status).toBe('healthy');
		expect(gw.noProbe).toBe(false);
	});

	it('健康源整体不可达 → 全部 unknown，但 noProbe=false（是数据源问题，不是"没监控"）', () => {
		const list = buildServiceStatuses(catalog as any, null);
		expect(list.every((s) => s.status === 'unknown')).toBe(true);
		expect(list.every((s) => s.noProbe === false)).toBe(true);
		// 且不得伪造 lastChecked
		expect(list.every((s) => s.lastChecked === undefined)).toBe(true);
	});

	it('catalog 缺失 → 空数组（不是 27 个 unknown）', () => {
		expect(buildServiceStatuses(null, healthOk as any)).toEqual([]);
	});
});

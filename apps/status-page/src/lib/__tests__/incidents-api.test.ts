import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 事件列表信封（`total`）与服务端筛选参数的下传锁 —— `docs/STATUS-UI-SEMANTICS-OPTIONS.md` §4.1/§C1。
 *
 * 覆盖的失败模式：
 *   A. `total` 又被丢掉（只 return items）⇒ /incidents 空态无法三分诊；
 *   B. `total` 取错层（平铺 vs pagination 嵌套）；
 *   C. 筛选参数没下传服务端 ⇒ 退回"只在前 20 条里筛"的旧缺陷；
 *   D. 出错被 try/catch 吞掉 ⇒ react-query 的 isError 永不触发 ⇒ 故障又被渲染成假绿空态。
 */

vi.mock('@autional/shared/generated/api', () => ({
	statusIncidents: vi.fn(),
}));

import * as Generated from '@autional/shared/generated/api';
import { fetchIncidentList, fetchIncidents } from '@/lib/api';
import type { Incident } from '@/types';

const INCIDENT = {
	id: 'INC-1',
	title: 't',
	description: 'd',
	severity: 'major',
	status: 'resolved',
	affectedServices: ['identity-service'],
	createdAt: '2026-05-20T08:00:00Z',
	updatedAt: '2026-05-20T09:00:00Z',
	updates: [],
} as unknown as Incident;

const mockedStatusIncidents = vi.mocked(Generated.statusIncidents);

beforeEach(() => {
	vi.clearAllMocks();
});

describe('fetchIncidentList — 信封 total 不再被丢', () => {
	it('保留响应信封的 total（平铺字段）', async () => {
		mockedStatusIncidents.mockResolvedValue({
			code: 0,
			items: [INCIDENT],
			total: 7,
			pagination: { total: 7, page: 1, page_size: 20 },
		} as any);

		await expect(fetchIncidentList()).resolves.toEqual({ items: [INCIDENT], total: 7 });
	});

	it('平铺 total 缺失时回退 pagination.total', async () => {
		mockedStatusIncidents.mockResolvedValue({
			items: [INCIDENT],
			pagination: { total: 3, page: 1, page_size: 20 },
		} as any);

		await expect(fetchIncidentList()).resolves.toEqual({ items: [INCIDENT], total: 3 });
	});

	it('两者都缺失时回退当前页条数（不产生 NaN）', async () => {
		mockedStatusIncidents.mockResolvedValue({ items: [INCIDENT] } as any);

		await expect(fetchIncidentList()).resolves.toEqual({ items: [INCIDENT], total: 1 });
	});

	it('total=0 是合法值，不得被 "??" 兜底成 items.length', async () => {
		mockedStatusIncidents.mockResolvedValue({ items: [], total: 0 } as any);

		await expect(fetchIncidentList()).resolves.toEqual({ items: [], total: 0 });
	});

	it('items 缺失 ⇒ 空数组（不抛）', async () => {
		mockedStatusIncidents.mockResolvedValue({ total: 0 } as any);

		await expect(fetchIncidentList()).resolves.toEqual({ items: [], total: 0 });
	});
});

describe('fetchIncidentList — 服务端筛选参数下传', () => {
	it('severity/status 原样传给 SDK（接口已支持这些 query 参数）', async () => {
		mockedStatusIncidents.mockResolvedValue({ items: [], total: 0 } as any);

		await fetchIncidentList({ severity: 'critical', status: 'investigating' });

		expect(mockedStatusIncidents).toHaveBeenCalledWith({
			severity: 'critical',
			status: 'investigating',
		});
	});

	it('无筛选时不带任何参数', async () => {
		mockedStatusIncidents.mockResolvedValue({ items: [], total: 0 } as any);

		await fetchIncidentList();

		expect(mockedStatusIncidents).toHaveBeenCalledWith(undefined);
	});
});

describe('fetchIncidentList — 失败必须外抛（isError 是故障态的开关）', () => {
	it('SDK 抛错 ⇒ fetchIncidentList 也抛（不吞）', async () => {
		mockedStatusIncidents.mockRejectedValue(new Error('boom'));

		await expect(fetchIncidentList()).rejects.toThrow('boom');
	});
});

describe('fetchIncidents — 兼容旧消费者（仍返回数组）', () => {
	it('返回 items 数组', async () => {
		mockedStatusIncidents.mockResolvedValue({ items: [INCIDENT], total: 1 } as any);

		await expect(fetchIncidents()).resolves.toEqual([INCIDENT]);
	});
});

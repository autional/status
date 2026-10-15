import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import i18n from '@/i18n';
import ServiceDetailPage from '../services/page';

/**
 * 服务详情页「关联事件」三分诊渲染锁（T33 ②；边界内**新增**文件，未改动任何既有测试）。
 *
 * 与 `service-detail-uptime/latency.test.tsx` 同法：走**真实 bundle**（import '@/i18n'），
 * 断言 bundle → t() → DOM 端到端一致（复用**既有** `incidents.*` 文案键，不新造文案）。
 *
 * 覆盖的失败模式（此前的同型缺陷：`incidents.length > 0 &&` 才渲染 ⇒ 接口故障被静默隐藏）：
 *   - (c) 取数失败被渲染成"没事"（整块消失 / 绿色空态）—— 假绿；
 *   - (a) 数据集为空 与 (b) 本服务无关联事件 被合并成同一态；
 *   - (b′) 数据集总数查询失败时仍敢断言"没有事件"；
 *   - 只对首页 20 条做前端过滤（服务端 `service` 参数没下传）。
 */

vi.mock('@/hooks/use-system-status', () => ({
	useServiceStatuses: vi.fn(),
	useIncidentList: vi.fn(),
	useLatencyMetrics: vi.fn(),
	useUptimeMetrics: vi.fn(),
}));

vi.mock('@/components/LatencyChart', () => ({
	default: () => <div data-testid="latency-chart" />,
}));

vi.mock('@/components/UptimeChart', () => ({
	UptimeChart: () => <div data-testid="uptime-chart" />,
}));

vi.mock('@/components/IncidentTimeline', () => ({
	default: ({ incidents }: any) => (
		<div data-testid="incident-timeline">{incidents.length} incidents</div>
	),
}));

import {
	useServiceStatuses,
	useIncidentList,
	useLatencyMetrics,
	useUptimeMetrics,
} from '@/hooks/use-system-status';

const SERVICE = {
	id: 'identity-service',
	status: 'healthy' as const,
	latency: '13.116463ms',
	lastChecked: '2026-10-15T04:00:00Z',
};

const INCIDENT = {
	id: 'INC-1',
	title: 'Auth Service Latency',
	description: 'Increased latency on identity-service',
	severity: 'major' as const,
	status: 'resolved' as const,
	affectedServices: ['identity-service'],
	createdAt: '2026-05-20T08:00:00Z',
	updatedAt: '2026-05-20T09:00:00Z',
	resolvedAt: '2026-05-20T09:00:00Z',
	updates: [],
};

const ANOTHER_SERVICE_INCIDENT = {
	...INCIDENT,
	id: 'INC-2',
	affectedServices: ['audit-service'],
};

interface QueryResult {
	items?: unknown[];
	total?: number;
	isLoading?: boolean;
	isError?: boolean;
}

/**
 * 页面对 `useIncidentList` 有两条查询：
 *   - 带 `service` 过滤 → 「本服务关联事件」查询
 *   - 不带 filters        → 「数据集总数」查询
 * 按"是否带 service"分流 mock，正是页面实现所依赖的语义。
 */
function mockQueries(opts: { service?: QueryResult; dataset: QueryResult }) {
	vi.mocked(useIncidentList).mockImplementation(((filters?: { service?: string }) => {
		const scoped = Boolean(filters?.service);
		const picked = scoped ? (opts.service ?? opts.dataset) : opts.dataset;
		return {
			data:
				picked.items === undefined
					? undefined
					: { items: picked.items, total: picked.total ?? 0 },
			isLoading: picked.isLoading ?? false,
			isError: picked.isError ?? false,
		};
	}) as any);
}

function mockBase() {
	vi.mocked(useServiceStatuses).mockReturnValue({ data: [SERVICE], isLoading: false } as any);
	vi.mocked(useLatencyMetrics).mockReturnValue({
		data: { available: true, points: [] },
		isLoading: false,
	} as any);
	vi.mocked(useUptimeMetrics).mockReturnValue({
		data: { available: true, points: [] },
		isLoading: false,
	} as any);
}

function renderDetail() {
	return render(
		<MemoryRouter initialEntries={['/services/identity-service']}>
			<Routes>
				<Route path="/services/:serviceId" element={<ServiceDetailPage />} />
			</Routes>
		</MemoryRouter>,
	);
}

beforeEach(async () => {
	vi.clearAllMocks();
	mockBase();
	await i18n.changeLanguage('zh-CN');
});

describe('服务详情页 · 关联事件 三分诊', () => {
	it('有数据：渲染 IncidentTimeline', () => {
		mockQueries({
			service: { items: [INCIDENT], total: 1 },
			dataset: { items: [INCIDENT], total: 1 },
		});

		renderDetail();
		expect(screen.getByTestId('incident-timeline')).toBeInTheDocument();
		expect(screen.queryByText('事件数据暂时不可用')).toBeNull();
		expect(screen.queryByText('尚无事件记录')).toBeNull();
	});

	it('(a) 数据集为空：total=0 ⇒ 「尚无事件记录」，不是「没有符合条件的事件」', () => {
		mockQueries({ dataset: { items: [], total: 0 } });

		renderDetail();
		expect(screen.getByText('尚无事件记录')).toBeInTheDocument();
		expect(screen.getByText('我们尚未在此公告过任何事件。')).toBeInTheDocument();
		expect(screen.queryByText('没有符合条件的事件')).toBeNull();
		expect(screen.queryByText('事件数据暂时不可用')).toBeNull();
		expect(screen.queryByTestId('incident-timeline')).toBeNull();
	});

	it('(b) 本服务无关联事件而数据集非空：⇒ 「没有符合条件的事件」+ 总数（不宣称"尚无事件记录"）', () => {
		mockQueries({
			service: { items: [], total: 0 },
			dataset: { items: [ANOTHER_SERVICE_INCIDENT], total: 5 },
		});

		renderDetail();
		expect(screen.getByText('没有符合条件的事件')).toBeInTheDocument();
		expect(screen.getByText('共 5 条事件记录，当前筛选无匹配。')).toBeInTheDocument();
		expect(screen.queryByText('尚无事件记录')).toBeNull();
		expect(screen.queryByTestId('incident-timeline')).toBeNull();
	});

	it('(c) 取数失败 ⇒ 错误态；「关联事件」区块不得静默消失（假绿回归锁）', () => {
		mockQueries({ service: { items: undefined, isError: true }, dataset: { items: [], total: 0 } });
		// 让可用率 KPI 渲染成数字（否则它也会渲染 '—'，干扰下面针对 KPI 的 '—' 断言）。
		vi.mocked(useUptimeMetrics).mockReturnValue({
			data: { available: true, points: [{ timestamp: '2026-10-15T00:00:00Z', value: 100 }] },
			isLoading: false,
		} as any);

		renderDetail();
		expect(screen.getByText('事件数据暂时不可用')).toBeInTheDocument();
		expect(
			screen.getByText('我们没有取到事件数据——这不代表「没有事件」。请稍后重试。'),
		).toBeInTheDocument();
		// 核心回归锁：接口故障时这块**仍然在**（旧实现是 `incidents.length > 0 &&` ⇒ 整块消失）。
		// 「关联事件」在本页出现两处（KPI 标签 + 区块标题），都在。
		expect(screen.getAllByText('关联事件').length).toBe(2);
		expect(screen.queryByText('尚无事件记录')).toBeNull();
		// KPI 计数同口径：取不到 ⇒ 「—」，不得显示 0（否则与区块"取不到"自相矛盾）。
		expect(screen.getByText('—')).toBeInTheDocument();
		expect(screen.queryByText('0')).toBeNull();
	});

	it('(c′) 本服务 0 条、但"数据集总数"查询失败 ⇒ 不敢断言"尚无事件记录"，走错误态', () => {
		mockQueries({
			service: { items: [], total: 0 },
			dataset: { items: undefined, isError: true },
		});

		renderDetail();
		expect(screen.getByText('事件数据暂时不可用')).toBeInTheDocument();
		expect(screen.queryByText('尚无事件记录')).toBeNull();
		expect(screen.queryByText('没有符合条件的事件')).toBeNull();
	});

	it('加载中：给骨架，不闪现「尚无事件记录」', () => {
		mockQueries({ service: { items: undefined, isLoading: true }, dataset: { items: undefined, isLoading: true } });

		renderDetail();
		expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
		expect(screen.queryByText('尚无事件记录')).toBeNull();
		expect(screen.queryByText('事件数据暂时不可用')).toBeNull();
	});

	it('竞态锁（F1）：本服务查询已空、但"数据集总数"仍在途 ⇒ 骨架，不误报「尚无事件记录」', () => {
		// 两条查询 key 不同、独立解析；若骨架只由 incidentsLoading 驱动，
		// 这里会先渲染「尚无事件记录」（假空）再翻转成 (b)。
		mockQueries({
			service: { items: [], total: 0 },
			dataset: { items: undefined, isLoading: true },
		});

		renderDetail();
		expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
		expect(screen.queryByText('尚无事件记录')).toBeNull();
		expect(screen.queryByText('没有符合条件的事件')).toBeNull();
		expect(screen.queryByText('事件数据暂时不可用')).toBeNull();
	});

	it('服务端筛选：`service` 参数下传（不再只在前端过滤首页 20 条）', () => {
		mockQueries({ service: { items: [INCIDENT], total: 1 }, dataset: { items: [INCIDENT], total: 1 } });

		renderDetail();
		expect(vi.mocked(useIncidentList)).toHaveBeenCalledWith({ service: 'identity-service' });
		// 数据集总数那条是无筛选的同源查询
		expect(vi.mocked(useIncidentList)).toHaveBeenCalledWith();
	});
});

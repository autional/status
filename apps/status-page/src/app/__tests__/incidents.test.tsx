import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import IncidentsPage from '../incidents/page';

vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return { ...actual, Link: ({ to, children }: any) => <a href={to}>{children}</a> };
});

vi.mock('react-i18next', async () => {
	const actual = await vi.importActual('react-i18next');
	return {
		...actual,
		useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'zh-CN' } }),
	};
});

vi.mock('@/hooks/use-system-status', () => ({
	useIncidentList: vi.fn(),
}));

vi.mock('@/components/IncidentTimeline', () => ({
	default: ({ incidents }: any) => (
		<div data-testid="incident-timeline">{incidents.length} incidents</div>
	),
}));

import { useIncidentList } from '@/hooks/use-system-status';

const mockIncidents = [
	{
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
	},
	{
		id: 'INC-2',
		title: 'Database Upgrade',
		description: 'Scheduled database maintenance',
		severity: 'maintenance' as const,
		status: 'investigating' as const,
		affectedServices: ['audit-service'],
		createdAt: '2026-05-20T10:00:00Z',
		updatedAt: '2026-05-20T10:00:00Z',
		updates: [],
	},
];

interface QueryResult {
	items?: unknown[];
	total?: number;
	isLoading?: boolean;
	isError?: boolean;
}

/**
 * 页面对 `useIncidentList` 有两条查询：
 *   - 带筛选（filters 里出现 severity/status）→ 「筛选后」查询
 *   - 不带筛选                                  → 「数据集总数」查询
 * 这里按"是否带筛选"分流 mock，正是页面实现所依赖的语义。
 */
function mockQueries(opts: { dataset: QueryResult; filtered?: QueryResult }) {
	vi.mocked(useIncidentList).mockImplementation(((filters?: {
		severity?: string;
		status?: string;
	}) => {
		const hasFilter = Boolean(filters?.severity || filters?.status);
		const picked = hasFilter ? (opts.filtered ?? opts.dataset) : opts.dataset;
		return {
			data: picked.items === undefined ? undefined : { items: picked.items, total: picked.total ?? 0 },
			isLoading: picked.isLoading ?? false,
			isError: picked.isError ?? false,
		};
	}) as any);
}

function renderIncidents() {
	return render(
		<MemoryRouter initialEntries={['/incidents']}>
			<IncidentsPage />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('IncidentsPage', () => {
	it('renders incident list header and filter pills', () => {
		mockQueries({ dataset: { items: mockIncidents, total: 2 } });

		renderIncidents();
		expect(screen.getByText('incidents.title')).toBeInTheDocument();
		expect(screen.getByText('filter.all')).toBeInTheDocument();
		expect(screen.getByText('severity.critical')).toBeInTheDocument();
		expect(screen.getByText('severity.major')).toBeInTheDocument();
		expect(screen.getByText('severity.minor')).toBeInTheDocument();
		expect(screen.getByText('severity.maintenance')).toBeInTheDocument();
	});

	it('shows status filter pills', () => {
		mockQueries({ dataset: { items: mockIncidents, total: 2 } });

		renderIncidents();
		expect(screen.getByText('filter.allStatuses')).toBeInTheDocument();
		expect(screen.getByText('status.investigating')).toBeInTheDocument();
		expect(screen.getByText('status.identified')).toBeInTheDocument();
		expect(screen.getByText('status.monitoring')).toBeInTheDocument();
		expect(screen.getByText('status.resolved')).toBeInTheDocument();
	});

	it('shows incident rows when data loaded', () => {
		mockQueries({ dataset: { items: mockIncidents, total: 2 } });

		renderIncidents();
		const timeline = screen.getByTestId('incident-timeline');
		expect(timeline).toBeInTheDocument();
		expect(timeline.textContent).toContain('2');
	});

	it('shows loading skeleton when data is loading', () => {
		mockQueries({ dataset: { items: undefined, isLoading: true } });

		renderIncidents();
		const skeletons = document.querySelectorAll('.animate-pulse');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	// ── 服务端筛选（§4.1(b) 修复）─────────────────────────────────────────────
	it('把筛选参数交给服务端（不再只对首页 20 条做前端过滤）', () => {
		mockQueries({ dataset: { items: mockIncidents, total: 2 } });

		renderIncidents();
		// 初始（无筛选）不传 severity
		expect(vi.mocked(useIncidentList)).toHaveBeenCalledWith({
			severity: undefined,
			status: undefined,
			service: undefined,
		});

		fireEvent.click(screen.getByText('severity.major'));
		expect(vi.mocked(useIncidentList)).toHaveBeenCalledWith(
			expect.objectContaining({ severity: 'major' }),
		);

		fireEvent.click(screen.getByText('status.resolved'));
		expect(vi.mocked(useIncidentList)).toHaveBeenCalledWith(
			expect.objectContaining({ severity: 'major', status: 'resolved' }),
		);
	});

	it('列表渲染的是服务端返回的 items（页面不再二次前端过滤）', () => {
		// 服务端对 severity=critical 返回一条 severity=minor 的记录（人造）。
		// 若页面仍在做前端过滤，这条会被本地再筛掉 ⇒ 渲染 0 条；只渲染服务端结果 ⇒ 1 条。
		mockQueries({
			dataset: { items: mockIncidents, total: 2 },
			filtered: { items: [{ ...mockIncidents[0], id: 'INC-3', severity: 'minor' }], total: 1 },
		});

		renderIncidents();
		fireEvent.click(screen.getByText('severity.critical'));

		const timeline = screen.getByTestId('incident-timeline');
		expect(timeline.textContent).toContain('1');
	});

	// ── 空态三分诊（§4.1(a)/(b)/(c)）─────────────────────────────────────────
	it('(a) 真的没有事件：total=0 ⇒ 「尚无事件记录」，不是「没有符合条件的事件」', () => {
		mockQueries({ dataset: { items: [], total: 0 } });

		renderIncidents();
		expect(screen.getByText('incidents.noneYet')).toBeInTheDocument();
		expect(screen.getByText('incidents.noneYetHint')).toBeInTheDocument();
		expect(screen.queryByText('incidents.empty')).toBeNull();
		expect(screen.queryByText('incidents.error')).toBeNull();
	});

	it('(b) 筛选后为空：数据集有多条、当前筛选 0 条 ⇒ 「没有符合条件的事件」+ 总数 + 清除筛选', () => {
		mockQueries({
			dataset: { items: mockIncidents, total: 5 },
			filtered: { items: [], total: 0 },
		});

		renderIncidents();
		// 初始无筛选 ⇒ 正常列表
		expect(screen.getByTestId('incident-timeline')).toBeInTheDocument();

		fireEvent.click(screen.getByText('severity.critical'));

		expect(screen.getByText('incidents.empty')).toBeInTheDocument();
		expect(screen.getByText('incidents.filteredEmptyHint')).toBeInTheDocument();
		expect(screen.getByText('filter.clear')).toBeInTheDocument();
		expect(screen.queryByTestId('incident-timeline')).toBeNull();
		// 数据集非空 ⇒ 绝不宣称"尚无事件记录"
		expect(screen.queryByText('incidents.noneYet')).toBeNull();
	});

	it('(b) 点「清除筛选」回到数据集列表', () => {
		mockQueries({
			dataset: { items: mockIncidents, total: 5 },
			filtered: { items: [], total: 0 },
		});

		renderIncidents();
		fireEvent.click(screen.getByText('severity.critical'));
		expect(screen.getByText('filter.clear')).toBeInTheDocument();

		fireEvent.click(screen.getByText('filter.clear'));
		expect(screen.getByTestId('incident-timeline')).toBeInTheDocument();
		expect(screen.queryByText('incidents.empty')).toBeNull();
	});

	it('(c) 接口故障 ⇒ 错误态，不是绿色空态（假绿回归锁）', () => {
		mockQueries({ dataset: { items: undefined, isError: true } });

		renderIncidents();
		expect(screen.getByText('incidents.error')).toBeInTheDocument();
		expect(screen.queryByText('incidents.empty')).toBeNull();
		expect(screen.queryByText('incidents.noneYet')).toBeNull();
	});

	it('(c) 列表空但"数据集总数"查询失败 ⇒ 不敢断言"尚无事件记录"，走错误态', () => {
		vi.mocked(useIncidentList).mockImplementation(((filters?: {
			severity?: string;
			status?: string;
		}) => {
			const hasFilter = Boolean(filters?.severity || filters?.status);
			return hasFilter
				? { data: { items: [], total: 0 }, isLoading: false, isError: false }
				: { data: undefined, isLoading: false, isError: true };
		}) as any);

		renderIncidents();
		fireEvent.click(screen.getByText('severity.critical'));

		expect(screen.getByText('incidents.error')).toBeInTheDocument();
		expect(screen.queryByText('incidents.noneYet')).toBeNull();
	});
});

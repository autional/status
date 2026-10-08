import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import DashboardPage from '../page';

vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return { ...actual, Link: ({ to, children }: any) => <a href={to}>{children}</a> };
});

vi.mock('react-i18next', async () => {
	const actual = await vi.importActual('react-i18next');
	return {
		...actual,
		// 忠实模拟 i18next 的 defaultValue 回退：服务名/组名走 catalog 中文名（见 page.tsx I-01）
		useTranslation: () => ({
			t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
			i18n: { language: 'zh-CN' },
		}),
	};
});

// catalog 权威服务清单（2 服务 1 组）—— 前端服务清单唯一来源
const mockCatalog = {
	groups: [
		{
			id: 'test-group',
			name: 'Test Group',
			description: 'Test',
			services: [
				{ id: 'svc-0', name: 'n0', description: 'd0', port: 11000, category: 'test' },
				{ id: 'svc-1', name: 'n1', description: 'd1', port: 11001, category: 'test' },
			],
		},
	],
	allServices: [
		{ id: 'svc-0', name: 'n0', description: 'd0', port: 11000, category: 'test' },
		{ id: 'svc-1', name: 'n1', description: 'd1', port: 11001, category: 'test' },
	],
	totalCount: 2,
	lastUpdated: '2026-05-20T10:00:00Z',
};

// catalog × /ready 派生的服务状态（见 lib/api.ts buildServiceStatuses）
const mockServices = [
	{ id: 'svc-0', status: 'healthy' as const, lastChecked: '2026-05-20T10:00:00Z' },
	{ id: 'svc-1', status: 'healthy' as const, lastChecked: '2026-05-20T10:00:00Z' },
];

const mockIncidents = [
	{
		id: 'INC-1',
		title: 'Test Incident',
		description: 'Desc',
		severity: 'major' as const,
		status: 'resolved' as const,
		affectedServices: ['svc-1'],
		createdAt: '2026-05-20T08:00:00Z',
		updatedAt: '2026-05-20T09:00:00Z',
		resolvedAt: '2026-05-20T09:00:00Z',
		updates: [],
	},
];

vi.mock('@/hooks/use-system-status', () => ({
	useServiceStatuses: vi.fn(),
	useIncidents: vi.fn(),
	useOverview: vi.fn(),
	useServiceCatalog: vi.fn(),
	useMaintenances: vi.fn(),
}));

vi.mock('@/components/RefreshCountdown', () => ({
	default: () => <span data-testid="refresh-countdown">30s</span>,
}));

vi.mock('@/components/ServiceGroup', () => ({
	default: ({ name }: any) => <div data-testid="service-group">{name}</div>,
}));

vi.mock('@/components/IncidentTimeline', () => ({
	default: ({ incidents }: any) => (
		<div data-testid="incident-timeline">{incidents.length} incidents</div>
	),
}));

vi.mock('@/components/StatusIndicator', () => ({
	default: ({ status }: any) => <span data-testid="status-indicator">{status}</span>,
}));

// lib/api：分组结构从 catalog 派生（零硬编码清单）
vi.mock('@/lib/api', () => ({
	buildGroupStructure: (catalog: any) =>
		(catalog?.groups || []).map((g: any) => ({
			id: g.id,
			name: g.name,
			description: g.description,
			services: g.services.map((s: any) => s.id),
		})),
}));

import {
	useServiceStatuses,
	useIncidents,
	useOverview,
	useServiceCatalog,
	useMaintenances,
} from '@/hooks/use-system-status';

function renderDashboard() {
	return render(
		<MemoryRouter>
			<DashboardPage />
		</MemoryRouter>,
	);
}

/** 默认加载完成态：catalog + 派生 services + incidents + overview + maintenances */
function mockLoadedHooks() {
	vi.mocked(useServiceStatuses).mockReturnValue({
		data: mockServices,
		isLoading: false,
		isFetching: false,
		refetch: vi.fn(),
	} as any);
	vi.mocked(useIncidents).mockReturnValue({ data: mockIncidents, isLoading: false } as any);
	vi.mocked(useOverview).mockReturnValue({
		data: { activeIncidents: 0, lastUpdated: '2026-05-20T10:00:00Z' },
		isLoading: false,
	} as any);
	vi.mocked(useServiceCatalog).mockReturnValue({
		data: mockCatalog,
		isLoading: false,
	} as any);
	vi.mocked(useMaintenances).mockReturnValue({
		data: [],
		isLoading: false,
	} as any);
}

beforeEach(() => {
	vi.clearAllMocks();
	mockLoadedHooks();
});

describe('DashboardPage', () => {
	it('renders overall status banner (legend)', () => {
		renderDashboard();
		expect(screen.getByText('status.operational')).toBeInTheDocument();
		expect(screen.getByText('status.degraded')).toBeInTheDocument();
		expect(screen.getByText('status.down')).toBeInTheDocument();
	});

	it('shows service groups derived from catalog', () => {
		renderDashboard();
		const groups = screen.getAllByTestId('service-group');
		expect(groups.length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText('Test Group')).toBeInTheDocument();
	});

	it('shows stat card with catalog-derived service count (healthy/total)', () => {
		renderDashboard();
		expect(screen.getByText('stat.services')).toBeInTheDocument();
		expect(screen.getByText('2/2')).toBeInTheDocument();
	});

	it('shows refresh countdown', () => {
		renderDashboard();
		expect(screen.getByTestId('refresh-countdown')).toBeInTheDocument();
	});

	it('shows loading skeleton when status is loading', () => {
		vi.mocked(useServiceStatuses).mockReturnValue({
			data: undefined,
			isLoading: true,
			isFetching: false,
			refetch: vi.fn(),
		} as any);

		renderDashboard();
		const skeletons = document.querySelectorAll('.animate-pulse');
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it('shows 4 stat cards (服务状态, 活跃事件, 计划维护, 最后更新)', () => {
		renderDashboard();
		expect(screen.getByText('stat.services')).toBeInTheDocument();
		expect(screen.getByText('stat.incidents')).toBeInTheDocument();
		expect(screen.getByText('stat.maintenance')).toBeInTheDocument();
		expect(screen.getByText('lastUpdated')).toBeInTheDocument();
	});
});

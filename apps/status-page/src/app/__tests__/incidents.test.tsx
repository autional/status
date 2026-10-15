import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
	useIncidents: vi.fn(),
}));

vi.mock('@/components/IncidentTimeline', () => ({
	default: ({ incidents }: any) => (
		<div data-testid="incident-timeline">{incidents.length} incidents</div>
	),
}));

import { useIncidents } from '@/hooks/use-system-status';

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
		vi.mocked(useIncidents).mockReturnValue({
			data: mockIncidents,
			isLoading: false,
		} as any);

		renderIncidents();
		expect(screen.getByText('incidents.title')).toBeInTheDocument();
		expect(screen.getByText('filter.all')).toBeInTheDocument();
		expect(screen.getByText('severity.critical')).toBeInTheDocument();
		expect(screen.getByText('severity.major')).toBeInTheDocument();
		expect(screen.getByText('severity.minor')).toBeInTheDocument();
		expect(screen.getByText('severity.maintenance')).toBeInTheDocument();
	});

	it('shows severity filter pills', () => {
		vi.mocked(useIncidents).mockReturnValue({
			data: mockIncidents,
			isLoading: false,
		} as any);

		renderIncidents();
		expect(screen.getByText('filter.all')).toBeInTheDocument();
		expect(screen.getByText('severity.critical')).toBeInTheDocument();
	});

	it('shows status filter pills', () => {
		vi.mocked(useIncidents).mockReturnValue({
			data: mockIncidents,
			isLoading: false,
		} as any);

		renderIncidents();
		expect(screen.getByText('filter.allStatuses')).toBeInTheDocument();
		expect(screen.getByText('status.investigating')).toBeInTheDocument();
		expect(screen.getByText('status.identified')).toBeInTheDocument();
		expect(screen.getByText('status.monitoring')).toBeInTheDocument();
		expect(screen.getByText('status.resolved')).toBeInTheDocument();
	});

	it('shows incident rows when data loaded', () => {
		vi.mocked(useIncidents).mockReturnValue({
			data: mockIncidents,
			isLoading: false,
		} as any);

		renderIncidents();
		const timeline = screen.getByTestId('incident-timeline');
		expect(timeline).toBeInTheDocument();
		expect(timeline.textContent).toContain('2');
	});

	it('shows empty state when no incidents', () => {
		vi.mocked(useIncidents).mockReturnValue({
			data: [],
			isLoading: false,
		} as any);

		renderIncidents();
		expect(screen.getByText('incidents.empty')).toBeInTheDocument();
	});

	it('shows an error state (not the empty state) when the incidents request fails', () => {
		// 接口报错 ⇒ 必须是"取不到"的错误态，绝不能渲染成绿色的"没有符合条件的事件"（假绿）。
		vi.mocked(useIncidents).mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		} as any);

		renderIncidents();
		expect(screen.getByText('incidents.error')).toBeInTheDocument();
		expect(screen.queryByText('incidents.empty')).toBeNull();
	});

	it('still shows the empty state (no error) when the request succeeds with zero items', () => {
		vi.mocked(useIncidents).mockReturnValue({
			data: [],
			isLoading: false,
			isError: false,
		} as any);

		renderIncidents();
		expect(screen.getByText('incidents.empty')).toBeInTheDocument();
		expect(screen.queryByText('incidents.error')).toBeNull();
	});

	it('shows loading skeleton when data is loading', () => {
		vi.mocked(useIncidents).mockReturnValue({
			data: undefined,
			isLoading: true,
		} as any);

		renderIncidents();
		const skeletons = document.querySelectorAll('.animate-pulse');
		expect(skeletons.length).toBeGreaterThan(0);
	});
});

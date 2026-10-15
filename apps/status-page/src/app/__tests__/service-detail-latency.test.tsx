import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import i18n from '@/i18n';
import ServiceDetailPage from '../services/page';

/**
 * 服务详情页「延迟口径」渲染锁（本次改名补测；§1.5 边界内**新增**文件）。
 *
 * 与既有 app/__tests__ 的差异（有意为之）：既有用例一律 mock react-i18next 让 t() 回显键名，
 * 那只验证结构、**永远看不见真实文案**。本用例走真实 bundle（import '@/i18n'），
 * 断言「bundle → t() → DOM」端到端一致 —— 这正是本次改动（改 3 值 / 增 2 键 / 新增 2 处渲染）的判据。
 *
 * 覆盖的失败模式：
 *   - 头部口径小字没渲染 / 文案错；
 *   - 图表口径小字没渲染 / {{range}} 没被替换 / 不随时间范围变化；
 *   - 旧文案（响应延迟 / 延迟趋势 (P95)）仍出现在页面上。
 */

vi.mock('@/hooks/use-system-status', () => ({
	useServiceStatuses: vi.fn(),
	useIncidents: vi.fn(),
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
	default: () => null,
}));

import {
	useServiceStatuses,
	useIncidents,
	useLatencyMetrics,
	useUptimeMetrics,
} from '@/hooks/use-system-status';

const SERVICE = {
	id: 'identity-service',
	status: 'healthy' as const,
	latency: '13.116463ms',
	lastChecked: '2026-10-15T04:00:00Z',
};

const POINTS = [
	{ timestamp: '2026-10-15T00:00:00Z', value: 0.0131 },
	{ timestamp: '2026-10-15T01:00:00Z', value: 0.0142 },
];

function mockLoaded() {
	vi.mocked(useServiceStatuses).mockReturnValue({ data: [SERVICE], isLoading: false } as any);
	vi.mocked(useIncidents).mockReturnValue({ data: [], isLoading: false } as any);
	vi.mocked(useLatencyMetrics).mockReturnValue({
		data: { available: true, points: POINTS },
		isLoading: false,
	} as any);
	vi.mocked(useUptimeMetrics).mockReturnValue({
		data: { available: true, points: POINTS },
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
	mockLoaded();
	await i18n.changeLanguage('zh-CN');
});

describe('服务详情页 · 延迟口径渲染', () => {
	it('头部「网关探测延迟」标签 + 口径小字都渲染出来', () => {
		renderDetail();
		// 改名后的标签（旧文案为「响应延迟」）
		expect(screen.getByText('网关探测延迟')).toBeInTheDocument();
		// 头部口径小字：单次探针读数（与图表 P95 聚合同页出现，必须显式区分）
		expect(screen.getByText('网关 → 上游健康检查往返（单次实测）')).toBeInTheDocument();
		// 数字本身仍在
		expect(screen.getByText('13.1ms')).toBeInTheDocument();
	});

	it('图表口径小字渲染出来，且 {{range}} 被真实时间范围替换（不是字面 {{range}}）', () => {
		renderDetail();
		expect(screen.getByText('24h P95 · Prometheus 直方图')).toBeInTheDocument();
		expect(screen.queryByText(/\{\{range\}\}/)).not.toBeInTheDocument();
	});

	it('切换时间范围后，口径小字随之变化（证明插值真的绑定 state）', () => {
		renderDetail();
		fireEvent.click(screen.getByText('7天'));
		expect(screen.getByText('7d P95 · Prometheus 直方图')).toBeInTheDocument();
		expect(screen.queryByText('24h P95 · Prometheus 直方图')).not.toBeInTheDocument();
	});

	it('图表标题为新口径「服务端 P95 延迟趋势」，旧标题不再出现', () => {
		renderDetail();
		expect(screen.getByText('24h 服务端 P95 延迟趋势')).toBeInTheDocument();
		expect(screen.queryByText('24h 延迟趋势 (P95)')).not.toBeInTheDocument();
		expect(screen.queryByText('响应延迟')).not.toBeInTheDocument();
	});
});

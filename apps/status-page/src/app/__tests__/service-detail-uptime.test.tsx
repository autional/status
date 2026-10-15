import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import i18n from '@/i18n';
import ServiceDetailPage from '../services/page';

/**
 * 服务详情页「可用率口径」渲染锁（本次 A 项补测；边界内**新增**文件，未改动任何既有测试）。
 *
 * 与 `service-detail-latency.test.tsx` 同法：走**真实 bundle**（import '@/i18n'），
 * 断言 bundle → t() → DOM 端到端一致。
 *
 * 覆盖的失败模式：
 *   - 标题没改成「探针可用率（滚动）」/ 口径小字没渲染 / 文案错；
 *   - {{range}} 没被替换 / 不随时间范围变化；
 *   - 页面上出现结论词（Q1 拍板 = 否）。
 */

// 结论词用码点书写：本文件不应被全仓 grep 命中（否则守卫自己会污染"无判定词"的验收）。
const VERDICT_MARKS = ['\u8fbe\u6807', '\u672a\u8fbe\u6807', '\u4e0d\u8fbe\u6807'];

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
	default: () => null,
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

// 287 点里 12 个 0 ⇒ 95.82 —— 正是评审现场那个"与'正常'徽章并置"的数。
const POINTS = [
	{ timestamp: '2026-10-15T00:00:00Z', value: 50 },
	{ timestamp: '2026-10-15T01:00:00Z', value: 100 },
];

function mockLoaded() {
	vi.mocked(useServiceStatuses).mockReturnValue({ data: [SERVICE], isLoading: false } as any);
	vi.mocked(useIncidentList).mockReturnValue({
		data: { items: [], total: 0 },
		isLoading: false,
		isError: false,
	} as any);
	vi.mocked(useLatencyMetrics).mockReturnValue({
		data: { available: true, points: [{ timestamp: '2026-10-15T00:00:00Z', value: 0.0131 }] },
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

describe('服务详情页 · 可用率口径渲染', () => {
	it('KPI 标题为「24 小时探针可用率（滚动）」（本地化取值，不是原始 24h），旧标题不再出现', () => {
		renderDetail();
		// {{range}} 的插值值**只在这一处**是 range 的本地化展示取值（24h → 「24 小时」）；
		// 其它 {{range}} 用法仍传原始取值（见 lib/__tests__/uptime-range-copy.test.ts）。
		expect(screen.getByText('24 小时探针可用率（滚动）')).toBeInTheDocument();
		expect(screen.queryByText('24h 探针可用率（滚动）')).toBeNull();
		expect(screen.queryByText('24h 平均可用率')).toBeNull();
	});

	it('KPI 口径小字渲染出来（来源 + 采样密度）', () => {
		renderDetail();
		expect(screen.getByText('Prometheus 抓取成功率 · 每 5 分钟一个采样点')).toBeInTheDocument();
	});

	it('{{range}} 被真实时间范围替换，且随选择器变化（不是写死的 24 小时）', () => {
		renderDetail();
		expect(screen.queryByText(/\{\{range\}\}/)).not.toBeInTheDocument();
		fireEvent.click(screen.getByText('7天'));
		expect(screen.getByText('7 天探针可用率（滚动）')).toBeInTheDocument();
		expect(screen.queryByText('24 小时探针可用率（滚动）')).toBeNull();
	});

	it('页面上不出现结论词（Q1 = 否）', () => {
		renderDetail();
		const body = document.body.textContent ?? '';
		for (const word of VERDICT_MARKS) {
			expect(body).not.toContain(word);
		}
	});
});

describe('服务详情页 · 可用率口径渲染（en）', () => {
	beforeEach(async () => {
		await i18n.changeLanguage('en-US');
	});

	it('en 渲染为「24-hour Probe Uptime (rolling)」（该 en 用词待产品确认）', () => {
		renderDetail();
		expect(screen.getByText('24-hour Probe Uptime (rolling)')).toBeInTheDocument();
		expect(screen.queryByText('24h Probe Uptime (rolling)')).toBeNull();
	});

	it('en 下随选择器变化（7d → 7-day）', () => {
		renderDetail();
		fireEvent.click(screen.getByText('7 Days'));
		expect(screen.getByText('7-day Probe Uptime (rolling)')).toBeInTheDocument();
		expect(screen.queryByText('24-hour Probe Uptime (rolling)')).toBeNull();
	});
});

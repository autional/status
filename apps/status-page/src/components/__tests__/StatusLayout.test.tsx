import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StatusLayout from '../StatusLayout';
import StatusHeader from '../StatusHeader';
import { normalizeOverallStatus } from '@/lib/api';

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
	useSystemStatus: vi.fn(),
	useOverview: vi.fn(),
}));

vi.mock('@autional/ui', () => ({
	ThemeToggle: () => null,
	LanguageSwitcher: () => null,
}));

vi.mock('@/components/RefreshCountdown', () => ({
	default: () => <span data-testid="refresh-countdown">30s</span>,
}));

import { useSystemStatus, useOverview } from '@/hooks/use-system-status';

function mockSources(ready: unknown, overview: unknown) {
	vi.mocked(useSystemStatus).mockReturnValue({ data: ready } as any);
	vi.mocked(useOverview).mockReturnValue({ data: overview } as any);
}

function renderLayout() {
	return render(
		<MemoryRouter>
			<StatusLayout />
		</MemoryRouter>,
	);
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe('StatusLayout 横幅词表归一化', () => {
	// 回归锁：status-service overview 返回 operational（后端词表，非 healthy）。
	// 历史实现在 StatusHeader 色板表查到 undefined 后读 .bg 抛 TypeError → 整站白屏。
	it('overview 返回后端词表 operational → 渲染"正常"横幅而非崩溃', () => {
		mockSources(null, { overallStatus: 'operational' });
		renderLayout();
		expect(screen.getByText('banner.healthy')).toBeInTheDocument();
	});

	it('overview 返回 unavailable → 渲染"未知"横幅（服务端无法聚合 ≠ 故障）', () => {
		mockSources(null, { overallStatus: 'unavailable' });
		renderLayout();
		expect(screen.getByText('banner.unknown')).toBeInTheDocument();
	});

	it('/ready 优先于 overview（gateway 词表直通）', () => {
		mockSources({ status: 'degraded' }, { overallStatus: 'operational' });
		renderLayout();
		expect(screen.getByText('banner.degraded')).toBeInTheDocument();
	});

	it('两个来源都无数据 → 回退"未知"横幅（绝不默认 healthy 全绿，V-01）', () => {
		mockSources(undefined, undefined);
		renderLayout();
		expect(screen.getByText('banner.unknown')).toBeInTheDocument();
	});

	it('StatusHeader 收到表外出值 → 按 unknown 渲染，不白屏不误报', () => {
		render(
			<MemoryRouter>
				<StatusHeader overallStatus={'weird-value' as any} />
			</MemoryRouter>,
		);
		expect(screen.getByText('banner.unknown')).toBeInTheDocument();
	});
});

describe('normalizeOverallStatus', () => {
	it('映射 gateway /ready 与 status-service 两套词表', () => {
		expect(normalizeOverallStatus('healthy')).toBe('healthy');
		expect(normalizeOverallStatus('operational')).toBe('healthy');
		expect(normalizeOverallStatus('degraded')).toBe('degraded');
		expect(normalizeOverallStatus('unhealthy')).toBe('unhealthy');
		expect(normalizeOverallStatus('unavailable')).toBe('unknown');
	});

	it('空值返回 null（调用方回退默认），未知值返回 unknown（不误报全绿也不误报故障）', () => {
		expect(normalizeOverallStatus(undefined)).toBeNull();
		expect(normalizeOverallStatus(null)).toBeNull();
		expect(normalizeOverallStatus('')).toBeNull();
		expect(normalizeOverallStatus('something-new')).toBe('unknown');
	});
});

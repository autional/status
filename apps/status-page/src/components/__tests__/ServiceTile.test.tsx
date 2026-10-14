import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ServiceTile from '../ServiceTile';

vi.mock('react-router', async () => {
	const actual = await vi.importActual('react-router');
	return {
		...actual,
		Link: ({ to, children, ...rest }: any) => (
			<a href={to} {...rest}>
				{children}
			</a>
		),
	};
});

const DICT: Record<string, string> = {
	'service.name.identity-service': '身份认证服务',
	'service.desc.identity-service': '用户注册、登录、密码管理',
	'status.operational': '正常',
	'status.unknown': '未知',
	'status.unmonitored': '未接入监控',
	'service.noMonitor': '无监控探针',
	'service.statusUnknown': '状态未知（数据源不可达）',
};

vi.mock('react-i18next', async () => {
	const actual = await vi.importActual('react-i18next');
	return {
		...actual,
		useTranslation: () => ({
			t: (key: string, opts?: { defaultValue?: string }) =>
				DICT[key] ?? opts?.defaultValue ?? key,
			i18n: { language: 'zh-CN' },
		}),
	};
});

const baseService = {
	id: 'identity-service',
	status: 'healthy' as const,
	latency: '13.116463ms',
	lastChecked: '2026-10-14T04:00:00Z',
};

function renderTile(overrides: Record<string, unknown> = {}) {
	return render(
		<MemoryRouter>
			<ServiceTile service={{ ...baseService, ...overrides } as any} />
		</MemoryRouter>,
	);
}

describe('ServiceTile', () => {
	it('渲染服务名 + 去噪后的延迟，并链接到详情页', () => {
		renderTile();
		expect(screen.getByText('身份认证服务')).toBeInTheDocument();
		expect(screen.getByText('13.1ms')).toBeInTheDocument();
		expect(screen.getByRole('link')).toHaveAttribute('href', '/services/identity-service');
	});

	it('未接入监控且无延迟时显示"无监控探针"，不显示空串（不冒充健康）', () => {
		renderTile({ status: 'unknown', latency: undefined, noProbe: true });
		expect(screen.getByText('无监控探针')).toBeInTheDocument();
		expect(screen.queryByText('13.1ms')).not.toBeInTheDocument();
	});

	it('未接入监控（noProbe）→ aria-label 用「未接入监控」而非「未知」', () => {
		renderTile({ status: 'unknown', latency: undefined, noProbe: true });
		expect(screen.getByRole('link')).toHaveAttribute('aria-label', '身份认证服务 — 未接入监控');
		expect(screen.getByRole('link').querySelector('svg')).toBeTruthy();
	});

	it('健康源不可达（unknown 但非 noProbe）→ 文案是"状态未知（数据源不可达）"', () => {
		renderTile({ status: 'unknown', latency: undefined, noProbe: false });
		expect(screen.getByText('状态未知（数据源不可达）')).toBeInTheDocument();
		expect(screen.queryByText('无监控探针')).not.toBeInTheDocument();
		expect(screen.getByRole('link')).toHaveAttribute('aria-label', '身份认证服务 — 未知');
	});

	it('aria-label 携带状态文案（读屏可用）', () => {
		renderTile();
		expect(screen.getByRole('link')).toHaveAttribute(
			'aria-label',
			'身份认证服务 — 正常',
		);
	});

	it('hover 弹出详情浮层（名称 + 描述 + 延迟），移出后关闭', () => {
		renderTile();
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

		fireEvent.mouseEnter(screen.getByRole('link'));
		const tip = screen.getByRole('tooltip');
		expect(tip).toBeInTheDocument();
		expect(tip).toHaveTextContent('用户注册、登录、密码管理');
		// 浮层内保留状态文案（描述之外的可读信息）
		expect(tip).toHaveTextContent('正常');

		fireEvent.mouseLeave(screen.getByRole('link'));
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('键盘 focus 也能弹出详情（不只有鼠标可用）', () => {
		renderTile();
		fireEvent.focus(screen.getByRole('link'));
		expect(screen.getByRole('tooltip')).toBeInTheDocument();
		fireEvent.blur(screen.getByRole('link'));
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});
});

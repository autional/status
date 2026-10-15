import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import i18n from '@/i18n';
import ServiceTile from '../ServiceTile';

/**
 * 磁贴浮层「延迟冠名」渲染锁（本次改名补测；§1.5 边界内**新增**文件，未改既有 ServiceTile.test.tsx）。
 *
 * 本次改动在浮层里给延迟数字补了标签 t('service.latency')。既有 ServiceTile.test.tsx 的
 * i18n 是 mock（DICT 里没有该键 → t() 回显键名），所以那个文件**看不见**真实标签，
 * 把标签删掉 / 改成旧文案它照样全绿。本用例走真实 bundle 补这一层。
 */

const baseService = {
	id: 'identity-service',
	status: 'healthy' as const,
	latency: '13.116463ms',
	lastChecked: '2026-10-15T04:00:00Z',
};

function renderTile(overrides: Record<string, unknown> = {}) {
	return render(
		<MemoryRouter>
			<ServiceTile service={{ ...baseService, ...overrides } as any} />
		</MemoryRouter>,
	);
}

beforeEach(async () => {
	await i18n.changeLanguage('zh-CN');
});

describe('ServiceTile 浮层 · 延迟冠名', () => {
	it('正面仍只显示数字（改名未破坏磁贴正文）', () => {
		renderTile();
		expect(screen.getByText('身份认证服务')).toBeInTheDocument();
		expect(screen.getByText('13.1ms')).toBeInTheDocument();
	});

	it('浮层里给延迟数字冠名「网关探测延迟」（正面的数字不再靠猜）', () => {
		renderTile();
		fireEvent.mouseEnter(screen.getByRole('link'));
		const tip = screen.getByRole('tooltip');
		expect(tip).toHaveTextContent('网关探测延迟');
		expect(tip).toHaveTextContent('13.1ms');
		// 标签与数值之间必须留分隔（JSX 跨行折叠空白会粘成"网关探测延迟13.1ms"）
		expect(tip).not.toHaveTextContent('网关探测延迟13.1ms');
		// 旧文案不得出现
		expect(tip).not.toHaveTextContent('响应延迟');
	});

	it('未接入监控（无探针）时不伪造延迟读数', () => {
		renderTile({ status: 'unknown', latency: undefined, noProbe: true });
		fireEvent.mouseEnter(screen.getByRole('link'));
		const tip = screen.getByRole('tooltip');
		// 没有探针 → 不得出现任何 ms 读数（冠名不等于有数字）
		expect(tip).toHaveTextContent('无监控探针');
		expect(tip).not.toHaveTextContent('ms');
	});
});

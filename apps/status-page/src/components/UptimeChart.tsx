import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';

interface UptimeData {
	ts: number;
	uptime: number;
	status: 'healthy' | 'degraded' | 'unhealthy';
	/** 聚合柱包含的原始采样点数（未聚合时为 1，缺省按 1 处理） */
	count?: number;
}

interface UptimeChartProps {
	data: UptimeData[];
	tooltipLabel?: string;
}

const statusColors: Record<string, string> = {
	// 安静模式：正常 = 中性灰（"没出事就别用颜色占满屏幕"），只有掉下来才上色。
	// 一根 100% 的绿色柱墙什么信息都没有，还会把真正的异常淹掉。
	healthy: 'var(--color-neutral-400)',
	degraded: 'var(--color-warning)',
	unhealthy: 'var(--color-danger)',
};

// 图表网格与坐标轴此前用**两套写死的灰**：浅色 #e5e5e5 / #737373，深色 #404040 / #a3a3a3。
// 它们既不在设计系统里（所以颜色闸门抓不到——那些是非设计系统色值，不在它的比对表里），
// 又逼着组件在 JS 里判断主题。改用中性令牌后由 CSS 自己解析（.dark 会反转中性色阶）：
//   · 少一套脱离设计系统的色值
//   · 少一处 JS 里的主题分支
const chartColors = {
	grid: 'var(--color-neutral-300)',
	tick: 'var(--color-neutral-500)',
	tooltipBorder: 'var(--color-border-subtle)',
};

export function UptimeChart({ data, tooltipLabel }: UptimeChartProps) {
	const { t, i18n } = useTranslation();
	const c = chartColors;
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerWidth, setContainerWidth] = useState(0);

	// 柱宽必须按真实容器宽度收敛（ST2-06）：固定 480px 估算在 375px 视口会让
	// 30 根柱挤成 1–2px。ResizeObserver 在首次渲染后立即给出真实宽度。
	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		setContainerWidth(el.getBoundingClientRect().width);
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver((entries) => {
			setContainerWidth(entries[0]?.contentRect.width ?? 0);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, []);
	// 数值时间轴：采样点按真实时间间隔摆放，稀疏数据不会被等距分类轴拉长成连续序列（ST2-04）。
	const span = data.length > 1 ? data[data.length - 1].ts - data[0].ts : 0;
	const tickFormatter = (value: number) =>
		span > 48 * 3600_000
			? new Date(value).toLocaleDateString(i18n.language, {
					month: '2-digit',
					day: '2-digit',
				})
			: new Date(value).toLocaleTimeString(i18n.language, {
					hour: '2-digit',
					minute: '2-digit',
					hour12: false,
				});
	const labelFormatter = (value: unknown) =>
		new Date(Number(value)).toLocaleString(i18n.language, {
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
		});
	// 数值轴没有 bandSize，柱宽必须显式给；按真实绘图宽度与柱数收敛（最小 2px，最大 24px）。
	const plotWidth = Math.max(120, (containerWidth || 480) - 56);
	const barSize = Math.max(2, Math.min(24, Math.floor(plotWidth / Math.max(data.length, 1))));
	return (
		<div ref={containerRef} style={{ width: '100%', height: 260 }}>
			<ResponsiveContainer
				width="100%"
				height="100%"
				minWidth={1}
				initialDimension={{ width: 480, height: 260 }}
			>
				<BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
					<XAxis
						dataKey="ts"
						type="number"
						scale="time"
						domain={['dataMin', 'dataMax']}
						tick={{ fontSize: 11, fill: c.tick }}
						axisLine={false}
						tickLine={false}
						tickFormatter={tickFormatter}
						minTickGap={36}
					/>
					<YAxis
						domain={[0, 100]}
						tick={{ fontSize: 11, fill: c.tick }}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v) => `${v}%`}
					/>
					<Tooltip
						labelFormatter={labelFormatter}
						formatter={(value, _name, item) => {
							const count = (item as { payload?: UptimeData } | undefined)?.payload?.count ?? 1;
							const label = tooltipLabel || 'Uptime';
							return [
								`${value}%`,
								count > 1
									? `${label} · ${t('service.samplesUnit', { n: count })}`
									: label,
							];
						}}
						contentStyle={{
							borderRadius: '8px',
							border: '1px solid ' + c.tooltipBorder,
							fontSize: '12px',
						}}
					/>
					<Bar dataKey="uptime" radius={[4, 4, 0, 0]} barSize={barSize} maxBarSize={24}>
						{data.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={statusColors[entry.status]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

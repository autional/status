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

interface UptimeData {
	ts: number;
	uptime: number;
	status: 'healthy' | 'degraded' | 'unhealthy';
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
	const { i18n } = useTranslation();
	const c = chartColors;
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
	// 数值轴没有 bandSize，柱宽必须显式给；按样本数收敛，避免多柱重叠。
	const barSize = Math.max(3, Math.min(24, Math.round(480 / Math.max(data.length, 1))));
	return (
		<div style={{ width: '100%', height: 260 }}>
			<ResponsiveContainer width="100%" height="100%" minWidth={1}>
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
						formatter={(value) => [`${value}%`, tooltipLabel || 'Uptime']}
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

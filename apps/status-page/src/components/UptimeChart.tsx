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

interface UptimeData {
	time: string;
	uptime: number;
	status: 'healthy' | 'degraded' | 'unhealthy';
}

interface UptimeChartProps {
	data: UptimeData[];
	tooltipLabel?: string;
}

const statusColors: Record<string, string> = {
	healthy: 'var(--color-success)',
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
	const c = chartColors;
	return (
		<div style={{ width: '100%', height: 260 }}>
			<ResponsiveContainer width="100%" height="100%" minWidth={1}>
				<BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
					<CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
					<XAxis
						dataKey="time"
						tick={{ fontSize: 11, fill: c.tick }}
						axisLine={false}
						tickLine={false}
						interval="preserveStartEnd"
						minTickGap={28}
					/>
					<YAxis
						domain={[0, 100]}
						tick={{ fontSize: 11, fill: c.tick }}
						axisLine={false}
						tickLine={false}
						tickFormatter={(v) => `${v}%`}
					/>
					<Tooltip
						formatter={(value) => [`${value}%`, tooltipLabel || 'Uptime']}
						contentStyle={{
							borderRadius: '8px',
							border: '1px solid ' + c.tooltipBorder,
							fontSize: '12px',
						}}
					/>
					<Bar dataKey="uptime" radius={[4, 4, 0, 0]} maxBarSize={24}>
						{data.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={statusColors[entry.status]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

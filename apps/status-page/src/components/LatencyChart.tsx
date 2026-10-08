import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
} from 'recharts';
import { useTranslation } from 'react-i18next';

interface LatencyData {
	time: string;
	latency: number;
	status: 'healthy' | 'degraded' | 'unhealthy';
}

interface LatencyChartProps {
	data: LatencyData[];
}

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

export default function LatencyChart({ data }: LatencyChartProps) {
	const { t } = useTranslation();
	const c = chartColors;
	const maxLatency = Math.max(...data.map((d) => d.latency), 100);
	const threshold = maxLatency > 500 ? 500 : 200;

	return (
		<ResponsiveContainer width="100%" height="100%" minWidth={1}>
			<LineChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
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
					tick={{ fontSize: 11, fill: c.tick }}
					axisLine={false}
					tickLine={false}
					tickFormatter={(v) => `${v}ms`}
				/>
				<Tooltip
					formatter={(value) => [`${value}ms`, t('service.latencyP95')]}
					contentStyle={{
						borderRadius: '8px',
						border: '1px solid ' + c.tooltipBorder,
						fontSize: '12px',
					}}
				/>
				<ReferenceLine
					y={threshold}
					stroke="var(--color-warning)"
					strokeDasharray="4 4"
					label={{
						value: t('service.latencyThreshold'),
						position: 'right',
						fontSize: 10,
						fill: 'var(--color-warning)',
					}}
				/>
				<Line
					type="monotone"
					dataKey="latency"
					stroke="var(--color-chart-1)"
					strokeWidth={2}
					dot={false}
					activeDot={{ r: 4, fill: 'var(--color-chart-1)' }}
				/>
			</LineChart>
		</ResponsiveContainer>
	);
}

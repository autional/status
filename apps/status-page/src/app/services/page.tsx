import { useParams, Link } from 'react-router';
import {
	useServiceStatuses,
	useIncidents,
	useLatencyMetrics,
	useUptimeMetrics,
} from '@/hooks/use-system-status';
import StatusIndicator from '@/components/StatusIndicator';
import { serviceIcon } from '@/lib/service-icon';
import { formatLatency } from '@/lib/format';
import { UptimeChart } from '@/components/UptimeChart';
import LatencyChart from '@/components/LatencyChart';
import IncidentTimeline from '@/components/IncidentTimeline';
import {
	ArrowLeft,
	Server,
	Clock,
	Activity,
	AlertTriangle,
	TrendingUp,
	TrendingDown,
	Minus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const RANGE_OPTIONS = [
	{ value: '1h', label: 'service.range.1h' },
	{ value: '24h', label: 'service.range.24h' },
	{ value: '7d', label: 'service.range.7d' },
	{ value: '30d', label: 'service.range.30d' },
];

export default function ServiceDetailPage() {
	const { t } = useTranslation();
	const { serviceId } = useParams<{ serviceId: string }>();
	const { data: services } = useServiceStatuses();
	const { data: allIncidents } = useIncidents();
	const [range, setRange] = useState('24h');

	const { data: latencyResult, isLoading: latencyLoading } = useLatencyMetrics(
		serviceId || '',
		range,
	);
	const { data: uptimeResult, isLoading: uptimeLoading } = useUptimeMetrics(serviceId || '', range);

	// 空图表有两种完全不同的原因，必须分开说 —— 否则用户会把"数据源挂了"读成"服务没问题"：
	//   available === false → Prometheus 不可用（监控链路问题，与服务健康无关）
	//   available 为真但无数据点 → 该服务确实没有这类指标（如 gRPC-only 服务没有 HTTP 直方图）
	const metricsSourceDown = (res?: { available?: boolean } | null) => res?.available === false;

	const service = useMemo(() => {
		return services?.find((s) => s.id === serviceId);
	}, [services, serviceId]);

	const incidents = useMemo(() => {
		if (!allIncidents || !serviceId) return [];
		return allIncidents.filter((inc) => (inc.affectedServices || []).includes(serviceId));
	}, [allIncidents, serviceId]);

	// Transform Prometheus uptime data for chart
	const uptimeChartData = useMemo(() => {
		if (!uptimeResult?.points?.length) return [];
		return uptimeResult.points.map((p) => {
			const date = new Date(p.timestamp);
			const value = Math.min(100, Math.max(0, p.value));
			let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
			if (value < 95) status = 'unhealthy';
			else if (value < 99.9) status = 'degraded';
			// HH:mm（含分钟）——只给小时会在细粒度采样下把多个点压成重复刻度（Q-02）
			return {
				time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
				uptime: Math.round(value * 100) / 100,
				status,
			};
		});
	}, [uptimeResult]);

	// Transform Prometheus latency data
	const latencyChartData = useMemo(() => {
		if (!latencyResult?.points?.length) return [];
		return latencyResult.points.map((p) => {
			const date = new Date(p.timestamp);
			const valueMs = p.value * 1000; // Prometheus returns seconds, convert to ms
			let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
			if (valueMs > 1000) status = 'unhealthy';
			else if (valueMs > 500) status = 'degraded';
			return {
				time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
				latency: Math.round(valueMs * 100) / 100,
				status,
			};
		});
	}, [latencyResult]);

	// Stats
	const avgLatency = useMemo(() => {
		if (!latencyChartData.length) return null;
		const sum = latencyChartData.reduce((acc, d) => acc + d.latency, 0);
		return Math.round((sum / latencyChartData.length) * 100) / 100;
	}, [latencyChartData]);

	const avgUptime = useMemo(() => {
		if (!uptimeChartData.length) return null;
		const sum = uptimeChartData.reduce((acc, d) => acc + d.uptime, 0);
		return Math.round((sum / uptimeChartData.length) * 100) / 100;
	}, [uptimeChartData]);

	const latencyTrend = useMemo(() => {
		if (latencyChartData.length < 2) return 'stable' as const;
		const mid = Math.floor(latencyChartData.length / 2);
		const first = latencyChartData.slice(0, mid).reduce((a, d) => a + d.latency, 0) / mid;
		const second =
			latencyChartData.slice(mid).reduce((a, d) => a + d.latency, 0) /
			(latencyChartData.length - mid);
		if (second > first * 1.2) return 'up' as const;
		if (second < first * 0.8) return 'down' as const;
		return 'stable' as const;
	}, [latencyChartData]);

	if (!service) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-12 text-center">
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
					<Server size={32} className="text-muted" />
				</div>
				<h2 className="text-lg font-semibold text-neutral-900">
					{t('service.notFound')}
				</h2>
				<p className="mt-2 text-sm text-muted">
					{t('service.notFoundDesc')}
				</p>
				<Link
					to="/"
					className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
				>
					<ArrowLeft size={14} />
					{t('service.back')}
				</Link>
			</div>
		);
	}

	const statusConfig = {
		// 安静模式：正常态不用绿色铺满一整块面板 —— 颜色留给"出事了"。
		healthy: {
			bg: 'bg-neutral-50/80 text-neutral-800 dark:bg-surface/30',
			border: 'border-neutral-200 dark:border-neutral-700',
		},
		degraded: {
			bg: 'bg-warning-soft text-warning-text dark:bg-warning/30 dark:text-warning-text',
			border: 'border-warning-soft',
		},
		unhealthy: {
			bg: 'bg-danger-soft text-danger-text dark:bg-danger-soft/30 dark:text-danger-text',
			border: 'border-danger-soft',
		},
		unknown: {
			bg: 'bg-neutral-50 text-[var(--color-text-secondary)] dark:bg-surface/30 dark:text-[var(--color-text-muted)]',
			border: 'border-neutral-200 dark:border-neutral-700',
		},
	};
	const cfg = statusConfig[service.status];
	// 与总览页状态墙同源：详情页头部也用该服务的专属图标（此前写死 <Server>，每个服务都一样）
	const ServiceIcon = serviceIcon(service.id);

	const TrendIcon =
		latencyTrend === 'up' ? TrendingUp : latencyTrend === 'down' ? TrendingDown : Minus;
	const trendColor =
		latencyTrend === 'up'
			? 'text-danger-text'
			: latencyTrend === 'down'
				? 'text-success-text'
				: 'text-muted';

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			{/* Back link */}
			<Link
				to="/"
				className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-neutral-800"
			>
				<ArrowLeft size={14} />
				{t('service.back')}
			</Link>

			{/* Service Header */}
			<div className={`mt-6 rounded-xl border p-6 ${cfg.bg} ${cfg.border}`}>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className="flex h-14 w-14 items-center justify-center rounded-lg bg-neutral-0/80">
							<ServiceIcon size={28} className="text-muted" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">{t('service.name.' + service.id)}</h1>
							<p className="mt-1 text-sm opacity-80">{t('service.desc.' + service.id)}</p>
						</div>
					</div>
					<StatusIndicator status={service.status} size="lg" showLabel quietHealthy />
				</div>

				<div className="mt-6 grid gap-4 sm:grid-cols-3">
					<div className="rounded-lg bg-neutral-0/60 p-4">
						<div className="flex items-center gap-2 text-sm opacity-70">
							<Clock size={14} />
							{t('service.latency')}
						</div>
						<p className="mt-1 text-xl font-semibold">
							{formatLatency(service.latency) ?? '—'}
						</p>
						{/* 口径小字：这个数是"网关 → 上游健康检查往返"的单次读数，
						    与下方图表的服务端 P95 聚合不是同一口径 —— 不写清楚两者看着像互相矛盾。
						    用 text-muted text-xs（复用既有行样式），不动本卡片的 opacity-70 标签。 */}
						<p className="mt-0.5 text-xs text-muted">{t('service.latencyProbeHint')}</p>
					</div>
					<div className="rounded-lg bg-neutral-0/60 p-4">
						<div className="flex items-center gap-2 text-sm opacity-70">
							<Activity size={14} />
							{t('service.uptime', { range })}
						</div>
						<p className="mt-1 text-xl font-semibold">
							{avgUptime !== null ? `${avgUptime}%` : uptimeLoading ? t('service.loading') : '—'}
						</p>
					</div>
					<div className="rounded-lg bg-neutral-0/60 p-4">
						<div className="flex items-center gap-2 text-sm opacity-70">
							<AlertTriangle size={14} />
							{t('service.incidentCount')}
						</div>
						<p className="mt-1 text-xl font-semibold">{incidents.length}</p>
					</div>
				</div>

				{/* unknown 的真实原因：探针清单没覆盖它（不是服务坏了）。不写清楚，用户会把
				    "未知徽章 + 满页绿色图表"读成互相矛盾的两句话。 */}
				{service.status === 'unknown' && (
					<p className="mt-4 text-xs opacity-70">{t('service.noProbeHint')}</p>
				)}
			</div>

			{/* Range Selector */}
			<div className="mt-6 flex items-center gap-2">
				<span className="text-sm text-muted">
					{t('service.rangeLabel')}
				</span>
				{RANGE_OPTIONS.map((opt) => (
					// 触区基线：时间范围按钮原为 24–26px 高（同上）。
					<button
						key={opt.value}
						onClick={() => setRange(opt.value)}
						className={`inline-flex min-h-[var(--a11y-touch-target)] min-w-[var(--a11y-touch-target)] items-center justify-center rounded-md px-3 text-xs font-medium transition-colors ${
							range === opt.value
								? 'bg-primary-600 text-white'
								: 'bg-neutral-0 text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
						}`}
					>
						{t(opt.label)}
					</button>
				))}
			</div>

			{/* Uptime Chart */}
			<div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-card">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-bold text-neutral-900">
						{t('service.uptimeTitle', { range })}
					</h2>
					{avgUptime !== null && (
						<span
							className={`flex items-center gap-1 text-sm font-medium ${avgUptime >= 99.9 ? 'text-neutral-600' : avgUptime >= 95 ? 'text-warning-text' : 'text-danger-text'}`}
						>
							{t('service.uptimeAvg')} {avgUptime}%
						</span>
					)}
				</div>
				<div className="mt-4 h-64">
					{uptimeLoading ? (
						<div className="flex h-full items-center justify-center">
							<div className="h-4 w-32 animate-pulse rounded-xs bg-neutral-200" />
						</div>
					) : uptimeChartData.length > 0 ? (
						<UptimeChart data={uptimeChartData || []} tooltipLabel={t('service.uptimeTooltip')} />
					) : (
						<div className="flex h-full flex-col items-center justify-center text-muted">
							<Activity size={32} />
							<p className="mt-2 text-sm">
								{metricsSourceDown(uptimeResult) ? t('service.metricsSourceDown') : t('service.noUptime')}
							</p>
							<p className="text-xs">
								{metricsSourceDown(uptimeResult)
									? t('service.metricsSourceDownHint')
									: t('service.prometheusHint')}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Latency Chart */}
			<div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-0 p-6 shadow-card">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-bold text-neutral-900">
						{t('service.latencyTitle', { range })}
					</h2>
					<div className="flex items-center gap-2">
						{avgLatency !== null && (
							<span className="text-sm font-medium text-neutral-600">
								{t('service.latencyAvg')} {avgLatency}ms
							</span>
						)}
						<TrendIcon size={16} className={trendColor} />
					</div>
				</div>
				{/* 口径小字：这里画的是 Prometheus 直方图的 P95 聚合（与头部"网关探测延迟"不同口径），
				    标出来源与统计量，读者才不会把两处数字读成互相矛盾。 */}
				<p className="mt-1 text-xs text-muted">{t('service.latencySourceHint', { range })}</p>
				<div className="mt-4 h-64">
					{latencyLoading ? (
						<div className="flex h-full items-center justify-center">
							<div className="h-4 w-32 animate-pulse rounded-xs bg-neutral-200" />
						</div>
					) : latencyChartData.length > 0 ? (
						<LatencyChart data={latencyChartData || []} />
					) : (
						<div className="flex h-full flex-col items-center justify-center text-muted">
							<Clock size={32} />
							<p className="mt-2 text-sm">
								{metricsSourceDown(latencyResult) ? t('service.metricsSourceDown') : t('service.noLatency')}
							</p>
							<p className="text-xs">
								{metricsSourceDown(latencyResult)
									? t('service.metricsSourceDownHint')
									: t('service.prometheusHint')}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Related Incidents */}
			{incidents.length > 0 && (
				<div className="mt-8">
					<h2 className="mb-4 text-lg font-bold text-neutral-900">
						{t('service.relatedIncidents')}
					</h2>
					<IncidentTimeline incidents={incidents} linkToDetail />
				</div>
			)}
		</div>
	);
}

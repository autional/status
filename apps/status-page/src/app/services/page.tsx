import { useParams, Link } from 'react-router';
import {
	useServiceStatuses,
	useIncidents,
	useLatencyMetrics,
	useUptimeMetrics,
} from '@/hooks/use-system-status';
import StatusIndicator from '@/components/StatusIndicator';
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
			return {
				time: `${date.getHours()}:00`,
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
				time: `${date.getHours()}:00`,
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
				<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-700">
					<Server size={32} className="text-[var(--color-text-muted)]" />
				</div>
				<h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
					{t('service.notFound')}
				</h2>
				<p className="mt-2 text-sm text-neutral-500 dark:text-[var(--color-text-muted)]">
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
		healthy: {
			bg: 'bg-success-soft text-success-text dark:bg-success-soft/30 dark:text-success-text',
			border: 'border-success-soft',
		},
		degraded: {
			bg: 'bg-warning-soft text-warning-text dark:bg-warning/30 dark:text-warning-text',
			border: 'border-warning-soft',
		},
		unhealthy: {
			bg: 'bg-danger-soft text-danger-text dark:bg-danger-soft/30 dark:text-danger-text',
			border: 'border-danger-soft',
		},
	};
	const cfg = statusConfig[service.status];

	const TrendIcon =
		latencyTrend === 'up' ? TrendingUp : latencyTrend === 'down' ? TrendingDown : Minus;
	const trendColor =
		latencyTrend === 'up'
			? 'text-danger-text'
			: latencyTrend === 'down'
				? 'text-success-text'
				: 'text-[var(--color-text-muted)]';

	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			{/* Back link */}
			<Link
				to="/"
				className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:text-[var(--color-text-muted)] dark:hover:text-neutral-200"
			>
				<ArrowLeft size={14} />
				{t('service.back')}
			</Link>

			{/* Service Header */}
			<div className={`mt-6 rounded-xl border p-6 ${cfg.bg} ${cfg.border}`}>
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						<div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/80 dark:bg-neutral-800/80">
							<Server size={28} className="text-neutral-500 dark:text-[var(--color-text-muted)]" />
						</div>
						<div>
							<h1 className="text-2xl font-bold">{t('service.name.' + service.id)}</h1>
							<p className="mt-1 text-sm opacity-80">{t('service.desc.' + service.id)}</p>
						</div>
					</div>
					<StatusIndicator status={service.status} size="lg" showLabel />
				</div>

				<div className="mt-6 grid gap-4 sm:grid-cols-3">
					<div className="rounded-lg bg-white/60 p-4 dark:bg-neutral-800/60">
						<div className="flex items-center gap-2 text-sm opacity-70">
							<Clock size={14} />
							{t('service.latency')}
						</div>
						<p className="mt-1 text-xl font-semibold">{service.latency || '—'}</p>
					</div>
					<div className="rounded-lg bg-white/60 p-4 dark:bg-neutral-800/60">
						<div className="flex items-center gap-2 text-sm opacity-70">
							<Activity size={14} />
							{t('service.uptime', { range })}
						</div>
						<p className="mt-1 text-xl font-semibold">
							{avgUptime !== null ? `${avgUptime}%` : uptimeLoading ? t('service.loading') : '—'}
						</p>
					</div>
					<div className="rounded-lg bg-white/60 p-4 dark:bg-neutral-800/60">
						<div className="flex items-center gap-2 text-sm opacity-70">
							<AlertTriangle size={14} />
							{t('service.incidentCount')}
						</div>
						<p className="mt-1 text-xl font-semibold">{incidents.length}</p>
					</div>
				</div>
			</div>

			{/* Range Selector */}
			<div className="mt-6 flex items-center gap-2">
				<span className="text-sm text-neutral-500 dark:text-[var(--color-text-muted)]">
					{t('service.rangeLabel')}
				</span>
				{RANGE_OPTIONS.map((opt) => (
					<button
						key={opt.value}
						onClick={() => setRange(opt.value)}
						className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
							range === opt.value
								? 'bg-primary-600 text-white'
								: 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700'
						}`}
					>
						{t(opt.label)}
					</button>
				))}
			</div>

			{/* Uptime Chart */}
			<div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
						{t('service.uptimeTitle', { range })}
					</h2>
					{avgUptime !== null && (
						<span
							className={`flex items-center gap-1 text-sm font-medium ${avgUptime >= 99.9 ? 'text-success-text' : avgUptime >= 95 ? 'text-warning-text' : 'text-danger-text'}`}
						>
							{t('service.uptimeAvg')} {avgUptime}%
						</span>
					)}
				</div>
				<div className="mt-4 h-64">
					{uptimeLoading ? (
						<div className="flex h-full items-center justify-center">
							<div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
						</div>
					) : uptimeChartData.length > 0 ? (
						<UptimeChart data={uptimeChartData || []} tooltipLabel={t('service.uptimeTooltip')} />
					) : (
						<div className="flex h-full flex-col items-center justify-center text-[var(--color-text-muted)] dark:text-neutral-500">
							<Activity size={32} />
							<p className="mt-2 text-sm">{t('service.noUptime')}</p>
							<p className="text-xs">{t('service.prometheusHint')}</p>
						</div>
					)}
				</div>
			</div>

			{/* Latency Chart */}
			<div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
						{t('service.latencyTitle', { range })}
					</h2>
					<div className="flex items-center gap-2">
						{avgLatency !== null && (
							<span className="text-sm font-medium text-neutral-600 dark:text-[var(--color-text-muted)]">
								{t('service.latencyAvg')} {avgLatency}ms
							</span>
						)}
						<TrendIcon size={16} className={trendColor} />
					</div>
				</div>
				<div className="mt-4 h-64">
					{latencyLoading ? (
						<div className="flex h-full items-center justify-center">
							<div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" />
						</div>
					) : latencyChartData.length > 0 ? (
						<LatencyChart data={latencyChartData || []} />
					) : (
						<div className="flex h-full flex-col items-center justify-center text-[var(--color-text-muted)] dark:text-neutral-500">
							<Clock size={32} />
							<p className="mt-2 text-sm">{t('service.noLatency')}</p>
							<p className="text-xs">{t('service.prometheusHint')}</p>
						</div>
					)}
				</div>
			</div>

			{/* Related Incidents */}
			{incidents.length > 0 && (
				<div className="mt-8">
					<h2 className="mb-4 text-lg font-bold text-neutral-900 dark:text-neutral-100">
						{t('service.relatedIncidents')}
					</h2>
					<IncidentTimeline incidents={incidents} linkToDetail />
				</div>
			)}
		</div>
	);
}

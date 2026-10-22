import { useParams, Link } from 'react-router';
import {
	useServiceStatuses,
	useIncidentList,
	useLatencyMetrics,
	useUptimeMetrics,
} from '@/hooks/use-system-status';
import StatusIndicator from '@/components/StatusIndicator';
import { serviceIcon } from '@/lib/service-icon';
import { formatLatency } from '@/lib/format';
import { UptimeChart } from '@/components/UptimeChart';
import LatencyChart from '@/components/LatencyChart';
import IncidentTimeline from '@/components/IncidentTimeline';
import { IncidentEmptyCard, IncidentErrorCard } from '@/components/IncidentStateCard';
import {
	ArrowLeft,
	Server,
	Clock,
	Activity,
	AlertTriangle,
	TrendingUp,
	TrendingDown,
	Minus,
	RefreshCw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const RANGE_OPTIONS = [
	{ value: '1h', label: 'service.range.1h' },
	{ value: '24h', label: 'service.range.24h' },
	{ value: '7d', label: 'service.range.7d' },
	{ value: '30d', label: 'service.range.30d' },
];

function BackToStatus() {
	const { t } = useTranslation();
	return (
		<Link
			to="/"
			className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-neutral-800"
		>
			<ArrowLeft size={14} />
			{t('service.back')}
		</Link>
	);
}

/**
 * 加载骨架：高度按最终结构预留（头部卡 + 范围条 + 两张图表卡）。
 * 旧实现加载中直接渲染「Service Not Found」卡，加载完成后整页替换，
 * 实测产生 0.362 的布局位移（ST2-05）；骨架把这段高度先占住。
 */
function ServiceDetailSkeleton() {
	return (
		<>
			{/* 头部卡：移动端三项指标竖排（449px），sm 起横排（247px）。 */}
			<div className="mt-6 h-[28rem] animate-pulse rounded-xl bg-neutral-100 sm:h-[15.5rem]" />
			<div className="mt-6 flex flex-wrap items-center gap-2">
				<div className="h-4 w-20 animate-pulse rounded-xs bg-neutral-100" />
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className="h-[var(--a11y-touch-target)] w-14 animate-pulse rounded-md bg-neutral-100"
					/>
				))}
			</div>
			{/* 图表卡按实测高度预留：移动端 397/417px，桌面 369/389px。 */}
			<div className="mt-6 h-[24.75rem] animate-pulse rounded-lg bg-neutral-100 sm:h-[23rem]" />
			<div className="mt-6 h-[26rem] animate-pulse rounded-lg bg-neutral-100 sm:h-[24.25rem]" />
			{/* 关联事件区（空态 241px）——漏掉它会让整块在取数后下推。 */}
			<div className="mt-6 h-[15rem] animate-pulse rounded-lg bg-neutral-100" />
		</>
	);
}

function ServiceDetailError({ onRetry }: { onRetry: () => void }) {
	const { t } = useTranslation();
	return (
		<div className="mt-6 rounded-lg border border-warning-soft bg-neutral-0 p-8 text-center">
			<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-warning-soft">
				<AlertTriangle size={20} className="text-warning-text" />
			</div>
			<h2 className="text-sm font-medium text-neutral-900">{t('service.loadError')}</h2>
			<p className="mt-1 text-xs text-muted">{t('service.loadErrorHint')}</p>
			<button
				onClick={onRetry}
				className="mt-4 inline-flex min-h-[var(--a11y-touch-target)] items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-0 px-4 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
			>
				<RefreshCw size={13} />
				{t('service.retry')}
			</button>
		</div>
	);
}

export default function ServiceDetailPage() {
	const { t, i18n } = useTranslation();
	const { serviceId } = useParams<{ serviceId: string }>();
	const {
		data: services,
		isLoading: servicesLoading,
		isError: servicesError,
		refetchAll,
	} = useServiceStatuses();
	const [range, setRange] = useState('24h');

	// 「关联事件」数据源与 `/incidents` 列表页同口径（§4.1(b)/(c) 同型缺陷修复）：
	//   ① 列表 = 服务端按 `service` 过滤（不再对首页 20 条做 affectedServices 前端过滤 ——
	//      匹配项落在第 21 条之后会被漏掉）；`service` 参数生成 SDK 已支持，**零契约变更**。
	//   ② 另一条无筛选同源查询 = 数据集真实总数，用来把「本服务没有关联事件」与
	//      「数据集本身就没有事件」分开（三分诊）；无筛选时与 ①同 key ⇒ 只发一次请求。
	const {
		data: incidentList,
		isLoading: incidentsLoading,
		isError: incidentsError,
	} = useIncidentList({ service: serviceId });
	const { data: incidentDataset, isError: incidentDatasetError, isLoading: incidentDatasetLoading } =
		useIncidentList();

	const incidentItems = incidentList?.items;
	const datasetTotal = incidentDataset?.total ?? 0;

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

	// 服务端已按 `service` 过滤（见上方 ①），此处不再做前端过滤 —— 也就不会再漏掉
	// 落在第 21 条之后的关联事件。
	const incidents = incidentItems ?? [];

	// Transform Prometheus uptime data for chart
	const uptimeChartData = useMemo(() => {
		if (!uptimeResult?.points?.length) return [];
		return uptimeResult.points.map((p) => {
			const date = new Date(p.timestamp);
			const value = Math.min(100, Math.max(0, p.value));
			let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
			// 99.9 / 95 在这里的**唯一**用途是给图表柱子分段着色（视觉梯度，status → UptimeChart 的分段色），
			// 不再用于给"平均值数字"下一个结论词（见下方 KPI span 的说明）。
			// 这样 99.9（本是**自然月口径**的那个数）只留在图上，不再被套到 24h 滚动均值上做判定（§2.3 第 4 条）。
			if (value < 95) status = 'unhealthy';
			else if (value < 99.9) status = 'degraded';
			// 保留真实时间戳：图表用数值时间轴，稀疏采样不会被等距分类轴拉成「连续趋势」（ST2-04）。
			return {
				ts: date.getTime(),
				uptime: Math.round(value * 100) / 100,
				status,
			};
		}).sort((a, b) => a.ts - b.ts);
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
				ts: date.getTime(),
				latency: Math.round(valueMs * 100) / 100,
				status,
			};
		}).sort((a, b) => a.ts - b.ts);
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

	// 覆盖口径：稀疏采样时读者必须知道「首末点与样本数」，
	// 否则会把 10 个点读成连续 30 天的趋势（ST2-04）。
	const formatCoverage = (points: { ts: number }[]) => {
		if (!points.length) return null;
		const fmt = (ts: number) =>
			new Date(ts).toLocaleString(i18n.language, {
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
			});
		return {
			from: fmt(points[0].ts),
			to: fmt(points[points.length - 1].ts),
			n: points.length,
		};
	};
	const uptimeCoverage = formatCoverage(uptimeChartData);
	const latencyCoverage = formatCoverage(latencyChartData);

	// 三态拆分（ST2-01）：加载中 → 骨架；取数失败 → 错误卡 + 重试；成功但未命中 → 未找到。
	// 旧实现只有 `!service` 一个分支，把「请求失败」说成「服务已被移除」。
	if (!service) {
		return (
			<div className="mx-auto max-w-4xl px-4 py-8">
				<BackToStatus />
				{servicesLoading ? (
					<ServiceDetailSkeleton />
				) : servicesError ? (
					<ServiceDetailError onRetry={() => void refetchAll()} />
				) : (
					<div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-0 px-4 py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
							<Server size={32} className="text-muted" />
						</div>
						<h2 className="text-lg font-semibold text-neutral-900">
							{t('service.notFound')}
						</h2>
						<p className="mt-2 text-sm text-muted">
							{t('service.notFoundDesc')}
						</p>
					</div>
				)}
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
			<BackToStatus />

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
						<div className="flex items-center gap-2 text-sm text-muted">
							<Clock size={14} />
							{t('service.latency')}
						</div>
						<p className="mt-1 text-xl font-semibold">
							{formatLatency(service.latency) ?? '—'}
						</p>
						{/* 口径小字：这个数是"网关 → 上游健康检查往返"的单次读数，
						    与下方图表的服务端 P95 聚合不是同一口径 —— 不写清楚两者看着像互相矛盾。
						    用 text-muted text-xs（复用既有行样式）；卡内三个标签也由 opacity-70 改为
						    text-muted（T39：浅色下 opacity-70 实测 4.32:1 < AA 4.5:1，与本节同一 token）。 */}
						<p className="mt-0.5 text-xs text-muted">{t('service.latencyProbeHint')}</p>
					</div>
					<div className="rounded-lg bg-neutral-0/60 p-4">
						<div className="flex items-center gap-2 text-sm text-muted">
							<Activity size={14} />
							{/* 本处传的是 range 的**本地化展示取值**（zh「24 小时」/ en「24-hour」），
							    不是原始取值 `24h` —— 只改这一处；同页 `service.uptimeTitle` /
							    `service.latencyTitle` / `service.latencySourceHint` 仍传原始 `range`
							    （全仓 `{{range}}` 约定不变）。en 的 `-hour/-day` 连字符写法待产品确认。 */}
							{t('service.uptime', { range: t('service.uptimeRange.' + range) })}
						</div>
						<p className="mt-1 text-xl font-semibold">
							{avgUptime !== null ? `${avgUptime}%` : uptimeLoading ? t('service.loading') : '—'}
						</p>
						{/* 口径小字：这个数是 **Prometheus 抓取成功率**（每 5 分钟一个采样点、滚动窗口）的均值，
						    与徽章（网关瞬时探针）不是同一套测量系统 —— 不写清楚，读者会把"此刻正常"
						    与"24h 95.82%"读成互相矛盾。只标**口径**、不下结论词（§2.4 Q1 拍板：否）。
						    用 text-muted text-xs（复用既有行样式）；卡内三个标签也由 opacity-70 改为
						    text-muted（T39：浅色下 opacity-70 实测 4.32:1 < AA 4.5:1，与本节同一 token）。 */}
						<p className="mt-0.5 text-xs text-muted">{t('service.uptimeSourceHint')}</p>
					</div>
					<div className="rounded-lg bg-neutral-0/60 p-4">
						<div className="flex items-center gap-2 text-sm text-muted">
							<AlertTriangle size={14} />
							{t('service.incidentCount')}
						</div>
						<p className="mt-1 text-xl font-semibold">
							{/* 与下方区块同口径：取不到数据时不得显示 0（把"取不到"读成"没有事件"，
							    且会与区块的「事件数据暂时不可用」自相矛盾）。 */}
							{incidentsError
								? '—'
								: incidentsLoading
									? t('service.loading')
									: incidents.length}
						</p>
					</div>
				</div>

				{/* unknown 的真实原因：探针清单没覆盖它（不是服务坏了）。不写清楚，用户会把
				    "未知徽章 + 满页绿色图表"读成互相矛盾的两句话。 */}
				{service.status === 'unknown' && (
					<p className="mt-4 text-xs text-muted">{t('service.noProbeHint')}</p>
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
						aria-pressed={range === opt.value}
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
						// 这里**不再**按阈值给数字着色：99.9 是「自然月口径」的那个数（见 i18n `uptime.desc`），
						// 套在 24h 滚动均值上等于"用月窗口去判日窗口"，而且给数字上"琥珀/红"本身就等于
						// 替读者下了结论。§2.3 第 4 条要求把 99.9 **降级为图表分段色**（见 uptimeChartData），
						// 不在数字旁下结论 —— 故此处恒用中性色，数字只陈述事实。
						<span className="flex items-center gap-1 text-sm font-medium text-neutral-600">
							{t('service.uptimeAvg')} {avgUptime}%
							<span className="text-xs font-normal text-muted">
								{t('service.sampleCount', { n: uptimeChartData.length })}
							</span>
						</span>
					)}
				</div>
				{uptimeCoverage && (
					<p className="mt-1 text-xs text-muted">
						{t('service.dataCoverage', uptimeCoverage)}
					</p>
				)}
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
							<span className="flex items-center gap-1 text-sm font-medium text-neutral-600">
								{t('service.latencyAvg')} {avgLatency}ms
								<span className="text-xs font-normal text-muted">
									{t('service.sampleCount', { n: latencyChartData.length })}
								</span>
							</span>
						)}
						<TrendIcon size={16} className={trendColor} />
					</div>
				</div>
				{/* 口径小字：这里画的是 Prometheus 直方图的 P95 聚合（与头部"网关探测延迟"不同口径），
				    标出来源与统计量，读者才不会把两处数字读成互相矛盾。 */}
				<p className="mt-1 text-xs text-muted">{t('service.latencySourceHint', { range })}</p>
				{latencyCoverage && (
					<p className="mt-1 text-xs text-muted">
						{t('service.dataCoverage', latencyCoverage)}
					</p>
				)}
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

			{/* Related Incidents —— 三分诊（数据集空 / 筛选后空 / 取数失败），与 `/incidents` 列表页同口径。
			    此前是 `incidents.length > 0 &&` 才渲染 ⇒ 接口挂掉时整块静默消失，
			    读者会把「取不到」读成「没事」（§4.1(c) 假绿同型缺陷）。 */}
			<div className="mt-8">
				<h2 className="mb-4 text-lg font-bold text-neutral-900">
					{t('service.relatedIncidents')}
				</h2>
				{incidentsLoading ? (
					<div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
				) : incidentsError ? (
					// (c) 取数失败：显式说「取不到」，绝不静默隐藏（复用列表页同一张错误卡）。
					<IncidentErrorCard />
				) : incidents.length > 0 ? (
					<IncidentTimeline incidents={incidents} linkToDetail />
				) : incidentDatasetLoading ? (
					// 本服务 0 条、但「数据集总数」仍在途 ⇒ 此刻还分不清 (a) 与 (b)，
					// 先给骨架；否则会把"还不知道"瞬态渲染成「尚无事件记录」（假空）。
					<div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
				) : datasetTotal > 0 ? (
					// (b) 筛选后为空：数据集确有 {datasetTotal} 条事件，只是没有一条影响到本服务。
					<IncidentEmptyCard
						title={t('incidents.empty')}
						hint={t('incidents.filteredEmptyHint', { total: datasetTotal })}
					/>
				) : incidentDatasetError ? (
					// 本服务 0 条、而「数据集总数」查询失败 ⇒ 不敢断言"压根没有事件"（保守分支，同列表页）。
					<IncidentErrorCard />
				) : (
					// (a) 数据集为空：接口可用 + 无筛选 + total = 0 ⇒ 真的没有事件。
					<IncidentEmptyCard title={t('incidents.noneYet')} hint={t('incidents.noneYetHint')} />
				)}
			</div>
		</div>
	);
}
